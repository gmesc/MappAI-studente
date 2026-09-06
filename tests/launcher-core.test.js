/* La console «Studio attivo»: passa validaSchema in ogni vista, le voci non
   concludono, «Avvia» c'è solo quando c'è qualcosa da avviare. */
const { test } = require('node:test');
const assert = require('node:assert');
const L = require('../public/js/studente/launcher-core.js');
const Core = require('../public/js/mappai-modal-core.js');

const BASE = { nMC: 2, nAp: 7, sets: [{ id: 'a', title: 'A', n: 10 }, { id: 'b', title: 'B', n: 5 }], fogli: [{ titolo: 'F1', n: 8, angolo: 'Causa' }],
    opzioni: { rami: ['X', 'Y'], angoli: [{ k: 'causa', et: 'Causa' }] } };
function ok(s, msg) { const e = Core.validaSchema(s); assert.deepStrictEqual(e.errori, [], msg + ': ' + JSON.stringify(e.errori)); return e.schema; }

test('nessuna selezione: console piena, sette voci che NON concludono, invito nell\'area', () => {
    const s = ok(L.schema(BASE), 'vuoto');
    assert.strictEqual(s.piena, true);
    const voci = L.schema(BASE).nav.filter(v => !v.gruppo);
    assert.strictEqual(voci.length, 7);
    assert.ok(voci.every(v => v.chiude === false), 'una voce che conclude chiuderebbe la finestra');
    assert.strictEqual(L.schema(BASE).azioni.length, 0, 'niente da avviare');
});

test('set-mc: i set sono voci che non concludono, Avvia solo con un set scelto, la spunta split', () => {
    let s = L.schema(Object.assign({}, BASE, { sel: 'set-mc' }));
    ok(s, 'set-mc');
    assert.strictEqual(s.sezioni[0].voci.length, 2);
    assert.ok(s.sezioni[0].voci.every(v => v.chiude === false));
    assert.strictEqual(s.azioni.length, 0);
    s = L.schema(Object.assign({}, BASE, { sel: 'set-mc', set: 'b', split: true }));
    ok(s, 'set-mc scelto');
    assert.strictEqual(s.azioni[0].id, 'avvia');
    assert.ok(s.azioni[0].chiude !== false, 'Avvia conclude');
    assert.strictEqual(s.sezioni[1].campi[0].id, 'split');
    assert.strictEqual(s.sezioni[1].campi[0].valore, true);
});

test('su-misura: i campi di ambito e angoli, ramo solo se c\'è, split in coda, Avvia', () => {
    const s = L.schema(Object.assign({}, BASE, { sel: 'su-misura' }));
    ok(s, 'su-misura');
    const ids = s.sezioni[0].campi.map(c => c.id);
    assert.deepStrictEqual(ids, ['amb-tutto', 'amb-ramo', 'ramo', 'ang-tutti', 'ang-uno', 'angolo', 'split']);
    assert.strictEqual(s.azioni[0].id, 'avvia');
    const senzaRami = L.schema(Object.assign({}, BASE, { sel: 'su-misura', opzioni: { rami: null, angoli: [] } }));
    ok(senzaRami, 'senza rami');
    assert.ok(senzaRami.sezioni[0].campi.every(c => c.id !== 'ramo' && c.id !== 'angolo'), 'senza rami e senza angoli: niente tendine vuote');
});

test('senza materiali le viste restano, e set-mc senza set mostra il motivo', () => {
    const s = L.schema({ sel: 'set-mc', nMC: 0, nAp: 0 });
    ok(s, 'niente');
    assert.strictEqual(s.azioni.length, 0);
    assert.ok(/nessun set/.test(s.sezioni[0].testo));
    ok(L.schema({ sel: 'heatmap', mv: true }), 'heatmap');
});
