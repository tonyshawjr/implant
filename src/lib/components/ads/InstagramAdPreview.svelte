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

  // Truncate for Instagram limits
  function truncateCaption(text: string): string {
    if (!text) return '';
    if (text.length <= 125) return text;
    return text.substring(0, 122) + '...';
  }

  let displayCaption = $derived(truncateCaption(primaryText) || 'Your caption will appear here...');
  let showMore = $derived(primaryText.length > 125);
</script>

<div class="ig-ad-preview">
  <!-- Header -->
  <div class="ig-header">
    <div class="ig-profile">
      <div class="ig-avatar">
        <span class="ig-avatar-letter">{businessName.charAt(0).toUpperCase()}</span>
      </div>
      <div class="ig-info">
        <div class="ig-username">{businessName.toLowerCase().replace(/\s+/g, '')}</div>
        <div class="ig-sponsored">Sponsored</div>
      </div>
    </div>
    <div class="ig-menu">
      <svg viewBox="0 0 24 24" fill="currentColor" class="ig-menu-icon">
        <circle cx="12" cy="5" r="2" />
        <circle cx="12" cy="12" r="2" />
        <circle cx="12" cy="19" r="2" />
      </svg>
    </div>
  </div>

  <!-- Media -->
  <div class="ig-media">
    {#if videoUrl}
      <div class="ig-video-placeholder">
        <svg viewBox="0 0 24 24" fill="currentColor" class="ig-play-icon">
          <path d="M8 5v14l11-7z"/>
        </svg>
      </div>
    {:else if imageUrl}
      <img src={imageUrl} alt="Ad creative" class="ig-image" />
    {:else}
      <div class="ig-image-placeholder">
        <svg viewBox="0 0 24 24" fill="currentColor" class="ig-image-icon">
          <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
        </svg>
        <span>1080 x 1080</span>
      </div>
    {/if}
  </div>

  <!-- CTA Button -->
  <div class="ig-cta-bar">
    <button class="ig-cta-button">
      <span>{ctaText}</span>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="ig-cta-arrow">
        <path d="M5 12h14M12 5l7 7-7 7"/>
      </svg>
    </button>
  </div>

  <!-- Actions -->
  <div class="ig-actions">
    <div class="ig-actions-left">
      <button class="ig-action-btn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      </button>
      <button class="ig-action-btn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </button>
      <button class="ig-action-btn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
        </svg>
      </button>
    </div>
    <button class="ig-action-btn">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
      </svg>
    </button>
  </div>

  <!-- Likes -->
  <div class="ig-likes">
    <span class="ig-likes-count">1,234 likes</span>
  </div>

  <!-- Caption -->
  <div class="ig-caption">
    <span class="ig-caption-username">{businessName.toLowerCase().replace(/\s+/g, '')}</span>
    <span class="ig-caption-text">{displayCaption}</span>
    {#if showMore}
      <button class="ig-more">more</button>
    {/if}
  </div>

  <!-- Comments -->
  <div class="ig-comments">
    <span class="ig-view-comments">View all 24 comments</span>
  </div>

  <!-- Time -->
  <div class="ig-time">
    2 HOURS AGO
  </div>
</div>

<style>
  .ig-ad-preview {
    background: white;
    border: 1px solid #dbdbdb;
    border-radius: 3px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    max-width: 470px;
  }

  .ig-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 12px;
  }

  .ig-profile {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .ig-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2px;
  }

  .ig-avatar-letter {
    width: 100%;
    height: 100%;
    background: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 14px;
    color: #262626;
  }

  .ig-info {
    display: flex;
    flex-direction: column;
  }

  .ig-username {
    font-weight: 600;
    font-size: 14px;
    color: #262626;
  }

  .ig-sponsored {
    font-size: 12px;
    color: #8e8e8e;
  }

  .ig-menu {
    padding: 8px;
    cursor: pointer;
  }

  .ig-menu-icon {
    width: 24px;
    height: 24px;
    color: #262626;
  }

  .ig-media {
    width: 100%;
    aspect-ratio: 1;
    background: #fafafa;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  .ig-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .ig-image-placeholder,
  .ig-video-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    color: #8e8e8e;
  }

  .ig-image-icon {
    width: 64px;
    height: 64px;
    opacity: 0.4;
  }

  .ig-play-icon {
    width: 80px;
    height: 80px;
    opacity: 0.6;
  }

  .ig-cta-bar {
    padding: 8px;
    background: #fafafa;
    border-top: 1px solid #efefef;
    border-bottom: 1px solid #efefef;
  }

  .ig-cta-button {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 16px;
    background: #0095f6;
    border: none;
    border-radius: 4px;
    color: white;
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
  }

  .ig-cta-button:hover {
    background: #1877f2;
  }

  .ig-cta-arrow {
    width: 16px;
    height: 16px;
  }

  .ig-actions {
    display: flex;
    justify-content: space-between;
    padding: 8px 12px;
  }

  .ig-actions-left {
    display: flex;
    gap: 16px;
  }

  .ig-action-btn {
    background: none;
    border: none;
    padding: 4px;
    cursor: pointer;
  }

  .ig-action-btn svg {
    width: 24px;
    height: 24px;
    color: #262626;
  }

  .ig-action-btn:hover svg {
    color: #8e8e8e;
  }

  .ig-likes {
    padding: 0 12px 8px;
  }

  .ig-likes-count {
    font-weight: 600;
    font-size: 14px;
    color: #262626;
  }

  .ig-caption {
    padding: 0 12px 8px;
    font-size: 14px;
    line-height: 1.4;
  }

  .ig-caption-username {
    font-weight: 600;
    color: #262626;
    margin-right: 4px;
  }

  .ig-caption-text {
    color: #262626;
  }

  .ig-more {
    background: none;
    border: none;
    color: #8e8e8e;
    font-size: 14px;
    cursor: pointer;
    padding: 0;
  }

  .ig-comments {
    padding: 0 12px 8px;
  }

  .ig-view-comments {
    font-size: 14px;
    color: #8e8e8e;
    cursor: pointer;
  }

  .ig-time {
    padding: 0 12px 12px;
    font-size: 10px;
    color: #8e8e8e;
    text-transform: uppercase;
    letter-spacing: 0.2px;
  }
</style>
