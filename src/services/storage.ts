import {
  AppSettings,
  Conversation,
  Message,
  ModelInfo,
  ProviderCredential,
  ProviderId,
} from '../types';
import { DEFAULT_SYSTEM_PROMPTS } from '../constants/providers';
import { encryptForStorage, decryptFromStorage } from '../utils/security';

const KEYS_STORAGE_KEY = 'chatforge_credentials_v1';
const CONVERSATIONS_STORAGE_KEY = 'chatforge_conversations_v1';
const SETTINGS_STORAGE_KEY = 'chatforge_settings_v1';
const ACTIVE_CONV_ID_KEY = 'chatforge_active_conv_id';
const AVAILABLE_MODELS_STORAGE_KEY = 'chatforge_available_models_v1';

// In-memory store for session-only keys
const sessionCredentials: Partial<Record<ProviderId, ProviderCredential>> = {};

export const defaultSettings: AppSettings = {
  theme: 'dark',
  fontSize: 'md',
  activeProvider: 'google',
  activeModel: 'gemini-3.7-flash',
  pinnedModels: [
    'gemini-3.7-flash',
    'gpt-4o',
    'claude-3-7-sonnet-20250219',
    'deepseek-reasoner',
    'llama-3.3-70b-versatile',
  ],
  systemPrompts: DEFAULT_SYSTEM_PROMPTS,
  streamEnabled: true,
  codeWrap: true,
};

// Storage Helpers
export function loadCredentials(): Record<ProviderId, ProviderCredential> {
  let stored: Record<string, ProviderCredential> = {};
  try {
    const raw = localStorage.getItem(KEYS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      for (const [provider, cred] of Object.entries(parsed)) {
        if (cred && typeof cred === 'object') {
          const typedCred = cred as ProviderCredential;
          stored[provider] = {
            ...typedCred,
            apiKey: decryptFromStorage(typedCred.apiKey || ''),
          };
        }
      }
    }
  } catch (e) {
    console.error('Failed to load credentials from localStorage', e);
  }

  // Merge with session-only keys
  const merged: Record<string, ProviderCredential> = { ...stored };
  for (const [provider, cred] of Object.entries(sessionCredentials)) {
    if (cred) {
      merged[provider] = cred;
    }
  }

  return merged as Record<ProviderId, ProviderCredential>;
}

export function saveCredential(
  providerId: ProviderId,
  credential: ProviderCredential
): void {
  if (credential.isSessionOnly) {
    sessionCredentials[providerId] = credential;
    // Ensure not lingering in localStorage
    try {
      const raw = localStorage.getItem(KEYS_STORAGE_KEY);
      if (raw) {
        const stored = JSON.parse(raw);
        delete stored[providerId];
        localStorage.setItem(KEYS_STORAGE_KEY, JSON.stringify(stored));
      }
    } catch (e) {
      console.error(e);
    }
  } else {
    // Remove from session
    delete sessionCredentials[providerId];
    try {
      const raw = localStorage.getItem(KEYS_STORAGE_KEY);
      const stored = raw ? JSON.parse(raw) : {};
      stored[providerId] = {
        ...credential,
        apiKey: encryptForStorage(credential.apiKey || ''),
      };
      localStorage.setItem(KEYS_STORAGE_KEY, JSON.stringify(stored));
    } catch (e) {
      console.error('Failed to save credential to localStorage', e);
    }
  }
}

export function removeCredential(providerId: ProviderId): void {
  delete sessionCredentials[providerId];
  try {
    const raw = localStorage.getItem(KEYS_STORAGE_KEY);
    if (raw) {
      const stored = JSON.parse(raw);
      delete stored[providerId];
      localStorage.setItem(KEYS_STORAGE_KEY, JSON.stringify(stored));
    }
  } catch (e) {
    console.error(e);
  }
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      return { ...defaultSettings, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.error(e);
  }
  return defaultSettings;
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error(e);
  }
}

export function loadConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(CONVERSATIONS_STORAGE_KEY);
    if (raw) {
      const parsed: Conversation[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
          .map((c) => ({
            ...c,
            messages: Array.isArray(c.messages) ? c.messages : [],
          }))
          .sort((a, b) => b.updatedAt - a.updatedAt);
      }
    }
  } catch (e) {
    console.error(e);
  }
  const initial = createNewConversation('google', 'gemini-3.7-flash', DEFAULT_SYSTEM_PROMPTS[0].prompt);
  return [initial];
}

export function saveConversations(conversations: Conversation[]): void {
  try {
    localStorage.setItem(CONVERSATIONS_STORAGE_KEY, JSON.stringify(conversations));
  } catch (e) {
    console.error('Failed to save conversations', e);
  }
}

export function loadActiveConversationId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_CONV_ID_KEY);
  } catch (e) {
    return null;
  }
}

export function saveActiveConversationId(id: string | null): void {
  try {
    if (id) {
      localStorage.setItem(ACTIVE_CONV_ID_KEY, id);
    } else {
      localStorage.removeItem(ACTIVE_CONV_ID_KEY);
    }
  } catch (e) {}
}

export function createNewConversation(
  providerId: ProviderId,
  modelId: string,
  systemPrompt?: string
): Conversation {
  const now = Date.now();
  return {
    id: `conv_${now}_${Math.random().toString(36).substring(2, 9)}`,
    title: 'New Conversation',
    systemPrompt: systemPrompt || DEFAULT_SYSTEM_PROMPTS[0].prompt,
    temperature: 0.7,
    maxTokens: 4096,
    topP: 1.0,
    modelId,
    providerId,
    messages: [],
    createdAt: now,
    updatedAt: now,
    isPinned: false,
  };
}

export function exportAllData(): string {
  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: loadSettings(),
    conversations: loadConversations(),
  };
  return JSON.stringify(data, null, 2);
}

export function importData(jsonString: string): { success: boolean; message: string } {
  try {
    const data = JSON.parse(jsonString);
    if (data.conversations && Array.isArray(data.conversations)) {
      saveConversations(data.conversations);
    }
    if (data.settings) {
      saveSettings({ ...defaultSettings, ...data.settings });
    }
    return { success: true, message: `Imported ${data.conversations?.length || 0} conversations successfully.` };
  } catch (e: any) {
    return { success: false, message: e.message || 'Invalid JSON file format' };
  }
}

export function clearAllLocalData(): void {
  try {
    localStorage.removeItem(KEYS_STORAGE_KEY);
    localStorage.removeItem(CONVERSATIONS_STORAGE_KEY);
    localStorage.removeItem(SETTINGS_STORAGE_KEY);
    localStorage.removeItem(ACTIVE_CONV_ID_KEY);
    localStorage.removeItem(AVAILABLE_MODELS_STORAGE_KEY);
    // Clear session credentials
    for (const key of Object.keys(sessionCredentials)) {
      delete sessionCredentials[key as ProviderId];
    }
  } catch (e) {
    console.error(e);
  }
}

export function loadAvailableModels(): ModelInfo[] {
  try {
    const raw = localStorage.getItem(AVAILABLE_MODELS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load available models from storage', e);
  }
  return [];
}

export function saveAvailableModels(models: ModelInfo[]): void {
  try {
    if (Array.isArray(models)) {
      localStorage.setItem(AVAILABLE_MODELS_STORAGE_KEY, JSON.stringify(models));
    }
  } catch (e) {
    console.error('Failed to save available models to storage', e);
  }
}
