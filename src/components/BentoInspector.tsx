import React from 'react';
import {
  Sliders,
  Key,
  Shield,
  Bot,
  Brain,
  Sparkles,
  ExternalLink,
  Edit3,
  Layers,
  Zap,
} from 'lucide-react';
import { Conversation, ModelInfo, ProviderCredential, ProviderId } from '../types';
import { PROVIDERS } from '../constants/providers';
import { ProviderIcon } from './ProviderIcon';

interface BentoInspectorProps {
  activeConversation?: Conversation;
  activeProviderId: ProviderId;
  activeModelId: string;
  activeModelInfo?: ModelInfo;
  credentials: Record<ProviderId, ProviderCredential>;
  onOpenProviderModal: () => void;
  onOpenParameters: () => void;
  onOpenModelSelector: () => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const BentoInspector: React.FC<BentoInspectorProps> = ({
  activeConversation,
  activeProviderId,
  activeModelId,
  activeModelInfo,
  credentials,
  onOpenProviderModal,
  onOpenParameters,
  onOpenModelSelector,
  isOpen,
  onToggle,
}) => {
  const provider = PROVIDERS.find((p) => p.id === activeProviderId) || PROVIDERS[0];
  const activeCred = credentials[activeProviderId];
  const hasKey = activeCred?.apiKey && activeCred.apiKey.length > 3;

  // Compute total tokens used across all messages in this conversation
  const totalConversationTokens =
    (activeConversation?.messages || []).reduce((acc, msg) => {
      return acc + (msg.tokens?.total || 0);
    }, 0) || 0;

  const formattedTokens =
    totalConversationTokens >= 1000
      ? `${(totalConversationTokens / 1000).toFixed(1)}k`
      : `${totalConversationTokens}`;

  const temperature = activeConversation?.temperature ?? 0.7;
  const maxTokens = activeConversation?.maxTokens ?? 4096;
  const tempPercent = Math.min(Math.max((temperature / 1.5) * 100, 5), 100);
  const tokensPercent = Math.min(Math.max((maxTokens / 16384) * 100, 5), 100);

  if (!isOpen) return null;

  return (
    <aside
      id="bento-inspector-sidebar"
      className="w-72 border-l border-zinc-800 bg-zinc-950/40 p-4 overflow-y-auto hidden xl:flex flex-col gap-4 shrink-0 transition-all selection:bg-blue-500/30"
    >
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">
          Configuration
        </div>
        <button
          onClick={onOpenParameters}
          className="text-[10px] text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
        >
          <Sliders className="w-3 h-3" />
          <span>Advanced</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {/* Bento 1: Active Provider */}
        <div
          id="bento-card-provider"
          className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl space-y-2.5 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
              Active Provider
            </div>
            <span
              className={`w-2 h-2 rounded-full ${
                hasKey ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-amber-400'
              }`}
            />
          </div>

          <div className="flex items-center gap-3">
            <ProviderIcon providerId={provider.id} size="lg" />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-zinc-200 truncate">{provider.name}</div>
              <div className="text-[11px] text-zinc-500 truncate">
                {hasKey ? 'API Key Active' : 'Key Required'}
              </div>
            </div>
          </div>

          <button
            id="bento-change-key-btn"
            onClick={onOpenProviderModal}
            className="w-full py-1 text-[10px] bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300 uppercase font-bold tracking-tight transition"
          >
            {hasKey ? 'Manage Keys' : 'Add API Key'}
          </button>
        </div>

        {/* Bento 2: Active Model Card */}
        <div
          id="bento-card-model"
          className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl space-y-2 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
              Selected Model
            </div>
            <button
              onClick={onOpenModelSelector}
              className="text-[10px] text-blue-400 hover:text-blue-300 font-semibold uppercase"
            >
              Switch
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-600/10 text-blue-400 border border-blue-500/20 shrink-0">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-zinc-200 truncate">
                {activeModelInfo?.name || activeModelId}
              </div>
              <div className="text-[10px] text-zinc-500 font-mono truncate">
                {activeModelInfo?.contextWindow
                  ? `${Math.round(activeModelInfo.contextWindow / 1000)}k context window`
                  : activeModelId}
              </div>
            </div>
          </div>
        </div>

        {/* Bento 3: Model Parameters */}
        <div
          id="bento-card-parameters"
          className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl space-y-3 shadow-sm cursor-pointer hover:border-zinc-700 transition"
          onClick={onOpenParameters}
        >
          <div className="flex items-center justify-between">
            <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
              Model Parameters
            </div>
            <Sliders className="w-3 h-3 text-zinc-500" />
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-zinc-400">Temperature</span>
                <span className="text-blue-400 font-mono font-medium">{temperature.toFixed(2)}</span>
              </div>
              <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${tempPercent}%` }}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-zinc-400">Max Tokens</span>
                <span className="text-blue-400 font-mono font-medium">
                  {maxTokens.toLocaleString()}
                </span>
              </div>
              <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${tokensPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bento 4: Session Context / Usage */}
        <div
          id="bento-card-context"
          className="bg-blue-600/10 border border-blue-500/20 p-3.5 rounded-xl space-y-1 shadow-sm"
        >
          <div className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">
            Session Context
          </div>
          <div className="text-2xl font-light text-zinc-100 tracking-tight font-mono">
            {formattedTokens}
          </div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wide">
            Total Tokens Processed
          </div>
        </div>

        {/* Bento 5: System Message */}
        <div
          id="bento-card-system-prompt"
          className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl space-y-1 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
              System Message
            </div>
            <button
              onClick={onOpenParameters}
              className="text-[10px] text-blue-400 hover:underline flex items-center gap-0.5"
            >
              <Edit3 className="w-2.5 h-2.5" />
              <span>Edit</span>
            </button>
          </div>
          <div className="text-[11px] text-zinc-400 leading-relaxed italic line-clamp-3">
            {activeConversation?.systemPrompt
              ? `"${activeConversation.systemPrompt}"`
              : '"You are a helpful assistant specialized in TypeScript and Web Security..."'}
          </div>
        </div>
      </div>

      {/* Bento Bottom: Local Mode Guarantee */}
      <div className="mt-auto pt-2 space-y-2 border-t border-zinc-800/80">
        <div className="flex items-center gap-2 px-1">
          <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] animate-pulse" />
          <span className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest">
            Local Mode
          </span>
        </div>
        <p className="text-[10px] text-zinc-500 px-1 leading-normal">
          All data is stored in your browser's localStorage. API keys never leave this client.
        </p>
      </div>
    </aside>
  );
};
