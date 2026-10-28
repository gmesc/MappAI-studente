/*
 * Packet 0132 (MappAI re) — uno stile per tutti i report, anche sull'iPad.
 * Giacomo, 27/10: «Il foglio delle aperte ma con un corpo del titolo di 3pt più grandi»; «13px ma aumenta l'interlinea»;
 * «Interlinea delle risposte: 2,0»; «accetto tutte le proposte grafiche della versione 0132».
 * D3: sull'iPad la scelta multipla e le flashcard scrivono la scheda di UN allievo, come il 💾 del telefono.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const leggi = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const senzaCommenti = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');
const DH = require('../public/js/mappai-doc-head.js');
const LR = require('../public/js/mappai-live-reports.js');
const P = require('../public/js/studente/prova-core.js');
function corpo(src, da, a) {
    const i = src.indexOf(da), j = a ? src.indexOf(a, i + da.length) : src.length;
    return i < 0 ? '' : src.slice(i, j < 0 ? src.length : j);
}

test('autotest: la scelta multipla e le flashcard scrivono la scheda di un allievo (D3)', () => {
    const w = corpo(senzaCommenti(leggi('public/js/studente/autotest.js')), 'function scriviReport(', '\n    function ');
    assert.ok(/reportLeggibile\(R\.buildStudentsReportHtml\(meta, rep\.results, \{ unAllievo: true \}\)\)/.test(w), 'unAllievo');
    /* gate del 28/10: il titolo grande come la barra del pannello, col tipo e l'angolo come materiale */
    assert.ok(/var meta = Object\.assign\(\{\}, rep\.meta, \{ materiale: \[g\.tipo, angolo\]\.filter\(Boolean\)\.join\(' · '\) \}\);/.test(w), 'il materiale');
    const lungo = LR.buildStudentsReportHtml({ mapTitle: 'Sistema Albero', activity: 'Quiz — Sistema Albero — Scelta Multipla · definizione', materiale: 'Scelta multipla · Definizione' },
        { joined: 1, questionCount: 0, perStudent: [{ displayName: 'Io', items: [] }] }, { unAllievo: true });
    assert.ok(lungo.includes('<h1 class="mm-dh__t">Sistema Albero · Scelta multipla · Definizione · Report allievo</h1>'), 'niente nome lungo del set nel titolo');
    const meta = { mapTitle: 'Scrittura', materiale: 'Flashcard', dateStr: '27/10/2026' };
    const s = { displayName: 'Io', emoji: '', num: '', answered: 1, blankCount: 0, manualCount: 0, accuracyPct: 0, flashcard: true,
        items: [{ outcome: 'wrong', text: 'Chi scriveva?', yourText: 'Non conoscevo', correctText: 'Gli scribi' }] };
    const h = LR.buildStudentsReportHtml(meta, { joined: 1, questionCount: 1, perStudent: [s] }, { unAllievo: true });
    assert.ok(h.includes('<h1 class="mm-dh__t">Scrittura · Flashcard · Report allievo</h1>'), 'il titolo come il 💾');
    assert.ok(h.includes('<span class="mm-rp-et">La tua scelta</span>Non conoscevo') && h.includes('<span class="mm-rp-et">Risposta</span>Gli scribi'));
});

test('autotest: il report porta dentro Space Mono e non sovrascrive più i corpi (la veste è quella comune)', () => {
    const at = senzaCommenti(leggi('public/js/studente/autotest.js'));
    assert.ok(!/STILE_REPORT/.test(at), 'niente più corpi a 16 sopra il report');
    const rl = corpo(at, 'function reportLeggibile(', '\n    function ');
    assert.ok(/F\.styleDocumento\('space-mono'\)/.test(rl), 'il carattere dentro il file');
    assert.ok(!/font-size/.test(rl), 'nessun corpo sovrascritto');
});

test('autotest: il foglio delle risposte delle aperte è un report (titolo a 24, risposte a interlinea 2)', () => {
    const w = corpo(senzaCommenti(leggi('public/js/studente/autotest.js')), 'function scriviSessione(', '\n    function ');
    assert.ok(/QP\.buildOpenQuestionsHtml\([^;]*report: true/.test(w), 'report: true');
});

test('prova-core: le «Osservazioni» del foglio compilato con l\'interlinea delle risposte (D1)', () => {
    const h = P.codaHtml({ scartate: [], note: 'Ci ho messo tanto.' });
    assert.ok(new RegExp('class="oq-osservazioni"[^>]*font-size:13px; line-height:' + DH.REPORT.rispostaInterlinea + ';').test(h), 'interlinea ' + DH.REPORT.rispostaInterlinea);
});

test('l\'iPad nasconde ancora la barra e il piè dei report (vestiReport cerca il bottone di stampa dentro .no-print)', () => {
    const h = LR.buildStudentsReportHtml({ mapTitle: 'M' }, { joined: 1, questionCount: 0, perStudent: [{ displayName: 'Io', items: [] }] }, { unAllievo: true });
    assert.ok(/<div class="no-print"[^>]*>[\s\S]*?<button onclick="window\.print\(\)"/.test(h), 'la barra col bottone');
    assert.ok(h.includes('<div class="mm-dh-pie no-print">'), 'il piè è no-print');
});

test('index.html: il segno 0132 nel ?v= dei cinque file cambiati (come prefisso, senza la virgoletta)', () => {
    const h = leggi('public/index.html');
    for (const f of ['js/studente/autotest.js', 'js/studente/prova-core.js', 'js/mappai-doc-head.js', 'js/mappai-live-reports.js', 'js/mappai-quiz-print.js']) {
        assert.ok(new RegExp('src="' + f.replace(/[.]/g, '\\.') + '\\?v=[^"]*0132-1').test(h), f);
    }
});
