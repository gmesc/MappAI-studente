/*
 * studente/pdf-vista.js — i PDF si sfogliano e si ingrandiscono (pdf.js)
 * ---------------------------------------------------------------------------
 * ⚠️ PERCHÉ ESISTE (Giacomo, 7/9, sull'iPad): un PDF dentro un `<iframe>` nella
 * WKWebView mostra SOLO LA PRIMA PAGINA, non scorre e non si ingrandisce col
 * pinch — è il visualizzatore di sistema, e da fuori non si comanda. Qui le
 * pagine si disegnano su tela con pdf.js: scorrono tutte in un pannello e il
 * pinch le ingrandisce davvero (la mappa stampata e il PDF della fonte sono i
 * documenti su cui uno studente ha più bisogno di zoomare).
 *
 * pdf.js (3.4.120, vendor) si carica alla PRIMA apertura di un PDF, non al
 * boot: sono 280 KB + un worker da 1 MB che chi non apre PDF non paga.
 * Le pagine si disegnano quando si avvicinano allo schermo (IntersectionObserver):
 * un foglio dei nodi da 30 pagine non blocca il pannello per disegnarle tutte.
 */
(function () {
    'use strict';
    if (window.MappAIStudentePdfVista) return;

    var LIB = 'js/vendor/pdf.min.js', WORKER = 'js/vendor/pdf.worker.min.js';
    var Z_MIN = 1, Z_MAX = 6, caricamento = null;

    function libreria() {
        if (window.pdfjsLib) { window.pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER; return Promise.resolve(window.pdfjsLib); }
        if (caricamento) return caricamento;
        caricamento = new Promise(function (res, rej) {
            var s = document.createElement('script');
            s.src = LIB;
            s.onload = function () {
                if (!window.pdfjsLib) return rej(new Error('pdf.js non si è dichiarato'));
                window.pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER;
                res(window.pdfjsLib);
            };
            s.onerror = function () { caricamento = null; rej(new Error('pdf.js non caricato')); };
            document.head.appendChild(s);
        });
        return caricamento;
    }

    function b64ToBytes(b64) {
        var bin = atob(String(b64).replace(/^data:[^,]*,/, '')), n = bin.length, u = new Uint8Array(n);
        for (var i = 0; i < n; i++) u[i] = bin.charCodeAt(i);
        return u;
    }

    /* monta(host, base64) → Promise<api>; `host.__pulisci` chiude il documento */
    function monta(host, base64) {
        host.innerHTML = '<div class="sp-attesa">' + (window.t ? window.t('st_pdf_carico', 'Apro il documento…') : 'Apro il documento…') + '</div>';
        var doc = null, pagine = [], z = 1, gen = 0, oss = null, scroll = null, pila = null;

        function pulisci() {
            if (oss) { oss.disconnect(); oss = null; }
            if (doc) { try { doc.destroy(); } catch (e) { } doc = null; }
            pagine = [];
        }
        host.__pulisci = pulisci;

        function larghezzaBase() { return Math.max(120, (scroll ? scroll.clientWidth : host.clientWidth) - 24); }

        /* la scala di una pagina: «riempi la larghezza» × lo zoom del dito */
        function scalaDi(vp1) { return (larghezzaBase() / vp1.width) * z; }

        function disegna(p) {
            if (p.gen === gen && p.pronta) return;
            p.gen = gen; p.pronta = true;
            var scala = scalaDi(p.vp1);
            /* la tela ha i pixel VERI dello schermo (fino a 2×): oltre, un A4 a
               zoom 6 supererebbe il tetto di memoria della tela su iPad */
            var dpr = Math.min(window.devicePixelRatio || 1, z > 3 ? 1 : 2);
            var vp = p.pagina.getViewport({ scale: scala * dpr });
            var c = p.tela;
            c.width = Math.floor(vp.width); c.height = Math.floor(vp.height);
            c.style.width = Math.floor(vp.width / dpr) + 'px';
            c.style.height = Math.floor(vp.height / dpr) + 'px';
            if (p.compito) { try { p.compito.cancel(); } catch (e) { } }
            p.compito = p.pagina.render({ canvasContext: c.getContext('2d'), viewport: vp });
            p.compito.promise.catch(function () { p.pronta = false; }).then(function () { p.compito = null; });
        }
        /* la misura del riquadro senza disegnare: tiene in piedi lo scorrimento
           anche per le pagine che non sono ancora state disegnate */
        function misura(p) {
            var scala = scalaDi(p.vp1);
            p.box.style.width = Math.floor(p.vp1.width * scala) + 'px';
            p.box.style.height = Math.floor(p.vp1.height * scala) + 'px';
        }
        function rifai() {
            gen++;
            pagine.forEach(function (p) { p.pronta = false; misura(p); });
            pagine.forEach(function (p) { if (vicina(p)) disegna(p); });
        }
        function vicina(p) {
            var r = p.box.getBoundingClientRect(), h = window.innerHeight || 800;
            return r.bottom > -h && r.top < h * 2;
        }

        return libreria().then(function (pdfjs) {
            return pdfjs.getDocument({ data: b64ToBytes(base64) }).promise;
        }).then(function (d) {
            doc = d;
            host.innerHTML = '<div class="sp-scroll"><div class="sp-pila"></div></div>';
            scroll = host.querySelector('.sp-scroll');
            pila = host.querySelector('.sp-pila');
            var attesi = [];
            for (var i = 1; i <= doc.numPages; i++) attesi.push(doc.getPage(i));
            return Promise.all(attesi).then(function (ps) {
                ps.forEach(function (pagina, i) {
                    var box = document.createElement('div');
                    box.className = 'sp-pagina';
                    var tela = document.createElement('canvas');
                    box.appendChild(tela); pila.appendChild(box);
                    var p = { pagina: pagina, box: box, tela: tela, vp1: pagina.getViewport({ scale: 1 }), gen: -1, pronta: false, compito: null };
                    box.setAttribute('aria-label', (window.t ? window.t('st_pdf_pagina', 'Pagina') : 'Pagina') + ' ' + (i + 1) + '/' + ps.length);
                    pagine.push(p); misura(p);
                });
                oss = new IntersectionObserver(function (voci) {
                    voci.forEach(function (v) {
                        if (!v.isIntersecting) return;
                        var p = pagine.filter(function (x) { return x.box === v.target; })[0];
                        if (p) disegna(p);
                    });
                }, { root: scroll, rootMargin: '400px 0px' });
                pagine.forEach(function (p) { oss.observe(p.box); });
                pizzica(scroll, pila, function (nuovo) { z = nuovo; rifai(); }, function () { return z; });
                window.addEventListener('resize', rifai);
                host.__risistema = rifai;
                return { pagine: pagine.length, distruggi: pulisci };
            });
        }).catch(function (e) {
            host.innerHTML = '<p class="sd-vuoto">' + (window.t ? window.t('st_pdf_ko', 'Non riesco a mostrare questo PDF.') : 'Non riesco a mostrare questo PDF.') + ' ' + (e && e.message ? String(e.message) : '') + '</p>';
            throw e;
        });
    }

    /* IL PINCH — con i TOCCHI, non con gli eventi `gesture*` di WebKit.
       ⚠️ Misurato sull'iPad l'8/9: con `touch-action: pan-x pan-y` il browser non fa
       più il suo pinch (che ci serviva spento, o zoomava la PAGINA) — e insieme al
       suo pinch spegne anche `gesturestart/change/end`, che da quel riconoscitore
       nascono. Restavano quindi due dita che non zoomavano niente. Gli eventi di
       TOCCO invece arrivano sempre: due dita, la distanza fra loro, e la scala è
       quella. `gesture*` resta agganciato al solo scopo di dire di no alla pagina.

       Durante il gesto si scala il mucchio con una trasformazione (fluida, nessun
       ridisegno) intorno al punto fra le dita; al rilascio si fissa lo zoom, si
       ridisegna alla risoluzione giusta e si sposta lo scorrimento in modo che quel
       punto resti dov'era: `nuovo = p·f − (p − vecchio)`, con `p` il punto in
       coordinate del mucchio e `f` il fattore di crescita. */
    function pizzica(scroll, pila, fatto, zoomOra) {
        var attivo = false, base = 1, k = 1, d0 = 1, px = 0, py = 0, sx0 = 0, sy0 = 0;
        function bordo() {
            var cs = window.getComputedStyle(scroll);
            return [parseFloat(cs.paddingLeft) || 0, parseFloat(cs.paddingTop) || 0];
        }
        function inizio(cx, cy, dist) {
            attivo = true; base = zoomOra(); k = 1; d0 = dist || 1;
            var r = scroll.getBoundingClientRect(), b = bordo();
            sx0 = scroll.scrollLeft; sy0 = scroll.scrollTop;
            px = cx - r.left + sx0 - b[0];
            py = cy - r.top + sy0 - b[1];
            pila.style.transformOrigin = px + 'px ' + py + 'px';
        }
        function durante(scala) {
            if (!attivo) return;
            k = Math.max(Z_MIN, Math.min(Z_MAX, base * scala)) / base;
            pila.style.transform = 'scale(' + k + ')';
        }
        function fine() {
            if (!attivo) return;
            attivo = false;
            pila.style.transform = ''; pila.style.transformOrigin = '';
            var z = Math.max(Z_MIN, Math.min(Z_MAX, base * k)), f = z / base;
            if (f === 1) return;
            fatto(z);
            scroll.scrollLeft = px * f - (px - sx0);
            scroll.scrollTop = py * f - (py - sy0);
        }
        function fra(e) {
            var a = e.touches[0], b = e.touches[1];
            return { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2, d: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) };
        }
        scroll.addEventListener('touchstart', function (e) {
            if (e.touches.length !== 2) return;
            var m = fra(e); inizio(m.x, m.y, m.d);
        }, { passive: true });
        scroll.addEventListener('touchmove', function (e) {
            if (!attivo || e.touches.length !== 2) return;
            e.preventDefault();                       /* niente scorrimento a due dita mentre si pizzica */
            durante(fra(e).d / d0);
        }, { passive: false });
        scroll.addEventListener('touchend', function () { fine(); }, { passive: true });
        scroll.addEventListener('touchcancel', function () { fine(); }, { passive: true });
        /* se il riconoscitore di WebKit parte lo stesso, non deve zoomare la PAGINA */
        ['gesturestart', 'gesturechange', 'gestureend'].forEach(function (n) {
            scroll.addEventListener(n, function (e) { if (e.cancelable) e.preventDefault(); });
        });
        /* col mouse: ctrl/⌘ + rotella */
        scroll.addEventListener('wheel', function (e) {
            if (!e.ctrlKey && !e.metaKey) return;
            e.preventDefault();
            inizio(e.clientX, e.clientY, 1); durante(e.deltaY < 0 ? 1.2 : 0.84); fine();
        }, { passive: false });
    }

    window.MappAIStudentePdfVista = { monta: monta, libreria: libreria };
}());
