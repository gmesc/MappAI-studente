import Foundation
import UIKit
import WebKit
import Capacitor

/*
 * StampaPlugin — «Stampa» sull'iPad apre il menu di stampa di iOS (task 0036)
 * ---------------------------------------------------------------------------
 * ⚠️ PERCHÉ ESISTE (misurato il 26/9 nel simulatore): la WKWebView di iOS
 * IGNORA `window.print()` se l'app non gestisce la stampa — nessun menu, nessun
 * avviso, nessuna riga nel registro. La stampante della sintesi e il «Stampa»
 * della `.mm-doc-bar` erano bottoni muti. Qui la stampa la fa iOS:
 * `UIPrintInteractionController`, cioè AirPrint, l'anteprima e «Salva su File»
 * (un PDF) — tutto locale, senza rete.
 *
 *   Stampa.stampa({ url: 'file:///…/Documents/…/Sintesi.html', titolo }) → { stampato }
 *
 * `url` è il file:// VERO del documento (quello di `Filesystem.getUri`, prima
 * di `convertFileSrc`). Due strade:
 *  - un PDF va a iOS così com'è (`printingItem`): lo impagina lui;
 *  - un HTML si carica in una WKWebView FUORI SCHERMO, con accesso in lettura a
 *    Documents (immagini, formule e audio accanto si risolvono), e si stampa col
 *    suo `viewPrintFormatter()`, che impagina col foglio `@media print` del
 *    documento: le barre `.no-print` non ci sono. Non si stampa l'iframe del
 *    pannello: quello è dentro la WebView dell'app, e stamparla vorrebbe dire
 *    stampare l'app intera.
 * La WebView resta viva finché il menu di stampa non si chiude: il formatter la
 * legge mentre l'allievo sfoglia l'anteprima.
 *
 * Vive in `plugins/` e non in `ios/` perché `ios/` è GENERATO (`npx cap add ios`)
 * e fuori da git: un file messo lì si perderebbe alla prima rigenerazione.
 */
@objc(StampaPlugin)
public class StampaPlugin: CAPPlugin, CAPBridgedPlugin, WKNavigationDelegate {
    public let identifier = "StampaPlugin"
    public let jsName = "Stampa"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "stampa", returnType: CAPPluginReturnPromise)
    ]

    /// una stampa alla volta: la chiamata che aspetta, il nome del lavoro, e il
    /// foglio (la WebView fuori schermo) che il formatter legge
    private var chiamata: CAPPluginCall?
    private var titolo = ""
    private var foglio: WKWebView?
    private var scadenza: DispatchWorkItem?

    @objc func stampa(_ call: CAPPluginCall) {
        guard let testo = call.getString("url"), let url = URL(string: testo), url.isFileURL else {
            call.reject("manca il percorso del documento")
            return
        }
        let nome = (call.getString("titolo") ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            if self.chiamata != nil {
                call.reject("c'è già una stampa aperta")
                return
            }
            guard UIPrintInteractionController.isPrintingAvailable else {
                call.reject("su questo iPad la stampa non è disponibile")
                return
            }
            guard FileManager.default.fileExists(atPath: url.path) else {
                call.reject("il file non c'è più (\(url.lastPathComponent))")
                return
            }
            self.chiamata = call
            self.titolo = nome.isEmpty ? url.deletingPathExtension().lastPathComponent : nome
            if url.pathExtension.lowercased() == "pdf" {
                guard UIPrintInteractionController.canPrint(url) else {
                    self.fine(errore: "questo PDF non si lascia stampare")
                    return
                }
                self.mostra(elemento: url, formatter: nil)
            } else {
                self.carica(url)
            }
        }
    }

    // MARK: - l'HTML: il foglio fuori schermo

    private func carica(_ url: URL) {
        guard let vista = bridge?.viewController?.view else {
            fine(errore: "l'app non ha una finestra da cui stampare")
            return
        }
        /* nella gerarchia delle viste ma fuori dallo schermo: una WKWebView mai
           messa in una finestra può restituire pagine bianche al formatter */
        let web = WKWebView(frame: CGRect(x: -4000, y: 0, width: 820, height: 1160))
        web.navigationDelegate = self
        web.isUserInteractionEnabled = false
        vista.addSubview(web)
        foglio = web

        let limite = DispatchWorkItem { [weak self] in
            self?.fine(errore: "il documento non finisce di caricarsi")
        }
        scadenza = limite
        DispatchQueue.main.asyncAfter(deadline: .now() + 20, execute: limite)

        /* la lettura su tutta la cartella Documents dell'app, non solo su quella
           del file: la sintesi punta anche a `../Allegati/` e all'audio accanto,
           e la radice della mappa da qui non si conosce. Fuori da Documents (non
           dovrebbe capitare) basta la cartella del file. */
        let documenti = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first
        let dentro = documenti.map { url.resolvingSymlinksInPath().path.hasPrefix($0.resolvingSymlinksInPath().path) } ?? false
        web.loadFileURL(url, allowingReadAccessTo: dentro ? documenti! : url.deletingLastPathComponent())
    }

    public func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        guard webView === foglio else { return }
        /* `didFinish` arriva col `load`: i caratteri web e le formule KaTeX possono
           essere ancora in cammino. Si aspetta `document.fonts.ready`, poi un
           respiro per il disegno. */
        let corpo = "if (document.fonts && document.fonts.ready) { await document.fonts.ready; } return true;"
        webView.callAsyncJavaScript(corpo, arguments: [:], in: nil, in: .page) { [weak self] _ in
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) {
                guard let self = self, self.foglio === webView, self.chiamata != nil else { return }
                self.scadenza?.cancel()
                self.scadenza = nil
                self.mostra(elemento: nil, formatter: webView.viewPrintFormatter())
            }
        }
    }

    public func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        guard webView === foglio else { return }
        fine(errore: "non riesco ad aprire il documento (\(error.localizedDescription))")
    }

    public func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        guard webView === foglio else { return }
        fine(errore: "non riesco ad aprire il documento (\(error.localizedDescription))")
    }

    // MARK: - il menu di stampa

    private func mostra(elemento: Any?, formatter: UIPrintFormatter?) {
        guard let vista = bridge?.viewController?.view else {
            fine(errore: "l'app non ha una finestra da cui stampare")
            return
        }
        let pc = UIPrintInteractionController.shared
        let info = UIPrintInfo(dictionary: nil)
        info.jobName = titolo            // «Salva su File» propone questo nome
        info.outputType = .general
        pc.printInfo = info
        /* il controller è condiviso: ciò che ha lasciato la stampa di prima va tolto */
        pc.printPageRenderer = nil
        pc.printingItems = nil
        pc.printingItem = elemento
        pc.printFormatter = formatter

        let finito: UIPrintInteractionController.CompletionHandler = { [weak self] _, completato, errore in
            if let errore = errore {
                self?.fine(errore: "la stampa si è fermata (\(errore.localizedDescription))")
            } else {
                self?.fine(stampato: completato)
            }
        }
        let aperto: Bool
        if UIDevice.current.userInterfaceIdiom == .pad {
            /* sull'iPad il menu è un popover: senza un bottone nativo da indicare
               lo si ancora al centro, come `setCenteredPopover` del plugin Share */
            let centro = CGRect(x: vista.bounds.midX, y: vista.bounds.midY, width: 1, height: 1)
            aperto = pc.present(from: centro, in: vista, animated: true, completionHandler: finito)
        } else {
            aperto = pc.present(animated: true, completionHandler: finito)
        }
        if !aperto { fine(errore: "iOS non ha aperto il menu di stampa") }
    }

    /// chiude la stampa: libera il foglio e risponde UNA volta sola
    private func fine(stampato: Bool = false, errore: String? = nil) {
        scadenza?.cancel()
        scadenza = nil
        if let web = foglio {
            web.navigationDelegate = nil
            web.stopLoading()
            web.removeFromSuperview()
            foglio = nil
        }
        guard let call = chiamata else { return }
        chiamata = nil
        if let errore = errore {
            call.reject(errore)
        } else {
            call.resolve(["stampato": stampato])
        }
    }
}
