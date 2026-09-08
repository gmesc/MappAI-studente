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
        ingombro(basso ? 0 : v, basso ? v : 0);
        if (corpo && corpo.__risistema) { try { corpo.__risistema(); } catch (e) { } }
        /* girando l'iPad lo split cambia asse: il disegno della mappa lo segue */
        if (window.MappAIStudenteMappa) window.MappAIStudenteMappa.adatta();
        return v;
    }
    /* quanto il dock toglie al canvas, come variabili CSS sull'<html>: la barra dei comandi
       della mappa (`#map-control-card`, in studente.css) si ferma al suo bordo invece di
       passarci sotto (screenshot iPad del 7/9) */
    function ingombro(w, h) {
        var r = document.documentElement.style;
        r.setProperty('--sd-w', (w || 0) + 'px'); r.setProperty('--sd-h', (h || 0) + 'px');
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
            if (drag) {
                ricorda(drag.basso ? dock.offsetHeight : dock.offsetWidth);
                window.dispatchEvent(new Event('resize'));
                if (window.MappAIStudenteMappa) setTimeout(window.MappAIStudenteMappa.inquadra, 160);
            }
            drag = null;
        });
        var risistema = function () { if (!dock.hidden) { misura(memoria()); window.dispatchEvent(new Event('resize')); } };
        window.addEventListener('resize', function () { if (!dock.hidden) misura(orientamento() === 'portrait' ? dock.offsetHeight : dock.offsetWidth); });
        if (mq && mq.addEventListener) mq.addEventListener('change', risistema);
        return dock;
    }
    function libera() {
        if (urlAperto) { try { URL.revokeObjectURL(urlAperto); } catch (e) { } urlAperto = null; }
        /* un PDF aperto tiene un documento pdf.js e un worker: si chiudono */
        if (corpo && corpo.__pulisci) { try { corpo.__pulisci(); } catch (e) { } corpo.__pulisci = null; corpo.__risistema = null; }
        corpo.classList.remove('sd-corpo--pdf');
        if (dock) dock.classList.remove('sd--senza-testa');
        corpo.innerHTML = ''; chiediChiusura = null;
    }
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
            var f = document.createElement('iframe'); f.className = 'sd-iframe'; f.src = o.iframe;
            f.addEventListener('load', function () { vesti(f); });
            corpo.appendChild(f);
        } else if (o.html) corpo.innerHTML = o.html;
        else if (typeof o.monta === 'function') o.monta(corpo);
        dock.hidden = false;
        window.dispatchEvent(new Event('resize'));
        if (window.MappAIStudenteMappa) window.MappAIStudenteMappa.conDocumento();
        return corpo;
    }
    /* la VESTE dei documenti HTML di MappAI nel dock (7/9): la sintesi nasce con la
       testata cotta a scala 1,6 (`--ap-ui-k`, la leva di leggibilità del docente) e
       in un pannello da 500-900 px si spezzava su tre righe. Il file è dello stesso
       origine (capacitor:// sull'iPad, blob: nel browser): gli si aggiunge un foglio
       in coda che riporta la testata alla scala 1 e toglie il marchio. Il corpo del
       testo (`--ap-txt-k`) non si tocca: quello è la leggibilità. Un documento senza
       `#ap-topbar` non si tocca. */
    function vesti(f) {
        try {
            var d = f.contentDocument; if (!d || !d.head || !d.getElementById('ap-topbar')) return;
            var st = d.createElement('style'); st.id = 'sd-veste';
            st.textContent = ':root{--ap-ui-k:1.05 !important}#ap-doc-brand{display:none}#ap-topbar{padding:8px 12px}';
            d.head.appendChild(st);
            /* «Aa Dislessia» → «Aa x1» (Giacomo, 7/9): l'etichetta dice la TAGLIA del
               testo (x1 · x1,5 · x2), non chi dovrebbe premerla. In MappAI re è cambiata alla fonte;
               qui si riscrive per i documenti già sul disco dello studente — anche dopo
               un giro completo dei tre stati, perché il ciclo la ripesca dal suo elenco. */
            var aa = d.getElementById('ap-dys-btn');
            if (aa) {
                aa.textContent = 'Aa x1';
                aa.addEventListener('click', function () {
                    setTimeout(function () { if (/dislessia|dyslexia/i.test(aa.textContent || '')) aa.textContent = 'Aa x1'; }, 0);
                });
            }
            /* LA × VIVE NELLA BARRA DEL DOCUMENTO (7/9): la testata del pannello portava
               solo lei e si mangiava una riga intera dello schermo. Il documento ha già
               la sua fila di comandi (Aa · Evidenzia · Riga · Stampa): la chiusura entra
               lì in coda, e la testata del pannello si nasconde. Il player del TTS resta
               sulla riga sotto — è il documento stesso a mandarcelo sotto i 790px. */
            var cmd = d.querySelector('#ap-topbar .ap-cmd');
            if (cmd && !d.getElementById('sd-x')) {
                var x = d.createElement('button');
                x.id = 'sd-x'; x.type = 'button'; x.className = 'ap-hdr-btn';
                x.textContent = '✕';
                x.setAttribute('title', t('st_chiudi', 'Chiudi'));
                x.setAttribute('aria-label', t('st_chiudi', 'Chiudi'));
                x.addEventListener('click', function () { chiudiChiedendo(); });
                cmd.appendChild(x);
                if (dock) dock.classList.add('sd--senza-testa');
            }
        } catch (e) { }
    }
    function chiudi() {
        if (!dock || dock.hidden) return;
        dock.hidden = true; libera(); ingombro(0, 0);
        window.dispatchEvent(new Event('resize'));
        /* il canvas torna largo quanto lo schermo: la mappa si rimette nel riquadro */
        if (window.MappAIStudenteMappa) setTimeout(window.MappAIStudenteMappa.inquadra, 160);
    }
    /* chiudere a prova in corso è lavoro da perdere: si chiede */
    function chiudiChiedendo() {
        if (!chiediChiusura) return chiudi();
        Promise.resolve(chiediChiusura()).then(function (si) { if (si) chiudi(); });
    }

    /* ── i materiali del vault ──────────────────────────────────────────── */
    /* il genere dal nome del file: la tabella vive in studia-core (pura, testata) */
    function genere(nome) { var C = window.MappAIStudiaCore; return C && C.genere ? C.genere(nome) : null; }
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
        /* i PDF NON vanno in un iframe: nella WKWebView si vedrebbe solo la prima
           pagina, senza scorrimento né pinch (misurato sull'iPad il 7/9). Li disegna
           `studente/pdf-vista.js` con pdf.js. */
        if (/\.pdf$/i.test(nome || relPath)) return apriPdf(vaultPath, relPath, nome);
        /* sull'iPad il file si carica dal suo URL vero (`capacitor://…` via convertFileSrc):
           l'HTML della sintesi apre così anche l'audio che sta accanto (percorsi relativi),
           cosa che un blob: non può fare; ed è la stessa strada che la WKWebView usa per i PDF */
        var FSP = window.MappAIStudenteFS && window.MappAIStudenteFS.plugin;
        var Fs = FSP ? FSP('Filesystem') : null, C = window.Capacitor;
        if (Fs && C && C.convertFileSrc) {
            var vp = vaultPath.replace(/^Documents\/?/, '');
            return Fs.getUri({ path: (vp ? vp + '/' : '') + relPath, directory: 'DOCUMENTS' }).then(function (u) {
                apri({ titolo: nome, iframe: C.convertFileSrc(u.uri) });
            }).catch(function () { return apriBlob(vaultPath, relPath, nome); });
        }
        return apriBlob(vaultPath, relPath, nome);
    }
    function apriPdf(vaultPath, relPath, nome) {
        var V = window.MappAIStudentePdfVista;
        if (!V) return apriBlob(vaultPath, relPath, nome);
        return window.electronAPI.readVaultFile({ vaultPath: vaultPath, relPath: relPath }).then(function (r) {
            if (!r || !r.ok) { toast(t('st_file_ko', 'Non riesco ad aprire il file.') + (r && r.error ? ' ' + r.error : ''), 'error'); return; }
            apri({ titolo: nome, monta: function (host) { host.classList.add('sd-corpo--pdf'); V.monta(host, r.base64); } });
        });
    }
    function apriBlob(vaultPath, relPath, nome) {
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
        /* una prova nel dock (ha `chiediChiusura`): i materiali non la coprono — prima si
           consegna o si chiude la prova (Giacomo, 7/9: l'elenco compariva sopra le domande) */
        if (chiediChiusura) { toast(t('st_prova_in_corso', 'C\'è una prova in corso: consegnala o chiudila prima di aprire i materiali.'), 'warning'); return; }
        apri({ titolo: t('st_materiali', 'Materiali'), monta: function (host) { host.innerHTML = '<p class="sd-vuoto">' + esc(t('st_carico', 'Leggo la cartella…')) + '</p>'; } });
        var lista = function (dir) {
            return window.electronAPI.vaultMaterialsList(dir ? { vaultPath: vp, dir: dir } : { vaultPath: vp })
                .then(function (x) { return (x && x.files) || []; }).catch(function () { return []; });
        };
        Promise.all([lista(''), lista('Allegati')]).then(function (due) {
            var r = { files: due[0].concat(due[1]) };
            /* che cosa lo studente vede lo decide `studia-core.daMostrare`, uno solo per
               la console e per il pannello: niente .json, niente nascosti, e da
               «Materiale Studio» nessun PDF (le soluzioni in coda; la scheda del docente
               sta in `Allegati/` ed è l'unico PDF che viaggia). */
            var C1 = window.MappAIStudiaCore;
            var files = (r.files || []).filter(function (f) { return C1 && C1.daMostrare ? C1.daMostrare(f) : true; });
            var html = '';
            /* la sintesi del vault: con la voce se c'è, altrimenti quella scritta (il Dossier del
               docente è stato tolto da qui il 7/9: era un comando di CREA) */
            var C0 = window.MappAIStudiaCore;
            var sintesi = C0 && C0.trovaSintesi ? C0.trovaSintesi(files) : null;
            if (!files.length) html += '<p class="sd-vuoto">' + esc(t('st_nessun_materiale', 'Questa mappa non porta materiali oltre ai set.')) + '</p>';
            files.forEach(function (f) {
                var g = (C1 && C1.inAllegati && C1.inAllegati(f)) ? { et: t('st_g_scheda', 'La scheda del docente'), icona: 'book-open' }
                    : (genere(f.name) || { et: t('st_file', 'File'), icona: 'file' });
                html += '<button type="button" class="sd-riga" data-rel="' + esc(f.relPath) + '" data-nome="' + esc(f.name) + '">' +
                    '<i data-lucide="' + g.icona + '"></i><span class="sd-riga__t"><b>' + esc(g.et) + '</b><small>' + esc(f.name) + '</small></span></button>';
            });
            html += '<h4 class="sd-h">' + esc(t('st_stampa_mappa', 'Stampa dalla mappa')) + '</h4>' +
                '<button type="button" class="sd-riga" data-fn="exportPDF"><i data-lucide="file-down"></i><span class="sd-riga__t"><b>' + esc(t('st_pdf_mappa', 'PDF della mappa')) + '</b></span></button>' +
                '<button type="button" class="sd-riga" data-fn="openNodeLabelsPrintModal"><i data-lucide="scissors"></i><span class="sd-riga__t"><b>' + esc(t('st_foglio_nodi', 'Foglio dei nodi')) + '</b></span></button>' +
                '<button type="button" class="sd-riga" data-fn="sintesi"><i data-lucide="sparkles"></i><span class="sd-riga__t"><b>' + esc(t('st_sintesi', 'Sintesi')) + '</b><small>' + esc(sintesi ? sintesi.name : t('st_sintesi_manca', 'questa mappa non ha una sintesi')) + '</small></span></button>' +
                '<button type="button" class="sd-riga" data-fn="catena"><i data-lucide="git-branch"></i><span class="sd-riga__t"><b>' + esc(t('st_catena', 'Catena dei perché')) + '</b></span></button>';
            corpo.innerHTML = html;
            corpo.onclick = function (e) {
                var b = e.target.closest && e.target.closest('.sd-riga'); if (!b) return;
                var fn = b.getAttribute('data-fn');
                if (fn === 'sintesi') {
                    if (!sintesi) { toast(t('st_sintesi_manca_toast', 'Questa mappa non porta una sintesi: il docente non l\'ha pubblicata.'), 'info'); return; }
                    apriFile(vp, sintesi.relPath, sintesi.name); return;
                }
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
            var FSP = window.MappAIStudenteFS && window.MappAIStudenteFS.plugin;
            var Fs = FSP ? FSP('Filesystem') : null, Sh = FSP ? FSP('Share') : null;
            if (Fs && Sh) {
                var p = rel; var vp = vaultPath.replace(/^Documents\/?/, '');
                Fs.getUri({ path: (vp ? vp + '/' : '') + p, directory: 'DOCUMENTS' })
                    .then(function (u) { return Sh.share({ title: s.nome || pdf, url: u.uri }); })
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

    window.MappAIStudenteDocumenti = { aperto: function () { return !!(dock && !dock.hidden); }, apri: apri, chiudi: chiudi, chiudiChiedendo: chiudiChiedendo, orientamento: orientamento, materiali: materiali, apriFile: apriFile, azione: azione, genere: genere, corpo: function () { return corpo; } };
}());
