/* La console STUDIA: i vault per materia, e uno schema che il motore accetta.
   `validaSchema` ha trovato nove difetti veri negli schemi di MappAI (inv. 10):
   qui lo si passa in Node, prima che la console si apra dietro qualcosa. */
const { test } = require('node:test');
const assert = require('node:assert');
const C = require('../public/js/studente/studia-core.js');
const Core = require('../public/js/mappai-modal-core.js');

test('nomePdfMappa: giorno col trattino, primo numero libero da 00', () => {
    const d = new Date(2026, 8, 7);
    assert.strictEqual(C.nomePdfMappa('La carta', d, []), 'mappa-La carta-07-09-2026-00.pdf');
    assert.strictEqual(C.nomePdfMappa('La carta', d, ['mappa-La carta-07-09-2026-00.pdf', 'mappa-La carta-07-09-2026-01.pdf', 'mappa-La carta-06-09-2026-02.pdf']), 'mappa-La carta-07-09-2026-02.pdf');
    assert.strictEqual(C.nomePdfMappa('A/B', d, []), 'mappa-A-B-07-09-2026-00.pdf');
});

test('schema senza mappa scelta: al centro «Ricevi dal docente»', () => {
    const s = C.schema({ vaults: VAULTS, ipad: true });
    assert.deepStrictEqual(Core.validaSchema(s).errori, []);
    assert.deepStrictEqual(s.bento[0].voci.map(v => v.id), ['docente']);
    assert.ok(!C.schema({ vaults: VAULTS, ipad: true, scambio: false }).bento);
});

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
    const s1 = C.schema({ vaults: VAULTS, sel: 'Documents/Clima', sessioni: [{ id: 'p1', nome: 'Domande · Il Clima · 00', tipo: 'Domande aperte', data: '2026-09-06', pdf: 'risposte.pdf' }, { id: 'p0', nome: 'senza file', tipo: 'x', data: '2026-09-05' }] });
    const e1 = Core.validaSchema(s1);
    assert.deepStrictEqual(e1.errori || e1, e1.errori ? [] : e1, 'con selezione: ' + JSON.stringify(e1));
    assert.ok(s1.nav.every(v => v.gruppo || v.chiude === false), 'una voce di nav senza chiude:false chiuderebbe la finestra');
    const sess = s1.tabelle.filter(x => x.id === 'sessioni')[0];
    assert.strictEqual(s1.bento[0].voci.map(a => a.id).join(','), 'mappa,flashcard,prova,sintesi,docente', 'i comandi nel riquadro bento, come INSEGNA (+ Sintesi e Docente)');
    assert.ok(s1.bento[0].voci.slice(0, 4).every(v => v.forma === 'azione' && v.chiude !== false), 'forma azione, concludono');
    assert.strictEqual(s1.bento[0].voci[4].chiude, false, '«Docente» apre un modale sopra la console: non conclude');
    assert.strictEqual(C.schema({ vaults: VAULTS, sel: 'Documents/Clima', scambio: false }).bento[0].voci.length, 4, 'kill-switch: via la sola voce Docente');
    assert.deepStrictEqual(sess.righe[0].celle[3].azioni.map(a => a.id.split(':')[0]), ['invia', 'cartella'], 'la cella Invia prima della cartella');
    assert.deepStrictEqual(s1.bento[0].bottoni, { bg: '#f1f4f8', testo: '#404040', hoverBg: '#41e6aa', hoverTesto: '#0b0b0b' }, 'gli stessi token di _consBentoMappa');
    assert.strictEqual(s1.bento[1].voci[0].forma, 'materiali');
    assert.strictEqual(sess.righe.length, 2);
    assert.deepStrictEqual(sess.righe[1].celle[3].azioni.map(a => a.id.split(':')[0]), ['cartella'], 'senza un file da mandare niente Invia');
    assert.strictEqual(sess.righe[0].celle[2], '06/09/2026', 'date in GG/MM/AAAA (inv. 12)');
});

test('schema: sull\'iPad niente «Apri una cartella», ma la nota; le celle Invia e cartella', () => {
    const s = C.schema({ vaults: VAULTS, sel: 'Documents/Clima', ipad: true, sessioni: [{ id: 'p1', nome: 'x', tipo: 'Domande aperte', data: '2026-09-06', pdf: 'risposte.pdf' }] });
    const e = Core.validaSchema(s);
    assert.deepStrictEqual(e.errori, [], JSON.stringify(e.errori));
    assert.strictEqual(s.azioni.length, 0);
    assert.ok(/File/.test(s.nota));
    assert.deepStrictEqual(s.tabelle.filter(x => x.id === 'sessioni')[0].righe[0].celle[3].azioni.map(a => a.id.split(':')[0]), ['invia', 'cartella']);
});

test('materiali: per tipologia, solo i gruppi pieni, niente json, la riga conclude con mat:<rel>', () => {
    const files = ['Sintesi-voce-Clima.html', 'Quiz-MC-Clima-causa.pdf', 'Quiz-VF-Clima.pdf', 'Domande-aperte-Clima-causa.pdf', 'Flashcard-Clima.pdf',
        'MM-Clima-4ª.pdf', 'Focus-Aria-parentela.pdf', 'set-set_1.json', '.DS_Store', 'Timeline-Clima.pdf']
        .map(n => ({ name: n, relPath: 'Materiale Studio/' + n }))
        .concat([{ name: 'Storia della CARTA.pdf', relPath: 'Allegati/Storia della CARTA.pdf' }]);
    const s = C.schema({ vaults: VAULTS, sel: 'Documents/Clima', materiali: files, sessioni: [] });
    const e = Core.validaSchema(s);
    assert.deepStrictEqual(e.errori, [], JSON.stringify(e.errori));
    /* da «Materiale Studio» nessun PDF arriva allo studente (7/9): l'unico che viaggia
       è la scheda didattica originale, che sta in `Allegati/` e ha un elenco suo */
    assert.deepStrictEqual(s.tabelle.map(x => x.id), ['mat-scheda', 'mat-sintesi', 'sessioni']);
    assert.strictEqual(s.tabelle[0].righe[0].id, 'mat:Allegati/Storia della CARTA.pdf');
    assert.strictEqual(s.tabelle[0].righe[0].icona, 'book-open');
    assert.strictEqual(s.tabelle[1].righe[0].id, 'mat:Materiale Studio/Sintesi-voce-Clima.html');
    assert.strictEqual(s.tabelle[1].righe[0].celle[1], 'HTML');
    assert.ok(s.tabelle.every(x => x.righe.every(r => !/Materiale Studio\/.*\.pdf|json|DS_Store/.test(r.id))), 'nessun PDF da Materiale Studio');
    assert.strictEqual(C.trovaSintesi(files).name, 'Sintesi-voce-Clima.html', 'la voce vince sullo scritto');
    assert.strictEqual(C.trovaSintesi([{ name: 'Quiz-MC-x.pdf', relPath: 'a' }]), null);
    /* elenco chiuso (16/9): un genere nuovo, un HTML di altri generi, un export non si vedono */
    ['Genere-nuovo.html', 'Domande-aperte-Clima-causa.html', 'MM-Clima.svg', 'Sintesi-Clima.pdf'].forEach(n =>
        assert.strictEqual(C.daMostrare({ name: n, relPath: 'Materiale Studio/' + n }), false, n));
    assert.strictEqual(C.daMostrare({ name: 'Sintesi-audio-Clima.mp3', relPath: 'Materiale Studio/Sintesi-audio-Clima.mp3' }), true);
    assert.strictEqual(C.genere('Sintesi -VERDE.html').et, 'Sintesi');
    assert.ok(/Cerco/.test(C.schema({ vaults: VAULTS, sel: 'Documents/Clima', materiali: null }).bento[1].voci[0].vuoto), 'null = non ancora letti');
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

/* LA SCHEDA DI UN DOSSIER (4/10): il reader la ricompone dai nodi, perché `pipeline.json`
   allo studente non arriva. Andata e ritorno con il `nodiDaScheda` VERO della copia. */
const VC = require('../public/js/mappai-visione-core.js');
const SCHEDA = {
    titolo: "LA GUERRE est l'Industrie Nationale de la PRUSSE",
    identita: { genere: 'manifesto', autore: 'Maurice Neumont (firma in basso a destra)', data: '1917', tecnica: 'litografia a colori su carta' },
    osservazione: { descrizione: "Una carta d'Europa: la Prussia è un mostro che allunga i tentacoli.", testo: 'Pour que les PEUPLES puissent vivre: «Libertà»' },
    critica: { prova: 'La propaganda francese del 1917.', tace: 'Il punto di vista tedesco.' }
};

test('schedaDaNodi: andata e ritorno con nodiDaScheda, i due punti nei valori restano', () => {
    const g = VC.nodiDaScheda(SCHEDA);
    const sch = C.schedaDaNodi(g.nodes, VC.BLOCCHI);
    assert.deepStrictEqual(sch, SCHEDA);   // il blocco vuoto («interpretazione») non compare
});

test('schedaDaNodi: righe senza etichetta, rami scritti a mano, e chi non è un dossier', () => {
    const nodes = [
        { id: 'fonte_0', label: ' Foto ' },
        { id: 'fonte_osservazione', desc: 'Descrizione: un uomo seduto\ncon due figure accanto\n\nTipografia: nessuna' },
        { id: 'fonte_critica', desc: 'Testo libero del docente, senza etichette.' }
    ];
    assert.deepStrictEqual(C.schedaDaNodi(nodes, VC.BLOCCHI), {
        titolo: 'Foto',
        osservazione: { descrizione: 'un uomo seduto con due figure accanto', tipografia: 'nessuna' },
        critica: { prova: 'Testo libero del docente, senza etichette.' }
    });
    assert.strictEqual(C.schedaDaNodi([{ id: 'root', label: 'Mappa' }], VC.BLOCCHI), null);
    assert.strictEqual(C.schedaDaNodi([{ id: 'fonte_0', label: 'Vuota' }], VC.BLOCCHI), null);
    assert.strictEqual(C.schedaDaNodi(null, VC.BLOCCHI), null);
});

test("schema: un dossier ha «Scheda» al posto di «Mappa», e l'icona dell'immagine", () => {
    const dossier = { folderName: 'Foto', fullPath: 'Documents/4R/Storia/Foto', classDir: '4R', discDir: 'Storia', rootNodeLabel: 'Foto', dossier: true };
    const s = C.schema({ vaults: VAULTS.concat([dossier]), sel: dossier.fullPath, materiali: [] });
    assert.deepStrictEqual(Core.validaSchema(s).errori, []);
    assert.deepStrictEqual(s.bento[0].voci.map(v => v.id), ['scheda', 'flashcard', 'prova', 'sintesi', 'docente']);
    assert.strictEqual(s.nav.filter(v => v.id === 'v:' + dossier.fullPath)[0].icona, 'image');
    const m = C.schema({ vaults: VAULTS, sel: VAULTS[0].fullPath, materiali: [] });
    assert.strictEqual(m.bento[0].voci[0].id, 'mappa');
});

/* La scheda come testo della sintesi (5/10): il markdown che `_mdToHtml` legge. */
test('markdownDaScheda: un titolo per blocco pieno, «interpretazione» dove serve, * e [n] neutralizzati', () => {
    const md = C.markdownDaScheda({
        titolo: 'X',
        identita: { genere: 'manifesto', data: '1917' },
        interpretazione: { finalita: 'mobilitare [1] i *civili*' }
    }, VC.BLOCCHI);
    assert.strictEqual(md, [
        "## Carta d'identità", '**Genere della fonte:** manifesto\n\n**Data o periodo:** 1917',
        '## Che cosa vuole ottenere (interpretazione)', '**Finalità:** mobilitare (1) i ∗civili∗'
    ].join('\n\n'));
    assert.strictEqual(C.markdownDaScheda(null, VC.BLOCCHI), '');
    assert.strictEqual(C.markdownDaScheda(C.schedaDaNodi(VC.nodiDaScheda(SCHEDA).nodes, VC.BLOCCHI), VC.BLOCCHI).split('\n\n## ').length, 3);
});
