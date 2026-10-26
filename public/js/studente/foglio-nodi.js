/*
 * studente/foglio-nodi.js — il «Foglio dei nodi» dello studente, a tutto schermo
 * ---------------------------------------------------------------------------
 * Packet 0126, allargamento 2 (Giacomo, 25/10, sul mockup: «B ma in full screen»).
 * La finestra del docente (`openNodeLabelsPrintModal`) è fitta di opzioni e parla
 * al docente; qui una riga sola: «Titoli», «Parole chiave», «Descrizioni» (la
 * grandezza segue il contenuto), la tendina «L[n] · [N] nodi», «PDF» e la ×.
 * Sotto, l'anteprima VERA: il generatore di MappAI (`printAllNodeLabels`, con
 * `toDisk` non salva niente) e pdf.js del reader, una pagina alla volta; si
 * sfoglia col dito (swipe) o con le frecce piccole, «n/N». «PDF» chiama lo stesso
 * generatore senza `toDisk`: sull'iPad il PDF va in `Studio Attivo/Stampe` e si
 * apre la condivisione (adapter.js), nel browser si scarica.
 * La parte pura (contenuti, livelli, pagine) è in foglio-nodi-core.js.
 */
(function () {
    'use strict';
    if (window.MappAIStudenteFoglioNodi) return;

    function t(k, f) { try { return (window.t ? window.t(k, f) : f) || f; } catch (e) { return f; } }
    function toast(m, k) { if (window.showToast) window.showToast(m, k || 'info'); }
    function esc(x) { var d = document.createElement('div'); d.textContent = x == null ? '' : String(x); return d.innerHTML; }
    function S() { try { return (typeof appState !== 'undefined') ? appState : window.appState; } catch (e) { return window.appState; } }
    function F() { return window.MappAIStudenteFoglioNodiCore; }
    function byte(b64) {
        var bin = atob(String(b64).replace(/^data:[^,]*,/, '')), n = bin.length, u = new Uint8Array(n);
        for (var i = 0; i < n; i++) u[i] = bin.charCodeAt(i);
        return u;
    }

    var w = null, st = null;

    function apri() {
        var s = S();
        if (!s || !s.db || !s.db.nodes || !s.db.nodes.length) { toast(t('st_no_vault', 'Apri prima una mappa.'), 'warning'); return; }
        if (typeof window.printAllNodeLabels !== 'function' || !F()) { toast(t('sf_manca', 'Il foglio dei nodi non è disponibile.'), 'error'); return; }
        chiudi();
        var L = F().livelli(s.db.nodes);
        st = { k: 'titoli', L: L, liv: L[L.length - 1] || null, doc: null, pag: 0, n: 0, gen: 0, cache: {}, compito: null };
        w = document.createElement('div');
        w.id = 'sf-nodi'; w.setAttribute('role', 'dialog'); w.setAttribute('aria-modal', 'true');
        w.setAttribute('aria-label', t('st_foglio_nodi', 'Foglio dei nodi'));
        w.innerHTML =
            '<div class="sf-barra">' +
            '<div class="sf-seg" role="radiogroup" aria-label="' + esc(t('sf_contenuto', 'Che cosa scrivere sulle etichette')) + '">' +
            F().CONTENUTI.map(function (c) { return '<button type="button" role="radio" data-k="' + c.k + '">' + esc(t('sf_' + c.k, c.et)) + '</button>'; }).join('') +
            '</div>' +
            '<select class="sf-liv" aria-label="' + esc(t('sf_quali', 'Quali nodi')) + '">' +
            L.map(function (l, i) { return '<option value="' + i + '"' + (l === st.liv ? ' selected' : '') + '>' + esc(l.et) + '</option>'; }).join('') +
            '</select>' +
            '<span class="sf-sp"></span>' +
            '<button type="button" class="sf-pdf">' + esc(t('sf_pdf', 'PDF')) + '</button>' +
            '<button type="button" class="sf-x" aria-label="' + esc(t('mm_chiudi', 'Chiudi')) + '">&times;</button>' +
            '</div>' +
            '<div class="sf-ante"><canvas aria-label="' + esc(t('sf_anteprima', 'Anteprima del foglio')) + '"></canvas><p class="sf-msg"></p>' +
            '<div class="sf-pag"><button type="button" class="sf-prec" aria-label="' + esc(t('sf_prec', 'Pagina precedente')) + '">‹</button>' +
            '<span class="sf-n"></span>' +
            '<button type="button" class="sf-succ" aria-label="' + esc(t('sf_succ', 'Pagina successiva')) + '">›</button></div></div>';
        document.body.appendChild(w);

        w.querySelector('.sf-seg').addEventListener('click', function (e) {
            var b = e.target.closest && e.target.closest('[data-k]'); if (!b || b.getAttribute('data-k') === st.k) return;
            st.k = b.getAttribute('data-k'); segna(); genera();
        });
        w.querySelector('.sf-liv').addEventListener('change', function (e) { st.liv = st.L[Number(e.target.value)] || null; genera(); });
        w.querySelector('.sf-pdf').addEventListener('click', pdf);
        w.querySelector('.sf-x').addEventListener('click', chiudi);
        w.querySelector('.sf-prec').addEventListener('click', function () { vai(-1); });
        w.querySelector('.sf-succ').addEventListener('click', function () { vai(1); });
        /* lo swipe: un trascinamento orizzontale sull'anteprima sfoglia (in verticale resta lo scorrimento) */
        var ante = w.querySelector('.sf-ante'), giu = null;
        ante.addEventListener('pointerdown', function (e) { giu = { x: e.clientX, y: e.clientY }; });
        ante.addEventListener('pointerup', function (e) {
            if (!giu) return;
            var dx = e.clientX - giu.x, dy = e.clientY - giu.y; giu = null;
            if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) vai(dx < 0 ? 1 : -1);
        });
        ante.addEventListener('pointercancel', function () { giu = null; });
        document.addEventListener('keydown', tasti);
        window.addEventListener('resize', ridisegna);
        segna(); genera();
    }

    function segna() {
        [].forEach.call(w.querySelectorAll('.sf-seg [data-k]'), function (b) { b.setAttribute('aria-checked', String(b.getAttribute('data-k') === st.k)); });
    }
    function msg(testo) { if (w) w.querySelector('.sf-msg').textContent = testo || ''; }

    /* l'anteprima: il PDF vero, tenuto per contenuto e livello (tornare indietro non rigenera) */
    function genera() {
        var gen = ++st.gen, chiave = st.k + '|' + (st.liv ? st.liv.livello : 'all');
        var opz = F().opzioni(st.k, st.liv);
        msg(t('sf_preparo', 'Preparo l\'anteprima…'));
        var pronto = st.cache[chiave] ? Promise.resolve(st.cache[chiave]) :
            Promise.resolve(window.printAllNodeLabels(Object.assign({}, opz, { toDisk: { vaultPath: (S() || {}).activeVaultPath || '' } }))).then(function (r) {
                if (!r || !r.ok || !r.base64) throw new Error((r && r.error) || t('sf_vuoto', 'nessun foglio'));
                return window.MappAIStudentePdfVista.libreria().then(function (pdfjs) { return pdfjs.getDocument({ data: byte(r.base64) }).promise; });
            }).then(function (doc) { st.cache[chiave] = doc; return doc; });
        pronto.then(function (doc) {
            if (!w || gen !== st.gen) return;
            st.doc = doc; st.n = doc.numPages; st.pag = 0;
            return pagina();
        }).catch(function (e) { if (w && gen === st.gen) msg(t('sf_ko', 'Anteprima non riuscita: ') + ((e && e.message) || '')); });
    }

    function pagina() {
        if (!w || !st.doc) return;
        var gen = st.gen, i = st.pag;
        return st.doc.getPage(i + 1).then(function (p) {
            if (!w || gen !== st.gen || i !== st.pag) return;
            var ante = w.querySelector('.sf-ante'), cv = ante.querySelector('canvas');
            var W = ante.clientWidth - 32, H = ante.clientHeight - 32 - w.querySelector('.sf-pag').offsetHeight - 10;
            var v1 = p.getViewport({ scale: 1 }), sc = Math.max(0.1, Math.min(W / v1.width, H / v1.height));
            var dpr = window.devicePixelRatio || 1, v = p.getViewport({ scale: sc * dpr });
            if (st.compito) { try { st.compito.cancel(); } catch (e) { } }
            cv.width = Math.floor(v.width); cv.height = Math.floor(v.height);
            cv.style.width = Math.floor(v.width / dpr) + 'px'; cv.style.height = Math.floor(v.height / dpr) + 'px';
            st.compito = p.render({ canvasContext: cv.getContext('2d'), viewport: v });
            return st.compito.promise.then(function () { st.compito = null; msg(''); conta(); }, function () { });
        });
    }
    function conta() {
        if (!w) return;
        w.querySelector('.sf-n').textContent = F().testoPagina(st.pag, st.n);
        w.querySelector('.sf-prec').disabled = st.pag <= 0;
        w.querySelector('.sf-succ').disabled = st.pag >= st.n - 1;
    }
    function vai(d) {
        if (!st || !st.n) return;
        var i = F().passo(st.pag, d, st.n);
        if (i === st.pag) return;
        st.pag = i; pagina();
    }
    var attesa = null;
    function ridisegna() { clearTimeout(attesa); attesa = setTimeout(pagina, 150); }
    function tasti(e) {
        if (!w) return;
        if (e.key === 'Escape') chiudi();
        else if (e.key === 'ArrowRight') vai(1);
        else if (e.key === 'ArrowLeft') vai(-1);
    }

    /* «PDF»: lo stesso generatore, con `toDisk` (il PDF torna in base64), e il file al menu di stampa di iOS, come
       la fonte (0126; Giacomo, 26/10: «il bottone PDF avvia il download del PDF che avviene in background, è possibile
       invece anche per questo bottone mostrare il menu di stampa?»): `stampaPdfB64` di documenti.js lo scrive in
       Studio Attivo/Stampe e lo stampa col nome «Progetto-Foglio nodi-data». */
    function pdf() {
        var C = window.MappAIStudiaCore, D = window.MappAIStudenteDocumenti, s = S() || {}, progetto = s.rootNodeLabel || '';
        var nome = C && C.nomeDocumento ? C.nomeDocumento({ progetto: progetto, tipo: 'Foglio nodi', data: new Date() }) : 'Foglio nodi';
        var opz = Object.assign({}, F().opzioni(st.k, st.liv), { fileName: nome + '.pdf' });
        toast(t('sf_creo', 'Creo il PDF…'), 'info');
        if (!D || !D.stampaPdfB64) {
            Promise.resolve(window.printAllNodeLabels(opz)).catch(function (e) { toast(t('sf_pdf_ko', 'PDF non creato: ') + ((e && e.message) || ''), 'error'); });
            return;
        }
        Promise.resolve(window.printAllNodeLabels(Object.assign({}, opz, { toDisk: { vaultPath: s.activeVaultPath || '' } }))).then(function (r) {
            if (!r || !r.ok || !r.base64) throw new Error((r && r.error) || t('sf_vuoto', 'nessun foglio'));
            return D.stampaPdfB64(r.base64, nome);
        }).catch(function (e) { toast(t('sf_pdf_ko', 'PDF non creato: ') + ((e && e.message) || ''), 'error'); });
    }

    function chiudi() {
        if (!w) return;
        document.removeEventListener('keydown', tasti);
        window.removeEventListener('resize', ridisegna);
        if (st) Object.keys(st.cache).forEach(function (k) { try { st.cache[k].destroy(); } catch (e) { } });
        w.remove(); w = null; st = null;
    }

    window.MappAIStudenteFoglioNodi = { apri: apri, chiudi: chiudi };
}());
