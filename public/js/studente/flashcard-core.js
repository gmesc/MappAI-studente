/*
 * studente/flashcard-core.js — le flashcard nel pannello dell'iPad: la parte pura
 * ---------------------------------------------------------------------------
 * Packet 0128 (Giacomo, 26/10: «Porta le flashcard nello split in cui vivono i
 * materiali di studio», «Anche le flashcard devono avere il bottone 'STAMPA/PDF'
 * nella barra», «PDF» per coerenza; il fronte/retro «Riapro e si rifinisce»;
 * 27/10: «non troncare il testo», «proponi la stampa delle flashcard fronte retro»).
 * Qui il contatore della barra, la preferenza di stampa (forma e lato), le opzioni
 * per il generatore di MappAI (`printFlashcardSheet`), i nomi dei file con la regola
 * dello 0126 e la finestra «PDF delle flashcard» come schema del motore dei modali.
 * Il DOM lo monta studente/flashcard.js.
 * UMD: window.MappAIStudenteFlashcardCore (browser) / module.exports (Node/test).
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.MappAIStudenteFlashcardCore = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var PREF_KEY = 'mappai_studente_flashcard_pdf';
    function tt(t, k, f) { return typeof t === 'function' ? (t(k, f) || f) : f; }

    /* «Carta 3 di 30»: `i` è la carta corrente contata da zero, come `currentStudyItemIndex` */
    function contatore(i, n, t) {
        if (!(n > 0)) return '';
        return tt(t, 'st_fc_conta', 'Carta {n} di {N}').replace('{n}', Math.min(n, (i | 0) + 1)).replace('{N}', n);
    }

    /* la preferenza: l'ultima forma e l'ultimo lato scelti; di serie il pieghevole e il lato lungo */
    function pulita(p) {
        p = p || {};
        return { forma: p.forma === 'fronte-retro' ? 'fronte-retro' : 'piega', lato: p.lato === 'corto' ? 'corto' : 'lungo' };
    }
    function leggiPref(raw) {
        try { return pulita(raw ? JSON.parse(raw) : null); } catch (e) { return pulita(null); }
    }
    function scriviPref(p) { var q = pulita(p); return JSON.stringify({ forma: q.forma, lato: q.lato }); }

    /* le opzioni di `printFlashcardSheet`: il formato delle flashcard (2×2 in piedi), il fronte/retro e il lato */
    function opzioni(set, pref, progetto) {
        var p = pulita(pref);
        set = set || {};
        return {
            items: set.items || [], title: set.title || 'Flashcard', mapName: progetto || '',
            fmt: '2x2v', backside: p.forma === 'fronte-retro', lato: p.lato
        };
    }

    /* i nomi: «Progetto-Flashcard-angolo-data» e «Progetto-Foglio di prova-lato-data» (studia-core › nomeDocumento) */
    function nomeFile(SC, progetto, set, data) {
        return SC.nomeDocumento({ progetto: progetto, tipo: 'Flashcard', angolo: (set && set.angle) || '', data: data || new Date() });
    }
    function nomeProva(SC, progetto, lato, data) {
        return SC.nomeDocumento({ progetto: progetto, tipo: 'Foglio di prova', angolo: lato === 'corto' ? 'corto' : 'lungo', data: data || new Date() });
    }

    /* l'avviso del pieghevole (allargamento 2): le carte che il generatore ha dovuto rimpicciolire per non tagliarle */
    function avvisoPiega(avvisi, t) {
        var n = avvisi && avvisi.sotto ? avvisi.sotto.length : 0;
        if (!n) return '';
        var quante = n === 1 ? tt(t, 'st_fc_avv_una', '1 carta') : tt(t, 'st_fc_avv_piu', '{n} carte').replace('{n}', n);
        return tt(t, 'st_fc_avv', '{quante} nel pieghevole escono più piccole per non tagliare il testo: in fronte e retro restano grandi.')
            .replace('{quante}', quante);
    }

    /* la finestra «PDF delle flashcard»: la forma, il lato (vale per il fronte e retro e per il foglio di prova), l'avviso.
       Gate del 27/10 (Giacomo): «deve essere adattato al layout ipad degli altri modali» — la veste di «Domande su misura»
       (launcher-core.js): finestra larga, veste grande, e le sezioni con un id a cui studente.css aggancia le righe */
    function schemaPdf(pref, t, avviso) {
        var p = pulita(pref);
        var sezioni = [
            {
                id: 'fc-forma', titolo: tt(t, 'st_fc_forma', 'Come stamparle'),
                campi: [
                    { id: 'forma-piega', tipo: 'radio', gruppo: 'fc-forma', etichetta: tt(t, 'st_fc_piega', 'Pieghevole'),
                        aiuto: tt(t, 'st_fc_piega_d', 'Domanda sopra e risposta sotto: si piega a metà carta.'), valore: p.forma === 'piega' },
                    { id: 'forma-fr', tipo: 'radio', gruppo: 'fc-forma', etichetta: tt(t, 'st_fc_fr', 'Fronte e retro'),
                        aiuto: tt(t, 'st_fc_fr_d', 'Carte intere, la risposta sul retro: il testo è più grande. Serve una stampante fronte/retro.'), valore: p.forma === 'fronte-retro' }
                ]
            },
            {
                id: 'fc-lato', titolo: tt(t, 'st_fc_lato', 'Lato di ribaltamento (fronte e retro)'),
                campi: [
                    { id: 'lato-lungo', tipo: 'radio', gruppo: 'fc-lato', etichetta: tt(t, 'st_fc_lungo', 'Lato lungo'),
                        aiuto: tt(t, 'st_fc_lungo_d', 'Il foglio si gira come un libro: è il modo più comune.'), valore: p.lato === 'lungo' },
                    { id: 'lato-corto', tipo: 'radio', gruppo: 'fc-lato', etichetta: tt(t, 'st_fc_corto', 'Lato corto'),
                        aiuto: tt(t, 'st_fc_corto_d', 'Il foglio si gira come un blocco, dall\'alto in basso.'), valore: p.lato === 'corto' }
                ]
            }
        ];
        if (avviso) sezioni.push({ id: 'fc-avviso', campi: [{ id: 'fc-avviso', tipo: 'nota', etichetta: avviso }] });
        return {
            titolo: tt(t, 'st_fc_pdf', 'PDF delle flashcard'), icona: 'printer', taglia: 'l', veste: 'grande',
            sezioni: sezioni,
            azioni: [
                { id: 'annulla', etichetta: tt(t, 'mm_annulla', 'Annulla'), ruolo: 'quieto' },
                { id: 'prova', etichetta: tt(t, 'st_fc_prova', 'Foglio di prova'), ruolo: 'secondario' },
                { id: 'crea', etichetta: tt(t, 'st_fc_crea', 'Crea il PDF'), ruolo: 'primario' }
            ]
        };
    }

    /* dall'esito del motore: { azione: 'crea'|'prova', pref } — o null se si è annullato */
    function esito(r) {
        if (!r || (r.azione !== 'crea' && r.azione !== 'prova')) return null;
        var v = r.valori || {};
        return { azione: r.azione, pref: { forma: v['forma-fr'] ? 'fronte-retro' : 'piega', lato: v['lato-corto'] ? 'corto' : 'lungo' } };
    }

    /* IL REPORT DELLE SCELTE (0128, allargamento 13; Giacomo, 27/10: «permetti di stampare il report finale tramite il
       bottone 'Finito' che appare solo dopo l'ultima flashcard», «come il report delle domande aperte o della scelta
       multipla», «indica le scelte dei chip fatte dall'allievo»; il report: «Come la scelta multipla»).
       `items` = activeStudySessionItems ({front, back}), `res` = studyResults del player: conta le 😎 in `correct` e
       mette le altre in `mistakes` ({q, feedback: 'hard'|'good'}) nell'ordine delle carte — quindi si leggono in
       ordine, e una carta senza la sua voce è stata 😎. → gli argomenti di `MappAILiveReports.buildStudentsReportHtml`,
       con `flashcard: true` (la scelta a parole al posto di giusto/sbagliato). */
    var SCELTE = {
        easy: { esito: 'right', k: 'ui_fc_knew', f: 'Sapevo e ricordavo', e: '😎' },
        good: { esito: 'manual', k: 'ui_fc_forgot', f: 'Non ricordavo', e: '🤔' },
        hard: { esito: 'wrong', k: 'ui_fc_unknown', f: 'Non conoscevo', e: '😩' }
    };
    /* la scelta di ogni carta, nell'ordine delle carte ('easy' | 'good' | 'hard'): la leggono il report e il riquadro */
    function scelteDi(items, res) {
        var voci = ((res && res.mistakes) || []).slice(), j = 0;
        return (items || []).map(function (it) {
            var v = voci[j];
            if (v && String(v.q) === String(it && it.front) && SCELTE[v.feedback]) { j++; return v.feedback; }
            return 'easy';
        });
    }
    /* IL RIQUADRO DELLA FINE (0128, allargamento 21; Giacomo, 27/10: «il report delle flashcard deve aver lo stesso layout
       degli altri materiali»; per il riquadro, al posto di «Risposte: n / N», la sua scelta: «Le tre scelte»):
       «😎 5 · 🤔 2 · 😩 2», quante carte per ciascuno dei tre bottoni. */
    function riquadroScelte(items, res) {
        var n = { easy: 0, good: 0, hard: 0 };
        scelteDi(items, res).forEach(function (k) { n[k]++; });
        return ['easy', 'good', 'hard'].map(function (k) { return SCELTE[k].e + ' ' + n[k]; }).join(' · ');
    }
    function reportScelte(items, res, meta, t) {
        meta = meta || {};
        var scelte = scelteDi(items, res);
        var lista = (items || []).map(function (it, i) {
            var sc = SCELTE[scelte[i]];
            return { outcome: sc.esito, text: String((it && it.front) || ''), yourText: tt(t, sc.k, sc.f), correctText: String((it && it.back) || '') };
        });
        var sapute = lista.filter(function (x) { return x.outcome === 'right'; }).length;
        var pct = lista.length ? Math.round(100 * sapute / lista.length) : 0;
        return {
            meta: { mapTitle: meta.mappa || '', activity: meta.titolo || 'Flashcard', className: '', dateStr: meta.data || '', durationStr: meta.durata || '' },
            results: { joined: 1, questionCount: lista.length, perStudent: [{ displayName: meta.chi || 'Io', emoji: '', num: '', answered: lista.length,
                blankCount: 0, manualCount: 0, accuracyPct: pct, items: lista, flashcard: true, strengths: [], weaknesses: [] }] },
            giuste: sapute, totale: lista.length, pct: pct
        };
    }
    /* la barra del pannello sul report: «[progetto] · Flashcard · Report allievo», come quella dei report delle prove */
    function titoloReport(o) {
        o = o || {};
        return [String(o.mappa || '').trim(), tt(o.t, 'st_g_flashcard', 'Flashcard'), tt(o.t, 'st_report_allievo', 'Report allievo')].filter(Boolean).join(' · ');
    }
    function fmtData(d) {
        var x = d ? new Date(d) : new Date(); if (isNaN(x.getTime())) x = new Date();
        var p = function (n) { return String(n).padStart(2, '0'); };
        return p(x.getDate()) + '/' + p(x.getMonth() + 1) + '/' + x.getFullYear();
    }

    return {
        PREF_KEY: PREF_KEY, contatore: contatore, leggiPref: leggiPref, scriviPref: scriviPref, opzioni: opzioni,
        nomeFile: nomeFile, nomeProva: nomeProva, avvisoPiega: avvisoPiega, schemaPdf: schemaPdf, esito: esito,
        reportScelte: reportScelte, riquadroScelte: riquadroScelte, titoloReport: titoloReport, fmtData: fmtData
    };
}));
