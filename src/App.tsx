import React, { useState, useEffect, useRef } from 'react';
import {
  AppSettings,
  Attachment,
  Conversation,
  Message,
  ModelInfo,
  ProviderCredential,
  ProviderId,
} from './types';
import { PROVIDERS, DEFAULT_SYSTEM_PROMPTS } from './constants/providers';
import {
  loadConversations,
  saveConversations,
  loadCredentials,
  saveCredential,
  removeCredential,
  loadSettings,
  saveSettings,
  loadActiveConversationId,
  saveActiveConversationId,
  createNewConversation,
  loadAvailableModels,
  saveAvailableModels,
} from './services/storage';
import { streamChat, calculateCost } from './services/api';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';
import { BentoInspector } from './components/BentoInspector';
import { ProviderModal } from './components/ProviderModal';
import { ModelSelectorModal } from './components/ModelSelectorModal';
import { ParametersModal } from './components/ParametersModal';
import { SettingsModal } from './components/SettingsModal';
import { OnboardingView } from './components/OnboardingView';
import { ChatForgeIcon } from './components/ChatForgeLogo';
import { parseApiError } from './utils/errorParser';
import { AlertCircle, ArrowDown, Sparkles, MessageSquare, Bot } from 'lucide-react';

export default function App() {
  // State Initialization
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [credentials, setCredentials] = useState<Record<ProviderId, ProviderCredential>>(loadCredentials);
  const [conversations, setConversations] = useState<Conversation[]>(loadConversations);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(loadActiveConversationId);
  const [availableModels, setAvailableModels] = useState<ModelInfo[]>(() => {
    const creds = loadCredentials();
    const isConfigured = (pId: ProviderId) => {
      const c = creds[pId];
      if (!c) return false;
      if (pId === 'custom') return Boolean(c.customBaseUrl?.trim() || (c.apiKey && c.apiKey.trim().length > 3));
      return Boolean(c.apiKey && c.apiKey.trim().length > 3);
    };

    const isDeprecated = (id: string) =>
      /^(gemini-2\.5-flash$|gemini-1\.|gemini-2\.0|gemini-pro)/i.test(id);

    const saved = loadAvailableModels();
    if (saved.length > 0) {
      // Only keep saved models for configured providers and filter out deprecated models
      const valid = saved.filter((m) => isConfigured(m.provider) && !isDeprecated(m.id));
      if (valid.length > 0) return valid;
    }

    const configured = PROVIDERS.filter((p) => isConfigured(p.id));
    if (configured.length > 0) {
      return configured.flatMap((p) => p.defaultModels);
    }
    return [];
  });

  // Modal & Inspector Visibility States
  const [isProviderModalOpen, setIsProviderModalOpen] = useState(false);
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  const [isParametersModalOpen, setIsParametersModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);

  // Streaming State
  const [isStreaming, setIsStreaming] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatScrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);

  // Ensure active conversation exists & migrate deprecated model references
  useEffect(() => {
    // Migration check for deprecated active models
    if (settings.activeModel === 'gemini-2.5-flash' || /^(gemini-1\.|gemini-2\.0)/.test(settings.activeModel)) {
      setSettings((prev) => ({ ...prev, activeModel: 'gemini-3.7-flash' }));
    }

    if (conversations.length === 0) {
      const initial = createNewConversation(
        settings.activeProvider,
        settings.activeModel || 'gemini-3.7-flash',
        DEFAULT_SYSTEM_PROMPTS[0].prompt
      );
      setConversations([initial]);
      setActiveConversationId(initial.id);
      saveConversations([initial]);
      saveActiveConversationId(initial.id);
    } else {
      // Migrate conversations with deprecated model IDs
      let modified = false;
      const updatedConversations = conversations.map((conv) => {
        if (conv.modelId === 'gemini-2.5-flash' || /^(gemini-1\.|gemini-2\.0)/.test(conv.modelId)) {
          modified = true;
          return { ...conv, modelId: 'gemini-3.7-flash' };
        }
        return conv;
      });

      if (modified) {
        setConversations(updatedConversations);
      }

      if (!activeConversationId || !conversations.some((c) => c.id === activeConversationId)) {
        setActiveConversationId(conversations[0].id);
        saveActiveConversationId(conversations[0].id);
      }
    }
  }, []);

  // Sync settings & conversations to storage
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    saveConversations(conversations);
  }, [conversations]);

  useEffect(() => {
    saveActiveConversationId(activeConversationId);
  }, [activeConversationId]);

  useEffect(() => {
    if (availableModels && availableModels.length > 0) {
      saveAvailableModels(availableModels);
    }
  }, [availableModels]);

  // Apply Theme & Font-Size classes to document
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', settings.theme);
    root.setAttribute('data-font-size', settings.fontSize || 'md');
    if (settings.theme === 'light') {
      root.classList.add('light-theme');
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
      root.classList.remove('light-theme');
    }
  }, [settings.theme, settings.fontSize]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsModelSelectorOpen((prev) => !prev);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        handleNewConversation();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [settings.activeProvider, settings.activeModel]);

  // Scroll detection for "Jump to bottom" button
  const handleChatScroll = () => {
    if (chatScrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatScrollContainerRef.current;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      setShowScrollBottomBtn(distanceFromBottom > 150);
    }
  };

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  // Active Conversation and Model Resolution with bulletproof fallback
  const fallbackConversation: Conversation = {
    id: 'default_conv',
    title: 'New Conversation',
    providerId: settings.activeProvider || 'google',
    modelId: settings.activeModel || 'gemini-3.7-flash',
    temperature: 0.7,
    maxTokens: 4096,
    topP: 1.0,
    systemPrompt: DEFAULT_SYSTEM_PROMPTS[0].prompt,
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const activeConversation: Conversation =
    conversations.find((c) => c.id === activeConversationId) ||
    conversations[0] ||
    fallbackConversation;

  const activeProvider = activeConversation?.providerId || settings.activeProvider || 'google';
  const activeModelId = activeConversation?.modelId || settings.activeModel || 'gemini-3.7-flash';
  const activeModelInfo = availableModels.find(
    (m) => m.id === activeModelId && m.provider === activeProvider
  ) || availableModels.find((m) => m.id === activeModelId);

  // Check if active provider has a valid key configured
  const currentCred = credentials[activeProvider];
  const hasActiveKey = currentCred?.apiKey && currentCred.apiKey.length > 3;

  // Check if ANY provider is configured
  const hasAnyKeyConfigured = Object.values(credentials).some(
    (c) => c?.apiKey && c.apiKey.length > 3
  );

  // Conversation Actions
  const handleNewConversation = () => {
    if (isStreaming) handleStopStreaming();
    const newConv = createNewConversation(
      settings.activeProvider,
      settings.activeModel,
      activeConversation?.systemPrompt || DEFAULT_SYSTEM_PROMPTS[0].prompt
    );
    const updated = [newConv, ...conversations];
    setConversations(updated);
    setActiveConversationId(newConv.id);
    setErrorMessage(null);
  };

  const handleDeleteConversation = (id: string) => {
    const updated = conversations.filter((c) => c.id !== id);
    if (updated.length === 0) {
      const fresh = createNewConversation(settings.activeProvider, settings.activeModel);
      setConversations([fresh]);
      setActiveConversationId(fresh.id);
    } else {
      setConversations(updated);
      if (activeConversationId === id) {
        setActiveConversationId(updated[0].id);
      }
    }
  };

  const handleRenameConversation = (id: string, newTitle: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: newTitle, updatedAt: Date.now() } : c))
    );
  };

  const handleTogglePinConversation = (id: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isPinned: !c.isPinned } : c))
    );
  };

  // Provider & Model Actions
  const handleSaveCredential = (providerId: ProviderId, cred: ProviderCredential) => {
    saveCredential(providerId, cred);
    setCredentials(loadCredentials());
    setSettings((prev) => ({ ...prev, activeProvider: providerId }));
    if (activeConversation) {
      setConversations((prev) =>
        prev.map((c) => (c.id === activeConversation.id ? { ...c, providerId } : c))
      );
    }
  };

  const handleRemoveCredential = (providerId: ProviderId) => {
    removeCredential(providerId);
    setCredentials(loadCredentials());
  };

  const handleSelectModel = (providerId: ProviderId, modelId: string) => {
    setSettings((prev) => ({
      ...prev,
      activeProvider: providerId,
      activeModel: modelId,
    }));

    if (activeConversation) {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversation.id ? { ...c, providerId, modelId, updatedAt: Date.now() } : c
        )
      );
    }
  };

  const handleTogglePinModel = (modelId: string) => {
    setSettings((prev) => {
      const isPinned = prev.pinnedModels.includes(modelId);
      const updated = isPinned
        ? prev.pinnedModels.filter((id) => id !== modelId)
        : [...prev.pinnedModels, modelId];
      return { ...prev, pinnedModels: updated };
    });
  };

  const handleSaveParameters = (params: {
    temperature: number;
    maxTokens: number;
    topP: number;
    systemPrompt: string;
  }) => {
    if (!activeConversation) return;
    setConversations((prev) =>
      prev.map((c) => (c.id === activeConversation.id ? { ...c, ...params, updatedAt: Date.now() } : c))
    );
  };

  // Stop generation
  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  };

  // Core Send Message Implementation
  const handleSendMessage = async (text: string, attachments?: Attachment[], customMessagesHistory?: Message[]) => {
    if ((!text.trim() && (!attachments || attachments.length === 0)) || isStreaming || !activeConversation) return;

    setErrorMessage(null);
    const cred = credentials[activeConversation.providerId];
    if (!cred?.apiKey && activeConversation.providerId !== 'custom') {
      setIsProviderModalOpen(true);
      return;
    }

    const now = Date.now();
    const userMessage: Message = {
      id: `msg_${now}_${Math.random().toString(36).substring(2, 7)}`,
      role: 'user',
      content: text.trim(),
      attachments: attachments && attachments.length > 0 ? attachments : undefined,
      createdAt: now,
      timestamp: now,
    };

    const assistantPlaceholderId = `msg_${now + 1}_${Math.random().toString(36).substring(2, 7)}`;
    const assistantMessage: Message = {
      id: assistantPlaceholderId,
      role: 'assistant',
      content: '',
      createdAt: now + 1,
      timestamp: now + 1,
    };

    // Calculate auto title if this is the first message in conversation
    const baseHistory = customMessagesHistory || activeConversation.messages;
    const isFirstMessage = baseHistory.length === 0;
    const newTitle = isFirstMessage
      ? text.length > 38
        ? `${text.substring(0, 35)}...`
        : text
      : activeConversation.title;

    const updatedMessages = [...baseHistory, userMessage, assistantMessage];
    const workingConversation: Conversation = {
      ...activeConversation,
      title: newTitle,
      messages: updatedMessages,
      updatedAt: now,
    };

    setConversations((prev) =>
      prev.map((c) => (c.id === activeConversation.id ? workingConversation : c))
    );

    setIsStreaming(true);
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    const startTime = performance.now();

    // Auto-scroll as message starts
    setTimeout(() => scrollToBottom(true), 50);

    try {
      await streamChat(
        {
          ...workingConversation,
          messages: [...baseHistory, userMessage], // send history excluding the empty assistant placeholder
        },
        cred,
        {
          onChunk: (chunk: string) => {
            setConversations((prev) =>
              prev.map((c) => {
                if (c.id !== activeConversation.id) return c;
                const msgs = c.messages.map((m) => {
                  if (m.id === assistantPlaceholderId) {
                    return { ...m, content: m.content + chunk };
                  }
                  return m;
                });
                return { ...c, messages: msgs };
              })
            );
            scrollToBottom(false);
          },
          onReasoningChunk: (reasoningChunk: string) => {
            setConversations((prev) =>
              prev.map((c) => {
                if (c.id !== activeConversation.id) return c;
                const msgs = c.messages.map((m) => {
                  if (m.id === assistantPlaceholderId) {
                    return {
                      ...m,
                      reasoningContent: (m.reasoningContent || '') + reasoningChunk,
                    };
                  }
                  return m;
                });
                return { ...c, messages: msgs };
              })
            );
          },
          onDone: (fullText: string, fullReasoning?: string, usage?: any) => {
            const durationMs = Math.round(performance.now() - startTime);
            const cost = calculateCost(
              activeModelInfo,
              usage?.prompt || 0,
              usage?.completion || 0
            );

            setConversations((prev) =>
              prev.map((c) => {
                if (c.id !== activeConversation.id) return c;
                const msgs = c.messages.map((m) => {
                  if (m.id === assistantPlaceholderId) {
                    return {
                      ...m,
                      content: fullText,
                      reasoningContent: fullReasoning,
                      tokens: usage,
                      estimatedCost: cost,
                    };
                  }
                  return m;
                });
                return { ...c, messages: msgs, updatedAt: Date.now() };
              })
            );
            setIsStreaming(false);
            abortControllerRef.current = null;
          },
          onError: (err: Error) => {
            if (err.name === 'AbortError') return;
            const parsedError = parseApiError(err);
            setConversations((prev) =>
              prev.map((c) => {
                if (c.id !== activeConversation.id) return c;
                const msgs = c.messages.map((m) => {
                  if (m.id === assistantPlaceholderId) {
                    return {
                      ...m,
                      isError: true,
                      errorDetails: parsedError,
                    };
                  }
                  return m;
                });
                return { ...c, messages: msgs, updatedAt: Date.now() };
              })
            );
            setIsStreaming(false);
            abortControllerRef.current = null;
          },
        },
        abortController.signal
      );
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        const parsedError = parseApiError(err);
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== activeConversation.id) return c;
            const msgs = c.messages.map((m) => {
              if (m.id === assistantPlaceholderId) {
                return {
                  ...m,
                  isError: true,
                  errorDetails: parsedError,
                };
              }
              return m;
            });
            return { ...c, messages: msgs, updatedAt: Date.now() };
          })
        );
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    }
  };

  // Regenerate last assistant response
  const handleRegenerate = () => {
    if (isStreaming || !activeConversation || activeConversation.messages.length === 0) return;
    const msgs = [...activeConversation.messages];
    const lastMsg = msgs[msgs.length - 1];

    if (lastMsg.role === 'assistant') {
      msgs.pop(); // remove last assistant message
      const lastUserMsg = msgs[msgs.length - 1];
      if (lastUserMsg && lastUserMsg.role === 'user') {
        const text = lastUserMsg.content;
        const attachments = lastUserMsg.attachments;
        msgs.pop(); // remove user message so handleSendMessage appends it properly
        handleSendMessage(text, attachments, msgs);
      }
    }
  };

  const starterPrompts = [
    'Write a TypeScript function to debounce an API call',
    'Explain the difference between deep reasoning and standard LLM inference',
    'Audit this code snippet for security vulnerabilities',
  ];

  return (
    <div
      id="chatforge-app-root"
      className="flex h-screen w-full bg-zinc-950 text-zinc-100 font-sans antialiased overflow-hidden selection:bg-blue-500/30"
    >
      {/* Navigation Sidebar */}
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={(id) => {
          setActiveConversationId(id);
          setErrorMessage(null);
        }}
        onNewConversation={handleNewConversation}
        onDeleteConversation={handleDeleteConversation}
        onRenameConversation={handleRenameConversation}
        onTogglePinConversation={handleTogglePinConversation}
        isOpen={isSidebarOpen}
        onToggleOpen={() => setIsSidebarOpen(!isSidebarOpen)}
        onOpenProviderModal={() => setIsProviderModalOpen(true)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        credentials={credentials}
        activeProvider={activeProvider}
      />

      {/* Main Chat Viewport */}
      <div className="flex-1 flex flex-col min-w-0 bg-zinc-900/20 overflow-hidden relative">
        {/* Top Navbar */}
        <Navbar
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          activeProviderId={activeProvider}
          activeModelId={activeModelId}
          activeModelInfo={activeModelInfo}
          onOpenModelSelector={() => setIsModelSelectorOpen(true)}
          onOpenParameters={() => setIsParametersModalOpen(true)}
          onOpenProviderModal={() => setIsProviderModalOpen(true)}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
          onNewChat={handleNewConversation}
          credentials={credentials}
          currentTemperature={activeConversation?.temperature ?? 0.7}
          isInspectorOpen={isInspectorOpen}
          onToggleInspector={() => setIsInspectorOpen(!isInspectorOpen)}
        />

        {/* Center Main Chat Area */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
            {/* Chat Area Content: Onboarding vs Message Stream */}
            {!hasAnyKeyConfigured && activeConversation?.messages.length === 0 ? (
              <OnboardingView
                onSaveCredentialAndStart={(pId, cred) => {
                  handleSaveCredential(pId, cred);
                  const providerModels = availableModels.filter((m) => m.provider === pId);
                  const firstModel =
                    providerModels[0]?.id ||
                    PROVIDERS.find((p) => p.id === pId)?.defaultModels[0]?.id ||
                    'gemini-3.7-flash';
                  handleSelectModel(pId, firstModel);
                }}
                onOpenFullProviderModal={() => setIsProviderModalOpen(true)}
              />
            ) : (
              <div
                ref={chatScrollContainerRef}
                onScroll={handleChatScroll}
                className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-6 md:p-8 space-y-4 sm:space-y-6"
              >
                {activeConversation?.messages.length === 0 ? (
                  <div className="max-w-2xl mx-auto py-12 px-4 text-center space-y-6">
                    <div className="flex justify-center">
                      <ChatForgeIcon className="w-16 h-16 drop-shadow-md" />
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight">
                        {activeModelInfo?.name || activeModelId}
                      </h2>
                      <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">
                        {activeModelInfo?.description ||
                          'Ready to answer questions, analyze code, or write complex reasoning workflows.'}
                      </p>
                    </div>

                    {/* Bento Grid Starter Prompts */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto pt-4 text-left">
                      <button
                        onClick={() => handleSendMessage('Explain the architecture of Transformer attention mechanisms.')}
                        className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-left transition group shadow-sm cursor-pointer"
                      >
                        <div className="text-xs font-semibold text-zinc-200 group-hover:text-blue-400 transition">
                          Transformer Architecture
                        </div>
                        <div className="text-[11px] text-zinc-400 mt-1">
                          Explain self-attention, query/key/value matrices, and multi-head attention.
                        </div>
                      </button>

                      <button
                        onClick={() => handleSendMessage('Write a clean TypeScript debounce hook for React.')}
                        className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-left transition group shadow-sm cursor-pointer"
                      >
                        <div className="text-xs font-semibold text-zinc-200 group-hover:text-blue-400 transition">
                          React Custom Hooks
                        </div>
                        <div className="text-[11px] text-zinc-400 mt-1">
                          Write a clean TypeScript debounce hook with full type safety.
                        </div>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="max-w-4xl mx-auto space-y-4">
                    {(activeConversation?.messages || []).map((message, idx) => {
                      const messagesCount = activeConversation?.messages?.length || 0;
                      const isLastAssistantMessage =
                        idx === messagesCount - 1 &&
                        message.role === 'assistant';

                      return (
                        <ChatMessage
                          key={message.id}
                          message={message}
                          isStreaming={isLastAssistantMessage && isStreaming}
                          onRegenerate={isLastAssistantMessage ? handleRegenerate : undefined}
                          onOpenModelSelector={() => setIsModelSelectorOpen(true)}
                          onOpenProviderModal={() => setIsProviderModalOpen(true)}
                          modelInfo={activeModelInfo}
                        />
                      );
                    })}
                    <div ref={messagesEndRef} className="h-4" />
                  </div>
                )}

                {/* Jump to bottom floating button */}
                {showScrollBottomBtn && (
                  <button
                    id="jump-to-bottom-btn"
                    onClick={() => scrollToBottom(true)}
                    className="fixed bottom-24 right-8 p-2.5 rounded-full bg-zinc-800/90 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 shadow-xl backdrop-blur-sm transition animate-fadeIn"
                    aria-label="Scroll to bottom"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            {/* Input Bar */}
            <div className="p-2.5 sm:px-6 md:px-8 bg-zinc-950/60 backdrop-blur-xs border-t border-zinc-800/60">
              <div className="max-w-4xl mx-auto">
                <ChatInput
                  onSendMessage={(text, attachments) => handleSendMessage(text, attachments)}
                  isStreaming={isStreaming}
                  onStopStreaming={handleStopStreaming}
                  activeProviderId={activeProvider}
                  activeModelId={activeModelId}
                  activeModelInfo={activeModelInfo}
                  onOpenModelSelector={() => setIsModelSelectorOpen(true)}
                  onOpenParameters={() => setIsParametersModalOpen(true)}
                  disabled={!hasActiveKey}
                  starterPrompts={activeConversation?.messages.length === 0 ? starterPrompts : undefined}
                />
              </div>
            </div>
          </div>

          {/* Right Configuration Inspector Bento Column */}
          <BentoInspector
            activeConversation={activeConversation}
            activeProviderId={activeProvider}
            activeModelId={activeModelId}
            activeModelInfo={activeModelInfo}
            credentials={credentials}
            onOpenProviderModal={() => setIsProviderModalOpen(true)}
            onOpenParameters={() => setIsParametersModalOpen(true)}
            onOpenModelSelector={() => setIsModelSelectorOpen(true)}
            isOpen={isInspectorOpen}
            onToggle={() => setIsInspectorOpen(!isInspectorOpen)}
          />
        </div>
      </div>

      {/* Modals */}
      <ProviderModal
        isOpen={isProviderModalOpen}
        onClose={() => setIsProviderModalOpen(false)}
        credentials={credentials}
        onSaveCredential={handleSaveCredential}
        onRemoveCredential={handleRemoveCredential}
        activeProvider={activeProvider}
        availableModels={availableModels}
        onUpdateAvailableModels={setAvailableModels}
        onSelectActiveProvider={(id) => {
          const providerModels = availableModels.filter((m) => m.provider === id);
          const firstModel =
            providerModels[0]?.id ||
            PROVIDERS.find((p) => p.id === id)?.defaultModels[0]?.id ||
            'gemini-3.7-flash';
          handleSelectModel(id, firstModel);
        }}
      />

      <ModelSelectorModal
        isOpen={isModelSelectorOpen}
        onClose={() => setIsModelSelectorOpen(false)}
        activeProvider={activeProvider}
        activeModelId={activeModelId}
        onSelectModel={handleSelectModel}
        pinnedModels={settings.pinnedModels}
        onTogglePinModel={handleTogglePinModel}
        credentials={credentials}
        availableModels={availableModels}
        onUpdateAvailableModels={setAvailableModels}
        onOpenProviderModal={(providerId) => {
          if (providerId) {
            handleSelectModel(providerId, activeModelId);
          }
          setIsProviderModalOpen(true);
        }}
      />

      <ParametersModal
        isOpen={isParametersModalOpen}
        onClose={() => setIsParametersModalOpen(false)}
        temperature={activeConversation?.temperature ?? 0.7}
        maxTokens={activeConversation?.maxTokens ?? 4096}
        topP={activeConversation?.topP ?? 1.0}
        systemPrompt={activeConversation?.systemPrompt ?? DEFAULT_SYSTEM_PROMPTS[0].prompt}
        onSaveParameters={handleSaveParameters}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onUpdateSettings={setSettings}
        activeConversation={activeConversation}
        onDataReset={() => {
          setCredentials({} as Record<ProviderId, ProviderCredential>);
          const fresh = createNewConversation('google', 'gemini-3.7-flash');
          setConversations([fresh]);
          setActiveConversationId(fresh.id);
        }}
      />
    </div>
  );
}
