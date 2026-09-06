#!/usr/bin/env node
/* tools/vault-json.js — un vault VERO impacchettato in un JSON per il browser
   -------------------------------------------------------------------------
   Nel pannello di sviluppo non c'è un iPad né un selettore di cartelle: si
   impacchetta una cartella del disco (sola lettura) in `public/dev/vault.json`
   e l'app la importa con `?vault=dev/vault.json` (adapter, ramo browser).
   `public/dev/` non entra nel repo.

     node tools/vault-json.js "~/Documents/MappAI - file/Mappe/4R/Scienze/Elettricità - MM" [4R/Scienze] */
'use strict';
const fs = require('fs'), path = require('path');
const src = process.argv[2] && process.argv[2].replace(/^~/, process.env.HOME);
const sotto = process.argv[3] || '';
if (!src || !fs.existsSync(path.join(src, 'index.yaml'))) { console.error('serve la cartella di un vault (con index.yaml)'); process.exit(1); }
const nome = path.basename(src);
const out = [];
function walk(d, rel) {
  fs.readdirSync(d, { withFileTypes: true }).forEach(e => {
    if (e.name.charAt(0) === '.') return;
    const p = path.join(d, e.name), r = rel ? rel + '/' + e.name : e.name;
    if (e.isDirectory()) return walk(p, r);
    const st = fs.statSync(p);
    out.push({ rel: (sotto ? sotto + '/' : '') + nome + '/' + r, base64: fs.readFileSync(p).toString('base64'), size: st.size, mtime: st.mtimeMs });
  });
}
walk(src, '');
fs.mkdirSync(path.join(__dirname, '..', 'public', 'dev'), { recursive: true });
const dest = path.join(__dirname, '..', 'public', 'dev', 'vault.json');
fs.writeFileSync(dest, JSON.stringify(out));
console.log(out.length + ' file → ' + dest + ' (' + Math.round(fs.statSync(dest).size / 1048576 * 10) / 10 + ' MB)');
