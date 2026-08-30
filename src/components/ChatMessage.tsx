import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Copy,
  Check,
  RotateCcw,
  Bot,
  User,
  Brain,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  RefreshCw,
  Key,
  ShieldAlert,
  Cpu,
  Clock,
  Sparkles,
  ExternalLink,
  Code2,
  Terminal,
} from 'lucide-react';
import { Message, ModelInfo, ProviderId } from '../types';
import { ProviderIcon } from './ProviderIcon';

interface ChatMessageProps {
  message: Message;
  modelInfo?: ModelInfo;
  onRegenerate?: () => void;
  onOpenModelSelector?: () => void;
  onOpenProviderModal?: () => void;
  isLast?: boolean;
  isStreaming?: boolean;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  modelInfo,
  onRegenerate,
  onOpenModelSelector,
  onOpenProviderModal,
  isLast,
  isStreaming,
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedCodeIndex, setCopiedCodeIndex] = useState<number | null>(null);
  const [isReasoningOpen, setIsReasoningOpen] = useState(true);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [copiedRawError, setCopiedRawError] = useState(false);

  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const hasError = Boolean(message.isError || message.errorDetails);
  const error = message.errorDetails;

  const copyText = (text: string, index?: number) => {
    navigator.clipboard.writeText(text);
    if (index !== undefined) {
      setCopiedCodeIndex(index);
      setTimeout(() => setCopiedCodeIndex(null), 2000);
    } else {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const copyRawError = (raw: string) => {
    navigator.clipboard.writeText(raw);
    setCopiedRawError(true);
    setTimeout(() => setCopiedRawError(false), 2000);
  };

  // Determine error style theme
  const getErrorTheme = () => {
    if (!error) return { bg: 'bg-rose-950/40', border: 'border-rose-800/60', text: 'text-rose-300', icon: AlertTriangle };
    switch (error.type) {
      case 'overloaded':
        return {
          bg: 'bg-amber-950/30',
          border: 'border-amber-700/50',
          text: 'text-amber-300',
          badgeBg: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
          icon: Clock,
        };
      case 'quota':
        return {
          bg: 'bg-orange-950/30',
          border: 'border-orange-700/50',
          text: 'text-orange-300',
          badgeBg: 'bg-orange-500/10 text-orange-300 border-orange-500/30',
          icon: AlertTriangle,
        };
      case 'auth':
        return {
          bg: 'bg-rose-950/30',
          border: 'border-rose-700/50',
          text: 'text-rose-300',
          badgeBg: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
          icon: Key,
        };
      case 'blocked':
        return {
          bg: 'bg-purple-950/30',
          border: 'border-purple-700/50',
          text: 'text-purple-300',
          badgeBg: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
          icon: ShieldAlert,
        };
      default:
        return {
          bg: 'bg-rose-950/30',
          border: 'border-rose-700/50',
          text: 'text-rose-300',
          badgeBg: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
          icon: AlertTriangle,
        };
    }
  };

  const errorTheme = getErrorTheme();
  const ErrorIcon = errorTheme.icon;

  return (
    <div
      id={`message-${message.id}`}
      className={`py-3 sm:py-4 transition-colors group ${
        isUser ? 'bg-transparent' : 'bg-transparent'
      }`}
    >
      <div className="flex gap-3 sm:gap-4">
        {/* Avatar */}
        {isUser ? (
          <div className="w-8 h-8 shrink-0 rounded-xl bg-zinc-800 border border-zinc-700/60 flex items-center justify-center font-bold text-xs text-zinc-300 shadow-sm">
            <User className="w-4 h-4 text-zinc-300" />
          </div>
        ) : hasError && !message.content ? (
          <div className="w-8 h-8 shrink-0 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center font-bold text-xs text-amber-300 shadow-sm">
            <ErrorIcon className="w-4 h-4 text-amber-400" />
          </div>
        ) : (
          <ProviderIcon
            providerId={modelInfo?.provider || 'openai'}
            size="lg"
            className="!rounded-xl shadow-md"
          />
        )}

        {/* Main Content Area */}
        <div className="flex-1 min-w-0 space-y-2.5">
          {/* Header row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`text-sm font-semibold tracking-tight ${
                  isUser ? 'text-zinc-300' : hasError && !message.content ? 'text-amber-400' : 'text-blue-400'
                }`}
              >
                {isUser ? 'You' : modelInfo?.name || 'AI Assistant'}
              </span>

              {/* Timestamp */}
              <span className="text-[11px] text-zinc-500 font-mono">
                {new Date(message.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>

              {/* Thinking / Reasoning badge */}
              {message.reasoningContent && (
                <button
                  onClick={() => setIsReasoningOpen(!isReasoningOpen)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-[11px] font-medium border border-blue-500/20 transition cursor-pointer"
                  title="Toggle internal reasoning chain"
                >
                  <Brain className="w-3 h-3 text-blue-400" />
                  <span>Thinking</span>
                  {isReasoningOpen ? (
                    <ChevronDown className="w-3 h-3 ml-0.5 opacity-70" />
                  ) : (
                    <ChevronRight className="w-3 h-3 ml-0.5 opacity-70" />
                  )}
                </button>
              )}
            </div>

            {/* Actions: Copy & Regenerate */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {message.content && (
                <button
                  id={`copy-msg-${message.id}`}
                  onClick={() => copyText(message.content)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition cursor-pointer"
                  title="Copy response"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              )}

              {isAssistant && onRegenerate && (
                <button
                  id={`regen-msg-${message.id}`}
                  onClick={onRegenerate}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition cursor-pointer"
                  title="Retry / Regenerate response"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Attached Images */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1 pb-1">
              {message.attachments.map((att) => (
                <div
                  key={att.id}
                  className="relative rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900 max-w-xs shadow-md"
                >
                  <img
                    src={att.dataUrl}
                    alt={att.name}
                    className="max-h-52 rounded-lg object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2 text-[10px] text-zinc-300 truncate">
                    {att.name}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Reasoning / Thinking collapsible block */}
          {message.reasoningContent && isReasoningOpen && (
            <div
              id={`reasoning-${message.id}`}
              className="p-3.5 rounded-xl bg-zinc-900/80 border border-blue-500/20 text-xs font-mono space-y-2 my-2 shadow-inner"
            >
              <div className="flex items-center justify-between text-blue-400 font-medium text-xs pb-1.5 border-b border-zinc-800/80">
                <div className="flex items-center gap-1.5">
                  <Brain className="w-3.5 h-3.5 text-blue-400" />
                  <span>Thinking Process</span>
                </div>
                {isStreaming && (
                  <span className="flex items-center gap-1 text-[10px] text-blue-400/80">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
                    Reasoning...
                  </span>
                )}
              </div>
              <div className="whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto text-zinc-300 text-xs font-mono">
                {message.reasoningContent}
              </div>
            </div>
          )}

          {/* Primary Markdown Content */}
          {message.content && (
            <div className="text-zinc-200 leading-relaxed text-[14px] sm:text-[15px] selection:bg-blue-500/30">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ node, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    const isInline = !match && !String(children).includes('\n');
                    const codeString = String(children).replace(/\n$/, '');

                    if (isInline) {
                      return (
                        <code
                          className="px-1.5 py-0.5 rounded bg-zinc-800/90 text-amber-300 font-mono text-[13px] border border-zinc-700/50"
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    }

                    const lang = match ? match[1] : 'code';

                    return (
                      <div className="my-4 rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden shadow-md">
                        {/* Code Header Bar */}
                        <div className="flex justify-between items-center px-4 py-2 bg-zinc-900/90 border-b border-zinc-800/80 text-xs text-zinc-400">
                          <div className="flex items-center gap-2">
                            <Code2 className="w-3.5 h-3.5 text-blue-400" />
                            <span className="font-mono text-xs font-medium text-zinc-300 uppercase">
                              {lang}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyText(codeString)}
                            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-mono text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition cursor-pointer"
                          >
                            {copiedCodeIndex === null && copied ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-400">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                        {/* Code Content */}
                        <pre className="p-4 overflow-x-auto text-zinc-200 text-xs leading-relaxed font-mono">
                          <code>{children}</code>
                        </pre>
                      </div>
                    );
                  },
                  p({ children }) {
                    return <p className="mb-3 last:mb-0 leading-relaxed text-zinc-200">{children}</p>;
                  },
                  ul({ children }) {
                    return <ul className="list-disc pl-5 mb-3 space-y-1 text-zinc-200">{children}</ul>;
                  },
                  ol({ children }) {
                    return <ol className="list-decimal pl-5 mb-3 space-y-1 text-zinc-200">{children}</ol>;
                  },
                  li({ children }) {
                    return <li className="leading-relaxed">{children}</li>;
                  },
                  h1({ children }) {
                    return <h1 className="text-xl font-bold text-zinc-100 mt-5 mb-3 pb-1 border-b border-zinc-800/80">{children}</h1>;
                  },
                  h2({ children }) {
                    return <h2 className="text-lg font-semibold text-zinc-100 mt-4 mb-2">{children}</h2>;
                  },
                  h3({ children }) {
                    return <h3 className="text-base font-semibold text-zinc-200 mt-3 mb-1.5">{children}</h3>;
                  },
                  blockquote({ children }) {
                    return (
                      <blockquote className="border-l-3 border-blue-500 pl-3.5 py-1.5 my-3 text-zinc-300 italic bg-blue-500/5 rounded-r-lg">
                        {children}
                      </blockquote>
                    );
                  },
                  table({ children }) {
                    return (
                      <div className="overflow-x-auto my-4 border border-zinc-800 rounded-xl shadow-sm">
                        <table className="min-w-full divide-y divide-zinc-800 text-xs text-left">{children}</table>
                      </div>
                    );
                  },
                  th({ children }) {
                    return <th className="px-3.5 py-2.5 font-semibold text-zinc-200 bg-zinc-900/90 border-b border-zinc-800">{children}</th>;
                  },
                  td({ children }) {
                    return <td className="px-3.5 py-2.5 text-zinc-300 border-t border-zinc-800/50">{children}</td>;
                  },
                  a({ href, children }) {
                    return (
                      <a
                        href={href}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-blue-400 hover:text-blue-300 underline underline-offset-2 inline-flex items-center gap-0.5"
                      >
                        {children}
                        <ExternalLink className="w-3 h-3 inline ml-0.5 opacity-70" />
                      </a>
                    );
                  },
                  hr() {
                    return <hr className="my-4 border-zinc-800" />;
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}

          {/* Streaming Cursor */}
          {isStreaming && isLast && isAssistant && (
            <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-1 align-middle rounded-xs" />
          )}

          {/* Clean Response Error Card (when model fails or stream errors out) */}
          {hasError && (
            <div
              id={`error-card-${message.id}`}
              className={`rounded-xl border p-4 ${errorTheme.bg} ${errorTheme.border} space-y-3 shadow-md animate-fadeIn`}
            >
              {/* Error Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800 text-amber-400 shrink-0">
                    <ErrorIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                      <span>{error?.title || 'Model Generation Error'}</span>
                      {error?.status && (
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${errorTheme.badgeBg || 'bg-zinc-800 text-zinc-300 border-zinc-700'}`}>
                          {error.status}
                        </span>
                      )}
                    </h4>
                    <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                      {error?.message || 'An error occurred while generating a response.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Suggestion & Guidance */}
              {error?.suggestion && (
                <div className="text-xs text-zinc-400 bg-zinc-950/60 rounded-lg p-2.5 border border-zinc-800/80 flex items-start gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                  <span>{error.suggestion}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap pt-1">
                {onRegenerate && (
                  <button
                    type="button"
                    onClick={onRegenerate}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition shadow-sm cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry Request</span>
                  </button>
                )}

                {onOpenModelSelector && (
                  <button
                    type="button"
                    onClick={onOpenModelSelector}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700/60 transition cursor-pointer"
                  >
                    <Cpu className="w-3.5 h-3.5 text-blue-400" />
                    <span>Switch Model</span>
                  </button>
                )}

                {onOpenProviderModal && (error?.type === 'auth' || error?.type === 'quota') && (
                  <button
                    type="button"
                    onClick={onOpenProviderModal}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700/60 transition cursor-pointer"
                  >
                    <Key className="w-3.5 h-3.5 text-amber-400" />
                    <span>Check Key Settings</span>
                  </button>
                )}

                {/* Toggle Technical Diagnostics */}
                {error?.raw && (
                  <button
                    type="button"
                    onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                    className="text-[11px] text-zinc-500 hover:text-zinc-300 ml-auto font-mono flex items-center gap-1 transition cursor-pointer"
                  >
                    <Terminal className="w-3 h-3" />
                    <span>{showTechnicalDetails ? 'Hide Diagnostics' : 'Raw Diagnostics'}</span>
                  </button>
                )}
              </div>

              {/* Technical Diagnostics Accordion */}
              {showTechnicalDetails && error?.raw && (
                <div className="mt-2 pt-2 border-t border-zinc-800/80">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase">Provider Raw Output</span>
                    <button
                      type="button"
                      onClick={() => copyRawError(error.raw || '')}
                      className="text-[10px] text-zinc-400 hover:text-white font-mono flex items-center gap-1 cursor-pointer"
                    >
                      {copiedRawError ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedRawError ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <pre className="p-2.5 rounded-lg bg-zinc-950 text-zinc-400 text-[11px] font-mono overflow-x-auto max-h-40 whitespace-pre-wrap break-all border border-zinc-800">
                    {error.raw}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Tokens & Cost Bento metadata pill for assistant messages */}
          {isAssistant && message.tokens && !hasError && (
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-500">
                {message.tokens.total} tokens (In: {message.tokens.prompt} • Out: {message.tokens.completion})
                {typeof message.estimatedCost === 'number' && message.estimatedCost > 0
                  ? ` • ~$${message.estimatedCost.toFixed(5)}`
                  : ''}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
