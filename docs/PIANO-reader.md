# Piano — MappAI studente (v2, con le quattro integrazioni del 6/9)

> Piano da `/architetto`, seconda stesura (6/9/2026). La prima stesura (stessa data, mattina)
> è superata da questa: le quattro integrazioni di Giacomo cambiano la piattaforma (iPadOS), la
> superficie (console STUDIA, non una home) e le attività («prova» al posto di «Studia»).
> Fonti: guida `~/Claude/MappAI re/GUIDA-ARCHITETTO.md` letta per intera; `docs/HANDOFF.md`
> §0-§4 e §7; `PIANO-domande-a-scelta.md`, `PIANO-scelta-a-tre-passi.md`; codice misurato da
> sei letture (mappa degli script e dei menu · pagine QR · console e briciole · iPad/Capacitor ·
> chip e modi della prova · report e PDF); vault veri sul disco (`~/Documents/MappAI - file`).
> **Non implementa niente**: si parte dopo l'approvazione.

**Braindump tradotto** (vocabolario della guida §2)
Un'app **sorella** di MappAI, per iPad, chiamata **MappAI studente**. Si apre su una **console**
del motore dei modali (`layout:'console'`, `piena:true`) intitolata **STUDIA**: la **navigazione**
elenca i **vault** ricevuti dal docente raggruppati per **materia**; l'**area** del vault scelto
porta tre comandi — **Mappa** (il canvas con tutte le sue viste, menu potato), **Flashcard** (il
player storico: fronte → riflessione → tocco → retro), **Prova** — e una **tabella** (inv. 12)
delle sessioni con i loro documenti, con due celle-azione: **stampante** (menu di stampa di
iPadOS) e **cartella** (il PDF nell'app File). **Prova** apre una **tela** nell'area dove lo
studente compone la sua prova: domande aperte o scelta multipla · tutta la mappa o un ramo ·
angoli misti o angoli scelti. Con **tutti gli angoli** la prova è a due tempi: prima si leggono
le varianti d'angolo di un ramo, poi si risponde, e a ogni domanda si dà il chip **«Perché:»**
a tre colori (verde «ho capito cosa rispondere» · arancione «non so la risposta» · blu «non ho
capito la domanda»). Fine di una prova MC: il **report** dello studente, identico a quello che
arriva dopo l'attività QR, archiviato nella tabella insieme alla copia del quiz. Fine di una
sessione di domande aperte: **solo il PDF** con domande e risposte, **senza soluzioni e senza
report**, da mandare al docente. Niente CREA/ELABORA/INSEGNA, niente AI, niente rete.

**Stato rilevante** (misurato)
- **Un'app «MappAI Studente» per iPad è già stata compilata una volta**: in
  `ios/DerivedData/…/MappAI Studente.app/Info.plist` — `com.insegnai.mappai.studente`,
  `UIDeviceFamily [2]` (solo iPad), `UIFileSharingEnabled` e `LSSupportsOpeningDocumentsInPlace`
  **veri**: la cartella Documenti dell'app compare nell'app File («Sul mio iPad › MappAI
  Studente»). Sopravvive solo il binario: `ios/` è in `.gitignore`, `Info.plist` sorgente non
  c'è, `@capacitor/*` non è in `package.json`, il branch `MappAI_iPad_studente` **non esiste più**
  sul remoto (la tabella «in standby» di `CLAUDE.md:743` è stantia). Pod installati: solo
  `@capacitor/filesystem 8.1.2`.
- **`public/js/storageAdapter.js` (1284 righe) è la cucitura**: fuori da Electron installa un
  `window.electronAPI` di controfigura su Capacitor Filesystem (`Directory.Documents`) o su
  IndexedDB nel browser. Copre 22 metodi (`getAllVaults`, `loadVault`, `saveVault`, `pickFolder`…)
  su 74 usati: **mancano** `readVaultFile`, `saveVaultFile`, `vaultMaterialsList`,
  `saveStudyRecord`, `readStudySessions`, `htmlToPdf`, `vaultFilePrint`, `vaultFileDownload`.
  Il suo elenco dei vault è cablato su `Documents/MappAI - Vault/` (`:204,216,269,281`),
  profondità ≤ 2. `pickFolder` non è un selettore di cartelle. Bersagli `.mm-btn` a 38px
  (`DIARIO-2026.md:2315`), sotto i 44pt di iPad — leva `--mm-btn-fs`/`--mm-btn-pad-y`.
- **PDF: due percorsi, uno solo vive su iPad.** `html-to-pdf` è `printToPDF` di Electron
  (`main.js:791`) — assente su iPad. **jsPDF** (`public/js/jspdf.umd.min.js` + i quattro
  caratteri vendorizzati via `MappAIFont.registraIn(doc)`) fa già mappa vettoriale, dossier,
  fogli flashcard, catena dei perché; il «foglio di testo che scorre» di riferimento è
  `MappAICausal.appendPdfPages` (`mappai-causal-chains.js:263`, ~40 righe). E `window.print()`
  in WKWebView **apre il menu di stampa di iPadOS** (AirPrint + «Salva su File»): è la strada
  già documentata per il telefono in `mappai-live-teacher.js:675-704`.
- **La console rende senza la veste**: `mappai-modal-core.js` + `mappai-modal.js` +
  `mappai-modal-tokens.css` bastano (`.mm-box--piena`, `.mm-console__side/area/man`, `.mm-tela`).
  Le briciole statiche sono `MappAIConsoleManifesto.briciole([{id,et}])`
  (`mappai-console-manifesto.js:187-236`, evento `mappai-briciola`) e vogliono
  `html.manifesto` + i due CSS manifesto; `consoleInCima/sezioneDelBox/vaiA` sono della landing
  e non servono. Il raggruppamento in colonna è `_gruppo()` di ELABORA (8 righe,
  `mappai-elabora-console.js:1013`), non un core: si riscrive. Regole che mordono subito:
  `taglia:'xl'` o la console si declassa (core `:75`); una voce di nav o una riga senza
  `chiude:false` **chiude la finestra** (core `:270`, `:340`); `tabella`+`tela` è errore
  bloccante (core `:560`), `tabelle`+`tela` no; la memoria dei gruppi si rimanda nello schema
  all'evento `__gruppo`.
- **Le pagine QR lato studente** sono sette; ciò che vale è già in una superficie sola:
  `mappai-scelta-view.js` (nessuna `fetch`, trasporto iniettato; `scelta.html` è 60 righe di
  colla attorno a `SV.monta/mostraEsito`). Riusabili estraendo una funzione: `computeStudentResult`
  (`mappai-live-core.js:567`, UMD puro), `renderResult` (`student.html:669-703`, il cruscotto
  «percentuale + righe ✅/❌ con la tua risposta e la corretta»), il blocco TTS (`student.html:235-266`,
  zero server), `materials.html` + `file.html` (153 righe: elenco file + visore iframe con barra
  «Salva su File»). Da buttare: login, roster, token, lobby, poll di fase, pallino di sync — cinque
  copie che esistono solo perché un telefono si lega a una riga di registro su LAN.
- **Il report MC per allievo esiste**: `buildStudentsReportHtml` (`mappai-live-reports.js:173`,
  UMD puro) legge righe `{outcome,text,yourText,correctText}` — proprio ciò che
  `computeStudentResult.perQuestion` emette; adattatore da 15 righe, CSS `lr-*` identico al
  report docente, bottone `window.print()` già dentro (`:89`).
- **Il foglio delle domande aperte con le risposte NON esiste**: `buildOpenQuestionsHtml`
  (`mappai-quiz-print.js:417`) stampa righe vuote (`:497`); con `includeAnswers:false` toglie
  tracce e `qp-set`, quindi «senza soluzioni» è gratis. Un ternario (`item.risposta ? testo :
  righe`) lo fa diventare il foglio compilato. Su iPad quel foglio si stampa con `window.print()`;
  il **file** PDF lo fa jsPDF (~80-100 righe sul modello di `appendPdfPages`).
- **Le sorgenti delle domande aperte non sono nel vault** (solo PDF; l'HTML col `qp-set` vive
  nell'archivio localStorage del docente, cap 30 — debito 0-B). Bloccante: resta la fase 0.
- **«Domanda 1 nei sette angoli» non esiste come dato**: ogni (ramo × angolo) è una chiamata AI
  separata (`material-pipeline.js:1980-2005`), l'indice nel foglio non sopravvive a `poolDaFogli`
  (`scelta-core.js:165`) e `unaPerAngolo` tiene **una** domanda per (ramo × angolo). Quello che
  il dato dà gratis: **per ogni ramo, una domanda per angolo** — sette card, sette tagli. È la
  riga naturale della prova «tutti gli angoli».
- **I chip**: `CHIP` è definito una volta (`scelta-core.js:57`), `accende()` cabla `niente`;
  `normalizzaStato` (`:571`) **butta in silenzio** un chip fuori vocabolario; la view
  risincronizza per indice (`view:347-349`); `ET_CHIP` in `live-reports.js:302` è una seconda
  copia. `mostraEsito` non legge i chip. Nessun test della view; 35 test del core restano verdi
  finché il default non cambia.
- Il `ramo` sugli item c'è solo nelle generazioni dal 19/8: **0 set su 78** sul disco di oggi.

---

## Bivi (da sciogliere prima di partire)

1. **Piattaforma: iPad (Capacitor), sviluppo nel browser, niente Electron.** Le integrazioni
   (menu di stampa di iPadOS, app File) dicono iPad; l'app «MappAI Studente» esisteva già in
   quella forma; la controfigura `storageAdapter.js` ha un ramo IndexedDB che dà un ciclo di
   sviluppo senza Xcode. Costo vero: Xcode, account sviluppatore, provisioning sul dispositivo —
   tocca a Giacomo. Il guscio Electron non si costruisce finché nessuno chiede un lettore desktop.
   **Via libera?**
2. **Quattro ritocchi a `MappAI re` su `main`** (fase 0): (a) il gemello `.html` delle domande
   aperte nel vault; (b) in `MappAISceltaView.monta` le opzioni `mostraAngolo` e `chip`
   (vocabolario e colori) e in `normalizzaStato` un argomento `vocab` facoltativo; (c) in
   `buildOpenQuestionsHtml` il ternario `item.risposta`; (d) niente altro — la controfigura non
   si tocca, l'app studente le aggiunge i metodi che le mancano da un file suo. Tutti dietro
   kill-switch o default invariato (inv. 1). **Via libera?**
3. ✅ **Sciolto da Giacomo (6/9): la sessione «metacognitiva».** Lo studente vede PRIMA, tutte
   insieme, le «domande 1» dei vari angoli (per ramo, riga i = la i-esima domanda di ogni
   foglio d'angolo: pool NON campionato, corrispondenza per posizione — dichiarata), sceglie
   quali capisce coi tre chip (il verde PRENDE), poi risponde alle verdi — non a tutte per
   forza. Nel codice: `MappAIScelta.perDomandaPerAngoli` (+ `idx` in `poolDaFogli`) e le opzioni
   `raggruppa:'domanda-per-angoli'`, `chipPrende:'capito'` della view.
4. **Report MC = HTML come in Live** (`report-studenti.html` + `results.json`), il PDF lo fa il
   menu di stampa («Salva su File»). Il PDF **file** lo produce solo la sessione di domande
   aperte (jsPDF), perché va spedito. Se vuoi il file anche per il report MC: stesso percorso
   jsPDF, +60 righe. **Il piano procede senza.**
5. **La cella «cartella»: l'app File non si apre su un percorso** (nessuno schema URL pubblico).
   Ciò che c'è: la cartella dell'app **è già** in File (chiavi del plist); la cella apre il
   **foglio di condivisione** di iOS sul PDF (`@capacitor/share`, un plugin solo), che porta
   «Salva su File», «Apri in…» e **anche «Stampa»**. La cella «stampante» resta `window.print()`
   sul documento HTML. **Va bene così?**
6. Nessun blocco d'accesso, nessuna chiave: come nella v1.

---

## Che cosa si fa

### Fase 0 — i prerequisiti in `MappAI re` ✅ FATTA il 6/9 (2 commit su `chore/electron-40`; dettagli in `MappAI re/docs/HANDOFF.md` §0-novies)

**0.1 La sorgente delle domande aperte viaggia col vault** (invariato dalla v1).
`mappai-quiz-print.js`: `scriviSorgente(vaultPath, nomePdf, html)` → `Materiale Studio/<stem>.html`
(nome = stem del PDF già deciso da `buildFileName`, inv. 6); chiamata dopo ogni
`MappAIStudyDocs.save({kind:'quizpaper'})` (`material-pipeline.js:585-600, :1018, :2047, :2194`,
`crea-quiz.js`); ordine PDF → archivio → gemello, errore sul gemello = `console.warn` (inv. 18).
Ripescaggio dei vault vecchi in `saveMapVault()` (`vault-io.js`) con `ifAbsent:true`.
Kill-switch `mappai_sorgenti_nel_vault`. Il gemello **non fa riga** negli elenchi (regola in un
posto: `GENERI`/`FilesCore`), misurato con `tools/smoke/elenchi-elabora-insegna.js`. Test:
`quiz-print-roundtrip` (+3), `files-core`/`pipeline-core` (+2).

**0.2 Le tre opzioni della view «a scelta»** (`mappai-scelta-view.js`, `mappai-scelta-core.js`).
- `monta(host, { mostraAngolo: true })`: kicker `etAngolo` sulla card (`view:313`, `:438-440`),
  guardia `o.mostraAngolo && v.angle`. Nullo per Live: al telefono `angle` non arriva
  (`core:222`). Default spento.
- `monta(host, { chip: [{k, et, colore}] })`: `var CHIPS = o.chip || S().CHIP.map(...)`
  (`view:152`); il ciclo a `:339` itera `CHIPS`; la risincronizzazione a `:347-349` passa **per
  chiave**, non per indice (oggi con un array diverso si accendono i chip sbagliati); l'eco del
  passo ③ (`:510`) legge `CHIPS`; il colore va **inline** sul bottone (la stringa `CSS` è
  iniettata una volta con guardia `#sc-css`, un secondo blocco non entra). Default = i quattro
  storici.
- `normalizzaStato(stato, pool, vocab)`: terzo argomento facoltativo usato a `core:571`; nessun
  chiamante lo passa oggi (`live-server:605,692`, `scelta.js:305`) → Live identico. Senza,
  il vocabolario nuovo verrebbe cancellato al primo giro.
- `perRamo` non si tocca; accanto nasce `perDomandaPerAngoli(pool)` (bivio 3, sciolto): per
  ramo, righe per posizione nel foglio (`poolDaFogli` conserva `idx`). Opzioni della view:
  `raggruppa:'domanda-per-angoli'` e `chipPrende` (il chip verde prende la domanda, niente
  bottone a parte), `hint`. Rispondere alle verdi non è obbligatorio: la consegna chiede
  (`scelte_vuote`) e MappAI studente risponde sì da `chiedi`.
- Banco: sesta colonna in `public/dev/scelta-harness.html` con angolo visibile e tre chip
  colorati; misura: la chiave dell'angolo in ogni card, 0 sbordi a 390px, contrasto dei tre
  colori sul bianco ≥ 4,5:1 col testo scuro (inv. 16: sul verde il testo è scuro).
  Test: `scelta-core.test.js` +2 (`normalizzaStato` con `vocab` tiene il chip nuovo; senza lo
  scarta come oggi).

**0.3 Il foglio compilato** (`mappai-quiz-print.js:497`): `item.risposta ? '<div class="qp-risposta">'
+ escHtmlQP(item.risposta) + '</div>' : righeVuote`. Nessun chiamante passa `risposta` oggi →
nessun foglio cambia. Test: `quiz-print-roundtrip` +1.

### Fase 1 — il guscio ✅ IN PIEDI NEL BROWSER il 6/9 sera (stato e deviazioni in `docs/HANDOFF.md` di questo repo: adapter proprio al posto di `storageAdapter.js`, `ios/` non ancora generato — Capacitor CLI vuole Node ≥ 22)

**1.1 Repo e copie.** `package.json`: `@capacitor/core@8`, `@capacitor/ios@8`,
`@capacitor/filesystem@8.1.2`, `@capacitor/share@8`; `js-yaml` no (l'adapter parsa `index.yaml`
a mano). `capacitor.config.json`: `appId com.insegnai.mappai.studente`, `webDir public`.
`ios/` rigenerato con `npx cap add ios` e **rimessi a mano** `UIDeviceFamily [2]`,
`UIFileSharingEnabled`, `LSSupportsOpeningDocumentsInPlace` (la prova che funzionavano è nel
plist compilato in DerivedData). ⟶ 5/10: «solo iPad» è `TARGETED_DEVICE_FAMILY = 2` nel progetto,
scritto da `tools/plist-ipad.py`; `UIDeviceFamily` nel plist non contava (Xcode la sovrascrive) e si toglie. `RIUSO.md` + `tools/sincronizza.js` + `tests/riuso-divergenza.test.js`
come nella v1: copie **verbatim** dall'allowlist, hash confrontati, test che si salta se MappAI
non c'è. Un file copiato non si modifica mai qui.

Allowlist (classi A e B della mappa misurata, più ciò che la console vuole): i18n (3) ·
`hypher.js` `it.js` · **`storageAdapter.js`** · `text-utils` `math` `relations` · `app.js` ·
`font-core` `font` · `modal-core` `modal` `console-bento` (per `spanDi`; `montaPercorso` non
serve: briciole statiche) · **`console-manifesto.js`** · `ui-modals` · `storage-lang` ·
`d3-render` `ui-canvas` `node-styling` · `latex` · `timeline-core` `timeline` · `print-layout`
`doc-bar` `doc-head` `nodesheet-core` · `quiz-print` · `study-export-core` `study-doc` ·
`causal-core` `causal-chains` · `branch-synthesis` (viewer) · `studio-layouts/draw/view` ·
`mastery` `study-bus` `active-study-core` `active-study` · `scelta-core` `scelta-view` `scelta` ·
**`live-core`** (`computeStudentResult`) **`live-reports`** (`buildStudentsReportHtml`) ·
`files-core` `vista-core` `pipeline-core` · `sidebar-resize` `mastery-view` `effort-view`
`celeration` `study-path` `palace` `pomodoro` · `user-profile` `search-finder` `vault-manager`
`vault-io` `print-dossier` `context-menu` · `flashcards-sr` `study-session` `a11y` `tts-reader`
· `d3.v7` `lucide` `tailwind.js` `jspdf` `vendor/svg2pdf` · i quattro caratteri · CSS:
`style.css`, `mappai-modal-tokens.css`, `mappai-stile-manifesto.css`,
`mappai-console-manifesto.css`, `traduzioni/`, `fonts/`.
Fuori: tutto il resto della classe C (pipeline, generazione, CREA/ELABORA/INSEGNA,
`stile-manifesto.js` — al suo posto una riga:
`document.documentElement.classList.add('manifesto','mn-bento-app')` — Live/Tutor/Collab
teacher, usage, errori, cabina, jigsaw, lavori, visione, proiezione, licensing, `admin_prompts`).
Stub nel boot: `window.setTutorState = function(){}` (nocciolo duro), `window.systemPromptsConfig
= {}` se `app.js` lo pretende.

**1.2 `public/js/studente/adapter.js`** — i metodi che alla controfigura mancano, aggiunti
sull'oggetto che lei stessa installa (non è congelato: è un oggetto della pagina, non un
`contextBridge` — trappola 35 non si applica): `readVaultFile`, `saveVaultFile` (base64 o testo,
`recursive:true`, stessa forma di `preload.js`), `vaultMaterialsList`, `saveStudyRecord`,
`readStudySessions`, e **`getAllVaults` sostituito** con un walker sulla **radice** di
`Directory.Documents` (cartella con `index.yaml` = vault, profondità ≤ 3: regge sia la cartella
piatta sia `classe/materia/mappa`), più `loadVault` che aggiunge `vista.json` se la controfigura
non lo legge (da misurare). **Allowlist di scrittura**: `saveVaultFile` accetta solo `vista.json`
e `Studio Attivo/**` (la guardia sta nel trasporto, come l'IPC in Electron — inv. 19). Nel
browser (sviluppo) lo stesso file lavora sul ramo IndexedDB della controfigura più un
`<input type="file" webkitdirectory>` per caricare un vault di prova.
`htmlToPdf`, `vaultFilePrint`, `vaultFileDownload` restano **assenti**: nessun modulo copiato
li chiama dai percorsi dello studente, e un metodo finto che «riesce» sarebbe un vicolo cieco
silenzioso (inv. 43).

**1.3 `public/index.html`** — proprio, scritto una volta: i blocchi del canvas per id (elenco
della v1: `#map-view` con sidebar a 5 schede, `#main-content`, `#floating-actions-*`,
`#d3-container`, `#map-control-card`, `#context-menu`, `#source-modal`, `#study-player-modal`,
`#quiz-modal`, `#loading-overlay`, `#a11y-panel`…), i due `<div hidden>` con gli id che
`closeActiveModals` cita, **nessun** `#landing-view` con contenuto: la casa è la console. Script
nell'ordine di MappAI, poi `js/studente/*.js`; `css/studente.css` in coda (bersagli a 44px:
`--mm-btn-fs`, `--mm-btn-pad-y`). Marcatori `?v=`.
Menu flottante della mappa a **due voci**: `Studio attivo` (launcher potato: Palazzo, heat map,
Cosa studiare ora, Progressi) · `Torna a STUDIA`. Le stampe dalla mappa (PDF vettoriale, foglio
nodi, dossier, catena) stanno sotto un terzo comando `Stampa…` del menu, non in un hub.
Potatura (`studente-pota.js` + CSS) come nella v1: menu contestuale in allowlist (`tts`,
`test_flashcard*`, `status_*`), scheda Studio senza Elimina/Rigenera/QR, foglio del nodo senza
bottoni AI, launcher senza le card «a scelta».

**1.4 `public/js/studente/console.js`** — la console STUDIA (schema del motore, passato da
`Core.validaSchema`):
- `id:'studia', titolo:'Studia', taglia:'xl', layout:'console', piena:true, area:'una',
  navChiudibile:true`; `prossimoZ` dal motore (inv. 11).
- **nav**: `{gruppo: materia, contatore, collassabile, chiuso: memoria[materia]}` + una voce per
  vault `{id:'v:'+fullPath, etichetta: rootNodeLabel, sotto: classe, chiude:false}`. Materia =
  `materiaDichiarata || discDir` (stessa precedenza di `landing-teach.js:1961`), «Senza materia»
  in coda; nomi confrontati con `MappAITeachCore.nfc` (trappola 25). Memoria dei gruppi
  rimandata nello schema a `__gruppo`.
- **area** del vault scelto: sezione `nuda` con tre azioni `chiude:false` — `Mappa` (chiude la
  console, `directLoadVault(fullPath)`; «Torna a STUDIA» la riapre sullo stesso vault) ·
  `Flashcard` (elenco dei set flashcard del vault → `loadStudySet` → `openStudyPlayer`; con un
  set solo parte diretto) · `Prova` (2.2).
- **`tabelle:[{id:'sessioni'}]`**: colonne `Documento · Tipo · Data (GG/MM/AAAA) · azioni
  (96px fissi)`; righe da `Studio Attivo/Prove/*/` (`readStudySessions`-like: un `sessione.json`
  per cartella); celle-azione `printer` e `folder-open` (`chiude:false` di default per le
  celle-azione). `vuota: 'Nessuna prova ancora: componine una e il documento comparirà qui.'`
- Briciole statiche: `MappAIConsoleManifesto.briciole([{id:'studia',et:'Studia'},{materia},{vault},{et:'Prova'}])`,
  evento `mappai-briciola` → ridisegno dello schema al livello scelto.
- ESC a strati: con la tela della prova aperta, `__esc` chiude la tela e **ritorna `false`**
  (`mappai-modal.js:852-862`); senza, esce la console (che è la home: si ricomporta come `Mappa`
  chiusa → nessuna uscita dall'app; il velo non chiude, `veloChiude:false`).
- `suApertura`: legge i vault (`getAllVaults`) e le sessioni, poi `ridisegna`.

**1.5 `public/js/studente/documenti.js`** — le due celle della tabella e il visore.
- **Stampante**: apre il documento HTML della riga in una finestra (`MappAIStudyExport.openPrintable(html,
  {autoPrint:true})`) → `window.print()` → menu di stampa di iPadOS. Ogni riga ha **sempre** un
  HTML: il report per le prove MC, il foglio compilato (0.3) per le domande aperte.
- **Cartella**: `Share.share({ url: <file PDF> })` di `@capacitor/share` (il foglio di iOS:
  «Salva su File», «Apri in…», «Stampa», Mail). Sotto la tabella una riga di testo: «I documenti
  stanno anche in File › Sul mio iPad › MappAI Studente › <vault> › Studio Attivo › Prove».
- Nel browser (sviluppo) le due celle degradano dichiarando: stampante = `window.print()`,
  cartella = download del blob.
- Materiali del vault (sintesi con voce, PDF del docente): comando `Materiali` nell'area,
  elenco alla `materials.html` (20 righe) e visore alla `file.html` (iframe su blob da
  `readVaultFile`): 153 righe copiate quasi verbatim, senza barra di salvataggio.

### Fase 2 — «Prova» ✅ FATTA il 6/9 notte: l'autotest vive nel launcher «Studio attivo» (richiesta di Giacomo), non in una tela della console — tre autotest, viste e strumenti, record sul bus, sessione su disco (json → html → pdf jsPDF), report MC, tabella con stampante/cartella. Stato e misure in `docs/HANDOFF.md`.

**2.1 `public/js/studente/prova-core.js`** — UMD puro, testato in Node (inv. 4):
`poolMC(studySets)` (`mode:'quiz'`, `options.length>2`, `angle` dal set, `ramo` se c'è) ·
`poolAperte(fogli)` = `MappAIScelta.poolDaFogli` sui gemelli `.html` (`setFromHtml`) ·
`opzioni(pool)` → `{angoli, rami|null}` («un ramo» spento col motivo quando gli item non portano
`ramo`) · `componi(pool, {tipo, ambito:'tutto'|'ramo', ramo, angoli:'tutti'|'misti'|[...]}, seme)`
→ `{pool, dueTempi}`: `tutti` = `unaPerAngolo(filtraPerAree(...))` e `dueTempi:true`; `misti`
= `mescola` e pesca N; `[...]` = filtro per `angle` · `statoIniziale(pool, dueTempi)`: con
`dueTempi` `fase:'leggi'`, altrimenti `fase:'rispondi'` con `risposte[id]={}` per ogni domanda
(tutte «prese»: in una prova si risponde a tutto — è il gesto di `onSecondoGiro`) ·
`CHIP_PERCHE = [{k:'capito', et:'ho capito cosa rispondere', colore:'#15803d'}, {k:'nonso',
et:'non so la risposta', colore:'#b45309'}, {k:'noncapita', et:'non ho capito la domanda',
colore:'#1d4ed8'}]` (testo scuro su fondo chiaro, contrasto misurato) · `risultatoMC(pool, stato)`
= adattatore di 15 righe su `computeStudentResult` → forma di `buildStudentsReportHtml`
(`{joined:1, perStudent:[{displayName:'Io', items: perQuestion, …}]}`) · `nomeSessione` da
`FilesCore.sessionFolderName` + `sessionSeq` (`2026-09-06 · Domande · Elettricità · 00`) ·
`fogliCompilato(pool, stato)` → gli item per `buildOpenQuestionsHtml` con `risposta` e, nel
testo della domanda, il chip «Perché: …» quando c'è.

**2.2 `public/js/studente/prova.js`** — la tela nell'area della console (`s.tela={id:'prova'}`,
senza `tabelle` nello stesso schema — errore bloccante altrimenti; il respiro della maniglia
rimesso col token `--mnc-man-size`, trappola 19). Tre passi in una tela sola:
- **Componi**: `Domande aperte | Scelta multipla` (con quante ne porta ciascuno) · `Tutta la
  mappa | Un ramo ▾` · `Angoli: tutti | misti | scegli ▾` (sette caselle). Arma il motore prima
  di allineare le spunte (trappola 10). `Avvia`.
- **Leggi e rispondi**: `MappAISceltaView.monta(tela, { pool, stato, cfg:{perRamo:true,
  minimoAree:0}, mostraAngolo: dueTempi, chip: dueTempi ? CHIP_PERCHE : [], verdetti, onCambia,
  onConsegna, chiedi })`. Con `dueTempi` il passo ② mostra per ogni ramo le sette card con
  l'angolo e il chip «Perché:», poi il passo ③ una domanda alla volta; senza, si parte dal ③.
  MC: verdetto immediato da `SC.corretta` iniettato con `VISTA.verdetto(id, v)` (il trasporto
  locale fa ciò che fa `live-server.js:628-640`). `onCambia` scrive `stato.json` (600 ms).
- **Chiudi**: MC → `risultatoMC` → `buildStudentsReportHtml` mostrato nella tela (è il report
  «come dopo l'attività QR») e archiviato; aperte → `fogliCompilato` → jsPDF **e** HTML
  compilato, nessun esito a schermo (bivio 4): la tela dice «PDF pronto» e torna alla tabella.

**2.3 `public/js/studente/prova-pdf.js`** — il foglio delle risposte in jsPDF (~100 righe sul
modello di `appendPdfPages`): intestazione (mappa, data GG/MM/AAAA, ambito, angoli), per
domanda: ramo · angolo · testo in grassetto · «Perché: …» se c'è · la risposta con
`splitTextToSize`, salto pagina a fondo foglio; carattere da `MappAIFont.registraIn(doc)` con
ripiego `courier`. **Niente soluzioni, niente tracce.** Verifica con `pdftotext`.

**2.4 La cartella della sessione** — `Studio Attivo/Prove/<nomeSessione>/`:
`sessione.json` (tipo, ambito, angoli, data, id delle domande, `stato` — la **sorgente**),
poi le rese: MC → `report-studenti.html` + `results.json` (come `live-server.js:364-372`);
aperte → `risposte.pdf` + `risposte.html`. Sorgente prima della resa; una resa che fallisce lo
dice e non tocca `sessione.json` (inv. 18). Record su `MappAIStudyBus` per le MC (è ciò che
«Progressi» legge). Cartella e file nel vault dello studente, visibili in File.

### Fase 3 — consegna
`npx cap sync ios`, build in Xcode sull'iPad di Giacomo; `LEGGIMI-studente.md` (cinque righe:
apri File › Sul mio iPad › MappAI Studente, trascina dentro la cartella della mappa, apri
l'app); `docs/HANDOFF.md` del repo con la lista «da provare sull'iPad»; in `MappAI re/docs/HANDOFF.md`
una riga in §8 (repo sorella) e i kill-switch in §2; la tabella «in standby» di `CLAUDE.md:743`
corretta (il branch non c'è più).

---

## Dove vive la logica nuova

| pezzo | dove | perché lì |
|---|---|---|
| gemello `.html`, opzioni della view, ternario del foglio | `MappAI re` (quiz-print, scelta-view/core) | proprietari del foglio e della superficie: una copia divergerebbe (inv. 6); default invariati (inv. 1) |
| pool, composizione, stato iniziale, risultato, nomi | `prova-core.js` (UMD) | decide senza DOM, provato in Node (inv. 4); nomi da `FilesCore`, campionamento da `MappAIScelta` |
| metodi mancanti della controfigura, allowlist di scrittura | `studente/adapter.js` | è il trasporto: le guardie stanno lì, come nell'IPC (inv. 19); il file copiato resta verbatim |
| console, tela, tabella, celle | `studente/console.js`, `prova.js`, `documenti.js` | UI che monta il motore e le view; niente in un file copiato |
| PDF delle risposte | `prova-pdf.js` | l'unico percorso che produce un file su iPad; modello già in casa |

Domande-filtro: core puro sì (2.1) · verità con proprietario: fogli, campionamento, nomi,
report — nessuna copia · cartella: del vault dello studente, solo `vista.json` e `Studio
Attivo/**` · spegnimento: kill-switch in MappAI, file propri qui · default: nessuno cambiato ·
resa dopo la sorgente sempre · niente AI, niente Infomaniak; i vault vecchi si aprono e dicono
che cosa non portano.

## Prove

```bash
# MappAI re (fase 0)
node --test tests/                                  # 0 fail; +6 (quiz-print-roundtrip, files/pipeline-core, scelta-core)
node tools/smoke/elenchi-elabora-insegna.js         # il gemello non fa riga
open public/dev/scelta-harness.html                 # sesta colonna: angolo visibile, tre chip, 0 sbordi, contrasti

# MappAI studente
node --test tests/                                  # prova-core (pool, opzioni, componi coi tre modi e col seme,
                                                    #   statoIniziale, risultatoMC, fogliCompilato, escape) · riuso-divergenza
node tools/sincronizza.js                           # copie verbatim, differenze a schermo
node tools/smoke/prove-su-vault.js "<vault vero>"   # sola lettura sul disco: pool, angoli, ramo sì/no, gemelli presenti
npx serve public                                    # il ramo browser della controfigura: console, tela, player, report
pdftotext "…/risposte.pdf" - | head                 # il PDF non contiene tracce né soluzioni
```

`tools/smoke/LEGGIMI.md` dichiara che cosa i banchi NON provano: File, share sheet, menu di
stampa, tocco a 44px, Filesystem di Capacitor — solo sull'iPad.

## Verifica a mano (sull'iPad, Giacomo)

1. In File: trascinare `Elettricità - MM` in «Sul mio iPad › MappAI Studente». Aprire l'app:
   STUDIA con «Scienze › Elettricità» in colonna; area con Mappa · Flashcard · Prova e la tabella
   vuota con la frase.
2. `Mappa`: canvas con la Vista studio del docente, pinch e pan col dito, sidebar a 5 schede,
   nessun comando del docente; `Torna a STUDIA` riapre la console sullo stesso vault.
3. `Flashcard`: fronte → tocco → retro → avanti; riga in `Studio Attivo/sessioni.jsonl`.
4. `Prova › Scelta multipla › tutta la mappa › angoli misti › 10`: una alla volta, verdetto con
   spiegazione; alla fine il report con percentuale e righe ✓/✗ (la tua risposta, la corretta);
   in tabella una riga; stampante → menu di stampa di iPadOS; cartella → foglio di condivisione.
   «Un ramo» è spento con la frase (i set del 17/8 non portano il ramo).
5. `Prova › Domande aperte` su un vault senza gemelli: l'app dice che cosa manca e che cosa fa
   il docente. In MappAI: aprire la mappa, «Sincronizza Vault» → sette `Domande-aperte-*.html`
   accanto ai PDF; ELABORA/INSEGNA senza righe doppie.
6. `Prova › Domande aperte › un ramo › tutti gli angoli`: sette card con l'angolo, chip
   «Perché:» a tre colori, poi le risposte una alla volta; chiudere l'app a metà e riaprire →
   `sessione.json` ritrova tutto; alla fine **nessun esito**, in tabella `risposte.pdf`;
   `pdftotext` non trova tracce; una seconda prova fa una seconda cartella.
7. Uscire: `vista.json` scritto; `Nodi/`, `links.json`, `index.yaml`, PDF del docente intatti.
   Ridare la cartella al docente: «Progressi» di MappAI legge le sessioni.
8. Carattere Atkinson dalla console (selettore nell'intestazione, API `MappAIFont`): mappa,
   tela, player e PDF lo usano.

## Non-obiettivi

- Niente AI, chiavi, rete, QR, Tutor, Lavagna, Timeline. Niente Electron (bivio 1).
- Niente modifica della mappa; niente riscrittura di nodi, archi, index. Niente licensing.
- Niente ritorno automatico al docente: il PDF si manda dal foglio di condivisione.
- Niente lettura dei PDF delle domande aperte con PDF.js. Niente «domanda 1 riscritta in sette
  tagli» (bivio 3). Niente report per le domande aperte (richiesta esplicita).
- Non si rifanno il player, la view «a scelta», il report `lr-*`: si montano.
- Possibili seguiti: PDF file anche per il report MC; il ramo di una card che centra la mappa
  sul suo L1; «Consegna allo studente» in INSEGNA (zip del vault senza `Chat/`, `pipeline.json`,
  consumi); un guscio Electron quando serva un lettore desktop.

## Decisioni prese (e revocabili)

1. **Capacitor iPad, sviluppo nel browser**, copie verbatim + un adapter proprio: nessuna
   variante di build in MappAI, nessun `if (studente)` nei moduli.
2. **La console STUDIA è la home**: `#landing-view` non esiste; «Torna a STUDIA» riapre la
   console. Veste manifesto accesa da una riga, non da `stile-manifesto.js`.
3. **Radice dei vault = Documenti dell'app** (visibile in File), walker proprio con `index.yaml`
   come firma, profondità ≤ 3; `MappAI - Vault/` della controfigura non si impone allo studente.
4. **Scrittura solo in `vista.json` e `Studio Attivo/**`**, imposta dall'adapter.
5. **Prova «tutti gli angoli» = per ramo, una domanda per angolo** (bivio 3).
6. **Tre chip «Perché:» a colori, come opzione della view condivisa**; i quattro chip storici
   restano il default ovunque altrove; le prove senza «tutti gli angoli» non hanno chip.
7. **MC: report HTML `lr-*` + `results.json`; aperte: PDF jsPDF + HTML compilato.** Il report è
   anche la «copia del quiz» (domanda · scelta · corretta per riga): niente secondo documento.
8. **Stampante = `window.print()` sull'HTML; cartella = foglio di condivisione sul PDF.**
   Un plugin in più (`@capacitor/share`), nessun tentativo di aprire File su un percorso.
9. **Un ramo spento col motivo** quando gli item non portano `ramo`; non si ricava dal testo.
10. **`vista.json` scritto all'uscita**, la mappa del docente mai riscritta.
11. **Bersagli a 44px** nell'app studente (`--mm-btn-fs`, `--mm-btn-pad-y`): è un iPad.
12. **`htmlToPdf`/`vaultFilePrint`/`vaultFileDownload` assenti**, non finti: ciò che non c'è
    deve fallire a voce.
