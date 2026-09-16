#!/usr/bin/env node
/* tools/sincronizza.js — le copie VERBATIM da «MappAI re»
   -------------------------------------------------------------------------
   MappAI studente non importa nulla da MappAI a runtime (stessa regola del
   misuratore): i moduli che le servono sono COPIE byte-per-byte, elencate qui
   e in nessun altro posto. Questo script le copia; `tests/riuso-divergenza.
   test.js` confronta gli hash e fallisce dicendo quali file sono cambiati di là.
   Un file copiato NON si modifica mai qui: ciò che deve comportarsi in modo
   diverso vive in `public/js/studente/` (vedi RIUSO.md).

     node tools/sincronizza.js            copia e stampa che cosa è cambiato
     node tools/sincronizza.js --verifica solo il confronto, niente scritture */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const QUI = path.join(__dirname, '..');
const LA = process.env.MAPPAI_RE || path.join(QUI, '..', 'MappAI re');

/* I file, relativi a `public/` di entrambi i repo. L'ORDINE dei moduli è quello
   di `index.html` di MappAI (l'ordine di caricamento è una dipendenza). */
const FILES = [
  /* vendor e librerie */
  'js/tailwind.js', 'js/jspdf.umd.min.js', 'js/vendor/svg2pdf.umd.min.js',
  'js/vendor/katex-0.16.9.min.css', 'js/vendor/katex-0.16.9.min.js',
  'js/vendor/katex-auto-render-0.16.9.min.js', 'js/vendor/katex-LICENSE.txt',
  'js/vendor/spacemono-font.js', 'js/vendor/space-mono-incorpora.js',
  'js/vendor/testme-sans-font.js', 'js/vendor/testme-sans-incorpora.js',
  'js/vendor/testme-alt-font.js', 'js/vendor/testme-alt-incorpora.js',
  'js/vendor/atkinson-font.js', 'js/vendor/atkinson-incorpora.js',
  'js/d3.v7.min.js', 'js/lucide.min.js',
  /* traduzioni */
  'traduzioni/it_translations.js', 'traduzioni/en_translations.js', 'traduzioni/i18n-helper.js',
  /* CSS */
  'css/style.css', 'css/mappai-modal-tokens.css', 'css/mappai-stile-manifesto.css', 'css/mappai-console-manifesto.css',
  /* moduli, nell'ordine di index.html */
  'js/mappai-text-utils.js', 'js/mappai-math.js', 'js/mappai-relations.js',
  'js/app.js',
  'js/mappai-font-core.js', 'js/mappai-font.js',
  'js/mappai-modal-core.js', 'js/mappai-modal.js',
  'js/mappai-console-bento.js',
  'js/mappai-bento-composizione.js',   /* MappAIBento: colori e disposizione dei riquadri bento (senza, la console resta nuda e scura) */
  'js/mappai-ui-modals.js', 'js/mappai-teach-core.js', 'js/mappai-storage-lang.js',
  'js/mappai-d3-render.js', 'js/mappai-ui-canvas.js',
  'js/mappai-latex.js',
  'js/mappai-timeline-core.js', 'js/mappai-timeline.js',
  'js/mappai-print-layout.js', 'js/mappai-doc-bar.js', 'js/mappai-doc-head.js',
  'js/mappai-nodesheet-core.js', 'js/mappai-docedit-core.js', 'js/mappai-quiz-print.js',
  'js/mappai-study-export-core.js', 'js/mappai-study-doc.js',
  'js/mappai-causal-core.js', 'js/mappai-causal-chains.js',
  'js/mappai-branch-synthesis.js',
  'js/mappai-studio-layouts.js', 'js/mappai-studio-draw.js', 'js/mappai-studio-view.js',
  'js/mappai-node-styling.js',
  'js/mappai-mastery.js', 'js/mappai-study-bus.js',
  'js/mappai-active-study-core.js', 'js/mappai-active-study.js',
  'js/mappai-live-core.js', 'js/mappai-live-reports.js',
  'js/mappai-console-manifesto.js',
  'js/mappai-scelta-core.js', 'js/mappai-scelta-view.js', 'js/mappai-scelta.js',
  'js/mappai-files-core.js', 'js/mappai-vista-core.js', 'js/mappai-pipeline-core.js',
  'js/mappai-sidebar-resize.js', 'js/mappai-mastery-view.js', 'js/mappai-effort-view.js',
  'js/mappai-celeration.js', 'js/mappai-study-path.js', 'js/mappai-palace.js', 'js/mappai-pomodoro.js',
  'js/mappai-user-profile.js', 'js/mappai-search-finder.js',
  'js/mappai-vault-manager.js', 'js/mappai-vault-io.js',
  'js/mappai-print-dossier.js', 'js/mappai-context-menu.js',
  'js/mappai-flashcards-sr.js', 'js/mappai-study-session.js',
  'js/mappai-a11y.js', 'js/mappai-tts-reader.js'
];
/* cartelle copiate per intero (caratteri) */
const CARTELLE = ['fonts', 'js/vendor/katex-fonts'];

function sha(p) { return crypto.createHash('sha1').update(fs.readFileSync(p)).digest('hex'); }
function tutti() {
  const out = FILES.slice();
  CARTELLE.forEach(c => {
    const d = path.join(LA, 'public', c);
    if (fs.existsSync(d)) fs.readdirSync(d).forEach(f => { if (f.charAt(0) !== '.') out.push(c + '/' + f); });
  });
  return out;
}
/* Confronta: ritorna { mancanti, diversi, uguali } relativi a `public/`. */
function confronta() {
  const r = { mancanti: [], diversi: [], uguali: [], assenteDiLa: !fs.existsSync(path.join(LA, 'public')) };
  if (r.assenteDiLa) return r;
  tutti().forEach(f => {
    const a = path.join(LA, 'public', f), b = path.join(QUI, 'public', f);
    if (!fs.existsSync(a)) { r.mancanti.push(f); return; }
    if (!fs.existsSync(b)) { r.diversi.push(f); return; }
    (sha(a) === sha(b) ? r.uguali : r.diversi).push(f);
  });
  return r;
}
function copia() {
  const r = confronta();
  if (r.assenteDiLa) { console.log('MappAI re non è sul disco (' + LA + '): niente da copiare.'); return r; }
  r.diversi.forEach(f => {
    const a = path.join(LA, 'public', f), b = path.join(QUI, 'public', f);
    fs.mkdirSync(path.dirname(b), { recursive: true });
    fs.copyFileSync(a, b);
    console.log('  copiato  ' + f);
  });
  if (r.mancanti.length) console.log('  ⚠️ NON esistono in MappAI re: ' + r.mancanti.join(', '));
  console.log((r.diversi.length ? r.diversi.length + ' file copiati' : 'niente da copiare') + ' · ' + r.uguali.length + ' già uguali');
  return r;
}

module.exports = { FILES, CARTELLE, LA, QUI, tutti, confronta, copia };
if (require.main === module) {
  if (process.argv.indexOf('--verifica') >= 0) {
    const r = confronta();
    if (r.assenteDiLa) { console.log('MappAI re assente: confronto saltato'); process.exit(0); }
    r.diversi.forEach(f => console.log('  DIVERSO  ' + f));
    r.mancanti.forEach(f => console.log('  MANCA    ' + f));
    console.log(r.diversi.length + ' diversi · ' + r.mancanti.length + ' mancanti · ' + r.uguali.length + ' uguali');
    process.exit(r.diversi.length || r.mancanti.length ? 1 : 0);
  } else copia();
}
