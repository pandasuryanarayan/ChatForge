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
      className="max-w-4xl mx-auto py-8 px-4 sm:px-6 space-y-8 animate-fadeIn selection:bg-blue-500/30 overflow-y-auto"
    >
      {/* Bento Header Hero */}
      <div className="text-center space-y-4 pt-2 flex flex-col items-center">
        <div className="flex justify-center mb-1">
          <ChatForgeLogo className="h-16 sm:h-20 w-auto drop-shadow-md" textColor="#F4F4F5" />
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-600/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Zero-Markup Bring-Your-Own-Key Client</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100">
          Chat with Leading Frontier AI Models
        </h1>
        <p className="text-sm sm:text-base text-zinc-400 max-w-xl mx-auto leading-relaxed">
          Connect your own API key to chat directly with Google Gemini, Claude 3.7 Sonnet, GPT-4o, DeepSeek R1, Groq, Mistral, OpenRouter, or custom endpoints.
        </p>
      </div>

      {/* Bento Grid: 3 Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Privacy */}
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2 shadow-sm">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
            <Lock className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-zinc-200">100% Client-Side Privacy</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            API keys and conversations are stored exclusively in your browser's local storage and dispatched directly to the provider.
          </p>
        </div>

        {/* Card 2: Zero Middleman */}
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2 shadow-sm">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
            <Zap className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-zinc-200">Zero Middleman Markup</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Pay exact wholesale API token prices directly to providers. No monthly subscriptions or chat token caps.
          </p>
        </div>

        {/* Card 3: Deep Reasoning */}
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2 shadow-sm">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
            <Brain className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-zinc-200">Reasoning & Multimodal</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Full support for extended thinking chains, reasoning models (DeepSeek R1, Claude Sonnet), image uploads, and markdown rendering.
          </p>
        </div>
      </div>

      {/* Main Bento Key Connector Card */}
      <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-zinc-800">
          <div>
            <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
              <Key className="w-4 h-4 text-blue-400" />
              <span>Select Provider & Enter API Key</span>
            </h2>
            <p className="text-xs text-zinc-400">Choose a provider to get started in seconds</p>
          </div>
          <a
            href={selectedProvider.keyDocsUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition"
          >
            <span>Get {selectedProvider.name} Key</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Provider selector chips */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
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
                className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 cursor-pointer ${
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
        <form onSubmit={handleConnect} className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-zinc-300">
                {selectedProvider.name} API Key
              </label>
              <span className="text-[11px] font-mono text-zinc-500">
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
                className="w-full px-3.5 py-2.5 bg-zinc-950/80 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 transition font-mono"
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
                className="w-full px-3.5 py-2.5 bg-zinc-950/80 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 transition font-mono"
              />
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onOpenFullProviderModal}
                className="text-xs text-blue-400 hover:text-blue-300 transition cursor-pointer"
              >
                Configure All Provider Keys →
              </button>
            </div>

            <button
              type="submit"
              id="onboarding-submit-btn"
              disabled={!inputKey.trim()}
              className={`px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
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
