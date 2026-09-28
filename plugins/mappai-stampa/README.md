# mappai-stampa — «Stampa» sull'iPad

Plugin Capacitor **locale** (vive nel repo, non su npm) che porta la stampa di iOS
dentro MappAI studente. Nasce dal task 0036 (26/9/2026): nella WKWebView
`window.print()` non fa niente — nessun menu, nessun avviso — e la stampante della
sintesi e il «Stampa» della `.mm-doc-bar` erano bottoni muti.

```js
Capacitor.Plugins.Stampa.stampa({ url: 'file:///…/Documents/…/Sintesi.html', titolo: 'Sintesi' })
// → { stampato: true | false }   (false = menu chiuso senza stampare)
```

- `url` è il `file://` VERO del documento (`Filesystem.getUri`, prima di `convertFileSrc`).
- **PDF** → a `UIPrintInteractionController` così com'è (`printingItem`).
- **HTML** → caricato in una `WKWebView` fuori schermo (lettura su tutta `Documents`, così
  immagini, formule e audio accanto si risolvono), poi stampato col suo
  `viewPrintFormatter()`: vale il `@media print` del documento, le barre `.no-print` spariscono.
- Il menu è quello di iOS: AirPrint, anteprima, «Salva su File» (un PDF). Niente rete.
- Rifiuta con un messaggio leggibile: file mancante, un'altra stampa aperta, documento che
  non si carica in 20 s. Il lato JS (`public/js/studente/stampa.js`) lo mostra in un avviso.

## Perché sta qui e non in `ios/`

`ios/` è generato (`npx cap add ios`) e fuori da git: un file Swift messo lì si perderebbe
alla prima rigenerazione. Questo pacchetto è una dipendenza `file:` in `package.json`; il
CLI di Capacitor lo tratta come un plugin qualunque.

## Dopo una rigenerazione di `ios/`

```bash
npm install          # il collegamento node_modules/mappai-stampa → plugins/mappai-stampa
npx cap sync ios     # lo scrive in ios/App/CapApp-SPM/Package.swift e in packageClassList
```

Controllo: `ios/App/CapApp-SPM/Package.swift` deve avere
`.package(name: "MappaiStampa", …)` e `ios/App/App/capacitor.config.json` deve elencare
`StampaPlugin`. Il nome del pacchetto SPM («MappaiStampa») è quello che il CLI ricava dal
nome npm: se si rinomina il pacchetto, va cambiato anche in `Package.swift`.
