import React from 'react';
import {
  Menu,
  Sparkles,
  Sliders,
  Key,
  Settings,
  Brain,
  Eye,
  Plus,
  PanelRight,
  Shield,
  Layers,
} from 'lucide-react';
import { ModelInfo, ProviderCredential, ProviderId } from '../types';
import { PROVIDERS } from '../constants/providers';
import { PROVIDER_LOGOS } from '../assets/providers';
import { ProviderIcon } from './ProviderIcon';
import { ChatForgeIcon, ChatForgeWordmark } from './ChatForgeLogo';

interface NavbarProps {
  onToggleSidebar: () => void;
  activeProviderId: ProviderId;
  activeModelId: string;
  activeModelInfo?: ModelInfo;
  onOpenModelSelector: () => void;
  onOpenParameters: () => void;
  onOpenProviderModal: () => void;
  onOpenSettings: () => void;
  onNewChat: () => void;
  credentials: Record<ProviderId, ProviderCredential>;
  currentTemperature: number;
  isInspectorOpen?: boolean;
  onToggleInspector?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onToggleSidebar,
  activeProviderId,
  activeModelId,
  activeModelInfo,
  onOpenModelSelector,
  onOpenParameters,
  onOpenProviderModal,
  onOpenSettings,
  onNewChat,
  credentials,
  currentTemperature,
  isInspectorOpen,
  onToggleInspector,
}) => {
  const provider = PROVIDERS.find((p) => p.id === activeProviderId) || PROVIDERS[0];
  const activeCred = credentials[activeProviderId];
  const hasKey = activeCred?.apiKey && activeCred.apiKey.length > 3;

  return (
    <header
      id="navbar-container"
      className="h-14 border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-3 z-20 shrink-0 selection:bg-blue-500/30"
    >
      {/* Left: Brand Icon + Title + Model Selector */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        <button
          id="toggle-sidebar-btn"
          onClick={onToggleSidebar}
          className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition shrink-0"
          aria-label="Toggle sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Brand Icon & Name */}
        <div className="flex items-center gap-2.5 shrink-0">
          <ChatForgeIcon className="w-7 h-7 sm:w-8 sm:h-8 drop-shadow-sm" />
          <div className="hidden md:flex items-center gap-1.5">
            <ChatForgeWordmark className="h-5 w-auto" textColor="#F4F4F5" />
            <span className="text-zinc-500 font-normal text-[11px] ml-1 font-mono">v1.0</span>
          </div>
        </div>

        {/* Vertical Divider */}
        <div className="hidden md:block h-4 w-px bg-zinc-800 mx-0.5" />

        {/* Model Picker Quick Bento Pill */}
        <button
          id="navbar-model-selector-btn"
          onClick={onOpenModelSelector}
          className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1 rounded-lg border text-left transition min-w-0 max-w-[130px] xs:max-w-[180px] sm:max-w-xs md:max-w-md group shadow-sm shrink cursor-pointer bg-zinc-900/90 hover:bg-zinc-800 border-zinc-750 text-yellow-400`}
          title={hasKey ? `${provider.name} - ${activeModelInfo?.name || activeModelId}` : 'No provider selected - Click to select provider & enter API key'}
        >
          {hasKey ? (
            <div className="w-5 h-5 min-w-[20px] min-h-[20px] max-w-[20px] max-h-[20px] rounded-md overflow-hidden flex items-center justify-center shrink-0">
              <img
                src={PROVIDER_LOGOS[activeProviderId] || PROVIDER_LOGOS.custom}
                alt={provider.name}
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <Key className="w-4 h-4 text-yellow-400 shrink-0" />
          )}
          <div className="min-w-0 flex items-center gap-1.5 overflow-hidden">
            <span className="text-xs font-semibold truncate whitespace-nowrap text-yellow-400 model-name-text">
              {hasKey ? (activeModelInfo?.name || activeModelId) : 'Select Provider'}
            </span>
            {hasKey && (
              <span className="hidden lg:inline-block text-[10px] px-1.5 py-0.2 rounded bg-yellow-400/10 text-yellow-300 border border-yellow-400/20 font-mono shrink-0 model-provider-text">
                {provider.name}
              </span>
            )}
            {!hasKey && (
              <span className="hidden sm:inline-block text-[10px] px-1.5 py-0.2 rounded bg-yellow-400/10 text-yellow-400 border border-yellow-400/30 font-medium font-mono shrink-0">
                Setup Key
              </span>
            )}
            {hasKey && activeModelInfo?.isReasoning && (
              <Brain className="hidden sm:inline-block w-3 h-3 text-yellow-400 shrink-0" />
            )}
            {hasKey && activeModelInfo?.isVision && (
              <Eye className="hidden sm:inline-block w-3 h-3 text-yellow-300 shrink-0" />
            )}
          </div>
        </button>
      </div>

      {/* Right: Active Provider Pill + Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Active Provider Status Pill */}
        <button
          id="navbar-provider-status-pill"
          onClick={onOpenProviderModal}
          className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded-full px-2 sm:px-3 py-1 text-xs transition cursor-pointer shrink-0 text-yellow-400"
          title={hasKey ? `${provider.name} Connected - Click to manage` : 'No provider selected - Click to configure provider'}
        >
          {hasKey ? (
            <div className="w-5 h-5 min-w-[20px] min-h-[20px] max-w-[20px] max-h-[20px] rounded-md overflow-hidden flex items-center justify-center shrink-0">
              <img
                src={PROVIDER_LOGOS[activeProviderId] || PROVIDER_LOGOS.custom}
                alt={provider.name}
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <Key className="w-4 h-4 text-yellow-400 shrink-0" />
          )}
          <div
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
              hasKey
                ? 'bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.7)]'
                : 'bg-yellow-400 shadow-[0_0_6px_rgba(250,204,21,0.8)] animate-pulse'
            }`}
          />
          <span className="text-yellow-400 text-[11px] font-medium hidden sm:inline whitespace-nowrap">
            {hasKey ? `${provider.name} Active` : 'Select Provider'}
          </span>
        </button>

        {/* Parameters Pill */}
        <button
          id="navbar-parameters-btn"
          onClick={onOpenParameters}
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-900 border border-zinc-800 rounded-lg transition"
          title="Adjust Parameters (Temperature & Max Tokens)"
        >
          <Sliders className="w-3.5 h-3.5 text-blue-400" />
          <span className="font-mono text-[11px]">T: {currentTemperature.toFixed(2)}</span>
        </button>

        {/* New Chat Button */}
        <button
          id="navbar-new-chat-btn"
          onClick={onNewChat}
          className="p-1.5 text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition"
          aria-label="New chat"
          title="New Conversation"
        >
          <Plus className="w-4 h-4" />
        </button>

        {/* Inspector Toggle (for larger screens) */}
        {onToggleInspector && (
          <button
            id="navbar-toggle-inspector-btn"
            onClick={onToggleInspector}
            className={`hidden xl:flex p-1.5 rounded-lg border transition ${
              isInspectorOpen
                ? 'text-blue-400 bg-blue-600/10 border-blue-500/30'
                : 'text-zinc-400 hover:text-zinc-200 bg-zinc-900 border-zinc-800 hover:bg-zinc-800'
            }`}
            title="Toggle Bento Inspector"
            aria-label="Toggle Configuration Panel"
          >
            <PanelRight className="w-4 h-4" />
          </button>
        )}

        {/* Settings / Profile Button */}
        <button
          id="navbar-settings-btn"
          onClick={onOpenSettings}
          className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-700/80 hover:border-zinc-500 flex items-center justify-center text-zinc-300 hover:text-white transition shadow-sm overflow-hidden p-0.5"
          aria-label="Settings & Profile"
          title="Settings & Storage"
        >
          <ChatForgeIcon className="w-full h-full" />
        </button>
      </div>
    </header>
  );
};
