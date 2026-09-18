import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  FileCode2,
  FileJson,
  FileText,
  Globe,
  Braces,
  Coffee,
  Terminal,
  Gem,
  Database,
  FileCog,
  Folder,
  FolderOpen,
  FolderTree,
  ChevronRight,
  ChevronDown,
  Play,
  Square,
  RotateCcw,
  Check,
  X,
  Copy,
  Loader2,
  AlertTriangle,
  Eye,
  Code2,
  MonitorSmartphone,
  Layers,
} from 'lucide-react';
import {
  ExtractedCodeFile,
  RunMode,
  CodeLang,
  buildPreviewDocument,
  hasRunnableFiles,
  resolveRunModes,
  filesForRunMode,
  pickDefaultMain,
  isWebFile,
  executionTarget,
} from '../utils/extractCodeFiles';
import { buildPythonRunnerDoc } from '../utils/pythonRunner';
import { runOnServer, fetchRunnerStatus, RunCodeResult, RunnerStatusMap } from '../services/runner';

interface FileManagerPanelProps {
  /** All code files extracted from the active conversation */
  files: ExtractedCodeFile[];
  /** Whether the panel is visible */
  isOpen: boolean;
  /** Toggle panel visibility */
  onToggle: () => void;
}

type ViewTab = 'files' | 'preview' | 'console';
type PythonBackend = 'pyodide' | 'server';

const RUN_MODE_META: Record<RunMode, { label: string; runLabel: string; lang: string }> = {
  web: { label: 'Web', runLabel: 'Run Web App', lang: 'web' },
  python: { label: 'Python', runLabel: 'Run Python', lang: 'python' },
  java: { label: 'Java', runLabel: 'Run Java', lang: 'java' },
  node: { label: 'Node.js', runLabel: 'Run Node', lang: 'javascript' },
  c: { label: 'C', runLabel: 'Run C', lang: 'c' },
  cpp: { label: 'C++', runLabel: 'Run C++', lang: 'cpp' },
  go: { label: 'Go', runLabel: 'Run Go', lang: 'go' },
  ruby: { label: 'Ruby', runLabel: 'Run Ruby', lang: 'ruby' },
  php: { label: 'PHP', runLabel: 'Run PHP', lang: 'php' },
  bash: { label: 'Bash', runLabel: 'Run Bash', lang: 'bash' },
};

const TOOL_MISSING_HINTS: Record<string, string> = {
  javac: 'The Java toolchain (JDK 11+) is not installed on the ChatForge host. Install it (e.g. “sudo apt install default-jdk” or from adoptium.net) and try again.',
  python3: 'Python 3 is not installed on the ChatForge host. Install it (e.g. “sudo apt install python3”) and try again.',
  node: 'Node.js is not installed on the ChatForge host. Install it from nodejs.org and try again.',
  gcc: 'The GCC compiler is not installed on the ChatForge host. Install it (e.g. “sudo apt install build-essential”) and try again.',
  'g++': 'The G++ compiler is not installed on the ChatForge host. Install it (e.g. “sudo apt install build-essential”) and try again.',
  go: 'The Go toolchain is not installed on the ChatForge host. Install it from go.dev/dl and try again.',
  ruby: 'Ruby is not installed on the ChatForge host. Install it (e.g. “sudo apt install ruby”) and try again.',
  php: 'PHP is not installed on the ChatForge host. Install it (e.g. “sudo apt install php-cli”) and try again.',
  bash: 'bash is not available on the ChatForge host.',
};

/** Colored icon per file language */
const FileIcon: React.FC<{ language: CodeLang; className?: string }> = ({ language, className }) => {
  switch (language) {
    case 'html':
      return <Globe className={className || 'w-3.5 h-3.5 text-orange-400'} />;
    case 'css':
      return <Layers className={className || 'w-3.5 h-3.5 text-blue-400'} />;
    case 'javascript':
      return <FileCode2 className={className || 'w-3.5 h-3.5 text-yellow-400'} />;
    case 'typescript':
      return <FileCode2 className={className || 'w-3.5 h-3.5 text-blue-500'} />;
    case 'jsx':
    case 'tsx':
      return <Braces className={className || 'w-3.5 h-3.5 text-cyan-400'} />;
    case 'json':
      return <FileJson className={className || 'w-3.5 h-3.5 text-emerald-400'} />;
    case 'svg':
      return <FileText className={className || 'w-3.5 h-3.5 text-purple-400'} />;
    case 'python':
      return <Terminal className={className || 'w-3.5 h-3.5 text-sky-400'} />;
    case 'java':
      return <Coffee className={className || 'w-3.5 h-3.5 text-red-400'} />;
    case 'c':
      return <FileCode2 className={className || 'w-3.5 h-3.5 text-rose-300'} />;
    case 'cpp':
      return <FileCode2 className={className || 'w-3.5 h-3.5 text-pink-400'} />;
    case 'csharp':
      return <Braces className={className || 'w-3.5 h-3.5 text-violet-400'} />;
    case 'go':
      return <FileCode2 className={className || 'w-3.5 h-3.5 text-teal-400'} />;
    case 'rust':
      return <FileCog className={className || 'w-3.5 h-3.5 text-orange-300'} />;
    case 'ruby':
      return <Gem className={className || 'w-3.5 h-3.5 text-red-300'} />;
    case 'php':
      return <FileCode2 className={className || 'w-3.5 h-3.5 text-indigo-400'} />;
    case 'bash':
      return <Terminal className={className || 'w-3.5 h-3.5 text-green-400'} />;
    case 'sql':
      return <Database className={className || 'w-3.5 h-3.5 text-amber-300'} />;
    case 'yaml':
    case 'toml':
      return <FileCog className={className || 'w-3.5 h-3.5 text-zinc-400'} />;
    default:
      return <FileText className={className || 'w-3.5 h-3.5 text-zinc-400'} />;
  }
};

// ------------------------------------------------------------------
// File tree model
// ------------------------------------------------------------------
interface TreeNode {
  name: string;
  fullPath: string;
  isDir: boolean;
  children: TreeNode[];
  file?: ExtractedCodeFile;
}

function buildFileTree(files: ExtractedCodeFile[]): TreeNode[] {
  const root: TreeNode = { name: '', fullPath: '', isDir: true, children: [] };
  for (const f of files) {
    const parts = f.path.split('/').filter(Boolean);
    let cur = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const name = parts[i];
      let next = cur.children.find((c) => c.isDir && c.name === name);
      if (!next) {
        next = {
          name,
          fullPath: cur.fullPath ? `${cur.fullPath}/${name}` : name,
          isDir: true,
          children: [],
        };
        cur.children.push(next);
      }
      cur = next;
    }
    cur.children.push({
      name: parts[parts.length - 1],
      fullPath: f.path,
      isDir: false,
      children: [],
      file: f,
    });
  }
  const sortRec = (n: TreeNode) => {
    n.children.sort((a, b) => Number(b.isDir) - Number(a.isDir) || a.name.localeCompare(b.name));
    n.children.forEach(sortRec);
  };
  sortRec(root);
  return root.children;
}

export const FileManagerPanel: React.FC<FileManagerPanelProps> = ({
  files,
  isOpen,
  onToggle,
}) => {
  // ---------- View state ----------
  const [view, setView] = useState<ViewTab>('files');
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [collapsedDirs, setCollapsedDirs] = useState<Set<string>>(new Set());

  // ---------- Web preview state ----------
  const [selectedFiles, setSelectedFiles] = useState<Record<string, boolean>>({});
  const [previewDoc, setPreviewDoc] = useState<string>('');
  const [previewKey, setPreviewKey] = useState(0);

  // ---------- Runner state ----------
  const [runModes, setRunModes] = useState<RunMode[]>([]);
  const [activeRunMode, setActiveRunMode] = useState<RunMode>('web');
  const [mainOverrides, setMainOverrides] = useState<Record<string, string>>({});
  const [pythonBackend, setPythonBackend] = useState<PythonBackend>('pyodide');
  const [pyDoc, setPyDoc] = useState<string>('');
  const [pyKey, setPyKey] = useState(0);
  const [serverRun, setServerRun] = useState<{
    state: 'idle' | 'running' | 'done' | 'error';
    result?: RunCodeResult;
    mode?: RunMode;
  }>({ state: 'idle' });
  const [runnerStatus, setRunnerStatus] = useState<RunnerStatusMap>({});
  const abortRef = useRef<AbortController | null>(null);

  // Re-init selection when the file list changes identity
  const fileIds = useMemo(() => files.map((f) => f.id).join(','), [files]);
  useEffect(() => {
    const initial: Record<string, boolean> = {};
    files.forEach((f) => (initial[f.id] = f.selected));
    setSelectedFiles(initial);
  }, [fileIds]); // eslint-disable-line react-hooks/exhaustive-deps

  // Local view of files with web-selection applied
  const filesWithSelection = useMemo(
    () => files.map((f) => ({ ...f, selected: selectedFiles[f.id] !== false })),
    [files, selectedFiles]
  );

  // Available run modes (priority ordered: web → python → java → …)
  const modes = useMemo(() => resolveRunModes(filesWithSelection), [fileIds]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the active run mode valid when the file set changes
  useEffect(() => {
    setRunModes(modes);
    setActiveRunMode((prev) => (modes.includes(prev) ? prev : modes[0] || 'web'));
  }, [modes]);

  // Keep the active file valid when the file set changes
  useEffect(() => {
    if (!files.some((f) => f.id === activeFileId)) {
      setActiveFileId(files[0]?.id || null);
    }
  }, [fileIds]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeRunModeFiles = useMemo(
    () => filesForRunMode(filesWithSelection, activeRunMode),
    [filesWithSelection, activeRunMode]
  );

  // Entry-point file for the current mode (user override > heuristic)
  const mainFile = useMemo(() => {
    const override = mainOverrides[activeRunMode];
    const found = override ? activeRunModeFiles.find((f) => f.id === override) : null;
    return found || pickDefaultMain(activeRunModeFiles, activeRunMode);
  }, [activeRunModeFiles, mainOverrides, activeRunMode]);

  // Directories default to expanded; only track the collapsed ones
  const tree = useMemo(() => buildFileTree(files), [files]);

  const activeFile = useMemo(
    () => files.find((f) => f.id === (activeFileId || files[0]?.id)),
    [files, activeFileId]
  );

  const runnable = useMemo(() => hasRunnableFiles(filesWithSelection), [filesWithSelection]);
  const selectedCount = filesWithSelection.filter((f) => f.selected && isWebFile(f)).length;

  // Probe server toolchain availability (once) when a server-run mode exists
  const hasServerMode = modes.some((m) => m !== 'web');
  useEffect(() => {
    if (!hasServerMode) return;
    let cancelled = false;
    fetchRunnerStatus().then((status) => {
      if (!cancelled) setRunnerStatus(status);
    });
    return () => {
      cancelled = true;
    };
  }, [hasServerMode]);

  const toolForMode = (mode: RunMode): string | null => {
    const toolBinaries: Partial<Record<RunMode, string>> = {
      java: 'javac',
      python: 'python3',
      node: 'node',
      c: 'gcc',
      cpp: 'g++',
      go: 'go',
      ruby: 'ruby',
      php: 'php',
      bash: 'bash',
    };
    const bin = toolBinaries[mode];
    if (!bin) return null;
    const st = runnerStatus[bin];
    if (st && !st.available) return bin;
    return null;
  };
  // Python's default backend runs fully in the browser, so a missing host
  // python3 only matters when the Server backend is selected.
  const missingTool =
    activeRunMode === 'python' && pythonBackend === 'pyodide'
      ? null
      : toolForMode(activeRunMode);

  // ---------- Interactions ----------
  const handleToggleFile = (id: string) => {
    setSelectedFiles((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSelectAllWeb = () => {
    const webFiles = files.filter((f) => isWebFile(f));
    const allSelected = webFiles.every((f) => selectedFiles[f.id] !== false);
    const next: Record<string, boolean> = {};
    files.forEach((f) => (next[f.id] = selectedFiles[f.id] !== false));
    webFiles.forEach((f) => (next[f.id] = !allSelected));
    setSelectedFiles(next);
  };

  const handleToggleDir = (path: string) => {
    setCollapsedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const handleSetMain = (id: string) => {
    setMainOverrides((prev) => ({ ...prev, [activeRunMode]: id }));
  };

  const handleStopRun = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setServerRun({ state: 'error', result: {
      ok: false,
      exitCode: null,
      stdout: '',
      stderr: 'Run cancelled by user.',
      timedOut: false,
    }, mode: activeRunMode });
  }, [activeRunMode]);

  const handleRun = useCallback(async () => {
    if (!runnable) return;

    // ----- Web preview (HTML/CSS/JS) -----
    if (activeRunMode === 'web') {
      const doc = buildPreviewDocument(filesWithSelection);
      setPreviewDoc(doc);
      setPreviewKey((k) => k + 1);
      setView('preview');
      return;
    }

    // ----- Python via Pyodide (in-browser) -----
    if (activeRunMode === 'python' && pythonBackend === 'pyodide') {
      const pyFiles = filesForRunMode(filesWithSelection, 'python').map((f) => ({
        path: f.path,
        code: f.code,
      }));
      const main = mainFile?.path || pyFiles[0]?.path;
      if (!main) return;
      const doc = buildPythonRunnerDoc(pyFiles, main);
      setPyDoc(doc);
      setPyKey((k) => k + 1);
      setView('console');
      return;
    }

    // ----- Server toolchain execution (java / python3 / node / c / cpp / go / ruby / php / bash) -----
    const payload = {
      language: RUN_MODE_META[activeRunMode].lang,
      files: activeRunModeFiles.map((f) => ({ path: f.path, code: f.code })),
      mainFile: mainFile?.path,
    };
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setServerRun({ state: 'running', mode: activeRunMode });
    setView('console');
    try {
      const result = await runOnServer(payload, controller.signal);
      setServerRun({ state: result.ok ? 'done' : 'error', result, mode: activeRunMode });
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      setServerRun({
        state: 'error',
        mode: activeRunMode,
        result: {
          ok: false,
          exitCode: null,
          stdout: '',
          stderr: err?.message || 'Runner request failed.',
          timedOut: false,
        },
      });
    } finally {
      abortRef.current = null;
    }
  }, [runnable, activeRunMode, pythonBackend, filesWithSelection, mainFile, activeRunModeFiles]);

  const handleRunWebFromPreview = useCallback(() => {
    const doc = buildPreviewDocument(filesWithSelection);
    setPreviewDoc(doc);
    setPreviewKey((k) => k + 1);
  }, [filesWithSelection]);

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // ---------------- Tree rendering ----------------
  const renderNode = (node: TreeNode, depth: number): React.ReactNode => {
    const indent = { paddingLeft: `${depth * 12 + 8}px` };

    if (node.isDir) {
      const expanded = !collapsedDirs.has(node.fullPath);
      return (
        <div key={`dir:${node.fullPath}`}>
          <button
            onClick={() => handleToggleDir(node.fullPath)}
            className="w-full flex items-center gap-1.5 py-1.5 pr-2 text-left hover:bg-zinc-800/50 transition-colors cursor-pointer"
            style={indent}
            title={node.fullPath}
          >
            {expanded ? (
              <ChevronDown className="w-3 h-3 text-zinc-500 shrink-0" />
            ) : (
              <ChevronRight className="w-3 h-3 text-zinc-500 shrink-0" />
            )}
            {expanded ? (
              <FolderOpen className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            ) : (
              <Folder className="w-3.5 h-3.5 text-blue-400/80 shrink-0" />
            )}
            <span className="text-[11px] font-medium text-zinc-300 truncate">{node.name}</span>
          </button>
          {expanded && node.children.map((child) => renderNode(child, depth + 1))}
        </div>
      );
    }

    const file = node.file!;
    const isActive = activeFile?.id === file.id;
    const isSelected = selectedFiles[file.id] !== false;
    const target = executionTarget(file.language);
    const isMain = mainFile?.id === file.id;

    return (
      <div
        key={file.id}
        className={`group flex items-center gap-1.5 py-1.5 pr-2 cursor-pointer transition-colors ${
          isActive ? 'bg-blue-500/10' : 'hover:bg-zinc-800/50'
        }`}
        style={indent}
        onClick={() => setActiveFileId(file.id)}
        title={file.path}
      >
        <FileIcon language={file.language} className={`w-3.5 h-3.5 shrink-0 ${isActive ? '' : 'opacity-80'}`} />
        <span
          className={`text-[11px] font-mono truncate flex-1 ${
            isActive ? 'text-blue-300' : 'text-zinc-300 group-hover:text-zinc-100'
          }`}
        >
          {file.filename}
        </span>

        {/* Main entry-point selector (python/java/node/c/cpp/go/ruby/php/bash) */}
        {target && target !== 'web' && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleSetMain(file.id);
            }}
            className={`p-0.5 rounded shrink-0 transition cursor-pointer ${
              isMain
                ? 'text-emerald-400'
                : 'text-zinc-600 opacity-0 group-hover:opacity-100 hover:text-emerald-300'
            }`}
            title={isMain ? `Entry point — will run ${file.path}` : `Set ${file.path} as entry point`}
          >
            <Play className="w-3 h-3" />
          </button>
        )}

        {/* Web preview inclusion checkbox */}
        {target === 'web' && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleToggleFile(file.id);
            }}
            className={`w-3.5 h-3.5 shrink-0 rounded border flex items-center justify-center transition cursor-pointer ${
              isSelected ? 'bg-blue-500 border-blue-500' : 'border-zinc-600 hover:border-blue-400 opacity-0 group-hover:opacity-100'
            }`}
            title={isSelected ? 'Included in web preview' : 'Excluded from web preview'}
          >
            {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
          </button>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  const consoleMode = serverRun.mode || activeRunMode;
  const serverResult = serverRun.result;
  const showPyodideIframe = activeRunMode === 'python' && pythonBackend === 'pyodide' && pyDoc;
  const runButtonTitle = missingTool
    ? `${missingTool} was not found on the host — ${TOOL_MISSING_HINTS[missingTool] || 'install it and retry.'}`
    : activeRunMode === 'web'
    ? `Assemble ${selectedCount} selected web file${selectedCount !== 1 ? 's' : ''} into a live preview`
    : activeRunMode === 'python' && pythonBackend === 'pyodide'
    ? `Run ${mainFile?.path || 'main file'} with Python (Pyodide, in your browser)`
    : `Run ${mainFile?.path || 'entry point'} on the ChatForge host`;

  return (
    <div id="file-manager-panel" className="flex flex-col w-full h-full bg-zinc-950/95 border-l border-zinc-800/80 overflow-hidden">
      {/* Panel Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/80 bg-zinc-900/50 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <FolderTree className="w-4 h-4 text-blue-400 shrink-0" />
          <span className="text-sm font-semibold text-zinc-100">File Manager</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">
            {files.length} file{files.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onToggle}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition cursor-pointer"
            title="Close panel"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Toolbar: view tabs + runner controls */}
      <div className="flex items-center gap-1 px-3 pt-2.5 pb-2 border-b border-zinc-800/60 shrink-0 flex-wrap">
        <button
          onClick={() => setView('files')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
            view === 'files'
              ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 border border-transparent'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>Files</span>
        </button>
        <button
          onClick={() => setView('preview')}
          disabled={activeRunMode !== 'web'}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
            view === 'preview'
              ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
              : activeRunMode === 'web'
              ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 border border-transparent cursor-pointer'
              : 'text-zinc-600 border border-transparent cursor-not-allowed'
          }`}
          title={activeRunMode === 'web' ? 'Live web preview' : 'Web preview available when HTML/CSS/JS files are present'}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Preview</span>
        </button>
        <button
          onClick={() => setView('console')}
          disabled={activeRunMode === 'web'}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
            view === 'console'
              ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
              : activeRunMode !== 'web'
              ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 border border-transparent cursor-pointer'
              : 'text-zinc-600 border border-transparent cursor-not-allowed'
          }`}
          title={activeRunMode === 'web' ? 'Console is used for Python / Java / compiled runs' : 'Program output'}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Console</span>
        </button>

        {/* Run target selector when multiple runtimes are available */}
        {runModes.length > 1 && (
          <select
            value={activeRunMode}
            onChange={(e) => setActiveRunMode(e.target.value as RunMode)}
            className="ml-1 bg-zinc-900 border border-zinc-700 rounded-lg text-[11px] font-medium text-zinc-200 px-1.5 py-1.5 outline-none focus:border-blue-500/50 cursor-pointer"
            title="Choose which runtime to run"
          >
            {runModes.map((m) => (
              <option key={m} value={m}>
                {RUN_MODE_META[m].label}
              </option>
            ))}
          </select>
        )}

        {/* Run button */}
        {runnable && activeRunMode && (
          serverRun.state === 'running' && view === 'console' && !showPyodideIframe ? (
            <button
              onClick={handleStopRun}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition shadow-sm cursor-pointer"
              title="Stop the running program"
            >
              <Square className="w-3 h-3 fill-current" />
              <span>Stop</span>
            </button>
          ) : (
            <button
              onClick={handleRun}
              className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-semibold transition shadow-sm cursor-pointer ${
                missingTool
                  ? 'bg-amber-600 hover:bg-amber-500'
                  : 'bg-emerald-600 hover:bg-emerald-500'
              }`}
              title={runButtonTitle}
            >
              <Play className="w-3.5 h-3.5" />
              <span>{activeRunMode === 'web' ? 'Run App' : RUN_MODE_META[activeRunMode].runLabel}</span>
            </button>
          )
        )}
      </div>

      {/* ---------------- Files view: tree + code viewer ---------------- */}
      {view === 'files' && (
        <div className="flex-1 flex min-h-0">
          {/* Tree column */}
          <div className="w-40 xl:w-44 shrink-0 overflow-y-auto border-r border-zinc-800/60 bg-zinc-950/60 py-1.5">
            {tree.length > 0 ? (
              tree.map((node) => renderNode(node, 0))
            ) : (
              <div className="px-3 py-4 text-[11px] text-zinc-600">No files yet</div>
            )}

            {/* Web selection controls */}
            {files.some((f) => isWebFile(f)) && activeRunMode === 'web' && (
              <div className="mt-2 pt-2 border-t border-zinc-800/60 px-2.5">
                <button
                  onClick={handleSelectAllWeb}
                  className="text-[10px] text-blue-400 hover:text-blue-300 font-medium transition cursor-pointer"
                >
                  {files.filter((f) => isWebFile(f)).every((f) => selectedFiles[f.id] !== false)
                    ? 'Deselect all web files'
                    : 'Select all web files'}
                </button>
                <p className="text-[9px] text-zinc-600 mt-1 leading-snug">
                  Checked files are combined into the live preview.
                </p>
              </div>
            )}
          </div>

          {/* Code viewer */}
          <div className="flex-1 min-w-0 flex flex-col">
            {activeFile ? (
              <>
                <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-800/60 bg-zinc-900/30 shrink-0">
                  <FileIcon language={activeFile.language} />
                  <span className="text-[11px] font-mono font-medium text-zinc-200 truncate flex-1" title={activeFile.path}>
                    {activeFile.path}
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/60 uppercase shrink-0">
                    {activeFile.language}
                  </span>
                  <span className="text-[9px] text-zinc-500 font-mono shrink-0">{activeFile.lines}L</span>
                  <button
                    onClick={() => copyText(activeFile.code)}
                    className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition cursor-pointer shrink-0"
                    title="Copy file contents"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex-1 overflow-auto">
                  <div className="flex min-h-full">
                    <div className="py-3 pl-2.5 pr-2 text-right select-none shrink-0 bg-zinc-950/80 border-r border-zinc-800/40">
                      {activeFile.code.split('\n').map((_, i) => (
                        <div key={i} className="text-[10px] leading-[1.6] font-mono text-zinc-600">
                          {i + 1}
                        </div>
                      ))}
                    </div>
                    <pre className="flex-1 p-3 text-[11px] leading-[1.6] font-mono overflow-x-auto text-zinc-300 whitespace-pre">
                      {activeFile.code}
                    </pre>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center py-12 px-4 text-center space-y-3">
                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                  <FolderTree className="w-6 h-6 text-zinc-600" />
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  No code files detected in this conversation yet.
                  <br />
                  Ask the AI to write code — HTML, CSS, JS, Python, Java and more will appear here.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------------- Preview view: live web app ---------------- */}
      {view === 'preview' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-800/60 bg-zinc-900/30 shrink-0">
            <MonitorSmartphone className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Live Preview</span>
            <span className="text-[10px] text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {selectedCount} file{selectedCount !== 1 ? 's' : ''} combined
            </span>
            <button
              onClick={handleRunWebFromPreview}
              className="ml-auto p-1.5 rounded-lg text-zinc-400 hover:text-blue-300 hover:bg-zinc-800 transition cursor-pointer"
              title="Rebuild & reload preview"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {previewDoc ? (
            <iframe
              key={previewKey}
              srcDoc={previewDoc}
              title="ChatForge Web Preview"
              sandbox="allow-scripts allow-modals allow-popups allow-forms"
              className="flex-1 w-full bg-white border-0"
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center space-y-3 text-center p-6">
              <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                <Play className="w-6 h-6 text-zinc-600" />
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed max-w-48">
                Click <span className="text-emerald-400 font-semibold">Run App</span> to assemble the
                selected HTML / CSS / JS files into a live preview.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ---------------- Console view: python / java / compiled output ---------------- */}
      {view === 'console' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Console toolbar */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-800/60 bg-zinc-900/30 shrink-0 flex-wrap">
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
              {consoleMode ? RUN_MODE_META[consoleMode]?.label || consoleMode : 'Output'}
            </span>

            {/* Python backend switch */}
            {activeRunMode === 'python' && (
              <div className="flex items-center rounded-lg border border-zinc-700/70 overflow-hidden text-[10px] font-medium">
                <button
                  onClick={() => setPythonBackend('pyodide')}
                  className={`px-2 py-1 transition cursor-pointer ${
                    pythonBackend === 'pyodide'
                      ? 'bg-sky-500/20 text-sky-300'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                  }`}
                  title="Run in your browser with Pyodide (WebAssembly)"
                >
                  Browser
                </button>
                <button
                  onClick={() => setPythonBackend('server')}
                  className={`px-2 py-1 transition cursor-pointer border-l border-zinc-700/70 ${
                    pythonBackend === 'server'
                      ? 'bg-sky-500/20 text-sky-300'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                  }`}
                  title="Run on the ChatForge host with python3"
                >
                  Server
                </button>
              </div>
            )}

            {/* Entry-point chip */}
            {consoleMode !== 'web' && mainFile && (
              <span className="text-[9px] font-mono text-zinc-500 truncate max-w-40" title={mainFile.path}>
                ▶ {mainFile.path}
              </span>
            )}

            {/* Status */}
            {serverRun.state === 'running' && (
              <span className="flex items-center gap-1.5 text-[10px] text-blue-300">
                <Loader2 className="w-3 h-3 animate-spin" />
                {consoleMode === 'java' ? 'Compiling & running…' : 'Running…'}
              </span>
            )}
            {serverRun.state === 'done' && serverResult && (
              <span className="text-[10px] text-emerald-400 font-mono">
                exit {serverResult.exitCode ?? '—'}
                {serverResult.durationMs ? ` · ${(serverResult.durationMs / 1000).toFixed(1)}s` : ''}
              </span>
            )}
            {serverRun.state === 'error' && serverResult && !serverResult.ok && (
              <span className="text-[10px] text-rose-400 font-mono">
                exit {serverResult.exitCode ?? '—'}
                {serverResult.timedOut ? ' · timed out' : ''}
              </span>
            )}

            {serverResult && (serverResult.stdout || serverResult.stderr) && (
              <button
                onClick={() => copyText(`${serverResult.stdout}${serverResult.stderr ? `\n${serverResult.stderr}` : ''}`)}
                className="ml-auto p-1.5 rounded-lg text-zinc-400 hover:text-blue-300 hover:bg-zinc-800 transition cursor-pointer"
                title="Copy output"
              >
                <Copy className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Pyodide terminal (self-contained iframe) */}
          {showPyodideIframe ? (
            <iframe
              key={pyKey}
              srcDoc={pyDoc}
              title="ChatForge Python Runner"
              sandbox="allow-scripts allow-modals"
              className="flex-1 w-full bg-zinc-950 border-0"
            />
          ) : (
            <div className="flex-1 overflow-y-auto p-3 font-mono text-[11px] leading-relaxed">
              {serverRun.state === 'idle' && (
                <div className="h-full flex flex-col items-center justify-center space-y-3 text-center p-4">
                  <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                    <Terminal className="w-6 h-6 text-zinc-600" />
                  </div>
                  <p className="text-xs text-zinc-500 leading-relaxed max-w-52">
                    {runnable
                      ? `Press ${activeRunMode === 'python' ? '“Run Python”' : `“${RUN_MODE_META[activeRunMode]?.runLabel || 'Run'}”`} to execute ${mainFile?.path || 'the entry point'}.`
                      : 'Add a Python, Java or other executable file to run it here.'}
                  </p>
                </div>
              )}

              {serverRun.state === 'running' && (
                <div className="flex items-center gap-2 text-zinc-500">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                  <span>Executing on the ChatForge host…</span>
                </div>
              )}

              {serverRun.state !== 'running' && serverRun.state !== 'idle' && serverResult && (
                <div className="space-y-2">
                  {/* Toolchain missing guidance */}
                  {serverResult.toolMissing && (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-950/30 p-3 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div className="space-y-1 min-w-0">
                        <p className="text-[11px] font-semibold text-amber-200">
                          “{serverResult.toolMissing}” was not found on the host
                        </p>
                        <p className="text-[11px] text-amber-200/70 leading-relaxed">
                          {TOOL_MISSING_HINTS[serverResult.toolMissing] || 'Install the toolchain on the ChatForge host and try again.'}
                        </p>
                      </div>
                    </div>
                  )}

                  {serverResult.timedOut && (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-950/30 p-2.5 text-[11px] text-amber-200 flex items-center gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>Program exceeded the execution time limit and was stopped.</span>
                    </div>
                  )}

                  {serverResult.phase === 'compile' && (
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Compilation errors</div>
                  )}

                  {serverResult.stdout && (
                    <pre className="whitespace-pre-wrap break-words text-zinc-200">{serverResult.stdout}</pre>
                  )}
                  {serverResult.stderr && (
                    <pre className="whitespace-pre-wrap break-words text-rose-300">{serverResult.stderr}</pre>
                  )}
                  {!serverResult.stdout && !serverResult.stderr && !serverResult.toolMissing && (
                    <pre className="text-zinc-500">[no output — exit {serverResult.exitCode ?? '—'}]</pre>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
