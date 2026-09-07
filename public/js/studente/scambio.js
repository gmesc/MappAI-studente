/*
 * studente/scambio.js — lo scambio col docente: lo scanner, la rete, il velo
 * ---------------------------------------------------------------------------
 * È l'unico pezzo che tocca DOM, plugin e rete; le regole stanno in
 * scambio-core.js (puro) e in mappai-files-core.js (la stessa copia del
 * docente: `relVaultStudente`, `identitaStudente`).
 *   RICEVI  QR (plugin @capacitor/barcode-scanner, scanner nativo a schermo
 *           intero) o indirizzo scritto → GET /api/vault → un file alla volta da
 *           /vault/<rel> → `MappAIStudenteFS.scriviRicevuto` (allowlist della
 *           ricezione) → la console si ridisegna sulla mappa ricevuta.
 *   INVIA   dalla riga di «Le tue prove» o dal modale Docente: il PDF delle
 *           risposte (più report/jsonl a spunta) → POST /api/consegna col numero
 *           personale e la classe (chiesti una volta, ricordati).
 * Kill-switch `mappai_studente_scambio='0'` (console.js non mostra la voce).
 * Chiavi: mappai_studente_identita {numero,classe} · mappai_studente_docente {base,token,ts}.
 */
(function () {
    'use strict';
    if (window.MappAIStudenteScambio) return;

    function t(k, f) { try { return (window.t ? window.t(k, f) : f) || f; } catch (e) { return f; } }
    function MM() { return window.MappAIModal; }
    function SC() { return window.MappAIScambioCore; }
    function FC() { return window.MappAIFilesCore; }
    function FS() { return window.MappAIStudenteFS; }
    function toast(m, tipo) { if (window.showToast) window.showToast(m, tipo || 'info'); else console.log('[scambio]', m); }
    function esc(x) { var d = document.createElement('div'); d.textContent = x == null ? '' : String(x); return d.innerHTML; }
    var K_ID = 'mappai_studente_identita', K_DOC = 'mappai_studente_docente', DOC_TTL = 12 * 3600 * 1000;

    function identita() {
        try { var j = JSON.parse(localStorage.getItem(K_ID) || 'null'); return j ? FC().identitaStudente(j.numero, j.classe) : null; } catch (e) { return null; }
    }
    function docente() {
        try { var j = JSON.parse(localStorage.getItem(K_DOC) || 'null'); return (j && j.base && j.token && (Date.now() - (j.ts || 0)) < DOC_TTL) ? j : null; } catch (e) { return null; }
    }
    function ricordaDocente(d) { try { localStorage.setItem(K_DOC, JSON.stringify({ base: d.base, token: d.token, ts: Date.now() })); } catch (e) { } }
    function camera() { var p = FS() && FS().plugin && FS().plugin('CapacitorBarcodeScanner'); return !!(p && p.scanBarcode); }

    /* ── Chi sei: numero personale + classe, la classe si scrive MAIUSCOLA mentre si digita ── */
    function chiediIdentita() {
        var s = SC().schemaIdentita({ t: window.t, identita: identita() });
        s.suApertura = function (box) {
            var c = box.querySelector('[data-campo="classe"]'), n = box.querySelector('[data-campo="numero"]');
            if (c) { c.setAttribute('autocapitalize', 'characters'); c.setAttribute('maxlength', '2'); c.addEventListener('input', function () { var v = c.value.toUpperCase().replace(/[^0-9A-Z]/g, ''); if (v !== c.value) c.value = v; }); }
            if (n) { n.setAttribute('inputmode', 'numeric'); n.addEventListener('input', function () { var v = n.value.replace(/[^0-9]/g, ''); if (v !== n.value) n.value = v; }); }
        };
        return MM().open(s).then(function (r) {
            if (!r || r.azione !== 'ok') return identita();
            var v = r.valori || {};
            var id = FC().identitaStudente(v.numero, v.classe);
            if (!id) { toast(t('sc_identita_ko', 'Numero solo cifre; classe una cifra da 1 a 4 e una lettera, per esempio 2B.'), 'warning'); return chiediIdentita(); }
            try { localStorage.setItem(K_ID, JSON.stringify({ numero: id.numero, classe: id.classe })); } catch (e) { }
            return id;
        });
    }

    /* ── il velo: «Ricevo 12/57 · Sintesi…» con Annulla (ciò che è già scritto resta) ── */
    var velo = null, annullato = false;
    function veloApri(titolo) {
        veloChiudi(); annullato = false;
        velo = document.createElement('div'); velo.id = 'sc-velo';
        velo.style.zIndex = (MM() && MM().prossimoZ) ? MM().prossimoZ() : 20000;
        velo.innerHTML = '<div class="sc-velo__box"><div class="sc-velo__t">' + esc(titolo) + '</div><div class="sc-velo__s"></div><div class="sc-velo__b"><div class="sc-velo__f"></div></div>' +
            '<button type="button" class="mm-btn mm-btn--quieto sc-velo__x">' + esc(t('mm_annulla', 'Annulla')) + '</button></div>';
        velo.querySelector('.sc-velo__x').addEventListener('click', function () { annullato = true; });
        document.body.appendChild(velo);
    }
    function veloDici(testo, frazione) {
        if (!velo) return;
        velo.querySelector('.sc-velo__s').textContent = testo || '';
        velo.querySelector('.sc-velo__f').style.width = Math.round(Math.max(0, Math.min(1, frazione || 0)) * 100) + '%';
    }
    function veloChiudi() { if (velo) { velo.remove(); velo = null; } }

    /* ── RICEVI ────────────────────────────────────────────────────────────── */
    function inquadra() {
        var p = FS().plugin('CapacitorBarcodeScanner');
        return p.scanBarcode({ hint: 0 /* QR_CODE */, scanInstructions: t('sc_scan_hint', 'Inquadra il QR sullo schermo del docente'), cameraDirection: 1 })
            .then(function (r) { return r && r.ScanResult ? String(r.ScanResult) : ''; })
            .catch(function () { return ''; });
    }
    function scrivi(valore) {
        return MM().open(SC().schemaIndirizzo({ t: window.t, valore: valore || '' })).then(function (r) {
            return (r && r.azione === 'ok' && r.valori) ? String(r.valori.indirizzo || '') : '';
        });
    }
    function daTesto(testo) {
        var d = SC().daQr(testo);
        if (!d) { if (testo) toast(t('sc_qr_ko', 'Non è un codice di MappAI: serve l\'indirizzo sotto il QR, con «?s=…».'), 'warning'); return null; }
        return d;
    }
    function fetchJson(url, opts) {
        return fetch(url, opts).then(function (r) {
            if (!r.ok) { var e = new Error('http ' + r.status); e.status = r.status; throw e; }
            return r.json();
        });
    }
    function blobToB64(b) {
        return new Promise(function (res, rej) { var fr = new FileReader(); fr.onload = function () { res(String(fr.result).split(',')[1] || ''); }; fr.onerror = rej; fr.readAsDataURL(b); });
    }
    /* d = { base, token }; poi() si chiama a fine ricezione con la cartella */
    function ricevi(d, poi) {
        ricordaDocente(d);
        veloApri(t('sc_ricevo_t', 'Ricevo dal docente…'));
        veloDici(t('sc_leggo', 'Leggo l\'elenco dei file…'), 0);
        return fetchJson(d.base + '/api/vault?s=' + encodeURIComponent(d.token)).then(function (man) {
            var piano = SC().pianoRicezione(man, d.base, d.token, FS().ROOT, FC());
            if (!piano || !piano.files.length) throw new Error('manifest vuoto');
            var i = 0, fatti = 0;
            function uno() {
                if (annullato) return Promise.resolve({ annullato: true, fatti: fatti, piano: piano });
                if (i >= piano.files.length) return Promise.resolve({ fatti: fatti, piano: piano });
                var f = piano.files[i++];
                veloDici(t('sc_ricevo', 'Ricevo') + ' ' + i + '/' + piano.files.length + ' · ' + f.rel.split('/').pop(), fatti / piano.totale);
                return fetch(f.url).then(function (r) { if (!r.ok) { var e = new Error('http ' + r.status); e.status = r.status; throw e; } return r.blob(); })
                    .then(blobToB64).then(function (b64) { return FS().scriviRicevuto(piano.dest, f.rel, b64); })
                    .then(function () { fatti += f.size; return uno(); });
            }
            return uno();
        }).then(function (r) {
            veloChiudi();
            if (r.annullato) toast(t('sc_annullato', 'Ricezione interrotta: i file già arrivati restano.'), 'warning');
            else toast(t('sc_ricevuto', 'Ricevuta la mappa') + ' «' + r.piano.nome + '» · ' + r.piano.files.length + ' ' + t('sc_file', 'file'), 'success');
            if (poi) poi(r.piano.dest);
        }).catch(function (e) {
            veloChiudi();
            toast(e && e.message === 'manifest vuoto' ? t('sc_err_404', 'Il docente non ha questa mappa aperta per lo scambio.') : SC().erroreTesto(window.t, e), 'error');
        });
    }

    /* ── INVIA ─────────────────────────────────────────────────────────────── */
    /* una sola prova: chiede l'identità se manca, il docente se non è ricordato o non risponde, le spunte, poi POSTa */
    function invia(vaultPath, prova, folderName) {
        if (!prova) return Promise.resolve();
        var st = { id: identita(), doc: docente() };
        var passo1 = st.id ? Promise.resolve(st.id) : chiediIdentita();
        return passo1.then(function (id) {
            if (!id) return null; st.id = id;
            return FS().esiste(vaultPath + '/Studio Attivo/sessioni.jsonl').then(function (jl) {
                return MM().open(SC().schemaInvio({ t: window.t, prova: prova, jsonl: !!jl, identita: id }));
            });
        }).then(function (r) {
            if (!r || r.azione !== 'invia') return null;
            var files = SC().fileDaInviare(prova, r.valori || {});
            if (!files.length) { toast(t('sc_niente', 'Questa prova non ha un file da consegnare.'), 'warning'); return null; }
            return trovaDocente().then(function (d) { return d ? { d: d, files: files } : null; });
        }).then(function (x) {
            if (!x) return;
            veloApri(t('sc_consegno_t', 'Consegno al docente…'));
            var i = 0, esiti = [];
            function uno() {
                if (i >= x.files.length) return Promise.resolve(esiti);
                var f = x.files[i++];
                veloDici(f.nome + ' (' + i + '/' + x.files.length + ')', (i - 1) / x.files.length);
                return FS().leggiB64(vaultPath, f.rel).then(function (b64) {
                    if (!b64) throw new Error('file mancante: ' + f.nome);
                    return fetchJson(x.d.base + '/api/consegna?s=' + encodeURIComponent(x.d.token), {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ numero: st.id.numero, classe: st.id.classe, vault: folderName, sessione: prova.id, nome: f.nome, base64: b64 })
                    });
                }).then(function (j) { esiti.push(j); return uno(); });
            }
            return uno().then(function (es) {
                veloChiudi();
                toast(t('sc_consegnato', 'Consegnato al docente') + ': ' + es.map(function (e) { return (e.rel || '').split('/').pop(); }).join(', '), 'success');
            }).catch(function (e) { veloChiudi(); toast(SC().erroreTesto(window.t, e), 'error'); });
        });
    }
    /* il docente: quello ricordato se risponde ancora, altrimenti QR o indirizzo */
    function trovaDocente() {
        var d = docente();
        var prova = d ? fetch(d.base + '/api/materials?s=' + encodeURIComponent(d.token)).then(function (r) { return r.ok ? d : null; }).catch(function () { return null; }) : Promise.resolve(null);
        return prova.then(function (vivo) {
            if (vivo) return vivo;
            var p = camera() ? inquadra().then(function (tx) { return tx ? tx : scrivi(''); }) : scrivi('');
            return p.then(function (tx) { var x = daTesto(tx); if (x) ricordaDocente(x); return x; });
        });
    }

    /* ── il modale Docente ─────────────────────────────────────────────────── */
    function apri(vaultPath) {
        var st = (window.MappAIStudente && window.MappAIStudente.stato) || {};
        var v = (st.vaults || []).filter(function (x) { return x.fullPath === vaultPath; })[0] || null;
        var prove = (st.sessioni || []).map(function (s) { return { id: s.id, nome: s.nome, tipo: s.tipo, pdf: s.pdf, html: s.html, data: s.data ? String(s.data).slice(0, 10) : '' }; });
        var s = SC().schemaDocente({ t: window.t, identita: identita(), camera: camera(), prove: prove, vault: v ? (v.rootNodeLabel || v.folderName) : '' });
        return MM().open(s).then(function (r) {
            var a = r && r.azione || '';
            if (a === 'identita') return chiediIdentita().then(function () { return apri(vaultPath); });
            if (a === 'inquadra' || a === 'scrivi') {
                var p = a === 'inquadra' ? inquadra().then(function (tx) { return tx ? tx : scrivi(''); }) : scrivi('');
                return p.then(function (tx) {
                    var d = daTesto(tx); if (!d) return apri(vaultPath);
                    return ricevi(d, function (dest) { if (window.MappAIStudente && window.MappAIStudente.ricarica) window.MappAIStudente.ricarica(dest); });
                });
            }
            if (/^invia:/.test(a)) {
                var id = a.slice(6), prova = prove.filter(function (p) { return p.id === id; })[0];
                return invia(vaultPath, prova, v ? v.folderName : '').then(function () { return apri(vaultPath); });
            }
        });
    }
    /* dalla cella «Invia» di «Le tue prove» */
    function inviaProva(vaultPath, id) {
        var st = (window.MappAIStudente && window.MappAIStudente.stato) || {};
        var v = (st.vaults || []).filter(function (x) { return x.fullPath === vaultPath; })[0] || null;
        var s = (st.sessioni || []).filter(function (x) { return x.id === id; })[0];
        if (!s) return Promise.resolve();
        return invia(vaultPath, { id: s.id, nome: s.nome, tipo: s.tipo, pdf: s.pdf, html: s.html }, v ? v.folderName : '');
    }

    window.MappAIStudenteScambio = { apri: apri, inviaProva: inviaProva, identita: identita, chiediIdentita: chiediIdentita, ricevi: ricevi, camera: camera };
}());
