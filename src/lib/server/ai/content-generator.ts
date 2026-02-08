/**
 * Sample Content Generator
 *
 * Generates various types of content in the organization's brand voice:
 * - Ad copy samples
 * - Landing page headlines
 * - Email templates
 * - Social media posts
 * - Blog post outlines
 */

import { ai, type AIMessage } from './client';
import type { VoiceProfile } from './voice-generator';

// =============================================================================
// Types
// =============================================================================

export type ContentType =
  | 'headline'
  | 'ad_copy'
  | 'cta'
  | 'email'
  | 'social_post'
  | 'landing_page'
  | 'blog_outline'
  | 'sms'
  | 'review_response';

export interface ContentRequest {
  type: ContentType;
  count?: number;
  context?: string;
  keywords?: string[];
  maxLength?: number;
  platform?: 'facebook' | 'instagram' | 'google' | 'email' | 'sms';
  tone?: 'promotional' | 'educational' | 'testimonial' | 'urgency';
}

export interface GeneratedContentItem {
  id: string;
  type: ContentType;
  content: string;
  metadata?: {
    wordCount: number;
    characterCount: number;
    platform?: string;
    tone?: string;
  };
}

export interface ContentGenerationResult {
  success: boolean;
  items?: GeneratedContentItem[];
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

export interface EmailTemplate {
  subject: string;
  previewText: string;
  greeting: string;
  body: string[];
  callToAction: {
    text: string;
    subtext?: string;
  };
  closing: string;
  signature: string;
}

export interface LandingPageContent {
  headline: string;
  subheadline: string;
  heroDescription: string;
  benefits: Array<{
    title: string;
    description: string;
  }>;
  socialProof: string;
  ctaText: string;
  ctaSubtext: string;
}

export interface BlogOutline {
  title: string;
  metaDescription: string;
  introduction: string;
  sections: Array<{
    heading: string;
    keyPoints: string[];
  }>;
  conclusion: string;
  callToAction: string;
}

// =============================================================================
// Content Generation Prompts
// =============================================================================

const CONTENT_SYSTEM_PROMPT = `You are an expert copywriter specializing in dental implant marketing. You write compelling, conversion-focused content that matches the provided brand voice.

Key principles:
1. Always match the specified tone and formality level
2. Use preferred terms and avoid restricted terms
3. Focus on patient benefits, not just features
4. Be clear, concise, and compelling
5. Include appropriate calls-to-action
6. Address common patient concerns and objections
7. Maintain professionalism while being approachable`;

const HEADLINE_PROMPT = `Create {COUNT} compelling headlines for a dental implant practice.

Brand Voice Profile:
- Tone: {TONE}
- Formality: {FORMALITY}
- Target Audience: {AUDIENCE}
- Key Differentiators: {DIFFERENTIATORS}

Preferred Terms to Include: {PREFERRED}
Terms to Avoid: {AVOID}

Additional Context: {CONTEXT}

Requirements:
- Each headline should be 5-12 words
- Headlines should be varied in approach (emotional, benefit-focused, question-based, etc.)
- Focus on patient outcomes and benefits

Respond with a JSON array of strings:
["headline 1", "headline 2", ...]`;

const AD_COPY_PROMPT = `Create {COUNT} short ad copy variations for {PLATFORM} advertising.

Brand Voice Profile:
- Tone: {TONE}
- Personality: {PERSONALITY}
- Formality: {FORMALITY}
- Target Audience: {AUDIENCE}

Preferred Terms: {PREFERRED}
Terms to Avoid: {AVOID}

Additional Context: {CONTEXT}
Tone Style: {TONE_STYLE}

Requirements:
- Each ad should be 2-4 sentences
- Include a soft call-to-action at the end
- Address a common patient concern or desire
- Be platform-appropriate ({PLATFORM})

Respond with a JSON array of strings:
["ad copy 1", "ad copy 2", ...]`;

const CTA_PROMPT = `Create {COUNT} call-to-action button texts for a dental implant practice.

Brand Voice Profile:
- Tone: {TONE}
- Formality: {FORMALITY}

Requirements:
- Each CTA should be 2-5 words
- Vary the approach (action-oriented, benefit-focused, low-pressure, etc.)
- Be appropriate for {CONTEXT}

Respond with a JSON array of strings:
["CTA 1", "CTA 2", ...]`;

const EMAIL_PROMPT = `Create a {TONE_STYLE} email template for a dental implant practice.

Brand Voice Profile:
- Tone: {TONE}
- Personality: {PERSONALITY}
- Formality: {FORMALITY}
- Target Audience: {AUDIENCE}

Preferred Terms: {PREFERRED}
Terms to Avoid: {AVOID}

Context: {CONTEXT}

Requirements:
- Professional yet personable
- Address patient concerns
- Include a clear call-to-action
- Keep body paragraphs short and scannable

Respond with JSON:
{
  "subject": "string",
  "previewText": "string (50-90 chars)",
  "greeting": "string",
  "body": ["paragraph 1", "paragraph 2", ...],
  "callToAction": {
    "text": "button text",
    "subtext": "optional supporting text"
  },
  "closing": "string",
  "signature": "string"
}`;

const SOCIAL_PROMPT = `Create {COUNT} social media posts for {PLATFORM}.

Brand Voice Profile:
- Tone: {TONE}
- Personality: {PERSONALITY}
- Formality: {FORMALITY}
- Target Audience: {AUDIENCE}

Preferred Terms: {PREFERRED}
Terms to Avoid: {AVOID}

Requirements:
- Platform-appropriate length and style
- Include relevant hashtags if for Instagram
- Engaging and shareable
- Mix of content types (educational, testimonial, promotional)

Respond with a JSON array of strings:
["post 1", "post 2", ...]`;

const LANDING_PAGE_PROMPT = `Create landing page copy for a dental implant practice.

Brand Voice Profile:
- Tone: {TONE}
- Personality: {PERSONALITY}
- Formality: {FORMALITY}
- Target Audience: {AUDIENCE}
- Key Differentiators: {DIFFERENTIATORS}

Preferred Terms: {PREFERRED}
Terms to Avoid: {AVOID}

Context: {CONTEXT}

Requirements:
- Compelling headline and subheadline
- Clear value proposition
- Benefit-focused copy
- Social proof element
- Strong call-to-action

Respond with JSON:
{
  "headline": "string",
  "subheadline": "string",
  "heroDescription": "string (2-3 sentences)",
  "benefits": [
    {"title": "string", "description": "string"},
    ...
  ],
  "socialProof": "string (testimonial or stat)",
  "ctaText": "string",
  "ctaSubtext": "string"
}`;

const BLOG_OUTLINE_PROMPT = `Create a blog post outline for a dental implant practice.

Topic: {CONTEXT}

Brand Voice Profile:
- Tone: {TONE}
- Personality: {PERSONALITY}
- Target Audience: {AUDIENCE}

Requirements:
- Educational and helpful
- SEO-friendly structure
- Address common patient questions
- Include a call-to-action

Respond with JSON:
{
  "title": "string",
  "metaDescription": "string (150-160 chars)",
  "introduction": "string",
  "sections": [
    {"heading": "string", "keyPoints": ["point 1", "point 2", ...]},
    ...
  ],
  "conclusion": "string",
  "callToAction": "string"
}`;

const SMS_PROMPT = `Create {COUNT} SMS message templates for a dental implant practice.

Brand Voice Profile:
- Tone: {TONE}
- Formality: {FORMALITY}

Context: {CONTEXT}

Requirements:
- Under 160 characters each
- Clear and concise
- Appropriate for {CONTEXT}
- Include abbreviated CTA if space allows

Respond with a JSON array of strings:
["sms 1", "sms 2", ...]`;

const REVIEW_RESPONSE_PROMPT = `Create a response template for patient reviews.

Review Type: {CONTEXT}

Brand Voice Profile:
- Tone: {TONE}
- Personality: {PERSONALITY}
- Formality: {FORMALITY}

Requirements:
- Professional and appreciative for positive reviews
- Empathetic and solution-oriented for negative reviews
- Maintain brand voice throughout
- Under 150 words

Respond with a single string containing the response template.`;

// =============================================================================
// Content Generation Functions
// =============================================================================

/**
 * Generates content based on request parameters
 */
export async function generateContent(
  profile: VoiceProfile,
  request: ContentRequest
): Promise<ContentGenerationResult> {
  const count = request.count || 5;
  const context = request.context || 'general dental implant marketing';

  let prompt: string;
  let parseAsArray = true;

  switch (request.type) {
    case 'headline':
      prompt = buildPrompt(HEADLINE_PROMPT, profile, { count, context });
      break;

    case 'ad_copy':
      prompt = buildPrompt(AD_COPY_PROMPT, profile, {
        count,
        context,
        platform: request.platform || 'facebook',
        toneStyle: request.tone || 'promotional'
      });
      break;

    case 'cta':
      prompt = buildPrompt(CTA_PROMPT, profile, { count, context });
      break;

    case 'email':
      prompt = buildPrompt(EMAIL_PROMPT, profile, {
        context,
        toneStyle: request.tone || 'promotional'
      });
      parseAsArray = false;
      break;

    case 'social_post':
      prompt = buildPrompt(SOCIAL_PROMPT, profile, {
        count,
        platform: request.platform || 'facebook'
      });
      break;

    case 'landing_page':
      prompt = buildPrompt(LANDING_PAGE_PROMPT, profile, { context });
      parseAsArray = false;
      break;

    case 'blog_outline':
      prompt = buildPrompt(BLOG_OUTLINE_PROMPT, profile, { context });
      parseAsArray = false;
      break;

    case 'sms':
      prompt = buildPrompt(SMS_PROMPT, profile, { count, context });
      break;

    case 'review_response':
      prompt = buildPrompt(REVIEW_RESPONSE_PROMPT, profile, { context });
      parseAsArray = false;
      break;

    default:
      return {
        success: false,
        error: {
          code: 'INVALID_TYPE',
          message: `Unknown content type: ${request.type}`
        }
      };
  }

  const messages: AIMessage[] = [
    { role: 'system', content: CONTENT_SYSTEM_PROMPT },
    { role: 'user', content: prompt }
  ];

  const response = await ai.complete(messages, {
    maxTokens: 2000,
    temperature: 0.7
  });

  if (!response.success) {
    return { success: false, error: response.error };
  }

  // Parse the response based on content type
  const items = parseContentResponse(response.content || '', request.type, parseAsArray);

  return {
    success: true,
    items,
    tokensUsed: response.tokensUsed
  };
}

/**
 * Generates headlines
 */
export async function generateHeadlines(
  profile: VoiceProfile,
  count: number = 5,
  context?: string
): Promise<ContentGenerationResult> {
  return generateContent(profile, {
    type: 'headline',
    count,
    context
  });
}

/**
 * Generates ad copy
 */
export async function generateAdCopy(
  profile: VoiceProfile,
  count: number = 3,
  platform: 'facebook' | 'instagram' | 'google' = 'facebook',
  context?: string
): Promise<ContentGenerationResult> {
  return generateContent(profile, {
    type: 'ad_copy',
    count,
    platform,
    context
  });
}

/**
 * Generates CTAs
 */
export async function generateCTAs(
  profile: VoiceProfile,
  count: number = 5,
  context?: string
): Promise<ContentGenerationResult> {
  return generateContent(profile, {
    type: 'cta',
    count,
    context
  });
}

/**
 * Generates email template
 */
export async function generateEmailTemplate(
  profile: VoiceProfile,
  purpose: 'welcome' | 'follow_up' | 'promotional' | 'reminder' = 'welcome',
  context?: string
): Promise<{
  success: boolean;
  email?: EmailTemplate;
  error?: { code: string; message: string };
}> {
  const result = await generateContent(profile, {
    type: 'email',
    context: context || purpose,
    tone: purpose === 'promotional' ? 'promotional' : 'educational'
  });

  if (!result.success || !result.items?.[0]) {
    return { success: false, error: result.error };
  }

  try {
    const email = JSON.parse(result.items[0].content) as EmailTemplate;
    return { success: true, email };
  } catch {
    return {
      success: false,
      error: { code: 'PARSE_ERROR', message: 'Failed to parse email template' }
    };
  }
}

/**
 * Generates social media posts
 */
export async function generateSocialPosts(
  profile: VoiceProfile,
  count: number = 3,
  platform: 'facebook' | 'instagram' = 'facebook'
): Promise<ContentGenerationResult> {
  return generateContent(profile, {
    type: 'social_post',
    count,
    platform
  });
}

/**
 * Generates landing page content
 */
export async function generateLandingPageContent(
  profile: VoiceProfile,
  context?: string
): Promise<{
  success: boolean;
  content?: LandingPageContent;
  error?: { code: string; message: string };
}> {
  const result = await generateContent(profile, {
    type: 'landing_page',
    context: context || 'dental implant consultation'
  });

  if (!result.success || !result.items?.[0]) {
    return { success: false, error: result.error };
  }

  try {
    const content = JSON.parse(result.items[0].content) as LandingPageContent;
    return { success: true, content };
  } catch {
    return {
      success: false,
      error: { code: 'PARSE_ERROR', message: 'Failed to parse landing page content' }
    };
  }
}

/**
 * Generates blog post outline
 */
export async function generateBlogOutline(
  profile: VoiceProfile,
  topic: string
): Promise<{
  success: boolean;
  outline?: BlogOutline;
  error?: { code: string; message: string };
}> {
  const result = await generateContent(profile, {
    type: 'blog_outline',
    context: topic
  });

  if (!result.success || !result.items?.[0]) {
    return { success: false, error: result.error };
  }

  try {
    const outline = JSON.parse(result.items[0].content) as BlogOutline;
    return { success: true, outline };
  } catch {
    return {
      success: false,
      error: { code: 'PARSE_ERROR', message: 'Failed to parse blog outline' }
    };
  }
}

/**
 * Generates SMS messages
 */
export async function generateSMSMessages(
  profile: VoiceProfile,
  count: number = 3,
  purpose: 'appointment_reminder' | 'follow_up' | 'promotional' = 'appointment_reminder'
): Promise<ContentGenerationResult> {
  return generateContent(profile, {
    type: 'sms',
    count,
    context: purpose
  });
}

/**
 * Generates review response
 */
export async function generateReviewResponse(
  profile: VoiceProfile,
  reviewType: 'positive' | 'negative' | 'neutral' = 'positive'
): Promise<{
  success: boolean;
  response?: string;
  error?: { code: string; message: string };
}> {
  const result = await generateContent(profile, {
    type: 'review_response',
    context: reviewType
  });

  if (!result.success || !result.items?.[0]) {
    return { success: false, error: result.error };
  }

  return { success: true, response: result.items[0].content };
}

// =============================================================================
// Batch Content Generation
// =============================================================================

export interface BatchContentRequest {
  headlines?: { count: number; context?: string };
  adCopy?: { count: number; platform?: 'facebook' | 'instagram' | 'google'; context?: string };
  ctas?: { count: number; context?: string };
  email?: { purpose?: 'welcome' | 'follow_up' | 'promotional' | 'reminder' };
  socialPosts?: { count: number; platform?: 'facebook' | 'instagram' };
}

export interface BatchContentResult {
  success: boolean;
  results: {
    headlines?: GeneratedContentItem[];
    adCopy?: GeneratedContentItem[];
    ctas?: GeneratedContentItem[];
    email?: EmailTemplate;
    socialPosts?: GeneratedContentItem[];
  };
  errors: Array<{ type: string; error: string }>;
  totalTokensUsed: number;
}

/**
 * Generates multiple types of content in batch
 */
export async function generateBatchContent(
  profile: VoiceProfile,
  requests: BatchContentRequest
): Promise<BatchContentResult> {
  const results: BatchContentResult['results'] = {};
  const errors: BatchContentResult['errors'] = [];
  let totalTokensUsed = 0;

  // Generate headlines
  if (requests.headlines) {
    const result = await generateHeadlines(
      profile,
      requests.headlines.count,
      requests.headlines.context
    );
    if (result.success) {
      results.headlines = result.items;
      totalTokensUsed += result.tokensUsed?.total || 0;
    } else {
      errors.push({ type: 'headlines', error: result.error?.message || 'Unknown error' });
    }
  }

  // Generate ad copy
  if (requests.adCopy) {
    const result = await generateAdCopy(
      profile,
      requests.adCopy.count,
      requests.adCopy.platform,
      requests.adCopy.context
    );
    if (result.success) {
      results.adCopy = result.items;
      totalTokensUsed += result.tokensUsed?.total || 0;
    } else {
      errors.push({ type: 'adCopy', error: result.error?.message || 'Unknown error' });
    }
  }

  // Generate CTAs
  if (requests.ctas) {
    const result = await generateCTAs(
      profile,
      requests.ctas.count,
      requests.ctas.context
    );
    if (result.success) {
      results.ctas = result.items;
      totalTokensUsed += result.tokensUsed?.total || 0;
    } else {
      errors.push({ type: 'ctas', error: result.error?.message || 'Unknown error' });
    }
  }

  // Generate email
  if (requests.email) {
    const result = await generateEmailTemplate(profile, requests.email.purpose);
    if (result.success) {
      results.email = result.email;
    } else {
      errors.push({ type: 'email', error: result.error?.message || 'Unknown error' });
    }
  }

  // Generate social posts
  if (requests.socialPosts) {
    const result = await generateSocialPosts(
      profile,
      requests.socialPosts.count,
      requests.socialPosts.platform
    );
    if (result.success) {
      results.socialPosts = result.items;
      totalTokensUsed += result.tokensUsed?.total || 0;
    } else {
      errors.push({ type: 'socialPosts', error: result.error?.message || 'Unknown error' });
    }
  }

  return {
    success: errors.length === 0,
    results,
    errors,
    totalTokensUsed
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Builds a prompt with variable substitution
 */
function buildPrompt(
  template: string,
  profile: VoiceProfile,
  variables: Record<string, string | number>
): string {
  let prompt = template;

  // Substitute profile variables
  prompt = prompt.replace(/{TONE}/g, profile.tone);
  prompt = prompt.replace(/{PERSONALITY}/g, profile.personality);
  prompt = prompt.replace(/{FORMALITY}/g, profile.formalityLevel);
  prompt = prompt.replace(/{AUDIENCE}/g, profile.targetAudience);
  prompt = prompt.replace(/{DIFFERENTIATORS}/g, profile.keyDifferentiators.join(', '));
  prompt = prompt.replace(/{PREFERRED}/g, profile.preferredTerms.slice(0, 5).join(', '));
  prompt = prompt.replace(/{AVOID}/g, profile.avoidTerms.slice(0, 5).join(', '));

  // Substitute custom variables
  for (const [key, value] of Object.entries(variables)) {
    const pattern = new RegExp(`\\{${key.toUpperCase()}\\}`, 'g');
    prompt = prompt.replace(pattern, String(value));
  }

  return prompt;
}

/**
 * Parses content response into items
 */
function parseContentResponse(
  content: string,
  type: ContentType,
  parseAsArray: boolean
): GeneratedContentItem[] {
  // Try to extract JSON from content
  let jsonString = content;
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonString = jsonMatch[1].trim();
  }

  try {
    if (parseAsArray) {
      const items = JSON.parse(jsonString) as string[];
      return items.map((item, index) => ({
        id: generateContentId(),
        type,
        content: item,
        metadata: {
          wordCount: item.split(/\s+/).length,
          characterCount: item.length
        }
      }));
    } else {
      // Return as single item
      return [{
        id: generateContentId(),
        type,
        content: jsonString,
        metadata: {
          wordCount: content.split(/\s+/).length,
          characterCount: content.length
        }
      }];
    }
  } catch {
    // If JSON parsing fails, return raw content
    return [{
      id: generateContentId(),
      type,
      content: content,
      metadata: {
        wordCount: content.split(/\s+/).length,
        characterCount: content.length
      }
    }];
  }
}

/**
 * Generates a unique content ID
 */
function generateContentId(): string {
  return `cnt_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
}

// =============================================================================
// Exports
// =============================================================================

export const contentGenerator = {
  generateContent,
  generateHeadlines,
  generateAdCopy,
  generateCTAs,
  generateEmailTemplate,
  generateSocialPosts,
  generateLandingPageContent,
  generateBlogOutline,
  generateSMSMessages,
  generateReviewResponse,
  generateBatchContent
};

export default contentGenerator;
