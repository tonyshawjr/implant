import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db';

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  category: string;
  viewCount: number;
  helpfulCount: number;
}

interface ArticleCategory {
  name: string;
  slug: string;
  description: string;
  icon: string;
  articles: Article[];
}

export const load: PageServerLoad = async ({ url }) => {
  const searchQuery = url.searchParams.get('q') ?? '';
  const categoryFilter = url.searchParams.get('category') ?? '';

  // Fetch published articles visible to clients
  const articles = await prisma.knowledgeBaseArticle.findMany({
    where: {
      status: 'published',
      visibility: {
        in: ['public', 'client']
      },
      ...(searchQuery
        ? {
            OR: [
              { title: { contains: searchQuery, mode: 'insensitive' } },
              { content: { contains: searchQuery, mode: 'insensitive' } },
              { excerpt: { contains: searchQuery, mode: 'insensitive' } }
            ]
          }
        : {}),
      ...(categoryFilter ? { category: categoryFilter } : {})
    },
    select: {
      id: true,
      title: true,
      slug: true,
      category: true,
      excerpt: true,
      content: true,
      viewCount: true,
      helpfulCount: true
    },
    orderBy: [{ helpfulCount: 'desc' }, { viewCount: 'desc' }, { title: 'asc' }]
  });

  // Define category metadata
  const categoryMetadata: Record<string, { description: string; icon: string; order: number }> = {
    'Getting Started': {
      description: 'Learn the basics of using the platform',
      icon: 'rocket',
      order: 1
    },
    'Managing Leads': {
      description: 'Tips for managing and converting your leads',
      icon: 'users',
      order: 2
    },
    Campaigns: {
      description: 'Understanding your advertising campaigns',
      icon: 'chart',
      order: 3
    },
    'Account Settings': {
      description: 'Manage your account and preferences',
      icon: 'cog',
      order: 4
    },
    Billing: {
      description: 'Payment methods, invoices, and subscription management',
      icon: 'credit-card',
      order: 5
    },
    'Brand Voice': {
      description: 'Your AI-powered brand voice profile',
      icon: 'microphone',
      order: 6
    },
    Territory: {
      description: 'Understanding your exclusive territory',
      icon: 'map',
      order: 7
    }
  };

  // Group articles by category
  const articlesByCategory = articles.reduce(
    (acc, article) => {
      const category = article.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(article);
      return acc;
    },
    {} as Record<string, Article[]>
  );

  // Build category list with articles
  const categories: ArticleCategory[] = Object.entries(articlesByCategory)
    .map(([categoryName, categoryArticles]) => {
      const metadata = categoryMetadata[categoryName] || {
        description: '',
        icon: 'document',
        order: 99
      };
      return {
        name: categoryName,
        slug: categoryName.toLowerCase().replace(/\s+/g, '-'),
        description: metadata.description,
        icon: metadata.icon,
        articles: categoryArticles
      };
    })
    .sort((a, b) => {
      const orderA = categoryMetadata[a.name]?.order ?? 99;
      const orderB = categoryMetadata[b.name]?.order ?? 99;
      return orderA - orderB;
    });

  // Get popular articles (top 5 by helpful + view count)
  const popularArticles = [...articles]
    .sort((a, b) => b.helpfulCount + b.viewCount - (a.helpfulCount + a.viewCount))
    .slice(0, 5);

  // If no articles exist in the database, return helpful default content
  // This is useful during initial setup before content is created
  if (articles.length === 0 && !searchQuery) {
    const defaultCategories: ArticleCategory[] = [
      {
        name: 'Getting Started',
        slug: 'getting-started',
        description: 'Learn the basics of using the platform',
        icon: 'rocket',
        articles: [
          {
            id: 'gs-1',
            title: 'Welcome to SqueezMedia',
            slug: 'welcome',
            excerpt: 'Get an overview of the SqueezMedia platform and what to expect.',
            content:
              'Welcome to SqueezMedia! This guide will help you get started with your exclusive territory-based lead generation platform.',
            category: 'Getting Started',
            viewCount: 0,
            helpfulCount: 0
          },
          {
            id: 'gs-2',
            title: 'Dashboard Overview',
            slug: 'dashboard-overview',
            excerpt: 'Learn how to navigate your client dashboard.',
            content:
              'Your dashboard provides a comprehensive view of your leads, campaigns, and territory performance.',
            category: 'Getting Started',
            viewCount: 0,
            helpfulCount: 0
          },
          {
            id: 'gs-3',
            title: 'Understanding Your Territory',
            slug: 'understanding-territory',
            excerpt: 'Learn about your exclusive territory and what it means for your practice.',
            content:
              'Your territory is exclusively yours. No other provider in your area can access leads from the SqueezMedia platform.',
            category: 'Getting Started',
            viewCount: 0,
            helpfulCount: 0
          }
        ]
      },
      {
        name: 'Managing Leads',
        slug: 'managing-leads',
        description: 'Tips for managing and converting your leads',
        icon: 'users',
        articles: [
          {
            id: 'ml-1',
            title: 'Lead Status Guide',
            slug: 'lead-status-guide',
            excerpt: 'Understanding lead statuses and how to update them.',
            content:
              'Leads progress through various statuses from New to Converted. Learn how to manage each stage effectively.',
            category: 'Managing Leads',
            viewCount: 0,
            helpfulCount: 0
          },
          {
            id: 'ml-2',
            title: 'Best Practices for Lead Follow-up',
            slug: 'lead-followup-best-practices',
            excerpt: 'Tips for responding to and converting your leads.',
            content:
              'Quick response times are key to converting leads. Aim to contact new leads within 5 minutes of receipt.',
            category: 'Managing Leads',
            viewCount: 0,
            helpfulCount: 0
          },
          {
            id: 'ml-3',
            title: 'Using the Kanban Board',
            slug: 'kanban-board',
            excerpt: 'Organize your leads visually with the Kanban board.',
            content:
              'The Kanban board allows you to drag and drop leads between stages, making it easy to track your pipeline.',
            category: 'Managing Leads',
            viewCount: 0,
            helpfulCount: 0
          }
        ]
      },
      {
        name: 'Campaigns',
        slug: 'campaigns',
        description: 'Understanding your advertising campaigns',
        icon: 'chart',
        articles: [
          {
            id: 'c-1',
            title: 'Campaign Performance Metrics',
            slug: 'campaign-metrics',
            excerpt: 'Understanding key metrics like CPL, CTR, and conversions.',
            content:
              'Learn how to interpret your campaign metrics to understand performance and ROI.',
            category: 'Campaigns',
            viewCount: 0,
            helpfulCount: 0
          },
          {
            id: 'c-2',
            title: 'AI Optimization Explained',
            slug: 'ai-optimization',
            excerpt: 'How our AI continuously improves your campaign performance.',
            content:
              'Our AI system monitors your campaigns 24/7 and makes optimizations to improve lead quality and reduce costs.',
            category: 'Campaigns',
            viewCount: 0,
            helpfulCount: 0
          }
        ]
      },
      {
        name: 'Account Settings',
        slug: 'account-settings',
        description: 'Manage your account and preferences',
        icon: 'cog',
        articles: [
          {
            id: 'as-1',
            title: 'Managing Team Members',
            slug: 'team-management',
            excerpt: 'Add, remove, and manage user access for your team.',
            content:
              'You can invite team members with different permission levels to help manage leads and view reports.',
            category: 'Account Settings',
            viewCount: 0,
            helpfulCount: 0
          },
          {
            id: 'as-2',
            title: 'Notification Preferences',
            slug: 'notifications',
            excerpt: 'Configure how and when you receive lead notifications.',
            content:
              'Set up email and SMS notifications to ensure you never miss a new lead.',
            category: 'Account Settings',
            viewCount: 0,
            helpfulCount: 0
          }
        ]
      }
    ];

    return {
      categories: defaultCategories,
      popularArticles: defaultCategories.flatMap((c) => c.articles).slice(0, 5),
      searchQuery,
      categoryFilter,
      totalArticles: defaultCategories.reduce((sum, c) => sum + c.articles.length, 0)
    };
  }

  return {
    categories,
    popularArticles,
    searchQuery,
    categoryFilter,
    totalArticles: articles.length
  };
};
