import {
  Conversation,
  Message,
  MessageTokens,
  ModelInfo,
  ProviderCredential,
  ProviderId,
  StreamEventCallbacks,
} from '../types';
import { PROVIDERS } from '../constants/providers';

// Token Estimator: ~4 characters per token average
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 3.8);
}

// Calculate cost based on model info
export function calculateCost(
  model: ModelInfo | undefined,
  promptTokens: number,
  completionTokens: number
): number {
  if (!model || (!model.inputPrice && !model.outputPrice)) return 0;
  const inputCost = ((promptTokens || 0) / 1_000_000) * (model.inputPrice || 0);
  const outputCost = ((completionTokens || 0) / 1_000_000) * (model.outputPrice || 0);
  return inputCost + outputCost;
}

// Helper to format currency nicely
export function formatCost(cost: number): string {
  if (cost === 0) return '$0.00';
  if (cost < 0.0001) return `<$0.0001`;
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(3)}`;
}

// Clean and sanitize API key (remove quotes, whitespace, zero-width chars, Bearer prefix)
export function sanitizeApiKey(key: string | undefined): string {
  if (!key) return '';
  return key
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/^bearer\s+/i, '')
    .trim();
}

// Clean model ID and auto-migrate legacy model identifiers across providers
export function sanitizeModelId(modelId: string, providerId?: ProviderId): string {
  if (!modelId) {
    if (providerId === 'anthropic') return 'claude-3-7-sonnet-20250219';
    if (providerId === 'groq') return 'llama-3.3-70b-versatile';
    if (providerId === 'deepseek') return 'deepseek-chat';
    if (providerId === 'mistral') return 'mistral-large-latest';
    if (providerId === 'xai') return 'grok-2-latest';
    if (providerId === 'google') return 'gemini-3.7-flash';
    return 'gpt-4o';
  }

  const clean = modelId.replace(/^models\//, '').trim();

  // Google Gemini migrations
  if (clean === 'gemini-2.5-flash' || clean === 'gemini-2.0-flash' || clean === 'gemini-1.5-flash') {
    return 'gemini-3.7-flash';
  }
  if (clean === 'gemini-1.5-pro' || clean === 'gemini-pro') {
    return 'gemini-3.1-pro-preview';
  }

  // Groq migrations
  if (clean === 'llama-3-8b-8192' || clean === 'llama3-8b-8192') {
    return 'llama-3.1-8b-instant';
  }
  if (clean === 'llama-3-70b-8192' || clean === 'llama3-70b-8192') {
    return 'llama-3.3-70b-versatile';
  }

  // Mistral migrations
  if (clean === 'mistral-tiny' || clean === 'mistral-medium' || clean === 'mistral-small') {
    return 'mistral-small-latest';
  }

  // xAI migrations
  if (clean === 'grok-1' || clean === 'grok-beta') {
    return 'grok-2-latest';
  }

  // Anthropic migrations
  if (clean.startsWith('claude-1') || clean.startsWith('claude-2') || clean.startsWith('claude-instant')) {
    return 'claude-3-5-haiku-20241022';
  }

  return clean;
}

// Provider Key Validation test via real endpoint
export async function testProviderKey(
  providerId: ProviderId,
  credential: ProviderCredential
): Promise<{ valid: boolean; message: string; modelsFound?: number; models?: ModelInfo[] }> {
  const key = sanitizeApiKey(credential.apiKey);
  const customBase = credential.customBaseUrl?.trim();
  const providerConfig = PROVIDERS.find((p) => p.id === providerId);

  if (providerConfig?.requiresKey && !key) {
    return { valid: false, message: 'API key is required' };
  }

  // 1. Try server-side validation endpoint (bypasses browser CORS & uses real upstream endpoints)
  try {
    const res = await fetch('/api/validate-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        providerId,
        apiKey: key,
        customBaseUrl: customBase,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok && data.valid) {
      return {
        valid: true,
        message: data.message || `Connected to ${providerConfig?.name || providerId} successfully.`,
        modelsFound: data.modelsFound,
        models: data.models,
      };
    } else if (!res.ok) {
      return {
        valid: false,
        message: data.message || `Validation failed for ${providerConfig?.name || providerId}`,
      };
    }
  } catch (err: any) {
    // If backend is unreachable, fallback to client-side direct verification
    console.warn('Backend validation endpoint error, falling back to direct test:', err);
  }

  // Fallback direct check for Google
  if (providerId === 'google') {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models?pageSize=100&key=${encodeURIComponent(key)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || `HTTP ${res.status}: Failed to validate Google Gemini API key`);
      }
      const modelsList = Array.isArray(data.models) ? data.models : [];
      const deprecatedPattern = /^(gemini-2\.5-flash$|gemini-1\.|gemini-2\.0|gemini-pro|embedding|aqa|imagen|learnlm|bison|gecko)/i;
      const chatModels = modelsList
        .filter((m: any) => {
          const methods = m.supportedGenerationMethods || [];
          if (!methods.includes('generateContent')) return false;
          const cleanId = (m.name || '').replace(/^models\//, '');
          if (deprecatedPattern.test(cleanId)) return false;
          return true;
        })
        .map((m: any) => {
          const cleanId = m.name.replace(/^models\//, '');
          return {
            id: cleanId,
            name: m.displayName || cleanId,
            provider: 'google' as ProviderId,
            description: m.description || 'Google Gemini model',
            contextWindow: m.inputTokenLimit || 1000000,
            inputPrice: cleanId.includes('pro') ? 1.25 : 0.10,
            outputPrice: cleanId.includes('pro') ? 5.00 : 0.40,
            isReasoning: cleanId.includes('thinking') || cleanId.includes('2.5') || cleanId.includes('3.'),
            isVision: true,
          };
        });

      const finalModels = chatModels.length > 0 ? chatModels : (providerConfig?.defaultModels || []);

      return {
        valid: true,
        message: `Success! Connected to Gemini (${finalModels.length} active chat models available).`,
        modelsFound: finalModels.length,
        models: finalModels,
      };
    } catch (e: any) {
      return { valid: false, message: e.message || 'Failed to connect to Google Gemini' };
    }
  }

  return { valid: true, message: `Key configured for ${providerConfig?.name || providerId}` };
}

// Fetch dynamic models list from provider
export async function fetchModelsFromProvider(
  providerId: ProviderId,
  credential: ProviderCredential
): Promise<ModelInfo[]> {
  const providerConfig = PROVIDERS.find((p) => p.id === providerId);
  const key = sanitizeApiKey(credential.apiKey);
  const customBase = credential.customBaseUrl?.trim();

  // Try server-side endpoint first
  try {
    const res = await fetch('/api/fetch-models', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        providerId,
        apiKey: key,
        customBaseUrl: customBase,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.models) && data.models.length > 0) {
        return data.models;
      }
    } else {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}: Failed to fetch models for ${providerConfig?.name || providerId}`);
    }
  } catch (e: any) {
    console.warn(`Server model fetch failed for ${providerId}:`, e);
    throw e;
  }

  return providerConfig?.defaultModels || [];
}

// Primary Stream Chat Execution Function
export async function streamChat(
  conversation: Conversation,
  credential: ProviderCredential,
  callbacks: StreamEventCallbacks,
  signal?: AbortSignal
): Promise<void> {
  const { providerId, messages, systemPrompt } = conversation;
  const key = sanitizeApiKey(credential.apiKey);
  const customBase = credential.customBaseUrl?.trim();
  const providerConfig = PROVIDERS.find((p) => p.id === providerId);

  if (providerConfig?.requiresKey && !key) {
    throw new Error(`Please provide an API key for ${providerConfig.name} in Key Settings.`);
  }

  let accumulatedContent = '';
  let accumulatedReasoning = '';
  const promptTokensCount =
    (messages || []).reduce((acc, m) => acc + estimateTokens(m.content || ''), 0) +
    estimateTokens(systemPrompt || '');
  let completionTokensCount = 0;

  // Stream via full-stack /api/chat-stream endpoint
  const response = await fetch('/api/chat-stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      conversation,
      apiKey: key,
      customBaseUrl: customBase,
    }),
    signal,
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`Server returned HTTP ${response.status}: ${errText || 'Streaming request failed'}`);
  }

  if (!response.body) {
    throw new Error('Response body missing from streaming endpoint');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n\n');
      buffer = parts.pop() || '';

      for (const part of parts) {
        const lines = part.split('\n');
        let currentEvent = 'chunk';
        let dataStr = '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            dataStr = line.slice(6).trim();
          }
        }

        if (!dataStr) continue;

        try {
          const parsed = JSON.parse(dataStr);

          if (currentEvent === 'error') {
            throw new Error(parsed.message || 'Stream error from upstream provider');
          }

          if (currentEvent === 'chunk' && parsed.text) {
            accumulatedContent += parsed.text;
            callbacks.onChunk(parsed.text);
          }

          if (currentEvent === 'reasoning' && parsed.text) {
            accumulatedReasoning += parsed.text;
            if (callbacks.onReasoningChunk) {
              callbacks.onReasoningChunk(parsed.text);
            }
          }

          if (currentEvent === 'done') {
            // Stream complete
          }
        } catch (e: any) {
          if (currentEvent === 'error') throw e;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  completionTokensCount = estimateTokens(accumulatedContent);

  callbacks.onDone(
    accumulatedContent,
    accumulatedReasoning || undefined,
    {
      prompt: promptTokensCount,
      completion: completionTokensCount,
      total: promptTokensCount + completionTokensCount,
    }
  );
}
