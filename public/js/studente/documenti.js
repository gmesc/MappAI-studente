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

    /* ── IL DOCK A DUE ORIENTAMENTI ──────────────────────────────────────────
       iPad sdraiato → a destra (maniglia a sinistra, si trascina la larghezza);
       iPad in piedi → in basso (maniglia in alto, si trascina l'altezza). Al
       cambio di orientamento cambia SOLO il CSS: il contenuto (la view della
       prova, l'iframe) resta lo stesso nodo. Due clamp, due memorie. */
    var KEY_W = 'mappai_studente_dock_w', KEY_H = 'mappai_studente_dock_h', MIN_W = 360, MIN_H = 240;
    var dock = null, corpo = null, titolo = null, urlAperto = null, chiediChiusura = null;
    var mq = window.matchMedia ? window.matchMedia('(orientation: portrait)') : null;
    function PC() { return window.MappAIProvaCore; }
    function orientamento() {
        if (mq) return mq.matches ? 'portrait' : 'landscape';
        return PC() ? PC().orientamento(window.innerWidth, window.innerHeight) : 'landscape';
    }
    function misura(px) {
        var basso = orientamento() === 'portrait';
        var main = document.getElementById('main-content');
        var asse = basso ? (main ? main.clientHeight : window.innerHeight) : (main ? main.clientWidth : window.innerWidth);
        var min = basso ? MIN_H : MIN_W;
        var v = PC() ? PC().clampSplit(px, asse, min, 0.7) : Math.max(min, Math.min(Math.floor(asse * 0.7), px));
        dock.classList.toggle('sd--basso', basso); dock.classList.toggle('sd--destra', !basso);
        if (basso) { dock.style.width = ''; dock.style.height = v + 'px'; }
        else { dock.style.height = ''; dock.style.width = v + 'px'; }
        return v;
    }
    function ricorda(px) { try { localStorage.setItem(orientamento() === 'portrait' ? KEY_H : KEY_W, String(px)); } catch (e) { } }
    function memoria() {
        var basso = orientamento() === 'portrait', v = 0;
        try { v = parseInt(localStorage.getItem(basso ? KEY_H : KEY_W), 10) || 0; } catch (e) { }
        return v || Math.round(basso ? window.innerHeight * 0.5 : window.innerWidth * 0.42);
    }
    function monta() {
        if (dock) return dock;
        var main = document.getElementById('main-content');
        if (!main) return null;
        dock = document.createElement('aside');
        dock.id = 'studente-dock'; dock.hidden = true;
        dock.innerHTML =
            '<div class="sd-man" role="separator" aria-label="' + esc(t('st_dock_man', 'Ridimensiona')) + '"></div>' +
            '<div class="sd-testa"><span class="sd-titolo"></span><span class="sd-sp"></span>' +
            '<button type="button" class="sd-chiudi" aria-label="' + esc(t('mm_chiudi', 'Chiudi')) + '">&times;</button></div>' +
            '<div class="sd-corpo"></div>';
        main.appendChild(dock);
        corpo = dock.querySelector('.sd-corpo'); titolo = dock.querySelector('.sd-titolo');
        dock.querySelector('.sd-chiudi').onclick = function () { chiudiChiedendo(); };
        misura(memoria());
        var man = dock.querySelector('.sd-man'), drag = null;
        man.addEventListener('pointerdown', function (e) {
            drag = { x: e.clientX, y: e.clientY, w: dock.offsetWidth, h: dock.offsetHeight, basso: orientamento() === 'portrait' };
            man.setPointerCapture(e.pointerId); e.preventDefault();
        });
        man.addEventListener('pointermove', function (e) {
            if (!drag) return;
            misura(drag.basso ? drag.h + (drag.y - e.clientY) : drag.w + (drag.x - e.clientX));
        });
        man.addEventListener('pointerup', function () {
            if (drag) { ricorda(drag.basso ? dock.offsetHeight : dock.offsetWidth); window.dispatchEvent(new Event('resize')); }
            drag = null;
        });
        var risistema = function () { if (!dock.hidden) { misura(memoria()); window.dispatchEvent(new Event('resize')); } };
        window.addEventListener('resize', function () { if (!dock.hidden) misura(orientamento() === 'portrait' ? dock.offsetHeight : dock.offsetWidth); });
        if (mq && mq.addEventListener) mq.addEventListener('change', risistema);
        return dock;
    }
    function libera() { if (urlAperto) { try { URL.revokeObjectURL(urlAperto); } catch (e) { } urlAperto = null; } corpo.innerHTML = ''; chiediChiusura = null; }
    /* apri({ titolo, iframe: url } | { titolo, monta: fn(host) } | { titolo, html }, chiediChiusura: fn→Promise<bool> ) */
    function apri(o) {
        if (!monta()) return null;
        o = o || {};
        if (chiediChiusura && o.monta !== undefined) { /* una prova in corso: si sostituisce solo con conferma */ }
        libera();
        titolo.textContent = o.titolo || '';
        chiediChiusura = typeof o.chiediChiusura === 'function' ? o.chiediChiusura : null;
        misura(memoria());
        if (o.iframe) {
            var f = document.createElement('iframe'); f.className = 'sd-iframe'; f.src = o.iframe; corpo.appendChild(f);
        } else if (o.html) corpo.innerHTML = o.html;
        else if (typeof o.monta === 'function') o.monta(corpo);
        dock.hidden = false;
        window.dispatchEvent(new Event('resize'));
        return corpo;
    }
    function chiudi() { if (!dock || dock.hidden) return; dock.hidden = true; libera(); window.dispatchEvent(new Event('resize')); }
    /* chiudere a prova in corso è lavoro da perdere: si chiede */
    function chiudiChiedendo() {
        if (!chiediChiusura) return chiudi();
        Promise.resolve(chiediChiusura()).then(function (si) { if (si) chiudi(); });
    }

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

    /* ── le celle della tabella delle prove ─────────────────────────────────
       `apri:<id>` la riga → il documento nel dock · `stampa:<id>` → l'HTML in una
       finestra e `window.print()` (su iPad è il menu di stampa) · `cartella:<id>`
       → il PDF al foglio di condivisione di iOS (`@capacitor/share`: «Salva su
       File», «Apri in…», Mail); nel browser si scarica. L'app File non si apre su
       un percorso: la cartella dell'app è già lì (LEGGIMI-studente). */
    function leggiB64(vaultPath, rel) {
        return window.electronAPI.readVaultFile({ vaultPath: vaultPath, relPath: rel }).then(function (r) {
            if (!r || !r.ok) throw new Error((r && r.error) || 'file non trovato');
            return r.base64;
        });
    }
    function azione(a, vaultPath, sessioni) {
        var m = /^(apri|stampa|cartella):(.+)$/.exec(a || ''); if (!m || !vaultPath) return;
        var s = (sessioni || []).filter(function (x) { return x.id === m[2]; })[0];
        if (!s) { toast(t('st_sessione_ko', 'Prova non trovata.'), 'error'); return; }
        var base = 'Studio Attivo/Prove/' + s.id + '/';
        if (m[1] === 'apri') {
            if (window.MappAIStudente && window.MappAIStudente.apriMappa) {
                window.MappAIStudente.apriMappa(vaultPath).then(function () { apriFile(vaultPath, base + (s.html || 'risposte.html'), s.nome || s.id); });
            }
            return;
        }
        if (m[1] === 'stampa') {
            leggiB64(vaultPath, base + (s.html || 'risposte.html')).then(function (b64) {
                var html = decodeURIComponent(escape(atob(b64)));
                var w = window.MappAIStudyExport && window.MappAIStudyExport.openPrintable
                    ? window.MappAIStudyExport.openPrintable(html, { autoPrint: true })
                    : (function () { var x = window.open('', '_blank'); if (x) { x.document.write(html); x.document.close(); setTimeout(function () { x.print(); }, 800); } return x; })();
                if (!w) toast(t('st_popup', 'Il browser ha bloccato la finestra di stampa.'), 'warning');
            }).catch(function (e) { toast(t('st_file_ko', 'Non riesco ad aprire il file.') + ' ' + (e && e.message), 'error'); });
            return;
        }
        if (m[1] === 'cartella') {
            var pdf = s.pdf || s.html; if (!pdf) return;
            var rel = base + pdf;
            var cap = window.Capacitor && window.Capacitor.Plugins;
            if (cap && cap.Share && cap.Filesystem) {
                var p = rel; var vp = vaultPath.replace(/^Documents\/?/, '');
                cap.Filesystem.getUri({ path: (vp ? vp + '/' : '') + p, directory: 'DOCUMENTS' })
                    .then(function (u) { return cap.Share.share({ title: s.nome || pdf, url: u.uri }); })
                    .catch(function (e) { toast(t('st_share_ko', 'Condivisione non riuscita: ') + (e && e.message), 'error'); });
                return;
            }
            leggiB64(vaultPath, rel).then(function (b64) {
                var url = URL.createObjectURL(b64ToBlob(b64, mime(pdf)));
                var link = document.createElement('a'); link.href = url; link.download = pdf; document.body.appendChild(link); link.click(); link.remove();
                setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
                toast(t('st_scaricato', 'Nel browser il PDF si scarica; sull\'iPad si apre il foglio di condivisione.'), 'info');
            }).catch(function (e) { toast(t('st_file_ko', 'Non riesco ad aprire il file.') + ' ' + (e && e.message), 'error'); });
        }
    }

    window.MappAIStudenteDocumenti = { apri: apri, chiudi: chiudi, chiudiChiedendo: chiudiChiedendo, orientamento: orientamento, materiali: materiali, apriFile: apriFile, azione: azione, genere: genere, corpo: function () { return corpo; } };
}());
