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
    const ids = s.sezioni[0].campi.map(c => c.id);
    assert.deepStrictEqual(ids, ['amb-tutto', 'amb-ramo', 'ramo', 'ang-tutti', 'ang-uno', 'angolo']);
    assert.ok(!ids.includes('split'), 'la mappa è sempre aperta: la spunta non serve');
    assert.deepStrictEqual(s.azioni.map(a => a.id), ['annulla', 'avvia']);
    assert.strictEqual(s.azioni[1].ruolo, 'primario');
});

test('su misura senza rami né angoli: niente tendine vuote né radio orfani', () => {
    const s = L.schemaSuMisura({ opzioni: { rami: null, angoli: [] } });
    ok(s, 'senza rami');
    assert.deepStrictEqual(s.sezioni[0].campi.map(c => c.id), ['amb-tutto', 'amb-ramo']);
    assert.ok(/non disponibile/.test(s.sezioni[0].campi[1].aiuto));
    ok(L.schemaSuMisura(), 'senza argomenti');
});
