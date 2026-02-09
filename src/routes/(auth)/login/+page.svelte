<script lang="ts">
  import { enhance } from '$app/forms';
  import type { ActionData } from './$types';

  let { form }: { form: ActionData } = $props();
  let isLoading = $state(false);
</script>

<svelte:head>
  <title>Login - Implant Lead Engine</title>
</svelte:head>

<div class="login-container">
  <div class="login-card">
    <div class="login-header">
      <div class="login-logo">
        <div class="login-logo-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
        </div>
        <span class="login-logo-text">Implant <span>Lead Engine</span></span>
      </div>
      <h1>Welcome back</h1>
      <p>Sign in to your account to continue</p>
    </div>

    {#if form?.error}
      <div class="alert alert-error">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span>{form.error}</span>
      </div>
    {/if}

    <form
      method="POST"
      use:enhance={() => {
        isLoading = true;
        return async ({ update }) => {
          await update();
          isLoading = false;
        };
      }}
    >
      <div class="form-group">
        <label for="email" class="form-label">Email address</label>
        <input
          type="email"
          id="email"
          name="email"
          class="form-input"
          placeholder="you@example.com"
          value={form?.email ?? ''}
          required
        />
      </div>

      <div class="form-group">
        <label for="password" class="form-label">Password</label>
        <input
          type="password"
          id="password"
          name="password"
          class="form-input"
          placeholder="Enter your password"
          required
        />
      </div>

      <div class="form-row">
        <label class="checkbox-label">
          <input type="checkbox" name="remember" />
          <span>Remember me</span>
        </label>
        <a href="/forgot-password" class="link">Forgot password?</a>
      </div>

      <button type="submit" class="btn btn-primary btn-lg w-full" disabled={isLoading}>
        {#if isLoading}
          <svg class="spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          </svg>
          Signing in...
        {:else}
          Sign in
        {/if}
      </button>
    </form>

    <div class="login-footer">
      <p>Don't have an account? <a href="/register" class="link">Contact sales</a></p>
    </div>
  </div>
</div>

<style>
  .login-container {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, var(--gray-50) 0%, var(--gray-100) 100%);
    padding: var(--spacing-4);
  }

  .login-card {
    width: 100%;
    max-width: 420px;
    background: white;
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-xl);
    padding: var(--spacing-8);
  }

  .login-header {
    text-align: center;
    margin-bottom: var(--spacing-6);
  }

  .login-logo {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-3);
    margin-bottom: var(--spacing-6);
  }

  .login-logo-icon {
    width: 48px;
    height: 48px;
    background: linear-gradient(135deg, var(--primary-500), var(--primary-700));
    border-radius: var(--radius-lg);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
  }

  .login-logo-text {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--gray-900);
  }

  .login-logo-text span {
    color: var(--primary-600);
  }

  .login-header h1 {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--gray-900);
    margin-bottom: var(--spacing-2);
  }

  .login-header p {
    color: var(--gray-500);
    font-size: 0.875rem;
  }

  .alert {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    padding: var(--spacing-3) var(--spacing-4);
    border-radius: var(--radius-lg);
    margin-bottom: var(--spacing-4);
    font-size: 0.875rem;
  }

  .alert-error {
    background: var(--danger-50);
    color: var(--danger-600);
    border: 1px solid var(--danger-100);
  }

  .form-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--spacing-6);
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    font-size: 0.875rem;
    color: var(--gray-600);
    cursor: pointer;
  }

  .checkbox-label input {
    width: 16px;
    height: 16px;
    accent-color: var(--primary-600);
  }

  .link {
    font-size: 0.875rem;
    color: var(--primary-600);
    font-weight: 500;
  }

  .link:hover {
    color: var(--primary-700);
  }

  .w-full {
    width: 100%;
  }

  .spinner {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .login-footer {
    text-align: center;
    margin-top: var(--spacing-6);
    padding-top: var(--spacing-6);
    border-top: 1px solid var(--gray-100);
  }

  .login-footer p {
    font-size: 0.875rem;
    color: var(--gray-500);
  }
</style>
