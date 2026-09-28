/* «Stampa» sull'iPad (task 0036): il `print` del documento nel pannello va al
   plugin nativo col file:// vero; senza plugin resta l'originale; un rifiuto
   diventa un avviso; un documento di origine opaca non rompe niente. I PDF
   passano da `stampaFile`, con `altrimenti` per il browser. */
const { test } = require('node:test');
const assert = require('node:assert');
const S = require('../public/js/studente/stampa.js');

const URI = 'file:///var/mobile/Containers/Data/Application/X/Documents/2A/Storia/La%20carta/Sintesi%20-%20La%20carta.html';

function pluginFinto(risposta) {
    const chiamate = [];
    return {
        chiamate,
        stampa(o) { chiamate.push(o); return risposta instanceof Error ? Promise.reject(risposta) : Promise.resolve(risposta || { stampato: true }); }
    };
}
function iframeFinto() {
    const w = { document: {}, stampe: 0 };
    w.print = function () { w.stampe++; };
    return { contentWindow: w };
}
const aspetta = () => new Promise(r => setImmediate(r));

test('aggancia: col plugin il print del documento chiama stampa con l\'URI vero e il titolo senza estensione', async () => {
    const P = pluginFinto(), f = iframeFinto();
    assert.strictEqual(S.aggancia(f, { plugin: () => P, url: URI, titolo: 'Sintesi - La carta.html', avvisa: () => { throw new Error('nessun avviso'); } }), true);
    f.contentWindow.print();
    await aspetta();
    assert.deepStrictEqual(P.chiamate, [{ url: URI, titolo: 'Sintesi - La carta' }]);
    assert.strictEqual(f.contentWindow.stampe, 0, 'il print della WKWebView (che non fa niente) non si chiama');
});

test('aggancia: senza plugin (il browser) chiama il print originale', async () => {
    const f = iframeFinto();
    assert.ok(S.aggancia(f, { plugin: () => null, url: null, titolo: 'Quiz.html' }));
    f.contentWindow.print();
    await aspetta();
    assert.strictEqual(f.contentWindow.stampe, 1);
});

test('aggancia: due load sullo stesso window non avvolgono due volte', async () => {
    const P = pluginFinto(), f = iframeFinto();
    S.aggancia(f, { plugin: () => P, url: URI, titolo: 'a.html' });
    S.aggancia(f, { plugin: () => P, url: URI, titolo: 'a.html' });
    f.contentWindow.print();
    await aspetta();
    assert.strictEqual(P.chiamate.length, 1);
});

test('un rifiuto del plugin diventa un avviso, non un bottone muto', async () => {
    const P = pluginFinto(new Error('c\'è già una stampa aperta')), f = iframeFinto(), avvisi = [];
    S.aggancia(f, { plugin: () => P, url: URI, titolo: 'Sintesi.html', avvisa: m => avvisi.push(m) });
    f.contentWindow.print();
    await aspetta(); await aspetta();
    assert.deepStrictEqual(avvisi, ['Non riesco a stampare: c\'è già una stampa aperta']);
});

test('col plugin ma senza percorso del file: si avvisa, non si tace', async () => {
    const P = pluginFinto(), avvisi = [];
    const r = await S.stampaFile({ plugin: P, url: null, titolo: 'x.html', avvisa: m => avvisi.push(m), prefisso: 'KO: ' });
    assert.strictEqual(P.chiamate.length, 0);
    assert.strictEqual(r.stampato, false);
    assert.match(avvisi[0], /^KO: .*percorso/);
});

test('un documento di origine opaca non rompe: aggancia risponde false', () => {
    const opaco = { get contentWindow() { return { get document() { throw new Error('SecurityError'); } }; } };
    assert.strictEqual(S.aggancia(opaco, { plugin: () => pluginFinto() }), false);
    assert.strictEqual(S.aggancia(null, {}), false);
    assert.strictEqual(S.aggancia({ contentWindow: null }, {}), false);
});

test('stampaFile (i PDF): col plugin l\'URI arriva anche da una promessa', async () => {
    const P = pluginFinto({ stampato: false });
    const r = await S.stampaFile({ plugin: () => P, url: () => Promise.resolve('file:///D/Allegati/Scheda.pdf'), titolo: 'Scheda.pdf' });
    assert.deepStrictEqual(P.chiamate, [{ url: 'file:///D/Allegati/Scheda.pdf', titolo: 'Scheda' }]);
    assert.deepStrictEqual(r, { stampato: false, nativa: true }, 'menu chiuso senza stampare: nessun avviso');
});

test('stampaFile: senza plugin chiama altrimenti; un URI che non arriva è un avviso', async () => {
    let altrove = 0;
    await S.stampaFile({ plugin: () => null, url: 'file:///x.pdf', altrimenti: () => { altrove++; } });
    assert.strictEqual(altrove, 1);
    const avvisi = [];
    await S.stampaFile({ plugin: pluginFinto(), url: () => Promise.reject(new Error('File does not exist')), avvisa: m => avvisi.push(m) });
    assert.deepStrictEqual(avvisi, ['Non riesco a stampare: File does not exist']);
});

test('senzaEstensione: solo l\'ultima estensione, i punti nel nome restano', () => {
    assert.strictEqual(S.senzaEstensione('Quiz 2.A - La carta.html'), 'Quiz 2.A - La carta');
    assert.strictEqual(S.senzaEstensione('Scheda.pdf'), 'Scheda');
    assert.strictEqual(S.senzaEstensione(null), '');
});
