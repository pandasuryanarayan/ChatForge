import React, { useState, useRef } from 'react';
import {
  Settings as SettingsIcon,
  Moon,
  Sun,
  Download,
  Upload,
  Trash2,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileText,
  X,
} from 'lucide-react';
import { AppSettings, Conversation } from '../types';
import { exportAllData, importData, clearAllLocalData } from '../services/storage';
import { ChatForgeIcon, ChatForgeLogo } from './ChatForgeLogo';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  activeConversation?: Conversation;
  onDataReset: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  activeConversation,
  onDataReset,
}) => {
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [importStatus, setImportStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleExportAll = () => {
    const jsonStr = exportAllData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chatforge-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportConversationMarkdown = () => {
    if (!activeConversation) return;
    let md = `# ${activeConversation.title}\n\n`;
    md += `*Model: ${activeConversation.modelId} (${activeConversation.providerId})*\n`;
    md += `*Exported on: ${new Date().toLocaleString()}*\n\n---\n\n`;

    for (const msg of activeConversation.messages || []) {
      const role = msg.role === 'user' ? '### 👤 User' : '### 🤖 Assistant';
      md += `${role}\n\n${msg.content}\n\n`;
      if (msg.reasoningContent) {
        md += `> **Reasoning Process:**\n> ${msg.reasoningContent.replace(/\n/g, '\n> ')}\n\n`;
      }
      md += `---\n\n`;
    }

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeConversation.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const result = importData(content);
        setImportStatus(result);
        if (result.success) {
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        }
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmReset = () => {
    clearAllLocalData();
    setShowConfirmReset(false);
    onDataReset();
    onClose();
  };

  return (
    <div
      id="settings-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fadeIn selection:bg-blue-500/30"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="settings-modal-container"
        className="relative w-full max-w-2xl max-h-[85vh] flex flex-col bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden text-zinc-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/60">
          <div className="flex items-center gap-3">
            <ChatForgeIcon className="w-8 h-8 drop-shadow-sm" />
            <div>
              <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                <span>ChatForge Settings</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono font-normal">v1.0</span>
              </h2>
              <p className="text-xs text-zinc-400">Manage appearance, backups, and local storage</p>
            </div>
          </div>
          <button
            id="close-settings-modal-btn"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Appearance Section */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Appearance</h3>
            <div>
              {/* Theme Card */}
              <div className="p-4 rounded-xl bg-zinc-950/40 dark:bg-zinc-950/60 border border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-zinc-200">Interface Theme</span>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 bg-zinc-800/60 px-1.5 py-0.5 rounded">
                      {settings.theme}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5">Switch between dark mode and clean white theme</p>
                </div>

                <div className="flex items-center gap-1.5 p-1 rounded-lg bg-zinc-900/80 dark:bg-zinc-900 border border-zinc-800 shrink-0">
                  <button
                    id="theme-dark-btn"
                    type="button"
                    onClick={() => onUpdateSettings({ ...settings, theme: 'dark' })}
                    className={`flex items-center justify-center gap-2 py-2 px-3.5 rounded-md text-xs font-medium transition cursor-pointer ${
                      settings.theme === 'dark'
                        ? 'bg-blue-600 text-white shadow-sm font-semibold'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5" />
                    <span>Dark</span>
                  </button>
                  <button
                    id="theme-light-btn"
                    type="button"
                    onClick={() => onUpdateSettings({ ...settings, theme: 'light' })}
                    className={`flex items-center justify-center gap-2 py-2 px-3.5 rounded-md text-xs font-medium transition cursor-pointer ${
                      settings.theme === 'light'
                        ? 'bg-blue-600 text-white shadow-sm font-semibold'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5" />
                    <span>Light</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Backup & Export Section */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Backup & Export</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Full JSON Export */}
              <button
                id="export-all-data-btn"
                type="button"
                onClick={handleExportAll}
                className="flex items-center gap-3.5 p-4 rounded-xl bg-zinc-950/40 dark:bg-zinc-950/60 hover:bg-zinc-900/60 dark:hover:bg-zinc-900 border border-zinc-800/80 text-left transition cursor-pointer group shadow-xs"
              >
                <div className="p-2.5 rounded-xl bg-blue-600/10 text-blue-400 border border-blue-500/20 group-hover:scale-105 transition shrink-0">
                  <Download className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-zinc-200 group-hover:text-blue-400 transition truncate">
                    Export All Data (JSON)
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">Save conversations & settings backup</div>
                </div>
              </button>

              {/* Import JSON */}
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImportFile}
                  accept=".json"
                  className="hidden"
                />
                <button
                  id="import-data-btn"
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center gap-3.5 p-4 rounded-xl bg-zinc-950/40 dark:bg-zinc-950/60 hover:bg-zinc-900/60 dark:hover:bg-zinc-900 border border-zinc-800/80 text-left transition cursor-pointer group shadow-xs"
                >
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:scale-105 transition shrink-0">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-zinc-200 group-hover:text-emerald-400 transition truncate">
                      Import Data (JSON)
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">Restore from a JSON backup file</div>
                  </div>
                </button>
              </div>

              {/* Active Conversation Markdown Export */}
              {activeConversation && activeConversation.messages.length > 0 && (
                <button
                  id="export-active-markdown-btn"
                  type="button"
                  onClick={handleExportConversationMarkdown}
                  className="sm:col-span-2 flex items-center gap-3.5 p-4 rounded-xl bg-zinc-950/40 dark:bg-zinc-950/60 hover:bg-zinc-900/60 dark:hover:bg-zinc-900 border border-zinc-800/80 text-left transition cursor-pointer group shadow-xs"
                >
                  <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:scale-105 transition shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-zinc-200 group-hover:text-amber-400 transition truncate">
                      Export Current Chat as Markdown (.md)
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">Download formatted transcript with model timestamps</div>
                  </div>
                </button>
              )}
            </div>

            {importStatus && (
              <div
                className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 ${
                  importStatus.success
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 font-medium'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/25 font-medium'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{importStatus.message}</span>
              </div>
            )}
          </div>

          {/* Privacy Architecture Guarantee */}
          <div className="p-4 rounded-xl bg-emerald-950/20 dark:bg-emerald-950/20 border border-emerald-500/25 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Privacy & Direct Browser Architecture</span>
            </div>
            <p className="text-xs text-zinc-300 dark:text-zinc-300 leading-relaxed">
              ChatForge is a pure client-side static application. All inference requests are dispatched directly from your browser to provider endpoints (OpenAI, Anthropic, Google, Groq, DeepSeek, OpenRouter, etc.). We do not operate an intermediary server, database, or telemetry tracking on your chats.
            </p>
          </div>

          {/* Danger Zone */}
          <div className="space-y-3 pt-2 border-t border-zinc-800/80">
            <h3 className="text-xs font-semibold text-rose-400 uppercase tracking-wider">Danger Zone</h3>
            {showConfirmReset ? (
              <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/30 space-y-3">
                <div className="flex items-center gap-2 text-rose-300 text-xs font-semibold">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>Are you sure you want to clear all data?</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  This will permanently delete all saved API keys, custom system prompts, and chat histories from this browser.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    id="confirm-delete-all-btn"
                    type="button"
                    onClick={handleConfirmReset}
                    className="px-3.5 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition cursor-pointer shadow-xs"
                  >
                    Yes, Delete Everything
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowConfirmReset(false)}
                    className="px-3.5 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800/60 rounded-lg transition cursor-pointer border border-zinc-700/60"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                id="trigger-clear-all-data-btn"
                type="button"
                onClick={() => setShowConfirmReset(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/25 transition cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Clear All Local Storage & Reset App</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
