/*
 * studente/launcher-core.js — la FORMA della console «Studio attivo» (pura, UMD)
 * ---------------------------------------------------------------------------
 * Il launcher dello studente è una console del motore dei modali (lo schermo
 * intero è una proprietà delle console: `piena` sui modali è ignorata). La
 * navigazione elenca le attività a gruppi; l'area mostra il setup dell'attività
 * scelta e «Avvia», che è l'unica azione che CONCLUDE (inv. 10). Le voci di nav
 * e i set/fogli elencati nell'area hanno `chiude:false`: senza, sceglierli
 * chiuderebbe la finestra (core :270). Lo schema passa da `validaSchema` nel
 * test: un errore qui si vede in Node, non come una console muta (trappola 33).
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.MappAIStudenteLauncherCore = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var VOCI = [
        { g: 'autotest', id: 'set-mc', et: 'Un set pronto a scelta multipla', icona: 'list-checks' },
        { g: 'autotest', id: 'set-aperte', et: 'Un foglio pronto di domande aperte', icona: 'pen-line' },
        { g: 'autotest', id: 'su-misura', et: 'Domande aperte su misura', icona: 'sliders-horizontal' },
        { g: 'viste', id: 'heatmap', et: 'Heat map padronanza', icona: 'target' },
        { g: 'viste', id: 'effort', et: 'Mappa lavoro', icona: 'flame' },
        { g: 'strumenti', id: 'studypath', et: 'Cosa studiare ora', icona: 'compass' },
        { g: 'strumenti', id: 'celeration', et: 'I tuoi progressi nel tempo', icona: 'trending-up' }
    ];
    var GRUPPI = [['autotest', 'Autotest'], ['viste', 'Viste ed esercizi rapidi'], ['strumenti', 'Strumenti']];

    /* la spunta dello split, uguale in tutti i setup */
    function campoSplit(t, acceso) {
        return { id: 'split', tipo: 'spunta', valore: !!acceso,
            etichetta: t('st_split', 'Rispondi con la mappa accanto (schermo diviso)'),
            aiuto: t('st_split_aiuto', 'In verticale con l\'iPad in piedi, fianco a fianco con l\'iPad sdraiato; la linea si trascina.') };
    }

    /* o = { sel, nMC, nAp, sets:[{id,title,n}], fogli:[{titolo,n,angolo}], set, foglio,
            opzioni:{rami|null, angoli:[{k,et}]}, split, mv, ev, t } */
    function schema(o) {
        o = o || {};
        var t = o.t || function (k, f) { return f; };
        var sel = String(o.sel || '');
        var sotto = {
            'set-mc': o.nMC ? o.nMC + ' ' + t('st_set', 'set') + ' · ' + t('st_correzione', 'correzione immediata') : t('st_no_set', 'nessun set in questa mappa'),
            'set-aperte': o.nAp ? o.nAp + ' ' + t('st_fogli', 'fogli') + ' · ' + t('st_rispondi_tutto', 'si risponde a tutto') : t('st_no_fogli', 'nessun foglio: chiedi al docente di salvare la mappa con MappAI'),
            'su-misura': o.nAp ? t('st_su_misura_sotto', 'un ramo o tutta la mappa · un angolo o tutti') : t('st_no_fogli', 'nessun foglio: chiedi al docente di salvare la mappa con MappAI'),
            heatmap: o.mv ? t('as_view_on', 'Vista ATTIVA — tocca per spegnere') : t('as_view_off', 'Vista spenta — tocca per accendere'),
            effort: o.ev ? t('as_view_on', 'Vista ATTIVA — tocca per spegnere') : t('as_view_off', 'Vista spenta — tocca per accendere'),
            studypath: t('as_studypath_hint', 'Percorso consigliato e ripasso programmato.'),
            celeration: t('as_celeration_hint', 'Grafico di crescita delle tue sessioni (celeration).')
        };
        var nav = [];
        GRUPPI.forEach(function (g) {
            nav.push({ gruppo: t('st_g_' + g[0], g[1]), id: 'g:' + g[0] });
            VOCI.filter(function (v) { return v.g === g[0]; }).forEach(function (v) {
                nav.push({ id: v.id, etichetta: t('st_v_' + v.id, v.et), icona: v.icona, sotto: sotto[v.id], attiva: sel === v.id, chiude: false });
            });
        });
        var s = {
            id: 'studio-attivo', titolo: t('as_title', 'Studio attivo'), sottotitolo: t('as_pick_mode', 'scegli un\'attività'),
            icona: 'puzzle', taglia: 'xl', layout: 'console', piena: true,
            invio: false, veloChiude: false, navChiudibile: true, area: 'una',
            nav: nav, sezioni: [], azioni: []
        };
        var avvia = { id: 'avvia', etichetta: t('st_avvia', 'Avvia'), icona: 'play', ruolo: 'primario' };   /* conclude */
        if (sel === 'set-mc' && o.nMC) {
            s.sezioni.push({ id: 'sets', titolo: t('st_quale_set', 'Quale set?'), voci: (o.sets || []).map(function (x) {
                return { id: 'set:' + x.id, etichetta: x.title, sotto: x.n + ' ' + t('st_domande', 'domande'), icona: 'list-checks', attiva: o.set === x.id, chiude: false };
            }) });
            s.sezioni.push({ id: 'setup', campi: [campoSplit(t, o.split)] });
            if (o.set) s.azioni = [avvia];
        } else if (sel === 'set-aperte' && o.nAp) {
            s.sezioni.push({ id: 'fogli', titolo: t('st_quale_foglio', 'Quale foglio?'), voci: (o.fogli || []).map(function (f, i) {
                return { id: 'foglio:' + i, etichetta: f.titolo, sotto: f.n + ' ' + t('st_domande', 'domande') + (f.angolo ? ' · ' + f.angolo : ''), icona: 'pen-line', attiva: o.foglio === i, chiude: false };
            }) });
            s.sezioni.push({ id: 'setup', campi: [campoSplit(t, o.split)] });
            if (o.foglio != null && o.foglio >= 0) s.azioni = [avvia];
        } else if (sel === 'su-misura' && o.nAp) {
            var op = o.opzioni || { rami: null, angoli: [] };
            var campi = [
                { id: 'amb-tutto', tipo: 'radio', gruppo: 'ambito', etichetta: t('st_tutta', 'Tutta la mappa'), valore: true },
                { id: 'amb-ramo', tipo: 'radio', gruppo: 'ambito', etichetta: t('st_un_ramo', 'Un ramo'), valore: false,
                  aiuto: op.rami ? '' : t('st_ramo_spento', 'non disponibile: questi fogli non dichiarano il ramo') }
            ];
            if (op.rami) campi.push({ id: 'ramo', tipo: 'scelta', etichetta: t('st_quale_ramo', 'Quale ramo'), opzioni: op.rami.map(function (r) { return { valore: r, etichetta: r }; }), valore: op.rami[0], larghezza: 'meta' });
            campi.push({ id: 'ang-tutti', tipo: 'radio', gruppo: 'angoli', etichetta: t('st_tutti_angoli', 'Tutti gli angoli'), valore: true,
                aiuto: t('st_tutti_angoli_aiuto', 'la sessione metacognitiva: leggi la stessa domanda in tutti i tagli, dì per ognuna «Perché:», poi rispondi a quelle verdi') });
            /* senza angoli dichiarati (fogli vecchi) la tendina nascerebbe VUOTA — validaSchema lo rifiuta */
            if (op.angoli && op.angoli.length) campi.push(
                { id: 'ang-uno', tipo: 'radio', gruppo: 'angoli', etichetta: t('st_un_angolo', 'Un angolo solo'), valore: false },
                { id: 'angolo', tipo: 'scelta', etichetta: t('st_quale_angolo', 'Quale angolo'), opzioni: op.angoli.map(function (a) { return { valore: a.k, etichetta: a.et }; }), valore: op.angoli[0].k, larghezza: 'meta' }
            );
            campi.push(campoSplit(t, o.split));
            s.sezioni.push({ id: 'setup', titolo: t('st_su_misura', 'Domande aperte su misura'), campi: campi });
            s.azioni = [avvia];
        } else if (sel) {
            s.sezioni.push({ id: 'nota', testo: sotto[sel] || '' });
        } else {
            s.sezioni.push({ id: 'invito', testo: t('st_invito', 'Scegli un\'attività nella colonna a sinistra.') });
        }
        return s;
    }

    return { VOCI: VOCI, GRUPPI: GRUPPI, schema: schema, campoSplit: campoSplit };
}));
