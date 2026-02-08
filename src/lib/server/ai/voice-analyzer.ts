/**
 * Voice Analysis Service
 *
 * Analyzes scraped content to extract brand voice characteristics:
 * - Tone analysis (professional, friendly, authoritative, etc.)
 * - Personality traits identification
 * - Key phrases and terminology extraction
 * - Target audience language preferences
 * - Voice profile generation from analysis
 */

import { ai, type AIMessage } from './client';
import type { ScrapedContent } from './scraper';

// =============================================================================
// Types
// =============================================================================

export type ToneType =
  | 'professional'
  | 'friendly'
  | 'authoritative'
  | 'empathetic'
  | 'educational'
  | 'aspirational'
  | 'casual'
  | 'formal'
  | 'enthusiastic'
  | 'calm';

export type FormalityLevel = 'formal' | 'professional' | 'casual' | 'friendly';

export interface VoiceCharacteristics {
  empathy: number; // 0-1
  authority: number; // 0-1
  warmth: number; // 0-1
  urgency: number; // 0-1
  technicality: number; // 0-1
  confidence: number; // 0-1
}

export interface VoiceAnalysis {
  tone: string;
  tones: ToneType[];
  personality: string;
  formalityLevel: FormalityLevel;
  targetAudience: string;
  voiceCharacteristics: VoiceCharacteristics;
  communicationStyle: string;
  keyDifferentiators: string[];
  preferredTerms: string[];
  avoidTerms: string[];
  keyPhrases: string[];
  emotionalTriggers: string[];
  valuePropositions: string[];
  qualityScore: number;
  analysisNotes: string;
}

export interface AnalysisResult {
  success: boolean;
  analysis?: VoiceAnalysis;
  tokensUsed?: {
    input: number;
    output: number;
    total: number;
  };
  error?: {
    code: string;
    message: string;
  };
}

// =============================================================================
// Analysis Prompts
// =============================================================================

const VOICE_ANALYSIS_SYSTEM_PROMPT = `You are an expert brand voice analyst specializing in dental and healthcare marketing. Your task is to analyze content from dental practices and extract their unique brand voice characteristics.

Analyze the provided content and extract:

1. **Tone**: The primary emotional tone (e.g., "Professional and Caring", "Warm and Approachable")
2. **Tones**: List of applicable tone types from: professional, friendly, authoritative, empathetic, educational, aspirational, casual, formal, enthusiastic, calm
3. **Personality**: A brief description of the brand's personality traits
4. **Formality Level**: One of: formal, professional, casual, friendly
5. **Target Audience**: Who the content is written for
6. **Voice Characteristics**: Score each from 0 to 1:
   - empathy: How emotionally understanding the voice is
   - authority: How expert/authoritative the voice sounds
   - warmth: How welcoming and personable the voice is
   - urgency: How much the voice pushes for immediate action
   - technicality: How technical/clinical the language is
   - confidence: How self-assured and decisive the voice is
7. **Communication Style**: A paragraph describing how the brand communicates
8. **Key Differentiators**: What makes this practice stand out (max 5)
9. **Preferred Terms**: Words and phrases the brand uses frequently (max 10)
10. **Avoid Terms**: Words that would clash with the brand voice (max 10)
11. **Key Phrases**: Memorable phrases or taglines found in the content (max 5)
12. **Emotional Triggers**: Emotions the content tries to evoke (max 5)
13. **Value Propositions**: Main benefits/values communicated (max 5)
14. **Quality Score**: Overall quality of the brand voice (0-100)
15. **Analysis Notes**: Brief notes about the analysis

Respond ONLY with valid JSON in this exact structure:
{
  "tone": "string",
  "tones": ["string"],
  "personality": "string",
  "formalityLevel": "formal|professional|casual|friendly",
  "targetAudience": "string",
  "voiceCharacteristics": {
    "empathy": 0.0-1.0,
    "authority": 0.0-1.0,
    "warmth": 0.0-1.0,
    "urgency": 0.0-1.0,
    "technicality": 0.0-1.0,
    "confidence": 0.0-1.0
  },
  "communicationStyle": "string",
  "keyDifferentiators": ["string"],
  "preferredTerms": ["string"],
  "avoidTerms": ["string"],
  "keyPhrases": ["string"],
  "emotionalTriggers": ["string"],
  "valuePropositions": ["string"],
  "qualityScore": 0-100,
  "analysisNotes": "string"
}`;

// =============================================================================
// Content Preparation
// =============================================================================

/**
 * Prepares content for analysis by combining and formatting multiple sources
 */
export function prepareContentForAnalysis(
  sources: ScrapedContent[],
  maxLength: number = 15000
): string {
  const sections: string[] = [];

  for (const source of sources) {
    if (!source.success || !source.content) continue;

    const section = [
      `## Source: ${source.sourceType.toUpperCase()}`,
      source.title ? `Title: ${source.title}` : '',
      source.description ? `Description: ${source.description}` : '',
      '',
      'Content:',
      source.content.substring(0, 5000) // Limit each source
    ]
      .filter(Boolean)
      .join('\n');

    sections.push(section);
  }

  let combined = sections.join('\n\n---\n\n');

  // Truncate if too long
  if (combined.length > maxLength) {
    combined = combined.substring(0, maxLength) + '\n\n[Content truncated for analysis]';
  }

  return combined;
}

/**
 * Extracts key sentences for focused analysis
 */
export function extractKeyContent(content: string): {
  headlines: string[];
  callsToAction: string[];
  testimonials: string[];
  serviceDescriptions: string[];
} {
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean);

  const headlines: string[] = [];
  const callsToAction: string[] = [];
  const testimonials: string[] = [];
  const serviceDescriptions: string[] = [];

  const ctaPatterns = [
    /schedule/i, /book/i, /call/i, /contact/i, /learn more/i,
    /get started/i, /free consultation/i, /request/i
  ];

  const testimonialPatterns = [
    /["'][^"']{50,}["']/,
    /patient said/i, /testimonial/i, /review/i
  ];

  for (const line of lines) {
    // Headlines (shorter, impactful statements)
    if (line.length > 10 && line.length < 100 && !line.includes('.')) {
      headlines.push(line);
    }

    // CTAs
    if (ctaPatterns.some(p => p.test(line))) {
      callsToAction.push(line);
    }

    // Testimonials
    if (testimonialPatterns.some(p => p.test(line))) {
      testimonials.push(line);
    }

    // Service descriptions
    if (line.toLowerCase().includes('implant') || line.toLowerCase().includes('service')) {
      serviceDescriptions.push(line);
    }
  }

  return {
    headlines: headlines.slice(0, 10),
    callsToAction: callsToAction.slice(0, 10),
    testimonials: testimonials.slice(0, 5),
    serviceDescriptions: serviceDescriptions.slice(0, 10)
  };
}

// =============================================================================
// Analysis Functions
// =============================================================================

/**
 * Analyzes content to extract brand voice characteristics
 */
export async function analyzeVoice(content: string): Promise<AnalysisResult> {
  if (!content || content.trim().length < 100) {
    return {
      success: false,
      error: {
        code: 'INSUFFICIENT_CONTENT',
        message: 'Not enough content to analyze. Please provide more source material.'
      }
    };
  }

  const messages: AIMessage[] = [
    { role: 'system', content: VOICE_ANALYSIS_SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Analyze the following content from a dental practice and extract their brand voice characteristics:\n\n${content}`
    }
  ];

  const response = await ai.complete(messages, {
    maxTokens: 2000,
    temperature: 0.3 // Lower temperature for more consistent analysis
  });

  if (!response.success) {
    return {
      success: false,
      error: response.error
    };
  }

  // Parse the JSON response
  const parsed = ai.parseJSONResponse<VoiceAnalysis>(response);

  if (!parsed.success || !parsed.data) {
    return {
      success: false,
      error: {
        code: 'PARSE_ERROR',
        message: parsed.error || 'Failed to parse voice analysis response'
      }
    };
  }

  // Validate and normalize the analysis
  const analysis = normalizeAnalysis(parsed.data);

  return {
    success: true,
    analysis,
    tokensUsed: response.tokensUsed
  };
}

/**
 * Analyzes multiple content sources and produces a combined analysis
 */
export async function analyzeMultipleSources(
  sources: ScrapedContent[]
): Promise<AnalysisResult> {
  const successfulSources = sources.filter(s => s.success && s.content);

  if (successfulSources.length === 0) {
    return {
      success: false,
      error: {
        code: 'NO_CONTENT',
        message: 'No valid content sources provided for analysis'
      }
    };
  }

  const preparedContent = prepareContentForAnalysis(successfulSources);
  return analyzeVoice(preparedContent);
}

/**
 * Normalizes and validates analysis data
 */
function normalizeAnalysis(data: Partial<VoiceAnalysis>): VoiceAnalysis {
  return {
    tone: data.tone || 'Professional',
    tones: normalizeTones(data.tones),
    personality: data.personality || 'Trustworthy and knowledgeable',
    formalityLevel: normalizeFormalityLevel(data.formalityLevel),
    targetAudience: data.targetAudience || 'Adults seeking dental care',
    voiceCharacteristics: normalizeCharacteristics(data.voiceCharacteristics),
    communicationStyle: data.communicationStyle || 'Clear and professional communication',
    keyDifferentiators: ensureArray(data.keyDifferentiators, 5),
    preferredTerms: ensureArray(data.preferredTerms, 10),
    avoidTerms: ensureArray(data.avoidTerms, 10),
    keyPhrases: ensureArray(data.keyPhrases, 5),
    emotionalTriggers: ensureArray(data.emotionalTriggers, 5),
    valuePropositions: ensureArray(data.valuePropositions, 5),
    qualityScore: normalizeScore(data.qualityScore),
    analysisNotes: data.analysisNotes || ''
  };
}

/**
 * Normalizes tone array
 */
function normalizeTones(tones: unknown): ToneType[] {
  const validTones: ToneType[] = [
    'professional', 'friendly', 'authoritative', 'empathetic',
    'educational', 'aspirational', 'casual', 'formal',
    'enthusiastic', 'calm'
  ];

  if (!Array.isArray(tones)) {
    return ['professional'];
  }

  const normalized = tones
    .filter((t): t is string => typeof t === 'string')
    .map(t => t.toLowerCase() as ToneType)
    .filter(t => validTones.includes(t));

  return normalized.length > 0 ? normalized : ['professional'];
}

/**
 * Normalizes formality level
 */
function normalizeFormalityLevel(level: unknown): FormalityLevel {
  const validLevels: FormalityLevel[] = ['formal', 'professional', 'casual', 'friendly'];

  if (typeof level === 'string' && validLevels.includes(level as FormalityLevel)) {
    return level as FormalityLevel;
  }

  return 'professional';
}

/**
 * Normalizes voice characteristics
 */
function normalizeCharacteristics(chars: unknown): VoiceCharacteristics {
  const defaults: VoiceCharacteristics = {
    empathy: 0.7,
    authority: 0.7,
    warmth: 0.7,
    urgency: 0.3,
    technicality: 0.4,
    confidence: 0.8
  };

  if (!chars || typeof chars !== 'object') {
    return defaults;
  }

  const obj = chars as Record<string, unknown>;

  return {
    empathy: normalizeCharValue(obj.empathy) ?? defaults.empathy,
    authority: normalizeCharValue(obj.authority) ?? defaults.authority,
    warmth: normalizeCharValue(obj.warmth) ?? defaults.warmth,
    urgency: normalizeCharValue(obj.urgency) ?? defaults.urgency,
    technicality: normalizeCharValue(obj.technicality) ?? defaults.technicality,
    confidence: normalizeCharValue(obj.confidence) ?? defaults.confidence
  };
}

/**
 * Normalizes a characteristic value to 0-1 range
 */
function normalizeCharValue(value: unknown): number | null {
  if (typeof value !== 'number') return null;
  return Math.max(0, Math.min(1, value));
}

/**
 * Ensures a value is an array with max length
 */
function ensureArray(value: unknown, maxLength: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .slice(0, maxLength);
}

/**
 * Normalizes quality score to 0-100 range
 */
function normalizeScore(score: unknown): number {
  if (typeof score !== 'number') return 70;
  return Math.max(0, Math.min(100, Math.round(score)));
}

// =============================================================================
// Comparison and Refinement
// =============================================================================

/**
 * Compares two voice analyses and identifies differences
 */
export function compareAnalyses(
  current: VoiceAnalysis,
  previous: VoiceAnalysis
): {
  significant: boolean;
  changes: string[];
  recommendations: string[];
} {
  const changes: string[] = [];
  const recommendations: string[] = [];

  // Compare formality
  if (current.formalityLevel !== previous.formalityLevel) {
    changes.push(`Formality level changed from ${previous.formalityLevel} to ${current.formalityLevel}`);
  }

  // Compare tone
  if (current.tone !== previous.tone) {
    changes.push(`Primary tone changed from "${previous.tone}" to "${current.tone}"`);
  }

  // Compare quality score
  const scoreDiff = current.qualityScore - previous.qualityScore;
  if (Math.abs(scoreDiff) > 10) {
    changes.push(`Quality score ${scoreDiff > 0 ? 'improved' : 'decreased'} by ${Math.abs(scoreDiff)} points`);
  }

  // Compare characteristics
  const charChanges: string[] = [];
  for (const key of Object.keys(current.voiceCharacteristics) as (keyof VoiceCharacteristics)[]) {
    const diff = current.voiceCharacteristics[key] - previous.voiceCharacteristics[key];
    if (Math.abs(diff) > 0.2) {
      charChanges.push(`${key} ${diff > 0 ? 'increased' : 'decreased'}`);
    }
  }
  if (charChanges.length > 0) {
    changes.push(`Voice characteristics adjusted: ${charChanges.join(', ')}`);
  }

  // Generate recommendations
  if (current.qualityScore < 60) {
    recommendations.push('Consider adding more diverse content sources to improve analysis quality');
  }

  if (current.voiceCharacteristics.urgency > 0.7) {
    recommendations.push('High urgency detected - ensure content doesn\'t come across as too pushy');
  }

  if (current.voiceCharacteristics.empathy < 0.5) {
    recommendations.push('Consider adding more empathetic language to connect with patients');
  }

  return {
    significant: changes.length > 2 || Math.abs(scoreDiff) > 20,
    changes,
    recommendations
  };
}

// =============================================================================
// Exports
// =============================================================================

export const voiceAnalyzer = {
  analyzeVoice,
  analyzeMultipleSources,
  prepareContentForAnalysis,
  extractKeyContent,
  compareAnalyses
};

export default voiceAnalyzer;
