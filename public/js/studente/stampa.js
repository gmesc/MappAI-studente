/*
 * studente/stampa.js — «Stampa» sull'iPad apre la stampa di iOS (pura, UMD)
 * ---------------------------------------------------------------------------
 * ⚠️ PERCHÉ ESISTE (misurato il 26/9 nel simulatore): nella WKWebView di iOS
 * `window.print()` non fa NIENTE — nessun menu, nessun avviso. La stampante
 * della sintesi (`.ap-print-btn`) e il «Stampa» della `.mm-doc-bar` (quiz,
 * domande aperte, report…) chiamano proprio quello, dentro l'iframe del
 * pannello. Qui il `print` di quell'iframe si sostituisce: sull'iPad va al
 * plugin nativo `Stampa` (plugins/mappai-stampa: AirPrint, anteprima, «Salva
 * su File») col file:// VERO del documento; nel browser resta l'originale.
 * Un aggancio solo copre tutti i bottoni del documento, perché chiamano tutti
 * `window.print()` — e le copie di MappAI re non si toccano (RIUSO, regola 1).
 *
 * I PDF non hanno un iframe (li disegna pdf-vista.js): la loro stampante sta
 * nella testata del pannello e passa da `stampaFile`, con `altrimenti` per il
 * browser.
 *
 * Un errore del plugin diventa un avviso («Non riesco a stampare: …»), mai un
 * bottone muto. Il DOM e i plugin arrivano da fuori: `tests/stampa.test.js`.
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.MappAIStudenteStampa = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var PREFISSO = 'Non riesco a stampare: ';

    /* il nome del lavoro di stampa = il nome del file senza estensione: è il
       nome che «Salva su File» propone per il PDF */
    /* solo un'estensione vera, lettere e cifre (0126): «Cap. 3-Domande aperte-…» non ne ha, e restava «Cap» */
    function senzaEstensione(n) { return String(n == null ? '' : n).replace(/\.[a-z0-9]{1,5}$/i, '').trim(); }
    function messaggio(e) {
        var m = e && (e.message || e.errorMessage);
        return String(m || e || 'errore sconosciuto');
    }

    /* stampaFile(o) → Promise<{ stampato, nativa, errore? }>, MAI rifiutata.
       o = { plugin: P | fn→P|null, url: string | fn→string|Promise, titolo,
             avvisa: fn(testo), prefisso, altrimenti: fn }
       Senza plugin (il browser) chiama `altrimenti`; col plugin serve il file://
       vero, e se manca lo si dice invece di tacere. */
    function stampaFile(o) {
        o = o || {};
        var P = typeof o.plugin === 'function' ? o.plugin() : o.plugin;
        if (!P || typeof P.stampa !== 'function') {
            if (typeof o.altrimenti === 'function') o.altrimenti();
            return Promise.resolve({ stampato: false, nativa: false });
        }
        return Promise.resolve()
            .then(function () { return typeof o.url === 'function' ? o.url() : o.url; })
            .then(function (url) {
                if (!url) throw new Error('il documento non ha un percorso sul disco');
                return P.stampa({ url: String(url), titolo: senzaEstensione(o.titolo) });
            })
            .then(function (r) { return { stampato: !!(r && r.stampato), nativa: true }; })
            .catch(function (e) {
                var m = messaggio(e);
                if (typeof o.avvisa === 'function') o.avvisa((o.prefisso || PREFISSO) + m);
                return { stampato: false, nativa: true, errore: m };
            });
    }

    /* aggancia(iframe, o) → true se il `print` del documento ora passa di qui,
       false se il documento non si lascia toccare (origine opaca: SecurityError)
       o non c'è. Si richiama a ogni `load`: ogni caricamento è un window nuovo.
       o = { plugin, url, titolo, avvisa, prefisso } come in `stampaFile`. */
    function aggancia(iframe, o) {
        o = o || {};
        var w;
        try {
            w = iframe && iframe.contentWindow;
            if (!w || !w.document) return false;      /* l'accesso lancia se l'origine è opaca */
        } catch (e) { return false; }
        try {
            if (w.print && w.print.__mappaiStampa) return true;
            var originale = w.print;
            var nostra = function () {
                stampaFile({
                    plugin: o.plugin, url: o.url, titolo: o.titolo, avvisa: o.avvisa, prefisso: o.prefisso,
                    altrimenti: function () { if (typeof originale === 'function') originale.call(w); }
                });
            };
            nostra.__mappaiStampa = true;
            w.print = nostra;
            return w.print === nostra;
        } catch (e) { return false; }
    }

    return { aggancia: aggancia, stampaFile: stampaFile, senzaEstensione: senzaEstensione, PREFISSO: PREFISSO };
}));
