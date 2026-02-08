/**
 * Voice Profile Generator
 *
 * Generates complete voice profiles from analysis data:
 * - Creates comprehensive voice profile objects
 * - Generates voice guidelines documents
 * - Produces sample content in the brand voice
 * - Supports voice adjustments (more formal, more casual, etc.)
 */

import { ai, type AIMessage } from './client';
import type { VoiceAnalysis, FormalityLevel } from './voice-analyzer';

// =============================================================================
// Types
// =============================================================================

export interface VoiceProfile {
  id: string;
  organizationId: string;
  name: string;
  version: number;

  // Core Voice Attributes
  tone: string;
  personality: string;
  formalityLevel: FormalityLevel;
  targetAudience: string;

  // Detailed Characteristics
  voiceCharacteristics: {
    empathy: number;
    authority: number;
    warmth: number;
    urgency: number;
    technicality: number;
    confidence: number;
  };

  // Language Preferences
  preferredTerms: string[];
  avoidTerms: string[];
  keyDifferentiators: string[];
  keyPhrases: string[];

  // Guidelines
  communicationStyle: string;
  writingGuidelines: WritingGuidelines;

  // Sample Content
  sampleHeadlines: string[];
  sampleAdCopy: string[];
  sampleCtas: string[];

  // Meta
  qualityScore: number;
  analysisNotes: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WritingGuidelines {
  doStatements: string[];
  dontStatements: string[];
  toneDescriptions: string[];
  sentenceStructure: string;
  vocabularyLevel: string;
  punctuationStyle: string;
  callToActionStyle: string;
  emotionalApproach: string;
}

export interface VoiceAdjustment {
  type: 'formality' | 'warmth' | 'urgency' | 'technicality' | 'custom';
  direction: 'increase' | 'decrease';
  intensity: 'slight' | 'moderate' | 'significant';
  customInstructions?: string;
}

export interface GeneratedContent {
  headlines: string[];
  adCopy: string[];
  ctas: string[];
  emailSubjects: string[];
  socialPosts: string[];
}

// =============================================================================
// Profile Generation Prompts
// =============================================================================

const GUIDELINES_GENERATION_PROMPT = `You are an expert brand voice consultant creating detailed writing guidelines for a dental practice.

Based on the voice analysis provided, create comprehensive writing guidelines that will help content creators maintain consistent brand voice.

Create guidelines that include:
1. DO statements (5-7 specific things writers should do)
2. DON'T statements (5-7 specific things writers should avoid)
3. Tone descriptions (3-4 ways to describe the desired tone)
4. Sentence structure preferences
5. Vocabulary level description
6. Punctuation and formatting style
7. Call-to-action style guidance
8. Emotional approach guidance

Respond ONLY with valid JSON:
{
  "doStatements": ["string"],
  "dontStatements": ["string"],
  "toneDescriptions": ["string"],
  "sentenceStructure": "string",
  "vocabularyLevel": "string",
  "punctuationStyle": "string",
  "callToActionStyle": "string",
  "emotionalApproach": "string"
}`;

const SAMPLE_CONTENT_PROMPT = `You are a skilled copywriter creating sample content for a dental implant practice.

Based on the brand voice profile provided, create sample content that demonstrates the voice in action.

Create:
1. 5 compelling headlines for ads/landing pages
2. 3 short ad copy examples (2-3 sentences each)
3. 5 call-to-action button texts
4. 3 email subject lines
5. 3 social media posts (Facebook/Instagram style)

All content should:
- Match the specified tone and personality
- Use preferred terms where appropriate
- Avoid the listed terms to avoid
- Appeal to the target audience
- Be appropriate for dental implant marketing

Respond ONLY with valid JSON:
{
  "headlines": ["string"],
  "adCopy": ["string"],
  "ctas": ["string"],
  "emailSubjects": ["string"],
  "socialPosts": ["string"]
}`;

const VOICE_ADJUSTMENT_PROMPT = `You are a brand voice consultant helping to adjust a brand's voice profile.

Current profile characteristics:
{PROFILE}

Requested adjustment: {ADJUSTMENT}

Create an adjusted version of the voice profile that applies the requested change while maintaining overall brand consistency.

Respond ONLY with valid JSON containing the adjusted profile data.`;

// =============================================================================
// Profile Generation Functions
// =============================================================================

/**
 * Generates a complete voice profile from analysis data
 */
export async function generateVoiceProfile(
  analysis: VoiceAnalysis,
  organizationId: string,
  name: string = 'Primary'
): Promise<{
  success: boolean;
  profile?: VoiceProfile;
  error?: { code: string; message: string };
}> {
  // Generate writing guidelines
  const guidelinesResult = await generateWritingGuidelines(analysis);
  if (!guidelinesResult.success || !guidelinesResult.guidelines) {
    return {
      success: false,
      error: guidelinesResult.error || { code: 'GUIDELINES_ERROR', message: 'Failed to generate guidelines' }
    };
  }

  // Generate sample content
  const contentResult = await generateInitialContent(analysis);
  if (!contentResult.success || !contentResult.content) {
    return {
      success: false,
      error: contentResult.error || { code: 'CONTENT_ERROR', message: 'Failed to generate sample content' }
    };
  }

  // Construct the complete profile
  const profile: VoiceProfile = {
    id: generateProfileId(),
    organizationId,
    name,
    version: 1,

    // From analysis
    tone: analysis.tone,
    personality: analysis.personality,
    formalityLevel: analysis.formalityLevel,
    targetAudience: analysis.targetAudience,
    voiceCharacteristics: analysis.voiceCharacteristics,
    preferredTerms: analysis.preferredTerms,
    avoidTerms: analysis.avoidTerms,
    keyDifferentiators: analysis.keyDifferentiators,
    keyPhrases: analysis.keyPhrases,
    communicationStyle: analysis.communicationStyle,
    qualityScore: analysis.qualityScore,
    analysisNotes: analysis.analysisNotes,

    // Generated
    writingGuidelines: guidelinesResult.guidelines,
    sampleHeadlines: contentResult.content.headlines,
    sampleAdCopy: contentResult.content.adCopy,
    sampleCtas: contentResult.content.ctas,

    // Meta
    createdAt: new Date(),
    updatedAt: new Date()
  };

  return { success: true, profile };
}

/**
 * Generates writing guidelines based on voice analysis
 */
export async function generateWritingGuidelines(
  analysis: VoiceAnalysis
): Promise<{
  success: boolean;
  guidelines?: WritingGuidelines;
  error?: { code: string; message: string };
}> {
  const analysisContext = JSON.stringify({
    tone: analysis.tone,
    personality: analysis.personality,
    formalityLevel: analysis.formalityLevel,
    targetAudience: analysis.targetAudience,
    voiceCharacteristics: analysis.voiceCharacteristics,
    preferredTerms: analysis.preferredTerms,
    avoidTerms: analysis.avoidTerms,
    communicationStyle: analysis.communicationStyle
  }, null, 2);

  const messages: AIMessage[] = [
    { role: 'system', content: GUIDELINES_GENERATION_PROMPT },
    {
      role: 'user',
      content: `Create writing guidelines based on this voice analysis:\n\n${analysisContext}`
    }
  ];

  const response = await ai.complete(messages, {
    maxTokens: 1500,
    temperature: 0.5
  });

  if (!response.success) {
    return { success: false, error: response.error };
  }

  const parsed = ai.parseJSONResponse<WritingGuidelines>(response);
  if (!parsed.success || !parsed.data) {
    return {
      success: false,
      error: { code: 'PARSE_ERROR', message: parsed.error || 'Failed to parse guidelines' }
    };
  }

  return {
    success: true,
    guidelines: normalizeGuidelines(parsed.data)
  };
}

/**
 * Generates initial sample content based on voice analysis
 */
export async function generateInitialContent(
  analysis: VoiceAnalysis
): Promise<{
  success: boolean;
  content?: GeneratedContent;
  error?: { code: string; message: string };
}> {
  const profileContext = JSON.stringify({
    tone: analysis.tone,
    personality: analysis.personality,
    formalityLevel: analysis.formalityLevel,
    targetAudience: analysis.targetAudience,
    preferredTerms: analysis.preferredTerms,
    avoidTerms: analysis.avoidTerms,
    keyDifferentiators: analysis.keyDifferentiators,
    valuePropositions: analysis.valuePropositions
  }, null, 2);

  const messages: AIMessage[] = [
    { role: 'system', content: SAMPLE_CONTENT_PROMPT },
    {
      role: 'user',
      content: `Create sample content based on this brand voice profile:\n\n${profileContext}`
    }
  ];

  const response = await ai.complete(messages, {
    maxTokens: 2000,
    temperature: 0.7
  });

  if (!response.success) {
    return { success: false, error: response.error };
  }

  const parsed = ai.parseJSONResponse<GeneratedContent>(response);
  if (!parsed.success || !parsed.data) {
    return {
      success: false,
      error: { code: 'PARSE_ERROR', message: parsed.error || 'Failed to parse content' }
    };
  }

  return {
    success: true,
    content: normalizeContent(parsed.data)
  };
}

// =============================================================================
// Voice Adjustment Functions
// =============================================================================

/**
 * Applies adjustments to a voice profile
 */
export async function applyVoiceAdjustment(
  profile: VoiceProfile,
  adjustment: VoiceAdjustment
): Promise<{
  success: boolean;
  adjustedProfile?: Partial<VoiceProfile>;
  error?: { code: string; message: string };
}> {
  // For simple adjustments, we can modify locally
  const adjustedProfile = { ...profile };

  switch (adjustment.type) {
    case 'formality':
      adjustedProfile.formalityLevel = adjustFormalityLevel(
        profile.formalityLevel,
        adjustment.direction
      );
      break;

    case 'warmth':
      adjustedProfile.voiceCharacteristics = {
        ...profile.voiceCharacteristics,
        warmth: adjustCharacteristic(
          profile.voiceCharacteristics.warmth,
          adjustment.direction,
          adjustment.intensity
        ),
        empathy: adjustCharacteristic(
          profile.voiceCharacteristics.empathy,
          adjustment.direction,
          adjustment.intensity === 'significant' ? 'moderate' : 'slight'
        )
      };
      break;

    case 'urgency':
      adjustedProfile.voiceCharacteristics = {
        ...profile.voiceCharacteristics,
        urgency: adjustCharacteristic(
          profile.voiceCharacteristics.urgency,
          adjustment.direction,
          adjustment.intensity
        )
      };
      break;

    case 'technicality':
      adjustedProfile.voiceCharacteristics = {
        ...profile.voiceCharacteristics,
        technicality: adjustCharacteristic(
          profile.voiceCharacteristics.technicality,
          adjustment.direction,
          adjustment.intensity
        )
      };
      break;

    case 'custom':
      // For custom adjustments, use AI
      return await applyCustomAdjustment(profile, adjustment);
  }

  adjustedProfile.updatedAt = new Date();
  adjustedProfile.version = profile.version + 1;

  // Regenerate sample content with new profile
  const newContent = await generateInitialContent({
    tone: adjustedProfile.tone,
    tones: [],
    personality: adjustedProfile.personality,
    formalityLevel: adjustedProfile.formalityLevel,
    targetAudience: adjustedProfile.targetAudience,
    voiceCharacteristics: adjustedProfile.voiceCharacteristics,
    communicationStyle: adjustedProfile.communicationStyle,
    keyDifferentiators: adjustedProfile.keyDifferentiators,
    preferredTerms: adjustedProfile.preferredTerms,
    avoidTerms: adjustedProfile.avoidTerms,
    keyPhrases: adjustedProfile.keyPhrases,
    emotionalTriggers: [],
    valuePropositions: adjustedProfile.keyDifferentiators,
    qualityScore: adjustedProfile.qualityScore,
    analysisNotes: adjustedProfile.analysisNotes
  });

  if (newContent.success && newContent.content) {
    adjustedProfile.sampleHeadlines = newContent.content.headlines;
    adjustedProfile.sampleAdCopy = newContent.content.adCopy;
    adjustedProfile.sampleCtas = newContent.content.ctas;
  }

  return { success: true, adjustedProfile };
}

/**
 * Applies custom AI-driven adjustment
 */
async function applyCustomAdjustment(
  profile: VoiceProfile,
  adjustment: VoiceAdjustment
): Promise<{
  success: boolean;
  adjustedProfile?: Partial<VoiceProfile>;
  error?: { code: string; message: string };
}> {
  const profileContext = JSON.stringify({
    tone: profile.tone,
    personality: profile.personality,
    formalityLevel: profile.formalityLevel,
    voiceCharacteristics: profile.voiceCharacteristics,
    preferredTerms: profile.preferredTerms.slice(0, 5),
    avoidTerms: profile.avoidTerms.slice(0, 5)
  }, null, 2);

  const prompt = VOICE_ADJUSTMENT_PROMPT
    .replace('{PROFILE}', profileContext)
    .replace('{ADJUSTMENT}', adjustment.customInstructions || 'Make the voice more distinctive');

  const messages: AIMessage[] = [
    {
      role: 'user',
      content: prompt
    }
  ];

  const response = await ai.complete(messages, {
    maxTokens: 1500,
    temperature: 0.5
  });

  if (!response.success) {
    return { success: false, error: response.error };
  }

  const parsed = ai.parseJSONResponse<Partial<VoiceProfile>>(response);
  if (!parsed.success || !parsed.data) {
    return {
      success: false,
      error: { code: 'PARSE_ERROR', message: parsed.error || 'Failed to parse adjusted profile' }
    };
  }

  return {
    success: true,
    adjustedProfile: {
      ...parsed.data,
      updatedAt: new Date(),
      version: profile.version + 1
    }
  };
}

// =============================================================================
// Guidelines Document Generation
// =============================================================================

/**
 * Generates a formatted brand voice guidelines document
 */
export function generateGuidelinesDocument(profile: VoiceProfile): string {
  const { writingGuidelines } = profile;

  const sections = [
    `# Brand Voice Guidelines: ${profile.name}`,
    '',
    `## Voice Overview`,
    `**Tone:** ${profile.tone}`,
    `**Personality:** ${profile.personality}`,
    `**Formality:** ${formatFormalityLevel(profile.formalityLevel)}`,
    `**Target Audience:** ${profile.targetAudience}`,
    '',
    `## Communication Style`,
    profile.communicationStyle,
    '',
    `## Voice Characteristics`,
    `- **Empathy:** ${formatCharacteristicLevel(profile.voiceCharacteristics.empathy)}`,
    `- **Authority:** ${formatCharacteristicLevel(profile.voiceCharacteristics.authority)}`,
    `- **Warmth:** ${formatCharacteristicLevel(profile.voiceCharacteristics.warmth)}`,
    `- **Urgency:** ${formatCharacteristicLevel(profile.voiceCharacteristics.urgency)}`,
    `- **Technicality:** ${formatCharacteristicLevel(profile.voiceCharacteristics.technicality)}`,
    `- **Confidence:** ${formatCharacteristicLevel(profile.voiceCharacteristics.confidence)}`,
    '',
    `## Writing Guidelines`,
    '',
    `### DO:`,
    ...writingGuidelines.doStatements.map(s => `- ${s}`),
    '',
    `### DON'T:`,
    ...writingGuidelines.dontStatements.map(s => `- ${s}`),
    '',
    `### Tone Descriptors`,
    ...writingGuidelines.toneDescriptions.map(t => `- ${t}`),
    '',
    `### Style Notes`,
    `**Sentence Structure:** ${writingGuidelines.sentenceStructure}`,
    `**Vocabulary Level:** ${writingGuidelines.vocabularyLevel}`,
    `**Punctuation Style:** ${writingGuidelines.punctuationStyle}`,
    `**Call-to-Action Style:** ${writingGuidelines.callToActionStyle}`,
    `**Emotional Approach:** ${writingGuidelines.emotionalApproach}`,
    '',
    `## Language Preferences`,
    '',
    `### Preferred Terms`,
    ...profile.preferredTerms.map(t => `- ${t}`),
    '',
    `### Terms to Avoid`,
    ...profile.avoidTerms.map(t => `- ${t}`),
    '',
    `### Key Differentiators`,
    ...profile.keyDifferentiators.map(d => `- ${d}`),
    '',
    `## Sample Content`,
    '',
    `### Headlines`,
    ...profile.sampleHeadlines.map((h, i) => `${i + 1}. "${h}"`),
    '',
    `### Ad Copy Examples`,
    ...profile.sampleAdCopy.map((c, i) => `**Example ${i + 1}:** ${c}`),
    '',
    `### Calls-to-Action`,
    ...profile.sampleCtas.map(cta => `- "${cta}"`),
    '',
    `---`,
    `*Generated on ${profile.createdAt.toLocaleDateString()} | Quality Score: ${profile.qualityScore}/100*`
  ];

  return sections.join('\n');
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Generates a unique profile ID
 */
function generateProfileId(): string {
  return `vp_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Adjusts formality level
 */
function adjustFormalityLevel(
  current: FormalityLevel,
  direction: 'increase' | 'decrease'
): FormalityLevel {
  const levels: FormalityLevel[] = ['friendly', 'casual', 'professional', 'formal'];
  const currentIndex = levels.indexOf(current);

  if (direction === 'increase') {
    return levels[Math.min(currentIndex + 1, levels.length - 1)];
  } else {
    return levels[Math.max(currentIndex - 1, 0)];
  }
}

/**
 * Adjusts a characteristic value
 */
function adjustCharacteristic(
  current: number,
  direction: 'increase' | 'decrease',
  intensity: 'slight' | 'moderate' | 'significant'
): number {
  const amounts = { slight: 0.1, moderate: 0.2, significant: 0.3 };
  const amount = amounts[intensity];

  if (direction === 'increase') {
    return Math.min(1, current + amount);
  } else {
    return Math.max(0, current - amount);
  }
}

/**
 * Formats formality level for display
 */
function formatFormalityLevel(level: FormalityLevel): string {
  const labels: Record<FormalityLevel, string> = {
    formal: 'Formal - Professional, corporate tone',
    professional: 'Professional - Business-appropriate, clear and direct',
    casual: 'Casual - Relaxed, conversational approach',
    friendly: 'Friendly - Warm, approachable, personable'
  };
  return labels[level] || level;
}

/**
 * Formats characteristic level for display
 */
function formatCharacteristicLevel(value: number): string {
  if (value >= 0.8) return 'Very High';
  if (value >= 0.6) return 'High';
  if (value >= 0.4) return 'Moderate';
  if (value >= 0.2) return 'Low';
  return 'Very Low';
}

/**
 * Normalizes writing guidelines
 */
function normalizeGuidelines(data: Partial<WritingGuidelines>): WritingGuidelines {
  return {
    doStatements: ensureStringArray(data.doStatements, 7),
    dontStatements: ensureStringArray(data.dontStatements, 7),
    toneDescriptions: ensureStringArray(data.toneDescriptions, 4),
    sentenceStructure: data.sentenceStructure || 'Use clear, varied sentence structures',
    vocabularyLevel: data.vocabularyLevel || 'Accessible professional language',
    punctuationStyle: data.punctuationStyle || 'Standard professional punctuation',
    callToActionStyle: data.callToActionStyle || 'Clear, encouraging calls-to-action',
    emotionalApproach: data.emotionalApproach || 'Balanced emotional appeal'
  };
}

/**
 * Normalizes generated content
 */
function normalizeContent(data: Partial<GeneratedContent>): GeneratedContent {
  return {
    headlines: ensureStringArray(data.headlines, 5),
    adCopy: ensureStringArray(data.adCopy, 3),
    ctas: ensureStringArray(data.ctas, 5),
    emailSubjects: ensureStringArray(data.emailSubjects, 3),
    socialPosts: ensureStringArray(data.socialPosts, 3)
  };
}

/**
 * Ensures array of strings
 */
function ensureStringArray(value: unknown, maxLength: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .slice(0, maxLength);
}

// =============================================================================
// Exports
// =============================================================================

export const voiceGenerator = {
  generateVoiceProfile,
  generateWritingGuidelines,
  generateInitialContent,
  applyVoiceAdjustment,
  generateGuidelinesDocument
};

export default voiceGenerator;
