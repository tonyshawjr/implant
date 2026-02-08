import Twilio from 'twilio';

// Environment variables
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || '';
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || '';

// Validate Twilio configuration
function validateTwilioConfig(): boolean {
  return !!(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER);
}

// Lazy initialization of Twilio client
let twilioClient: Twilio.Twilio | null = null;

/**
 * Get or create the Twilio client instance
 */
export function getTwilioClient(): Twilio.Twilio {
  if (!twilioClient) {
    if (!validateTwilioConfig()) {
      throw new Error('Twilio configuration is incomplete. Check environment variables.');
    }
    twilioClient = Twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  }
  return twilioClient;
}

/**
 * Get the configured Twilio phone number
 */
export function getTwilioPhoneNumber(): string {
  return TWILIO_PHONE_NUMBER;
}

/**
 * Check if Twilio is properly configured
 */
export function isTwilioConfigured(): boolean {
  return validateTwilioConfig();
}

/**
 * Format a phone number to E.164 format for Twilio
 * Assumes US numbers if no country code provided
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // If it's already 11 digits starting with 1, format as +1...
  if (digits.length === 11 && digits.startsWith('1')) {
    return '+' + digits;
  }

  // If it's 10 digits, assume US and add +1
  if (digits.length === 10) {
    return '+1' + digits;
  }

  // If it already has a + at the start, return as is (removing other characters)
  if (phone.startsWith('+')) {
    return '+' + digits;
  }

  // Otherwise return with + prefix
  return '+' + digits;
}

/**
 * Validate a phone number format
 */
export function isValidPhoneNumber(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  // Valid US number has 10 digits, or 11 starting with 1
  return digits.length === 10 || (digits.length === 11 && digits.startsWith('1'));
}

export interface TwilioMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send an SMS message using Twilio
 */
export async function sendSMS(
  to: string,
  body: string
): Promise<TwilioMessageResult> {
  try {
    if (!isTwilioConfigured()) {
      console.warn('Twilio is not configured. SMS not sent.');
      return {
        success: false,
        error: 'Twilio is not configured'
      };
    }

    if (!isValidPhoneNumber(to)) {
      return {
        success: false,
        error: 'Invalid phone number format'
      };
    }

    const client = getTwilioClient();
    const formattedPhone = formatPhoneNumber(to);

    const message = await client.messages.create({
      body,
      from: TWILIO_PHONE_NUMBER,
      to: formattedPhone
    });

    return {
      success: true,
      messageId: message.sid
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error sending SMS';
    console.error('Error sending SMS:', errorMessage);
    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Send a verification code via SMS
 */
export async function sendVerificationCode(
  to: string,
  code: string
): Promise<TwilioMessageResult> {
  const body = `Your SqueezMedia verification code is: ${code}. This code expires in 10 minutes.`;
  return sendSMS(to, body);
}

/**
 * Verify a phone number lookup using Twilio Lookup API
 */
export async function lookupPhoneNumber(phone: string): Promise<{
  valid: boolean;
  formatted?: string;
  carrier?: {
    name: string;
    type: string;
  };
  error?: string;
}> {
  try {
    if (!isTwilioConfigured()) {
      return {
        valid: false,
        error: 'Twilio is not configured'
      };
    }

    const client = getTwilioClient();
    const formattedPhone = formatPhoneNumber(phone);

    const lookup = await client.lookups.v2.phoneNumbers(formattedPhone).fetch({
      fields: 'line_type_intelligence'
    });

    return {
      valid: lookup.valid,
      formatted: lookup.phoneNumber,
      carrier: lookup.lineTypeIntelligence ? {
        name: lookup.lineTypeIntelligence.carrierName || 'Unknown',
        type: lookup.lineTypeIntelligence.type || 'Unknown'
      } : undefined
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error looking up phone';
    console.error('Error looking up phone number:', errorMessage);
    return {
      valid: false,
      error: errorMessage
    };
  }
}
