import { supabase } from './supabase.js';
import { sendTelegramMessage } from './telegram.js';
import { auditLog } from './logger.js';

export async function runDailyReminders() {
  console.log("⏰ Running daily reminders...");

  const { data: quotes, error } = await supabase
    .from('quote_requests')
    .select('*')
    .in('status', ['quoted', 'escalated'])
    .order('created_at', { ascending: true });

  if (error) {
    console.error("Reminder fetch error:", error.message);
    return;
  }

  for (const q of quotes) {
    try {
      // ❌ Skip very old requests (avoid spam)
      const created = new Date(q.created_at);
      const now = new Date();
      const diffHours = (now - created) / (1000 * 60 * 60);

      if (diffHours > 48) continue;

      const message = `🔔 Reminder:\nFollow up on quote request #${q.id}`;

      await sendTelegramMessage(q.telegram_chat_id, message);

      await auditLog('reminder_sent', {
        quote_request_id: q.id,
        chat_id: q.telegram_chat_id
      });

    } catch (err) {
      console.error("Reminder failed:", err.message);

      await auditLog('reminder_failed', {
        quote_request_id: q.id,
        error: err.message
      });
    }
  }
}