# JIORP Bot

A Telegram-based quote assistant for product lookup, quote drafting, guardrail enforcement, cross-conversation memory, and automated follow-ups.

The bot uses:

- **Telegram Bot API** for user interaction
- **Supabase** for database, persistence, and audit logging
- **Gemini API** for structured message parsing
- **Rule-based guardrails** for product eligibility checks
- **Render** for free deployment
- **GitHub Actions** for free scheduled reminders

---

## What this project does

The bot accepts quote requests from Telegram, identifies the customer and product, checks whether the product is allowed for the requested use case, stores the interaction in Supabase, and responds with either:

- a quote-ready response,
- a clarification request,
- or a blocked message when a rule is violated.

It also stores conversation memory so follow-up requests can reuse recent context.

---

## Core features

### 1. Quote parsing
The bot extracts:
- customer name
- SKU
- use case
- confidence score

### 2. Guardrail enforcement
The bot blocks unsafe or invalid requests.

Example:

**Input**
```text
Quote WTZ-1800 for submerged pool

**Output**
❌ Cannot proceed: WTZ-1800 is above-waterline only and cannot be used for submerged applications.