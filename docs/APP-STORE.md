# MappAI Studente — la scheda per l'App Store

Testi pronti da incollare in App Store Connect. Lingua principale: italiano. Le
lunghezze rispettano i limiti di Apple (nome 30, sottotitolo 30, testo promozionale
170, parole chiave 100, descrizione 4000).

## Identità

| Campo | Valore |
|---|---|
| Nome | **MappAI Studente** |
| Sottotitolo (30) | **Studia le mappe del docente** |
| Bundle ID | `com.insegnai.mappai.studente` |
| Categoria | Istruzione (secondaria: Produttività) |
| Età | 4+ |
| Prezzo | Gratis |
| Dispositivi | iPad (solo iPad: `UIDeviceFamily = [2]`) |
| Copyright | © 2026 Giacomo Meschini — insegnai.ch |
| Sito di supporto | https://insegnai.ch/mappai/ |
| E-mail di supporto | giacomo@insegnai.ch |
| Informativa privacy (URL) | https://insegnai.ch/mappai/privacy/ *(da pubblicare: il testo è in fondo)* |

## Testo promozionale (170)

Le mappe mentali della tua classe sull'iPad: leggi, ripassa con le flashcard, fai i quiz e consegna le prove al docente con un codice QR. Senza account, senza internet.

## Descrizione (4000)

MappAI Studente è l'app per chi studia con le mappe mentali preparate dal docente con MappAI.

Il docente crea la mappa e i materiali sul suo computer e te li passa con un codice QR. Tu li ritrovi nell'app, ordinati per materia, e li usi quando vuoi: in classe o a casa, anche senza connessione.

CHE COSA PUOI FARE

• Leggere la mappa. La ingrandisci con due dita, tocchi un nodo per leggerne il contenuto, tieni premuto per farlo leggere ad alta voce o per segnarlo come «da studiare», «ripasso» o «imparato». Puoi guardarla come albero, come fasci o come catena di cause ed effetti.

• Aprire i materiali. La sintesi con la voce, i fogli dei nodi, i quiz e le domande stampate dal docente: tutto accanto alla mappa, in un pannello che puoi allargare o restringere.

• Ripassare con le flashcard. Leggi la domanda, pensa la risposta, gira la carta.

• Fare una prova. Un quiz a scelta multipla con il verdetto immediato, oppure un foglio di domande aperte. Puoi scegliere tutta la mappa o un solo ramo, e uno o tutti gli «angoli» della domanda: definizione, causa, conseguenza, esempio, confronto, eccezione, applicazione. Con tutti gli angoli leggi prima la stessa domanda in ogni sua forma e decidi con tre colori a quali sai rispondere: è un modo per capire che cosa hai capito davvero.

• Rispondere con la mappa accanto. Le domande in un pannello, la mappa sempre visibile; la linea fra i due si sposta col dito.

• Vedere i tuoi progressi. La mappa della padronanza colora i rami che sai meglio, «Cosa studiare ora» ti dice da dove ripartire.

• Consegnare al docente. Le risposte diventano un PDF che mandi al docente con lo stesso codice QR, sulla rete Wi-Fi della classe. Il docente le ritrova nella cartella della mappa, sempre con il tuo numero e la tua classe.

SENZA ACCOUNT, SENZA INTERNET

Non c'è nessuna registrazione. Le mappe e le tue risposte restano nella cartella dell'app, che vedi in File. Nulla viene inviato a un server: lo scambio con il docente avviene solo sulla rete locale della classe, quando tu lo decidi.

PER CHI È

Per gli allievi della scuola media e superiore le cui insegnanti e i cui insegnanti usano MappAI, l'app gratuita per Mac e Windows che genera mappe mentali e materiali di studio da un testo. L'app contiene una mappa di prova, «La carta», per provare tutto subito.

Un carattere ad alta leggibilità (TM Sans, Atkinson Hyperlegible) si sceglie dalla Cabina. La guida, scritta per ragazze e ragazzi di 11-12 anni, è dentro l'app.

MappAI Studente è sviluppata da un docente per la scuola. Sito: insegnai.ch/mappai

## Parole chiave (100)

mappe mentali,studio,scuola,flashcard,quiz,ripasso,docente,mappa,memoria,DSA,leggibilità,verifica

## Novità in questa versione (prima pubblicazione)

Prima versione: mappa, materiali, flashcard, prove a scelta multipla e a domande aperte, mappa della padronanza, scambio con il docente via QR sulla rete locale, mappa di prova inclusa.

## Privacy (le domande di App Store Connect)

- **Raccoglie dati?** No. L'app non ha account, non contatta server dello sviluppatore, non usa analytics né pubblicità.
- **Fotocamera** (`NSCameraUsageDescription`): solo per inquadrare il codice QR mostrato dal docente. Le immagini non vengono salvate.
- **Rete locale** (`NSLocalNetworkUsageDescription`): per scaricare la mappa dal computer del docente e consegnare le prove, sulla stessa rete Wi-Fi, solo quando l'allievo lo chiede.
- **Dati dell'allievo**: numero personale e classe restano sull'iPad (impostazioni dell'app) e vengono trasmessi solo al computer del docente al momento della consegna, per ordinare i file.
- **Etichetta privacy**: «Dati non raccolti».

Testo per la pagina privacy sul sito (breve):

> MappAI Studente non raccoglie dati personali e non li trasmette a nessun server. Le mappe, i materiali e le risposte restano nella cartella dell'app sul dispositivo (visibile in File). Lo scambio con il docente avviene esclusivamente sulla rete locale, su richiesta dell'allievo, verso il computer del docente; il numero personale e la classe servono solo a ordinare i file consegnati. La fotocamera è usata unicamente per leggere il codice QR. Nessun tracciamento, nessuna pubblicità, nessun account.

## Note per il revisore (App Review)

> L'app è pensata per allievi che ricevono le mappe dal docente tramite MappAI (app desktop). Per la revisione non serve nessun account né alcun dispositivo esterno: al primo avvio l'app installa una mappa di prova, «La carta», visibile nella colonna di sinistra sotto «Storia». Da lì si possono provare Mappa, Flashcard, Prova (quiz a scelta multipla e domande aperte) e Materiali. Le funzioni «Docente › Ricevi» e «Consegna» richiedono il computer di un docente con MappAI sulla stessa rete Wi-Fi e non sono verificabili in revisione; senza, mostrano un messaggio chiaro e non bloccano nulla.

## Screenshot (rifatti il 21/9/26 — iPad 13", orizzontale e verticale)

In `resources/app-store/orizzontale/` (2752×2064) e `resources/app-store/verticale/` (2064×2752),
le due misure che App Store Connect accetta per l'iPad 13" (valgono anche per gli iPad più piccoli).
Sono DIECI per orientamento, il massimo che App Store Connect accetta.
Screenshot puri, senza didascalie; le foto non stanno in git. Nell'ordine:

1. `00-landing` — la casa appena aperta: il cerchio «Ricevi dal docente» al centro e la nota che dice dove finiscono i progetti ricevuti.
2. `01-console` — la console STUDIA con «La carta» scelta, «Svizzera e 2a GM» nella colonna.
3. `02-mappa` — «Svizzera e 2a GM» in vista Fasci: 48 nodi, i rami colorati.
4. `03-menu-nodo` — il menu del nodo (tocco lungo): Descrizione, Leggi ad alta voce, Lettura veloce, Focus…
5. `04-scheda-voce` — la scheda del nodo mentre la voce legge: frase evidenziata, parola sottolineata.
6. `05-lettura-veloce` — la lettura veloce al posto del testo: una parola, la lettera di fuoco in rosso.
7. `06-sintesi` — «La carta»: la sintesi accanto alla mappa, con la fila di lettura.
8. `07-flashcard` — una carta girata.
9. `08-prova` — le domande aperte su misura con i tre colori del «Perché».
10. `09-split` — la risposta scritta con la mappa accanto.

**Come si rifanno** (l'app web del bundle, in Chrome headless, pilotata via CDP — la stessa strada
della guida; il simulatore restava inaccessibile agli strumenti di questo Mac):

```bash
# il pacchetto con le due mappe: la demo + «Svizzera e 2a GM» nella copia per l'allievo
node tools/vault-json.js "<cartella della copia per l'allievo>/Svizzera e 2a GM" "4R/Storia" /tmp/sv.json
node -e "const f=require('fs');f.mkdirSync('public/dev',{recursive:true});f.writeFileSync('public/dev/vault.json',JSON.stringify(JSON.parse(f.readFileSync('public/demo/vault.json')).concat(JSON.parse(f.readFileSync('/tmp/sv.json')))))"
python3 -m http.server 8766 -d public
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --remote-debugging-port=9377 --user-data-dir=/tmp/chrome-as --hide-scrollbars about:blank
node tools/appstore/campagna.js orizzontale      # poi: verticale
```

Differenze dal dispositivo vero: niente barra di stato iOS e i cursori con la veste di Chrome.
La campagna annulla `scrollbar-gutter` (Chrome riserverebbe 6 px a destra, l'iPad no) e rende
muta la voce (il karaoke avanza sul tempo).

Servono anche l'**icona 1024×1024** (c'è: `resources/icona-1024.png`) e, facoltativa, una **anteprima video** di 15-30 s.

## Prima di inviare (checklist tecnica)

- [ ] `NSAllowsArbitraryLoads` tolto dal plist (resta `NSAllowsLocalNetworking`): Apple chiede una giustificazione per l'HTTP in chiaro.
- [ ] Versione e build in Xcode (1.0 / 1).
- [ ] `npm run demo` rifatto dopo l'ultima generazione della mappa di prova; `public/demo/vault.json` nel repo.
- [ ] Archivio con il team di firma; TestFlight con le classi prima della pubblicazione.
- [ ] Pagina privacy pubblicata su insegnai.ch.
