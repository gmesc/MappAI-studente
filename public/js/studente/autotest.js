/*
 * studente/autotest.js — le prove dello studente: dalla riga della console alla prova
 * ---------------------------------------------------------------------------
 * Fino al packet 0117 qui stava il launcher «Studio attivo» (autotest, viste,
 * strumenti) che sostituiva `window.ActiveStudy.openLauncher`. Dal 0117 (Giacomo,
 * 20/10) la finestra non c'è più: le prove si scelgono nella console del progetto,
 * da tre tabelle (studia-core › tabelleProve). Qui: `leggiProve(fullPath)` legge
 * fogli e set dal disco, senza aprire la mappa, per quelle tabelle; `avviaDa`
 * parte da una riga, con la mappa già aperta (console.js › apriMappa). La prova
 * si apre SEMPRE nel pannello accanto alla mappa, mappa aperta: la spunta per
 * sceglierlo è uscita. L'autotest passa dal bus (`MappAIStudyBus`), che scrive la
 * padronanza per nodo e la sessione in `Studio Attivo/sessioni.jsonl`.
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
    /* «Prove: Semplice / Meta» (0126), la preferenza della console: la regola è di studia-core */
    function modo() {
        var v = null; try { v = localStorage.getItem('mappai_studente_prove_modo'); } catch (e) { }
        var C = window.MappAIStudiaCore;
        return (C && C.modoProve) ? C.modoProve(v) : 'semplice';
    }

    /* ── i fogli di domande aperte: dai gemelli `Materiale Studio/Sorgenti/*.html` ── */
    function leggiFogli(vp) {
        var FS = window.MappAIStudenteFS, QP = window.MappAIQuizPrint;
        if (!vp || !FS || !QP || !QP.setFromHtml) return Promise.resolve([]);
        var dir = vp + '/Materiale Studio/Sorgenti';
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
    /* la cache è per cartella: le righe della console (`aperte:<i>`) contano sull'ordine
       di QUESTO elenco, e la prova che parte dopo l'apertura della mappa lo rilegge da qui */
    var _cache = { vault: '', fogli: null };
    function fogli(vp) {
        vp = vp || (S() || {}).activeVaultPath || '';
        if (_cache.vault === vp && _cache.fogli) return Promise.resolve(_cache.fogli);
        return leggiFogli(vp).then(function (f) { _cache = { vault: vp, fogli: f }; return f; });
    }
    /* i set del vault dal disco (`Materiale Studio/*.json`), filtrati come li filtra
       `loadVault` dell'adattatore: la console li mostra prima che la mappa si apra */
    function leggiSet(vp, radice) {
        var FS = window.MappAIStudenteFS;
        if (!vp || !FS) return Promise.resolve([]);
        var dir = vp + '/Materiale Studio';
        return FS.lista(dir).then(function (figli) {
            return Promise.all(figli.filter(function (f) { return !f.isDir && /\.json$/i.test(f.name); }).map(function (f) {
                return FS.leggiTesto(dir + '/' + f.name).then(function (tx) { try { return JSON.parse(tx || 'null'); } catch (e) { return null; } });
            }));
        }).then(function (l) {
            var FC = window.MappAIFilesCore;
            l = l.filter(Boolean);
            return (FC && FC.setsDelVault) ? FC.setsDelVault(l, radice || '') : l;
        }).catch(function () { return []; });
    }
    function etAngolo(a) { return (a && a !== 'auto' && SV() && SV().etAngolo) ? SV().etAngolo(window.t, a) : ''; }

    /* ── LE PROVE DEL PROGETTO, per le tabelle della console (0117) ─────────
       → { aperte:[{i,angolo,titolo,n}], mc:[{id,angolo,titolo,n}], suMisura:{n}|null } */
    function leggiProve(vp, radice) {
        /* sempre dal disco (una mappa ricevuta di nuovo porta fogli nuovi), e la cache si rinfresca */
        var fg = leggiFogli(vp).then(function (f) { _cache = { vault: vp, fogli: f }; return f; });
        return Promise.all([fg, leggiSet(vp, radice)]).then(function (r) {
            var fg = r[0], sets = PC().setMC(r[1]), pool = PC().poolAperte(fg);
            return {
                aperte: fg.map(function (f, i) { return { i: i, angolo: etAngolo(f.angle), titolo: f.titolo, n: f.items.length }; }),
                mc: sets.map(function (x) { return { id: x.id, angolo: etAngolo(x.angle), titolo: x.title || 'Quiz', n: x.items.length }; }),
                suMisura: pool.length ? { n: pool.length } : null
            };
        }).catch(function () { return { aperte: [], mc: [], suMisura: null }; });
    }

    /* ── DA UNA RIGA DELLA CONSOLE ALLA PROVA (0117) ────────────────────────
       scelta = { tipo: 'aperte'|'mc'|'su-misura', id }. La mappa è già aperta
       (console.js › apriMappa): i set si prendono da lì, i fogli dalla cache. */
    function avviaDa(scelta) {
        var s = S();
        if (!s || !s.db || !s.db.nodes || !s.db.nodes.length) { toast(t('tst_as_open_map', 'Apri una mappa per usare lo studio attivo'), 'error'); return Promise.resolve(); }
        scelta = scelta || {};
        return fogli().then(function (fg) {
            var sets = PC().setMC(s.db.studySets), poolAp = PC().poolAperte(fg), op = PC().opzioni(poolAp);
            if (scelta.tipo === 'mc') return avvia({ sel: 'set-mc', set: String(scelta.id) }, {}, fg, sets, poolAp, op);
            if (scelta.tipo === 'aperte') return avvia({ sel: 'set-aperte', foglio: Number(scelta.id) }, {}, fg, sets, poolAp, op);
            if (scelta.tipo !== 'su-misura' || !poolAp.length) return;
            var schema = window.MappAIStudenteLauncherCore.schemaSuMisura({ t: window.t,
                opzioni: { rami: op.rami, angoli: op.angoli.map(function (a) { return { k: a, et: SV().etAngolo(window.t, a) }; }) } });
            return MM().open(schema).then(function (r) {
                if (r && r.azione === 'avvia') return avvia({ sel: 'su-misura' }, r.valori || {}, fg, sets, poolAp, op);
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
            return prova({ titolo: 'Quiz — ' + (set.title || 'set'), pool: poolMC, dueTempi: false, tipo: 'quiz', mc: true, split: true,
                           ambito: '', angoliEt: set.angle ? SV().etAngolo(window.t, set.angle) : '', angolo: set.angle || '' });
        }
        if (st.sel === 'set-aperte') {
            var f = fg[st.foglio]; if (!f) return;
            return prova({ titolo: f.titolo, pool: PC().poolAperte([f]), dueTempi: false, tipo: 'foglio', split: true,
                           ambito: '', angoliEt: f.angle ? SV().etAngolo(window.t, f.angle) : '', angolo: f.angle || '' });
        }
        if (st.sel === 'su-misura') {
            var c = PC().componi(poolAp, {
                ambito: (v['amb-ramo'] && op.rami) ? 'ramo' : 'tutto', ramo: v.ramo,
                angoli: v['ang-uno'] ? 'uno' : 'tutti', angolo: v.angolo
            });
            if (!c.pool.length) { toast(t('st_pool_vuoto', 'Con queste scelte non resta nessuna domanda.'), 'warning'); return; }
            var titolo = t('st_su_misura', 'Domande aperte su misura') + ' — ' + (v['amb-ramo'] && op.rami ? v.ramo : t('st_tutta', 'Tutta la mappa')) +
                ' · ' + (v['ang-uno'] ? SV().etAngolo(window.t, v.angolo) : t('st_tutti_angoli', 'Tutti gli angoli'));
            return prova({ titolo: titolo, pool: c.pool, dueTempi: c.dueTempi, tipo: 'su-misura', split: true,
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
        /* 0126 (Giacomo, 24/10): in SEMPLICE, di serie, la prova del LIVE dei telefoni — tutte le
           domande subito, niente scelta, osservazioni né autovalutazione (le spegne `cfg.semplice`
           nel core), i criteri solo da leggere, «Consegna» all'ultima. Il «su misura» è di Meta. */
        var semplice = modo() === 'semplice' && o.tipo !== 'su-misura';
        /* autovalutazione ACCESA per le aperte, in Meta: è l'unica misura di una risposta aperta */
        /* `osservazioni: false` (0126, gate del 26/10, Giacomo: «Elimina il campo delle osservazioni in fondo alla
           scheda della risposta»); il foglio le mostra ancora se una sessione vecchia le ha */
        var cfg = SC().normalizzaCfg({ minimo: 1, minimoAree: 1, perRamo: true, autovalutazione: !o.mc, semplice: semplice, osservazioni: false });
        var host = null, consegnato = false, ridisegna = null, api = null, verdetti = {}, conta = null, pieno = false;
        function svuotaConta() { if (conta) conta.innerHTML = ''; }
        function opzioniView() {
            return {
                pool: o.pool, cfg: cfg, stato: stato, t: window.t, verdetti: verdetti,
                /* 0126, gate del 26/10 (Giacomo): «Nella schermata delle domande da scegliere nascondi
                   il nome dell'angolo a cui appartengono le domande» (dal 6/9 c'era coi due tempi) */
                mostraAngolo: false, senzaAree: true,
                /* 0126, allargamento 4 (Giacomo, 26/10: «ridurre il carico cognitivo di fronte alla schermata
                   di scelta delle domande su misura, rendere più leggibili i testi»): una serie di tagli alla
                   volta col ramo in testa, i chip in un velo, il 🔊 su ogni domanda, niente «‹ Torna alle
                   domande» (la view li usa solo dove servono: le serie e il velo nella sessione per angoli) */
                aPagine: true, chipVelo: true, leggiDomande: true, senzaTorna: true,
                /* sotto la casella «Confermo» (Giacomo, 26/10), i criteri appaiono lo stesso */
                confermo: true,
                /* il 🔊 accanto alla domanda, alla risposta e a ogni criterio (Giacomo, 26/10) */
                leggiRisposta: true,
                /* la scelta «a schermo intero», poi con «Comincia a rispondere» «metà schermo mappa, metà
                   schermo domande»; si chiede al pannello solo quando il passo cambia, così il quiz a
                   schermo pieno resta com'è */
                onFase: function (f) {
                    var si = f === 'scegli' || f === 'aree';
                    if (si === pieno || !D || !D.pieno) return;
                    pieno = si; D.pieno(si);
                },
                /* le aperte coi criteri si autovalutano spuntandoli, DOPO la risposta (16/9); in
                   semplice si leggono e basta (0126: «solo da leggere, senza spunte») */
                criteri: o.mc ? false : (semplice ? 'leggi' : true),
                /* il contatore nella barra della × del pannello (0126), in tutte e due le modalità */
                contatore: conta,
                /* «Consegna» solo all'ultima domanda presa, anche in Meta (0126, Giacomo: «solo dopo
                   che sono arrivato all'ultima domanda selezionata») */
                consegnaAllaFine: true,
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
        /* Il pannello accanto alla mappa serve tutte le prove. Dal 0117 (Giacomo, 20/10: «all'avvio dell'esercizio la
           mappa è sempre aperta di default per tutti») ogni prova arriva con `split: true`, anche la scelta multipla
           che il gate (b) dello 0112 apriva con la mappa chiusa; la maniglia resta. Il modale qui sotto non si apre più. */
        var inDock = !!o.split || !!o.mc;
        if (inDock) {
            var D = window.MappAIStudenteDocumenti;
            host = D.apri({
                titolo: o.titolo,
                mappaChiusa: !o.split,
                contatore: true,
                monta: function (h, c) { h.style.padding = '0'; conta = c || null; api = SV().monta(h, opzioniView()); },
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
            svuotaConta();
            if (inDock) {
                if (!host) return;
                host.innerHTML = '<div class="sd-esito"><p>' + esc(testo) + '</p><button type="button" class="sd-esito__b">' + esc(t('mm_chiudi', 'Chiudi')) + '</button></div>';
                host.querySelector('.sd-esito__b').onclick = function () { window.MappAIStudenteDocumenti.chiudi(); };
            } else if (ridisegna) {
                ridisegna(Object.assign({}, schema, { sporco: false, suApertura: null, sezioni: [{ testo: testo }], azioni: [{ id: 'chiudi', etichetta: t('mm_chiudi', 'Chiudi'), ruolo: 'primario' }] }));
            }
        }
        /* la chiusura è quella del LIVE (0126; in Meta dal gate del 25/10, Giacomo: «dopo che ho consegnato
           appare una schermata troppo tecnica»): 🎉, «Hai finito!», «Risposte: n / N»
           e il 💾, che apre il foglio delle risposte appena scritto (Giacomo, 25/10: «Apre il
           foglio») per la strada di «Le tue prove › apri». La scrittura parte alla consegna, da
           sola: il 💾 la aspetta, non la comanda. */
        function prese(n) { return { scritte: n.scritte, totale: n.scelte || n.totale }; }
        function esitoLive(st, scrittura) {
            svuotaConta();
            if (!host) return;
            SV().mostraEsito(host, {
                /* «Risposte: scritte / prese»: in Semplice le prese sono tutte, in Meta quelle scelte dallo studente */
                t: window.t, cfg: Object.assign({}, cfg, { semplice: true }), profilo: { righe: [], conteggio: prese(SC().conteggio(o.pool, st)) },
                /* gate del 25/10 (Giacomo): «'Hai finito!' grande come il 70% della larghezza della vista» */
                titoloLargo: 0.7,
                onSalva: function () {
                    scrittura.then(function (r) {
                        if (!r || !r.ok) { toast(t('st_foglio_ko', 'Il foglio delle risposte non è stato scritto: ') + ((r && r.error) || ''), 'error'); return; }
                        /* il report porta nella barra «[progetto] · [genere] · [angolo] · Report allievo» (gate del 25/10);
                           le domande aperte anche loro, con «Meta» al posto dell'angolo nella prova su misura (26/10), e
                           si aprono col nome del file, che è quello che la stampa propone per il PDF */
                        var C = window.MappAIStudiaCore;
                        var ang = o.mc ? (o.angoliEt || '') : (o.tipo === 'su-misura' ? t('st_modo_meta', 'Meta') : (o.angoliEt || ''));
                        var tb = (C && C.titoloReport) ? C.titoloReport({ mappa: S().rootNodeLabel || '', tipo: o.mc ? 'mc' : 'aperte', angolo: ang, t: window.t }) : '';
                        window.MappAIStudenteDocumenti.apriFile(S().activeVaultPath, r.rel + '/' + (o.mc ? 'report.html' : 'risposte.html'), r.nomeFile || r.rel.split('/').pop(), { titoloBarra: tb });
                    });
                }
            });
        }
        function consegna(st) {
            if (consegnato) return;
            consegnato = true;
            var voci = PC().voci(o.pool, st, S().db.nodes);
            registra(o, voci);
            if (inDock) {
                var scrittura = o.mc
                    ? scriviReport(PC().reportMCDaStato(o.pool, st, { mappa: S().rootNodeLabel || '', titolo: o.titolo, data: PC().fmtData(new Date()), chi: t('st_io', 'Io') }), o.titolo, o.angoliEt, o.angolo)
                    : scriviSessione(o, st);
                esitoLive(st, scrittura);
                scrittura.then(function (r) {
                    toast(r.ok ? (o.mc ? t('st_report_ok', 'Report della prova salvato in «Le tue prove»') : t('st_foglio_ok_toast', 'Foglio delle risposte salvato'))
                        : (o.mc ? t('st_report_ko', 'Report non salvato: ') : t('st_foglio_ko', 'Il foglio delle risposte non è stato scritto: ')) + (r.error || ''), r.ok ? 'success' : 'error');
                });
                return;
            }
            if (o.mc) {
                var rep = PC().reportMCDaStato(o.pool, st, { mappa: S().rootNodeLabel || '', titolo: o.titolo, data: PC().fmtData(new Date()), chi: t('st_io', 'Io') });
                fine(t('st_mc_esito', 'Risposte giuste: {g} su {n}.').replace('{g}', rep.giuste).replace('{n}', rep.totale) + ' ' + t('st_scrivo', 'Scrivo il report…'));
                scriviReport(rep, o.titolo, o.angoliEt, o.angolo).then(function (r) {
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
        var etA = function (a) { return a ? SV().etAngolo(window.t, a) : ''; };
        var righe = PC().foglioCompilato(o.pool, st, PC().CHIP_PERCHE, etA);
        /* 0126, allargamento 3: le domande lasciate col loro «Perché:» e le osservazioni dell'allievo */
        var scartate = PC().scartate(o.pool, st, PC().CHIP_PERCHE, etA), note = String((st && st.note) || '').trim();
        var data = new Date();
        /* 0126, gate del 26/10 (Giacomo): in testa le domande disponibili e quanti «la so», «non la so», «non ho capito»
           (solo con i chip, cioè nella prova su misura per angoli); nella barra «Meta» al posto dell'angolo; il file come
           i fogli delle domande, «Domande-aperte-<mappa>-<angolo>-GG-MM-AAAA», con «meta» nella prova su misura */
        var giudizi = o.dueTempi ? PC().giudizi(o.pool, st, PC().CHIP_PERCHE) : null;
        var etAng = o.tipo === 'su-misura' ? t('st_modo_meta', 'Meta') : (o.angoliEt || '');
        var nomeFile = window.MappAIStudiaCore.nomeDocumento({ progetto: s.rootNodeLabel || '', tipo: 'Domande aperte', angolo: o.tipo === 'su-misura' ? 'meta' : (o.angolo || ''), data: data });
        var meta = { tipo: 'Domande aperte', titolo: o.titolo, mappa: s.rootNodeLabel || '', data: data.toISOString(), ambito: o.ambito || '', angoli: o.angoliEt || '', dueTempi: !!o.dueTempi };
        var cart = null;
        return cartellaSessione(o).then(function (c) {
            cart = c;
            var sessione = Object.assign({ nome: c.nome, html: 'risposte.html', pdf: 'risposte.pdf', ids: o.pool.map(function (v) { return v.id; }), stato: st, righe: righe, scartate: scartate, note: note,
                angolo: etAng, nomeFile: nomeFile, giudizi: giudizi }, meta);
            return scrivi(c.rel + '/sessione.json', { text: JSON.stringify(sessione, null, 2) });
        }).then(function () {
            var html = QP.buildOpenQuestionsHtml({ id: 'prova', title: o.titolo, type: 'Domande aperte', items: PC().itemsHtml(righe) },
                { mapName: s.rootNodeLabel || '', includeBar: false, includeAnswers: false, now: PC().fmtData(data) });
            html = PC().conTesta(html, PC().testaHtml(giudizi));
            return scrivi(cart.rel + '/risposte.html', { text: PC().conCoda(html, PC().codaHtml({ scartate: scartate, note: note })) });
        }).then(function () {
            return window.MappAIStudentePdf.risposte({ titolo: o.titolo, mappa: s.rootNodeLabel || '', data: PC().fmtData(data), ambito: meta.ambito, angoli: meta.angoli, righe: righe, scartate: scartate, note: note, giudizi: giudizi })
                .then(function (b64) { return scrivi(cart.rel + '/risposte.pdf', { base64: b64 }); });
        }).then(function () { return { ok: true, rel: cart.rel, nomeFile: nomeFile }; })
          .catch(function (e) { console.warn('[autotest] sessione', e); return { ok: false, error: e && e.message }; });
    }
    /* Il set a scelta multipla gira nel player di MappAI: alla fine (`showStudySummary`)
       si archivia il REPORT come dopo l'attività QR — l'HTML `lr-*` di
       `buildStudentsReportHtml`, con `results.json` e `sessione.json` accanto. */
    /* `angolo` (0126): l'etichetta dell'angolo del set, perché «Le tue prove › apri» ridia lo stesso titolo nella barra */
    /* `chiave` (0126, allargamento 6): la chiave dell'angolo, per il nome «Progetto-Scelta multipla-angolo-data» */
    function scriviReport(rep, titolo, angolo, chiave) {
        var s = S(), R = window.MappAILiveReports;
        if (!s || !s.activeVaultPath || !R) return Promise.resolve({ ok: false, error: 'nessun vault' });
        var data = new Date(), cart = null;
        var nomeFile = window.MappAIStudiaCore.nomeDocumento({ progetto: s.rootNodeLabel || '', tipo: 'Scelta multipla', angolo: chiave || '', data: data });
        return cartellaSessione({ tipo: 'quiz', ambito: '' }).then(function (c) {
            cart = c;
            return scrivi(c.rel + '/sessione.json', { text: JSON.stringify({ nome: c.nome, tipo: 'Scelta multipla', titolo: titolo, angolo: angolo || '', mappa: s.rootNodeLabel || '', data: data.toISOString(), html: 'report.html', giuste: rep.giuste, totale: rep.totale, pct: rep.pct, nomeFile: nomeFile }, null, 2) });
        }).then(function () {
            return scrivi(cart.rel + '/results.json', { text: JSON.stringify(rep.results, null, 2) });
        }).then(function () {
            return scrivi(cart.rel + '/report.html', { text: R.buildStudentsReportHtml(rep.meta, rep.results) });
        }).then(function () { return { ok: true, rel: cart.rel, nomeFile: nomeFile }; })
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

    /* il launcher di MappAI (mappai-active-study.js, copia) resta definito ma qui non si
       apre: dal 0117 nessun bottone lo chiama, e se qualcuno lo chiamasse si torna alla
       console del progetto, dove le prove si scelgono */
    function installa() {
        if (!window.ActiveStudy) window.ActiveStudy = {};
        window.ActiveStudy.openLauncher = function () { if (window.MappAIStudente) window.MappAIStudente.torna(); };
        agganciaPlayer();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installa); else installa();
    installa();

    window.MappAIStudenteAutotest = { leggiProve: leggiProve, avviaDa: avviaDa, fogli: fogli, prova: prova, avvia: avvia, scriviReportMC: scriviReportMC };
}());
