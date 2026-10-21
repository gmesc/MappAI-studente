/* Lo scambio col docente: il QR letto, la cartella di destinazione, il piano
   di ricezione filtrato dalla regola condivisa, e gli schemi che il motore accetta. */
const { test } = require('node:test');
const assert = require('node:assert');
const S = require('../public/js/studente/scambio-core.js');
const FC = require('../public/js/mappai-files-core.js');
const Core = require('../public/js/mappai-modal-core.js');

function ok(s, msg) { const e = Core.validaSchema(s); assert.deepStrictEqual(e.errori, [], msg + ': ' + JSON.stringify(e.errori)); return s; }

test('daQr: il QR di INSEGNA (zip, documento, home) e l\'indirizzo scritto a mano', () => {
    assert.deepStrictEqual(S.daQr('http://192.168.1.23:8768/files/Elettricit%C3%A0_-_MM.zip?s=aB3xQ9kLmN'), { base: 'http://192.168.1.23:8768', token: 'aB3xQ9kLmN' });
    assert.deepStrictEqual(S.daQr('http://192.168.1.23:8768/?s=aB3xQ9kLmN'), { base: 'http://192.168.1.23:8768', token: 'aB3xQ9kLmN' });
    assert.deepStrictEqual(S.daQr('http://192.168.1.23:8768/files/x.html?inline=1&s=tok_1-2'), { base: 'http://192.168.1.23:8768', token: 'tok_1-2' });
    assert.deepStrictEqual(S.daQr(' 192.168.1.23:8768 aB3xQ9kLmN '), { base: 'http://192.168.1.23:8768', token: 'aB3xQ9kLmN' });
    assert.deepStrictEqual(S.daQr('192.168.1.23:8768/aB3xQ9kLmN'), { base: 'http://192.168.1.23:8768', token: 'aB3xQ9kLmN' });
    assert.strictEqual(S.daQr('ciao'), null);
    assert.strictEqual(S.daQr('http://x.y/senza-token'), null);
    assert.strictEqual(S.daQr(''), null);
});

test('esitoQr (0098): il QR dei Materiali è "per i telefoni", il resto "non è MappAI"; schema in maiuscolo', () => {
    assert.deepStrictEqual(S.esitoQr('http://192.168.1.23:8768/files/x.zip?s=aB3xQ9kLmN'), { ok: true, base: 'http://192.168.1.23:8768', token: 'aB3xQ9kLmN' });
    assert.deepStrictEqual(S.esitoQr('HTTP://192.168.1.23:8768/?s=aB3xQ9kLmN'), { ok: true, base: 'http://192.168.1.23:8768', token: 'aB3xQ9kLmN' }, 'schema in maiuscolo, base normalizzata');
    assert.deepStrictEqual(S.esitoQr(' 192.168.1.23:8768 aB3xQ9kLmN '), { ok: true, base: 'http://192.168.1.23:8768', token: 'aB3xQ9kLmN' });
    assert.deepStrictEqual(S.esitoQr('http://192.168.1.23:8768'), { ok: false, motivo: 'telefono' }, 'il QR del pannello Materiali (LAN)');
    assert.deepStrictEqual(S.esitoQr('https://relay.example.ch/j/ABC234'), { ok: false, motivo: 'telefono' }, 'il QR del pannello Materiali (Internet)');
    assert.deepStrictEqual(S.esitoQr('ciao'), { ok: false, motivo: 'no' });
    assert.deepStrictEqual(S.esitoQr(''), { ok: false, motivo: 'no' });
    assert.deepStrictEqual(S.esitoQr('http://x.y/ due parole'), { ok: false, motivo: 'no' });
});

test('cartellaDestinazione: classe/materia/mappa, senza materia, piatto, NFC', () => {
    assert.strictEqual(S.cartellaDestinazione({ nome: 'Elettricità - MM', classe: '4R', materia: 'Scienze' }, 'Documents'), 'Documents/4R/Scienze/Elettricità - MM');
    assert.strictEqual(S.cartellaDestinazione({ nome: 'Clima', classe: '1A', materia: null }, 'Documents'), 'Documents/1A/Clima');
    assert.strictEqual(S.cartellaDestinazione({ nome: 'Clima', classe: null, materia: 'Geografia' }, 'Documents'), 'Documents/Clima', 'senza classe non c\'è il livello materia');
    assert.strictEqual(S.cartellaDestinazione({ nome: 'Elettricità' }, 'Documents'), 'Documents/Elettricità', 'NFC');
    assert.strictEqual(S.cartellaDestinazione({ nome: '' }, 'Documents'), null);
});

test('pianoRicezione: filtra di nuovo con relVaultStudente, url con token, totale', () => {
    const man = { nome: 'Clima', classe: '4R', materia: 'Geografia', files: [
        { rel: 'index.yaml', size: 100 }, { rel: 'Nodi/Clima.md', size: 50 }, { rel: 'Allegati/Scheda-Il Clima.pdf', size: 1000 },
        { rel: 'vista.json', size: 10 }, { rel: '../evil', size: 1 }, { rel: 'Studio Attivo/sessioni.jsonl', size: 5 },
        { rel: 'Materiale Studio/Quiz-MC-Clima.pdf', size: 900 },   /* soluzioni in coda: resta al docente */
        { rel: 'Materiale Studio/MM-Clima - TM Sans-00.pdf', size: 800 }   /* la mappa stampata: se la genera lui */
    ] };
    const p = S.pianoRicezione(man, 'http://10.0.0.2:8768', 'tok', 'Documents', FC);
    assert.strictEqual(p.dest, 'Documents/4R/Geografia/Clima');
    assert.deepStrictEqual(p.files.map(f => f.rel), ['index.yaml', 'Nodi/Clima.md', 'Allegati/Scheda-Il Clima.pdf'], 'la scheda didattica è l\'unico PDF che viaggia');
    assert.strictEqual(p.files[1].url, 'http://10.0.0.2:8768/vault/Nodi%2FClima.md?s=tok');
    assert.strictEqual(p.totale, 1150);
    assert.strictEqual(p.scartati, 5);
    assert.strictEqual(S.pianoRicezione({ nome: '' }, 'b', 't', 'Documents', FC), null);
});

test('fileDaInviare: il PDF di default, report e jsonl a spunta, il report MC quando non c\'è il PDF', () => {
    const ap = { id: 'Domande · Clima · 00', pdf: 'risposte.pdf', html: 'risposte.html' };
    assert.deepStrictEqual(S.fileDaInviare(ap, {}), [{ rel: 'Studio Attivo/Prove/Domande · Clima · 00/risposte.pdf', nome: 'risposte.pdf' }]);
    assert.deepStrictEqual(S.fileDaInviare(ap, { report: true, jsonl: true }).map(f => f.nome), ['risposte.pdf', 'sessioni.jsonl'], 'risposte.html non è un report');
    const mc = { id: 'Quiz · Clima · 01', html: 'report.html' };
    assert.deepStrictEqual(S.fileDaInviare(mc, {}).map(f => f.nome), ['report.html']);
    assert.deepStrictEqual(S.fileDaInviare(mc, { report: true }).map(f => f.nome), ['report.html'], 'niente doppioni');
});

test('erroreTesto: che cosa è successo e che cosa fare (0119)', () => {
    assert.ok(/scaduto.*di nuovo/.test(S.erroreTesto(null, { status: 403 })));
    assert.ok(/non ha aperto questa mappa.*Vault su iPad/.test(S.erroreTesto(null, { status: 404 })));
    assert.ok(/troppo grande.*Avvisa il docente/.test(S.erroreTesto(null, { status: 413 })));
    assert.ok(/numero e classe in «Chi sei»/.test(S.erroreTesto(null, { status: 400, codice: 'studente' })));
    assert.ok(/troppe prove/.test(S.erroreTesto(null, { status: 400, codice: 'troppe-consegne' })), 'il tetto delle consegne non è un errore d\'identità');
    assert.ok(/tipo di file/.test(S.erroreTesto(null, { status: 415 })));
    assert.ok(/stessa rete Wi-Fi/.test(S.erroreTesto(null, new Error('fetch'))));
});

test('la prova a parole: genere — argomento (nel testo della consegna), data GG/MM/AAAA', () => {
    assert.strictEqual(S.etichettaProva({ tipo: 'Scelta multipla', mappa: '1a Guerra Mondiale', nome: '2026-10-20 · Quiz · 1a Guerra M… · 00' }), 'Quiz a scelta multipla — 1a Guerra Mondiale');
    assert.strictEqual(S.etichettaProva({ tipo: 'Domande aperte', titolo: 'Il clima' }), 'Domande aperte — Il clima');
    assert.strictEqual(S.etichettaProva({ nome: 'cartella vecchia' }), 'cartella vecchia', 'senza sessione.json resta il nome della cartella');
    assert.strictEqual(S.dataProva('2026-10-20T08:12:00.000Z'), '20/10/2026');
    assert.strictEqual(S.dataProva('06/09/2026'), '06/09/2026');
    assert.strictEqual(S.dataProva(''), '');
});

test('schemi: Docente (con e senza camera, con e senza prove), Chi sei, Indirizzo, Invia passano validaSchema', () => {
    const id = FC.identitaStudente('7', '2b');
    const d1 = ok(S.schemaDocente({ identita: id, camera: true, prove: [{ id: 'p1', nome: 'Domande · Clima · 00', tipo: 'Scelta multipla', mappa: '1a Guerra Mondiale', pdf: 'risposte.pdf', data: '2026-10-20T08:00:00Z' }], vault: 'Il Clima' }), 'docente');
    assert.deepStrictEqual(d1.sezioni.map(x => x.id), ['sc-ricevi', 'sc-invia'], 'la sezione «Chi sei» non c\'è più');
    assert.strictEqual(d1.senzaTestata, true, 'niente titolo, sottotitolo né ×: si esce con «Chiudi»');
    assert.strictEqual(d1.titolo, 'Il tuo docente', 'il titolo resta il nome della finestra');
    assert.strictEqual(d1.sottotitolo, undefined);
    assert.strictEqual(d1.sezioni[0].titolo, undefined, 'il riquadro della ricezione senza titoletto');
    assert.deepStrictEqual(d1.sezioni[0].voci.map(v => [v.id, v.etichetta, v.icona]), [['inquadra', 'Ricevi un vault', 'qr-code']], 'ricevere viene per primo');
    assert.deepStrictEqual(d1.sezioni[0].azioni.map(a => [a.id, a.etichetta, a.ruolo]), [['scrivi', 'Inserisci link', 'quieto']], '«Inserisci link» sotto il bottone');
    const v = d1.sezioni[1].voci[0];
    assert.strictEqual(v.id, 'invia:p1');
    assert.strictEqual(v.etichetta, '1a Guerra Mondiale', 'l\'argomento sopra: intero, non troncato a metà');
    assert.strictEqual(v.sotto, 'Quiz a scelta multipla · 20/10/2026', 'genere e data sotto, la data una volta sola');
    assert.strictEqual(S.schemaDocente({ prove: [{ id: 'x', nome: 'cartella vecchia', pdf: 'r.pdf' }] }).sezioni[1].voci[0].etichetta, 'cartella vecchia', 'senza sessione.json resta il nome');
    assert.deepStrictEqual(d1.sezioni[1].rimandi.map(r => [r.id, r.etichetta]), [['guida', 'Istruzioni'], ['identita', '2B · n. 7']]);
    const d2 = ok(S.schemaDocente({ identita: null, camera: false, prove: [] }), 'docente senza');
    assert.deepStrictEqual(d2.sezioni[0].voci.map(v => [v.id, v.etichetta]), [['scrivi', 'Ricevi un vault']], 'senza camera il bottone chiede il link');
    assert.strictEqual(d2.sezioni[0].azioni, undefined, 'e «Inserisci link» non si ripete');
    assert.strictEqual(S.schemaIndirizzo({}).titolo, 'Inserisci link');
    assert.ok(/console del progetto/.test(d2.sezioni[1].testo), 'senza prove dice dove farne una');
    assert.deepStrictEqual(d2.sezioni[1].rimandi.map(r => r.etichetta), ['Istruzioni', 'Chi sei?'], 'chi sei vuoto: la domanda');
    const ci = ok(S.schemaIdentita({ identita: id }), 'chi sei');
    assert.strictEqual(ci.sezioni[0].campi[0].etichetta, 'Il tuo numero di registro');
    assert.ok(/elenco di classe/.test(ci.sezioni[0].campi[0].aiuto));
    assert.deepStrictEqual(ci.sezioni.map(x => x.campi.map(c => [c.id, c.tipo])), [[['numero', 'testo']], [['grado', 'scelta'], ['sezione', 'testo']]], 'classe a tendina e sezione, come nell\'app del docente');
    assert.strictEqual(ci.sezioni[1].colonne, 2, 'classe e sezione affiancate');
    assert.deepStrictEqual(ci.sezioni[1].campi[0].opzioni.map(o => o.etichetta), ['— scegli —', '1ª', '2ª', '3ª', '4ª']);
    assert.strictEqual(ci.sezioni[1].campi[0].valore, '2', 'la classe salvata preseleziona la tendina');
    assert.strictEqual(ci.sezioni[1].campi[1].valore, 'B');
    assert.strictEqual(S.schemaIdentita({}).sezioni[1].campi[0].valore, '', 'vuoto: «— scegli —»');
    assert.strictEqual(S.classeDa({ grado: '3', sezione: 'a' }), '3A');
    assert.strictEqual(FC.identitaStudente('7', S.classeDa({ grado: '', sezione: 'B' })), null, 'senza classe scelta non si salva');
    assert.deepStrictEqual(['b', 'Bc', '2', ' é', 'ß', ''].map(S.sezionePulita), ['B', 'B', '', '', 'S', ''], 'una lettera sola, maiuscola');
    ok(S.schemaIndirizzo({}), 'indirizzo');
    const inv = ok(S.schemaInvio({ prova: { id: 'p2', nome: 'Quiz', tipo: 'Scelta multipla', mappa: 'Clima', html: 'report.html' }, jsonl: true, identita: id }), 'invio');
    assert.deepStrictEqual(inv.sezioni.map(x => x.id), ['sc-chi', 'sc-cosa', 'sc-extra', 'sc-prima']);
    assert.strictEqual(inv.sezioni[0].testo, 'Classe 2B · numero 7');
    assert.deepStrictEqual(inv.sezioni[0].rimandi.map(r => [r.id, r.etichetta]), [['identita', 'Cambia']]);
    assert.strictEqual(inv.sezioni[1].testo, 'Mandi al docente le risposte di: Quiz a scelta multipla — Clima (report.html).');
    assert.deepStrictEqual(inv.sezioni[2].campi.map(c => c.etichetta), ['Anche il report della prova', 'Anche i miei record di studio'], 'senza i nomi dei file');
    assert.ok(/QR «Vault su iPad».*stessa rete Wi-Fi/.test(inv.sezioni[3].testo), 'il promemoria sopra il bottone');
    assert.strictEqual(inv.azioni[1].id, 'invia');
    assert.deepStrictEqual(ok(S.schemaInvio({ prova: { id: 'p1', pdf: 'risposte.pdf', html: 'risposte.html' }, jsonl: false }), 'invio nudo').sezioni.map(x => x.id), ['sc-cosa', 'sc-prima'], 'niente spunte inutili');
});

test('la guida a slide: sei passi, «Passo N di 6», ‹ e › non chiudono, «Ho capito» sull\'ultima, le schermate esistono', () => {
    const fs = require('fs'), path = require('path');
    assert.strictEqual(S.GUIDA.length, 6);
    for (let n = 1; n <= 6; n++) {
        const g = ok(S.schemaGuida({ passo: n }), 'guida ' + n);
        assert.strictEqual(g.sottotitolo, 'Passo ' + n + ' di 6');
        const ids = g.azioni.map(a => a.id);
        assert.deepStrictEqual(ids, n === 1 ? ['avanti'] : n === 6 ? ['indietro', 'capito'] : ['indietro', 'avanti']);
        g.azioni.filter(a => a.id !== 'capito').forEach(a => assert.strictEqual(a.chiude, false, a.id + ' non chiude'));
        const sez = g.sezioni[0];
        assert.ok(sez.titolo && sez.testo, 'titolo e testo');
        if (n === 5) { assert.strictEqual(sez.figura, undefined, 'la 5 aspetta la schermata di Giacomo'); continue; }
        assert.strictEqual(sez.figura.larga, true);
        assert.ok(sez.figura.alt, 'ogni schermata ha il suo alt');
        assert.strictEqual(fs.existsSync(path.join(__dirname, '..', 'public', sez.figura.src)), true, 'esiste ' + sez.figura.src);
    }
    assert.strictEqual(S.schemaGuida({ passo: 99 }).sottotitolo, 'Passo 6 di 6', 'fuori scala si ferma all\'ultima');
    assert.strictEqual(S.schemaGuida({}).sottotitolo, 'Passo 1 di 6');
});

test('fmtBytes', () => {
    assert.strictEqual(S.fmtBytes(500), '500 B');
    assert.strictEqual(S.fmtBytes(2048), '2 KB');
    assert.strictEqual(S.fmtBytes(3 * 1048576), '3.0 MB');
});
