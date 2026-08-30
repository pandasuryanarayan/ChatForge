import React, { useState } from 'react';
import {
  Plus,
  Search,
  MessageSquare,
  Star,
  Trash2,
  Edit2,
  Key,
  Shield,
  Settings,
  Check,
  X,
} from 'lucide-react';
import { Conversation, ProviderCredential, ProviderId } from '../types';
import { PROVIDERS } from '../constants/providers';
import { ChatForgeIcon, ChatForgeWordmark } from './ChatForgeLogo';

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  onTogglePinConversation: (id: string) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
  onOpenProviderModal: () => void;
  onOpenSettings?: () => void;
  credentials: Record<ProviderId, ProviderCredential>;
  activeProvider: ProviderId;
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onRenameConversation,
  onTogglePinConversation,
  isOpen,
  onToggleOpen,
  onOpenProviderModal,
  onOpenSettings,
  credentials,
  activeProvider,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const startRename = (conv: Conversation) => {
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  const saveRename = (id: string) => {
    if (editTitle.trim()) {
      onRenameConversation(id, editTitle.trim());
    }
    setEditingId(null);
  };

  // Filter conversations
  const filtered = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.title.toLowerCase().includes(q) ||
      (c.messages || []).some((m) => m.content.toLowerCase().includes(q))
    );
  });

  // Groupings
  const pinnedConversations = filtered.filter((c) => c.isPinned);
  const unpinnedConversations = filtered.filter((c) => !c.isPinned);

  const now = Date.now();
  const ONE_DAY = 24 * 60 * 60 * 1000;
  const today = unpinnedConversations.filter((c) => now - c.updatedAt < ONE_DAY);
  const yesterday = unpinnedConversations.filter(
    (c) => now - c.updatedAt >= ONE_DAY && now - c.updatedAt < 2 * ONE_DAY
  );
  const previous7Days = unpinnedConversations.filter(
    (c) => now - c.updatedAt >= 2 * ONE_DAY && now - c.updatedAt < 7 * ONE_DAY
  );
  const older = unpinnedConversations.filter((c) => now - c.updatedAt >= 7 * ONE_DAY);

  const configuredProvidersCount = PROVIDERS.filter((p) => {
    const cred = credentials[p.id];
    return cred?.apiKey && cred.apiKey.length > 3;
  }).length;

  const renderConversationItem = (conv: Conversation) => {
    const isActive = conv.id === activeConversationId;
    const isEditingThis = editingId === conv.id;

    return (
      <div
        key={conv.id}
        id={`conv-item-${conv.id}`}
        className={`group relative flex items-center justify-between p-2 rounded-md cursor-pointer text-sm transition-colors ${
          isActive
            ? 'bg-zinc-800/80 dark:bg-zinc-800/80 border border-zinc-700/60 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 font-medium'
            : 'hover:bg-zinc-200/70 dark:hover:bg-zinc-900/60 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 border border-transparent'
        }`}
        onClick={() => onSelectConversation(conv.id)}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <MessageSquare className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-400' : 'text-zinc-500'}`} />
          {isEditingThis ? (
            <div className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
              <input
                id={`rename-input-${conv.id}`}
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveRename(conv.id);
                  if (e.key === 'Escape') setEditingId(null);
                }}
                autoFocus
                className="w-full bg-zinc-950 px-2 py-0.5 rounded text-xs text-white border border-zinc-700 focus:outline-none"
              />
              <button
                onClick={() => saveRename(conv.id)}
                className="p-1 text-emerald-400 hover:bg-zinc-700 rounded"
              >
                <Check className="w-3 h-3" />
              </button>
              <button
                onClick={() => setEditingId(null)}
                className="p-1 text-zinc-400 hover:bg-zinc-700 rounded"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="min-w-0 flex-1">
              <span className="truncate block text-xs font-medium">{conv.title}</span>
              <span className="text-[10px] text-zinc-500 truncate block">
                {conv.modelId} • {conv.messages?.length || 0} msgs
              </span>
            </div>
          )}
        </div>

        {/* Hover Action Menu */}
        {!isEditingThis && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              id={`pin-btn-${conv.id}`}
              onClick={(e) => {
                e.stopPropagation();
                onTogglePinConversation(conv.id);
              }}
              title={conv.isPinned ? 'Unpin' : 'Pin'}
              className={`p-1 rounded hover:bg-zinc-700 ${
                conv.isPinned ? 'text-amber-400 opacity-100' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Star className={`w-3 h-3 ${conv.isPinned ? 'fill-amber-400' : ''}`} />
            </button>

            <button
              id={`rename-btn-${conv.id}`}
              onClick={(e) => {
                e.stopPropagation();
                startRename(conv);
              }}
              title="Rename"
              className="p-1 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700 rounded"
            >
              <Edit2 className="w-3 h-3" />
            </button>

            <button
              id={`delete-btn-${conv.id}`}
              onClick={(e) => {
                e.stopPropagation();
                onDeleteConversation(conv.id);
              }}
              title="Delete"
              className="p-1 text-zinc-500 hover:text-rose-400 hover:bg-zinc-700 rounded"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-xs lg:hidden"
          onClick={onToggleOpen}
        />
      )}

      <nav
        id="sidebar-nav"
        className={`fixed lg:static top-0 bottom-0 left-0 z-40 w-64 border-r border-zinc-800 bg-zinc-950/20 backdrop-blur-xs flex flex-col transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top: Bento New Conversation Button & Brand */}
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ChatForgeIcon className="w-6 h-6" />
              <ChatForgeWordmark className="h-4.5 w-auto" textColor="#F4F4F5" />
            </div>
            <button onClick={onToggleOpen} className="p-1 text-zinc-400 hover:text-white lg:hidden">
              <X className="w-4 h-4" />
            </button>
          </div>

          <button
            id="new-conversation-btn"
            onClick={() => {
              onNewConversation();
              if (window.innerWidth < 1024) onToggleOpen();
            }}
            className="w-full bg-zinc-100 text-zinc-950 font-medium py-2 rounded-lg text-sm flex items-center justify-center gap-2 hover:bg-white transition-colors cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>New Conversation</span>
          </button>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              id="sidebar-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chats..."
              className="w-full pl-8 pr-3 py-1.5 bg-zinc-900/70 border border-zinc-800 rounded-md text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 transition"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 px-3 space-y-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="text-center py-8 text-xs text-zinc-500">
              No conversations yet
            </div>
          ) : (
            <>
              {pinnedConversations.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold px-2 py-1.5 flex items-center gap-1 text-amber-400/90">
                    <Star className="w-3 h-3 fill-current" />
                    <span>Pinned</span>
                  </div>
                  <div className="space-y-1">{pinnedConversations.map(renderConversationItem)}</div>
                </div>
              )}

              {today.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold px-2 py-2">
                    Recent Chats
                  </div>
                  <div className="space-y-1">{today.map(renderConversationItem)}</div>
                </div>
              )}

              {yesterday.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold px-2 py-2">
                    Yesterday
                  </div>
                  <div className="space-y-1">{yesterday.map(renderConversationItem)}</div>
                </div>
              )}

              {previous7Days.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold px-2 py-2">
                    Previous 7 Days
                  </div>
                  <div className="space-y-1">{previous7Days.map(renderConversationItem)}</div>
                </div>
              )}

              {older.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold px-2 py-2">
                    Older
                  </div>
                  <div className="space-y-1">{older.map(renderConversationItem)}</div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Bottom Bento Actions Bar */}
        <div className="p-4 border-t border-zinc-800 mt-auto space-y-2 bg-zinc-950/40">
          <button
            id="sidebar-api-keys-btn"
            onClick={onOpenProviderModal}
            className="flex items-center justify-between text-xs text-zinc-400 hover:text-zinc-200 w-full p-2 rounded-md hover:bg-zinc-900 transition"
          >
            <span className="flex items-center gap-2">
              <Key className="w-3.5 h-3.5 text-blue-400" />
              <span>Provider Keys</span>
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-850 text-zinc-400">
              {configuredProvidersCount} active
            </span>
          </button>

          {onOpenSettings && (
            <button
              id="sidebar-settings-bottom-btn"
              onClick={onOpenSettings}
              className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-100 w-full p-1.5 rounded-md hover:bg-zinc-900 transition"
            >
              <Settings className="w-4 h-4 text-zinc-500" />
              <span>Settings</span>
            </button>
          )}
        </div>
      </nav>
    </>
  );
};
