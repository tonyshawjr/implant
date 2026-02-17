import { json, type RequestHandler } from '@sveltejs/kit';
import { sendStaleLeadReminders, getStaleLeadsSummary } from '$lib/server/notifications/reminders';

/**
 * Vercel Cron Job endpoint for sending stale lead reminders
 *
 * This endpoint is called automatically by Vercel Cron at 9 AM daily.
 * It can also be called manually for testing with proper authorization.
 *
 * Security: Vercel Cron jobs include the CRON_SECRET in the Authorization header.
 * For manual calls, use the same authorization header.
 */
export const GET: RequestHandler = async ({ request }) => {
  // Verify authorization for cron jobs
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // In production, require authorization
  if (process.env.NODE_ENV === 'production' && cronSecret) {
    if (authHeader !== `Bearer ${cronSecret}`) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const startTime = Date.now();

    // Send stale lead reminders
    const result = await sendStaleLeadReminders();

    const duration = Date.now() - startTime;

    return json({
      success: true,
      message: 'Lead reminder job completed',
      result: {
        staleLeadsFound: result.staleLeadsFound,
        remindersAttempted: result.remindersAttempted,
        remindersSent: result.remindersSent,
        remindersFailed: result.remindersFailed,
        errorCount: result.errors.length
      },
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Lead reminder cron job error:', error);

    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
};

/**
 * POST endpoint to get stale leads summary without sending reminders
 * Useful for monitoring/dashboards
 */
export const POST: RequestHandler = async ({ request }) => {
  // Verify authorization
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (process.env.NODE_ENV === 'production' && cronSecret) {
    if (authHeader !== `Bearer ${cronSecret}`) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { action } = body as { action?: string };

    if (action === 'summary') {
      // Return summary without sending reminders
      const summary = await getStaleLeadsSummary();

      return json({
        success: true,
        action: 'summary',
        data: summary,
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'trigger') {
      // Trigger the reminder job manually
      const result = await sendStaleLeadReminders();

      return json({
        success: true,
        action: 'trigger',
        result: {
          staleLeadsFound: result.staleLeadsFound,
          remindersAttempted: result.remindersAttempted,
          remindersSent: result.remindersSent,
          remindersFailed: result.remindersFailed,
          errors: result.errors
        },
        timestamp: new Date().toISOString()
      });
    }

    return json({
      error: 'Invalid action. Use "summary" or "trigger"',
      timestamp: new Date().toISOString()
    }, { status: 400 });

  } catch (error) {
    console.error('Lead reminder POST error:', error);

    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
};
