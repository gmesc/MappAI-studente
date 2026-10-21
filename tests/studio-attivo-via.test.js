'use strict';
/*
 * Packet 0117 — sull'iPad la finestra «Studio attivo» non c'è più (Giacomo, 20/10).
 * Le prove si scelgono nella console del progetto (tre tabelle, vedi
 * studia-core.test.js) e partono sempre con la mappa aperta accanto. Qui si
 * prova che nessuna strada porta più al launcher: né il menu della mappa, né
 * il bottone «Prova» della console, né la spunta della mappa.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const leggi = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const senzaCommenti = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '').replace(/^\s*\/\/.*$/gm, '');

test('menu della mappa: niente voce «Studio attivo»', () => {
    const h = senzaCommenti(leggi('public/index.html'));
    const menu = h.slice(h.indexOf('id="floating-actions-menu"'), h.indexOf('id="floating-actions-toggle"'));
    assert.ok(menu.length > 100, 'menu della mappa non trovato');
    assert.ok(!/openLauncher/.test(menu), 'il menu apre ancora il launcher');
    assert.ok(!/ui_active_study_btn/.test(menu), 'la voce «Studio attivo» è ancora nel menu');
});

test('console del progetto: niente ramo «Prova», le righe delle prove avviano', () => {
    const c = senzaCommenti(leggi('public/js/studente/console.js'));
    assert.ok(!/openLauncher/.test(c), 'la console apre ancora il launcher');
    assert.ok(!/a === 'prova'/.test(c), 'il ramo del bottone «Prova» è ancora lì');
    assert.ok(/\^\(aperte\|mc\):/.test(c) || (/aperte:/.test(c) && /mc:/.test(c)), 'le righe aperte:<i> e mc:<id> non sono gestite');
    assert.ok(/'su-misura'/.test(c), 'la riga «Scegli ramo e angolo» non è gestita');
    assert.ok(/leggiProve/.test(c), 'la console non legge le prove del progetto');
    assert.ok(/avviaDa/.test(c), 'la console non avvia la prova');
});

test('autotest: niente launcher né spunta della mappa; leggiProve e avviaDa esposte', () => {
    const a = senzaCommenti(leggi('public/js/studente/autotest.js'));
    assert.ok(!/function openLauncher/.test(a), 'il launcher è ancora definito');
    assert.ok(!/splitRicordato|mappai_studente_split|st\.split/.test(a), 'la scelta della mappa è ancora letta o ricordata');
    assert.ok(/window\.MappAIStudenteAutotest = \{[^}]*leggiProve[^}]*\}/.test(a), 'leggiProve non è esposta');
    assert.ok(/window\.MappAIStudenteAutotest = \{[^}]*avviaDa[^}]*\}/.test(a), 'avviaDa non è esposta');
    assert.strictEqual((a.match(/split: true/g) || []).length, 3, 'le tre prove partono con la mappa aperta');
});

test('nessun file dello studente ricorda più la spunta della mappa', () => {
    const dir = path.join(ROOT, 'public/js/studente');
    fs.readdirSync(dir).filter(f => f.endsWith('.js')).forEach(f => {
        assert.ok(!/mappai_studente_split|st_split/.test(senzaCommenti(fs.readFileSync(path.join(dir, f), 'utf8'))), f + ' parla ancora della spunta');
    });
});
