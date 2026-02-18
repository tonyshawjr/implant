<script lang="ts">
  interface Props {
    headline: string;
    primaryText: string;
    ctaText?: string;
    imageUrl?: string;
    videoUrl?: string;
    businessName: string;
  }

  let {
    headline,
    primaryText,
    ctaText = 'Learn More',
    imageUrl = '',
    videoUrl = '',
    businessName
  }: Props = $props();

  // Get first headline
  function getFirstHeadline(headlines: string): string {
    const lines = headlines.split('\n').filter(h => h.trim());
    return lines[0] || 'Your Headline Here';
  }

  // Truncate for Facebook limits
  function truncateText(text: string, limit: number): string {
    if (!text) return '';
    if (text.length <= limit) return text;
    return text.substring(0, limit - 3) + '...';
  }

  let displayHeadline = $derived(truncateText(getFirstHeadline(headline), 40));
  let displayText = $derived(truncateText(primaryText, 125) || 'Your ad copy will appear here...');
</script>

<div class="fb-ad-preview">
  <!-- Header -->
  <div class="fb-header">
    <div class="fb-avatar">
      <span class="fb-avatar-letter">{businessName.charAt(0).toUpperCase()}</span>
    </div>
    <div class="fb-header-info">
      <div class="fb-page-name">{businessName}</div>
      <div class="fb-sponsored">
        <span>Sponsored</span>
        <span class="fb-dot">·</span>
        <svg class="fb-globe" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm5.9 9.5l-.8-.3c-.2-.1-.3-.3-.3-.6l.1-1c0-.4-.2-.8-.6-.9l-1.2-.5c-.3-.1-.4-.4-.4-.7l.1-.5c.1-.3 0-.6-.3-.8l-.4-.3c-.3-.2-.5-.6-.5-.9l-.1-.9c0-.3-.2-.6-.4-.7l-.2-.1C9.4 1.4 9.1 1 8.8 1c-.3 0-.5.1-.7.3L7.5 2c-.2.2-.5.3-.8.3H6c-.2 0-.4.1-.5.2l-.2.2c-.3.3-.8.3-1.1.1-.2-.2-.4-.3-.7-.3l-.6.1c-.4.1-.7.4-.8.8l-.1.3c-.1.3-.3.5-.6.6l-.2.1c-.3.1-.5.4-.5.7v.5c0 .3.1.6.3.8l.5.5c.3.3.4.6.4 1l-.1.6c0 .3.1.5.3.7l.3.3c.3.3.4.7.4 1.1v.2c0 .4.2.7.5.9l.4.3c.2.1.4.3.5.5l.3.4c.2.3.6.5 1 .5h.2c.3 0 .6-.1.8-.3l.3-.3c.2-.2.5-.3.8-.3h.3c.3 0 .6.2.7.5l.1.2c.1.4.5.6.9.6h.3c.4 0 .8-.2 1-.5l.4-.6c.2-.3.5-.4.8-.5l.4-.1c.4-.1.6-.4.6-.8v-.3c0-.3.1-.6.3-.8l.2-.2c.3-.3.4-.7.3-1l-.1-.4z"/>
        </svg>
      </div>
    </div>
    <div class="fb-menu">
      <svg viewBox="0 0 20 20" fill="currentColor" class="fb-menu-icon">
        <circle cx="10" cy="4" r="1.5" />
        <circle cx="10" cy="10" r="1.5" />
        <circle cx="10" cy="16" r="1.5" />
      </svg>
    </div>
  </div>

  <!-- Primary Text -->
  <div class="fb-text">
    {displayText}
  </div>

  <!-- Media -->
  <div class="fb-media">
    {#if videoUrl}
      <div class="fb-video-placeholder">
        <svg viewBox="0 0 24 24" fill="currentColor" class="fb-play-icon">
          <path d="M8 5v14l11-7z"/>
        </svg>
        <span>Video Preview</span>
      </div>
    {:else if imageUrl}
      <img src={imageUrl} alt="Ad creative" class="fb-image" />
    {:else}
      <div class="fb-image-placeholder">
        <svg viewBox="0 0 24 24" fill="currentColor" class="fb-image-icon">
          <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
        </svg>
        <span>1200 x 628</span>
      </div>
    {/if}
  </div>

  <!-- Link Preview -->
  <div class="fb-link-preview">
    <div class="fb-link-info">
      <div class="fb-link-domain">YOURWEBSITE.COM</div>
      <div class="fb-link-headline">{displayHeadline}</div>
    </div>
    <button class="fb-cta-button">
      {ctaText}
    </button>
  </div>

  <!-- Reactions -->
  <div class="fb-reactions">
    <div class="fb-reaction-icons">
      <span class="fb-emoji">👍</span>
      <span class="fb-emoji">❤️</span>
      <span class="fb-emoji">😮</span>
    </div>
    <div class="fb-reaction-count">
      <span class="fb-comments">12 Comments</span>
      <span class="fb-shares">5 Shares</span>
    </div>
  </div>

  <!-- Actions -->
  <div class="fb-actions">
    <button class="fb-action-btn">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
      </svg>
      <span>Like</span>
    </button>
    <button class="fb-action-btn">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      <span>Comment</span>
    </button>
    <button class="fb-action-btn">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"/>
      </svg>
      <span>Share</span>
    </button>
  </div>
</div>

<style>
  .fb-ad-preview {
    background: white;
    border-radius: 8px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    overflow: hidden;
    max-width: 500px;
  }

  .fb-header {
    display: flex;
    align-items: center;
    padding: 12px;
    gap: 8px;
  }

  .fb-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: linear-gradient(135deg, #1877f2, #42b883);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .fb-avatar-letter {
    color: white;
    font-weight: 600;
    font-size: 18px;
  }

  .fb-header-info {
    flex: 1;
  }

  .fb-page-name {
    font-weight: 600;
    font-size: 14px;
    color: #050505;
  }

  .fb-sponsored {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: #65676b;
  }

  .fb-dot {
    font-size: 10px;
  }

  .fb-globe {
    width: 12px;
    height: 12px;
  }

  .fb-menu {
    padding: 8px;
    cursor: pointer;
  }

  .fb-menu-icon {
    width: 20px;
    height: 20px;
    color: #65676b;
  }

  .fb-text {
    padding: 0 12px 12px;
    font-size: 14px;
    line-height: 1.4;
    color: #050505;
  }

  .fb-media {
    width: 100%;
    aspect-ratio: 1200 / 628;
    background: #f0f2f5;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  .fb-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .fb-image-placeholder,
  .fb-video-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    color: #65676b;
  }

  .fb-image-icon,
  .fb-play-icon {
    width: 48px;
    height: 48px;
    opacity: 0.5;
  }

  .fb-link-preview {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px;
    background: #f0f2f5;
    border-top: 1px solid #dddfe2;
  }

  .fb-link-info {
    flex: 1;
    min-width: 0;
  }

  .fb-link-domain {
    font-size: 12px;
    color: #65676b;
    text-transform: uppercase;
  }

  .fb-link-headline {
    font-size: 16px;
    font-weight: 600;
    color: #050505;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .fb-cta-button {
    background: #e4e6eb;
    border: none;
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 600;
    color: #050505;
    cursor: pointer;
    margin-left: 12px;
    white-space: nowrap;
  }

  .fb-cta-button:hover {
    background: #d8dadf;
  }

  .fb-reactions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 12px;
    border-bottom: 1px solid #dddfe2;
  }

  .fb-reaction-icons {
    display: flex;
    gap: -4px;
  }

  .fb-emoji {
    font-size: 18px;
    margin-left: -4px;
  }

  .fb-emoji:first-child {
    margin-left: 0;
  }

  .fb-reaction-count {
    display: flex;
    gap: 16px;
    font-size: 13px;
    color: #65676b;
  }

  .fb-actions {
    display: flex;
    padding: 4px 12px;
  }

  .fb-action-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 10px;
    background: none;
    border: none;
    font-size: 14px;
    font-weight: 600;
    color: #65676b;
    cursor: pointer;
    border-radius: 4px;
  }

  .fb-action-btn:hover {
    background: #f0f2f5;
  }

  .fb-action-btn svg {
    width: 20px;
    height: 20px;
  }
</style>
