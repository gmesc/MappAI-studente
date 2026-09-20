# Le pagine per insegnai.ch

Questa cartella è uno SPECCHIO della radice del sito: i percorsi qui sotto sono
quelli veri. Per pubblicare si copiano sul server così come stanno.

| Qui | Sul sito |
|---|---|
| `mappai/studente/index.html` | `https://insegnai.ch/mappai/studente/` |
| `assets/mappai-studente/*` | `https://insegnai.ch/assets/mappai-studente/*` |
| `../privacy/index.html` | `https://insegnai.ch/mappai/privacy/` (indirizzo già dichiarato ad Apple) |

`style.css` e `navbar.js` NON stanno in git: sono copie scaricate dal sito vivo
per vedere la pagina in locale (`.gitignore`). Sul server ci sono già.

Anteprima: `python3 -m http.server 8799 -d docs/sito`, poi
<http://localhost:8799/mappai/studente/>.

## Prima di pubblicare
- **Il badge App Store è spento** («In arrivo»). Quando l'app è in vendita, in
  `mappai/studente/index.html`: togliere `is-attesa` e lo `<span class="as-nota">`,
  e avvolgere l'immagine in `<a href="https://apps.apple.com/it/app/mappai-studente/id<APPLE ID>">`.
  L'artwork è quello ufficiale italiano: non si ricolora, non si inclina, non si
  ridisegna, e «App Store» non si traduce.
- **Il menu non porta ancora qui**: `navbar.js` va aggiornato con la voce nuova
  (sotto MappAI), altrimenti la pagina si raggiunge solo dal link diretto.
- **Il callout di `/mappai/`** dice che lo scambio via QR «nell'anno 2026/27 non è
  abilitato»: va riscritto, altrimenti il sito si contraddice a due clic.
- Le immagini vengono da `resources/app-store/` (gli screenshot per Apple),
  ridotte a 1400 px di lato lungo.
