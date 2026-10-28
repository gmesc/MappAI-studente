'use strict';
/*
 * Packet 0128 (lotto B) — le flashcard nel pannello dell'iPad: l'innesto.
 *
 * Giacomo, 26/10: «Porta le flashcard nello split in cui vivono i materiali di studio, lo split della
 * mappa con le flashcard rimane collassato e può essere aperto dallo user tramite la maniglia.» Il
 * player di MappAI (copiato, `mappai-study-session.js`) lavora per id: si sposta nel pannello e la
 * logica resta quella di sempre (registrazione sul bus compresa). Qui si prova l'innesto; l'aspetto
 * vero lo prova il gate nel simulatore.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const leggi = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const senzaCommenti = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');
function corpo(src, da, a) {
    const i = src.indexOf(da), j = a ? src.indexOf(a, i + da.length) : src.length;
    assert.ok(i >= 0, 'non trovato: ' + da);
    return src.slice(i, j < 0 ? src.length : j);
}
const FC = () => senzaCommenti(leggi('public/js/studente/flashcard.js'));

test('flashcard.js: avvolge loadStudySet, closeStudyPlayer e printFlashcardSet una volta sola', () => {
    const s = FC();
    assert.ok(/window\.loadStudySet = function \(id\) \{ return apri\(id, orig\); \};/.test(s), 'un mazzo si apre dal pannello');
    assert.ok(/window\.loadStudySet\.__pannello = true/.test(s) && /orig\.__pannello\) return/.test(s), 'una volta sola');
    assert.ok(/window\.closeStudyPlayer = function \(\)/.test(s), '«Torna alla Mappa» e la × del player chiudono il pannello');
    assert.ok(/window\.printFlashcardSet = function \(id\)/.test(s), 'la stampante della sidebar fa lo stesso PDF');
});

test('flashcard.js: solo i mazzi di flashcard, solo con l\'interruttore acceso; il resto come prima', () => {
    const a = corpo(FC(), 'function apri(', '\n    function ');
    assert.ok(/set\.mode !== 'flashcard'/.test(a) && /return orig\(id\)/.test(a), 'un quiz passa al player di prima');
    assert.ok(/localStorage\.getItem\('mappai_studente_flashcard_pannello'\) !== '0'/.test(FC()), 'l\'interruttore, acceso salvo «0»');
});

test('flashcard.js: il pannello nasce a tutto schermo con la maniglia, col contatore e senza «PDF» nella barra (allargamento 13)', () => {
    const a = corpo(FC(), 'function apri(', '\n    function ');
    assert.ok(/D\(\)\.apri\(\{[\s\S]*?mappaChiusa: true[\s\S]*?\}\)/.test(a), 'mappa chiusa, si riapre con la maniglia (Giacomo: «rimane collassato»)');
    assert.ok(/contatore: true/.test(a), 'il posto del contatore nella barra della × (regola dello 0126)');
    /* allargamento 13 (Giacomo, 27/10): «Su iPad le flashcard sono stampabili solo dalla tabella flashcard presente nella home del progetto» */
    assert.ok(!/stampa:/.test(a), 'nessun «PDF» nella barra del pannello');
    assert.ok(/monta: function \(host, conta\)/.test(a), 'chi monta riceve il corpo e il contatore');
    assert.ok(/host\.appendChild\(modal\)/.test(a), 'il player si sposta nel corpo del pannello');
    assert.ok(/host\.__pulisci = function/.test(a) && /document\.body\.appendChild\(modal\)/.test(a), 'e torna al suo posto quando il pannello si libera');
    assert.ok(/new MutationObserver/.test(a), 'il contatore segue il player');
});

test('flashcard.js: il «PDF» prova prima il pieghevole, propone il fronte e retro, salva la scelta e stampa col nome giusto', () => {
    const p = corpo(FC(), 'function pdf(', '\n    function ');
    assert.ok(/printFlashcardSheet\(Object\.assign\(C\(\)\.opzioni\(set, \{ forma: 'piega', lato: pref\.lato \}, progetto\), \{ toDisk: \{\} \}\)\)/.test(p), 'il pieghevole vero, per sapere se rimpicciolisce');
    assert.ok(/C\(\)\.avvisoPiega\(/.test(p) && /C\(\)\.schemaPdf\(pref, t, avviso\)/.test(p), 'l\'avviso nella scelta');
    assert.ok(/localStorage\.setItem\(C\(\)\.PREF_KEY, C\(\)\.scriviPref\(e\.pref\)\)/.test(p), 'la scelta resta');
    assert.ok(/printFlashcardTestSheet\(\{ fmt: '2x2v', lato: e\.pref\.lato, toDisk: \{\} \}\)/.test(p), 'il foglio di prova');
    assert.ok(/C\(\)\.nomeFile\(/.test(p) && /C\(\)\.nomeProva\(/.test(p), 'i nomi dalla regola dello 0126');
    assert.ok(/stampaPdfB64\(/.test(FC()), 'al menu di stampa di iOS, come il foglio dei nodi');
});

test('console.js: la tessera «Flashcard» non disegna la scheda di un dossier che il mazzo coprirebbe', () => {
    const a = corpo(senzaCommenti(leggi('public/js/studente/console.js')), 'function apriFlashcard(', '\n    function ');
    assert.ok(/apriMappa\(fullPath, false\)/.test(a));
    assert.ok(/window\.loadStudySet\(/.test(a), 'il mazzo passa da loadStudySet (avvolto)');
});

test('foglio-nodi.js: l\'avviso del generatore sotto l\'anteprima, al posto del silenzio', () => {
    const s = senzaCommenti(leggi('public/js/studente/foglio-nodi.js'));
    assert.ok(/class="sf-avviso"/.test(s), 'il posto dell\'avviso');
    assert.ok(/r\.avvisi && r\.avvisi\.sotto && r\.avvisi\.sotto\.length/.test(s), 'letto dal risultato del generatore');
});

test('studente.css: il player nel pannello, «Salva nel Vault» e le stampanti della sidebar nascosti', () => {
    const c = leggi('public/css/studente.css');
    assert.ok(/#studente-dock #study-player-modal\.sd-player\s*\{[^}]*position:\s*static/.test(c), 'niente velo né riquadro fisso nel pannello');
    assert.ok(/\.sd-player [^{]*:has\(#study-player-progress\)[^{]*\{[^}]*display:\s*none/.test(c), 'la testata del player (titolo e «1 / 10») sta nella barra');
    assert.ok(/html\.studente #study-summary-view \[onclick\*="saveStudyReport"\][^{]*\{[^}]*display:\s*none/.test(c), '«Salva nel Vault»: sull\'iPad non salva (manca saveChatTranscript)');
    assert.ok(/html\.studente #study-sets-container \[data-set-azione="stampa"\][^{]*\{[^}]*display:\s*none/.test(c), 'la stampante dei quiz (Giacomo: «Nascondila sui quiz») e, dall\'allargamento 13, dei mazzi');
});

test('index.html: i due file nuovi dopo il pannello, e il segno 0128 nel ?v= (come prefisso)', () => {
    const h = leggi('public/index.html');
    const i = h.indexOf('js/studente/documenti.js'), a = h.indexOf('js/studente/flashcard-core.js'), b = h.indexOf('js/studente/flashcard.js');
    assert.ok(i > 0 && a > i && b > a, 'flashcard-core poi flashcard, dopo documenti');
    ['js/studente/flashcard-core.js', 'js/studente/flashcard.js', 'js/studente/console.js', 'js/studente/foglio-nodi.js', 'css/studente.css',
        'js/mappai-print-layout.js', 'js/mappai-print-dossier.js', 'js/mappai-nodesheet-core.js', 'js/mappai-quiz-print.js', 'traduzioni/en_translations.js'].forEach((f) => {
        assert.ok(new RegExp('(src|href)="' + f.replace(/[.]/g, '\\.') + '\\?v=[^"]*0128').test(h), f);
    });
});

/* ── gate del 27/10 nel simulatore (Giacomo): «per i tre bottoni riutilizza i colori dei bottoni 'la so', 'non la so',
   'non capisco' delle domande 'meta'»; «usa la stessa dimensione dei chip delle domande 'meta'»; «il font della
   risposta deve avere la stessa dimensione e stile della domanda». Sull'iPad, nel pannello come a tutto schermo. */
const BOTTONI = 'html.studente #flashcard-back-container button[onclick*="nextStudyItem"]';
function regola(css, sel) {
    const i = css.indexOf(sel + ' {');
    assert.ok(i >= 0, 'manca la regola: ' + sel);
    return dichiarazioni(css.slice(i + sel.length + 2, css.indexOf('}', i)));
}
function dichiarazioni(s) {
    const o = {};
    s.split(';').forEach((d) => { const j = d.indexOf(':'); if (j > 0) o[d.slice(0, j).trim()] = d.slice(j + 1).trim(); });
    return o;
}
/* i chip del velo «Meta» come li scrive mappai-scelta-view.js (copia di re): la base e la misura grande */
function chipMeta(sel) {
    const sv = leggi('public/js/mappai-scelta-view.js'), i = sv.indexOf("'" + sel + '{');
    assert.ok(i >= 0, 'manca ' + sel + ' in mappai-scelta-view.js');
    return dichiarazioni(sv.slice(i + sel.length + 2, sv.indexOf('}', i)));
}

test('i tre bottoni della carta: i colori dei chip «Meta» — 😎 la so, 😩 non la so, 🤔 non ho capito', () => {
    const PC = require('../public/js/studente/prova-core.js');
    const c = senzaCommenti(leggi('public/css/studente.css'));
    [['easy', 'capito'], ['hard', 'nonso'], ['good', 'noncapita']].forEach(([sr, k]) => {
        const ch = PC.CHIP_PERCHE.find((x) => x.k === k), sel = BOTTONI.replace('nextStudyItem', "nextStudyItem('" + sr + "')");
        const r = regola(c, sel);
        assert.strictEqual(r['border-color'], ch.colore, sr + ': la cornice nel colore pieno del chip «' + ch.et + '»');
        assert.strictEqual(r.color, ch.testo || ch.colore, sr + ': il testo nel colore leggibile del chip «' + ch.et + '»');
        assert.strictEqual(regola(c, sel + ':active').background, 'color-mix(in srgb, ' + ch.colore + ' 14%, white)',
            sr + ': il tocco tinge lo sfondo come il chip scelto (dipingiChip)');
    });
});

test('i tre bottoni della carta: la misura dei chip «Meta» (il velo della prova su misura)', () => {
    const c = senzaCommenti(leggi('public/css/studente.css'));
    const r = regola(c, BOTTONI), base = chipMeta('.sc-chip'), grande = chipMeta('.sc-giudizio .sc-chip');
    assert.strictEqual(r['min-height'], grande['min-height'], 'alti come i chip del velo');
    assert.strictEqual(r['font-size'], grande['font-size'], 'il corpo dei chip del velo');
    ['border-radius', 'padding', 'font-weight', 'background'].forEach((p) => assert.strictEqual(r[p], base[p], p + ' come il chip'));
    assert.strictEqual(r['flex-direction'], 'row', 'l\'emoji accanto alla parola, dentro la pillola');
    assert.strictEqual(regola(c, BOTTONI + ' > span:first-child').margin, '0', 'l\'emoji senza il margine sotto');
});

test('la risposta della carta ha la grandezza e lo stile della domanda', () => {
    const h = leggi('public/index.html');
    const cls = (id) => { const m = h.match(new RegExp('<p class="([^"]*)" id="' + id + '"')); assert.ok(m, id); return m[1]; };
    assert.strictEqual(cls('flashcard-back-text'), cls('flashcard-front-text'), 'stesse classi: corpo, peso, colore, interlinea');
    /* style.css (copia di re) fissa le due grandezze con !important: la risposta prende quella della domanda */
    const st = leggi('public/css/style.css'), fronte = dichiarazioni(st.slice(st.indexOf('#flashcard-front-text {') + 23, st.indexOf('}', st.indexOf('#flashcard-front-text {'))));
    const r = regola(senzaCommenti(leggi('public/css/studente.css')), 'html.studente #flashcard-back-text');
    assert.strictEqual(r['font-size'], fronte['font-size'], 'la stessa espressione della domanda, zoom compreso');
});

/* gate del 27/10 (Giacomo): «appare il modale che però deve essere adattato al layout ipad degli altri modali»: le regole
   di «Domande su misura» (0126) valgono anche per le due sezioni di «PDF delle flashcard» — stesse righe, stessi valori */
test('studente.css: «PDF delle flashcard» nelle stesse regole di «Domande su misura»', () => {
    const c = senzaCommenti(leggi('public/css/studente.css'));
    const sels = (frammento) => {
        const out = [];
        let i = c.indexOf(frammento);
        while (i >= 0) {
            const a = c.lastIndexOf('}', i) + 1, b = c.indexOf('{', i);
            out.push(c.slice(a, b));
            i = c.indexOf(frammento, b);
        }
        return out;
    };
    [['.mm-sez[data-sez="dove"] .mm-opz,', 'la riga da toccare'], ['.mm-sez[data-sez="dove"] .mm-opz:has(input:checked)', 'la riga scelta'],
        ['.mm-sez[data-sez="dove"] .mm-opz input', 'il pallino'], ['.mm-sez[data-sez="dove"] .mm-opz__t', 'la parola a 19'],
        ['.mm-sez[data-sez="dove"] .mm-opz__d', 'la descrizione a 16'], ['.mm-sez[data-sez="dove"] .mm-sez__t', 'il titolo della sezione'],
        ['.mm-box:has(.mm-sez[data-sez="dove"]) .mm-btn', 'i bottoni a 52'], ['.mm-box:has(.mm-sez[data-sez="dove"]) .mm-close', 'la ×'],
        ['.mm-body:has(> .mm-sez[data-sez="dove"])', 'in orizzontale le due domande affiancate']].forEach(([f, cosa]) => {
        const l = sels(f);
        assert.ok(l.length, 'manca la regola: ' + f);
        l.forEach((sel) => ['fc-forma', 'fc-lato'].forEach((id) => {
            if (f.startsWith('.mm-box') || f.startsWith('.mm-body')) assert.ok(sel.includes(f.replace('"dove"', '"fc-forma"')), cosa + ': ' + sel);
            else assert.ok(sel.includes(f.replace('"dove"', '"' + id + '"').replace(/,$/, '')), cosa + ' (' + id + '): ' + sel);
        }));
    });
    assert.ok(/\.mm-sez\[data-sez="fc-avviso"\][^{]*\{[^}]*grid-column:\s*1 \/ -1/.test(c), 'l\'avviso del pieghevole sotto le due domande, largo quanto la finestra');
});

/* ── allargamento 13 (Giacomo, 27/10): il report delle scelte dopo l'ultima carta; allargamento 21 (27/10): «il report
   delle flashcard deve aver lo stesso layout degli altri materiali, quindi l'emoji con sotto il testo 'Hai finito!'»;
   le sue scelte: «Come gli altri» (il report si scrive da solo, il 💾 lo apre, «Finito» se ne va), «Le tre scelte». ── */
test('flashcard.js: alla fine il report si scrive da solo e il pannello mostra la chiusura degli altri materiali, col riquadro delle tre scelte', () => {
    const s = FC();
    assert.ok(!/sd-fc-finito|st_fc_finito/.test(senzaCommenti(s)), '«Finito» non c\'è più');
    assert.ok(/if \(fine\) mostraFine\(\);/.test(corpo(s, 'function aggiorna(', '\n    function ')), 'la fine arriva col riepilogo del player');
    const w = corpo(s, 'function scrivi(', '\n    function ');
    assert.ok(/C\(\)\.reportScelte\(items, res, \{/.test(w), 'le scelte dal player');
    assert.ok(/A\.scriviReport\(rep, titolo, '', \(set && set\.angle\) \|\| '', \{ tipo: 'Flashcard', attivita: 'flashcard' \}\)/.test(w), 'scritto come il report della scelta multipla');
    const f = corpo(s, 'function mostraFine(', '\n    function ');
    assert.ok(/if \(!c \|\| c\.fine \|\|/.test(f), 'una volta sola');
    assert.ok(/var scrittura = scrivi\(c\.set\);/.test(f) && /nascondiPlayer\(c\.modal\);/.test(f), 'scrive da solo e toglie il player');
    assert.ok(/SV\.mostraEsito\(box, \{\s*t: window\.t, cfg: \{ semplice: true \}, profilo: \{ righe: \[\], conteggio: \{\} \}, titoloLargo: 0\.7,/.test(f), 'la chiusura della scelta multipla e delle domande aperte, «Hai finito!» al 70%');
    assert.ok(/onSalva: function \(\) \{\s*scrittura\.then\(/.test(f) && /D\(\)\.apriFile\(s\.activeVaultPath, r\.rel \+ '\/report\.html'/.test(f) && /C\(\)\.titoloReport\(/.test(f), 'il 💾 aspetta la scrittura e apre il report nel pannello');
    assert.ok(/rq\.textContent = C\(\)\.riquadroScelte\(items, res\);/.test(f), 'il riquadro con le tre scelte');
    const a = corpo(s, 'function apri(', '\n    function ');
    assert.ok(/corrente = \{ conta: conta, oss: oss, host: host, modal: modal, set: set, fine: null \};/.test(a), 'il mazzo sa dove montare la fine');
    assert.ok(/c\.fine\.parentNode\.removeChild\(c\.fine\)/.test(a), 'la fine se ne va col mazzo');
    const c = senzaCommenti(leggi('public/css/studente.css'));
    assert.ok(/#studente-dock \.sd-fc-fine \{ height: 100%; \}/.test(c), 'alta quanto il pannello: «Hai finito!» e il 🎉 si misurano su di lei');
    assert.ok(!/study-summary-mistakes|sd-stampa-pdf\[hidden\]/.test(c), 'tolte le regole del riepilogo (allargamento 20) e di «Finito» nascosto');
    const h = leggi('public/index.html');
    assert.ok(/css\/studente\.css\?v=[^"]*0128-6/.test(h) && /studente\/flashcard-core\.js\?v=p0128-4/.test(h) && /studente\/flashcard\.js\?v=p0128-3/.test(h), 'i ?v=');
    const at = senzaCommenti(leggi('public/js/studente/autotest.js'));
    assert.ok(/scriviReport: scriviReport \}/.test(at), 'autotest lo esporta');
    assert.ok(/tipo: \(o\.tipo === 'quiz' \|\| o\.tipo === 'flashcard'\) \? o\.tipo : 'domande'/.test(at), 'la cartella della sessione col suo genere');
});

/* ── allargamento 22 (Giacomo, 27/10, sul report delle flashcard nel pannello): «ingrandisci il font del report».
   Misurato nel browser su un report nuovo: Space Mono 400 e 700 caricati dentro il file, testo 16, titolo 26.
   Dal packet 0132 (MappAI re; al «vai» del 28/10: «riallinea le prove vecchie che controllano i valori di prima») i corpi
   sono quelli della veste comune dei report, nella copia di mappai-doc-head.js: qui resta il carattere dentro il file. ── */
test('autotest.js: il report che scrive l\'iPad porta dentro il suo carattere, e i corpi sono quelli della veste comune (0132)', () => {
    const at = senzaCommenti(leggi('public/js/studente/autotest.js'));
    assert.ok(!/STILE_REPORT/.test(at) && !/\.lr-di-q\{font-size/.test(at), 'nessun corpo sovrascritto sopra il report');
    assert.ok(/F\.styleDocumento\('space-mono'\)/.test(at), 'le @font-face di Space Mono dentro il file');
    assert.ok(/html\.replace\('<\/head>', st \+ '<\/head>'\)/.test(at), 'in testa, dopo lo stile del report: vince');
    const w = corpo(at, 'function scriviReport(', '\n    function ');
    assert.ok(/F\.precaricaIncorporabile\('space-mono'\)/.test(w) && w.indexOf("precaricaIncorporabile('space-mono')") < w.indexOf('reportLeggibile('), 'i byte prima di costruire');
    assert.ok(/scrivi\(cart\.rel \+ '\/report\.html', \{ text: reportLeggibile\(R\.buildStudentsReportHtml\(meta, rep\.results, \{ unAllievo: true \}\)\) \}\)/.test(w), 'il report scritto è quello leggibile (0132: la scheda di un allievo, col titolo della barra)');
    assert.ok(/studente\/autotest\.js\?v=p0126-1-0128-2/.test(leggi('public/index.html')), 'il ?v=');
});
