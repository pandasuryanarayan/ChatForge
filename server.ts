import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { decryptTransitPayload } from './src/utils/security';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '25mb' }));

// Helper to sanitize keys and decrypt any encrypted transit payloads
function sanitizeKey(key?: string): string {
  if (!key) return '';
  const decrypted = decryptTransitPayload(key);
  return decrypted
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/^bearer\s+/i, '')
    .trim();
}

// Helper to extract and securely resolve API keys from headers or body
function extractRequestApiKey(req: express.Request): string {
  const encHeader = req.headers['x-encrypted-api-key'] as string;
  if (encHeader) {
    const dec = sanitizeKey(encHeader);
    if (dec) return dec;
  }

  const rawHeader = (req.headers['x-provider-api-key'] as string) || (req.headers['authorization'] as string);
  if (rawHeader) {
    const dec = sanitizeKey(rawHeader);
    if (dec) return dec;
  }

  return sanitizeKey(req.body?.apiKey);
}

// ==========================================
// Comprehensive Model Specification Knowledge Base
// ==========================================
interface ModelMetadataSpec {
  name?: string;
  description?: string;
  contextWindow?: number;
  inputPrice?: number;
  outputPrice?: number;
  perUnitCost?: number;
  perUnitLabel?: string;
  isReasoning?: boolean;
  isVision?: boolean;
  isImageGen?: boolean;
  isVideoGen?: boolean;
}

const GLOBAL_MODEL_SPECS: Record<string, ModelMetadataSpec> = {
  // OpenAI
  'gpt-4o': {
    name: 'GPT-4o',
    description: 'Flagship omni-multimodal model for high intelligence, audio/visual analysis, and text reasoning.',
    contextWindow: 128000,
    inputPrice: 2.5,
    outputPrice: 10.0,
    isReasoning: false,
    isVision: true,
  },
  'gpt-4o-mini': {
    name: 'GPT-4o Mini',
    description: 'Fast, highly cost-efficient small model for everyday conversational, reasoning, and vision tasks.',
    contextWindow: 128000,
    inputPrice: 0.15,
    outputPrice: 0.6,
    isReasoning: false,
    isVision: true,
  },
  'chatgpt-4o-latest': {
    name: 'ChatGPT-4o Latest',
    description: 'Dynamic flagship model continuously updated to match the latest ChatGPT production behaviors.',
    contextWindow: 128000,
    inputPrice: 5.0,
    outputPrice: 15.0,
    isReasoning: false,
    isVision: true,
  },
  'o3-mini': {
    name: 'o3-mini',
    description: 'High-speed frontier reasoning model specialized for coding, math, and STEM with adjustable reasoning effort.',
    contextWindow: 200000,
    inputPrice: 1.1,
    outputPrice: 4.4,
    isReasoning: true,
    isVision: false,
  },
  'o1': {
    name: 'o1',
    description: 'Premier deep reasoning model for complex multistep analysis, code architecture, science, and math.',
    contextWindow: 200000,
    inputPrice: 15.0,
    outputPrice: 60.0,
    isReasoning: true,
    isVision: true,
  },
  'o1-mini': {
    name: 'o1-mini',
    description: 'Fast reasoning model optimized for competitive programming and STEM tasks without vision.',
    contextWindow: 128000,
    inputPrice: 1.1,
    outputPrice: 4.4,
    isReasoning: true,
    isVision: false,
  },
  'o1-preview': {
    name: 'o1-preview',
    description: 'Preview reasoning model for complex multistep problem solving.',
    contextWindow: 128000,
    inputPrice: 15.0,
    outputPrice: 60.0,
    isReasoning: true,
    isVision: false,
  },
  'gpt-4-turbo': {
    name: 'GPT-4 Turbo',
    description: 'High-intelligence multimodal model with 128k context window and vision.',
    contextWindow: 128000,
    inputPrice: 10.0,
    outputPrice: 30.0,
    isReasoning: false,
    isVision: true,
  },
  'gpt-4': {
    name: 'GPT-4',
    description: 'Legacy high-capability GPT-4 model with 8k context window.',
    contextWindow: 8192,
    inputPrice: 30.0,
    outputPrice: 60.0,
    isReasoning: false,
    isVision: false,
  },
  'gpt-4-32k': {
    name: 'GPT-4 32k',
    description: 'Legacy GPT-4 model with extended 32k context window.',
    contextWindow: 32768,
    inputPrice: 60.0,
    outputPrice: 120.0,
    isReasoning: false,
    isVision: false,
  },
  'gpt-3.5-turbo': {
    name: 'GPT-3.5 Turbo',
    description: 'Legacy high-speed conversational model with 16k context window.',
    contextWindow: 16385,
    inputPrice: 0.5,
    outputPrice: 1.5,
    isReasoning: false,
    isVision: false,
  },

  // Anthropic Claude
  'claude-3-7-sonnet-20250219': {
    name: 'Claude 3.7 Sonnet',
    description: 'State-of-the-art hybrid reasoning model combining instant responses with dynamic extended thinking.',
    contextWindow: 200000,
    inputPrice: 3.0,
    outputPrice: 15.0,
    isReasoning: true,
    isVision: true,
  },
  'claude-3-7-sonnet-latest': {
    name: 'Claude 3.7 Sonnet Latest',
    description: 'State-of-the-art hybrid reasoning model combining instant responses with dynamic extended thinking.',
    contextWindow: 200000,
    inputPrice: 3.0,
    outputPrice: 15.0,
    isReasoning: true,
    isVision: true,
  },
  'claude-3-5-sonnet-20241022': {
    name: 'Claude 3.5 Sonnet v2',
    description: 'Industry benchmark leader for coding, complex reasoning, agentic workflows, and vision comprehension.',
    contextWindow: 200000,
    inputPrice: 3.0,
    outputPrice: 15.0,
    isReasoning: false,
    isVision: true,
  },
  'claude-3-5-sonnet-latest': {
    name: 'Claude 3.5 Sonnet Latest',
    description: 'Industry benchmark leader for coding, complex reasoning, agentic workflows, and vision comprehension.',
    contextWindow: 200000,
    inputPrice: 3.0,
    outputPrice: 15.0,
    isReasoning: false,
    isVision: true,
  },
  'claude-3-5-haiku-20241022': {
    name: 'Claude 3.5 Haiku',
    description: 'Ultra-fast, low-latency intelligence rivaling previous-generation flagships at low cost.',
    contextWindow: 200000,
    inputPrice: 0.8,
    outputPrice: 4.0,
    isReasoning: false,
    isVision: true,
  },
  'claude-3-5-haiku-latest': {
    name: 'Claude 3.5 Haiku Latest',
    description: 'Ultra-fast, low-latency intelligence rivaling previous-generation flagships at low cost.',
    contextWindow: 200000,
    inputPrice: 0.8,
    outputPrice: 4.0,
    isReasoning: false,
    isVision: true,
  },
  'claude-3-opus-20240229': {
    name: 'Claude 3 Opus',
    description: 'Deep narrative analysis, long-form creative writing, high-level strategy, and complex synthesis.',
    contextWindow: 200000,
    inputPrice: 15.0,
    outputPrice: 75.0,
    isReasoning: false,
    isVision: true,
  },
  'claude-3-opus-latest': {
    name: 'Claude 3 Opus Latest',
    description: 'Deep narrative analysis, long-form creative writing, high-level strategy, and complex synthesis.',
    contextWindow: 200000,
    inputPrice: 15.0,
    outputPrice: 75.0,
    isReasoning: false,
    isVision: true,
  },
  'claude-3-sonnet-20240229': {
    name: 'Claude 3 Sonnet',
    description: 'Balanced enterprise model with 200k context window.',
    contextWindow: 200000,
    inputPrice: 3.0,
    outputPrice: 15.0,
    isReasoning: false,
    isVision: true,
  },
  'claude-3-haiku-20240307': {
    name: 'Claude 3 Haiku',
    description: 'Fast lightweight model for rapid interactions with 200k context window.',
    contextWindow: 200000,
    inputPrice: 0.25,
    outputPrice: 1.25,
    isReasoning: false,
    isVision: true,
  },

  // Google Gemini
  'gemini-3.7-flash': {
    name: 'Gemini 3.7 Flash',
    description: 'Next-generation multimodal frontier model with dynamic thinking reasoning and 1M token context.',
    contextWindow: 1048576,
    inputPrice: 0.1,
    outputPrice: 0.4,
    isReasoning: true,
    isVision: true,
  },
  'gemini-3.6-flash': {
    name: 'Gemini 3.6 Flash',
    description: 'High-speed, high-efficiency multimodal model for scaled chat and vision with 1M context.',
    contextWindow: 1048576,
    inputPrice: 0.1,
    outputPrice: 0.4,
    isReasoning: true,
    isVision: true,
  },
  'gemini-3.1-pro-preview': {
    name: 'Gemini 3.1 Pro Preview',
    description: 'Flagship reasoning model for deep coding, mathematical proofs, and 2M token document synthesis.',
    contextWindow: 2097152,
    inputPrice: 1.25,
    outputPrice: 5.0,
    isReasoning: true,
    isVision: true,
  },
  'gemini-3.1-flash-lite': {
    name: 'Gemini 3.1 Flash Lite',
    description: 'Ultra-lightweight, lowest-cost Gemini model optimized for sub-second response times with 1M context.',
    contextWindow: 1048576,
    inputPrice: 0.075,
    outputPrice: 0.3,
    isReasoning: false,
    isVision: true,
  },
  'gemini-2.5-pro': {
    name: 'Gemini 2.5 Pro',
    description: 'Advanced reasoning and long-context multimodal comprehension across 2M tokens.',
    contextWindow: 2097152,
    inputPrice: 1.25,
    outputPrice: 5.0,
    isReasoning: true,
    isVision: true,
  },
  'gemini-2.5-flash-preview': {
    name: 'Gemini 2.5 Flash Preview',
    description: 'Next-generation fast multimodal preview model with reasoning capabilities and 1M context.',
    contextWindow: 1048576,
    inputPrice: 0.1,
    outputPrice: 0.4,
    isReasoning: true,
    isVision: true,
  },
  'gemini-2.0-flash': {
    name: 'Gemini 2.0 Flash',
    description: 'High-speed multimodal intelligence with 1M context window.',
    contextWindow: 1048576,
    inputPrice: 0.1,
    outputPrice: 0.4,
    isReasoning: false,
    isVision: true,
  },
  'gemini-2.0-flash-lite': {
    name: 'Gemini 2.0 Flash Lite',
    description: 'Lightweight, low-latency multimodal Gemini model with 1M context.',
    contextWindow: 1048576,
    inputPrice: 0.075,
    outputPrice: 0.3,
    isReasoning: false,
    isVision: true,
  },
  'gemini-1.5-pro': {
    name: 'Gemini 1.5 Pro',
    description: 'Massive 2M token context window model for deep multimodal analysis.',
    contextWindow: 2097152,
    inputPrice: 1.25,
    outputPrice: 5.0,
    isReasoning: false,
    isVision: true,
  },
  'gemini-1.5-flash': {
    name: 'Gemini 1.5 Flash',
    description: 'Fast, versatile multimodal model with 1M token context.',
    contextWindow: 1048576,
    inputPrice: 0.075,
    outputPrice: 0.3,
    isReasoning: false,
    isVision: true,
  },
  'gemini-1.5-flash-8b': {
    name: 'Gemini 1.5 Flash 8B',
    description: 'High-speed small-parameter multimodal model with 1M context.',
    contextWindow: 1048576,
    inputPrice: 0.0375,
    outputPrice: 0.15,
    isReasoning: false,
    isVision: true,
  },

  // DeepSeek
  'deepseek-chat': {
    name: 'DeepSeek V3 (Chat)',
    description: 'World-class 671B MoE model leading open LLM benchmarks in code, reasoning, and conversational nuance.',
    contextWindow: 64000,
    inputPrice: 0.14,
    outputPrice: 0.28,
    isReasoning: false,
    isVision: false,
  },
  'deepseek-reasoner': {
    name: 'DeepSeek R1 (Reasoner)',
    description: 'State-of-the-art open reasoning model with verifiable chain-of-thought thought streams.',
    contextWindow: 64000,
    inputPrice: 0.55,
    outputPrice: 2.19,
    isReasoning: true,
    isVision: false,
  },

  // Groq
  'llama-3.3-70b-versatile': {
    name: 'Llama 3.3 70B Versatile',
    description: 'Meta premier 70B open weight model running at 300+ tokens/sec on Groq LPUs with 128k context.',
    contextWindow: 128000,
    inputPrice: 0.59,
    outputPrice: 0.79,
    isReasoning: false,
    isVision: false,
  },
  'deepseek-r1-distill-llama-70b': {
    name: 'DeepSeek R1 (70B Distill)',
    description: 'DeepSeek R1 chain-of-thought reasoning distilled into Llama 70B, running at high speed on Groq LPUs.',
    contextWindow: 128000,
    inputPrice: 0.75,
    outputPrice: 0.99,
    isReasoning: true,
    isVision: false,
  },
  'deepseek-r1-distill-qwen-32b': {
    name: 'DeepSeek R1 (Qwen 32B Distill)',
    description: 'DeepSeek R1 reasoning distilled into Qwen 2.5 32B, optimized for math and code at ultra-high speed on Groq.',
    contextWindow: 128000,
    inputPrice: 0.5,
    outputPrice: 0.75,
    isReasoning: true,
    isVision: false,
  },
  'llama-3.1-8b-instant': {
    name: 'Llama 3.1 8B Instant',
    description: 'Blazing fast 800+ tokens/second lightweight model for immediate responses and high-volume tasks on Groq.',
    contextWindow: 128000,
    inputPrice: 0.05,
    outputPrice: 0.08,
    isReasoning: false,
    isVision: false,
  },
  'llama-3.2-11b-vision-preview': {
    name: 'Llama 3.2 11B Vision Preview',
    description: 'Multimodal vision and text comprehension running with low latency on Groq LPUs.',
    contextWindow: 128000,
    inputPrice: 0.18,
    outputPrice: 0.18,
    isReasoning: false,
    isVision: true,
  },
  'llama-3.2-90b-vision-preview': {
    name: 'Llama 3.2 90B Vision Preview',
    description: 'Large-scale multimodal vision and text comprehension on Groq LPUs.',
    contextWindow: 128000,
    inputPrice: 0.7,
    outputPrice: 0.7,
    isReasoning: false,
    isVision: true,
  },
  'qwen-2.5-coder-32b': {
    name: 'Qwen 2.5 Coder 32B',
    description: 'Top-tier open coding model for code completion, refactoring, and debugging on Groq.',
    contextWindow: 128000,
    inputPrice: 0.2,
    outputPrice: 0.2,
    isReasoning: false,
    isVision: false,
  },
  'qwen-2.5-32b': {
    name: 'Qwen 2.5 32B',
    description: 'High-capability general intelligence and multilingual model with 128k context on Groq.',
    contextWindow: 128000,
    inputPrice: 0.2,
    outputPrice: 0.2,
    isReasoning: false,
    isVision: false,
  },
  'mixtral-8x7b-32768': {
    name: 'Mixtral 8x7B',
    description: 'MoE model with 32k context window and high token throughput on Groq.',
    contextWindow: 32768,
    inputPrice: 0.24,
    outputPrice: 0.24,
    isReasoning: false,
    isVision: false,
  },
  'gemma2-9b-it': {
    name: 'Gemma 2 9B IT',
    description: 'Google open weights Gemma 2 model with 8k context window on Groq.',
    contextWindow: 8192,
    inputPrice: 0.2,
    outputPrice: 0.2,
    isReasoning: false,
    isVision: false,
  },
  'llama-guard-3-8b': {
    name: 'Llama Guard 3 8B',
    description: 'Content moderation and safety classification model with 8k context on Groq.',
    contextWindow: 8192,
    inputPrice: 0.2,
    outputPrice: 0.2,
    isReasoning: false,
    isVision: false,
  },

  // Mistral AI
  'mistral-large-latest': {
    name: 'Mistral Large 2',
    description: 'Mistral flagship 123B model with top-tier multilingual reasoning, agentic tool use, and 128k context.',
    contextWindow: 128000,
    inputPrice: 2.0,
    outputPrice: 6.0,
    isReasoning: true,
    isVision: false,
  },
  'codestral-latest': {
    name: 'Codestral',
    description: 'Specialized 22B model for 80+ programming languages, fill-in-the-middle, and large 256k repository context.',
    contextWindow: 256000,
    inputPrice: 0.2,
    outputPrice: 0.6,
    isReasoning: false,
    isVision: false,
  },
  'pixtral-large-latest': {
    name: 'Pixtral Large',
    description: 'Frontier 124B multimodal model for charts, documents, and visual comprehension with 128k context.',
    contextWindow: 128000,
    inputPrice: 2.0,
    outputPrice: 6.0,
    isReasoning: true,
    isVision: true,
  },
  'pixtral-12b-2409': {
    name: 'Pixtral 12B',
    description: 'Native multimodal 12B model with high-resolution image processing and 128k context.',
    contextWindow: 128000,
    inputPrice: 0.15,
    outputPrice: 0.15,
    isReasoning: false,
    isVision: true,
  },
  'mistral-small-latest': {
    name: 'Mistral Small',
    description: 'Enterprise-grade lightweight reasoning and summarization model with 128k context.',
    contextWindow: 128000,
    inputPrice: 0.2,
    outputPrice: 0.6,
    isReasoning: false,
    isVision: false,
  },
  'ministral-8b-latest': {
    name: 'Ministral 8B',
    description: 'Powerhouse edge model with 128k context for high-speed local inference and fast agents.',
    contextWindow: 128000,
    inputPrice: 0.1,
    outputPrice: 0.1,
    isReasoning: false,
    isVision: false,
  },
  'ministral-3b-latest': {
    name: 'Ministral 3B',
    description: 'Ultra-compact sub-second latency model for lightweight tasks with 128k context.',
    contextWindow: 128000,
    inputPrice: 0.04,
    outputPrice: 0.04,
    isReasoning: false,
    isVision: false,
  },
  'open-mistral-nemo': {
    name: 'Mistral Nemo',
    description: '12B Apache 2.0 multilingual generalist model trained in collaboration with NVIDIA with 128k context.',
    contextWindow: 128000,
    inputPrice: 0.15,
    outputPrice: 0.15,
    isReasoning: false,
    isVision: false,
  },
  'open-codestral-mamba': {
    name: 'Codestral Mamba',
    description: 'Mamba 2 SSM architecture specialized for long-context 256k code reasoning.',
    contextWindow: 256000,
    inputPrice: 0.2,
    outputPrice: 0.6,
    isReasoning: false,
    isVision: false,
  },

  // xAI Grok
  'grok-2-latest': {
    name: 'Grok 2 Latest',
    description: 'xAI premier reasoning and world knowledge model with 128k context.',
    contextWindow: 131072,
    inputPrice: 2.0,
    outputPrice: 10.0,
    isReasoning: true,
    isVision: true,
  },
  'grok-2': {
    name: 'Grok 2',
    description: 'xAI premier reasoning and world knowledge model with 128k context.',
    contextWindow: 131072,
    inputPrice: 2.0,
    outputPrice: 10.0,
    isReasoning: true,
    isVision: true,
  },
  'grok-2-vision-latest': {
    name: 'Grok 2 Vision Latest',
    description: 'Grok multimodal vision and document understanding model with 32k context.',
    contextWindow: 32768,
    inputPrice: 2.0,
    outputPrice: 10.0,
    isReasoning: true,
    isVision: true,
  },
  'grok-2-vision': {
    name: 'Grok 2 Vision',
    description: 'Grok multimodal vision and document understanding model with 32k context.',
    contextWindow: 32768,
    inputPrice: 2.0,
    outputPrice: 10.0,
    isReasoning: true,
    isVision: true,
  },
  'grok-3': {
    name: 'Grok 3',
    description: 'Frontier Grok 3 reasoning & intelligence model trained with massive scale compute.',
    contextWindow: 131072,
    inputPrice: 3.0,
    outputPrice: 15.0,
    isReasoning: true,
    isVision: false,
  },
  'grok-3-mini': {
    name: 'Grok 3 Mini',
    description: 'Ultra-fast, cost-effective reasoning Grok 3 model with 128k context.',
    contextWindow: 131072,
    inputPrice: 0.5,
    outputPrice: 2.0,
    isReasoning: true,
    isVision: false,
  },
  'grok-beta': {
    name: 'Grok Beta',
    description: 'Early access flagship Grok model with 128k context.',
    contextWindow: 131072,
    inputPrice: 5.0,
    outputPrice: 15.0,
    isReasoning: false,
    isVision: false,
  },

  // Agnes AI Models
  'agnes-2.0-flash': {
    name: 'Agnes 2.0 Flash',
    description: 'High-efficiency fast multimodal vision & chat model with 512k token context window (Free).',
    contextWindow: 512000,
    inputPrice: 0,
    outputPrice: 0,
    isReasoning: false,
    isVision: true,
  },
  'agnes-2.5-flash': {
    name: 'Agnes 2.5 Flash',
    description: 'Flagship next-generation hybrid reasoning & multimodal model with 512k context (Free).',
    contextWindow: 512000,
    inputPrice: 0,
    outputPrice: 0,
    isReasoning: true,
    isVision: true,
  },
  // Agnes & Media Generation Models
  'agnes-image-2.1-flash': {
    name: 'Agnes Image 2.1 Flash',
    description: 'Ultra-fast high-resolution generative image synthesis model ($0.030 per image).',
    perUnitCost: 0.03,
    perUnitLabel: 'per image',
    isImageGen: true,
    isVision: true,
  },
  'agnes-image-2.0-flash': {
    name: 'Agnes Image 2.0 Flash',
    description: 'Fast high-resolution generative image synthesis model ($0.030 per image).',
    perUnitCost: 0.03,
    perUnitLabel: 'per image',
    isImageGen: true,
    isVision: true,
  },
  'agnes-image-v2.1': {
    name: 'Agnes Image 2.1',
    description: 'High-resolution generative image synthesis model ($0.030 per image).',
    perUnitCost: 0.03,
    perUnitLabel: 'per image',
    isImageGen: true,
    isVision: true,
  },
  'agnes-image': {
    name: 'Agnes Image',
    description: 'High-resolution generative image synthesis model ($0.030 per image).',
    perUnitCost: 0.03,
    perUnitLabel: 'per image',
    isImageGen: true,
    isVision: true,
  },
  'agnes-video-v2.0': {
    name: 'Agnes Video 2.0',
    description: 'Proprietary high-definition video generation model ($0.03 per generated video).',
    perUnitCost: 0.03,
    perUnitLabel: 'per video',
    isVideoGen: true,
    isVision: true,
  },
  'agnes-video': {
    name: 'Agnes Video',
    description: 'Proprietary high-definition video generation model ($0.03 per generated video).',
    perUnitCost: 0.03,
    perUnitLabel: 'per video',
    isVideoGen: true,
    isVision: true,
  },
  'agnes-2.5-pro': {
    name: 'Agnes 2.5 Pro',
    description: 'Flagship deep reasoning and complex coding intelligence with 1M token context ($0.45 / $0.90).',
    contextWindow: 1000000,
    inputPrice: 0.45,
    outputPrice: 0.90,
    isReasoning: true,
    isVision: true,
  },
  'agnes-2.5-pro-alpha': {
    name: 'Agnes 2.5 Pro (Alpha)',
    description: 'Frontier experimental deep reasoning, advanced coding & research with 1M context ($0.45 / $0.90).',
    contextWindow: 1000000,
    inputPrice: 0.45,
    outputPrice: 0.90,
    isReasoning: true,
    isVision: true,
  },
  'agnes-2.5-pro-beta': {
    name: 'Agnes 2.5 Pro (Beta)',
    description: 'High-speed deep reasoning model with 1M token context window ($0.10 / $0.30).',
    contextWindow: 1000000,
    inputPrice: 0.10,
    outputPrice: 0.30,
    isReasoning: true,
    isVision: true,
  },

  // Image Generation Models
  'dall-e-3': {
    name: 'DALL·E 3',
    description: 'High-definition photorealistic image generation model ($0.040 per image).',
    perUnitCost: 0.04,
    perUnitLabel: 'per image',
    isImageGen: true,
    isVision: true,
  },
  'dall-e-2': {
    name: 'DALL·E 2',
    description: 'Fast image generation model ($0.020 per image).',
    perUnitCost: 0.02,
    perUnitLabel: 'per image',
    isImageGen: true,
    isVision: true,
  },
  'imagen-3.0-generate-002': {
    name: 'Imagen 3',
    description: 'Google state-of-the-art photorealistic image generation ($0.030 per image).',
    perUnitCost: 0.03,
    perUnitLabel: 'per image',
    isImageGen: true,
    isVision: true,
  },
};

/**
 * Intelligent helper to deduce authentic model metadata, context window, and capabilities
 */
function resolveModelDetails(
  modelId: string,
  providerId: string,
  rawApiResponse?: any
) {
  const cleanId = (modelId || '').replace(/^models\//, '').trim();
  const lowerId = cleanId.toLowerCase();
  const lowerName = (rawApiResponse?.displayName || rawApiResponse?.name || '').toLowerCase();

  // 1. Check if model is a specialized media generation model
  const isVideoGen =
    Boolean(GLOBAL_MODEL_SPECS[cleanId]?.isVideoGen) ||
    Boolean(rawApiResponse?.isVideoGen) ||
    lowerId.includes('video') ||
    lowerId.includes('sora') ||
    lowerId.includes('kling') ||
    lowerId.includes('runway') ||
    lowerId.includes('luma') ||
    lowerId.includes('gen-3') ||
    lowerId.includes('gen-2') ||
    lowerId.includes('veo') ||
    lowerId.includes('pika') ||
    lowerId.includes('cogvideo') ||
    lowerId.includes('wan') ||
    lowerId.includes('hunyuan-video') ||
    lowerId.includes('mochi') ||
    lowerId.includes('hailuo') ||
    lowerId.includes('minimax-video') ||
    lowerId.includes('txt2video') ||
    lowerId.includes('t2v') ||
    lowerId.includes('image2video') ||
    lowerId.includes('i2v') ||
    lowerId.includes('animatediff') ||
    lowerId.includes('ltx-video') ||
    lowerId.includes('svd') ||
    Boolean(rawApiResponse?.description && /video (generation|synthesis)|text-to-video|image-to-video|generates video/i.test(rawApiResponse.description));

  const isImageGen =
    !isVideoGen &&
    (Boolean(GLOBAL_MODEL_SPECS[cleanId]?.isImageGen) ||
      Boolean(rawApiResponse?.isImageGen) ||
      lowerId.includes('agnes-image') ||
      lowerId.includes('dall-e') ||
      lowerId.includes('dalle') ||
      lowerId.includes('imagen') ||
      lowerId.includes('flux') ||
      lowerId.includes('stable-diffusion') ||
      lowerId.includes('sdxl') ||
      lowerId.includes('sd-turbo') ||
      lowerId.includes('sd3') ||
      lowerId.includes('recraft') ||
      lowerId.includes('midjourney') ||
      lowerId.includes('ideogram') ||
      lowerId.includes('playground-v') ||
      lowerId.includes('aurora') ||
      lowerId.includes('txt2img') ||
      lowerId.includes('t2i') ||
      lowerId.includes('img2img') ||
      lowerId.includes('bria') ||
      lowerId.includes('kolors') ||
      lowerId.includes('kandinsky') ||
      lowerId.includes('image-gen') ||
      lowerId.includes('imagegen') ||
      lowerId.includes('image-generation') ||
      lowerId.startsWith('image-') ||
      lowerId.includes('-image-') ||
      lowerId.endsWith('-image') ||
      lowerId.includes('image-2') ||
      lowerId.includes('image-3') ||
      lowerId.includes('image-v') ||
      lowerId.includes('image-1') ||
      lowerName.includes('image gen') ||
      lowerName.includes('image generation') ||
      lowerName.includes('agnes image') ||
      (lowerId.includes('image') &&
        !lowerId.includes('chat') &&
        !lowerId.includes('instruct') &&
        !lowerId.includes('dialogue') &&
        (lowerId.includes('gen') ||
          lowerId.includes('generate') ||
          lowerId.includes('synthesis') ||
          lowerId.includes('v2') ||
          lowerId.includes('draw') ||
          lowerId.includes('art') ||
          lowerId.includes('diffusion') ||
          lowerId.includes('create') ||
          lowerId.includes('flash') ||
          lowerId.includes('fast') ||
          lowerId.includes('turbo'))) ||
      Boolean(rawApiResponse?.description && /image (generation|synthesis)|text-to-image|generates image|photorealistic image/i.test(rawApiResponse.description)));

  // 2. Check if dynamic API response explicitly specifies real context window
  const dynamicContext: number =
    rawApiResponse?.inputTokenLimit ||
    rawApiResponse?.input_token_limit ||
    rawApiResponse?.context_window ||
    rawApiResponse?.context_length ||
    rawApiResponse?.max_context_length ||
    rawApiResponse?.max_model_len ||
    rawApiResponse?.max_prompt_tokens ||
    rawApiResponse?.max_input_tokens ||
    rawApiResponse?.num_ctx ||
    rawApiResponse?.model_info?.context_length ||
    rawApiResponse?.top_provider?.context_length ||
    rawApiResponse?.architecture?.context_length ||
    0;

  // 3. Check if dynamic API response explicitly specifies real pricing
  let dynamicInputPrice: number | undefined;
  let dynamicOutputPrice: number | undefined;

  if (rawApiResponse?.pricing) {
    const p = rawApiResponse.pricing;
    const promptVal = p.prompt ?? p.input ?? p.input_price ?? p.prompt_tokens;
    const compVal = p.completion ?? p.output ?? p.output_price ?? p.completion_tokens;
    if (promptVal !== undefined && promptVal !== null) {
      let inP = Number(promptVal);
      if (inP > 0 && inP < 0.001) inP *= 1000000;
      dynamicInputPrice = inP;
    }
    if (compVal !== undefined && compVal !== null) {
      let outP = Number(compVal);
      if (outP > 0 && outP < 0.001) outP *= 1000000;
      dynamicOutputPrice = outP;
    }
  } else if (rawApiResponse?.input_price !== undefined || rawApiResponse?.output_price !== undefined) {
    if (rawApiResponse?.input_price !== undefined) {
      let inP = Number(rawApiResponse.input_price);
      if (inP > 0 && inP < 0.001) inP *= 1000000;
      dynamicInputPrice = inP;
    }
    if (rawApiResponse?.output_price !== undefined) {
      let outP = Number(rawApiResponse.output_price);
      if (outP > 0 && outP < 0.001) outP *= 1000000;
      dynamicOutputPrice = outP;
    }
  }

  // 4. Direct hit in exact specification table (if not dynamically provided by API)
  if (GLOBAL_MODEL_SPECS[cleanId]) {
    const spec = GLOBAL_MODEL_SPECS[cleanId];
    return {
      id: cleanId,
      name: spec.name || cleanId,
      provider: providerId,
      description: spec.description || `${providerId} model`,
      contextWindow: isVideoGen || isImageGen ? undefined : (dynamicContext > 0 ? dynamicContext : (spec.contextWindow || 128000)),
      inputPrice: dynamicInputPrice !== undefined ? dynamicInputPrice : (spec.inputPrice ?? 0),
      outputPrice: dynamicOutputPrice !== undefined ? dynamicOutputPrice : (spec.outputPrice ?? 0),
      perUnitCost: spec.perUnitCost,
      perUnitLabel: spec.perUnitLabel,
      isReasoning: spec.isReasoning ?? false,
      isVision: spec.isVision ?? (isVideoGen || isImageGen ? true : false),
      isImageGen: spec.isImageGen ?? isImageGen,
      isVideoGen: spec.isVideoGen ?? isVideoGen,
    };
  }

  // 5. Authentic context window resolution for language models
  let contextWindow: number | undefined = isVideoGen || isImageGen ? undefined : dynamicContext;
  if (!contextWindow && !isVideoGen && !isImageGen) {
    if (lowerId.includes('agnes')) {
      if (lowerId.includes('pro')) {
        contextWindow = 1000000;
      } else {
        contextWindow = 512000;
      }
    } else if (lowerId.includes('2m') || (lowerId.includes('gemini') && lowerId.includes('pro') && !lowerId.includes('1.0'))) {
      contextWindow = 2097152;
    } else if (lowerId.includes('1m') || (lowerId.includes('gemini') && (lowerId.includes('flash') || lowerId.includes('pro')))) {
      contextWindow = 1048576;
    } else if (lowerId.includes('512k') || lowerId.includes('524k')) {
      contextWindow = 512000;
    } else if (lowerId.includes('256k') || lowerId.includes('codestral')) {
      contextWindow = 256000;
    } else if (lowerId.includes('200k') || lowerId.includes('claude-3') || lowerId.includes('o3') || lowerId.includes('o1')) {
      contextWindow = 200000;
    } else if (lowerId.includes('131k') || lowerId.includes('128k') || lowerId.includes('llama-3.3') || lowerId.includes('llama-3.1') || lowerId.includes('llama-3.2') || lowerId.includes('qwen-2.5') || lowerId.includes('qwen2.5') || lowerId.includes('mistral-large') || lowerId.includes('mistral-small') || lowerId.includes('pixtral') || lowerId.includes('gpt-4o') || lowerId.includes('4-turbo') || lowerId.includes('grok')) {
      contextWindow = 128000;
    } else if (lowerId.includes('64k') || lowerId.includes('deepseek')) {
      contextWindow = 64000;
    } else if (lowerId.includes('32k') || lowerId.includes('mixtral') || lowerId.includes('grok-2-vision')) {
      contextWindow = 32768;
    } else if (lowerId.includes('16k') || lowerId.includes('gpt-3.5') || lowerId.includes('phi-4') || lowerId.includes('phi4')) {
      contextWindow = 16384;
    } else if (lowerId.includes('8k') || lowerId.includes('gemma') || lowerId.includes('llama-3-8b') || lowerId.includes('guard')) {
      contextWindow = 8192;
    } else if (lowerId.includes('4k') || lowerId.includes('llama-2') || lowerId.includes('llama2')) {
      contextWindow = 4096;
    } else {
      contextWindow = providerId === 'google' ? 1048576 : providerId === 'anthropic' ? 200000 : 128000;
    }
  }

  // 4. Modality and reasoning flags
  const isReasoning =
    lowerId.includes('reason') ||
    lowerId.includes('r1') ||
    lowerId.includes('thinking') ||
    lowerId.includes('o1') ||
    lowerId.includes('o3') ||
    lowerId.includes('3.7-sonnet') ||
    lowerId.includes('distill-qwen') ||
    lowerId.includes('distill-llama');

  const isVision =
    lowerId.includes('vision') ||
    lowerId.includes('pixtral') ||
    lowerId.includes('vl') ||
    lowerId.includes('4o') ||
    lowerId.includes('gemini') ||
    lowerId.includes('multimodal') ||
    lowerId.includes('claude-3');

  // 5. Pricing heuristics
  let inputPrice = 0;
  let outputPrice = 0;
  if (rawApiResponse?.pricing) {
    inputPrice = Number(rawApiResponse.pricing.prompt || 0) * 1000000;
    outputPrice = Number(rawApiResponse.pricing.completion || 0) * 1000000;
  } else if (providerId === 'openai') {
    if (lowerId.includes('o1')) {
      inputPrice = 15.0;
      outputPrice = 60.0;
    } else if (lowerId.includes('o3') || lowerId.includes('o1-mini')) {
      inputPrice = 1.1;
      outputPrice = 4.4;
    } else if (lowerId.includes('4o-mini')) {
      inputPrice = 0.15;
      outputPrice = 0.6;
    } else if (lowerId.includes('4o')) {
      inputPrice = 2.5;
      outputPrice = 10.0;
    }
  } else if (providerId === 'anthropic') {
    if (lowerId.includes('opus')) {
      inputPrice = 15.0;
      outputPrice = 75.0;
    } else if (lowerId.includes('haiku')) {
      inputPrice = 0.8;
      outputPrice = 4.0;
    } else {
      inputPrice = 3.0;
      outputPrice = 15.0;
    }
  } else if (providerId === 'google') {
    if (lowerId.includes('pro')) {
      inputPrice = 1.25;
      outputPrice = 5.0;
    } else {
      inputPrice = 0.1;
      outputPrice = 0.4;
    }
  } else if (providerId === 'groq') {
    if (lowerId.includes('70b') || lowerId.includes('90b')) {
      inputPrice = 0.59;
      outputPrice = 0.79;
    } else if (lowerId.includes('8b') || lowerId.includes('1b') || lowerId.includes('3b')) {
      inputPrice = 0.05;
      outputPrice = 0.08;
    } else {
      inputPrice = 0.2;
      outputPrice = 0.2;
    }
  } else if (providerId === 'deepseek') {
    if (lowerId.includes('reasoner') || lowerId.includes('r1')) {
      inputPrice = 0.55;
      outputPrice = 2.19;
    } else {
      inputPrice = 0.14;
      outputPrice = 0.28;
    }
  }

  // 6. Formatting model name
  let name = rawApiResponse?.displayName || rawApiResponse?.name || cleanId;
  if (name === cleanId) {
    name = cleanId
      .split(/[-_:]/)
      .map((w) => (w.length <= 3 ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
      .join(' ');
  }

  // 7. Humanized specific description
  let description = rawApiResponse?.description;
  if (!description || description.length < 5) {
    if (isVideoGen) {
      description = `High-definition video generation model (${providerId}).`;
    } else if (isImageGen) {
      description = `High-definition image generation and synthesis model (${providerId}).`;
    } else if (isReasoning) {
      description = `Advanced chain-of-thought reasoning model with ${contextWindow ? `${(contextWindow / 1000).toFixed(0)}k` : 'optimized'} context capacity.`;
    } else if (isVision) {
      description = `Multimodal text and visual understanding model with ${contextWindow ? `${(contextWindow / 1000).toFixed(0)}k` : 'optimized'} context capacity.`;
    } else {
      description = `High-performance ${providerId} model with ${contextWindow ? `${(contextWindow / 1000).toFixed(0)}k` : 'standard'} context capacity.`;
    }
  }

  return {
    id: cleanId,
    name,
    provider: providerId,
    description,
    contextWindow: isVideoGen || isImageGen ? undefined : contextWindow,
    inputPrice,
    outputPrice,
    perUnitCost: isVideoGen ? 0.03 : isImageGen ? 0.03 : undefined,
    perUnitLabel: isVideoGen ? 'per video' : isImageGen ? 'per image' : undefined,
    isReasoning: isVideoGen || isImageGen ? false : isReasoning,
    isVision: isVision || isImageGen || isVideoGen,
    isImageGen,
    isVideoGen,
  };
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

  // Filter strictly to chat & text generation models
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
      const cleanId = (m.name || '').replace(/^models\//, '');
      return resolveModelDetails(cleanId, 'google', m);
    });

  // Standard verified active models
  const standardActiveModels = [
    resolveModelDetails('gemini-3.7-flash', 'google'),
    resolveModelDetails('gemini-3.6-flash', 'google'),
    resolveModelDetails('gemini-3.1-pro-preview', 'google'),
    resolveModelDetails('gemini-3.1-flash-lite', 'google'),
    resolveModelDetails('gemini-2.5-pro', 'google'),
    resolveModelDetails('gemini-2.5-flash-preview', 'google'),
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
      const isChat =
        id.startsWith('gpt-4') ||
        id.startsWith('gpt-3.5') ||
        id.startsWith('o1') ||
        id.startsWith('o3') ||
        id.startsWith('chatgpt-');
      return isChat;
    })
    .map((m: any) => resolveModelDetails(m.id, 'openai', m));

  // Standard verified active OpenAI models
  const standardActiveModels = [
    resolveModelDetails('gpt-4o', 'openai'),
    resolveModelDetails('gpt-4o-mini', 'openai'),
    resolveModelDetails('o3-mini', 'openai'),
    resolveModelDetails('o1', 'openai'),
    resolveModelDetails('o1-mini', 'openai'),
    resolveModelDetails('chatgpt-4o-latest', 'openai'),
    resolveModelDetails('gpt-4-turbo', 'openai'),
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
    resolveModelDetails('claude-3-7-sonnet-20250219', 'anthropic'),
    resolveModelDetails('claude-3-5-sonnet-20241022', 'anthropic'),
    resolveModelDetails('claude-3-5-haiku-20241022', 'anthropic'),
    resolveModelDetails('claude-3-opus-20240229', 'anthropic'),
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
          .map((m: any) => resolveModelDetails(m.id, 'anthropic', m));

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
    resolveModelDetails('deepseek-chat', 'deepseek'),
    resolveModelDetails('deepseek-reasoner', 'deepseek'),
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
          .map((m: any) => resolveModelDetails(m.id, 'deepseek', m));

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
    .map((m: any) => resolveModelDetails(m.id, 'groq', m));

  const standardActiveModels = [
    resolveModelDetails('llama-3.3-70b-versatile', 'groq'),
    resolveModelDetails('deepseek-r1-distill-llama-70b', 'groq'),
    resolveModelDetails('llama-3.1-8b-instant', 'groq'),
    resolveModelDetails('llama-3.2-11b-vision-preview', 'groq'),
    resolveModelDetails('qwen-2.5-coder-32b', 'groq'),
    resolveModelDetails('mixtral-8x7b-32768', 'groq'),
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
    .map((m: any) => resolveModelDetails(m.id, 'openrouter', m));

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
    .map((m: any) => resolveModelDetails(m.id, 'mistral', m));

  const standardActiveModels = [
    resolveModelDetails('mistral-large-latest', 'mistral'),
    resolveModelDetails('codestral-latest', 'mistral'),
    resolveModelDetails('mistral-small-latest', 'mistral'),
    resolveModelDetails('pixtral-12b-2409', 'mistral'),
    resolveModelDetails('ministral-8b-latest', 'mistral'),
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
    resolveModelDetails('grok-2-latest', 'xai'),
    resolveModelDetails('grok-3-mini', 'xai'),
    resolveModelDetails('grok-3', 'xai'),
    resolveModelDetails('grok-2-vision-latest', 'xai'),
    resolveModelDetails('grok-beta', 'xai'),
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
          .map((m: any) => resolveModelDetails(m.id, 'xai', m));

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
          return resolveModelDetails(id, 'custom', typeof m === 'object' ? m : undefined);
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
    resolveModelDetails('default', 'custom'),
    resolveModelDetails('deepseek-ai/DeepSeek-V3', 'custom'),
    resolveModelDetails('deepseek-ai/DeepSeek-R1', 'custom'),
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
    const { providerId, customBaseUrl } = req.body;
    const apiKey = extractRequestApiKey(req);
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
    const { providerId, customBaseUrl } = req.body;
    const apiKey = extractRequestApiKey(req);
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
    const { conversation, customBaseUrl } = req.body;
    const apiKey = extractRequestApiKey(req);
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
