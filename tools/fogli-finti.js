#!/usr/bin/env node
/* tools/fogli-finti.js — sette gemelli Sorgenti/*.html FINTI dentro public/dev/vault.json
   -------------------------------------------------------------------------
   Sul disco di oggi i vault non hanno ancora `Materiale Studio/Sorgenti/` (li
   scrive MappAI in Electron dal 6/9). Per provare l'autotest nel browser si
   sintetizzano sette fogli d'angolo (due domande per ramo L1, la forma VERA di
   `buildOpenQuestionsHtml` con `qp-set`), usando i moduli copiati in una
   sandbox, e si aggiungono al vault impacchettato. Solo sviluppo.

     node tools/vault-json.js "<vault>" 4R/Scienze && node tools/fogli-finti.js */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const JS = path.join(__dirname, '..', 'public', 'js');
const dest = path.join(__dirname, '..', 'public', 'dev', 'vault.json');
const lista = JSON.parse(fs.readFileSync(dest, 'utf8'));
const idx = lista.find(f => /\/index\.yaml$/.test(f.rel));
if (!idx) throw new Error('vault.json senza index.yaml');
const vault = idx.rel.replace(/\/index\.yaml$/, '');
const root = (Buffer.from(idx.base64, 'base64').toString('utf8').match(/rootNodeLabel:\s*(.+)/) || [])[1] || 'Mappa';
/* i rami L1 dai nodi */
const rami = lista.filter(f => f.rel.indexOf(vault + '/Nodi/') === 0 && /\.md$/.test(f.rel))
  .map(f => Buffer.from(f.base64, 'base64').toString('utf8'))
  .filter(t => /\nlevel:\s*1\b/.test(t))
  .map(t => (t.match(/\nlabel:\s*"?([^"\n]+)"?/) || [])[1]).filter(Boolean);

const win = {};
const sb = { window: win, appState: { db: { studySets: [] }, nodes: [] }, showToast: () => { }, cleanLabel: s => s, console, Date, JSON, Object, Array, String };
sb.globalThis = sb; vm.createContext(sb);
['mappai-print-layout.js', 'mappai-docedit-core.js', 'mappai-doc-bar.js'].forEach(f => vm.runInContext(fs.readFileSync(path.join(JS, f), 'utf8'), sb));
win.MappAIPrintLayout = sb.MappAIPrintLayout || win.MappAIPrintLayout; win.MappAIDocEdit = sb.MappAIDocEdit || win.MappAIDocEdit; win.MappAIDocBar = sb.MappAIDocBar || win.MappAIDocBar;
vm.runInContext(fs.readFileSync(path.join(JS, 'mappai-quiz-print.js'), 'utf8'), sb);

const ANG = ['definizione', 'causa', 'conseguenza', 'esempio', 'confronto', 'eccezione', 'applicazione'];
const FORME = {
  definizione: x => 'Che cos\'è «' + x + '»?', causa: x => 'Perché avviene ciò che descrive «' + x + '»?',
  conseguenza: x => 'Che cosa comporta «' + x + '»?', esempio: x => 'Racconta un caso concreto di «' + x + '».',
  confronto: x => 'Che differenza c\'è fra «' + x + '» e il resto del capitolo?', eccezione: x => 'Quando «' + x + '» non vale?',
  applicazione: x => 'Come useresti «' + x + '» per spiegare un fatto nuovo?'
};
const nuovi = lista.filter(f => f.rel.indexOf(vault + '/Materiale Studio/Sorgenti/') !== 0);
ANG.forEach(a => {
  const items = [];
  rami.forEach(r => [0, 1].forEach(k => items.push({ question: FORME[a](r) + (k ? ' (seconda versione)' : ''), ramo: r, l1: r, livello: k ? 'ponte' : 'base', guide: 'traccia finta' })));
  const set = { id: 'set_finto_' + a, title: root + ' — Domande aperte · ' + a, type: 'Domande aperte', items, angle: a };
  const html = win.buildOpenQuestionsHtml(set, { mapName: root, includeBar: false, now: '06/09/2026' });
  nuovi.push({ rel: vault + '/Materiale Studio/Sorgenti/Domande-aperte-' + root + '-' + a + '.html', base64: Buffer.from(html, 'utf8').toString('base64'), size: html.length, mtime: Date.now() });
});
fs.writeFileSync(dest, JSON.stringify(nuovi));
console.log(ANG.length + ' fogli finti (' + rami.length + ' rami × 2) in ' + dest);
