# ChatForge ⚡

**ChatForge** is a fast, modern, privacy-first **Bring-Your-Own-Key (BYOK)** AI chat client. Connect directly to leading frontier AI models—including OpenAI, Anthropic Claude, Google Gemini, DeepSeek, Groq, Mistral, xAI, and OpenRouter—or connect to your own custom/local endpoints (Ollama, LM Studio, vLLM) with zero middleman markup.

---

## 🌟 Key Features

- **🔒 100% Client-Side Privacy (BYOK)**: Your API keys and conversation histories are stored directly in your browser's `localStorage`. Keys are never stored on third-party servers.
- **⚡ Multi-Provider Architecture**: Seamlessly switch between or compare models from:
  - **OpenAI**: GPT-4o, GPT-4o mini, o1, o3-mini, GPT-4 Turbo
  - **Anthropic Claude**: Claude 3.7 Sonnet, Claude 3.5 Sonnet, Claude 3.5 Haiku, Claude 3 Opus
  - **Google Gemini**: Gemini 3.7 Flash, Gemini 3.6 Flash, Gemini 3.1 Pro Preview, Gemini 3.1 Flash Lite, Gemini 2.5 Pro
  - **Groq**: Llama 3.3 70B, DeepSeek R1 (70B Distill), Llama 3.1 8B Instant (500+ tokens/sec)
  - **DeepSeek**: DeepSeek R1, DeepSeek V3
  - **Mistral AI**: Mistral Large 2, Codestral, Pixtral Large, Mistral NeMo, Mistral Small
  - **xAI**: Grok 2, Grok 2 Vision, Grok Beta
  - **OpenRouter**: Access 200+ models via a single API key
  - **Custom / Local Endpoints**: Connect to local Ollama, LM Studio, vLLM, or self-hosted OpenAI-compatible servers.
- **🌊 Ultra-Smooth Real-Time Streaming**: Live Server-Sent Events (SSE) token streaming with live tokens-per-second performance metrics.
- **📊 Real-Time Cost & Token Tracking**: Dynamic prompt & completion token counting with exact price estimation per model.
- **⚙️ Deep Parameter Customization**: Configure temperature, top-p, max output tokens, reasoning effort, and custom system instructions per chat or globally.
- **📝 Rich Markdown & Code Highlighting**: GFM markdown, code block syntax highlighting, one-click copy, and table rendering.
- **💾 Conversation Management**:
  - Search and filter chat history
  - Pin important conversations
  - Export chat transcripts as Markdown or JSON
  - Full backup & restore (import/export all keys, conversations, and settings)
- **🎨 Bento Grid UI & Dark Mode**: Sleek dark aesthetic built with Tailwind CSS, animated with Motion, and adorned with custom brand iconography.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite 6
- **Styling & UI**: Tailwind CSS v4, Motion, Lucide React
- **Backend / Proxy**: Node.js, Express, `tsx`, `esbuild`
- **Markdown**: `react-markdown`, `remark-gfm`
- **AI SDK**: `@google/genai` for server-side Gemini integration, native fetch for streaming REST endpoints

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (version 18+ or 20+ recommended)
- `npm` or `pnpm` / `yarn`

### Installation

1. Clone or download the repository:
   ```bash
   git clone https://github.com/your-username/chatforge.git
   cd chatforge
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. (Optional) Set up server environment variables:
   Copy `.env.example` to `.env` if you wish to configure default server-side Gemini API keys:
   ```bash
   cp .env.example .env
   ```

---

## 💻 Development & Scripts

- **Start Development Server**:
  ```bash
  npm run dev
  ```
  Runs the full-stack server on `http://localhost:3000` with hot TypeScript execution via `tsx`.

- **Type Check & Lint**:
  ```bash
  npm run lint
  ```

- **Build for Production**:
  ```bash
  npm run build
  ```
  Builds the client application with Vite and bundles `server.ts` into a self-contained production bundle in `dist/server.cjs`.

- **Start Production Server**:
  ```bash
  npm start
  ```

---

## 🔑 Adding API Keys

When you first open **ChatForge**, click on the **Key Icon** in the navigation bar or select any model to open the Provider Setup dialog:

1. Select your AI provider (e.g. Google Gemini, Anthropic, OpenAI, Groq, etc.).
2. Enter your API key (links to each provider's developer console are provided in the UI).
3. (Optional) For Custom/Local providers, enter your endpoint base URL (e.g. `http://localhost:11434/v1` for Ollama).
4. Click **Save & Connect**. Your key is securely stored in your local browser cache.

---

## 🛡️ Security & Privacy

- **🔐 End-to-End In-Transit Encryption**: API keys in all chat streaming payloads, model discovery calls, and key validation tests are automatically encrypted using a nonce-salted transit cipher (`cf_enc_v1`), ensuring keys are never transmitted in cleartext.
- **💼 Encrypted Browser Vault**: API keys stored in `localStorage` are automatically encrypted at rest (`cf_vault_v1`) to protect against browser inspection and rogue script snooping.
- **⚡ Session-Only Memory Mode**: Toggle session-only keys to store credentials exclusively in volatile memory that vanish automatically when the browser tab closes.
- **🚫 Zero Server-Side Persistence**: Keys are never written to server disk or database; server proxies decrypt solely in volatile memory during the active request to upstream providers.
- **No telemetry, third-party trackers, or profiling**: 100% private, client-first architecture.

---

## 📄 License

MIT License. Free to use, modify, and distribute.
