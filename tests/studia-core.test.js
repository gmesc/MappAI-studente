/* La console STUDIA: i vault per materia, e uno schema che il motore accetta.
   `validaSchema` ha trovato nove difetti veri negli schemi di MappAI (inv. 10):
   qui lo si passa in Node, prima che la console si apra dietro qualcosa. */
const { test } = require('node:test');
const assert = require('node:assert');
const C = require('../public/js/studente/studia-core.js');
const Core = require('../public/js/mappai-modal-core.js');

const VAULTS = [
    { folderName: 'Elettricità - MM', fullPath: 'Documents/4R/Scienze/Elettricità - MM', classDir: '4R', discDir: 'Scienze', rootNodeLabel: 'Elettricità', classeDichiarata: '4R', materiaDichiarata: 'Scienze', lastUpdated: '2026-09-04T14:16:09Z' },
    { folderName: 'Clima', fullPath: 'Documents/Clima', rootNodeLabel: 'Il Clima', classeDichiarata: '', materiaDichiarata: 'Geografia', lastUpdated: '2026-08-01' },
    { folderName: 'Vecchia', fullPath: 'Documents/Vecchia', rootNodeLabel: 'Vecchia', classeDichiarata: '', materiaDichiarata: '', lastUpdated: '' },
    { folderName: 'Atomo', fullPath: 'Documents/1A/Scienze/Atomo', classDir: '1A', discDir: 'Scienze', rootNodeLabel: 'Atomo', materiaDichiarata: '' }
];

test('perMateria: dichiarata, poi cartella, poi «Senza materia» in coda; alfabetico dentro', () => {
    const g = C.perMateria(VAULTS);
    assert.deepStrictEqual(g.map(x => x.nome), ['Geografia', 'Scienze', 'Senza materia']);
    assert.deepStrictEqual(g[1].vaults.map(v => v.rootNodeLabel), ['Atomo', 'Elettricità'], 'la cartella «Scienze» vale come materia');
});

test('schema: la console STUDIA passa validaSchema, con e senza un vault scelto', () => {
    const s0 = C.schema({ vaults: VAULTS });
    const e0 = Core.validaSchema(s0);
    assert.deepStrictEqual(e0.errori || e0, e0.errori ? [] : e0, 'senza selezione: ' + JSON.stringify(e0));
    const s1 = C.schema({ vaults: VAULTS, sel: 'Documents/Clima', sessioni: [{ id: 'p1', nome: 'Domande · Il Clima · 00', tipo: 'Domande aperte', data: '2026-09-06' }] });
    const e1 = Core.validaSchema(s1);
    assert.deepStrictEqual(e1.errori || e1, e1.errori ? [] : e1, 'con selezione: ' + JSON.stringify(e1));
    assert.ok(s1.nav.every(v => v.gruppo || v.chiude === false), 'una voce di nav senza chiude:false chiuderebbe la finestra');
    assert.strictEqual(s1.sezioni[0].azioni.map(a => a.id).join(','), 'mappa,flashcard,prova');
    assert.strictEqual(s1.tabelle[0].righe.length, 1);
    assert.strictEqual(s1.tabelle[0].righe[0].celle[2], '06/09/2026', 'date in GG/MM/AAAA (inv. 12)');
});

test('schema: senza vault la nav ha comunque una voce (il motore lo pretende)', () => {
    const s = C.schema({ vaults: [] });
    assert.ok(s.nav.length === 1 && s.nav[0].chiude === false);
    const e = Core.validaSchema(s);
    assert.deepStrictEqual(e.errori || e, e.errori ? [] : e, JSON.stringify(e));
});

test('briciole: Studia › materia › mappa', () => {
    assert.deepStrictEqual(C.briciole({ vaults: VAULTS, sel: 'Documents/Clima' }).map(b => b.et), ['Studia', 'Geografia', 'Il Clima']);
    assert.deepStrictEqual(C.briciole({ vaults: VAULTS }).map(b => b.et), ['Studia']);
});
