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
    function esc(x) { var d = document.createElement('div'); d.textContent = x == null ? '' : String(x); return d.innerHTML; }
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

    /* ── IL LAUNCHER: una CONSOLE a schermo intero ─────────────────────────
       La forma la decide `MappAIStudenteLauncherCore.schema` (pura, testata con
       validaSchema). Qui: lo stato della scelta, la lettura dei materiali, le
       viste che agiscono subito, e «Avvia» che conclude nel `.then()`. */
    function LC() { return window.MappAIStudenteLauncherCore; }
    function splitRicordato() { try { return localStorage.getItem('mappai_studente_split') === '1'; } catch (e) { return false; } }
    function openLauncher(selIniziale) {
        var s = S();
        if (!s || !s.db || !s.db.nodes || !s.db.nodes.length) { toast(t('tst_as_open_map', 'Apri una mappa per usare lo studio attivo'), 'error'); return; }
        fogli().then(function (fg) {
            var sets = PC().setMC(s.db.studySets);
            var poolAp = PC().poolAperte(fg), op = PC().opzioni(poolAp);
            var st = { sel: String(selIniziale || ''), set: '', foglio: null, split: splitRicordato() };
            function dati() {
                return {
                    sel: st.sel, nMC: sets.length, nAp: fg.length, set: st.set, foglio: st.foglio, split: st.split, t: window.t,
                    sets: sets.map(function (x) { return { id: x.id, title: x.title || 'Quiz', n: x.items.length }; }),
                    fogli: fg.map(function (f) { return { titolo: f.titolo, n: f.items.length, angolo: f.angle ? SV().etAngolo(window.t, f.angle) : '' }; }),
                    opzioni: { rami: op.rami, angoli: op.angoli.map(function (a) { return { k: a, et: SV().etAngolo(window.t, a) }; }) },
                    mv: !!(window.MappAIMasteryView && window.MappAIMasteryView.active),
                    ev: !!(window.MappAIEffortView && window.MappAIEffortView.active)
                };
            }
            function briciole() {
                var CM = window.MappAIConsoleManifesto; if (!CM || !CM.briciole) return;
                var v = LC().VOCI.filter(function (x) { return x.id === st.sel; })[0];
                var prog = ((window.MappAIStudente || {}).stato || {}).vaults || [];
                prog = prog.filter(function (x) { return x.fullPath === s.activeVaultPath; })[0] || {};
                try {
                    CM.briciole([{ id: 'studia', et: t('st_titolo', 'Studia') }, { id: 'mappa', et: prog.rootNodeLabel || prog.folderName || t('st_mappa', 'Mappa') },
                        { id: 'studio', et: t('as_title', 'Studio attivo') }].concat(v ? [{ id: v.id, et: t('st_v_' + v.id, v.et) }] : []));
                } catch (e) { }
            }
            /* le briciole cliccate (`mappai-briciola`, dal manifesto): «Studia» chiude e torna alla
               console, «mappa» chiude e basta (la mappa è sotto), «Studio attivo» torna alla prima pagina */
            var box = null, dove = '';
            function suBriciola(ev) {
                var id = ev && ev.detail && ev.detail.id;
                if (id === 'studio') { st.sel = ''; st.set = ''; st.foglio = null; if (box && box.__ridisegna) { box.__ridisegna(LC().schema(dati())); briciole(); } return; }
                if (id !== 'studia' && id !== 'mappa') return;
                dove = id;
                var x = box && box.querySelector('[data-azione="__chiudi"]'); if (x) x.click();
            }
            document.addEventListener('mappai-briciola', suBriciola);
            var schema = LC().schema(dati());
            schema.suApertura = function (b, ridisegna) { box = b; box.__ridisegna = ridisegna; briciole(); };
            schema.suAzione = function (ev, box, ridisegna) {
                var a = String(ev && ev.azione || '');
                if (ev && ev.valori && typeof ev.valori.split === 'boolean') st.split = ev.valori.split;
                if (a === '__nav') {
                    var v = String(ev.voce || '');
                    if (/^g:/.test(v)) return;
                    if (v === 'heatmap' && window.MappAIMasteryView) { window.MappAIMasteryView.toggle(); ridisegna(LC().schema(dati())); briciole(); return; }
                    if (v === 'effort' && window.MappAIEffortView) { window.MappAIEffortView.toggle(); ridisegna(LC().schema(dati())); briciole(); return; }
                    if (v === 'studypath') { if (window.MappAIStudyPath) window.MappAIStudyPath.open(); return; }
                    if (v === 'celeration') { if (window.MappAICeleration) window.MappAICeleration.open(); return; }
                    st.sel = v; st.set = ''; st.foglio = null;
                    ridisegna(LC().schema(dati())); briciole(); return;
                }
                if (/^set:/.test(a)) { st.set = a.slice(4); ridisegna(LC().schema(dati())); return; }
                if (/^foglio:/.test(a)) { st.foglio = Number(a.slice(7)); ridisegna(LC().schema(dati())); return; }
                /* `__campo` (la spunta split) è già letto sopra; `__esc` esce: non è la home */
            };
            return MM().open(schema).then(function (r) {
                document.removeEventListener('mappai-briciola', suBriciola);
                if (dove === 'studia' || (r && r.azione === 'torna')) { if (window.MappAIStudente) window.MappAIStudente.torna(); return; }
                if (!r || r.azione !== 'avvia') return;
                var v = r.valori || {};
                st.split = !!v.split;
                try { localStorage.setItem('mappai_studente_split', st.split ? '1' : '0'); } catch (e) { }
                return avvia(st, v, fg, sets, poolAp, op);
            });
        });
    }

    /* ── AVVIA: dalla scelta alla prova ─────────────────────────────────── */
    function avvia(st, v, fg, sets, poolAp, op) {
        if (st.sel === 'set-mc') {
            var set = sets.filter(function (x) { return x.id === st.set; })[0]; if (!set) return;
            /* la scelta multipla passa SEMPRE dalla view «a scelta», a schermo pieno e diviso: domanda e opzioni grandi,
               altoparlante, verdetto subito dopo la risposta — la stessa schermata del quiz LIVE via QR (packet 0112).
               Il player storico di MappAI (`loadStudySet`) qui non si apre più. */
            var poolMC = PC().poolAperte([PC().foglioDaSet(set)]);
            return prova({ titolo: 'Quiz — ' + (set.title || 'set'), pool: poolMC, dueTempi: false, tipo: 'quiz', mc: true, split: !!st.split,
                           ambito: '', angoliEt: set.angle ? SV().etAngolo(window.t, set.angle) : '' });
        }
        if (st.sel === 'set-aperte') {
            var f = fg[st.foglio]; if (!f) return;
            return prova({ titolo: f.titolo, pool: PC().poolAperte([f]), dueTempi: false, tipo: 'foglio', split: st.split,
                           ambito: '', angoliEt: f.angle ? SV().etAngolo(window.t, f.angle) : '' });
        }
        if (st.sel === 'su-misura') {
            var c = PC().componi(poolAp, {
                ambito: (v['amb-ramo'] && op.rami) ? 'ramo' : 'tutto', ramo: v.ramo,
                angoli: v['ang-uno'] ? 'uno' : 'tutti', angolo: v.angolo
            });
            if (!c.pool.length) { toast(t('st_pool_vuoto', 'Con queste scelte non resta nessuna domanda.'), 'warning'); return; }
            var titolo = t('st_su_misura', 'Domande aperte su misura') + ' — ' + (v['amb-ramo'] && op.rami ? v.ramo : t('st_tutta', 'Tutta la mappa')) +
                ' · ' + (v['ang-uno'] ? SV().etAngolo(window.t, v.angolo) : t('st_tutti_angoli', 'Tutti gli angoli'));
            return prova({ titolo: titolo, pool: c.pool, dueTempi: c.dueTempi, tipo: 'su-misura', split: st.split,
                           ambito: (v['amb-ramo'] && op.rami) ? v.ramo : '', angoliEt: v['ang-uno'] ? SV().etAngolo(window.t, v.angolo) : t('st_tutti_angoli', 'Tutti gli angoli') });
        }
    }

    /* ── LA PROVA: la view «a scelta» in un modale O nel dock (split), poi il bus ──
       Modale: stesso innesto di `apriInApp` (una sezione NUDA fa da ospite; la `tela`
       è solo delle console). Split: l'ospite è il corpo del dock, accanto alla mappa;
       chiudere il dock a prova in corso chiede. MC (`o.mc`): il verdetto immediato lo
       calcola qui (`MappAIProvaCore.verdetto`) e lo inietta nella view. */
    function prova(o) {
        var stato = PC().statoIniziale(o.pool, o.dueTempi);
        /* autovalutazione ACCESA per le aperte: è l'unica misura di una risposta aperta */
        var cfg = SC().normalizzaCfg({ minimo: 1, minimoAree: 1, perRamo: true, autovalutazione: !o.mc });
        var host = null, consegnato = false, ridisegna = null, api = null, verdetti = {};
        function opzioniView() {
            return {
                pool: o.pool, cfg: cfg, stato: stato, t: window.t, verdetti: verdetti,
                mostraAngolo: o.dueTempi, senzaAree: true,
                /* le aperte coi criteri si autovalutano spuntandoli, DOPO la risposta (16/9) */
                criteri: !o.mc,
                chip: o.dueTempi ? PC().CHIP_PERCHE : [],
                chipPrende: o.dueTempi ? 'capito' : '',
                raggruppa: o.dueTempi ? 'domanda-per-angoli' : '',
                hint: o.dueTempi ? t('st_hint_due_tempi', 'Leggi la stessa domanda in tutti i tagli. Per ognuna dì «Perché:» — le verdi le risponderai dopo, non per forza tutte.') : '',
                chiedi: function () { return Promise.resolve(true); },
                onCambia: function (id, r, st) {
                    stato = st;
                    if (o.mc && r && r.scelta != null && r.scelta !== '' && !verdetti[id] && api) {
                        var v = o.pool.filter(function (x) { return x.id === id; })[0];
                        var vd = v && PC().verdetto(v, r);
                        if (vd) { verdetti[id] = vd; api.verdetto(id, vd); }
                    }
                },
                onConsegna: function (st) { consegna(st); }
            };
        }
        var schema = null;
        if (o.split) {
            var D = window.MappAIStudenteDocumenti;
            host = D.apri({
                titolo: o.titolo,
                monta: function (h) { h.style.padding = '0'; api = SV().monta(h, opzioniView()); },
                chiediChiusura: function () {
                    if (consegnato) return Promise.resolve(true);
                    var testo = t('st_lascia', 'Lasciare la prova? Le risposte scritte vanno perse.');
                    return MM().conferma ? MM().conferma({ testo: testo }) : Promise.resolve(window.confirm(testo));
                }
            });
        } else {
            schema = {
                titolo: o.titolo, icona: o.mc ? 'list-checks' : 'pen-line', taglia: 'xl', sporco: true, veloChiude: false, invio: false,
                sezioni: [{ id: 'prova', nuda: true }], azioni: [],
                suApertura: function (box, rid) {
                    ridisegna = rid;
                    host = box.querySelector('[data-sez="prova"] .mm-sez__c');
                    if (!host) return;
                    host.style.height = '68vh'; host.style.padding = '0';
                    api = SV().monta(host, opzioniView());
                }
            };
            MM().open(schema);
        }
        function fine(testo) {
            if (o.split) {
                if (!host) return;
                host.innerHTML = '<div class="sd-esito"><p>' + esc(testo) + '</p><button type="button" class="sd-esito__b">' + esc(t('mm_chiudi', 'Chiudi')) + '</button></div>';
                host.querySelector('.sd-esito__b').onclick = function () { window.MappAIStudenteDocumenti.chiudi(); };
            } else if (ridisegna) {
                ridisegna(Object.assign({}, schema, { sporco: false, suApertura: null, sezioni: [{ testo: testo }], azioni: [{ id: 'chiudi', etichetta: t('mm_chiudi', 'Chiudi'), ruolo: 'primario' }] }));
            }
        }
        function consegna(st) {
            if (consegnato) return;
            consegnato = true;
            var voci = PC().voci(o.pool, st, S().db.nodes);
            registra(o, voci);
            if (o.mc) {
                var rep = PC().reportMCDaStato(o.pool, st, { mappa: S().rootNodeLabel || '', titolo: o.titolo, data: PC().fmtData(new Date()), chi: t('st_io', 'Io') });
                fine(t('st_mc_esito', 'Risposte giuste: {g} su {n}.').replace('{g}', rep.giuste).replace('{n}', rep.totale) + ' ' + t('st_scrivo', 'Scrivo il report…'));
                scriviReport(rep, o.titolo).then(function (r) {
                    fine(t('st_mc_esito', 'Risposte giuste: {g} su {n}.').replace('{g}', rep.giuste).replace('{n}', rep.totale) + ' ' +
                        (r.ok ? t('st_report_ok', 'Report della prova salvato in «Le tue prove»') : t('st_report_ko', 'Report non salvato: ') + (r.error || '')));
                });
                return;
            }
            var frase = t('st_consegnato', 'Risposte registrate: {n}.').replace('{n}', voci.length) + ' ' + t('st_consegnato_sotto', 'Le trovi nella heat map, in «Cosa studiare ora» e nei progressi.');
            fine(frase + ' ' + t('st_scrivo', 'Scrivo il foglio…'));
            scriviSessione(o, st).then(function (r) {
                fine(frase + ' ' + (r.ok ? t('st_foglio_ok', 'Il foglio delle risposte è in «Le tue prove» (Studio Attivo/Prove).') : t('st_foglio_ko', 'Il foglio delle risposte non è stato scritto: ') + (r.error || '')));
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
    function scriviReport(rep, titolo) {
        var s = S(), R = window.MappAILiveReports;
        if (!s || !s.activeVaultPath || !R) return Promise.resolve({ ok: false, error: 'nessun vault' });
        var data = new Date(), cart = null;
        return cartellaSessione({ tipo: 'quiz', ambito: '' }).then(function (c) {
            cart = c;
            return scrivi(c.rel + '/sessione.json', { text: JSON.stringify({ nome: c.nome, tipo: 'Scelta multipla', titolo: titolo, mappa: s.rootNodeLabel || '', data: data.toISOString(), html: 'report.html', giuste: rep.giuste, totale: rep.totale, pct: rep.pct }, null, 2) });
        }).then(function () {
            return scrivi(cart.rel + '/results.json', { text: JSON.stringify(rep.results, null, 2) });
        }).then(function () {
            return scrivi(cart.rel + '/report.html', { text: R.buildStudentsReportHtml(rep.meta, rep.results) });
        }).then(function () { return { ok: true, rel: cart.rel }; })
          .catch(function (e) { console.warn('[autotest] report', e); return { ok: false, error: e && e.message }; });
    }
    function scriviReportMC() {
        var s = S(), res = window.studyResults, items = window.activeStudySessionItems;
        if (!s || !s.activeVaultPath || !res || res.mode !== 'quiz' || !items || !items.length) return Promise.resolve({ ok: false });
        var data = new Date(), titolo = 'Quiz — ' + (window.activeStudySetTitle || 'set');
        var mm = Math.floor((window.studySeconds || 0) / 60), ss = (window.studySeconds || 0) % 60;
        var rep = PC().reportMC(items, res, { mappa: s.rootNodeLabel || '', titolo: titolo, data: PC().fmtData(data), durata: String(mm).padStart(2, '0') + ':' + String(ss).padStart(2, '0'), chi: t('st_io', 'Io') });
        return scriviReport(rep, titolo).then(function (r) {
            toast(r.ok ? t('st_report_ok', 'Report della prova salvato in «Le tue prove»') : t('st_report_ko', 'Report non salvato: ') + (r.error || ''), r.ok ? 'success' : 'error');
            return r;
        });
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
            BUS.begin(o.mc ? 'quiz-set' : (o.tipo === 'su-misura' ? 'domande-su-misura' : 'domande'), o.titolo);
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

    window.MappAIStudenteAutotest = { openLauncher: openLauncher, fogli: fogli, prova: prova, avvia: avvia, scriviReportMC: scriviReportMC };
}());
