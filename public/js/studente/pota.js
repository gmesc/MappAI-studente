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

    function avvia() {
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
