/*
 * studente/cabina.js — la Cabina dello studente: il carattere e la guida
 * ---------------------------------------------------------------------------
 * Il pallino nella testata delle console (veste manifesto) chiama
 * `window.openCabina`: in MappAI apre la Cabina del docente (profilo, classi,
 * cartelle, AI…), che qui non c'è. La Cabina dello studente mostra poche cose:
 * il CARATTERE (i quattro di MappAI, `MappAIFont.imposta` — stessa chiave
 * `mappai_font_app`) e la GUIDA all'app (`guida/index.html`, scritta per uno
 * studente di 11-12 anni, aperta in un modale a schermo largo).
 */
(function () {
    'use strict';
    if (window.MappAIStudenteCabina) return;

    function t(k, f) { try { return (window.t ? window.t(k, f) : f) || f; } catch (e) { return f; } }
    function MM() { return window.MappAIModal; }
    function esc(x) { var d = document.createElement('div'); d.textContent = x == null ? '' : String(x); return d.innerHTML; }

    function caratteri() {
        var F = window.MappAIFont; if (!F || !F.elenco) return [];
        return F.elenco().map(function (f) { return { valore: f.id, etichetta: f.nome || f.label || f.etichetta || f.id }; });
    }
    function apri() {
        var F = window.MappAIFont;
        var attivo = (F && F.attivo) ? F.attivo() : '';
        var lista = caratteri();
        var sezioni = [];
        if (lista.length) {
            sezioni.push({ id: 'carattere', titolo: t('cb_carattere', 'Carattere'), campi: [
                { id: 'font', tipo: 'scelta', etichetta: t('cb_font', 'Il carattere dell\'app'), opzioni: lista, valore: attivo,
                  aiuto: t('cb_font_aiuto', 'Vale per la mappa, le prove e i fogli. Se leggere ti stanca, prova TM Sans o Atkinson.') }
            ] });
        }
        sezioni.push({ id: 'aiuto', titolo: t('cb_guida_t', 'Aiuto'), voci: [
            { id: 'guida', etichetta: t('cb_guida', 'Come si usa MappAI studente'), sotto: t('cb_guida_sotto', 'la guida, passo per passo'), icona: 'book-open' }
        ] });
        return MM().open({
            titolo: t('cb_titolo', 'Cabina'), sottotitolo: t('cb_sub', 'Il carattere e la guida'),
            icona: 'sliders-horizontal', taglia: 'm', veloChiude: true,
            sezioni: sezioni,
            azioni: [
                { id: 'chiudi', etichetta: t('mm_chiudi', 'Chiudi'), ruolo: 'quieto' },
                { id: 'applica', etichetta: t('cb_applica', 'Applica'), ruolo: 'primario' }
            ]
        }).then(function (r) {
            if (!r) return;
            if (r.azione === 'guida') return guida();
            if (r.azione === 'applica' && F && F.imposta && r.valori && r.valori.font) {
                F.imposta(r.valori.font);
                if (window.showToast) window.showToast(t('cb_font_ok', 'Carattere cambiato'), 'success');
            }
        });
    }
    /* la guida: un modale largo con la pagina dentro (è HTML nostro, stessa origine) */
    function guida() {
        var host = null;
        return MM().open({
            titolo: t('cb_guida', 'Come si usa MappAI studente'), icona: 'book-open', taglia: 'xl', veloChiude: true,
            sezioni: [{ id: 'g', nuda: true }],
            azioni: [{ id: 'chiudi', etichetta: t('mm_chiudi', 'Chiudi'), ruolo: 'primario' }],
            suApertura: function (box) {
                host = box.querySelector('[data-sez="g"] .mm-sez__c'); if (!host) return;
                host.style.height = '74vh'; host.style.padding = '0';
                host.innerHTML = '<iframe src="guida/index.html" title="' + esc(t('cb_guida', 'Come si usa MappAI studente')) + '" style="width:100%;height:100%;border:0;display:block;background:#fff"></iframe>';
            }
        });
    }

    window.openCabina = apri;
    window.MappAIStudenteCabina = { apri: apri, guida: guida };
}());
