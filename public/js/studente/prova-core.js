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
        (typeof require === 'function') ? require('../mappai-scelta-core.js') : null,
        (typeof require === 'function') ? require('../mappai-files-core.js') : null);
    else root.MappAIProvaCore = factory(root.MappAIScelta, root.MappAIFilesCore);
}(typeof self !== 'undefined' ? self : this, function (SC0, FC0) {
    'use strict';
    function SC() { return SC0 || (typeof window !== 'undefined' ? window.MappAIScelta : null); }
    function _s(x) { return String(x == null ? '' : x); }
    function _chiave(x) { try { return _s(x).normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim(); } catch (e) { return _s(x).toLowerCase().trim(); } }

    /* i tre chip «Perché:» della sessione metacognitica — testo scuro su fondo chiaro.
       0126, gate del 26/10 (Giacomo): «'la so', 'non la so' e 'non ho capito'»; le chiavi
       restano, così gli stati già salvati si leggono ancora. Poi: «per il 'la so' usa il verde
       dei bottoni di MappAI» — il token, cornice e sfondo del colore pieno, il testo nel verde
       leggibile della stessa famiglia (il verde pieno sul bianco fa 1,6:1); «arancione='non la so'»
       — l'arancio acceso del foglio dei nodi, col testo nel suo arancio leggibile (il pieno fa
       2,8:1); «viola='non ho capito'», il colore dei bottoni — l'accento, leggibile anche come
       testo (6,3:1) */
    var CHIP_PERCHE = [
        { k: 'capito', et: 'la so', colore: 'var(--man-verde, #41e6aa)', testo: 'var(--mm-ok, #059669)' },
        { k: 'nonso', et: 'non la so', colore: 'var(--mm-genere-foglio, #f97316)', testo: 'var(--mm-genere-foglio-testo, #c2410c)' },
        { k: 'noncapita', et: 'non ho capito', colore: 'var(--mm-accent, #4f46e5)' }
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
            /* `auto` non è un taglio: un foglio misto vecchio (senza l'angolo per
               domanda) non offre la scelta degli angoli (16/9) */
            if (v.angle && v.angle !== 'auto' && !va[v.angle]) { va[v.angle] = 1; angoli.push(v.angle); }
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
        /* prima le domande d'avvio, poi quelle di ponte (16/9); sort stabile */
        p = p.map(function (v, i) { return [v, i]; })
            .sort(function (a, b) { return ((a[0].livello === 'base') ? 0 : 1) - ((b[0].livello === 'base') ? 0 : 1) || a[1] - b[1]; })
            .map(function (x) { return x[0]; });
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
            /* aperte coi CRITERI (16/9): spuntati/totali, spuntati dopo la risposta */
            else if (SC().punteggioCriteri(v, r) != null) score = SC().punteggioCriteri(v, r);
            /* fogli senza criteri: l'AUTOVALUTAZIONE a tre livelli (3 sicuro · 2 così così ·
               1 a caso → 1 · 0,5 · 0), come in mappai-scelta.js; senza, resta null */
            else if (r.auto === 3) score = 1;
            else if (r.auto === 2) score = 0.5;
            else if (r.auto === 1) score = 0;
            out.push({ nodeId: nodoDelRamo(nodes, v.ramo), label: v.ramo || '', score: score, chip: (stato.letture && stato.letture[v.id] || {}).chip || '' });
        });
        return out;
    }

    /* ── LA SESSIONE SU DISCO ──────────────────────────────────────────────
       Il nome viene da FilesCore (un compositore di nomi solo, inv. 6):
       «2026-09-06 · Domande · Elettricità — Atmosfera · 00». `esistenti` = le
       cartelle già in Studio Attivo/Prove, per il progressivo. */
    function FC() { return FC0 || (typeof window !== 'undefined' ? window.MappAIFilesCore : null); }
    function nomeSessione(o, esistenti) {
        var F = FC();
        var base = F.sessionFolderName({ date: o.data, activity: o.tipo || 'domande', map: o.mappa, scope: o.ambito || '' });
        var seq = F.sessionSeq(esistenti || [], base, ' · ');
        return base + ' · ' + seq.next;
    }
    function fmtData(d) {
        var x = d ? new Date(d) : new Date(); if (isNaN(x.getTime())) x = new Date();
        var p = function (n) { return String(n).padStart(2, '0'); };
        return p(x.getDate()) + '/' + p(x.getMonth() + 1) + '/' + x.getFullYear();
    }
    /* Il foglio COMPILATO: le domande PRESE (con la risposta scritta o vuota) e,
       se non ne è stata presa nessuna, tutte. Ogni riga porta ramo, angolo, il
       chip «Perché:» e la risposta: è la stessa lista per il PDF (jsPDF) e per
       l'HTML (`buildOpenQuestionsHtml` con `item.risposta`). */
    function foglioCompilato(pool, stato, chips, etAngolo) {
        var R = (stato && stato.risposte) || {}, L = (stato && stato.letture) || {};
        var prese = (pool || []).filter(function (v) { return v.id in R; });
        var lista = prese.length ? prese : (pool || []);
        var etChip = function (k) { var c = (chips || []).filter(function (x) { return x.k === k; })[0]; return c ? c.et : k; };
        return lista.map(function (v) {
            var r = R[v.id] || {}, l = L[v.id] || {};
            return {
                ramo: v.ramo || '', angolo: etAngolo ? etAngolo(v.angle) : (v.angle || ''),
                domanda: v.testo, perche: l.chip ? etChip(l.chip) : '', risposta: _s(r.testo).trim(), id: v.id
            };
        });
    }
    /* Le domande SCARTATE (0126, Giacomo: «anche le domande scartare per i motivi 'non la so'
       e 'non ho capito la domanda'»): lette col «Perché:» e non prese, nell'ordine del pool.
       Stessa forma delle righe del foglio compilato, senza la risposta. */
    function scartate(pool, stato, chips, etAngolo) {
        var R = (stato && stato.risposte) || {}, L = (stato && stato.letture) || {};
        var etChip = function (k) { var c = (chips || []).filter(function (x) { return x.k === k; })[0]; return c ? c.et : k; };
        var chipDi = function (k) { return (chips || []).filter(function (x) { return x.k === k; })[0] || {}; };
        return (pool || []).filter(function (v) { return !(v.id in R) && L[v.id] && L[v.id].chip; }).map(function (v) {
            var c = chipDi(L[v.id].chip);
            /* il colore del chip viaggia con la riga: il foglio lo disegna come lo studente l'ha visto (0126) */
            return { ramo: v.ramo || '', angolo: etAngolo ? etAngolo(v.angle) : (v.angle || ''), domanda: v.testo, perche: etChip(L[v.id].chip), colore: c.colore || '', testo: c.testo || '', id: v.id };
        });
    }
    /* il riepilogo dei giudizi (0126, Giacomo: «il numero di domande totali disponibili e la quantità di tag 'La so',
       'Non la so' e 'Non ho capito' selezionati»): le domande del pool e quante ne ha ogni chip */
    function giudizi(pool, stato, chips) {
        var L = (stato && stato.letture) || {};
        return {
            totale: (pool || []).length,
            voci: (chips || []).map(function (c) {
                var n = (pool || []).filter(function (v) { return L[v.id] && L[v.id].chip === c.k; }).length;
                return { k: c.k, et: c.et, colore: c.colore || '', testo: c.testo || '', n: n };
            })
        };
    }
    function _esc(x) { return _s(x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
    /* il chip come lo studente l'ha visto: cornice e testo del suo colore, sfondo al 15% */
    function chipHtml(testo, colore, testoColore) {
        var c = colore || '#475569';
        return '<span class="oq-chip" style="display:inline-block; border:2px solid ' + c + '; color:' + (testoColore || c) +
            '; background:color-mix(in srgb, ' + c + ' 15%, white); border-radius:999px; padding:3px 12px; font-size:13px; font-weight:700;">' + _esc(testo) + '</span>';
    }
    /* la coda del foglio HTML: «Domande scartate» e «Osservazioni», con le classi e i colori
       di `buildOpenQuestionsHtml` (che resta com'è); vuota se non c'è niente da dire */
    function codaHtml(o) {
        o = o || {};
        var sc = o.scartate || [], note = _s(o.note).trim(), out = '';
        if (sc.length) out += '<h2 class="oq-section-title" style="margin-top:28px">Domande scartate</h2>' + sc.map(function (r) {
            var kicker = [r.ramo, r.angolo].filter(Boolean).map(_esc).join(' · ');
            return '<section class="oq-scartata" style="background:white; border-radius:12px; padding:14px 22px; margin-bottom:12px; border-left:4px solid #94a3b8; page-break-inside:avoid;">' +
                (kicker ? '<div style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:#475569; margin-bottom:6px;">' + kicker + '</div>' : '') +
                '<h3 style="font-size:13pt; font-weight:bold; margin:0 0 8px; color:#1e293b; line-height:1.55;">' + _esc(r.domanda) + '</h3>' +
                chipHtml(r.perche, r.colore, r.testo) + '</section>';
        }).join('');
        /* l'interlinea è quella delle risposte dei report (0132, D1: MappAIDocHead.REPORT.rispostaInterlinea; una prova
           controlla che dicano lo stesso numero) */
        if (note) out += '<h2 class="oq-section-title" style="margin-top:28px">Osservazioni</h2>' +
            '<div class="oq-osservazioni" style="white-space:pre-wrap; background:white; border-radius:12px; padding:14px 22px; border-left:4px solid #0f766e; font-size:13px; line-height:2; color:#1e293b;">' + _esc(note) + '</div>';
        return out;
    }
    /* in cima al foglio, sotto la testata: le domande disponibili e i chip coi loro conteggi */
    function testaHtml(g) {
        if (!g || !g.voci || !g.voci.length) return '';
        return '<section class="oq-giudizi" style="display:flex; flex-wrap:wrap; align-items:center; gap:10px; margin:0 0 20px;">' +
            '<b style="font-size:14px; color:#1e293b; margin-right:4px;">' + g.totale + ' domande disponibili</b>' +
            g.voci.map(function (v) { return chipHtml(v.et + ': ' + v.n, v.colore, v.testo); }).join('') + '</section>';
    }
    function conTesta(html, testa) {
        if (!testa) return html;
        var m = /<main[^>]*>/.exec(html);
        return m ? html.slice(0, m.index + m[0].length) + testa + html.slice(m.index + m[0].length) : html;
    }
    /* la coda entra prima della chiusura di <main> (il foglio ne ha uno solo); senza, in fondo al body */
    function conCoda(html, coda) {
        if (!coda) return html;
        var i = html.indexOf('</main>');
        if (i < 0) i = html.lastIndexOf('</body>');
        return i < 0 ? html + coda : html.slice(0, i) + coda + html.slice(i);
    }
    /* gli item per `buildOpenQuestionsHtml`: `risposta` al posto delle righe,
       il «Perché:» in testa alla risposta (il foglio non ha un campo suo) */
    function itemsHtml(righe) {
        return (righe || []).map(function (r) {
            /* niente «Perché: la so» sopra la risposta (Giacomo, 26/10): le prese sono tutte «la so» */
            return { question: r.domanda, areas: r.ramo ? [r.ramo] : [], l1: r.ramo, lines: 4, risposta: r.risposta || '' };
        });
    }
    /* il report di un set a scelta multipla dal player di MappAI: `items` =
       activeStudySessionItems, `res` = studyResults {correct, total, mistakes[{q, userAnswer, correctAnswer, explanation}]}
       → i due argomenti di `MappAILiveReports.buildStudentsReportHtml` */
    function reportMC(items, res, meta) {
        var errori = {};
        ((res && res.mistakes) || []).forEach(function (m) { errori[_s(m.q)] = m; });
        var lista = (items || []).map(function (it) {
            var m = errori[_s(it.q)];
            return { outcome: m ? 'wrong' : 'right', text: it.q, yourText: m ? m.userAnswer : it.correct, correctText: it.correct, explanation: it.explanation || '' };
        });
        var giuste = lista.filter(function (x) { return x.outcome === 'right'; }).length;
        var pct = lista.length ? Math.round(100 * giuste / lista.length) : 0;
        return {
            meta: { mapTitle: meta.mappa || '', activity: meta.titolo || 'Quiz', className: meta.classe || '', dateStr: meta.data || '', durationStr: meta.durata || '' },
            results: { joined: 1, questionCount: lista.length, perStudent: [{ displayName: meta.chi || 'Io', emoji: '', num: '', answered: lista.length, blankCount: 0, manualCount: 0, accuracyPct: pct, items: lista, strengths: [], weaknesses: [] }] },
            giuste: giuste, totale: lista.length, pct: pct
        };
    }

    /* ── LO SPLIT ──────────────────────────────────────────────────────────
       iPad in piedi (portrait) → split ORIZZONTALE: mappa sopra, prova sotto;
       sdraiato (landscape) → VERTICALE: mappa a sinistra, prova a destra. */
    function orientamento(w, h) { return (Number(h) > Number(w)) ? 'portrait' : 'landscape'; }
    /* la misura del dock lungo il suo asse: fra `min` e la quota massima dell'asse */
    function clampSplit(px, asse, min, quotaMax) {
        var max = Math.max(min, Math.floor(Number(asse) * (quotaMax || 0.7)));
        var v = Number(px); if (!isFinite(v)) v = min;
        return Math.max(min, Math.min(max, Math.round(v)));
    }
    /* un set a scelta multipla come «foglio» per poolDaFogli (il core sa già
       leggere `options`/`correct` dei set veri) */
    function foglioDaSet(set) {
        if (!set || !Array.isArray(set.items) || !set.items.length) return null;
        return { titolo: set.title || 'Quiz', angle: set.angle || '', tipo: 'mc', items: set.items };
    }
    /* il verdetto di una risposta a scelta multipla, nella forma che la view mostra */
    function verdetto(v, r) {
        var ok = SC().corretta(v, r);
        if (ok == null) return null;
        return { esito: ok ? 'right' : 'wrong', giusta: (v.opzioni || [])[v.giusta] || '', spiegazione: v.spiegazione || '' };
    }
    /* il report MC dallo STATO della view (la prova in split non passa dal player) */
    function reportMCDaStato(pool, stato, meta) {
        var R = (stato && stato.risposte) || {};
        var lista = (pool || []).filter(function (v) { return v.tipo === 'mc'; }).map(function (v) {
            var r = R[v.id] || {};
            var data = r.scelta != null && r.scelta !== '';
            var giusta = data && v.giusta >= 0 && r.scelta === v.giusta;
            return { outcome: !data ? 'blank' : (giusta ? 'right' : 'wrong'), text: v.testo,
                     yourText: data ? (v.opzioni || [])[r.scelta] : '', correctText: (v.opzioni || [])[v.giusta] || '', explanation: v.spiegazione || '' };
        });
        var giuste = lista.filter(function (x) { return x.outcome === 'right'; }).length;
        var date = lista.filter(function (x) { return x.outcome !== 'blank'; }).length;
        var pct = lista.length ? Math.round(100 * giuste / lista.length) : 0;
        return {
            meta: { mapTitle: meta.mappa || '', activity: meta.titolo || 'Quiz', className: meta.classe || '', dateStr: meta.data || '', durationStr: meta.durata || '' },
            results: { joined: 1, questionCount: lista.length, perStudent: [{ displayName: meta.chi || 'Io', emoji: '', num: '', answered: date, blankCount: lista.length - date, manualCount: 0, accuracyPct: pct, items: lista, strengths: [], weaknesses: [] }] },
            giuste: giuste, totale: lista.length, pct: pct
        };
    }

    return { CHIP_PERCHE: CHIP_PERCHE, nomeSessione: nomeSessione, orientamento: orientamento, clampSplit: clampSplit, foglioDaSet: foglioDaSet, verdetto: verdetto, reportMCDaStato: reportMCDaStato, fmtData: fmtData, foglioCompilato: foglioCompilato, scartate: scartate, giudizi: giudizi, codaHtml: codaHtml, conCoda: conCoda, testaHtml: testaHtml, conTesta: conTesta, itemsHtml: itemsHtml, reportMC: reportMC, setMC: setMC, foglioDaHtml: foglioDaHtml, poolAperte: poolAperte, opzioni: opzioni, componi: componi, statoIniziale: statoIniziale, nodoDelRamo: nodoDelRamo, voci: voci };
}));
