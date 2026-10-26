/*
 * studente/prova-pdf.js — il PDF delle risposte, in jsPDF
 * ---------------------------------------------------------------------------
 * Su iPad non c'è `printToPDF` (Electron): l'unico percorso che produce un
 * FILE è jsPDF, già in casa (mappa vettoriale, dossier, fogli flashcard). Il
 * modello è `MappAICausal.appendPdfPages`: un foglio di testo che scorre,
 * `splitTextToSize`, salto pagina a fondo foglio. Il carattere lo registra
 * `MappAIFont.registraIn(doc)` (i quattro di MappAI, ripiego helvetica).
 * NIENTE soluzioni, niente tracce: è il foglio che lo studente manda al docente.
 */
(function () {
    'use strict';
    if (window.MappAIStudentePdf) return;

    var W = 210, H = 297, MX = 18, MY = 18, LARGO = W - 2 * MX, FONDO = H - 20;

    /* o = { titolo, mappa, data (GG/MM/AAAA), ambito, angoli, righe: [{ramo, angolo, domanda, perche, risposta}] }
       → base64 del PDF */
    function risposte(o) {
        var J = window.jspdf && window.jspdf.jsPDF;
        if (!J) return Promise.reject(new Error('jsPDF non caricato'));
        var doc = new J({ unit: 'mm', format: 'a4' });
        var pronto = Promise.resolve(null);
        try { if (window.MappAIFont && window.MappAIFont.registraIn) pronto = window.MappAIFont.registraIn(doc).catch(function () { return null; }); } catch (e) { }
        return pronto.then(function (nome) {
            var F = nome || 'helvetica';
            var y = MY;
            function riga(testo, corpo, stile, colore) {
                doc.setFont(F, stile || 'normal'); doc.setFontSize(corpo); doc.setTextColor(colore || '#1e293b');
                var linee = doc.splitTextToSize(String(testo || ''), LARGO);
                var alt = corpo * 0.45;
                linee.forEach(function (l) {
                    if (y + alt > FONDO) { doc.addPage(); y = MY; }
                    doc.text(l, MX, y); y += alt;
                });
            }
            function spazio(mm) { y += mm; if (y > FONDO) { doc.addPage(); y = MY; } }
            /* il chip come lo studente l'ha visto (0126): cornice e testo del suo colore, sfondo al 15%.
               I colori arrivano come token (`var(--x, #hex)`): jsPDF vuole l'esadecimale di riserva */
            function esa(c, ripiego) { var m = /#[0-9a-f]{6}\b|#[0-9a-f]{3}\b/i.exec(String(c || '')); return m ? m[0] : ripiego; }
            function tinta(h) {
                h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
                var n = parseInt(h, 16);
                return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(function (v) { return Math.round(255 + (v - 255) * 0.15); });
            }
            function pillola(testo, colore, testoColore, x) {
                var c = esa(colore, '#475569'), f = tinta(c);
                doc.setFont(F, 'bold'); doc.setFontSize(9);
                var w = doc.getTextWidth(testo) + 7;
                doc.setFillColor(f[0], f[1], f[2]); doc.setDrawColor(c); doc.setLineWidth(0.45);
                doc.roundedRect(x, y - 4.3, w, 6.2, 3.1, 3.1, 'FD');
                doc.setTextColor(esa(testoColore, c)); doc.text(testo, x + 3.5, y);
                return w;
            }
            /* testata */
            riga(o.titolo || 'Domande aperte', 15, 'bold', '#0f766e');
            riga([o.mappa, o.data, o.ambito, o.angoli].filter(Boolean).join(' · '), 9.5, 'normal', '#475569');
            /* in testa le domande disponibili e i chip coi loro conteggi (Giacomo, 26/10) */
            if (o.giudizi && o.giudizi.voci && o.giudizi.voci.length) {
                spazio(3);
                doc.setFont(F, 'bold'); doc.setFontSize(10); doc.setTextColor('#1e293b');
                var tot = o.giudizi.totale + ' domande disponibili', x = MX;
                doc.text(tot, x, y); x += doc.getTextWidth(tot) + 4;
                o.giudizi.voci.forEach(function (v) { x += pillola(v.et + ': ' + v.n, v.colore, v.testo, x) + 3; });
                spazio(4);
            }
            spazio(4);
            doc.setDrawColor('#0f766e'); doc.setLineWidth(0.6); doc.line(MX, y, W - MX, y); spazio(6);
            (o.righe || []).forEach(function (r, i) {
                var kicker = [(i + 1) + '.', r.ramo, r.angolo ? r.angolo.toUpperCase() : ''].filter(Boolean).join('  ·  ');
                riga(kicker, 8.5, 'bold', '#0f766e');
                riga(r.domanda, 11, 'bold', '#1e293b');
                /* niente «Perché: la so» sopra la risposta (Giacomo, 26/10): le prese sono tutte «la so» */
                spazio(1.5);
                if (r.risposta) riga(r.risposta, 10.5, 'normal', '#1e293b');
                else riga('—', 10.5, 'normal', '#94a3b8');
                spazio(5);
            });
            /* 0126, allargamento 3 (Giacomo: «anche le eventuali osservazioni dell'allievo e anche le
               domande scartare»): dopo le risposte le domande lasciate col loro «Perché:», poi le osservazioni */
            function sezione(titolo) {
                spazio(3); riga(titolo, 12, 'bold', '#0f766e'); spazio(1.5);
                doc.setDrawColor('#cbd5e1'); doc.setLineWidth(0.3); doc.line(MX, y, W - MX, y); spazio(5);
            }
            var scartate = o.scartate || [], note = String(o.note || '').trim();
            if (scartate.length) {
                sezione('Domande scartate');
                scartate.forEach(function (r) {
                    var kicker = [r.ramo, r.angolo ? r.angolo.toUpperCase() : ''].filter(Boolean).join('  ·  ');
                    if (kicker) riga(kicker, 8.5, 'bold', '#475569');
                    riga(r.domanda, 11, 'bold', '#1e293b');
                    /* il motivo come chip, coi colori che lo studente ha visto */
                    spazio(4.5); if (y > FONDO) { doc.addPage(); y = MY; }
                    pillola(r.perche, r.colore, r.testo, MX);
                    spazio(10);
                });
            }
            if (note) { sezione('Osservazioni'); riga(note, 10.5, 'normal', '#1e293b'); }
            /* piè: il nome dell'app e la pagina */
            var n = doc.getNumberOfPages();
            for (var p = 1; p <= n; p++) {
                doc.setPage(p); doc.setFont(F, 'normal'); doc.setFontSize(8); doc.setTextColor('#94a3b8');
                doc.text('MappAI studente · ' + (o.mappa || '') + ' · ' + p + '/' + n, MX, H - 10);
            }
            return doc.output('datauristring').split(',')[1];
        });
    }

    window.MappAIStudentePdf = { risposte: risposte };
}());
