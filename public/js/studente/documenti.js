/*
 * studente/documenti.js — il DOCK accanto alla mappa, e i materiali del vault
 * ---------------------------------------------------------------------------
 * Un pannello a destra del canvas (`#studente-dock` dentro `#main-content`),
 * con la maniglia sul bordo sinistro — il pattern di `mappai-sidebar-resize`,
 * riscritto in venti righe perché quel modulo è legato a `#sidebar` per id.
 * Un dock solo: aprire una cosa sostituisce la precedente.
 *
 * I materiali: `vaultMaterialsList` → righe classificate per prefisso (la
 * tabella GENERI di MappAI vive in mappai-pipeline-core, qui basta il nome);
 * la sintesi (HTML autoconsistente, con la voce) e i PDF si aprono in un
 * iframe da blob. Le prove (report, PDF delle risposte) arrivano con la fase
 * 2 e passano da `azione()`.
 */
(function () {
    'use strict';
    if (window.MappAIStudenteDocumenti) return;

    function t(k, f) { try { return (window.t ? window.t(k, f) : f) || f; } catch (e) { return f; } }
    function toast(m, k) { if (window.showToast) window.showToast(m, k || 'info'); }
    function esc(s) { var d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML; }
    function S() { try { return (typeof appState !== 'undefined') ? appState : window.appState; } catch (e) { return window.appState; } }

    var KEY = 'mappai_studente_dock_w', MIN = 360;
    var dock = null, corpo = null, titolo = null, urlAperto = null;

    function monta() {
        if (dock) return dock;
        var main = document.getElementById('main-content');
        if (!main) return null;
        dock = document.createElement('aside');
        dock.id = 'studente-dock'; dock.hidden = true;
        dock.innerHTML =
            '<div class="sd-man" role="separator" aria-orientation="vertical" aria-label="' + esc(t('st_dock_man', 'Ridimensiona')) + '"></div>' +
            '<div class="sd-testa"><span class="sd-titolo"></span><span class="sd-sp"></span>' +
            '<button type="button" class="sd-chiudi" aria-label="' + esc(t('mm_chiudi', 'Chiudi')) + '">&times;</button></div>' +
            '<div class="sd-corpo"></div>';
        main.appendChild(dock);
        corpo = dock.querySelector('.sd-corpo'); titolo = dock.querySelector('.sd-titolo');
        dock.querySelector('.sd-chiudi').onclick = chiudi;
        var w = 0; try { w = parseInt(localStorage.getItem(KEY), 10) || 0; } catch (e) { }
        larghezza(w || Math.round(window.innerWidth * 0.42));
        /* la maniglia: drag col dito o col mouse, clamp fra MIN e il 60% */
        var man = dock.querySelector('.sd-man'), drag = null;
        man.addEventListener('pointerdown', function (e) { drag = { x: e.clientX, w: dock.offsetWidth }; man.setPointerCapture(e.pointerId); e.preventDefault(); });
        man.addEventListener('pointermove', function (e) { if (drag) larghezza(drag.w + (drag.x - e.clientX)); });
        man.addEventListener('pointerup', function () { if (drag) { try { localStorage.setItem(KEY, String(dock.offsetWidth)); } catch (e) { } } drag = null; });
        window.addEventListener('resize', function () { if (!dock.hidden) larghezza(dock.offsetWidth); });
        return dock;
    }
    function larghezza(px) {
        var max = Math.max(MIN, Math.floor(window.innerWidth * 0.6));
        dock.style.width = Math.max(MIN, Math.min(max, px)) + 'px';
    }
    function libera() { if (urlAperto) { try { URL.revokeObjectURL(urlAperto); } catch (e) { } urlAperto = null; } corpo.innerHTML = ''; }
    /* apri({ titolo, iframe: url } | { titolo, monta: fn(host) } | { titolo, html }) */
    function apri(o) {
        if (!monta()) return null;
        o = o || {};
        libera();
        titolo.textContent = o.titolo || '';
        if (o.iframe) {
            var f = document.createElement('iframe'); f.className = 'sd-iframe'; f.src = o.iframe; corpo.appendChild(f);
        } else if (o.html) corpo.innerHTML = o.html;
        else if (typeof o.monta === 'function') o.monta(corpo);
        dock.hidden = false;
        window.dispatchEvent(new Event('resize'));
        return corpo;
    }
    function chiudi() { if (!dock || dock.hidden) return; dock.hidden = true; libera(); window.dispatchEvent(new Event('resize')); }

    /* ── i materiali del vault ──────────────────────────────────────────── */
    var GENERI = [
        [/^Sintesi-voce/i, 'Sintesi con voce', 'volume-2'], [/^Sintesi/i, 'Sintesi', 'sparkles'],
        [/^Quiz-MC/i, 'Quiz a scelta multipla', 'list-checks'], [/^Quiz-VF/i, 'Quiz vero o falso', 'check-check'],
        [/^Domande.?aperte/i, 'Domande aperte', 'pen-line'], [/^Flashcard/i, 'Flashcard', 'copy'],
        [/^Foglio.?nodi/i, 'Foglio dei nodi', 'scissors'], [/^Focus/i, 'Focus', 'crosshair'],
        [/^Studio/i, 'Vista studio', 'layout-grid'], [/^(MM|KG)-/i, 'Mappa', 'map'],
        [/^Catena/i, 'Catena dei perché', 'git-branch'], [/^Dossier/i, 'Dossier', 'book-open'], [/^Analisi/i, 'Analisi della fonte', 'image']
    ];
    function genere(nome) {
        for (var i = 0; i < GENERI.length; i++) if (GENERI[i][0].test(nome)) return { et: GENERI[i][1], icona: GENERI[i][2] };
        return null;
    }
    function mime(nome) {
        if (/\.pdf$/i.test(nome)) return 'application/pdf';
        if (/\.html?$/i.test(nome)) return 'text/html';
        if (/\.(png|jpe?g|webp|gif)$/i.test(nome)) return 'image/' + nome.split('.').pop().toLowerCase().replace('jpg', 'jpeg');
        if (/\.mp3$/i.test(nome)) return 'audio/mpeg';
        return 'application/octet-stream';
    }
    function b64ToBlob(b64, tipo) {
        var bin = atob(b64), n = bin.length, u = new Uint8Array(n);
        for (var i = 0; i < n; i++) u[i] = bin.charCodeAt(i);
        return new Blob([u], { type: tipo });
    }
    function apriFile(vaultPath, relPath, nome) {
        return window.electronAPI.readVaultFile({ vaultPath: vaultPath, relPath: relPath }).then(function (r) {
            if (!r || !r.ok) { toast(t('st_file_ko', 'Non riesco ad aprire il file.') + (r && r.error ? ' ' + r.error : ''), 'error'); return; }
            var url = URL.createObjectURL(b64ToBlob(r.base64, mime(nome)));
            apri({ titolo: nome, iframe: url });
            urlAperto = url;
        });
    }
    /* l'elenco, nel dock: le righe dei materiali + le stampe dalla mappa */
    function materiali() {
        var s = S();
        if (!s || !s.activeVaultPath) { toast(t('st_no_vault', 'Apri prima una mappa.'), 'warning'); return; }
        var vp = s.activeVaultPath;
        apri({ titolo: t('st_materiali', 'Materiali'), monta: function (host) { host.innerHTML = '<p class="sd-vuoto">' + esc(t('st_carico', 'Leggo la cartella…')) + '</p>'; } });
        window.electronAPI.vaultMaterialsList({ vaultPath: vp }).then(function (r) {
            var files = ((r && r.files) || []).filter(function (f) { return !/\.json$/i.test(f.name) && f.name.charAt(0) !== '.'; });
            var html = '';
            if (!files.length) html += '<p class="sd-vuoto">' + esc(t('st_nessun_materiale', 'Questa mappa non porta materiali oltre ai set.')) + '</p>';
            files.forEach(function (f) {
                var g = genere(f.name) || { et: t('st_file', 'File'), icona: 'file' };
                html += '<button type="button" class="sd-riga" data-rel="' + esc(f.relPath) + '" data-nome="' + esc(f.name) + '">' +
                    '<i data-lucide="' + g.icona + '"></i><span class="sd-riga__t"><b>' + esc(g.et) + '</b><small>' + esc(f.name) + '</small></span></button>';
            });
            html += '<h4 class="sd-h">' + esc(t('st_stampa_mappa', 'Stampa dalla mappa')) + '</h4>' +
                '<button type="button" class="sd-riga" data-fn="exportPDF"><i data-lucide="file-down"></i><span class="sd-riga__t"><b>' + esc(t('st_pdf_mappa', 'PDF della mappa')) + '</b></span></button>' +
                '<button type="button" class="sd-riga" data-fn="openNodeLabelsPrintModal"><i data-lucide="scissors"></i><span class="sd-riga__t"><b>' + esc(t('st_foglio_nodi', 'Foglio dei nodi')) + '</b></span></button>' +
                '<button type="button" class="sd-riga" data-fn="openDossierPrintModal"><i data-lucide="book-open"></i><span class="sd-riga__t"><b>' + esc(t('st_dossier', 'Dossier')) + '</b></span></button>' +
                '<button type="button" class="sd-riga" data-fn="catena"><i data-lucide="git-branch"></i><span class="sd-riga__t"><b>' + esc(t('st_catena', 'Catena dei perché')) + '</b></span></button>';
            corpo.innerHTML = html;
            corpo.onclick = function (e) {
                var b = e.target.closest && e.target.closest('.sd-riga'); if (!b) return;
                var fn = b.getAttribute('data-fn');
                if (fn === 'catena') { if (window.MappAICausal && window.MappAICausal.openDoc) window.MappAICausal.openDoc(); return; }
                if (fn) { if (typeof window[fn] === 'function') window[fn](); return; }
                apriFile(vp, b.getAttribute('data-rel'), b.getAttribute('data-nome'));
            };
            if (window.safeCreateIcons) window.safeCreateIcons();
        });
    }

    /* le celle della tabella delle prove (fase 2): stampante e cartella */
    function azione(a, vaultPath, sessioni) {
        toast(t('st_prova_dopo', 'La prova arriva con la fase 2: per ora mappa e flashcard.'), 'info');
    }

    window.MappAIStudenteDocumenti = { apri: apri, chiudi: chiudi, materiali: materiali, apriFile: apriFile, azione: azione, genere: genere };
}());
