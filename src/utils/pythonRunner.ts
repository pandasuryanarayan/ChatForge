// ============================================================
// In-browser Python runner (Pyodide)
// Builds a self-contained HTML document that loads the Pyodide
// runtime from CDN, writes the conversation's .py files into its
// virtual filesystem, executes the main file and renders stdout /
// stderr in a terminal-style UI. `input()` works via prompt().
// ============================================================

import { escapeForScriptTag } from './extractCodeFiles';

const PYODIDE_VERSION = '0.26.4';
const PYODIDE_CDN = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

export interface PythonRunnerPayload {
  files: Array<{ path: string; code: string }>;
  main: string;
}

/**
 * Build the terminal-style runner document for the selected Python files.
 * All files are written into the Pyodide FS (creating directories as
 * needed) so relative imports / data files keep working; the main file
 * is executed with runPythonAsync after loading imported packages.
 */
export function buildPythonRunnerDoc(files: PythonRunnerPayload['files'], main: string): string {
  const payload: PythonRunnerPayload = { files, main };
  const payloadJson = escapeForScriptTag(JSON.stringify(payload));

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; }
  body {
    background: #09090b;
    color: #e4e4e7;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    font-size: 12px;
    display: flex;
    flex-direction: column;
  }
  #bar {
    display: flex; align-items: center; gap: 8px;
    padding: 7px 12px;
    background: #101013;
    border-bottom: 1px solid #27272a;
    flex-shrink: 0;
  }
  #dot { width: 8px; height: 8px; border-radius: 9999px; background: #fbbf24; }
  #dot.boot { background: #fbbf24; animation: pulse 1.2s ease-in-out infinite; }
  #dot.run  { background: #38bdf8; animation: pulse 1s ease-in-out infinite; }
  #dot.ok   { background: #34d399; }
  #dot.err  { background: #fb7185; }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: .35; } }
  #status { color: #a1a1aa; font-size: 11px; letter-spacing: .02em; }
  #main-file { margin-left: auto; color: #71717a; font-size: 11px; }
  #out {
    flex: 1;
    overflow-y: auto;
    padding: 12px 14px;
    white-space: pre-wrap;
    word-break: break-word;
    line-height: 1.55;
  }
  #out .dim { color: #71717a; }
  #out .err { color: #fda4af; }
  #out .ok  { color: #6ee7b7; }
  #out a { color: #93c5fd; }
  #in-hint {
    display: none;
    padding: 6px 12px;
    border-top: 1px solid #27272a;
    color: #71717a;
    font-size: 10px;
    background: #101013;
  }
</style>
</head>
<body>
  <div id="bar">
    <div id="dot" class="boot"></div>
    <div id="status">Loading Python runtime (Pyodide)…</div>
    <div id="main-file"></div>
  </div>
  <pre id="out"></pre>
  <div id="in-hint">input() — answer in the browser prompt dialog.</div>

<script type="application/json" id="runner-payload">${payloadJson}</script>
<script src="${PYODIDE_CDN}pyodide.js"></script>
<script>
(async function () {
  var outEl = document.getElementById('out');
  var dotEl = document.getElementById('dot');
  var statusEl = document.getElementById('status');
  var hintEl = document.getElementById('in-hint');
  var payload = JSON.parse(document.getElementById('runner-payload').textContent);

  function write(text, cls) {
    var span = document.createElement('span');
    if (cls) span.className = cls;
    span.textContent = text;
    outEl.appendChild(span);
    outEl.scrollTop = outEl.scrollHeight;
  }
  function setDot(cls) { dotEl.className = cls; }
  function setStatus(s) { statusEl.textContent = s; }

  var t0 = performance.now();
  try {
    if (typeof loadPyodide !== 'function') {
      throw new Error('Pyodide loader failed to load — check your internet connection (CDN unreachable).');
    }
    var pyodide = await loadPyodide({ indexURL: '${PYODIDE_CDN}' });
    var loadMs = Math.round(performance.now() - t0);

    pyodide.setStdout({ batched: function (s) { write(s + '\\n', ''); } });
    pyodide.setStderr({ batched: function (s) { write(s + '\\n', 'err'); } });

    // Write project files into the virtual FS so imports/data work
    payload.files.forEach(function (f) {
      var parts = f.path.split('/');
      var dirParts = parts.slice(0, -1);
      var dirPath = '';
      dirParts.forEach(function (p) {
        dirPath += (dirPath ? '/' : '') + p;
        try { pyodide.FS.mkdir(dirPath); } catch (e) { /* exists */ }
      });
      pyodide.FS.writeFile(f.path, f.code, { encoding: 'utf8' });
    });

    var mainCode = payload.files.find(function (f) { return f.path === payload.main; });
    mainCode = mainCode ? mainCode.code : '';
    document.getElementById('main-file').textContent = '▶ python ' + payload.main;
    setStatus('Python 3.12 (Pyodide) ready in ' + loadMs + 'ms — running…');
    setDot('run');
    write('▸ running ' + payload.main + '\\n\\n', 'dim');

    var runStart = performance.now();
    try {
      await pyodide.loadPackagesFromImports(mainCode);
      await pyodide.runPythonAsync(mainCode);
      var ms = Math.round(performance.now() - runStart);
      setDot('ok');
      setStatus('Finished — exit 0 · ' + ms + 'ms');
      write('\\n[Program finished — exit 0 · ' + ms + 'ms]', 'ok');
    } catch (runErr) {
      var ms = Math.round(performance.now() - runStart);
      var msg = (runErr && runErr.message) ? runErr.message : String(runErr);
      write(msg + '\\n', 'err');
      setDot('err');
      setStatus('Program error — exit 1 · ' + ms + 'ms');
      write('\\n[Program finished with errors — exit 1]', 'err');
    }
  } catch (e) {
    var msg = (e && e.message) ? e.message : String(e);
    write('Runtime error: ' + msg + '\\n', 'err');
    setDot('err');
    setStatus('Runner failed');
    if (/internet|CDN/.test(msg)) {
      write('\\nTip: the Pyodide runtime is fetched from a CDN. You can also re-run with the “Server” backend (needs python3 on the host).\\n', 'dim');
    }
  }
})();
</script>
</body>
</html>`;
}
