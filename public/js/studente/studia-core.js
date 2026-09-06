/*
 * studente/studia-core.js — la LOGICA della console STUDIA (pura, UMD)
 * ---------------------------------------------------------------------------
 * Che cosa decide: come i vault si raggruppano per materia, e la FORMA dello
 * schema che il motore dei modali disegna (navigazione a gruppi, area coi tre
 * comandi, tabella delle sessioni). Niente DOM: `tests/studia-core.test.js`
 * lo passa da `MappAIModalCore.validaSchema`, così un errore di schema si
 * vede in Node e non come una console che «non fa niente» (trappola 33).
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.MappAIStudiaCore = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    function _s(x) { return String(x == null ? '' : x); }
    function nfc(s) { try { return _s(s).normalize('NFC'); } catch (e) { return _s(s); } }
    var SENZA = 'Senza materia';

    /* la materia di un vault: quella dichiarata dentro (`materia` in index.yaml),
       altrimenti la cartella (Documents/<classe>/<materia>/<mappa>), altrimenti
       «Senza materia» — sempre in coda */
    function materiaDi(v) { return nfc(v.materiaDichiarata || v.discDir || '').trim() || SENZA; }
    function perMateria(vaults) {
        var per = {}, ordine = [];
        (vaults || []).forEach(function (v) {
            var m = materiaDi(v);
            if (!per[m]) { per[m] = []; ordine.push(m); }
            per[m].push(v);
        });
        ordine.sort(function (a, b) {
            if (a === SENZA) return 1; if (b === SENZA) return -1;
            return a.localeCompare(b, 'it');
        });
        return ordine.map(function (m) {
            return { nome: m, vaults: per[m].slice().sort(function (a, b) { return nfc(a.rootNodeLabel).localeCompare(nfc(b.rootNodeLabel), 'it'); }) };
        });
    }

    function fmtData(iso) {
        var d = iso ? new Date(iso) : null;
        if (!d || isNaN(d.getTime())) return '';
        var p = function (n) { return String(n).padStart(2, '0'); };
        return p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear();
    }

    /* Lo SCHEMA. `o` = { vaults, sel (fullPath), sessioni: [{id, nome, tipo, data, pdf, html}],
       chiusi: {materia: true}, t } — `t` è window.t o un ripiego. */
    function schema(o) {
        o = o || {};
        var t = o.t || function (k, f) { return f; };
        var gruppi = perMateria(o.vaults);
        var chiusi = o.chiusi || {};
        var sel = _s(o.sel);
        var prog = (o.vaults || []).filter(function (v) { return v.fullPath === sel; })[0] || null;

        var nav = [];
        gruppi.forEach(function (g) {
            nav.push({ gruppo: g.nome, id: 'g:' + g.nome, contatore: g.vaults.length, collassabile: true, chiuso: !!chiusi[g.nome] });
            g.vaults.forEach(function (v) {
                nav.push({
                    id: 'v:' + v.fullPath, etichetta: v.rootNodeLabel || v.folderName, icona: 'map',
                    sotto: v.classeDichiarata || v.classDir || '', attiva: sel === v.fullPath, chiude: false
                });
            });
        });
        if (!nav.length) {
            /* la console pretende almeno una voce: il primo gesto è portare una cartella */
            nav.push({ id: 'nessuno', etichetta: t('st_nessun_vault', 'Nessuna mappa ancora'), icona: 'folder-open', sotto: t('st_nessun_vault_sotto', 'apri una cartella'), chiude: false });
        }

        var s = {
            id: 'studia', titolo: t('st_titolo', 'Studia'),
            sottotitolo: prog ? (prog.rootNodeLabel || prog.folderName) : t('st_sub', 'Le mappe che hai ricevuto, per materia'),
            icona: 'graduation-cap',
            taglia: 'xl', layout: 'console', piena: true,
            invio: false, veloChiude: false,
            navChiudibile: true,
            area: 'una',
            nav: nav,
            sezioni: [],
            azioni: [
                { id: 'apri-cartella', etichetta: t('st_apri_cartella', 'Apri una cartella'), icona: 'folder-open', chiude: false }
            ]
        };
        if (prog) {
            s.sezioni.push({
                id: 'cmd', nuda: true,
                azioni: [
                    /* «Mappa» CONCLUDE: la console si chiude e l'esito arriva al .then() (inv. 10) */
                    { id: 'mappa', etichetta: t('st_mappa', 'Mappa'), icona: 'map', ruolo: 'primario' },
                    { id: 'flashcard', etichetta: t('st_flashcard', 'Flashcard'), icona: 'copy' },   /* conclude: il player si apre sulla mappa */
                    { id: 'prova', etichetta: t('st_prova', 'Prova'), icona: 'help-circle' }   /* conclude: il launcher sulla mappa */
                ]
            });
            s.tabelle = [{
                id: 'sessioni', titolo: t('st_sessioni', 'Le tue prove'), collassabile: true,
                vuota: t('st_sessioni_vuota', 'Nessuna prova ancora: componine una e il documento comparirà qui.'),
                colonne: [
                    { etichetta: t('st_col_doc', 'Documento') },
                    { etichetta: t('st_col_tipo', 'Tipo'), larghezza: '150px' },
                    { etichetta: t('st_col_data', 'Data'), larghezza: '116px' },
                    { etichetta: '', ordinabile: false, larghezza: '96px' }
                ],
                righe: (o.sessioni || []).map(function (x) {
                    return {
                        id: 'apri:' + x.id, chiude: false,
                        celle: [x.nome || x.id, x.tipo || '', fmtData(x.data), {
                            azioni: [
                                { id: 'stampa:' + x.id, icona: 'printer', soloIcona: true, ruolo: 'quieto', etichetta: t('st_stampa', 'Stampa') },
                                { id: 'cartella:' + x.id, icona: 'folder-open', soloIcona: true, ruolo: 'quieto', etichetta: t('st_cartella', 'Apri nei File') }
                            ]
                        }]
                    };
                })
            }];
        }
        return s;
    }

    /* le briciole: Studia › materia › mappa */
    function briciole(o) {
        var t = (o && o.t) || function (k, f) { return f; };
        var out = [{ id: 'studia', et: t('st_titolo', 'Studia') }];
        var prog = ((o && o.vaults) || []).filter(function (v) { return v.fullPath === (o && o.sel); })[0];
        if (prog) { out.push({ id: 'm:' + materiaDi(prog), et: materiaDi(prog) }); out.push({ id: 'v:' + prog.fullPath, et: prog.rootNodeLabel || prog.folderName }); }
        return out;
    }

    return { SENZA: SENZA, materiaDi: materiaDi, perMateria: perMateria, fmtData: fmtData, schema: schema, briciole: briciole };
}));
