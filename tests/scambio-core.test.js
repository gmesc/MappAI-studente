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

test('cartellaDestinazione: classe/materia/mappa, senza materia, piatto, NFC', () => {
    assert.strictEqual(S.cartellaDestinazione({ nome: 'Elettricità - MM', classe: '4R', materia: 'Scienze' }, 'Documents'), 'Documents/4R/Scienze/Elettricità - MM');
    assert.strictEqual(S.cartellaDestinazione({ nome: 'Clima', classe: '1A', materia: null }, 'Documents'), 'Documents/1A/Clima');
    assert.strictEqual(S.cartellaDestinazione({ nome: 'Clima', classe: null, materia: 'Geografia' }, 'Documents'), 'Documents/Clima', 'senza classe non c\'è il livello materia');
    assert.strictEqual(S.cartellaDestinazione({ nome: 'Elettricità' }, 'Documents'), 'Documents/Elettricità', 'NFC');
    assert.strictEqual(S.cartellaDestinazione({ nome: '' }, 'Documents'), null);
});

test('pianoRicezione: filtra di nuovo con relVaultStudente, url con token, totale', () => {
    const man = { nome: 'Clima', classe: '4R', materia: 'Geografia', files: [
        { rel: 'index.yaml', size: 100 }, { rel: 'Nodi/Clima.md', size: 50 }, { rel: 'Materiale Studio/Quiz-MC-Clima.pdf', size: 1000 },
        { rel: 'vista.json', size: 10 }, { rel: '../evil', size: 1 }, { rel: 'Studio Attivo/sessioni.jsonl', size: 5 }
    ] };
    const p = S.pianoRicezione(man, 'http://10.0.0.2:8768', 'tok', 'Documents', FC);
    assert.strictEqual(p.dest, 'Documents/4R/Geografia/Clima');
    assert.deepStrictEqual(p.files.map(f => f.rel), ['index.yaml', 'Nodi/Clima.md', 'Materiale Studio/Quiz-MC-Clima.pdf']);
    assert.strictEqual(p.files[1].url, 'http://10.0.0.2:8768/vault/Nodi%2FClima.md?s=tok');
    assert.strictEqual(p.totale, 1150);
    assert.strictEqual(p.scartati, 3);
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

test('erroreTesto: 403 QR scaduto, 404 mappa, 413 grande, 400 identità, altro rete', () => {
    assert.ok(/scaduto/.test(S.erroreTesto(null, { status: 403 })));
    assert.ok(/mappa/.test(S.erroreTesto(null, { status: 404 })));
    assert.ok(/grande/.test(S.erroreTesto(null, { status: 413 })));
    assert.ok(/classe/.test(S.erroreTesto(null, { status: 400 })));
    assert.ok(/rete/.test(S.erroreTesto(null, new Error('fetch'))));
});

test('schemi: Docente (con e senza camera, con e senza prove), Chi sei, Indirizzo, Invia passano validaSchema', () => {
    const id = FC.identitaStudente('4517', '1a');
    const d1 = ok(S.schemaDocente({ identita: id, camera: true, prove: [{ id: 'p1', nome: 'Domande · Clima · 00', tipo: 'Domande aperte', pdf: 'risposte.pdf', data: '06/09/2026' }], vault: 'Il Clima' }), 'docente');
    assert.deepStrictEqual(d1.sezioni[1].voci.map(v => v.id), ['inquadra', 'scrivi']);
    assert.strictEqual(d1.sezioni[2].voci[0].id, 'invia:p1');
    assert.ok(/1A/.test(d1.sezioni[0].voci[0].etichetta) && /4517/.test(d1.sezioni[0].voci[0].etichetta));
    const d2 = ok(S.schemaDocente({ identita: null, camera: false, prove: [] }), 'docente senza');
    assert.deepStrictEqual(d2.sezioni[1].voci.map(v => v.id), ['scrivi'], 'senza camera resta l\'indirizzo');
    assert.ok(d2.sezioni[2].testo, 'senza prove lo dice');
    ok(S.schemaIdentita({ identita: id }), 'chi sei');
    ok(S.schemaIndirizzo({}), 'indirizzo');
    const inv = ok(S.schemaInvio({ prova: { id: 'p2', nome: 'Quiz', html: 'report.html' }, jsonl: true, identita: id }), 'invio');
    assert.deepStrictEqual(inv.sezioni[1].campi.map(c => c.id), ['report', 'jsonl']);
    assert.strictEqual(inv.azioni[1].id, 'invia');
    assert.strictEqual(ok(S.schemaInvio({ prova: { id: 'p1', pdf: 'risposte.pdf', html: 'risposte.html' }, jsonl: false }), 'invio nudo').sezioni.length, 1, 'niente spunte inutili');
});

test('fmtBytes', () => {
    assert.strictEqual(S.fmtBytes(500), '500 B');
    assert.strictEqual(S.fmtBytes(2048), '2 KB');
    assert.strictEqual(S.fmtBytes(3 * 1048576), '3.0 MB');
});
