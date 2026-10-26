/*
 * studente/launcher-core.js — la FORMA del modale «Domande su misura» (pura, UMD)
 * ---------------------------------------------------------------------------
 * Fino al packet 0117 qui stava la console «Studio attivo» dello studente: la
 * navigazione a gruppi (autotest, viste, strumenti) e il setup di ogni attività.
 * Dal 0117 (Giacomo, 20/10) le prove si scelgono nella console del progetto
 * (studia-core › tabelleProve) e la finestra a parte non c'è più. Resta la sola
 * scelta che una riga non può dire: ramo e angolo delle domande su misura. La
 * spunta «Rispondi con la mappa accanto» è uscita: la mappa è sempre aperta.
 * Conclude solo «Avvia» (inv. 10). Lo schema passa da `validaSchema` nel test:
 * un errore qui si vede in Node, non come un modale muto (trappola 33).
 *
 * 0126, allargamento 2 (Giacomo, 25/10: «Il modale su iPad per la scelta delle
 * domande su misura è piccolo e va migliorato»; sul mockup: «domande su misura: E»):
 * la veste grande e la finestra larga, due domande con un titolo ciascuna. Le
 * righe da 56 px col testo a 19, le tendine che compaiono solo con «Un ramo» e
 * «Un angolo solo», le due domande affiancate in orizzontale: studente.css, che
 * si aggancia alle due sezioni (`dove`, `quali`).
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.MappAIStudenteLauncherCore = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    /* o = { opzioni:{rami|null, angoli:[{k,et}]}, t } */
    function schemaSuMisura(o) {
        o = o || {};
        var t = o.t || function (k, f) { return f; };
        var op = o.opzioni || { rami: null, angoli: [] };
        var dove = [
            { id: 'amb-tutto', tipo: 'radio', gruppo: 'ambito', etichetta: t('st_tutta', 'Tutta la mappa'), valore: true },
            { id: 'amb-ramo', tipo: 'radio', gruppo: 'ambito', etichetta: t('st_un_ramo', 'Un ramo'), valore: false,
              aiuto: op.rami ? '' : t('st_ramo_spento', 'non disponibile: questi fogli non dichiarano il ramo') }
        ];
        if (op.rami) dove.push({ id: 'ramo', tipo: 'scelta', etichetta: t('st_quale_ramo', 'Quale ramo'), opzioni: op.rami.map(function (r) { return { valore: r, etichetta: r }; }), valore: op.rami[0], larghezza: 'meta' });
        /* senza angoli dichiarati (fogli vecchi, o misti senza l'angolo per domanda) non
           c'è niente da scegliere: niente radio orfano e niente tendina VUOTA (16/9) */
        var quali = [];
        if (op.angoli && op.angoli.length) quali.push(
            { id: 'ang-tutti', tipo: 'radio', gruppo: 'angoli', etichetta: t('st_tutti_angoli', 'Tutti gli angoli'), valore: true,
              aiuto: t('st_tutti_angoli_aiuto', 'la sessione metacognitiva: leggi la stessa domanda in tutti i tagli, dì per ognuna «Perché:», poi rispondi a quelle verdi') },
            { id: 'ang-uno', tipo: 'radio', gruppo: 'angoli', etichetta: t('st_un_angolo', 'Un angolo solo'), valore: false },
            { id: 'angolo', tipo: 'scelta', etichetta: t('st_quale_angolo', 'Quale angolo'), opzioni: op.angoli.map(function (a) { return { valore: a.k, etichetta: a.et }; }), valore: op.angoli[0].k, larghezza: 'meta' }
        );
        return {
            id: 'su-misura', titolo: t('st_g_su_misura', 'Domande su misura'), sottotitolo: t('st_scegli_ramo_angolo', 'Scegli ramo e angolo'),
            icona: 'sliders-horizontal', taglia: 'l', veste: 'grande',
            sezioni: [{ id: 'dove', titolo: t('st_su_dove', 'Quale parte della mappa?'), campi: dove }]
                .concat(quali.length ? [{ id: 'quali', titolo: t('st_su_quali', 'Quali domande?'), campi: quali }] : []),
            azioni: [
                { id: 'annulla', etichetta: t('mm_annulla', 'Annulla'), ruolo: 'quieto' },
                { id: 'avvia', etichetta: t('st_avvia', 'Avvia'), icona: 'play', ruolo: 'primario' }
            ]
        };
    }

    return { schemaSuMisura: schemaSuMisura };
}));
