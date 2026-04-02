const apiKey = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

function fallbackParse(text) {
  const skuMatch = text.match(/\b([A-Z]{2,5}-\d{2,5}(?:-\d{1,3})?)\b/);
  const useCase = /submerged/i.test(text)
    ? 'submerged'
    : /above[- ]?waterline/i.test(text)
      ? 'above_waterline'
      : null;
  return {
    intent: /quote|price|pricing/i.test(text) ? 'quote_request' : 'unknown',
    customer_hint: null,
    sku: skuMatch?.[1] || null,
    use_case: useCase,
    quantity: null,
    confidence: 0.5,
    raw_summary: text.slice(0, 240)
  };
}

export async function parseRequestWithGemini(text) {
  if (!apiKey) return fallbackParse(text);

  const prompt = `Extract the quote request into strict JSON with keys: intent, customer_hint, sku, use_case, quantity, confidence, raw_summary.\n\nRules:\n- intent must be quote_request or unknown\n- sku should be product code if present\n- use_case should be a short label like submerged, above_waterline, unknown\n- confidence is 0 to 1\n- return JSON only\n\nMessage: ${text}`;

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json'
        }
      })
    });

    if (!res.ok) {
      return fallbackParse(text);
    }

    const data = await res.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const parsed = JSON.parse(raw);
    return {
      intent: parsed.intent || 'unknown',
      customer_hint: parsed.customer_hint || null,
      sku: parsed.sku || null,
      use_case: parsed.use_case || null,
      quantity: parsed.quantity ?? null,
      confidence: parsed.confidence || 0.6,
      raw_summary: parsed.raw_summary || text.slice(0, 240)
    };
  } catch {
    return fallbackParse(text);
  }
}
