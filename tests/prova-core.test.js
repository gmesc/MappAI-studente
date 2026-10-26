/* L'autotest: che cosa si può offrire su un vault, come si compone la prova su
   misura, che cosa va sul bus. Dati nella forma vera dei gemelli Sorgenti/. */
const { test } = require('node:test');
const assert = require('node:assert');
const P = require('../public/js/studente/prova-core.js');
const S = require('../public/js/mappai-scelta-core.js');

const ANG = ['definizione', 'causa', 'conseguenza'];
const FOGLI = ANG.map(a => P.foglioDaHtml('Domande-aperte-X-' + a + '.html', {
    title: 'X — Domande aperte · ' + a, angle: a, mode: 'open',
    items: [{ question: a + ' A1', ramo: 'Atmosfera' }, { question: a + ' A2', ramo: 'Atmosfera' }, { question: a + ' O1', ramo: 'Oceani' }]
}));
const NODES = [{ id: 'ROOT', level: 0, label: 'X' }, { id: 'L1_0', level: 1, label: 'Atmosfera' }, { id: 'L1_1', level: 1, label: 'Oceani' }];

test('foglioDaHtml: un gemello senza item non è un foglio', () => {
    assert.strictEqual(P.foglioDaHtml('x.html', { items: [] }), null);
    assert.strictEqual(FOGLI[0].tipo, 'open');
});

test('setMC: solo i set a scelta multipla con opzioni', () => {
    const sets = [{ mode: 'quiz', items: [{ q: 'a', options: ['1', '2', '3'] }] }, { mode: 'quiz', items: [{ q: 'vf', correct: 'Vero' }] }, { mode: 'flashcard', items: [{ front: 'f' }] }];
    assert.strictEqual(P.setMC(sets).length, 1);
});

test('opzioni: i rami se gli item li portano, gli angoli nell\'ordine dei tagli', () => {
    const pool = P.poolAperte(FOGLI);
    const o = P.opzioni(pool);
    assert.deepStrictEqual(o.rami, ['Atmosfera', 'Oceani']);
    assert.deepStrictEqual(o.angoli, ANG);
    assert.strictEqual(P.opzioni(P.poolAperte([{ titolo: 'v', tipo: 'open', items: [{ question: 'q' }] }])).rami, null, 'fogli vecchi: niente rami');
});

test('componi: un ramo · tutti gli angoli = due tempi sul pool non campionato', () => {
    const pool = P.poolAperte(FOGLI);
    const c = P.componi(pool, { ambito: 'ramo', ramo: 'Atmosfera', angoli: 'tutti' });
    assert.strictEqual(c.dueTempi, true);
    assert.strictEqual(c.pool.length, 6, 'due domande per angolo × tre angoli');
    const righe = S.perDomandaPerAngoli(c.pool)[0].righe;
    assert.strictEqual(righe.length, 2);
    assert.deepStrictEqual(righe[0].celle.map(v => v.angle), ANG);
    const st = P.statoIniziale(c.pool, c.dueTempi);
    assert.strictEqual(st.fase, 'scegli');
    assert.deepStrictEqual(Object.keys(st.risposte), []);
});

test('componi: tutta la mappa · un angolo = si risponde a tutto, subito', () => {
    const pool = P.poolAperte(FOGLI);
    const c = P.componi(pool, { ambito: 'tutto', angoli: 'uno', angolo: 'causa' });
    assert.strictEqual(c.dueTempi, false);
    assert.strictEqual(c.pool.length, 3);
    const st = P.statoIniziale(c.pool, c.dueTempi);
    assert.strictEqual(st.fase, 'rispondi');
    assert.strictEqual(Object.keys(st.risposte).length, 3, 'tutte prese');
});

test('voci: una per risposta scritta, col nodo L1 del ramo e il chip', () => {
    const pool = P.poolAperte(FOGLI);
    const st = { risposte: {}, letture: {} };
    st.risposte[pool[0].id] = { testo: 'scritta' };
    st.letture[pool[0].id] = { chip: 'capito' };
    st.risposte[pool[2].id] = {};                       /* presa ma vuota: non conta */
    const v = P.voci(pool, st, NODES);
    assert.strictEqual(v.length, 1);
    assert.deepStrictEqual(v[0], { nodeId: 'L1_0', label: 'Atmosfera', score: null, chip: 'capito' });
    st.risposte[pool[1].id] = { testo: 'sicura', auto: 3 };
    st.risposte[pool[3].id] = { testo: 'a caso', auto: 1 };
    const v2 = P.voci(pool, st, NODES);
    assert.deepStrictEqual(v2.map(x => x.score), [null, 1, 0], 'l\'autovalutazione è la misura delle aperte');
    assert.strictEqual(P.nodoDelRamo(NODES, 'oceani'), 'L1_1', 'senza maiuscole');
    assert.strictEqual(P.nodoDelRamo(NODES, 'Venti'), null);
});

test('nomeSessione: da FilesCore, col progressivo sulle cartelle già presenti', () => {
    const n0 = P.nomeSessione({ data: '2026-09-06T10:00:00Z', tipo: 'domande', mappa: 'Elettricità', ambito: 'Atmosfera' }, []);
    assert.strictEqual(n0, '2026-09-06 · Domande · Elettricità — Atmosfera · 00');
    const n1 = P.nomeSessione({ data: '2026-09-06T10:00:00Z', tipo: 'domande', mappa: 'Elettricità', ambito: 'Atmosfera' }, [n0, 'altro']);
    assert.strictEqual(n1, '2026-09-06 · Domande · Elettricità — Atmosfera · 01');
    assert.strictEqual(P.fmtData('2026-09-06T10:00:00Z').slice(3), '09/2026', 'GG/MM/AAAA');
});

test('foglioCompilato: le domande prese con «Perché:» e risposta; senza prese, tutte', () => {
    const pool = P.poolAperte(FOGLI);
    const st = { risposte: {}, letture: {} };
    st.risposte[pool[0].id] = { testo: 'La mia risposta' }; st.letture[pool[0].id] = { chip: 'capito' };
    st.risposte[pool[1].id] = {};
    const r = P.foglioCompilato(pool, st, P.CHIP_PERCHE, a => a.toUpperCase());
    assert.strictEqual(r.length, 2);
    assert.deepStrictEqual([r[0].ramo, r[0].angolo, r[0].perche, r[0].risposta], ['Atmosfera', 'DEFINIZIONE', 'la so', 'La mia risposta']);
    assert.strictEqual(r[1].risposta, '');
    assert.strictEqual(P.foglioCompilato(pool, {}, P.CHIP_PERCHE).length, pool.length, 'niente prese: tutte');
    const it = P.itemsHtml(r);
    /* gate del 26/10 (Giacomo): «nei riquadri con la risposta data dall'allievo non mostrare il tag 'Perché: la so'» */
    assert.strictEqual(it[0].risposta, 'La mia risposta');
    assert.strictEqual(it[1].risposta, '');
});

test('reportMC: dal player di MappAI alla forma del report QR', () => {
    const items = [{ q: 'A?', correct: 'a', explanation: 'perché a' }, { q: 'B?', correct: 'b' }];
    const res = { correct: 1, total: 2, mistakes: [{ q: 'B?', userAnswer: 'x', correctAnswer: 'b', explanation: '' }] };
    const r = P.reportMC(items, res, { mappa: 'M', titolo: 'Quiz — Set', data: '06/09/2026' });
    assert.strictEqual(r.pct, 50);
    assert.deepStrictEqual(r.results.perStudent[0].items.map(x => x.outcome), ['right', 'wrong']);
    assert.strictEqual(r.results.perStudent[0].items[1].yourText, 'x');
    assert.strictEqual(r.results.perStudent[0].items[0].yourText, 'a', 'la risposta giusta data');
    assert.strictEqual(r.meta.mapTitle, 'M');
});

test('split: orientamento e clamp', () => {
    assert.strictEqual(P.orientamento(768, 1024), 'portrait');
    assert.strictEqual(P.orientamento(1024, 768), 'landscape');
    assert.strictEqual(P.clampSplit(100, 1000, 360, 0.7), 360, 'sotto il minimo');
    assert.strictEqual(P.clampSplit(900, 1000, 360, 0.7), 700, 'sopra la quota');
    assert.strictEqual(P.clampSplit(500.4, 1000, 360, 0.7), 500);
    assert.strictEqual(P.clampSplit('x', 1000, 360, 0.7), 360, 'valore sporco');
});

test('MC in split: dal set al pool, il verdetto, il report dallo stato', () => {
    const set = { title: 'Quiz X', angle: 'causa', items: [{ q: 'A?', options: ['1', '2', '3'], correct: '2', explanation: 'e' }, { q: 'B?', options: ['x', 'y', 'z'], correct: 'z' }] };
    const pool = P.poolAperte([P.foglioDaSet(set)]);
    assert.strictEqual(pool.length, 2);
    assert.strictEqual(pool[0].tipo, 'mc');
    assert.strictEqual(pool[0].giusta, 1);
    assert.deepStrictEqual(P.verdetto(pool[0], { scelta: 1 }), { esito: 'right', giusta: '2', spiegazione: 'e' });
    assert.strictEqual(P.verdetto(pool[0], { scelta: 0 }).esito, 'wrong');
    assert.strictEqual(P.verdetto(pool[0], {}), null, 'senza scelta non c\'è verdetto');
    const st = { risposte: {} }; st.risposte[pool[0].id] = { scelta: 1 };
    const r = P.reportMCDaStato(pool, st, { mappa: 'M', titolo: 'Quiz X' });
    assert.deepStrictEqual(r.results.perStudent[0].items.map(x => x.outcome), ['right', 'blank']);
    assert.strictEqual(r.results.perStudent[0].items[0].yourText, '2');
    assert.strictEqual(r.pct, 50);
    assert.strictEqual(r.results.perStudent[0].blankCount, 1);
});

/* 16/9 — fogli misti con l'angolo per domanda, base prima di ponte, criteri come misura */
test('misti e criteri: `auto` non è un angolo, base prima di ponte, voci = spuntati/totali', () => {
    const vecchio = P.poolAperte([P.foglioDaHtml('Domande-aperte-X-misto.html', { angle: 'auto', items: [{ question: 'a?' }] })]);
    assert.deepStrictEqual(P.opzioni(vecchio).angoli, [], 'misto vecchio: nessuna scelta d\'angolo');
    const pool = P.poolAperte([P.foglioDaHtml('Domande-aperte-X-misto.html', { angle: 'auto', items: [
        { question: 'ponte?', angle: 'causa', livello: 'ponte', ramo: 'Atmosfera', criteria: ['uno', 'due', 'tre', 'quattro'] },
        { question: 'base?', angle: 'esempio', livello: 'base', ramo: 'Atmosfera' }
    ] })]);
    assert.deepStrictEqual(P.opzioni(pool).angoli.slice().sort(), ['causa', 'esempio']);
    assert.deepStrictEqual(P.componi(pool, { ambito: 'tutto', angoli: 'tutti' }).pool.map(v => v.testo), ['base?', 'ponte?']);
    const st = { risposte: {}, letture: {} };
    st.risposte[pool[0].id] = { testo: 'x', auto: 3, criteriVisti: true, spunte: [true, false, true, false] };
    st.risposte[pool[1].id] = { testo: 'y', auto: 2 };
    assert.deepStrictEqual(P.voci(pool, st, NODES).map(x => x.score), [0.5, 0.5], 'coi criteri vincono le spunte; senza, la scala a tre');
});

/* 0126, allargamento 3 (Giacomo al gate, 25/10): «il rapporto deve indicare anche le eventuali
   osservazioni dell'allievo e anche le domande scartare per i motivi 'non la so' e 'non ho capito
   la domanda'». Il foglio compilato tiene le prese; le scartate e le osservazioni vanno in coda. */
const POOL_SC = [
    { id: 'q1', testo: 'D1', ramo: 'Atmosfera', angle: 'causa' },
    { id: 'q2', testo: 'D2', ramo: 'Atmosfera', angle: 'definizione' },
    { id: 'q3', testo: 'D3', ramo: 'Oceani', angle: 'causa' },
    { id: 'q4', testo: 'D4', ramo: 'Oceani', angle: 'causa' }
];
test('scartate: le domande lette col «Perché:» e non prese, nell\'ordine del pool', () => {
    const st = { risposte: { q1: { testo: 'ok' } }, letture: { q1: { chip: 'capito' }, q3: { chip: 'nonso' }, q2: { chip: 'noncapita' } } };
    const s = P.scartate(POOL_SC, st, P.CHIP_PERCHE, a => a ? a.toUpperCase() : '');
    assert.deepStrictEqual(s.map(r => [r.id, r.perche]), [['q2', 'non ho capito'], ['q3', 'non la so']]);
    assert.deepStrictEqual([s[0].ramo, s[0].angolo, s[0].domanda], ['Atmosfera', 'DEFINIZIONE', 'D2']);
    assert.strictEqual(s[1].colore, P.CHIP_PERCHE[1].colore, 'il colore del chip, per disegnarlo');
    assert.strictEqual(s[1].testo, P.CHIP_PERCHE[1].testo);
    assert.deepStrictEqual(P.scartate(POOL_SC, { risposte: {}, letture: {} }, P.CHIP_PERCHE), [], 'senza letture nessuna');
    assert.deepStrictEqual(P.scartate(POOL_SC, null, P.CHIP_PERCHE), []);
});
test('codaHtml: «Domande scartate» e «Osservazioni» con le classi del foglio; niente senza contenuto', () => {
    assert.strictEqual(P.codaHtml({ scartate: [], note: '   ' }), '');
    assert.strictEqual(P.codaHtml(), '');
    const h = P.codaHtml({ scartate: [{ ramo: 'Atmosfera', angolo: 'Causa', domanda: 'D <2>', perche: 'non la so', colore: '#f97316', testo: '#c2410c' }], note: 'Ho scelto & basta' });
    assert.ok(/class="oq-section-title"[^>]*>Domande scartate</.test(h), 'il titolo della sezione');
    assert.ok(h.includes('D &lt;2&gt;'), 'la domanda escapata');
    /* gate del 26/10 (Giacomo): «usa il chip del tag che l'allievo ha attribuito» */
    assert.ok(/class="oq-chip"[^>]*border:2px solid #f97316[^>]*color:#c2410c[^>]*>non la so</.test(h), 'il motivo come chip, coi suoi colori');
    assert.ok(!h.includes('Perché:'));
    assert.ok(/class="oq-section-title"[^>]*>Osservazioni</.test(h));
    assert.ok(h.includes('Ho scelto &amp; basta'));
    const soloNote = P.codaHtml({ scartate: [], note: 'x' });
    assert.ok(!soloNote.includes('Domande scartate') && soloNote.includes('Osservazioni'));
});
test('conCoda: la coda entra prima della chiusura di <main>; senza coda il foglio non cambia', () => {
    const foglio = '<body><main><h2>Domande</h2></main><script>"</main>"</script></body>';
    assert.strictEqual(P.conCoda(foglio, ''), foglio);
    assert.strictEqual(P.conCoda('<main>a</main>x', '<b>c</b>'), '<main>a<b>c</b></main>x');
    assert.strictEqual(P.conCoda('<body>a</body>', '<b>c</b>'), '<body>a<b>c</b></body>', 'senza <main>, in fondo al body');
});

/* gate dell'allargamento 3 (Giacomo, 26/10): «Quando seleziono una domanda i tre chip devono avere i
   seguenti testi: 'la so', 'non la so' e 'non ho capito'». Le chiavi restano: gli stati salvati valgono. */
test('CHIP_PERCHE: «la so», «non la so», «non ho capito», con le chiavi di prima', () => {
    assert.deepStrictEqual(P.CHIP_PERCHE.map(c => [c.k, c.et]), [['capito', 'la so'], ['nonso', 'non la so'], ['noncapita', 'non ho capito']]);
});

/* gate dell'allargamento 4 (Giacomo, 26/10): «per il 'la so' usa il verde dei bottoni di MappAI, per il 'non la so'
   usa l'arancione acceso» — i token, col valore di riserva; il testo nel colore leggibile della stessa famiglia */
test('CHIP_PERCHE: «la so» sul verde dei bottoni, «non la so» sull\'arancione acceso', () => {
    const [so, nonso] = P.CHIP_PERCHE;
    assert.strictEqual(so.colore, 'var(--man-verde, #41e6aa)');
    assert.strictEqual(so.testo, 'var(--mm-ok, #059669)');
    assert.strictEqual(nonso.colore, 'var(--mm-genere-foglio, #f97316)');
    assert.strictEqual(nonso.testo, 'var(--mm-genere-foglio-testo, #c2410c)');
    /* poi (26/10): «il viola lo stesso colore dei bottoni, per esempio del bottone 'Comincia a rispondere'», e la
       correzione: «intendevo viola='non ho capito' e arancione='non la so'» — l'accento, leggibile anche come testo */
    const noncapita = P.CHIP_PERCHE[2];
    assert.strictEqual(noncapita.colore, 'var(--mm-accent, #4f46e5)');
    assert.strictEqual(noncapita.testo, undefined);
});

/* gate del 26/10 (Giacomo): «Nella testata del report indica il numero di domande totali disponibili e la quantità di tag
   'La so', 'Non la so' e 'Non ho capito' selezionati.»; «Il file esportato deve avere la formattazione del nome uguali agli
   altri documenti e, in questo caso, la dicitura 'meta' al posto del nome dell'angolo» (alla domanda: con la data) */
test('giudizi: le domande disponibili e quante per chip', () => {
    const st = { risposte: { q1: {} }, letture: { q1: { chip: 'capito' }, q2: { chip: 'nonso' }, q3: { chip: 'nonso' }, q4: { chip: 'noncapita' } } };
    const g = P.giudizi(POOL_SC, st, P.CHIP_PERCHE);
    assert.strictEqual(g.totale, 4);
    assert.deepStrictEqual(g.voci.map(v => [v.et, v.n]), [['la so', 1], ['non la so', 2], ['non ho capito', 1]]);
    assert.strictEqual(g.voci[1].colore, P.CHIP_PERCHE[1].colore);
});
test('testaHtml e conTesta: il riepilogo in cima al foglio, dentro <main>', () => {
    const g = { totale: 36, voci: [{ et: 'la so', n: 3, colore: '#41e6aa', testo: '#059669' }, { et: 'non la so', n: 2, colore: '#f97316', testo: '#c2410c' }] };
    const h = P.testaHtml(g);
    assert.ok(h.includes('36 domande disponibili'));
    assert.ok(/class="oq-chip"[^>]*>la so: 3</.test(h) && /class="oq-chip"[^>]*>non la so: 2</.test(h));
    assert.strictEqual(P.testaHtml(null), '');
    assert.strictEqual(P.conTesta('<body><main><h2>D</h2></main></body>', '<p>T</p>'), '<body><main><p>T</p><h2>D</h2></main></body>');
    assert.strictEqual(P.conTesta('<main>x</main>', ''), '<main>x</main>');
});
/* `nomeReport` (gate del 26/10) è diventato `nomeDocumento` di studia-core, per tutti i documenti (allargamento 6) */

