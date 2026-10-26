/* La console STUDIA: i vault per materia, e uno schema che il motore accetta.
   `validaSchema` ha trovato nove difetti veri negli schemi di MappAI (inv. 10):
   qui lo si passa in Node, prima che la console si apra dietro qualcosa. */
const { test } = require('node:test');
const assert = require('node:assert');
const C = require('../public/js/studente/studia-core.js');
const Core = require('../public/js/mappai-modal-core.js');

/* 0126, allargamento 6 (Giacomo, 26/10): «Metti il nome del progetto sempre al primo posto della struttura del nome, poi
   sempre il tipo di materiali (Domande aperte, Scelta multipla, Flashcard, Foglio nodi, Sintesi, Catena perché), l'angolo o
   'meta', data.»; alla domanda sulla forma: «Trattini senza spazi»; se il nome c'è già nella cartella, « (2)» in fondo.
   Prima la mappa PDF usciva «mappa-<progetto>-GG-MM-AAAA-NN.pdf». */
test('nomeDocumento: progetto, tipo, angolo o «meta», data; senza angolo la parte si salta', () => {
    const d = new Date(2026, 9, 26, 18, 50);
    assert.strictEqual(C.nomeDocumento({ progetto: 'Sistema Albero', tipo: 'Domande aperte', angolo: 'meta', data: d }), 'Sistema Albero-Domande aperte-meta-26-10-2026');
    assert.strictEqual(C.nomeDocumento({ progetto: 'Sistema Albero', tipo: 'Scelta multipla', angolo: 'Conseguenza', data: d }), 'Sistema Albero-Scelta multipla-conseguenza-26-10-2026');
    assert.strictEqual(C.nomeDocumento({ progetto: 'Sistema Albero', tipo: 'Sintesi', data: d }), 'Sistema Albero-Sintesi-26-10-2026');
    assert.strictEqual(C.nomeDocumento({ progetto: 'A/B: c', tipo: 'Foglio nodi', data: d }), 'A-B- c-Foglio nodi-26-10-2026', 'i caratteri che un file non può avere');
    assert.strictEqual(C.nomeDocumento({ progetto: '', tipo: 'Catena perché', data: d }), 'Progetto-Catena perché-26-10-2026');
});
test('nomeLibero: « (2)», « (3)»… prima dell\'estensione, se il nome c\'è già', () => {
    assert.strictEqual(C.nomeLibero('X-Mappa-26-10-2026.pdf', []), 'X-Mappa-26-10-2026.pdf');
    assert.strictEqual(C.nomeLibero('X-Mappa-26-10-2026.pdf', ['X-Mappa-26-10-2026.pdf']), 'X-Mappa-26-10-2026 (2).pdf');
    assert.strictEqual(C.nomeLibero('X-Mappa-26-10-2026.pdf', ['X-Mappa-26-10-2026.pdf', 'X-Mappa-26-10-2026 (2).pdf']), 'X-Mappa-26-10-2026 (3).pdf');
    assert.strictEqual(C.nomeLibero('Cap. 3-Sintesi-26-10-2026', ['Cap. 3-Sintesi-26-10-2026']), 'Cap. 3-Sintesi-26-10-2026 (2)', 'un punto nel progetto non è un\'estensione');
});
/* gate dell'allargamento 6 (Giacomo, 26/10): dalla tabella «SINTESI» la stampa proponeva «Sintesi-La carta - TM Sans.pdf» */
test('nomeDaStampare: la sintesi del docente col nome nuovo; la fonte e le mappe PDF tengono il loro', () => {
    const d = new Date(2026, 9, 26);
    assert.strictEqual(C.nomeDaStampare({ name: 'Sintesi-La carta - TM Sans.html', relPath: 'Materiale Studio/Sintesi-La carta - TM Sans.html' }, 'La carta', d), 'La carta-Sintesi-26-10-2026');
    assert.strictEqual(C.nomeDaStampare({ name: 'Sintesi-voce-La carta.html', relPath: 'Materiale Studio/Sintesi-voce-La carta.html' }, 'La carta', d), 'La carta-Sintesi-26-10-2026');
    assert.strictEqual(C.nomeDaStampare({ name: 'Cap Lun.pdf', relPath: 'Allegati/Cap Lun.pdf' }, 'La carta', d), 'Cap Lun.pdf', 'la fonte');
    assert.strictEqual(C.nomeDaStampare({ name: 'Sintesi storica.pdf', relPath: 'Allegati/Sintesi storica.pdf' }, 'La carta', d), 'Sintesi storica.pdf', 'una fonte che si chiama «Sintesi…» resta la fonte');
    assert.strictEqual(C.nomeDaStampare({ name: 'La carta-Mappa-20-10-2026.pdf', relPath: 'MAPPE PDF/La carta-Mappa-20-10-2026.pdf' }, 'La carta', d), 'La carta-Mappa-20-10-2026.pdf');
});
test('nomePdfMappa: la mappa col nome nuovo, « (2)» se c\'è già', () => {
    const d = new Date(2026, 8, 7);
    assert.strictEqual(C.nomePdfMappa('La carta', d, []), 'La carta-Mappa-07-09-2026.pdf');
    assert.strictEqual(C.nomePdfMappa('La carta', d, ['La carta-Mappa-07-09-2026.pdf']), 'La carta-Mappa-07-09-2026 (2).pdf');
    assert.strictEqual(C.nomePdfMappa('A/B', d, []), 'A-B-Mappa-07-09-2026.pdf');
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
    assert.strictEqual(s1.bento[0].voci.map(a => a.id).join(','), 'mappa,flashcard,sintesi,docente', 'i comandi nel riquadro bento, come INSEGNA (+ Sintesi e Docente); «Prova» è uscita col 0117');
    assert.ok(s1.bento[0].voci.slice(0, 3).every(v => v.forma === 'azione' && v.chiude !== false), 'forma azione, concludono');
    assert.strictEqual(s1.bento[0].voci[3].chiude, false, '«Docente» apre un modale sopra la console: non conclude');
    assert.strictEqual(C.schema({ vaults: VAULTS, sel: 'Documents/Clima', scambio: false }).bento[0].voci.length, 3, 'kill-switch: via la sola voce Docente');
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
    assert.deepStrictEqual(s.bento[0].voci.map(v => v.id), ['scheda', 'flashcard', 'sintesi', 'docente']);
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

/* Packet 0117: le prove si scelgono nella console del progetto, da tre tabelle
   (Giacomo, 20/10). Righe che CONCLUDONO, come i materiali: la console si chiude,
   la mappa si apre e la prova parte accanto. */
const PROVE = {
    aperte: [{ i: 0, angolo: 'Causa', titolo: 'Foglio A', n: 8 }, { i: 1, angolo: '', titolo: 'Foglio vecchio', n: 5 },
             { i: 2, angolo: 'Causa', titolo: 'Foglio B', n: 4 }],
    mc: [{ id: 's1', angolo: 'Definizione', titolo: 'Quiz 1', n: 10 }],
    suMisura: { n: 17 }
};

/* 0126 (Giacomo, 24/10): «Le «Domande aperte su misura» sparisce e rimane 'Domande aperte' […] solo con la
   selezione meta vengono mostrate le opzioni per personalizzare»: niente terza tabella; in Meta la riga
   «Su misura» chiude «Domande aperte». Prima (0117) era una tabella a sé. */
test('tabelleProve: Domande aperte e Scelta multipla, in quest\'ordine; «Su misura» solo in Meta, in fondo alle aperte', () => {
    const tb = C.tabelleProve(PROVE);
    assert.deepStrictEqual(tb.map(x => x.titolo), ['Domande aperte', 'Scelta multipla'], 'di serie (semplice) niente «Su misura»');
    assert.deepStrictEqual(tb[0].righe.map(r => r.id), ['aperte:0', 'aperte:1', 'aperte:2']);
    assert.deepStrictEqual(tb[1].righe.map(r => r.id), ['mc:s1']);
    assert.deepStrictEqual(C.tabelleProve(PROVE, null, 'semplice').map(x => x.titolo), ['Domande aperte', 'Scelta multipla']);
    const meta = C.tabelleProve(PROVE, null, 'meta');
    assert.deepStrictEqual(meta.map(x => x.titolo), ['Domande aperte', 'Scelta multipla'], 'nemmeno in Meta una tabella a sé');
    /* allargamento 2 (Giacomo, 25/10, alla domanda: «Solo «Su misura»»): in Meta le righe per angolo spariscono */
    assert.deepStrictEqual(meta[0].righe.map(r => r.id), ['su-misura'], 'in Meta solo «Su misura»');
    assert.deepStrictEqual(meta[1].righe.map(r => r.id), ['mc:s1'], 'la scelta multipla resta com\'è');
    assert.ok(tb.every(x => x.righe.every(r => r.chiude !== false)), 'le righe concludono, come i materiali');
    assert.ok(tb.every(x => x.colonne.length === 2 && x.righe.every(r => r.celle.length === 2)), 'colonne e celle allineate (regola 15)');
    assert.ok(tb.every(x => x.colonne[1].larghezza), 'la colonna dei numeri ha la larghezza fissa');
});

test('tabelleProve: l\'angolo e il numero; senza angolo il titolo; due righe uguali prendono il titolo', () => {
    const tb = C.tabelleProve(PROVE);
    assert.deepStrictEqual(tb[0].righe.map(r => r.celle), [['Causa · Foglio A', '8'], ['Foglio vecchio', '5'], ['Causa · Foglio B', '4']]);
    assert.deepStrictEqual(tb[1].righe[0].celle, ['Definizione', '10']);
    assert.deepStrictEqual(C.tabelleProve(PROVE, null, 'meta')[0].righe[0].celle, ['Su misura: scegli ramo e angolo', '17']);
});

test('tabelleProve: solo le tabelle con righe; finché non le ha lette, nessuna', () => {
    assert.deepStrictEqual(C.tabelleProve(null), []);
    assert.deepStrictEqual(C.tabelleProve({ aperte: [], mc: [], suMisura: null }), []);
    assert.deepStrictEqual(C.tabelleProve({ aperte: [], mc: PROVE.mc, suMisura: null }).map(x => x.titolo), ['Scelta multipla']);
});

test('schema: le tabelle delle prove stanno prima dei materiali e di «Le tue prove», e passano validaSchema', () => {
    const s = C.schema({ vaults: VAULTS, sel: 'Documents/Clima', prove: PROVE, materiali: [{ name: 'Sintesi-voce-Clima.html', relPath: 'Materiale Studio/Sintesi-voce-Clima.html' }], sessioni: [] });
    assert.deepStrictEqual(Core.validaSchema(s).errori, []);
    const ids = s.tabelle.map(x => x.id);
    assert.deepStrictEqual(ids.slice(0, 2), ['prove-aperte', 'prove-mc']);
    assert.strictEqual(ids[ids.length - 1], 'sessioni');
    assert.deepStrictEqual(ids.slice(2), ['mat-sintesi', 'sessioni'], 'i materiali restano, fra le prove e «Le tue prove»');
});

/* ── 0126: l'interruttore «Prove: Semplice / Meta» ─────────────────────── */
test('modoProve: «meta» solo se lo dice la preferenza; tutto il resto è «semplice» (di serie)', () => {
    assert.strictEqual(C.modoProve('meta'), 'meta');
    assert.strictEqual(C.modoProve('semplice'), 'semplice');
    assert.strictEqual(C.modoProve(null), 'semplice');
    assert.strictEqual(C.modoProve(''), 'semplice');
    assert.strictEqual(C.modoProve('Meta '), 'semplice', 'un valore sbagliato non accende Meta');
});

function rigaModo(s) { return (s.sezioni || []).filter(x => x.id === 'prove-modo')[0] || null; }
/* allargamento 1 (Giacomo, 25/10): «sopra la prima tabella mostrata nella console», allineata alle tabelle:
   `colonna: 'materiali'`, che il motore disegna in cima al riquadro delle tabelle */
test('schema: con un progetto che ha prove, sopra la prima tabella la riga «Prove: Semplice / Meta», che passa validaSchema', () => {
    const s = C.schema({ vaults: VAULTS, sel: 'Documents/Clima', prove: PROVE, materiali: [], sessioni: [] });
    assert.deepStrictEqual(Core.validaSchema(s).errori, []);
    const r = rigaModo(s);
    assert.ok(!!r, 'la riga c\'è');
    assert.strictEqual(r.colonna, 'materiali', 'in cima alle tabelle, non in cima all\'area');
    /* gate del 25/10 (Giacomo): «Radio ma senza 'Prove:'» */
    assert.deepStrictEqual(r.campi.map(c => c.tipo + ':' + c.etichetta), ['radio:Semplice', 'radio:Meta']);
    assert.ok(r.campi.filter(c => c.tipo === 'radio').every(c => c.gruppo === 'prove-modo'), 'un gruppo solo');
    assert.deepStrictEqual(r.campi.filter(c => c.tipo === 'radio').map(c => c.id + '=' + !!c.valore), ['modo-semplice=true', 'modo-meta=false'], 'di serie Semplice');
    const m = rigaModo(C.schema({ vaults: VAULTS, sel: 'Documents/Clima', prove: PROVE, materiali: [], sessioni: [], modo: 'meta' }));
    assert.deepStrictEqual(m.campi.filter(c => c.tipo === 'radio').map(c => c.id + '=' + !!c.valore), ['modo-semplice=false', 'modo-meta=true']);
    assert.strictEqual(C.schema({ vaults: VAULTS, sel: 'Documents/Clima', prove: PROVE, materiali: [], sessioni: [], modo: 'meta' }).tabelle[0].righe.slice(-1)[0].id, 'su-misura', 'lo schema passa il modo alle tabelle');
});

test('schema: senza prove (o senza progetto) niente riga dell\'interruttore', () => {
    assert.strictEqual(rigaModo(C.schema({ vaults: VAULTS })), null, 'senza progetto');
    assert.strictEqual(rigaModo(C.schema({ vaults: VAULTS, sel: 'Documents/Clima', prove: null })), null, 'prove non ancora lette');
    assert.strictEqual(rigaModo(C.schema({ vaults: VAULTS, sel: 'Documents/Clima', prove: { aperte: [], mc: [], suMisura: null } })), null, 'progetto senza prove');
    assert.ok(!!rigaModo(C.schema({ vaults: VAULTS, sel: 'Documents/Clima', prove: { aperte: [], mc: PROVE.mc, suMisura: null } })), 'basta il quiz');
});

/* gate dello 0126 (Giacomo, 25/10): il report nel pannello si chiama «[Nome progetto] · [Nome del materiale] ·
   Report allievo», e il materiale è «Genere e angolo» (la sua scelta), come nelle tabelle della console */
test('titoloReport: progetto · genere e angolo · Report allievo', () => {
    assert.strictEqual(C.titoloReport({ mappa: 'Sistema Albero', tipo: 'mc', angolo: 'Definizione' }), 'Sistema Albero · Scelta multipla · Definizione · Report allievo');
    assert.strictEqual(C.titoloReport({ mappa: 'Sistema Albero', tipo: 'mc' }), 'Sistema Albero · Scelta multipla · Report allievo', 'senza angolo (set vecchi)');
    assert.strictEqual(C.titoloReport({ mappa: 'La carta', tipo: 'aperte', angolo: 'Causa' }), 'La carta · Domande aperte · Causa · Report allievo');
    assert.strictEqual(C.titoloReport({ tipo: 'mc', angolo: 'Causa' }), 'Scelta multipla · Causa · Report allievo', 'senza nome della mappa');
});
