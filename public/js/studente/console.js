/*
 * studente/console.js — la console STUDIA, la casa dello studente
 * ---------------------------------------------------------------------------
 * Una console del motore dei modali (`layout:'console'`, `piena:true`), sopra
 * il canvas: navigazione = i vault per materia, area = Mappa · Flashcard ·
 * Prova + la tabella delle prove. Lo SCHEMA lo decide `MappAIStudiaCore`
 * (puro, testato); qui si monta, si legge il disco, si reagisce.
 *
 * Regole del motore che mordono (guida, inv. 10-11): «Mappa» e «Flashcard»
 * CONCLUDONO — la console si chiude e l'esito arriva nel `.then()` di `open`;
 * le voci di nav e le celle-azione hanno `chiude:false`; ESC dentro la home
 * non esce (si risponde `false`); il piano lo dà il motore.
 */
(function () {
    'use strict';
    if (window.MappAIStudente) return;

    function t(k, f) { try { return (window.t ? window.t(k, f) : f) || f; } catch (e) { return f; } }
    function toast(m, k) { if (window.showToast) window.showToast(m, k || 'info'); }
    function S() { try { return (typeof appState !== 'undefined') ? appState : window.appState; } catch (e) { return window.appState; } }
    var C = function () { return window.MappAIStudiaCore; };

    var st = { vaults: [], sel: '', chiusi: {}, sessioni: [], materiali: null, aperta: false };
    var rid = null;   /* il `ridisegna` della console aperta (per le briciole e per la ricezione) */
    try { st.sel = localStorage.getItem('mappai_studente_sel') || ''; } catch (e) { }

    function leggi() {
        var demo = window.MappAIStudenteDemo ? window.MappAIStudenteDemo.assicura() : Promise.resolve();
        return demo.then(function () { return window.electronAPI.getAllVaults(); }).then(function (v) {
            st.vaults = v || [];
            if (st.sel && !st.vaults.some(function (x) { return x.fullPath === st.sel; })) st.sel = '';
            return st.vaults;
        }).catch(function () { st.vaults = []; return []; });
    }
    /* le prove: Studio Attivo/Prove/<cartella>/sessione.json (le scrive la fase 2) */
    function leggiSessioni(fullPath) {
        var FS = window.MappAIStudenteFS;
        if (!fullPath || !FS) return Promise.resolve([]);
        var dir = fullPath + '/Studio Attivo/Prove';
        return FS.lista(dir).then(function (figli) {
            return Promise.all(figli.filter(function (f) { return f.isDir; }).map(function (f) {
                return FS.leggiTesto(dir + '/' + f.name + '/sessione.json').then(function (tx) {
                    try { var j = JSON.parse(tx || 'null'); return j ? Object.assign({ id: f.name, nome: f.name }, j) : null; } catch (e) { return null; }
                });
            }));
        }).then(function (l) { return l.filter(Boolean).sort(function (a, b) { return String(b.data || '').localeCompare(String(a.data || '')); }); })
          .catch(function () { return []; });
    }
    /* i materiali del vault (Materiale Studio/*), per la console: null finché non li ha letti */
    function leggiMateriali(fullPath) {
        if (!fullPath) return Promise.resolve([]);
        var uno = function (dir) {
            return window.electronAPI.vaultMaterialsList(dir ? { vaultPath: fullPath, dir: dir } : { vaultPath: fullPath })
                .then(function (r) { return (r && r.files) || []; }).catch(function () { return []; });
        };
        /* «Allegati» è la scheda didattica del docente — l'unico PDF che viaggia (7/9):
           senza questa seconda lettura resterebbe sul disco e invisibile nell'app */
        return Promise.all([uno(''), uno('Allegati')]).then(function (r) { return r[0].concat(r[1]); });
    }
    function scambioOn() { try { return localStorage.getItem('mappai_studente_scambio') !== '0' && !!window.MappAIStudenteScambio; } catch (e) { return false; } }
    function schema() {
        return C().schema({ vaults: st.vaults, sel: st.sel, sessioni: st.sessioni, materiali: st.materiali, chiusi: st.chiusi, t: window.t, scambio: scambioOn(),
            ipad: !!(window.MappAIStudenteFS && window.MappAIStudenteFS.provider === 'ipad') });
    }
    function briciole() {
        var CM = window.MappAIConsoleManifesto;
        if (!CM || !CM.briciole) return;
        try { CM.briciole(C().briciole({ vaults: st.vaults, sel: st.sel, t: window.t })); } catch (e) { }
    }
    function scegli(fullPath, ridisegna) {
        st.sel = fullPath;
        try { localStorage.setItem('mappai_studente_sel', fullPath); } catch (e) { }
        st.sessioni = []; st.materiali = null;
        ridisegna(schema()); briciole();
        Promise.all([leggiSessioni(fullPath), leggiMateriali(fullPath)]).then(function (r) {
            if (st.sel === fullPath) { st.sessioni = r[0]; st.materiali = r[1]; ridisegna(schema()); briciole(); }
        });
    }

    /* ── la mappa ──────────────────────────────────────────────────────────
       Se il vault scelto è già a schermo (rientro da «Torna a STUDIA») si
       mostra e basta; altrimenti si carica come fa INSEGNA (`directLoadVault`:
       adotta l'identità, applica vista.json, monta il canvas). */
    /* `conScheda` (4/10): un DOSSIER non si guarda come mappa. Dal 5/10 al posto della
       mappa c'è la sua FOTO (documenti.js › mostraFoto, la vista della LIM) e la scheda si
       apre nel pannello accanto (apriScheda); Flashcard e Prova le stanno sopra. Chi apre
       subito un altro documento (sintesi, materiali) passa `false`: la scheda verrebbe
       disegnata per niente. Una mappa vera toglie la foto di un dossier aperto prima. */
    function apriMappa(fullPath, conScheda) {
        return _apriMappa(fullPath).then(function (ok) {
            var D = window.MappAIStudenteDocumenti;
            if (ok && D && D.dossier && D.dossier()) {
                /* la sidebar della mappa sta FUORI dal riquadro che la foto copre, e il caricamento
                   la riapre dopo: si chiude come fa `assetto` per le mappe (60 ms), più un giro */
                var M = window.MappAIStudenteMappa;
                if (M && M.nascondiSidebar) [60, 400].forEach(function (ms) { setTimeout(M.nascondiSidebar, ms); });
                return (D.mostraFoto ? D.mostraFoto(fullPath) : Promise.resolve()).then(function () {
                    return (conScheda === false || !D.apriScheda) ? ok : D.apriScheda(fullPath).then(function () { return ok; });
                });
            }
            if (D && D.togliFoto) D.togliFoto();
            /* la mappa si presenta sempre allo stesso modo: sidebar chiusa, vista Albero,
               e in split il disegno per il verso del tablet (studente/mappa.js) */
            if (ok && window.MappAIStudenteMappa) setTimeout(function () { window.MappAIStudenteMappa.assetto(); }, 60);
            return ok;
        });
    }
    function _apriMappa(fullPath) {
        var s = S();
        if (s && s.activeVaultPath === fullPath && s.db && s.db.nodes && s.db.nodes.length) {
            if (window.switchToMapLayout) window.switchToMapLayout();
            return Promise.resolve(true);
        }
        if (!window.directLoadVault) return Promise.resolve(false);
        return Promise.resolve(window.directLoadVault(fullPath)).then(function () {
            return !!(S() && S().activeVaultPath === fullPath);
        });
    }

    /* ── le flashcard: un mazzo solo parte diretto, più mazzi si scelgono ── */
    function apriFlashcard(fullPath) {
        return apriMappa(fullPath).then(function (ok) {
            if (!ok) return;
            var sets = ((S().db || {}).studySets || []).filter(function (x) { return x && x.mode === 'flashcard' && x.items && x.items.length; });
            if (!sets.length) { toast(t('st_no_flash', 'Questa mappa non porta mazzi di flashcard.'), 'warning'); return; }
            if (sets.length === 1) { window.loadStudySet(sets[0].id); return; }
            return window.MappAIModal.open({
                titolo: t('st_quale_mazzo', 'Quale mazzo?'), icona: 'copy', taglia: 'm',
                sezioni: [{ voci: sets.map(function (x) { return { id: x.id, etichetta: x.title || 'Flashcard', sotto: x.items.length + ' ' + t('st_carte', 'carte'), icona: 'copy' }; }) }],
                azioni: [{ id: 'annulla', etichetta: t('mm_annulla', 'Annulla'), ruolo: 'quieto' }]
            }).then(function (r) {
                if (r && r.azione && r.azione !== 'annulla' && sets.some(function (x) { return x.id === r.azione; })) window.loadStudySet(r.azione);
            });
        });
    }

    function apri() {
        if (st.aperta || !window.MappAIModal) return;
        st.aperta = true;
        var s = schema();
        rid = null;
        /* le briciole (`mappai-briciola`): «Studia» e la materia riportano alla pagina senza
           progetto scelto — non c'è una pagina della materia, la lista è già lì a sinistra */
        function suBriciola() {
            st.sel = ''; st.sessioni = [];
            try { localStorage.removeItem('mappai_studente_sel'); } catch (e) { }
            if (rid) { rid(schema()); briciole(); }
        }
        document.addEventListener('mappai-briciola', suBriciola);
        s.suApertura = function (box, ridisegna) {
            rid = ridisegna;
            leggi().then(function () {
                ridisegna(schema()); briciole();
                if (st.sel) Promise.all([leggiSessioni(st.sel), leggiMateriali(st.sel)]).then(function (r) { st.sessioni = r[0]; st.materiali = r[1]; ridisegna(schema()); briciole(); });
            });
        };
        s.suAzione = function (ev, box, ridisegna) {
            var a = ev && ev.azione || '';
            if (a === '__gruppo') { st.chiusi[String(ev.voce || '').replace(/^g:/, '')] = !!ev.chiuso; return; }
            if (a === '__nav') { if (/^v:/.test(ev.voce || '')) scegli(String(ev.voce).slice(2), ridisegna); return; }
            if (a === '__esc') return false;                     /* la home non si chiude con ESC */
            if (a === 'apri-cartella') {
                window.electronAPI.pickFolder().then(function (r) {
                    if (!r || r.canceled) return;
                    leggi().then(function () { scegli(r.folderPath, ridisegna); });
                });
                return;
            }
            if (a === 'nessuno') { toast(t('st_nessun_vault_toast', 'Apri una cartella con il bottone in basso.'), 'info'); return; }
            /* lo scambio col docente (7/9): il modale sopra la console; «invia» dalla riga della prova */
            if (a === 'docente' && window.MappAIStudenteScambio) { window.MappAIStudenteScambio.apri(st.sel); return; }
            if (/^invia:/.test(a) && window.MappAIStudenteScambio) { window.MappAIStudenteScambio.inviaProva(st.sel, a.slice(6)); return; }
            if (/^(stampa|cartella|apri):/.test(a) && window.MappAIStudenteDocumenti) { window.MappAIStudenteDocumenti.azione(a, st.sel, st.sessioni); return; }
        };
        var scelto = st.sel;
        window.MappAIModal.open(s).then(function (r) {
            document.removeEventListener('mappai-briciola', suBriciola);
            st.aperta = false;
            scelto = st.sel || scelto;
            var a = r && r.azione;
            if ((a === 'mappa' || a === 'scheda') && scelto) return apriMappa(scelto);
            if (a === 'flashcard' && scelto) return apriFlashcard(scelto);
            /* «Prova»: la mappa sotto, poi il launcher dello studente (autotest, viste, strumenti) */
            if (a === 'prova' && scelto) return apriMappa(scelto).then(function (ok) { if (ok && window.ActiveStudy) window.ActiveStudy.openLauncher(); });
            /* «Sintesi»: la stessa strada di un materiale, ma il file lo trova il core */
            if (a === 'sintesi' && scelto) {
                var sin = C().trovaSintesi(st.materiali);
                if (!sin) { toast(t('st_sintesi_manca_toast', 'Questa mappa non porta una sintesi: il docente non l\'ha pubblicata.'), 'info'); setTimeout(apri, 50); return; }
                return apriMappa(scelto, false).then(function (ok) { if (ok && window.MappAIStudenteDocumenti) window.MappAIStudenteDocumenti.apriFile(scelto, sin.relPath, sin.name); });
            }
            /* un materiale dalla console: la mappa sotto, il documento nel dock accanto */
            if (/^mat:/.test(a) && scelto) {
                var rel = a.slice(4), nome = rel.split('/').pop();
                return apriMappa(scelto, false).then(function (ok) { if (ok && window.MappAIStudenteDocumenti) window.MappAIStudenteDocumenti.apriFile(scelto, rel, nome); });
            }
            /* chiusa dal pallino: se sotto c'è una mappa la si mostra, altrimenti si riapre */
            var ss = S();
            if (ss && ss.db && ss.db.nodes && ss.db.nodes.length && window.switchToMapLayout) { window.switchToMapLayout(); return; }
            setTimeout(apri, 50);
        });
    }

    /* «Torna a STUDIA» dal menu della mappa: vista.json e poi la console —
       niente `location.reload()` (è la strada di `backToLanding`, che qui
       riaprirebbe la mappa da sola e farebbe perdere la scelta) */
    function torna() {
        var s = S();
        var salva = Promise.resolve();
        if (s && s.activeVaultPath && window.buildVaultMapData && window.electronAPI.saveVault) {
            try {
                if (window.MappAIStudioView && s.layoutMode === 'studio') { window.MappAIStudioView.exit(); s.layoutMode = 'default'; }
                if (typeof StorageManager !== 'undefined' && StorageManager.saveCurrentProject) StorageManager.saveCurrentProject();
                salva = Promise.race([
                    window.electronAPI.saveVault({ folderPath: s.activeVaultPath, mapData: window.buildVaultMapData() }),
                    new Promise(function (r) { setTimeout(r, 3000); })
                ]);
            } catch (e) { }
        }
        if (window.MappAIStudenteDocumenti) window.MappAIStudenteDocumenti.chiudi();
        salva.then(apri, apri);
    }

    function avvio() {
        /* la landing di MappAI è vuota qui: la console è il primo disegno */
        setTimeout(apri, 30);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', avvio); else avvio();

    /* dopo una ricezione: rilegge le cartelle e si mette sulla mappa arrivata (la console è aperta sotto il modale) */
    function ricarica(fullPath) {
        return leggi().then(function () {
            if (!rid) return;
            var c = (st.vaults || []).filter(function (v) { return v.fullPath === fullPath; })[0];
            if (c) scegli(fullPath, rid); else { ridisegna_(); }
        });
    }
    function ridisegna_() { if (rid) { rid(schema()); briciole(); } }
    window.MappAIStudente = { apri: apri, torna: torna, apriMappa: apriMappa, apriFlashcard: apriFlashcard, ricarica: ricarica, stato: st };
}());
