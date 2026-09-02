import React, { useState } from 'react';
import {
  Search,
  Star,
  Sparkles,
  Zap,
  Brain,
  Eye,
  Video,
  Image as ImageIcon,
  RefreshCw,
  Sliders,
  X,
  Check,
  Key,
  ShieldAlert,
  PlusCircle,
  ChevronDown,
  ChevronUp,
  Layers,
  DollarSign,
  Copy,
} from 'lucide-react';
import { ModelInfo, ProviderCredential, ProviderId } from '../types';
import { PROVIDERS } from '../constants/providers';
import { fetchModelsFromProvider } from '../services/api';
import { formatContextWindow, enrichModelInfo } from '../utils/modelSpecs';
import { ProviderIcon } from './ProviderIcon';

interface ModelSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeProvider: ProviderId;
  activeModelId: string;
  onSelectModel: (providerId: ProviderId, modelId: string) => void;
  pinnedModels: string[];
  onTogglePinModel: (modelId: string) => void;
  credentials: Record<ProviderId, ProviderCredential>;
  availableModels: ModelInfo[];
  onUpdateAvailableModels: (models: ModelInfo[]) => void;
  onOpenProviderModal?: (providerId?: ProviderId) => void;
}

export const ModelSelectorModal: React.FC<ModelSelectorModalProps> = ({
  isOpen,
  onClose,
  activeProvider,
  activeModelId,
  onSelectModel,
  pinnedModels,
  onTogglePinModel,
  credentials,
  availableModels,
  onUpdateAvailableModels,
  onOpenProviderModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProvider, setFilterProvider] = useState<string>('all');
  const [filterTag, setFilterTag] = useState<'all' | 'reasoning' | 'vision' | 'image' | 'video' | 'pinned'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fetchStatusMessage, setFetchStatusMessage] = useState<string | null>(null);
  const [expandedModelIds, setExpandedModelIds] = useState<Record<string, boolean>>({});
  const [copiedModelId, setCopiedModelId] = useState<string | null>(null);

  const toggleExpandModel = (modelId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setExpandedModelIds((prev) => ({
      ...prev,
      [modelId]: !prev[modelId],
    }));
  };

  const handleCopyModelId = (modelId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(modelId);
    setCopiedModelId(modelId);
    setTimeout(() => setCopiedModelId(null), 2000);
  };

  if (!isOpen) return null;

  // Helper: check if a provider has valid credentials provided & saved
  const isProviderConfigured = (pId: ProviderId): boolean => {
    const cred = credentials[pId];
    if (!cred) return false;
    if (pId === 'custom') {
      return Boolean(cred.customBaseUrl?.trim() || (cred.apiKey && cred.apiKey.trim().length > 3));
    }
    return Boolean(cred.apiKey && cred.apiKey.trim().length > 3);
  };

  const configuredProviders = PROVIDERS.filter((p) => isProviderConfigured(p.id));
  const hasConfiguredKeys = configuredProviders.length > 0;

  // Build model catalog:
  // ONLY real fetched models in availableModels are displayed and counted.
  // If no models have been fetched for a provider yet, count is 0 and empty state prompts fetching/key setup.
  const getModelsForProvider = (pId: ProviderId): ModelInfo[] => {
    return availableModels.filter((m) => m.provider === pId).map(enrichModelInfo);
  };

  // Total count of all fetched models across all providers (always preserved regardless of which tab is active)
  const totalAllFetchedModels = hasConfiguredKeys
    ? availableModels.filter((m) => isProviderConfigured(m.provider)).length
    : availableModels.length;

  const rawModels: ModelInfo[] = [];

  if (filterProvider === 'all') {
    if (hasConfiguredKeys) {
      for (const p of configuredProviders) {
        rawModels.push(...getModelsForProvider(p.id));
      }
    } else {
      rawModels.push(...availableModels.map(enrichModelInfo));
    }
  } else {
    const targetProvId = filterProvider as ProviderId;
    rawModels.push(...getModelsForProvider(targetProvId));
  }

  const allModels = rawModels.map(enrichModelInfo);

  const handleRefreshModels = async () => {
    setIsRefreshing(true);
    setFetchStatusMessage(null);
    try {
      if (filterProvider === 'all') {
        const providersToFetch = PROVIDERS.filter((p) => isProviderConfigured(p.id));

        if (providersToFetch.length === 0) {
          setFetchStatusMessage('No provider selected. Please select a provider and enter your API key first.');
          setIsRefreshing(false);
          return;
        }

        let updatedModels: ModelInfo[] = [...availableModels];
        let totalFetched = 0;
        const breakdown: string[] = [];

        for (const p of providersToFetch) {
          const cred = credentials[p.id];
          try {
            const fetched = await fetchModelsFromProvider(p.id, cred);
            if (fetched && fetched.length > 0) {
              const enriched = fetched.map(enrichModelInfo);
              updatedModels = updatedModels.filter((m) => m.provider !== p.id).concat(enriched);
              totalFetched += enriched.length;
              breakdown.push(`${p.name} (${enriched.length})`);
            }
          } catch (err) {
            console.warn(`Failed fetching models for ${p.id}:`, err);
          }
        }

        if (totalFetched > 0) {
          onUpdateAvailableModels(updatedModels);
          setFetchStatusMessage(`Successfully fetched ${totalFetched} live models: ${breakdown.join(', ')}.`);
        } else {
          setFetchStatusMessage('Could not fetch live models. Please check your API keys and network connection.');
        }
      } else {
        const targetProvider = filterProvider as ProviderId;
        const targetConfig = PROVIDERS.find((p) => p.id === targetProvider);

        if (!isProviderConfigured(targetProvider)) {
          setFetchStatusMessage(
            `No API key configured for ${targetConfig?.name || targetProvider}. Please add an API key first.`
          );
          setIsRefreshing(false);
          return;
        }

        const cred = credentials[targetProvider];
        const fetched = await fetchModelsFromProvider(targetProvider, cred);
        if (fetched && fetched.length > 0) {
          const enriched = fetched.map(enrichModelInfo);
          const updated = availableModels.filter((m) => m.provider !== targetProvider).concat(enriched);
          onUpdateAvailableModels(updated);
          setFetchStatusMessage(
            `Successfully fetched and verified ${enriched.length} live models for ${targetConfig?.name || targetProvider}.`
          );

          // If current model is not in fetched models, select the first valid model
          const modelStillExists = enriched.some((m) => m.id === activeModelId);
          if (!modelStillExists && targetProvider === activeProvider) {
            onSelectModel(targetProvider, enriched[0].id);
          }
        } else {
          setFetchStatusMessage(`No models returned by API for ${targetConfig?.name || targetProvider}.`);
        }
      }
    } catch (e: any) {
      setFetchStatusMessage(`Failed to fetch models: ${e.message || 'Check your API key and connection'}`);
    } finally {
      setIsRefreshing(false);
      setTimeout(() => setFetchStatusMessage(null), 7000);
    }
  };

  const filteredModels = allModels.filter((model) => {
    if (filterProvider !== 'all' && model.provider !== filterProvider) {
      return false;
    }

    if (filterTag === 'reasoning' && !model.isReasoning) return false;
    if (filterTag === 'vision' && !model.isVision) return false;
    if (filterTag === 'image' && !model.isImageGen) return false;
    if (filterTag === 'video' && !model.isVideoGen) return false;
    if (filterTag === 'pinned' && !pinnedModels.includes(model.id)) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = model.name.toLowerCase().includes(q);
      const matchId = model.id.toLowerCase().includes(q);
      const matchDesc = model.description?.toLowerCase().includes(q);
      const matchProv = model.provider.toLowerCase().includes(q);
      return matchName || matchId || matchDesc || matchProv;
    }

    return true;
  });

  const selectedProviderIsConfigured = filterProvider === 'all' ? hasConfiguredKeys : isProviderConfigured(filterProvider as ProviderId);
  const selectedProviderConfig = PROVIDERS.find((p) => p.id === filterProvider);

  return (
    <div
      id="model-selector-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fadeIn selection:bg-blue-500/30"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="model-selector-modal-container"
        className="relative w-full max-w-3xl max-h-[85vh] flex flex-col bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden text-zinc-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-zinc-800 bg-zinc-950/60">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-blue-600/10 text-blue-400 border border-blue-500/20 shrink-0">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-semibold text-zinc-100 truncate">Model Selector</h2>
              <p className="text-[11px] sm:text-xs text-zinc-400 truncate hidden sm:block">Choose from flagship, reasoning, or fast lightweight models</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              id="fetch-live-models-btn"
              onClick={handleRefreshModels}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition border border-zinc-700 disabled:opacity-50"
              title="Fetch latest models from provider API"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Fetch Models</span>
            </button>
            <button
              id="close-model-selector-btn"
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="p-3 sm:p-4 border-b border-zinc-800/80 bg-zinc-950/30 space-y-2.5 sm:space-y-3">
          {fetchStatusMessage && (
            <div className="px-3 py-2 bg-blue-950/50 border border-blue-800/50 rounded-xl text-xs text-blue-300 flex items-center justify-between animate-fadeIn">
              <span>{fetchStatusMessage}</span>
              <button
                type="button"
                onClick={() => setFetchStatusMessage(null)}
                className="text-blue-400 hover:text-blue-200 ml-2"
              >
                ✕
              </button>
            </div>
          )}

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              id="model-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search models (e.g. gemini-3.7, gpt-4o, claude-3-7)..."
              className="w-full pl-10 pr-4 py-1.5 sm:py-2 bg-zinc-950 border border-zinc-750 rounded-xl text-xs sm:text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
            {/* Providers filter */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
              <button
                id="filter-provider-all"
                onClick={() => setFilterProvider('all')}
                className={`px-2.5 py-1 rounded-lg transition whitespace-nowrap text-xs flex items-center gap-1.5 cursor-pointer ${
                  filterProvider === 'all'
                    ? 'bg-blue-600 text-white font-medium shadow-sm'
                    : 'bg-zinc-800/60 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                }`}
              >
                <span>All Providers</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    filterProvider === 'all'
                      ? 'bg-white/20 text-white'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {totalAllFetchedModels}
                </span>
              </button>
              {PROVIDERS.map((p) => {
                const isConfigured = isProviderConfigured(p.id);
                const liveModels = availableModels.filter((m) => m.provider === p.id);
                const count = liveModels.length;
                const isLive = isConfigured && count > 0;
                return (
                  <button
                    key={p.id}
                    id={`filter-provider-${p.id}`}
                    onClick={() => setFilterProvider(p.id)}
                    className={`px-2.5 py-1 rounded-lg transition whitespace-nowrap text-xs flex items-center gap-1.5 cursor-pointer ${
                      filterProvider === p.id
                        ? 'bg-blue-600 text-white font-medium shadow-sm'
                        : isConfigured
                        ? 'bg-zinc-800/60 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100'
                        : 'bg-zinc-900/60 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                    }`}
                  >
                    <ProviderIcon providerId={p.id} size="xs" />
                    {isConfigured && (
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"
                        title="API Key Active"
                      />
                    )}
                    <span>{p.name}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        filterProvider === p.id
                          ? 'bg-white/20 text-white'
                          : isLive
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/40'
                          : isConfigured
                          ? 'bg-zinc-800 text-zinc-300'
                          : 'bg-zinc-800/60 text-zinc-400'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Feature Tag filter */}
            <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800 shrink-0">
              <button
                id="filter-tag-all"
                onClick={() => setFilterTag('all')}
                className={`px-2 py-0.5 rounded-lg transition ${
                  filterTag === 'all' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                All
              </button>
              <button
                id="filter-tag-pinned"
                onClick={() => setFilterTag('pinned')}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-lg transition ${
                  filterTag === 'pinned' ? 'bg-amber-500/20 text-amber-300' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Star className="w-3 h-3 fill-amber-400/40 text-amber-400" />
                <span>Favorites</span>
              </button>
              <button
                id="filter-tag-reasoning"
                onClick={() => setFilterTag('reasoning')}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-lg transition ${
                  filterTag === 'reasoning' ? 'bg-blue-500/20 text-blue-300' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Brain className="w-3 h-3 text-blue-400" />
                <span>Reasoning</span>
              </button>
              <button
                id="filter-tag-vision"
                onClick={() => setFilterTag('vision')}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-lg transition ${
                  filterTag === 'vision' ? 'bg-emerald-500/20 text-emerald-300' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Eye className="w-3 h-3 text-emerald-400" />
                <span>Vision</span>
              </button>
              <button
                id="filter-tag-image"
                onClick={() => setFilterTag('image')}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-lg transition ${
                  filterTag === 'image' ? 'bg-pink-500/20 text-pink-300' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <ImageIcon className="w-3 h-3 text-pink-400" />
                <span>Image Gen</span>
              </button>
              <button
                id="filter-tag-video"
                onClick={() => setFilterTag('video')}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-lg transition ${
                  filterTag === 'video' ? 'bg-amber-500/20 text-amber-300' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Video className="w-3 h-3 text-amber-400" />
                <span>Video Gen</span>
              </button>
            </div>
          </div>
        </div>

        {/* Verification Status & Model Count Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-2 bg-zinc-950/40 border-b border-zinc-800/60 text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <span>
              Showing <span className="font-semibold text-zinc-200">{filteredModels.length}</span> {filterProvider === 'all' ? 'total models' : `${PROVIDERS.find((p) => p.id === filterProvider)?.name || filterProvider} models`}
            </span>
            {filterProvider !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-800/70 text-[11px] text-zinc-300">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isProviderConfigured(filterProvider as ProviderId) && availableModels.some((m) => m.provider === filterProvider)
                      ? 'bg-emerald-400'
                      : isProviderConfigured(filterProvider as ProviderId)
                      ? 'bg-blue-400'
                      : 'bg-zinc-600'
                  }`}
                />
                {isProviderConfigured(filterProvider as ProviderId) && availableModels.some((m) => m.provider === filterProvider)
                  ? 'Live API Verified'
                  : isProviderConfigured(filterProvider as ProviderId)
                  ? 'Configured Catalog'
                  : 'Deactivated (Key Needed)'}
              </span>
            )}
          </div>
          <div className="text-[11px] text-zinc-500 font-mono">
            {allModels.length} models from {configuredProviders.length} active provider{configuredProviders.length === 1 ? '' : 's'}
          </div>
        </div>

        {/* Models Grid / Prompt Views */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {!hasConfiguredKeys && filterProvider === 'all' ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center max-w-md mx-auto space-y-4 animate-fadeIn">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/5">
                <Key className="w-7 h-7" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base sm:text-lg font-semibold text-zinc-100">No Provider Selected</h3>
                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                  Select Provider to use their models. Please select a provider and enter your API key to activate and fetch available models.
                </p>
              </div>
              <button
                id="modal-select-provider-cta-btn"
                type="button"
                onClick={() => {
                  onClose();
                  onOpenProviderModal?.();
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-md shadow-blue-600/30 transition cursor-pointer"
              >
                <Key className="w-4 h-4" />
                <span>Select Provider & Enter API Key</span>
              </button>
            </div>
          ) : filterProvider !== 'all' && !isProviderConfigured(filterProvider as ProviderId) ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center max-w-md mx-auto space-y-4 animate-fadeIn">
              <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-md">
                <ProviderIcon providerId={filterProvider} size="xl" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base sm:text-lg font-semibold text-zinc-100">
                  {selectedProviderConfig?.name || filterProvider} Deactivated
                </h3>
                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                  No API key configured for {selectedProviderConfig?.name || filterProvider}. Select this provider and enter your API key to view and use their models.
                </p>
              </div>
              <button
                id="modal-configure-provider-cta-btn"
                type="button"
                onClick={() => {
                  onClose();
                  onOpenProviderModal?.(filterProvider as ProviderId);
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-md shadow-blue-600/30 transition cursor-pointer"
              >
                <Key className="w-4 h-4" />
                <span>Configure {selectedProviderConfig?.name || filterProvider} & Enter API Key</span>
              </button>
            </div>
          ) : filteredModels.length === 0 ? (
            <div className="text-center py-16 text-zinc-500 text-sm space-y-2">
              <p>No models matched your search or filters.</p>
              <button
                type="button"
                onClick={handleRefreshModels}
                className="text-xs text-blue-400 hover:text-blue-300 font-medium inline-flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Fetch latest models from API</span>
              </button>
            </div>
          ) : (
            filteredModels.map((model) => {
              const isSelected = model.id === activeModelId && model.provider === activeProvider;
              const isPinned = pinnedModels.includes(model.id);
              const isExpanded = Boolean(expandedModelIds[model.id]);
              const providerConfig = PROVIDERS.find((p) => p.id === model.provider);
              const isConfigured = isProviderConfigured(model.provider);

              return (
                <div
                  key={`${model.provider}_${model.id}`}
                  id={`model-card-${model.id}`}
                  className={`group relative flex flex-col p-3.5 rounded-xl transition-all border ${
                    isSelected
                      ? 'bg-blue-600/15 border-blue-500 shadow-md'
                      : 'bg-zinc-950/50 hover:bg-zinc-800/60 border-zinc-800/80 hover:border-zinc-700'
                  }`}
                >
                  {/* Card Header Bar */}
                  <div
                    className="flex items-center justify-between gap-2.5 cursor-pointer"
                    onClick={() => {
                      if (!isConfigured) {
                        onClose();
                        onOpenProviderModal?.(model.provider);
                      } else {
                        onSelectModel(model.provider, model.id);
                        onClose();
                      }
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <button
                        type="button"
                        id={`pin-model-${model.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onTogglePinModel(model.id);
                        }}
                        className={`p-1.5 rounded-lg transition shrink-0 ${
                          isPinned
                            ? 'text-amber-400 hover:text-amber-300'
                            : 'text-zinc-600 hover:text-zinc-400 opacity-0 group-hover:opacity-100'
                        }`}
                        title={isPinned ? 'Unpin model' : 'Pin model to top'}
                      >
                        <Star className={`w-4 h-4 ${isPinned ? 'fill-amber-400' : ''}`} />
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {filterProvider === 'all' && (
                            <ProviderIcon providerId={model.provider} size="xs" />
                          )}
                          <span className="font-semibold text-sm text-zinc-100 truncate">{model.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-zinc-800 text-zinc-400 font-mono">
                            {model.id}
                          </span>
                          {model.isVideoGen && (
                            <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              <Video className="w-3 h-3" />
                              <span>Video Gen</span>
                            </span>
                          )}
                          {model.isImageGen && (
                            <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-pink-500/10 text-pink-400 border border-pink-500/20">
                              <ImageIcon className="w-3 h-3" />
                              <span>Image Gen</span>
                            </span>
                          )}
                          {model.isReasoning && !model.isVideoGen && !model.isImageGen && (
                            <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
                              <Brain className="w-3 h-3" />
                              <span>Reasoning</span>
                            </span>
                          )}
                          {model.isVision && !model.isVideoGen && !model.isImageGen && (
                            <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <Eye className="w-3 h-3" />
                              <span>Vision</span>
                            </span>
                          )}
                        </div>
                        {!isExpanded && (
                          <p className="text-xs text-zinc-400 truncate mt-0.5">
                            {model.description || model.id}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0 text-right">
                      {/* Compact Quick Stats */}
                      <div className="hidden sm:block">
                        {model.perUnitCost !== undefined && model.perUnitCost > 0 ? (
                          <div className="text-xs text-amber-300 font-mono">
                            ${model.perUnitCost.toFixed(2)}
                            <span className="text-[10px] text-zinc-400 ml-1">
                              {model.perUnitLabel || (model.isVideoGen ? '/ video' : '/ image')}
                            </span>
                          </div>
                        ) : model.inputPrice !== undefined && model.inputPrice > 0 ? (
                          <div className="text-xs text-zinc-300 font-mono">
                            ${model.inputPrice.toFixed(2)} / ${model.outputPrice?.toFixed(2)}
                            <span className="text-[10px] text-zinc-400 ml-1">per 1M</span>
                          </div>
                        ) : (
                          <div className="text-xs text-emerald-400 font-mono">Free / Local</div>
                        )}
                        {model.isVideoGen ? (
                          <div className="text-[10px] text-amber-400/90 font-mono">
                            Video Synthesis
                          </div>
                        ) : model.isImageGen ? (
                          <div className="text-[10px] text-pink-400/90 font-mono">
                            Image Synthesis
                          </div>
                        ) : model.contextWindow ? (
                          <div className="text-[10px] text-zinc-400 font-mono">
                            {formatContextWindow(model.contextWindow)} context
                          </div>
                        ) : null}
                      </div>

                      {isSelected && (
                        <div className="p-1 rounded-full bg-blue-600 text-white shadow-sm shrink-0">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      )}

                      {/* Expand / Dropdown Toggle Button */}
                      <button
                        type="button"
                        id={`expand-model-btn-${model.id}`}
                        onClick={(e) => toggleExpandModel(model.id, e)}
                        className={`p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 transition-colors shrink-0 cursor-pointer ${
                          isExpanded ? 'bg-zinc-800 text-blue-400' : ''
                        }`}
                        title={isExpanded ? 'Collapse model details' : 'Expand full details & pricing'}
                        aria-label="Toggle model details dropdown"
                      >
                        <ChevronDown
                          className={`w-4 h-4 transition-transform duration-200 ${
                            isExpanded ? 'rotate-180 text-blue-400' : ''
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Expandable Rich Details Panel */}
                  {isExpanded && (
                    <div
                      id={`model-expanded-details-${model.id}`}
                      className="mt-3 pt-3 border-t border-zinc-800/90 flex flex-col gap-3 text-left"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Full Description */}
                      <div className="text-xs text-zinc-300 leading-relaxed bg-zinc-900/60 p-3 rounded-lg border border-zinc-800/60">
                        <span className="text-zinc-400 font-semibold uppercase text-[10px] tracking-wider block mb-1">
                          Full Model Overview
                        </span>
                        {model.description ||
                          (model.isVideoGen
                            ? `High-definition generative video synthesis model by ${providerConfig?.name || model.provider}.`
                            : model.isImageGen
                            ? `High-resolution image generation model by ${providerConfig?.name || model.provider}.`
                            : `High-performance language model provided by ${
                                providerConfig?.name || model.provider
                              }, optimized for conversational dialogue, structured outputs, code generation, and multi-turn workflows.`)}
                      </div>

                      {/* Detailed Specs Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                        {/* Pricing Spec */}
                        <div className="bg-zinc-900/80 p-2.5 rounded-lg border border-zinc-800/80 flex flex-col justify-between">
                          <div className="flex items-center gap-1.5 text-zinc-400 text-[11px] font-medium mb-1">
                            <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                            <span>
                              {model.isVideoGen || model.isImageGen
                                ? 'Generation Pricing'
                                : 'Pricing (per 1M tokens)'}
                            </span>
                          </div>
                          {model.perUnitCost !== undefined && model.perUnitCost > 0 ? (
                            <div className="space-y-0.5">
                              <div className="flex justify-between text-zinc-200 font-mono">
                                <span className="text-zinc-400 text-[11px]">Cost:</span>
                                <span className="font-semibold text-amber-300">
                                  ${model.perUnitCost.toFixed(2)}{' '}
                                  <span className="text-[10px] text-zinc-400">
                                    {model.perUnitLabel || (model.isVideoGen ? '/ video' : '/ image')}
                                  </span>
                                </span>
                              </div>
                            </div>
                          ) : model.inputPrice !== undefined && model.inputPrice > 0 ? (
                            <div className="space-y-0.5">
                              <div className="flex justify-between text-zinc-200 font-mono">
                                <span className="text-zinc-400 text-[11px]">Prompt / In:</span>
                                <span className="font-semibold">${model.inputPrice.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between text-zinc-200 font-mono">
                                <span className="text-zinc-400 text-[11px]">Completion / Out:</span>
                                <span className="font-semibold">${model.outputPrice?.toFixed(2)}</span>
                              </div>
                            </div>
                          ) : (
                            <div className="text-emerald-400 font-semibold font-mono text-xs mt-1">
                              Included / Free Tier
                            </div>
                          )}
                        </div>

                        {/* Context & Limits Spec */}
                        <div className="bg-zinc-900/80 p-2.5 rounded-lg border border-zinc-800/80 flex flex-col justify-between">
                          <div className="flex items-center gap-1.5 text-zinc-400 text-[11px] font-medium mb-1">
                            <Layers className="w-3.5 h-3.5 text-blue-400" />
                            <span>
                              {model.isVideoGen || model.isImageGen
                                ? 'Model Architecture'
                                : 'Context Window'}
                            </span>
                          </div>
                          <div>
                            {model.isVideoGen ? (
                              <>
                                <div className="text-amber-300 font-semibold text-sm font-mono">
                                  Video Synthesis
                                </div>
                                <div className="text-[10px] text-zinc-400 mt-0.5">
                                  Generates video files (no token context window)
                                </div>
                              </>
                            ) : model.isImageGen ? (
                              <>
                                <div className="text-pink-300 font-semibold text-sm font-mono">
                                  Image Synthesis
                                </div>
                                <div className="text-[10px] text-zinc-400 mt-0.5">
                                  Generates image files (no token context window)
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="text-zinc-100 font-semibold text-sm font-mono">
                                  {model.contextWindow
                                    ? `${model.contextWindow.toLocaleString()} tokens`
                                    : 'Standard Window'}
                                </div>
                                <div className="text-[10px] text-zinc-400 mt-0.5">
                                  {model.contextWindow
                                    ? `${formatContextWindow(model.contextWindow)} verified context window`
                                    : 'Optimized multi-turn window'}
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Capabilities & Modalities Spec */}
                        <div className="bg-zinc-900/80 p-2.5 rounded-lg border border-zinc-800/80 flex flex-col justify-between">
                          <div className="flex items-center gap-1.5 text-zinc-400 text-[11px] font-medium mb-1">
                            <Zap className="w-3.5 h-3.5 text-purple-400" />
                            <span>Supported Capabilities</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {model.isVideoGen ? (
                              <>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-900/40 text-amber-300 border border-amber-700/40">
                                  Video Generation
                                </span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                                  Prompt-to-Video
                                </span>
                              </>
                            ) : model.isImageGen ? (
                              <>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-pink-900/40 text-pink-300 border border-pink-700/40">
                                  Image Generation
                                </span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                                  Text-to-Image
                                </span>
                              </>
                            ) : (
                              <>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                                  Chat & Stream
                                </span>
                                {model.isReasoning && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900/40 text-blue-300 border border-blue-700/40">
                                    Reasoning / CoT
                                  </span>
                                )}
                                {model.isVision && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-900/40 text-emerald-300 border border-emerald-700/40">
                                    Multimodal / Vision
                                  </span>
                                )}
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                                  Tool Calling
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Raw ID & Selection Footer */}
                      <div className="flex items-center justify-between gap-3 pt-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[11px] text-zinc-400 font-mono truncate">
                            ID: <code className="text-zinc-200">{model.id}</code>
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleCopyModelId(model.id, e)}
                            className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition"
                            title="Copy model identifier"
                          >
                            {copiedModelId === model.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>

                        <button
                          type="button"
                          id={`select-expanded-model-btn-${model.id}`}
                          onClick={() => {
                            if (!isConfigured) {
                              onClose();
                              onOpenProviderModal?.(model.provider);
                            } else {
                              onSelectModel(model.provider, model.id);
                              onClose();
                            }
                          }}
                          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer shrink-0 ${
                            isSelected
                              ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-750'
                              : 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm shadow-blue-600/30'
                          }`}
                        >
                          {isSelected ? 'Currently Selected' : !isConfigured ? 'Configure Key' : 'Select Model'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
