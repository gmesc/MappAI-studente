/*
 * studente/autotest.js — il launcher «Studio attivo» dello studente
 * ---------------------------------------------------------------------------
 * `mappai-active-study.js` (copia verbatim) apre un modale suo, costruito a
 * mano: due colonne sbilanciate, il Palazzo della Memoria, le card «a scelta».
 * Qui si SOSTITUISCE `window.ActiveStudy.openLauncher` da fuori con uno schema
 * del motore dei modali — allineato per costruzione — con tre sezioni:
 *   AUTOTEST   un set pronto (scelta multipla · domande aperte) · domande aperte su misura
 *   VISTE      heat map padronanza · mappa lavoro
 *   STRUMENTI  cosa studiare ora · i tuoi progressi nel tempo
 * Le viste e gli strumenti sono quelli di MappAI, chiamati come li chiama il
 * launcher originale. L'autotest passa dal bus (`MappAIStudyBus`), che scrive
 * la padronanza per nodo e la sessione in `Studio Attivo/sessioni.jsonl`: è da
 * lì che heat map, mappa lavoro, «cosa studiare ora» e i progressi leggono.
 *
 * Le voci di un modale CONCLUDONO (inv. 10): la scelta arriva nel `.then()`.
 */
(function () {
    'use strict';
    if (window.MappAIStudenteAutotest) return;

    function t(k, f) { try { return (window.t ? window.t(k, f) : f) || f; } catch (e) { return f; } }
    function toast(m, k) { if (window.showToast) window.showToast(m, k || 'info'); }
    function S() { try { return (typeof appState !== 'undefined') ? appState : window.appState; } catch (e) { return window.appState; } }
    function MM() { return window.MappAIModal; }
    function PC() { return window.MappAIProvaCore; }
    function SC() { return window.MappAIScelta; }
    function SV() { return window.MappAISceltaView; }

    /* ── i fogli di domande aperte: dai gemelli `Materiale Studio/Sorgenti/*.html` ── */
    function leggiFogli() {
        var s = S(), FS = window.MappAIStudenteFS, QP = window.MappAIQuizPrint;
        if (!s || !s.activeVaultPath || !FS || !QP || !QP.setFromHtml) return Promise.resolve([]);
        var dir = s.activeVaultPath + '/Materiale Studio/Sorgenti';
        return FS.lista(dir).then(function (figli) {
            var html = figli.filter(function (f) { return !f.isDir && /\.html?$/i.test(f.name); });
            return Promise.all(html.map(function (f) {
                return FS.leggiTesto(dir + '/' + f.name).then(function (tx) { return PC().foglioDaHtml(f.name, QP.setFromHtml(tx || '')); });
            }));
        }).then(function (l) {
            /* dedup per titolo: lo stesso foglio può esserci due volte (pipeline + ripescaggio) */
            var visti = {}, out = [];
            l.filter(Boolean).forEach(function (f) { var k = String(f.titolo).toLowerCase(); if (!visti[k]) { visti[k] = 1; out.push(f); } });
            return out;
        }).catch(function () { return []; });
    }
    var _cache = { vault: '', fogli: null };
    function fogli() {
        var vp = (S() || {}).activeVaultPath || '';
        if (_cache.vault === vp && _cache.fogli) return Promise.resolve(_cache.fogli);
        return leggiFogli().then(function (f) { _cache = { vault: vp, fogli: f }; return f; });
    }

    /* ── IL LAUNCHER ─────────────────────────────────────────────────────── */
    function openLauncher() {
        var s = S();
        if (!s || !s.db || !s.db.nodes || !s.db.nodes.length) { toast(t('tst_as_open_map', 'Apri una mappa per usare lo studio attivo'), 'error'); return; }
        var mv = !!(window.MappAIMasteryView && window.MappAIMasteryView.active);
        var ev = !!(window.MappAIEffortView && window.MappAIEffortView.active);
        fogli().then(function (fg) {
            var nMC = PC().setMC(s.db.studySets).length;
            var nAp = fg.length;
            var vista = function (on) { return on ? t('as_view_on', 'Vista ATTIVA — clicca per spegnere') : t('as_view_off', 'Vista spenta — clicca per accendere'); };
            var schema = {
                titolo: t('as_title', 'Studio attivo'), sottotitolo: t('as_pick_mode', 'scegli un\'attività'),
                icona: 'puzzle', taglia: 'l', veloChiude: true,
                sezioni: [
                    { titolo: t('st_autotest', 'Autotest'), voci: [
                        { id: 'set-mc', etichetta: t('st_set_mc', 'Un set pronto a scelta multipla'), icona: 'list-checks', sotto: nMC ? nMC + ' ' + t('st_set', 'set') + ' · ' + t('st_correzione', 'correzione immediata') : t('st_no_set', 'nessun set in questa mappa'), disabilitata: !nMC },
                        { id: 'set-aperte', etichetta: t('st_set_ap', 'Un foglio pronto di domande aperte'), icona: 'pen-line', sotto: nAp ? nAp + ' ' + t('st_fogli', 'fogli') + ' · ' + t('st_rispondi_tutto', 'si risponde a tutto') : t('st_no_fogli', 'nessun foglio: chiedi al docente di salvare la mappa con MappAI'), disabilitata: !nAp },
                        { id: 'su-misura', etichetta: t('st_su_misura', 'Domande aperte su misura'), icona: 'sliders-horizontal', sotto: nAp ? t('st_su_misura_sotto', 'un ramo o tutta la mappa · un angolo o tutti (leggi, scegli col «Perché:», rispondi)') : t('st_no_fogli', 'nessun foglio: chiedi al docente di salvare la mappa con MappAI'), disabilitata: !nAp }
                    ] },
                    { titolo: t('as_views_header', 'Viste ed esercizi rapidi'), voci: [
                        { id: 'heatmap', etichetta: t('as_heatmap_title', 'Heat map padronanza'), icona: 'target', sotto: vista(mv) },
                        { id: 'effort', etichetta: t('as_effort_title', 'Mappa lavoro'), icona: 'flame', sotto: vista(ev) }
                    ] },
                    { titolo: t('as_tools_header', 'Strumenti'), voci: [
                        { id: 'studypath', etichetta: t('as_studypath_title', 'Cosa studiare ora'), icona: 'compass', sotto: t('as_studypath_hint', 'Percorso consigliato e ripasso programmato.') },
                        { id: 'celeration', etichetta: t('as_celeration_title', 'I tuoi progressi nel tempo'), icona: 'trending-up', sotto: t('as_celeration_hint', 'Grafico di crescita delle tue sessioni (celeration).') }
                    ] }
                ],
                azioni: [{ id: 'chiudi', etichetta: t('as_close', 'Chiudi'), ruolo: 'quieto' }]
            };
            return MM().open(schema).then(function (r) {
                var a = r && r.azione;
                if (a === 'heatmap') { if (window.MappAIMasteryView) window.MappAIMasteryView.toggle(); }
                else if (a === 'effort') { if (window.MappAIEffortView) window.MappAIEffortView.toggle(); }
                else if (a === 'studypath') { if (window.MappAIStudyPath) window.MappAIStudyPath.open(); }
                else if (a === 'celeration') { if (window.MappAICeleration) window.MappAICeleration.open(); }
                else if (a === 'set-mc') return setMC();
                else if (a === 'set-aperte') return setAperte(fg);
                else if (a === 'su-misura') return suMisura(fg);
            });
        });
    }

    /* ── un set pronto a scelta multipla: il player di MappAI (registra sul bus) ── */
    function setMC() {
        var sets = PC().setMC(S().db.studySets);
        if (sets.length === 1) { window.loadStudySet(sets[0].id); return; }
        return MM().open({
            titolo: t('st_quale_set', 'Quale set?'), icona: 'list-checks', taglia: 'm',
            sezioni: [{ voci: sets.map(function (x) { return { id: x.id, etichetta: x.title || 'Quiz', sotto: x.items.length + ' ' + t('st_domande', 'domande'), icona: 'list-checks' }; }) }],
            azioni: [{ id: 'annulla', etichetta: t('mm_annulla', 'Annulla'), ruolo: 'quieto' }]
        }).then(function (r) { if (r && sets.some(function (x) { return x.id === r.azione; })) window.loadStudySet(r.azione); });
    }

    /* ── un foglio pronto di domande aperte: si risponde a tutto ── */
    function setAperte(fg) {
        var scegli = (fg.length === 1) ? Promise.resolve(fg[0])
            : MM().open({
                titolo: t('st_quale_foglio', 'Quale foglio?'), icona: 'pen-line', taglia: 'm',
                sezioni: [{ voci: fg.map(function (f, i) { return { id: 'f' + i, etichetta: f.titolo, sotto: f.items.length + ' ' + t('st_domande', 'domande') + (f.angle ? ' · ' + SV().etAngolo(window.t, f.angle) : ''), icona: 'pen-line' }; }) }],
                azioni: [{ id: 'annulla', etichetta: t('mm_annulla', 'Annulla'), ruolo: 'quieto' }]
            }).then(function (r) { var m = r && /^f(\d+)$/.exec(r.azione); return m ? fg[Number(m[1])] : null; });
        return scegli.then(function (f) {
            if (!f) return;
            var pool = PC().poolAperte([f]);
            prova({ titolo: f.titolo, pool: pool, dueTempi: false, tipo: 'foglio', ambito: '', angoliEt: f.angle ? SV().etAngolo(window.t, f.angle) : '' });
        });
    }

    /* ── domande aperte su misura: il setup, poi la prova ── */
    function suMisura(fg) {
        var pool = PC().poolAperte(fg);
        var o = PC().opzioni(pool);
        var campi = [
            { id: 'amb-tutto', tipo: 'radio', gruppo: 'ambito', etichetta: t('st_tutta', 'Tutta la mappa'), valore: true },
            { id: 'amb-ramo', tipo: 'radio', gruppo: 'ambito', etichetta: t('st_un_ramo', 'Un ramo'), valore: false,
              aiuto: o.rami ? '' : t('st_ramo_spento', 'non disponibile: questi fogli non dichiarano il ramo') }
        ];
        if (o.rami) campi.push({ id: 'ramo', tipo: 'scelta', etichetta: t('st_quale_ramo', 'Quale ramo'), opzioni: o.rami.map(function (r) { return { valore: r, etichetta: r }; }), valore: o.rami[0], larghezza: 'meta' });
        campi.push(
            { id: 'ang-tutti', tipo: 'radio', gruppo: 'angoli', etichetta: t('st_tutti_angoli', 'Tutti gli angoli'), valore: true,
              aiuto: t('st_tutti_angoli_aiuto', 'la sessione metacognitiva: leggi la stessa domanda in tutti i tagli, dì per ognuna «Perché:», poi rispondi a quelle verdi') },
            { id: 'ang-uno', tipo: 'radio', gruppo: 'angoli', etichetta: t('st_un_angolo', 'Un angolo solo'), valore: false },
            { id: 'angolo', tipo: 'scelta', etichetta: t('st_quale_angolo', 'Quale angolo'), opzioni: o.angoli.map(function (a) { return { valore: a, etichetta: SV().etAngolo(window.t, a) }; }), valore: o.angoli[0] || '', larghezza: 'meta' }
        );
        return MM().open({
            titolo: t('st_su_misura', 'Domande aperte su misura'), icona: 'sliders-horizontal', taglia: 'm', invio: true,
            sezioni: [{ campi: campi }],
            azioni: [{ id: 'annulla', etichetta: t('mm_annulla', 'Annulla'), ruolo: 'quieto' }, { id: 'avvia', etichetta: t('st_avvia', 'Avvia'), ruolo: 'primario' }]
        }).then(function (r) {
            if (!r || r.azione !== 'avvia') return;
            var v = r.valori || {};
            var c = PC().componi(pool, {
                ambito: (v['amb-ramo'] && o.rami) ? 'ramo' : 'tutto', ramo: v.ramo,
                angoli: v['ang-uno'] ? 'uno' : 'tutti', angolo: v.angolo
            });
            if (!c.pool.length) { toast(t('st_pool_vuoto', 'Con queste scelte non resta nessuna domanda.'), 'warning'); return; }
            var titolo = t('st_su_misura', 'Domande aperte su misura') + ' — ' + (v['amb-ramo'] && o.rami ? v.ramo : t('st_tutta', 'Tutta la mappa')) +
                ' · ' + (v['ang-uno'] ? SV().etAngolo(window.t, v.angolo) : t('st_tutti_angoli', 'Tutti gli angoli'));
            prova({ titolo: titolo, pool: c.pool, dueTempi: c.dueTempi, tipo: 'su-misura',
                    ambito: (v['amb-ramo'] && o.rami) ? v.ramo : '', angoliEt: v['ang-uno'] ? SV().etAngolo(window.t, v.angolo) : t('st_tutti_angoli', 'Tutti gli angoli') });
        });
    }

    /* ── LA PROVA: la view «a scelta» dentro un modale, poi il bus ──────────
       Stesso innesto di `apriInApp` (mappai-scelta.js): una sezione NUDA fa da
       ospite (la `tela` è solo delle console), il velo non chiude, ESC chiede. */
    function prova(o) {
        var stato = PC().statoIniziale(o.pool, o.dueTempi);
        /* autovalutazione ACCESA: è l'unica misura di una risposta aperta, e senza
           misura la padronanza (heat map, cosa studiare ora) non vede la prova */
        var cfg = SC().normalizzaCfg({ minimo: 1, minimoAree: 1, perRamo: true, autovalutazione: true });
        var host = null, consegnato = false, ridisegna = null;
        var schema = {
            titolo: o.titolo, icona: 'pen-line', taglia: 'xl', sporco: true, veloChiude: false, invio: false,
            sezioni: [{ id: 'prova', nuda: true }], azioni: [],
            suApertura: function (box, rid) {
                ridisegna = rid;
                host = box.querySelector('[data-sez="prova"] .mm-sez__c');
                if (!host) return;
                host.style.height = '68vh'; host.style.padding = '0';
                monta();
            }
        };
        MM().open(schema);
        function monta() {
            SV().monta(host, {
                pool: o.pool, cfg: cfg, stato: stato, t: window.t,
                mostraAngolo: o.dueTempi,
                chip: o.dueTempi ? PC().CHIP_PERCHE : [],
                chipPrende: o.dueTempi ? 'capito' : '',
                raggruppa: o.dueTempi ? 'domanda-per-angoli' : '',
                hint: o.dueTempi ? t('st_hint_due_tempi', 'Leggi la stessa domanda in tutti i tagli. Per ognuna dì «Perché:» — le verdi le risponderai dopo, non per forza tutte.') : '',
                /* rispondere a tutte le verdi NON è obbligatorio: alla consegna la
                   view chiede, e qui si risponde sì senza fermare lo studente */
                chiedi: function () { return Promise.resolve(true); },
                onCambia: function (id, r, st) { stato = st; },
                onConsegna: function (st) { consegna(st); }
            });
        }
        function consegna(st) {
            if (consegnato) return;
            consegnato = true;
            var voci = PC().voci(o.pool, st, S().db.nodes);
            registra(o, voci);
            var frase = t('st_consegnato', 'Risposte registrate: {n}.').replace('{n}', voci.length) + ' ' + t('st_consegnato_sotto', 'Le trovi nella heat map, in «Cosa studiare ora» e nei progressi.');
            var fine = function (extra) {
                if (ridisegna) ridisegna(Object.assign({}, schema, { sporco: false, suApertura: null, sezioni: [{ testo: frase + (extra ? ' ' + extra : '') }], azioni: [{ id: 'chiudi', etichetta: t('mm_chiudi', 'Chiudi'), ruolo: 'primario' }] }));
            };
            fine(t('st_scrivo', 'Scrivo il foglio…'));
            /* il DOCUMENTO: sorgente prima della resa (inv. 18) — sessione.json, poi
               l'HTML compilato e il PDF; una resa che fallisce lo dice e non toglie la sorgente */
            scriviSessione(o, st).then(function (r) {
                fine(r.ok ? t('st_foglio_ok', 'Il foglio delle risposte è in «Le tue prove» (Studio Attivo/Prove).') : t('st_foglio_ko', 'Il foglio delle risposte non è stato scritto: ') + (r.error || ''));
                toast(r.ok ? t('st_foglio_ok_toast', 'Foglio delle risposte salvato') : t('st_foglio_ko', 'Il foglio delle risposte non è stato scritto: ') + (r.error || ''), r.ok ? 'success' : 'error');
            });
        }
    }
    /* ── LA SESSIONE SU DISCO ────────────────────────────────────────────────
       Studio Attivo/Prove/<nome>/ — `sessione.json` (la sorgente: che cosa, quando,
       stato), poi le rese: `risposte.html` (il foglio compilato, si stampa con
       window.print) e `risposte.pdf` (jsPDF: il file da mandare al docente).
       Niente soluzioni, niente report per le domande aperte (richiesta di Giacomo). */
    function cartellaSessione(o) {
        var s = S(), FS = window.MappAIStudenteFS;
        var dir = s.activeVaultPath + '/Studio Attivo/Prove';
        return FS.lista(dir).then(function (figli) {
            var esistenti = figli.filter(function (f) { return f.isDir; }).map(function (f) { return f.name; });
            var nome = PC().nomeSessione({ data: new Date(), tipo: o.tipo === 'quiz' ? 'quiz' : 'domande', mappa: s.rootNodeLabel || 'Mappa', ambito: o.ambito || '' }, esistenti);
            return { rel: 'Studio Attivo/Prove/' + nome, nome: nome };
        });
    }
    function scrivi(rel, o) {
        return window.electronAPI.saveVaultFile(Object.assign({ vaultPath: S().activeVaultPath, relPath: rel }, o)).then(function (r) {
            if (!r || !r.ok) throw new Error((r && r.error) || 'scrittura fallita: ' + rel);
            return r;
        });
    }
    function scriviSessione(o, st) {
        var s = S(), QP = window.MappAIQuizPrint;
        if (!s || !s.activeVaultPath) return Promise.resolve({ ok: false, error: 'nessun vault' });
        var righe = PC().foglioCompilato(o.pool, st, PC().CHIP_PERCHE, function (a) { return a ? SV().etAngolo(window.t, a) : ''; });
        var data = new Date();
        var meta = { tipo: 'Domande aperte', titolo: o.titolo, mappa: s.rootNodeLabel || '', data: data.toISOString(), ambito: o.ambito || '', angoli: o.angoliEt || '', dueTempi: !!o.dueTempi };
        var cart = null;
        return cartellaSessione(o).then(function (c) {
            cart = c;
            var sessione = Object.assign({ nome: c.nome, html: 'risposte.html', pdf: 'risposte.pdf', ids: o.pool.map(function (v) { return v.id; }), stato: st, righe: righe }, meta);
            return scrivi(c.rel + '/sessione.json', { text: JSON.stringify(sessione, null, 2) });
        }).then(function () {
            var html = QP.buildOpenQuestionsHtml({ id: 'prova', title: o.titolo, type: 'Domande aperte', items: PC().itemsHtml(righe) },
                { mapName: s.rootNodeLabel || '', includeBar: false, includeAnswers: false, now: PC().fmtData(data) });
            return scrivi(cart.rel + '/risposte.html', { text: html });
        }).then(function () {
            return window.MappAIStudentePdf.risposte({ titolo: o.titolo, mappa: s.rootNodeLabel || '', data: PC().fmtData(data), ambito: meta.ambito, angoli: meta.angoli, righe: righe })
                .then(function (b64) { return scrivi(cart.rel + '/risposte.pdf', { base64: b64 }); });
        }).then(function () { return { ok: true, rel: cart.rel }; })
          .catch(function (e) { console.warn('[autotest] sessione', e); return { ok: false, error: e && e.message }; });
    }
    /* Il set a scelta multipla gira nel player di MappAI: alla fine (`showStudySummary`)
       si archivia il REPORT come dopo l'attività QR — l'HTML `lr-*` di
       `buildStudentsReportHtml`, con `results.json` e `sessione.json` accanto. */
    function scriviReportMC() {
        var s = S(), R = window.MappAILiveReports, res = window.studyResults, items = window.activeStudySessionItems;
        if (!s || !s.activeVaultPath || !R || !res || res.mode !== 'quiz' || !items || !items.length) return Promise.resolve({ ok: false });
        var data = new Date(), titolo = 'Quiz — ' + (window.activeStudySetTitle || 'set');
        var mm = Math.floor((window.studySeconds || 0) / 60), ss = (window.studySeconds || 0) % 60;
        var rep = PC().reportMC(items, res, { mappa: s.rootNodeLabel || '', titolo: titolo, data: PC().fmtData(data), durata: String(mm).padStart(2, '0') + ':' + String(ss).padStart(2, '0'), chi: t('st_io', 'Io') });
        var cart = null;
        return cartellaSessione({ tipo: 'quiz', ambito: '' }).then(function (c) {
            cart = c;
            return scrivi(c.rel + '/sessione.json', { text: JSON.stringify({ nome: c.nome, tipo: 'Scelta multipla', titolo: titolo, mappa: s.rootNodeLabel || '', data: data.toISOString(), html: 'report.html', giuste: rep.giuste, totale: rep.totale, pct: rep.pct }, null, 2) });
        }).then(function () {
            return scrivi(cart.rel + '/results.json', { text: JSON.stringify({ items: items, results: res }, null, 2) });
        }).then(function () {
            return scrivi(cart.rel + '/report.html', { text: R.buildStudentsReportHtml(rep.meta, rep.results) });
        }).then(function () { toast(t('st_report_ok', 'Report della prova salvato in «Le tue prove»'), 'success'); return { ok: true }; })
          .catch(function (e) { console.warn('[autotest] report', e); toast(t('st_report_ko', 'Report non salvato: ') + (e && e.message), 'error'); return { ok: false }; });
    }
    function agganciaPlayer() {
        var orig = window.showStudySummary;
        if (typeof orig !== 'function' || orig.__studente) return;
        window.showStudySummary = function () { var r = orig.apply(this, arguments); try { scriviReportMC(); } catch (e) { } return r; };
        window.showStudySummary.__studente = true;
    }

    /* il bus: come `registra` di mappai-scelta.js — la padronanza per nodo dove il
       nodo esiste (MC: 1/0; aperte: nessuna misura, ma la sessione si scrive) */
    function registra(o, voci) {
        var BUS = window.MappAIStudyBus;
        if (!BUS || !BUS.begin) return;
        try {
            BUS.begin(o.tipo === 'su-misura' ? 'domande-su-misura' : 'domande', o.titolo);
            voci.forEach(function (v) {
                if (v.score == null || !v.nodeId) { if (BUS._cur) BUS._cur.entries.push({ nodeId: v.nodeId, label: v.label, score: v.score }); return; }
                BUS.record(v.nodeId, v.label, o.tipo, { score: v.score });
            });
            BUS.end();
        } catch (e) { console.warn('[autotest] registro', e); }
    }

    /* la sostituzione: dopo che mappai-active-study.js ha definito il suo */
    function installa() {
        if (!window.ActiveStudy) window.ActiveStudy = {};
        window.ActiveStudy.openLauncher = openLauncher;
        agganciaPlayer();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installa); else installa();
    installa();

    window.MappAIStudenteAutotest = { openLauncher: openLauncher, fogli: fogli, prova: prova, suMisura: suMisura, scriviReportMC: scriviReportMC };
}());
