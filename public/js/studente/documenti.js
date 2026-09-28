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
    /* LO SPLIT SI CHIUDE DAI DUE BORDI (Giacomo, 17/9): la barra portata a meno del 15%
       dal bordo della mappa chiude la MAPPA (il documento a tutto schermo), a meno del 15%
       dal bordo del documento chiude il DOCUMENTO; resta una maniglia verde (i colori
       della revisione di MappAI re) che con un tocco riapre alla misura di prima e
       trascinata riapre fin dove la si lascia. `collasso`: null | 'mappa' | 'doc'. */
    var SOGLIA = 0.15, collasso = null;
    function asseDi(basso) {
        var main = document.getElementById('main-content');
        return basso ? (main ? main.clientHeight : window.innerHeight) : (main ? main.clientWidth : window.innerWidth);
    }
    function misura(px) {
        var basso = orientamento() === 'portrait';
        var asse = asseDi(basso);
        var min = basso ? MIN_H : MIN_W;
        var v = PC() ? PC().clampSplit(px, asse, min, 0.7) : Math.max(min, Math.min(Math.floor(asse * 0.7), px));
        dock.classList.toggle('sd--basso', basso); dock.classList.toggle('sd--destra', !basso);
        dock.classList.toggle('sd--senza-mappa', collasso === 'mappa'); dock.classList.toggle('sd--senza-doc', collasso === 'doc');
        if (collasso === 'mappa') v = asse;
        if (basso) { dock.style.width = ''; dock.style.height = v + 'px'; }
        else { dock.style.height = ''; dock.style.width = v + 'px'; }
        if (collasso === 'doc') v = 0;
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
            drag = { x: e.clientX, y: e.clientY, basso: orientamento() === 'portrait', mosso: false, verso: null };
            man.setPointerCapture(e.pointerId); e.preventDefault();
        });
        window.addEventListener('pointermove', function (e) {   // sulla finestra: il dito esce subito dalla maniglia
            if (!drag) return;
            if (Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) > 4) drag.mosso = true;
            if (!drag.mosso) return;
            /* la misura dal puntatore, non dallo scarto: dalla maniglia di un pannello
               chiuso la misura di partenza non è quella che si vede */
            var b = document.getElementById('main-content').getBoundingClientRect();
            var px = drag.basso ? b.bottom - e.clientY : b.right - e.clientX, asse = drag.basso ? b.height : b.width;
            drag.verso = px < asse * SOGLIA ? 'doc' : px > asse * (1 - SOGLIA) ? 'mappa' : null;
            dock.classList.toggle('sd--sta-chiudendo', !!drag.verso);
            if (!drag.verso) { collasso = null; misura(px); }
        });
        var lascia = function () {
            if (!drag) return;
            var d = drag; drag = null;
            dock.classList.remove('sd--sta-chiudendo');
            if (!d.mosso) { if (!collasso) return; collasso = null; misura(memoria()); }   // tocco: riapre la maniglia
            else if (d.verso) { collasso = d.verso; misura(memoria()); }                  // si riapre alla misura di prima
            else ricorda(d.basso ? dock.offsetHeight : dock.offsetWidth);
            window.dispatchEvent(new Event('resize'));
            if (window.MappAIStudenteMappa) setTimeout(window.MappAIStudenteMappa.inquadra, 160);
        };
        ['pointerup', 'pointercancel'].forEach(function (n) { window.addEventListener(n, lascia); });
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
        var sb = dock && dock.querySelector('.sd-stampa'); if (sb) sb.remove();
        /* la fila del lettore dell'app vale per il documento che se ne va: si
           toglie, e la voce o la lettura veloce di quel documento tacciono */
        var fila = dock && dock.querySelector('.sd-fila'); if (fila) fila.remove();
        /* un documento con un lettore suo (la sintesi con la voce naturale) parla dal
           SUO window: togliere l'iframe non lo zittisce — la voce di sistema non è
           appesa al DOM e sull'iPad continuava a pannello chiuso */
        Array.prototype.forEach.call(corpo.querySelectorAll('iframe'), function (fr) {
            try { fr.contentWindow.speechSynthesis.cancel(); } catch (e) { }
            try { fr.contentDocument.querySelectorAll('audio, video').forEach(function (a) { a.pause(); }); } catch (e) { }
        });
        try { if (window.MappAITTS && window.MappAITTS.invalidate) window.MappAITTS.invalidate(); } catch (e) { }
        try { if (window.MappAILetturaVeloce) window.MappAILetturaVeloce.chiudi(); } catch (e) { }
        corpo.innerHTML = ''; chiediChiusura = null;
    }
    /* ── «STAMPA» SULL'IPAD (task 0036, 26/9) ─────────────────────────────────
       Nella WKWebView `window.print()` non fa niente (misurato nel simulatore:
       nessun menu, nessun avviso). Il `print` dell'iframe si sostituisce al `load`
       con quello di `studente/stampa.js`: il plugin nativo `Stampa` riceve il
       file:// vero del documento e apre il menu di stampa di iOS; nel browser
       resta l'originale. Un aggancio solo vale per la stampante della sintesi
       (anche quella della fila dell'app, che ne preme il bottone) e per il
       «Stampa» della `.mm-doc-bar`: chiamano tutti `window.print()`. */
    function pluginStampa() { var FSP = window.MappAIStudenteFS && window.MappAIStudenteFS.plugin; return FSP ? FSP('Stampa') : null; }
    function avvisaStampa(m) { toast(m, 'error'); }
    function agganciaStampa(f, o) {
        var St = window.MappAIStudenteStampa; if (!St) return;
        St.aggancia(f, { plugin: pluginStampa, url: o.fileUri || null, titolo: o.titolo, avvisa: avvisaStampa, prefisso: t('st_stampa_ko', 'Non riesco a stampare: ') });
    }
    /* la stampante nella testata del pannello, per i documenti che non hanno una
       barra loro (i PDF): accanto alla × */
    function stampante(fn) {
        var testa = dock.querySelector('.sd-testa'), x = testa.querySelector('.sd-chiudi');
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'sd-stampa';
        b.setAttribute('title', t('st_stampa', 'Stampa')); b.setAttribute('aria-label', t('st_stampa', 'Stampa'));
        b.innerHTML = '<i data-lucide="printer"></i>';
        b.addEventListener('click', function () { fn(); });
        testa.insertBefore(b, x);
        if (window.safeCreateIcons) window.safeCreateIcons();
    }
    /* il file:// vero di un file del vault (sull'iPad), null nel browser */
    function uriVero(vaultPath, relPath) {
        var FSP = window.MappAIStudenteFS && window.MappAIStudenteFS.plugin;
        var Fs = FSP ? FSP('Filesystem') : null;
        if (!Fs) return Promise.resolve(null);
        var vp = vaultPath.replace(/^Documents\/?/, '');
        return Fs.getUri({ path: (vp ? vp + '/' : '') + relPath, directory: 'DOCUMENTS' }).then(function (u) { return u.uri; });
    }

    /* apri({ titolo, iframe: url, fileUri? } | { titolo, monta: fn(host) } | { titolo, html }, chiediChiusura: fn→Promise<bool>, stampa: fn ) */
    function apri(o) {
        if (!monta()) return null;
        o = o || {};
        if (chiediChiusura && o.monta !== undefined) { /* una prova in corso: si sostituisce solo con conferma */ }
        libera();
        titolo.textContent = o.titolo || '';
        chiediChiusura = typeof o.chiediChiusura === 'function' ? o.chiediChiusura : null;
        collasso = null; misura(memoria());
        if (o.iframe) {
            var f = document.createElement('iframe'); f.className = 'sd-iframe'; f.src = o.iframe;
            f.addEventListener('load', function () { agganciaStampa(f, o); vesti(f); });
            corpo.appendChild(f);
        } else if (o.html) corpo.innerHTML = o.html;
        else if (typeof o.monta === 'function') o.monta(corpo);
        if (typeof o.stampa === 'function') stampante(o.stampa);
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
            if (lettoreApp(f, d)) return;
            var cmd = d.querySelector('#ap-topbar .ap-cmd');
            /* LA LETTURA VELOCE (17/9): nella stessa fila, prima della ×. Il documento
               si nasconde e nel pannello resta solo la parola che scorre; la sua × lo
               riporta (mappai-lettura-veloce.js, lo stesso strumento della scheda). */
            if (cmd && window.MappAILetturaVeloce && !d.getElementById('sd-rsvp')) {
                var lv = d.createElement('button');
                lv.id = 'sd-rsvp'; lv.type = 'button'; lv.className = 'ap-hdr-btn';
                lv.setAttribute('title', t('rsvp_titolo', 'Lettura veloce'));
                lv.setAttribute('aria-label', t('rsvp_titolo', 'Lettura veloce'));
                /* solo l'icona: con la parola la fila si allargava e il player del
                   documento finiva sopra «Aa x1» (misurato a 800 px). Lucide sta nella
                   pagina, non nel documento: l'SVG si crea qui e si importa. */
                try { lv.appendChild(d.importNode(window.lucide.createElement(window.lucide.icons.Gauge), true)); }
                catch (e) { lv.textContent = t('rsvp_titolo', 'Lettura veloce'); }
                if (lv.firstChild && lv.firstChild.setAttribute) {
                    lv.firstChild.setAttribute('width', '16'); lv.firstChild.setAttribute('height', '16');
                    lv.firstChild.style.verticalAlign = '-3px';
                }
                lv.addEventListener('click', function () {
                    var nome = (titolo && titolo.textContent) || '';
                    window.MappAILetturaVeloce.daIframe(f, nome.replace(/\.[^.]+$/, ''));
                });
                cmd.appendChild(lv);
            }
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
    /* ── IL LETTORE DELL'APP AL POSTO DI QUELLO DEL DOCUMENTO (17/9) ─────────
       La sintesi porta un lettore suo, scritto dentro il file. Se il file NON ha
       la voce naturale (`#ap-audio`), quel lettore non sa niente che quello
       dell'app non sappia, e sa meno: niente effetti karaoke. Allora la sua
       testata si spegne e nella testata del dock entra la fila dell'app, la
       stessa dei nodi: ⟲10 · ▶ · 5⟳ · velocità · effetto · avanzamento, poi Aa,
       Riga, lettura veloce, stampa e la × del dock. «Evidenzia» sparisce: al suo
       posto c'è il bottone degli effetti. Aa, Riga e Stampa restano del
       documento (se ne premono i bottoni nascosti): la taglia e la riga sono sue.
       I ▶ davanti ai titoli passano al lettore dell'app.
       Con la voce naturale non si tocca niente: l'MP3 il chip dell'app non lo
       suona ancora. */
    function lettoreApp(f, d) {
        var T = window.MappAITTS;
        if (!T || !T.fila || !dock || d.getElementById('ap-audio') || !d.getElementById('ap-topbar')) return false;
        var body = d.querySelector('.bs-body') || d.body;
        var st = d.createElement('style'); st.id = 'sd-lettore-app';
        st.textContent = '#ap-topbar,#ap-spacer{display:none !important}';
        d.head.appendChild(st);

        var testa = dock.querySelector('.sd-testa');
        var host = document.createElement('div'); host.className = 'sd-fila';
        testa.insertBefore(host, testa.querySelector('.sd-sp'));
        var aa = d.getElementById('ap-dys-btn'), riga = d.getElementById('ap-riga-btn'), stampa = d.querySelector('.ap-print-btn');
        T.fila(host, {
            sganciabile: true,
            corpo: function () { return body; },
            /* la taglia la dicono le classi del documento, non l'etichetta (che
               nei file vecchi era «Aa Dislessia») */
            aa: aa ? {
                leggi: function () { var c = d.body.classList; return c.contains('ap-x2') ? '×2' : (c.contains('ap-x15') ? '×1.5' : '×1'); },
                premi: function () { aa.click(); }
            } : null,
            riga: riga ? {
                leggi: function () { return { t: (riga.textContent || '').replace(/^[^:]*:\s*/, ''), on: riga.classList.contains('on') }; },
                premi: function () { riga.click(); }
            } : null,
            veloce: window.MappAILetturaVeloce ? function () {
                var nome = (titolo && titolo.textContent) || '';
                window.MappAILetturaVeloce.daIframe(f, nome.replace(/\.[^.]+$/, ''));
            } : null,
            altro: stampa ? [{ etichetta: t('st_stampa', 'Stampa'), icona: 'printer', azione: function () { stampa.click(); } }] : []
        });

        /* i ▶ davanti ai titoli chiamerebbero il lettore del documento: in fase
           di cattura si fermano qui e partono con quello dell'app */
        d.addEventListener('click', function (e) {
            var b = e.target && e.target.closest ? e.target.closest('.ap-sec') : null;
            if (!b) return;
            e.stopPropagation(); e.preventDefault();
            var h = b.closest('h3, h4');
            if (h && T.playFromNode) T.playFromNode(body, h);
        }, true);
        if (window.safeCreateIcons) window.safeCreateIcons();
        return true;
    }
    function chiudi() {
        if (!dock || dock.hidden) return;
        dock.hidden = true; libera(); collasso = null; ingombro(0, 0);
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
            /* l'URI vero resta accanto all'iframe: è quello che la stampa di iOS carica */
            return uriVero(vaultPath, relPath).then(function (uri) {
                apri({ titolo: nome, iframe: C.convertFileSrc(uri), fileUri: uri });
            }).catch(function () { return apriBlob(vaultPath, relPath, nome); });
        }
        return apriBlob(vaultPath, relPath, nome);
    }
    function apriPdf(vaultPath, relPath, nome) {
        var V = window.MappAIStudentePdfVista;
        if (!V) return apriBlob(vaultPath, relPath, nome);
        return window.electronAPI.readVaultFile({ vaultPath: vaultPath, relPath: relPath }).then(function (r) {
            if (!r || !r.ok) { toast(t('st_file_ko', 'Non riesco ad aprire il file.') + (r && r.error ? ' ' + r.error : ''), 'error'); return; }
            apri({
                titolo: nome,
                monta: function (host) { host.classList.add('sd-corpo--pdf'); V.monta(host, r.base64); },
                stampa: function () { stampaPdf(vaultPath, relPath, nome, r.base64); }
            });
        });
    }
    /* LA STAMPA DI UN PDF (26/9): sull'iPad il file va a iOS così com'è (il plugin
       `Stampa` lo passa a `UIPrintInteractionController`, che lo impagina da sé);
       nel browser si apre in una scheda sua, dove il visore del browser ha la sua
       stampante. */
    function stampaPdf(vaultPath, relPath, nome, base64) {
        var St = window.MappAIStudenteStampa; if (!St) return;
        St.stampaFile({
            plugin: pluginStampa, titolo: nome, avvisa: avvisaStampa, prefisso: t('st_stampa_ko', 'Non riesco a stampare: '),
            url: function () { return uriVero(vaultPath, relPath); },
            altrimenti: function () {
                var url = URL.createObjectURL(b64ToBlob(base64, 'application/pdf'));
                if (!window.open(url, '_blank')) toast(t('st_popup', 'Il browser ha bloccato la finestra di stampa.'), 'warning');
                setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
            }
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
            /* la sintesi ha la sua riga qui sotto («Sintesi»): nell'elenco sopra
               comparirebbe due volte (Giacomo, 17/9) */
            var elenco = sintesi ? files.filter(function (f) { return f !== sintesi; }) : files;
            if (!files.length) html += '<p class="sd-vuoto">' + esc(t('st_nessun_materiale', 'Questa mappa non porta materiali oltre ai set.')) + '</p>';
            elenco.forEach(function (f) {
                var g = (C1 && C1.inAllegati && C1.inAllegati(f)) ? { et: t('st_g_scheda', 'La scheda del docente'), icona: 'book-open' }
                    : (genere(f.name) || { et: t('st_file', 'File'), icona: 'file' });
                html += '<button type="button" class="sd-riga" data-rel="' + esc(f.relPath) + '" data-nome="' + esc(f.name) + '">' +
                    '<i data-lucide="' + g.icona + '"></i><span class="sd-riga__t"><b>' + esc(g.et) + '</b><small>' + esc(f.name) + '</small></span></button>';
            });
            html += '<h4 class="sd-h">' + esc(t('st_stampa_mappa', 'Stampa dalla mappa')) + '</h4>' +
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
       `apri:<id>` la riga → il documento nel dock · `stampa:<id>` → sull'iPad il
       menu di stampa di iOS (plugin `Stampa`: `window.print()` nella WKWebView non
       fa niente; oggi la tabella non offre questa cella, studia-core), nel browser
       l'HTML in una finestra e `window.print()` · `cartella:<id>`
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
            if (pluginStampa() && window.MappAIStudenteStampa) {
                window.MappAIStudenteStampa.stampaFile({
                    plugin: pluginStampa, titolo: s.nome || s.id, avvisa: avvisaStampa, prefisso: t('st_stampa_ko', 'Non riesco a stampare: '),
                    url: function () { return uriVero(vaultPath, base + (s.html || 'risposte.html')); }
                });
                return;
            }
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

    /* ── SALVA MAPPA IN PDF (Giacomo, 17/9) ──────────────────────────────────
       Su iPad `jsPDF.save` non scrive niente e l'avviso verde mentiva. I moduli di
       MappAI chiamano questo gancio al posto di `save`: il PDF va nella cartella
       «MAPPE PDF» del progetto, col nome di `studia-core.nomePdfMappa`. */
    window.MappAISalvaPdf = function (doc) {
        var s = S(), vp = s && s.activeVaultPath, C = window.MappAIStudiaCore, api = window.electronAPI;
        if (!vp) { toast(t('st_no_vault', 'Apri prima una mappa.'), 'warning'); return Promise.resolve(); }
        var FSx = window.MappAIStudenteFS;
        return (FSx ? FSx.lista(vp + '/MAPPE PDF') : Promise.resolve([])).catch(function () { return []; }).then(function (figli) {
            var nome = C.nomePdfMappa(vp.split('/').pop(), new Date(), (figli || []).map(function (f) { return f.name; }));
            return api.saveVaultFile({ vaultPath: vp, relPath: 'MAPPE PDF/' + nome, base64: doc.output('datauristring') }).then(function (r) {
                if (r && r.ok) toast(t('st_pdf_salvato', 'Mappa salvata in MAPPE PDF: ') + nome, 'success');
                else toast(t('st_pdf_ko', 'Non riesco a salvare il PDF.') + (r && r.error ? ' ' + r.error : ''), 'error');
            });
        });
    };

    window.MappAIStudenteDocumenti = { aperto: function () { return !!(dock && !dock.hidden); }, apri: apri, chiudi: chiudi, chiudiChiedendo: chiudiChiedendo, orientamento: orientamento, materiali: materiali, apriFile: apriFile, azione: azione, genere: genere, corpo: function () { return corpo; } };
}());
