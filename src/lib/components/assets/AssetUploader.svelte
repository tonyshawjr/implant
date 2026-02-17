<script lang="ts">
  import { Button, Spinner, Alert, Helper } from 'flowbite-svelte';
  import { CloudArrowUpOutline, CloseOutline, FileImageSolid, FileVideoSolid } from 'flowbite-svelte-icons';

  interface Asset {
    id: string;
    organizationId: string | null;
    name: string;
    type: string;
    url: string;
    fileSize: number | null;
    mimeType: string | null;
    tags: string[] | null;
    uploadedBy: string | null;
    createdAt: string;
  }

  interface Props {
    organizationId: string;
    onUpload?: (asset: Asset) => void;
  }

  let { organizationId, onUpload }: Props = $props();

  // State
  let isDragOver = $state(false);
  let selectedFiles: File[] = $state([]);
  let isUploading = $state(false);
  let uploadProgress = $state(0);
  let uploadErrors: string[] = $state([]);
  let tags = $state('');

  // Constants
  const ALLOWED_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/quicktime'
  ];
  const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
  const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

  // Handlers
  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    isDragOver = true;
  }

  function handleDragLeave(event: DragEvent) {
    event.preventDefault();
    isDragOver = false;
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    isDragOver = false;

    const files = event.dataTransfer?.files;
    if (files) {
      addFiles(Array.from(files));
    }
  }

  function handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      addFiles(Array.from(input.files));
    }
    // Reset input to allow selecting the same file again
    input.value = '';
  }

  function addFiles(files: File[]) {
    uploadErrors = [];

    for (const file of files) {
      // Validate type
      if (!ALLOWED_TYPES.includes(file.type)) {
        uploadErrors = [...uploadErrors, `${file.name}: Invalid file type. Only JPEG, PNG, WebP images and MP4, MOV videos are allowed.`];
        continue;
      }

      // Validate size
      const isImage = file.type.startsWith('image/');
      const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;

      if (file.size > maxSize) {
        const maxSizeMB = maxSize / (1024 * 1024);
        uploadErrors = [...uploadErrors, `${file.name}: File too large. Maximum size is ${maxSizeMB}MB for ${isImage ? 'images' : 'videos'}.`];
        continue;
      }

      // Add to selected files (avoid duplicates)
      if (!selectedFiles.some(f => f.name === file.name && f.size === file.size)) {
        selectedFiles = [...selectedFiles, file];
      }
    }
  }

  function removeFile(index: number) {
    selectedFiles = selectedFiles.filter((_, i) => i !== index);
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  async function uploadFiles() {
    if (selectedFiles.length === 0) return;

    isUploading = true;
    uploadProgress = 0;
    uploadErrors = [];

    const totalFiles = selectedFiles.length;
    let uploadedCount = 0;

    for (const file of selectedFiles) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('organization_id', organizationId);
        if (tags.trim()) {
          formData.append('tags', tags.trim());
        }

        const response = await fetch('/api/assets/upload', {
          method: 'POST',
          body: formData
        });

        const result = await response.json();

        if (result.success) {
          uploadedCount++;
          uploadProgress = Math.round((uploadedCount / totalFiles) * 100);

          if (onUpload && result.data?.asset) {
            onUpload(result.data.asset);
          }
        } else {
          uploadErrors = [...uploadErrors, `${file.name}: ${result.error?.message || 'Upload failed'}`];
        }
      } catch (error) {
        uploadErrors = [...uploadErrors, `${file.name}: ${error instanceof Error ? error.message : 'Network error'}`];
      }
    }

    // Clear successful uploads
    if (uploadedCount > 0) {
      selectedFiles = selectedFiles.filter((_, i) => i >= uploadedCount);
      tags = '';
    }

    isUploading = false;
  }

  function clearAll() {
    selectedFiles = [];
    uploadErrors = [];
    tags = '';
  }
</script>

<div class="space-y-4">
  <!-- Drop Zone -->
  <div
    role="button"
    tabindex="0"
    class="relative rounded-lg border-2 border-dashed p-8 text-center transition-colors {isDragOver
      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
      : 'border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500'}"
    ondragover={handleDragOver}
    ondragleave={handleDragLeave}
    ondrop={handleDrop}
  >
    <input
      type="file"
      accept=".jpg,.jpeg,.png,.webp,.mp4,.mov"
      multiple
      class="absolute inset-0 cursor-pointer opacity-0"
      onchange={handleFileSelect}
      disabled={isUploading}
    />

    <div class="flex flex-col items-center gap-3">
      <div class="rounded-full bg-gray-100 p-4 dark:bg-gray-700">
        <CloudArrowUpOutline class="h-8 w-8 text-gray-500 dark:text-gray-400" />
      </div>
      <div>
        <p class="text-lg font-medium text-gray-900 dark:text-white">
          {isDragOver ? 'Drop files here' : 'Drag and drop files here'}
        </p>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          or <span class="text-primary-600 dark:text-primary-400">browse</span> to select files
        </p>
      </div>
      <Helper class="mt-2">
        Images: JPEG, PNG, WebP (max 10MB) | Videos: MP4, MOV (max 100MB)
      </Helper>
    </div>
  </div>

  <!-- Selected Files -->
  {#if selectedFiles.length > 0}
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <p class="text-sm font-medium text-gray-700 dark:text-gray-300">
          {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected
        </p>
        <Button size="xs" color="alternative" onclick={clearAll} disabled={isUploading}>
          Clear all
        </Button>
      </div>

      <div class="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-gray-200 p-2 dark:border-gray-700">
        {#each selectedFiles as file, index}
          <div class="flex items-center gap-3 rounded-lg bg-gray-50 p-2 dark:bg-gray-800">
            <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-200 dark:bg-gray-700">
              {#if file.type.startsWith('image/')}
                <FileImageSolid class="h-5 w-5 text-gray-500 dark:text-gray-400" />
              {:else}
                <FileVideoSolid class="h-5 w-5 text-gray-500 dark:text-gray-400" />
              {/if}
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-gray-900 dark:text-white">
                {file.name}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                {formatFileSize(file.size)}
              </p>
            </div>
            <button
              type="button"
              class="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
              onclick={() => removeFile(index)}
              disabled={isUploading}
            >
              <CloseOutline class="h-4 w-4" />
            </button>
          </div>
        {/each}
      </div>

      <!-- Tags Input -->
      <div>
        <label for="tags" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Tags (optional)
        </label>
        <input
          type="text"
          id="tags"
          bind:value={tags}
          placeholder="Enter comma-separated tags"
          disabled={isUploading}
          class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary-500 dark:focus:ring-primary-500"
        />
      </div>

      <!-- Upload Button -->
      <div class="flex items-center gap-3">
        <Button color="primary" onclick={uploadFiles} disabled={isUploading || selectedFiles.length === 0}>
          {#if isUploading}
            <Spinner size="4" class="mr-2" />
            Uploading... {uploadProgress}%
          {:else}
            <CloudArrowUpOutline class="mr-2 h-4 w-4" />
            Upload {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''}
          {/if}
        </Button>

        {#if isUploading}
          <div class="flex-1">
            <div class="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                class="h-full bg-primary-600 transition-all duration-300"
                style="width: {uploadProgress}%"
              ></div>
            </div>
          </div>
        {/if}
      </div>
    </div>
  {/if}

  <!-- Errors -->
  {#if uploadErrors.length > 0}
    <Alert color="red" class="border-l-4">
      <span class="font-medium">Upload errors:</span>
      <ul class="mt-1 list-inside list-disc text-sm">
        {#each uploadErrors as error}
          <li>{error}</li>
        {/each}
      </ul>
    </Alert>
  {/if}
</div>
