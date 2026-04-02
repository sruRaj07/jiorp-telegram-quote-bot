const botToken = process.env.TELEGRAM_BOT_TOKEN;

if (!botToken) {
  throw new Error('Missing TELEGRAM_BOT_TOKEN');
}

const apiBase = `https://api.telegram.org/bot${botToken}`;

export async function sendTelegramMessage(chatId, text, replyToMessageId = null) {
  const body = { chat_id: chatId, text, disable_web_page_preview: true };
  if (replyToMessageId) body.reply_to_message_id = replyToMessageId;

  const res = await fetch(`${apiBase}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Telegram sendMessage failed: ${res.status} ${err}`);
  }

  return res.json();
}

export async function setTelegramWebhook(webhookUrl, secretToken) {
  const res = await fetch(`${apiBase}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: webhookUrl, secret_token: secretToken })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Telegram setWebhook failed: ${res.status} ${err}`);
  }

  return res.json();
}
