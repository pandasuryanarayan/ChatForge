import React, { useState } from 'react';
import {
  Key,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Shield,
  Eye,
  EyeOff,
  RefreshCw,
  Trash2,
  Lock,
  Zap,
  HardDrive,
  Sliders,
  Sparkles,
  Layers,
  Flame,
  Bot,
  BrainCircuit,
  Gem,
  Compass,
  X,
} from 'lucide-react';
import { ModelInfo, ProviderConfig, ProviderCredential, ProviderId } from '../types';
import { PROVIDERS } from '../constants/providers';
import { PROVIDER_LOGOS } from '../assets/providers';
import { testProviderKey } from '../services/api';
import { ProviderIcon } from './ProviderIcon';

interface ProviderModalProps {
  isOpen: boolean;
  onClose: () => void;
  credentials: Record<ProviderId, ProviderCredential>;
  onSaveCredential: (providerId: ProviderId, cred: ProviderCredential) => void;
  onRemoveCredential: (providerId: ProviderId) => void;
  activeProvider: ProviderId;
  onSelectActiveProvider: (providerId: ProviderId) => void;
  availableModels?: ModelInfo[];
  onUpdateAvailableModels?: (models: ModelInfo[]) => void;
}

export const ProviderModal: React.FC<ProviderModalProps> = ({
  isOpen,
  onClose,
  credentials,
  onSaveCredential,
  onRemoveCredential,
  activeProvider,
  onSelectActiveProvider,
  availableModels = [],
  onUpdateAvailableModels,
}) => {
  const [selectedProviderId, setSelectedProviderId] = useState<ProviderId>(activeProvider);
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [customBaseUrlInput, setCustomBaseUrlInput] = useState<string>('');
  const [isSessionOnly, setIsSessionOnly] = useState<boolean>(false);
  const [showKey, setShowKey] = useState<boolean>(false);
  const [testingStatus, setTestingStatus] = useState<{
    loading: boolean;
    valid?: boolean;
    message?: string;
  }>({ loading: false });

  // Only reset modal state when it transitions from closed to open, or when selected provider changes
  const prevIsOpenRef = React.useRef(isOpen);
  React.useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setSelectedProviderId(activeProvider);
      const cred = credentials[activeProvider];
      setApiKeyInput(cred?.apiKey || '');
      setCustomBaseUrlInput(cred?.customBaseUrl || '');
      setIsSessionOnly(cred?.isSessionOnly || false);
      setShowKey(false);
      setTestingStatus({ loading: false });
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, activeProvider]);

  if (!isOpen) return null;

  const currentProvider = PROVIDERS.find((p) => p.id === selectedProviderId) || PROVIDERS[0];
  const existingCred = credentials[selectedProviderId];

  const handleSelectProvider = (id: ProviderId) => {
    setSelectedProviderId(id);
    const cred = credentials[id];
    setApiKeyInput(cred?.apiKey || '');
    setCustomBaseUrlInput(cred?.customBaseUrl || '');
    setIsSessionOnly(cred?.isSessionOnly || false);
    setShowKey(false);
    setTestingStatus({ loading: false });
  };

  const handleSave = async () => {
    const cred: ProviderCredential = {
      apiKey: apiKeyInput.trim(),
      customBaseUrl: customBaseUrlInput.trim() || undefined,
      isSessionOnly,
      isValidated: testingStatus.valid || existingCred?.isValidated,
      lastValidatedAt: Date.now(),
    };
    onSaveCredential(selectedProviderId, cred);
    onSelectActiveProvider(selectedProviderId);
    setTestingStatus({
      loading: false,
      valid: true,
      message: 'Saved successfully!',
    });
  };

  const handleTestKey = async () => {
    setTestingStatus({ loading: true });
    const cred: ProviderCredential = {
      apiKey: apiKeyInput.trim(),
      customBaseUrl: customBaseUrlInput.trim() || undefined,
      isSessionOnly,
    };
    const result = await testProviderKey(selectedProviderId, cred);
    setTestingStatus({
      loading: false,
      valid: result.valid,
      message: result.message,
    });
    if (result.valid) {
      onSaveCredential(selectedProviderId, {
        ...cred,
        isValidated: true,
        lastValidatedAt: Date.now(),
      });
      if (result.models && result.models.length > 0 && onUpdateAvailableModels) {
        const updated = availableModels.filter((m) => m.provider !== selectedProviderId).concat(result.models);
        onUpdateAvailableModels(updated);
      }
    }
  };

  const handleRemove = () => {
    onRemoveCredential(selectedProviderId);
    setApiKeyInput('');
    setCustomBaseUrlInput('');
    setTestingStatus({ loading: false });
  };

  return (
    <div
      id="provider-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fadeIn selection:bg-blue-500/30"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="provider-modal-container"
        className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden text-zinc-100"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-zinc-800 bg-zinc-950/60">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-blue-600/10 text-blue-400 border border-blue-500/20 shrink-0">
              <Key className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-semibold text-zinc-100 flex items-center gap-2 truncate">
                <span>API Keys & Providers</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-normal shrink-0">
                  Client-Side
                </span>
              </h2>
              <p className="text-[11px] sm:text-xs text-zinc-400 truncate hidden sm:block">
                Keys are stored locally in your browser and dispatched directly to provider APIs.
              </p>
            </div>
          </div>
          <button
            id="close-provider-modal-btn"
            onClick={onClose}
            className="p-1.5 sm:p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Responsive Flex-Col on Mobile, Two-Col on Desktop */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-0">
          {/* Left: Provider Selection List */}
          <div className="w-full md:w-64 lg:w-72 max-h-36 md:max-h-none border-b md:border-b-0 md:border-r border-zinc-800/80 bg-zinc-950/40 overflow-y-auto p-2 sm:p-3 space-y-1 shrink-0">
            <div className="px-2 py-1 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider hidden md:block">
              Select Provider
            </div>
            <div className="grid grid-cols-2 md:grid-cols-1 gap-1">
              {PROVIDERS.map((p) => {
                const isSelected = p.id === selectedProviderId;
                const cred = credentials[p.id];
                const isConfigured = cred?.apiKey && cred.apiKey.length > 3;

                return (
                  <button
                    key={p.id}
                    id={`provider-select-${p.id}`}
                    onClick={() => handleSelectProvider(p.id)}
                    className={`w-full flex items-center justify-between px-2.5 sm:px-3 py-2 rounded-xl text-left transition-all ${
                      isSelected
                        ? 'bg-zinc-800 text-white font-medium border border-zinc-700 shadow-sm'
                        : 'hover:bg-zinc-800/50 text-zinc-300 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                      <div className="w-5 h-5 min-w-[20px] min-h-[20px] max-w-[20px] max-h-[20px] rounded-md overflow-hidden flex items-center justify-center shrink-0">
                        <img
                          src={PROVIDER_LOGOS[p.id] || PROVIDER_LOGOS.custom}
                          alt={p.name}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm truncate font-medium">{p.name}</div>
                      </div>
                    </div>
                    {isConfigured && (
                      <div
                        className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 shadow-[0_0_8px_rgba(52,211,153,0.6)] ml-1"
                        title="Key configured"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Key Input & Configuration Panel */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 min-w-0">
            {/* Active Provider Info Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl bg-zinc-950/70 border border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl overflow-hidden flex items-center justify-center shrink-0">
                  <img
                    src={PROVIDER_LOGOS[currentProvider.id] || PROVIDER_LOGOS.custom}
                    alt={currentProvider.name}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-semibold text-zinc-100 truncate">{currentProvider.name}</h3>
                </div>
              </div>

              <a
                href={currentProvider.keyDocsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-medium px-3 py-1.5 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 transition shrink-0"
              >
                <span>Get Key</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* API Key Input */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                {currentProvider.requiresKey ? 'API Key' : 'API Key (Optional)'}
              </label>
              <div className="relative">
                <input
                  id="provider-api-key-input"
                  type={showKey ? 'text' : 'password'}
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder={currentProvider.keyPlaceholder}
                  className="w-full pl-3.5 pr-20 py-2.5 bg-zinc-950 border border-zinc-750 rounded-xl text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 transition font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200 transition"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Format Hint */}
              {currentProvider.keyPrefix && (
                <p className="text-[11px] text-zinc-400">
                  Expected prefix: <span className="font-mono text-zinc-300">{currentProvider.keyPrefix}</span>
                </p>
              )}
            </div>

            {/* Custom Base URL */}
            {(currentProvider.isCustomizableBaseUrl || currentProvider.id === 'custom') && (
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                  Endpoint Base URL
                </label>
                <input
                  id="provider-base-url-input"
                  type="text"
                  value={customBaseUrlInput}
                  onChange={(e) => setCustomBaseUrlInput(e.target.value)}
                  placeholder={currentProvider.defaultBaseUrl || 'http://localhost:8000/v1'}
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-750 rounded-xl text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 transition font-mono"
                />
                <p className="text-[11px] text-zinc-400">
                  Specify any custom OpenAI-compatible completions API endpoint.
                </p>
              </div>
            )}

            {/* Session-only Storage Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/40 border border-zinc-800/80">
              <div className="flex items-center gap-2.5">
                <Lock className="w-4 h-4 text-amber-400" />
                <div>
                  <div className="text-xs font-medium text-zinc-200">Session-only Key (In-Memory)</div>
                  <div className="text-[11px] text-zinc-400">
                    Do not save to localStorage — clear key automatically when the browser tab closes.
                  </div>
                </div>
              </div>
              <input
                id="provider-session-only-toggle"
                type="checkbox"
                checked={isSessionOnly}
                onChange={(e) => setIsSessionOnly(e.target.checked)}
                className="w-4 h-4 accent-blue-500 rounded cursor-pointer"
              />
            </div>

            {/* Testing & Status Feedback */}
            {testingStatus.message && (
              <div
                className={`flex items-start gap-2.5 p-3 rounded-xl text-xs ${
                  testingStatus.valid
                    ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                }`}
              >
                {testingStatus.valid ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                )}
                <span>{testingStatus.message}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-zinc-800">
              {existingCred?.apiKey ? (
                <button
                  id="remove-provider-key-btn"
                  onClick={handleRemove}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Remove Key</span>
                </button>
              ) : (
                <div />
              )}

              <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 ml-auto">
                <button
                  id="test-provider-key-btn"
                  onClick={handleTestKey}
                  disabled={testingStatus.loading || (!apiKeyInput && currentProvider.requiresKey)}
                  className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 text-xs font-medium text-zinc-200 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition border border-zinc-700"
                >
                  {testingStatus.loading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Testing...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5 text-blue-400" />
                      <span>Test Key</span>
                    </>
                  )}
                </button>

                <button
                  id="save-provider-key-btn"
                  onClick={handleSave}
                  className="px-4 sm:px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-md shadow-blue-600/20 transition cursor-pointer"
                >
                  Save & Use Provider
                </button>
              </div>
            </div>

            {/* Privacy Architecture Notice */}
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 text-[11px] text-zinc-400">
              <Shield className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>Privacy Guarantee:</strong> ChatForge operates entirely in your browser. Your keys are never logged, proxied, or saved to any backend database.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
