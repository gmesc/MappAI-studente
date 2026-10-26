/* Il modale «Domande su misura» (packet 0117): dalla riga «Scegli ramo e angolo»
   della console del progetto. Passa validaSchema, conclude solo «Avvia», e la
   spunta della mappa non c'è più: la mappa è sempre aperta accanto alla prova. */
const { test } = require('node:test');
const assert = require('node:assert');
const L = require('../public/js/studente/launcher-core.js');
const Core = require('../public/js/mappai-modal-core.js');

const OP = { rami: ['X', 'Y'], angoli: [{ k: 'causa', et: 'Causa' }] };
function ok(s, msg) { const e = Core.validaSchema(s); assert.deepStrictEqual(e.errori, [], msg + ': ' + JSON.stringify(e.errori)); return e.schema; }

test('il launcher non c\'è più: niente voci, gruppi né spunta della mappa', () => {
    assert.strictEqual(L.VOCI, undefined);
    assert.strictEqual(L.GRUPPI, undefined);
    assert.strictEqual(L.campoSplit, undefined);
    assert.strictEqual(L.schema, undefined);
});

test('su misura: ambito e angoli, ramo solo se c\'è, «Avvia» è l\'azione primaria', () => {
    const s = L.schemaSuMisura({ opzioni: OP });
    ok(s, 'su misura');
    assert.strictEqual(s.titolo, 'Domande su misura');
    const ids = [].concat(...s.sezioni.map(z => z.campi.map(c => c.id)));
    assert.deepStrictEqual(ids, ['amb-tutto', 'amb-ramo', 'ramo', 'ang-tutti', 'ang-uno', 'angolo']);
    assert.ok(!ids.includes('split'), 'la mappa è sempre aperta: la spunta non serve');
    assert.deepStrictEqual(s.azioni.map(a => a.id), ['annulla', 'avvia']);
    assert.strictEqual(s.azioni[1].ruolo, 'primario');
});

test('su misura senza rami né angoli: niente tendine vuote né radio orfani', () => {
    const s = L.schemaSuMisura({ opzioni: { rami: null, angoli: [] } });
    ok(s, 'senza rami');
    assert.deepStrictEqual(s.sezioni.map(z => z.id), ['dove'], 'senza angoli la seconda domanda non c\'è');
    assert.deepStrictEqual(s.sezioni[0].campi.map(c => c.id), ['amb-tutto', 'amb-ramo']);
    assert.ok(/non disponibile/.test(s.sezioni[0].campi[1].aiuto));
    ok(L.schemaSuMisura(), 'senza argomenti');
});

/* 0126, allargamento 2 — la variante E del mockup, scelta da Giacomo il 25/10 («domande su misura: E»):
   la veste grande, la finestra larga, due domande con un titolo ciascuna. Righe da 56 px, testo a 19 e
   tendine che compaiono solo quando servono stanno nel CSS del reader (studente.css), agganciate alle sezioni. */
test('su misura (0126): veste grande, due domande — «Quale parte della mappa?» e «Quali domande?»', () => {
    const s = L.schemaSuMisura({ opzioni: OP });
    ok(s, 'variante E');
    assert.strictEqual(s.veste, 'grande');
    assert.strictEqual(s.taglia, 'l');
    assert.deepStrictEqual(s.sezioni.map(z => z.id + ':' + z.titolo), ['dove:Quale parte della mappa?', 'quali:Quali domande?']);
    assert.deepStrictEqual(s.sezioni[0].campi.map(c => c.id), ['amb-tutto', 'amb-ramo', 'ramo']);
    assert.deepStrictEqual(s.sezioni[1].campi.map(c => c.id), ['ang-tutti', 'ang-uno', 'angolo']);
});
