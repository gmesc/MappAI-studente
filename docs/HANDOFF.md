# HANDOFF — MappAI studente, stato del repo

> L'unico documento di stato di questo repo. Il *come si costruisce* è in `RIUSO.md` (le
> copie) e nel piano `docs/PIANO-reader.md` (v2, con i bivi sciolti). Il repo madre è
> `~/Claude/MappAI re`: la sua guida (`GUIDA-ARCHITETTO.md`) vale anche qui.
> Ultimo allineamento: **7 settembre 2026** — **guscio, autotest, launcher-console e split in piedi nel browser; mai sull'iPad**.
> Progetto: Giacomo Meschini — giacomo@insegnai.ch

## 0. Dove si riprende

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
`LSSupportsOpeningDocumentsInPlace`, `UIDeviceFamily=[2]` — la prova che funzionavano è nel
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
| Capacitor | `package.json`, `capacitor.config.json`, `tools/plist-ipad.py` | `@capacitor/core|ios|filesystem|share` 8; `ios/` generato il 6/9 (Node 22), in `.gitignore`, si rigenera con `npm run ios` |

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
