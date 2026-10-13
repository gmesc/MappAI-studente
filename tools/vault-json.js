#!/usr/bin/env node
/* tools/vault-json.js — un vault VERO impacchettato in un JSON per il browser
   -------------------------------------------------------------------------
   Nel pannello di sviluppo non c'è un iPad né un selettore di cartelle: si
   impacchetta una cartella del disco (sola lettura) in `public/dev/vault.json`
   e l'app la importa con `?vault=dev/vault.json` (adapter, ramo browser).
   `public/dev/` non entra nel repo.

     node tools/vault-json.js "~/Documents/MappAI - file/Mappe/4R/Scienze/Elettricità - MM" [4R/Scienze] [dest.json]
   Con un `dest` sotto public/demo/ si impacchetta il VAULT DIMOSTRATIVO che l'app porta con sé
   (studente/demo.js lo scrive in Documenti al primo avvio): allora entrano solo i file che
   `relVaultStudente` di files-core ammette — la stessa regola dello scambio col docente.
   Con `--aggiungi` il vault si accoda a un `dest` già scritto (il dimostrativo porta due mappe). */
'use strict';
const fs = require('fs'), path = require('path');
const args = process.argv.slice(2).filter(a => a !== '--aggiungi');
const aggiungi = process.argv.includes('--aggiungi');
const src = args[0] && args[0].replace(/^~/, process.env.HOME);
const sotto = args[1] || '';
const destArg = args[2] || '';
const FC = require('../public/js/mappai-files-core.js');
const demo = /public\/demo\//.test(destArg);
if (!src || !fs.existsSync(path.join(src, 'index.yaml'))) { console.error('serve la cartella di un vault (con index.yaml)'); process.exit(1); }
const nome = path.basename(src);
const dest = destArg ? path.resolve(destArg) : path.join(__dirname, '..', 'public', 'dev', 'vault.json');
const out = aggiungi && fs.existsSync(dest) ? JSON.parse(fs.readFileSync(dest, 'utf8')) : [];
function walk(d, rel) {
  fs.readdirSync(d, { withFileTypes: true }).forEach(e => {
    if (e.name.charAt(0) === '.') return;
    const p = path.join(d, e.name), r = rel ? rel + '/' + e.name : e.name;
    if (e.isDirectory()) return walk(p, r);
    if (demo && !FC.relVaultStudente(r)) return;
    const st = fs.statSync(p);
    out.push({ rel: (sotto ? sotto + '/' : '') + nome + '/' + r, base64: fs.readFileSync(p).toString('base64'), size: st.size, mtime: st.mtimeMs });
  });
}
walk(src, '');
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, JSON.stringify(out));
console.log(out.length + ' file → ' + dest + ' (' + Math.round(fs.statSync(dest).size / 1048576 * 10) / 10 + ' MB)');
