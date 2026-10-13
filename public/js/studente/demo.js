/*
 * studente/demo.js — il vault dimostrativo che l'app porta con sé
 * ---------------------------------------------------------------------------
 * Chi apre MappAI studente senza aver ricevuto niente dal docente (il revisore
 * dell'App Store, un ragazzo curioso) vedrebbe una pagina vuota. Al PRIMO avvio,
 * se in Documenti non c'è nessuna mappa, l'app scrive lì «La carta» (2A ·
 * Storia) e «Sistema Albero» (1A · Scienze): vault veri, generati da MappAI re, impacchettati in
 * `demo/vault.json` da `npm run demo` (solo i file che `relVaultStudente`
 * ammette). Una volta sola: `mappai_studente_demo='1'`; chi lo cancella da File
 * non lo rivede. Kill-switch `mappai_studente_demo='0'` prima del primo avvio.
 */
(function () {
    'use strict';
    if (window.MappAIStudenteDemo) return;
    var K = 'mappai_studente_demo', fatto = null;
    function assicura() {
        if (fatto) return fatto;
        fatto = Promise.resolve().then(function () {
            var st = ''; try { st = localStorage.getItem(K) || ''; } catch (e) { }
            if (st === '1' || st === '0') return false;
            return window.electronAPI.getAllVaults().then(function (v) {
                if (v && v.length) { try { localStorage.setItem(K, '1'); } catch (e) { } return false; }
                return fetch('demo/vault.json').then(function (r) { return r.ok ? r.json() : null; }).then(function (lista) {
                    if (!lista || !lista.length) return false;
                    return window.MappAIStudenteFS.importa(lista).then(function () {
                        try { localStorage.setItem(K, '1'); } catch (e) { }
                        if (window.showToast) window.showToast('Ci sono due mappe di prova: «La carta» e «Sistema Albero». Le tue arriveranno dal docente.', 'info');
                        return true;
                    });
                });
            });
        }).catch(function () { return false; });
        return fatto;
    }
    window.MappAIStudenteDemo = { assicura: assicura };
}());
