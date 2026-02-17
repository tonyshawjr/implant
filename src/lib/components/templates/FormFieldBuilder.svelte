<script lang="ts">
  import { Button, Input, Select, Checkbox, Modal, Label, Badge } from 'flowbite-svelte';
  import {
    PlusOutline,
    TrashBinOutline,
    PencilOutline,
    BarsOutline
  } from 'flowbite-svelte-icons';
  import { dndzone } from 'svelte-dnd-action';
  import { flip } from 'svelte/animate';

  interface FormField {
    id: string;
    name: string;
    type: 'text' | 'email' | 'phone' | 'select' | 'checkbox' | 'textarea';
    label: string;
    placeholder?: string;
    required: boolean;
    options?: string[];
  }

  interface Props {
    fields: FormField[];
    onFieldsChange: (fields: FormField[]) => void;
  }

  let { fields = [], onFieldsChange }: Props = $props();

  let editModalOpen = $state(false);
  let editingField = $state<FormField | null>(null);
  let editingIndex = $state<number>(-1);

  // Editing form state
  let fieldName = $state('');
  let fieldType = $state<FormField['type']>('text');
  let fieldLabel = $state('');
  let fieldPlaceholder = $state('');
  let fieldRequired = $state(true);
  let fieldOptions = $state('');

  const fieldTypeOptions = [
    { value: 'text', name: 'Text Input' },
    { value: 'email', name: 'Email' },
    { value: 'phone', name: 'Phone Number' },
    { value: 'select', name: 'Dropdown Select' },
    { value: 'checkbox', name: 'Checkbox' },
    { value: 'textarea', name: 'Text Area' }
  ];

  function getFieldTypeIcon(type: string): string {
    switch (type) {
      case 'text':
        return 'Aa';
      case 'email':
        return '@';
      case 'phone':
        return '#';
      case 'select':
        return 'v';
      case 'checkbox':
        return '[]';
      case 'textarea':
        return '|||';
      default:
        return '?';
    }
  }

  function generateId(): string {
    return `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  function openAddModal() {
    editingField = null;
    editingIndex = -1;
    fieldName = '';
    fieldType = 'text';
    fieldLabel = '';
    fieldPlaceholder = '';
    fieldRequired = true;
    fieldOptions = '';
    editModalOpen = true;
  }

  function openEditModal(field: FormField, index: number) {
    editingField = field;
    editingIndex = index;
    fieldName = field.name;
    fieldType = field.type;
    fieldLabel = field.label;
    fieldPlaceholder = field.placeholder || '';
    fieldRequired = field.required;
    fieldOptions = field.options?.join('\n') || '';
    editModalOpen = true;
  }

  function saveField() {
    const newField: FormField = {
      id: editingField?.id || generateId(),
      name: fieldName || fieldLabel.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
      type: fieldType,
      label: fieldLabel,
      placeholder: fieldPlaceholder || undefined,
      required: fieldRequired,
      options: fieldType === 'select' ? fieldOptions.split('\n').filter(o => o.trim()) : undefined
    };

    let updatedFields: FormField[];
    if (editingIndex >= 0) {
      updatedFields = [...fields];
      updatedFields[editingIndex] = newField;
    } else {
      updatedFields = [...fields, newField];
    }

    onFieldsChange(updatedFields);
    editModalOpen = false;
  }

  function deleteField(index: number) {
    const updatedFields = fields.filter((_, i) => i !== index);
    onFieldsChange(updatedFields);
  }

  function handleDndConsider(e: CustomEvent<{ items: FormField[] }>) {
    // Update fields during drag
    onFieldsChange(e.detail.items);
  }

  function handleDndFinalize(e: CustomEvent<{ items: FormField[] }>) {
    // Finalize the order
    onFieldsChange(e.detail.items);
  }

  const flipDurationMs = 200;
</script>

<div class="space-y-4">
  <!-- Field List -->
  {#if fields.length > 0}
    <div
      class="space-y-2"
      use:dndzone={{ items: fields, flipDurationMs, type: 'form-fields' }}
      onconsider={handleDndConsider}
      onfinalize={handleDndFinalize}
    >
      {#each fields as field, index (field.id)}
        <div
          animate:flip={{ duration: flipDurationMs }}
          class="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 group"
        >
          <!-- Drag Handle -->
          <button
            type="button"
            class="cursor-grab text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Drag to reorder"
          >
            <BarsOutline class="w-5 h-5" />
          </button>

          <!-- Field Type Icon -->
          <div class="w-8 h-8 flex items-center justify-center bg-white dark:bg-gray-600 rounded border border-gray-200 dark:border-gray-500 text-xs font-mono text-gray-600 dark:text-gray-300">
            {getFieldTypeIcon(field.type)}
          </div>

          <!-- Field Info -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="font-medium text-gray-900 dark:text-white truncate">
                {field.label}
              </span>
              {#if field.required}
                <Badge color="red" class="text-xs">Required</Badge>
              {/if}
            </div>
            <div class="text-sm text-gray-500 dark:text-gray-400">
              {field.type} &middot; {field.name}
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="xs"
              color="light"
              onclick={() => openEditModal(field, index)}
            >
              <PencilOutline class="w-4 h-4" />
            </Button>
            <Button
              size="xs"
              color="light"
              onclick={() => deleteField(index)}
              class="text-red-600 hover:text-red-700"
            >
              <TrashBinOutline class="w-4 h-4" />
            </Button>
          </div>
        </div>
      {/each}
    </div>
  {:else}
    <div class="text-center py-8 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/30 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-600">
      <p>No form fields defined yet.</p>
      <p class="text-sm mt-1">Add fields to create your form.</p>
    </div>
  {/if}

  <!-- Add Field Button -->
  <Button color="light" class="w-full" onclick={openAddModal}>
    <PlusOutline class="w-4 h-4 me-2" />
    Add Field
  </Button>
</div>

<!-- Edit/Add Field Modal -->
<Modal bind:open={editModalOpen} size="md" title={editingField ? 'Edit Field' : 'Add Field'}>
  <div class="space-y-4">
    <div>
      <Label for="fieldLabel" class="mb-2">Field Label *</Label>
      <Input
        id="fieldLabel"
        bind:value={fieldLabel}
        placeholder="e.g., Full Name"
        required
      />
    </div>

    <div>
      <Label for="fieldName" class="mb-2">Field Name (ID)</Label>
      <Input
        id="fieldName"
        bind:value={fieldName}
        placeholder="Auto-generated from label if empty"
      />
      <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
        Used as the form field name attribute. Leave empty to auto-generate.
      </p>
    </div>

    <div>
      <Label for="fieldType" class="mb-2">Field Type *</Label>
      <Select
        id="fieldType"
        items={fieldTypeOptions}
        bind:value={fieldType}
      />
    </div>

    {#if fieldType !== 'checkbox'}
      <div>
        <Label for="fieldPlaceholder" class="mb-2">Placeholder Text</Label>
        <Input
          id="fieldPlaceholder"
          bind:value={fieldPlaceholder}
          placeholder="e.g., Enter your name..."
        />
      </div>
    {/if}

    {#if fieldType === 'select'}
      <div>
        <Label for="fieldOptions" class="mb-2">Options (one per line) *</Label>
        <textarea
          id="fieldOptions"
          bind:value={fieldOptions}
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          rows="4"
          placeholder="Yes&#10;No&#10;Not sure"
        ></textarea>
      </div>
    {/if}

    <div class="flex items-center gap-2">
      <Checkbox bind:checked={fieldRequired} />
      <Label>Required field</Label>
    </div>
  </div>

  <svelte:fragment slot="footer">
    <div class="flex gap-3">
      <Button color="light" onclick={() => editModalOpen = false}>Cancel</Button>
      <Button
        color="primary"
        onclick={saveField}
        disabled={!fieldLabel || (fieldType === 'select' && !fieldOptions.trim())}
      >
        {editingField ? 'Update Field' : 'Add Field'}
      </Button>
    </div>
  </svelte:fragment>
</Modal>
