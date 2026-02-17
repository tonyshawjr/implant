<script lang="ts">
  import { Input, Label, Select, Checkbox, Textarea, Button, Helper, Spinner, Alert } from 'flowbite-svelte';
  import { CheckCircleSolid } from 'flowbite-svelte-icons';

  // Type definitions
  interface FormField {
    name: string;
    label: string;
    type: 'text' | 'email' | 'phone' | 'tel' | 'select' | 'checkbox' | 'textarea';
    placeholder?: string;
    required?: boolean;
    options?: Array<{ value: string; name: string }>;
    helpText?: string;
  }

  interface LandingPageConfig {
    formSchema?: {
      fields: FormField[];
    };
    headline?: string;
    subheadline?: string;
    ctaText?: string;
    thankYouMessage?: string;
    formTitle?: string;
    primaryColor?: string;
    showPhone?: boolean;
    showLogo?: boolean;
  }

  interface LandingPageTemplate {
    id: string;
    name: string;
    htmlTemplate: string;
    cssTemplate?: string | null;
    configSchema?: unknown;
    defaultConfig?: unknown;
  }

  interface LandingPage {
    id: string;
    name: string;
    slug: string;
    metaTitle: string;
    metaDescription: string;
    customHtml?: string | null;
    customCss?: string | null;
    config?: unknown;
    trackingPixels?: unknown;
    template?: LandingPageTemplate | null;
  }

  interface Organization {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string | null;
    phone?: string | null;
    email?: string | null;
    website?: string | null;
    primaryColor: string;
  }

  interface UtmParams {
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_content?: string;
    utm_term?: string;
  }

  // Props
  let {
    landingPage,
    organization,
    utmParams
  }: {
    landingPage: LandingPage;
    organization: Organization;
    utmParams: UtmParams;
  } = $props();

  // Parse configuration
  const config = $derived((landingPage.config || landingPage.template?.defaultConfig || {}) as LandingPageConfig);

  // Default form fields if none provided
  const defaultFormFields: FormField[] = [
    { name: 'full_name', label: 'Full Name', type: 'text', placeholder: 'Your full name', required: true },
    { name: 'email', label: 'Email', type: 'email', placeholder: 'your.email@example.com', required: true },
    { name: 'phone', label: 'Phone Number', type: 'tel', placeholder: '(555) 123-4567', required: true },
    {
      name: 'insurance',
      label: 'Do you have dental insurance?',
      type: 'select',
      required: true,
      options: [
        { value: '', name: 'Select an option' },
        { value: 'Yes', name: 'Yes, I have dental insurance' },
        { value: 'No', name: 'No, I do not have insurance' },
        { value: 'Not sure', name: 'Not sure' }
      ]
    },
    { name: 'notes', label: 'Tell us about your dental goals', type: 'textarea', placeholder: 'What brings you in today?', required: false }
  ];

  const formFields = $derived(config.formSchema?.fields || defaultFormFields);

  // Form state - separate string and boolean data for type safety
  let stringFormData = $state<Record<string, string>>({});
  let checkboxFormData = $state<Record<string, boolean>>({});
  let isSubmitting = $state(false);
  let submitError = $state<string | null>(null);
  let isSubmitted = $state(false);

  // Initialize form data with empty values
  $effect(() => {
    const stringData: Record<string, string> = {};
    const checkboxData: Record<string, boolean> = {};
    for (const field of formFields) {
      if (field.type === 'checkbox') {
        checkboxData[field.name] = false;
      } else {
        stringData[field.name] = '';
      }
    }
    stringFormData = stringData;
    checkboxFormData = checkboxData;
  });

  // Helper to get all form data combined
  function getAllFormData(): Record<string, string | boolean> {
    return { ...stringFormData, ...checkboxFormData };
  }

  // Template variable replacement
  function replaceTemplateVariables(html: string): string {
    return html
      .replace(/\{\{organization_name\}\}/g, organization.name)
      .replace(/\{\{logo_url\}\}/g, organization.logoUrl || '')
      .replace(/\{\{phone\}\}/g, organization.phone || '')
      .replace(/\{\{email\}\}/g, organization.email || '')
      .replace(/\{\{website\}\}/g, organization.website || '')
      .replace(/\{\{primary_color\}\}/g, organization.primaryColor);
  }

  // Get rendered HTML content
  const renderedHtml = $derived(() => {
    const html = landingPage.customHtml || landingPage.template?.htmlTemplate || '';
    return replaceTemplateVariables(html);
  });

  // Handle form submission
  async function handleSubmit(event: Event) {
    event.preventDefault();

    if (isSubmitting) return;

    isSubmitting = true;
    submitError = null;

    try {
      const formData = getAllFormData();

      // Parse full_name into first and last name
      const fullName = (stringFormData.full_name || '').trim();
      const nameParts = fullName.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      // Build the request body
      const body = {
        organization_id: organization.id,
        landing_page_id: landingPage.id,
        first_name: firstName,
        last_name: lastName,
        email: stringFormData.email || null,
        phone: stringFormData.phone || null,
        insurance: stringFormData.insurance || null,
        notes: stringFormData.notes || null,
        utm_source: utmParams.utm_source || null,
        utm_medium: utmParams.utm_medium || null,
        utm_campaign: utmParams.utm_campaign || null,
        utm_content: utmParams.utm_content || null,
        custom_fields: Object.fromEntries(
          Object.entries(formData).filter(
            ([key]) => !['full_name', 'email', 'phone', 'insurance', 'notes'].includes(key)
          )
        )
      };

      const response = await fetch('/api/leads/capture', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit form');
      }

      // Success!
      isSubmitted = true;

      // Track conversion if Facebook Pixel is available
      if (typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).fbq) {
        (window as unknown as { fbq: (...args: unknown[]) => void }).fbq('track', 'Lead');
      }

      // Track conversion if Google Analytics is available
      if (typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).gtag) {
        (window as unknown as { gtag: (...args: unknown[]) => void }).gtag('event', 'generate_lead', {
          event_category: 'engagement',
          event_label: landingPage.name
        });
      }

    } catch (err) {
      submitError = err instanceof Error ? err.message : 'An unexpected error occurred';
    } finally {
      isSubmitting = false;
    }
  }

  // Get headline and subheadline from config
  const headline = $derived(config.headline || `Transform Your Smile with ${organization.name}`);
  const subheadline = $derived(config.subheadline || 'Schedule your free consultation today');
  const ctaText = $derived(config.ctaText || 'Get My Free Consultation');
  const thankYouMessage = $derived(config.thankYouMessage || 'Thank you! We will contact you shortly.');
  const formTitle = $derived(config.formTitle || 'Request Your Free Consultation');
</script>

<div class="landing-page-container" style="--primary-color: {organization.primaryColor};">
  <!-- Custom CSS -->
  {#if landingPage.customCss || landingPage.template?.cssTemplate}
    {@html `<style>${replaceTemplateVariables(landingPage.customCss || landingPage.template?.cssTemplate || '')}</style>`}
  {/if}

  <!-- Custom HTML content (if template-based) -->
  {#if renderedHtml()}
    <div class="custom-content">
      {@html renderedHtml()}
    </div>
  {:else}
    <!-- Default landing page layout -->
    <div class="default-layout">
      <!-- Header -->
      <header class="landing-header">
        {#if config.showLogo !== false && organization.logoUrl}
          <img src={organization.logoUrl} alt={organization.name} class="org-logo" />
        {:else}
          <h1 class="org-name">{organization.name}</h1>
        {/if}
        {#if config.showPhone !== false && organization.phone}
          <a href="tel:{organization.phone}" class="phone-link">
            Call Now: {organization.phone}
          </a>
        {/if}
      </header>

      <!-- Hero Section -->
      <section class="hero-section">
        <div class="hero-content">
          <h1 class="hero-headline">{headline}</h1>
          <p class="hero-subheadline">{subheadline}</p>
        </div>
      </section>

      <!-- Form Section -->
      <section class="form-section">
        <div class="form-container">
          {#if isSubmitted}
            <!-- Success State -->
            <div class="success-message">
              <CheckCircleSolid class="success-icon" />
              <h2 class="success-title">Request Submitted!</h2>
              <p class="success-text">{thankYouMessage}</p>
            </div>
          {:else}
            <!-- Form -->
            <h2 class="form-title">{formTitle}</h2>

            {#if submitError}
              <Alert color="red" class="mb-4">
                <span class="font-medium">Error!</span> {submitError}
              </Alert>
            {/if}

            <form onsubmit={handleSubmit} class="lead-form">
              {#each formFields as field}
                <div class="form-field">
                  {#if field.type === 'text' || field.type === 'email' || field.type === 'phone' || field.type === 'tel'}
                    <Label for={field.name} class="mb-2">{field.label}{#if field.required}<span class="required">*</span>{/if}</Label>
                    <Input
                      type={field.type === 'phone' ? 'tel' : field.type}
                      id={field.name}
                      name={field.name}
                      placeholder={field.placeholder}
                      required={field.required}
                      bind:value={stringFormData[field.name]}
                      size="lg"
                    />
                    {#if field.helpText}
                      <Helper class="mt-1">{field.helpText}</Helper>
                    {/if}

                  {:else if field.type === 'select'}
                    <Label for={field.name} class="mb-2">{field.label}{#if field.required}<span class="required">*</span>{/if}</Label>
                    <Select
                      id={field.name}
                      items={field.options || []}
                      bind:value={stringFormData[field.name]}
                      placeholder="Select an option"
                      size="lg"
                    />
                    {#if field.helpText}
                      <Helper class="mt-1">{field.helpText}</Helper>
                    {/if}

                  {:else if field.type === 'checkbox'}
                    <Checkbox
                      id={field.name}
                      bind:checked={checkboxFormData[field.name]}
                      required={field.required}
                    >
                      {field.label}{#if field.required}<span class="required">*</span>{/if}
                    </Checkbox>
                    {#if field.helpText}
                      <Helper class="mt-1">{field.helpText}</Helper>
                    {/if}

                  {:else if field.type === 'textarea'}
                    <Label for={field.name} class="mb-2">{field.label}{#if field.required}<span class="required">*</span>{/if}</Label>
                    <Textarea
                      id={field.name}
                      name={field.name}
                      placeholder={field.placeholder}
                      required={field.required}
                      bind:value={stringFormData[field.name]}
                      rows={4}
                    />
                    {#if field.helpText}
                      <Helper class="mt-1">{field.helpText}</Helper>
                    {/if}
                  {/if}
                </div>
              {/each}

              <Button
                type="submit"
                class="submit-button"
                size="xl"
                disabled={isSubmitting}
              >
                {#if isSubmitting}
                  <Spinner class="me-3" size="5" />
                  Submitting...
                {:else}
                  {ctaText}
                {/if}
              </Button>

              <p class="privacy-notice">
                By submitting this form, you agree to be contacted about dental services.
                We respect your privacy and will never share your information.
              </p>
            </form>
          {/if}
        </div>
      </section>

      <!-- Footer -->
      <footer class="landing-footer">
        <p>&copy; {new Date().getFullYear()} {organization.name}. All rights reserved.</p>
      </footer>
    </div>
  {/if}
</div>

<style>
  .landing-page-container {
    min-height: 100vh;
    background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
  }

  .custom-content {
    width: 100%;
  }

  .default-layout {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  /* Header */
  .landing-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 2rem;
    background: white;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .org-logo {
    max-height: 60px;
    width: auto;
  }

  .org-name {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--primary-color, #2563eb);
  }

  .phone-link {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--primary-color, #2563eb);
    text-decoration: none;
    transition: opacity 0.2s;
  }

  .phone-link:hover {
    opacity: 0.8;
  }

  /* Hero Section */
  .hero-section {
    background: linear-gradient(135deg, var(--primary-color, #2563eb) 0%, #1d4ed8 100%);
    padding: 4rem 2rem;
    text-align: center;
  }

  .hero-content {
    max-width: 800px;
    margin: 0 auto;
  }

  .hero-headline {
    font-size: 2.5rem;
    font-weight: 800;
    color: white;
    margin-bottom: 1rem;
    line-height: 1.2;
  }

  .hero-subheadline {
    font-size: 1.25rem;
    color: rgba(255, 255, 255, 0.9);
    font-weight: 400;
  }

  /* Form Section */
  .form-section {
    flex: 1;
    display: flex;
    justify-content: center;
    padding: 3rem 1rem;
  }

  .form-container {
    width: 100%;
    max-width: 500px;
    background: white;
    border-radius: 1rem;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
    padding: 2rem;
    margin-top: -3rem;
    position: relative;
    z-index: 10;
  }

  .form-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: #1f2937;
    text-align: center;
    margin-bottom: 1.5rem;
  }

  .lead-form {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .form-field {
    display: flex;
    flex-direction: column;
  }

  .required {
    color: #ef4444;
    margin-left: 0.25rem;
  }

  .lead-form :global(.submit-button) {
    width: 100%;
    margin-top: 0.5rem;
    background: var(--primary-color, #2563eb) !important;
    border: none !important;
    font-weight: 600;
    font-size: 1.125rem;
    padding: 1rem 2rem;
    transition: transform 0.2s, box-shadow 0.2s;
  }

  .lead-form :global(.submit-button:hover:not(:disabled)) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
  }

  .lead-form :global(.submit-button:disabled) {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .privacy-notice {
    font-size: 0.75rem;
    color: #6b7280;
    text-align: center;
    margin-top: 1rem;
    line-height: 1.5;
  }

  /* Success Message */
  .success-message {
    text-align: center;
    padding: 2rem;
  }

  .success-message :global(.success-icon) {
    width: 64px;
    height: 64px;
    color: #22c55e;
    margin: 0 auto 1rem;
  }

  .success-title {
    font-size: 1.75rem;
    font-weight: 700;
    color: #1f2937;
    margin-bottom: 0.5rem;
  }

  .success-text {
    font-size: 1.125rem;
    color: #6b7280;
  }

  /* Footer */
  .landing-footer {
    padding: 1.5rem;
    text-align: center;
    color: #9ca3af;
    font-size: 0.875rem;
    background: #f9fafb;
    border-top: 1px solid #e5e7eb;
  }

  /* Mobile Responsiveness */
  @media (max-width: 640px) {
    .landing-header {
      flex-direction: column;
      gap: 0.75rem;
      padding: 1rem;
    }

    .hero-section {
      padding: 2.5rem 1rem;
    }

    .hero-headline {
      font-size: 1.75rem;
    }

    .hero-subheadline {
      font-size: 1rem;
    }

    .form-container {
      margin-top: -2rem;
      padding: 1.5rem;
      border-radius: 0.75rem;
    }

    .form-title {
      font-size: 1.25rem;
    }
  }
</style>
