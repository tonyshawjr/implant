/**
 * Web Scraping Service
 *
 * Extracts content from various sources for brand voice analysis:
 * - Website content extraction
 * - Social media profile scraping (mock)
 * - Google My Business data (mock)
 * - Content cleaning and sanitization
 */

// =============================================================================
// Types
// =============================================================================

export interface ScrapedContent {
  success: boolean;
  sourceType: 'website' | 'facebook' | 'instagram' | 'google_business' | 'document';
  sourceUrl: string;
  title?: string;
  description?: string;
  content: string;
  metadata?: {
    wordCount: number;
    characterCount: number;
    extractedAt: Date;
    language?: string;
    pageType?: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface WebsiteContent {
  title: string;
  description: string;
  headings: string[];
  paragraphs: string[];
  callsToAction: string[];
  testimonials: string[];
  services: string[];
  aboutContent: string;
  contactInfo: {
    phone?: string;
    email?: string;
    address?: string;
  };
}

export interface SocialMediaContent {
  platform: 'facebook' | 'instagram';
  profileName: string;
  bio: string;
  posts: {
    content: string;
    date: Date;
    engagement: {
      likes: number;
      comments: number;
      shares?: number;
    };
  }[];
  hashtags: string[];
  tone: string;
}

export interface GoogleBusinessContent {
  businessName: string;
  category: string;
  description: string;
  reviews: {
    rating: number;
    text: string;
    date: Date;
  }[];
  attributes: string[];
  services: string[];
  averageRating: number;
}

// =============================================================================
// Configuration
// =============================================================================

const SCRAPING_CONFIG = {
  maxContentLength: 50000,
  timeout: 30000,
  userAgent: 'SqueezMedia Brand Voice Analyzer/1.0',
  allowedProtocols: ['http:', 'https:']
};

// =============================================================================
// Content Cleaning Utilities
// =============================================================================

/**
 * Removes HTML tags and cleans text content
 */
export function stripHtml(html: string): string {
  // Remove script and style tags with their content
  let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  // Remove all HTML tags
  text = text.replace(/<[^>]+>/g, ' ');

  // Decode HTML entities
  text = decodeHtmlEntities(text);

  // Clean up whitespace
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

/**
 * Decodes common HTML entities
 */
function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    '&nbsp;': ' ',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&copy;': '(c)',
    '&reg;': '(R)',
    '&trade;': '(TM)',
    '&mdash;': '-',
    '&ndash;': '-',
    '&hellip;': '...'
  };

  let result = text;
  for (const [entity, char] of Object.entries(entities)) {
    result = result.replace(new RegExp(entity, 'gi'), char);
  }

  // Handle numeric entities
  result = result.replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num)));
  result = result.replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

  return result;
}

/**
 * Sanitizes text content for brand voice analysis
 */
export function sanitizeContent(text: string): string {
  // Remove excessive whitespace
  let cleaned = text.replace(/\s+/g, ' ').trim();

  // Remove common website boilerplate
  const boilerplatePatterns = [
    /cookie\s*(policy|consent|notice)/gi,
    /privacy\s*policy/gi,
    /terms\s*(of\s*service|and\s*conditions)/gi,
    /all\s*rights\s*reserved/gi,
    /copyright\s*\d{4}/gi,
    /subscribe\s*to\s*(our\s*)?(newsletter|updates)/gi,
    /follow\s*us\s*on/gi,
    /share\s*(this|on)/gi
  ];

  for (const pattern of boilerplatePatterns) {
    cleaned = cleaned.replace(pattern, '');
  }

  // Limit content length
  if (cleaned.length > SCRAPING_CONFIG.maxContentLength) {
    cleaned = cleaned.substring(0, SCRAPING_CONFIG.maxContentLength);
  }

  return cleaned.trim();
}

/**
 * Extracts meaningful sentences from text
 */
export function extractSentences(text: string, maxCount: number = 100): string[] {
  // Split by sentence-ending punctuation
  const sentences = text
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 20 && s.length < 500); // Filter very short or very long

  return sentences.slice(0, maxCount);
}

// =============================================================================
// Website Scraping (Mock with Real Fetch Fallback)
// =============================================================================

/**
 * Fetches and parses website content
 */
export async function scrapeWebsite(url: string): Promise<ScrapedContent> {
  try {
    // Validate URL
    const parsedUrl = new URL(url);
    if (!SCRAPING_CONFIG.allowedProtocols.includes(parsedUrl.protocol)) {
      return {
        success: false,
        sourceType: 'website',
        sourceUrl: url,
        content: '',
        error: {
          code: 'INVALID_PROTOCOL',
          message: 'Only HTTP and HTTPS URLs are supported'
        }
      };
    }

    // Try to fetch the actual website
    let html = '';
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), SCRAPING_CONFIG.timeout);

      const response = await fetch(url, {
        headers: {
          'User-Agent': SCRAPING_CONFIG.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      html = await response.text();
    } catch (fetchError) {
      // If fetch fails, use mock content for development
      console.log(`[Scraper] Fetch failed for ${url}, using mock content:`, fetchError);
      return generateMockWebsiteContent(url);
    }

    // Extract content from HTML
    const content = parseWebsiteHtml(html);
    const cleanedContent = sanitizeContent(content.allText);

    return {
      success: true,
      sourceType: 'website',
      sourceUrl: url,
      title: content.title,
      description: content.description,
      content: cleanedContent,
      metadata: {
        wordCount: cleanedContent.split(/\s+/).length,
        characterCount: cleanedContent.length,
        extractedAt: new Date(),
        pageType: detectPageType(content)
      }
    };
  } catch (error) {
    return {
      success: false,
      sourceType: 'website',
      sourceUrl: url,
      content: '',
      error: {
        code: 'SCRAPE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to scrape website'
      }
    };
  }
}

/**
 * Parses HTML content into structured data
 */
function parseWebsiteHtml(html: string): {
  title: string;
  description: string;
  headings: string[];
  paragraphs: string[];
  allText: string;
} {
  // Extract title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? stripHtml(titleMatch[1]) : '';

  // Extract meta description
  const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
  const description = descMatch ? stripHtml(descMatch[1]) : '';

  // Extract headings
  const headingMatches = html.matchAll(/<h[1-6][^>]*>([^<]+)<\/h[1-6]>/gi);
  const headings = Array.from(headingMatches).map(m => stripHtml(m[1]));

  // Extract paragraphs
  const paragraphMatches = html.matchAll(/<p[^>]*>([^<]*(?:<[^>]+>[^<]*)*)<\/p>/gi);
  const paragraphs = Array.from(paragraphMatches)
    .map(m => stripHtml(m[1]))
    .filter(p => p.length > 50);

  // Combine all text
  const allText = stripHtml(html);

  return { title, description, headings, paragraphs, allText };
}

/**
 * Detects the type of page based on content
 */
function detectPageType(content: { title: string; headings: string[]; allText: string }): string {
  const lowerText = content.allText.toLowerCase();

  if (lowerText.includes('about us') || lowerText.includes('our story') || lowerText.includes('our team')) {
    return 'about';
  }
  if (lowerText.includes('service') || lowerText.includes('what we offer')) {
    return 'services';
  }
  if (lowerText.includes('contact') || lowerText.includes('get in touch')) {
    return 'contact';
  }
  if (lowerText.includes('testimonial') || lowerText.includes('review') || lowerText.includes('patient stories')) {
    return 'testimonials';
  }
  if (lowerText.includes('blog') || lowerText.includes('article')) {
    return 'blog';
  }

  return 'home';
}

/**
 * Generates mock website content for development/testing
 */
function generateMockWebsiteContent(url: string): ScrapedContent {
  const domain = new URL(url).hostname;

  const mockContent = `
    Welcome to ${domain} - Your Trusted Dental Implant Specialists

    About Our Practice:
    With over 20 years of experience in dental implant procedures, our team of board-certified
    specialists is dedicated to helping patients restore their smiles with confidence. We combine
    cutting-edge technology with compassionate, personalized care to deliver exceptional results.

    Our Services:
    - Single tooth implants for isolated tooth loss
    - Full arch restoration for complete smile makeovers
    - Implant-supported dentures for enhanced stability
    - All-on-4 solutions for efficient full-mouth restoration

    Why Choose Us:
    Our patients choose us because we prioritize comfort and communication throughout their journey.
    From your initial consultation to your final follow-up, our team is here to support you every step.

    Patient Testimonials:
    "The entire experience was wonderful. The staff made me feel comfortable and the results exceeded
    my expectations. I can smile with confidence again!" - Sarah M.

    "I was nervous about getting implants, but Dr. Smith and his team put my mind at ease. The procedure
    was much easier than I expected and my new teeth look completely natural." - John D.

    Schedule Your Free Consultation Today:
    Take the first step toward your new smile. Our consultations include a comprehensive exam,
    3D imaging, and a personalized treatment plan tailored to your needs.

    Contact us at (555) 123-4567 or email smile@${domain}

    Located at 123 Dental Way, Your City, State 12345
    Serving patients throughout the metropolitan area
  `;

  return {
    success: true,
    sourceType: 'website',
    sourceUrl: url,
    title: `${domain} - Dental Implant Specialists`,
    description: 'Leading dental implant practice offering personalized care and advanced technology.',
    content: sanitizeContent(mockContent),
    metadata: {
      wordCount: mockContent.split(/\s+/).length,
      characterCount: mockContent.length,
      extractedAt: new Date(),
      pageType: 'home'
    }
  };
}

// =============================================================================
// Social Media Scraping (Mock)
// =============================================================================

/**
 * Scrapes Facebook profile/page content (mock implementation)
 */
export async function scrapeFacebook(pageUrl: string): Promise<ScrapedContent> {
  // In production, this would use Facebook Graph API
  // For now, return mock content

  const mockContent: SocialMediaContent = {
    platform: 'facebook',
    profileName: 'Premium Dental Implants',
    bio: 'Restoring smiles with advanced implant technology. Board-certified specialists providing compassionate care since 2005.',
    posts: [
      {
        content: "Another beautiful smile transformation! Our patient came to us feeling self-conscious about her missing teeth. Today, she left with a complete, natural-looking smile. It's moments like these that remind us why we love what we do.",
        date: new Date(Date.now() - 86400000 * 2),
        engagement: { likes: 127, comments: 23, shares: 15 }
      },
      {
        content: "Did you know that dental implants have a success rate of over 95%? They're designed to last a lifetime with proper care. Schedule your free consultation to learn if implants are right for you!",
        date: new Date(Date.now() - 86400000 * 5),
        engagement: { likes: 89, comments: 12, shares: 8 }
      },
      {
        content: "Meet Dr. Sarah, our lead implant specialist! With over 15 years of experience and advanced training from leading institutions, she's dedicated to providing the highest quality care for every patient.",
        date: new Date(Date.now() - 86400000 * 7),
        engagement: { likes: 156, comments: 34, shares: 21 }
      }
    ],
    hashtags: ['#dentalimplants', '#smilemakeover', '#dentalcare', '#newsmile', '#oralhealth'],
    tone: 'warm, professional, educational'
  };

  const combinedContent = [
    mockContent.bio,
    ...mockContent.posts.map(p => p.content),
    mockContent.hashtags.join(' ')
  ].join('\n\n');

  return {
    success: true,
    sourceType: 'facebook',
    sourceUrl: pageUrl,
    title: mockContent.profileName,
    description: mockContent.bio,
    content: combinedContent,
    metadata: {
      wordCount: combinedContent.split(/\s+/).length,
      characterCount: combinedContent.length,
      extractedAt: new Date()
    }
  };
}

/**
 * Scrapes Instagram profile content (mock implementation)
 */
export async function scrapeInstagram(profileUrl: string): Promise<ScrapedContent> {
  // In production, this would use Instagram Basic Display API
  // For now, return mock content

  const mockContent: SocialMediaContent = {
    platform: 'instagram',
    profileName: 'premiumdentalimplants',
    bio: 'Transforming smiles, changing lives. Expert implant care in a comfortable environment. Free consultations available!',
    posts: [
      {
        content: 'Before & After: This transformation speaks for itself! Swipe to see the incredible difference dental implants made for our patient. Ready to start your journey? Link in bio!',
        date: new Date(Date.now() - 86400000 * 1),
        engagement: { likes: 234, comments: 45 }
      },
      {
        content: 'Your comfort is our priority. Our state-of-the-art facility is designed with you in mind, from relaxing treatment rooms to the latest in dental technology.',
        date: new Date(Date.now() - 86400000 * 3),
        engagement: { likes: 189, comments: 28 }
      },
      {
        content: 'Myth: Dental implants are painful. Reality: Most patients are surprised by how comfortable the procedure is! Modern techniques and sedation options make all the difference.',
        date: new Date(Date.now() - 86400000 * 6),
        engagement: { likes: 312, comments: 67 }
      }
    ],
    hashtags: ['#dentalimplants', '#smiletransformation', '#beforeandafter', '#cosmeticdentistry', '#implantdentist'],
    tone: 'aspirational, visual, encouraging'
  };

  const combinedContent = [
    mockContent.bio,
    ...mockContent.posts.map(p => p.content),
    mockContent.hashtags.join(' ')
  ].join('\n\n');

  return {
    success: true,
    sourceType: 'instagram',
    sourceUrl: profileUrl,
    title: `@${mockContent.profileName}`,
    description: mockContent.bio,
    content: combinedContent,
    metadata: {
      wordCount: combinedContent.split(/\s+/).length,
      characterCount: combinedContent.length,
      extractedAt: new Date()
    }
  };
}

// =============================================================================
// Google My Business Scraping (Mock)
// =============================================================================

/**
 * Scrapes Google My Business profile content (mock implementation)
 */
export async function scrapeGoogleBusiness(businessUrl: string): Promise<ScrapedContent> {
  // In production, this would use Google My Business API
  // For now, return mock content

  const mockContent: GoogleBusinessContent = {
    businessName: 'Premium Dental Implants Center',
    category: 'Dental Implant Provider',
    description: 'Premier dental implant center offering comprehensive implant solutions with cutting-edge technology and experienced specialists. We provide personalized care from consultation through recovery.',
    reviews: [
      {
        rating: 5,
        text: 'Absolutely wonderful experience! Dr. Johnson and his team made me feel so comfortable throughout the entire process. My new implants look and feel completely natural. Highly recommend!',
        date: new Date(Date.now() - 86400000 * 10)
      },
      {
        rating: 5,
        text: 'After years of hiding my smile, I finally took the leap and got dental implants. The results are amazing! The staff is incredibly kind and professional. Thank you!',
        date: new Date(Date.now() - 86400000 * 25)
      },
      {
        rating: 4,
        text: 'Great experience overall. The procedure was much easier than expected. Only giving 4 stars because scheduling the initial consultation took a bit longer than I hoped.',
        date: new Date(Date.now() - 86400000 * 40)
      },
      {
        rating: 5,
        text: 'I was so nervous about getting implants but this team put my mind at ease. They explained everything clearly and the results exceeded my expectations.',
        date: new Date(Date.now() - 86400000 * 55)
      }
    ],
    attributes: [
      'Wheelchair accessible',
      'Free Wi-Fi',
      'Accepts insurance',
      'Parking available',
      'Same-day appointments'
    ],
    services: [
      'Single tooth implants',
      'Full arch implants',
      'All-on-4',
      'Bone grafting',
      'Implant-supported dentures',
      'Free consultations'
    ],
    averageRating: 4.8
  };

  const combinedContent = [
    `Business: ${mockContent.businessName}`,
    `Category: ${mockContent.category}`,
    `Rating: ${mockContent.averageRating}/5`,
    '',
    'Description:',
    mockContent.description,
    '',
    'Services:',
    mockContent.services.join(', '),
    '',
    'Customer Reviews:',
    ...mockContent.reviews.map(r => `(${r.rating}/5) "${r.text}"`)
  ].join('\n');

  return {
    success: true,
    sourceType: 'google_business',
    sourceUrl: businessUrl,
    title: mockContent.businessName,
    description: mockContent.description,
    content: combinedContent,
    metadata: {
      wordCount: combinedContent.split(/\s+/).length,
      characterCount: combinedContent.length,
      extractedAt: new Date()
    }
  };
}

// =============================================================================
// Multi-Source Scraping
// =============================================================================

export interface MultiSourceResult {
  success: boolean;
  sources: ScrapedContent[];
  combinedContent: string;
  totalWordCount: number;
  errors: Array<{ sourceUrl: string; error: string }>;
}

/**
 * Scrapes multiple sources and combines the content
 */
export async function scrapeMultipleSources(
  sources: Array<{
    type: 'website' | 'facebook' | 'instagram' | 'google_business';
    url: string;
  }>
): Promise<MultiSourceResult> {
  const results: ScrapedContent[] = [];
  const errors: Array<{ sourceUrl: string; error: string }> = [];

  for (const source of sources) {
    let result: ScrapedContent;

    switch (source.type) {
      case 'website':
        result = await scrapeWebsite(source.url);
        break;
      case 'facebook':
        result = await scrapeFacebook(source.url);
        break;
      case 'instagram':
        result = await scrapeInstagram(source.url);
        break;
      case 'google_business':
        result = await scrapeGoogleBusiness(source.url);
        break;
      default:
        result = {
          success: false,
          sourceType: 'website',
          sourceUrl: source.url,
          content: '',
          error: {
            code: 'UNKNOWN_TYPE',
            message: `Unknown source type: ${source.type}`
          }
        };
    }

    if (result.success) {
      results.push(result);
    } else {
      errors.push({
        sourceUrl: source.url,
        error: result.error?.message || 'Unknown error'
      });
    }
  }

  // Combine all successful content
  const combinedContent = results
    .map(r => `=== Source: ${r.sourceType} (${r.sourceUrl}) ===\n${r.content}`)
    .join('\n\n');

  const totalWordCount = results.reduce((sum, r) => sum + (r.metadata?.wordCount || 0), 0);

  return {
    success: results.length > 0,
    sources: results,
    combinedContent,
    totalWordCount,
    errors
  };
}

// =============================================================================
// Exports
// =============================================================================

export const scraper = {
  scrapeWebsite,
  scrapeFacebook,
  scrapeInstagram,
  scrapeGoogleBusiness,
  scrapeMultipleSources,
  stripHtml,
  sanitizeContent,
  extractSentences
};

export default scraper;
