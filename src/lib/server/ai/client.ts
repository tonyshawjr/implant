/**
 * AI Client Configuration
 *
 * Provides a unified interface for AI model interactions with support for:
 * - Claude API (primary)
 * - OpenAI API (fallback)
 * - Rate limiting and retry logic
 * - Token counting utilities
 * - Mock responses for development
 */

import { env } from '$env/dynamic/private';
import { prisma } from '$lib/server/db';

// Cache for API keys from database (refresh every 5 minutes)
let apiKeyCache: { keys: Record<string, string>; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Gets an API key, checking database first then falling back to environment variable
 */
async function getApiKey(keyName: 'claude_api_key' | 'openai_api_key'): Promise<string | null> {
  // Check cache first
  if (apiKeyCache && Date.now() - apiKeyCache.timestamp < CACHE_TTL) {
    if (apiKeyCache.keys[keyName]) {
      return apiKeyCache.keys[keyName];
    }
  }

  // Refresh cache from database
  try {
    const settings = await prisma.systemSetting.findMany({
      where: {
        key: { in: ['claude_api_key', 'openai_api_key'] }
      }
    });

    const keys: Record<string, string> = {};
    for (const setting of settings) {
      const value = setting.value as { key?: string } | null;
      if (value?.key) {
        keys[setting.key] = value.key;
      }
    }
    apiKeyCache = { keys, timestamp: Date.now() };

    if (keys[keyName]) {
      return keys[keyName];
    }
  } catch (error) {
    console.error('Failed to fetch API keys from database:', error);
  }

  // Fall back to environment variable
  const envKey = keyName === 'claude_api_key' ? env.CLAUDE_API_KEY : env.OPENAI_API_KEY;
  return envKey || null;
}

/**
 * Clears the API key cache (call after updating keys)
 */
export function clearApiKeyCache(): void {
  apiKeyCache = null;
}

// =============================================================================
// Types
// =============================================================================

export type AIProvider = 'claude' | 'openai';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AICompletionOptions {
  provider?: AIProvider;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  stream?: boolean;
}

export interface AICompletionResponse {
  success: boolean;
  content?: string;
  tokensUsed?: {
    input: number;
    output: number;
    total: number;
  };
  model?: string;
  provider?: AIProvider;
  error?: {
    code: string;
    message: string;
  };
}

export interface TokenCount {
  estimated: number;
  method: 'exact' | 'approximation';
}

// =============================================================================
// Configuration
// =============================================================================

const DEFAULT_CONFIG = {
  claude: {
    model: 'claude-3-5-sonnet-20241022',
    maxTokens: 4096,
    temperature: 0.7
  },
  openai: {
    model: 'gpt-4-turbo-preview',
    maxTokens: 4096,
    temperature: 0.7
  }
} as const;

// Rate limiting configuration
const RATE_LIMIT = {
  maxRequestsPerMinute: 50,
  maxTokensPerMinute: 100000,
  retryAttempts: 3,
  retryDelayMs: 1000
};

// In-memory rate limit tracking (would use Redis in production)
const rateLimitState = {
  requestCount: 0,
  tokenCount: 0,
  windowStart: Date.now()
};

// =============================================================================
// Mock Responses (Development Mode)
// =============================================================================

// Check if we should use mock mode (no API keys available)
async function shouldUseMock(): Promise<boolean> {
  const claudeKey = await getApiKey('claude_api_key');
  const openaiKey = await getApiKey('openai_api_key');
  return !claudeKey && !openaiKey;
}

/**
 * Generates mock AI responses for development/testing
 */
function generateMockResponse(messages: AIMessage[], options: AICompletionOptions): AICompletionResponse {
  const lastMessage = messages[messages.length - 1];
  const prompt = lastMessage?.content || '';

  // Estimate tokens for the mock response
  const inputTokens = estimateTokens(messages.map(m => m.content).join(' ')).estimated;

  // Generate contextual mock responses based on prompt content
  let content = '';

  if (prompt.toLowerCase().includes('analyze') && prompt.toLowerCase().includes('brand')) {
    content = JSON.stringify({
      tone: 'Professional and Caring',
      personality: 'Trustworthy Expert',
      formalityLevel: 'professional',
      targetAudience: 'Adults 45-70 seeking dental implant solutions',
      keyDifferentiators: [
        'Advanced technology',
        'Experienced specialists',
        'Patient comfort focus',
        'Comprehensive care'
      ],
      preferredTerms: [
        'dental implant specialist',
        'comfortable experience',
        'lasting results',
        'personalized care',
        'state-of-the-art'
      ],
      avoidTerms: [
        'cheap',
        'discount',
        'pain',
        'surgery',
        'invasive'
      ],
      voiceCharacteristics: {
        empathy: 0.85,
        authority: 0.80,
        warmth: 0.75,
        urgency: 0.40
      },
      communicationStyle: 'The brand communicates with a warm yet professional tone, emphasizing expertise while remaining approachable. Content focuses on patient outcomes and comfort rather than clinical procedures.'
    }, null, 2);
  } else if (prompt.toLowerCase().includes('generate') && prompt.toLowerCase().includes('headline')) {
    content = JSON.stringify([
      'Transform Your Smile with Confidence',
      'Experience the Difference Expert Care Makes',
      'Your Journey to a Complete Smile Starts Here',
      'Rediscover the Joy of Smiling',
      'Advanced Implant Solutions, Personalized for You'
    ], null, 2);
  } else if (prompt.toLowerCase().includes('generate') && prompt.toLowerCase().includes('ad copy')) {
    content = JSON.stringify([
      'Missing teeth shouldn\'t hold you back. Our experienced team combines advanced technology with personalized care to restore your smile and confidence. Schedule your free consultation today.',
      'You deserve a smile that feels natural. With over 20 years of implant expertise, we\'ve helped thousands rediscover the joy of eating, laughing, and living without limits.',
      'Ready for a lasting solution? Our state-of-the-art dental implants look, feel, and function like natural teeth. Experience the difference compassionate, expert care makes.'
    ], null, 2);
  } else if (prompt.toLowerCase().includes('generate') && prompt.toLowerCase().includes('cta')) {
    content = JSON.stringify([
      'Schedule Your Free Consultation',
      'Start Your Smile Journey',
      'Book Your Assessment Today',
      'Get Your Personalized Plan',
      'Take the First Step'
    ], null, 2);
  } else if (prompt.toLowerCase().includes('email')) {
    content = JSON.stringify({
      subject: 'Your Path to a Confident Smile',
      preview: 'Learn how dental implants can transform your life',
      body: `Dear [First Name],

Thank you for your interest in dental implants. We understand that considering dental work can feel overwhelming, which is why we're here to guide you every step of the way.

At [Practice Name], we believe everyone deserves a smile they can be proud of. Our experienced team has helped thousands of patients just like you rediscover the confidence that comes with a complete, natural-looking smile.

Here's what makes our approach different:
- Personalized treatment plans designed around your unique needs
- State-of-the-art technology for precise, comfortable procedures
- Dedicated care team supporting you from consultation to recovery

We'd love to answer your questions and explore whether dental implants are right for you. Your complimentary consultation includes a comprehensive exam and personalized treatment recommendation.

Ready to take the next step?

[Schedule Your Free Consultation Button]

We look forward to meeting you.

Warm regards,
[Practice Name] Team`
    }, null, 2);
  } else if (prompt.toLowerCase().includes('social')) {
    content = JSON.stringify([
      {
        platform: 'facebook',
        content: 'Missing teeth? You\'re not alone. Over 120 million Americans are missing at least one tooth. The good news? Modern dental implants look and feel completely natural. Ready to learn more? Link in bio.',
        hashtags: ['#dentalimplants', '#smilemakeover', '#dentalcare']
      },
      {
        platform: 'instagram',
        content: 'Every smile tells a story. Our patients\' transformations remind us why we love what we do. Swipe to see real results from real patients.',
        hashtags: ['#smiletransformation', '#dentalimplants', '#beforeandafter']
      }
    ], null, 2);
  } else {
    content = 'This is a mock AI response for development. Configure CLAUDE_API_KEY or OPENAI_API_KEY to enable real AI completions.';
  }

  const outputTokens = estimateTokens(content).estimated;

  return {
    success: true,
    content,
    tokensUsed: {
      input: inputTokens,
      output: outputTokens,
      total: inputTokens + outputTokens
    },
    model: 'mock-model',
    provider: 'claude'
  };
}

// =============================================================================
// Rate Limiting
// =============================================================================

/**
 * Checks if we're within rate limits
 */
function checkRateLimit(): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now();
  const windowDuration = 60000; // 1 minute

  // Reset window if expired
  if (now - rateLimitState.windowStart > windowDuration) {
    rateLimitState.requestCount = 0;
    rateLimitState.tokenCount = 0;
    rateLimitState.windowStart = now;
  }

  if (rateLimitState.requestCount >= RATE_LIMIT.maxRequestsPerMinute) {
    const retryAfterMs = windowDuration - (now - rateLimitState.windowStart);
    return { allowed: false, retryAfterMs };
  }

  if (rateLimitState.tokenCount >= RATE_LIMIT.maxTokensPerMinute) {
    const retryAfterMs = windowDuration - (now - rateLimitState.windowStart);
    return { allowed: false, retryAfterMs };
  }

  return { allowed: true };
}

/**
 * Updates rate limit counters
 */
function updateRateLimitCounters(tokensUsed: number): void {
  rateLimitState.requestCount++;
  rateLimitState.tokenCount += tokensUsed;
}

// =============================================================================
// Token Counting
// =============================================================================

/**
 * Estimates token count for a given text
 * Uses approximation: ~4 characters per token for English text
 */
export function estimateTokens(text: string): TokenCount {
  // Remove extra whitespace
  const cleanText = text.replace(/\s+/g, ' ').trim();

  // Approximation: ~4 characters per token (conservative estimate)
  const estimated = Math.ceil(cleanText.length / 4);

  return {
    estimated,
    method: 'approximation'
  };
}

/**
 * Estimates tokens for an array of messages
 */
export function estimateMessagesTokens(messages: AIMessage[]): TokenCount {
  let totalTokens = 0;

  for (const message of messages) {
    // Add overhead for role prefix
    totalTokens += 4; // Approximate overhead per message
    totalTokens += estimateTokens(message.content).estimated;
  }

  return {
    estimated: totalTokens,
    method: 'approximation'
  };
}

// =============================================================================
// Claude API
// =============================================================================

async function callClaudeAPI(
  messages: AIMessage[],
  options: AICompletionOptions
): Promise<AICompletionResponse> {
  const apiKey = await getApiKey('claude_api_key');

  if (!apiKey) {
    return {
      success: false,
      error: {
        code: 'NO_API_KEY',
        message: 'Claude API key not configured'
      }
    };
  }

  const model = options.model || DEFAULT_CONFIG.claude.model;
  const maxTokens = options.maxTokens || DEFAULT_CONFIG.claude.maxTokens;
  const temperature = options.temperature ?? DEFAULT_CONFIG.claude.temperature;

  // Separate system message from other messages
  const systemMessage = messages.find(m => m.role === 'system');
  const conversationMessages = messages.filter(m => m.role !== 'system');

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature,
        system: systemMessage?.content || options.systemPrompt,
        messages: conversationMessages.map(m => ({
          role: m.role,
          content: m.content
        }))
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: {
          code: `HTTP_${response.status}`,
          message: errorData.error?.message || `Claude API error: ${response.status}`
        }
      };
    }

    const data = await response.json();

    return {
      success: true,
      content: data.content?.[0]?.text || '',
      tokensUsed: {
        input: data.usage?.input_tokens || 0,
        output: data.usage?.output_tokens || 0,
        total: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
      },
      model: data.model,
      provider: 'claude'
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Failed to call Claude API'
      }
    };
  }
}

// =============================================================================
// OpenAI API
// =============================================================================

async function callOpenAIAPI(
  messages: AIMessage[],
  options: AICompletionOptions
): Promise<AICompletionResponse> {
  const apiKey = await getApiKey('openai_api_key');

  if (!apiKey) {
    return {
      success: false,
      error: {
        code: 'NO_API_KEY',
        message: 'OpenAI API key not configured'
      }
    };
  }

  const model = options.model || DEFAULT_CONFIG.openai.model;
  const maxTokens = options.maxTokens || DEFAULT_CONFIG.openai.maxTokens;
  const temperature = options.temperature ?? DEFAULT_CONFIG.openai.temperature;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content
        }))
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: {
          code: `HTTP_${response.status}`,
          message: errorData.error?.message || `OpenAI API error: ${response.status}`
        }
      };
    }

    const data = await response.json();

    return {
      success: true,
      content: data.choices?.[0]?.message?.content || '',
      tokensUsed: {
        input: data.usage?.prompt_tokens || 0,
        output: data.usage?.completion_tokens || 0,
        total: data.usage?.total_tokens || 0
      },
      model: data.model,
      provider: 'openai'
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Failed to call OpenAI API'
      }
    };
  }
}

// =============================================================================
// Retry Logic
// =============================================================================

async function withRetry<T>(
  fn: () => Promise<T>,
  isRetryable: (result: T) => boolean,
  maxAttempts: number = RATE_LIMIT.retryAttempts,
  delayMs: number = RATE_LIMIT.retryDelayMs
): Promise<T> {
  let lastResult: T | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    lastResult = await fn();

    if (!isRetryable(lastResult)) {
      return lastResult;
    }

    if (attempt < maxAttempts) {
      // Exponential backoff
      const delay = delayMs * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return lastResult as T;
}

// =============================================================================
// Main API Functions
// =============================================================================

/**
 * Sends a completion request to the AI provider
 */
export async function complete(
  messages: AIMessage[],
  options: AICompletionOptions = {}
): Promise<AICompletionResponse> {
  // Use mock responses in development without API keys
  if (await shouldUseMock()) {
    console.log('[AI Client] Using mock responses (no API keys configured)');
    return generateMockResponse(messages, options);
  }

  // Check rate limits
  const rateLimit = checkRateLimit();
  if (!rateLimit.allowed) {
    return {
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: `Rate limit exceeded. Retry after ${Math.ceil((rateLimit.retryAfterMs || 0) / 1000)} seconds`
      }
    };
  }

  // Determine provider based on available keys
  const claudeKey = await getApiKey('claude_api_key');
  const provider = options.provider || (claudeKey ? 'claude' : 'openai');

  // Make the API call with retry logic
  const result = await withRetry(
    async () => {
      if (provider === 'claude') {
        return callClaudeAPI(messages, options);
      } else {
        return callOpenAIAPI(messages, options);
      }
    },
    (result) => {
      // Retry on network errors or rate limits
      return !result.success &&
        (result.error?.code === 'NETWORK_ERROR' ||
         result.error?.code === 'HTTP_429');
    }
  );

  // Update rate limit counters on success
  if (result.success && result.tokensUsed) {
    updateRateLimitCounters(result.tokensUsed.total);
  }

  // Try fallback provider if primary fails
  if (!result.success && options.provider === undefined) {
    const fallbackProvider = provider === 'claude' ? 'openai' : 'claude';
    const fallbackKey = await getApiKey(fallbackProvider === 'claude' ? 'claude_api_key' : 'openai_api_key');

    if (fallbackKey) {
      console.log(`[AI Client] Primary provider failed, trying fallback: ${fallbackProvider}`);
      return complete(messages, { ...options, provider: fallbackProvider });
    }
  }

  return result;
}

/**
 * Convenience function for single-prompt completions
 */
export async function prompt(
  userPrompt: string,
  options: AICompletionOptions = {}
): Promise<AICompletionResponse> {
  const messages: AIMessage[] = [];

  if (options.systemPrompt) {
    messages.push({ role: 'system', content: options.systemPrompt });
  }

  messages.push({ role: 'user', content: userPrompt });

  return complete(messages, options);
}

/**
 * Parse JSON from AI response with error handling
 */
export function parseJSONResponse<T>(response: AICompletionResponse): {
  success: boolean;
  data?: T;
  error?: string;
} {
  if (!response.success || !response.content) {
    return {
      success: false,
      error: response.error?.message || 'No content in response'
    };
  }

  try {
    // Try to extract JSON from markdown code blocks if present
    let jsonString = response.content;
    const jsonMatch = jsonString.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonString = jsonMatch[1].trim();
    }

    const data = JSON.parse(jsonString) as T;
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// =============================================================================
// Exports
// =============================================================================

export const ai = {
  complete,
  prompt,
  parseJSONResponse,
  estimateTokens,
  estimateMessagesTokens
};

export default ai;
