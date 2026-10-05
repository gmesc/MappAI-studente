# HANDOFF — MappAI studente, stato del repo

> L'unico documento di stato di questo repo. Il *come si costruisce* è in `RIUSO.md` (le
> copie) e nel piano `docs/PIANO-reader.md` (v2, con i bivi sciolti). Il repo madre è
> `~/Claude/MappAI re`: la sua guida (`GUIDA-ARCHITETTO.md`) vale anche qui.
> Ultimo allineamento: **7 settembre 2026** — **guscio, autotest, launcher-console e split in piedi nel browser; mai sull'iPad**.
> Progetto: Giacomo Meschini — giacomo@insegnai.ch

## 0. Dove si riprende

**⟵ 5/10, la scheda del dossier ha la barra e gli stili della sintesi** (Giacomo: «applica alla pagina di
lettura della scheda la stessa tool bar … della sintesi. Allinea gli stili»). Il documento non esce più da
`buildAnalisiFonteHtml` (quiz-print) ma dal costruttore della **sintesi** (`MappAISynthesis.buildHtml`, copia di
branch-synthesis), col testo che `studia-core › markdownDaScheda` scrive dalla scheda (`##` per blocco, «**Etichetta:**
valore» per campo, «(interpretazione)» nei blocchi C e D; `*` e `[n]` neutralizzati; 1 test). Così il pannello lo
tratta come una sintesi senza voce naturale: `vesti` + `lettoreApp` → la stessa fila dell'app (⟲10 · ▶ · 5⟳ ·
velocità · effetto · Aa · Riga · lettura veloce · Stampa · ×), ▶ davanti ai titoli, foto in `.bs-fonte`. Il
costruttore sa dire solo «Sintesi di ramo»: l'etichetta si riscrive in «Analisi della fonte» nel testo prodotto; la
foto passa ancora per un segno (solo lettere) sostituito con l'indirizzo. La stampante della testata del pannello non
serve più (il documento ha la sua, agganciata alla stampa di iOS). Misurato nel browser: fila identica a quella della
sintesi di «La carta» (11 comandi), testata «… · Analisi della fonte · data», 4 titoli coi ▶, × → STUDIA.
⚠️ **Sull'iPad:** dopo `npx cap sync ios`, la voce (▶) e la stampa sulla scheda.

**⟵ 5/10, «solo iPad» sta nel progetto, e lo script non rimette più l'HTTP in chiaro.** Xcode avvisava a ogni
build «User supplied UIDeviceFamily key in the Info.plist will be overwritten»: la famiglia la decide la build
setting `TARGETED_DEVICE_FAMILY`, e la chiave che `tools/plist-ipad.py` scriveva nel plist non contava. Nel
progetto valeva `2` solo perché messa a mano in Xcode; il modello di Capacitor (`ios-spm-template.tar.gz`) ha
`"1,2"`: dopo una rigenerazione di `ios/` l'app sarebbe diventata iPhone + iPad in silenzio. Ora lo script
**toglie** `UIDeviceFamily` e **scrive** `TARGETED_DEVICE_FAMILY = 2;` in `project.pbxproj`, in tutte le
configurazioni (sostituzione sulla riga; senza la riga si ferma con un errore), e accetta la cartella `ios/`
come argomento (`python3 tools/plist-ipad.py [cartella ios]`). Insieme (Giacomo: «1, allinea lo script e
lancialo»): lo script rimetteva a ogni giro `NSAllowsArbitraryLoads`, tolto a mano dal plist il 17/9 — ora l'ATS
è solo `NSAllowsLocalNetworking`, e la voce della checklist di `APP-STORE.md` è spuntata. Provato sul modello
estratto (`"1,2"` → `2` in due configurazioni, secondo giro «già a posto», senza la riga: errore) e lanciato sul
`ios/` vero: tolta solo `UIDeviceFamily`, `project.pbxproj` intatto (valeva già `2`). ⚠️ **In Xcode (Giacomo):**
build pulita senza l'avviso; nel plist dell'app compilata `UIDeviceFamily` = `2` e basta; nessun iPhone fra i
dispositivi. Gli altri due avvisi (`OSBARCScanParameters+Decodable.swift`, `LegacyFilesystemImplementation.swift`)
sono dei plugin in `node_modules` e restano.

**⟵ 4/10, un dossier da foto si apre come SCHEDA, non come mappa** (Giacomo: «solo la scheda,
senza mappa»). Il dossier (0067) è un vault il cui grafo È la scheda (`nodiDaScheda`: radice
`fonte_0`, un ramo `fonte_<blocco>` per blocco, righe «Etichetta: valore»); la scheda intera sta
in `pipeline.json` e il PDF `Analisi-fonte` in `Materiale Studio`, e nessuno dei due arriva allo
studente (`relVaultStudente`). Il reader la **ricompone dai nodi** (`studia-core › schedaDaNodi`,
l'inverso, 3 test con il `nodiDaScheda` vero) e la disegna col documento di MappAI
(`buildAnalisiFonteHtml`, copia di quiz-print), con i quattro blocchi da **`mappai-visione-core.js`,
copia nuova** (in `sincronizza.js` col sì di Giacomo). Console: per un vault `dossier: true` la
cella «Scheda» (icona immagine, anche nell'elenco) al posto di «Mappa». `documenti.js › apriScheda`:
il pannello a **tutto schermo senza maniglia** (`apri({ pieno })`, classe `sd--solo`, e vale per
tutto ciò che si apre col dossier caricato), la × torna a STUDIA; la foto non entra in base64 (un
segno sostituito da un indirizzo); niente barra del documento (la sua × fa `window.close()`), la
stampante nella testata. Sull'iPad l'HTML si scrive in `Studio Attivo/Analisi della fonte.html` e si
apre dal file vero (la stampa di iOS lo carica), la foto per percorso relativo `../Allegati/…`; nel
browser due blob. `console.js › apriMappa(fullPath, conScheda)`: per un dossier apre la scheda
(Flashcard e Prova le stanno sopra; sintesi e materiali passano `false`). Misurato nel browser:
scheda 1023 px su 1023, foto + 4 blocchi, stampante e ×; × → console; la foto dai Materiali a
tutto schermo (914×677); Flashcard → la scheda sotto e l'avviso «non porta mazzi»; «Svizzera»
invariata (pannello 430 px con la maniglia). ⚠️ **Da provare sull'iPad:** la scheda dal file
vero, la foto relativa, la stampa. Copie a **`d817d70e`**: è arrivato anche lo 0069
(`en_translations.js`, `?v=sync-20261004b`) — la seconda sincronizzazione piccola è fatta.

**⟵ 4/10, le immagini nel pannello si vedono intere e si ingrandiscono.** La foto di un dossier
(0067, in `Allegati/`, 6500×4812 quella misurata) andava in un iframe come tutto ciò che non è un
PDF: diventava una pagina con la sola immagine a grandezza naturale, e nel pannello se ne vedeva
un angolo; sull'iPad, poi, un iframe non si ingrandisce col pinch (la ragione dei PDF, 7/9). Ora
`documenti.js › apriImmagine` (png · jpg · webp · gif) monta un `<img>` nel pannello: a zoom 1 la
foto è **intera** nel riquadro (Giacomo, 4/10), mai più grande del vero; si ingrandisce col
**pinch del visore PDF** (`pdf-vista.js › pizzica`, ora esportato, con un tetto facoltativo) fino
ai suoi pixel veri, ⌘ + rotella sul Mac. Sull'iPad la sorgente è il file vero (`convertFileSrc`),
non un base64 da 13 MB. Una foto non ha la stampante (il plugin conosce HTML e PDF). Misurato nel
browser: pannello a destra 405×300 dentro 429×707, pannello in basso (768×1024) 573×424 dentro
767×454; zoom 405 → 1008 px in 5 scatti, tetto 6500, ritorno a 405; PDF ancora a 6× al massimo,
sintesi HTML ancora nell'iframe con la sua veste. ⚠️ **Da provare sull'iPad:** il pinch sulla foto
e la memoria con una foto così grande.

**⟵ 4/10, sincronizzate 9 copie da MappAI re `ada73aa1`** (dall'ultima, `934f42a0`): `en_translations`,
`bento-composizione`, `ui-modals`, `teach-core`, `storage-lang`, `ui-canvas`, `files-core`,
`vault-manager`, `vault-io` (task 0059, 0061, 0064–0067 di MappAI re), `?v=sync-20261004`. I blocchi
di `index.html` non cambiano (`--confronta`: identici a quelli di `934f42a0`; `map-view` resta
DIVERSO per costruzione). **Lo 0061 («creare non è aprire») qui non cambia niente di visibile:**
l'adapter non legge `projectId` da `index.yaml` né lo mette nell'elenco dei vault, quindi
`adottaVault` riconosce per nome come prima (con UNA lettura in più dell'elenco a ogni apertura); il
`projectId` che `buildVaultMapData` ora mette nel `mapData` l'adapter lo ignora, e `vista.json` si
scrive come prima. Le copie nuove non chiamano moduli del docente assenti qui (ogni nome nuovo è
nelle copie o protetto). Provato nel browser: «Svizzera e la 2a GM» (39 nodi, Torna a STUDIA →
`vista.json` scritto), «La carta» (Flashcard `1 / 9`, fronte → retro), il dossier da foto
«LA GUERRE… · 08» (la foto di `Allegati/` compare come «La scheda del docente» e si apre nel
pannello; a grandezza naturale fino alla voce qui sopra, che lo corregge). Dopo il merge
dello 0069 in MappAI re serve una seconda sincronizzazione piccola (`en_translations.js`).

**⟵ 26/9, «Stampa» sull'iPad (task 0036 di MappAI re, più i PDF).** Nella WKWebView
`window.print()` non fa niente: la stampante della sintesi e il «Stampa» della `.mm-doc-bar`
erano bottoni muti (misurato nel simulatore). Ora c'è un **plugin Capacitor locale,
`plugins/mappai-stampa`** (dipendenza `file:` in `package.json`, Swift in
`ios/Sources/StampaPlugin/`): riceve il `file://` vero del documento e apre il menu di stampa di
iOS — AirPrint, anteprima, «Salva su File». Un HTML si carica in una WKWebView fuori schermo e si
stampa col suo `viewPrintFormatter()` (vale il `@media print`: niente barre); un PDF va a iOS così
com'è. Lato JS `studente/stampa.js` (puro, 9 test) sostituisce il `print` dell'iframe del pannello
al `load` — un aggancio solo per tutti i bottoni del documento — e `documenti.js` mette una
stampante nella testata del pannello quando è aperto un PDF (nel browser il PDF si apre in una
scheda sua). Misurato nel simulatore iPad Air 11": sintesi → menu, «Salva su File» → PDF A4 di 3
pagine senza barre; scheda PDF → menu, 2 pagine come l'originale; `.mm-doc-bar` → menu, anteprima
senza barra; seconda stampa dopo la prima: riparte. ⚠️ **Dopo una rigenerazione di `ios/`** (`npx
cap add ios`): `npm install` e `npx cap sync ios` rimettono il plugin in `CapApp-SPM` e in
`packageClassList` — niente da copiare a mano (`plugins/mappai-stampa/README.md`).

**⟵ 8/9, tre rilievi dall'iPad.** (1) **In split la mappa si inquadra da sé.** Il pannello stava
SOPRA il canvas: metà mappa finiva nascosta. Ora `#d3-container` si accorcia davvero con le due
variabili che il dock pubblica (`--sd-w`/`--sd-h`, più `min-height:0` che vince sui 400 px di
MappAI), e `studente/mappa.js` rifà l'inquadratura con **`fit('all')`** — non `fit('read')`, che
tiene una scala minima leggibile e su mezzo schermo lascia fuori i rami. ⚠️ Il riquadro cambia
taglia DUE volte (il dock, poi la sidebar che finisce di chiudersi): un `ResizeObserver` suo
rifà l'inquadratura 200 ms dopo ogni assestamento (dopo i 120 ms di MappAI, o vincerebbe il suo
`fit('read')`), più tre giri a 220/500/900 ms all'apertura. Vale solo in split. Misurato: 14 nodi
su 14 dentro il riquadro, prima 7 fuori. (2) **Il pinch sui PDF ora funziona**: con
`touch-action: pan-x pan-y` WebKit spegne il suo pinch e con esso gli eventi `gesture*`, che da
quel riconoscitore nascono — restavano due dita che non zoomavano niente. Il gesto si legge dai
TOCCHI (distanza fra due dita), `gesture*` resta agganciato solo per dire di no allo zoom della
pagina. Misurato: `scale(2)` durante, tela ridisegnata a 914 px dopo, punto sotto le dita fermo.
(3) **La barra dei comandi della mappa** comincia dopo il bottone tondo del menu (`left:96px`:
«Centra» ci finiva sotto) ed è più stretta di un sesto (bottoni 42, spaziature 8).

**⟵ 8/9: la barra di stato non sta più sopra l'app.** Con `viewport-fit=cover` la WKWebView
arriva fin sotto l'orologio e la batteria: la fila di comandi del documento aperto a destra ci
finiva sotto. Invece di rincorrere ogni superficie con `env(safe-area-inset-top)` si sposta la
webview una volta sola: **`@capacitor/status-bar` 8.0.3** e `setOverlaysWebView({overlay:false})`
in `studente/boot.js` (più `setStyle LIGHT`, testo scuro su fondo chiaro). Da lì in giù ogni
superficie — pannello, console piena, player, iframe dei documenti — è al sicuro per costruzione,
e gli `env()` che restano nel CSS valgono zero da soli. Ripiego per il browser e per il caso in cui
il plugin non risponda: `#studente-dock.sd--destra` porta il suo `padding-top`. ⚠️ Da provare
sull'iPad: è l'unica cosa che il browser non può misurare. Fase 0 in MappAI re (`3a6d9f1`): la
vista di studio non misura più un riquadro che non è a schermo — `fit()` su un SVG staccato o largo
zero lancia «Could not resolve relative length», e capitava a ogni resize con la console sopra la
mappa.

**⟵ 7/9 notte, terzo giro sull'iPad: la barra del documento e l'assetto della mappa.**
(1) La testata del pannello portava solo la × e si mangiava una riga: ora la **× entra nella
barra del documento** (in coda a Aa · Evidenzia · Riga · Stampa, iniettata da `vesti()` nello
stesso origine) e `.sd-testa` si nasconde (`sd--senza-testa`); il player del TTS resta sulla riga
sotto — ce lo manda il documento stesso sotto i 790 px. Se un HTML non ha `#ap-topbar` la testata
resta, o la × sparirebbe. (2) L'etichetta base è **«Aa x1»** (la taglia del testo: x1 · x1,5 · x2): cambiata
alla fonte in MappAI re e riscritta qui anche DOPO un giro completo dei tre stati, perché il ciclo
la ripesca dal suo elenco. (3) **`studente/mappa.js`**: la mappa si presenta sempre con la
**sidebar chiusa** e in **Albero**, e in SPLIT il disegno segue il tablet (`orient` = `lr`
sdraiato, `td` in piedi) girando da sé; **a tutto schermo la rotazione non tocca niente** — lì il
layout è una scelta dello studente. ⚠️ `layoutMode === 'studio'` NON basta come guardia: arriva
anche da `vista.json` mentre a schermo la vista non c'è; comanda il DOM (`#studio-overlay`). E
`renderGraph` può arrivare dopo di noi e portarsi via il riquadro (il `riprendi` di MappAI non lo
rimette: per lui è la stessa mappa), quindi `assetto()` vigila per tre secondi. Misurato nel
browser a 1024×768 e 768×1024: 14 nodi disegnati, `lr` ↔ `td` col dock aperto, invariato col dock
chiuso.

**⟵ 7/9 notte: i quattro rilievi di Giacomo sull'iPad (build con «La carta»).**
(1) **«Aa Dislessia» → «Aa x1»** nella sintesi: l'etichetta dice la taglia, non chi
dovrebbe premerla. Corretta alla fonte in MappAI re (`mappai-branch-synthesis.js`,
la scala è ora x1 · x1,5 · x2 + EN) e riscritta da `vesti()` sui documenti già sul
disco dello studente. (2) **La testata del pannello** non porta più il nome del
documento (resta nel DOM per la voce sintetica, `clip`); resta la ×. (3) **I PDF si
sfogliano**: dentro un iframe la WKWebView mostra solo la prima pagina, senza scorrimento
né pinch — ora `studente/pdf-vista.js` li disegna con pdf.js (vendor, caricato alla prima
apertura), pagine impilate che scorrono, disegnate quando si avvicinano
(IntersectionObserver), pinch con `gesture*` di WebKit più il ripiego a due dita e
ctrl+rotella. Misurato nel browser sul PDF della fonte: 2 pagine, scale(2,2) durante il
gesto e ridisegno a 1005 px dopo. (4) **I PDF di flashcard, fogli dei nodi, quiz e
domande aperte NON arrivano più allo studente** (`materialeSoloDocente` in files-core,
la stessa regola per chi espone e per chi elenca): l'ultima pagina porta le soluzioni, e
le attività lo studente se le compone dai `set-*.json` e dai gemelli in
`Materiale Studio/Sorgenti/` — verificato che «Prova» trova ancora 7 fogli e 8 set.
**Stretta la sera stessa, dalle parole di Giacomo: «l'unico PDF che viaggia dal docente
all'allievo è quello della scheda didattica originale»** — da `Materiale Studio/` non passa
nessun pdf (via anche mappa stampata, Focus, viste di studio, catena: nell'app lo studente
se li genera), e `Allegati/` — che nessuno elencava — diventa il gruppo **«La scheda del
docente»**, primo nella console e nel pannello (`console.leggiMateriali` e `documenti.materiali`
fanno due letture, `daMostrare`/`inAllegati` in studia-core sono la regola sola per entrambi).
Il vault dimostrativo ripacchettato: 34 file, 2,9 MB — la scheda in PDF, la sintesi, i sette
gemelli in Sorgenti e gli otto set, cioè tutto ciò che serve a «Prova». (5) **Quarto comando
«Sintesi»** nel bento (icona `file-text`, apre la mappa e il documento accanto;
`trovaSintesi` è nel core) e **i cinque comandi mostrano icona E testo** — l'etichetta
al passaggio del mouse su un iPad non si vede mai.

**⟵ 7/9 sera: IL VAULT DIMOSTRATIVO e la scheda per l'App Store.** `public/demo/vault.json`
(4,5 MB, 51 file) è «La carta» (2A · Storia), generata da zero in MappAI re da «Storia della
CARTA.pdf» (14 nodi, 7 quiz MC per angolo, 7 fogli di domande aperte + gemelli in Sorgenti,
flashcard, foglio nodi, sintesi, catena, PDF allegato); lo impacchetta `npm run demo`
(`tools/vault-json.js` con un `dest` sotto public/demo/ filtra con `relVaultStudente`).
`studente/demo.js`: al primo avvio, se Documenti è vuoto, `MappAIStudenteFS.importa(lista)` lo
scrive lì (IndexedDB nel browser, Filesystem sull'iPad) e segna `mappai_studente_demo='1'`; è
la mappa che il revisore di Apple vede. Verificato nel browser (`?pulisci=1` senza `?vault=`):
la console mostra «La carta» sotto Storia. `docs/APP-STORE.md`: nome, sottotitolo, testo
promozionale, descrizione, parole chiave, privacy, note per il revisore, elenco degli screenshot
da fare con Giacomo, checklist prima dell'invio (togliere `NSAllowsArbitraryLoads`). MappAI re:
rilascio **v1.0.0-beta.2** su GitHub (varianti del carattere nel Cestino, scambio con lo studente).

**⟵ 7/9 notte: LO SCAMBIO COL DOCENTE, fasi 1-2 (piano `docs/PIANO-scambio-qr.md`, fase 0 in
MappAI re `d1ec90c`).** Nel bento della console la quarta voce **Docente** (`chiude:false`, modale
sopra la console): «Chi sei» (numero personale + classe, `identitaStudente` di files-core — classe
`[1-4][A-Z]`, maiuscolo forzato nell'input, ricordata in `mappai_studente_identita`); «Ricevi»
(Inquadra il QR col plugin `@capacitor/barcode-scanner` 3.1.2 — solo se `Capacitor.Plugins.
CapacitorBarcodeScanner` c'è — o Scrivi l'indirizzo: `daQr` legge sia l'URL del QR di INSEGNA sia
«ip:porta codice»); «Consegna» (le prove con un file). Ricezione: `GET /api/vault` → piano filtrato
con `relVaultStudente` (fiducia zero nel manifest) → un file alla volta da `/vault/<rel>` →
`MappAIStudenteFS.scriviRicevuto` (seconda porta di scrittura dell'adapter, allowlist = la stessa
regola del docente) → velo «Ricevo n/N» con Annulla → `MappAIStudente.ricarica(dest)`. Consegna:
cella **Invia** in «Le tue prove» o dal modale → spunte report/jsonl → `POST /api/consegna` con
numero, classe, vault (folderName), sessione, nome, base64; il docente ricordato 12 h in
`mappai_studente_docente` (si riprova con `/api/materials`, 403 → QR di nuovo). Errori con rimedio
(`erroreTesto`). Kill-switch `mappai_studente_scambio='0'`. Plist: `NSCameraUsageDescription`,
`NSLocalNetworkUsageDescription`, `NSAppTransportSecurity` (LocalNetworking + ArbitraryLoads) da
`tools/plist-ipad.py`. Logica pura in `studente/scambio-core.js` (7 test, schemi da validaSchema);
UI in `studente/scambio.js`. **Provato nel browser contro il server Materiali VERO di MappAI re
avviato da Node** (scratchpad `server-scambio.js`): 77 file ricevuti (8,4 MB, 43 nodi, 7 sorgenti,
vista.json intatto), consegna con «1a» → cartella `Consegne/1A-4517/` sul lato docente con
report.html + sessioni.jsonl, `onConsegna` chiamata. **Da provare sull'iPad**: lo scanner (permesso
camera, UI nativa), il permesso «Rete locale», l'HTTP in chiaro verso l'IP del Mac, e su Electron
la voce «Tutto il vault del progetto» + la tabella delle consegne in INSEGNA.

**⟵ 7/9, quinto giro: la console di un progetto come in INSEGNA.** (1) I tre comandi
(Mappa · Flashcard · Prova) sono un riquadro BENTO identico a `_consBentoMappa` di
mappai-landing-teach.js: stessi `stile`/`bottoni` (#f1f4f8 / #404040 / hover #41e6aa), forma
`azione` (icona a riposo, etichetta al passaggio), `layout.colonneVoci`. ⚠️ Serviva il modulo
`mappai-bento-composizione.js` (`MappAIBento`: colori e griglia dei riquadri) — senza, il bento
usciva NERO e in colonna; ora è copiato (sincronizza + index). (2) I **materiali del vault
nella console**, per tipologia: `studia-core.tabelleMateriali` (GENERI e GRUPPI spostati lì dal
dock, puri, testati) → `s.tabelle` sotto i comandi, un elenco per gruppo (Sintesi · La mappa
stampata · Flashcard · Quiz · Domande aperte · Fogli · Catena · Altri), solo i pieni, niente
json; la riga CONCLUDE con `mat:<rel>` → console.js apre la mappa e il file nel dock. La
tabella «Le tue prove» sta in coda. Verificato nel browser: riga → mappa + dock col PDF.
(3) Lo scambio dei file col docente: NON fatto — vedi la risposta a Giacomo del 7/9 (il
progetto QR-stream è AGPL-3.0; la strada proposta è il server Live di MappAI re, che ha già
`/api/materials` e `/files/<nome>` per la ricezione; manca un endpoint per l'invio).

**⟵ 7/9 notte, quarto giro: tre rilievi di Giacomo sul dock.** (a) «Materiali» a prova in
corso copriva le domande: ora `materiali()` rifiuta con un avviso finché il dock ha una prova
(`chiediChiusura` non nullo). (b) In fondo all'elenco lo scorrimento trascinava tutta la
finestra verso l'alto: era la scroll view della WKWebView — spenta con `ios.scrollEnabled:false`
in `capacitor.config.json`, più `overscroll-behavior: contain` sul corpo del dock e
`overflow:hidden` su html/body (**da provare sull'iPad**). (c) Il bottone **Dossier** (un comando
di CREA) è sostituito da **Sintesi**: apre il `Sintesi-voce*.html` del vault, o `Sintesi*.html`,
o il PDF; se il vault non ne ha (Germania ed Elettricità non ne hanno: il docente non l'ha
pubblicata) lo dice nel sottotitolo e con un avviso. Le righe dei file `Sintesi*` restano
anche nell'elenco. (d) Dallo screenshot: la barra dei comandi passava SOTTO il dock — ora
`misura()`/`chiudi()` pubblicano l'ingombro del dock come `--sd-w`/`--sd-h` sull'<html> e la
barra si ferma al suo bordo (`right`/`bottom` in calc; `transition:none` perché il
`transition-all` di Tailwind nel pannello nascosto non avanza mai — ore perse a misurare
12px). Misurato: dock a 792, barra fino a 780; chiuso il dock torna piena.

**⟵ 7/9 notte: terzo giro iPad — 1-5 del giro precedente funzionano (stampe non provate).**
Due cose: (a) **la barra dei comandi** della mappa: in MappAI è assoluta con `left:50%`, e da
assoluta le spetta metà canvas — con la sidebar aperta in portrait bottoni e cursore non ci
stavano. In `studente.css` prende la larghezza del canvas (left/right 12 px, max 720, margini
auto), il cursore dei livelli flette (misurato: 464 px su un canvas di 488). (b) **Il tocco
lungo**: d3-drag ferma la propagazione del `touchstart` sui nodi, quindi il primo ascoltatore
(in bolla sul contenitore) non lo vedeva mai; e le card delle viste di studio (Albero, Fasci,
DAG, Focus) hanno un menu proprio — Descrizione, Focus vicini/parentela, Anelli, Copia — legato
SOLO a `contextmenu`. Ora `pota.js` ascolta in fase di CATTURA e a 450 ms sintetizza un
`contextmenu` sul bersaglio (`g.node-group` o `svg g[data-op]`): ci pensano gli ascoltatori
loro. Verificato nel browser con TouchEvent sintetici sulle card (menu con le cinque voci);
sul canvas D3 il test sintetico non vale (d3-drag non registra il tocco senza `maxTouchPoints`)
— **da provare sull'iPad**: tocco lungo su un nodo della Mappa e su una card dell'Albero.

**⟵ 7/9 sera: il secondo giro sull'iPad (`992f16e` + questo).** Dai sette screenshot di
Giacomo: (1) **Cabina dello studente** (`studente/cabina.js`, `window.openCabina` che il
pallino del manifesto chiama): il carattere (i quattro di `MappAIFont`, stessa chiave
`mappai_font_app`) e la **guida** (`public/guida/index.html`, per un ragazzo di 11-12 anni,
otto sezioni, in un modale xl con iframe; le foto si fanno sull'iPad vero, dopo). (2) **Le
briciole vivono**: il manifesto emette `mappai-briciola` e nessuno ascoltava — ora la console
STUDIA (Studia/materia → nessun progetto scelto) e il launcher (Studia › mappa › Studio attivo ›
attività: «Studia» chiude e riapre la console con `MappAIStudente.torna()`, «mappa» chiude e
basta, «Studio attivo» torna alla prima pagina) ascoltano finché sono aperti. (3) Nel launcher
c'è sempre **«‹ Torna a STUDIA»** in fondo (`launcher-core` → azione `torna`, 4 test aggiornati).
(4) **La prova su misura non mostra più «Cambia argomenti»**: opzione `senzaAree` della view
in MappAI re (`48fcb7b`, spenta per default, resincronizzata, `?v=st2`). (5) **Safe area** in
`studente.css` (console piena, dock, menu flottante; `env()` vale 0 nel browser). (6) Sull'iPad
`jsPDF.API.save` è sostituito nell'adapter: le quattro «Stampa dalla mappa» scrivono in
`Studio Attivo/Stampe/<nome>.pdf` e aprono il foglio di condivisione (`doc.save` è un no-op
nella WKWebView) — **da misurare sull'iPad**. (7) **L'icona** con la S dentro il pallino arancione del logo: `tools/icona.py`
(PIL) → `resources/icona-1024.png` → `ios/.../AppIcon-512@2x.png`; si rilancia dopo un
`cap add ios`. Verificato nel browser: Cabina, guida, briciole nei due posti, «Torna»,
prova su misura senza passo ①. `npx cap sync ios` fatto: in Xcode basta Run.

**⟵ 7/9: launcher a schermo intero e prova a schermo diviso (piano `docs/PIANO-prova-split.md`,
fatto).** «Studio attivo» è una CONSOLE (`studente/launcher-core.js`, puro, validaSchema in
Node — ha trovato la tendina degli angoli che nasceva vuota sui fogli vecchi): colonna con i tre
gruppi, area col setup dell'attività scelta, «Avvia» che conclude, ESC torna alla mappa. In
ogni setup la spunta **«Rispondi con la mappa accanto»** (spenta per default, ricordata in
`mappai_studente_split`): la prova si monta nel DOCK invece che in un modale — iPad sdraiato
→ dock a destra (maniglia a sinistra, larghezza), iPad in piedi → dock in basso (maniglia in
alto, altezza); `matchMedia('(orientation: portrait)')`, due clamp (360/240 px – 70 %), due
memorie; girare l'iPad cambia solo il CSS, la view resta lo stesso nodo. In split la scelta
multipla usa la view «a scelta» col verdetto immediato (`MappAIProvaCore.verdetto`) e il
report esce dallo stato (`reportMCDaStato`); senza split resta il player. Chiudere il dock a
prova in corso chiede. Misurato nel browser a 1024×768 e 768×1024: box `mm-box--piena`
1018×768; dock 430 → 488 px col drag; in portrait dock in basso 716 px (tetto), stessa view;
MC in split «Giusto — corretta: …», report scritto. **Prossimo: la prova sull'iPad.**

**Prima (6/9 notte): FASE 2 FATTA.** L'autotest vive nel launcher
«Studio attivo» (`studente/autotest.js`, uno schema del motore al posto del modale a mano di
`mappai-active-study.js`: Palazzo via, tre sezioni allineate): **Autotest** — un set pronto a
scelta multipla (il player di MappAI) · un foglio pronto di domande aperte · **domande aperte su
misura** (tutta la mappa o un ramo · tutti gli angoli o uno; con «tutti» la sessione
metacognitiva: righe «Domanda i» attraverso gli angoli, chip «Perché:» a tre colori, il verde
prende, poi si risponde alle verdi con l'autovalutazione) — **Viste** — **Strumenti**.
Alla consegna: i record sul bus (padronanza per nodo L1 del ramo; MC 1/0, aperte =
autovalutazione) e la **sessione su disco** in `Studio Attivo/Prove/<nome>/` (nome da
`FilesCore.sessionFolderName` + progressivo): per le domande aperte `sessione.json` (sorgente)
→ `risposte.html` (foglio compilato di `buildOpenQuestionsHtml`, senza tracce né `qp-set`, si
stampa con `window.print`) → `risposte.pdf` (jsPDF, `studente/prova-pdf.js`, il file da
mandare al docente; niente soluzioni, niente report); per il set MC — agganciando
`showStudySummary` del player — `report.html` (`buildStudentsReportHtml`, identico al report
QR) + `results.json` + `sessione.json`. La console elenca le cartelle nella tabella «Le tue
prove» (documento · tipo · data GG/MM/AAAA) con le celle **stampante** (l'HTML in una
finestra e `window.print()`: su iPad è il menu di stampa) e **cartella** (il PDF al foglio di
condivisione di iOS con `@capacitor/share`; nel browser si scarica); la riga apre il documento
nel dock. Logica pura in `studente/prova-core.js` (9 test).
Provato nel browser sul vault VERO «La Germania e il Nazismo» (7 gemelli in `Sorgenti/`, scritti
il 6/9 dal ripescaggio di MappAI): su misura › un ramo › tutti gli angoli → 4 righe × 26 card
con le domande dei PDF → consegna → cartella con i tre file (PDF 91 KB `%PDF-1.3`; `pdftotext`
NON eseguito) → tabella con la riga → «apri» nel dock; set MC → 24 domande → report 16/24.
⚠️ **I fogli di «Elettricità - MM» non torneranno dal ripescaggio**: l'archivio (tetto 30) li ha
già scartati — dentro ci sono quelli di Germania, Ceresio ×2, Monachesimo, grind this heels.
Per Elettricità vanno rigenerati da CREA («Genera materiali» con le domande aperte): la pipeline
scrive `Sorgenti/` da sé. Misurato via CDP sull'app viva (`mappai_saved_documents`).

**Da provare sull'iPad (mai fatto: il guscio è stato provato SOLO nel browser).** Il
progetto Xcode È generato (`ios/`, fuori dal repo) con Capacitor 8 (SPM, niente CocoaPods) e
le tre chiavi del plist messe da `tools/plist-ipad.py` (`UIFileSharingEnabled`,
`LSSupportsOpeningDocumentsInPlace`, `UIDeviceFamily=[2]` — dal 5/10 al suo posto
`TARGETED_DEVICE_FAMILY = 2` nel progetto, vedi §0 — la prova che funzionavano è nel
plist compilato di «MappAI Studente» in `MappAI re/ios/DerivedData`). ⚠️ Il CLI di
Capacitor vuole **Node ≥ 22**: `nvm use 22` (sul Mac c'è la 22.22.3), poi `npm run ios`
(rigenera se manca, plist, sync, apre Xcode). Poi firma e iPad: tocca a Giacomo.
Gesti: File › Sul mio iPad › MappAI Studente → trascinare `Elettricità - MM` → l'app la
elenca sotto «Scienze» → Mappa (pinch/pan) → Flashcard → Materiali (sintesi con voce, un
PDF in iframe: **da misurare**, WKWebView potrebbe rifiutare il blob PDF) → Torna a STUDIA →
uscire e rientrare: `vista.json` scritto, la mappa del docente intatta.

## 1. Come si verifica

```bash
npm test                                   # riuso-divergenza (hash contro MappAI re) · studia-core (validaSchema)
node tools/sincronizza.js                  # copie verbatim; --verifica per il solo confronto
python3 tools/estrai-index.py --confronta  # i blocchi di index.html contro MappAI: uguale / DIVERSO
node tools/vault-json.js "~/Documents/MappAI - file/Mappe/4R/Scienze/Elettricità - MM" 4R/Scienze
npm run serve                              # poi http://localhost:8766/index.html?vault=dev/vault.json
```

Nel browser l'adapter lavora su IndexedDB (`?vault=` importa il JSON impacchettato; «Apri
una cartella» usa `<input webkitdirectory>`). ⚠️ Il pannello del browser di Claude non
esegue JS da `file://` e ha `visibilityState: hidden` (rAF fermi): si misura il DOM, e i
marcatori `?v=stN` degli script `studente/` vanno bumpati a ogni modifica (trappola 4).

Provato il 6/9 nel browser, con `Elettricità - MM` (41 nodi, 11 set, 52 materiali):
console con gruppo «Scienze» e voce «Elettricità · 4R» · selezione → area Mappa · Flashcard ·
Prova + tabella vuota con la frase · Mappa → 41 nodi a schermo nella vista Albero del
docente · Materiali → 52 righe classificate + 4 stampe dalla mappa · sintesi nel dock
(iframe da blob: titolo, `#ap-cues`, audio presenti) · Torna a STUDIA → console con briciole
`Studia › Scienze › Elettricità` · Flashcard → player `1 / 30`, fronte → retro · menu
contestuale a 5 voci (Leggi ad alta voce + i quattro semafori) · Rigenera/Elimina/QR dei set
nascosti, stampa visibile · «Lavagna QR» nascosto.

## 2. Che cosa c'è

| pezzo | file | note |
|---|---|---|
| le copie verbatim (~75 file) | `public/js/mappai-*.js`, `app.js`, vendor, `css/*.css`, `traduzioni/`, `fonts/` | `tools/sincronizza.js` è l'unico elenco; test di divergenza |
| la pagina | `public/index.html` | testa di MappAI (senza pdf.js, lame, three) + 16 blocchi estratti per id + 6 pezzi del docente tolti + script nell'ordine di MappAI + `studente/*` |
| la controfigura di `electronAPI` | `public/js/studente/adapter.js` | IndexedDB (browser) / Capacitor Filesystem (iPad); UN parser del vault (index.yaml minimo, Nodi/**.md, set, vista.json); `getAllVaults` sulla radice di Documents (≤3 livelli); **scrive solo `vista.json` e `Studio Attivo/**`**; `saveVault` = solo vista; niente `htmlToPdf`/`capturePage` (assenti, non finti); `isCapacitor`/`isElectron` globali |
| gli stub del nocciolo duro | `public/js/studente/boot.js` | `tutorState` con la forma vera (d3-render legge `.nodes[id]`), `setTutorState`, `systemPromptsConfig`, la veste (`manifesto`, `mn-bento-app`, `studente`), `mappai_domande_scelta='0'` |
| la potatura | `public/js/studente/pota.js` + `css/studente.css` | `appState.studentMode`, menu contestuale in allowlist via MutationObserver, `refreshGeminiModels`/`initializeAIProvider` spenti, CSS per selettore sui bottoni del docente; bersagli ≥ 44px |
| la console STUDIA | `studente/studia-core.js` (puro, testato) + `studente/console.js` | nav per materia (`materiaDichiarata → discDir → Senza materia`), area con Mappa (conclude) · Flashcard (conclude) · Prova (fase 2), tabella `Studio Attivo/Prove/*/sessione.json`, briciole statiche, ESC non esce, «Apri una cartella» |
| l'autotest | `studente/prova-core.js` (puro, testato) + `studente/autotest.js` + `tools/fogli-finti.js` | sostituisce `ActiveStudy.openLauncher` da fuori; pool MC dai set, aperte dai gemelli `Sorgenti/`; setup su misura coi campi del motore (radio + scelta); la view «a scelta» in una sezione nuda con `mostraAngolo/chip/chipPrende/raggruppa`; consegna → bus |
| il launcher-console e lo split | `studente/launcher-core.js` (puro, 4 test) + `autotest.js` (`openLauncher`, `avvia`, `prova` con `o.split`/`o.mc`) + `documenti.js` (dock `sd--destra`/`sd--basso`, `chiudiChiedendo`) + `prova-core.js` (`orientamento`, `clampSplit`, `foglioDaSet`, `verdetto`, `reportMCDaStato`) | il modale storico del launcher non c'è più; «Avvia» è l'unica azione che conclude |
| la sessione su disco | `studente/prova-core.js` (`nomeSessione`, `foglioCompilato`, `itemsHtml`, `reportMC`) + `studente/prova-pdf.js` + `autotest.js` (`scriviSessione`, `scriviReportMC`) + `documenti.js` (`azione`) | `Studio Attivo/Prove/<nome>/`: sorgente prima della resa (inv. 18); il PDF è jsPDF (l'unico percorso su iPad); stampante = `openPrintable` + `window.print`; cartella = share sheet / download |
| il dock e i materiali | `studente/documenti.js` | `#studente-dock` in `#main-content`, maniglia (clamp 360px–60%), iframe da blob; elenco per prefisso + 4 stampe dalla mappa; `azione()` per stampante/cartella = fase 2 |
| Capacitor | `package.json`, `capacitor.config.json`, `tools/plist-ipad.py`, `plugins/mappai-stampa/` | `@capacitor/core|ios|filesystem|share` 8; il plugin locale `mappai-stampa` (la stampa di iOS, 26/9); `ios/` generato il 6/9 (Node 22), in `.gitignore`, si rigenera con `npm run ios` |

## 3. Le decisioni prese qui (oltre a quelle del piano)

- **Niente `storageAdapter.js` di MappAI**: 1284 righe di cui 22 metodi, con la radice
  cablata su `MappAI - Vault/`, il seeding del vault demo a ogni avvio e le chiamate AI. Un
  adapter nostro di 400 righe fa solo ciò che i moduli copiati usano (26 metodi misurati con
  `grep electronAPI.` sull'allowlist, 12 implementati, il resto assente).
- **Le voci del menu flottante sono tre**: Materiali · Studio attivo · Torna a STUDIA. Le
  quattro stampe dalla mappa stanno in coda all'elenco Materiali, non in un hub.
- **«Torna a STUDIA» non ricarica la pagina** (la strada di `backToLanding`): salva
  `vista.json` con un tetto di 3 s e riapre la console; la mappa resta sotto e «Mappa»
  la rimostra senza ricaricare.
- **La console è la home**: aperta al boot sopra tutto; chiusa dal pallino, se sotto c'è
  una mappa la si mostra, altrimenti si riapre.
- **`docedit-core` e `teach-core` sono nell'allowlist** anche se «del docente»: puri, e li
  pretendono `quiz-print` (normalizzazione dei set) e `storage-lang` (`nfc`, `progettoDelVault`).

## 4. Debiti e cose da sapere

- 🟠 **Mai provato sull'iPad** (§0). Il ramo Capacitor dell'adapter è scritto sulla
  documentazione di `@capacitor/filesystem` 8 (`readdir` con `{name,type}`, `readFile` →
  base64), non misurato.
- 🟡 **Il PDF nell'iframe**: nel browser Chromium lo rende; WKWebView di solito anche, ma da
  un `blob:` non è certo. Ripiego previsto nel piano: foglio di condivisione (`@capacitor/share`).
- 🟡 **`jsPDF.API.save` sostituito sull'iPad** (adapter): scrive e condivide, ma è misurato
  solo per lettura del codice — le stampe dalla mappa vanno provate sull'iPad.
- 🟡 **La guida non ha immagini**: il testo regge da solo; le foto delle superfici si fanno
  sull'iPad vero e si mettono in `public/guida/`.
- 🟡 **Il dock copre il canvas** (`position:absolute` a destra) invece di stringerlo: la
  mappa resta trascinabile sotto. Stringere `#d3-container` vuol dire toccare la cascata di
  `style.css` (713 `!important`): si fa se Giacomo lo chiede.
- 🟡 **`index.html` diverge da MappAI per costruzione**: `tools/estrai-index.py --confronta`
  lo dice blocco per blocco. Va rilanciato dopo ogni sincronizzazione.
- 🟢 **I materiali mostrano anche i PDF del docente con le tracce** (`Domande-aperte-*.pdf`
  con le soluzioni in coda): è il vault com'è. Se il docente non vuole, non li consegna.
- `mappai_domande_scelta='0'` viene scritto nel localStorage dello studente al boot: spegne
  le due card «a scelta» del launcher con l'interruttore di MappAI.
