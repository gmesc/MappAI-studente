/* tools/guida/lab.js — pilota MappAI studente in Chrome headless via CDP, per le
   fotografie di public/guida/. Adattato dalla skill guida-app-screenshot.
   Serve Node >= 22 (WebSocket nativo). Solo sviluppo. */
const path = require('path');
const fs = require('fs');

const PORTA = process.env.CDP_PORTA || '9377';
const IMG = process.env.IMG_DIR || path.join(__dirname, '..', '..', 'public', 'guida', 'img');
let ws, id = 0, attesi = new Map();

async function collega() {
  const r = await fetch('http://localhost:' + PORTA + '/json');
  const t = (await r.json()).find((x) => x.type === 'page');
  ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((ok, ko) => { ws.onopen = ok; ws.onerror = ko; });
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && attesi.has(m.id)) { attesi.get(m.id)(m); attesi.delete(m.id); }
  };
}
function invia(method, params) {
  const n = ++id;
  return new Promise((ok) => { attesi.set(n, ok); ws.send(JSON.stringify({ id: n, method, params: params || {} })); });
}
async function val(expr) {
  const r = await invia('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.result && r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails.exception || r.result.exceptionDetails));
  return r.result && r.result.result ? r.result.result.value : undefined;
}
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

/** centro (viewport) di un selettore */
async function centro(sel) {
  const p = await val(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});
    if(!e) return null; const r=e.getBoundingClientRect();
    if(!r.width||!r.height) return null;
    return {x:Math.round(r.left+r.width/2), y:Math.round(r.top+r.height/2), r:{x:r.left,y:r.top,w:r.width,h:r.height}};})()`);
  if (!p) throw new Error('non trovato/visibile: ' + sel);
  return p;
}
async function rect(sel) {
  const p = await val(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});
    if(!e) return null; const r=e.getBoundingClientRect();
    return {x:r.left,y:r.top,w:r.width,h:r.height};})()`);
  if (!p) throw new Error('non trovato: ' + sel);
  return p;
}
async function muovi(x, y) { await invia('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y }); }
async function clicca(sel, opt) {
  const p = typeof sel === 'string' ? await centro(sel) : sel;
  await muovi(p.x, p.y);
  const button = (opt && opt.button) || 'left';
  for (const type of ['mousePressed', 'mouseReleased']) {
    await invia('Input.dispatchMouseEvent', { type, x: p.x, y: p.y, button, clickCount: 1 });
  }
  return p;
}
async function tastoDestro(sel) {
  const p = typeof sel === 'string' ? await centro(sel) : sel;
  await muovi(p.x, p.y);
  await invia('Input.dispatchMouseEvent', { type: 'mousePressed', x: p.x, y: p.y, button: 'right', clickCount: 1 });
  await invia('Input.dispatchMouseEvent', { type: 'mouseReleased', x: p.x, y: p.y, button: 'right', clickCount: 1 });
  return p;
}
async function scrivi(testo) { await invia('Input.insertText', { text: testo }); }
async function tasto(key, opt) {
  const o = Object.assign({ key }, opt || {});
  const mods = (o.meta ? 4 : 0) | (o.shift ? 8 : 0) | (o.ctrl ? 2 : 0) | (o.alt ? 1 : 0);
  const codes = { Enter: { code: 'Enter', windowsVirtualKeyCode: 13 }, Escape: { code: 'Escape', windowsVirtualKeyCode: 27 }, Tab: { code: 'Tab', windowsVirtualKeyCode: 9 } };
  const extra = codes[key] || {};
  await invia('Input.dispatchKeyEvent', Object.assign({ type: 'keyDown', key, modifiers: mods, text: key.length === 1 ? key : undefined }, extra));
  await invia('Input.dispatchKeyEvent', Object.assign({ type: 'keyUp', key, modifiers: mods }, extra));
}

/* ── evidenziazioni in pagina ─────────────────────────────────────── */
const OVERLAY_ID = '__labOverlay';
async function overlayPulisci() {
  await val(`(()=>{ document.querySelectorAll('#${OVERLAY_ID}, .__labCornice').forEach(e=>e.remove()); return 1; })()`);
}
/** puntatore + anello attorno al punto (x,y) in coordinate viewport */
async function puntatore(x, y, opt) {
  const o = Object.assign({ colore: '#f2b705', raggio: 22 }, opt || {});
  await val(`(()=>{
    let h=document.getElementById('${OVERLAY_ID}'); if(!h){ h=document.createElement('div'); h.id='${OVERLAY_ID}';
      h.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:2147483647;'; document.documentElement.appendChild(h); }
    const x=${x}, y=${y}, r=${o.raggio};
    h.innerHTML += '<div style="position:absolute;left:'+(x-r)+'px;top:'+(y-r)+'px;width:'+(2*r)+'px;height:'+(2*r)+'px;border:3px solid ${o.colore};border-radius:50%;box-shadow:0 0 0 3px rgba(255,255,255,.85), 0 0 0 4000px rgba(0,0,0,0);background:rgba(242,183,5,.18)"></div>'
      + '<svg style="position:absolute;left:'+(x-2)+'px;top:'+(y-2)+'px" width="26" height="30" viewBox="0 0 26 30"><path d="M2 2 L2 24 L8 18 L12 27 L16 25 L12 16 L20 16 Z" fill="#111" stroke="#fff" stroke-width="2" stroke-linejoin="round"/></svg>';
    return 1; })()`);
}
/** cornice attorno a un elemento (o rettangolo {x,y,w,h}) */
async function cornice(sel, opt) {
  const o = Object.assign({ colore: '#f2b705', margine: 4, etichetta: '' }, opt || {});
  const r = typeof sel === 'string' ? await rect(sel) : sel;
  await val(`(()=>{
    let h=document.getElementById('${OVERLAY_ID}'); if(!h){ h=document.createElement('div'); h.id='${OVERLAY_ID}';
      h.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:2147483647;'; document.documentElement.appendChild(h); }
    const m=${o.margine};
    const d=document.createElement('div');
    d.style.cssText='position:absolute;left:'+(${r.x}-m)+'px;top:'+(${r.y}-m)+'px;width:'+(${r.w}+2*m)+'px;height:'+(${r.h}+2*m)+'px;border:3px solid ${o.colore};border-radius:8px;box-shadow:0 0 0 3px rgba(255,255,255,.85);';
    ${o.etichetta ? `const e=document.createElement('div'); e.textContent=${JSON.stringify(o.etichetta)}; e.style.cssText='position:absolute;left:-3px;top:-28px;background:${o.colore};color:#111;font:700 13px/1 -apple-system,Helvetica,Arial,sans-serif;padding:6px 8px;border-radius:6px;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,.3)'; d.appendChild(e);` : ''}
    h.appendChild(d); return 1; })()`);
  return r;
}
/** una banda opaca (per appoggiarci i numeri) sotto/sopra un rettangolo */
async function banda(r, opt) {
  const o = Object.assign({ altezza: 34, sotto: true, colore: '#ffffff' }, opt || {});
  const y = o.sotto ? r.y + r.h : r.y - o.altezza;
  await val(`(()=>{
    let h=document.getElementById('${OVERLAY_ID}'); if(!h){ h=document.createElement('div'); h.id='${OVERLAY_ID}';
      h.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:2147483647;'; document.documentElement.appendChild(h); }
    const d=document.createElement('div');
    d.style.cssText='position:absolute;left:${r.x}px;top:${y}px;width:${r.w}px;height:${o.altezza}px;background:${o.colore};';
    h.appendChild(d); return 1; })()`);
}
/** numeri cerchiati su più elementi: [{sel|rect, n}] */
async function numeri(voci, opt) {
  const o = Object.assign({ colore: '#f2b705', dove: 'tl' }, opt || {});
  for (const v of voci) {
    const r = typeof v.sel === 'string' ? await rect(v.sel) : v.rect;
    const dove = v.dove || o.dove;
    let x = r.x - 12, y = r.y - 12;
    if (dove === 'tr') { x = r.x + r.w - 12; y = r.y - 12; }
    if (dove === 'bl') { x = r.x - 12; y = r.y + r.h - 12; }
    if (dove === 'br') { x = r.x + r.w - 12; y = r.y + r.h - 12; }
    if (dove === 'c') { x = r.x + r.w / 2 - 12; y = r.y + r.h / 2 - 12; }
    if (dove === 'l') { x = r.x - 30; y = r.y + r.h / 2 - 12; }
    if (dove === 'r') { x = r.x + r.w + 6; y = r.y + r.h / 2 - 12; }
    if (dove === 'b') { x = r.x + r.w / 2 - 12; y = r.y + r.h + 2; }
    if (dove === 't') { x = r.x + r.w / 2 - 12; y = r.y - 26; }
    if (v.dx) x += v.dx; if (v.dy) y += v.dy;
    await val(`(()=>{
      let h=document.getElementById('${OVERLAY_ID}'); if(!h){ h=document.createElement('div'); h.id='${OVERLAY_ID}';
        h.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:2147483647;'; document.documentElement.appendChild(h); }
      const d=document.createElement('div'); d.textContent=${JSON.stringify(String(v.n))};
      d.style.cssText='position:absolute;left:${x}px;top:${y}px;width:24px;height:24px;border-radius:50%;background:${o.colore};color:#111;font:700 14px/24px -apple-system,Helvetica,Arial,sans-serif;text-align:center;box-shadow:0 0 0 2px #fff,0 1px 4px rgba(0,0,0,.4)';
      h.appendChild(d); return 1; })()`);
  }
}

/* ── screenshot ───────────────────────────────────────────────────── */
async function scatta(nome, opt) {
  const o = Object.assign({ scala: 2, formato: 'png', margine: 12 }, opt || {});
  const params = { format: o.formato, fromSurface: true, captureBeyondViewport: false, optimizeForSpeed: false };
  if (o.formato === 'jpeg' || o.formato === 'webp') params.quality = o.qualita || 90;
  let clip = null;
  if (o.sel) { const r = await rect(o.sel); clip = { x: r.x - o.margine, y: r.y - o.margine, width: r.w + 2 * o.margine, height: r.h + 2 * o.margine }; }
  if (o.clip) clip = o.clip;
  if (clip) {
    const vw = await val('innerWidth'), vh = await val('innerHeight');
    clip.x = Math.max(0, clip.x); clip.y = Math.max(0, clip.y);
    clip.width = Math.min(clip.width, vw - clip.x); clip.height = Math.min(clip.height, vh - clip.y);
    params.clip = { x: clip.x, y: clip.y, width: clip.width, height: clip.height, scale: o.scala };
  }
  const r = await invia('Page.captureScreenshot', params);
  if (!r.result || !r.result.data) throw new Error('screenshot fallito: ' + JSON.stringify(r));
  const f = path.join(IMG, nome + '.' + (o.formato === 'jpeg' ? 'jpg' : o.formato));
  fs.writeFileSync(f, Buffer.from(r.result.data, 'base64'));
  const kb = Math.round(fs.statSync(f).size / 1024);
  console.log('  📷 ' + path.basename(f) + ' (' + kb + ' KB)' + (clip ? ' clip ' + Math.round(clip.width) + '×' + Math.round(clip.height) : ''));
  return f;
}
/* l'iPad: viewport, @2x, touch (i gesti dell'app sono pensati per il dito) */
async function finestra(w, h) {
  await invia('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 2, mobile: false });
  await invia('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await pausa(300);
}
async function finoA(expr, quanto) {
  const fine = Date.now() + (quanto || 12000);
  for (;;) {
    const v = await val(expr);
    if (v) return v;
    if (Date.now() > fine) return null;
    await pausa(200);
  }
}
async function pulito() {
  await overlayPulisci();
  await pausa(150);
}

/** un finto menu a tendina aperto sotto un <select> (i select nativi non si fotografano) */
async function tendinaFinta(sel, opt) {
  const o = Object.assign({ largh: 190, allinea: 'centro' }, opt || {});
  const r = await rect(sel);
  const sx = o.allinea === 'sinistra' ? r.x : r.x + r.w/2 - o.largh/2;
  await val(`(()=>{
    const s=document.querySelector(${JSON.stringify(sel)}); if(!s) return 0;
    let h=document.getElementById('${OVERLAY_ID}'); if(!h){ h=document.createElement('div'); h.id='${OVERLAY_ID}';
      h.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:2147483647;'; document.documentElement.appendChild(h); }
    const box=document.createElement('div');
    box.style.cssText='position:absolute;left:${sx}px;top:${r.y + r.h + 4}px;width:${o.largh}px;background:#fff;border:1px solid #c8c8c8;border-radius:6px;box-shadow:0 8px 24px rgba(0,0,0,.25);padding:4px 0;font:13px/1.2 -apple-system,Helvetica,Arial,sans-serif;color:#111';
    let html='';
    for(const el of s.children){
      if(el.tagName==='OPTGROUP'){ html+='<div style="padding:5px 12px 3px;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#777">'+el.label+'</div>';
        for(const op of el.children){ html+='<div style="padding:5px 12px 5px 22px;'+(op.selected?'background:#2f6df6;color:#fff;':'')+(op.disabled?'color:#999;':'')+'">'+op.textContent+'</div>'; } }
      else { html+='<div style="padding:5px 12px;'+(el.selected?'background:#2f6df6;color:#fff;':'')+(el.disabled?'color:#999;':'')+'">'+el.textContent+'</div>'; }
    }
    box.innerHTML=html; h.appendChild(box); return 1; })()`);
  return r;
}
module.exports = { banda, tendinaFinta, collega, invia, val, centro, rect, muovi, clicca, tastoDestro, scrivi, tasto, puntatore, cornice, numeri, overlayPulisci, scatta, finestra, finoA, pulito, pausa, IMG };
