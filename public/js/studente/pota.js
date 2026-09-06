/*
 * studente/pota.js — i comandi del docente dentro i moduli copiati
 * ---------------------------------------------------------------------------
 * I moduli sono copie verbatim: i comandi che non servono a uno studente
 * (modificare la mappa, generare con l'AI, condividere via QR) si tolgono da
 * FUORI, e un comando inerte è peggio che assente (inv. 21). Tre leve:
 *   · `appState.studentMode = true`: la maniglia che MappAI ha già
 *     (`applyStudentModeUI`) — nasconde i bottoni «genera» della scheda Studio;
 *   · CSS (css/studente.css): ciò che ha un id o un `onclick` stabile;
 *   · qui: il menu contestuale, che si riscrive a ogni apertura con
 *     `innerHTML` — si osserva il DOM (trappola 9: avvolgere `showContextMenu`
 *     non intercetta le chiamate interne) e si tiene una ALLOWLIST.
 */
(function () {
    'use strict';
    if (window.MappAIStudentePota) return;

    /* le azioni del menu contestuale che uno studente può fare */
    var CTX_OK = ['tts', 'test_flashcard', 'test_flashcard_branch', 'status_todo', 'status_review', 'status_done', 'status_none'];
    var FN_OK = ['window.resetZoom', 'window.salvaLayout'];
    function potaCtx(menu) {
        Array.prototype.slice.call(menu.querySelectorAll('.ctx-item')).forEach(function (it) {
            var oc = it.getAttribute('onclick') || '';
            var m = oc.match(/ctxAction\('([a-z_]+)'\)/);
            var tieni = m ? CTX_OK.indexOf(m[1]) >= 0 : FN_OK.some(function (f) { return oc.indexOf(f) >= 0; });
            if (!tieni) it.remove();
        });
        /* separatori orfani in coda o doppi */
        var figli = Array.prototype.slice.call(menu.children);
        figli.forEach(function (el, i) {
            var sep = el.classList && (el.classList.contains('ctx-sep') || (el.className || '').indexOf('h-px') >= 0);
            if (!sep) return;
            var prev = figli[i - 1], next = figli[i + 1];
            if (!prev || !next || !prev.isConnected || !next.isConnected) el.remove();
        });
    }

    /* ── LONG PRESS sui nodi e sulle card (iPad) ─────────────────────────
       MappAI apre i menu col tasto destro. Sul canvas D3 il tocco lungo esiste
       (dentro il drag di mappai-d3-render.js) ma d3-drag ferma la propagazione
       del `touchstart`: un ascoltatore sul contenitore in fase di bolla non lo
       vede mai (è il perché del primo tentativo fallito, 7/9). Nelle viste di
       studio (Albero, Fasci, DAG, Focus) le card hanno un menu proprio —
       Descrizione, Focus vicini/parentela — legato SOLO a `contextmenu`.
       Qui: fase di CATTURA sul contenitore, 500 ms fermi → si sintetizza un
       `contextmenu` sul bersaglio (nodo D3 o card) e ci pensano i loro
       ascoltatori; 15 px di movimento annullano; il click che segue si
       inghiotte, o aprirebbe la scheda del nodo. Se il drag ha già aperto il
       menu del canvas, non si apre due volte. */
    var BERSAGLI = 'g.node-group, svg g[data-op]';
    function longPressNodi(cont) {
        var timer = null, pos = null, inghiotti = 0;
        function stop() { if (timer) { clearTimeout(timer); timer = null; } }
        cont.addEventListener('touchstart', function (e) {
            if (e.touches.length !== 1) return;
            var el = e.target.closest && e.target.closest(BERSAGLI);
            if (!el) return;
            var t0 = e.touches[0]; pos = { x: t0.clientX, y: t0.clientY };
            stop();
            timer = setTimeout(function () {
                timer = null; inghiotti = Date.now(); window.ignoreNextNodeClick = true;
                var menu = document.getElementById('context-menu');
                if (menu && !menu.classList.contains('hidden')) return;      /* il drag l'ha già aperto */
                try {
                    el.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: pos.x, clientY: pos.y, button: 2 }));
                } catch (err) { }
            }, 450);   /* prima dei 500 ms del drag e del gesto lungo di iOS */
        }, { passive: true, capture: true });
        cont.addEventListener('touchmove', function (e) {
            if (!timer || !pos) return;
            var t0 = e.touches[0], dx = t0.clientX - pos.x, dy = t0.clientY - pos.y;
            if (dx * dx + dy * dy > 225) stop();
        }, { passive: true, capture: true });
        cont.addEventListener('touchend', stop, { passive: true, capture: true });
        /* niente stop su `touchcancel`: iOS può annullare il tocco proprio alla soglia del
           suo gesto lungo (il dito è ancora giù) — il menu deve aprirsi lo stesso */
        cont.addEventListener('click', function (e) {
            if (inghiotti && Date.now() - inghiotti < 700) { e.stopPropagation(); e.preventDefault(); inghiotti = 0; }
        }, true);
    }

    function avvia() {
        var cont = document.getElementById('d3-container');
        if (cont) longPressNodi(cont);
        try { if (typeof appState !== 'undefined') appState.studentMode = true; } catch (e) { }
        /* i modelli AI non esistono qui: senza questo, aprire una mappa mostra
           «Inserisci prima una API Key» — un avviso su una cosa che non c'è */
        window.refreshGeminiModels = function () { };
        window.initializeAIProvider = function () { };
        var menu = document.getElementById('context-menu');
        if (menu) {
            potaCtx(menu);
            new MutationObserver(function () { potaCtx(menu); }).observe(menu, { childList: true });
        }
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', avvia); else avvia();
    window.MappAIStudentePota = { CTX_OK: CTX_OK, potaCtx: potaCtx };
}());
