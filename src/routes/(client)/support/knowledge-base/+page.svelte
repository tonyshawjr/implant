<script lang="ts">
  import {
    Card,
    Badge,
    Accordion,
    AccordionItem,
    Button,
    Input
  } from 'flowbite-svelte';
  import {
    SearchOutline,
    RocketOutline,
    UsersGroupOutline,
    ChartOutline,
    CogOutline,
    BookOpenOutline,
    ArrowRightOutline,
    ThumbsUpOutline,
    EyeOutline,
    QuestionCircleOutline
  } from 'flowbite-svelte-icons';
  import { goto } from '$app/navigation';

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

  interface Props {
    data: {
      categories: ArticleCategory[];
      popularArticles: Article[];
      searchQuery: string;
      categoryFilter: string;
      totalArticles: number;
    };
  }

  let { data }: Props = $props();
  let searchInput = $state(data.searchQuery);

  const iconMap: Record<string, typeof RocketOutline> = {
    rocket: RocketOutline,
    users: UsersGroupOutline,
    chart: ChartOutline,
    cog: CogOutline,
    document: BookOpenOutline,
    'credit-card': BookOpenOutline,
    microphone: BookOpenOutline,
    map: BookOpenOutline
  };

  function getIcon(iconName: string) {
    return iconMap[iconName] || BookOpenOutline;
  }

  function handleSearch(event: Event) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (searchInput) {
      params.set('q', searchInput);
    }
    goto(`/support/knowledge-base?${params.toString()}`);
  }

  function clearSearch() {
    searchInput = '';
    goto('/support/knowledge-base');
  }

  function truncateContent(content: string, maxLength: number = 200): string {
    if (content.length <= maxLength) return content;
    return content.slice(0, maxLength).trim() + '...';
  }
</script>

<svelte:head>
  <title>Knowledge Base | Support</title>
</svelte:head>

<div class="space-y-6">
  <!-- Page Header -->
  <div class="text-center">
    <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
      Knowledge Base
    </h1>
    <p class="mt-2 text-gray-600 dark:text-gray-400">
      Find answers to common questions and learn how to get the most out of SqueezMedia
    </p>
  </div>

  <!-- Search Bar -->
  <div class="mx-auto max-w-2xl">
    <form onsubmit={handleSearch} class="relative">
      <div class="relative">
        <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <SearchOutline class="h-5 w-5 text-gray-400" />
        </div>
        <Input
          type="search"
          placeholder="Search articles..."
          bind:value={searchInput}
          class="pl-10 pr-24"
          size="lg"
        />
        <div class="absolute inset-y-0 right-0 flex items-center pr-1">
          <Button type="submit" color="primary" size="sm">
            Search
          </Button>
        </div>
      </div>
    </form>
    {#if data.searchQuery}
      <div class="mt-2 flex items-center justify-center gap-2 text-sm">
        <span class="text-gray-500 dark:text-gray-400">
          Showing results for "{data.searchQuery}"
        </span>
        <button
          type="button"
          onclick={clearSearch}
          class="text-primary-600 hover:underline dark:text-primary-400"
        >
          Clear search
        </button>
      </div>
    {/if}
  </div>

  <!-- Quick Stats -->
  <div class="flex justify-center gap-4 text-sm text-gray-500 dark:text-gray-400">
    <span>{data.totalArticles} articles</span>
    <span>|</span>
    <span>{data.categories.length} categories</span>
  </div>

  <!-- Main Content -->
  <div class="grid gap-6 lg:grid-cols-4">
    <!-- Categories and Articles (Main Column) -->
    <div class="lg:col-span-3">
      {#if data.categories.length === 0}
        <!-- Empty State -->
        <Card class="text-center py-12">
          <QuestionCircleOutline class="mx-auto h-12 w-12 text-gray-400" />
          <h3 class="mt-4 text-lg font-medium text-gray-900 dark:text-white">
            No articles found
          </h3>
          <p class="mt-2 text-gray-500 dark:text-gray-400">
            {#if data.searchQuery}
              Try searching with different keywords or browse all categories.
            {:else}
              No knowledge base articles are available yet. Check back soon!
            {/if}
          </p>
          {#if data.searchQuery}
            <Button color="light" class="mt-4" onclick={clearSearch}>
              Browse All Articles
            </Button>
          {/if}
        </Card>
      {:else}
        <!-- Category Accordions -->
        <div class="space-y-4">
          {#each data.categories as category (category.slug)}
            {@const IconComponent = getIcon(category.icon)}
            <Card padding="none">
              <Accordion flush>
                <AccordionItem open={data.categories.length === 1 || data.searchQuery !== ''}>
                  {#snippet header()}
                    <div class="flex items-center gap-3">
                      <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-900">
                        <IconComponent class="h-5 w-5 text-primary-600 dark:text-primary-400" />
                      </div>
                      <div>
                        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                          {category.name}
                        </h3>
                        <p class="text-sm text-gray-500 dark:text-gray-400">
                          {category.articles.length} article{category.articles.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  {/snippet}

                  <div class="px-4 pb-4">
                    {#if category.description}
                      <p class="mb-4 text-sm text-gray-600 dark:text-gray-400">
                        {category.description}
                      </p>
                    {/if}

                    <ul class="space-y-3">
                      {#each category.articles as article (article.id)}
                        <li>
                          <a
                            href="/support/knowledge-base/{article.slug}"
                            class="group block rounded-lg border border-gray-200 p-4 transition-colors hover:border-primary-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:border-primary-700 dark:hover:bg-gray-800"
                          >
                            <div class="flex items-start justify-between gap-4">
                              <div class="flex-1 min-w-0">
                                <h4 class="font-medium text-gray-900 group-hover:text-primary-600 dark:text-white dark:group-hover:text-primary-400">
                                  {article.title}
                                </h4>
                                {#if article.excerpt}
                                  <p class="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                                    {article.excerpt}
                                  </p>
                                {:else}
                                  <p class="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                                    {truncateContent(article.content)}
                                  </p>
                                {/if}
                              </div>
                              <ArrowRightOutline class="h-5 w-5 flex-shrink-0 text-gray-400 transition-transform group-hover:translate-x-1 group-hover:text-primary-600 dark:group-hover:text-primary-400" />
                            </div>
                            {#if article.viewCount > 0 || article.helpfulCount > 0}
                              <div class="mt-2 flex items-center gap-4 text-xs text-gray-400">
                                {#if article.viewCount > 0}
                                  <span class="flex items-center gap-1">
                                    <EyeOutline class="h-3 w-3" />
                                    {article.viewCount} views
                                  </span>
                                {/if}
                                {#if article.helpfulCount > 0}
                                  <span class="flex items-center gap-1">
                                    <ThumbsUpOutline class="h-3 w-3" />
                                    {article.helpfulCount} found helpful
                                  </span>
                                {/if}
                              </div>
                            {/if}
                          </a>
                        </li>
                      {/each}
                    </ul>
                  </div>
                </AccordionItem>
              </Accordion>
            </Card>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Sidebar -->
    <div class="space-y-6">
      <!-- Popular Articles -->
      {#if data.popularArticles.length > 0}
        <Card>
          <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Popular Articles
          </h3>
          <ul class="space-y-3">
            {#each data.popularArticles as article (article.id)}
              <li>
                <a
                  href="/support/knowledge-base/{article.slug}"
                  class="group flex items-start gap-2 text-sm"
                >
                  <span class="mt-1 text-gray-400">
                    <BookOpenOutline class="h-4 w-4" />
                  </span>
                  <span class="text-gray-700 group-hover:text-primary-600 dark:text-gray-300 dark:group-hover:text-primary-400">
                    {article.title}
                  </span>
                </a>
              </li>
            {/each}
          </ul>
        </Card>
      {/if}

      <!-- Quick Links -->
      <Card>
        <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Need More Help?
        </h3>
        <div class="space-y-3">
          <Button href="/support" color="light" class="w-full justify-start">
            <QuestionCircleOutline class="mr-2 h-4 w-4" />
            Contact Support
          </Button>
          <Button href="/onboarding" color="light" class="w-full justify-start">
            <RocketOutline class="mr-2 h-4 w-4" />
            Onboarding Progress
          </Button>
        </div>
      </Card>

      <!-- Category Links -->
      {#if data.categories.length > 3}
        <Card>
          <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Browse by Category
          </h3>
          <ul class="space-y-2">
            {#each data.categories as category (category.slug)}
              <li>
                <a
                  href="/support/knowledge-base?category={encodeURIComponent(category.name)}"
                  class="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  <span>{category.name}</span>
                  <Badge color="gray">{category.articles.length}</Badge>
                </a>
              </li>
            {/each}
          </ul>
        </Card>
      {/if}
    </div>
  </div>
</div>
