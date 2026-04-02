import { supabase } from './supabase.js';

export async function auditLog(eventType, payload = {}) {
  const row = {
    event_type: eventType,
    telegram_chat_id: payload.telegram_chat_id ?? null,
    telegram_user_id: payload.telegram_user_id ?? null,
    customer_card_id: payload.customer_card_id ?? null,
    quote_request_id: payload.quote_request_id ?? null,
    payload
  };

  const { error } = await supabase.from('bot_audit_log').insert(row);
  if (error) {
    console.error('auditLog failed', error.message);
  }
}
