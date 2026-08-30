import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '25mb' }));

// Helper to sanitize keys (remove whitespace, zero-width chars, quotes, Bearer prefix)
function sanitizeKey(key?: string): string {
  if (!key) return '';
  return key
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/^bearer\s+/i, '')
    .trim();
}

// Helper: Fetch real live models for Google Gemini
async function fetchGoogleGeminiModels(apiKey: string) {
  const allRawModels: any[] = [];
  let pageToken: string | undefined = undefined;

  do {
    const pageParam: string = pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : '';
    const url: string = `https://generativelanguage.googleapis.com/v1beta/models?pageSize=100${pageParam}&key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${res.status}: Failed to fetch Google Gemini models`);
    }

    const data = await res.json();
    if (Array.isArray(data.models)) {
      allRawModels.push(...data.models);
    }
    pageToken = data.nextPageToken;
  } while (pageToken);

  // Filter strictly to chat & text generation models (excluding deprecated models like gemini-2.5-flash without preview, gemini-1.5, gemini-2.0, embeddings, AQA, Imagen, etc.)
  const deprecatedPattern = /^(gemini-2\.5-flash$|gemini-1\.|gemini-2\.0|gemini-pro|embedding|aqa|imagen|learnlm|bison|gecko|legacy|deprecated|retired|tts|whisper)/i;

  const chatModels = allRawModels
    .filter((m: any) => {
      const methods = m.supportedGenerationMethods || [];
      const cleanId = (m.name || '').replace(/^models\//, '');
      const idLower = cleanId.toLowerCase();
      if (!methods.includes('generateContent')) return false;
      if (deprecatedPattern.test(idLower)) return false;
      return true;
    })
    .map((m: any) => {
      const cleanId = m.name.replace(/^models\//, '');
      const isReasoning =
        cleanId.includes('thinking') ||
        cleanId.includes('2.5') ||
        cleanId.includes('3.') ||
        cleanId.includes('pro') ||
        cleanId.includes('deep-research');
      return {
        id: cleanId,
        name: m.displayName || cleanId,
        provider: 'google',
        description: m.description || 'Google Gemini model',
        contextWindow: m.inputTokenLimit || 1000000,
        inputPrice: cleanId.includes('pro') ? 1.25 : 0.10,
        outputPrice: cleanId.includes('pro') ? 5.00 : 0.40,
        isReasoning,
        isVision: true,
      };
    });

  // Standard verified active models
  const standardActiveModels = [
    {
      id: 'gemini-3.7-flash',
      name: 'Gemini 3.7 Flash',
      provider: 'google',
      description: 'Next-generation frontier multimodal model with dynamic thinking reasoning',
      contextWindow: 1000000,
      inputPrice: 0.10,
      outputPrice: 0.40,
      isReasoning: true,
      isVision: true,
    },
    {
      id: 'gemini-3.6-flash',
      name: 'Gemini 3.6 Flash',
      provider: 'google',
      description: 'High-speed, high-efficiency intelligence for multimodal tasks',
      contextWindow: 1000000,
      inputPrice: 0.10,
      outputPrice: 0.40,
      isReasoning: true,
      isVision: true,
    },
    {
      id: 'gemini-3.1-pro-preview',
      name: 'Gemini 3.1 Pro Preview',
      provider: 'google',
      description: 'Flagship reasoning, deep coding, and complex multimodal synthesis',
      contextWindow: 2000000,
      inputPrice: 1.25,
      outputPrice: 5.00,
      isReasoning: true,
      isVision: true,
    },
    {
      id: 'gemini-3.1-flash-lite',
      name: 'Gemini 3.1 Flash Lite',
      provider: 'google',
      description: 'Ultra-lightweight, high-throughput cost-effective model',
      contextWindow: 1000000,
      inputPrice: 0.075,
      outputPrice: 0.30,
      isReasoning: false,
      isVision: true,
    },
    {
      id: 'gemini-2.5-pro',
      name: 'Gemini 2.5 Pro',
      provider: 'google',
      description: 'Advanced reasoning and long-context multimodal comprehension',
      contextWindow: 2000000,
      inputPrice: 1.25,
      outputPrice: 5.00,
      isReasoning: true,
      isVision: true,
    },
    {
      id: 'gemini-2.5-flash-preview',
      name: 'Gemini 2.5 Flash Preview',
      provider: 'google',
      description: 'Next-generation fast multimodal preview model',
      contextWindow: 1000000,
      inputPrice: 0.10,
      outputPrice: 0.40,
      isReasoning: true,
      isVision: true,
    },
  ];

  const existingIds = new Set(chatModels.map((m) => m.id));
  const mergedModels = [...chatModels];
  for (const std of standardActiveModels) {
    if (!existingIds.has(std.id)) {
      mergedModels.unshift(std);
    }
  }

  return mergedModels.filter((m) => !deprecatedPattern.test(m.id));
}

// Helper: Format human-readable OpenAI model name
function formatOpenAIModelName(id: string): string {
  const customMap: Record<string, string> = {
    'gpt-4o': 'GPT-4o',
    'gpt-4o-mini': 'GPT-4o Mini',
    'o3-mini': 'o3-mini',
    'o1': 'o1',
    'o1-mini': 'o1-mini',
    'o1-preview': 'o1-preview',
    'chatgpt-4o-latest': 'ChatGPT-4o Latest',
    'gpt-4-turbo': 'GPT-4 Turbo',
    'gpt-4-turbo-2024-04-09': 'GPT-4 Turbo (2024-04-09)',
    'gpt-4': 'GPT-4',
    'gpt-3.5-turbo': 'GPT-3.5 Turbo',
  };
  if (customMap[id]) return customMap[id];
  return id
    .split(/[-_]/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
}

// Helper: Fetch real live models for OpenAI with Active Model Filtering
async function fetchOpenAIModels(apiKey: string, customBaseUrl?: string) {
  const baseUrl = customBaseUrl || 'https://api.openai.com/v1';
  const url = `${baseUrl.replace(/\/$/, '')}/models`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `HTTP ${res.status}: Failed to fetch OpenAI models`);
  }

  const data = await res.json();
  const rawList = Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : [];

  // Filter out non-chat, embedding, audio, legacy, and decommissioned models
  const deprecatedOrNonChatPattern =
    /^(text-embedding|embedding|whisper|tts|dall-e|moderation|babbage|davinci|canary|curie|ada|cushman|instruct|audio|realtime|gpt-3\.5-turbo-0301|gpt-3\.5-turbo-0613|gpt-3\.5-turbo-16k-0613|gpt-4-0314|gpt-4-0613|gpt-4-32k-0314|gpt-4-32k-0613|gpt-4-1106-preview|gpt-4-0125-preview)/i;

  const chatModels = rawList
    .filter((m: any) => {
      const id = (m.id || '').trim();
      if (!id) return false;
      if (deprecatedOrNonChatPattern.test(id)) return false;
      // Must be a known chat/reasoning prefix
      const isChat =
        id.startsWith('gpt-4') ||
        id.startsWith('gpt-3.5') ||
        id.startsWith('o1') ||
        id.startsWith('o3') ||
        id.startsWith('chatgpt-');
      return isChat;
    })
    .map((m: any) => {
      const id: string = m.id;
      const isReasoning = id.startsWith('o1') || id.startsWith('o3') || id.includes('reason');
      const isVision = id.includes('4o') || id.includes('vision') || id.includes('4-turbo');
      const isMini = id.includes('mini');
      const isO1 = id === 'o1' || id === 'o1-preview';

      let inputPrice = 2.5;
      let outputPrice = 10.0;
      if (isO1) {
        inputPrice = 15.0;
        outputPrice = 60.0;
      } else if (id.startsWith('o3-mini') || id === 'o1-mini') {
        inputPrice = 1.1;
        outputPrice = 4.4;
      } else if (id.includes('4o-mini')) {
        inputPrice = 0.15;
        outputPrice = 0.6;
      } else if (id === 'chatgpt-4o-latest') {
        inputPrice = 5.0;
        outputPrice = 15.0;
      } else if (id.includes('4-turbo') || id === 'gpt-4') {
        inputPrice = 10.0;
        outputPrice = 30.0;
      }

      return {
        id: id,
        name: formatOpenAIModelName(id),
        provider: 'openai',
        description: isReasoning
          ? 'Deep reasoning model for math, coding and complex logic'
          : isVision
          ? 'Multimodal intelligence for text and image understanding'
          : 'High-performance general intelligence model',
        contextWindow: id.startsWith('o') || id.includes('128k') || id.includes('4o') || id.includes('turbo') ? 128000 : 16384,
        inputPrice,
        outputPrice,
        isReasoning,
        isVision,
      };
    });

  // Standard verified active OpenAI models
  const standardActiveModels = [
    {
      id: 'gpt-4o',
      name: 'GPT-4o',
      provider: 'openai',
      description: 'Flagship omni model, versatile and intelligent',
      contextWindow: 128000,
      inputPrice: 2.5,
      outputPrice: 10.0,
      isReasoning: false,
      isVision: true,
    },
    {
      id: 'gpt-4o-mini',
      name: 'GPT-4o Mini',
      provider: 'openai',
      description: 'Fast, cost-efficient for everyday tasks',
      contextWindow: 128000,
      inputPrice: 0.15,
      outputPrice: 0.6,
      isReasoning: false,
      isVision: true,
    },
    {
      id: 'o3-mini',
      name: 'o3-mini',
      provider: 'openai',
      description: 'High-speed reasoning model for coding and math',
      contextWindow: 200000,
      inputPrice: 1.1,
      outputPrice: 4.4,
      isReasoning: true,
      isVision: false,
    },
    {
      id: 'o1',
      name: 'o1',
      provider: 'openai',
      description: 'Deep reasoning model for complex problem solving',
      contextWindow: 200000,
      inputPrice: 15.0,
      outputPrice: 60.0,
      isReasoning: true,
      isVision: true,
    },
    {
      id: 'o1-mini',
      name: 'o1-mini',
      provider: 'openai',
      description: 'Fast reasoning model for coding and STEM',
      contextWindow: 128000,
      inputPrice: 1.1,
      outputPrice: 4.4,
      isReasoning: true,
      isVision: false,
    },
    {
      id: 'chatgpt-4o-latest',
      name: 'ChatGPT-4o Latest',
      provider: 'openai',
      description: 'Dynamic flagship model continuously updated in ChatGPT',
      contextWindow: 128000,
      inputPrice: 5.0,
      outputPrice: 15.0,
      isReasoning: false,
      isVision: true,
    },
    {
      id: 'gpt-4-turbo',
      name: 'GPT-4 Turbo',
      provider: 'openai',
      description: 'High-intelligence multimodal model with 128k context',
      contextWindow: 128000,
      inputPrice: 10.0,
      outputPrice: 30.0,
      isReasoning: false,
      isVision: true,
    },
  ];

  const existingIds = new Set(chatModels.map((m) => m.id));
  const merged = [...chatModels];
  for (const std of standardActiveModels) {
    if (!existingIds.has(std.id)) {
      merged.unshift(std);
    }
  }

  return merged.filter((m) => !deprecatedOrNonChatPattern.test(m.id));
}

// Helper: Format human-readable Claude model name
function formatAnthropicModelName(id: string, displayName?: string): string {
  if (displayName) return displayName;
  const customMap: Record<string, string> = {
    'claude-3-7-sonnet-20250219': 'Claude 3.7 Sonnet',
    'claude-3-7-sonnet-latest': 'Claude 3.7 Sonnet Latest',
    'claude-3-5-sonnet-20241022': 'Claude 3.5 Sonnet v2',
    'claude-3-5-sonnet-latest': 'Claude 3.5 Sonnet Latest',
    'claude-3-5-haiku-20241022': 'Claude 3.5 Haiku',
    'claude-3-5-haiku-latest': 'Claude 3.5 Haiku Latest',
    'claude-3-opus-20240229': 'Claude 3 Opus',
    'claude-3-opus-latest': 'Claude 3 Opus Latest',
    'claude-3-sonnet-20240229': 'Claude 3 Sonnet',
    'claude-3-haiku-20240307': 'Claude 3 Haiku',
  };
  if (customMap[id]) return customMap[id];
  return id
    .split(/[-_]/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
}

// Helper: Fetch real live models for Anthropic with Active Model Filtering
async function fetchAnthropicModels(apiKey: string) {
  const standardActiveModels = [
    {
      id: 'claude-3-7-sonnet-20250219',
      name: 'Claude 3.7 Sonnet',
      provider: 'anthropic',
      description: 'State-of-the-art hybrid reasoning & dynamic thinking model',
      contextWindow: 200000,
      inputPrice: 3.0,
      outputPrice: 15.0,
      isReasoning: true,
      isVision: true,
    },
    {
      id: 'claude-3-5-sonnet-20241022',
      name: 'Claude 3.5 Sonnet v2',
      provider: 'anthropic',
      description: 'High-intelligence coding, vision & reasoning benchmark leader',
      contextWindow: 200000,
      inputPrice: 3.0,
      outputPrice: 15.0,
      isReasoning: false,
      isVision: true,
    },
    {
      id: 'claude-3-5-haiku-20241022',
      name: 'Claude 3.5 Haiku',
      provider: 'anthropic',
      description: 'Ultra-fast and cost-effective lightweight model',
      contextWindow: 200000,
      inputPrice: 0.8,
      outputPrice: 4.0,
      isReasoning: false,
      isVision: true,
    },
    {
      id: 'claude-3-opus-20240229',
      name: 'Claude 3 Opus',
      provider: 'anthropic',
      description: 'Deep analysis, long-form synthesis, and complex writing',
      contextWindow: 200000,
      inputPrice: 15.0,
      outputPrice: 75.0,
      isReasoning: false,
      isVision: true,
    },
  ];

  const deprecatedClaudePattern = /^(claude-1|claude-2|claude-instant|claude-3-haiku-20240307$)/i;

  try {
    const url = 'https://api.anthropic.com/v1/models?limit=100';
    const res = await fetch(url, {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.data) && data.data.length > 0) {
        const liveModels = data.data
          .filter((m: any) => !deprecatedClaudePattern.test(m.id || ''))
          .map((m: any) => ({
            id: m.id,
            name: formatAnthropicModelName(m.id, m.display_name),
            provider: 'anthropic',
            description: m.id.includes('3-7')
              ? 'Hybrid reasoning and instant response model'
              : m.id.includes('haiku')
              ? 'Ultra-fast and cost-effective model'
              : m.id.includes('opus')
              ? 'Deep analysis and long-form synthesis'
              : 'Anthropic Claude flagship model',
            contextWindow: 200000,
            inputPrice: m.id.includes('haiku') ? 0.8 : m.id.includes('opus') ? 15.0 : 3.0,
            outputPrice: m.id.includes('haiku') ? 4.0 : m.id.includes('opus') ? 75.0 : 15.0,
            isReasoning: m.id.includes('3-7') || m.id.includes('thinking'),
            isVision: true,
          }));

        const existingIds = new Set(liveModels.map((m: any) => m.id));
        const merged = [...liveModels];
        for (const std of standardActiveModels) {
          if (!existingIds.has(std.id)) {
            merged.unshift(std);
          }
        }
        return merged;
      }
    }
  } catch (e) {
    // fallback to standard models
  }

  return standardActiveModels;
}

// Helper: Fetch real live models for DeepSeek with Active Model Filtering
async function fetchDeepSeekModels(apiKey: string, customBaseUrl?: string) {
  const standardActiveModels = [
    {
      id: 'deepseek-chat',
      name: 'DeepSeek V3 (Chat)',
      provider: 'deepseek',
      description: 'World-class 671B MoE model with exceptional coding and price',
      contextWindow: 64000,
      inputPrice: 0.14,
      outputPrice: 0.28,
      isReasoning: false,
      isVision: false,
    },
    {
      id: 'deepseek-reasoner',
      name: 'DeepSeek R1 (Reasoner)',
      provider: 'deepseek',
      description: 'State of the art open reasoning model with thought streams',
      contextWindow: 64000,
      inputPrice: 0.55,
      outputPrice: 2.19,
      isReasoning: true,
      isVision: false,
    },
  ];

  try {
    const baseUrl = customBaseUrl || 'https://api.deepseek.com';
    const url = `${baseUrl.replace(/\/$/, '')}/models`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (res.ok) {
      const data = await res.json();
      const rawList = Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : [];

      if (rawList.length > 0) {
        const liveModels = rawList
          .filter((m: any) => {
            const id = (m.id || '').toLowerCase();
            return !id.includes('embedding') && (id.includes('chat') || id.includes('reasoner') || id.includes('r1') || id.includes('v3'));
          })
          .map((m: any) => ({
            id: m.id,
            name:
              m.id === 'deepseek-reasoner'
                ? 'DeepSeek R1 (Reasoner)'
                : m.id === 'deepseek-chat'
                ? 'DeepSeek V3 (Chat)'
                : m.id,
            provider: 'deepseek',
            description: m.id.includes('reasoner') || m.id.includes('r1')
              ? 'DeepSeek reasoning & chain-of-thought model'
              : 'DeepSeek general intelligence flagship',
            contextWindow: 64000,
            inputPrice: m.id.includes('reasoner') || m.id.includes('r1') ? 0.55 : 0.14,
            outputPrice: m.id.includes('reasoner') || m.id.includes('r1') ? 2.19 : 0.28,
            isReasoning: m.id.includes('reasoner') || m.id.includes('r1'),
            isVision: false,
          }));

        const existingIds = new Set(liveModels.map((m: any) => m.id));
        const merged = [...liveModels];
        for (const std of standardActiveModels) {
          if (!existingIds.has(std.id)) {
            merged.unshift(std);
          }
        }
        return merged;
      }
    }
  } catch {
    // fallback
  }

  return standardActiveModels;
}

// Helper: Format human-readable Groq model name
function formatGroqModelName(id: string): string {
  const customMap: Record<string, string> = {
    'llama-3.3-70b-versatile': 'Llama 3.3 70B Versatile',
    'deepseek-r1-distill-llama-70b': 'DeepSeek R1 (70B Distill)',
    'llama-3.1-8b-instant': 'Llama 3.1 8B Instant',
    'llama-3.2-11b-vision-preview': 'Llama 3.2 11B Vision Preview',
    'llama-3.2-90b-vision-preview': 'Llama 3.2 90B Vision Preview',
    'llama-3.2-3b-preview': 'Llama 3.2 3B Preview',
    'llama-3.2-1b-preview': 'Llama 3.2 1B Preview',
    'qwen-2.5-coder-32b': 'Qwen 2.5 Coder 32B',
    'qwen-2.5-32b': 'Qwen 2.5 32B',
    'deepseek-r1-distill-qwen-32b': 'DeepSeek R1 (Qwen 32B Distill)',
    'mixtral-8x7b-32768': 'Mixtral 8x7B',
    'gemma2-9b-it': 'Gemma 2 9B IT',
    'llama-guard-3-8b': 'Llama Guard 3 8B',
  };
  if (customMap[id]) return customMap[id];
  return id
    .split(/[-_]/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
}

// Helper: Fetch real live models for Groq with Active Model Filtering
async function fetchGroqModels(apiKey: string) {
  const url = 'https://api.groq.com/openai/v1/models';
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `HTTP ${res.status}: Failed to fetch Groq models`);
  }

  const data = await res.json();
  const rawList = Array.isArray(data.data) ? data.data : [];

  // Filter out decommissioned / audio / non-chat models
  const deprecatedGroqPattern =
    /^(whisper|distil-whisper|llama2|llama-2|llama-3-8b-8192$|llama-3-70b-8192$|llama3-8b-8192$|llama3-70b-8192$|llama-guard-2)/i;

  const chatModels = rawList
    .filter((m: any) => {
      if (m.active === false) return false;
      const id = (m.id || '').toLowerCase();
      if (deprecatedGroqPattern.test(id)) return false;
      return true;
    })
    .map((m: any) => {
      const id: string = m.id;
      const isReasoning = id.includes('r1') || id.includes('reason') || id.includes('distill');
      const isVision = id.includes('vision');
      const isLarge = id.includes('70b') || id.includes('90b');
      const isInstant = id.includes('8b') || id.includes('1b') || id.includes('3b');

      return {
        id: id,
        name: formatGroqModelName(id),
        provider: 'groq',
        description: isReasoning
          ? 'DeepSeek reasoning distilled on high-speed Groq LPU'
          : isVision
          ? 'Multimodal vision and text comprehension on Groq LPUs'
          : isInstant
          ? 'Ultra-fast inference (500+ tokens/sec)'
          : 'High-intelligence Meta Llama on Groq LPUs',
        contextWindow: m.context_window || 128000,
        inputPrice: isLarge ? 0.59 : isInstant ? 0.05 : 0.2,
        outputPrice: isLarge ? 0.79 : isInstant ? 0.08 : 0.2,
        isReasoning,
        isVision,
      };
    });

  const standardActiveModels = [
    {
      id: 'llama-3.3-70b-versatile',
      name: 'Llama 3.3 70B Versatile',
      provider: 'groq',
      description: 'Meta flagship open model with lightning fast Groq speed',
      contextWindow: 128000,
      inputPrice: 0.59,
      outputPrice: 0.79,
      isReasoning: false,
      isVision: false,
    },
    {
      id: 'deepseek-r1-distill-llama-70b',
      name: 'DeepSeek R1 (70B Distill)',
      provider: 'groq',
      description: 'DeepSeek reasoning distilled into Llama 70B on Groq LPUs',
      contextWindow: 128000,
      inputPrice: 0.75,
      outputPrice: 0.99,
      isReasoning: true,
      isVision: false,
    },
    {
      id: 'llama-3.1-8b-instant',
      name: 'Llama 3.1 8B Instant',
      provider: 'groq',
      description: 'Blazing 800+ tokens/second for lightweight tasks',
      contextWindow: 128000,
      inputPrice: 0.05,
      outputPrice: 0.08,
      isReasoning: false,
      isVision: false,
    },
    {
      id: 'llama-3.2-11b-vision-preview',
      name: 'Llama 3.2 11B Vision Preview',
      provider: 'groq',
      description: 'Multimodal vision and text comprehension on Groq LPUs',
      contextWindow: 128000,
      inputPrice: 0.18,
      outputPrice: 0.18,
      isReasoning: false,
      isVision: true,
    },
    {
      id: 'qwen-2.5-coder-32b',
      name: 'Qwen 2.5 Coder 32B',
      provider: 'groq',
      description: 'Top tier open coding model on Groq',
      contextWindow: 128000,
      inputPrice: 0.2,
      outputPrice: 0.2,
      isReasoning: false,
      isVision: false,
    },
    {
      id: 'mixtral-8x7b-32768',
      name: 'Mixtral 8x7B',
      provider: 'groq',
      description: 'MoE model with fast inference on Groq',
      contextWindow: 32768,
      inputPrice: 0.24,
      outputPrice: 0.24,
      isReasoning: false,
      isVision: false,
    },
  ];

  const existingIds = new Set(chatModels.map((m) => m.id));
  const merged = [...chatModels];
  for (const std of standardActiveModels) {
    if (!existingIds.has(std.id)) {
      merged.unshift(std);
    }
  }

  return merged.filter((m) => !deprecatedGroqPattern.test(m.id));
}

// Helper: Fetch real live models for OpenRouter with Active Model Filtering
async function fetchOpenRouterModels(apiKey: string) {
  const url = 'https://openrouter.ai/api/v1/models';
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `HTTP ${res.status}: Failed to fetch OpenRouter models`);
  }

  const data = await res.json();
  const rawList = Array.isArray(data.data) ? data.data : [];

  // Filter out image-only, embedding, audio, moderation, zero-context models
  const deprecatedOrNonChatPattern =
    /^(image|flux|midjourney|stable-diffusion|dall-e|embedding|text-embedding|whisper|tts|moderation|canary)/i;

  const chatModels = rawList
    .filter((m: any) => {
      const id = (m.id || '').trim();
      if (!id || deprecatedOrNonChatPattern.test(id)) return false;
      if (m.context_length === 0) return false;
      return true;
    })
    .map((m: any) => {
      const id: string = m.id;
      const isReasoning =
        id.includes('r1') ||
        id.includes('reason') ||
        id.includes('thinking') ||
        id.includes('o1') ||
        id.includes('o3') ||
        id.includes('3.7-sonnet');
      const isVision =
        m.architecture?.modality?.includes('image') ||
        id.includes('vision') ||
        id.includes('4o') ||
        id.includes('pixtral') ||
        id.includes('vl');

      return {
        id: id,
        name: m.name || id,
        provider: 'openrouter',
        description: m.description?.slice(0, 120) || 'OpenRouter model endpoint',
        contextWindow: m.context_length || 128000,
        inputPrice: Number(m.pricing?.prompt || 0) * 1_000_000,
        outputPrice: Number(m.pricing?.completion || 0) * 1_000_000,
        isReasoning,
        isVision,
      };
    });

  return chatModels;
}

// Helper: Format human-readable Mistral model name
function formatMistralModelName(id: string, rawName?: string): string {
  if (rawName && !rawName.includes('/')) return rawName;
  const customMap: Record<string, string> = {
    'mistral-large-latest': 'Mistral Large 2',
    'codestral-latest': 'Codestral',
    'mistral-small-latest': 'Mistral Small',
    'pixtral-large-latest': 'Pixtral Large',
    'pixtral-12b-2409': 'Pixtral 12B',
    'ministral-8b-latest': 'Ministral 8B',
    'ministral-3b-latest': 'Ministral 3B',
    'open-mistral-nemo': 'Mistral Nemo',
    'open-codestral-mamba': 'Codestral Mamba',
  };
  if (customMap[id]) return customMap[id];
  return id
    .split(/[-_]/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
}

// Helper: Fetch real live models for Mistral with Active Model Filtering
async function fetchMistralModels(apiKey: string) {
  const url = 'https://api.mistral.ai/v1/models';
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `HTTP ${res.status}: Failed to fetch Mistral models`);
  }

  const data = await res.json();
  const rawList = Array.isArray(data.data) ? data.data : [];

  // Filter out embeddings, deprecated mistral-tiny/medium, legacy dated versions
  const deprecatedMistralPattern = /^(embed|mistral-embed|mistral-tiny|mistral-medium|mistral-small-2312)/i;

  const chatModels = rawList
    .filter((m: any) => !deprecatedMistralPattern.test(m.id || ''))
    .map((m: any) => {
      const id: string = m.id;
      const isVision = id.includes('pixtral') || id.includes('vision');
      const isReasoning = id.includes('reason') || id.includes('large');
      const isLarge = id.includes('large');
      const isCodestral = id.includes('codestral');
      const isMinistral = id.includes('ministral');

      let inputPrice = 0.2;
      let outputPrice = 0.6;
      if (isLarge) {
        inputPrice = 2.0;
        outputPrice = 6.0;
      } else if (isMinistral) {
        inputPrice = id.includes('3b') ? 0.04 : 0.1;
        outputPrice = id.includes('3b') ? 0.04 : 0.1;
      } else if (isVision && id.includes('12b')) {
        inputPrice = 0.15;
        outputPrice = 0.15;
      }

      return {
        id: id,
        name: formatMistralModelName(id, m.name),
        provider: 'mistral',
        description: isCodestral
          ? 'Specialized model for code generation and fill-in-the-middle'
          : isVision
          ? 'Multimodal vision model from Mistral AI'
          : isLarge
          ? 'Top-tier reasoning, multilingual, and coding flagship'
          : 'Fast, lightweight cost-effective model',
        contextWindow: m.max_context_length || (isCodestral ? 256000 : 128000),
        inputPrice,
        outputPrice,
        isVision,
        isReasoning,
      };
    });

  const standardActiveModels = [
    {
      id: 'mistral-large-latest',
      name: 'Mistral Large 2',
      provider: 'mistral',
      description: 'Top-tier reasoning, multilingual, and coding model',
      contextWindow: 128000,
      inputPrice: 2.0,
      outputPrice: 6.0,
      isReasoning: true,
      isVision: false,
    },
    {
      id: 'codestral-latest',
      name: 'Codestral',
      provider: 'mistral',
      description: 'Specialized 22B model for code generation and fill-in-the-middle',
      contextWindow: 256000,
      inputPrice: 0.2,
      outputPrice: 0.6,
      isReasoning: false,
      isVision: false,
    },
    {
      id: 'mistral-small-latest',
      name: 'Mistral Small',
      provider: 'mistral',
      description: 'Fast, lightweight cost-effective model',
      contextWindow: 128000,
      inputPrice: 0.2,
      outputPrice: 0.6,
      isReasoning: false,
      isVision: false,
    },
    {
      id: 'pixtral-12b-2409',
      name: 'Pixtral 12B',
      provider: 'mistral',
      description: 'Multimodal vision model from Mistral',
      contextWindow: 128000,
      inputPrice: 0.15,
      outputPrice: 0.15,
      isReasoning: false,
      isVision: true,
    },
  ];

  const existingIds = new Set(chatModels.map((m) => m.id));
  const merged = [...chatModels];
  for (const std of standardActiveModels) {
    if (!existingIds.has(std.id)) {
      merged.unshift(std);
    }
  }

  return merged.filter((m) => !deprecatedMistralPattern.test(m.id));
}

// Helper: Format human-readable xAI model name
function formatXAIModelName(id: string): string {
  const customMap: Record<string, string> = {
    'grok-4.6': 'Grok 4.6',
    'grok-4.5': 'Grok 4.5',
    'grok-4.3': 'Grok 4.3',
    'grok-4': 'Grok 4',
    'grok-4-fast': 'Grok 4 Fast',
    'grok-3': 'Grok 3',
    'grok-3-mini': 'Grok 3 Mini',
    'grok-3-mini-beta': 'Grok 3 Mini Beta',
    'grok-2-latest': 'Grok 2 Latest',
    'grok-2': 'Grok 2',
    'grok-2-1212': 'Grok 2 (1212)',
    'grok-2-vision-latest': 'Grok 2 Vision Latest',
    'grok-2-vision': 'Grok 2 Vision',
    'grok-2-vision-1212': 'Grok 2 Vision (1212)',
    'grok-beta': 'Grok Beta',
    'grok-vision-beta': 'Grok Vision Beta',
  };
  if (customMap[id]) return customMap[id];
  return id
    .split(/[-_]/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
}

// Helper: Fetch real live models for xAI with Active Model Filtering
async function fetchXAIModels(apiKey: string, customBaseUrl?: string) {
  const standardActiveModels = [
    {
      id: 'grok-2-latest',
      name: 'Grok 2 Latest',
      provider: 'xai',
      description: 'Frontier reasoning and real-time knowledge model from xAI',
      contextWindow: 131072,
      inputPrice: 2.0,
      outputPrice: 10.0,
      isReasoning: true,
      isVision: true,
    },
    {
      id: 'grok-3-mini',
      name: 'Grok 3 Mini',
      provider: 'xai',
      description: 'Ultra-fast, cost-effective reasoning Grok 3 model',
      contextWindow: 131072,
      inputPrice: 0.5,
      outputPrice: 2.0,
      isReasoning: true,
      isVision: false,
    },
    {
      id: 'grok-3',
      name: 'Grok 3',
      provider: 'xai',
      description: 'Frontier Grok 3 reasoning & intelligence model',
      contextWindow: 131072,
      inputPrice: 3.0,
      outputPrice: 15.0,
      isReasoning: true,
      isVision: false,
    },
    {
      id: 'grok-2-vision-latest',
      name: 'Grok 2 Vision Latest',
      provider: 'xai',
      description: 'Grok multimodal vision and document comprehension',
      contextWindow: 32768,
      inputPrice: 2.0,
      outputPrice: 10.0,
      isReasoning: true,
      isVision: true,
    },
    {
      id: 'grok-beta',
      name: 'Grok Beta',
      provider: 'xai',
      description: 'Early access flagship Grok model',
      contextWindow: 131072,
      inputPrice: 5.0,
      outputPrice: 15.0,
      isReasoning: false,
      isVision: false,
    },
  ];

  const deprecatedXAIPattern = /^(grok-1|grok-1\.5-legacy|embedding)/i;

  const baseUrl = customBaseUrl ? customBaseUrl.trim().replace(/\/+$/, '') : 'https://api.x.ai/v1';
  const url = baseUrl.endsWith('/v1') ? `${baseUrl}/models` : `${baseUrl}/v1/models`;

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    if (res.ok) {
      const data = await res.json();
      let rawList: any[] = Array.isArray(data.data)
        ? data.data
        : Array.isArray(data.models)
        ? data.models
        : Array.isArray(data)
        ? data
        : [];

      if (rawList.length === 0) {
        const langUrl = baseUrl.endsWith('/v1') ? `${baseUrl}/language-models` : `${baseUrl}/v1/language-models`;
        const langRes = await fetch(langUrl, {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        });
        if (langRes.ok) {
          const langData = await langRes.json();
          rawList = Array.isArray(langData.models)
            ? langData.models
            : Array.isArray(langData.data)
            ? langData.data
            : Array.isArray(langData)
            ? langData
            : [];
        }
      }

      if (rawList.length > 0) {
        const liveModels = rawList
          .filter((m: any) => {
            const id = (m.id || '').trim();
            if (!id || deprecatedXAIPattern.test(id)) return false;
            return true;
          })
          .map((m: any) => {
            const id: string = m.id;
            const isVision = id.includes('vision') || id.includes('image') || id.includes('multimodal');
            const isReasoning =
              id.includes('reason') ||
              id.includes('grok-4') ||
              id.includes('grok-3') ||
              id.includes('grok-2');
            const isGrok4 = id.includes('grok-4');
            const isGrok3 = id.includes('grok-3');
            const isMiniOrFast = id.includes('mini') || id.includes('fast');

            let inputPrice = 2.0;
            let outputPrice = 10.0;
            if (isGrok4) {
              inputPrice = isMiniOrFast ? 1.0 : 5.0;
              outputPrice = isMiniOrFast ? 5.0 : 25.0;
            } else if (isGrok3) {
              inputPrice = isMiniOrFast ? 0.5 : 3.0;
              outputPrice = isMiniOrFast ? 2.0 : 15.0;
            }

            return {
              id: id,
              name: formatXAIModelName(id),
              provider: 'xai',
              description: isGrok4
                ? isMiniOrFast
                  ? 'High-speed, cost-efficient frontier Grok 4 model'
                  : 'Premier frontier reasoning Grok 4 model'
                : isGrok3
                ? isMiniOrFast
                  ? 'Ultra-fast, cost-effective reasoning Grok 3 model'
                  : 'Next-generation frontier Grok 3 reasoning model'
                : isVision
                ? 'Grok multimodal vision and image comprehension'
                : 'State-of-the-art Grok conversation and reasoning',
              contextWindow: m.context_length || m.max_prompt_tokens || m.max_context_length || 131072,
              inputPrice,
              outputPrice,
              isVision,
              isReasoning,
            };
          });

        const existingIds = new Set(liveModels.map((m: any) => m.id));
        const merged = [...liveModels];
        for (const std of standardActiveModels) {
          if (!existingIds.has(std.id)) {
            merged.unshift(std);
          }
        }
        return merged.filter((m) => !deprecatedXAIPattern.test(m.id));
      }
    }
  } catch {
    // fallback
  }

  return standardActiveModels;
}

// Helper: Fetch real live models for Custom OpenAI-compatible endpoints with Active Model Filtering
async function fetchCustomModels(apiKey?: string, customBaseUrl?: string) {
  const rawBase = (customBaseUrl || 'http://localhost:8000/v1').trim().replace(/\/+$/, '');
  
  // Multi-candidate URL resolution: handles base URLs with or without /v1
  const candidates: string[] = [];
  if (rawBase.endsWith('/v1')) {
    candidates.push(`${rawBase}/models`);
    candidates.push(`${rawBase.replace(/\/v1$/, '')}/models`);
  } else {
    candidates.push(`${rawBase}/v1/models`);
    candidates.push(`${rawBase}/models`);
  }

  let lastErrorMessage = '';
  let fetchedData: any = null;
  let workingBase = rawBase;

  for (const candidateUrl of candidates) {
    try {
      const res = await fetch(candidateUrl, {
        headers: {
          Accept: 'application/json',
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
      });

      const contentType = res.headers.get('content-type') || '';
      const text = await res.text();

      // Guard: If response is HTML / landing page (e.g. <!doctype or <html>), skip candidate
      if (text.trim().startsWith('<') || contentType.includes('text/html')) {
        continue;
      }

      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch {
        continue;
      }

      if (!res.ok) {
        lastErrorMessage =
          parsed.error?.message ||
          parsed.message ||
          parsed.detail ||
          (typeof parsed.error === 'string' ? parsed.error : null) ||
          `HTTP ${res.status}: ${res.statusText}`;
        continue;
      }

      if (parsed && (Array.isArray(parsed.data) || Array.isArray(parsed.models) || Array.isArray(parsed))) {
        fetchedData = parsed;
        workingBase = candidateUrl.replace(/\/models$/, '');
        break;
      }
    } catch (err: any) {
      lastErrorMessage = err.message;
    }
  }

  if (fetchedData) {
    const rawList = Array.isArray(fetchedData.data)
      ? fetchedData.data
      : Array.isArray(fetchedData.models)
      ? fetchedData.models
      : Array.isArray(fetchedData)
      ? fetchedData
      : [];

    const nonChatPattern = /^(text-embedding|embedding|whisper|tts|dall-e|moderation|audio)/i;

    if (rawList.length > 0) {
      return rawList
        .filter((m: any) => {
          const id = typeof m === 'string' ? m : m.id || m.name || '';
          return id && !nonChatPattern.test(id);
        })
        .map((m: any) => {
          const id = typeof m === 'string' ? m : m.id || m.name || 'custom-model';
          const name = typeof m === 'string' ? m : m.name || m.id || 'Custom Model';
          const isReasoning =
            id.toLowerCase().includes('r1') ||
            id.toLowerCase().includes('reason') ||
            id.toLowerCase().includes('thinking') ||
            id.toLowerCase().includes('deepseek-r1') ||
            id.toLowerCase().includes('o1') ||
            id.toLowerCase().includes('o3');
          const isVision =
            id.toLowerCase().includes('vision') ||
            id.toLowerCase().includes('vl') ||
            id.toLowerCase().includes('multimodal');

          return {
            id,
            name: name.replace(/^models\//, ''),
            provider: 'custom',
            description: m.description || `Custom endpoint model (${workingBase})`,
            contextWindow: m.context_length || m.max_model_len || m.max_context_length || 65536,
            inputPrice: 0,
            outputPrice: 0,
            isReasoning,
            isVision,
          };
        });
    }
  }

  // If explicit auth error occurred
  if (lastErrorMessage) {
    const lower = lastErrorMessage.toLowerCase();
    if (
      lower.includes('unauthorized') ||
      lower.includes('invalid') ||
      lower.includes('api key') ||
      lower.includes('forbidden') ||
      lower.includes('credits')
    ) {
      throw new Error(lastErrorMessage);
    }
  }

  // Graceful fallback for endpoints that do not implement a public /models catalog
  return [
    {
      id: 'default',
      name: 'Default Custom Model',
      provider: 'custom',
      description: `Inference model at ${rawBase}`,
      contextWindow: 65536,
      inputPrice: 0,
      outputPrice: 0,
    },
    {
      id: 'deepseek-ai/DeepSeek-V3',
      name: 'DeepSeek V3',
      provider: 'custom',
      description: `Inference model at ${rawBase}`,
      contextWindow: 65536,
      inputPrice: 0,
      outputPrice: 0,
    },
    {
      id: 'deepseek-ai/DeepSeek-R1',
      name: 'DeepSeek R1',
      provider: 'custom',
      description: `Reasoning model at ${rawBase}`,
      contextWindow: 65536,
      inputPrice: 0,
      outputPrice: 0,
      isReasoning: true,
    },
  ];
}

// Universal Model Dispatcher
async function getLiveModelsForProvider(providerId: string, apiKey: string, customBaseUrl?: string) {
  if (providerId === 'google') return fetchGoogleGeminiModels(apiKey);
  if (providerId === 'openai') return fetchOpenAIModels(apiKey, customBaseUrl);
  if (providerId === 'anthropic') return fetchAnthropicModels(apiKey);
  if (providerId === 'deepseek') return fetchDeepSeekModels(apiKey, customBaseUrl);
  if (providerId === 'groq') return fetchGroqModels(apiKey);
  if (providerId === 'openrouter') return fetchOpenRouterModels(apiKey);
  if (providerId === 'mistral') return fetchMistralModels(apiKey);
  if (providerId === 'xai') return fetchXAIModels(apiKey, customBaseUrl);
  if (providerId === 'custom') return fetchCustomModels(apiKey, customBaseUrl);
  return [];
}

// 1. Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// 2. Validate API Key & return verified real models
app.post('/api/validate-key', async (req, res) => {
  try {
    const { providerId, apiKey: rawKey, customBaseUrl } = req.body;
    const apiKey = sanitizeKey(rawKey);
    const customBase = (customBaseUrl || '').trim();

    if (!apiKey && providerId !== 'custom') {
      return res.status(400).json({ valid: false, message: 'API key cannot be empty' });
    }

    const models = await getLiveModelsForProvider(providerId, apiKey, customBase);

    const providerNames: Record<string, string> = {
      google: 'Google Gemini',
      openai: 'OpenAI',
      anthropic: 'Anthropic Claude',
      deepseek: 'DeepSeek',
      groq: 'Groq',
      openrouter: 'OpenRouter',
      mistral: 'Mistral AI',
      xai: 'xAI Grok',
      custom: 'Custom Endpoint',
    };

    const name = providerNames[providerId] || providerId;

    return res.json({
      valid: true,
      message: `Successfully connected to ${name} (${models.length} real chat models available).`,
      modelsFound: models.length,
      models,
    });
  } catch (error: any) {
    return res.status(400).json({ valid: false, message: error.message || 'Connection test failed' });
  }
});

// 3. Fetch Provider Live Models
app.post('/api/fetch-models', async (req, res) => {
  try {
    const { providerId, apiKey: rawKey, customBaseUrl } = req.body;
    const apiKey = sanitizeKey(rawKey);
    const customBase = (customBaseUrl || '').trim();

    if (!apiKey && providerId !== 'custom') {
      return res.status(400).json({ error: 'API key is required' });
    }

    const models = await getLiveModelsForProvider(providerId, apiKey, customBase);
    return res.json({ models });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Failed to fetch models' });
  }
});

// 4. Server-Side Streaming Chat Endpoint
app.post('/api/chat-stream', async (req, res) => {
  // Set SSE Headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendSSE = (event: string, data: any) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const { conversation, apiKey: rawKey, customBaseUrl } = req.body;
    const apiKey = sanitizeKey(rawKey);
    const customBase = (customBaseUrl || '').trim();

    if (!conversation) {
      sendSSE('error', { message: 'Missing conversation payload' });
      return res.end();
    }

    const { providerId, modelId, systemPrompt, temperature, maxTokens, topP, messages } = conversation;

    if (!apiKey && providerId !== 'custom') {
      sendSSE('error', { message: `No API key provided for ${providerId}` });
      return res.end();
    }

    // Google Gemini Stream Handler
    if (providerId === 'google') {
      let cleanModel = (modelId || 'gemini-3.7-flash').replace(/^models\//, '').trim();

      // Auto-migrate legacy/deprecated models to modern working models
      if (cleanModel === 'gemini-2.5-flash') {
        cleanModel = 'gemini-3.6-flash';
      } else if (
        cleanModel.startsWith('gemini-1.5-') ||
        cleanModel.startsWith('gemini-1.0-') ||
        cleanModel.startsWith('gemini-2.0-') ||
        cleanModel === 'gemini-pro'
      ) {
        cleanModel = 'gemini-3.7-flash';
      }

      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      // Format contents for Google GenAI SDK
      const formattedContents: any[] = [];
      const validMessages = (messages || []).filter((m: any) => m.role === 'user' || m.role === 'assistant');

      for (const msg of validMessages) {
        const role = msg.role === 'assistant' ? 'model' : 'user';
        const parts: any[] = [];

        if (msg.attachments && msg.attachments.length > 0) {
          for (const att of msg.attachments) {
            if (att.dataUrl && att.dataUrl.includes(';base64,')) {
              const [hdr, b64] = att.dataUrl.split(';base64,');
              const mimeType = hdr.replace(/^data:/, '').trim() || 'image/jpeg';
              if (b64) {
                parts.push({
                  inlineData: {
                    mimeType,
                    data: b64.trim(),
                  },
                });
              }
            }
          }
        }

        const textContent = (msg.content || '').trim();
        if (textContent) {
          parts.push({ text: textContent });
        }

        if (parts.length === 0) {
          parts.push({ text: '...' });
        }

        // Merge same consecutive roles
        if (formattedContents.length > 0 && formattedContents[formattedContents.length - 1].role === role) {
          formattedContents[formattedContents.length - 1].parts.push(...parts);
        } else {
          formattedContents.push({ role, parts });
        }
      }

      if (formattedContents.length === 0) {
        formattedContents.push({ role: 'user', parts: [{ text: 'Hello' }] });
      }

      const config: any = {
        temperature: typeof temperature === 'number' ? Math.max(0, Math.min(2, temperature)) : 0.7,
        topP: typeof topP === 'number' ? Math.max(0.01, Math.min(1.0, topP)) : 0.95,
      };

      if (maxTokens && maxTokens > 0) {
        config.maxOutputTokens = Math.min(maxTokens, 8192);
      }

      if (systemPrompt && systemPrompt.trim()) {
        config.systemInstruction = systemPrompt.trim();
      }

      try {
        const responseStream = await ai.models.generateContentStream({
          model: cleanModel,
          contents: formattedContents,
          config: config,
        });

        for await (const chunk of responseStream) {
          if (chunk.text) {
            sendSSE('chunk', { text: chunk.text });
          }
        }

        sendSSE('done', { completed: true });
        return res.end();
      } catch (streamErr: any) {
        const errMsg = streamErr.message || '';
        // If the model was not found or is no longer available to new users, automatically fallback to gemini-3.6-flash or gemini-3.7-flash
        if (
          (errMsg.includes('not found') ||
            errMsg.includes('no longer available') ||
            errMsg.includes('NOT_FOUND') ||
            errMsg.includes('404')) &&
          cleanModel !== 'gemini-3.6-flash' &&
          cleanModel !== 'gemini-3.7-flash'
        ) {
          try {
            const fallbackModel = 'gemini-3.6-flash';
            const recoveryStream = await ai.models.generateContentStream({
              model: fallbackModel,
              contents: formattedContents,
              config: config,
            });

            for await (const chunk of recoveryStream) {
              if (chunk.text) {
                sendSSE('chunk', { text: chunk.text });
              }
            }

            sendSSE('done', { completed: true });
            return res.end();
          } catch (retryErr: any) {
            sendSSE('error', { message: retryErr.message || `Error streaming from Gemini model ${cleanModel}` });
            return res.end();
          }
        }

        sendSSE('error', { message: streamErr.message || `Error streaming from Gemini model ${cleanModel}` });
        return res.end();
      }
    }

    // Anthropic Claude Stream Handler
    if (providerId === 'anthropic') {
      let cleanModel = modelId || 'claude-3-7-sonnet-20250219';
      if (cleanModel.startsWith('claude-1') || cleanModel.startsWith('claude-2') || cleanModel.startsWith('claude-instant')) {
        cleanModel = 'claude-3-5-haiku-20241022';
      }

      const anthropicMsgs: any[] = [];

      for (const m of messages || []) {
        if (m.role === 'user' || m.role === 'assistant') {
          const contentParts: any[] = [];
          if (m.attachments && m.attachments.length > 0) {
            for (const att of m.attachments) {
              if (att.dataUrl && att.dataUrl.includes(';base64,')) {
                const [hdr, b64] = att.dataUrl.split(';base64,');
                const mediaType = hdr.replace(/^data:/, '').trim() || 'image/jpeg';
                contentParts.push({
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: mediaType,
                    data: b64.trim(),
                  },
                });
              }
            }
          }
          if (m.content) {
            contentParts.push({ type: 'text', text: m.content });
          }
          anthropicMsgs.push({
            role: m.role,
            content: contentParts.length === 1 && contentParts[0].type === 'text' ? contentParts[0].text : contentParts,
          });
        }
      }

      const payload: any = {
        model: cleanModel,
        messages: anthropicMsgs.length > 0 ? anthropicMsgs : [{ role: 'user', content: 'Hello' }],
        max_tokens: maxTokens || 4096,
        temperature: typeof temperature === 'number' ? temperature : 0.7,
        stream: true,
      };

      if (systemPrompt?.trim()) {
        payload.system = systemPrompt.trim();
      }

      let anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      // Fallback: If requested Claude model is not found/deprecated, fallback to claude-3-5-haiku-20241022
      if (!anthropicRes.ok && cleanModel !== 'claude-3-5-haiku-20241022') {
        const errJson = await anthropicRes.json().catch(() => ({}));
        const errMsg = (errJson.error?.message || '').toLowerCase();
        if (errMsg.includes('not_found') || errMsg.includes('not found') || anthropicRes.status === 404) {
          payload.model = 'claude-3-5-haiku-20241022';
          anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
              'content-type': 'application/json',
            },
            body: JSON.stringify(payload),
          });
        }
      }

      if (!anthropicRes.ok) {
        const errJson = await anthropicRes.json().catch(() => ({}));
        sendSSE('error', { message: errJson.error?.message || `Anthropic HTTP ${anthropicRes.status}` });
        return res.end();
      }

      if (!anthropicRes.body) {
        sendSSE('error', { message: 'Anthropic response body empty' });
        return res.end();
      }

      const reader = anthropicRes.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') continue;
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.type === 'content_block_delta') {
                if (parsed.delta?.type === 'text_delta') {
                  sendSSE('chunk', { text: parsed.delta.text });
                } else if (parsed.delta?.type === 'thinking_delta') {
                  sendSSE('reasoning', { text: parsed.delta.thinking });
                }
              }
            } catch {
              // ignore parse errors
            }
          }
        }
      }

      sendSSE('done', { completed: true });
      return res.end();
    }

    // OpenAI & OpenAI-compatible Stream Handler (OpenAI, DeepSeek, Groq, Mistral, xAI, OpenRouter, Custom)
    let baseUrl = 'https://api.openai.com/v1';
    if (providerId === 'deepseek') baseUrl = customBase || 'https://api.deepseek.com';
    else if (providerId === 'groq') baseUrl = 'https://api.groq.com/openai/v1';
    else if (providerId === 'openrouter') baseUrl = 'https://openrouter.ai/api/v1';
    else if (providerId === 'mistral') baseUrl = 'https://api.mistral.ai/v1';
    else if (providerId === 'xai') {
      baseUrl = (customBase || 'https://api.x.ai/v1').trim().replace(/\/+$/, '');
      if (!baseUrl.endsWith('/v1')) baseUrl = `${baseUrl}/v1`;
      baseUrl = baseUrl.replace(/\/v1\/v1/g, '/v1');
    } else if (providerId === 'custom') {
      const raw = (customBase || 'http://localhost:8000/v1').trim().replace(/\/+$/, '');
      if (!raw.endsWith('/v1') && !raw.includes('/v1/')) {
        baseUrl = `${raw}/v1`;
      } else {
        baseUrl = raw;
      }
    }

    const openAiMsgs: any[] = [];
    if (systemPrompt?.trim()) {
      openAiMsgs.push({ role: 'system', content: systemPrompt.trim() });
    }

    for (const m of messages || []) {
      if (m.attachments && m.attachments.length > 0) {
        const parts: any[] = [{ type: 'text', text: m.content || '' }];
        for (const att of m.attachments) {
          if (att.dataUrl) {
            parts.push({
              type: 'image_url',
              image_url: { url: att.dataUrl },
            });
          }
        }
        openAiMsgs.push({ role: m.role, content: parts });
      } else {
        openAiMsgs.push({ role: m.role, content: m.content || '' });
      }
    }

    // Auto-migrate legacy/deprecated models for OpenAI, Groq, Mistral, xAI, DeepSeek
    let effectiveModel = modelId || '';
    if (providerId === 'openai') {
      if (!effectiveModel || effectiveModel.includes('gpt-3.5-turbo-0') || effectiveModel.includes('gpt-4-0314') || effectiveModel.includes('davinci')) {
        effectiveModel = 'gpt-4o-mini';
      }
    } else if (providerId === 'groq') {
      if (
        !effectiveModel ||
        effectiveModel === 'llama-3-8b-8192' ||
        effectiveModel === 'llama3-8b-8192' ||
        effectiveModel.startsWith('llama2-')
      ) {
        effectiveModel = 'llama-3.1-8b-instant';
      } else if (effectiveModel === 'llama-3-70b-8192' || effectiveModel === 'llama3-70b-8192') {
        effectiveModel = 'llama-3.3-70b-versatile';
      }
    } else if (providerId === 'mistral') {
      if (!effectiveModel || effectiveModel === 'mistral-tiny' || effectiveModel === 'mistral-medium' || effectiveModel === 'mistral-small') {
        effectiveModel = 'mistral-small-latest';
      }
    } else if (providerId === 'xai') {
      if (!effectiveModel || effectiveModel === 'grok-1' || effectiveModel === 'grok-beta') {
        effectiveModel = 'grok-2-latest';
      }
    } else if (providerId === 'deepseek') {
      if (!effectiveModel) effectiveModel = 'deepseek-chat';
    } else if (!effectiveModel) {
      effectiveModel = 'gpt-4o';
    }

    const payload: any = {
      model: effectiveModel,
      messages: openAiMsgs.length > 0 ? openAiMsgs : [{ role: 'user', content: 'Hello' }],
      stream: true,
    };

    if (typeof temperature === 'number' && !isNaN(temperature)) {
      payload.temperature = Math.max(0, Math.min(2, temperature));
    }
    if (typeof maxTokens === 'number' && maxTokens > 0) {
      payload.max_tokens = maxTokens;
    }
    if (typeof topP === 'number' && topP > 0 && topP <= 1) {
      payload.top_p = topP;
    }

    let targetUrl = `${baseUrl.replace(/\/$/, '')}/chat/completions`;
    let upstreamRes = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    // Fallback: If custom endpoint returned 404 or HTML with /v1/chat/completions, try raw customBase/chat/completions
    if (!upstreamRes.ok && providerId === 'custom' && customBase) {
      const rawBase = customBase.trim().replace(/\/+$/, '');
      const altUrl = `${rawBase}/chat/completions`;
      if (altUrl !== targetUrl) {
        try {
          const altRes = await fetch(altUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify(payload),
          });
          if (altRes.ok) {
            upstreamRes = altRes;
            targetUrl = altUrl;
          }
        } catch {
          // ignore secondary error
        }
      }
    }

    // Fallback: If OpenAI/Groq/Mistral/xAI model returns 404 / model_not_found, try flagship fallback model
    if (!upstreamRes.ok && (upstreamRes.status === 404 || upstreamRes.status === 400)) {
      let fallbackCandidate = '';
      if (providerId === 'openai' && effectiveModel !== 'gpt-4o-mini') {
        fallbackCandidate = 'gpt-4o-mini';
      } else if (providerId === 'groq' && effectiveModel !== 'llama-3.3-70b-versatile') {
        fallbackCandidate = 'llama-3.3-70b-versatile';
      } else if (providerId === 'mistral' && effectiveModel !== 'mistral-large-latest') {
        fallbackCandidate = 'mistral-large-latest';
      } else if (providerId === 'xai' && effectiveModel !== 'grok-2-latest') {
        fallbackCandidate = 'grok-2-latest';
      } else if (providerId === 'deepseek' && effectiveModel !== 'deepseek-chat') {
        fallbackCandidate = 'deepseek-chat';
      }

      if (fallbackCandidate) {
        try {
          const fallbackPayload = { ...payload, model: fallbackCandidate };
          const retryRes = await fetch(targetUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify(fallbackPayload),
          });
          if (retryRes.ok) {
            upstreamRes = retryRes;
          }
        } catch {
          // fallback failed, continue to standard error handler
        }
      }
    }

    if (!upstreamRes.ok) {
      const text = await upstreamRes.text().catch(() => '');
      let detailedMessage = '';
      if (!text.trim().startsWith('<')) {
        try {
          const errJson = JSON.parse(text);
          detailedMessage =
            errJson.error?.message ||
            errJson.message ||
            errJson.detail ||
            (typeof errJson.error === 'string' ? errJson.error : null);
        } catch {
          // ignore
        }
      }

      if (!detailedMessage) {
        detailedMessage = `${providerId} HTTP ${upstreamRes.status}: ${upstreamRes.statusText || 'Request failed'}`;
      }
      sendSSE('error', { message: detailedMessage });
      return res.end();
    }

    if (!upstreamRes.body) {
      sendSSE('error', { message: 'Upstream body empty' });
      return res.end();
    }

    const reader = upstreamRes.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ')) {
          const dataStr = trimmed.slice(6).trim();
          if (dataStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(dataStr);
            const delta = parsed.choices?.[0]?.delta;
            if (delta) {
              if (delta.reasoning_content || delta.reasoning) {
                sendSSE('reasoning', { text: delta.reasoning_content || delta.reasoning });
              }
              if (delta.content) {
                sendSSE('chunk', { text: delta.content });
              }
            }
          } catch {
            // ignore
          }
        }
      }
    }

    sendSSE('done', { completed: true });
    return res.end();
  } catch (error: any) {
    sendSSE('error', { message: error.message || 'Stream processing error' });
    return res.end();
  }
});

// Vite Middleware & SPA serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ChatForge server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
