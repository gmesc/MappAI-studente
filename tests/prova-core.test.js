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
