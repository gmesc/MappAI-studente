#!/usr/bin/env node
/* tools/appstore/campagna.js — gli screenshot per l'App Store, dall'app VERA
   -------------------------------------------------------------------------
   Stessa strada della guida (tools/guida/lab.js): l'app web del bundle iOS in
   Chrome headless, pilotata via CDP, alle misure dell'iPad Pro 13":
   1376×1032 @2x → 2752×2064 (orizzontale) e 1032×1376 @2x → 2064×2752
   (verticale), le due misure che App Store Connect accetta per l'iPad 13".
   Screenshot PURI: niente numeri, cornici o didascalie.

   Due mappe (Giacomo, 17/9/26): «Svizzera e 2a GM» per la mappa e la scheda
   del nodo (48 nodi, si vede una mappa vera); «La carta» per sintesi,
   flashcard e prove (è l'unica che le porta).

   Prerequisiti (solo sviluppo, Node >= 22):
     il pacchetto con le due mappe in public/dev/vault.json (demo + Svizzera,
       vedi docs/APP-STORE.md › Screenshot)
     python3 -m http.server 8766 -d public
     Chrome headless --remote-debugging-port=9377 --hide-scrollbars
     node tools/appstore/campagna.js [orizzontale|verticale] [dal-passo]
   Le foto vanno in resources/app-store/<orientamento>/ (fuori da git). */
'use strict';
const path = require('path');
const fs = require('fs');

const ORIENT = process.argv[2] === 'verticale' ? 'verticale' : 'orizzontale';
const DA = process.argv[3] || '';
const DIR = path.join(__dirname, '..', '..', 'resources', 'app-store', ORIENT);
fs.mkdirSync(DIR, { recursive: true });
process.env.IMG_DIR = DIR;
const L = require('../guida/lab.js');

const W = ORIENT === 'verticale' ? 1032 : 1376, H = ORIENT === 'verticale' ? 1376 : 1032;
const URL0 = 'http://localhost:8766/';

let attivo = !DA;
async function passo(nome, fn) {
  if (!attivo && nome.indexOf(DA) === 0) attivo = true;
  if (!attivo) return;
  process.stdout.write('▸ ' + nome + '\n');
  try { await fn(); } catch (e) { console.log('  ✗ ' + e.message); }
  await L.pulito();
}
const foto = (nome) => L.scatta(nome, { formato: 'png' });

/* ── i gesti col dito (come la guida) ─────────────────────────────────── */
async function tocca(p, tieni) {
  await L.invia('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: p.x, y: p.y }] });
  if (tieni) await L.pausa(tieni);
  await L.invia('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await L.pausa(350);
  return p;
}
async function dove(testo, o) {
  o = o || {};
  const r = await L.val(`(()=>{
    const t=${JSON.stringify(testo)}, inizio=${!!o.inizio}, sel=${JSON.stringify(o.sel || 'button,[role=button],a,label,.sd-riga,li,div,span')};
    const vis=e=>{const r=e.getBoundingClientRect(); if(!r.width||!r.height) return false; const s=getComputedStyle(e); return s.visibility!=='hidden'&&s.display!=='none'&&r.bottom>0&&r.top<innerHeight;};
    const norm=s=>String(s||'').replace(/\\s+/g,' ').trim();
    const c=[...document.querySelectorAll(sel)].filter(e=>vis(e)&&(inizio?norm(e.textContent).startsWith(t):norm(e.textContent)===t));
    const e=c.filter(x=>!c.some(y=>y!==x&&x.contains(y))).pop();
    if(!e) return null; const r=e.getBoundingClientRect();
    return {x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)};
  })()`);
  if (!r) throw new Error('non trovo: ' + testo);
  return r;
}
const toccaTesto = async (testo, o) => tocca(await dove(testo, o));
const aspettaTesto = (testo, ms) => L.finoA(`document.body.innerText.includes(${JSON.stringify(testo)})`, ms || 10000);
const senzaToast = () => L.finoA(`![...document.querySelectorAll('div')].some(d=>/Vault caricato|mappa di prova/.test(d.textContent)&&d.children.length<4&&d.getBoundingClientRect().height>0)`, 9000);

/* la vista della mappa si cambia col bottone della barra, come l'allievo:
   `setMotore` da solo lascerebbe sulla barra l'etichetta della vista di prima */
async function vista(modo) {
  for (let i = 0; i < 5; i++) {
    if (await L.val(`MappAIStudioView.profile().mode`) === modo) return;
    await tocca(await L.centro('#card-btn-layout'));
    await L.pausa(1500);
  }
  throw new Error('vista ' + modo + ' non raggiunta');
}
/* un nodo nella vista di studio, dal suo titolo: il punto dove toccarlo perché
   il menu (che si apre sotto il dito) non copra l'etichetta — il bordo basso a sinistra */
async function nodo(etichetta) {
  const p = await L.val(`(()=>{ const g=[...document.querySelectorAll('#studio-svg g[data-op]')].find(g=>((g.querySelector('title')||g).textContent||'').replace(/\\s+/g,' ').trim().startsWith(${JSON.stringify(etichetta)}));
    if(!g) return null; const r=g.getBoundingClientRect(); return {x:Math.round(r.left+8), y:Math.round(r.bottom-3)}; })()`);
  if (!p) throw new Error('nodo non trovato: ' + etichetta);
  return p;
}
/* Prova › Domande aperte su misura, tutti gli angoli; con o senza la mappa accanto */
async function domandeSuMisura(split) {
  await daCapo();
  await toccaTesto('La carta2A', { sel: 'button' });
  await L.pausa(1000);
  await toccaTesto('Prova', { sel: 'button' });
  await aspettaTesto('Scegli un\'attività nella colonna a sinistra.', 12000);
  await L.pausa(2500); await senzaToast();
  await toccaTesto('Domande aperte su misura', { inizio: true, sel: 'button' });
  await L.pausa(900);
  const chk = await L.val(`(()=>{const i=[...document.querySelectorAll('input[type=checkbox]')].find(i=>i.getBoundingClientRect().width); if(!i) return null; const r=i.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2,on:i.checked};})()`);
  if (chk && chk.on !== split) await tocca(chk);
  await toccaTesto('Avvia', { sel: 'button' });
  await L.pausa(3500);
}

/* da capo: la console con le due mappe, come la vede l'allievo */
async function daCapo() {
  await L.val(`location.href=${JSON.stringify(URL0 + '?nc=' + Date.now())}; 1`);
  await L.pausa(4000);
  await aspettaTesto('La carta', 15000);
  await L.pausa(800);
}

(async () => {
  await L.collega();
  await L.finestra(W, H);
  await L.invia('Page.enable');
  /* il provider «ipad» prima che l'adapter lo dichiari: la console mostra ciò che
     vede l'allievo (niente «Apri una cartella») */
  await L.invia('Page.addScriptToEvaluateOnNewDocument', { source: `(function(){var fs;Object.defineProperty(window,'MappAIStudenteFS',{configurable:true,get:function(){return fs},set:function(v){if(v)v.provider='ipad';fs=v}});})();` });
  /* come sull'iPad: barre di scorrimento sovrapposte (niente gutter di 6 px che
     `scrollbar-gutter: stable` riserva in Chrome), e voce muta — il karaoke
     avanza sul tempo anche senza suono, e la campagna non parla nella stanza */
  await L.invia('Page.addScriptToEvaluateOnNewDocument', { source: `(function(){
    document.addEventListener('DOMContentLoaded', function(){ var st=document.createElement('style'); st.textContent='html,body{scrollbar-gutter:auto!important}'; document.head.appendChild(st); });
    try { speechSynthesis.speak = function(){}; } catch(e) {}
    try { localStorage.setItem('mappai_tts_effetto','sottolinea'); localStorage.setItem('mappai_tts_scala','1'); } catch(e) {}
  })();` });
  await L.val(`location.href=${JSON.stringify(URL0)}; 1`);
  await L.pausa(2500);
  await L.val(`(async()=>{ try{localStorage.clear();}catch(e){} try{ for (const d of (await indexedDB.databases())) indexedDB.deleteDatabase(d.name); }catch(e){}
    localStorage.setItem('mappai_studente_demo','1');
    location.href=${JSON.stringify(URL0 + '?pulisci=1&vault=dev/vault.json')}; return 1; })()`);
  await L.pausa(7000);
  await aspettaTesto('Svizzera e 2a GM', 20000);

  /* la casa dello studente APPENA APERTA (21/9): nessuna mappa scelta, il cerchio
     «Ricevi dal docente» al centro e sotto la nota che dice dove finiscono i file */
  await passo('00-landing', async () => {
    await daCapo();
    await L.finoA(`!!document.querySelector('.mn-card[data-mod="ricevi"]')`, 8000);
    await L.pausa(1200);
    await foto('00-landing');
  });

  await passo('01-console', async () => {
    await toccaTesto('La carta2A', { sel: 'button' });
    await aspettaTesto('Le tue prove');
    await L.pausa(1500);
    await foto('01-console');
  });

  /* ── «Svizzera e 2a GM»: la mappa, il menu del nodo, la scheda ──────── */
  await passo('02-mappa', async () => {
    await daCapo();
    await toccaTesto('Svizzera e 2a GM4R', { sel: 'button' });
    await L.pausa(1200);
    await toccaTesto('Mappa', { sel: 'button' });
    await L.finoA(`window.appState && appState.db && appState.db.nodes && appState.db.nodes.length > 40`, 15000);
    await L.pausa(2500); await senzaToast();
    await vista('fasci');
    await L.pausa(1200);
    /* un filo più piccola, verso l'alto: i nodi più in basso non finiscono sotto la
       barra dei comandi (è lo zoom della rotella di d3, come col trackpad) */
    if (ORIENT === 'orizzontale') {   /* in piedi il limite è la larghezza: resta com'è */
      await L.invia('Input.dispatchMouseEvent', { type: 'mouseWheel', x: Math.round(W / 2), y: Math.round(H * 0.35), deltaX: 0, deltaY: 110 });
    }
    await L.pausa(900);
    await foto('02-mappa');
  });

  await passo('03-menu-nodo', async () => {
    await tocca(await nodo('Neutralità Elvetica'), 800);
    await L.pausa(700);
    await foto('03-menu-nodo');
  });

  await passo('04-scheda-voce', async () => {
    /* la barra di lettura della scheda compare con un carattere ad alta leggibilità */
    await L.val(`MappAIFont.imposta('atkinson'); 1`);
    await L.pausa(400);
    await toccaTesto('Descrizione', { sel: 'button' });
    await L.finoA(`!!document.querySelector('#modal-a11y-toolbar .mai-tts-play')`, 8000);
    await L.pausa(600);
    await tocca(await L.centro('#modal-a11y-toolbar .mai-tts-play'));
    await L.pausa(2600);   /* il karaoke avanza sul tempo: frase evidenziata, parola sottolineata */
    await foto('04-scheda-voce');
    await tocca(await L.centro('#modal-a11y-toolbar .mai-tts-play'));
  });

  await passo('05-lettura-veloce', async () => {
    await tocca(await L.centro('#modal-a11y-toolbar .mai-fila-bt[aria-label="Lettura veloce"]'));
    await L.finoA(`!!document.querySelector('.mai-lv--in .mai-rsvp')`, 5000);
    await L.pausa(400);
    await L.val(`(()=>{ const p=document.querySelector('.mai-lv--in .mai-rsvp'); p.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true})); return 1; })()`);
    await L.pausa(500);
    await foto('05-lettura-veloce');
    await L.val(`MappAILetturaVeloce.chiudi(); closeSourceModal(); MappAIFont.imposta('space-mono'); 1`);
    await L.pausa(600);
  });

  /* ── «La carta»: sintesi, flashcard, prove ─────────────────────────── */
  await passo('06-sintesi', async () => {
    await daCapo();
    await toccaTesto('La carta2A', { sel: 'button' });
    await L.pausa(1000);
    await toccaTesto('Mappa', { sel: 'button' });
    await L.finoA(`window.appState && appState.db && appState.db.nodes && appState.db.nodes.length > 0 && appState.rootNodeLabel === 'La carta'`, 15000);
    await L.pausa(2500); await senzaToast();
    await vista('td');
    await L.val(`MappAIStudenteDocumenti.apriFile(appState.activeVaultPath, 'Materiale Studio/Sintesi-La carta - TM Sans.html', 'Sintesi-La carta - TM Sans.html'); 1`);
    await L.finoA(`!!document.querySelector('#studente-dock .mai-fila')`, 12000);
    await L.pausa(2000);
    await foto('06-sintesi');
  });

  await passo('07-flashcard', async () => {
    await daCapo();
    await toccaTesto('La carta2A', { sel: 'button' });
    await L.pausa(1000);
    await toccaTesto('Flashcard', { sel: 'button' });
    await aspettaTesto('Sessione di Studio', 12000);
    await L.pausa(1500); await senzaToast();
    await toccaTesto('Clicca per girare', { inizio: true, sel: 'span,div,p' });
    await L.pausa(1200);
    await foto('07-flashcard');
  });

  await passo('08-prova', async () => {
    await domandeSuMisura(false);
    const carte = await L.val(`[...document.querySelectorAll('.sc-card, article')].filter(a=>a.getBoundingClientRect().width).slice(0,2).map(a=>{const b=a.getBoundingClientRect(); return {x:Math.round(b.left+b.width/2),y:Math.round(b.top+28)};})`);
    if (!carte || !carte.length) throw new Error('nessuna domanda');
    await tocca(carte[0]); await L.pausa(700);
    await toccaTesto('ho capito cosa rispondere', { sel: 'button' }); await L.pausa(700);
    const c2 = await L.val(`[...document.querySelectorAll('.sc-card, article')].filter(a=>a.getBoundingClientRect().width&&!a.classList.contains('letta')).slice(0,1).map(a=>{const b=a.getBoundingClientRect(); return {x:Math.round(b.left+b.width/2),y:Math.round(b.top+28)};})`);
    if (c2 && c2.length) { await tocca(c2[0]); await L.pausa(700); }
    await L.pausa(500);
    await foto('08-prova');
  });

  await passo('09-split', async () => {
    await domandeSuMisura(true);
    /* nello schermo diviso le domande stanno nel pannello: se ne prende una, come in 08 */
    const carta = await L.val(`[...document.querySelectorAll('#studente-dock .sc-card, #studente-dock article, .sc-card, article')].filter(a=>a.getBoundingClientRect().width).slice(0,1).map(a=>{const b=a.getBoundingClientRect(); return {x:Math.round(b.left+b.width/2),y:Math.round(b.top+28)};})`);
    if (!carta || !carta.length) throw new Error('nessuna domanda nel pannello');
    await tocca(carta[0]); await L.pausa(700);
    await toccaTesto('ho capito cosa rispondere', { sel: 'button' }); await L.pausa(700);
    await toccaTesto('Comincia a rispondere', { sel: 'button' });
    await L.pausa(1200);
    await L.val(`(()=>{const t=document.querySelector('.sc-ta'); if(!t) return 0; t.focus(); return 1;})()`);
    await L.scrivi('La pergamena era fatta con la pelle degli animali, pulita, tesa e seccata. Era più resistente del papiro.');
    await L.val(`(()=>{const t=document.querySelector('.sc-ta'); if(t) t.blur(); return 1;})()`);
    await L.pausa(800);
    await foto('09-split');
  });

  process.exit(0);
})();
