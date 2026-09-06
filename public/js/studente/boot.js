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
    document.documentElement.classList.add('manifesto', 'mn-bento-app', 'studente');
    /* le due card «a scelta» del launcher leggono l'archivio, che qui è vuoto,
       e la prova dello studente le sostituisce (inv. 21): il loro interruttore
       di MappAI le spegne senza toccare il modulo */
    try { localStorage.setItem('mappai_domande_scelta', '0'); } catch (e) { }
}());
