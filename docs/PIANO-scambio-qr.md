# Piano — Scambio dei file docente ↔ studente via QR sulla rete locale

> Piano da `/architetto` (7/9/2026). Fonti: `MappAI re/GUIDA-ARCHITETTO.md` per intero;
> `MappAI re/docs/HANDOFF.md` §0 e le parti Live/QR; `docs/HANDOFF.md` §0-§4, `RIUSO.md`,
> `docs/PIANO-reader.md`; codice letto: `live-server.js` (sessione «materials», 783-864),
> `main.js` (2227-2430 Live/materiali, 3072-3125 `zip-vault-to-materials`, 826-870
> `save/read-vault-file`), `mappai-live-teacher.js` (`shareDocQr`, `shareVaultZipQr`,
> `ensureMatServer`), `mappai-landing-teach.js` (`_consBentoMappa`, `_consQr`, `projQr`),
> `public/live/materials.html`, `mappai-files-core.js` (`sanitizeVaultRelPath`, `SUB`, `safeName`),
> `tests/live-server.test.js`; nel reader `studente/adapter.js`, `studia-core.js`, `console.js`,
> `documenti.js`, `package.json`, `capacitor.config.json`, `tools/plist-ipad.py`, `tools/sincronizza.js`.
> **Non implementa niente.** Scartato `decimen-optical-transfer` (AGPL-3.0, QR animati: minuti per un vault di MB).
>
> **Bivi sciolti da Giacomo (7/9) e IMPLEMENTATO lo stesso giorno** (MappAI re `d1ec90c`, reader: vedi
> HANDOFF §0): 1) scanner nativo `@capacitor/barcode-scanner` 3.1.2 + «Scrivi l'indirizzo»; 2) le consegne
> alla RADICE del vault, `Consegne/<CLASSE-numero>/` (non sotto Studio Attivo); 3) «Tutto il vault del
> progetto» in testa al picker QR; 4) consegna = PDF delle risposte di default, `report.html` e
> `sessioni.jsonl` a spunta (il `.jsonl` INSEGNA lo apre come tabella dei record); identità = numero
> personale + classe `[1-4][A-Z]` con maiuscolo forzato mentre si scrive (`identitaStudente` in
> files-core, la stessa regola sui due lati).

**Braindump tradotto**: nell'app **MappAI studente** un comando **«Docente»** nel bento della
console STUDIA (accanto a Mappa · Flashcard · Prova) apre un modale del motore con due versi.
**Ricevi**: lo studente inquadra il QR che il docente mostra da INSEGNA (o scrive l'indirizzo a
mano), l'app legge dal **server Materiali** di MappAI Live (`live-server.js`,
`createMaterialsServer`, porta 8768-8778, token `s` nel QR) un **manifest del vault** e scarica
i file nella cartella giusta di `Documents/<classe>/<materia>/<mappa>/` (o, se il docente ha
condiviso solo un documento, i file di `/api/materials` in `Materiale Studio/` della mappa
scelta). **Invia**: dalla tabella «Le tue prove» (cella nuova) lo studente manda al docente il
PDF delle risposte (`Studio Attivo/Prove/<sessione>/risposte.pdf`) con una POST al server
Materiali; il docente ritrova i file nel **vault** della mappa, `Studio Attivo/Consegne/<studente>/`,
e li vede in INSEGNA nella console della mappa come una tabella in più sotto i materiali.
Il **trasporto** è quello che c'è già (HTTP sulla LAN, un token per sessione); ciò che si aggiunge
sono tre rotte al server, un'esposizione del vault, e sul lato studente la lettura del QR e le scritture ammesse.

**Stato rilevante** (misurato)
- Il server Materiali esiste e ha già il QR: `live-materials-start` (main.js:2355) → `createMaterialsServer`
  → `GET /api/materials?s=` (lista) e `GET /files/<basename>?s=` (download); pagina telefono
  `public/live/materials.html`. Nessun POST: `req.method !== 'GET'` → 405. Nessun header CORS.
  `readBody` ha un tetto di 1 MB (`BODY_CAP`). Test veri via HTTP in `tests/live-server.test.js:196`.
- **La cartella vault si condivide già via QR come `.zip`**: `zip-vault-to-materials` (main.js:3100,
  jszip transitivo) + `MappAILive.shareVaultZipQr` (live-teacher.js:731) + `projQr`/`shareProjectZip`
  in INSEGNA (landing-teach.js:996, 1147). Il QR è `http://<ip>:<porta>/files/<nome>.zip?s=<token>`:
  contiene già **origine + token**, cioè tutto ciò che all'app studente serve. Il reader non ha
  jszip e non deve averlo: la ricezione va per manifest + file singoli, il `.zip` resta per il telefono.
- Il comando **QR** della console INSEGNA (`_consQr`, landing-teach.js:3394) condivide UN materiale
  HTML (`shareDocQr` → `/files/<x>.html?s=`); il picker elenca solo `m.qr`.
- Reader: `adapter.js` scrive SOLO `vista.json` e `Studio Attivo/**` (`relAmmesso`, riga 361);
  `MappAIStudenteFS` espone `plugin(nome)` (`Capacitor.Plugins[x]` o `registerPlugin`, senza bundler),
  `leggiTesto`, `lista`, `esiste`. La cella «cartella» delle prove usa `Filesystem.getUri` + `Share.share`.
  Bento della console: `studia-core.schema` → `s.bento[0].voci` = mappa · flashcard · prova; tabella
  `sessioni` con una sola cella-azione (`cartella:<id>`). `?v=st22` in `index.html`.
- Capacitor 8: `core`, `ios`, `filesystem`, `share`. `tools/plist-ipad.py` scrive tre chiavi (idempotente).
  `window.Capacitor` lo inietta il bridge nativo; nessun `<script>` Capacitor in `index.html`.
- Lettura QR, che cosa esiste (dichiarato, non misurato): **`@capacitor/barcode-scanner`** (plugin
  ufficiale, scanner nativo a schermo intero, metodo `scanBarcode({hint})`, chiede
  `NSCameraUsageDescription`); **`@capacitor-mlkit/barcode-scanning`** (Capawesome, camera DIETRO la
  webview: serve sfondo trasparente, più codice); **`BarcodeDetector`** in WKWebView: **non c'è**
  (API Chromium; Safari/WebKit non la implementa — da riconfermare su iPadOS 18 con
  `'BarcodeDetector' in window` prima di scartarla). ⚠️ La versione del plugin ufficiale compatibile
  con Capacitor **8** va letta con `npm view @capacitor/barcode-scanner peerDependencies`: non la do per certa.
- ATS/LAN su iOS (dichiarato): `http://` verso un IP privato passa se il plist porta
  `NSAppTransportSecurity › NSAllowsLocalNetworking = true` (non sono certo che la voce copra gli IP
  nudi: il ripiego è `NSAllowsArbitraryLoads`, accettabile in un'app firmata per sé); dal 14 iOS
  chiede il permesso «Rete locale» e vuole `NSLocalNetworkUsageDescription`. L'origine della
  WKWebView è `capacitor://localhost`: il `fetch` verso `http://<ip>` è cross-origin → **CORS** sul server.

## Che cosa si fa (passi in ordine, per ognuno i file toccati)

**Fase 0 — MappAI re (commit su `main`, poi `node tools/sincronizza.js` nel reader).**

0.1 `public/js/mappai-files-core.js` — la definizione UNICA di «che cosa del vault va allo studente»
  (inv. 6; il file è copiato nel reader, quindi la regola viaggia da sola):
  `relVaultStudente(rel)` → rel normalizzato o null. Ammessi: `index.yaml`, `links.json`,
  `Nodi/**.md` (≤ 3 segmenti), `Materiale Studio/*` e `Materiale Studio/Sorgenti/*`, `Allegati/*`.
  Esclusi per costruzione: `vista.json`, `Studio Attivo/**`, `Chat/`, `Fonti/`, `pipeline.json`, dotfile.
  E `sanitizeVaultRelPath` ammette in più `Studio Attivo/Consegne/<studente>/<file>` (4 segmenti):
  serve a `read-vault-file` quando INSEGNA apre una consegna. Test in `tests/files-core.test.js`.

0.2 `live-server.js`, `createMaterialsServer(opts)` — tre rotte e un'esposizione:
  - `esponiVault({ nome, dir, classe, materia, rootNodeLabel })`: cammina `dir`, tiene i rel che
    passano `FC.relVaultStudente`, calcola `size` e `sha1`, salva `manifest` in memoria (e in
    `<dir sessione>/vault.json`, crash-safe come `session.json`). Un vault per sessione: il secondo sostituisce.
  - `GET /api/vault?s=<token>` → il manifest, o 404 `{error:'nessun-vault'}`:
    ```json
    { "schema": "mappai-vault-manifest@1", "nome": "Elettricità - MM", "classe": "4R", "materia": "Scienze",
      "rootNodeLabel": "Elettricità", "totale": 12345678,
      "files": [ { "rel": "index.yaml", "size": 812, "sha1": "…" }, { "rel": "Nodi/Elettricità.md", "size": 2210, "sha1": "…" } ] }
    ```
    `classe`/`materia` null per i vault Generico/piatti (`FilesCore.classDirDaCartella`, trappola 26).
  - `GET /vault/<rel>?s=<token>` → il file. Guardia: `rel` decodificato deve essere **una chiave
    esatta del manifest** (Set) — niente `..`, niente cammino libero: si serve solo ciò che è elencato.
  - `POST /api/consegna?s=<token>`, JSON `{ studente, vault, sessione, nome, base64 }`
    (tetto **20 MB**: `readBody(req, cb, cap)` prende il tetto come terzo argomento; il default resta 1 MB).
    Destinazione: `opts.vaultDir(vault)` (main.js passa `findVaultDirByName`, confronto NFC su entrambi
    i lati — trappola 25) → `<vault>/Studio Attivo/Consegne/<FC.safeName(studente)>/<FC.safeName(sessione)> - <path.basename(nome)>`;
    se esiste, suffisso ` (2)`, ` (3)`… mai sovrascrivere (inv. 13, in spirito). Risposta
    `{ ok:true, rel:"Studio Attivo/Consegne/Anna/Domande · Elettricità · 00 - risposte.pdf", size: 91234 }`;
    errori 403 `token`, 400 `studente|nome`, 404 `vault`, 413 `troppo-grande`. Poi `opts.onConsegna(info)`.
  - CORS: su `/api/*`, `/files/*`, `/vault/*` header `Access-Control-Allow-Origin: *`,
    `Access-Control-Allow-Headers: Content-Type`; `OPTIONS` → 204. Il gate resta il token.
  - `esponiVault` e `POST` esistono solo se `opts.scambio !== false` (kill-switch dal renderer).

0.3 `main.js` — `zip-vault-to-materials`: dopo lo zip, `liveMatSrv.esponiVault(...)` con
  `classDir/discDir` dal `walkMappe` hit (main.js:2917) e `rootNodeLabel` da `index.yaml` (già letto
  da `get-all-vaults`). `createMaterialsServer` riceve `vaultDir: findVaultDirByName`, `scambio`,
  `onConsegna: info => mainWindow.webContents.send('live-consegna', info)`. IPC nuovo
  `vault-consegne-list ({vaultPath})` → `{ ok, files:[{ studente, name, relPath, size, mtime }] }`
  (due livelli sotto `Studio Attivo/Consegne`, solo I/O — inv. 19).
  `public/js/preload.js`: `vaultConsegneList`, `onLiveConsegna(cb)`.

0.4 `public/js/mappai-landing-teach.js` — (a) nel picker di `_consQr` una voce in testa
  «Tutta la cartella della mappa (per MappAI studente)» → `MappAILive.shareVaultZipQr(folderName, nome)`:
  il QR di INSEGNA porta il vault senza passare dalla tabella dei progetti; (b) sotto i materiali
  della mappa la tabella **«Consegne»** (inv. 12: `<table>`, colonne Studente · Documento · Data
  GG/MM/AAAA · azione fissa) da `vaultConsegneList`; la riga apre il file nella tela con la strada
  di oggi (`readVaultFile` → iframe); `onLiveConsegna` → ridisegno (trappola 15). Kill-switch
  `mappai_scambio_studente='0'`: via la voce, via la tabella, `scambio:false` a `liveMaterialsStart`
  (`ensureMatServer` legge la chiave).
  `public/js/mappai-live-teacher.js`, `openDocQr`: sotto l'URL la riga «Nell'app MappAI studente:
  Docente › Ricevi, inquadra il QR o scrivi questo indirizzo». Niente altro nel dialogo.

0.5 `docs/HANDOFF.md` di MappAI re (§0, §2 kill-switch, «da provare in Electron»); bump `?v=` dei
  quattro script toccati (inv. 5). Poi nel reader: `node tools/sincronizza.js` (files-core copiato),
  `npm test` (riuso-divergenza verde), bump `?v=` di `mappai-files-core.js` in `index.html`.

**Fase 1 — reader, il core e le scritture.**

1.1 `public/js/studente/scambio-core.js` (UMD, puro, nuovo) — vedi «Dove vive la logica nuova».

1.2 `public/js/studente/adapter.js` — `relAmmesso` **non cambia** (`saveVaultFile` resta la porta
  dei moduli copiati). Si aggiunge una seconda porta, dichiarata: `MappAIStudenteFS.scriviRicevuto(vaultPath, rel, base64)`
  che ammette solo `FC.relVaultStudente(rel)` (la stessa regola del docente, dalla copia) e scrive con
  `FS.scrivi` (`recursive:true` già c'è). Forma minima: una funzione, una allowlist, nessun flag su `saveVaultFile`.
  E `MappAIStudenteFS.leggiB64(vaultPath, rel)` (oggi vive in `documenti.js` come `leggiB64`: si sposta qui, un solo lettore).

1.3 `tools/plist-ipad.py` — tre chiavi in più, idempotenti: `NSCameraUsageDescription`
  («Per inquadrare il QR del docente»), `NSLocalNetworkUsageDescription` («Per scambiare i file con
  il computer del docente sulla rete della classe»), `NSAppTransportSecurity = { NSAllowsLocalNetworking: true }`.
  `package.json`: `@capacitor/barcode-scanner` (versione per Capacitor 8, da `npm view`). `npm run ios` la monta.

**Fase 2 — reader, la superficie.**

2.1 `public/js/studente/studia-core.js` — `schema(o)`: se `o.scambio !== false`, quarta voce del
  bento `{ id:'docente', et:'Docente', forma:'azione', icona:'qr-code', chiude:false }` (`colonneVoci` = 4);
  nella tabella «Le tue prove» seconda cella-azione `{ id:'invia:<id>', icona:'send', soloIcona:true, etichetta:'Invia al docente' }`
  quando `x.pdf || x.html`. `tabellaRicevuti` no: i file ricevuti compaiono nelle tabelle dei materiali
  che ci sono già (il disco è la verità, inv. 7).

2.2 `public/js/studente/scambio.js` (UI, nuovo) — `window.MappAIStudenteScambio`:
  - `apri(vaultSel)` → modale `MappAIModal.open(ScambioCore.schemaDocente(...))`, `taglia:'m'`:
    sezione «Ricevi» con le voci `inquadra` (solo se `plugin('CapacitorBarcodeScanner')`) e `scrivi`;
    sezione «Invia» con le prove che hanno un PDF; campo `studente` (testo, ricordato in
    `localStorage.mappai_studente_nome`). Le voci CONCLUDONO, la logica sta nel `.then()` (inv. 10).
  - `inquadra()` → `scanBarcode({ hint: <QR_CODE dall'enum del plugin, letto da
    node_modules/@capacitor/barcode-scanner/dist/esm/definitions.js al momento dell'implementazione> })`
    → `ScanResult` → `ScambioCore.daQr(testo)`. Se il plugin manca o rifiuta (niente camera, permesso
    negato) → `scrivi()`: un modale con un campo `indirizzo` (accetta l'URL intero o `ip:porta token`).
  - `ricevi(dest)`: `GET /api/vault` → se c'è il manifest, `ScambioCore.pianoRicezione(manifest, ROOT)`
    → per ogni file `fetch(base + '/vault/' + encodeURIComponent(rel) + '?s=' + token)` → `blob` →
    base64 → `scriviRicevuto`. Sequenziale, un velo con «Ricevo 12/57 · Sintesi-voce…» (trappola 40)
    e **Annulla** (trappola 39: ciò che è già scritto resta). Alla fine: `getAllVaults` → console
    ridisegnata sulla mappa ricevuta (`scegli`). Se 404 `nessun-vault` → `GET /api/materials` e i file
    vanno in `Materiale Studio/` del vault **scelto** (la destinazione si dichiara quando il lavoro
    comincia, inv. 20-bis; senza vault scelto il modale lo dice e non parte).
  - `invia(id, studente)`: `leggiB64` del PDF della sessione → `POST /api/consegna` con
    `{ studente, vault: folderName, sessione: s.id, nome, base64 }` → toast «Consegnato al docente:
    risposte.pdf» o l'errore col rimedio (403 «Il QR è scaduto: inquadra quello nuovo», 404 «Il
    docente non ha questa mappa», rete «Sei sulla rete della classe?»). `base`+`token` ricordati in
    `localStorage.mappai_studente_docente = { base, token, ts }` con scadenza 12 h: la cella «invia»
    non richiede il QR se la sessione è viva (prova con `GET /api/materials`; 403 → chiede il QR).
  - Kill-switch `mappai_studente_scambio='0'`: `console.js` passa `scambio:false` allo schema; il
    modulo non si aggancia.

2.3 `public/js/studente/console.js` — `suAzione`: `docente` → `MappAIStudenteScambio.apri(st.sel)`;
  `invia:<id>` → `.invia(id)`. `documenti.js`: `leggiB64` → delega a `MappAIStudenteFS.leggiB64`.
  `public/index.html`: `<script src="js/studente/scambio-core.js?v=st23">` e `scambio.js` dopo
  `studia-core.js`, tutti gli `studente/*` a `st23` (inv. 5, bump DOPO l'ultima scrittura).
  `css/studente.css`: niente di nuovo se il bento a 4 voci sta nei 145 px (misurare a 768 px).

2.4 `docs/HANDOFF.md` (§0, §2 tabella, §4 debiti: «mai provato sull'iPad» resta finché Giacomo non lo prova).

## Dove vive la logica nuova (per ogni pezzo: strato e PERCHÉ, citando gli invarianti per numero)

| pezzo | dove | perché |
|---|---|---|
| «che cosa del vault va allo studente» (`relVaultStudente`) | `mappai-files-core.js` (MappAI re, copiato nel reader) | UNA definizione letta da chi espone e da chi riceve (inv. 6); i nomi e i percorsi del vault sono già di `FilesCore` (inv. 19: la guardia sui percorsi è la stessa dell'IPC) |
| manifest, `/vault/<rel>`, `/api/consegna`, CORS | `live-server.js`, `createMaterialsServer` | è già il server LAN dei materiali, testato in Node via HTTP vero (`tests/live-server.test.js`): non serve un core a parte — il test esegue, non parsa. `main.js` passa solo I/O (`vaultDir`, `onConsegna`) (inv. 19) |
| destinazione delle consegne nel vault del docente | `Studio Attivo/Consegne/<studente>/` | la posizione È il dato: una consegna appartiene alla mappa e INSEGNA la elenca dal disco senza indice (inv. 7); `Studio Attivo/` è già la cartella non-materiale del vault (`VAULT_CONTAINER_EXCLUDE`) e non entra negli elenchi dei materiali |
| parse del QR/indirizzo, piano di ricezione, cartella di destinazione, nome della consegna, schemi dei modali | `studente/scambio-core.js` (UMD, Node) | inv. 4; gli schemi passano da `validaSchema` in Node come `studia-core` (inv. 10, trappola 33) |
| `daQr(testo)` → `{ base, token }` | `scambio-core` | accetta `http://<ip>:<porta>/<qualunque>?s=<tok>` (i QR di oggi, zip o documento) e `ip:porta tok` scritto a mano: un lettore per due ingressi (inv. 21, un comando per cosa) |
| `cartellaDestinazione(manifest)` → `Documents/<classe>/<materia>/<nome>` o `Documents/<nome>` | `scambio-core` | la stessa gerarchia che `getAllVaults` dell'adapter legge (classe/materia dalla posizione); Generico → piatto, mai una cartella «Generico» nello studente (trappola 26) |
| `pianoRicezione(manifest, root)` → `[{ rel, url, dest }]` + `totale` | `scambio-core` | filtra di nuovo con `relVaultStudente` (fiducia zero nel manifest: la guardia sta anche dal lato che scrive) |
| la seconda porta di scrittura `scriviRicevuto` | `adapter.js`, accanto a `relAmmesso` | il trasporto tiene le allowlist (come l'IPC di main.js, inv. 19); `saveVaultFile` resta intatto per i moduli copiati (RIUSO regola 1) |
| bento a 4 voci, cella «invia» | `studia-core.schema` | la forma è un DATO che il motore disegna; la voce `docente` ha `chiude:false` (inv. 10) perché apre un secondo modale sopra la console, col piano chiesto al motore (inv. 11) |
| scanner, fetch, velo, toast | `studente/scambio.js` | è l'unico pezzo che tocca DOM, plugin e rete: sottile, senza regole |
| tabella «Consegne» in INSEGNA | `mappai-landing-teach.js`, sotto i materiali della mappa | «se serve una superficie nuova si trova un altro posto: non si aggiungono righe» alla riga dei 4 comandi (punto fermo del 13/8): una tabella in coda, non un comando |

## Prove (unità nuove/estese, comandi)

MappAI re
- `tests/files-core.test.js` (+): `relVaultStudente` ammette `index.yaml`, `Nodi/a/b.md`,
  `Materiale Studio/Sorgenti/x.html`, `Allegati/f.pdf`; rifiuta `vista.json`, `Studio Attivo/x`,
  `Chat/x`, `Fonti/x`, `pipeline.json`, `../x`, `.DS_Store`. `sanitizeVaultRelPath` ammette
  `Studio Attivo/Consegne/Anna/x.pdf` e rifiuta `Studio Attivo/Consegne/x.pdf` e 5 segmenti.
- `tests/live-server.test.js` (+3 test, sezione Materiali): (1) `esponiVault` su un vault finto in
  tmp (con `vista.json` e `Studio Attivo/` dentro) → `/api/vault` elenca solo i rel ammessi, con
  `sha1` giusto; `/vault/index.yaml` serve; `/vault/vista.json` → 404; `/vault/..%2Fsession.json` → 404;
  token errato → 403; senza `esponiVault` → 404 `nessun-vault`. (2) `POST /api/consegna`: scrive
  `Studio Attivo/Consegne/Anna/Prova 00 - risposte.pdf` nel vault risolto da `vaultDir`; secondo invio
  uguale → ` (2)`; `nome:'../../x.pdf'` → basename; `studente:'../'` → 400; vault ignoto → 404;
  body oltre il tetto → 413; token errato → 403; `onConsegna` chiamata con `rel`. (3) `OPTIONS /api/consegna`
  → 204 con `Access-Control-Allow-Origin: *`; `scambio:false` → `/api/vault` e `POST` rispondono 404.
- `node --test tests/` → 0 fail; `node tools/smoke/elenchi-elabora-insegna.js` (le consegne non
  entrano negli elenchi dei materiali).

Reader
- `tests/scambio-core.test.js` (nuovo): `daQr` su `http://192.168.1.23:8768/files/Elettricit%C3%A0_-_MM.zip?s=aB3…`,
  su `http://192.168.1.23:8768/?s=…`, su `192.168.1.23:8768 aB3…`, su spazzatura → null;
  `cartellaDestinazione` con classe+materia, con materia sola (null classe → piatto), con nome NFD;
  `pianoRicezione` scarta un rel non ammesso infilato nel manifest e somma `totale`;
  `nomeConsegna`; `schemaDocente` e `schemaIndirizzo` passano `MappAIModalCore.validaSchema`, le voci
  concludono, il campo `studente` porta il valore ricordato.
- `tests/riuso-divergenza.test.js` verde dopo `node tools/sincronizza.js`; `python3 tools/estrai-index.py --confronta` (index.html tocca solo gli script).
- `npm test` → 0 fail.

## Verifica a mano (gesti corti che l'utente proverà sull'iPad e sul Mac)

Mac (Electron, MappAI re)
1. INSEGNA › mappa «Elettricità - MM» › **QR** → in testa «Tutta la cartella della mappa» → QR + URL.
   Sotto: la riga per l'app studente. Nel Finder di `MappAI - Live/materiali-…/` c'è `vault.json`.
2. Da un telefono, lo stesso QR scarica ancora lo `.zip` (strada vecchia viva, inv. 1).
3. `curl 'http://<ip>:8768/api/vault?s=<tok>' | head` → il manifest senza `vista.json` né `Studio Attivo`.
4. `localStorage.mappai_scambio_studente='0'` → la voce sparisce e `/api/vault` risponde 404.

iPad (MappAI studente, Xcode Run dopo `npm run ios`)
5. Console › mappa › **Docente** › **Inquadra il QR** → permesso camera → scanner → velo «Ricevo n/N» →
   la console si ridisegna con la mappa nuova sotto la sua materia; File › Sul mio iPad › MappAI Studente
   mostra `4R/Scienze/Elettricità - MM/` con `index.yaml`, `Nodi/`, `Materiale Studio/`, senza `vista.json`.
   Al primo `fetch` iOS chiede «Rete locale»: accettare.
6. Stessa cosa con **Scrivi l'indirizzo** (l'URL sotto il QR del Mac, o `ip:porta token`).
7. Ricevere due volte: la seconda sovrascrive i file del docente e lascia `vista.json` e
   `Studio Attivo/Prove/` dello studente (aprire la mappa: la vista è quella di prima).
8. Prova › domande aperte › consegna → «Le tue prove» › cella **Invia** → chiede il nome (una volta) →
   toast «Consegnato». Sul Mac: `Studio Attivo/Consegne/Anna/… - risposte.pdf` nel vault e la tabella
   «Consegne» in INSEGNA si aggiorna da sola; la riga apre il PDF nella tela.
9. Chiudere il server sul Mac (hub Live › Materiali › Stop) e premere Invia: «Il QR è scaduto: inquadra quello nuovo».
10. Wi-Fi diverso: «Sei sulla rete della classe?» entro pochi secondi, non un'attesa muta.
11. `localStorage.mappai_studente_scambio='0'` (dalla Cabina, o Safari › Sviluppo) → bento a tre voci, niente cella Invia.

## Non-obiettivi

- Niente QR animati / trasferimento ottico (AGPL, lento). Niente Bluetooth/AirDrop/iCloud.
- Niente relay web (`netMode:'web'`, `live.insegnai.ch`): lo scambio è LAN; sul relay `daQr` legge
  comunque origine+token, ma non si prova né si promette.
- Niente codice a 6 cifre: chiederebbe un registro fuori dal Mac; l'indirizzo scritto a mano basta.
- Niente ricezione incrementale per `sha1`: v1 riscrive tutto ciò che è del docente (il `sha1` nel
  manifest resta, per un «solo i cambiati» futuro).
- Niente invio di `sessioni.jsonl`/`report.html` in v1: una consegna = un file, quello della cella
  «cartella». Il report MC (`report.html`) si manda con la stessa cella se la prova è MC.
- Niente unzip sull'iPad, niente jszip nel reader. Niente modifiche a `materials.html`.
- Niente identità/autenticazione degli studenti: il nome è dichiarato (come nelle Live senza roster).
- Non si toccano i file copiati nel reader (RIUSO regola 1): `files-core` cambia DI LÀ e si risincronizza.

## Decisioni prese (e revocabili) — ognuna con il perché in una riga

1. **Il QR è quello di oggi** (`/files/<nome>.zip?s=`): porta già origine+token, e il telefono continua a scaricare lo zip.
2. **Manifest + file singoli, non lo zip, sul lato studente**: niente jszip nel reader, ripresa e annullamento gratis, un velo che dice a che punto è.
3. **`relVaultStudente` in `files-core`**, condivisa per copia: una regola sola per chi espone e chi riceve (inv. 6), e il reader la riceve da `sincronizza`.
4. **`vista.json` e `Studio Attivo/**` non viaggiano** in nessun verso: sono dello studente sul suo iPad, del docente sul suo Mac.
5. **Consegne dentro il vault** (`Studio Attivo/Consegne/<studente>/`), non nella cartella della sessione Live: INSEGNA le trova dal disco, e restano con la mappa quando la sessione finisce (inv. 7).
6. **Vault della consegna risolto per NOME** (`findVaultDirByName`, NFC): funziona anche se il docente ha condiviso solo un documento o ha riavviato il server.
7. **Mai sovrascrivere una consegna**: suffisso ` (n)` — un file di un allievo non si perde per un doppio tap.
8. **POST JSON con base64 e tetto 20 MB**, `OPTIONS` gestito: la stessa forma di `readBody` di oggi; il tetto è un parametro, il default resta 1 MB per le altre rotte.
9. **CORS `*` sul server Materiali**: l'origine è `capacitor://localhost`, non prevedibile per IP; il gate è il token, come per il telefono.
10. **`@capacitor/barcode-scanner`** (ufficiale, UI nativa) e non ML Kit: meno codice, niente webview trasparente; via `registerPlugin` come Filesystem/Share.
11. **Ripiego «scrivi l'indirizzo» sempre presente**, anche col plugin: la camera può mancare (iPad in custodia, permesso negato, simulatore).
12. **Nome dello studente in `localStorage`, chiesto una volta**; `base`+`token` ricordati 12 h: inviare non chiede il QR se la sessione è viva.
13. **Due kill-switch**, uno per app (`mappai_scambio_studente` di là, `mappai_studente_scambio` di qua): ciascuna torna com'è oggi da sola (inv. 1).
14. **Tre chiavi del plist in `plist-ipad.py`**, non a mano: `ios/` si rigenera.
15. **Il comando «Docente» è la quarta voce del bento**, non un menu: lo studente ha un posto solo per «il docente» (inv. 21).

## Bivi (SOLO le scelte materiali che spettano all'utente, con la tua raccomandazione)

1. **Camera: plugin ufficiale `@capacitor/barcode-scanner` (scanner nativo a schermo intero) — o niente
   plugin in v1, solo «scrivi l'indirizzo»?** Raccomando il plugin: un tap in classe contro
   trascrivere `192.168.1.23:8768 aB3xQ9…`; ma vuol dire una dipendenza nativa in più e la
   riconferma della versione per Capacitor 8. Se la versione non c'è, si parte senza e si aggiunge dopo.
2. **Dove finiscono le consegne sul Mac: nel vault (`Studio Attivo/Consegne/<studente>/`, raccomandato)
   o in `Attività di studio/<classe>/…` come le sessioni Live?** Nel vault le trova INSEGNA sulla
   mappa; in Attività resterebbero fuori dalla console e servirebbe un indice.
3. **La voce «Tutta la cartella» dentro il picker QR di INSEGNA** (raccomandato: un comando QR solo)
   **oppure un quinto comando nella riga della mappa?** Il punto fermo del 13/8 dice niente righe in più.
4. **Il PDF delle risposte è l'unico file inviato** (raccomandato) — o anche `report.html`/`sessioni.jsonl`
   in un colpo solo? Un file per gesto tiene la POST e la tabella semplici; si allarga dopo se serve.
