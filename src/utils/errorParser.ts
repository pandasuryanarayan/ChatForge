export interface FormattedError {
  title: string;
  message: string;
  code?: string | number;
  status?: string;
  suggestion?: string;
  type: 'overloaded' | 'quota' | 'auth' | 'not_found' | 'blocked' | 'network' | 'generic';
  raw?: string;
}

/**
 * Recursively unwraps stringified JSON and nested error objects
 * into a clean, flat string or object.
 */
function unwrapNestedJson(input: any): any {
  if (!input) return input;

  if (typeof input === 'string') {
    const trimmed = input.trim();
    // Check if it looks like JSON
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        const parsed = JSON.parse(trimmed);
        return unwrapNestedJson(parsed);
      } catch {
        return trimmed;
      }
    }
    // Check if string contains "[GoogleGenerativeAI Error]: { ... }"
    const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return unwrapNestedJson(parsed);
      } catch {
        return trimmed;
      }
    }
    return trimmed;
  }

  if (typeof input === 'object') {
    // Check nested message or error fields
    if (input.error) {
      const nested = unwrapNestedJson(input.error);
      if (typeof nested === 'object' && nested !== null) {
        return { ...input, ...nested, error: nested };
      }
    }
    if (typeof input.message === 'string') {
      const unwrappedMsg = unwrapNestedJson(input.message);
      if (typeof unwrappedMsg === 'object' && unwrappedMsg !== null) {
        return { ...input, ...unwrappedMsg };
      }
    }
    return input;
  }

  return input;
}

/**
 * Parses any error into a human-friendly, structured FormattedError object.
 */
export function parseApiError(error: any): FormattedError {
  const rawString = typeof error === 'string' ? error : error?.message || JSON.stringify(error) || 'Unknown error';
  const unwrapped = unwrapNestedJson(error);

  let rawMessage = '';
  let code: string | number | undefined = undefined;
  let status: string | undefined = undefined;

  if (typeof unwrapped === 'string') {
    rawMessage = unwrapped;
  } else if (typeof unwrapped === 'object' && unwrapped !== null) {
    code = unwrapped.code || unwrapped.status_code || unwrapped.statusCode || unwrapped.error?.code;
    status = unwrapped.status || unwrapped.error?.status;
    rawMessage =
      unwrapped.message ||
      unwrapped.error?.message ||
      unwrapped.error_description ||
      unwrapped.description ||
      rawString;
  }

  // Double check if rawMessage is stringified JSON
  if (typeof rawMessage === 'string' && (rawMessage.includes('{') || rawMessage.includes('}'))) {
    try {
      const reUnwrapped = unwrapNestedJson(rawMessage);
      if (typeof reUnwrapped === 'object' && reUnwrapped !== null) {
        rawMessage = reUnwrapped.message || reUnwrapped.error?.message || rawMessage;
        code = code || reUnwrapped.code || reUnwrapped.error?.code;
        status = status || reUnwrapped.status || reUnwrapped.error?.status;
      }
    } catch {
      // keep rawMessage as is
    }
  }

  const msgLower = (String(rawMessage) + ' ' + String(status || '')).toLowerCase();

  // 1. High Demand / 503 Overloaded
  if (
    code === 503 ||
    code === '503' ||
    msgLower.includes('503') ||
    msgLower.includes('high demand') ||
    msgLower.includes('temporarily unavailable') ||
    msgLower.includes('spikes in demand') ||
    msgLower.includes('overloaded') ||
    status === 'UNAVAILABLE'
  ) {
    return {
      title: 'Model Temporarily Overloaded',
      message: 'The AI provider is experiencing high traffic spikes right now. This is temporary and usually clears in a few seconds.',
      code: code || 503,
      status: status || '503 Service Unavailable',
      suggestion: 'Click "Retry Request" below to try again, or switch to an alternate model.',
      type: 'overloaded',
      raw: rawString,
    };
  }

  // 2. 429 Rate Limit / Quota Exceeded
  if (
    code === 429 ||
    code === '429' ||
    msgLower.includes('429') ||
    msgLower.includes('rate limit') ||
    msgLower.includes('quota') ||
    msgLower.includes('resource_exhausted') ||
    msgLower.includes('too many requests')
  ) {
    return {
      title: 'Rate Limit or Quota Exceeded',
      message: 'You have reached the API rate limit or billing quota for this model or API key.',
      code: code || 429,
      status: status || '429 Too Many Requests',
      suggestion: 'Wait a few seconds before sending another message, or verify your account balance and billing tier.',
      type: 'quota',
      raw: rawString,
    };
  }

  // 3. 401 / 403 Authentication / Invalid Key
  if (
    code === 401 ||
    code === '401' ||
    code === 403 ||
    code === '403' ||
    msgLower.includes('api key not valid') ||
    msgLower.includes('unauthenticated') ||
    msgLower.includes('invalid api key') ||
    msgLower.includes('permission_denied') ||
    msgLower.includes('unauthorized')
  ) {
    return {
      title: 'Invalid or Missing API Key',
      message: 'Authentication failed. The API key configured for this provider is invalid, expired, or missing required permissions.',
      code: code || 401,
      status: status || '401 Unauthorized',
      suggestion: 'Click "Update API Key" below to enter a valid key in Key Settings.',
      type: 'auth',
      raw: rawString,
    };
  }

  // 4. 404 Model Not Found
  if (
    code === 404 ||
    code === '404' ||
    msgLower.includes('not found') ||
    msgLower.includes('is not found for api version') ||
    msgLower.includes('model_not_found')
  ) {
    return {
      title: 'Model Not Found or Inaccessible',
      message: `The requested model (${String(rawMessage).replace(/^models\//, '')}) could not be located or is not enabled for your account tier.`,
      code: code || 404,
      status: status || '404 Not Found',
      suggestion: 'Click "Switch Model" below to choose from the list of verified active models.',
      type: 'not_found',
      raw: rawString,
    };
  }

  // 5. Safety Block
  if (msgLower.includes('safety') || msgLower.includes('blocked') || msgLower.includes('content filter')) {
    return {
      title: 'Safety Filter Triggered',
      message: 'The model flagged the prompt or generated response under its safety policy guidelines.',
      code: code || 400,
      status: status || 'Blocked by Policy',
      suggestion: 'Try adjusting or rephrasing your prompt to avoid policy triggers.',
      type: 'blocked',
      raw: rawString,
    };
  }

  // 6. Network / Abort
  if (msgLower.includes('failed to fetch') || msgLower.includes('network') || msgLower.includes('connection refused')) {
    return {
      title: 'Network Connection Issue',
      message: 'Unable to establish a connection to the provider API endpoint.',
      code: 'NETWORK_ERR',
      status: 'Connection Failed',
      suggestion: 'Check your internet connection or verify custom endpoint URLs.',
      type: 'network',
      raw: rawString,
    };
  }

  // 7. Generic Fallback
  return {
    title: 'Generation Error',
    message: String(rawMessage).trim() || 'An unexpected error occurred while communicating with the AI model.',
    code: code,
    status: status,
    suggestion: 'Try clicking "Retry Request" or check your model configuration.',
    type: 'generic',
    raw: rawString,
  };
}
