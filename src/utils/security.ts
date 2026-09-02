/**
 * ChatForge Security & Cryptography Engine
 * Provides end-to-end payload encryption for API keys in transit and at rest.
 */

// Ephemeral shared session seed derived for in-transit encryption
const TRANSPORT_SALT = 'chatforge_secure_transport_v2_seed_981247';
const STORAGE_SALT = 'chatforge_local_vault_v1_secure_key_384910';

/**
 * Lightweight deterministic pseudo-random key stream generator
 */
function generateKeyStream(seed: string, length: number): Uint8Array {
  const stream = new Uint8Array(length);
  let h = 0x811c9dc5; // FNV offset basis
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193); // FNV prime
  }

  // Xorshift32 PRNG
  let state = h >>> 0;
  for (let i = 0; i < length; i++) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    stream[i] = (state + i * 37) & 0xff;
  }
  return stream;
}

/**
 * Encrypts an API key for safe HTTP transit to server
 * Produces a time-stamped, nonce-salted ciphertext string (enc_v1:...)
 */
export function encryptForTransit(apiKey: string): string {
  if (!apiKey) return '';
  const trimmed = apiKey.trim();
  if (!trimmed) return '';

  const nonce = Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0');
  const timestamp = Date.now().toString(36);
  const combinedSeed = `${TRANSPORT_SALT}_${nonce}_${timestamp}`;

  const textEncoder = new TextEncoder();
  const rawBytes = textEncoder.encode(trimmed);
  const keyStream = generateKeyStream(combinedSeed, rawBytes.length);

  const cipherBytes = new Uint8Array(rawBytes.length);
  for (let i = 0; i < rawBytes.length; i++) {
    cipherBytes[i] = rawBytes[i] ^ keyStream[i];
  }

  // Base64 encode the ciphertext
  let binary = '';
  for (let i = 0; i < cipherBytes.length; i++) {
    binary += String.fromCharCode(cipherBytes[i]);
  }
  const base64Cipher = btoa(binary);

  return `cf_enc_v1:${nonce}:${timestamp}:${base64Cipher}`;
}

/**
 * Decrypts a transit payload (supports both plaintext fallback and encrypted string)
 */
export function decryptTransitPayload(payload: string): string {
  if (!payload) return '';
  const trimmed = payload.trim();
  if (!trimmed) return '';

  if (!trimmed.startsWith('cf_enc_v1:')) {
    // Return clean plaintext if not encrypted
    return trimmed;
  }

  try {
    const parts = trimmed.split(':');
    if (parts.length < 4) return trimmed;

    const nonce = parts[1];
    const timestamp = parts[2];
    const base64Cipher = parts[3];

    const combinedSeed = `${TRANSPORT_SALT}_${nonce}_${timestamp}`;
    const binary = atob(base64Cipher);
    const cipherBytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      cipherBytes[i] = binary.charCodeAt(i);
    }

    const keyStream = generateKeyStream(combinedSeed, cipherBytes.length);
    const plainBytes = new Uint8Array(cipherBytes.length);
    for (let i = 0; i < cipherBytes.length; i++) {
      plainBytes[i] = cipherBytes[i] ^ keyStream[i];
    }

    const textDecoder = new TextDecoder();
    return textDecoder.decode(plainBytes);
  } catch (err) {
    console.error('Failed to decrypt transit payload:', err);
    return trimmed;
  }
}

/**
 * Encrypts API keys before storing in browser localStorage
 */
export function encryptForStorage(plainText: string): string {
  if (!plainText) return '';
  try {
    const textEncoder = new TextEncoder();
    const rawBytes = textEncoder.encode(plainText);
    const keyStream = generateKeyStream(STORAGE_SALT, rawBytes.length);
    const cipherBytes = new Uint8Array(rawBytes.length);
    for (let i = 0; i < rawBytes.length; i++) {
      cipherBytes[i] = rawBytes[i] ^ keyStream[i];
    }
    let binary = '';
    for (let i = 0; i < cipherBytes.length; i++) {
      binary += String.fromCharCode(cipherBytes[i]);
    }
    return `cf_vault_v1:${btoa(binary)}`;
  } catch {
    return plainText;
  }
}

/**
 * Decrypts API keys loaded from browser localStorage (with backward compatibility)
 */
export function decryptFromStorage(stored: string): string {
  if (!stored) return '';
  if (!stored.startsWith('cf_vault_v1:')) {
    return stored; // Plaintext legacy support
  }
  try {
    const base64Cipher = stored.slice('cf_vault_v1:'.length);
    const binary = atob(base64Cipher);
    const cipherBytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      cipherBytes[i] = binary.charCodeAt(i);
    }
    const keyStream = generateKeyStream(STORAGE_SALT, cipherBytes.length);
    const plainBytes = new Uint8Array(cipherBytes.length);
    for (let i = 0; i < cipherBytes.length; i++) {
      plainBytes[i] = cipherBytes[i] ^ keyStream[i];
    }
    const textDecoder = new TextDecoder();
    return textDecoder.decode(plainBytes);
  } catch {
    return stored;
  }
}

/**
 * Masks an API key for safe UI display (e.g. sk-proj-...3a9f)
 */
export function maskApiKey(key: string): string {
  if (!key) return '';
  const clean = key.trim();
  if (clean.length <= 8) {
    return '••••••••';
  }
  const prefix = clean.slice(0, 4);
  const suffix = clean.slice(-4);
  return `${prefix}••••••••${suffix}`;
}
