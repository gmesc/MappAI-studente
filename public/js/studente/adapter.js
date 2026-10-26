/*
 * studente/adapter.js — la controfigura di `window.electronAPI` per MappAI studente
 * ---------------------------------------------------------------------------
 * I moduli copiati da MappAI (app.js, vault-manager, vault-io, storage-lang,
 * study-bus…) parlano con Electron attraverso `window.electronAPI`. Qui non c'è
 * Electron: c'è l'iPad (Capacitor Filesystem, Directory.Documents — la cartella
 * che l'app File mostra come «Sul mio iPad › MappAI Studente») oppure il
 * browser (sviluppo: IndexedDB, e un `<input webkitdirectory>` per caricare una
 * cartella di prova). UN parser per i due mondi, due «provider» di file.
 *
 * Si implementa SOLO ciò che i moduli copiati usano davvero (grep su
 * `electronAPI.` nell'allowlist di tools/sincronizza.js): vault, file, sessioni,
 * uscita, link esterni. Ciò che è AI o Electron-only (generateGemini, htmlToPdf,
 * capturePage, vaultFilePrint…) resta ASSENTE, non finto: i chiamanti hanno le
 * loro guardie, e un metodo che «riesce» a vuoto sarebbe un vicolo cieco
 * silenzioso (guida, trappola 43).
 *
 * Il vault dello studente è del docente: si SCRIVE solo `vista.json` e
 * `Studio Attivo/**` (allowlist qui, nel trasporto — come l'IPC di main.js).
 *
 * I percorsi sono virtuali: `Documents/<cartella>/…`. `filesRootGet` dichiara
 * `Documents` come base delle mappe, così `StorageManager.adottaVault` ricava
 * classe/materia dalla posizione (Documents/<classe>/<materia>/<mappa>) come
 * in MappAI, e una cartella piatta resta senza classe.
 */
(function () {
    'use strict';
    if (typeof window === 'undefined') return;
    if (window.electronAPI && window.electronAPI.__studente) return;   /* due caricamenti = due stati */

    var ROOT = 'Documents';
    /* due globali che dichiarava storageAdapter.js e che i moduli copiati leggono come identificatori nudi */
    window.isCapacitor = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
    window.isElectron = false;
    /* il plugin nativo: `Capacitor.Plugins.Filesystem` se il runtime lo espone, altrimenti
       `registerPlugin` (senza bundler non c'è l'import di @capacitor/filesystem) */
    function plugin(nome) {
        var C = window.Capacitor; if (!C || !C.isNativePlatform || !C.isNativePlatform()) return null;
        try { if (C.Plugins && C.Plugins[nome]) return C.Plugins[nome]; } catch (e) { }
        try { if (C.registerPlugin) return C.registerPlugin(nome); } catch (e) { }
        return null;
    }
    var cap = plugin('Filesystem');

    /* ── utilità ─────────────────────────────────────────────────────────── */
    function nfc(s) { try { return String(s == null ? '' : s).normalize('NFC'); } catch (e) { return String(s == null ? '' : s); } }
    /* ⚠️ NIENTE normalizzazione Unicode nei percorsi (guida, trappola 25): i nomi
       vengono dal listing del disco nella LORO forma (NFC o NFD) e vanno rimandati
       tali e quali, o il file «non si trova» pur essendo lì. Si normalizza solo
       per confrontare/mostrare (FilesCore lo fa già dove serve). */
    function segs(p) { return String(p == null ? '' : p).replace(/\\/g, '/').split('/').filter(function (s) { return s && s !== '.'; }); }
    function base(p) { var s = segs(p); return s[s.length - 1] || ''; }
    function b64ToText(b) { try { return decodeURIComponent(escape(atob(b))); } catch (e) { return atob(b); } }
    function textToB64(t) { return btoa(unescape(encodeURIComponent(String(t)))); }
    function blobToB64(blob) {
        return new Promise(function (ok, ko) {
            var r = new FileReader();
            r.onload = function () { ok(String(r.result).split(',')[1] || ''); };
            r.onerror = ko; r.readAsDataURL(blob);
        });
    }

    /* ── PROVIDER 1: IndexedDB (browser, sviluppo) ────────────────────────
       Chiave = percorso virtuale del file; valore = { base64, size, mtime }.
       Le cartelle non esistono: sono prefissi. */
    var idb = null;
    function db() {
        if (idb) return idb;
        idb = new Promise(function (ok, ko) {
            var req = indexedDB.open('mappai-studente', 1);
            req.onupgradeneeded = function () { req.result.createObjectStore('fs', { keyPath: 'path' }); };
            req.onsuccess = function () { ok(req.result); };
            req.onerror = function () { ko(req.error); };
        });
        return idb;
    }
    function tx(mode, fn) {
        return db().then(function (d) {
            return new Promise(function (ok, ko) {
                var t = d.transaction('fs', mode), st = t.objectStore('fs'), out = fn(st);
                t.oncomplete = function () { ok(out && out.__val !== undefined ? out.__val : out); };
                t.onerror = function () { ko(t.error); };
            });
        });
    }
    function idbKeys() {
        return db().then(function (d) {
            return new Promise(function (ok, ko) {
                var req = d.transaction('fs', 'readonly').objectStore('fs').getAllKeys();
                req.onsuccess = function () { ok(req.result.map(String)); };
                req.onerror = function () { ko(req.error); };
            });
        });
    }
    function idbGet(p) {
        return db().then(function (d) {
            return new Promise(function (ok, ko) {
                var req = d.transaction('fs', 'readonly').objectStore('fs').get(p);
                req.onsuccess = function () { ok(req.result || null); };
                req.onerror = function () { ko(req.error); };
            });
        });
    }
    var PROV_IDB = {
        nome: 'browser',
        lista: function (dir) {           /* → [{name, isDir}] figli diretti */
            var pref = segs(dir).join('/') + '/';
            return idbKeys().then(function (keys) {
                var visti = {}, out = [];
                keys.forEach(function (k) {
                    if (k.indexOf(pref) !== 0) return;
                    var resto = k.slice(pref.length).split('/');
                    var n = resto[0]; if (!n || visti[n]) return;
                    visti[n] = 1; out.push({ name: n, isDir: resto.length > 1 });
                });
                return out;
            });
        },
        esiste: function (p) {
            var k = segs(p).join('/');
            return idbKeys().then(function (keys) { return keys.some(function (x) { return x === k || x.indexOf(k + '/') === 0; }); });
        },
        leggi: function (p) {              /* → { base64, size, mtime } | null */
            return idbGet(segs(p).join('/'));
        },
        scrivi: function (p, base64) {
            var k = segs(p).join('/');
            return tx('readwrite', function (st) { st.put({ path: k, base64: base64, size: Math.floor(base64.length * 3 / 4), mtime: Date.now() }); });
        },
        /* il caricamento di una cartella di prova dal browser */
        importa: function (files) {
            return tx('readwrite', function (st) {
                files.forEach(function (f) { st.put({ path: ROOT + '/' + f.rel, base64: f.base64, size: f.size, mtime: f.mtime }); });
            });
        }
    };

    /* ── PROVIDER 2: Capacitor Filesystem (iPad) ──────────────────────────
       `Documents/…` → `path` relativo a Directory.Documents. */
    function capPath(p) { var s = segs(p); if (s[0] === ROOT) s.shift(); return s.join('/'); }
    var PROV_CAP = cap && {
        nome: 'ipad',
        lista: function (dir) {
            return cap.readdir({ path: capPath(dir), directory: 'DOCUMENTS' }).then(function (r) {
                return (r.files || []).map(function (f) {
                    var nome = typeof f === 'string' ? f : f.name;
                    var isDir = typeof f === 'string' ? false : f.type === 'directory';
                    return { name: nome, isDir: isDir };
                }).filter(function (f) { return f.name && f.name.charAt(0) !== '.'; });
            }).catch(function () { return []; });
        },
        esiste: function (p) {
            return cap.stat({ path: capPath(p), directory: 'DOCUMENTS' }).then(function () { return true; }, function () { return false; });
        },
        leggi: function (p) {
            return cap.readFile({ path: capPath(p), directory: 'DOCUMENTS' }).then(function (r) {
                var data = r.data;
                if (typeof data !== 'string') return blobToB64(data).then(function (b) { return { base64: b, size: data.size || 0, mtime: 0 }; });
                return { base64: data, size: Math.floor(data.length * 3 / 4), mtime: 0 };
            }).catch(function () { return null; });
        },
        scrivi: function (p, base64) {
            return cap.writeFile({ path: capPath(p), directory: 'DOCUMENTS', data: base64, recursive: true }).then(function () { return true; });
        }
    };

    var FS = PROV_CAP || PROV_IDB;

    /* sviluppo nel browser: `?vault=dev/vault.json` importa un vault vero
       impacchettato da tools/vault-json.js; l'elenco aspetta l'importazione */
    var pronto = Promise.resolve();
    try {
        var qs = new URLSearchParams(location.search);
        var qv = !PROV_CAP && qs.get('vault');
        /* `&pulisci=1`: si svuota IndexedDB prima di importare — senza, i file di
           un pacchetto precedente (per esempio i fogli finti) restano accanto ai nuovi */
        var pulisci = !PROV_CAP && qs.get('pulisci') ? tx('readwrite', function (st) { st.clear(); }) : Promise.resolve();
        if (qv) pronto = pulisci.then(function () { return fetch(qv); }).then(function (r) { return r.json(); }).then(function (lista) { return PROV_IDB.importa(lista); })
            .then(function () { console.log('[MappAI studente] vault importato da', qv); })
            .catch(function (e) { console.warn('[MappAI studente] import fallito', e); });
    } catch (e) { }

    /* ── il vault: lettura ─────────────────────────────────────────────────
       Rispecchia `load-vault` di main.js: index.yaml, links.json, Nodi/**.md
       (frontmatter + corpo + «## Fonti»), Materiale Studio/*.json filtrati da
       FilesCore.setsDelVault, vista.json. Niente js-yaml: un lettore minimo
       per la forma piatta con un livello di nesting (userProfile,
       customColors), che è quella che MappAI scrive. */
    function yamlMinimo(txt) {
        var out = {}, stack = [{ ind: -1, obj: out }];
        String(txt || '').split(/\r?\n/).forEach(function (riga) {
            if (!riga.trim() || /^\s*#/.test(riga)) return;
            var ind = riga.match(/^\s*/)[0].length;
            var m = riga.match(/^\s*("?)([^":]+)\1:\s*(.*)$/);
            if (!m) return;
            var k = m[2].trim(), v = m[3].trim();
            while (stack.length > 1 && stack[stack.length - 1].ind >= ind) stack.pop();
            var padre = stack[stack.length - 1].obj;
            if (v === '') { padre[k] = {}; stack.push({ ind: ind, obj: padre[k] }); return; }
            /* `customColors: {}` in riga (forma flow): è un oggetto, non la stringa
               «{}» — letto come stringa, `customColors[0]` dava «{» e la radice
               usciva NERA (misurato su «La Germania e il Nazismo») */
            if (/^[\[{]/.test(v)) { try { padre[k] = JSON.parse(v); } catch (e) { padre[k] = v.charAt(0) === '[' ? [] : {}; } return; }
            if (/^".*"$/.test(v) || /^'.*'$/.test(v)) v = v.slice(1, -1);
            else if (v === 'true') v = true;
            else if (v === 'false') v = false;
            else if (/^-?\d+(\.\d+)?$/.test(v)) v = Number(v);
            padre[k] = v;
        });
        return out;
    }
    function leggiTesto(p) { return FS.leggi(p).then(function (r) { return r ? b64ToText(r.base64) : null; }); }
    function walkMd(dir) {
        return FS.lista(dir).then(function (figli) {
            return Promise.all(figli.map(function (f) {
                var p = dir + '/' + f.name;
                if (f.isDir) return (f.name.charAt(0) === '_' ? Promise.resolve([]) : walkMd(p));
                return Promise.resolve(/\.md$/i.test(f.name) ? [p] : []);
            })).then(function (liste) { return [].concat.apply([], liste); });
        });
    }
    function nodoDaMd(content) {
        var parts = content.split('---');
        if (parts.length < 3) return null;
        var node = { chunks: [] };
        parts[1].trim().split('\n').forEach(function (l) {
            var i = l.indexOf(':'); if (i < 0) return;
            var k = l.slice(0, i).trim(), v = l.slice(i + 1).trim(), cv = v.replace(/^"(.*)"$/, '$1');
            if (k === 'id') node.id = cv;
            if (k === 'label') node.label = cv;
            if (k === 'level') node.level = parseInt(cv, 10);
            if (k === 'group') node.group = parseInt(cv, 10);
            if (k === 'parent') node.parent = cv;
            if (k === 'images') { try { node.images = JSON.parse(v); } catch (e) { } }
            if (k === 'iconVisibility') { try { node.iconVisibility = JSON.parse(v); } catch (e) { } }
            if (k === 'hasCustomText') node.hasCustomText = (cv === 'true');
            if (k === 'hasCustomImage') node.hasCustomImage = (cv === 'true');
            if (k === 'x') { node.x = parseFloat(cv); node.fx = node.x; }
            if (k === 'y') { node.y = parseFloat(cv); node.fy = node.y; }
            if (k === 'savedX') node.savedX = parseFloat(cv);
            if (k === 'savedY') node.savedY = parseFloat(cv);
            if (k === 'studyStatus') node.studyStatus = cv;
            if (k === 'nextReview') node.nextReview = parseInt(cv, 10);
            if (k === 'lastReviewed') node.lastReviewed = parseInt(cv, 10);
        });
        var body = parts.slice(2).join('---').trim().replace(/!\[\[.*?\]\]\n\n/g, '');
        var fonti = body.split('## Fonti');
        if (fonti.length > 1) {
            node.desc = fonti[0].replace(/^# .*\n\n/, '').trim();
            fonti[1].trim().split('\n- ').forEach(function (f) {
                var c = f.replace(/^- /, '').trim();
                var m1 = c.match(/\[(.*?) \| (.*?)\]: (.*)/);
                if (m1) { node.chunks.push({ title: m1[1], source: m1[2], text: m1[3] }); return; }
                var m2 = c.match(/\[(.*?)\]: (.*)/);
                if (m2) node.chunks.push({ title: m2[1], source: 'Originale', text: m2[2] });
            });
        } else node.desc = body.replace(/^# .*\n\n/, '').trim();
        return node;
    }
    function loadVault(folderPath) {
        var map = { nodes: [], links: [], extractionMode: 'mindmap', rootNodeLabel: '', branchLocks: {}, studySets: [] };
        return FS.esiste(folderPath).then(function (c) {
            if (!c) throw new Error('Cartella non trovata');
            return leggiTesto(folderPath + '/index.yaml');
        }).then(function (idx) {
            if (idx) {
                var y = yamlMinimo(idx);
                ['extractionMode', 'rootNodeLabel', 'classe', 'materia', 'userProfile', 'customColors', 'generationUsage'].forEach(function (k) { if (y[k] !== undefined) map[k] = y[k]; });
            }
            return leggiTesto(folderPath + '/links.json');
        }).then(function (lk) {
            if (lk) { try { map.links = JSON.parse(lk).map(function (l) { return { source: l.source, target: l.target, rel: l.rel || 'include', isCross: !!l.isCross }; }); } catch (e) { } }
            return walkMd(folderPath + '/Nodi');
        }).then(function (mds) {
            return Promise.all(mds.map(leggiTesto)).then(function (testi) {
                testi.forEach(function (t) { var n = t && nodoDaMd(t); if (n) map.nodes.push(n); });
            });
        }).then(function () {
            return FS.lista(folderPath + '/Materiale Studio');
        }).then(function (figli) {
            var json = figli.filter(function (f) { return !f.isDir && /\.json$/i.test(f.name); });
            return Promise.all(json.map(function (f) { return leggiTesto(folderPath + '/Materiale Studio/' + f.name); })).then(function (testi) {
                testi.forEach(function (t) { try { if (t) map.studySets.push(JSON.parse(t)); } catch (e) { } });
                var FC = window.MappAIFilesCore;
                if (FC && FC.setsDelVault) map.studySets = FC.setsDelVault(map.studySets, map.rootNodeLabel);
            });
        }).then(function () {
            return leggiTesto(folderPath + '/vista.json');
        }).then(function (v) {
            if (v) { try { map.vista = JSON.parse(v); } catch (e) { } }
            return { success: true, data: map };
        }).catch(function (e) { return { success: false, error: e && e.message }; });
    }

    /* ── i vault: elenco ──────────────────────────────────────────────────
       Una cartella con `index.yaml` è un vault, fino a tre livelli sotto la
       radice: piatta (Documents/<mappa>) o come la consegna il docente
       (Documents/<classe>/<materia>/<mappa>). La posizione dice classe e
       materia, come in MappAI (`classDir`, `discDir`). */
    function infoVault(p, folderName, classDir, discDir) {
        return leggiTesto(p + '/index.yaml').then(function (idx) {
            if (idx == null) return null;
            var y = yamlMinimo(idx);
            var v = { folderName: folderName, fullPath: p };
            if (classDir) v.classDir = classDir;
            if (discDir) v.discDir = discDir;
            v.extractionMode = y.extractionMode || 'mindmap';
            v.rootNodeLabel = y.rootNodeLabel || folderName;
            v.dossier = !!y.dossier;
            v.classeDichiarata = y.classe || '';
            v.materiaDichiarata = y.materia || '';
            v.lastUpdated = y.lastUpdated || '';
            if (y.userProfile) { v.nickname = y.userProfile.nickname; v.age = y.userProfile.age; }
            return v;
        });
    }
    function getAllVaults() {
        return pronto.then(_getAllVaults);
    }
    function _getAllVaults() {
        var out = [];
        function scandisci(dir, livello, classDir, discDir) {
            return FS.lista(dir).then(function (figli) {
                return Promise.all(figli.filter(function (f) { return f.isDir; }).map(function (f) {
                    var p = dir + '/' + f.name;
                    return FS.esiste(p + '/index.yaml').then(function (isVault) {
                        if (isVault) return infoVault(p, f.name, classDir, discDir).then(function (v) { if (v) out.push(v); });
                        if (livello >= 2) return null;
                        /* contenitore: livello 0 = classe, livello 1 = materia */
                        return scandisci(p, livello + 1, livello === 0 ? f.name : classDir, livello === 1 ? f.name : discDir);
                    });
                }));
            });
        }
        return scandisci(ROOT, 0, null, null).then(function () {
            return out.sort(function (a, b) { return new Date(b.lastUpdated) - new Date(a.lastUpdated); });
        }).catch(function () { return out; });
    }

    /* ── le scritture ammesse ─────────────────────────────────────────────── */
    function relAmmesso(relPath) {
        var s = segs(relPath);
        if (!s.length || s.indexOf('..') >= 0) return null;
        if (s.length === 1 && s[0] === 'vista.json') return s.join('/');
        if (s[0] === 'Studio Attivo' && s.length <= 4) return s.join('/');
        if (s[0] === 'MAPPE PDF' && s.length === 2 && /\.pdf$/i.test(s[1])) return s.join('/');
        return null;
    }
    function saveVaultFile(o) {
        o = o || {};
        var rel = relAmmesso(o.relPath);
        if (!o.vaultPath) return Promise.resolve({ ok: false, error: 'vault mancante' });
        if (!rel) return Promise.resolve({ ok: false, error: 'MappAI studente scrive solo vista.json, Studio Attivo/ e MAPPE PDF/: ' + o.relPath });
        var p = o.vaultPath + '/' + rel;
        var b64 = o.base64 != null ? String(o.base64).replace(/^data:[^,]*,/, '') : (o.text != null ? textToB64(o.text) : null);
        if (b64 == null) return Promise.resolve({ ok: false, error: 'nessun contenuto' });
        return (o.ifAbsent ? FS.esiste(p) : Promise.resolve(false)).then(function (c) {
            if (c) return { ok: false, error: 'exists', exists: true };
            return FS.scrivi(p, b64).then(function () { return { ok: true, path: p }; });
        }).catch(function (e) { return { ok: false, error: e && e.message }; });
    }
    function readVaultFile(o) {
        o = o || {};
        var s = segs(o.relPath);
        if (!o.vaultPath || !s.length || s.indexOf('..') >= 0) return Promise.resolve({ ok: false, error: 'percorso non valido' });
        return FS.leggi(o.vaultPath + '/' + s.join('/')).then(function (r) {
            if (!r) return { ok: false, error: 'file non trovato: ' + s.join('/') };
            return { ok: true, base64: r.base64, size: r.size || 0 };
        });
    }
    function vaultMaterialsList(o) {
        o = o || {};
        var cartella = (o.dir === 'Allegati') ? 'Allegati' : 'Materiale Studio';
        return FS.lista(o.vaultPath + '/' + cartella).then(function (figli) {
            var files = figli.filter(function (f) { return !f.isDir && f.name.charAt(0) !== '.'; })
                .map(function (f) { return { name: f.name, relPath: cartella + '/' + f.name, size: 0, mtime: 0 }; });
            return { ok: true, manifest: null, files: files };
        }).catch(function (e) { return { ok: false, error: e && e.message }; });
    }
    /* la SESSIONE di studio (MappAIStudyBus): stesso formato di main.js, così
       «Progressi» di MappAI legge le sessioni dello studente se la cartella torna */
    function saveStudyRecord(o) {
        o = o || {};
        if (!o.vaultPath) return Promise.resolve({ success: false, error: 'vault mancante' });
        var dir = o.vaultPath + '/Studio Attivo';
        return leggiTesto(dir + '/storico_score.md').then(function (md) {
            md = md || '# Studio Attivo — Storico Score\n\n> Registro automatico delle sessioni di studio attivo.\n';
            var h = '\n## ' + o.dateStr + '\n';
            if (md.indexOf(h) < 0) md += h;
            md += String(o.markdownLine || '').replace(/\n?$/, '\n');
            return FS.scrivi(dir + '/storico_score.md', textToB64(md));
        }).then(function () {
            return leggiTesto(dir + '/sessioni.jsonl');
        }).then(function (jl) {
            return FS.scrivi(dir + '/sessioni.jsonl', textToB64((jl || '') + JSON.stringify(o.jsonRecord) + '\n'));
        }).then(function () { return { success: true }; })
          .catch(function (e) { return { success: false, error: e && e.message }; });
    }
    function readStudySessions(vaultPath) {
        return leggiTesto(vaultPath + '/Studio Attivo/sessioni.jsonl').then(function (t) {
            var sessions = String(t || '').split('\n').filter(Boolean).map(function (l) { try { return JSON.parse(l); } catch (e) { return null; } }).filter(Boolean);
            return { sessions: sessions, mastery: null };
        }).catch(function () { return { sessions: [], mastery: null }; });
    }
    /* `saveVault` di MappAI riscrive TUTTO il vault. Qui NO: la mappa è del
       docente. Viaggia solo `vista.json` (Vista studio, focus, timeline), che
       `buildVaultMapData` mette in `mapData.vista`. Null = niente da scrivere. */
    function saveVault(o) {
        o = o || {};
        var v = o.mapData && o.mapData.vista;
        if (!o.folderPath || !v) return Promise.resolve({ success: true, soloVista: true });
        return saveVaultFile({ vaultPath: o.folderPath, relPath: 'vista.json', text: JSON.stringify(v, null, 2) })
            .then(function (r) { return { success: !!r.ok, soloVista: true, error: r.error }; });
    }

    /* ── il caricamento di una cartella dal browser (sviluppo) ────────────── */
    function pickFolder() {
        if (PROV_CAP) {
            if (window.showToast) window.showToast('Metti la cartella della mappa in File › Sul mio iPad › MappAI Studente, poi torna qui.', 'info');
            return Promise.resolve({ canceled: true });
        }
        return new Promise(function (ok) {
            var inp = document.createElement('input');
            inp.type = 'file'; inp.setAttribute('webkitdirectory', ''); inp.setAttribute('directory', ''); inp.multiple = true;
            inp.style.display = 'none'; document.body.appendChild(inp);
            inp.onchange = function () {
                var files = Array.prototype.slice.call(inp.files || []);
                inp.remove();
                if (!files.length) return ok({ canceled: true });
                var radice = segs(files[0].webkitRelativePath)[0];
                Promise.all(files.map(function (f) {
                    return blobToB64(f).then(function (b) { return { rel: f.webkitRelativePath, base64: b, size: f.size, mtime: f.lastModified }; });
                })).then(function (lista) {
                    return PROV_IDB.importa(lista);
                }).then(function () { ok({ canceled: false, folderPath: ROOT + '/' + radice }); });
            };
            /* annullato senza scegliere: l'input non emette nulla, si lascia la promessa in sospeso
               solo fino al prossimo focus della finestra */
            window.addEventListener('focus', function una() { window.removeEventListener('focus', una); setTimeout(function () { if (!inp.files || !inp.files.length) ok({ canceled: true }); }, 400); });
            inp.click();
        });
    }

    var cbUscita = null;
    var API = {
        __studente: true, __provider: FS.nome,
        filesRootGet: function () {
            return Promise.resolve({ organized: true, filesRoot: ROOT, rootDir: ROOT, documentsDir: ROOT, mapsBaseDir: ROOT, studentsBaseDir: ROOT + '/Allievi' });
        },
        getAllVaults: getAllVaults,
        getValidVaultFolders: function () { return getAllVaults().then(function (v) { return v.map(function (x) { return x.folderName; }); }); },
        loadVault: loadVault,
        saveVault: saveVault,
        saveVaultFile: saveVaultFile,
        readVaultFile: readVaultFile,
        vaultMaterialsList: vaultMaterialsList,
        saveStudyRecord: saveStudyRecord,
        readStudySessions: readStudySessions,
        pickFolder: pickFolder,
        /* Un collegamento `file:` porta a un documento sul computer del docente: sull'iPad non esiste e
           iOS non lo apre. Col nucleo mappai-html-sicuro (25/9/26) il link passa il controllo della scheda,
           quindi qui si dice perché non si apre, invece di non fare niente in silenzio. */
        openExternal: function (url) {
            if (/^file:/i.test(String(url || ''))) {
                if (window.showToast) window.showToast('Questo collegamento porta a un documento sul computer del docente: sull\'iPad non si apre.', 'info');
                return Promise.resolve(false);
            }
            try { window.open(url, '_blank'); } catch (e) { } return Promise.resolve(true);
        },
        openSaveFolder: function () {
            if (window.showToast) window.showToast(PROV_CAP ? 'I tuoi file stanno in File › Sul mio iPad › MappAI Studente.' : 'Nel browser i file vivono in IndexedDB.', 'info');
            return Promise.resolve(true);
        },
        onSalvaPrimaDiUscire: function (cb) { cbUscita = cb; },
        salvataggioUscitaFatto: function () { }
    };
    /* uscire salva (inv. 20): il segnale lo dà la pagina che si nasconde */
    window.addEventListener('pagehide', function () { try { if (cbUscita) cbUscita(); } catch (e) { } });

    window.electronAPI = API;
    /* sull'iPad `doc.save()` di jsPDF (le quattro «Stampa dalla mappa») è un no-op nella
       WKWebView: il PDF si scrive in `Studio Attivo/Stampe/<nome>` e si apre il foglio di
       condivisione — stessa strada della cella «cartella» delle prove */
    if (PROV_CAP && window.jspdf && window.jspdf.jsPDF) {
        window.jspdf.jsPDF.API.save = function (nome) {
            var vp = window.appState && window.appState.activeVaultPath; if (!vp) return this;
            var n = String(nome || 'stampa.pdf').replace(/[\\/:*?"<>|]+/g, '-'); if (!/\.pdf$/i.test(n)) n += '.pdf';
            var b64 = this.output('datauristring').split(',')[1];
            /* 0126, allargamento 6: se il nome c'è già nella cartella, « (2)», « (3)»… (studia-core › nomeLibero) */
            FS.lista(vp + '/Studio Attivo/Stampe').catch(function () { return []; }).then(function (figli) {
                var C = window.MappAIStudiaCore;
                if (C && C.nomeLibero) n = C.nomeLibero(n, (figli || []).map(function (f) { return f.name; }));
                return saveVaultFile({ vaultPath: vp, relPath: 'Studio Attivo/Stampe/' + n, base64: b64 });
            }).then(function (r) {
                if (!r || !r.ok) { if (window.showToast) window.showToast('PDF non salvato: ' + (r && r.error), 'error'); return; }
                var Fs = plugin('Filesystem'), Sh = plugin('Share'); if (!Fs || !Sh) return;
                var rel = vp.replace(/^Documents\/?/, ''); rel = (rel ? rel + '/' : '') + 'Studio Attivo/Stampe/' + n;
                return Fs.getUri({ path: rel, directory: 'DOCUMENTS' }).then(function (u) { return Sh.share({ title: n, url: u.uri }); });
            }).catch(function (e) { if (window.showToast) window.showToast('PDF: ' + (e && e.message), 'error'); });
            return this;
        };
    }
    /* per i moduli dello studente: leggere un testo, scrivere, elencare */
    /* la RICEZIONE dal docente (scambio, 7/9): una seconda porta, dichiarata, accanto a
       `saveVaultFile` (che resta la porta dei moduli copiati e scrive solo vista.json e
       Studio Attivo/**). Ammette solo ciò che `relVaultStudente` di files-core ammette —
       la stessa regola con cui il docente ESPONE: fiducia zero nel manifest. */
    function scriviRicevuto(vaultPath, rel, base64) {
        var FC = window.MappAIFilesCore;
        var ok = FC && FC.relVaultStudente ? FC.relVaultStudente(rel) : null;
        if (!ok) return Promise.reject(new Error('non ammesso: ' + rel));
        var vp = String(vaultPath || '');
        if (vp.indexOf(ROOT + '/') !== 0 || vp.indexOf('..') >= 0) return Promise.reject(new Error('cartella non valida'));
        return FS.scrivi(vp + '/' + ok, String(base64 || ''));
    }
    function leggiB64(vaultPath, rel) { return FS.leggi(vaultPath + '/' + rel).then(function (r) { return r ? r.base64 : null; }); }
    /* un elenco [{rel, base64}] scritto in Documenti (il vault dimostrativo, demo.js): nel
       browser va in IndexedDB in un colpo, sull'iPad un file alla volta */
    function importa(lista) {
        if (!PROV_CAP) return PROV_IDB.importa(lista);
        return (lista || []).reduce(function (p, f) { return p.then(function () { return FS.scrivi(ROOT + '/' + f.rel, f.base64); }); }, Promise.resolve()).then(function () { return true; });
    }
    window.MappAIStudenteFS = { ROOT: ROOT, provider: FS.nome, plugin: plugin, leggiTesto: leggiTesto, leggiB64: leggiB64, lista: FS.lista, esiste: FS.esiste, yamlMinimo: yamlMinimo, relAmmesso: relAmmesso, nodoDaMd: nodoDaMd, scriviRicevuto: scriviRicevuto, importa: importa };
    console.log('[MappAI studente] adapter pronto (' + FS.nome + ')');
}());
