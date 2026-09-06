# HANDOFF — MappAI studente, stato del repo

> L'unico documento di stato di questo repo. Il *come si costruisce* è in `RIUSO.md` (le
> copie) e nel piano `docs/PIANO-reader.md` (v2, con i bivi sciolti). Il repo madre è
> `~/Claude/MappAI re`: la sua guida (`GUIDA-ARCHITETTO.md`) vale anche qui.
> Ultimo allineamento: **6 settembre 2026, sera** — **fase 1 (il guscio) in piedi nel browser**.
> Progetto: Giacomo Meschini — giacomo@insegnai.ch

## 0. Dove si riprende

**⟵ FASE 2 — «Prova».** Il guscio c'è e gira nel browser con un vault vero: console STUDIA →
Mappa (canvas con la Vista studio del docente) · Flashcard (player) · Materiali nel dock
(la sintesi con la voce accanto alla mappa, i PDF) · Torna a STUDIA. Manca la **prova**
(setup, `MappAISceltaView` nella tela con le opzioni della fase 0, report MC, PDF jsPDF
delle risposte, tabella delle sessioni con stampante/cartella): è la fase 2 del piano,
§«Che cosa si fa» → 2.1-2.4. `Prova` oggi risponde con un avviso.

**Da provare sull'iPad (mai fatto: il guscio è stato provato SOLO nel browser).** Il
progetto Xcode non è ancora generato: `npx cap add ios`, poi in `ios/App/App/Info.plist`
**rimettere a mano** `UIFileSharingEnabled` = true, `LSSupportsOpeningDocumentsInPlace` =
true, `UIDeviceFamily` = [2] (la prova che funzionavano è nel plist compilato di «MappAI
Studente» in `MappAI re/ios/DerivedData`). Poi `npx cap sync ios`, Xcode, firma, iPad.
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
| il dock e i materiali | `studente/documenti.js` | `#studente-dock` in `#main-content`, maniglia (clamp 360px–60%), iframe da blob; elenco per prefisso + 4 stampe dalla mappa; `azione()` per stampante/cartella = fase 2 |
| Capacitor | `package.json`, `capacitor.config.json` | `@capacitor/core|ios|filesystem|share` 8; `ios/` non generato, in `.gitignore` |

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
- 🟡 **Il dock copre il canvas** (`position:absolute` a destra) invece di stringerlo: la
  mappa resta trascinabile sotto. Stringere `#d3-container` vuol dire toccare la cascata di
  `style.css` (713 `!important`): si fa se Giacomo lo chiede.
- 🟡 **`index.html` diverge da MappAI per costruzione**: `tools/estrai-index.py --confronta`
  lo dice blocco per blocco. Va rilanciato dopo ogni sincronizzazione.
- 🟢 **I materiali mostrano anche i PDF del docente con le tracce** (`Domande-aperte-*.pdf`
  con le soluzioni in coda): è il vault com'è. Se il docente non vuole, non li consegna.
- `mappai_domande_scelta='0'` viene scritto nel localStorage dello studente al boot: spegne
  le due card «a scelta» del launcher con l'interruttore di MappAI.
