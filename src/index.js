import 'dotenv/config';
import express from 'express';
import { supabase } from './lib/supabase.js';
import { sendTelegramMessage, setTelegramWebhook } from './lib/telegram.js';
import { parseRequestWithGemini } from './lib/gemini.js';
import { evaluateProductConstraint, detectUseCase } from './lib/rules.js';
import { auditLog } from './lib/logger.js';
import { runDailyReminders } from './lib/reminder.js';

const app = express();
app.use(express.json({ limit: '1mb' }));

const PORT = Number(process.env.PORT || 3000);
const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET || 'change-me';
const publicBaseUrl = process.env.PUBLIC_BASE_URL;

function normalize(s) {
  return String(s || '').trim().toLowerCase();
}

async function alreadyProcessed(updateId) {
  const { data, error } = await supabase
    .from('processed_updates')
    .select('id')
    .eq('telegram_update_id', updateId)
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

async function markProcessed(updateId) {
  const { error } = await supabase
    .from('processed_updates')
    .insert({ telegram_update_id: updateId });

  if (error && !String(error.message).includes('duplicate key')) {
    throw error;
  }
}

async function findCustomerCard(messageText) {
  const text = normalize(messageText);

  const { data, error } = await supabase
    .from('customer_cards')
    .select('*')
    .eq('active', true);

  if (error) throw error;

  const rows = data || [];

  for (const row of rows) {
    const customerName = normalize(row.customer_name);
    if (customerName && text.includes(customerName)) {
      return row;
    }
  }

  for (const row of rows) {
    const customerName = normalize(row.customer_name);
    const tokens = customerName.split(/\s+/).filter(Boolean);

    if (tokens.length && tokens.some((token) => text.includes(token))) {
      return row;
    }
  }

  for (const row of rows) {
    const market = normalize(row.market);
    if (market && text.includes(market)) {
      return row;
    }
  }

  return null;
}

async function findCustomerById(customerId) {
  if (!customerId) return null;

  const { data, error } = await supabase
    .from('customer_cards')
    .select('*')
    .eq('id', customerId)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

async function findLastCustomerForChat(chatId) {
  const { data, error } = await supabase
    .from('quote_requests')
    .select('customer_card_id')
    .eq('telegram_chat_id', chatId)
    .not('customer_card_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  if (!data?.customer_card_id) return null;
  return findCustomerById(data.customer_card_id);
}

async function findProduct(sku) {
  if (!sku) return null;

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('sku', sku)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

async function upsertMemory(customerCardId, key, value, messageId) {
  if (!customerCardId) return;

  const { error } = await supabase.from('conversation_memory').upsert(
    {
      customer_card_id: customerCardId,
      memory_key: key,
      memory_value: value,
      source_message_id: messageId,
      last_seen_at: new Date().toISOString()
    },
    { onConflict: 'customer_card_id,memory_key' }
  );

  if (error) {
    console.error('memory upsert failed', error.message);
  }
}

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

// for the reminders
app.get('/admin/run-reminders', async (req, res) => {
  try {
    await runDailyReminders();
    res.json({ ok: true, message: "Reminders sent" });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/webhook', async (req, res) => {
  try {
    const secret = req.header('x-telegram-bot-api-secret-token');
    if (secret !== webhookSecret) {
      return res.status(401).json({ ok: false, error: 'invalid secret' });
    }

    const update = req.body;
    const updateId = update?.update_id;

    if (!updateId) {
      return res.json({ ok: true, ignored: true });
    }

    if (await alreadyProcessed(updateId)) {
      return res.json({ ok: true, duplicate: true });
    }

    await markProcessed(updateId);
    await auditLog('webhook_received', { update });

    const message = update.message || update.edited_message;
    if (!message?.text) {
      return res.json({ ok: true, ignored: true });
    }

    const chatId = message.chat.id;
    const userId = message.from?.id || null;
    const text = message.text.trim();

    // Step 1: deterministic SKU extraction
    const skuMatch = text.match(/WTZ-\d+|WE-\d+|Z-\d+|INSUROPE-\d+/i);
    const sku = skuMatch ? skuMatch[0].toUpperCase() : null;

    // Step 2: Gemini parsing
    let aiParsed = {};
    try {
      aiParsed = await parseRequestWithGemini(text);
    } catch (err) {
      console.error('gemini parse failed:', err.message);
      aiParsed = {};
    }

    const parsed = {
      sku: sku || aiParsed.sku || null,
      use_case: aiParsed.use_case || null,
      confidence: typeof aiParsed.confidence === 'number' ? aiParsed.confidence : 0.6
    };

    if (parsed.sku) {
      parsed.confidence = Math.max(parsed.confidence, 0.9);
    }

    // Step 3: customer lookup from text
    let customer = await findCustomerCard(text);
    let usedMemoryCustomer = false;

    // Step 4: memory fallback if customer not found in current message
    if (!customer) {
      const memoryCustomer = await findLastCustomerForChat(chatId);
      if (memoryCustomer) {
        customer = memoryCustomer;
        usedMemoryCustomer = true;
      }
    }

    // Step 5: product and use-case lookup
    const product = await findProduct(parsed.sku);
    const useCase = parsed.use_case || detectUseCase(text);
    const constraint = evaluateProductConstraint(product, useCase);

    // Step 6: store quote request
    const { data: quote, error: quoteError } = await supabase
      .from('quote_requests')
      .insert({
        telegram_chat_id: chatId,
        telegram_user_id: userId,
        customer_card_id: customer?.id || null,
        raw_message: text,
        parsed_intent: parsed,
        status: constraint.allowed ? 'quoted' : 'blocked',
        confidence: parsed.confidence
      })
      .select('*')
      .single();

    if (quoteError) throw quoteError;

    // Step 7: store memory
    if (customer?.id) {
      await upsertMemory(customer.id, 'last_customer', customer.customer_name, message.message_id);
      await upsertMemory(customer.id, 'last_use_case', useCase || 'unknown', message.message_id);
    }

    // Step 8: store quote item if product exists
    if (product && quote) {
      const { error: itemError } = await supabase.from('quote_items').insert({
        quote_request_id: quote.id,
        product_id: product.id,
        requested_quantity: parsed.quantity ?? null,
        requested_use_case: useCase || null,
        constraint_result: constraint.code,
        reason: constraint.reason
      });

      if (itemError) throw itemError;
    }

    // Step 9: response priority
    let reply;

    if (!product) {
      reply = '⚠️ Invalid or missing product SKU.';
    } else if (!constraint.allowed) {
      reply = `❌ Cannot proceed: ${constraint.reason}`;
    } else if (!customer) {
      reply = '⚠️ Please specify a valid customer.';
    } else if (usedMemoryCustomer) {
      reply = `Using previous context (${customer.customer_name})\n✅ Quote ready for ${product.sku} for ${customer.customer_name}`;
    } else {
      reply = `✅ Quote ready for ${product.sku} for ${customer.customer_name}`;
    }
    
    await sendTelegramMessage(chatId, reply, message.message_id);
    console.log("WEBHOOK HIT:", JSON.stringify(req.body, null, 2));

    await auditLog('response_sent', {
      chatId,
      userId,
      customer: customer?.customer_name || null,
      product: product?.sku || null,
      reply,
      usedMemoryCustomer
    });

    return res.json({ ok: true });
  } catch (error) {
    console.error('🔥 ERROR:', error.message);
    await auditLog('webhook_error', { error: error.message, raw_update: req.body });
    return res.json({ ok: true });
  }
});

app.post('/admin/setup-webhook', async (_req, res) => {
  try {
    if (!publicBaseUrl) {
      return res.status(400).json({ ok: false, error: 'PUBLIC_BASE_URL missing' });
    }

    const webhookUrl = `${publicBaseUrl.replace(/\/$/, '')}/webhook`;
    const result = await setTelegramWebhook(webhookUrl, webhookSecret);

    res.json({ ok: true, result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});