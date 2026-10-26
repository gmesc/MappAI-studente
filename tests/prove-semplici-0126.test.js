'use strict';
/*
 * Packet 0126 (lotto B) — sull'iPad le prove «semplici», come il LIVE dei telefoni.
 *
 * Giacomo, 24/10: un interruttore «semplice/meta», di serie su semplice; in semplice
 * le domande aperte e il quiz con la UI del LIVE, i criteri «solo da leggere, senza
 * spunte», alla fine la schermata del LIVE col 💾 (25/10: «Apre il foglio»); il
 * contatore nella barra della × del pannello («Solo il contatore»).
 *
 * La view comune (`mappai-scelta-view.js`, copiata da MappAI re) ha le due opzioni
 * nuove, `criteri: 'leggi'` e `contatore`, provate di là (tests/scelta-view-0126 di
 * MappAI re). Qui si prova l'innesto; l'aspetto vero lo prova il gate sull'iPad.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const leggi = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const senzaCommenti = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');
function corpo(src, da, a) {
    const i = src.indexOf(da), j = a ? src.indexOf(a, i + da.length) : src.length;
    assert.ok(i >= 0, 'non trovato: ' + da);
    return src.slice(i, j < 0 ? src.length : j);
}

test('autotest: il modo viene dalla preferenza dell\'iPad, letto da MappAIStudiaCore.modoProve', () => {
    const s = senzaCommenti(leggi('public/js/studente/autotest.js'));
    assert.ok(/localStorage\.getItem\('mappai_studente_prove_modo'\)/.test(s), 'la chiave');
    assert.ok(/MappAIStudiaCore[\s\S]{0,80}modoProve/.test(s), 'una regola sola per il modo (studia-core)');
});

test('autotest: in semplice `cfg.semplice` e i criteri da leggere; il «su misura» resta nel modo di prima', () => {
    const p = senzaCommenti(corpo(leggi('public/js/studente/autotest.js'), 'function prova(o)', 'function scriviSessione'));
    assert.ok(/var semplice = modo\(\) === 'semplice' && o\.tipo !== 'su-misura'/.test(p), 'semplice di serie, mai per il su misura');
    assert.ok(/normalizzaCfg\(\{[^}]*semplice: semplice[^}]*\}\)/.test(p), 'cfg.semplice');
    assert.ok(/criteri: o\.mc \? false : \(semplice \? 'leggi' : true\)/.test(p), 'leggi in semplice, spunte in meta, niente per il quiz');
});

test('autotest: il contatore nella barra del pannello, in tutte e due le modalità', () => {
    const p = senzaCommenti(corpo(leggi('public/js/studente/autotest.js'), 'function prova(o)', 'function scriviSessione'));
    assert.ok(/D\.apri\(\{[\s\S]*?contatore: true[\s\S]*?\}\)/.test(p), 'il dock prepara il posto');
    assert.ok(/monta: function \(h, c\)/.test(p), 'e lo passa a chi monta');
    assert.ok(/contatore: conta/.test(p), 'la view lo riceve');
    assert.ok(/function svuotaConta\(\)/.test(p) && (p.match(/svuotaConta\(\)/g) || []).length >= 3, 'a prova finita la barra torna vuota');
});

test('autotest: in semplice la chiusura è quella del LIVE e il 💾 apre il foglio scritto', () => {
    const p = senzaCommenti(corpo(leggi('public/js/studente/autotest.js'), 'function prova(o)', 'function scriviSessione'));
    const es = corpo(p, 'function esitoLive', 'function consegna');
    assert.ok(/SV\(\)\.mostraEsito\(host, \{/.test(es), 'la schermata finale della view');
    assert.ok(/conteggio: prese\(SC\(\)\.conteggio\(o\.pool, st\)\)/.test(es), '«Risposte: n / N» dal core, su quelle prese');
    assert.ok(/function prese\(n\) \{ return \{ scritte: n\.scritte, totale: n\.scelte \|\| n\.totale \}; \}/.test(senzaCommenti(leggi('public/js/studente/autotest.js'))), 'in Meta le prese, non tutto il gruppo');
    assert.ok(/onSalva: function \(\)/.test(es), 'il 💾 c\'è');
    assert.ok(/scrittura\.then\(/.test(es), 'aspetta la scrittura');
    assert.ok(/apriFile\(S\(\)\.activeVaultPath, r\.rel \+ '\/' \+ \(o\.mc \? 'report\.html' : 'risposte\.html'\)/.test(es), 'la strada di «Le tue prove › apri»');
    const c = corpo(p, 'function consegna', 'function scriviSessione');
    /* gate del 25/10 (Giacomo, in Meta: «dopo che ho consegnato appare una schermata troppo tecnica»): la chiusura
       del LIVE vale in tutte e due le modalità, nel pannello */
    assert.ok(/if \(inDock\) \{/.test(c) && !/if \(semplice && inDock\)/.test(c), 'in tutte e due le modalità, nel pannello');
    assert.ok(/cfg: Object\.assign\(\{\}, cfg, \{ semplice: true \}\)/.test(es), 'la view disegna la chiusura del LIVE anche in Meta');
    assert.ok(/scriviSessione\(o, st\)/.test(c) && /scriviReport\(/.test(c), 'il salvataggio resta automatico, prima del 💾');
});

test('documenti: `apri({ contatore: true })` mette `.sd-conta` nella barra della × e `libera()` la toglie', () => {
    const s = senzaCommenti(leggi('public/js/studente/documenti.js'));
    const a = corpo(s, 'function apri(o)', 'function vesti');
    assert.ok(/if \(o\.contatore\)/.test(a), 'solo a richiesta');
    assert.ok(/className = 'sd-conta'/.test(a));
    assert.ok(/insertBefore\(conta, testa\.querySelector\('\.sd-sp'\)\)/.test(a), 'a sinistra, prima dello spazio e della ×');
    assert.ok(/o\.monta\(corpo, conta\)/.test(a));
    const l = corpo(s, 'function libera()', '\n    function ');
    assert.ok(/querySelector\('\.sd-conta'\)/.test(l), 'il documento dopo non lo eredita');
});

test('console: i due radio scrivono la preferenza e ridisegnano; lo schema riceve il modo', () => {
    const s = senzaCommenti(leggi('public/js/studente/console.js'));
    assert.ok(/a === '__campo' && \/\^modo-\(semplice\|meta\)\$\/\.test\(ev\.campo/.test(s), 'il gesto sui radio');
    assert.ok(/localStorage\.setItem\('mappai_studente_prove_modo', m\)/.test(s), 'la preferenza');
    assert.ok(/modo: modoProve\(\)/.test(s), 'lo schema la legge');
});

test('studente.css: la regola del contatore nella barra', () => {
    assert.ok(/#studente-dock \.sd-conta \{/.test(leggi('public/css/studente.css')));
});

/* gate del 25/10 (Giacomo): «'Hai finito!' grande come il 70% della larghezza della vista e aumenta
   proporzionalmente anche la dimensione dell'emoji. Il testo del numero di riposte e il sotto testo di
   spiegazione possono avere dimensione 19px e dimensione 16px. Il testo 'Domanda 1 di 12' e il counter
   della barra a fondo pagina possono avere dimensione 16px.» */
test('autotest: la chiusura del LIVE con «Hai finito!» al 70% del pannello', () => {
    const es = corpo(senzaCommenti(leggi('public/js/studente/autotest.js')), 'function esitoLive', 'function consegna');
    assert.ok(/titoloLargo: 0\.7/.test(es));
});

/* gate del 25/10 (Giacomo): «Il testo delle correzioni deve essere di dimensione 19px, quando scelgo una
   risposta allora nascondi le altre scelte per lasciare spazio alla risposta.» Le opzioni diventano
   `disabled` quando il verdetto c'è (mappai-quiz-mc-view.js, `bloccata`): da lì restano la scelta e il verdetto. */
test('studente.css: nel pannello le correzioni a 19 px e, dato il verdetto, solo l\'opzione scelta', () => {
    const c = leggi('public/css/studente.css');
    assert.ok(/#studente-dock \.qmc \.verd, #studente-dock \.qmc \.verd \.sp \{ font-size: 19px; \}/.test(c), 'le correzioni a 19 px');
    assert.ok(/#studente-dock \.qmc \.opt-row:has\(\.opt:disabled\):not\(:has\(\.opt\.sel\)\) \{ display: none; \}/.test(c), 'via le altre scelte');
});

test('studente.css: nel pannello «Risposte» a 19 px, la frase sotto a 16, i due contatori a 16', () => {
    const c = leggi('public/css/studente.css');
    assert.ok(/#studente-dock \.sc-fine__recap \{ font-size: 19px; \}/.test(c), 'Risposte: n / N');
    assert.ok(/#studente-dock \.sc-fine p \{ font-size: 16px; \}/.test(c), 'la frase sotto');
    assert.ok(/#studente-dock \.sd-conta \.sc-cnt \{ font-size: 16px; \}/.test(c), '«Domanda 1 di 12» nella barra');
    assert.ok(/#studente-dock \.sc-nav__n \{ font-size: 16px; \}/.test(c), 'il contatore in fondo');
});

test('index: `?v=` col segno dello 0126, come prefisso', () => {
    const h = leggi('public/index.html');
    for (const f of ['js/studente/autotest.js', 'js/studente/studia-core.js', 'js/studente/console.js', 'js/studente/documenti.js', 'css/studente.css'])
        assert.ok(new RegExp(f.replace(/[./]/g, '\\$&') + '\\?v=p0126-').test(h), f);
    assert.ok(/js\/mappai-scelta-view\.js\?v=sync-0126-/.test(h), 'la copia della view');
    assert.ok(/traduzioni\/en_translations\.js\?v=[^"]*0126-/.test(h), 'la copia del dizionario');
    assert.ok(/js\/mappai-modal\.js\?v=[^"]*0126-/.test(h), 'la copia del motore (allargamento 1)');
});

/* gate del 25/10 (Giacomo): il report del quiz nel pannello — «su iPad in questa schermata non è necessario
   mostrare il bottone 'chiudi' perché c'è la 'x'»; «Sposta '[Nome progetto] · [Nome dei materiale] · Report
   allievo' e il bottone 'Stampa/PDF' nella barra dello split.» */
test('documenti: un report del LIVE nel pannello — la sua barra sparisce, titolo e «Stampa / PDF» nella barra della ×', () => {
    const s = senzaCommenti(leggi('public/js/studente/documenti.js'));
    const v = corpo(s, 'function vestiReport(f, o)', '\n    function ');
    assert.ok(/querySelector\('\.no-print button\[onclick\*="print"\]'\)/.test(v), 'riconosce la barra di stampa del report');
    assert.ok(/\.no-print\{display:none !important\}/.test(v), 'la nasconde (barra e spazio sotto)');
    assert.ok(/className = 'sd-stampa-pdf'/.test(v) && /contentWindow\.print\(\)/.test(v), '«Stampa / PDF» stampa il report');
    assert.ok(/classList\.add\('sd--con-titolo'\)/.test(v) && /o\.titoloBarra/.test(v), 'il titolo si vede nella barra');
    assert.ok(/vestiReport\(f, o\)/.test(s), 'agganciata al caricamento dell\'iframe');
    const l = corpo(s, 'function libera()', '\n    function ');
    assert.ok(/\.sd-stampa-pdf/.test(l) && /sd--con-titolo/.test(l), 'il documento dopo non li eredita');
    const a = corpo(s, 'function apriFile(vaultPath, relPath, nome, extra)', '\n    function ');
    assert.ok((a.match(/titoloBarra: extra\.titoloBarra/g) || []).length >= 1 && /apriBlob\(vaultPath, relPath, nome, extra\)/.test(a), 'il titolo passa per tutte e due le strade');
    assert.ok(/titoloReport\(/.test(corpo(s, 'function azione(a, vaultPath, sessioni)', '\n    function ')), '«Le tue prove › apri» dà il titolo anche lui');
});

test('autotest: il 💾 del quiz apre il report col titolo; la sessione ricorda l\'angolo', () => {
    const s = senzaCommenti(leggi('public/js/studente/autotest.js'));
    assert.ok(/titoloReport\(\{ mappa: S\(\)\.rootNodeLabel/.test(corpo(s, 'function esitoLive', 'function consegna')), 'il titolo per la barra');
    assert.ok(/angolo: angolo \|\| ''/.test(corpo(s, 'function scriviReport(', '\n    function ')), 'sessione.json porta l\'angolo');
});

test('studente.css: il titolo visibile e il bottone «Stampa / PDF» nella barra', () => {
    const c = leggi('public/css/studente.css');
    assert.ok(/html\.studente #studente-dock\.sd--con-titolo \.sd-titolo \{/.test(c));
    assert.ok(/#studente-dock \.sd-stampa-pdf \{/.test(c));
});

/* ── allargamento 2 (25/10) ──────────────────────────────────────────────── */
test('studente.css: l\'interruttore sulla riga del titolo della prima tabella', () => {
    const c = leggi('public/css/studente.css');
    assert.ok(/html\.studente \.mm-tabg--testa \{[^}]*display: flex/.test(c), 'la riga del titolo è una riga sola');
    assert.ok(/html\.studente \.mm-tabg--testa > \.mm-sez__c \{[^}]*flex: 0 0 100%/.test(c), 'la tabella va sotto');
});

test('studente.css: «Domande su misura» grande come la prova (righe 56 px, testo 19, tendine solo quando servono)', () => {
    const c = leggi('public/css/studente.css');
    assert.ok(/\[data-sez="dove"\] \.mm-opz, \.mm-sez\[data-sez="quali"\] \.mm-opz \{[^}]*min-height: 56px/.test(c));
    assert.ok(/\.mm-opz__t \{[^}]*font-size: 19px/.test(c));
    assert.ok(/:has\(input\[data-campo="amb-ramo"\]:checked\)/.test(c) && /:has\(input\[data-campo="ang-uno"\]:checked\)/.test(c), 'le tendine compaiono con «Un ramo» e «Un angolo solo»');
    assert.ok(/@media \(orientation: landscape\)/.test(c), 'in orizzontale le due domande affiancate');
});

test('documenti: il pannello «Materiali» per gli studenti; «Foglio dei nodi» e «Catena dei perché» nel pannello', () => {
    const s = senzaCommenti(leggi('public/js/studente/documenti.js'));
    const m = corpo(s, 'function materiali()', '\n    function ');
    assert.ok(/classList\.add\('sd--con-titolo'\)/.test(m), '«Materiali» scritto nella barra della ×');
    assert.ok(/Le etichette della mappa da stampare e ritagliare\./.test(m), 'la frase del foglio dei nodi');
    assert.ok(/Il riassunto della mappa, da leggere o da ascoltare\./.test(m), 'la frase della sintesi');
    assert.ok(/Le cause e gli effetti della mappa\./.test(m), 'la frase della catena');
    assert.ok(/MappAIStudenteFoglioNodi\.apri\(\)/.test(m), 'il foglio dei nodi dello studente');
    assert.ok(/function catenaNelPannello\(/.test(s) && /catenaNelPannello\(\)/.test(m), 'la catena nel pannello');
    const c = corpo(s, 'function catenaNelPannello(', '\n    function ');
    assert.ok(/window\.open = /.test(c) && /window\.open = vero/.test(c), 'prende il documento invece della finestra nuova, poi rimette window.open');
    /* dall'allargamento 6 si apre da un file vero in Studio Attivo/Stampe, non più da un blob (la stampa non c'era) */
    assert.ok(/apriFile\(vp, rel, nome\)/.test(c) && !/createObjectURL/.test(c));
});

test('studente.css: righe del pannello a 19/16 px e intestazione a 16', () => {
    const c = leggi('public/css/studente.css');
    assert.ok(/#studente-dock \.sd-riga__t b \{ font-size: 19px; \}/.test(c));
    assert.ok(/#studente-dock \.sd-riga__t small \{[^}]*font-size: 16px/.test(c));
    assert.ok(/#studente-dock \.sd-h \{[^}]*font-size: 16px/.test(c));
});

test('foglio-nodi: a tutto schermo, una riga sola di comandi, anteprima vera con frecce, «n/N» e swipe', () => {
    const s = senzaCommenti(leggi('public/js/studente/foglio-nodi.js'));
    assert.ok(/window\.MappAIStudenteFoglioNodi = \{ apri: apri/.test(s));
    assert.ok(/printAllNodeLabels\(Object\.assign\(\{\}, opz, \{ toDisk:/.test(s), 'l\'anteprima dal generatore vero, senza salvare');
    assert.ok(/printAllNodeLabels\(opz\)/.test(s), '«PDF» salva come oggi (sull\'iPad Studio Attivo/Stampe e condivisione)');
    assert.ok(/>PDF</.test(s) || /'PDF'/.test(s), 'il bottone si chiama «PDF»');
    assert.ok(/testoPagina\(/.test(s), '«n/N»');
    assert.ok(/pointerdown/.test(s) && /pointerup/.test(s), 'lo swipe');
    assert.ok(/MappAIStudentePdfVista\.libreria\(\)/.test(s), 'pdf.js del reader');
});

test('index: i due file nuovi del foglio dei nodi, col segno dello 0126', () => {
    const h = leggi('public/index.html');
    assert.ok(/js\/studente\/foglio-nodi-core\.js\?v=p0126-/.test(h));
    assert.ok(/js\/studente\/foglio-nodi\.js\?v=p0126-/.test(h));
    assert.ok(/js\/studente\/launcher-core\.js\?v=p0126-/.test(h));
    assert.ok(h.indexOf('js/studente/foglio-nodi-core.js') < h.indexOf('js/studente/foglio-nodi.js'), 'il core prima');
});

/* gate del 25/10 (Giacomo): «verticalmente devono essere allineati con precisione al titolo 'Domande aperte'». Il motore
   allinea l'etichetta di un radio in ALTO (`.mm-opz { align-items: flex-start }`, pallino con 2 px di margine): in un'etichetta
   alta 44 px pallino e testo restavano in cima, il titolo al centro dei suoi 44. Sulla riga del titolo: centro, nessun margine,
   e il testo nel corpo delle etichette: misurato nel browser, le linee di base coincidono col titolo. */
test('studente.css: i radio sulla riga del titolo, centrati, senza il margine del motore', () => {
    const c = leggi('public/css/studente.css');
    assert.ok(/html\.studente \.mm-tabg--testa \.mm-opz \{[^}]*align-items: center[^}]*padding: 0/.test(c), 'etichetta centrata');
    assert.ok(/html\.studente \.mm-tabg--testa \.mm-opz input \{[^}]*margin: 0/.test(c), 'il pallino senza il margine del motore');
    assert.ok(/html\.studente \.mm-tabg--testa \.mm-opz__t \{[^}]*font-size: var\(--mm-fs-label\)/.test(c), 'il corpo delle etichette');
});

/* ── allargamento 3 (Giacomo al gate, 25/10, in Meta) ───────────────────────────────────────
   «il bottone consegna deve apparire solo dopo che sono arrivato all'ultima domanda selezionata»;
   «nella schermata di consegna il bottone viole con il floppy sembra un po' distorto.»;
   «il rapporto deve indicare anche le eventuali osservazioni dell'allievo e anche le domande
   scartare per i motivi 'non la so' e 'non ho capito la domanda'» */
test('autotest: «Consegna» all\'ultima domanda presa in tutte e due le modalità (`consegnaAllaFine`)', () => {
    const v = corpo(senzaCommenti(leggi('public/js/studente/autotest.js')), 'function opzioniView', 'onCambia');
    assert.ok(/consegnaAllaFine:\s*true/.test(v));
});

test('autotest: la sessione scrive scartate e osservazioni nel foglio HTML, nel PDF e in sessione.json', () => {
    const s = corpo(senzaCommenti(leggi('public/js/studente/autotest.js')), 'function scriviSessione', 'function scriviReport');
    assert.ok(/PC\(\)\.scartate\(o\.pool, st, PC\(\)\.CHIP_PERCHE/.test(s), 'le scartate dal core');
    assert.ok(/scartate:\s*scartate/.test(s) && /note:\s*note/.test(s), 'in sessione.json e nel PDF');
    assert.ok(/PC\(\)\.conCoda\(/.test(s) && /PC\(\)\.codaHtml\(\{\s*scartate:\s*scartate,\s*note:\s*note\s*\}\)/.test(s), 'la coda del foglio HTML');
});

function pdfRisposte(o) {
    const win = { jspdf: require('../public/js/jspdf.umd.min.js') };
    new Function('window', leggi('public/js/studente/prova-pdf.js'))(win);
    return win.MappAIStudentePdf.risposte(o).then(b64 => Buffer.from(b64, 'base64').toString('latin1'));
}
const RIGA = { ramo: 'Atmosfera', angolo: 'Causa', domanda: 'Domanda presa', perche: 'ho capito cosa rispondere', risposta: 'La mia risposta' };
test('prova-pdf: dopo le risposte «Domande scartate» col motivo e «Osservazioni»', async () => {
    const pdf = await pdfRisposte({ titolo: 'Prova', mappa: 'Mappa', righe: [RIGA],
        scartate: [{ ramo: 'Oceani', angolo: 'Definizione', domanda: 'Domanda lasciata', perche: 'non so la risposta' }], note: 'Ho scelto le facili' });
    for (const s of ['Domanda presa', 'Domande scartate', 'Domanda lasciata', 'non so la risposta', 'Osservazioni', 'Ho scelto le facili'])
        assert.ok(pdf.includes(s), s);
    assert.ok(pdf.indexOf('Domanda presa') < pdf.indexOf('Domande scartate') && pdf.indexOf('Domande scartate') < pdf.indexOf('Osservazioni'), 'l\'ordine');
});
test('prova-pdf: senza scartate né osservazioni nessuna sezione in più', async () => {
    const pdf = await pdfRisposte({ titolo: 'Prova', mappa: 'Mappa', righe: [RIGA], scartate: [], note: '  ' });
    assert.ok(pdf.includes('Domanda presa'));
    assert.ok(!pdf.includes('Domande scartate') && !pdf.includes('Osservazioni'));
});

test('studente.css: il 💾 della chiusura quadrato, alla stessa altezza di «Risposte: n / N»', () => {
    const c = leggi('public/css/studente.css');
    assert.ok(/#studente-dock \.sc-fine__top \{ align-items: center; \}/.test(c), 'niente stiramento in altezza');
    const r = /#studente-dock \.sc-fine__recap \{[^}]*line-height: (\d+)px;[^}]*padding: (\d+)px [^}]*\}/.exec(c);
    const b = /#studente-dock \.sc-fine__salva \{[^}]*width: (\d+)px; height: (\d+)px;[^}]*\}/.exec(c);
    assert.ok(r && b, 'le due regole');
    assert.strictEqual(b[1], b[2], 'quadrato');
    assert.strictEqual(Number(b[2]), Number(r[1]) + 2 * Number(r[2]) + 2, 'alto quanto il riquadro (riga + padding + bordo)');
});

test('index: `?v=` di prova-core e prova-pdf col segno dello 0126', () => {
    const h = leggi('public/index.html');
    assert.ok(/js\/studente\/prova-core\.js\?v=p0126-/.test(h));
    assert.ok(/js\/studente\/prova-pdf\.js\?v=p0126-/.test(h));
});

/* gate dell'allargamento 3 (Giacomo, 26/10): «Nella schermata delle domande da scegliere nascondi il nome
   dell'angolo a cui appartengono le domande». `mostraAngolo` della view disegna solo quello. */
test('autotest: nella scelta delle domande niente nome dell\'angolo', () => {
    const v = corpo(senzaCommenti(leggi('public/js/studente/autotest.js')), 'function opzioniView', 'onCambia');
    assert.ok(/mostraAngolo:\s*false/.test(v));
});

/* ── allargamento 4 (Giacomo al gate, 26/10): la scelta su misura «a schermo intero», una serie di tagli
   alla volta col ramo a 25 px, il velo dei chip, il 🔊, niente «‹ Torna alle domande»; con «Comincia a
   rispondere» di nuovo metà mappa e metà domande. Le opzioni sono della view (tests/scelta-view-0126 di re). */
test('autotest: le opzioni della scelta su misura per l\'iPad', () => {
    const v = corpo(senzaCommenti(leggi('public/js/studente/autotest.js')), 'function opzioniView', 'onCambia');
    for (const k of ['aPagine', 'chipVelo', 'leggiDomande', 'senzaTorna'])
        assert.ok(new RegExp(k + ':\\s*true').test(v), k);
    assert.ok(/onFase:\s*function \(f\)/.test(v), 'chi monta segue il passo');
});

test('autotest: il pannello a tutto schermo nella scelta, a metà nella risposta — solo quando il passo cambia', () => {
    const s = senzaCommenti(leggi('public/js/studente/autotest.js'));
    const f = corpo(s, 'onFase: function (f)', '},');
    assert.ok(/D\.pieno\(/.test(f), 'chiede al dock');
    assert.ok(/f === 'scegli'/.test(f), 'pieno nella scelta');
    assert.ok(/=== pieno\b|pieno ===|if \(si === /.test(f), 'non lo richiede a ogni disegno (il quiz a schermo pieno resta com\'è)');
});

test('documenti: `pieno(si)` porta il pannello a tutto schermo e lo riporta a metà', () => {
    const s = senzaCommenti(leggi('public/js/studente/documenti.js'));
    assert.ok(/function pieno\(si\)\s*\{[^}]*collasso = si \? 'mappa' : null;[^}]*misura\(memoria\(\)\)/.test(s));
    assert.ok(/MappAIStudenteDocumenti = \{.*\bpieno: pieno\b/.test(s), 'esportato');
});

/* gate dell'allargamento 4 (Giacomo, 26/10, sul mockup): «landscape B» — iPad sdraiato, la scelta in una colonna
   centrata larga 760 px (55 caratteri per riga a 19 px), frecce e «Comincia a rispondere» allineati a lei */
test('studente.css: in orizzontale la scelta a pagine in una colonna centrata di 760 px', () => {
    const c = leggi('public/css/studente.css');
    const r = /#studente-dock\.sd--destra \.sc--pagine \.sc-list,\s*#studente-dock\.sd--destra \.sc--pagine \.sc-foot,\s*#studente-dock\.sd--destra \.sc--pagine \.sc-top \{([^}]*)\}/.exec(c);
    assert.ok(r, 'la regola sulle tre fasce');
    assert.ok(/padding-left: max\(16px, calc\(\(100% - 760px\) \/ 2\)\)/.test(r[1]) && /padding-right: max\(16px, calc\(\(100% - 760px\) \/ 2\)\)/.test(r[1]));
});

/* gate dell'allargamento 4 (Giacomo, 26/10): «Elimina il campo delle osservazioni in fondo alla scheda della
   risposta.»; «da 'Ho risposto: controlla i criteri' in 'Confermo'» */
test('autotest: niente campo delle osservazioni; sotto la casella «Confermo»', () => {
    const s = senzaCommenti(leggi('public/js/studente/autotest.js'));
    assert.ok(/SC\(\)\.normalizzaCfg\(\{[^}]*osservazioni:\s*false/.test(s), 'il campo spento in tutte e due le modalità');
    const v = corpo(s, 'function opzioniView', 'onCambia');
    assert.ok(/confermo:\s*true/.test(v));
});

/* gate dell'allargamento 4 (Giacomo, 26/10): «Il testo 'Che cosa c'è nella tua rispsota? Spunta ciò che hai scritto.'
   deve avere un corpo più grande.»; «La domanda principale, l'area la text input area della risposta e i criteri
   devono tutti avere il bottone per avviare la lettura con il TTS.» */
test('autotest: il 🔊 su domanda, risposta e criteri; studente.css: gli inviti della prova a 16 px', () => {
    const v = corpo(senzaCommenti(leggi('public/js/studente/autotest.js')), 'function opzioniView', 'onCambia');
    assert.ok(/leggiRisposta:\s*true/.test(v));
    assert.ok(/#studente-dock \.sc-lbl \{ font-size: 16px; \}/.test(leggi('public/css/studente.css')));
});

/* gate dell'allargamento 4 (Giacomo, 26/10): «Il bottone giallo in basso a sinistra per uscire dalla mappa deve sempre
   essere allineato alla navbar della mappa, per questo motivo puoi ridurre la dimensione dello slider 'Mostra fino a
   livello' perché in generale i livelli sono sempre pochi» */
test('studente.css: il bottone giallo sulla riga della barra della mappa, anche col dock; la barra larga quanto serve', () => {
    const c = leggi('public/css/studente.css');
    assert.ok(!/#floating-actions-container \{ bottom: 104px !important; \}/.test(c), 'via il bottone alzato sopra la barra');
    assert.ok(/html\.studente #floating-actions-container \{ bottom: calc\(22px \+ var\(--sd-h, 0px\)\) !important; \}/.test(c),
        'centrato sulla barra (48 su 60) e su col dock in basso');
    const barra = /html\.studente #map-control-card \{([^}]*)\}/.exec(c)[1];
    assert.ok(/right: auto !important;/.test(barra) && /width: max-content;/.test(barra), 'larga quanto il contenuto, dopo il bottone');
    assert.ok(/html\.studente #map-control-card #level-filter-control \{ flex: 0 0 11rem; width: 11rem !important; \}/.test(c),
        'il cursore dei livelli alla misura di MappAI (w-44)');
});

/* ── allargamento 5 (Giacomo al gate, 26/10): «gli step dello slider devono essere adattati in base alla mappa aperta
   in modo che non ci siano step vuoti, per esempio non avere step 4 e tutti=5 se la mappa ha solo fino a L3.»
   La scritta vera di MappAI (`aggiornaScrittaLivelli` di mappai-d3-render.js, copiata) e il vero studente/mappa.js,
   con uno slider finto. Il disegno di MappAI fissa il massimo a 5 o più e poi chiama la scritta: si rifà quel giro. */
function bancoSlider(livelli) {
    const vm = require('node:vm');
    const el = { 'level-slider': { max: '5', value: '5' }, 'level-slider-val': { textContent: '' } };
    const ctx = { console, setTimeout, clearTimeout, appState: { db: { nodes: livelli.map((l, i) => ({ id: 'n' + i, level: l })) } } };
    ctx.window = ctx;
    ctx.document = { getElementById: (id) => el[id] || null, querySelector: () => null };
    vm.createContext(ctx);
    const d3 = leggi('public/js/mappai-d3-render.js');
    const i = d3.indexOf('window.aggiornaScrittaLivelli = function');
    vm.runInContext(d3.slice(i, d3.indexOf('\n};', i) + 3), ctx);
    vm.runInContext(leggi('public/js/studente/mappa.js'), ctx);
    /* il giro del disegno di MappAI: massimo almeno 5, «tutti» resta in fondo, poi la scritta */
    function disegna() {
        const sl = el['level-slider'], max = Math.max(5, ...livelli), prima = Number(sl.max);
        if (max !== prima) { const inFondo = Number(sl.value) === prima; sl.max = String(max); if (inFondo) sl.value = String(max); }
        ctx.window.aggiornaScrittaLivelli();
    }
    return { sl: el['level-slider'], scritta: el['level-slider-val'], disegna };
}
test('mappa: lo slider dei livelli ha un passo per livello della mappa aperta, scritti «L0 … Ln»', () => {
    const b = bancoSlider([0, 1, 1, 2, 3, 3]);
    b.disegna();
    assert.strictEqual(b.sl.max, '3', 'la mappa arriva a L3');
    assert.strictEqual(b.sl.value, '3');
    /* poi (26/10): «gli step da mostrare sono: L0, L1, L2, L3 ... Non usare 0-0, 0-1, 0-2, 0-3» */
    assert.strictEqual(b.scritta.textContent, 'L3');
    b.sl.value = '2'; b.disegna();
    assert.strictEqual(b.sl.max, '3', 'un nuovo disegno non lo riporta a 5');
    assert.strictEqual(b.sl.value, '2', 'spostato a metà resta dov\'è');
    assert.strictEqual(b.scritta.textContent, 'L2');
    b.sl.value = '0'; b.disegna();
    assert.strictEqual(b.scritta.textContent, 'L0');
});
test('mappa: una mappa a L5 tiene i cinque passi; una col solo centro ne ha uno', () => {
    const b5 = bancoSlider([0, 1, 2, 3, 4, 5]); b5.disegna();
    assert.strictEqual(b5.sl.max, '5');
    const b0 = bancoSlider([0]); b0.disegna();
    assert.strictEqual(b0.sl.max, '1');
});
test('index: `?v=` di studente/mappa.js col segno dello 0126', () => {
    assert.ok(/js\/studente\/mappa\.js\?v=p0126-/.test(leggi('public/index.html')));
});

/* Giacomo, 26/10: «modifica il titolo da 'MOSTRA FINO AL LIVELLO' e 'FINO A'» — scritto nell'index del reader, senza la
   chiave `ui_show_depth`: il cambio di lingua lo riscriverebbe dai dizionari copiati da MappAI */
test('index: il titolo dello slider dei livelli è «Fino a»', () => {
    const h = leggi('public/index.html');
    const span = /<div class="flex-col w-44 px-2 hidden" id="level-filter-control">\s*<span([^>]*)>([^<]*)<\/span>/.exec(h);
    assert.ok(span, 'il titolo dello slider');
    assert.strictEqual(span[2], 'Fino a');
    assert.ok(!/data-i18n=/.test(span[1]), 'senza chiave di traduzione');
});

/* ── il report delle domande aperte, gate del 26/10 (Giacomo): «nei riquadri con la risposta data dall'allievo non
   mostrare il tag 'Perché: la so'. Mostra solo le domande a cui l'allievo ha detto 'Non la so' oppure 'Non ho capito' e
   usa il chip del tag»; «Nella testata del report indica il numero di domande totali disponibili e la quantità di tag»;
   «Quando si apre il report nella barra della 'x' inserisci anche il titolo della mappa, la dicitura 'Meta' e il bottone
   'STAMPA/PDF'. Il file esportato deve avere la formattazione del nome uguali agli altri documenti e, in questo caso, la
   dicitura 'meta' al posto del nome dell'angolo.» (alla domanda: «Come i fogli, con la data») */
test('prova-pdf: niente «Perché:» sulle risposte; in testa le domande disponibili e i chip coi conteggi', async () => {
    const pdf = await pdfRisposte({ titolo: 'Prova', mappa: 'Mappa', righe: [RIGA],
        giudizi: { totale: 36, voci: [{ et: 'la so', n: 3, colore: 'var(--man-verde, #41e6aa)', testo: 'var(--mm-ok, #059669)' }, { et: 'non la so', n: 2, colore: '#f97316' }] },
        scartate: [{ ramo: 'Oceani', angolo: 'Definizione', domanda: 'Domanda lasciata', perche: 'non la so', colore: '#f97316', testo: '#c2410c' }] });
    assert.ok(!pdf.includes('ho capito cosa rispondere') && !pdf.includes('Perch'), 'il «Perché:» delle risposte non c\'è più');
    for (const s of ['36 domande disponibili', 'la so: 3', 'non la so: 2', 'Domanda lasciata'])
        assert.ok(pdf.includes(s), s);
    assert.ok(pdf.indexOf('36 domande disponibili') < pdf.indexOf('Domanda presa'), 'il riepilogo sta in testa');
});

test('autotest: la sessione scrive riepilogo e nome del file; il 💾 apre il foglio col titolo e quel nome', () => {
    const s = senzaCommenti(leggi('public/js/studente/autotest.js'));
    const w = corpo(s, 'function scriviSessione', 'function scriviReport');
    assert.ok(/PC\(\)\.giudizi\(o\.pool, st, PC\(\)\.CHIP_PERCHE\)/.test(w), 'i conteggi dal core');
    assert.ok(/nomeDocumento\(\{ progetto: s\.rootNodeLabel \|\| '', tipo: 'Domande aperte'/.test(w) && /o\.tipo === 'su-misura' \? 'meta'/.test(w), 'il nome: «meta» nella prova su misura');
    assert.ok(/nomeFile:\s*nomeFile/.test(w) && /giudizi:\s*giudizi/.test(w) && /angolo:\s*etAng/.test(w), 'in sessione.json');
    assert.ok(/PC\(\)\.conTesta\(/.test(w) && /PC\(\)\.testaHtml\(giudizi\)/.test(w), 'il riepilogo in cima al foglio');
    assert.ok(/return \{ ok: true, rel: cart\.rel, nomeFile: nomeFile \}/.test(w));
    const e = corpo(s, 'function esitoLive', 'function consegna');
    assert.ok(/o\.tipo === 'su-misura' \? t\('st_modo_meta', 'Meta'\)/.test(e), 'nella barra «Meta» al posto dell\'angolo');
    assert.ok(/r\.nomeFile \|\|/.test(e), 'il foglio si apre col nome del file');
});

test('documenti: il foglio delle risposte con titolo nella barra e «Stampa / PDF»; «Le tue prove» fa lo stesso', () => {
    const s = senzaCommenti(leggi('public/js/studente/documenti.js'));
    const v = corpo(s, 'function vestiReport', 'function lettoreApp');
    assert.ok(/if \(!barra && !o\.titoloBarra\) return;/.test(v), 'anche un documento senza la barra di stampa sua, se ha il titolo');
    const a = corpo(s, 'function azione', 'function leggiB64');
    assert.ok(/s\.tipo === 'Domande aperte'/.test(a), 'il titolo anche per le domande aperte');
    assert.ok(/s\.nomeFile \|\| s\.nome \|\| s\.id/.test(a), 'il nome del file per aprire e stampare');
});

/* ── allargamento 6 (Giacomo, 26/10): «Metti il nome del progetto sempre al primo posto della struttura del nome, poi sempre il
   tipo di materiali (Domande aperte, Scelta multipla, Flashcard, Foglio nodi, Sintesi, Catena perché), l'angolo o 'meta', data.
   Solo la stampa della Fonte mantiene il nome originale del file. Nella barra con la 'x' della fonte inserisci il bottone
   'STAMPA/PDF' come nelle barre degli altri materiali.» (alla domanda sulla forma: «Trattini senza spazi») */
test('autotest: il report del quiz col nome «Progetto-Scelta multipla-angolo-data», anche in sessione.json', () => {
    const s = senzaCommenti(leggi('public/js/studente/autotest.js'));
    const w = corpo(s, 'function scriviReport', 'function scriviReportMC');
    assert.ok(/nomeDocumento\(\{ progetto: s\.rootNodeLabel \|\| '', tipo: 'Scelta multipla', angolo: chiave/.test(w));
    assert.ok(/nomeFile: nomeFile/.test(w) && /return \{ ok: true, rel: cart\.rel, nomeFile: nomeFile \}/.test(w));
    assert.ok(/scriviReport\([^;]*o\.angoliEt, o\.angolo\)/.test(s), 'la chiave dell\'angolo arriva dalla prova');
    assert.ok(/tipo: 'quiz', mc: true[^}]*angolo: set\.angle \|\| ''/.test(s));
});
test('foglio-nodi: il PDF «Progetto-Foglio nodi-data»', () => {
    const s = senzaCommenti(leggi('public/js/studente/foglio-nodi.js'));
    const p = corpo(s, 'function pdf', 'function chiudi');
    assert.ok(/nomeDocumento\(\{ progetto: progetto, tipo: 'Foglio nodi'/.test(p) && /fileName: nome \+ '\.pdf'/.test(p));
});
test('documenti: mappa PDF, sintesi e catena col nome nuovo; la catena da un file vero; «Stampa / PDF» al posto della stampante', () => {
    const s = senzaCommenti(leggi('public/js/studente/documenti.js'));
    assert.ok(/C\.nomePdfMappa\(progetto\(vp\)/.test(s), 'la mappa col nome del progetto');
    assert.ok(/apriFile\(vp, sintesi\.relPath, nomeDi\('Sintesi'\)\)/.test(s), 'la sintesi');
    const c = corpo(s, 'function catenaNelPannello', '/* ──');
    assert.ok(/'Studio Attivo\/Stampe\/' \+ nome \+ '\.html'/.test(c) && /apriFile\(vp, rel, nome\)/.test(c), 'la catena da un file vero, col nome');
    assert.ok(/nomeDi\('Catena perché'\)/.test(c));
    const st = corpo(s, 'function stampante', '}\n');
    assert.ok(/b\.className = 'sd-stampa-pdf'/.test(st) && /t\('st_stampa_pdf', 'PDF'\)/.test(st), 'il bottone dei report');
    assert.ok(/nomeDocumento\(\{ progetto: [^}]*tipo: 'Sintesi'/.test(senzaCommenti(leggi('public/js/studente/console.js'))), 'la sintesi dalla console');
});
test('adapter: un PDF salvato in Studio Attivo/Stampe non ne sovrascrive un altro', () => {
    const s = senzaCommenti(leggi('public/js/studente/adapter.js'));
    const v = corpo(s, 'window.jspdf.jsPDF.API.save = function', '};');
    assert.ok(/FS\.lista\(/.test(v) && /nomeLibero\(/.test(v));
});
test('index: `?v=` di adapter.js e stampa.js col segno dello 0126', () => {
    const h = leggi('public/index.html');
    assert.ok(/js\/studente\/adapter\.js\?v=p0126-/.test(h) && /js\/studente\/stampa\.js\?v=p0126-/.test(h));
});

/* gate dell'allargamento 6 (Giacomo, 26/10, con tre screenshot della sintesi): «Su SINTESI non applicare il bottone
   'STAMPA/PDF' perché ingombra troppo spazio. In sintesi colora di viola il bottone con l'icona della stampante.»
   La sintesi ha la sua barra (`#ap-topbar`, `.no-print`, con un bottone che stampa): `vestiReport` la scambiava per
   un report del LIVE. La fila del lettore dell'app (`lettoreApp`) ha già la stampante. */
test('documenti: la sintesi non prende «Stampa / PDF» (ha la fila del lettore); studente.css: la sua stampante viola', () => {
    const s = senzaCommenti(leggi('public/js/studente/documenti.js'));
    const v = corpo(s, 'function vestiReport', 'function lettoreApp');
    assert.ok(/if \(d\.getElementById\('ap-topbar'\)\) return;/.test(v), 'i documenti con la barra del lettore restano come sono');
    assert.ok(v.indexOf("getElementById('ap-topbar')") < v.indexOf('sd-stampa-pdf'), 'prima di mettere il bottone');
    const c = leggi('public/css/studente.css');
    assert.ok(/#studente-dock \.mai-fila-bt:has\(\[data-lucide="printer"\], \.lucide-printer\) \{[^}]*background: #4f46e5;[^}]*color: #fff;/.test(c),
        'la stampante della fila sul viola dei bottoni');
});

test('console e pannello «Materiali»: ogni materiale va in stampa col nome di `nomeDaStampare`', () => {
    const c = senzaCommenti(leggi('public/js/studente/console.js'));
    assert.ok(/apriFile\(scelto, rel, C\(\)\.nomeDaStampare\(\{ name: nome, relPath: rel \}/.test(c), 'le righe della console');
    const d = senzaCommenti(leggi('public/js/studente/documenti.js'));
    assert.ok(/f2 = \{ name: b\.getAttribute\('data-nome'\), relPath: b\.getAttribute\('data-rel'\) \}/.test(d) && /nomeDaStampare\(f2, progetto\(vp\)/.test(d), 'le righe del pannello');
});

/* gate del foglio dei nodi (Giacomo, 26/10, con lo screenshot): «il menu a tendina deve avere la stessa altezza dei
   bottoni»; «il bottone PDF avvia il download del PDF che avviene in background, è possibile invece anche per questo
   bottone mostrare il menu di stampa?» — sull'iPad un <select> nativo ignora la min-height: `appearance: none`, la
   freccia disegnata; «PDF» scrive il file in Studio Attivo/Stampe e lo dà alla stampa di iOS, come la fonte */
test('foglio-nodi: «PDF» apre il menu di stampa (documenti › stampaPdfB64); la tendina alta come i bottoni', () => {
    const f = senzaCommenti(leggi('public/js/studente/foglio-nodi.js'));
    const p = corpo(f, 'function pdf', 'function chiudi');
    assert.ok(/toDisk:/.test(p) && /D\.stampaPdfB64\(/.test(p), 'il PDF al menu di stampa');
    const d = senzaCommenti(leggi('public/js/studente/documenti.js'));
    const s = corpo(d, 'function stampaPdfB64', '\n    function ');
    assert.ok(/'Studio Attivo\/Stampe'/.test(s) && /nomeLibero\(/.test(s) && /saveVaultFile\(/.test(s) && /stampaPdf\(/.test(s));
    assert.ok(/stampaPdfB64: stampaPdfB64/.test(d), 'esportata');
    const c = leggi('public/css/studente.css');
    const r = /#sf-nodi \.sf-liv \{([^}]*)\}/.exec(c)[1];
    assert.ok(/-webkit-appearance: none;/.test(r) && /appearance: none;/.test(r) && /height: 44px;/.test(r), 'alta come i bottoni');
    assert.ok(/background-image: url\("data:image\/svg\+xml/.test(r), 'la freccia ridisegnata');
});

/* Giacomo, 26/10: «Per coerenza modifica tutti i bottoni da 'STAMPA/PDF' in 'PDF'» — come «PDF» del foglio dei nodi */
test('documenti: tutti i bottoni di stampa nella barra dicono «PDF»', () => {
    const d = senzaCommenti(leggi('public/js/studente/documenti.js'));
    assert.ok(!/'Stampa \/ PDF'/.test(d), 'non resta nessun «Stampa / PDF»');
    assert.strictEqual((d.match(/b\.textContent = t\('st_stampa_pdf', 'PDF'\);/g) || []).length, 2, 'la fonte e i report');
});

/* Giacomo, 26/10, sull'avviso «Mappa salvata in MAPPE PDF: La carta-Mappa-26-10-2026 (2).pdf»: «Anche in questo caso
   apri il menu di stampa» — salvata la mappa, il PDF va alla stampa di iOS come il foglio dei nodi */
test('documenti: «Salva mappa in PDF» salva in MAPPE PDF e apre il menu di stampa', () => {
    const d = senzaCommenti(leggi('public/js/studente/documenti.js'));
    const m = corpo(d, 'window.MappAISalvaPdf = function', '\n    };');
    assert.ok(/stampaPdf\(vp, 'MAPPE PDF\/' \+ nome, nome, b64\)/.test(m), 'dopo il salvataggio, la stampa');
    assert.ok(m.indexOf('saveVaultFile') < m.indexOf('stampaPdf('), 'prima si salva');
});
