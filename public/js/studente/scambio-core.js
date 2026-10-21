/*
 * studente/scambio-core.js — la LOGICA dello scambio col docente (pura, UMD)
 * ---------------------------------------------------------------------------
 * Che cosa decide: come si legge il QR (o l'indirizzo scritto a mano), dove
 * finisce sull'iPad il vault che arriva, quali file del manifest si accettano
 * (fiducia zero: la regola è `relVaultStudente` di files-core, la stessa che
 * usa il docente), e la FORMA dei modali (Docente, Chi sei, Indirizzo, Invia).
 * Niente DOM, niente rete: `tests/scambio-core.test.js` la passa in Node e gli
 * schemi passano da `validaSchema` (trappola 33). Piano: docs/PIANO-scambio-qr.md.
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.MappAIScambioCore = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    function _s(x) { return String(x == null ? '' : x).trim(); }
    function nfc(s) { try { return _s(s).normalize('NFC'); } catch (e) { return _s(s); } }

    /* ── il QR / l'indirizzo ───────────────────────────────────────────────
       Il QR di INSEGNA è `http://<ip>:<porta>/files/<x>.zip?s=<token>` (o un
       documento, o la home `/?s=`): porta già origine e token. A mano si
       accetta anche «ip:porta token» e «ip:porta/token». → { base, token } | null */
    function daQr(testo) {
        var t = _s(testo);
        if (!t) return null;
        var m = /^(https?:\/\/[^\s/?#]+)[^\s?#]*\?(?:[^\s#]*&)?s=([A-Za-z0-9_-]+)/i.exec(t);
        if (m) return { base: m[1].replace(/^https?/i, function (x) { return x.toLowerCase(); }), token: m[2] };
        m = /^(?:https?:\/\/)?([A-Za-z0-9.-]+:[0-9]{2,5})[\s\/]+([A-Za-z0-9_-]{6,})$/.exec(t);
        if (m) return { base: 'http://' + m[1], token: m[2] };
        return null;
    }

    /* L'esito per chi deve DIRE all'allievo che cosa è andato storto (0098): un
       indirizzo web senza token è il QR dei Materiali, fatto per i telefoni (il
       browser segue il redirect); non è un codice rotto, è quello sbagliato.
       → { ok:true, base, token } | { ok:false, motivo:'telefono'|'no' } */
    function esitoQr(testo) {
        var d = daQr(testo);
        if (d) return { ok: true, base: d.base, token: d.token };
        return { ok: false, motivo: /^https?:\/\/[^\s]+$/i.test(_s(testo)) ? 'telefono' : 'no' };
    }

    /* ── dove finisce il vault sull'iPad ─────────────────────────────────────
       La stessa gerarchia che `getAllVaults` dell'adapter legge:
       Documents/<classe>/<materia>/<mappa>; senza materia Documents/<classe>/<mappa>;
       senza classe piatto. Mai una cartella «Generico» (trappola 26). */
    function cartellaDestinazione(manifest, rootDir) {
        var m = manifest || {};
        var nome = nfc(m.nome); if (!nome) return null;
        var segs = [rootDir || 'Documents'];
        var classe = nfc(m.classe), materia = nfc(m.materia);
        if (classe) { segs.push(classe); if (materia) segs.push(materia); }
        segs.push(nome);
        return segs.join('/');
    }

    /* ── il piano di ricezione ──────────────────────────────────────────────
       Dal manifest ai file da scaricare: ogni rel passa di nuovo da
       `relVaultStudente` (FC arriva da fuori: il core non conosce i globali). */
    function pianoRicezione(manifest, base, token, rootDir, FC) {
        var m = manifest || {};
        var dest = cartellaDestinazione(m, rootDir);
        if (!dest || !FC || !FC.relVaultStudente) return null;
        var files = [], totale = 0, scartati = 0;
        (m.files || []).forEach(function (f) {
            var rel = f && FC.relVaultStudente(f.rel);
            if (!rel) { scartati++; return; }
            files.push({ rel: rel, url: base + '/vault/' + encodeURIComponent(rel) + '?s=' + encodeURIComponent(token), size: Number(f.size) || 0 });
            totale += Number(f.size) || 0;
        });
        return { dest: dest, nome: nfc(m.nome), files: files, totale: totale, scartati: scartati };
    }

    /* ── la consegna: che cosa si manda ─────────────────────────────────────
       `s` = una riga di «Le tue prove» (sessione.json + id/nome); `scelte` = le
       spunte del modale Invia. Il PDF è il default; report.html e sessioni.jsonl
       sono in più. → [{ rel, nome }] relativi al vault */
    function fileDaInviare(s, scelte) {
        var base = 'Studio Attivo/Prove/' + s.id + '/';
        var out = [];
        if (s.pdf) out.push({ rel: base + s.pdf, nome: s.pdf });
        else if (s.html) out.push({ rel: base + s.html, nome: s.html });
        if (scelte && scelte.report && s.html && s.html !== 'risposte.html') out.push({ rel: base + s.html, nome: s.html });
        if (scelte && scelte.jsonl) out.push({ rel: 'Studio Attivo/sessioni.jsonl', nome: 'sessioni.jsonl' });
        var visti = {};
        return out.filter(function (f) { if (visti[f.rel]) return false; visti[f.rel] = 1; return true; });
    }

    /* il messaggio di un errore di rete/HTTP, col rimedio: che cosa è successo E che cosa
       fare (0119). `e.codice` è l'`error` del corpo JSON del server, quando c'è: un 400 è
       quasi sempre l'identità, ma può essere il tetto delle consegne per allievo. */
    function erroreTesto(t, e) {
        t = t || function (k, f) { return f; };
        var st = e && e.status, cod = e && e.codice;
        if (st === 403) return t('sc_err_403', 'Il QR è scaduto. Chiedi al docente di mostrarlo di nuovo e inquadralo.');
        if (st === 404) return t('sc_err_404', 'Il docente non ha aperto questa mappa per lo scambio. Chiedigli il QR «Vault su iPad» di questa mappa.');
        if (st === 413) return t('sc_err_413', 'Il file è troppo grande per la consegna. Avvisa il docente.');
        if (st === 415) return t('sc_err_415', 'Questo tipo di file non si può consegnare. Avvisa il docente.');
        if (st === 400 && cod === 'troppe-consegne') return t('sc_err_troppe', 'Hai già consegnato troppe prove su questa mappa. Avvisa il docente.');
        if (st === 400) return t('sc_err_400', 'Il docente ha rifiutato la consegna. Controlla numero e classe in «Chi sei».');
        return t('sc_err_rete', 'Non trovo il computer del docente. iPad e computer devono essere sulla stessa rete Wi-Fi.');
    }

    /* ── la prova, a parole (0119) ─────────────────────────────────────────
       «Quiz a scelta multipla — 1a Guerra Mondiale» · «20/10/2026»: il genere e
       l'argomento, poi la data UNA volta, in GG/MM/AAAA (regola 15). Il nome della
       cartella («2026-10-20 · Quiz · 1a Guerra M… · 00») resta solo come ripiego. */
    var GENERI = { 'scelta multipla': 'Quiz a scelta multipla', 'domande aperte': 'Domande aperte' };
    function genereProva(p) { var tipo = _s(p && p.tipo); return GENERI[tipo.toLowerCase()] || tipo; }
    function argomentoProva(p) { return _s(p && p.mappa) || _s(p && p.titolo); }
    function etichettaProva(p) {
        p = p || {};
        var genere = genereProva(p), argomento = argomentoProva(p);
        if (genere && argomento) return genere + ' — ' + argomento;
        return _s(p.nome) || genere || argomento || _s(p.id);
    }
    function dataProva(d) {
        var x = _s(d);
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(x)) return x;
        var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(x);
        return m ? m[3] + '/' + m[2] + '/' + m[1] : '';
    }
    function chiSeiBreve(id) { return id ? id.classe + ' · n. ' + id.numero : ''; }
    function chiSeiLungo(t, id) { return id ? t('sc_classe', 'Classe') + ' ' + id.classe + ' · ' + t('sc_numero', 'numero') + ' ' + id.numero : ''; }

    /* ── gli schemi ────────────────────────────────────────────────────────── */
    /* o = { t, identita: {numero,classe,id}|null, camera: bool, prove: [{id,nome,tipo,pdf,html}], docente: {base,token}|null, vault: nome } */
    function schemaDocente(o) {
        o = o || {};
        var t = o.t || function (k, f) { return f; };
        var id = o.identita;
        var riceve = [];
        /* i testi per chi ha 11-12 anni (Giacomo, 17/9): che cosa fare, in parole di tutti i giorni */
        if (o.camera) riceve.push({ id: 'inquadra', etichetta: t('sc_inquadra', 'Inquadra il QR'), sotto: t('sc_inquadra_sotto', 'Punta la fotocamera sul quadratino che il docente ti mostra'), icona: 'camera' });
        riceve.push({ id: 'scrivi', etichetta: o.camera ? t('sc_scrivi_alt', 'La fotocamera non va? Scrivi il codice') : t('sc_scrivi', 'Scrivi il codice'), sotto: t('sc_scrivi_sotto', 'Copia le lettere scritte sotto il QR'), icona: 'keyboard' });
        var invia = (o.prove || []).filter(function (p) { return p.pdf || p.html; }).map(function (p) {
            /* l'argomento sopra, genere e data sotto: nel reader la voce è in corpo 20 e il
               modale largo 560, e «Quiz a scelta multipla — …» intero non ci sta (21/10) */
            var g = genereProva(p), arg = argomentoProva(p), data = dataProva(p.data);
            return { id: 'invia:' + p.id, etichetta: arg || etichettaProva(p), sotto: [arg ? g : '', data].filter(Boolean).join(' · ') || t('sc_invia_tocca', 'tocca per consegnarla'), icona: 'send' };
        });
        /* accanto al titolo: la guida, e chi sei già (0119). La sezione «Chi sei» non c'è
           più: si cambia da qui o da «Consegna al docente», dove conta. */
        var rimandi = [
            { id: 'guida', etichetta: t('sc_istruzioni', 'Istruzioni') },
            { id: 'identita', etichetta: id ? chiSeiBreve(id) : t('sc_chi_sei_q', 'Chi sei?') }
        ];
        var sez = [{ id: 'sc-ricevi', titolo: t('sc_ricevi_t', 'Ricevi una mappa'), voci: riceve }];
        if (invia.length) sez.push({ id: 'sc-invia', titolo: t('sc_invia_t', 'Consegna una prova'), rimandi: rimandi, voci: invia });
        else sez.push({ id: 'sc-invia', titolo: t('sc_invia_t', 'Consegna una prova'), rimandi: rimandi, testo: t('sc_invia_vuoto', 'Non hai ancora prove da consegnare: fanne una dalla console del progetto e premi «Consegna» alla fine.') });
        return {
            id: 'scambio', titolo: t('sc_titolo', 'Il tuo docente'), sottotitolo: t('sc_sub', 'Ricevi le mappe e consegna le prove'),
            icona: 'qr-code', taglia: 'm', veloChiude: true,
            sezioni: sez,
            azioni: [{ id: 'chiudi', etichetta: t('mm_chiudi', 'Chiudi'), ruolo: 'quieto' }]
        };
    }
    /* «2B» ↔ classe «2» e sezione «B» */
    function gradoDi(classe) { var m = /^([1-4])/.exec(_s(classe)); return m ? m[1] : ''; }
    function sezioneDi(classe) { var m = /^[1-4]([A-Za-z])$/.exec(_s(classe)); return m ? m[1].toUpperCase() : ''; }
    function classeDa(v) { v = v || {}; return _s(v.grado) + _s(v.sezione).toUpperCase(); }
    /* la sezione mentre si scrive: solo lettere, maiuscole, una sola */
    function sezionePulita(x) { return _s(x).toUpperCase().replace(/[^A-Z]/g, '').slice(0, 1); }
    function schemaIdentita(o) {
        o = o || {};
        var t = o.t || function (k, f) { return f; };
        var id = o.identita || {};
        return {
            id: 'identita', titolo: t('sc_chi_t', 'Chi sei'), sottotitolo: t('sc_chi_sub', 'Così il docente sa di chi è la prova.'),
            icona: 'user', taglia: 's', invio: true,
            sezioni: [
                { id: 'sc-campi', campi: [
                    { id: 'numero', tipo: 'testo', etichetta: t('sc_numero_et', 'Il tuo numero di registro'), segnaposto: '7', valore: id.numero || '', aiuto: t('sc_numero_aiuto', 'La tua posizione nell\'elenco di classe. Solo cifre.') }
                ] },
                /* classe e sezione separate e affiancate, come nell'app del docente (gate dello
                   0119, 21/10): la classe si SCEGLIE, la sezione è una lettera che diventa
                   maiuscola da sola. Si ricompongono in «2B» (`classeDa`): la cartella delle
                   consegne non cambia. */
                { id: 'sc-classe', titolo: t('sc_classe_t', 'La tua classe'), colonne: 2, campi: [
                    { id: 'grado', tipo: 'scelta', etichetta: t('sc_grado_et', 'Classe'), valore: gradoDi(id.classe),
                      opzioni: [{ valore: '', etichetta: t('sc_grado_scegli', '— scegli —') }].concat(['1', '2', '3', '4'].map(function (g) { return { valore: g, etichetta: g + 'ª' }; })) },
                    { id: 'sezione', tipo: 'testo', etichetta: t('sc_sezione_et', 'Sezione'), segnaposto: t('sc_sezione_ph', 'Sezione (es. B)'), valore: sezioneDi(id.classe) }
                ] }
            ],
            azioni: [
                { id: 'annulla', etichetta: t('mm_annulla', 'Annulla'), ruolo: 'quieto' },
                { id: 'ok', etichetta: t('sc_ok', 'Salva'), ruolo: 'primario' }
            ]
        };
    }
    function schemaIndirizzo(o) {
        o = o || {};
        var t = o.t || function (k, f) { return f; };
        return {
            id: 'indirizzo', titolo: t('sc_scrivi', 'Scrivi il codice'), sottotitolo: t('sc_scrivi_sub', 'Lo trovi scritto sotto il QR, sullo schermo del docente'),
            icona: 'keyboard', taglia: 's', invio: true,
            sezioni: [{ id: 'sc-campi', campi: [
                { id: 'indirizzo', tipo: 'testo', etichetta: t('sc_indirizzo_et', 'Codice'), segnaposto: 'http://192.168.1.23:8768/…?s=abc123', valore: o.valore || '' }
            ] }],
            azioni: [
                { id: 'annulla', etichetta: t('mm_annulla', 'Annulla'), ruolo: 'quieto' },
                { id: 'ok', etichetta: t('sc_ricevi', 'Ricevi la mappa'), ruolo: 'primario' }
            ]
        };
    }
    /* o = { t, prova: {id,nome,tipo,mappa,titolo,pdf,html}, jsonl: bool (esiste sessioni.jsonl), identita } */
    function schemaInvio(o) {
        o = o || {};
        var t = o.t || function (k, f) { return f; };
        var p = o.prova || {};
        var campi = [];
        if (p.html && p.html !== 'risposte.html') campi.push({ id: 'report', tipo: 'spunta', etichetta: t('sc_con_report', 'Anche il report della prova'), valore: false });
        if (o.jsonl) campi.push({ id: 'jsonl', tipo: 'spunta', etichetta: t('sc_con_jsonl', 'Anche i miei record di studio'), valore: false });
        var sez = [];
        /* chi consegna, con «Cambia» accanto: è il momento in cui conta (0119) */
        if (o.identita) sez.push({ id: 'sc-chi', titolo: t('sc_chi_consegna', 'Chi consegna'), rimandi: [{ id: 'identita', etichetta: t('sc_cambia', 'Cambia') }], testo: chiSeiLungo(t, o.identita) });
        sez.push({ id: 'sc-cosa', titolo: t('sc_cosa_t', 'Che cosa consegni'), testo: t('sc_invio_testo', 'Mandi al docente le risposte di') + ': ' + etichettaProva(p) + ' (' + (p.pdf || p.html || '') + ').' });
        if (campi.length) sez.push({ id: 'sc-extra', titolo: t('sc_extra_t', 'In più'), campi: campi });
        sez.push({ id: 'sc-prima', accento: true, testo: t('sc_promemoria', 'Il docente deve mostrare sul suo computer il QR «Vault su iPad» di questa mappa. Siete sulla stessa rete Wi-Fi.') });
        return {
            id: 'invio', titolo: t('sc_invia_t', 'Consegna al docente'),
            icona: 'send', taglia: 's', invio: true,
            sezioni: sez,
            azioni: [
                { id: 'annulla', etichetta: t('mm_annulla', 'Annulla'), ruolo: 'quieto' },
                { id: 'invia', etichetta: t('sc_invia', 'Consegna'), ruolo: 'primario', icona: 'send' }
            ]
        };
    }

    /* ── la guida a slide: «Come si consegna una prova» (0119) ─────────────
       Una slide per volta: un titolo, al più due frasi, una schermata VERA
       dell'app (in `img/scambio/`, locale: l'iPad lavora senza rete). La 5 (la
       fotocamera sul QR) si vede solo sull'iPad: la scatta Giacomo, finché non
       c'è la slide resta senza immagine. «Passo 2 di 6» nel sottotitolo fa da
       pallini (deciso da Giacomo il 21/10). */
    var GUIDA = [
        { titolo: ['sc_g1_t', 'Scrivi chi sei'], testo: ['sc_g1', 'Tocca «Docente», poi «Chi sei?» accanto a «Consegna una prova»: il tuo numero di registro, la classe e la sezione. Lo fai una volta sola.'], img: 'img/scambio/passo-1.png', alt: ['sc_g1_alt', 'Il modale «Chi sei» compilato'] },
        { titolo: ['sc_g2_t', 'Fai la prova'], testo: ['sc_g2', 'Scegli una prova nella console del progetto e premi «Consegna» alla fine. La ritrovi in «Le tue prove».'], img: 'img/scambio/passo-2.png', alt: ['sc_g2_alt', 'La tabella «Le tue prove» con una prova'] },
        { titolo: ['sc_g3_t', 'Il docente apre lo scambio'], testo: ['sc_g3', 'Sul suo computer apre la mappa in INSEGNA e mostra il QR «Vault su iPad». Tu e lui siete sulla stessa rete Wi-Fi.'], img: 'img/scambio/passo-3.png', alt: ['sc_g3_alt', 'Lo schermo del docente col QR «Vault su iPad»'] },
        { titolo: ['sc_g4_t', 'Scegli la prova'], testo: ['sc_g4', 'In «Docente», sotto «Consegna una prova», tocca la prova; o tocca ✈ nella sua riga in «Le tue prove». Controlla classe e numero, poi «Consegna».'], img: 'img/scambio/passo-4.png', alt: ['sc_g4_alt', 'Il modale «Consegna al docente»'] },
        { titolo: ['sc_g5_t', 'Inquadra il QR'], testo: ['sc_g5', 'Se si apre la fotocamera, inquadra il QR del docente. Se non va, scrivi il codice che sta sotto il QR: per 12 ore l\'iPad se lo ricorda.'], img: '', alt: ['sc_g5_alt', 'La fotocamera inquadra il QR del docente'] },
        { titolo: ['sc_g6_t', 'Fatto'], testo: ['sc_g6', 'Compare «Consegnato al docente» col nome del file: il docente lo trova in INSEGNA, fra le «Consegne». Se consegni di nuovo, la copia nuova non cancella la vecchia.'], img: 'img/scambio/passo-6.png', alt: ['sc_g6_alt', 'Il messaggio verde «Consegnato al docente»'] }
    ];
    /* o = { t, passo: 1..6 } → lo schema della slide; ‹ e › non chiudono, «Ho capito» sì */
    function schemaGuida(o) {
        o = o || {};
        var t = o.t || function (k, f) { return f; };
        var n = GUIDA.length, passo = Math.min(Math.max(parseInt(o.passo, 10) || 1, 1), n);
        var g = GUIDA[passo - 1];
        var sezione = { id: 'sc-slide', titolo: t(g.titolo[0], g.titolo[1]), testo: t(g.testo[0], g.testo[1]) };
        if (g.img) sezione.figura = { src: g.img, alt: t(g.alt[0], g.alt[1]), larga: true };
        var azioni = [];
        if (passo > 1) azioni.push({ id: 'indietro', etichetta: t('sc_g_indietro', 'Indietro'), icona: 'chevron-left', ruolo: 'secondario', chiude: false });
        azioni.push(passo < n
            ? { id: 'avanti', etichetta: t('sc_g_avanti', 'Avanti'), icona: 'chevron-right', ruolo: 'primario', chiude: false }
            : { id: 'capito', etichetta: t('sc_g_capito', 'Ho capito'), ruolo: 'primario' });
        return {
            id: 'guida', titolo: t('sc_g_titolo', 'Come si consegna una prova'),
            sottotitolo: t('sc_g_passo', 'Passo') + ' ' + passo + ' ' + t('sc_g_di', 'di') + ' ' + n,
            icona: 'help-circle', taglia: 'm', invio: true, veloChiude: true,
            sezioni: [sezione], azioni: azioni, passo: passo
        };
    }

    function fmtBytes(n) {
        n = Number(n) || 0;
        if (n < 1024) return n + ' B';
        if (n < 1048576) return Math.round(n / 1024) + ' KB';
        return (n / 1048576).toFixed(1) + ' MB';
    }

    return { daQr: daQr, esitoQr: esitoQr, cartellaDestinazione: cartellaDestinazione, pianoRicezione: pianoRicezione, fileDaInviare: fileDaInviare,
        erroreTesto: erroreTesto, schemaDocente: schemaDocente, schemaIdentita: schemaIdentita, schemaIndirizzo: schemaIndirizzo, schemaInvio: schemaInvio, schemaGuida: schemaGuida, GUIDA: GUIDA,
        etichettaProva: etichettaProva, dataProva: dataProva, classeDa: classeDa, sezionePulita: sezionePulita, fmtBytes: fmtBytes };
}));
