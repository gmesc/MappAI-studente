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

    /* il messaggio di un errore di rete/HTTP, col rimedio */
    function erroreTesto(t, e) {
        t = t || function (k, f) { return f; };
        var st = e && e.status;
        if (st === 403) return t('sc_err_403', 'Il QR è scaduto: inquadra quello nuovo sul computer del docente.');
        if (st === 404) return t('sc_err_404', 'Il docente non ha questa mappa aperta per lo scambio.');
        if (st === 413) return t('sc_err_413', 'Il file è troppo grande per la consegna.');
        if (st === 400) return t('sc_err_400', 'Il docente ha rifiutato la consegna: controlla numero e classe.');
        return t('sc_err_rete', 'Non raggiungo il computer del docente. Sei sulla rete della classe?');
    }

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
            return { id: 'invia:' + p.id, etichetta: p.nome || p.id, sotto: (p.tipo || '') + (p.data ? ' · ' + p.data : ''), icona: 'send' };
        });
        var sez = [
            { id: 'sc-ricevi', titolo: t('sc_ricevi_t', 'Ricevi una mappa'), voci: riceve },
            { id: 'sc-chi', titolo: t('sc_chi_t', 'Chi sei'), voci: [{ id: 'identita', etichetta: id ? (t('sc_classe', 'Classe') + ' ' + id.classe + ' · ' + t('sc_numero', 'numero') + ' ' + id.numero) : t('sc_identita_manca', 'Scrivi il tuo numero e la classe'), sotto: id ? t('sc_identita_cambia', 'Tocca qui se devi cambiarli') : t('sc_identita_sotto', 'Servono solo per consegnare le prove'), icona: 'user' }] }
        ];
        if (invia.length) sez.push({ id: 'sc-invia', titolo: t('sc_invia_t', 'Consegna una prova'), voci: invia });
        else sez.push({ id: 'sc-invia', titolo: t('sc_invia_t', 'Consegna una prova'), testo: t('sc_invia_vuoto', 'Non hai ancora prove da consegnare. Fai una prova, poi torna qui.') });
        return {
            id: 'scambio', titolo: t('sc_titolo', 'Il tuo docente'), sottotitolo: t('sc_sub', 'Ricevi le mappe e consegna le prove'),
            icona: 'qr-code', taglia: 'm', veloChiude: true,
            sezioni: sez,
            azioni: [{ id: 'chiudi', etichetta: t('mm_chiudi', 'Chiudi'), ruolo: 'quieto' }]
        };
    }
    function schemaIdentita(o) {
        o = o || {};
        var t = o.t || function (k, f) { return f; };
        var id = o.identita || {};
        return {
            id: 'identita', titolo: t('sc_chi_t', 'Chi sei'), sottotitolo: t('sc_chi_sub', 'Così il docente sa di chi è la prova'),
            icona: 'user', taglia: 's', invio: true,
            sezioni: [{ id: 'sc-campi', campi: [
                { id: 'numero', tipo: 'testo', etichetta: t('sc_numero_et', 'Il tuo numero'), segnaposto: '4517', valore: id.numero || '', aiuto: t('sc_numero_aiuto', 'Te lo dà il docente. Solo numeri.') },
                { id: 'classe', tipo: 'testo', etichetta: t('sc_classe_et', 'La tua classe'), segnaposto: '1A', valore: id.classe || '', aiuto: t('sc_classe_aiuto', 'Un numero e una lettera, per esempio 1A.') }
            ] }],
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
    /* o = { t, prova: {id,nome,tipo,pdf,html}, jsonl: bool (esiste sessioni.jsonl) } */
    function schemaInvio(o) {
        o = o || {};
        var t = o.t || function (k, f) { return f; };
        var p = o.prova || {};
        var campi = [];
        if (p.html && p.html !== 'risposte.html') campi.push({ id: 'report', tipo: 'spunta', etichetta: t('sc_con_report', 'Anche il report (report.html)'), valore: false });
        if (o.jsonl) campi.push({ id: 'jsonl', tipo: 'spunta', etichetta: t('sc_con_jsonl', 'Anche i miei record di studio (sessioni.jsonl)'), valore: false });
        var sez = [{ id: 'sc-cosa', testo: t('sc_invio_testo', 'Consegni') + ': ' + (p.pdf || p.html || '') + ' — ' + (p.nome || p.id || '') }];
        if (campi.length) sez.push({ id: 'sc-extra', titolo: t('sc_extra_t', 'In più'), campi: campi });
        return {
            id: 'invio', titolo: t('sc_invia_t', 'Consegna al docente'), sottotitolo: o.identita ? (t('sc_classe', 'Classe') + ' ' + o.identita.classe + ' · ' + t('sc_numero', 'n.') + ' ' + o.identita.numero) : '',
            icona: 'send', taglia: 's', invio: true,
            sezioni: sez,
            azioni: [
                { id: 'annulla', etichetta: t('mm_annulla', 'Annulla'), ruolo: 'quieto' },
                { id: 'invia', etichetta: t('sc_invia', 'Consegna'), ruolo: 'primario', icona: 'send' }
            ]
        };
    }

    function fmtBytes(n) {
        n = Number(n) || 0;
        if (n < 1024) return n + ' B';
        if (n < 1048576) return Math.round(n / 1024) + ' KB';
        return (n / 1048576).toFixed(1) + ' MB';
    }

    return { daQr: daQr, esitoQr: esitoQr, cartellaDestinazione: cartellaDestinazione, pianoRicezione: pianoRicezione, fileDaInviare: fileDaInviare,
        erroreTesto: erroreTesto, schemaDocente: schemaDocente, schemaIdentita: schemaIdentita, schemaIndirizzo: schemaIndirizzo, schemaInvio: schemaInvio, fmtBytes: fmtBytes };
}));
