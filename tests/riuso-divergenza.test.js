/* Le copie verbatim da MappAI re devono restare tali: se di là un file è
   cambiato, questo test lo DICE per nome (poi si rilancia tools/sincronizza.js
   e si riprova l'app). Se MappAI re non è sul disco — app studente distribuita
   da sola — il test si salta invece di fallire: un rosso per un file assente
   addestrerebbe a ignorare i rossi (stessa regola del misuratore). */
const { test } = require('node:test');
const assert = require('node:assert');
const S = require('../tools/sincronizza.js');

test('le copie da MappAI re sono byte-per-byte uguali', (t) => {
    const r = S.confronta();
    if (r.assenteDiLa) { t.skip('MappAI re non è sul disco'); return; }
    assert.deepStrictEqual(r.mancanti, [], 'file dell\'allowlist che in MappAI re non esistono più: ' + r.mancanti.join(', '));
    assert.deepStrictEqual(r.diversi, [], 'file divergenti (rilanciare tools/sincronizza.js): ' + r.diversi.join(', '));
    assert.ok(r.uguali.length >= S.FILES.length, 'tutti i file dell\'allowlist sono stati confrontati');
});
