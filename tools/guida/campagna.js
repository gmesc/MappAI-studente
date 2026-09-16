#!/usr/bin/env node
/* tools/guida/campagna.js — le fotografie di public/guida/, dall'app VERA sul demo «La carta»
   -------------------------------------------------------------------------
   Prerequisiti (solo sviluppo, Node >= 22):
     python3 -m http.server 8766 -d public            (o .claude/launch.json)
     Chrome headless con --remote-debugging-port=9377 e un --user-data-dir suo
     node tools/guida/campagna.js [dal-passo]
   Riparte SEMPRE da zero (`?pulisci=1`, localStorage vuoto): iPad Air sdraiato,
   1180×820 @2x. Il provider dei file si dichiara «ipad» prima del boot, così la
   console mostra ciò che vede l'allievo (niente «Apri una cartella»). */
'use strict';
const L = require('./lab.js');
const URL0 = 'http://localhost:8766/';
const W = 1180, H = 820;
const DA = process.argv[2] || '';

let attivo = !DA;
async function passo(nome, fn) {
  if (!attivo && nome.indexOf(DA) === 0) attivo = true;
  if (!attivo) return;
  process.stdout.write('▸ ' + nome + '\n');
  try { await fn(); } catch (e) { console.log('  ✗ ' + e.message); }
  await L.pulito();
}
const foto = (nome, o) => L.scatta(nome, Object.assign({ formato: 'webp', qualita: 82 }, o || {}));

/* ── i gesti col dito ─────────────────────────────────────────────────── */
async function tocca(p, tieni) {
  await L.invia('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: p.x, y: p.y }] });
  if (tieni) await L.pausa(tieni);
  await L.invia('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await L.pausa(350);
  return p;
}
/* l'elemento visibile (il più in alto nel DOM che combacia) il cui testo è `testo`
   (esatto, o che comincia con — `inizio:true`) → rettangolo e centro */
async function dove(testo, o) {
  o = o || {};
  const r = await L.val(`(()=>{
    const t=${JSON.stringify(testo)}, inizio=${!!o.inizio}, sel=${JSON.stringify(o.sel || 'button,[role=button],[role=radio],[role=checkbox],a,label,.sd-riga,li,div,span')};
    const vis=e=>{const r=e.getBoundingClientRect(); if(!r.width||!r.height) return false; const s=getComputedStyle(e); return s.visibility!=='hidden'&&s.display!=='none'&&r.bottom>0&&r.top<innerHeight;};
    const norm=s=>String(s||'').replace(/\\s+/g,' ').trim();
    const c=[...document.querySelectorAll(sel)].filter(e=>vis(e)&&(inizio?norm(e.textContent).startsWith(t):norm(e.textContent)===t));
    /* il più interno: nessun altro candidato dentro */
    const e=c.filter(x=>!c.some(y=>y!==x&&x.contains(y))).pop();
    if(!e) return null; const r=e.getBoundingClientRect();
    return {x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2),r:{x:r.left,y:r.top,w:r.width,h:r.height}};
  })()`);
  if (!r) throw new Error('non trovo: ' + testo);
  return r;
}
/* lo stesso, dentro l'iframe del pannello (la sintesi è un documento suo) */
async function doveIframe(testo) {
  const r = await L.val(`(()=>{
    const t=${JSON.stringify(testo)};
    for (const f of document.querySelectorAll('iframe')) {
      const fr=f.getBoundingClientRect(); if(!fr.width) continue;
      let d; try { d=f.contentDocument; } catch(e) { continue; } if(!d) continue;
      const e=[...d.querySelectorAll('button')].find(b=>b.textContent.replace(/\\s+/g,' ').trim()===t&&b.getBoundingClientRect().width);
      if(e){ const r=e.getBoundingClientRect(); return {x:fr.left+r.left+r.width/2,y:fr.top+r.top+r.height/2,r:{x:fr.left+r.left,y:fr.top+r.top,w:r.width,h:r.height}}; }
    }
    return null; })()`);
  if (!r) throw new Error('non trovo nell\'iframe: ' + testo);
  return r;
}
async function toccaTesto(testo, o) { return tocca(await dove(testo, o)); }
async function toccaSel(sel) { const c = await L.centro(sel); return tocca(c); }
const rettDi = async (testo, o) => (await dove(testo, o)).r;
const aspettaTesto = (testo, ms) => L.finoA(`document.body.innerText.includes(${JSON.stringify(testo)})`, ms || 8000);
/* il toast «Vault caricato…» copre l'angolo in alto a destra: si aspetta che vada via */
const senzaToast = () => L.finoA(`![...document.querySelectorAll('div')].some(d=>/Vault caricato/.test(d.textContent)&&d.children.length<4&&d.getBoundingClientRect().height>0)`, 9000);
const allaConsole = async () => { await toccaSel('#floating-actions-toggle'); await L.pausa(500); await toccaTesto('Torna a STUDIA'); await L.pausa(1500); };

(async () => {
  await L.collega();
  await L.finestra(W, H);
  await L.invia('Page.enable');
  /* il provider «ipad» prima che l'adapter lo dichiari */
  await L.invia('Page.addScriptToEvaluateOnNewDocument', { source: `(function(){var fs;Object.defineProperty(window,'MappAIStudenteFS',{configurable:true,get:function(){return fs},set:function(v){if(v)v.provider='ipad';fs=v}});})();` });
  await L.val(`location.href=${JSON.stringify(URL0)}; 1`);
  await L.pausa(2500);
  await L.val(`(async()=>{ try{localStorage.clear();}catch(e){} try{ for (const d of (await indexedDB.databases())) indexedDB.deleteDatabase(d.name); }catch(e){} location.href=${JSON.stringify(URL0 + '?pulisci=1')}; return 1; })()`);
  await L.pausa(6000);
  await aspettaTesto('La carta', 15000);

  await passo('01-console', async () => {
    await toccaTesto('La carta2A', { sel: 'button' });
    await aspettaTesto('Le tue prove');
    await L.pausa(1200);
    await L.numeri([
      { rect: await rettDi('La carta2A', { sel: 'button' }), n: 1, dove: 'r', dx: -40 },
      { rect: await rettDi('Mappa', { sel: 'button' }), n: 2 },
      { rect: await rettDi('La scheda del docente', { sel: 'button,div,span' }), n: 3, dove: 'l' },
      { rect: await rettDi('Sintesi', { sel: 'button,div,span' }), n: 4, dove: 'l' },
      { rect: await rettDi('Le tue prove', { sel: 'button,div,span' }), n: 5, dove: 'l' },
      { sel: '[aria-label="Apri la Cabina"], [title="Apri la Cabina"]', n: 6, dove: 'b' }
    ]);
    await foto('01-console');
  });

  await passo('02-mappa', async () => {
    await toccaTesto('Mappa', { sel: 'button' });
    await L.pausa(2500); await senzaToast(); await L.pausa(400);
    await L.numeri([
      { sel: '#floating-actions-toggle', n: 1, dove: 't' },
      { sel: '#card-btn-layout', n: 2, dove: 't' },
      { sel: '#card-btn-labels', n: 3, dove: 't' },
      { rect: await rettDi('Mostra fino al livello', { sel: 'div,span,label' }), n: 4, dove: 't' }
    ]);
    await foto('02-mappa');
  });

  await passo('03-menu-nodo', async () => {
    const p = await dove('Papiro', { sel: 'div,span,foreignObject *,text' });
    await tocca(p, 800);
    await L.pausa(600);
    await L.cornice(await rettDi('Descrizione', { sel: 'button,div,li' }), { margine: 4 });
    await foto('03-menu-nodo');
  });

  await passo('04-descrizione', async () => {
    await toccaTesto('Descrizione', { sel: 'button,div,li' });
    await L.pausa(1200);
    await foto('04-descrizione');
    await L.tasto('Escape'); await L.pausa(400);
    await L.val(`(()=>{ const b=[...document.querySelectorAll('button')].find(b=>/^(Chiudi|×|✕)$/.test(b.textContent.trim())&&b.getBoundingClientRect().width); if(b) b.click(); return 1; })()`);
    await L.pausa(600);
  });

  await passo('05-azioni', async () => {
    await toccaSel('#floating-actions-toggle');
    await L.pausa(600);
    await L.cornice(await rettDi('Materiali', { sel: 'button' }), { margine: 6 });
    await foto('05-azioni');
  });

  await passo('06-materiali', async () => {
    await toccaTesto('Materiali', { sel: 'button' });
    await L.pausa(1800);
    await toccaSel('#floating-actions-toggle'); await L.pausa(600);
    await foto('06-materiali');
  });

  await passo('07-sintesi', async () => {
    await toccaTesto('SintesiSintesi-La carta - TM Sans.html', { sel: '.sd-riga' });
    await L.pausa(3000);
    await L.numeri([
      { rect: (await doveIframe('▶').catch(() => dove('▶', { sel: 'button' }))).r, n: 1, dove: 'b' },
      { rect: (await doveIframe('Aa x1').catch(() => dove('Aa x1', { sel: 'button' }))).r, n: 2, dove: 'b' },
      { rect: (await doveIframe('Evidenzia: sì').catch(() => dove('Evidenzia: sì', { sel: 'button' }))).r, n: 3, dove: 'b' },
      { rect: (await doveIframe('Riga: no').catch(() => dove('Riga: no', { sel: 'button' }))).r, n: 4, dove: 'b' }
    ]);
    await foto('07-sintesi');
  });

  await passo('08-flashcard', async () => {
    await tocca({ x: 1144, y: 22 }); await L.pausa(800);   /* la × del pannello (dentro la fila dei comandi del documento) */
    await allaConsole();
    await toccaTesto('Flashcard', { sel: 'button' });
    await aspettaTesto('Sessione di Studio', 10000);
    await L.pausa(1500); await senzaToast();
    await foto('08-flashcard-fronte');
    await toccaTesto('Clicca per girare', { inizio: true, sel: 'span,div,p' });
    await L.pausa(1200);
    await foto('09-flashcard-retro');
    await toccaTesto('😎 Sapevo e ricordavo', { sel: 'button' });
    await L.pausa(800);
  });

  await passo('10-studio-attivo', async () => {
    await L.tasto('Escape'); await L.pausa(500);
    await L.val(`(()=>{ if(window.closeStudySession) try{closeStudySession()}catch(e){} const b=[...document.querySelectorAll('button')].find(b=>b.title==='Chiudi'||b.getAttribute('aria-label')==='Chiudi'); return 1; })()`);
    await L.val(`location.href=${JSON.stringify(URL0)}; 1`);
    await L.pausa(5000);
    await toccaTesto('La carta2A', { sel: 'button' }); await L.pausa(1000);
    await toccaTesto('Prova', { sel: 'button' });
    await aspettaTesto('Scegli un\'attività nella colonna a sinistra.', 10000);
    await L.pausa(2500); await senzaToast();
    await L.numeri([
      { rect: await rettDi('Autotest', { sel: 'div,span,h3' }), n: 1, dove: 'r' },
      { rect: await rettDi('Viste ed esercizi rapidi', { sel: 'div,span,h3' }), n: 2, dove: 'r' },
      { rect: await rettDi('Strumenti', { sel: 'div,span,h3' }), n: 3, dove: 'r' }
    ]);
    await foto('10-studio-attivo');
  });

  await passo('11-mc', async () => {
    await toccaTesto('Un set pronto a scelta multipla', { inizio: true, sel: 'button' });
    await L.pausa(900);
    const spunta = await L.val(`(()=>{const i=[...document.querySelectorAll('input[type=checkbox]')].find(i=>i.getBoundingClientRect().width); if(!i) return null; const r=i.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2,on:i.checked};})()`);
    if (spunta && !spunta.on) { await tocca(spunta); await L.pausa(400); }
    await foto('11-set-mc');
    await toccaTesto('La carta — Scelta Multipla · causa9 domande', { sel: 'button' });
    await L.pausa(600);
    await toccaTesto('Avvia', { sel: 'button' });
    await L.pausa(3500);
    const opz = await L.val(`[...document.querySelectorAll('.sc-opt')].filter(b=>b.getBoundingClientRect().width).length`);
    if (!opz) throw new Error('nessuna opzione a schermo');
    const c = await L.centro('.sc-opt');
    await tocca(c);
    await L.pausa(1200);
    await foto('12-mc-verdetto');
  });

  await passo('13-su-misura', async () => {
    await L.val(`location.href=${JSON.stringify(URL0)}; 1`);
    await L.pausa(5000);
    await toccaTesto('La carta2A', { sel: 'button' }); await L.pausa(1000);
    await toccaTesto('Prova', { sel: 'button' });
    await aspettaTesto('Scegli un\'attività nella colonna a sinistra.', 10000);
    await L.pausa(2500); await senzaToast();
    await toccaTesto('Domande aperte su misura', { inizio: true, sel: 'button' });
    await L.pausa(900);
    await L.numeri([
      { rect: await rettDi('Tutta la mappa', { sel: 'label,span,div' }), n: 1, dove: 'l', dx: -24 },
      { rect: await rettDi('Tutti gli angoli', { sel: 'label,span,div' }), n: 2, dove: 'l', dx: -24 },
      { rect: await rettDi('Rispondi con la mappa accanto (schermo diviso)', { sel: 'label,span,div' }), n: 3, dove: 'l', dx: -24 },
      { rect: await rettDi('Avvia', { sel: 'button' }), n: 4, dove: 'tr' }
    ]);
    await foto('13-su-misura');
  });

  await passo('14-tre-colori', async () => {
    const chk = await L.val(`(()=>{const i=[...document.querySelectorAll('input[type=checkbox]')].find(i=>i.getBoundingClientRect().width); if(!i) return null; const r=i.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2,on:i.checked};})()`);
    if (chk && !chk.on) await tocca(chk);
    await toccaTesto('Avvia', { sel: 'button' });
    await L.pausa(3500);
    /* le prime due domande: una verde, una arancione */
    const carte = await L.val(`[...document.querySelectorAll('.sc-card, article')].filter(a=>a.getBoundingClientRect().width).slice(0,3).map(a=>{const r=a.querySelector('.sc-q, p, div:last-child')||a; const b=a.getBoundingClientRect(); return {x:b.left+b.width/2,y:b.top+28};})`);
    if (!carte || !carte.length) throw new Error('nessuna domanda');
    await tocca(carte[0]); await L.pausa(700);
    await toccaTesto('ho capito cosa rispondere', { sel: 'button' }); await L.pausa(700);
    const c2 = await L.val(`[...document.querySelectorAll('.sc-card, article')].filter(a=>a.getBoundingClientRect().width&&!a.classList.contains('letta')).slice(0,1).map(a=>{const b=a.getBoundingClientRect(); return {x:b.left+b.width/2,y:b.top+28};})`);
    if (c2 && c2.length) { await tocca(c2[0]); await L.pausa(700); }
    await L.pausa(500);
    await foto('14-tre-colori');
  });

  await passo('15-rispondi', async () => {
    await toccaTesto('Comincia a rispondere', { sel: 'button' });
    await L.pausa(1200);
    await L.val(`(()=>{const t=document.querySelector('.sc-ta'); if(!t) return 0; t.focus(); return 1;})()`);
    await L.scrivi('La pergamena era fatta con la pelle degli animali, pulita, tesa e seccata. Era più resistente del papiro.');
    await L.val(`(()=>{const t=document.querySelector('.sc-ta'); if(t) t.blur(); return 1;})()`);
    await toccaTesto('sicuro', { sel: 'button' });
    await L.pausa(800);
    await foto('15-rispondi');
  });

  await passo('16-consegna', async () => {
    await toccaTesto('Consegna', { sel: 'button' });
    await L.pausa(2500);
    await foto('16-consegnato');
    await L.pausa(4000);
  });

  await passo('17-le-tue-prove', async () => {
    await L.val(`location.href=${JSON.stringify(URL0)}; 1`);
    await L.pausa(5000);
    await toccaTesto('La carta2A', { sel: 'button' });
    await L.pausa(2500);
    const invia = await L.val(`(()=>{const b=document.querySelector('[aria-label="Consegna al docente"],[title="Consegna al docente"]'); if(!b) return null; const r=b.getBoundingClientRect(); return {x:r.left,y:r.top,w:r.width,h:r.height};})()`);
    const cart = await L.val(`(()=>{const b=document.querySelector('[aria-label="Apri nei File"],[title="Apri nei File"]'); if(!b) return null; const r=b.getBoundingClientRect(); return {x:r.left,y:r.top,w:r.width,h:r.height};})()`);
    const v = [];
    if (invia) v.push({ rect: invia, n: 1, dove: 't' });
    if (cart) v.push({ rect: cart, n: 2, dove: 't' });
    await L.numeri(v);
    const t = await L.rect('body');
    await foto('17-le-tue-prove');
  });

  await passo('18-heatmap', async () => {
    await toccaTesto('Prova', { sel: 'button' });
    await aspettaTesto('Scegli un\'attività nella colonna a sinistra.', 10000);
    await L.pausa(2500); await senzaToast();
    await toccaTesto('Heat map padronanza', { inizio: true, sel: 'button' });
    await L.pausa(1200);
    await toccaTesto('‹ Torna a STUDIA', { inizio: true, sel: 'button' }); await L.pausa(1500);
    await toccaTesto('Mappa', { sel: 'button' });
    await L.pausa(3000); await senzaToast(); await L.pausa(400);
    await foto('18-heatmap');
  });

  await passo('20-docente', async () => {
    await L.val(`location.href=${JSON.stringify(URL0)}; 1`);
    await L.pausa(5000);
    await toccaTesto('La carta2A', { sel: 'button' }); await L.pausa(1500);
    await toccaTesto('Docente', { sel: 'button' });
    await L.pausa(1500);
    await foto('20-docente');
    await toccaTesto('Numero personale e classe', { inizio: true, sel: 'button' });
    await L.pausa(1200);
    await foto('21-chi-sei');
  });

  await passo('22-cabina', async () => {
    await L.val(`location.href=${JSON.stringify(URL0)}; 1`);
    await L.pausa(5000);
    await L.val(`window.openCabina && window.openCabina(); 1`);
    await L.pausa(1500);
    await foto('22-cabina');
  });

  process.exit(0);
})();
