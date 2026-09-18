// ============================================================
// Code File Extraction from Chat Messages
// Parses assistant markdown responses and extracts fenced code
// blocks as virtual files in ANY language (HTML / CSS / JS /
// Python / Java / C / C++ / Go / Bash / ...) that populate the
// right-side File Manager and can be executed by the built-in
// runners (browser preview, Pyodide, or the server toolchain).
// ============================================================

export type CodeLang =
  | 'html'
  | 'css'
  | 'javascript'
  | 'typescript'
  | 'jsx'
  | 'tsx'
  | 'json'
  | 'svg'
  | 'python'
  | 'java'
  | 'c'
  | 'cpp'
  | 'csharp'
  | 'go'
  | 'rust'
  | 'ruby'
  | 'php'
  | 'bash'
  | 'sql'
  | 'yaml'
  | 'toml'
  | 'other';

/** How a group of files can be executed by the built-in runners */
export type RunMode =
  | 'web' // HTML/CSS/JS combined into a browser preview
  | 'python' // Pyodide (browser) or python3 (server)
  | 'java' // javac + java via the server toolchain
  | 'node' // node via the server toolchain
  | 'c' // gcc via the server toolchain
  | 'cpp' // g++ via the server toolchain
  | 'go' // go run via the server toolchain
  | 'ruby' // ruby via the server toolchain
  | 'php' // php via the server toolchain
  | 'bash'; // bash via the server toolchain

export interface ExtractedCodeFile {
  /** Unique id for React keys */
  id: string;
  /** Full relative path (may include directories), e.g. "src/app.js" or "Main.java" */
  path: string;
  /** Basename for display, e.g. "app.js" */
  filename: string;
  /** Directory portion of the path ("" when at the root) */
  dir: string;
  /** Normalized language id used for execution decisions */
  language: CodeLang;
  /** Raw language string from the fence (e.g. "py", "python", "html") */
  rawLanguage: string;
  /** The code content */
  code: string;
  /** Which message this file was extracted from */
  messageId: string;
  /** Whether the user has selected this file for inclusion in the preview */
  selected: boolean;
  /** Line count (for display) */
  lines: number;
}

/** Map of fence-language aliases to canonical languages */
const LANG_ALIASES: Record<string, CodeLang> = {
  html: 'html',
  htm: 'html',
  xhtml: 'html',
  xml: 'html',
  vue: 'html',
  css: 'css',
  scss: 'css',
  sass: 'css',
  less: 'css',
  javascript: 'javascript',
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  ecmascript: 'javascript',
  node: 'javascript',
  typescript: 'typescript',
  ts: 'typescript',
  jsx: 'jsx',
  tsx: 'tsx',
  react: 'jsx',
  json: 'json',
  jsonc: 'json',
  json5: 'json',
  svg: 'svg',
  python: 'python',
  py: 'python',
  python3: 'python',
  py3: 'python',
  java: 'java',
  c: 'c',
  h: 'c',
  cpp: 'cpp',
  'c++': 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  hpp: 'cpp',
  hh: 'cpp',
  csharp: 'csharp',
  cs: 'csharp',
  'c#': 'csharp',
  go: 'go',
  golang: 'go',
  rust: 'rust',
  rs: 'rust',
  ruby: 'ruby',
  rb: 'ruby',
  php: 'php',
  bash: 'bash',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  sql: 'sql',
  yaml: 'yaml',
  yml: 'yaml',
  toml: 'toml',
  ini: 'toml',
};

/** Languages whose fence blocks should NOT become virtual files at all */
const SKIP_LANGS = new Set([
  'diff', 'mermaid', 'output', 'log', 'plaintext', 'plain',
  'console', 'terminal', 'text', 'txt', 'markdown', 'md',
]);

/** Extensions that map to a language for filename parsing */
const EXT_TO_LANG: Record<string, CodeLang> = {
  html: 'html',
  htm: 'html',
  xhtml: 'html',
  css: 'css',
  scss: 'css',
  sass: 'css',
  less: 'css',
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  ts: 'typescript',
  mts: 'typescript',
  cts: 'typescript',
  jsx: 'jsx',
  tsx: 'tsx',
  json: 'json',
  jsonc: 'json',
  svg: 'svg',
  py: 'python',
  pyw: 'python',
  java: 'java',
  c: 'c',
  h: 'c',
  cpp: 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  hpp: 'cpp',
  cs: 'csharp',
  go: 'go',
  rs: 'rust',
  rb: 'ruby',
  php: 'php',
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',
  sql: 'sql',
  yaml: 'yaml',
  yml: 'yaml',
  toml: 'toml',
  ini: 'toml',
};

/**
 * Fallback filenames per language, used when the fence info-string
 * or the code content itself doesn't reveal a filename.
 */
const FALLBACK_FILENAMES: Record<CodeLang, string> = {
  html: 'index.html',
  css: 'styles.css',
  javascript: 'script.js',
  typescript: 'script.ts',
  jsx: 'App.jsx',
  tsx: 'App.tsx',
  json: 'data.json',
  svg: 'image.svg',
  python: 'main.py',
  java: 'Main.java',
  c: 'main.c',
  cpp: 'main.cpp',
  csharp: 'Program.cs',
  go: 'main.go',
  rust: 'main.rs',
  ruby: 'main.rb',
  php: 'index.php',
  bash: 'script.sh',
  sql: 'query.sql',
  yaml: 'config.yaml',
  toml: 'config.toml',
  other: 'notes.txt',
};

/**
 * Which execution runner (if any) handles a given language.
 *  - web    → assembled into the live HTML/CSS/JS preview
 *  - python → Pyodide in the browser (with a server python3 option)
 *  - others → compiled/executed by the server toolchain endpoint
 */
export function executionTarget(lang: CodeLang): RunMode | null {
  switch (lang) {
    case 'html':
    case 'css':
    case 'javascript':
    case 'typescript':
    case 'jsx':
    case 'tsx':
    case 'svg':
      return 'web';
    case 'python':
      return 'python';
    case 'java':
      return 'java';
    case 'c':
      return 'c';
    case 'cpp':
      return 'cpp';
    case 'go':
      return 'go';
    case 'ruby':
      return 'ruby';
    case 'php':
      return 'php';
    case 'bash':
      return 'bash';
    default:
      return null;
  }
}

/** True when a file participates in the web preview assembly */
export function isWebFile(file: ExtractedCodeFile): boolean {
  return executionTarget(file.language) === 'web';
}

/** True when a file can be executed at all (any runner) */
export function isExecutableFile(file: ExtractedCodeFile): boolean {
  return executionTarget(file.language) !== null;
}

/**
 * All distinct run modes available for the given files, ordered by
 * priority (web preview first, then python, java, ...).
 */
export function resolveRunModes(files: ExtractedCodeFile[]): RunMode[] {
  const modes = new Set<RunMode>();
  for (const f of files) {
    const t = executionTarget(f.language);
    if (t) modes.add(t);
  }
  const priority: RunMode[] = ['web', 'python', 'java', 'node', 'c', 'cpp', 'go', 'ruby', 'php', 'bash'];
  return priority.filter((m) => modes.has(m));
}

/** Files that belong to a given run mode */
export function filesForRunMode(files: ExtractedCodeFile[], mode: RunMode): ExtractedCodeFile[] {
  if (mode === 'web') {
    return files.filter((f) => f.selected && isWebFile(f));
  }
  return files.filter((f) => executionTarget(f.language) === mode);
}

/**
 * Choose the default entry-point file for a server/python run mode.
 * Heuristics: main.* / index.* / files containing a known entry-point
 * signature, falling back to the first file of the mode.
 */
export function pickDefaultMain(files: ExtractedCodeFile[], mode: RunMode): ExtractedCodeFile | null {
  const candidates = filesForRunMode(files, mode);
  if (candidates.length === 0) return null;

  const basenameLower = (f: ExtractedCodeFile) => f.filename.toLowerCase();

  // Java: prefer the class containing a main method
  if (mode === 'java') {
    const withMain = candidates.find((f) => /public\s+(?:static\s+|final\s+)*void\s+main\s*\(/.test(f.code));
    if (withMain) return withMain;
    const mainNamed = candidates.find((f) => /^main\.java$/i.test(basenameLower(f)));
    if (mainNamed) return mainNamed;
  }

  // Python: prefer main.py / app.py, or a script with the __main__ guard
  if (mode === 'python') {
    const withGuard = candidates.find((f) => /if\s+__name__\s*==\s*['"]__main__['"]/.test(f.code));
    if (withGuard) return withGuard;
    const mainNamed = candidates.find((f) => /^(main|app|run)\.py$/i.test(basenameLower(f)));
    if (mainNamed) return mainNamed;
  }

  // Generic: main.* or index.* naming
  const generic = candidates.find((f) => /^(main|index|app|run|program|server)\.[a-z0-9]+$/i.test(basenameLower(f)));
  if (generic) return generic;

  return candidates[0];
}

/**
 * Parse a filename out of a fence info string, e.g. "html index.html"
 * or "js src/app.jsx". Returns null if no recognizable filename.
 */
function parseFilenameFromInfoString(infoString: string): string | null {
  // Remove anything in brackets/braces: {...} [...] (...) used by some highlighters
  const cleaned = infoString.replace(/\{[^}]*\}/g, '').replace(/\[[^\]]*\]/g, '').replace(/\([^)]*\)/g, '').trim();
  if (!cleaned) return null;

  // Split on whitespace and look for something that looks like a filename
  const parts = cleaned.split(/\s+/);
  for (const part of parts) {
    // Skip pure language tokens and highlight options (e.g. "js", "diff", "hl_lines=2")
    if (/^[a-zA-Z+#]+$/.test(part) && !part.includes('.')) continue;
    if (part.includes('=')) continue;
    // Looks like a filename if it has an extension
    if (/\.[a-zA-Z0-9]+$/.test(part)) {
      // Keep the relative path (e.g. src/app.jsx) so the tree can show folders
      return part.replace(/^\.?\//, '');
    }
  }
  return null;
}

/**
 * Try to detect a filename from HTML comments in the code, like
 * <!-- index.html --> at the start of a block, or from well-known
 * declarations (Java public class names, python __main__ guards).
 */
function parseFilenameFromContent(code: string, lang: CodeLang): string | null {
  const firstLine = code.split('\n')[0]?.trim() || '';

  if (lang === 'html' || lang === 'svg') {
    // <!-- index.html --> or <!-- styles.css -->
    const commentMatch = firstLine.match(/^<!--\s*([\w./\\-]+\.[a-zA-Z0-9]+)\s*-->/);
    if (commentMatch) return commentMatch[1].replace(/\\/g, '/').split('/').pop() || null;
  } else {
    // // styles.css or /* styles.css */ or # script.py
    const commentMatch = firstLine.match(/^(?:\/\/|\/\*|#|--)(?:\s*)([\w.\\/-]+\.[a-zA-Z0-9]+)(?:\*\/)?\b/);
    if (commentMatch) return commentMatch[1].replace(/\\/g, '/').split('/').pop() || null;
  }

  // Java: public class must live in a file named after the class
  if (lang === 'java') {
    const classMatch = code.match(/public\s+(?:final\s+|abstract\s+|strictfp\s+)*class\s+([A-Za-z_]\w*)/);
    if (classMatch) return `${classMatch[1]}.java`;
  }

  return null;
}

/**
 * Regex-based fenced code block matcher. Supports:
 * - ```lang ... ```
 * - ```lang filename ... ```
 * - ~~~~lang ... ~~~~ (rare, but supported)
 * Handles escaped fences inside content loosely (non-greedy).
 */
const FENCED_CODE_RE = /(?:^|\n)([ \t]*)(`{3,}|~{3,})[ \t]*([^\n`]*)\n([\s\S]*?)(?:\n[ \t]*\2[ \t]*(?=\n|$)|$)/g;

/** Normalize a relative path into { path, filename, dir } */
function normalizePath(rawPath: string): { path: string; filename: string; dir: string } {
  const clean = rawPath.replace(/\\/g, '/').replace(/^\.?\//, '');
  const slashIdx = clean.lastIndexOf('/');
  const filename = slashIdx >= 0 ? clean.slice(slashIdx + 1) : clean;
  const dir = slashIdx >= 0 ? clean.slice(0, slashIdx) : '';
  return { path: clean, filename, dir };
}

/**
 * Extract all code files from an assistant message's markdown content.
 * Every recognized language becomes a virtual file for the File Manager;
 * non-code fences (diff, mermaid, output logs, ...) are ignored.
 */
export function extractCodeFiles(
  content: string,
  messageId: string
): ExtractedCodeFile[] {
  const files: ExtractedCodeFile[] = [];
  let fileIndex = 0;

  let match: RegExpExecArray | null;
  FENCED_CODE_RE.lastIndex = 0;

  while ((match = FENCED_CODE_RE.exec(content)) !== null) {
    const [fullMatch, _indent, _fenceChar, infoString, code] = match;
    const info = (infoString || '').trim();

    // Determine the language token
    const langToken = info.split(/[\s[{(]/)[0]?.toLowerCase() || '';

    if (SKIP_LANGS.has(langToken)) continue;

    // Try filename from info string
    const pathFromInfo = parseFilenameFromInfoString(info);

    // If we have a filename, use its extension to determine the language
    let language: CodeLang | null = null;
    let path: string | null = null;

    if (pathFromInfo) {
      const ext = pathFromInfo.split('.').pop()?.toLowerCase() || '';
      const langFromExt = EXT_TO_LANG[ext];
      if (langFromExt) {
        language = langFromExt;
        path = pathFromInfo;
      }
    }

    // Fall back to the fence language
    if (!language) {
      language = LANG_ALIASES[langToken] || null;
    }

    // Try to extract filename from content comments / declarations
    if (language && !path) {
      path = parseFilenameFromContent(code, language);
    }

    // Nothing recognizable — skip
    if (!language) continue;

    // Skip very short code blocks (likely inline examples, not files)
    const trimmedCode = code.replace(/\s+$/, '');
    if (trimmedCode.length < 5) continue;

    let finalPath = path || FALLBACK_FILENAMES[language];

    // Unnamed blocks colliding on the fallback filename become unique files
    // (e.g. two anonymous python blocks -> main.py, main_2.py)
    if (!path && files.some((f) => f.path === finalPath)) {
      const dotIdx = finalPath.lastIndexOf('.');
      const stem = dotIdx > 0 ? finalPath.slice(0, dotIdx) : finalPath;
      const ext = dotIdx > 0 ? finalPath.slice(dotIdx) : '';
      let n = 2;
      while (files.some((f) => f.path === `${stem}_${n}${ext}`)) n++;
      finalPath = `${stem}_${n}${ext}`;
    }

    const { path: filePath, filename, dir } = normalizePath(finalPath);

    // If the same path appears twice, keep the most recent version
    const existingIdx = files.findIndex((f) => f.path === filePath);
    if (existingIdx >= 0) {
      // Replace the older file with the newer code (models often iterate)
      files[existingIdx] = {
        ...files[existingIdx],
        code: trimmedCode,
        lines: trimmedCode.split('\n').length,
        messageId,
      };
      continue;
    }

    files.push({
      id: `file_${messageId}_${fileIndex}`,
      path: filePath,
      filename,
      dir,
      language,
      rawLanguage: langToken,
      code: trimmedCode,
      messageId,
      selected: true, // selected by default
      lines: trimmedCode.split('\n').length,
    });
    fileIndex++;
  }

  return files;
}

/**
 * Scan all messages in a conversation and return the latest version of
 * each unique code file. Later messages override earlier ones with the
 * same path (models iterate on files).
 */
export function extractFilesFromConversation(
  messages: Array<{ id: string; role: string; content: string }>
): ExtractedCodeFile[] {
  const fileMap = new Map<string, ExtractedCodeFile>();

  for (const msg of messages) {
    if (msg.role !== 'assistant') continue;
    const extracted = extractCodeFiles(msg.content, msg.id);
    for (const file of extracted) {
      // Later files with the same path replace earlier ones
      fileMap.set(file.path, file);
    }
  }

  // Sort: HTML first, then CSS, JS, python, java, then the rest
  const order: Record<CodeLang, number> = {
    html: 0,
    svg: 1,
    css: 2,
    javascript: 3,
    typescript: 4,
    jsx: 5,
    tsx: 6,
    json: 7,
    python: 8,
    java: 9,
    c: 10,
    cpp: 11,
    csharp: 12,
    go: 13,
    rust: 14,
    ruby: 15,
    php: 16,
    bash: 17,
    sql: 18,
    yaml: 19,
    toml: 20,
    other: 21,
  };

  return Array.from(fileMap.values()).sort((a, b) => {
    return order[a.language] - order[b.language] || a.path.localeCompare(b.path);
  });
}

/** Check if any file is executable by one of the built-in runners */
export function hasRunnableFiles(files: ExtractedCodeFile[]): boolean {
  return files.some((f) => executionTarget(f.language) !== null);
}

/** Escape a string for safe embedding inside a <script> tag (JSON or JS) */
export function escapeForScriptTag(text: string): string {
  // Only a literal "</script" can terminate the element early; escaping just
  // the slash keeps JS strings AND JSX markup (e.g. </div>) fully valid.
  return text.replace(/<\/script/gi, '<\\/script');
}

/** Wrap JS code in a <script> block, escaping any premature </script> in the code */
function wrapInlineScript(code: string, attrs = ''): string {
  return `<script${attrs}>\n${escapeForScriptTag(code)}\n<` + '/script>';
}

/**
 * Build a single self-contained HTML document from the selected files.
 * - The HTML file becomes the base document (or a default shell if none).
 * - CSS files are injected as <style> blocks in <head>.
 * - JS files are injected as <script> blocks before </body>.
 * - JSX/TSX are transpiled with Babel standalone (loaded from CDN only
 *   when those files are present and selected).
 */
export function buildPreviewDocument(files: ExtractedCodeFile[]): string {
  const selected = files.filter((f) => f.selected);

  const htmlFiles = selected.filter((f) => f.language === 'html');
  const cssFiles = selected.filter((f) => f.language === 'css');
  const jsFiles = selected.filter((f) => f.language === 'javascript');
  const tsFiles = selected.filter((f) => f.language === 'typescript');
  const jsxFiles = selected.filter((f) => f.language === 'jsx' || f.language === 'tsx');
  const jsonFiles = selected.filter((f) => f.language === 'json');
  const svgFiles = selected.filter((f) => f.language === 'svg');

  // ---------- CSS ----------
  const cssStyles = cssFiles.map((f) => `/* ${f.path} */\n${f.code}`).join('\n\n');
  // Only a literal </style> could break out of the style block
  const styleTag = cssStyles
    ? `<style>\n${cssStyles.replace(/<\/style/gi, '<\\/style')}\n</style>`
    : '';

  // ---------- JS ----------
  // Plain JS can be embedded directly.
  const plainJs = jsFiles.map((f) => `/* ${f.path} */\n${f.code}`).join('\n\n');

  // TS: most simple TS samples are valid JS — embed directly with a note.
  const tsJs = tsFiles.map((f) => `/* ${f.path} (TypeScript; type annotations may be stripped by your browser's tolerance) */\n${f.code}`).join('\n\n');

  // JSX/TSX needs Babel standalone — injected from CDN only when needed.
  const needsBabel = jsxFiles.length > 0;
  const jsxCode = jsxFiles.map((f) => `/* ${f.path} */\n${f.code}`).join('\n\n');

  // JSON files are exposed as a global `FILES` object so scripts can read them
  const jsonGlobals = jsonFiles.length > 0
    ? wrapInlineScript(`window.__FILES = window.__FILES || {};\n${jsonFiles
        .map((f) => {
          let safe = 'null';
          try {
            safe = JSON.stringify(JSON.parse(f.code));
          } catch {
            safe = JSON.stringify(f.code);
          }
          return `window.__FILES[${JSON.stringify(f.path)}] = ${safe};`;
        })
        .join('\n')}`)
    : '';

  // ---------- HTML ----------
  let baseHtml: string;
  if (htmlFiles.length > 0) {
    // Use the first (or only) HTML file as the document.
    const main = htmlFiles[htmlFiles.length - 1]; // prefer the latest HTML file
    baseHtml = main.code;

    // If the model didn't include <html> or <body> tags, wrap it
    if (!/<html[\s>]/i.test(baseHtml) && !/<body[\s>]/i.test(baseHtml)) {
      baseHtml = `<!DOCTYPE html>\n<html>\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n</head>\n<body>\n${baseHtml}\n</body>\n</html>`;
    }
  } else {
    // No HTML file — build a shell document around the CSS/JS
    const svgContent = svgFiles.map((f) => f.code).join('\n');
    baseHtml = `<!DOCTYPE html>\n<html>\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n</head>\n<body>\n${svgContent}\n</body>\n</html>`;
  }

  // ---------- Injection ----------
  // Inject <style> into <head> (or create one)
  let doc = baseHtml;
  if (styleTag) {
    if (/<\/head>/i.test(doc)) {
      doc = doc.replace(/<\/head>/i, `${styleTag}\n</head>`);
    } else if (/<head[\s>]/i.test(doc)) {
      doc = doc.replace(/<head([^>]*)>/i, `<head$1>\n${styleTag}`);
    } else {
      // No head tag; prepend after <html> or at top
      doc = styleTag + '\n' + doc;
    }
  }

  // Build the script bundle that goes before </body>
  const scriptParts: string[] = [];
  scriptParts.push(jsonGlobals);
  if (plainJs) {
    scriptParts.push(wrapInlineScript(`try {\n${plainJs}\n} catch (e) { console.error('JS runtime error:', e); }`));
  }
  if (tsJs) {
    scriptParts.push(wrapInlineScript(`try {\n${tsJs}\n} catch (e) { console.error('TS runtime error:', e); }`));
  }
  if (needsBabel) {
    // React + ReactDOM + Babel standalone from unpkg CDN
    scriptParts.push(
      `<script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>\n` +
      `<script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>\n` +
      `<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>\n` +
      wrapInlineScript(`try {\n${jsxCode}\n} catch (e) { console.error('JSX runtime error:', e); }`, ' type="text/babel" data-presets="env,react"')
    );
  }
  const scriptBundle = scriptParts.filter(Boolean).join('\n');

  if (scriptBundle) {
    if (/<\/body>/i.test(doc)) {
      doc = doc.replace(/<\/body>/i, `${scriptBundle}\n</body>`);
    } else {
      // No body close tag; append at end
      doc = doc + '\n' + scriptBundle;
    }
  }

  return doc;
}
