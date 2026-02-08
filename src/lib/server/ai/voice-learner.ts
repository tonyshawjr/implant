/**
 * Voice Learning System
 *
 * Tracks and learns from content feedback to improve voice profiles:
 * - Tracks approved/rejected content
 * - Analyzes patterns in approved vs rejected content
 * - Refines voice profiles based on feedback
 * - Stores learning data for continuous improvement
 */

import { prisma } from '$lib/server/db';
import { ai, type AIMessage } from './client';
import type { VoiceProfile } from './voice-generator';
import type { ContentType } from './content-generator';

// =============================================================================
// Types
// =============================================================================

export interface ContentFeedback {
  id: string;
  organizationId: string;
  voiceProfileId: string;
  contentType: ContentType;
  content: string;
  status: 'approved' | 'rejected' | 'edited';
  editedContent?: string;
  rejectionReason?: string;
  feedbackTags?: string[];
  createdAt: Date;
}

export interface LearningPattern {
  pattern: string;
  frequency: number;
  examples: string[];
  associatedFeedback: 'positive' | 'negative';
}

export interface VoiceLearningData {
  organizationId: string;
  voiceProfileId: string;
  totalFeedbackCount: number;
  approvalRate: number;
  patterns: {
    approved: LearningPattern[];
    rejected: LearningPattern[];
  };
  termPreferences: {
    preferred: Array<{ term: string; score: number }>;
    avoided: Array<{ term: string; score: number }>;
  };
  toneAdjustments: {
    dimension: string;
    currentValue: number;
    suggestedValue: number;
    confidence: number;
  }[];
  lastAnalyzedAt: Date;
}

export interface LearningAnalysisResult {
  success: boolean;
  insights?: {
    summary: string;
    approvalRate: number;
    topApprovedPatterns: string[];
    topRejectionReasons: string[];
    suggestedAdjustments: Array<{
      type: string;
      description: string;
      confidence: number;
    }>;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface ProfileRefinementResult {
  success: boolean;
  refinements?: {
    preferredTermsAdded: string[];
    preferredTermsRemoved: string[];
    avoidTermsAdded: string[];
    avoidTermsRemoved: string[];
    toneAdjustments: Array<{
      dimension: string;
      oldValue: number;
      newValue: number;
    }>;
    confidence: number;
  };
  error?: {
    code: string;
    message: string;
  };
}

// =============================================================================
// In-Memory Storage (would use Redis/DB in production)
// =============================================================================

// Store feedback data in memory for development
const feedbackStore: Map<string, ContentFeedback[]> = new Map();
const learningDataStore: Map<string, VoiceLearningData> = new Map();

// =============================================================================
// Feedback Recording Functions
// =============================================================================

/**
 * Records content approval
 */
export async function recordApproval(
  organizationId: string,
  voiceProfileId: string,
  contentType: ContentType,
  content: string,
  tags?: string[]
): Promise<{ success: boolean; feedbackId: string }> {
  const feedback: ContentFeedback = {
    id: generateFeedbackId(),
    organizationId,
    voiceProfileId,
    contentType,
    content,
    status: 'approved',
    feedbackTags: tags,
    createdAt: new Date()
  };

  // Store in memory
  const key = `${organizationId}:${voiceProfileId}`;
  const existing = feedbackStore.get(key) || [];
  existing.push(feedback);
  feedbackStore.set(key, existing);

  // Also log to database for persistence (create a simple log entry)
  try {
    await prisma.auditLog.create({
      data: {
        organizationId,
        action: 'content_approval',
        entityType: 'voice_profile',
        entityId: voiceProfileId,
        newValues: {
          feedbackId: feedback.id,
          contentType,
          content: content.substring(0, 500),
          status: 'approved',
          tags
        }
      }
    });
  } catch (error) {
    console.error('Failed to log content approval:', error);
  }

  return { success: true, feedbackId: feedback.id };
}

/**
 * Records content rejection
 */
export async function recordRejection(
  organizationId: string,
  voiceProfileId: string,
  contentType: ContentType,
  content: string,
  reason?: string,
  tags?: string[]
): Promise<{ success: boolean; feedbackId: string }> {
  const feedback: ContentFeedback = {
    id: generateFeedbackId(),
    organizationId,
    voiceProfileId,
    contentType,
    content,
    status: 'rejected',
    rejectionReason: reason,
    feedbackTags: tags,
    createdAt: new Date()
  };

  // Store in memory
  const key = `${organizationId}:${voiceProfileId}`;
  const existing = feedbackStore.get(key) || [];
  existing.push(feedback);
  feedbackStore.set(key, existing);

  // Log to database
  try {
    await prisma.auditLog.create({
      data: {
        organizationId,
        action: 'content_rejection',
        entityType: 'voice_profile',
        entityId: voiceProfileId,
        newValues: {
          feedbackId: feedback.id,
          contentType,
          content: content.substring(0, 500),
          status: 'rejected',
          reason,
          tags
        }
      }
    });
  } catch (error) {
    console.error('Failed to log content rejection:', error);
  }

  return { success: true, feedbackId: feedback.id };
}

/**
 * Records content edit (user modified the generated content)
 */
export async function recordEdit(
  organizationId: string,
  voiceProfileId: string,
  contentType: ContentType,
  originalContent: string,
  editedContent: string,
  tags?: string[]
): Promise<{ success: boolean; feedbackId: string }> {
  const feedback: ContentFeedback = {
    id: generateFeedbackId(),
    organizationId,
    voiceProfileId,
    contentType,
    content: originalContent,
    status: 'edited',
    editedContent,
    feedbackTags: tags,
    createdAt: new Date()
  };

  // Store in memory
  const key = `${organizationId}:${voiceProfileId}`;
  const existing = feedbackStore.get(key) || [];
  existing.push(feedback);
  feedbackStore.set(key, existing);

  // Log to database
  try {
    await prisma.auditLog.create({
      data: {
        organizationId,
        action: 'content_edit',
        entityType: 'voice_profile',
        entityId: voiceProfileId,
        oldValues: { content: originalContent.substring(0, 500) },
        newValues: {
          feedbackId: feedback.id,
          contentType,
          editedContent: editedContent.substring(0, 500),
          status: 'edited',
          tags
        }
      }
    });
  } catch (error) {
    console.error('Failed to log content edit:', error);
  }

  return { success: true, feedbackId: feedback.id };
}

// =============================================================================
// Feedback Analysis Functions
// =============================================================================

/**
 * Gets all feedback for a voice profile
 */
export function getFeedbackHistory(
  organizationId: string,
  voiceProfileId: string,
  limit: number = 100
): ContentFeedback[] {
  const key = `${organizationId}:${voiceProfileId}`;
  const feedback = feedbackStore.get(key) || [];

  return feedback
    .slice(-limit)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/**
 * Gets feedback statistics
 */
export function getFeedbackStats(
  organizationId: string,
  voiceProfileId: string
): {
  total: number;
  approved: number;
  rejected: number;
  edited: number;
  approvalRate: number;
  byContentType: Record<ContentType, { approved: number; rejected: number }>;
} {
  const feedback = getFeedbackHistory(organizationId, voiceProfileId, 1000);

  const stats = {
    total: feedback.length,
    approved: 0,
    rejected: 0,
    edited: 0,
    approvalRate: 0,
    byContentType: {} as Record<ContentType, { approved: number; rejected: number }>
  };

  for (const item of feedback) {
    if (item.status === 'approved') stats.approved++;
    else if (item.status === 'rejected') stats.rejected++;
    else if (item.status === 'edited') stats.edited++;

    if (!stats.byContentType[item.contentType]) {
      stats.byContentType[item.contentType] = { approved: 0, rejected: 0 };
    }

    if (item.status === 'approved') {
      stats.byContentType[item.contentType].approved++;
    } else if (item.status === 'rejected') {
      stats.byContentType[item.contentType].rejected++;
    }
  }

  stats.approvalRate = stats.total > 0
    ? Math.round((stats.approved / stats.total) * 100)
    : 0;

  return stats;
}

/**
 * Analyzes feedback patterns using AI
 */
export async function analyzeFeedbackPatterns(
  organizationId: string,
  voiceProfileId: string
): Promise<LearningAnalysisResult> {
  const feedback = getFeedbackHistory(organizationId, voiceProfileId, 50);

  if (feedback.length < 5) {
    return {
      success: false,
      error: {
        code: 'INSUFFICIENT_DATA',
        message: 'Need at least 5 feedback entries to analyze patterns'
      }
    };
  }

  const approved = feedback.filter(f => f.status === 'approved');
  const rejected = feedback.filter(f => f.status === 'rejected');

  const analysisPrompt = `Analyze this content feedback data to identify patterns:

APPROVED CONTENT (${approved.length} items):
${approved.map((f, i) => `${i + 1}. [${f.contentType}] ${f.content}`).join('\n')}

REJECTED CONTENT (${rejected.length} items):
${rejected.map((f, i) => `${i + 1}. [${f.contentType}] ${f.content}${f.rejectionReason ? ` - Reason: ${f.rejectionReason}` : ''}`).join('\n')}

Identify:
1. Common patterns in approved content
2. Common patterns in rejected content
3. Specific terms or phrases that are preferred vs avoided
4. Tone/style differences between approved and rejected
5. Recommendations for improving the voice profile

Respond with JSON:
{
  "summary": "Brief summary of findings",
  "approvedPatterns": ["pattern1", "pattern2", ...],
  "rejectedPatterns": ["pattern1", "pattern2", ...],
  "preferredTerms": ["term1", "term2", ...],
  "avoidedTerms": ["term1", "term2", ...],
  "toneInsights": ["insight1", "insight2", ...],
  "recommendations": [
    {"type": "string", "description": "string", "confidence": 0.0-1.0}
  ]
}`;

  const messages: AIMessage[] = [
    {
      role: 'system',
      content: 'You are an expert at analyzing content feedback patterns to improve brand voice consistency.'
    },
    { role: 'user', content: analysisPrompt }
  ];

  const response = await ai.complete(messages, {
    maxTokens: 1500,
    temperature: 0.3
  });

  if (!response.success) {
    return { success: false, error: response.error };
  }

  const parsed = ai.parseJSONResponse<{
    summary: string;
    approvedPatterns: string[];
    rejectedPatterns: string[];
    preferredTerms: string[];
    avoidedTerms: string[];
    toneInsights: string[];
    recommendations: Array<{ type: string; description: string; confidence: number }>;
  }>(response);

  if (!parsed.success || !parsed.data) {
    return {
      success: false,
      error: { code: 'PARSE_ERROR', message: parsed.error || 'Failed to parse analysis' }
    };
  }

  const stats = getFeedbackStats(organizationId, voiceProfileId);

  return {
    success: true,
    insights: {
      summary: parsed.data.summary,
      approvalRate: stats.approvalRate,
      topApprovedPatterns: parsed.data.approvedPatterns.slice(0, 5),
      topRejectionReasons: parsed.data.rejectedPatterns.slice(0, 5),
      suggestedAdjustments: parsed.data.recommendations.map(r => ({
        type: r.type,
        description: r.description,
        confidence: r.confidence
      }))
    }
  };
}

// =============================================================================
// Profile Refinement Functions
// =============================================================================

/**
 * Suggests refinements to a voice profile based on feedback
 */
export async function suggestProfileRefinements(
  profile: VoiceProfile,
  organizationId: string
): Promise<ProfileRefinementResult> {
  const analysis = await analyzeFeedbackPatterns(organizationId, profile.id);

  if (!analysis.success || !analysis.insights) {
    return {
      success: false,
      error: analysis.error || { code: 'ANALYSIS_FAILED', message: 'Could not analyze feedback' }
    };
  }

  const feedback = getFeedbackHistory(organizationId, profile.id, 100);
  const edited = feedback.filter(f => f.status === 'edited');

  // Analyze edits to find term preferences
  const termChanges = analyzeTermChanges(edited);

  // Calculate confidence based on amount of data
  const confidence = Math.min(0.9, 0.3 + (feedback.length * 0.01));

  const refinements: ProfileRefinementResult['refinements'] = {
    preferredTermsAdded: termChanges.termsAdded.slice(0, 5),
    preferredTermsRemoved: termChanges.termsRemoved.slice(0, 3),
    avoidTermsAdded: termChanges.termsRemoved.slice(0, 5),
    avoidTermsRemoved: [],
    toneAdjustments: [],
    confidence
  };

  // Suggest tone adjustments based on patterns
  if (analysis.insights.approvalRate < 50) {
    // Low approval rate - suggest more significant changes
    refinements.toneAdjustments.push({
      dimension: 'warmth',
      oldValue: profile.voiceCharacteristics.warmth,
      newValue: Math.min(1, profile.voiceCharacteristics.warmth + 0.1)
    });
  }

  return { success: true, refinements };
}

/**
 * Applies refinements to update a voice profile in the database
 */
export async function applyProfileRefinements(
  voiceProfileId: string,
  refinements: ProfileRefinementResult['refinements']
): Promise<{ success: boolean; error?: string }> {
  if (!refinements) {
    return { success: false, error: 'No refinements provided' };
  }

  try {
    // Get current profile
    const currentProfile = await prisma.voiceProfile.findUnique({
      where: { id: voiceProfileId }
    });

    if (!currentProfile) {
      return { success: false, error: 'Voice profile not found' };
    }

    // Get current terms
    const currentPreferred = (currentProfile.preferredTerms as string[]) || [];
    const currentAvoid = (currentProfile.avoidTerms as string[]) || [];

    // Apply term changes
    const newPreferred = [
      ...currentPreferred.filter(t => !refinements.preferredTermsRemoved.includes(t)),
      ...refinements.preferredTermsAdded.filter(t => !currentPreferred.includes(t))
    ].slice(0, 15);

    const newAvoid = [
      ...currentAvoid.filter(t => !refinements.avoidTermsRemoved.includes(t)),
      ...refinements.avoidTermsAdded.filter(t => !currentAvoid.includes(t))
    ].slice(0, 15);

    // Update profile
    await prisma.voiceProfile.update({
      where: { id: voiceProfileId },
      data: {
        preferredTerms: newPreferred,
        avoidTerms: newAvoid,
        updatedAt: new Date()
      }
    });

    // Log the refinement
    await prisma.auditLog.create({
      data: {
        organizationId: currentProfile.organizationId,
        action: 'voice_profile_refinement',
        entityType: 'voice_profile',
        entityId: voiceProfileId,
        oldValues: {
          preferredTerms: currentPreferred,
          avoidTerms: currentAvoid
        },
        newValues: {
          preferredTerms: newPreferred,
          avoidTerms: newAvoid,
          refinementConfidence: refinements.confidence
        }
      }
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to apply profile refinements:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update profile'
    };
  }
}

// =============================================================================
// Learning Data Management
// =============================================================================

/**
 * Gets or creates learning data for a voice profile
 */
export function getLearningData(
  organizationId: string,
  voiceProfileId: string
): VoiceLearningData {
  const key = `${organizationId}:${voiceProfileId}`;
  const existing = learningDataStore.get(key);

  if (existing) {
    return existing;
  }

  // Create new learning data
  const stats = getFeedbackStats(organizationId, voiceProfileId);

  const newData: VoiceLearningData = {
    organizationId,
    voiceProfileId,
    totalFeedbackCount: stats.total,
    approvalRate: stats.approvalRate,
    patterns: {
      approved: [],
      rejected: []
    },
    termPreferences: {
      preferred: [],
      avoided: []
    },
    toneAdjustments: [],
    lastAnalyzedAt: new Date()
  };

  learningDataStore.set(key, newData);
  return newData;
}

/**
 * Updates learning data with new analysis
 */
export async function updateLearningData(
  organizationId: string,
  voiceProfileId: string
): Promise<VoiceLearningData> {
  const analysis = await analyzeFeedbackPatterns(organizationId, voiceProfileId);
  const stats = getFeedbackStats(organizationId, voiceProfileId);

  const data: VoiceLearningData = {
    organizationId,
    voiceProfileId,
    totalFeedbackCount: stats.total,
    approvalRate: stats.approvalRate,
    patterns: {
      approved: analysis.insights?.topApprovedPatterns.map(p => ({
        pattern: p,
        frequency: 1,
        examples: [],
        associatedFeedback: 'positive' as const
      })) || [],
      rejected: analysis.insights?.topRejectionReasons.map(p => ({
        pattern: p,
        frequency: 1,
        examples: [],
        associatedFeedback: 'negative' as const
      })) || []
    },
    termPreferences: {
      preferred: [],
      avoided: []
    },
    toneAdjustments: analysis.insights?.suggestedAdjustments.map(a => ({
      dimension: a.type,
      currentValue: 0.5,
      suggestedValue: 0.6,
      confidence: a.confidence
    })) || [],
    lastAnalyzedAt: new Date()
  };

  const key = `${organizationId}:${voiceProfileId}`;
  learningDataStore.set(key, data);

  return data;
}

/**
 * Clears all learning data (useful for testing or reset)
 */
export function clearLearningData(
  organizationId: string,
  voiceProfileId: string
): void {
  const key = `${organizationId}:${voiceProfileId}`;
  feedbackStore.delete(key);
  learningDataStore.delete(key);
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Generates a unique feedback ID
 */
function generateFeedbackId(): string {
  return `fb_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
}

/**
 * Analyzes edited content to find term changes
 */
function analyzeTermChanges(editedFeedback: ContentFeedback[]): {
  termsAdded: string[];
  termsRemoved: string[];
} {
  const termsAdded: Map<string, number> = new Map();
  const termsRemoved: Map<string, number> = new Map();

  for (const feedback of editedFeedback) {
    if (!feedback.editedContent) continue;

    const originalWords = extractSignificantTerms(feedback.content);
    const editedWords = extractSignificantTerms(feedback.editedContent);

    // Find added terms
    for (const word of editedWords) {
      if (!originalWords.has(word)) {
        termsAdded.set(word, (termsAdded.get(word) || 0) + 1);
      }
    }

    // Find removed terms
    for (const word of originalWords) {
      if (!editedWords.has(word)) {
        termsRemoved.set(word, (termsRemoved.get(word) || 0) + 1);
      }
    }
  }

  // Sort by frequency
  const sortedAdded = [...termsAdded.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([term]) => term);

  const sortedRemoved = [...termsRemoved.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([term]) => term);

  return {
    termsAdded: sortedAdded,
    termsRemoved: sortedRemoved
  };
}

/**
 * Extracts significant terms from text (filters common words)
 */
function extractSignificantTerms(text: string): Set<string> {
  const commonWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that',
    'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
    'my', 'your', 'our', 'their', 'its'
  ]);

  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3 && !commonWords.has(w));

  return new Set(words);
}

// =============================================================================
// Exports
// =============================================================================

export const voiceLearner = {
  recordApproval,
  recordRejection,
  recordEdit,
  getFeedbackHistory,
  getFeedbackStats,
  analyzeFeedbackPatterns,
  suggestProfileRefinements,
  applyProfileRefinements,
  getLearningData,
  updateLearningData,
  clearLearningData
};

export default voiceLearner;
