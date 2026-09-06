#!/usr/bin/env python3
"""tools/estrai-index.py — i blocchi di index.html di MappAI, per id

Lo scheletro della pagina dello studente NON è generato a ogni giro: è stato
estratto UNA volta con questo script e poi è un file suo (public/index.html),
scritto a mano dove serve. Lo script resta perché è il modo di RIVEDERE la
scelta quando MappAI cambia il markup del canvas: `--confronta` stampa, blocco
per blocco, se il markup di là è ancora uguale a quello che avevamo estratto
(la divergenza del markup è il debito dichiarato in RIUSO.md).

    python3 tools/estrai-index.py > /tmp/blocchi.html   # i blocchi, nell'ordine
    python3 tools/estrai-index.py --confronta            # uguale / diverso per id

I tag si bilanciano contando, non a occhio (trappola 31): script, style e
commenti sono un token solo, i void non contano.
"""
import re, sys, os, hashlib

QUI = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LA = os.environ.get('MAPPAI_RE', os.path.join(QUI, '..', 'MappAI re'))
SRC = os.path.join(LA, 'public', 'index.html')

# i blocchi che il canvas e le attività dello studente pretendono, per id
TIENI = [
    'toast-container', 'reading-ruler', 'alert-modal',
    'map-view',
    'context-menu', 'source-modal', 'confirm-modal', 'user-profile-modal',
    'vault-manager-modal', 'dossier-print-modal', 'study-player-modal', 'quiz-modal',
    'loading-overlay', 'image-lightbox', 'a11y-panel', 'magnifier-lens',
]
# dentro i blocchi tenuti, i pezzi del docente che si tolgono
TOGLI = [
    'sidebar-tab-tutor', 'sidebar-tab-lim', 'sidebar-panel-tutor', 'sidebar-panel-lim',
    'structural-suggestions-block', 'collab-sidebar-panel',
]

VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'}
TOK = re.compile(r'<!--.*?-->|<script\b[^>]*>.*?</script>|<style\b[^>]*>.*?</style>|<(/?)([a-zA-Z][\w-]*)[^>]*?(/?)>', re.S)


def blocco(html, id_):
    """(inizio, fine) del tag che porta id="id_" — fine = dopo il tag di chiusura."""
    m = re.search(r'<([a-zA-Z][\w-]*)\b[^>]*\bid="' + re.escape(id_) + r'"', html)
    if not m:
        return None
    start = m.start()
    depth = 0
    for t in TOK.finditer(html, start):
        s = t.group(0)
        if s.startswith('<!--') or s.startswith('<script') or s.startswith('<style'):
            continue
        chiude, nome, self_close = t.group(1), t.group(2).lower(), t.group(3)
        if nome in VOID or self_close:
            continue
        if not chiude:
            depth += 1
        else:
            depth -= 1
            if depth == 0:
                return (start, t.end())
    raise SystemExit('tag non bilanciato per id=' + id_)


def estrai(html):
    out = []
    presi = []
    for id_ in TIENI:
        b = blocco(html, id_)
        if not b:
            sys.stderr.write('⚠️ id assente in MappAI: %s\n' % id_)
            continue
        if any(a <= b[0] and b[1] <= z for a, z in presi):
            continue  # già dentro un blocco preso
        presi.append(b)
        testo = html[b[0]:b[1]]
        for via in TOGLI:
            bb = blocco(testo, via)
            if bb:
                testo = testo[:bb[0]] + '<!-- studente: via #%s -->' % via + testo[bb[1]:]
        out.append((id_, testo))
    return out


def main():
    html = open(SRC, encoding='utf-8').read()
    blocchi = estrai(html)
    if '--confronta' in sys.argv:
        mio = open(os.path.join(QUI, 'public', 'index.html'), encoding='utf-8').read()
        for id_, testo in blocchi:
            b = blocco(mio, id_)
            qui = mio[b[0]:b[1]] if b else ''
            h1 = hashlib.sha1(testo.encode()).hexdigest()[:8]
            h2 = hashlib.sha1(qui.encode()).hexdigest()[:8]
            print(('  uguale   ' if h1 == h2 else '  DIVERSO  ') + id_ + ('' if b else '  (assente qui)'))
        return
    for id_, testo in blocchi:
        sys.stdout.write('\n<!-- ═══ #%s (da MappAI re/public/index.html) ═══ -->\n' % id_)
        sys.stdout.write(testo + '\n')


if __name__ == '__main__':
    main()
