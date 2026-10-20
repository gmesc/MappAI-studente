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
    assert.ok(/mc: true, split: !!st\.split/.test(ramo), 'la prova MC deve seguire la scelta schermo pieno / diviso');
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
