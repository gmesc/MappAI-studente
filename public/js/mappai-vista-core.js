/*
 * mappai-vista-core.js — la VISTA di una mappa viaggia col suo vault (15/8/26)
 * ---------------------------------------------------------------------------
 * Quattro cose vivevano SOLO nello snapshot in localStorage: il profilo della
 * Vista studio, il focus/lenti, la timeline e il foglio dei nodi rivisto.
 * Misurato su un foglio vero (Project E, 251 KB): il 99% del foglio è una
 * fotocopia di ciò che il vault ha già — e il pezzo insostituibile pesa
 * QUALCHE KB. Conseguenza: aprire lo stesso vault su un altro computer (o dopo
 * una pulizia del browser interno) perdeva quelle quattro cose in silenzio.
 *
 * Questo core dice CHE COSA entra in `vista.json` e come si riapplica:
 *   - `raccogli(stato)`  → l'oggetto da scrivere nel vault (o null se vuoto);
 *   - `applica(stato, vista)` → riporta la vista dentro lo stato caricato.
 * L'I/O non sta qui (invariante 19): scrive main.js, monta vault-io.
 *
 * Regola di fusione, ed è la parte che conta: `applica` NON azzera mai ciò che
 * lo stato ha già quando la vista non porta quel campo — un vault vecchio
 * senza vista.json non deve cancellare la timeline appena costruita in
 * memoria. E `raccogli` non scrive un file per dire «tutto vuoto»: null.
 *
 * UMD puro, testato in Node (tests/vista-core.test.js). Schema versionato:
 * `mappai-vista@1` — chi leggerà una v2 saprà di doverla capire prima.
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.MappAIVistaCore = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var SCHEMA = 'mappai-vista@1';

    function _pieno(v) {
        if (v == null) return false;
        if (Array.isArray(v)) return v.length > 0;
        if (typeof v === 'object') return Object.keys(v).length > 0;
        return String(v).trim() !== '';
    }

    /* Dallo stato dell'app all'oggetto per vista.json. `stato` è appState (o
       un suo pari di prova); si legge, mai si modifica. */
    function raccogli(stato) {
        if (!stato) return null;
        var db = stato.db || {};
        var out = { schema: SCHEMA, salvato: null };
        var qualcosa = false;
        if (_pieno(stato.studioProfile)) { out.studioProfile = stato.studioProfile; qualcosa = true; }
        if (_pieno(stato.focusTopic)) { out.focusTopic = String(stato.focusTopic); qualcosa = true; }
        if (_pieno(stato.semanticGuidance)) { out.semanticGuidance = String(stato.semanticGuidance); qualcosa = true; }
        if (_pieno(db.timelineEvents)) { out.timelineEvents = db.timelineEvents; qualcosa = true; }
        if (_pieno(db.timelineAI)) { out.timelineAI = db.timelineAI; qualcosa = true; }
        if (_pieno(db.nodeSheet)) { out.nodeSheet = db.nodeSheet; qualcosa = true; }
        return qualcosa ? out : null;
    }

    /* Dalla vista letta dal vault allo stato appena caricato. Ritorna l'elenco
       dei campi applicati (serve ai log e ai test, non alla UI). */
    function applica(stato, vista) {
        var applicati = [];
        if (!stato || !vista || typeof vista !== 'object') return applicati;
        /* schema sconosciuto = scritto da una MappAI più nuova: meglio non
           applicare niente che applicare a metà */
        if (vista.schema && vista.schema !== SCHEMA) return applicati;
        if (!stato.db || typeof stato.db !== 'object') stato.db = {};
        if (_pieno(vista.studioProfile)) { stato.studioProfile = vista.studioProfile; applicati.push('studioProfile'); }
        if (_pieno(vista.focusTopic)) { stato.focusTopic = String(vista.focusTopic); applicati.push('focusTopic'); }
        if (_pieno(vista.semanticGuidance)) { stato.semanticGuidance = String(vista.semanticGuidance); applicati.push('semanticGuidance'); }
        if (_pieno(vista.timelineEvents)) { stato.db.timelineEvents = vista.timelineEvents; applicati.push('timelineEvents'); }
        if (_pieno(vista.timelineAI)) { stato.db.timelineAI = vista.timelineAI; applicati.push('timelineAI'); }
        if (_pieno(vista.nodeSheet)) { stato.db.nodeSheet = vista.nodeSheet; applicati.push('nodeSheet'); }
        return applicati;
    }

    /* ── IL CASSETTO TIENE SOLO CIÒ CHE NON È GIÀ SUL DISCO (0076, ADR 0018) ──
       Il progetto si salvava intero: dentro la copia di localStorage c'erano il
       manifesto della pipeline (la copia di `pipeline.json`), l'indice delle
       evidenze, i rapporti del giudice e la foto del dossier — misurato sui
       dossier veri del gate 0069: 650-1650 KB ciascuno, e il cassetto pieno.
       A interruttore acceso (`opts.snello`, lo passa `saveCurrentProject` con
       `mappai_cassetto_snello` = '1') e SOLO per un progetto con una cartella
       (senza cartella il cassetto è l'unica copia) la copia perde:
         · `_pipelineManifest`: lo rilegge dal disco `loadProject`, che lo
           sostituisce sempre. Al suo posto `_pipelineSegnale`
           { presente, revisione, stato } — MAI sotto la chiave del manifesto:
           la pipeline userebbe qualunque valore vero come manifesto;
         · `_evidenze`: nella cartella, e si rilegge (mappai-evidence.js);
         · la FONTE-FOTO il cui dossier è già PARTITO («fuori se già partita»,
           Giacomo, 05/10): scheda e foto sono in `pipeline.json` e in
           `Allegati/`. Una foto il cui dossier non è partito resta INTERA:
           nessun altro posto la tiene, e una scheda senza foto sarebbe «pronta»
           in CREA e farebbe un dossier senza foto.
       La regola: esce solo ciò che è sul disco E viene riletto. Restano quindi
       `_reviewRevision`, `_reviewCommit`, `db`, l'identità, i cinque rapporti
       del giudice (`qualita.json` si scrive e basta: nessuno lo rilegge —
       scelta di Giacomo, 05/10, «Restano») e il testo delle fonti
       (`sources[].content`, `_pdfPagine`, `_generationSources`: il §4.3 del
       packet non lo prova sul disco per ogni tipo di fonte).
       Lo stato vivo non si tocca mai: si cambia la copia, e solo nei rami che
       cambiano (l'oggetto in cima, l'elenco delle fonti). */
    function _riga(x) { return String(x == null ? '' : x).replace(/\s+/g, ' ').trim(); }
    function _oggetto(x) { return !!x && typeof x === 'object' && !Array.isArray(x); }

    /* La scheda di una fonte è quella del dossier partito? Stesso oggetto, oppure
       stessi `nomeFile` e `titolo`, tutti e due non vuoti, a spazi normalizzati —
       come `fontePerScheda` di CREA (mappai-crea-iconografica-core.js), che qui
       non si carica: la config di `Pipeline.run` è una copia JSON, l'identità da
       sola non regge. Più stretta di quella: niente ripiego sul solo nome del
       file. Nel dubbio la fonte resta. */
    function schedaPartita(scheda, dossier) {
        if (!_oggetto(scheda) || !_oggetto(dossier)) return false;
        if (scheda === dossier) return true;
        var nome = _riga(dossier.nomeFile), titolo = _riga(dossier.titolo);
        if (!nome || !titolo) return false;
        return _riga(scheda.nomeFile) === nome && _riga(scheda.titolo) === titolo;
    }

    function _segnale(m) {
        if (!_oggetto(m)) return { presente: false, revisione: null, stato: null };
        var r = _oggetto(m.review) ? m.review : null;
        return {
            presente: true,
            revisione: r ? (r.approvedRevision || r.baseRevision || null) : null,
            stato: (r && _oggetto(r.initial) && r.initial.status) || null
        };
    }

    /* Lo SNAPSHOT SNELLO (parte del medesimo lavoro): dopo il disegno D3 ogni
       arco porta dentro l'INTERO nodo di partenza e di arrivo, e il foglio in
       localStorage si gonfia (misurato: 120 KB di link per 8,8 KB di dati).
       Qui i link tornano coppie di id. Copia superficiale: lo stato vivo non
       si tocca. `opts.snello`: la regola del cassetto qui sopra (0076). */
    function statoSnello(stato, opts) {
        if (!stato) return stato;
        var db = stato.db || {};
        var links = (db.links || []).map(function (l) {
            var s = Object.assign({}, l);
            if (s.source && typeof s.source === 'object') s.source = s.source.id;
            if (s.target && typeof s.target === 'object') s.target = s.target.id;
            /* i campi che D3 rimette da sé a ogni disegno */
            delete s.index;
            return s;
        });
        /* anche i nodi si portano dietro le coordinate di lavoro di D3 (vx/vy,
           fx/fy null espliciti): innocue ma inutili — restano, toglierle
           cambierebbe il comportamento del pin. Si tolgono solo i link. */
        var out = Object.assign({}, stato, { db: Object.assign({}, db, { links: links }) });
        if (!(opts && opts.snello === true) || !stato.activeVaultPath) return out;

        var m = stato._pipelineManifest;
        /* una copia già snella (letta dal cassetto, senza la chiave del
           manifesto) tiene il segnale che ha; altrimenti il segnale lo dice il
           manifesto, anche quando è null («nessuna pipeline») */
        if (!('_pipelineManifest' in stato) && _oggetto(stato._pipelineSegnale)) out._pipelineSegnale = stato._pipelineSegnale;
        else out._pipelineSegnale = _segnale(m);
        delete out._pipelineManifest;
        delete out._evidenze;

        var dossier = _oggetto(m) && _oggetto(m.config) ? m.config.dossier : null;
        if (dossier && Array.isArray(stato.sources)) {
            out.sources = stato.sources.filter(function (x) {
                return !(x && _oggetto(x._scheda) && schedaPartita(x._scheda, dossier));
            });
        }
        return out;
    }

    /* La stessa regola su una copia GIÀ nel cassetto (letta e parsata da chi
       chiama): lì il manifesto è nella copia stessa. Per «Libera spazio». Un
       residuo (qui sotto) è già il minimo: si lascia com'è. */
    function snelloDaVoce(voce) {
        if (_oggetto(voce) && _oggetto(voce._residuo)) return voce;
        return statoSnello(voce, { snello: true });
    }

    /* ── IL RESIDUO (0076, B1 rivisto: Giacomo, 05/10, «1 · Residuo») ──────────
       A cassetto pieno, appena la cartella è stata scritta, al posto della copia
       vecchia va il residuo: la copia snella di ADESSO meno ciò che la cartella
       porta E il caricamento rilegge. Provati: i nodi e i collegamenti (la
       cartella è la verità della mappa, inv. 7; `load-vault` li restituisce, e
       `loadProject` li rimette a posto dal percorso esatto). Ogni altro campo di
       `db` (sourcesDict, studySets, colori, timeline…) resta: non è provato
       campo per campo che faccia il giro intero. Il segno `_residuo` dice da
       quale cartella ripescare la mappa, col percorso ESATTO (una cartella può
       stare fuori da `Mappe/`), e quando. Senza `opts.cartella` vale il
       percorso della copia. Non si modifica la copia ricevuta. */
    var CAMPI_DALLA_CARTELLA = ['nodes', 'links'];
    function residuo(copia, opts) {
        if (!_oggetto(copia)) return copia;
        var o = opts || {};
        var db = Object.assign({}, copia.db || {});
        CAMPI_DALLA_CARTELLA.forEach(function (k) { delete db[k]; });
        return Object.assign({}, copia, {
            db: db,
            _residuo: { cartella: o.cartella || copia.activeVaultPath || null, quando: o.quando || null }
        });
    }

    /* Il piano di «Libera spazio» (Cabina › Gestione cartelle): quali copie si
       snelliscono e quanto si libera, PRIMA di farlo. Solo i progetti la cui
       riga d'indice dichiara una cartella (`vault`) e non porta il segno
       «superata», e, se chi chiama sa quali cartelle esistono, solo quelle:
       `esiste(p, voce)` riceve la riga E la copia letta, così chi chiama decide
       sul PERCORSO della copia (`voce.activeVaultPath`), non su un nome (gate 3,
       05/10: un elenco di nomi di primo livello erano le classi). La copia senza
       `activeVaultPath` la lascia com'è `statoSnello`. `leggi(id)` = il testo
       nel cassetto (o null); `salta` = { id: 1 } delle copie che la potatura
       toglie comunque. Pesi in caratteri, come il conto della Cabina.
       → { voci: [{ id, nome, prima, dopo, testo }], byte } */
    function pianoLiberaSpazio(progetti, leggi, salta, esiste) {
        var voci = [], byte = 0;
        (Array.isArray(progetti) ? progetti : []).forEach(function (p) {
            if (!p || !p.id || !p.vault || (salta && salta[p.id])) return;
            /* una riga «superata» porta l'impronta della copia (la sua lunghezza):
               riscritta, la riapertura non la riconoscerebbe più — resta com'è */
            if (p.superata) return;
            var testo = null, voce = null;
            try { testo = leggi(p.id); voce = testo ? JSON.parse(testo) : null; } catch (e) { voce = null; }
            if (!_oggetto(voce)) return;
            if (typeof esiste === 'function' && !esiste(p, voce)) return;
            var nuovo = JSON.stringify(snelloDaVoce(voce));
            if (nuovo.length >= testo.length) return;
            voci.push({ id: p.id, nome: p.name || '', prima: testo.length, dopo: nuovo.length, testo: nuovo });
            byte += testo.length - nuovo.length;
        });
        return { voci: voci, byte: byte };
    }

    return {
        SCHEMA: SCHEMA, raccogli: raccogli, applica: applica, statoSnello: statoSnello,
        snelloDaVoce: snelloDaVoce, schedaPartita: schedaPartita, pianoLiberaSpazio: pianoLiberaSpazio,
        residuo: residuo, CAMPI_DALLA_CARTELLA: CAMPI_DALLA_CARTELLA
    };
}));
