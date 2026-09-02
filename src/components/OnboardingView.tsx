import React, { useState } from 'react';
import {
  Key,
  ShieldCheck,
  Zap,
  Sparkles,
  ExternalLink,
  Bot,
  Brain,
  Layers,
  Cpu,
  Lock,
  ArrowRight,
} from 'lucide-react';
import { ProviderCredential, ProviderId } from '../types';
import { PROVIDERS } from '../constants/providers';
import { ProviderIcon } from './ProviderIcon';
import { ChatForgeLogo } from './ChatForgeLogo';

interface OnboardingViewProps {
  onSaveCredentialAndStart: (providerId: ProviderId, credential: ProviderCredential) => void;
  onOpenFullProviderModal: () => void;
}

export const OnboardingView: React.FC<OnboardingViewProps> = ({
  onSaveCredentialAndStart,
  onOpenFullProviderModal,
}) => {
  const [selectedProviderId, setSelectedProviderId] = useState<ProviderId>('google');
  const [inputKey, setInputKey] = useState('');
  const [inputBaseUrl, setInputBaseUrl] = useState('');

  const selectedProvider = PROVIDERS.find((p) => p.id === selectedProviderId) || PROVIDERS[0];

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputKey.trim()) return;
    onSaveCredentialAndStart(selectedProviderId, {
      apiKey: inputKey.trim(),
      customBaseUrl: inputBaseUrl.trim() || undefined,
      baseUrl: inputBaseUrl.trim() || undefined,
    });
  };

  return (
    <div
      id="onboarding-container"
      className="w-full h-full max-w-4xl mx-auto py-4 sm:py-8 px-3.5 sm:px-6 space-y-6 sm:space-y-8 animate-fadeIn selection:bg-blue-500/30 overflow-y-auto"
    >
      {/* Bento Header Hero */}
      <div className="text-center space-y-3 sm:space-y-4 pt-1 sm:pt-2 flex flex-col items-center max-w-full">
        <div className="flex justify-center mb-1 max-w-full px-2">
          <ChatForgeLogo className="h-10 sm:h-14 md:h-16 max-w-full w-auto drop-shadow-md" textColor="#F4F4F5" />
        </div>
        <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-full bg-blue-600/10 border border-blue-500/20 text-blue-400 text-[11px] sm:text-xs font-semibold max-w-full text-center">
          <Sparkles className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Zero-Markup Bring-Your-Own-Key Client</span>
        </div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-zinc-100 px-1">
          Chat with Leading Frontier AI Models
        </h1>
        <p className="text-xs sm:text-sm md:text-base text-zinc-400 max-w-xl mx-auto leading-relaxed px-1">
          Connect your own API key to chat directly with Google Gemini, Claude 3.7 Sonnet, GPT-4o, DeepSeek R1, Groq, Mistral, OpenRouter, or custom endpoints.
        </p>
      </div>

      {/* Bento Grid: 3 Feature Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        {/* Card 1: Privacy */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1.5 sm:space-y-2 shadow-sm">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
            <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <h3 className="text-xs sm:text-sm font-semibold text-zinc-200">100% Client-Side Privacy</h3>
          <p className="text-[11px] sm:text-xs text-zinc-400 leading-relaxed">
            API keys and conversations are stored exclusively in your browser's local storage and dispatched directly to the provider.
          </p>
        </div>

        {/* Card 2: Zero Middleman */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1.5 sm:space-y-2 shadow-sm">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <h3 className="text-xs sm:text-sm font-semibold text-zinc-200">Zero Middleman Markup</h3>
          <p className="text-[11px] sm:text-xs text-zinc-400 leading-relaxed">
            Pay exact wholesale API token prices directly to providers. No monthly subscriptions or chat token caps.
          </p>
        </div>

        {/* Card 3: Deep Reasoning */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1.5 sm:space-y-2 shadow-sm sm:col-span-2 md:col-span-1">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
            <Brain className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <h3 className="text-xs sm:text-sm font-semibold text-zinc-200">Reasoning & Multimodal</h3>
          <p className="text-[11px] sm:text-xs text-zinc-400 leading-relaxed">
            Full support for extended thinking chains, reasoning models (DeepSeek R1, Claude Sonnet), image uploads, and markdown rendering.
          </p>
        </div>
      </div>

      {/* Main Bento Key Connector Card */}
      <div className="p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 sm:pb-4 border-b border-zinc-800">
          <div>
            <h2 className="text-sm sm:text-base font-semibold text-zinc-100 flex items-center gap-2">
              <Key className="w-4 h-4 text-blue-400 shrink-0" />
              <span>Select Provider & Enter API Key</span>
            </h2>
            <p className="text-[11px] sm:text-xs text-zinc-400">Choose a provider to get started in seconds</p>
          </div>
          <a
            href={selectedProvider.keyDocsUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition self-start sm:self-auto"
          >
            <span>Get {selectedProvider.name} Key</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Provider selector chips */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-2.5">
          {PROVIDERS.map((p) => {
            const isSelected = selectedProviderId === p.id;

            return (
              <button
                key={p.id}
                type="button"
                id={`onboarding-provider-${p.id}`}
                onClick={() => {
                  setSelectedProviderId(p.id);
                  setInputKey('');
                  setInputBaseUrl('');
                }}
                className={`p-2.5 sm:p-3 rounded-xl border text-left transition flex items-center gap-2 sm:gap-2.5 cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600/15 border-blue-500 text-white shadow-sm'
                    : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-750 text-zinc-300'
                }`}
              >
                <ProviderIcon providerId={p.id} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold truncate">{p.name}</div>
                  <div className="text-[10px] text-zinc-500 truncate">
                    API Key
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Input Form */}
        <form onSubmit={handleConnect} className="space-y-3.5 sm:space-y-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-1">
              <label className="text-xs font-medium text-zinc-300">
                {selectedProvider.name} API Key
              </label>
              <span className="text-[10px] sm:text-[11px] font-mono text-zinc-500">
                Format: {selectedProvider.keyPrefix || 'Standard API Key'}
              </span>
            </div>
            <div className="relative">
              <input
                id="onboarding-api-key-input"
                type="password"
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                placeholder={`Paste your ${selectedProvider.name} API key...`}
                className="w-full px-3 sm:px-3.5 py-2.5 bg-zinc-950/80 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 transition font-mono"
              />
            </div>
          </div>

          {/* Custom Base URL if applicable */}
          {selectedProvider.isCustomizableBaseUrl && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">
                Base URL (Optional)
              </label>
              <input
                id="onboarding-base-url-input"
                type="text"
                value={inputBaseUrl}
                onChange={(e) => setInputBaseUrl(e.target.value)}
                placeholder={selectedProvider.defaultBaseUrl || 'https://api.openai.com/v1'}
                className="w-full px-3 sm:px-3.5 py-2.5 bg-zinc-950/80 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 transition font-mono"
              />
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center justify-center sm:justify-start">
              <button
                type="button"
                onClick={onOpenFullProviderModal}
                className="text-xs text-blue-400 hover:text-blue-300 transition cursor-pointer py-1"
              >
                Configure All Provider Keys →
              </button>
            </div>

            <button
              type="submit"
              id="onboarding-submit-btn"
              disabled={!inputKey.trim()}
              className={`w-full sm:w-auto justify-center px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                inputKey.trim()
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30'
                  : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
              }`}
            >
              <span>Save & Start Chatting</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
