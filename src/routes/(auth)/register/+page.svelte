<script lang="ts">
  import { Card, Button } from 'flowbite-svelte';
  import { BuildingOutline, PhoneOutline, EnvelopeOutline } from 'flowbite-svelte-icons';
</script>

<svelte:head>
  <title>Get Started - SqueezMedia</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4 py-12">
  <Card class="w-full max-w-lg text-center">
    <div class="mb-6">
      <div class="mx-auto w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center mb-4">
        <BuildingOutline class="h-8 w-8 text-primary-600 dark:text-primary-400" />
      </div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Get Started with SqueezMedia</h1>
      <p class="text-gray-500 dark:text-gray-400 mt-2">
        Exclusive territory lead generation for dental implant providers
      </p>
    </div>

    <div class="space-y-4 text-left mb-8">
      <div class="flex items-start gap-3">
        <div class="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center flex-shrink-0">
          <span class="text-green-600 dark:text-green-400 font-bold">1</span>
        </div>
        <div>
          <h3 class="font-semibold text-gray-900 dark:text-white">Exclusive Territory</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">One provider per territory - all leads are yours</p>
        </div>
      </div>
      <div class="flex items-start gap-3">
        <div class="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center flex-shrink-0">
          <span class="text-green-600 dark:text-green-400 font-bold">2</span>
        </div>
        <div>
          <h3 class="font-semibold text-gray-900 dark:text-white">AI-Powered Campaigns</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">Custom brand voice and optimized ad performance</p>
        </div>
      </div>
      <div class="flex items-start gap-3">
        <div class="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center flex-shrink-0">
          <span class="text-green-600 dark:text-green-400 font-bold">3</span>
        </div>
        <div>
          <h3 class="font-semibold text-gray-900 dark:text-white">Qualified Leads</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">High-intent implant patients in your area</p>
        </div>
      </div>
    </div>

    <div class="border-t border-gray-200 dark:border-gray-700 pt-6">
      <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Contact our sales team to check territory availability
      </p>
      <div class="flex flex-col sm:flex-row gap-3 justify-center">
        <Button href="tel:+18005551234" outline>
          <PhoneOutline class="h-4 w-4 mr-2" />
          (800) 555-1234
        </Button>
        <Button href="mailto:sales@squeezmedía.com">
          <EnvelopeOutline class="h-4 w-4 mr-2" />
          Contact Sales
        </Button>
      </div>
    </div>

    <div class="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
      Already have an account?
      <a href="/login" class="text-primary-600 hover:underline dark:text-primary-500">
        Sign in
      </a>
    </div>
  </Card>
</div>
