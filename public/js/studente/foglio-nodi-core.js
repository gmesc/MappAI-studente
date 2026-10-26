/*
 * studente/foglio-nodi-core.js — il «Foglio dei nodi» dello studente, la parte pura (UMD)
 * ---------------------------------------------------------------------------
 * Packet 0126, allargamento 2. Il foglio lo disegna il generatore di MappAI
 * (`printAllNodeLabels` di mappai-print-dossier.js, copiato); la finestra del
 * docente però è fitta di opzioni e parla al docente. Giacomo, 25/10: la grandezza
 * «automatica in base alla scelta se solo titoli, con keyword o con descrizione»;
 * sul mockup: «'Titoli', 'Parole chiave' e 'Descrizioni'», «nel menu a tendina
 * scrivi solo 'L[numero di livello] · [numero] nodi'», «mostra solo le frecce e
 * 'n/N'». Qui: che cosa chiedere al generatore e come chiamare livelli e pagine.
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.MappAIStudenteFoglioNodiCore = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    /* il contenuto decide il formato: 12, 4 o 2 etichette per foglio */
    var CONTENUTI = [
        { k: 'titoli', et: 'Titoli', layout: 'title', fmt: '3x4' },
        { k: 'parole', et: 'Parole chiave', layout: 'keywords', fmt: '2x2' },
        { k: 'descrizioni', et: 'Descrizioni', layout: 'card', fmt: '2x1' }
    ];

    /* i livelli che aggiungono nodi, «L[n] · [N] nodi»; l'ultimo li ha tutti (depth 'all') */
    function livelli(nodi) {
        nodi = nodi || [];
        var max = 0;
        nodi.forEach(function (n) { var l = n && n.level ? Number(n.level) : 0; if (l > max) max = l; });
        var out = [], prima = -1;
        for (var l = 1; l <= max; l++) {
            var n = nodi.filter(function (x) { return (x && x.level ? Number(x.level) : 0) <= l; }).length;
            if (n === prima) continue;
            prima = n;
            out.push({ livello: l, n: n, et: 'L' + l + ' · ' + n + ' nodi', tutti: n === nodi.length });
        }
        return out;
    }

    /* le opzioni di `printAllNodeLabels`: niente sfondo, niente catena in coda (è nel menu a parte) */
    function opzioni(k, liv) {
        var c = CONTENUTI.filter(function (x) { return x.k === k; })[0] || CONTENUTI[0];
        return { depth: (!liv || liv.tutti) ? 'all' : liv.livello, fmt: c.fmt, layout: c.layout, bg: 'none', causal: false };
    }

    function testoPagina(i, n) { return (i + 1) + '/' + n; }
    function passo(i, d, n) { return Math.max(0, Math.min(n - 1, i + d)); }

    return { CONTENUTI: CONTENUTI, livelli: livelli, opzioni: opzioni, testoPagina: testoPagina, passo: passo };
}));
