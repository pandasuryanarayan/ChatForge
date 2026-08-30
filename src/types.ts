import type { FormattedError } from './utils/errorParser';

export type ProviderId =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'groq'
  | 'openrouter'
  | 'mistral'
  | 'deepseek'
  | 'xai'
  | 'custom';

export interface Attachment {
  id: string;
  name: string;
  mimeType: string;
  dataUrl: string;
  size?: number;
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: ProviderId;
  description?: string;
  contextWindow?: number;
  inputPrice?: number; // USD per 1M tokens
  outputPrice?: number; // USD per 1M tokens
  isReasoning?: boolean;
  isVision?: boolean;
  isPinned?: boolean;
  isCustom?: boolean;
}

export interface ProviderConfig {
  id: ProviderId;
  name: string;
  tagline: string;
  iconName: string;
  brandColor: string;
  keyPlaceholder: string;
  keyDocsUrl: string;
  keyFormatRegex?: RegExp;
  keyPrefix?: string;
  requiresKey: boolean;
  defaultBaseUrl?: string;
  isCustomizableBaseUrl?: boolean;
  directBrowserCORS: boolean; // notes if direct browser calls work
  defaultModels: ModelInfo[];
}

export interface MessageTokens {
  prompt?: number;
  completion?: number;
  total?: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  reasoningContent?: string;
  attachments?: Attachment[];
  tokens?: MessageTokens;
  estimatedCost?: number;
  durationMs?: number;
  createdAt: number;
  timestamp: number;
  modelId?: string;
  providerId?: ProviderId;
  isError?: boolean;
  errorDetails?: FormattedError;
}

export interface Conversation {
  id: string;
  title: string;
  systemPrompt?: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  modelId: string;
  providerId: ProviderId;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  isPinned?: boolean;
}

export interface ProviderCredential {
  apiKey: string;
  customBaseUrl?: string;
  baseUrl?: string;
  isSessionOnly?: boolean; // If true, stored in memory only, not localStorage
  isValidated?: boolean;
  lastValidatedAt?: number;
}

export interface AppSettings {
  theme: 'dark' | 'light' | 'system';
  fontSize: 'sm' | 'md' | 'lg';
  activeProvider: ProviderId;
  activeModel: string;
  pinnedModels: string[];
  systemPrompts: { id: string; title: string; prompt: string }[];
  streamEnabled: boolean;
  codeWrap: boolean;
}

export interface StreamEventCallbacks {
  onChunk: (chunk: string) => void;
  onReasoningChunk?: (chunk: string) => void;
  onDone: (fullText: string, fullReasoning?: string, usage?: MessageTokens) => void;
  onError: (error: Error) => void;
}

export interface TokenCountEstimate {
  estimatedTokens: number;
  characterCount: number;
  wordCount: number;
}
