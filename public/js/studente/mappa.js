/*
 * studente/mappa.js — l'assetto con cui la mappa si presenta allo studente
 * ---------------------------------------------------------------------------
 * Tre regole, dette da Giacomo il 7/9 dopo la prova sull'iPad:
 *   · la SIDEBAR parte sempre CHIUSA (e si richiude quando si apre un documento
 *     accanto): in un pannello da mezzo schermo è la prima cosa che toglie posto
 *     alla mappa, e lo studente non ha i comandi del docente da tenerci dentro;
 *   · la mappa parte in vista **Albero** — la lettura, non il grafo che rimbalza;
 *   · in SPLIT il disegno segue il tablet: sdraiato «da sinistra →», in piedi
 *     «dall'alto ↓», e girando l'iPad cambia da sé.
 * ⚠️ L'ULTIMA REGOLA VALE SOLO IN SPLIT. Con la mappa a tutto schermo la
 * rotazione non tocca niente: lì il layout è una scelta dello studente, e
 * ribaltarglielo sotto le dita mentre gira il tablet sarebbe l'app che
 * disfa quello che lui ha appena scelto (inv. 20: chi comanda è chi guarda).
 *
 * Non c'è logica nuova sul disegno: si usano `MappAIStudioView.setMotore('td')`
 * e la leva `orient` del suo profilo, cioè gli stessi comandi del bottone
 * ALBERO e del segmento «Orientamento» di MappAI.
 */
(function () {
    'use strict';
    if (window.MappAIStudenteMappa) return;

    function SV() { return window.MappAIStudioView; }
    function S() { try { return (typeof appState !== 'undefined') ? appState : window.appState; } catch (e) { return window.appState; } }
    function conMappa() { var s = S(); return !!(s && s.db && s.db.nodes && s.db.nodes.length); }
    function orizzontale() {
        if (window.matchMedia) return !window.matchMedia('(orientation: portrait)').matches;
        return window.innerWidth >= window.innerHeight;
    }
    function split() {
        var D = window.MappAIStudenteDocumenti;
        return !!(D && D.aperto && D.aperto());
    }

    function sidebarChiusa() {
        var v = document.getElementById('map-view');
        return !v || v.classList.contains('sidebar-collapsed');
    }
    function nascondiSidebar() {
        if (!sidebarChiusa() && window.toggleSidebar) { try { window.toggleSidebar(); } catch (e) { } }
    }

    function overlay() { return document.getElementById('studio-overlay'); }
    /* la vista Albero: gli stessi tre gesti che fa `toggleLayout` entrando in studio.
       ⚠️ La guardia NON è `layoutMode === 'studio'`: quel campo arriva anche da
       `vista.json` (o da un rientro a metà) mentre a schermo la vista non c'è.
       Comanda il DISEGNO: se il riquadro della vista studio non è nel DOM si entra,
       punto — è la stessa domanda che si fa l'occhio. */
    function albero() {
        var V = SV(), s = S();
        if (!V || !conMappa()) return false;
        try { if (localStorage.getItem('mappai_studio_view') === '0') return false; } catch (e) { }
        var viva = !!(V._state && V._state.active) && !!overlay();
        s.layoutMode = 'studio';
        V.setMotore('td');
        if (window.updateLayoutButtonLabel) { try { window.updateLayoutButtonLabel(); } catch (e) { } }
        if (!viva) { try { V.enter(true); } catch (e) { return false; } }
        return true;
    }

    /* l'orientamento del disegno — solo in split (vedi l'intestazione) */
    function adatta() {
        var V = SV(), s = S();
        if (!V || !conMappa() || !split()) return false;
        if (s.layoutMode !== 'studio' || !overlay()) return false;
        var p = V.profile(); if (!p) return false;
        var vuole = orizzontale() ? 'lr' : 'td';
        if (p.orient === vuole) return false;
        p.orient = vuole;
        try { V.render(); } catch (e) { }
        return true;
    }

    /* l'apertura della mappa dalla console.
       ⚠️ `renderGraph` può arrivare DOPO di noi (il caricamento del vault finisce
       quando finisce) e svuota `#d3-container`, portandosi via il riquadro della
       vista: il `riprendi` di MappAI non lo rimette, perché per lui è la stessa
       mappa di prima. Si vigila per qualche secondo e lo si rimonta finché non
       resta al suo posto — o finché lo studente sceglie un'altra vista. */
    function assetto() {
        nascondiSidebar();
        albero();
        adatta();
        var giri = 0, vigila = setInterval(function () {
            var V = SV(), s = S();
            if (++giri > 12 || !V || !conMappa() || s.layoutMode !== 'studio') return clearInterval(vigila);
            if (overlay()) { clearInterval(vigila); adatta(); return; }
            try { V.enter(true); } catch (e) { }
        }, 250);
    }
    /* un documento si apre accanto: la mappa si stringe, la sidebar sparisce */
    function conDocumento() {
        nascondiSidebar();
        adatta();
    }

    window.MappAIStudenteMappa = { assetto: assetto, conDocumento: conDocumento, adatta: adatta, albero: albero, nascondiSidebar: nascondiSidebar, split: split };
}());
