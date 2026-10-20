'use strict';
/*
 * Packet 0112 (lotto B) — sull'iPad il quiz a scelta multipla è quello del quiz LIVE.
 *
 * Prima, a schermo pieno, il quiz si apriva nel player storico di MappAI
 * (`loadStudySet`: domanda a 20 px, opzioni a ~16 px, nessuna voce); solo a
 * schermo diviso passava dalla view «a scelta». Ora passa SEMPRE dalla view
 * «a scelta», che disegna domanda, opzioni e verdetto col modulo comune
 * `mappai-quiz-mc-view.js` (copiato da MappAI re). Qui si prova l'innesto;
 * l'aspetto vero lo prova il gate sull'iPad.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const leggi = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

test('autotest: il quiz a scelta multipla non apre più il player storico, né a schermo pieno né diviso', () => {
    const src = leggi('public/js/studente/autotest.js');
    const ramo = src.slice(src.indexOf("if (st.sel === 'set-mc')"), src.indexOf("if (st.sel === 'set-aperte')"));
    assert.ok(ramo.length > 100, 'ramo set-mc non trovato');
    assert.ok(!/loadStudySet/.test(ramo.replace(/\/\*[\s\S]*?\*\//g, '')), 'il ramo set-mc chiama ancora loadStudySet');
    assert.ok(/mc: true, split: true/.test(ramo), 'la prova MC parte con la mappa aperta accanto, come le altre (0117)');
});

test('index: il modulo della scelta multipla si carica PRIMA della view «a scelta»', () => {
    const h = leggi('public/index.html');
    const a = h.indexOf('js/mappai-quiz-mc-view.js'), b = h.indexOf('js/mappai-scelta-view.js');
    assert.ok(a > 0, 'manca il tag del modulo');
    assert.ok(a < b, 'il modulo deve stare prima di mappai-scelta-view.js');
});

test('sincronizza: il modulo è fra i file copiati, prima della view «a scelta»', () => {
    const s = leggi('tools/sincronizza.js');
    const a = s.indexOf("'js/mappai-quiz-mc-view.js'"), b = s.indexOf("'js/mappai-scelta-view.js'");
    assert.ok(a > 0, 'il modulo non è nell\'elenco FILES');
    assert.ok(a < b);
});

test('il modulo c\'è, ed è quello di MappAI re (la copia non si ritocca di qua)', () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'public/js/mappai-quiz-mc-view.js')));
    const V = require(path.join(ROOT, 'public/js/mappai-quiz-mc-view.js'));
    assert.strictEqual(typeof V.opzioni, 'function');
    assert.match(V.CSS, /\.qmc \.q-testo \{ font-size: 24px/);
});

/* Gate (b) sull'iPad, 20/10: a schermo pieno il quiz MC stava in un modale piccolo.
   Giacomo: «con finestra full screen, mappa di default deve apparire collassata e la
   maniglia può rimanere visibile e attiva». Lo schermo diviso resta com'è. */
test('quiz MC a schermo pieno: nel pannello affiancato con la mappa chiusa, non in un modale', () => {
    const a = leggi('public/js/studente/autotest.js');
    const i = a.indexOf('var schema = null;');
    assert.ok(i > 0, 'il punto in cui si sceglie dove aprire la prova non c\'è più');
    const corpo = a.slice(i, a.indexOf('function fine(', i));
    // il pannello si usa anche per il quiz MC non diviso
    assert.match(corpo, /var inDock = !!o\.split \|\| !!o\.mc;/);
    assert.match(corpo, /if \(inDock\)/);
    // a schermo pieno la mappa nasce chiusa; diviso, no
    assert.match(corpo, /mappaChiusa: !o\.split/);
    // la fine della prova scrive dove la prova sta
    const f = a.slice(a.indexOf('function fine('), a.indexOf('function consegna('));
    assert.match(f, /if \(inDock\)/);
});

test('documenti: apri() accetta mappaChiusa e parte con la mappa collassata, la maniglia resta', () => {
    const d = leggi('public/js/studente/documenti.js');
    const i = d.indexOf('function apri(o) {');
    const corpo = d.slice(i, d.indexOf('if (o.iframe)', i));
    assert.match(corpo, /collasso = o\.mappaChiusa \? 'mappa' : null; misura\(memoria\(\)\);/);
    // chi non lo chiede resta com'era: mappa aperta, split a metà
    assert.equal(/collasso = null; misura\(memoria\(\)\);\s*\n\s*if \(o\.iframe\)/.test(d), false);
});
