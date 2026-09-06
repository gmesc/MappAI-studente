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
            /* testata */
            riga(o.titolo || 'Domande aperte', 15, 'bold', '#0f766e');
            riga([o.mappa, o.data, o.ambito, o.angoli].filter(Boolean).join(' · '), 9.5, 'normal', '#475569');
            spazio(4);
            doc.setDrawColor('#0f766e'); doc.setLineWidth(0.6); doc.line(MX, y, W - MX, y); spazio(6);
            (o.righe || []).forEach(function (r, i) {
                var kicker = [(i + 1) + '.', r.ramo, r.angolo ? r.angolo.toUpperCase() : ''].filter(Boolean).join('  ·  ');
                riga(kicker, 8.5, 'bold', '#0f766e');
                riga(r.domanda, 11, 'bold', '#1e293b');
                if (r.perche) riga('Perché: ' + r.perche, 9, 'italic', '#475569');
                spazio(1.5);
                if (r.risposta) riga(r.risposta, 10.5, 'normal', '#1e293b');
                else riga('—', 10.5, 'normal', '#94a3b8');
                spazio(5);
            });
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
