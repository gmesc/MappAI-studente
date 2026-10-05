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
    /* `FilesCore` arriva da fuori: è la copia di MappAI re (RIUSO regola 1) e porta la
       regola UNICA su che cosa di un vault è dello studente (`relVaultStudente`). */
    if (typeof module === 'object' && module.exports) module.exports = factory(require('../mappai-files-core.js'));
    else root.MappAIStudiaCore = factory(root.MappAIFilesCore);
}(typeof self !== 'undefined' ? self : this, function (FC) {
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

    /* il GENERE di un materiale dal nome del file (la tabella GENERI di MappAI vive in
       mappai-pipeline-core: qui basta il nome) e i GRUPPI in cui la console li impila,
       nell'ordine in cui uno studente li cerca */
    var GENERI = [
        [/^Sintesi-voce/i, 'Sintesi con voce', 'volume-2'], [/^Sintesi-audio/i, 'Sintesi con voce', 'volume-2'], [/^Sintesi/i, 'Sintesi', 'sparkles'],
        [/^Quiz-MC/i, 'Quiz a scelta multipla', 'list-checks'], [/^Quiz-VF/i, 'Quiz vero o falso', 'check-check'],
        [/^Domande.?aperte/i, 'Domande aperte', 'pen-line'], [/^Flashcard/i, 'Flashcard', 'copy'],
        [/^Foglio.?nodi/i, 'Foglio dei nodi', 'scissors'], [/^Focus/i, 'Focus', 'crosshair'],
        [/^Studio/i, 'Vista studio', 'layout-grid'], [/^(MM|KG)-/i, 'Mappa', 'map'],
        [/^Catena/i, 'Catena dei perché', 'git-branch'], [/^Dossier/i, 'Dossier', 'book-open'], [/^Analisi/i, 'Analisi della fonte', 'image']
    ];
    function genere(nome) {
        for (var i = 0; i < GENERI.length; i++) if (GENERI[i][0].test(_s(nome))) return { et: GENERI[i][1], icona: GENERI[i][2] };
        return null;
    }
    var SCHEDA = 'Scheda didattica';
    var GRUPPI = [
        /* la fonte da cui tutto viene: sta in `Allegati/` ed è l'UNICO PDF che il
           docente manda allo studente (7/9). Prima nell'elenco perché è il documento
           che la lezione ha in mano. */
        /* «La fonte» (Giacomo, 4/10): era «La scheda del docente», ma da quando un dossier
           ha la sua «Scheda» (l'analisi) il nome confondeva — in `Allegati/` c'è la fonte:
           il PDF di partenza o la foto */
        { id: 'scheda', chiave: 'st_g_fonte', testo: 'La fonte', tipi: [SCHEDA] },
        { id: 'sintesi', chiave: 'st_g_sintesi', testo: 'Sintesi', tipi: ['Sintesi', 'Sintesi con voce'] },
        { id: 'mappa', chiave: 'st_g_mappa', testo: 'La mappa stampata', tipi: ['Mappa', 'Vista studio', 'Focus'] },
        { id: 'flashcard', chiave: 'st_g_flashcard', testo: 'Flashcard', tipi: ['Flashcard'] },
        { id: 'quiz', chiave: 'st_g_quiz', testo: 'Quiz', tipi: ['Quiz a scelta multipla', 'Quiz vero o falso'] },
        { id: 'aperte', chiave: 'st_g_aperte', testo: 'Domande aperte', tipi: ['Domande aperte'] },
        { id: 'fogli', chiave: 'st_g_fogli', testo: 'Fogli dei nodi', tipi: ['Foglio dei nodi'] },
        { id: 'catena', chiave: 'st_g_catena', testo: 'Catena dei perché', tipi: ['Catena dei perché'] },
        { id: 'altri', chiave: 'st_g_altri', testo: 'Altri materiali', tipi: null }
    ];
    function formato(nome) { var m = /\.([a-z0-9]+)$/i.exec(_s(nome)); return m ? m[1].toUpperCase() : ''; }
    /* i file che lo studente vede: quelli dell'ELENCO CHIUSO che viaggia dal docente
       (`relVaultStudente`, 16/9 — la stessa regola dello scambio), meno i .json
       interni (i set si giocano, non si aprono) */
    function inAllegati(f) { return /^Allegati\//.test(_s(f && f.relPath)); }
    function daMostrare(f) {
        if (!f || !f.name || /\.json$/i.test(f.name)) return false;
        return !!(FC && FC.relVaultStudente && FC.relVaultStudente(f.relPath));
    }
    /* la sintesi del vault: con la voce se c'è, altrimenti quella scritta */
    function trovaSintesi(files) {
        var l = (files || []).filter(daMostrare);
        var q = function (re) { return l.filter(function (f) { return re.test(f.name) && /\.html?$/i.test(f.name); })[0] || null; };
        return q(/^Sintesi-voce/i) || q(/^Sintesi/i);
    }
    /* le tabelle dei materiali, una per gruppo, solo i gruppi che hanno righe; la riga
       CONCLUDE (`mat:<relPath>`): la console si chiude e il file si apre accanto alla mappa */
    function tabelleMateriali(files, t) {
        var noti = {};
        GRUPPI.forEach(function (g) { (g.tipi || []).forEach(function (x) { noti[x] = 1; }); });
        var lista = (files || []).filter(daMostrare)
            .map(function (f) {
                if (inAllegati(f)) return { name: f.name, relPath: f.relPath, tipo: SCHEDA, icona: 'book-open' };
                var g = genere(f.name);
                return { name: f.name, relPath: f.relPath, tipo: g ? g.et : '', icona: g ? g.icona : 'file' };
            });
        return GRUPPI.map(function (g) {
            var righe = lista.filter(function (m) { return g.tipi ? g.tipi.indexOf(m.tipo) >= 0 : !noti[m.tipo]; });
            if (!righe.length) return null;
            return {
                id: 'mat-' + g.id, titolo: t(g.chiave, g.testo), collassabile: true,
                colonne: [{ etichetta: t('st_col_doc', 'Documento') }, { etichetta: t('st_col_formato', 'Formato'), larghezza: '90px' }],
                righe: righe.map(function (m) { return { id: 'mat:' + m.relPath, icona: m.icona, celle: [m.name, formato(m.name)] }; })
            };
        }).filter(Boolean);
    }

    /* LA SCHEDA DI UN DOSSIER, DAI SUOI NODI (4/10) — l'inverso di `nodiDaScheda` di
       mappai-visione-core. Un dossier da foto (0067) È la sua scheda: radice `fonte_0` =
       il titolo, un ramo `fonte_<blocco>` per blocco pieno, e nel ramo una riga
       «Etichetta: valore» per campo (`testoBlocco`). La scheda vera sta in
       `pipeline.json`, che allo studente non arriva (`relVaultStudente`): qui la si
       ricompone dai nodi, che arrivano. `blocchi` = `MappAIVisioneCore.BLOCCHI` (la
       griglia, una fonte sola). Una riga senza etichetta nota (il docente ha scritto
       a mano) si accoda al campo di prima; un ramo senza nessuna etichetta va intero
       nel primo campo. Null se non è un dossier o se non ha blocchi pieni. */
    function schedaDaNodi(nodes, blocchi) {
        var l = Array.isArray(nodes) ? nodes.filter(Boolean) : [];
        var nodo = function (id) { return l.filter(function (n) { return n.id === id; })[0] || null; };
        var radice = nodo('fonte_0');
        if (!radice || !Array.isArray(blocchi)) return null;
        var sch = { titolo: _s(radice.label).trim() }, pieni = 0;
        blocchi.forEach(function (bl) {
            var n = nodo('fonte_' + bl.id), testo = n ? _s(n.desc || n.content).trim() : '';
            if (!testo) return;
            var campi = {}, ultimo = null;
            testo.split('\n').forEach(function (riga) {
                riga = riga.trim();
                if (!riga) return;
                var c = (bl.campi || []).filter(function (x) { return riga.indexOf(x.et + ':') === 0; })[0];
                if (c) { campi[c.id] = riga.slice(c.et.length + 1).trim(); ultimo = c.id; }
                else if (ultimo) campi[ultimo] += ' ' + riga;
            });
            if (!ultimo && bl.campi && bl.campi.length) campi[bl.campi[0].id] = testo;
            sch[bl.id] = campi; pieni++;
        });
        return pieni ? sch : null;
    }

    /* LA SCHEDA COME TESTO DELLA SINTESI (5/10) — Giacomo: la pagina della scheda con la
       stessa barra e gli stessi stili della sintesi. La scheda si scrive nel markdown che
       il costruttore della sintesi legge (`_mdToHtml` di mappai-branch-synthesis): `##` →
       titolo del blocco (h3), un paragrafo «**Etichetta:** valore» per campo — il lettore
       e il karaoke li trovano come in una sintesi. I blocchi che INTERPRETANO lo dicono nel
       titolo, come il bollino del documento del docente (mappai-visione-core: il modello
       descrive bene e contestualizza male). Nei valori `*` e `[n]` si neutralizzano: per
       quel markdown sarebbero corsivo e richiamo di nota. */
    function markdownDaScheda(sch, blocchi) {
        if (!sch || !Array.isArray(blocchi)) return '';
        var pulito = function (v) { return _s(v).replace(/\s+/g, ' ').trim().replace(/\*/g, '\u2217').replace(/\[(\d+)\]/g, '($1)'); };
        var out = [];
        blocchi.forEach(function (bl) {
            var campi = sch[bl.id] || {};
            var righe = (bl.campi || []).filter(function (c) { return pulito(campi[c.id]); })
                .map(function (c) { return '**' + c.et + ':** ' + pulito(campi[c.id]); });
            if (!righe.length) return;
            out.push('## ' + bl.titolo + (bl.interpretativo ? ' (interpretazione)' : ''));
            out.push(righe.join('\n\n'));
        });
        return out.join('\n\n');
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
                    id: 'v:' + v.fullPath, etichetta: v.rootNodeLabel || v.folderName, icona: v.dossier ? 'image' : 'map',
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
            /* sull'iPad non c'è un selettore di cartelle: le mappe si mettono in File
               (Documenti dell'app); nel browser il bottone apre <input webkitdirectory> */
            azioni: o.ipad ? [] : [
                { id: 'apri-cartella', etichetta: t('st_apri_cartella', 'Apri una cartella'), icona: 'folder-open', chiude: false }
            ]
        };
        /* senza una mappa scelta, al centro della console un solo grande «Ricevi dal
           docente» (Giacomo, 17/9): è il primo gesto dell'allievo, e in fondo non si vedeva */
        if (!prog && o.scambio !== false) {
            s.bento = [{
                id: 'ricevi', nuda: true, span: 4, altezza: 300,
                stile: { bg: 'transparent', testo: '#404040', bordoPx: 0 },
                bottoni: { bg: '#f1f4f8', testo: '#404040', hoverBg: '#41e6aa', hoverTesto: '#0b0b0b' },
                layout: { colonneVoci: 1 },
                voci: [{ id: 'docente', et: t('st_ricevi', 'Ricevi dal docente'), forma: 'azione', icona: 'qr-code', chiude: false, aiuto: t('st_tip_ricevi', 'Inquadra il QR del docente: la mappa arriva qui.') }]
            }];
        }
        if (o.ipad) s.nota = t('st_nota_ipad', 'I progetti ricevuti dal docente si salvano automaticamente in File › Sul mio iPad › MappAI Studente. Appariranno nell\'app senza che tu debba fare nulla.');
        if (prog) {
            /* l'area a BENTO, identica a quella di una mappa in INSEGNA (`_consBentoMappa`
               di mappai-landing-teach.js): il riquadro dei comandi con gli stessi colori e
               la stessa forma `azione` (icona a riposo, etichetta al passaggio), e sotto il
               riquadro dei materiali che disegna `s.tabelle`. I tre comandi CONCLUDONO: la
               console si chiude e l'esito arriva al .then() (inv. 10). */
            /* un DOSSIER da foto (`dossier: true` in index.yaml) non ha una mappa da
               guardare: è una scheda (Giacomo, 4/10: «solo la scheda, senza mappa»).
               Stesso posto, stesso esito che conclude; lo apre documenti.js › apriScheda. */
            var az = [
                prog.dossier
                    ? { id: 'scheda', et: t('st_scheda', 'Scheda'), forma: 'azione', icona: 'image', aiuto: t('st_tip_scheda', 'La foto e la sua scheda di analisi.') }
                    : { id: 'mappa', et: t('st_mappa', 'Mappa'), forma: 'azione', icona: 'git-merge', aiuto: t('st_tip_mappa', 'Apre la mappa.') },
                { id: 'flashcard', et: t('st_flashcard', 'Flashcard'), forma: 'azione', icona: 'copy', aiuto: t('st_tip_flashcard', 'Le carte: leggi, pensa, gira.') },
                { id: 'prova', et: t('st_prova', 'Prova'), forma: 'azione', icona: 'help-circle', aiuto: t('st_tip_prova', 'Un quiz o un foglio di domande aperte.') },
                /* «Sintesi» (7/9): il documento che si legge per primo aveva una sola
                   strada — l'elenco dei materiali — e lì era una riga fra venti. */
                { id: 'sintesi', et: t('st_sintesi', 'Sintesi'), forma: 'azione', icona: 'file-text', aiuto: t('st_tip_sintesi', 'Il riassunto della mappa, da leggere o da ascoltare.') }
            ];
            /* «Docente» (scambio, 7/9): NON conclude — apre il modale dello scambio sopra la
               console (inv. 10/11). Via col kill-switch `mappai_studente_scambio`. */
            if (o.scambio !== false) az.push({ id: 'docente', et: t('st_docente', 'Docente'), forma: 'azione', icona: 'qr-code', chiude: false, aiuto: t('st_tip_docente', 'Ricevi la mappa dal docente, consegna le tue prove.') });
            var tabMat = tabelleMateriali(o.materiali, t);
            s.bento = [
                {
                    id: 'mappa-azioni', nuda: true, span: 4, altezza: 145,
                    stile: { bg: 'transparent', testo: '#404040', bordoPx: 0 },
                    bottoni: { bg: '#f1f4f8', testo: '#404040', hoverBg: '#41e6aa', hoverTesto: '#0b0b0b' },
                    layout: { colonneVoci: az.length },
                    voci: az
                },
                {
                    id: 'mappa-materiali', nuda: true, span: 4,
                    stile: { bg: 'transparent', testo: '#404040', bordoPx: 0 },
                    voci: [{ id: 'mat', et: t('st_materiali', 'Materiali'), forma: 'materiali',
                        vuoto: o.materiali === null ? t('st_carico_mat', 'Cerco i materiali di questa mappa…') : t('st_nessun_materiale', 'Questa mappa non porta materiali oltre ai set.') }]
                }
            ];
            s.tabelle = tabMat.concat([{
                id: 'sessioni', titolo: t('st_sessioni', 'Le tue prove'), collassabile: true,
                vuota: t('st_sessioni_vuota', 'Nessuna prova ancora: componine una e il documento comparirà qui.'),
                colonne: [
                    { etichetta: t('st_col_doc', 'Documento') },
                    { etichetta: t('st_col_tipo', 'Tipo'), larghezza: '150px' },
                    { etichetta: t('st_col_data', 'Data'), larghezza: '116px' },
                    { etichetta: '', ordinabile: false, larghezza: o.scambio !== false ? '96px' : '56px' }
                ],
                righe: (o.sessioni || []).map(function (x) {
                    return {
                        id: 'apri:' + x.id, chiude: false,
                        celle: [x.nome || x.id, x.tipo || '', fmtData(x.data), {
                            /* solo la cartella: `window.print()` in WKWebView non apre niente (misurato sull'iPad, 7/9) */
                            azioni: (o.scambio !== false && (x.pdf || x.html) ? [
                                { id: 'invia:' + x.id, icona: 'send', soloIcona: true, ruolo: 'quieto', etichetta: t('st_invia', 'Consegna al docente') }
                            ] : []).concat([
                                { id: 'cartella:' + x.id, icona: 'folder-open', soloIcona: true, ruolo: 'quieto', etichetta: t('st_cartella', 'Apri nei File') }
                            ])
                        }]
                    };
                })
            }]);
        }
        return s;
    }

    /* il nome del PDF della mappa (Giacomo, 17/9): `mappa-<progetto>-GG-MM-AAAA-NN.pdf`,
       NN il primo numero libero di quel giorno fra i file già in «MAPPE PDF» (da 00) */
    function nomePdfMappa(progetto, data, esistenti) {
        var d = data || new Date(), p2 = function (n) { return String(n).padStart(2, '0'); };
        var base = 'mappa-' + String(progetto || 'mappa').replace(/[\\/:*?"<>|]+/g, '-').trim() + '-' + p2(d.getDate()) + '-' + p2(d.getMonth() + 1) + '-' + d.getFullYear() + '-';
        var presi = {}; (esistenti || []).forEach(function (n) { presi[n] = true; });
        for (var i = 0; ; i++) { var nome = base + p2(i) + '.pdf'; if (!presi[nome]) return nome; }
    }

    /* le briciole: Studia › materia › mappa */
    function briciole(o) {
        var t = (o && o.t) || function (k, f) { return f; };
        var out = [{ id: 'studia', et: t('st_titolo', 'Studia') }];
        var prog = ((o && o.vaults) || []).filter(function (v) { return v.fullPath === (o && o.sel); })[0];
        if (prog) { out.push({ id: 'm:' + materiaDi(prog), et: materiaDi(prog) }); out.push({ id: 'v:' + prog.fullPath, et: prog.rootNodeLabel || prog.folderName }); }
        return out;
    }

    return { SENZA: SENZA, SCHEDA: SCHEDA, materiaDi: materiaDi, perMateria: perMateria, fmtData: fmtData, schema: schema, briciole: briciole, genere: genere, GRUPPI: GRUPPI, tabelleMateriali: tabelleMateriali, trovaSintesi: trovaSintesi, daMostrare: daMostrare, inAllegati: inAllegati, nomePdfMappa: nomePdfMappa, schedaDaNodi: schedaDaNodi, markdownDaScheda: markdownDaScheda };
}));
