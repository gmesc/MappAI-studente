/*
 * studente/prova-core.js — la LOGICA dell'autotest (pura, UMD, testata)
 * ---------------------------------------------------------------------------
 * Che cosa decide: quali pool esistono in un vault (set MC, fogli di domande
 * aperte dai gemelli `Sorgenti/*.html`), quali opzioni si possono offrire
 * (un ramo solo se gli item lo portano), come si COMPONE la prova su misura
 * (tutta la mappa o un ramo · tutti gli angoli o uno), da dove parte lo stato
 * della view, e che cosa va sul bus di padronanza a consegna fatta.
 * Il campionamento e il pool sono di `MappAIScelta` (copia verbatim): qui
 * non si riscrive niente di suo.
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(
        (typeof require === 'function') ? require('../mappai-scelta-core.js') : null);
    else root.MappAIProvaCore = factory(root.MappAIScelta);
}(typeof self !== 'undefined' ? self : this, function (SC0) {
    'use strict';
    function SC() { return SC0 || (typeof window !== 'undefined' ? window.MappAIScelta : null); }
    function _s(x) { return String(x == null ? '' : x); }
    function _chiave(x) { try { return _s(x).normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim(); } catch (e) { return _s(x).toLowerCase().trim(); } }

    /* i tre chip «Perché:» della sessione metacognitica — testo scuro su fondo chiaro */
    var CHIP_PERCHE = [
        { k: 'capito', et: 'ho capito cosa rispondere', colore: '#15803d' },
        { k: 'nonso', et: 'non so la risposta', colore: '#b45309' },
        { k: 'noncapita', et: 'non ho capito la domanda', colore: '#1d4ed8' }
    ];

    /* i set a scelta multipla giocabili: mode quiz con opzioni (stesso filtro di leggiFogli) */
    function setMC(studySets) {
        return (studySets || []).filter(function (s) {
            return s && s.mode === 'quiz' && Array.isArray(s.items) && s.items.some(function (it) {
                return it && ((Array.isArray(it.options) && it.options.length > 2) || it.a3 != null);
            });
        });
    }
    /* un gemello `.html` → un foglio per poolDaFogli; null se non porta la sorgente */
    function foglioDaHtml(nome, set) {
        if (!set || !Array.isArray(set.items) || !set.items.length) return null;
        return { titolo: set.title || _s(nome).replace(/\.html?$/i, ''), angle: set.angle || '', tipo: 'open', items: set.items };
    }
    function poolAperte(fogli) { return SC().poolDaFogli(fogli || []); }

    /* le opzioni che si possono offrire su QUESTO pool */
    function opzioni(pool) {
        var rami = [], angoli = [], vr = {}, va = {};
        (pool || []).forEach(function (v) {
            if (v.ramo && !vr[v.ramo]) { vr[v.ramo] = 1; rami.push(v.ramo); }
            if (v.angle && !va[v.angle]) { va[v.angle] = 1; angoli.push(v.angle); }
        });
        var ordA = SC().ANGOLI();
        angoli.sort(function (a, b) { return (ordA.indexOf(a) < 0 ? 99 : ordA.indexOf(a)) - (ordA.indexOf(b) < 0 ? 99 : ordA.indexOf(b)); });
        return { rami: rami.length ? rami : null, angoli: angoli };
    }

    /* la PROVA su misura. o = { ambito: 'tutto'|'ramo', ramo, angoli: 'tutti'|'uno', angolo }
       → { pool, dueTempi }. «tutti gli angoli» = la sessione metacognitiva: pool NON
       campionato, righe per posizione (perDomandaPerAngoli lo fa la view), due tempi.
       «un angolo» = solo quel taglio, si risponde a tutto. */
    function componi(pool, o) {
        o = o || {};
        var p = (pool || []).slice();
        if (o.ambito === 'ramo' && o.ramo) p = p.filter(function (v) { return _chiave(v.ramo) === _chiave(o.ramo); });
        var dueTempi = o.angoli !== 'uno';
        if (!dueTempi && o.angolo) p = p.filter(function (v) { return v.angle === o.angolo || (v.anche || []).indexOf(o.angolo) >= 0; });
        return { pool: p, dueTempi: dueTempi };
    }

    /* lo stato di partenza della view: a due tempi si parte dal passo ② (leggere e
       scegliere col chip); altrimenti tutte PRESE e si risponde subito */
    function statoIniziale(pool, dueTempi) {
        var st = { aree: [], fase: dueTempi ? 'scegli' : 'rispondi', letture: {}, risposte: {}, bozze: {}, note: '' };
        if (!dueTempi) (pool || []).forEach(function (v) { st.risposte[v.id] = {}; });
        return st;
    }

    /* il nodo L1 di un ramo, per nome (NFC, senza maiuscole) — null se la mappa non lo ha */
    function nodoDelRamo(nodes, ramo) {
        var k = _chiave(ramo); if (!k) return null;
        var hit = (nodes || []).filter(function (n) { return n && n.level === 1 && _chiave(n.label) === k; })[0];
        return hit ? hit.id : null;
    }

    /* che cosa va sul bus a consegna fatta: una voce per risposta SCRITTA.
       MC con soluzione → 1/0; aperte → l'autovalutazione, o null (senza misura
       la sessione si scrive lo stesso: «ha risposto» è un dato). */
    function voci(pool, stato, nodes) {
        var out = [];
        (pool || []).forEach(function (v) {
            var r = (stato && stato.risposte || {})[v.id];
            if (!r || !SC().scritta(r)) return;
            var score = null;
            if (v.tipo === 'mc' && v.giusta >= 0) score = (r.scelta === v.giusta) ? 1 : 0;
            /* aperte: la misura è l'AUTOVALUTAZIONE della view (3 sicuro · 2 così così ·
               1 a caso → 1 · 0,5 · 0), come in mappai-scelta.js; senza, resta null */
            else if (r.auto === 3) score = 1;
            else if (r.auto === 2) score = 0.5;
            else if (r.auto === 1) score = 0;
            out.push({ nodeId: nodoDelRamo(nodes, v.ramo), label: v.ramo || '', score: score, chip: (stato.letture && stato.letture[v.id] || {}).chip || '' });
        });
        return out;
    }

    return { CHIP_PERCHE: CHIP_PERCHE, setMC: setMC, foglioDaHtml: foglioDaHtml, poolAperte: poolAperte, opzioni: opzioni, componi: componi, statoIniziale: statoIniziale, nodoDelRamo: nodoDelRamo, voci: voci };
}));
