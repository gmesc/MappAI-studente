/*
 * studente/lettura-veloce.js — la lettura veloce (RSVP) dalla scheda del nodo
 * ---------------------------------------------------------------------------
 * Una parola alla volta, al centro, con la lettera di fuoco in rosso: sempre
 * allo stesso punto, così l'occhio sta fermo (MappAIRsvpCore, da rsvp-reading
 * di Thomas Kolmans, MIT). Niente voce: si legge con gli occhi, alla velocità
 * scelta.
 *
 * Il pannello è quello della lettura ad alta voce (`.mai-tts-float` e il CSS
 * della parola `.mai-rsvp`, iniettati da mappai-tts-reader.js). Tre comandi:
 * play/pausa, la velocità in parole al minuto, e la PAROLA STESSA, che si
 * trascina (o si fa scorrere con la rotella) per tornare indietro o andare
 * avanti una parola alla volta. Sotto, la frase intera: un tocco su una parola
 * ci salta.
 *
 * Il bottone (icona `gauge`) entra nella barra degli strumenti di lettura
 * della scheda, accanto a «Leggi ad alta voce»: da FUORI, come la potatura
 * (RIUSO.md, regola 3), così il blocco #source-modal resta quello di MappAI.
 * Nasce qui il 17/9/2026; quando è finito si porta in MappAI re.
 */
(function () {
    'use strict';
    if (window.MappAILetturaVeloce) return;

    var LS_PPM = 'mappai_rsvp_ppm';
    var PASSO_PX = 36;      /* trascinando: una parola ogni 36 px */
    var PASSO_ROTELLA = 40; /* con la rotella o il trackpad */

    function t(k, f) { try { return (window.t ? window.t(k, f) : f) || f; } catch (e) { return f; } }
    function C() { return window.MappAIRsvpCore; }
    function icone() { try { if (window.safeCreateIcons) window.safeCreateIcons(); } catch (e) { } }

    var R = { el: null, parole: [], frasi: [], i: 0, play: false, timer: null };

    function ppm() {
        var n = NaN;
        try { n = parseInt(localStorage.getItem(LS_PPM), 10); } catch (e) { }
        return (n >= C().MIN_PPM && n <= C().MAX_PPM) ? n : C().PPM;
    }

    /* Il testo visibile del corpo, senza ciò che il lettore ad alta voce salta
       (note, citazioni, comandi, la copia MathML delle formule). */
    function testoDi(body) {
        if (!body) return '';
        var c = body.cloneNode(true);
        c.querySelectorAll('sup, button, style, script, annotation, .katex-mathml, .bs-citations, [data-tts-skip], [data-ap-skip], .mai-tts-wrap')
            .forEach(function (n) { n.remove(); });
        /* textContent incolla i blocchi: «fine.Inizio» sarebbe una parola sola */
        c.querySelectorAll('p, li, h1, h2, h3, h4, h5, h6, blockquote, div, br').forEach(function (n) {
            if (n.parentNode) n.parentNode.insertBefore(document.createTextNode(' '), n.nextSibling);
        });
        return c.textContent || '';
    }

    function mostra() {
        if (!R.el) return;
        var parola = R.parole[R.i] || '';
        R.el.querySelector('.mai-rsvp').innerHTML = C().html(parola);
        var k = C().fraseDi(R.frasi, R.i), fr = R.el.querySelector('.lv-frase');
        if (k >= 0 && fr) {
            var da = R.frasi[k][0], a = R.frasi[k][1], h = '';
            for (var j = da; j < a; j++) {
                var s = document.createElement('span');
                s.textContent = R.parole[j];
                h += '<span data-i="' + j + '"' + (j === R.i ? ' class="is-ora"' : '') + '>' + s.innerHTML + '</span> ';
            }
            fr.innerHTML = h;
        }
        R.el.querySelector('.lv-parola').setAttribute('aria-valuenow', String(R.i + 1));
    }
    function dipingiPlay() {
        if (!R.el) return;
        var b = R.el.querySelector('.mai-tts-play');
        b.innerHTML = '<i data-lucide="' + (R.play ? 'pause' : 'play') + '"></i>';
        R.el.querySelector('.mai-tts-chip').classList.toggle('is-playing', R.play);
        icone();
    }

    function passo() {
        if (!R.el || !R.el.isConnected) { ferma(); return; }   /* un altro lettore l'ha sostituito */
        mostra();
        R.timer = setTimeout(function () {
            if (R.i >= R.parole.length - 1) { R.play = false; R.timer = null; dipingiPlay(); return; }
            R.i++;
            passo();
        }, C().pausa(R.parole[R.i], ppm()));
    }
    function suona() {
        if (R.i >= R.parole.length - 1) R.i = 0;
        clearTimeout(R.timer);
        R.play = true; dipingiPlay(); passo();
    }
    function pausa() {
        clearTimeout(R.timer); R.timer = null;
        if (R.play) { R.play = false; dipingiPlay(); }
    }
    function vai(i) {
        R.i = Math.max(0, Math.min(i, R.parole.length - 1));
        mostra();
    }
    function ferma() { clearTimeout(R.timer); R.timer = null; R.play = false; }

    function chiudi() {
        ferma();
        if (R.el) { try { R.el.remove(); } catch (e) { } }
        R.el = null;
    }

    function apri(opts) {
        opts = opts || {};
        chiudi();
        try {
            if (window.MappAITTS) {
                window.MappAITTS.stop();
                if (window.MappAITTS.closeFloating) window.MappAITTS.closeFloating();
            }
        } catch (e) { }
        var parole = C().parole(opts.testo || '');
        if (!parole.length) {
            if (window.showToast) window.showToast(t('tst_no_text_tts', 'Nessun testo da leggere'), 'info');
            return null;
        }
        R.parole = parole; R.frasi = C().frasi(parole); R.i = 0;

        var f = document.createElement('div');
        f.id = 'mai-rsvp-float';
        f.className = 'mai-tts-float lv';
        f.setAttribute('role', 'dialog');
        f.setAttribute('aria-label', t('rsvp_titolo', 'Lettura veloce'));
        var v = ppm();
        f.innerHTML =
            '<button type="button" class="mai-tts-float-close" aria-label="' + t('tts_close', 'Chiudi') + '">✕</button>' +
            '<h4 class="lv-titolo"></h4>' +
            '<div class="mai-rsvp lv-parola" tabindex="0" role="slider" aria-valuemin="1" aria-valuemax="' + parole.length + '"' +
            ' aria-label="' + t('rsvp_trascina', 'Trascina la parola per andare avanti o indietro') + '"' +
            ' title="' + t('rsvp_trascina', 'Trascina la parola per andare avanti o indietro') + '"></div>' +
            '<div class="lv-frase"></div>' +
            '<div class="mai-tts-float-ctrl"><span class="mai-tts-wrap">' +
            '<span class="mai-tts-chip"><button type="button" class="mai-tts-seg mai-tts-play" aria-label="' + t('tts_play', 'Ascolta / Pausa') + '"><i data-lucide="play"></i></button></span>' +
            '<input type="range" class="lv-vel" min="' + C().MIN_PPM + '" max="' + C().MAX_PPM + '" step="25" value="' + v + '"' +
            ' aria-label="' + t('rsvp_velocita', 'Velocità (parole al minuto)') + '">' +
            '<span class="mai-tts-time lv-ppm">' + v + ' p/min</span>' +
            '</span></div>';
        f.querySelector('.lv-titolo').textContent = opts.titolo || '';
        document.body.appendChild(f);
        R.el = f;

        f.querySelector('.mai-tts-float-close').addEventListener('click', chiudi);
        f.querySelector('.mai-tts-play').addEventListener('click', function () { if (R.play) pausa(); else suona(); });
        var vel = f.querySelector('.lv-vel');
        vel.addEventListener('input', function () {
            try { localStorage.setItem(LS_PPM, vel.value); } catch (e) { }
            f.querySelector('.lv-ppm').textContent = vel.value + ' p/min';
        });
        f.querySelector('.lv-frase').addEventListener('click', function (e) {
            var s = e.target.closest && e.target.closest('[data-i]');
            if (s) { pausa(); vai(+s.getAttribute('data-i')); }
        });

        /* la parola si trascina: a sinistra avanti, a destra indietro (come
           scorrere un nastro). Un tocco senza trascinare = play/pausa. */
        var pz = f.querySelector('.lv-parola'), x0 = null, mosso = false, acc = 0;
        pz.addEventListener('pointerdown', function (e) {
            x0 = e.clientX; mosso = false;
            try { pz.setPointerCapture(e.pointerId); } catch (er) { }
            e.preventDefault();
        });
        pz.addEventListener('pointermove', function (e) {
            if (x0 === null) return;
            var n = Math.trunc((e.clientX - x0) / PASSO_PX);
            if (!n) return;
            if (!mosso) { mosso = true; pausa(); }
            vai(R.i - n);
            x0 += n * PASSO_PX;
        });
        function su(e) {
            if (x0 === null) return;
            x0 = null;
            try { pz.releasePointerCapture(e.pointerId); } catch (er) { }
            if (!mosso && e.type === 'pointerup') { if (R.play) pausa(); else suona(); }
        }
        pz.addEventListener('pointerup', su);
        pz.addEventListener('pointercancel', su);
        pz.addEventListener('wheel', function (e) {
            e.preventDefault();
            acc += Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
            var n = Math.trunc(acc / PASSO_ROTELLA);
            if (!n) return;
            acc -= n * PASSO_ROTELLA;
            pausa(); vai(R.i + n);
        }, { passive: false });
        pz.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowRight') { pausa(); vai(R.i + 1); e.preventDefault(); }
            else if (e.key === 'ArrowLeft') { pausa(); vai(R.i - 1); e.preventDefault(); }
            else if (e.key === ' ' || e.key === 'Enter') { if (R.play) pausa(); else suona(); e.preventDefault(); }
        });

        mostra(); dipingiPlay();
        try { pz.focus({ preventScroll: true }); } catch (e) { }
        return f;
    }

    /* ── il bottone nella scheda del nodo ─────────────────────────────────── */
    function monta() {
        var tts = document.getElementById('btn-modal-tts');
        if (!tts || document.getElementById('btn-modal-rsvp')) return;
        var b = document.createElement('button');
        b.id = 'btn-modal-rsvp'; b.type = 'button'; b.className = 'tts-button';
        b.title = t('rsvp_titolo', 'Lettura veloce');
        b.setAttribute('aria-label', b.title);
        b.innerHTML = '<i data-lucide="gauge"></i>';
        b.addEventListener('click', function () {
            var tit = document.getElementById('source-modal-title');
            apri({ titolo: tit ? tit.textContent.trim() : '', testo: testoDi(document.getElementById('source-modal-body')) });
        });
        tts.parentNode.insertBefore(b, tts.nextSibling);
        tts.addEventListener('click', chiudi);   /* un lettore alla volta: parte la voce, esce la lettura veloce */
        icone();
        /* la scheda si chiude → la lettura veloce di quel nodo non ha più senso */
        var modal = document.getElementById('source-modal');
        if (modal) new MutationObserver(function () {
            if (R.el && modal.classList.contains('hidden')) chiudi();
        }).observe(modal, { attributes: true, attributeFilter: ['class'] });
    }

    window.MappAILetturaVeloce = { apri: apri, chiudi: chiudi, testoDi: testoDi };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', monta);
    else monta();
})();
