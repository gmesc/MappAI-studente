'use strict';
/* Packet 0126, allargamento 2 — il «Foglio dei nodi» dello studente (Giacomo, 25/10, sul mockup: «B ma in full
   screen», «'Titoli', 'Parole chiave' e 'Descrizioni'», «nel menu a tendina scrivi solo 'L[numero di livello] ·
   [numero] nodi'»; prima: la grandezza «automatica in base alla scelta se solo titoli, con keyword o con
   descrizione»). Qui la parte pura: che cosa si chiede al generatore vero (`printAllNodeLabels`). */
const { test } = require('node:test');
const assert = require('node:assert');
const F = require('../public/js/studente/foglio-nodi-core.js');

const NODI = [{ level: 0 }].concat(Array(6).fill({ level: 1 }), Array(18).fill({ level: 2 }), Array(17).fill({ level: 3 }));

test('i tre contenuti, coi nomi dei bottoni, e la grandezza che li segue', () => {
    assert.deepStrictEqual(F.CONTENUTI.map(c => c.k + ':' + c.et + ':' + c.layout + ':' + c.fmt),
        ['titoli:Titoli:title:3x4', 'parole:Parole chiave:keywords:2x2', 'descrizioni:Descrizioni:card:2x1']);
});

test('i livelli: «L[n] · [N] nodi», solo quelli che aggiungono nodi; l\'ultimo sono tutti', () => {
    const l = F.livelli(NODI);
    assert.deepStrictEqual(l.map(x => x.et), ['L1 · 7 nodi', 'L2 · 25 nodi', 'L3 · 42 nodi']);
    assert.deepStrictEqual(l.map(x => x.tutti), [false, false, true]);
    assert.deepStrictEqual(F.livelli([{ level: 0 }, { level: 1 }, { level: 1 }]).map(x => x.et), ['L1 · 3 nodi']);
    assert.deepStrictEqual(F.livelli([]), []);
});

test('le opzioni del generatore: formato dal contenuto, «all» per l\'ultimo livello, niente sfondo', () => {
    const l = F.livelli(NODI);
    assert.deepStrictEqual(F.opzioni('parole', l[1]), { depth: 2, fmt: '2x2', layout: 'keywords', bg: 'none', causal: false });
    assert.deepStrictEqual(F.opzioni('titoli', l[2]), { depth: 'all', fmt: '3x4', layout: 'title', bg: 'none', causal: false });
    assert.deepStrictEqual(F.opzioni('nessuno', null), { depth: 'all', fmt: '3x4', layout: 'title', bg: 'none', causal: false }, 'un valore sbagliato torna ai titoli');
});

test('le pagine: «n/N» e il passo che non esce dal documento', () => {
    assert.strictEqual(F.testoPagina(0, 4), '1/4');
    assert.strictEqual(F.passo(0, -1, 4), 0);
    assert.strictEqual(F.passo(3, 1, 4), 3);
    assert.strictEqual(F.passo(1, 1, 4), 2);
});
