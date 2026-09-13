import React, { useState, useMemo, useCallback } from 'react';
import {
  FileCode2,
  FileJson,
  FileText,
  Globe,
  Braces,
  ChevronRight,
  ChevronDown,
  Play,
  RotateCcw,
  Check,
  X,
  Code2,
  Eye,
  MonitorSmartphone,
  Layers,
} from 'lucide-react';
import {
  ExtractedCodeFile,
  RunnableLang,
  buildPreviewDocument,
  hasRunnableFiles,
} from '../utils/extractCodeFiles';

interface CodePreviewPanelProps {
  /** All runnable files extracted from the active conversation */
  files: ExtractedCodeFile[];
  /** Whether the panel is visible */
  isOpen: boolean;
  /** Toggle panel visibility */
  onToggle: () => void;
  /** Which message the files belong to (for header display) */
  sourceMessageId?: string;
}

/** Small helper to get a colored icon per file type */
const FileIcon: React.FC<{ language: RunnableLang; className?: string }> = ({ language, className }) => {
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
    default:
      return <FileCode2 className={className || 'w-3.5 h-3.5 text-zinc-400'} />;
  }
};

export const CodePreviewPanel: React.FC<CodePreviewPanelProps> = ({
  files,
  isOpen,
  onToggle,
}) => {
  const [viewMode, setViewMode] = useState<'files' | 'preview'>('files');
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<string>('');
  const [previewKey, setPreviewKey] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    files.forEach((f) => (initial[f.id] = f.selected));
    return initial;
  });

  // Re-init selection when the file list changes identity
  const fileIds = useMemo(() => files.map((f) => f.id).join(','), [files]);
  React.useEffect(() => {
    const initial: Record<string, boolean> = {};
    files.forEach((f) => (initial[f.id] = f.selected));
    setSelectedFiles(initial);
  }, [fileIds]); // eslint-disable-line react-hooks/exhaustive-deps

  // Local view of files with selection applied
  const filesWithSelection = useMemo(
    () => files.map((f) => ({ ...f, selected: selectedFiles[f.id] !== false })),
    [files, selectedFiles]
  );

  const runnable = useMemo(() => hasRunnableFiles(filesWithSelection), [filesWithSelection]);

  const activeFile = useMemo(
    () => files.find((f) => f.id === (activeFileId || files[0]?.id)),
    [files, activeFileId]
  );

  const selectedCount = filesWithSelection.filter((f) => f.selected).length;

  const handleToggleFile = (id: string) => {
    setSelectedFiles((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSelectAll = () => {
    const allSelected = files.every((f) => selectedFiles[f.id] !== false);
    const next: Record<string, boolean> = {};
    files.forEach((f) => (next[f.id] = !allSelected));
    setSelectedFiles(next);
  };

  const handleRun = useCallback(() => {
    const doc = buildPreviewDocument(filesWithSelection);
    setPreviewDoc(doc);
    setPreviewKey((k) => k + 1);
    setViewMode('preview');
  }, [filesWithSelection]);

  if (!isOpen) return null;

  return (
    <div className="flex flex-col w-full h-full bg-zinc-950/95 border-l border-zinc-800/80 overflow-hidden">
      {/* Panel Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/80 bg-zinc-900/50">
        <div className="flex items-center gap-2">
          <MonitorSmartphone className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-semibold text-zinc-100">Code Preview</span>
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

      {/* View Mode Tabs: Files | Preview */}
      <div className="flex items-center gap-1 px-3 pt-2.5 pb-2 border-b border-zinc-800/60">
        <button
          onClick={() => setViewMode('files')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
            viewMode === 'files'
              ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 border border-transparent'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>Files</span>
        </button>
        <button
          onClick={() => setViewMode('preview')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
            viewMode === 'preview'
              ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 border border-transparent'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Preview</span>
        </button>

        {/* Run button */}
        {runnable && (
          <button
            onClick={handleRun}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition shadow-sm cursor-pointer"
            title={`Run ${selectedCount} selected file${selectedCount !== 1 ? 's' : ''} in live preview`}
          >
            <Play className="w-3.5 h-3.5" />
            <span>Run App</span>
          </button>
        )}
      </div>

      {/* Files View */}
      {viewMode === 'files' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {/* Select All Row */}
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
              Extracted from chat
            </span>
            <button
              onClick={handleSelectAll}
              className="text-[10px] text-blue-400 hover:text-blue-300 font-medium transition cursor-pointer"
            >
              {files.every((f) => selectedFiles[f.id] !== false) ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          {/* File List */}
          {files.map((file) => {
            const isSelected = selectedFiles[file.id] !== false;
            const isActive = activeFile?.id === file.id;
            return (
              <div
                key={file.id}
                className={`rounded-xl border overflow-hidden transition-all ${
                  isActive
                    ? 'border-blue-500/40 bg-zinc-900'
                    : 'border-zinc-800/70 bg-zinc-900/40 hover:border-zinc-700'
                }`}
              >
                {/* File row */}
                <div
                  className="flex items-center gap-2 px-3 py-2.5 cursor-pointer group"
                  onClick={() => {
                    setActiveFileId(file.id);
                  }}
                >
                  {/* Selection checkbox */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleFile(file.id);
                    }}
                    className={`w-4 h-4 shrink-0 rounded border flex items-center justify-center transition cursor-pointer ${
                      isSelected
                        ? 'bg-blue-500 border-blue-500'
                        : 'border-zinc-600 hover:border-blue-400'
                    }`}
                    title={isSelected ? 'Deselect file' : 'Select file'}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </button>

                  {/* File icon */}
                  <FileIcon language={file.language} />

                  {/* Filename */}
                  <span
                    className={`text-xs font-mono font-medium truncate flex-1 ${
                      isActive ? 'text-blue-300' : 'text-zinc-300 group-hover:text-zinc-100'
                    }`}
                  >
                    {file.filename}
                  </span>

                  {/* Line count */}
                  <span className="text-[10px] text-zinc-500 font-mono shrink-0">
                    {file.lines}L
                  </span>

                  {/* Expand/collapse indicator */}
                  {isActive ? (
                    <ChevronDown className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                  )}
                </div>

                {/* Code viewer (only for active file) */}
                {isActive && (
                  <div className="border-t border-zinc-800/60">
                    <pre className="p-3 text-[11px] leading-relaxed font-mono overflow-x-auto max-h-96 overflow-y-auto text-zinc-300 whitespace-pre">
                      {file.code}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}

          {/* Empty state */}
          {files.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-3">
              <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                <Code2 className="w-6 h-6 text-zinc-600" />
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed">
                No runnable code files detected in this conversation.
                <br />
                Ask the AI to write HTML, CSS, or JavaScript to see them here.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Preview View */}
      {viewMode === 'preview' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-800/60 bg-zinc-900/30">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
              Live Preview
            </span>
            <span className="text-[10px] text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {selectedCount} file{selectedCount !== 1 ? 's' : ''} combined
            </span>
            <button
              onClick={handleRun}
              className="ml-auto p-1.5 rounded-lg text-zinc-400 hover:text-blue-300 hover:bg-zinc-800 transition cursor-pointer"
              title="Reload preview"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Iframe */}
          {previewDoc ? (
            <iframe
              key={previewKey}
              srcDoc={previewDoc}
              title="ChatForge Code Preview"
              sandbox="allow-scripts allow-modals allow-popups allow-forms"
              className="flex-1 w-full bg-white border-0"
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center space-y-3 text-center p-6">
              <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                <Play className="w-6 h-6 text-zinc-600" />
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed max-w-48">
                Select files on the <strong>Files</strong> tab, then click
                <span className="text-emerald-400 font-semibold"> Run App</span> to preview them live.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
