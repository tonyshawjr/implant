/**
 * Lead Magnet Funnel Templates - Perspective.co Style
 *
 * Mobile-first, interactive quiz funnels that guide users through
 * questions before capturing lead info. High-converting, engaging format.
 *
 * Dynamic placeholders:
 * - {{practice_name}} - Organization name
 * - {{phone}} - Practice phone
 * - {{city}}, {{state}} - Location
 * - {{logo_url}} - Practice logo
 * - {{organization_id}} - For lead tracking
 */

export interface FunnelStep {
  type: 'welcome' | 'question' | 'info' | 'form' | 'result';
  id: string;
  content: {
    title?: string;
    subtitle?: string;
    image?: string;
    question?: string;
    options?: { label: string; value: string; icon?: string; nextStep?: string }[];
    inputType?: 'text' | 'email' | 'phone' | 'select' | 'textarea';
    inputName?: string;
    inputPlaceholder?: string;
    buttonText?: string;
    skipText?: string;
  };
}

export interface FunnelTemplate {
  slug: string;
  name: string;
  description: string;
  category: 'implant' | 'cosmetic' | 'general' | 'promo';
  thumbnailUrl: string;
  estimatedConversionRate: number;
  steps: FunnelStep[];
  resultLogic?: Record<string, any>;
  styles: {
    primaryColor: string;
    backgroundColor: string;
    accentColor: string;
  };
}

// Template 1: Implant Candidacy Quiz
const implantCandidacyQuiz: FunnelTemplate = {
  slug: 'implant-candidacy-quiz',
  name: 'Am I a Candidate? Quiz',
  description: 'Interactive quiz that helps users determine if they\'re a candidate for dental implants. High engagement, qualifies leads.',
  category: 'implant',
  thumbnailUrl: '/templates/candidacy-quiz-thumb.jpg',
  estimatedConversionRate: 18.5,
  styles: {
    primaryColor: '#2563eb',
    backgroundColor: '#ffffff',
    accentColor: '#22c55e'
  },
  steps: [
    {
      type: 'welcome',
      id: 'welcome',
      content: {
        title: 'Are You a Candidate for Dental Implants?',
        subtitle: 'Take this 60-second quiz to find out if implants are right for you',
        image: '/images/smile-hero.jpg',
        buttonText: 'Start Quiz'
      }
    },
    {
      type: 'question',
      id: 'missing-teeth',
      content: {
        question: 'How many teeth are you missing or need to replace?',
        options: [
          { label: 'Just 1 tooth', value: '1', icon: '🦷' },
          { label: '2-3 teeth', value: '2-3', icon: '🦷🦷' },
          { label: '4 or more teeth', value: '4+', icon: '🦷🦷🦷' },
          { label: 'Most or all teeth', value: 'full', icon: '😬' }
        ]
      }
    },
    {
      type: 'question',
      id: 'current-solution',
      content: {
        question: 'What\'s your current situation?',
        options: [
          { label: 'Missing teeth with no replacement', value: 'none', icon: '😔' },
          { label: 'Wearing dentures', value: 'dentures', icon: '🔄' },
          { label: 'Have a bridge', value: 'bridge', icon: '🌉' },
          { label: 'Teeth need extraction', value: 'extraction', icon: '⚠️' }
        ]
      }
    },
    {
      type: 'question',
      id: 'biggest-concern',
      content: {
        question: 'What\'s your biggest concern about dental implants?',
        options: [
          { label: 'Cost and affordability', value: 'cost', icon: '💰' },
          { label: 'Pain and recovery time', value: 'pain', icon: '😰' },
          { label: 'How long it takes', value: 'time', icon: '⏰' },
          { label: 'Will they look natural?', value: 'appearance', icon: '✨' }
        ]
      }
    },
    {
      type: 'question',
      id: 'timeline',
      content: {
        question: 'When are you looking to get this done?',
        options: [
          { label: 'As soon as possible', value: 'asap', icon: '🚀' },
          { label: 'Within 3 months', value: '3months', icon: '📅' },
          { label: 'Within 6 months', value: '6months', icon: '🗓️' },
          { label: 'Just exploring options', value: 'exploring', icon: '🔍' }
        ]
      }
    },
    {
      type: 'question',
      id: 'age',
      content: {
        question: 'What\'s your age range?',
        options: [
          { label: '35-44', value: '35-44', icon: '👤' },
          { label: '45-54', value: '45-54', icon: '👤' },
          { label: '55-64', value: '55-64', icon: '👤' },
          { label: '65+', value: '65+', icon: '👤' }
        ]
      }
    },
    {
      type: 'info',
      id: 'good-news',
      content: {
        title: 'Great News! 🎉',
        subtitle: 'Based on your answers, you may be an excellent candidate for dental implants. Let\'s get your personalized assessment.',
        buttonText: 'Get My Results'
      }
    },
    {
      type: 'form',
      id: 'contact',
      content: {
        title: 'Where should we send your results?',
        subtitle: 'Plus get a FREE consultation ($350 value)',
        buttonText: 'Get My Free Assessment'
      }
    },
    {
      type: 'result',
      id: 'result',
      content: {
        title: 'You\'re Likely a Great Candidate! ✅',
        subtitle: 'A specialist from {{practice_name}} will call you within 24 hours to schedule your free consultation.',
        buttonText: 'Call Now: {{phone}}'
      }
    }
  ]
};

// Template 2: Cost Calculator Funnel
const costCalculatorFunnel: FunnelTemplate = {
  slug: 'implant-cost-calculator',
  name: 'Implant Cost Calculator',
  description: 'Interactive calculator that gives users a cost estimate based on their needs. Addresses the #1 objection upfront.',
  category: 'implant',
  thumbnailUrl: '/templates/cost-calculator-thumb.jpg',
  estimatedConversionRate: 21.3,
  styles: {
    primaryColor: '#059669',
    backgroundColor: '#ffffff',
    accentColor: '#2563eb'
  },
  steps: [
    {
      type: 'welcome',
      id: 'welcome',
      content: {
        title: 'How Much Will Dental Implants Cost?',
        subtitle: 'Get your personalized estimate in under 2 minutes',
        buttonText: 'Calculate My Cost'
      }
    },
    {
      type: 'question',
      id: 'treatment-type',
      content: {
        question: 'What type of treatment are you considering?',
        options: [
          { label: 'Single tooth implant', value: 'single', icon: '1️⃣' },
          { label: 'Multiple teeth (2-5)', value: 'multiple', icon: '🔢' },
          { label: 'Full arch (All-on-4)', value: 'full-arch', icon: '🦷' },
          { label: 'Full mouth restoration', value: 'full-mouth', icon: '😁' }
        ]
      }
    },
    {
      type: 'question',
      id: 'insurance',
      content: {
        question: 'Do you have dental insurance?',
        options: [
          { label: 'Yes, I have dental insurance', value: 'yes', icon: '✅' },
          { label: 'No insurance', value: 'no', icon: '❌' },
          { label: 'Not sure what it covers', value: 'unsure', icon: '🤔' }
        ]
      }
    },
    {
      type: 'question',
      id: 'financing',
      content: {
        question: 'Are you interested in financing options?',
        options: [
          { label: 'Yes, monthly payments would help', value: 'yes', icon: '💳' },
          { label: 'Maybe, depends on the terms', value: 'maybe', icon: '🤷' },
          { label: 'No, I\'ll pay in full', value: 'no', icon: '💰' }
        ]
      }
    },
    {
      type: 'question',
      id: 'timeline',
      content: {
        question: 'When would you like to start treatment?',
        options: [
          { label: 'Immediately', value: 'asap', icon: '⚡' },
          { label: 'Within 1-2 months', value: '1-2months', icon: '📅' },
          { label: 'Within 6 months', value: '6months', icon: '🗓️' },
          { label: 'Still researching', value: 'researching', icon: '📚' }
        ]
      }
    },
    {
      type: 'info',
      id: 'calculating',
      content: {
        title: 'Calculating Your Estimate...',
        subtitle: 'We\'re preparing your personalized cost breakdown',
        buttonText: 'See My Estimate'
      }
    },
    {
      type: 'form',
      id: 'contact',
      content: {
        title: 'Almost there!',
        subtitle: 'Enter your info to see your personalized cost estimate',
        buttonText: 'Show My Estimate'
      }
    },
    {
      type: 'result',
      id: 'result',
      content: {
        title: 'Your Estimated Investment',
        subtitle: 'Based on your answers, here\'s what to expect. A specialist will call to give you an exact quote.',
        buttonText: 'Schedule Free Consultation'
      }
    }
  ],
  resultLogic: {
    single: { low: 3000, high: 5000, monthly: 99 },
    multiple: { low: 6000, high: 15000, monthly: 199 },
    'full-arch': { low: 15000, high: 25000, monthly: 299 },
    'full-mouth': { low: 30000, high: 50000, monthly: 499 }
  }
};

// Template 3: Smile Transformation Journey
const smileTransformationFunnel: FunnelTemplate = {
  slug: 'smile-transformation',
  name: 'Smile Transformation Journey',
  description: 'Emotional, aspirational funnel that focuses on life after implants. Great for awareness campaigns.',
  category: 'implant',
  thumbnailUrl: '/templates/transformation-thumb.jpg',
  estimatedConversionRate: 16.8,
  styles: {
    primaryColor: '#7c3aed',
    backgroundColor: '#faf5ff',
    accentColor: '#ec4899'
  },
  steps: [
    {
      type: 'welcome',
      id: 'welcome',
      content: {
        title: 'Ready to Love Your Smile Again?',
        subtitle: 'Discover how dental implants can transform your life',
        image: '/images/happy-smile.jpg',
        buttonText: 'Start My Journey'
      }
    },
    {
      type: 'question',
      id: 'struggle',
      content: {
        question: 'What do you struggle with most?',
        options: [
          { label: 'Embarrassed to smile', value: 'embarrassed', icon: '😔' },
          { label: 'Can\'t eat foods I love', value: 'eating', icon: '🍎' },
          { label: 'Dentures are uncomfortable', value: 'dentures', icon: '😫' },
          { label: 'Teeth affect my confidence', value: 'confidence', icon: '💪' }
        ]
      }
    },
    {
      type: 'question',
      id: 'dream',
      content: {
        question: 'What would having a perfect smile mean to you?',
        options: [
          { label: 'Smile in photos again', value: 'photos', icon: '📸' },
          { label: 'Eat anything I want', value: 'eating', icon: '🥩' },
          { label: 'Feel confident at work', value: 'work', icon: '💼' },
          { label: 'Enjoy life without worrying', value: 'freedom', icon: '🎉' }
        ]
      }
    },
    {
      type: 'info',
      id: 'possibility',
      content: {
        title: 'This is possible for you! ✨',
        subtitle: 'Thousands of patients have transformed their lives with dental implants. You deserve to smile with confidence.',
        buttonText: 'Show Me How'
      }
    },
    {
      type: 'question',
      id: 'holding-back',
      content: {
        question: 'What\'s been holding you back?',
        options: [
          { label: 'Worried about the cost', value: 'cost', icon: '💰' },
          { label: 'Afraid of the procedure', value: 'fear', icon: '😰' },
          { label: 'Don\'t know where to start', value: 'confused', icon: '🤷' },
          { label: 'Had a bad experience before', value: 'past', icon: '😞' }
        ]
      }
    },
    {
      type: 'info',
      id: 'reassurance',
      content: {
        title: 'We understand. 💙',
        subtitle: 'That\'s why we offer free consultations with no pressure. Just answers to your questions and a clear path forward.',
        buttonText: 'Take the First Step'
      }
    },
    {
      type: 'form',
      id: 'contact',
      content: {
        title: 'Let\'s Start Your Transformation',
        subtitle: 'Get your free smile consultation',
        buttonText: 'Book My Free Consultation'
      }
    },
    {
      type: 'result',
      id: 'result',
      content: {
        title: 'Your Journey Begins! 🌟',
        subtitle: 'We\'ll call you within 24 hours to schedule your free consultation. Get ready to love your smile!',
        buttonText: 'Call Now: {{phone}}'
      }
    }
  ]
};

// Template 4: Free Consultation Offer
const freeConsultationFunnel: FunnelTemplate = {
  slug: 'free-consultation',
  name: 'Free Consultation Offer',
  description: 'Direct offer funnel with urgency. Quick qualification and strong call-to-action.',
  category: 'promo',
  thumbnailUrl: '/templates/consultation-thumb.jpg',
  estimatedConversionRate: 24.2,
  styles: {
    primaryColor: '#dc2626',
    backgroundColor: '#ffffff',
    accentColor: '#16a34a'
  },
  steps: [
    {
      type: 'welcome',
      id: 'welcome',
      content: {
        title: 'FREE Dental Implant Consultation',
        subtitle: 'Includes 3D CT Scan ($350 Value) - Limited spots this month!',
        buttonText: 'Claim My Free Consultation'
      }
    },
    {
      type: 'question',
      id: 'situation',
      content: {
        question: 'What brings you here today?',
        options: [
          { label: 'Missing teeth', value: 'missing', icon: '🦷' },
          { label: 'Unhappy with dentures', value: 'dentures', icon: '😤' },
          { label: 'Need extractions', value: 'extractions', icon: '⚠️' },
          { label: 'Want to explore options', value: 'exploring', icon: '🔍' }
        ]
      }
    },
    {
      type: 'question',
      id: 'urgency',
      content: {
        question: 'How soon do you want to fix this?',
        options: [
          { label: 'ASAP - I\'m ready!', value: 'asap', icon: '🚀' },
          { label: 'This month', value: 'month', icon: '📅' },
          { label: 'In the next few months', value: 'months', icon: '🗓️' },
          { label: 'Just getting information', value: 'info', icon: '📋' }
        ]
      }
    },
    {
      type: 'form',
      id: 'contact',
      content: {
        title: 'Great! Reserve Your Spot',
        subtitle: 'Only 8 free consultations left this month',
        buttonText: 'Reserve My Spot Now'
      }
    },
    {
      type: 'result',
      id: 'result',
      content: {
        title: 'Your Spot is Reserved! ✅',
        subtitle: 'We\'ll call you within the hour to confirm your free consultation time.',
        buttonText: 'Call Us Now: {{phone}}'
      }
    }
  ]
};

// Template 5: Denture Alternative Quiz
const dentureAlternativeFunnel: FunnelTemplate = {
  slug: 'denture-alternative',
  name: 'Denture Alternative Quiz',
  description: 'Targets denture wearers specifically. Addresses their unique pain points and offers implants as the solution.',
  category: 'implant',
  thumbnailUrl: '/templates/denture-alternative-thumb.jpg',
  estimatedConversionRate: 19.7,
  styles: {
    primaryColor: '#0891b2',
    backgroundColor: '#ecfeff',
    accentColor: '#f59e0b'
  },
  steps: [
    {
      type: 'welcome',
      id: 'welcome',
      content: {
        title: 'Tired of Your Dentures?',
        subtitle: 'Discover if permanent teeth could be right for you',
        buttonText: 'Take the Quiz'
      }
    },
    {
      type: 'question',
      id: 'denture-problems',
      content: {
        question: 'What frustrates you most about dentures?',
        options: [
          { label: 'They slip and move around', value: 'slipping', icon: '😬' },
          { label: 'Can\'t eat what I want', value: 'eating', icon: '🍖' },
          { label: 'Messy adhesives', value: 'adhesives', icon: '😖' },
          { label: 'They just don\'t feel right', value: 'comfort', icon: '😔' }
        ]
      }
    },
    {
      type: 'question',
      id: 'how-long',
      content: {
        question: 'How long have you been wearing dentures?',
        options: [
          { label: 'Less than a year', value: '<1', icon: '📅' },
          { label: '1-5 years', value: '1-5', icon: '📅' },
          { label: '5-10 years', value: '5-10', icon: '📅' },
          { label: 'More than 10 years', value: '10+', icon: '📅' }
        ]
      }
    },
    {
      type: 'info',
      id: 'solution',
      content: {
        title: 'There\'s a Better Way',
        subtitle: 'All-on-4 dental implants give you permanent teeth that look, feel, and function like natural teeth. No more adhesives. No more slipping. Just confidence.',
        buttonText: 'Learn More'
      }
    },
    {
      type: 'question',
      id: 'concerns',
      content: {
        question: 'What concerns you about switching to implants?',
        options: [
          { label: 'The cost', value: 'cost', icon: '💰' },
          { label: 'The surgery', value: 'surgery', icon: '🏥' },
          { label: 'Recovery time', value: 'recovery', icon: '⏰' },
          { label: 'I want to know everything', value: 'all', icon: '📚' }
        ]
      }
    },
    {
      type: 'info',
      id: 'reassurance',
      content: {
        title: 'Good News! 🎉',
        subtitle: 'With modern techniques, most patients are back to normal in days, not weeks. And we have financing as low as $199/month.',
        buttonText: 'Get My Free Evaluation'
      }
    },
    {
      type: 'form',
      id: 'contact',
      content: {
        title: 'Ready to Ditch the Dentures?',
        subtitle: 'Get your free implant evaluation',
        buttonText: 'Yes! Contact Me'
      }
    },
    {
      type: 'result',
      id: 'result',
      content: {
        title: 'Freedom from Dentures is Closer Than You Think! 🦷',
        subtitle: 'We\'ll reach out within 24 hours to schedule your free evaluation.',
        buttonText: 'Call Now: {{phone}}'
      }
    }
  ]
};

// Export all templates
export const funnelTemplates: FunnelTemplate[] = [
  implantCandidacyQuiz,
  costCalculatorFunnel,
  smileTransformationFunnel,
  freeConsultationFunnel,
  dentureAlternativeFunnel
];

export function getTemplateBySlug(slug: string): FunnelTemplate | undefined {
  return funnelTemplates.find(t => t.slug === slug);
}

/**
 * Render a funnel template with organization data
 */
export function renderFunnelHtml(template: FunnelTemplate, orgData: {
  id: string;
  name: string;
  phone: string;
  city: string;
  state: string;
  logoUrl?: string;
  address?: string;
}, landingPageId: string, trackingPixels?: string): string {
  const stepsJson = JSON.stringify(template.steps);
  const stylesJson = JSON.stringify(template.styles);
  const resultLogicJson = JSON.stringify(template.resultLogic || {});

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>${template.name} | ${orgData.name}</title>
  <meta name="description" content="${template.description}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  ${trackingPixels || ''}
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { height: 100%; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: ${template.styles.backgroundColor};
      color: #1f2937;
      line-height: 1.5;
    }

    .funnel {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .funnel-header {
      padding: 16px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(0,0,0,0.05);
    }

    .logo {
      height: 32px;
    }

    .logo-text {
      font-weight: 700;
      font-size: 1.125rem;
      color: ${template.styles.primaryColor};
    }

    .phone-link {
      color: ${template.styles.primaryColor};
      text-decoration: none;
      font-weight: 600;
      font-size: 0.875rem;
    }

    .progress-bar {
      height: 4px;
      background: #e5e7eb;
    }

    .progress-fill {
      height: 100%;
      background: ${template.styles.primaryColor};
      transition: width 0.3s ease;
    }

    .step {
      flex: 1;
      display: none;
      flex-direction: column;
      padding: 40px 24px;
      max-width: 480px;
      margin: 0 auto;
      width: 100%;
    }

    .step.active {
      display: flex;
    }

    .step-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .step-image {
      width: 100%;
      max-height: 200px;
      object-fit: cover;
      border-radius: 16px;
      margin-bottom: 24px;
    }

    .step-title {
      font-size: 1.75rem;
      font-weight: 800;
      margin-bottom: 12px;
      line-height: 1.2;
    }

    .step-subtitle {
      font-size: 1rem;
      color: #6b7280;
      margin-bottom: 32px;
    }

    .question {
      font-size: 1.5rem;
      font-weight: 700;
      margin-bottom: 24px;
      text-align: center;
    }

    .options {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .option {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px;
      background: white;
      border: 2px solid #e5e7eb;
      border-radius: 16px;
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 1rem;
      font-weight: 500;
    }

    .option:hover {
      border-color: ${template.styles.primaryColor};
      background: ${template.styles.backgroundColor};
    }

    .option.selected {
      border-color: ${template.styles.primaryColor};
      background: ${template.styles.primaryColor}15;
    }

    .option-icon {
      font-size: 1.5rem;
    }

    .btn {
      display: block;
      width: 100%;
      padding: 18px 32px;
      background: ${template.styles.primaryColor};
      color: white;
      border: none;
      border-radius: 16px;
      font-size: 1.125rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s ease;
      text-align: center;
      text-decoration: none;
      margin-top: auto;
    }

    .btn:hover {
      opacity: 0.9;
      transform: translateY(-2px);
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }

    .btn-secondary {
      background: transparent;
      color: ${template.styles.primaryColor};
      border: 2px solid ${template.styles.primaryColor};
      margin-top: 12px;
    }

    .form-group {
      margin-bottom: 16px;
    }

    .form-input {
      width: 100%;
      padding: 18px 20px;
      border: 2px solid #e5e7eb;
      border-radius: 12px;
      font-size: 1rem;
      transition: border-color 0.2s;
    }

    .form-input:focus {
      outline: none;
      border-color: ${template.styles.primaryColor};
    }

    .form-input::placeholder {
      color: #9ca3af;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .result-icon {
      font-size: 4rem;
      text-align: center;
      margin-bottom: 24px;
    }

    .result-title {
      font-size: 1.75rem;
      font-weight: 800;
      text-align: center;
      margin-bottom: 16px;
      color: ${template.styles.accentColor};
    }

    .result-subtitle {
      text-align: center;
      color: #6b7280;
      margin-bottom: 32px;
    }

    .estimate-box {
      background: ${template.styles.primaryColor}10;
      border: 2px solid ${template.styles.primaryColor};
      border-radius: 16px;
      padding: 24px;
      text-align: center;
      margin-bottom: 24px;
    }

    .estimate-label {
      font-size: 0.875rem;
      color: #6b7280;
      margin-bottom: 8px;
    }

    .estimate-range {
      font-size: 2rem;
      font-weight: 800;
      color: ${template.styles.primaryColor};
    }

    .estimate-monthly {
      font-size: 1rem;
      color: #6b7280;
      margin-top: 8px;
    }

    .disclaimer {
      font-size: 0.75rem;
      color: #9ca3af;
      text-align: center;
      margin-top: 16px;
    }

    @media (max-width: 480px) {
      .step {
        padding: 24px 16px;
      }
      .step-title {
        font-size: 1.5rem;
      }
      .question {
        font-size: 1.25rem;
      }
      .form-row {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <div class="funnel" id="funnel">
    <header class="funnel-header">
      ${orgData.logoUrl ? `<img src="${orgData.logoUrl}" alt="${orgData.name}" class="logo">` : `<span class="logo-text">${orgData.name}</span>`}
      ${orgData.phone ? `<a href="tel:${orgData.phone}" class="phone-link">${orgData.phone}</a>` : ''}
    </header>
    <div class="progress-bar">
      <div class="progress-fill" id="progress" style="width: 0%"></div>
    </div>
    <div id="steps-container"></div>
  </div>

  <script>
    const STEPS = ${stepsJson};
    const STYLES = ${stylesJson};
    const RESULT_LOGIC = ${resultLogicJson};
    const ORG_DATA = {
      id: '${orgData.id}',
      name: '${orgData.name}',
      phone: '${orgData.phone}',
      city: '${orgData.city}',
      state: '${orgData.state}'
    };
    const LANDING_PAGE_ID = '${landingPageId}';

    let currentStep = 0;
    let answers = {};

    function replaceVars(text) {
      return text
        .replace(/{{practice_name}}/g, ORG_DATA.name)
        .replace(/{{phone}}/g, ORG_DATA.phone)
        .replace(/{{city}}/g, ORG_DATA.city)
        .replace(/{{state}}/g, ORG_DATA.state);
    }

    function updateProgress() {
      const progress = ((currentStep + 1) / STEPS.length) * 100;
      document.getElementById('progress').style.width = progress + '%';
    }

    function renderStep(index) {
      const step = STEPS[index];
      const container = document.getElementById('steps-container');

      let html = '<div class="step active" data-step="' + index + '">';
      html += '<div class="step-content">';

      if (step.type === 'welcome') {
        if (step.content.image) {
          html += '<img src="' + step.content.image + '" class="step-image" alt="">';
        }
        html += '<h1 class="step-title">' + replaceVars(step.content.title) + '</h1>';
        html += '<p class="step-subtitle">' + replaceVars(step.content.subtitle) + '</p>';
        html += '</div>';
        html += '<button class="btn" onclick="nextStep()">' + step.content.buttonText + '</button>';
      }

      else if (step.type === 'question') {
        html += '<h2 class="question">' + step.content.question + '</h2>';
        html += '<div class="options">';
        step.content.options.forEach((opt, i) => {
          html += '<div class="option" data-value="' + opt.value + '" onclick="selectOption(this, \\'' + step.id + '\\', \\'' + opt.value + '\\')">';
          html += '<span class="option-icon">' + (opt.icon || '') + '</span>';
          html += '<span>' + opt.label + '</span>';
          html += '</div>';
        });
        html += '</div>';
        html += '</div>';
      }

      else if (step.type === 'info') {
        html += '<div class="result-icon">💡</div>';
        html += '<h2 class="step-title" style="text-align:center">' + replaceVars(step.content.title) + '</h2>';
        html += '<p class="step-subtitle" style="text-align:center">' + replaceVars(step.content.subtitle) + '</p>';
        html += '</div>';
        html += '<button class="btn" onclick="nextStep()">' + step.content.buttonText + '</button>';
      }

      else if (step.type === 'form') {
        html += '<h2 class="step-title" style="text-align:center">' + replaceVars(step.content.title) + '</h2>';
        html += '<p class="step-subtitle" style="text-align:center">' + replaceVars(step.content.subtitle) + '</p>';
        html += '<form id="lead-form" onsubmit="submitForm(event)">';
        html += '<div class="form-row"><div class="form-group"><input type="text" name="firstName" class="form-input" placeholder="First Name" required></div>';
        html += '<div class="form-group"><input type="text" name="lastName" class="form-input" placeholder="Last Name" required></div></div>';
        html += '<div class="form-group"><input type="email" name="email" class="form-input" placeholder="Email" required></div>';
        html += '<div class="form-group"><input type="tel" name="phone" class="form-input" placeholder="Phone" required></div>';
        html += '<button type="submit" class="btn">' + step.content.buttonText + '</button>';
        html += '<p class="disclaimer">By submitting, you agree to receive communications from ' + ORG_DATA.name + '.</p>';
        html += '</form>';
        html += '</div>';
      }

      else if (step.type === 'result') {
        html += '<div class="result-icon">✅</div>';
        html += '<h2 class="result-title">' + replaceVars(step.content.title) + '</h2>';
        html += '<p class="result-subtitle">' + replaceVars(step.content.subtitle) + '</p>';

        // Show estimate if we have result logic
        if (RESULT_LOGIC && answers['treatment-type']) {
          const estimate = RESULT_LOGIC[answers['treatment-type']];
          if (estimate) {
            html += '<div class="estimate-box">';
            html += '<div class="estimate-label">Your Estimated Investment</div>';
            html += '<div class="estimate-range">$' + estimate.low.toLocaleString() + ' - $' + estimate.high.toLocaleString() + '</div>';
            html += '<div class="estimate-monthly">Or as low as $' + estimate.monthly + '/month with financing</div>';
            html += '</div>';
          }
        }

        html += '</div>';
        if (ORG_DATA.phone) {
          html += '<a href="tel:' + ORG_DATA.phone + '" class="btn">' + replaceVars(step.content.buttonText) + '</a>';
        } else {
          html += '<div class="btn" style="cursor: default;">We\'ll Be In Touch Soon!</div>';
        }
      }

      html += '</div>';
      container.innerHTML = html;
      updateProgress();
    }

    function selectOption(el, stepId, value) {
      // Remove selected from siblings
      document.querySelectorAll('.option').forEach(o => o.classList.remove('selected'));
      el.classList.add('selected');
      answers[stepId] = value;

      // Auto-advance after selection
      setTimeout(() => nextStep(), 300);
    }

    function nextStep() {
      if (currentStep < STEPS.length - 1) {
        currentStep++;
        renderStep(currentStep);
        window.scrollTo(0, 0);
      }
    }

    async function submitForm(e) {
      e.preventDefault();
      const form = e.target;
      const btn = form.querySelector('button[type="submit"]');
      const originalText = btn.textContent;
      btn.textContent = 'Submitting...';
      btn.disabled = true;

      const formData = new FormData(form);
      formData.append('landing_page_id', LANDING_PAGE_ID);
      formData.append('organization_id', ORG_DATA.id);
      formData.append('answers', JSON.stringify(answers));
      formData.append('utm_source', new URLSearchParams(window.location.search).get('utm_source') || '');
      formData.append('utm_medium', new URLSearchParams(window.location.search).get('utm_medium') || '');
      formData.append('utm_campaign', new URLSearchParams(window.location.search).get('utm_campaign') || '');

      try {
        const response = await fetch('/lp/submit', {
          method: 'POST',
          body: formData
        });

        if (response.ok) {
          // Track conversion
          if (typeof fbq !== 'undefined') fbq('track', 'Lead');
          if (typeof gtag !== 'undefined') gtag('event', 'generate_lead');
        }
      } catch (err) {
        console.error('Submission error:', err);
      }

      // Always advance to result step so user isn't stuck
      nextStep();
    }

    // Initialize
    renderStep(0);
  </script>
</body>
</html>`;
}
