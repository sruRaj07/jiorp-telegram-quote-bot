import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

async function main() {
  const { data, error } = await supabase
    .from('quote_requests')
    .select('id, telegram_chat_id, telegram_user_id, raw_message, status, customer_card_id')
    .in('status', ['new', 'escalated'])
    .order('created_at', { ascending: true })
    .limit(50);

  if (error) throw error;

  for (const row of data || []) {
    await supabase.from('bot_audit_log').insert({
      event_type: 'reminder_due',
      telegram_chat_id: row.telegram_chat_id,
      telegram_user_id: row.telegram_user_id,
      customer_card_id: row.customer_card_id,
      quote_request_id: row.id,
      payload: { source: 'cron', message: row.raw_message, status: row.status }
    });
  }

  console.log(`Queued ${data?.length || 0} reminder events`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
