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
        [].concat(urlAperto || []).forEach(function (u) { try { URL.revokeObjectURL(u); } catch (e) { } }); urlAperto = null;   // uno o più (la scheda: HTML + foto)
        /* un PDF aperto tiene un documento pdf.js e un worker: si chiudono */
        if (corpo && corpo.__pulisci) { try { corpo.__pulisci(); } catch (e) { } corpo.__pulisci = null; corpo.__risistema = null; }
        corpo.classList.remove('sd-corpo--pdf');
        if (dock) dock.classList.remove('sd--senza-testa');
        var sb = dock && dock.querySelector('.sd-stampa'); if (sb) sb.remove();
        /* il report del quiz (0126): il suo «Stampa / PDF» e il titolo visibile valgono solo per lui */
        var sp = dock && dock.querySelector('.sd-stampa-pdf'); if (sp) sp.remove();
        if (dock) dock.classList.remove('sd--con-titolo');
        /* la fila del lettore dell'app vale per il documento che se ne va: si
           toglie, e la voce o la lettura veloce di quel documento tacciono */
        var fila = dock && dock.querySelector('.sd-fila'); if (fila) fila.remove();
        /* il contatore di una prova (0126) vale per la prova che se ne va */
        var sc = dock && dock.querySelector('.sd-conta'); if (sc) sc.remove();
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
    /* 0126, allargamento 6 (Giacomo: «Nella barra con la 'x' della fonte inserisci il bottone 'STAMPA/PDF' come
       nelle barre degli altri materiali»): il bottone dei report al posto dell'icona della stampante */
    function stampante(fn) {
        var testa = dock.querySelector('.sd-testa'), x = testa.querySelector('.sd-chiudi');
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'sd-stampa-pdf';
        /* «PDF», come il foglio dei nodi (Giacomo, 26/10: «Per coerenza modifica tutti i bottoni da 'STAMPA/PDF' in 'PDF'») */
        b.textContent = t('st_stampa_pdf', 'PDF');
        b.addEventListener('click', function () { fn(); });
        testa.insertBefore(b, x);
    }
    /* IL NOME DEI DOCUMENTI (0126, allargamento 6): «Progetto-Tipo-…-data» di studia-core; il progetto è la
       mappa aperta (la sua radice), o la cartella del vault. Solo la fonte stampa col suo nome. */
    function progetto(vp) { var s = S(); return (s && s.rootNodeLabel) || (vp ? String(vp).split('/').pop() : ''); }
    function nomeDi(tipo) {
        var C = window.MappAIStudiaCore, s = S();
        return C && C.nomeDocumento ? C.nomeDocumento({ progetto: progetto(s && s.activeVaultPath), tipo: tipo, data: new Date() }) : tipo;
    }
    /* il file:// vero di un file del vault (sull'iPad), null nel browser */
    function uriVero(vaultPath, relPath) {
        var FSP = window.MappAIStudenteFS && window.MappAIStudenteFS.plugin;
        var Fs = FSP ? FSP('Filesystem') : null;
        if (!Fs) return Promise.resolve(null);
        var vp = vaultPath.replace(/^Documents\/?/, '');
        return Fs.getUri({ path: (vp ? vp + '/' : '') + relPath, directory: 'DOCUMENTS' }).then(function (u) { return u.uri; });
    }

    /* apri({ titolo, iframe: url, fileUri? } | { titolo, monta: fn(host, conta), contatore? } | { titolo, html }, chiediChiusura: fn→Promise<bool>, stampa: fn ) */
    /* 0126, allargamento 4 (Giacomo, 26/10): la scelta delle domande su misura «a schermo intero», poi di nuovo
       «metà schermo mappa, metà schermo domande». Come la maniglia, ma lo chiede la prova (autotest › onFase). */
    function pieno(si) { collasso = si ? 'mappa' : null; misura(memoria()); window.dispatchEvent(new Event('resize')); }
    function apri(o) {
        if (!monta()) return null;
        o = o || {};
        if (chiediChiusura && o.monta !== undefined) { /* una prova in corso: si sostituisce solo con conferma */ }
        libera();
        titolo.textContent = o.titolo || '';
        chiediChiusura = typeof o.chiediChiusura === 'function' ? o.chiediChiusura : null;
        /* `mappaChiusa`: il documento nasce a tutto schermo, la maniglia verde sul bordo riporta la mappa (quiz MC a schermo pieno) */
        collasso = o.mappaChiusa ? 'mappa' : null; misura(memoria());
        /* I COMANDI BASE NELLA BARRA DELLA × (0126, Giacomo 24/10: «su iPad la barra con la 'x'
           della split deve contenere altri comandi base», come l'audio della Sintesi). Il primo:
           il contatore di una prova, a sinistra; chi monta lo riceve e lo dà alla view. */
        var conta = null;
        if (o.contatore) {
            var testa = dock.querySelector('.sd-testa');
            conta = document.createElement('span'); conta.className = 'sd-conta'; conta.setAttribute('aria-live', 'polite');
            testa.insertBefore(conta, testa.querySelector('.sd-sp'));
        }
        if (o.iframe) {
            var f = document.createElement('iframe'); f.className = 'sd-iframe'; f.src = o.iframe;
            f.addEventListener('load', function () { agganciaStampa(f, o); vesti(f); vestiReport(f, o); });
            corpo.appendChild(f);
        } else if (o.html) corpo.innerHTML = o.html;
        else if (typeof o.monta === 'function') o.monta(corpo, conta);
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
            /* Il bottone dice solo «Aa» (packet 0079 di MappAI re, regola di Giacomo del
               9/10): la taglia la dicono aria-label e suggerimento, mai la diagnosi
               («Aa Dislessia», 7/9). I documenti nuovi escono già così; quelli vecchi sul
               disco dello studente riciclano le loro etichette («Aa x1,5»…) a ogni clic,
               quindi si riscrive anche dopo. */
            var aa = d.getElementById('ap-dys-btn');
            if (aa) {
                aa.textContent = 'Aa';
                aa.addEventListener('click', function () {
                    setTimeout(function () { if ((aa.textContent || '') !== 'Aa') aa.textContent = 'Aa'; }, 0);
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
    /* ── IL REPORT DEL QUIZ NELLA BARRA DELLA × (0126, gate del 25/10) ─────────
       Il report del LIVE (`MappAILiveReports`, lo stesso «Report allievi» del docente) porta
       una barra sua, fissa in alto: «MappAI Live · Report allievi», «Stampa / PDF», «Chiudi».
       Nel pannello è una riga di troppo e «Chiudi» doppia la ×. Giacomo: «Sposta '[Nome
       progetto] · [Nome dei materiale] · Report allievo' e il bottone 'Stampa/PDF' nella
       barra dello split.» La barra del file (e lo spazio sotto, entrambi `.no-print`) si
       nasconde; nella barra del pannello il titolo si vede e «Stampa / PDF» chiama la
       stampa del documento (sull'iPad quella di iOS, `agganciaStampa`). */
    function vestiReport(f, o) {
        try {
            var d = f.contentDocument;
            if (!d || !d.head) return;
            /* la sintesi e i documenti di MappAI con la barra del lettore (`#ap-topbar`, `.no-print`, col suo bottone
               di stampa) non sono report: la stampante ce l'ha la fila dell'app (`lettoreApp`). Giacomo, 26/10: «Su
               SINTESI non applicare il bottone 'STAMPA/PDF' perché ingombra troppo spazio.» */
            if (d.getElementById('ap-topbar')) return;
            /* un report del LIVE ha la sua barra di stampa, che qui si nasconde; il foglio delle risposte delle
               domande aperte non l'ha, e col titolo prende lo stesso «Stampa / PDF» nella barra (0126, 26/10) */
            var barra = d.querySelector('.no-print button[onclick*="print"]');
            if (!barra && !o.titoloBarra) return;
            if (barra) {
                var st = d.createElement('style'); st.id = 'sd-report';
                st.textContent = '.no-print{display:none !important}';
                d.head.appendChild(st);
            }
            var testa = dock.querySelector('.sd-testa');
            if (o.titoloBarra) { titolo.textContent = o.titoloBarra; dock.classList.add('sd--con-titolo'); }
            if (!testa.querySelector('.sd-stampa-pdf')) {
                var b = document.createElement('button');
                b.type = 'button'; b.className = 'sd-stampa-pdf';
                b.textContent = t('st_stampa_pdf', 'PDF');
                b.addEventListener('click', function () { try { f.contentWindow.print(); } catch (e) { } });
                testa.insertBefore(b, testa.querySelector('.sd-chiudi'));
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
               nei file vecchi era «Aa Dislessia»); la fila vuole il NUMERO del fattore
               (0079: lo scrive lei, con `MappAIAa`) */
            aa: aa ? {
                leggi: function () { var c = d.body.classList; return c.contains('ap-x2') ? 2 : (c.contains('ap-x15') ? 1.5 : 1); },
                premi: function () { aa.click(); }
            } : null,
            /* lo stato della Riga: nei documenti dello 0079 il bottone è un'icona e lo
               stato sta nell'aria-label («Riga: stretta»); nei vecchi, nel testo */
            riga: riga ? {
                leggi: function () { return { t: (riga.getAttribute('aria-label') || riga.textContent || '').replace(/^[^:]*:\s*/, ''), on: riga.classList.contains('on') }; },
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
    /* il dossier caricato: la radice `fonte_0` (nodiDaScheda, deterministica) — la
       stessa prova di `buildVaultMapData › dossier` */
    function dossierAperto() {
        var s = S(), n = s && s.db && s.db.nodes;
        return !!(s && s.activeVaultPath && Array.isArray(n) && n.some(function (x) { return x && x.id === 'fonte_0'; }));
    }

    /* ── LA SCHEDA DI UN DOSSIER (4/10; veste della sintesi dal 5/10) ──────────
       La scheda ricomposta dai nodi (`studia-core › schedaDaNodi`: `pipeline.json` allo
       studente non arriva) e la foto di `Allegati/`.
       5/10 (Giacomo: «la stessa tool bar della sintesi … allinea gli stili»): il documento
       NON è più l'«Analisi della fonte» di quiz-print, ma esce dal costruttore della
       SINTESI (`MappAISynthesis.buildHtml`, copia di mappai-branch-synthesis) col testo
       che `studia-core › markdownDaScheda` gli scrive. Stessa barra `#ap-topbar`, stessi
       stili, e qui nel pannello la stessa veste (`vesti`) e lo stesso lettore dell'app
       (`lettoreApp`: ▶, velocità, effetto, Aa, Riga, lettura veloce, Stampa, ×) — una
       strada sola per i due documenti. Dal packet 0079 di MappAI re il costruttore
       prende `tipo` (testata e <title>) e la foto per indirizzo (`foto.src`, che scappa
       da sé): la foto NON entra in base64 (8 MB di JPEG → 11 MB dentro l'HTML). Il
       testo della scheda è `MappAIVisioneCore.markdownDaScheda` (neutralizza anche `$`:
       senza KaTeX una scheda con due prezzi non uscirebbe); quella di studia-core resta
       come ripiego.
       · iPad: l'HTML si scrive in `Studio Attivo/` e si apre dal file vero — la stampa
         di iOS carica quello (`fileUri`), e la foto ci arriva per percorso relativo;
       · browser: l'HTML e la foto sono due blob, revocati alla chiusura.
       5/10: si apre nel pannello ACCANTO alla foto (`mostraFoto`, al posto della mappa).
       La foto resta nel documento — la stampa e il PDF la portano — ma a schermo si
       nasconde quando è già accanto (`@media screen`). */
    var FOTO = /\.(png|jpe?g|webp|gif)$/i;
    function apriScheda(vaultPath) {
        var s = S(), C = window.MappAIStudiaCore, VC = window.MappAIVisioneCore, SY = window.MappAISynthesis;
        var sch = (s && s.db && C && C.schedaDaNodi && VC) ? C.schedaDaNodi(s.db.nodes, VC.BLOCCHI) : null;
        var md = (VC && VC.markdownDaScheda) ? VC.markdownDaScheda : (C && C.markdownDaScheda);
        if (!sch || !SY || !SY.buildHtml || !md) {
            toast(t('st_scheda_manca', 'Questo dossier non porta una scheda da leggere.'), 'warning');
            return Promise.resolve(false);
        }
        var tipo = t('st_analisi_fonte', 'Analisi della fonte');
        var html = function (src) {
            var h = SY.buildHtml({
                branchLabel: sch.titolo, mapName: sch.titolo, rawText: md(sch, VC.BLOCCHI), sourcesArr: [],
                classe: s.db.classe || undefined, materia: s.db.materia || undefined, tipo: tipo,
                foto: src ? { src: src, titolo: sch.titolo } : null
            });
            if (superficie && superficie.vp === vaultPath) h = h.replace('</head>', '<style id="sd-foto-accanto">@media screen{.bs-fonte{display:none}}</style></head>');
            return h;
        };
        var FSP = window.MappAIStudenteFS && window.MappAIStudenteFS.plugin;
        var Fs = FSP ? FSP('Filesystem') : null, Cap = window.Capacitor;
        return fotoDelDossier(vaultPath)
            .then(function (foto) {
                var nelBrowser = function () {
                    var conFoto = foto ? window.electronAPI.readVaultFile({ vaultPath: vaultPath, relPath: foto.relPath })
                        .then(function (r) { return (r && r.ok) ? URL.createObjectURL(b64ToBlob(r.base64, mime(foto.name))) : ''; }, function () { return ''; })
                        : Promise.resolve('');
                    return conFoto.then(function (fotoUrl) {
                        var url = URL.createObjectURL(new Blob([html(fotoUrl)], { type: 'text/html' }));
                        apri({ titolo: sch.titolo, iframe: url });
                        urlAperto = fotoUrl ? [url, fotoUrl] : url;   // dopo `apri`: il suo `libera` revoca i precedenti
                        return true;
                    });
                };
                if (!(Fs && Cap && Cap.convertFileSrc)) return nelBrowser();
                var rel = 'Studio Attivo/Analisi della fonte.html';
                return window.electronAPI.saveVaultFile({ vaultPath: vaultPath, relPath: rel, text: html(foto ? '../Allegati/' + encodeURIComponent(foto.name) : '') })
                    .then(function (w) { if (!w || !w.ok) throw new Error((w && w.error) || 'scrittura'); return uriVero(vaultPath, rel); })
                    .then(function (uri) { apri({ titolo: sch.titolo, iframe: Cap.convertFileSrc(uri), fileUri: uri }); return true; })
                    .catch(function () { return nelBrowser(); });
            });
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
    /* `extra.titoloBarra` (0126): il titolo che un report del LIVE mostra nella barra della × */
    function apriFile(vaultPath, relPath, nome, extra) {
        extra = extra || {};
        /* i PDF NON vanno in un iframe: nella WKWebView si vedrebbe solo la prima
           pagina, senza scorrimento né pinch (misurato sull'iPad il 7/9). Li disegna
           `studente/pdf-vista.js` con pdf.js. */
        if (/\.pdf$/i.test(nome || relPath)) return apriPdf(vaultPath, relPath, nome);
        if (/\.(png|jpe?g|webp|gif)$/i.test(nome || relPath)) return apriImmagine(vaultPath, relPath, nome);
        /* sull'iPad il file si carica dal suo URL vero (`capacitor://…` via convertFileSrc):
           l'HTML della sintesi apre così anche l'audio che sta accanto (percorsi relativi),
           cosa che un blob: non può fare; ed è la stessa strada che la WKWebView usa per i PDF */
        var FSP = window.MappAIStudenteFS && window.MappAIStudenteFS.plugin;
        var Fs = FSP ? FSP('Filesystem') : null, C = window.Capacitor;
        if (Fs && C && C.convertFileSrc) {
            /* l'URI vero resta accanto all'iframe: è quello che la stampa di iOS carica */
            return uriVero(vaultPath, relPath).then(function (uri) {
                apri({ titolo: nome, iframe: C.convertFileSrc(uri), fileUri: uri, titoloBarra: extra.titoloBarra });
            }).catch(function () { return apriBlob(vaultPath, relPath, nome, extra); });
        }
        return apriBlob(vaultPath, relPath, nome, extra);
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
    /* LE IMMAGINI (4/10): la foto di un dossier (0067) sta in `Allegati/` ed è grande
       (6500×4812 quella misurata). In un iframe diventava una pagina con la sola
       immagine a grandezza naturale: nel pannello se ne vedeva un angolo, e sull'iPad
       un iframe non si ingrandisce col pinch (la ragione dei PDF, 7/9). Qui un `<img>`
       nel pannello: a zoom 1 la foto è INTERA (Giacomo, 4/10); si ingrandisce col
       pinch del visore PDF (`pizzica`; ⌘ + rotella sul Mac) fino ai suoi pixel veri.
       Sull'iPad la sorgente è il file vero (convertFileSrc): niente base64 da 13 MB
       in memoria. Una foto non ha la stampante: il plugin conosce HTML e PDF. */
    /* la sorgente di un'immagine del vault: sull'iPad il file vero, nel browser un blob
       (`blob: true` → chi la usa la revoca) */
    function sorgenteImmagine(vaultPath, relPath, nome) {
        var C = window.Capacitor;
        var vero = (C && C.convertFileSrc) ? uriVero(vaultPath, relPath).catch(function () { return null; }) : Promise.resolve(null);
        return vero.then(function (uri) {
            if (uri) return { src: C.convertFileSrc(uri) };
            return window.electronAPI.readVaultFile({ vaultPath: vaultPath, relPath: relPath }).then(function (r) {
                if (!r || !r.ok) return { errore: (r && r.error) || '' };
                return { src: URL.createObjectURL(b64ToBlob(r.base64, mime(nome || relPath))), blob: true };
            });
        });
    }
    function apriImmagine(vaultPath, relPath, nome) {
        /* la foto di un dossier è già al posto della mappa: chiudere il pannello la
           lascia a tutto schermo, invece di mostrarla due volte */
        if (superficie && superficie.vp === vaultPath && superficie.rel === relPath) { chiudi(); return Promise.resolve(); }
        return sorgenteImmagine(vaultPath, relPath, nome).then(function (s) {
            if (!s.src) { toast(t('st_file_ko', 'Non riesco ad aprire il file.') + (s.errore ? ' ' + s.errore : ''), 'error'); return; }
            apri({ titolo: nome, monta: function (host) { host.classList.add('sd-corpo--pdf'); vistaImmagine(host, s.src, nome); } });
            if (s.blob) urlAperto = s.src;   // dopo `apri`: il suo `libera` revoca quello di prima
        });
    }
    function vistaImmagine(host, src, nome) {
        host.innerHTML = '<div class="sp-scroll"><div class="sp-pila"><div class="sp-attesa">' + esc(t('st_pdf_carico', 'Apro il documento…')) + '</div></div></div>';
        var scroll = host.querySelector('.sp-scroll'), pila = host.querySelector('.sp-pila');
        var img = new Image(), z = 1;
        img.className = 'sp-img'; img.alt = nome || '';
        /* la scala di zoom 1: intera nel riquadro (meno il padding di .sp-scroll), mai
           più grande del vero — un'immagine piccola non si sgrana da sola */
        function intera() {
            if (!img.naturalWidth) return 1;
            var w = Math.max(60, scroll.clientWidth - 24), h = Math.max(60, scroll.clientHeight - 24);
            return Math.min(w / img.naturalWidth, h / img.naturalHeight, 1);
        }
        function rifai() {
            if (!img.naturalWidth) return;
            var k = intera() * z;
            img.style.width = Math.round(img.naturalWidth * k) + 'px';
            img.style.height = Math.round(img.naturalHeight * k) + 'px';
        }
        img.onload = function () { pila.innerHTML = ''; pila.appendChild(img); rifai(); };
        img.onerror = function () { pila.innerHTML = '<p class="sd-vuoto">' + esc(t('st_file_ko', 'Non riesco ad aprire il file.')) + '</p>'; };
        img.src = src;
        var V = window.MappAIStudentePdfVista;
        if (V && V.pizzica) V.pizzica(scroll, pila, function (nuovo) { z = nuovo; rifai(); }, function () { return z; },
            function () { return Math.max(6, 1 / intera()); });   // il tetto: i pixel veri, e almeno i 6× dei PDF
        window.addEventListener('resize', rifai);
        /* il riquadro cambia taglia anche senza `resize` della finestra: la maniglia dello
           split, girando l'iPad (5/10, la foto al posto della mappa) */
        var ro = window.ResizeObserver ? new ResizeObserver(function () { rifai(); }) : null;
        if (ro) ro.observe(scroll);
        var pulisci = function () { window.removeEventListener('resize', rifai); if (ro) ro.disconnect(); img.onload = img.onerror = null; };
        host.__risistema = rifai;
        host.__pulisci = pulisci;
        /* «Adatta»: di nuovo intera, dall'angolo */
        return { adatta: function () { z = 1; rifai(); scroll.scrollLeft = 0; scroll.scrollTop = 0; }, pulisci: pulisci };
    }

    /* ── LA FOTO AL POSTO DELLA MAPPA (5/10) ─────────────────────────────────
       Giacomo: aprendo la scheda, «la visualizzazione come l'apertura di una scheda da
       MappAI re in modalità LIM» (`mappai-proiezione.js › Proietta`), «già divisa a metà»,
       domande e flashcard fuori. Un dossier non ha una mappa da guardare: dove starebbe il
       canvas sta la FOTO di `Allegati/`, col visore delle immagini (intera, pinch, ⌘ +
       rotella) e due comandi — «Adatta» e la × che torna a STUDIA. Il documento (la scheda,
       la sintesi, una prova) sta nel pannello accanto, con la sua maniglia: lo split è
       quello di sempre, e la superficie ne segue l'ingombro con le stesse variabili del
       canvas (`--sd-w` / `--sd-h`). Portata la maniglia sul bordo, resta la sola foto o il
       solo documento. La × del pannello chiude il documento e lascia la foto. */
    var superficie = null;   /* { el, vp, rel, api, blob } */
    function fotoDelDossier(vaultPath) {
        return window.electronAPI.vaultMaterialsList({ vaultPath: vaultPath, dir: 'Allegati' })
            .then(function (r) { return ((r && r.files) || []).filter(function (f) { return FOTO.test(f.name); })[0] || null; }, function () { return null; });
    }
    function mostraFoto(vaultPath) {
        if (superficie && superficie.vp === vaultPath) { superficie.el.hidden = false; return Promise.resolve(true); }
        togliFoto();
        var main = document.getElementById('main-content');
        if (!main) return Promise.resolve(false);
        return fotoDelDossier(vaultPath).then(function (f) {
            if (!f) return false;
            return sorgenteImmagine(vaultPath, f.relPath, f.name).then(function (s) {
                if (!s.src) return false;
                var el = document.createElement('section');
                el.id = 'studente-foto';
                el.setAttribute('aria-label', t('st_foto_fonte', 'La fonte'));
                el.innerHTML = '<div class="sf-corpo"></div><div class="sf-bar">' +
                    '<button type="button" class="sf-btn" data-sf="adatta">' + esc(t('pj_adatta', 'Adatta')) + '</button>' +
                    '<button type="button" class="sf-btn" data-sf="torna" aria-label="' + esc(t('st_torna', 'Torna a STUDIA')) + '" title="' + esc(t('st_torna', 'Torna a STUDIA')) + '">&times;</button></div>';
                main.appendChild(el);
                var api = vistaImmagine(el.querySelector('.sf-corpo'), s.src, f.name);
                superficie = { el: el, vp: vaultPath, rel: f.relPath, api: api, blob: s.blob ? s.src : null };
                el.querySelector('[data-sf="adatta"]').addEventListener('click', function () { api.adatta(); });
                el.querySelector('[data-sf="torna"]').addEventListener('click', function () {
                    if (window.MappAIStudente && window.MappAIStudente.torna) window.MappAIStudente.torna();
                });
                return true;
            });
        });
    }
    function togliFoto() {
        if (!superficie) return;
        try { superficie.api.pulisci(); } catch (e) { }
        if (superficie.blob) { try { URL.revokeObjectURL(superficie.blob); } catch (e) { } }
        if (superficie.el.parentNode) superficie.el.parentNode.removeChild(superficie.el);
        superficie = null;
    }
    /* LA STAMPA DI UN PDF (26/9):sull'iPad il file va a iOS così com'è (il plugin
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
    /* un PDF fatto qui (il foglio dei nodi) al menu di stampa di iOS, come la fonte (0126; Giacomo, 26/10: «è possibile
       invece anche per questo bottone mostrare il menu di stampa?»): il file in Studio Attivo/Stampe (« (2)» se il nome
       c'è già), poi `stampaPdf` col suo nome. `nome` senza estensione. */
    function stampaPdfB64(base64, nome) {
        var s = S(), vp = s && s.activeVaultPath, C = window.MappAIStudiaCore, FSx = window.MappAIStudenteFS;
        if (!vp) { toast(t('st_no_vault', 'Apri prima una mappa.'), 'warning'); return Promise.resolve(); }
        var b64 = String(base64 || '').replace(/^data:[^,]*,/, '');
        return (FSx ? FSx.lista(vp + '/' + 'Studio Attivo/Stampe') : Promise.resolve([])).catch(function () { return []; }).then(function (figli) {
            var file = C && C.nomeLibero ? C.nomeLibero(nome + '.pdf', (figli || []).map(function (f) { return f.name; })) : nome + '.pdf';
            var rel = 'Studio Attivo/Stampe' + '/' + file;
            return window.electronAPI.saveVaultFile({ vaultPath: vp, relPath: rel, base64: b64 }).then(function (r) {
                if (!r || !r.ok) { toast(t('st_pdf_ko', 'Non riesco a salvare il PDF.') + (r && r.error ? ' ' + r.error : ''), 'error'); return; }
                stampaPdf(vp, rel, file, b64);
            });
        });
    }
    function apriBlob(vaultPath, relPath, nome, extra) {
        extra = extra || {};
        return window.electronAPI.readVaultFile({ vaultPath: vaultPath, relPath: relPath }).then(function (r) {
            if (!r || !r.ok) { toast(t('st_file_ko', 'Non riesco ad aprire il file.') + (r && r.error ? ' ' + r.error : ''), 'error'); return; }
            /* il tipo dal nome, o dal percorso se il nome è un titolo senza estensione (0126: le prove
               si aprono col nome della sessione, e un blob «octet-stream» resta una pagina bianca) */
            var url = URL.createObjectURL(b64ToBlob(r.base64, mime(/\.[a-z0-9]+$/i.test(nome || '') ? nome : relPath)));
            apri({ titolo: nome, iframe: url, titoloBarra: extra.titoloBarra });
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
        /* «Materiali» scritto nella barra della × (0126, allargamento 2: il pannello per gli studenti) */
        dock.classList.add('sd--con-titolo');
        var lista = function (dir) {
            return window.electronAPI.vaultMaterialsList(dir ? { vaultPath: vp, dir: dir } : { vaultPath: vp })
                .then(function (x) { return (x && x.files) || []; }).catch(function () { return []; });
        };
        Promise.all([lista(''), lista('Allegati')]).then(function (due) {
            var r = { files: due[0].concat(due[1]) };
            /* che cosa lo studente vede lo decide `studia-core.daMostrare`, uno solo per
               la console e per il pannello: niente .json, niente nascosti, e da
               «Materiale Studio» nessun PDF (le soluzioni in coda; la fonte
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
                var g = (C1 && C1.inAllegati && C1.inAllegati(f)) ? { et: t('st_g_fonte', 'La fonte'), icona: 'book-open' }
                    : (genere(f.name) || { et: t('st_file', 'File'), icona: 'file' });
                html += '<button type="button" class="sd-riga" data-rel="' + esc(f.relPath) + '" data-nome="' + esc(f.name) + '">' +
                    '<i data-lucide="' + g.icona + '"></i><span class="sd-riga__t"><b>' + esc(g.et) + '</b><small>' + esc(f.name) + '</small></span></button>';
            });
            /* per gli studenti (0126, allargamento 2): sotto ogni voce una frase che dice a che cosa serve,
               non il nome del file */
            html += '<h4 class="sd-h">' + esc(t('st_stampa_mappa', 'Stampa dalla mappa')) + '</h4>' +
                '<button type="button" class="sd-riga" data-fn="foglio-nodi"><i data-lucide="scissors"></i><span class="sd-riga__t"><b>' + esc(t('st_foglio_nodi', 'Foglio dei nodi')) + '</b><small>' + esc(t('st_foglio_nodi_d', 'Le etichette della mappa da stampare e ritagliare.')) + '</small></span></button>' +
                '<button type="button" class="sd-riga" data-fn="sintesi"><i data-lucide="sparkles"></i><span class="sd-riga__t"><b>' + esc(t('st_sintesi', 'Sintesi')) + '</b><small>' + esc(sintesi ? t('st_sintesi_d', 'Il riassunto della mappa, da leggere o da ascoltare.') : t('st_sintesi_manca', 'questa mappa non ha una sintesi')) + '</small></span></button>' +
                '<button type="button" class="sd-riga" data-fn="catena"><i data-lucide="git-branch"></i><span class="sd-riga__t"><b>' + esc(t('st_catena', 'Catena dei perché')) + '</b><small>' + esc(t('st_catena_d', 'Le cause e gli effetti della mappa.')) + '</small></span></button>';
            corpo.innerHTML = html;
            corpo.onclick = function (e) {
                var b = e.target.closest && e.target.closest('.sd-riga'); if (!b) return;
                var fn = b.getAttribute('data-fn');
                if (fn === 'sintesi') {
                    if (!sintesi) { toast(t('st_sintesi_manca_toast', 'Questa mappa non porta una sintesi: il docente non l\'ha pubblicata.'), 'info'); return; }
                    apriFile(vp, sintesi.relPath, nomeDi('Sintesi')); return;
                }
                if (fn === 'catena') { catenaNelPannello(); return; }
                if (fn === 'foglio-nodi') {
                    if (window.MappAIStudenteFoglioNodi) window.MappAIStudenteFoglioNodi.apri();
                    else if (typeof window.openNodeLabelsPrintModal === 'function') window.openNodeLabelsPrintModal();
                    return;
                }
                if (fn) { if (typeof window[fn] === 'function') window[fn](); return; }
                /* va in stampa col nome di `nomeDaStampare` (0126, allargamento 6) */
                var C2 = window.MappAIStudiaCore, f2 = { name: b.getAttribute('data-nome'), relPath: b.getAttribute('data-rel') };
                apriFile(vp, f2.relPath, C2 && C2.nomeDaStampare ? C2.nomeDaStampare(f2, progetto(vp), new Date()) : f2.name);
            };
            if (window.safeCreateIcons) window.safeCreateIcons();
        });
    }

    /* «CATENA DEI PERCHÉ» NEL PANNELLO (0126, allargamento 2). `MappAICausal.openDoc` (copiato
       da MappAI) scrive il documento in una finestra nuova (`window.open('', '_blank')`): nella
       WKWebView dell'iPad la finestra non c'è e lo studente leggeva «Sblocca i popup». Qui la
       finestra la fa il pannello: un `window.open` di passaggio raccoglie l'HTML, poi torna quello
       vero, e il documento si apre accanto alla mappa come la sintesi. */
    function catenaNelPannello() {
        var C = window.MappAICausal; if (!C || !C.openDoc) return;
        var preso = '', vero = window.open;
        window.open = function () { return { document: { write: function (h) { preso += h; }, close: function () { } }, focus: function () { } }; };
        try { C.openDoc(); } finally { window.open = vero; }
        if (!preso) return;   /* niente nessi: openDoc ha già detto perché */
        /* 0126, allargamento 6: da un file VERO in Studio Attivo/Stampe, col nome «Progetto-Catena perché-data»:
           aperta da un blob, sull'iPad la stampa diceva «il documento non ha un percorso sul disco» */
        var s = S(), vp = s && s.activeVaultPath; if (!vp) return;
        var nome = nomeDi('Catena perché'), rel = 'Studio Attivo/Stampe/' + nome + '.html';
        window.electronAPI.saveVaultFile({ vaultPath: vp, relPath: rel, text: preso }).then(function (r) {
            if (!r || !r.ok) { toast(t('st_catena_ko', 'Non riesco ad aprire la catena: ') + ((r && r.error) || ''), 'error'); return; }
            apriFile(vp, rel, nome);
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
                /* il report porta il suo titolo nella barra (0126): il quiz e, dal 26/10, le domande aperte (l'angolo,
                   o «Meta», l'ha scritto la sessione); si apre col nome del file, quello che la stampa propone */
                var C = window.MappAIStudiaCore, mc = s.tipo === 'Scelta multipla';
                var tb = ((mc || s.tipo === 'Domande aperte') && C) ? C.titoloReport({ mappa: s.mappa, tipo: mc ? 'mc' : 'aperte', angolo: s.angolo, t: window.t }) : '';
                window.MappAIStudente.apriMappa(vaultPath).then(function () { apriFile(vaultPath, base + (s.html || 'risposte.html'), s.nomeFile || s.nome || s.id, { titoloBarra: tb }); });
            }
            return;
        }
        if (m[1] === 'stampa') {
            if (pluginStampa() && window.MappAIStudenteStampa) {
                window.MappAIStudenteStampa.stampaFile({
                    plugin: pluginStampa, titolo: s.nomeFile || s.nome || s.id, avvisa: avvisaStampa, prefisso: t('st_stampa_ko', 'Non riesco a stampare: '),
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
            var nome = C.nomePdfMappa(progetto(vp), new Date(), (figli || []).map(function (f) { return f.name; }));
            var b64 = doc.output('datauristring').split(',')[1];
            return api.saveVaultFile({ vaultPath: vp, relPath: 'MAPPE PDF/' + nome, base64: b64 }).then(function (r) {
                if (!r || !r.ok) { toast(t('st_pdf_ko', 'Non riesco a salvare il PDF.') + (r && r.error ? ' ' + r.error : ''), 'error'); return; }
                toast(t('st_pdf_salvato', 'Mappa salvata in MAPPE PDF: ') + nome, 'success');
                /* e il menu di stampa di iOS, come il foglio dei nodi (Giacomo, 26/10: «Anche in questo caso apri il menu di stampa») */
                stampaPdf(vp, 'MAPPE PDF/' + nome, nome, b64);
            });
        });
    };

    window.MappAIStudenteDocumenti = { aperto: function () { return !!(dock && !dock.hidden); }, apri: apri, pieno: pieno, stampaPdfB64: stampaPdfB64, chiudi: chiudi, chiudiChiedendo: chiudiChiedendo, orientamento: orientamento, materiali: materiali, apriFile: apriFile, apriScheda: apriScheda, mostraFoto: mostraFoto, togliFoto: togliFoto, dossier: dossierAperto, azione: azione, genere: genere, corpo: function () { return corpo; } };
}());
