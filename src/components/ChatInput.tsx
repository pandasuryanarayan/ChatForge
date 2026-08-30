import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Square,
  Image as ImageIcon,
  X,
  Sparkles,
  Paperclip,
  Brain,
  Eye,
  Sliders,
  CornerDownLeft,
  Key,
} from 'lucide-react';
import { Attachment, ModelInfo, ProviderId } from '../types';
import { PROVIDERS } from '../constants/providers';

interface ChatInputProps {
  onSendMessage: (content: string, attachments?: Attachment[]) => void;
  isStreaming: boolean;
  onStopStreaming: () => void;
  activeProviderId: ProviderId;
  activeModelId: string;
  activeModelInfo?: ModelInfo;
  onOpenModelSelector: () => void;
  onOpenParameters: () => void;
  disabled?: boolean;
  starterPrompts?: string[];
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isStreaming,
  onStopStreaming,
  activeProviderId,
  activeModelId,
  activeModelInfo,
  onOpenModelSelector,
  onOpenParameters,
  disabled = false,
  starterPrompts,
}) => {
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [content]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (isStreaming) {
      onStopStreaming();
      return;
    }

    if ((!content.trim() && attachments.length === 0) || disabled) return;

    onSendMessage(content.trim(), attachments);
    setContent('');
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) {
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl) {
          const newAttachment: Attachment = {
            id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: file.name,
            mimeType: file.type,
            dataUrl,
            size: file.size,
          };
          setAttachments((prev) => [...prev, newAttachment]);
        }
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const provider = PROVIDERS.find((p) => p.id === activeProviderId) || PROVIDERS[0];
  const isVisionSupported = activeModelInfo?.isVision ?? false;

  return (
    <div id="chat-input-container" className="space-y-2 selection:bg-blue-500/30">
      {/* Starter Prompts chips if passed */}
      {starterPrompts && starterPrompts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pb-1">
          {starterPrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => {
                setContent(prompt);
                textareaRef.current?.focus();
              }}
              className="p-2.5 text-xs text-zinc-300 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-left transition truncate shadow-xs flex items-center justify-between group"
            >
              <span className="truncate">{prompt}</span>
              <Sparkles className="w-3 h-3 text-blue-400 opacity-0 group-hover:opacity-100 transition shrink-0 ml-1.5" />
            </button>
          ))}
        </div>
      )}

      {/* Main Bento Input Box */}
      <div
        id="chat-input-box"
        className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 shadow-2xl focus-within:border-zinc-700 transition-colors"
      >
        {/* Attachment preview thumbnails */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2 p-1 bg-zinc-950/40 rounded-lg border border-zinc-800/80">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="relative group rounded-md overflow-hidden border border-zinc-700 bg-zinc-800 h-16 w-16"
              >
                <img
                  src={att.dataUrl}
                  alt={att.name}
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <button
                  onClick={() => removeAttachment(att.id)}
                  className="absolute top-0.5 right-0.5 p-0.5 bg-black/70 hover:bg-rose-600 rounded-full text-white transition"
                  title="Remove image"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Text Input Area */}
        <textarea
          ref={textareaRef}
          id="chat-textarea"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Message ${activeModelInfo?.name || 'AI'}... (Shift+Enter for newline)`}
          rows={1}
          disabled={disabled}
          className="w-full bg-transparent border-0 focus:outline-none text-sm text-zinc-200 placeholder-zinc-600 resize-none min-h-[44px] max-h-48 leading-relaxed"
        />

        {/* Bottom Toolbar inside input container */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60 mt-1">
          {/* Left Tools: Attachments, Quick Model/Params */}
          <div className="flex items-center gap-1.5 text-zinc-400">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              multiple
              className="hidden"
            />
            <button
              type="button"
              id="attach-image-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition"
              title={isVisionSupported ? 'Attach Image (Vision supported)' : 'Attach image'}
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Model Pill Shortcut */}
            <button
              id="chat-input-model-selector-btn"
              type="button"
              onClick={onOpenModelSelector}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] transition border whitespace-nowrap min-w-0 max-w-[180px] xs:max-w-[240px] sm:max-w-xs overflow-hidden cursor-pointer ${
                disabled
                  ? 'bg-zinc-900 text-amber-400 border-zinc-700 hover:bg-zinc-800'
                  : 'bg-zinc-800/90 hover:bg-zinc-750 text-zinc-100 border-zinc-700'
              }`}
              title={
                disabled
                  ? 'No provider selected - Click to select provider & enter API key'
                  : `${provider.name} / ${activeModelInfo?.name || activeModelId}`
              }
            >
              {disabled ? (
                <>
                  <Key className="w-3 h-3 text-amber-400 shrink-0" />
                  <span className="text-amber-400 font-semibold truncate">Select Provider</span>
                </>
              ) : (
                <>
                  <span className="model-provider-text font-mono text-blue-400 font-semibold shrink-0">
                    {provider.id === 'custom' ? 'Custom' : provider.name.split(' ')[0]}
                  </span>
                  <span className="text-zinc-500 shrink-0">/</span>
                  <span className="model-name-text truncate max-w-[100px] xs:max-w-[140px] sm:max-w-[180px] font-semibold text-zinc-100">
                    {activeModelInfo?.name || activeModelId}
                  </span>
                </>
              )}
            </button>

            {/* Inference Parameters Shortcut */}
            <button
              type="button"
              id="chat-input-parameters-btn"
              onClick={onOpenParameters}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md border text-[11px] font-medium transition cursor-pointer shrink-0 bg-zinc-800/90 hover:bg-zinc-750 text-zinc-300 border-zinc-700 shadow-xs"
              title="Inference Parameters (Temperature, Max Tokens, System Prompt)"
            >
              <Sliders className="w-3 h-3 text-blue-400 shrink-0" />
              <span className="text-zinc-300 font-medium">Params</span>
            </button>
          </div>

          {/* Right Tool: Stop or Send Button */}
          <div className="flex items-center gap-2">
            {isStreaming ? (
              <button
                type="button"
                id="stop-stream-btn"
                onClick={onStopStreaming}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold transition shadow-sm"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop</span>
              </button>
            ) : (
              <button
                type="button"
                id="send-message-btn"
                onClick={handleSubmit}
                disabled={(!content.trim() && attachments.length === 0) || disabled}
                className={`p-2 rounded-lg transition-colors flex items-center justify-center ${
                  content.trim() || attachments.length > 0
                    ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm shadow-blue-600/30'
                    : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                }`}
                title="Send message (Enter)"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
