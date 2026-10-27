'use strict';
/*
 * Packet 0128 (lotto B) — le flashcard nel pannello dell'iPad: la parte pura.
 *
 * Giacomo, 26/10: «Porta le flashcard nello split in cui vivono i materiali di studio […] Anche le
 * flashcard devono avere il bottone 'STAMPA/PDF' nella barra, se possibile mantieni l'opzione per
 * stampare le flashcard in formato pieghevole oppure con i fogli fronte retro»; il bottone si chiama
 * «PDF» (gate dello 0126); il fronte/retro «Riapro e si rifinisce» (26/10); 27/10: «non troncare il
 * testo», «proponi la stampa delle flashcard fronte retro».
 */
const { test } = require('node:test');
const assert = require('node:assert');
const F = require('../public/js/studente/flashcard-core.js');
const SC = require('../public/js/studente/studia-core.js');
const Core = require('../public/js/mappai-modal-core.js');

const t = (k, f) => f;
const SET = { id: 's1', title: 'Sistema Albero — Flashcard', mode: 'flashcard', angle: 'auto', items: [{ front: 'Che cos\'è?', back: 'Una pianta.' }] };

test('contatore: «Carta n di N» dal numero della carta corrente (da zero)', () => {
    assert.strictEqual(F.contatore(0, 30, t), 'Carta 1 di 30');
    assert.strictEqual(F.contatore(29, 30, t), 'Carta 30 di 30');
    assert.strictEqual(F.contatore(0, 0, t), '', 'senza carte niente contatore');
    assert.strictEqual(F.contatore(3, 30), 'Carta 4 di 30', 'senza traduttore resta l\'italiano');
});

test('preferenza: di serie pieghevole e lato lungo; si legge anche rotta, si scrive pulita', () => {
    assert.strictEqual(F.PREF_KEY, 'mappai_studente_flashcard_pdf');
    assert.deepStrictEqual(F.leggiPref(null), { forma: 'piega', lato: 'lungo' });
    assert.deepStrictEqual(F.leggiPref('non è json'), { forma: 'piega', lato: 'lungo' });
    assert.deepStrictEqual(F.leggiPref('{"forma":"fronte-retro","lato":"corto"}'), { forma: 'fronte-retro', lato: 'corto' });
    assert.deepStrictEqual(F.leggiPref('{"forma":"x","lato":"y"}'), { forma: 'piega', lato: 'lungo' });
    assert.strictEqual(F.scriviPref({ forma: 'fronte-retro', lato: 'corto', altro: 1 }), '{"forma":"fronte-retro","lato":"corto"}');
});

test('opzioni del generatore: 2×2 in piedi; fronte e retro e lato solo se scelti', () => {
    const p = F.opzioni(SET, { forma: 'piega', lato: 'corto' }, 'Sistema Albero');
    assert.deepStrictEqual(p, { items: SET.items, title: 'Sistema Albero — Flashcard', mapName: 'Sistema Albero', fmt: '2x2v', backside: false, lato: 'corto' });
    assert.strictEqual(F.opzioni(SET, { forma: 'fronte-retro', lato: 'lungo' }, 'X').backside, true);
    assert.strictEqual(F.opzioni({ items: [] }, { forma: 'piega' }, '').title, 'Flashcard');
});

test('nomi dei file: «Progetto-Flashcard-angolo-data» (regola dello 0126) e il foglio di prova col suo lato', () => {
    const d = new Date(2026, 9, 27);
    assert.strictEqual(F.nomeFile(SC, 'Sistema Albero', SET, d), 'Sistema Albero-Flashcard-auto-27-10-2026');
    assert.strictEqual(F.nomeFile(SC, 'Sistema Albero', { angle: '' }, d), 'Sistema Albero-Flashcard-27-10-2026');
    assert.strictEqual(F.nomeProva(SC, 'Sistema Albero', 'corto', d), 'Sistema Albero-Foglio di prova-corto-27-10-2026');
});

test('la scelta «PDF delle flashcard»: due forme, due lati, foglio di prova; lo schema regge il motore', () => {
    const s = F.schemaPdf({ forma: 'fronte-retro', lato: 'corto' }, t, '');
    const v = Core.validaSchema(s);
    assert.ok(v.ok && !v.errori.length && !v.avvisi.length, 'nessun difetto per il motore dei modali: ' + JSON.stringify(v.errori.concat(v.avvisi)));
    const campi = s.sezioni.reduce((a, x) => a.concat(x.campi || []), []);
    const c = (id) => campi.find((x) => x.id === id);
    assert.strictEqual(c('forma-piega').valore, false);
    assert.strictEqual(c('forma-fr').valore, true);
    assert.strictEqual(c('lato-corto').valore, true);
    assert.strictEqual(c('forma-piega').gruppo, c('forma-fr').gruppo, 'le forme si escludono');
    assert.strictEqual(c('lato-lungo').gruppo, c('lato-corto').gruppo, 'i lati si escludono');
    assert.deepStrictEqual(s.azioni.map((a) => a.id), ['annulla', 'prova', 'crea']);
    assert.strictEqual(s.azioni[2].ruolo, 'primario');
    assert.ok(!campi.some((x) => x.tipo === 'nota'), 'senza avviso nessuna nota');
});

test('la scelta propone il fronte e retro quando il pieghevole rimpicciolisce delle carte', () => {
    const avviso = F.avvisoPiega({ sotto: [2, 5] }, t);
    assert.match(avviso, /2 carte/);
    assert.match(avviso, /fronte e retro/);
    assert.strictEqual(F.avvisoPiega({ sotto: [] }, t), '');
    assert.strictEqual(F.avvisoPiega(null, t), '');
    const s = F.schemaPdf({ forma: 'piega', lato: 'lungo' }, t, avviso);
    const nota = s.sezioni.reduce((a, x) => a.concat(x.campi || []), []).find((x) => x.tipo === 'nota');
    assert.ok(nota && nota.etichetta === avviso, 'l\'avviso sta nella scelta, prima di stampare');
    const v = Core.validaSchema(s);
    assert.ok(v.ok && !v.errori.length && !v.avvisi.length, JSON.stringify(v.errori.concat(v.avvisi)));
});

test('esito: dai valori dei campi l\'azione e la preferenza; annullare non dà niente', () => {
    assert.deepStrictEqual(F.esito({ azione: 'crea', valori: { 'forma-piega': false, 'forma-fr': true, 'lato-lungo': false, 'lato-corto': true } }),
        { azione: 'crea', pref: { forma: 'fronte-retro', lato: 'corto' } });
    assert.deepStrictEqual(F.esito({ azione: 'prova', valori: { 'forma-piega': true, 'lato-lungo': true } }),
        { azione: 'prova', pref: { forma: 'piega', lato: 'lungo' } });
    assert.strictEqual(F.esito({ azione: 'annulla', valori: {} }), null);
    assert.strictEqual(F.esito(null), null);
});

/* gate del 27/10 nel simulatore (Giacomo): «appare il modale che però deve essere adattato al layout ipad degli altri
   modali» — la veste di «Domande su misura» (launcher-core.js, 0126): finestra larga, veste grande, sezioni con un id
   a cui studente.css aggancia le righe da toccare */
test('la scelta «PDF delle flashcard» ha il vestito dei modali dell\'iPad (come «Domande su misura»)', () => {
    const L = require('../public/js/studente/launcher-core.js').schemaSuMisura({ opzioni: { rami: null, angoli: [] }, t });
    const s = F.schemaPdf({ forma: 'piega', lato: 'lungo' }, t, F.avvisoPiega({ sotto: [1] }, t));
    assert.strictEqual(s.taglia, L.taglia, 'la finestra larga');
    assert.strictEqual(s.veste, L.veste, 'la veste grande');
    assert.deepStrictEqual(s.sezioni.map((x) => x.id), ['fc-forma', 'fc-lato', 'fc-avviso'], 'le sezioni con un id, per studente.css');
    const v = Core.validaSchema(s);
    assert.ok(v.ok && !v.errori.length && !v.avvisi.length, JSON.stringify(v.errori.concat(v.avvisi)));
});

/* ── allargamento 13 (Giacomo, 27/10): «Il report della flashcard indica le scelte dei chip fatte dall'allievo» ── */
test('reportScelte: una voce per carta con la scelta a parole, nell\'ordine del player; le carte senza voce sono «Sapevo e ricordavo»', () => {
    const items = [{ front: 'A?', back: 'a' }, { front: 'B?', back: 'b' }, { front: 'A?', back: 'a2' }, { front: 'C?', back: 'c' }];
    /* il player: 😎 conta e basta, le altre in `mistakes` in ordine — qui due carte con lo stesso fronte */
    const res = { correct: 1, total: 4, mistakes: [{ q: 'B?', correctAnswer: 'b', feedback: 'hard' }, { q: 'A?', correctAnswer: 'a2', feedback: 'good' }, { q: 'C?', correctAnswer: 'c', feedback: 'hard' }] };
    const r = F.reportScelte(items, res, { mappa: 'Scrittura', titolo: 'Mazzo', data: '27/10/2026', durata: '01:05', chi: 'Io' }, t);
    const it = r.results.perStudent[0].items;
    assert.deepStrictEqual(it.map((x) => x.yourText), ['Sapevo e ricordavo', 'Non conoscevo', 'Non ricordavo', 'Non conoscevo']);
    assert.deepStrictEqual(it.map((x) => x.outcome), ['right', 'wrong', 'manual', 'wrong']);
    assert.deepStrictEqual(it.map((x) => x.correctText), ['a', 'b', 'a2', 'c'], 'il retro di ogni carta');
    assert.strictEqual(r.results.perStudent[0].flashcard, true, 'la scheda delle flashcard');
    assert.strictEqual(r.results.perStudent[0].manualCount, 0, 'niente «da correggere»');
    assert.deepStrictEqual([r.giuste, r.totale, r.pct], [1, 4, 25]);
    assert.strictEqual(r.meta.activity, 'Mazzo');
    assert.deepStrictEqual(F.reportScelte([], null, {}, t).results.perStudent[0].items, []);
});

test('reportScelte nel report vero: la scheda dice le scelte, e il titolo della barra è quello dei report', () => {
    const LR = require('../public/js/mappai-live-reports.js');
    const r = F.reportScelte([{ front: 'Chi scriveva?', back: 'Gli scribi' }], { mistakes: [{ q: 'Chi scriveva?', feedback: 'hard' }] }, { mappa: 'Scrittura' }, t);
    const h = LR.buildStudentsReportHtml(r.meta, r.results);
    assert.ok(h.includes('Scelta: Non conoscevo') && h.includes('Risposta: Gli scribi') && h.includes('sapevo e ricordavo'));
    assert.strictEqual(F.titoloReport({ mappa: 'Scrittura', t }), 'Scrittura · Flashcard · Report allievo');
    assert.strictEqual(F.fmtData(new Date(2026, 9, 7)), '07/10/2026');
});

/* ── allargamento 21 (Giacomo, 27/10): la fine come gli altri materiali; nel riquadro, al posto di «Risposte: n / N»,
   «Le tre scelte» ── */
test('riquadroScelte: quante carte per ciascuno dei tre bottoni, con le scelte lette come il report', () => {
    const items = [{ front: 'A?', back: 'a' }, { front: 'B?', back: 'b' }, { front: 'A?', back: 'a2' }, { front: 'C?', back: 'c' }];
    const res = { correct: 1, total: 4, mistakes: [{ q: 'B?', feedback: 'hard' }, { q: 'A?', feedback: 'good' }, { q: 'C?', feedback: 'hard' }] };
    assert.strictEqual(F.riquadroScelte(items, res), '😎 1 · 🤔 1 · 😩 2');
    assert.strictEqual(F.riquadroScelte(items, { mistakes: [] }), '😎 4 · 🤔 0 · 😩 0', 'nessuna voce: tutte sapute');
    assert.strictEqual(F.riquadroScelte([], null), '😎 0 · 🤔 0 · 😩 0');
    /* le stesse scelte del report: le due letture non possono divergere */
    const rep = F.reportScelte(items, res, {}, t).results.perStudent[0].items.map((x) => x.yourText);
    assert.deepStrictEqual(rep, ['Sapevo e ricordavo', 'Non conoscevo', 'Non ricordavo', 'Non conoscevo']);
});
