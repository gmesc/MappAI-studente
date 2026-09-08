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

    /* rimettere la mappa NEL riquadro che le resta: in studio è `render()` (finisce
       con `fit('read')`), sul canvas libero è il centra-e-adatta di MappAI. Si chiama
       quando il dock si apre, si chiude o cambia taglia — il contenitore è appena
       cambiato e nessuno lo rifà da sé (il canvas D3 non ha un fit sul resize). */
    function inquadra() {
        var V = SV();
        if (!conMappa()) return false;
        if (V && overlay()) {
            try { V.render(); } catch (e) { return false; }
            /* ⚠️ `render()` finisce con `fit('read')`, che tiene una scala MINIMA
               leggibile (0.62) e quindi lascia fuori dal riquadro quello che non ci
               sta: giusto a tutto schermo, sbagliato su mezzo — lì Giacomo chiede
               «la mappa inquadrata nel modo migliore possibile», cioè tutta.
               `fit('all')` è lo stesso comando con l'altra modalità. */
            if (split()) {
                try {
                    var st = V._state, h = (st && st.focus && st.focus.handle) || (st && st.handle);
                    if (h && h.fit) h.fit('all');
                } catch (e) { }
            }
            return true;
        }
        if (window.resetZoom) { try { window.resetZoom(); return true; } catch (e) { } }
        return false;
    }

    /* ⚠️ L'INQUADRATURA VA RIFATTA QUANDO IL RIQUADRO SI FERMA, non quando si apre
       il dock: la sidebar si chiude con una transizione, quindi il contenitore
       cambia taglia DUE volte (prima il dock, poi la sidebar) — e la seconda volta
       il `ResizeObserver` della vista di studio rimetteva `fit('read')`, cioè
       l'inquadratura che lascia fuori quello che non ci sta. Qui si guarda lo
       stesso riquadro e si rifà l'inquadratura buona 200 ms dopo (dopo i 120 di
       MappAI), ma SOLO in split: a tutto schermo comanda lo studente. */
    var osservatore = null;
    function vigilaRiquadro() {
        if (osservatore || typeof ResizeObserver === 'undefined') return;
        var host = document.getElementById('d3-container'); if (!host) return;
        var t = null;
        osservatore = new ResizeObserver(function () {
            clearTimeout(t);
            t = setTimeout(function () { if (split()) inquadra(); }, 200);
        });
        osservatore.observe(host);
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
        vigilaRiquadro();
        var giri = 0, vigila = setInterval(function () {
            var V = SV(), s = S();
            if (++giri > 12 || !V || !conMappa() || s.layoutMode !== 'studio') return clearInterval(vigila);
            if (overlay()) { clearInterval(vigila); adatta(); return; }
            try { V.enter(true); } catch (e) { }
        }, 250);
    }
    /* un documento si apre accanto: la mappa si stringe, la sidebar sparisce, e
       l'inquadratura si rifà su ciò che resta (il CSS accorcia #d3-container) */
    function conDocumento() {
        nascondiSidebar();
        adatta();
        vigilaRiquadro();
        /* tre giri: il dock (subito), la sidebar che finisce di chiudersi (~300 ms),
           e un ultimo per sicurezza — il riquadro cambia taglia più volte di seguito
           e l'ultima parola dev'essere l'inquadratura buona */
        [220, 500, 900].forEach(function (ms) { setTimeout(function () { if (split()) inquadra(); }, ms); });
    }

    window.MappAIStudenteMappa = { assetto: assetto, conDocumento: conDocumento, adatta: adatta, inquadra: inquadra, albero: albero, nascondiSidebar: nascondiSidebar, split: split };
}());
