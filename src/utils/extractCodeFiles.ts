// ============================================================
// Code File Extraction from Chat Messages
// Parses assistant markdown responses and extracts fenced code
// blocks as virtual files (HTML / CSS / JS / TS / JSX / etc.)
// that can be previewed live in an iframe.
// ============================================================

export type RunnableLang =
  | 'html'
  | 'css'
  | 'javascript'
  | 'typescript'
  | 'jsx'
  | 'tsx'
  | 'json'
  | 'svg';

export interface ExtractedCodeFile {
  /** Unique id for React keys */
  id: string;
  /** Best-effort file name, e.g. "index.html", "styles.css", "script.js" */
  filename: string;
  /** Normalized language id used for execution decisions */
  language: RunnableLang;
  /** Raw language string from the fence (e.g. "js", "javascript", "html") */
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

/** Map of fence-language aliases to canonical runnable languages */
const LANG_ALIASES: Record<string, RunnableLang> = {
  html: 'html',
  htm: 'html',
  xml: 'html',
  css: 'css',
  scss: 'css',
  less: 'css',
  javascript: 'javascript',
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  ecmascript: 'javascript',
  typescript: 'typescript',
  ts: 'typescript',
  jsx: 'jsx',
  tsx: 'tsx',
  react: 'jsx',
  json: 'json',
  svg: 'svg',
};

/**
 * Fallback filenames per language, used when the fence info-string
 * or the code content itself doesn't reveal a filename.
 */
const FALLBACK_FILENAMES: Record<RunnableLang, string> = {
  html: 'index.html',
  css: 'styles.css',
  javascript: 'script.js',
  typescript: 'script.ts',
  jsx: 'App.jsx',
  tsx: 'App.tsx',
  json: 'data.json',
  svg: 'image.svg',
};

/** File extensions that map to a language for filename parsing */
const EXT_TO_LANG: Record<string, RunnableLang> = {
  html: 'html',
  htm: 'html',
  css: 'css',
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  ts: 'typescript',
  jsx: 'jsx',
  tsx: 'tsx',
  json: 'json',
  svg: 'svg',
};

const HTML_EXT_RE = /\.(html|htm)$/i;
const CSS_EXT_RE = /\.(css|scss|less)$/i;
const JS_EXT_RE = /\.(js|mjs|cjs|jsx|tsx|ts)$/i;

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
    if (/^[a-zA-Z]+$/.test(part) && !part.includes('.')) continue;
    if (part.includes('=')) continue;
    // Looks like a filename if it has an extension
    if (/\.[a-zA-Z0-9]+$/.test(part)) {
      // Take only the basename (strip paths like src/app.jsx -> app.jsx)
      return part.split('/').pop() || null;
    }
  }
  return null;
}

/**
 * Try to detect a filename from HTML comments in the code, like
 * <!-- index.html --> at the start of a block.
 */
function parseFilenameFromContent(code: string, lang: RunnableLang): string | null {
  const firstLine = code.split('\n')[0]?.trim() || '';

  if (lang === 'html' || lang === 'svg') {
    // <!-- index.html --> or <!-- styles.css -->
    const commentMatch = firstLine.match(/^<!--\s*([\w./-]+\.(?:html?|css|js|mjs|ts|jsx|tsx|json|svg))\s*-->/i);
    if (commentMatch) return commentMatch[1].split('/').pop() || null;
  } else {
    // // styles.css or /* styles.css */ or # script.js
    const commentMatch = firstLine.match(/^(?:\/\/|\/\*|#)\s*([\w./-]+\.(?:css|scss|less|js|mjs|cjs|ts|jsx|tsx|json))\s*(?:\*\/)?\s*$/i);
    if (commentMatch) return commentMatch[1].split('/').pop() || null;
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

/**
 * Extract all runnable code files from an assistant message's markdown content.
 * Non-runnable languages (python, bash, etc.) are ignored.
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
    const langToken = info.split(/[\s\[{(]/)[0]?.toLowerCase() || '';

    // Try filename from info string
    const filenameFromInfo = parseFilenameFromInfoString(info);

    // If we have a filename, use its extension to determine the language
    let language: RunnableLang | null = null;
    let filename: string | null = null;

    if (filenameFromInfo) {
      const ext = filenameFromInfo.split('.').pop()?.toLowerCase() || '';
      const langFromExt = EXT_TO_LANG[ext];
      if (langFromExt) {
        language = langFromExt;
        filename = filenameFromInfo;
      }
    }

    // Fall back to the fence language
    if (!language) {
      language = LANG_ALIASES[langToken] || null;
    }

    // Try to extract filename from content comments
    if (language && !filename) {
      filename = parseFilenameFromContent(code, language);
    }

    // Skip non-runnable languages entirely (python, bash, java, etc.)
    if (!language) continue;

    // Skip very short code blocks (likely inline examples, not files)
    const trimmedCode = code.replace(/\s+$/, '');
    if (trimmedCode.length < 5) continue;

    // Fallback filename — handle duplicate names by appending a counter
    let finalFilename = filename || FALLBACK_FILENAMES[language];
    const existingNames = files.map((f) => f.filename);
    if (existingNames.includes(finalFilename)) {
      // If the same filename appears twice, keep the most recent version
      const existingIdx = files.findIndex((f) => f.filename === finalFilename);
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
    }

    files.push({
      id: `file_${messageId}_${fileIndex}`,
      filename: finalFilename,
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
 * same filename (models iterate on files).
 */
export function extractFilesFromConversation(
  messages: Array<{ id: string; role: string; content: string }>
): ExtractedCodeFile[] {
  const fileMap = new Map<string, ExtractedCodeFile>();

  for (const msg of messages) {
    if (msg.role !== 'assistant') continue;
    const extracted = extractCodeFiles(msg.content, msg.id);
    for (const file of extracted) {
      // Later files with the same name replace earlier ones
      fileMap.set(file.filename, file);
    }
  }

  // Sort: HTML first, then CSS, then JS, then others (order of assembly)
  const order: Record<RunnableLang, number> = {
    html: 0,
    svg: 1,
    css: 2,
    javascript: 3,
    typescript: 4,
    jsx: 5,
    tsx: 6,
    json: 7,
  };

  return Array.from(fileMap.values()).sort((a, b) => {
    return order[a.language] - order[b.language] || a.filename.localeCompare(b.filename);
  });
}

/** Check if any file is actually runnable (HTML/CSS/JS present) */
export function hasRunnableFiles(files: ExtractedCodeFile[]): boolean {
  const langs = new Set(files.map((f) => f.language));
  return (
    langs.has('html') ||
    langs.has('css') ||
    langs.has('javascript') ||
    langs.has('jsx') ||
    langs.has('tsx') ||
    langs.has('typescript')
  );
}

/**
 * Build a single self-contained HTML document from the selected files.
 * - The HTML file becomes the base document (or a default shell if none).
 * - CSS files are injected as <style> blocks in <head>.
 * - JS files are injected as <script> blocks before </body>.
 * - JSX/TSX are transpiled to plain JS with a lightweight Babel standalone
 *   transform (only used when those files are present and selected).
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
  const cssStyles = cssFiles.map((f) => `/* ${f.filename} */\n${f.code}`).join('\n\n');
  const styleTag = cssStyles
    ? `<style>\n${cssStyles}\n</style>`
    : '';

  // ---------- JS ----------
  // Plain JS can be embedded directly.
  const plainJs = jsFiles.map((f) => `/* ${f.filename} */\n${f.code}`).join('\n\n');

  // TS is stripped of types via a very light transform (remove `: type`
  // annotations is unreliable; instead we simply embed as JS and let it
  // run — most simple TS samples are valid JS). For robustness, we skip
  // transpilation and embed directly with a note.
  const tsJs = tsFiles.map((f) => `/* ${f.filename} (TypeScript; type annotations may be stripped by your browser's tolerance) */\n${f.code}`).join('\n\n');

  // JSX/TSX needs Babel standalone — injected from CDN only when needed.
  const needsBabel = jsxFiles.length > 0;
  const jsxCode = jsxFiles.map((f) => `/* ${f.filename} */\n${f.code}`).join('\n\n');

  // JSON files are exposed as a global `FILES` object so scripts can read them
  const jsonGlobals = jsonFiles.length > 0
    ? `<script>\nwindow.__FILES = window.__FILES || {};\n${jsonFiles
        .map((f) => {
          let safe = 'null';
          try {
            safe = JSON.stringify(JSON.parse(f.code));
          } catch {
            safe = JSON.stringify(f.code);
          }
          return `window.__FILES[${JSON.stringify(f.filename)}] = ${safe};`;
        })
        .join('\n')}\n</script>`
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
    scriptParts.push(`<script>\ntry {\n${plainJs}\n} catch (e) { console.error('JS runtime error:', e); }\n</script>`);
  }
  if (tsJs) {
    scriptParts.push(`<script>\ntry {\n${tsJs}\n} catch (e) { console.error('TS runtime error:', e); }\n</script>`);
  }
  if (needsBabel) {
    // React + ReactDOM + Babel standalone from unpkg CDN
    scriptParts.push(
      `<script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>\n` +
      `<script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>\n` +
      `<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>\n` +
      `<script type="text/babel" data-presets="env,react">\ntry {\n${jsxCode}\n} catch (e) { console.error('JSX runtime error:', e); }\n</script>`
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
