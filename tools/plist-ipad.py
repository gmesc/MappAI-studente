#!/usr/bin/env python3
"""tools/plist-ipad.py — le tre chiavi del plist che `npx cap add ios` non mette

`ios/` non è nel repo (si rigenera): questo script rimette, idempotente, ciò
che rende l'app «MappAI Studente» quella che era già stata compilata una volta:
  · UIFileSharingEnabled            la cartella Documenti compare nell'app File
  · LSSupportsOpeningDocumentsInPlace  i file si aprono sul posto, senza copie
  · UIDeviceFamily = [2]            solo iPad
    python3 tools/plist-ipad.py     (dopo `npx cap add ios`, prima di `cap sync`)
"""
import plistlib, os, sys
P = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'ios', 'App', 'App', 'Info.plist')
if not os.path.exists(P):
    sys.exit('manca ' + P + ': prima `npx cap add ios` (Node ≥ 22)')
with open(P, 'rb') as f:
    d = plistlib.load(f)
prima = dict(d)
d['UIFileSharingEnabled'] = True
d['LSSupportsOpeningDocumentsInPlace'] = True
d['UIDeviceFamily'] = [2]
# lo scambio col docente (7/9): la fotocamera per il QR, la rete locale per il server del Mac,
# e l'HTTP in chiaro verso quell'IP (ATS): NSAllowsLocalNetworking copre la LAN, ArbitraryLoads
# è il ripiego per gli IP nudi — app firmata per sé, nessuno store
d['NSCameraUsageDescription'] = 'Per inquadrare il codice QR sullo schermo del docente.'
d['NSLocalNetworkUsageDescription'] = 'Per scambiare i file con il computer del docente sulla rete della classe.'
d['NSAppTransportSecurity'] = {'NSAllowsLocalNetworking': True, 'NSAllowsArbitraryLoads': True}
with open(P, 'wb') as f:
    plistlib.dump(d, f)
cambiate = [k for k in ('UIFileSharingEnabled', 'LSSupportsOpeningDocumentsInPlace', 'UIDeviceFamily', 'NSCameraUsageDescription', 'NSLocalNetworkUsageDescription', 'NSAppTransportSecurity') if prima.get(k) != d[k]]
print('plist ok · ' + (('scritte: ' + ', '.join(cambiate)) if cambiate else 'già a posto'))
