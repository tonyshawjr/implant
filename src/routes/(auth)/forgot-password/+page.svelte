<script lang="ts">
  import { enhance } from '$app/forms';
  import { Button, Input, Label, Card, Alert } from 'flowbite-svelte';
  import { EnvelopeOutline, CheckCircleOutline, ExclamationCircleOutline } from 'flowbite-svelte-icons';

  let { form } = $props();
</script>

<svelte:head>
  <title>Reset Password - SqueezMedia</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4 py-12">
  <Card class="w-full max-w-md p-4 sm:p-6 md:p-8">
    <div class="mb-6 text-center">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Reset Password</h1>
      <p class="text-gray-500 dark:text-gray-400 mt-2">
        Enter your email and we'll send you a reset link
      </p>
    </div>

    {#if form?.success}
      <Alert color="green" class="mb-4">
        {#snippet icon()}
          <CheckCircleOutline class="h-5 w-5" />
        {/snippet}
        If an account exists with that email, you'll receive a password reset link shortly.
      </Alert>
    {/if}

    {#if form?.error}
      <Alert color="red" class="mb-4">
        {#snippet icon()}
          <ExclamationCircleOutline class="h-5 w-5" />
        {/snippet}
        {form.error}
      </Alert>
    {/if}

    <form method="POST" use:enhance class="space-y-4">
      <div>
        <Label for="email" class="mb-2">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="you@company.com"
          required
          value={form?.email ?? ''}
          class="ps-9"
        >
          {#snippet left()}
            <EnvelopeOutline class="h-5 w-5" />
          {/snippet}
        </Input>
      </div>

      <Button type="submit" class="w-full">Send Reset Link</Button>
    </form>

    <div class="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
      Remember your password?
      <a href="/login" class="text-primary-600 hover:underline dark:text-primary-500">
        Sign in
      </a>
    </div>
  </Card>
</div>
