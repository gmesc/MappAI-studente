# Piano — Launcher a schermo intero e prova a schermo diviso

> Piano da `/architetto` (7/9/2026). Guida: `~/Claude/MappAI re/GUIDA-ARCHITETTO.md` (vale
> anche qui, `RIUSO.md`); stato: `docs/HANDOFF.md` (fase 1 e 2 in piedi nel browser);
> piano dell'area: `docs/PIANO-reader.md` v2. Codice misurato: `mappai-modal-core.js`
> (`piena` solo su `layout:'console'`, :371 e :578; le voci di nav CONCLUDONO per default,
> :270), `mappai-modal.js:675` (il box porta solo le classi di taglia/console: nessun
> gancio CSS per un modale in particolare), `studente/autotest.js` (il launcher di oggi è
> un modale `taglia:'l'`; la prova si apre in un modale `xl` con una sezione nuda alta
> 68vh), `studente/documenti.js` (il dock: `#studente-dock` a destra, maniglia verticale,
> clamp 360px–60%, larghezza in localStorage), `mappai-scelta-view.js` (`.sc-wrap` è alto
> 100% del suo ospite: si monta ovunque). **Non implementa niente.**

**Braindump tradotto**
1. Il **launcher «Studio attivo»** (la superficie in cui si sceglie la prova) deve occupare
   **tutto lo schermo**. Nel motore dei modali lo schermo intero è una proprietà delle
   **console** (`layout:'console'`, `piena:true`): il launcher diventa una console — la
   **navigazione** elenca le attività a gruppi (Autotest · Viste · Strumenti), l'**area**
   mostra il setup dell'attività scelta con «Avvia».
2. Nel **setup di ogni prova** un'opzione **«Rispondi con la mappa accanto»**: la prova non si
   apre in un modale sopra la mappa ma nel **dock**, in **split** — con l'iPad **in
   portrait** lo split è **orizzontale** (mappa sopra, prova sotto), **in landscape** è
   **verticale** (mappa a sinistra, prova a destra). La **linea di separazione si trascina**
   per ridimensionare le due metà, in entrambi gli orientamenti.

**Stato rilevante**
- Il launcher (`studente/autotest.js`) è già uno schema del motore con tre sezioni di voci
  che concludono nel `.then()`; il setup «su misura» è un secondo modale con campi
  radio/scelta; la prova monta `MappAISceltaView` in una sezione nuda di un modale `xl`.
- Il dock c'è (`studente/documenti.js`): un solo pannello, a destra, `position:absolute` in
  `#main-content`, maniglia sul bordo sinistro (pointer events, `touch-action:none`), un
  solo contenuto alla volta, chiuso da «Torna a STUDIA». Non ha una variante in basso.
- La view «a scelta» non conosce il suo ospite: `monta(host, …)`; `.sc-wrap` prende il 100%
  dell'altezza dell'ospite (in `apriInApp` l'ospite riceve `height:68vh`).
- Il set MC pronto gira nel **player storico** (`#study-player-modal`, markup di MappAI,
  overlay `fixed`), con il report agganciato a `showStudySummary`.
- Orientamento: nessuna regola nel codice. `matchMedia('(orientation: portrait)')` è
  disponibile in WKWebView e nel browser.

---

## Bivi

1. **Il set pronto a scelta multipla in split.** Il player storico è un overlay a tutto
   schermo di MappAI (markup copiato, classi Tailwind `fixed inset-0`): metterlo nel dock
   vuol dire spostare il suo DOM e sovrascrivere la cascata — fragile (trappola 6). La
   strada pulita: **in split la scelta multipla usa la stessa view delle domande aperte**
   (`MappAISceltaView` sa già fare le opzioni con verdetto immediato via
   `MappAIScelta.corretta`), e il report MC esce dallo `stato` invece che da
   `studyResults`. Costo: in split sparisce la schermata finale del player (punteggio +
   errori) — la sostituisce l'esito della view più il report archiviato. **Il piano procede
   così**; l'alternativa (player nel dock) è dichiarata sotto i non-obiettivi.
2. **Chi sta sopra/a sinistra.** Mappa sopra (portrait) e a sinistra (landscape), prova
   sotto/a destra. È la lettura naturale del braindump; si dice per essere revocabile.

---

## Che cosa si fa

**1. Il launcher come console** — `public/js/studente/autotest.js`, `studente/studia-core.js`
(o un core nuovo `launcher-core.js` se cresce), `tests/`.
- Schema: `layout:'console', piena:true, taglia:'xl', veloChiude:false, navChiudibile:true`;
  `nav` = tre gruppi (`Autotest`, `Viste ed esercizi rapidi`, `Strumenti`) con le sette voci
  di oggi, **tutte `chiude:false`** (una voce di nav senza `chiude:false` chiude la finestra,
  core :270); `attiva` sulla voce scelta. Per le voci spente (nessun set, nessun foglio)
  `sotto` porta il motivo, come oggi.
- `area:'una'`. Su `__nav`:
  · `set-mc` → sezione con le **voci** dei set (una per set, `chiude:false`) e in coda il
    setup (punto 2); · `set-aperte` → idem coi fogli; · `su-misura` → la sezione **campi** di
    oggi (ambito, ramo, angoli, angolo) + il setup; · `heatmap`/`effort` → agiscono subito
    (`toggle`) e la voce si ridisegna con «Vista ATTIVA/spenta»; · `studypath`/`celeration`
    → aprono il loro modale sopra la console (piano da `prossimoZ`, inv. 11).
- L'azione **`Avvia`** (sezione, `ruolo:'primario'`) **conclude**: l'esito arriva nel
  `.then()` con `r.valori` (campi) e la voce/set scelti nello stato del launcher (inv. 10).
  `__esc` chiude la console (torna alla mappa: non è la home).
- Briciole statiche: `Studio attivo › <attività>` (`MappAIConsoleManifesto.briciole`).
- `studia-core`-style: la **forma dello schema** in una funzione pura `schemaLauncher(o)`
  passata da `validaSchema` in un test (`tests/launcher-core.test.js`): è lì che si è
  scoperto il difetto della voce che chiude (trappola 33 evitata a tavolino).

**2. L'opzione «Rispondi con la mappa accanto»** — nel setup di tutte e tre le prove, un
campo `spunta` (`id:'split'`, etichetta «Rispondi con la mappa accanto (schermo diviso)»,
`aiuto`: «in verticale con l'iPad in piedi, fianco a fianco con l'iPad sdraiato; la linea
si trascina»). Default **spento**; l'ultima scelta si ricorda (`mappai_studente_split`,
scritta dall'uso). `r.valori.split` decide dove si monta la prova.

**3. Il dock a due orientamenti** — `public/js/studente/documenti.js`, `css/studente.css`.
- `orientamento()` = `matchMedia('(orientation: portrait)').matches ? 'portrait' :
  'landscape'`; il dock prende la classe `sd--basso` (portrait: `left:0; right:0; bottom:0;
  height:H`) o `sd--destra` (landscape: com'è oggi). Al cambio di orientamento
  (`matchMedia(...).addEventListener('change')`) il dock si risistema **senza rimontare** il
  contenuto (la view resta viva: è un cambio di CSS, non di DOM).
- La **maniglia** sta sul bordo che separa: sinistra nel dock a destra, **in alto** nel dock
  in basso; il drag muove larghezza o altezza; clamp `MIN` (360px / 240px) – 70% dell'asse;
  due chiavi localStorage (`mappai_studente_dock_w`, `_h`). A fine drag `window.resize`
  (il canvas si ridisegna). Bersaglio della maniglia ≥ 44px (inv. 16, iPad).
- Il canvas resta trascinabile sotto il dock (com'è oggi: il dock copre, non stringe).
- Logica pura in `prova-core.js`: `clampSplit(px, asse, min, quotaMax)` e
  `orientamento(w, h)` (+2 test).

**4. La prova nel dock** — `studente/autotest.js`.
- `prova(o)` prende `o.split`: se acceso, l'ospite è `MappAIStudenteDocumenti.apri({ titolo,
  monta: host => SV().monta(host, …) })` invece del modale; il dock mostra nella testata il
  titolo della prova e un comando «Consegna» non serve (lo ha la view nel piè). Chiudere il
  dock a prova in corso **chiede** (`MappAIModal.conferma`): è lavoro da perdere.
- Consegna in split: stessa `consegna(st)` di oggi (bus + sessione su disco); l'esito
  (`mostraEsito`, o la frase «Foglio salvato») si mostra **nel dock**, poi «Chiudi».
- **MC in split** (bivio 1): il pool viene da `MappAIScelta.poolDaFogli` sul set scelto
  (`{tipo:'mc', items}` — il core sa già leggere `options/correct` dei set veri),
  `statoIniziale(pool, false)` (tutte prese), `verdetti` iniettati da `SC().corretta(v, r)`
  in `onCambia` (il verdetto immediato di «Correggi subito», in locale), consegna → `voci`
  (score 1/0) → bus, e il **report** MC da `stato` con un adattatore `reportMCDaStato(pool,
  stato, meta)` accanto a `reportMC` (stessa forma per `buildStudentsReportHtml`).
  Senza split il set MC continua a girare nel player storico.

**5. Documenti** — `docs/HANDOFF.md` §0 e §2, `docs/PIANO-reader.md` (nota), `LEGGIMI-studente.md`
(una riga sull'opzione).

## Dove vive la logica nuova

| pezzo | dove | perché lì |
|---|---|---|
| forma della console del launcher | `studente/launcher-core.js` (puro) | `validaSchema` in Node prima che una console «non faccia niente» (trappola 33; inv. 4) |
| orientamento, clamp dello split | `studente/prova-core.js` (puro) | numeri senza DOM, provati (inv. 4) |
| dock a due orientamenti | `studente/documenti.js` + `css/studente.css` | è il dock: un pannello solo, una maniglia per orientamento (inv. 21: un comando per cosa) |
| prova nel dock, MC con la view | `studente/autotest.js` | è chi monta la view; nessuna riga nei file copiati (`RIUSO.md`) |
| report MC da stato | `studente/prova-core.js` | stessa forma del report esistente: un lettore solo (`buildStudentsReportHtml`, inv. 6) |

Domande-filtro: core puro per schema, clamp, report (sì) · verità con un proprietario: la
view è una, il dock è uno, il report è uno · cartelle: si scrive dove già si scrive
(`Studio Attivo/Prove/`) · spegnimento: la spunta è spenta per default, il launcher-console
sostituisce quello di oggi (che era già una sostituzione del copiato: il modulo di MappAI
resta intatto) · default nuovo: nessuno (la spunta parte spenta; se un giorno partisse
accesa, marcatore di versione, inv. 17) · resa: invariata.

## Prove

```bash
npm test          # launcher-core (validaSchema, voci chiude:false, Avvia conclude) ·
                  # prova-core (+ orientamento, clampSplit, reportMCDaStato) · riuso-divergenza
npm run serve     # browser: http://localhost:8766/index.html?vault=dev/vault.json
```
Nel browser: `resize_window` 768×1024 (portrait) e 1024×768 (landscape) — il pannello di
Claude emula il viewport; l'orientamento vero si misura solo sull'iPad. Misure da leggere
nel DOM: classe del dock, `getBoundingClientRect` del dock dopo un drag simulato con
`PointerEvent`, la view viva dopo il cambio di orientamento (stesso nodo `.sc-wrap`).

## Verifica a mano (browser oggi, iPad quando c'è)

1. «Prova» dalla console STUDIA → il launcher occupa tutto lo schermo, colonna a sinistra
   con i tre gruppi, area vuota con l'invito; ESC torna alla mappa.
2. «Domande aperte su misura» → nell'area i campi di oggi più la spunta «Rispondi con la
   mappa accanto»; «Avvia» senza spunta → la prova nel modale come oggi.
3. Con la spunta, iPad sdraiato → mappa a sinistra, prova a destra, la linea si trascina;
   iPad in piedi → mappa sopra, prova sotto, la linea si trascina in verticale; girando
   l'iPad a prova in corso le risposte scritte restano.
4. Consegna in split → esito nel dock, cartella in «Le tue prove», record nella heat map.
5. Set MC con la spunta → una domanda alla volta con verdetto immediato, consegna, report
   in «Le tue prove» (16/24 come dal player). Senza spunta → il player di oggi.
6. Chiudere il dock a metà prova → chiede conferma.

## Non-obiettivi

- Non si stringe il canvas (`#d3-container`) sotto il dock: copre, la mappa resta
  trascinabile. Stringerlo tocca `style.css` (713 `!important`).
- Non si porta il player storico dentro il dock (bivio 1): resta la strada senza split.
- Niente split per Materiali e sintesi oltre a quello che il dock fa già.
- Niente memoria dello split per singola prova: una scelta sola, ricordata.
- Possibile seguito: un tocco sul ramo di una card che centra la mappa sul suo L1.

## Decisioni prese (e revocabili)

1. **Launcher = console**, non un modale gonfiato dal CSS: lo schermo intero è una
   proprietà delle console nel motore, e il box di un modale non ha un gancio CSS.
2. **Le voci di nav non concludono; conclude «Avvia»** — così l'area può ospitare il setup.
3. **Mappa sopra / a sinistra; prova sotto / a destra** (bivio 2).
4. **Split spento per default**, ultima scelta ricordata in `mappai_studente_split`.
5. **MC in split = la view «a scelta»**, report dallo stato (bivio 1).
6. **Il dock copre, non stringe**; **due clamp e due chiavi** (larghezza, altezza).
7. **Chiudere il dock a prova in corso chiede conferma**; girare l'iPad non rimonta la view.
