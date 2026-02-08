<script lang="ts">
  import { enhance } from '$app/forms';
  import { Button, Input, Label, Helper, Card, Alert } from 'flowbite-svelte';
  import { EnvelopeOutline, LockOutline, ExclamationCircleOutline } from 'flowbite-svelte-icons';

  let { form } = $props();
</script>

<svelte:head>
  <title>Login - SqueezMedia</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4 py-12">
  <Card class="w-full max-w-md p-4 sm:p-6 md:p-8">
    <div class="mb-6 text-center">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Welcome Back</h1>
      <p class="text-gray-500 dark:text-gray-400 mt-2">Sign in to your account</p>
    </div>

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

      <div>
        <Label for="password" class="mb-2">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="••••••••"
          required
          class="ps-9"
        >
          {#snippet left()}
            <LockOutline class="h-5 w-5" />
          {/snippet}
        </Input>
      </div>

      <div class="flex items-center justify-between">
        <a href="/forgot-password" class="text-sm text-primary-600 hover:underline dark:text-primary-500">
          Forgot password?
        </a>
      </div>

      <Button type="submit" class="w-full">Sign In</Button>
    </form>

    <div class="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
      Don't have an account?
      <a href="/register" class="text-primary-600 hover:underline dark:text-primary-500">
        Contact sales
      </a>
    </div>
  </Card>
</div>
