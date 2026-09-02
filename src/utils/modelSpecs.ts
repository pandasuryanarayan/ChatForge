import { ModelInfo, ProviderId } from '../types';

interface ModelSpecOverride {
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

// Known exact specifications for models across providers
const EXACT_MODEL_SPECS: Record<string, ModelSpecOverride> = {
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
    description: 'Fast reasoning model optimized for competitive programming and STEM tasks.',
    contextWindow: 128000,
    inputPrice: 1.1,
    outputPrice: 4.4,
    isReasoning: true,
    isVision: false,
  },
  'o1-preview': {
    name: 'o1-preview',
    description: 'Preview reasoning model for complex multistep reasoning.',
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
 * Humanizes context window sizes cleanly (e.g. 512,000 / 524,288 -> '512k', 1,000,000 / 1,048,576 -> '1M', 128,000 -> '128k')
 */
export function formatContextWindow(tokens?: number): string {
  if (!tokens || tokens <= 0) return 'Standard';

  // 1M and 2M+ checks
  if (tokens >= 1000000 || tokens === 1048576 || tokens === 2097152) {
    if (tokens === 1048576 || tokens === 1000000) return '1M';
    if (tokens === 2097152 || tokens === 2000000) return '2M';
    const m = tokens / 1000000;
    return `${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`;
  }

  // 512k checks (both power-of-2 and decimal variants)
  if (tokens === 524288 || tokens === 512000 || tokens === 500000) {
    return '512k';
  }

  // 256k checks
  if (tokens === 262144 || tokens === 256000) {
    return '256k';
  }

  // 200k checks
  if (tokens === 200000) {
    return '200k';
  }

  // 128k / 131k checks
  if (tokens === 128000 || tokens === 131072) {
    return '128k';
  }

  // 64k / 65k checks
  if (tokens === 64000 || tokens === 65536) {
    return '64k';
  }

  // 32k checks
  if (tokens === 32000 || tokens === 32768) {
    return '32k';
  }

  // 16k checks
  if (tokens === 16000 || tokens === 16384 || tokens === 16385) {
    return '16k';
  }

  // 8k checks
  if (tokens === 8000 || tokens === 8192) {
    return '8k';
  }

  // 4k checks
  if (tokens === 4000 || tokens === 4096) {
    return '4k';
  }

  // General fallback
  if (tokens >= 1000) {
    if (tokens % 1024 === 0) {
      return `${tokens / 1024}k`;
    }
    return `${Math.round(tokens / 1000)}k`;
  }

  return `${tokens}`;
}

/**
 * Intelligent heuristics to deduce exact real context window & model details
 * for models dynamically discovered from provider APIs or custom local engines (Ollama, LM Studio, vLLM).
 */
export function deduceModelDetails(
  modelId: string,
  providerId: ProviderId,
  rawApiResponse?: any
): ModelInfo {
  const cleanId = (modelId || '').replace(/^models\//, '').trim();
  const lowerId = cleanId.toLowerCase();
  const lowerName = (rawApiResponse?.displayName || rawApiResponse?.name || '').toLowerCase();

  // 1. Check if model is a specialized media generation model
  const isVideoGen =
    Boolean(EXACT_MODEL_SPECS[cleanId]?.isVideoGen) ||
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
    (Boolean(EXACT_MODEL_SPECS[cleanId]?.isImageGen) ||
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
  if (EXACT_MODEL_SPECS[cleanId]) {
    const spec = EXACT_MODEL_SPECS[cleanId];
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

  // 5. Authentic context window resolution for language/chat models
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
      description = `Advanced chain-of-thought reasoning model with ${contextWindow ? formatContextWindow(contextWindow) : 'optimized'} context window.`;
    } else if (isVision) {
      description = `Multimodal text and image understanding model with ${contextWindow ? formatContextWindow(contextWindow) : 'optimized'} context window.`;
    } else {
      description = `High-performance ${providerId} model with ${contextWindow ? formatContextWindow(contextWindow) : 'standard'} context capacity.`;
    }
  }

  return {
    id: cleanId,
    name,
    provider: providerId,
    description,
    contextWindow,
    inputPrice,
    outputPrice,
    isReasoning,
    isVision: isVision || isImageGen || isVideoGen,
    isImageGen,
    isVideoGen,
  };
}

/**
 * Ensures any ModelInfo (e.g. from local storage, cache, or dynamic API)
 * is comprehensively enriched with proper isVideoGen, isImageGen, pricing, and architecture badges.
 */
export function enrichModelInfo(model: ModelInfo): ModelInfo {
  const cleanId = (model.id || '').replace(/^models\//, '').trim();
  const lowerId = cleanId.toLowerCase();
  const lowerName = (model.name || '').toLowerCase();
  const lowerDesc = (model.description || '').toLowerCase();

  const isVideoGen =
    Boolean(model.isVideoGen) ||
    Boolean(EXACT_MODEL_SPECS[cleanId]?.isVideoGen) ||
    lowerId.includes('video') ||
    lowerName.includes('video') ||
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
    lowerDesc.includes('video generation') ||
    lowerDesc.includes('video synthesis') ||
    lowerDesc.includes('text-to-video') ||
    lowerDesc.includes('image-to-video') ||
    lowerDesc.includes('generates video');

  const isImageGen =
    !isVideoGen &&
    (Boolean(model.isImageGen) ||
      Boolean(EXACT_MODEL_SPECS[cleanId]?.isImageGen) ||
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
      lowerDesc.includes('image generation') ||
      lowerDesc.includes('image synthesis') ||
      lowerDesc.includes('text-to-image') ||
      lowerDesc.includes('generates image') ||
      lowerDesc.includes('photorealistic image'));

  const spec = EXACT_MODEL_SPECS[cleanId];

  return {
    ...model,
    isVideoGen,
    isImageGen,
    contextWindow: isVideoGen || isImageGen ? undefined : (model.contextWindow || spec?.contextWindow),
    perUnitCost: model.perUnitCost ?? spec?.perUnitCost ?? (isVideoGen ? 0.03 : isImageGen ? 0.03 : undefined),
    perUnitLabel: model.perUnitLabel ?? spec?.perUnitLabel ?? (isVideoGen ? 'per video' : isImageGen ? 'per image' : undefined),
    isVision: model.isVision ?? (isVideoGen || isImageGen ? true : spec?.isVision),
    isReasoning: isVideoGen || isImageGen ? false : (model.isReasoning ?? spec?.isReasoning ?? false),
  };
}
