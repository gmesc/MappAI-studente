#!/usr/bin/env python3
"""tools/plist-ipad.py — ciò che `npx cap add ios` non mette, nel plist e nel progetto

`ios/` non è nel repo (si rigenera): questo script rimette, idempotente, ciò
che rende l'app «MappAI Studente» quella che era già stata compilata una volta:
  · UIFileSharingEnabled            la cartella Documenti compare nell'app File
  · LSSupportsOpeningDocumentsInPlace  i file si aprono sul posto, senza copie
  · TARGETED_DEVICE_FAMILY = 2      solo iPad — nel PROGETTO, non nel plist (5/10)
  · ITSAppUsesNonExemptEncryption = NO  niente crittografia propria (13/10): App Store
                                    Connect non chiede più la conformità all'esportazione
    python3 tools/plist-ipad.py [cartella ios]   (dopo `npx cap add ios`, prima di `cap sync`)
La cartella è `ios/` accanto al repo se non la si dà: con un argomento lo script
lavora su un altro checkout, o sul modello di Capacitor estratto per prova.

SOLO IPAD (5/10). Fino al 4/10 qui si scriveva `UIDeviceFamily = [2]` nel plist,
e Xcode avvisava a ogni build che l'avrebbe sovrascritta: la famiglia la decide
la build setting `TARGETED_DEVICE_FAMILY`. Nel progetto vero valeva 2 solo perché
messa a mano in Xcode; il modello di Capacitor (`ios-spm-template.tar.gz`) ha
"1,2", e dopo una rigenerazione l'app sarebbe diventata iPhone + iPad in silenzio.
Ora la chiave del plist si TOGLIE e la setting si scrive in `project.pbxproj`, in
tutte le configurazioni. Una sostituzione di testo sulla riga, non un parser: se
la riga non c'è lo script si ferma, invece di aggiungerla alla cieca.
"""
import plistlib, os, re, sys

IOS = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else \
    os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'ios')
P = os.path.join(IOS, 'App', 'App', 'Info.plist')
X = os.path.join(IOS, 'App', 'App.xcodeproj', 'project.pbxproj')
for f in (P, X):
    if not os.path.exists(f):
        sys.exit('manca ' + f + ': prima `npx cap add ios` (Node ≥ 22)')

# ── il progetto: solo iPad ──────────────────────────────────────────────────
RIGA = re.compile(r'^(\s*TARGETED_DEVICE_FAMILY = )[^;]*;', re.M)
with open(X, encoding='utf-8') as f:
    pbx = f.read()
trovate = RIGA.findall(pbx)
if not trovate:
    sys.exit('in ' + X + ' non c\'è nessuna riga TARGETED_DEVICE_FAMILY: il modello di Capacitor è cambiato, guardalo prima di aggiungerla')
pbx2 = RIGA.sub(r'\g<1>2;', pbx)
if pbx2 != pbx:
    with open(X, 'w', encoding='utf-8') as f:
        f.write(pbx2)

# ── il plist ────────────────────────────────────────────────────────────────
with open(P, 'rb') as f:
    d = plistlib.load(f)
prima = dict(d)
d['UIFileSharingEnabled'] = True
d['LSSupportsOpeningDocumentsInPlace'] = True
d.pop('UIDeviceFamily', None)   # la sovrascrive TARGETED_DEVICE_FAMILY (qui sopra)
# lo scambio col docente (7/9): la fotocamera per il QR, la rete locale per il server del Mac,
# e l'HTTP in chiaro verso quell'IP (ATS): NSAllowsLocalNetworking copre la LAN.
# ⚠️ NIENTE NSAllowsArbitraryLoads (Giacomo, 5/10): era il ripiego per gli IP nudi «in un'app
# firmata per sé»; il 17/9 è stato tolto a mano dal plist e lo scambio via QR è rimasto verde
# sull'iPad, e per l'App Store Apple chiede una giustificazione per l'HTTP in chiaro. Lo script
# lo rimetteva a ogni giro: ora il dizionario ATS è solo LocalNetworking.
d['NSCameraUsageDescription'] = 'Per inquadrare il codice QR sullo schermo del docente.'
d['NSLocalNetworkUsageDescription'] = 'Per scambiare i file con il computer del docente sulla rete della classe.'
d['NSAppTransportSecurity'] = {'NSAllowsLocalNetworking': True}
# la conformità all'esportazione (Giacomo, 13/10): l'app usa solo la cifratura di iOS (HTTPS
# di sistema, nessun algoritmo suo) → NO, e App Store Connect non lo domanda a ogni build.
d['ITSAppUsesNonExemptEncryption'] = False
CHIAVI = ('UIFileSharingEnabled', 'LSSupportsOpeningDocumentsInPlace', 'UIDeviceFamily',
          'NSCameraUsageDescription', 'NSLocalNetworkUsageDescription', 'NSAppTransportSecurity',
          'ITSAppUsesNonExemptEncryption')
cambiate = [k for k in CHIAVI if prima.get(k) != d.get(k)]
if cambiate:
    with open(P, 'wb') as f:
        plistlib.dump(d, f)

fatto = (['TARGETED_DEVICE_FAMILY = 2 (' + str(len(trovate)) + ' configurazioni)'] if pbx2 != pbx else []) + \
    [('tolta: ' if k not in d else 'scritta: ') + k for k in cambiate]
print('ios ok · ' + ('; '.join(fatto) if fatto else 'già a posto'))
