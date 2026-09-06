# Codice riusato da MappAI

MappAI studente **non importa nulla da MappAI a runtime**: i moduli che le servono sono
**copie byte-per-byte**, elencate in un posto solo — `tools/sincronizza.js` (`FILES` e
`CARTELLE`) — e copiate da `../MappAI re/public/` con quello script. È la regola del
misuratore, portata a scala: qui le copie sono ~70 file (il canvas intero, la Vista studio,
il motore dei modali, il player, la superficie «a scelta», i caratteri).

Il prezzo è la divergenza silenziosa. `tests/riuso-divergenza.test.js` confronta gli hash
con gli originali e **fallisce dicendo quali file sono cambiati di là**; se MappAI re non è
sul disco il test si salta (un rosso per un file assente addestrerebbe a ignorare i rossi).

## Le tre regole

1. **Un file copiato non si modifica mai qui.** Se serve un comportamento diverso, vive in
   `public/js/studente/` (l'adapter, la potatura, la console) o in `css/studente.css`. Se il
   cambiamento è giusto anche per MappAI, si fa DI LÀ e poi si risincronizza (è successo con
   `mappai-scelta-view.js`: le opzioni `mostraAngolo`/`chip`/`raggruppa` sono nate in MappAI,
   fase 0 del piano).
2. **`public/index.html` è nostro, ma i suoi blocchi vengono da MappAI.** Sono stati
   estratti UNA volta per id con `tools/estrai-index.py` (i blocchi che il canvas e le
   attività pretendono: `#map-view`, `#source-modal`, `#study-player-modal`…); il file è poi
   scritto a mano (menu flottante, `#landing-view` vuoto, script). Quando MappAI cambia il
   markup del canvas, `python3 tools/estrai-index.py --confronta` dice quali blocchi
   divergono — è il **debito dichiarato** di questo disegno, e si paga a mano.
3. **Ciò che il markup copiato disegna e qui non deve comparire si toglie da fuori** (CSS per
   selettore in `css/studente.css`, il menu contestuale in `pota.js` con una allowlist), mai
   ritoccando la copia.

## Come si aggiorna

```bash
node tools/sincronizza.js            # copia ciò che è cambiato, dice cosa (poi bump del `?v=` di quel file in index.html)
npm test                             # riuso-divergenza verde, studia-core verde
python3 tools/estrai-index.py --confronta   # i blocchi di index.html: uguale / DIVERSO
```

Dopo una sincronizzazione si riapre l'app (`npm run serve`, poi
`http://localhost:8766/index.html?vault=dev/vault.json` con un vault impacchettato da
`tools/vault-json.js`) e si rifanno i gesti di `docs/HANDOFF.md`: un modulo nuovo di MappAI
può leggere un identificatore che qui non esiste (`isCapacitor`, `tutorState`: entrambi
sono già stub in `studente/adapter.js` e `studente/boot.js`).
