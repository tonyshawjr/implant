import { prisma } from './db';
import crypto from 'crypto';

// Integration IDs - these are the identifiers used in the system
export type IntegrationId =
  | 'stripe'
  | 'twilio'
  | 'sendgrid'
  | 'resend'
  | 'meta'
  | 'google-ads'
  | 'slack'
  | 'openai'
  | 'claude'
  | 'calendly'
  | 'smtp';

// Integration metadata (static info about each integration)
export interface IntegrationMeta {
  id: IntegrationId;
  name: string;
  description: string;
  icon: string;
  category: 'payment' | 'communication' | 'advertising' | 'ai' | 'scheduling';
  fields: IntegrationField[];
}

export interface IntegrationField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'email' | 'number' | 'select';
  required: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  helpText?: string;
}

// Integration status from database
export interface IntegrationConfig {
  isConnected: boolean;
  apiKey?: string;
  apiKeyMasked?: string;
  lastSync?: string;
  config?: Record<string, any>;
}

export interface Integration extends IntegrationMeta {
  status: 'connected' | 'disconnected';
  lastSync: string | null;
  apiKeyMasked?: string;
  config?: Record<string, any>;
}

// Simple encryption using AES-256-GCM
// In production, use a proper secrets manager like AWS Secrets Manager or HashiCorp Vault

// Lazy validation of encryption key - only check when actually needed
let cachedEncryptionKey: string | null = null;

function getEncryptionKeyString(): string {
  if (cachedEncryptionKey) {
    return cachedEncryptionKey;
  }

  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    // In development/build, use a default key (credentials won't be secure but app will work)
    console.warn(
      'WARNING: ENCRYPTION_KEY not set. Using default key for development.\n' +
      'For production, generate a secure key with: openssl rand -hex 32'
    );
    cachedEncryptionKey = 'dev-default-key-not-for-production-use';
    return cachedEncryptionKey;
  }

  cachedEncryptionKey = key;
  return key;
}

function getEncryptionKey(): Buffer {
  // Ensure key is 32 bytes for AES-256
  return crypto.createHash('sha256').update(getEncryptionKeyString()).digest();
}

export function encryptApiKey(apiKey: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);

  let encrypted = cipher.update(apiKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Return IV + AuthTag + Encrypted data
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

export function decryptApiKey(encryptedData: string): string {
  const parts = encryptedData.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }

  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];

  const decipher = crypto.createDecipheriv('aes-256-gcm', getEncryptionKey(), iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

export function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 8) return '****';

  // Show first 7 chars and last 4 chars
  const prefix = apiKey.slice(0, 7);
  const suffix = apiKey.slice(-4);
  const middleLength = Math.max(0, apiKey.length - 11);
  const stars = '*'.repeat(Math.min(middleLength, 20)); // Max 20 stars

  return `${prefix}${stars}${suffix}`;
}

// Static metadata for all integrations
export const INTEGRATIONS_METADATA: IntegrationMeta[] = [
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Payment processing and subscription management',
    icon: 'credit-card',
    category: 'payment',
    fields: [
      {
        key: 'apiKey',
        label: 'Secret Key',
        type: 'password',
        required: true,
        placeholder: 'sk_live_...',
        helpText: 'Your Stripe secret key from the Dashboard'
      },
      {
        key: 'webhookSecret',
        label: 'Webhook Secret',
        type: 'password',
        required: false,
        placeholder: 'whsec_...',
        helpText: 'Webhook signing secret for verifying Stripe events'
      }
    ]
  },
  {
    id: 'twilio',
    name: 'Twilio',
    description: 'SMS and voice notifications',
    icon: 'phone',
    category: 'communication',
    fields: [
      {
        key: 'accountSid',
        label: 'Account SID',
        type: 'text',
        required: true,
        placeholder: 'AC...'
      },
      {
        key: 'authToken',
        label: 'Auth Token',
        type: 'password',
        required: true,
        placeholder: 'Your auth token'
      },
      {
        key: 'phoneNumber',
        label: 'Phone Number',
        type: 'text',
        required: true,
        placeholder: '+1234567890',
        helpText: 'Your Twilio phone number'
      }
    ]
  },
  {
    id: 'sendgrid',
    name: 'SendGrid',
    description: 'Email delivery service',
    icon: 'mail',
    category: 'communication',
    fields: [
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'SG...',
        helpText: 'Your SendGrid API key'
      },
      {
        key: 'fromEmail',
        label: 'From Email',
        type: 'email',
        required: true,
        placeholder: 'noreply@yourdomain.com'
      },
      {
        key: 'fromName',
        label: 'From Name',
        type: 'text',
        required: false,
        placeholder: 'SqueezMedia'
      }
    ]
  },
  {
    id: 'resend',
    name: 'Resend',
    description: 'Modern email API for developers',
    icon: 'mail',
    category: 'communication',
    fields: [
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 're_...',
        helpText: 'Your Resend API key from resend.com/api-keys'
      },
      {
        key: 'fromEmail',
        label: 'From Email',
        type: 'email',
        required: true,
        placeholder: 'noreply@yourdomain.com',
        helpText: 'Must be from a verified domain'
      },
      {
        key: 'fromName',
        label: 'From Name',
        type: 'text',
        required: false,
        placeholder: 'SqueezMedia'
      }
    ]
  },
  {
    id: 'smtp',
    name: 'SMTP Email',
    description: 'Custom SMTP server for email delivery',
    icon: 'mail',
    category: 'communication',
    fields: [
      {
        key: 'host',
        label: 'SMTP Host',
        type: 'text',
        required: true,
        placeholder: 'smtp.example.com'
      },
      {
        key: 'port',
        label: 'Port',
        type: 'number',
        required: true,
        placeholder: '587'
      },
      {
        key: 'username',
        label: 'Username',
        type: 'text',
        required: true,
        placeholder: 'your-username'
      },
      {
        key: 'password',
        label: 'Password',
        type: 'password',
        required: true,
        placeholder: 'your-password'
      },
      {
        key: 'fromEmail',
        label: 'From Email',
        type: 'email',
        required: true,
        placeholder: 'noreply@yourdomain.com'
      },
      {
        key: 'fromName',
        label: 'From Name',
        type: 'text',
        required: false,
        placeholder: 'SqueezMedia'
      },
      {
        key: 'secure',
        label: 'Use TLS/SSL',
        type: 'select',
        required: true,
        options: [
          { value: 'true', label: 'Yes (recommended)' },
          { value: 'false', label: 'No' }
        ]
      }
    ]
  },
  {
    id: 'meta',
    name: 'Meta Ads',
    description: 'Facebook and Instagram advertising',
    icon: 'megaphone',
    category: 'advertising',
    fields: [
      {
        key: 'accessToken',
        label: 'Access Token',
        type: 'password',
        required: true,
        placeholder: 'Your Meta access token'
      },
      {
        key: 'appId',
        label: 'App ID',
        type: 'text',
        required: true,
        placeholder: 'Your Meta app ID'
      },
      {
        key: 'appSecret',
        label: 'App Secret',
        type: 'password',
        required: true,
        placeholder: 'Your Meta app secret'
      },
      {
        key: 'adAccountId',
        label: 'Ad Account ID',
        type: 'text',
        required: false,
        placeholder: 'act_123456789',
        helpText: 'Default ad account to use'
      }
    ]
  },
  {
    id: 'google-ads',
    name: 'Google Ads',
    description: 'Google advertising platform',
    icon: 'search',
    category: 'advertising',
    fields: [
      {
        key: 'developerToken',
        label: 'Developer Token',
        type: 'password',
        required: true,
        placeholder: 'Your Google Ads developer token'
      },
      {
        key: 'clientId',
        label: 'OAuth Client ID',
        type: 'text',
        required: true,
        placeholder: 'Your OAuth 2.0 client ID'
      },
      {
        key: 'clientSecret',
        label: 'OAuth Client Secret',
        type: 'password',
        required: true,
        placeholder: 'Your OAuth 2.0 client secret'
      },
      {
        key: 'refreshToken',
        label: 'Refresh Token',
        type: 'password',
        required: true,
        placeholder: 'Your OAuth refresh token'
      },
      {
        key: 'customerId',
        label: 'Customer ID',
        type: 'text',
        required: false,
        placeholder: '123-456-7890',
        helpText: 'Default customer ID (MCC or regular account)'
      }
    ]
  },
  {
    id: 'calendly',
    name: 'Calendly',
    description: 'Appointment scheduling',
    icon: 'calendar',
    category: 'scheduling',
    fields: [
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'Your Calendly API key'
      },
      {
        key: 'webhookSigningKey',
        label: 'Webhook Signing Key',
        type: 'password',
        required: false,
        placeholder: 'Your webhook signing key'
      }
    ]
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Team notifications and alerts',
    icon: 'chat',
    category: 'communication',
    fields: [
      {
        key: 'webhookUrl',
        label: 'Webhook URL',
        type: 'password',
        required: true,
        placeholder: 'https://hooks.slack.com/services/...',
        helpText: 'Incoming webhook URL for your Slack channel'
      },
      {
        key: 'channel',
        label: 'Default Channel',
        type: 'text',
        required: false,
        placeholder: '#alerts'
      }
    ]
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'AI content generation (alternative)',
    icon: 'sparkles',
    category: 'ai',
    fields: [
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'sk-...',
        helpText: 'Your OpenAI API key'
      },
      {
        key: 'organizationId',
        label: 'Organization ID',
        type: 'text',
        required: false,
        placeholder: 'org-...',
        helpText: 'Optional organization ID'
      },
      {
        key: 'defaultModel',
        label: 'Default Model',
        type: 'select',
        required: false,
        options: [
          { value: 'gpt-4o', label: 'GPT-4o (Recommended)' },
          { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Faster)' },
          { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
          { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (Cheapest)' }
        ]
      }
    ]
  },
  {
    id: 'claude',
    name: 'Claude (Anthropic)',
    description: 'AI voice analysis and content generation (recommended)',
    icon: 'sparkles',
    category: 'ai',
    fields: [
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'sk-ant-api03-...',
        helpText: 'Get your API key from console.anthropic.com'
      },
      {
        key: 'defaultModel',
        label: 'Default Model',
        type: 'select',
        required: false,
        options: [
          { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet (Recommended)' },
          { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus (Most Capable)' },
          { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku (Fastest)' }
        ]
      }
    ]
  }
];

// Get integration setting key
function getIntegrationSettingKey(integrationId: IntegrationId): string {
  return `integration:${integrationId}`;
}

// Get all integrations with their current status from the database
export async function getIntegrations(): Promise<Integration[]> {
  // Get all integration settings from the database
  const settingKeys = INTEGRATIONS_METADATA.map(m => getIntegrationSettingKey(m.id));

  const settings = await prisma.systemSetting.findMany({
    where: {
      key: {
        in: settingKeys
      }
    }
  });

  // Create a map of settings by key
  const settingsMap = new Map<string, any>();
  for (const setting of settings) {
    settingsMap.set(setting.key, setting.value);
  }

  // Build the integrations array with status
  return INTEGRATIONS_METADATA.map(meta => {
    const settingKey = getIntegrationSettingKey(meta.id);
    const config = settingsMap.get(settingKey) as IntegrationConfig | undefined;

    return {
      ...meta,
      status: config?.isConnected ? 'connected' : 'disconnected',
      lastSync: config?.lastSync || null,
      apiKeyMasked: config?.apiKeyMasked,
      config: config?.config
    } as Integration;
  });
}

// Get a single integration by ID
export async function getIntegration(integrationId: IntegrationId): Promise<Integration | null> {
  const meta = INTEGRATIONS_METADATA.find(m => m.id === integrationId);
  if (!meta) return null;

  const settingKey = getIntegrationSettingKey(integrationId);
  const setting = await prisma.systemSetting.findUnique({
    where: { key: settingKey }
  });

  const config = setting?.value as IntegrationConfig | undefined;

  return {
    ...meta,
    status: config?.isConnected ? 'connected' : 'disconnected',
    lastSync: config?.lastSync || null,
    apiKeyMasked: config?.apiKeyMasked,
    config: config?.config
  };
}

// Connect an integration (save credentials)
export async function connectIntegration(
  integrationId: IntegrationId,
  credentials: Record<string, string>,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const meta = INTEGRATIONS_METADATA.find(m => m.id === integrationId);
  if (!meta) {
    return { success: false, error: 'Unknown integration' };
  }

  // Validate required fields
  for (const field of meta.fields) {
    if (field.required && !credentials[field.key]) {
      return { success: false, error: `${field.label} is required` };
    }
  }

  // Encrypt sensitive fields
  const encryptedConfig: Record<string, string> = {};
  let primaryKeyForMasking = '';

  for (const field of meta.fields) {
    const value = credentials[field.key];
    if (value) {
      if (field.type === 'password') {
        encryptedConfig[field.key] = encryptApiKey(value);
        // Use the first password field for masking display
        if (!primaryKeyForMasking) {
          primaryKeyForMasking = value;
        }
      } else {
        encryptedConfig[field.key] = value;
      }
    }
  }

  const settingKey = getIntegrationSettingKey(integrationId);
  const configValue: IntegrationConfig = {
    isConnected: true,
    apiKeyMasked: primaryKeyForMasking ? maskApiKey(primaryKeyForMasking) : undefined,
    lastSync: new Date().toISOString(),
    config: encryptedConfig
  };

  await prisma.systemSetting.upsert({
    where: { key: settingKey },
    create: {
      key: settingKey,
      value: configValue as any,
      description: `Configuration for ${meta.name} integration`,
      updatedBy: userId
    },
    update: {
      value: configValue as any,
      updatedBy: userId
    }
  });

  return { success: true };
}

// Disconnect an integration
export async function disconnectIntegration(
  integrationId: IntegrationId,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const meta = INTEGRATIONS_METADATA.find(m => m.id === integrationId);
  if (!meta) {
    return { success: false, error: 'Unknown integration' };
  }

  const settingKey = getIntegrationSettingKey(integrationId);

  const configValue: IntegrationConfig = {
    isConnected: false,
    lastSync: undefined
  };

  await prisma.systemSetting.upsert({
    where: { key: settingKey },
    create: {
      key: settingKey,
      value: configValue as any,
      description: `Configuration for ${meta.name} integration`,
      updatedBy: userId
    },
    update: {
      value: configValue as any,
      updatedBy: userId
    }
  });

  return { success: true };
}

// Update integration sync time
export async function updateIntegrationSyncTime(
  integrationId: IntegrationId
): Promise<void> {
  const settingKey = getIntegrationSettingKey(integrationId);

  const setting = await prisma.systemSetting.findUnique({
    where: { key: settingKey }
  });

  if (setting && setting.value) {
    const config = setting.value as unknown as IntegrationConfig;
    config.lastSync = new Date().toISOString();

    await prisma.systemSetting.update({
      where: { key: settingKey },
      data: { value: config as any }
    });
  }
}

// Get decrypted credentials for an integration (for internal use)
export async function getIntegrationCredentials(
  integrationId: IntegrationId
): Promise<Record<string, string> | null> {
  const meta = INTEGRATIONS_METADATA.find(m => m.id === integrationId);
  if (!meta) return null;

  const settingKey = getIntegrationSettingKey(integrationId);
  const setting = await prisma.systemSetting.findUnique({
    where: { key: settingKey }
  });

  if (!setting || !setting.value) return null;

  const config = setting.value as unknown as IntegrationConfig;
  if (!config.isConnected || !config.config) return null;

  // Decrypt password fields
  const decryptedConfig: Record<string, string> = {};

  for (const field of meta.fields) {
    const value = config.config[field.key];
    if (value) {
      if (field.type === 'password') {
        try {
          decryptedConfig[field.key] = decryptApiKey(value);
        } catch {
          // If decryption fails, skip this field
          console.error(`Failed to decrypt ${field.key} for ${integrationId}`);
        }
      } else {
        decryptedConfig[field.key] = value;
      }
    }
  }

  return decryptedConfig;
}

// Check if an integration is connected
export async function isIntegrationConnected(integrationId: IntegrationId): Promise<boolean> {
  const settingKey = getIntegrationSettingKey(integrationId);
  const setting = await prisma.systemSetting.findUnique({
    where: { key: settingKey }
  });

  if (!setting || !setting.value) return false;

  const config = setting.value as unknown as IntegrationConfig;
  return config.isConnected === true;
}
