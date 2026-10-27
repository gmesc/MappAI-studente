/*
 * studente/flashcard.js — le flashcard nel pannello accanto alla mappa
 * ---------------------------------------------------------------------------
 * Packet 0128 (Giacomo, 26/10): «Porta le flashcard nello split in cui vivono i
 * materiali di studio, lo split della mappa con le flashcard rimane collassato e
 * può essere aperto dallo user tramite la maniglia. Anche le flashcard devono
 * avere il bottone 'STAMPA/PDF' nella barra» («PDF», per coerenza).
 *
 * Il player è quello di MappAI (`mappai-study-session.js`, copiato): lavora per
 * id, quindi dovunque stiano i suoi elementi il giro è lo stesso — carta, «Clicca
 * per girare», 😩 🤔 😎, riepilogo, e la sessione registrata sul bus per il
 * docente. Qui `#study-player-modal` si SPOSTA nel corpo del pannello (studente/
 * documenti.js › apri) e torna in `body` quando il pannello si libera
 * (`corpo.__pulisci`). Tre avvolgimenti, una volta sola:
 *   · loadStudySet    un mazzo di flashcard si apre nel pannello (la tessera
 *                     «Flashcard» della console e le righe della sidebar «Studio»);
 *                     un quiz passa al player di prima;
 *   · closeStudyPlayer «Torna alla Mappa» chiude il pannello;
 *   · printFlashcardSet la stampante della sidebar fa lo stesso «PDF» della barra
 *                     (prima `window.open` → «Popup bloccato» sull'iPad).
 * Il «PDF»: il generatore del docente (`printFlashcardSheet`, `toDisk`) e il menu di
 * stampa di iOS (`stampaPdfB64`), come il foglio dei nodi.
 * ⚠️ Allargamento 13 (Giacomo, 27/10): «Su iPad le flashcard sono stampabili solo dalla tabella flashcard presente
 * nella home del progetto» — il pannello non ha più «PDF» e la stampante della riga della sidebar è nascosta
 * (studente.css); `pdf` resta, senza un bottone, finché non c'è il formato nuovo (A5 piegato in carte A6, da
 * costruire). Dopo l'ultima carta la barra mostrava «Finito», che scriveva il report delle scelte (flashcard-core ›
 * reportScelte) in «Le tue prove» e lo apriva nel pannello. ⚠️ Allargamento 21 (Giacomo, 27/10): la fine è quella
 * degli altri materiali — il report si scrive da solo dopo l'ultima carta, il pannello mostra 🎉 e «Hai finito!» con
 * il riquadro delle tre scelte, e il 💾 lo apre; «Finito» non c'è più. Interruttore
 * `mappai_studente_flashcard_pannello` (acceso salvo '0': il player a tutto schermo).
 * La parte pura è in flashcard-core.js.
 */
(function () {
    'use strict';
    if (window.MappAIStudenteFlashcard) return;

    function t(k, f) { try { return (window.t ? window.t(k, f) : f) || f; } catch (e) { return f; } }
    function toast(m, k) { if (window.showToast) window.showToast(m, k || 'info'); }
    function S() { try { return (typeof appState !== 'undefined') ? appState : window.appState; } catch (e) { return window.appState; } }
    function C() { return window.MappAIStudenteFlashcardCore; }
    function D() { return window.MappAIStudenteDocumenti; }
    function attivo() { try { return localStorage.getItem('mappai_studente_flashcard_pannello') !== '0'; } catch (e) { return true; } }
    function setDi(id) { return (((S() || {}).db || {}).studySets || []).filter(function (x) { return x && x.id === id; })[0] || null; }

    var corrente = null;   // { conta, oss, host, modal, set, fine } del mazzo nel pannello

    /* il contatore nella barra della × (regola dello 0126): la carta corrente; a riepilogo raggiunto, niente — e la fine */
    function aggiorna() {
        if (!corrente || !corrente.conta) return;
        var sum = document.getElementById('study-summary-view');
        var fine = sum && !sum.classList.contains('hidden');
        corrente.conta.textContent = fine ? '' : C().contatore(window.currentStudyItemIndex | 0, (window.activeStudySessionItems || []).length, t);
        if (fine) mostraFine();
    }

    /* il report delle scelte (allargamento 13), scritto come quello della scelta multipla: risponde { ok, rel, nomeFile }
       o { ok: false, error }, mai un rifiuto */
    function scrivi(set) {
        var s = S(), A = window.MappAIStudenteAutotest, items = window.activeStudySessionItems, res = window.studyResults;
        if (!s || !s.activeVaultPath || !A || !A.scriviReport || !items || !items.length || !res) {
            return Promise.resolve({ ok: false, error: t('st_fc_report_no', 'Il report non si può scrivere qui.') });
        }
        var sec = window.studySeconds || 0, durata = String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0');
        var titolo = (set && set.title) || t('st_flashcard', 'Flashcard');
        var rep = C().reportScelte(items, res, { mappa: s.rootNodeLabel || '', titolo: titolo, data: C().fmtData(new Date()), durata: durata, chi: t('st_io', 'Io') }, window.t);
        return Promise.resolve(A.scriviReport(rep, titolo, '', (set && set.angle) || '', { tipo: 'Flashcard', attivita: 'flashcard' }))
            .then(function (r) { return r || { ok: false }; }, function (e) { return { ok: false, error: (e && e.message) || '' }; });
    }

    /* LA FINE COME GLI ALTRI MATERIALI (0128, allargamento 21; Giacomo, 27/10: «il report delle flashcard deve aver lo
       stesso layout degli altri materiali, quindi l'emoji con sotto il testo 'Hai finito!', con i colori dei font uguali e
       anche il resto del layout»; le sue scelte: «Come gli altri», «Le tre scelte»). Dopo l'ultima carta il report si
       scrive da solo e il pannello mostra la chiusura della scelta multipla e delle domande aperte
       (mappai-scelta-view › mostraEsito: 🎉, «Hai finito!» al 70% del pannello, il riquadro e il 💾, che aspetta la
       scrittura e apre il report); il riquadro dice le tre scelte al posto di «Risposte: n / N». */
    function mostraFine() {
        var c = corrente, SV = window.MappAISceltaView;
        if (!c || c.fine || !c.host || !SV || typeof SV.mostraEsito !== 'function') return;
        var s = S() || {}, items = window.activeStudySessionItems || [], res = window.studyResults;
        var box = document.createElement('div'); box.className = 'sd-fc-fine';
        c.fine = box;
        var scrittura = scrivi(c.set);
        nascondiPlayer(c.modal);
        c.host.appendChild(box);
        SV.mostraEsito(box, {
            t: window.t, cfg: { semplice: true }, profilo: { righe: [], conteggio: {} }, titoloLargo: 0.7,
            onSalva: function () {
                scrittura.then(function (r) {
                    if (!r.ok) { toast(t('st_report_ko', 'Report non salvato: ') + (r.error || ''), 'error'); return; }
                    D().apriFile(s.activeVaultPath, r.rel + '/report.html', r.nomeFile || r.rel.split('/').pop(), { titoloBarra: C().titoloReport({ mappa: s.rootNodeLabel || '', t: window.t }) });
                });
            }
        });
        var rq = box.querySelector('.sc-fine__recap'), p = box.querySelector('.sc-fine > p');
        if (rq) rq.textContent = C().riquadroScelte(items, res);
        if (p) p.textContent = t('st_fc_fine_d', 'Il 💾 apre il report delle tue scelte.');
        scrittura.then(function (r) {
            toast(r.ok ? t('st_fc_report_ok', 'Report delle flashcard salvato in «Le tue prove»') : t('st_report_ko', 'Report non salvato: ') + (r.error || ''), r.ok ? 'success' : 'error');
        });
    }

    /* il player si chiude subito, senza i 200 ms dell'animazione di closeStudyPlayer: un mazzo aperto subito dopo
       verrebbe nascosto dal timer del primo */
    function nascondiPlayer(modal) {
        if (window.studyTimerInterval) clearInterval(window.studyTimerInterval);
        modal.classList.add('hidden', 'opacity-0');
        modal.classList.remove('flex');
    }

    function apri(id, orig) {
        var set = setDi(id), modal = document.getElementById('study-player-modal');
        if (!attivo() || !set || set.mode !== 'flashcard' || !modal || !D() || !C()) return orig(id);
        D().apri({
            titolo: set.title || t('st_flashcard', 'Flashcard'),
            mappaChiusa: true,
            contatore: true,
            monta: function (host, conta) {
                host.appendChild(modal);
                modal.classList.add('sd-player');
                var oss = new MutationObserver(aggiorna);
                oss.observe(modal, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['class'] });
                corrente = { conta: conta, oss: oss, host: host, modal: modal, set: set, fine: null };
                host.__pulisci = function () {
                    var c = corrente;
                    if (c && c.fine && c.fine.parentNode) c.fine.parentNode.removeChild(c.fine);
                    oss.disconnect();
                    corrente = null;
                    nascondiPlayer(modal);
                    modal.classList.remove('sd-player');
                    document.body.appendChild(modal);
                };
            }
        });
        var r = orig(id);
        aggiorna();
        return r;
    }

    /* «PDF»: prima il pieghevole vero (`toDisk`), per sapere se ha dovuto rimpicciolire delle carte; la scelta lo dice
       e propone il fronte e retro (Giacomo, 27/10); poi il file al menu di stampa di iOS col nome dello 0126 */
    function pdf(set) {
        var s = S() || {}, SC = window.MappAIStudiaCore, progetto = s.rootNodeLabel || '';
        if (typeof window.printFlashcardSheet !== 'function' || !C() || !D() || !window.MappAIModal) {
            toast(t('st_fc_no_stampa', 'La stampa delle flashcard non è disponibile.'), 'error'); return;
        }
        var pref; try { pref = C().leggiPref(localStorage.getItem(C().PREF_KEY)); } catch (e) { pref = C().leggiPref(null); }
        toast(t('st_fc_preparo', 'Preparo il PDF…'), 'info');
        Promise.resolve(window.printFlashcardSheet(Object.assign(C().opzioni(set, { forma: 'piega', lato: pref.lato }, progetto), { toDisk: {} }))).then(function (piega) {
            var avviso = C().avvisoPiega(piega && piega.avvisi, t);
            return window.MappAIModal.open(C().schemaPdf(pref, t, avviso)).then(function (r) {
                var e = C().esito(r);
                if (!e) return;
                try { localStorage.setItem(C().PREF_KEY, C().scriviPref(e.pref)); } catch (x) { }
                if (e.azione === 'prova') {
                    return Promise.resolve(window.printFlashcardTestSheet({ fmt: '2x2v', lato: e.pref.lato, toDisk: {} }))
                        .then(function (r2) { return stampa(r2, C().nomeProva(SC, progetto, e.pref.lato)); });
                }
                var fatto = e.pref.forma === 'piega' ? Promise.resolve(piega)
                    : Promise.resolve(window.printFlashcardSheet(Object.assign(C().opzioni(set, e.pref, progetto), { toDisk: {} })));
                return fatto.then(function (r3) {
                    if (e.pref.forma === 'fronte-retro' && r3 && r3.avvisi && r3.avvisi.messaggio) toast(r3.avvisi.messaggio, 'warning');
                    return stampa(r3, C().nomeFile(SC, progetto, set));
                });
            });
        }).catch(function (err) { toast(t('st_fc_pdf_ko', 'PDF non creato: ') + ((err && err.message) || ''), 'error'); });
    }
    function stampa(r, nome) {
        if (!r || !r.ok || !r.base64) throw new Error((r && r.error) || t('st_fc_vuoto', 'nessun foglio'));
        return D().stampaPdfB64(r.base64, nome);
    }

    function aggancia() {
        var orig = window.loadStudySet;
        if (typeof orig !== 'function' || orig.__pannello) return;
        window.loadStudySet = function (id) { return apri(id, orig); };
        window.loadStudySet.__pannello = true;
        var chiudi = window.closeStudyPlayer;
        if (typeof chiudi === 'function') {
            window.closeStudyPlayer = function () {
                var m = document.getElementById('study-player-modal');
                if (corrente && m && m.closest && m.closest('#studente-dock')) { D().chiudi(); return; }
                return chiudi.apply(this, arguments);
            };
        }
        var stampaSet = window.printFlashcardSet;
        window.printFlashcardSet = function (id) {
            var set = setDi(id);
            if (!attivo() || !set || set.mode !== 'flashcard') return typeof stampaSet === 'function' ? stampaSet(id) : undefined;
            pdf(set);
        };
    }
    aggancia();

    window.MappAIStudenteFlashcard = { apri: function (id) { return window.loadStudySet(id); }, pdf: pdf, aggancia: aggancia };
}());
