/*
 * studente/boot.js — ciò che i moduli copiati pretendono e qui non c'è
 * ---------------------------------------------------------------------------
 * Carica PRIMA di app.js. Il «nocciolo duro» del boot di MappAI (misurato:
 * guida → mappa degli script) chiama due nomi che vivono in moduli del
 * docente non copiati: `setTutorState` (mappai-ai-tutor.js, chiamato da
 * directLoadVault) e `systemPromptsConfig` (admin_prompts.js). Qui sono stub
 * dichiarati, non moduli finti. E la veste: `manifesto` la mette lo script in
 * <head> di MappAI (copiato), `mn-bento-app` la metteva mappai-stile-manifesto
 * (non copiato: è della landing). `studente` è il gancio del CSS nostro.
 */
(function () {
    'use strict';
    /* `tutorState` è letto come identificatore nudo da d3-render (`tutorState.nodes[id]`)
       ed effort-view: la FORMA è quella di mappai-ai-tutor.js, vuota per sempre */
    window.tutorState = { sidebar: { history: [] }, nodes: {} };
    window.setTutorState = function () { window.tutorState.nodes = {}; window.tutorState.sidebar = { history: [] }; return window.tutorState; };
    window.systemPromptsConfig = window.systemPromptsConfig || {};
    /* Altri tre nomi del docente che le copie chiamano senza controllo (censimento del 26/9/26,
       statico sulle copie + `typeof` nel reader acceso; c'erano dal primo commit):
       - `serializeTutorState` (mappai-ai-tutor.js), identificatore nudo in buildVaultMapData
         (mappai-vault-io.js:95). Mancando, «Torna a STUDIA» (studente/console.js:194) inghiottiva
         un ReferenceError e la mappa con la sua vista NON veniva mai salvata. Stesso corpo del docente.
       - `openEditModal` (mappai-edit-modal.js), doppio clic su un nodo (mappai-d3-render.js:497):
         l'allievo non modifica, quindi apre la scheda del nodo in sola lettura, come un clic.
       - `updateUserNotesSidebar` (mappai-edit-modal.js), linguetta «Note» (mappai-ui-modals.js:565):
         il pannello delle note del docente qui non c'è; resta vuoto, senza più lanciare. */
    window.serializeTutorState = function (state) {
        try { return JSON.parse(JSON.stringify(state)); } catch (e) { return { sidebar: { history: [] }, nodes: {} }; }
    };
    window.openEditModal = window.openEditModal || function (d) {
        if (d && typeof window.handleNodeClick === 'function') window.handleNodeClick(null, d, true, false);
    };
    window.updateUserNotesSidebar = window.updateUserNotesSidebar || function () { };
    document.documentElement.classList.add('manifesto', 'mn-bento-app', 'studente');
    /* ── LA BARRA DI STATO DELL'iPAD NON STA PIÙ SOPRA L'APP (7/9) ────────────
       Con `viewport-fit=cover` la WKWebView arriva fin sotto l'orologio e la
       batteria: la fila di comandi di un documento aperto a destra ci finiva
       sotto (screenshot di Giacomo), e la stessa cosa sarebbe capitata a ogni
       superficie che tocca il bordo alto — pannello, console piena, player.
       Invece di rincorrerle una per una con `env(safe-area-inset-top)`, si
       sposta la webview: `setOverlaysWebView({overlay:false})` la fa cominciare
       SOTTO la barra di stato, e da lì in giù tutto è al sicuro per costruzione
       (gli `env()` che restano nel CSS diventano zero da soli, e reggono nel
       browser e se il plugin non c'è). Testo scuro su fondo chiaro: `LIGHT`. */
    try {
        var C = window.Capacitor;
        if (C && C.isNativePlatform && C.isNativePlatform()) {
            var SB = (C.Plugins && C.Plugins.StatusBar) || (C.registerPlugin && C.registerPlugin('StatusBar'));
            if (SB && SB.setOverlaysWebView) Promise.resolve(SB.setOverlaysWebView({ overlay: false })).catch(function () { });
            if (SB && SB.setStyle) Promise.resolve(SB.setStyle({ style: 'LIGHT' })).catch(function () { });
        }
    } catch (e) { }
    /* le due card «a scelta» del launcher leggono l'archivio, che qui è vuoto,
       e la prova dello studente le sostituisce (inv. 21): il loro interruttore
       di MappAI le spegne senza toccare il modulo */
    try { localStorage.setItem('mappai_domande_scelta', '0'); } catch (e) { }
}());
