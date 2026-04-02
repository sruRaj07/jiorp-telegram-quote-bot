# SPEC.md — JIORP Bot

## 1. Problem Definition

The system is a Telegram-based quote assistant that:
- parses customer quote requests
- matches products from a structured database
- enforces product usage constraints (guardrails)
- stores all interactions in Supabase
- maintains cross-conversation memory
- supports automated follow-ups

The system must ensure **correctness, safety, and traceability**.

---

## 2. Correctness Rules

A response is considered correct only if:

### Product Matching
- SKU must exist in the `products` table
- Matching must be deterministic (regex + DB lookup preferred over LLM)

### Customer Matching
- Customer must be matched from `customer_cards`
- If not matched → system must request clarification

### Guardrails (CRITICAL)
- Products marked `above_waterline_only = true` must NOT be used for submerged applications
- Example:
  - ❌ `WTZ-1800` for submerged pool → must be blocked

### Response Behavior
- Guardrails must be applied BEFORE generating a quote
- System must NOT generate unsafe quotes
- Missing information must trigger clarification

### Persistence
- Every request must be stored in:
  - `quote_requests`
  - `quote_items` (if product identified)
- Every action must be logged in `bot_audit_log`

---

## 3. Bot vs Human Boundary

### Bot Responsibilities
- parse incoming messages
- identify product and customer
- enforce guardrails
- generate draft quote responses
- store data and logs
- send reminders

### Human Responsibilities
- review escalated cases
- handle ambiguous or incomplete requests
- override system decisions if necessary
- finalize actual business quotes

---

## 4. Failure Modes

### 1. Incorrect Product Match
- Cause: LLM hallucination or parsing error
- Mitigation:
  - deterministic SKU extraction
  - DB validation

---

### 2. Unsafe Quote Generated
- Cause: guardrail not enforced
- Example:
  - quoting WTZ-1800 for submerged use
- Mitigation:
  - rule-based constraint engine
  - guardrails prioritized over all logic

---

### 3. Memory Misuse
- Cause: outdated or incorrect stored context
- Example:
  - wrong customer reused
- Mitigation:
  - prefer current message over memory
  - validate memory before use
  - guardrails override memory

---

## 5. Verification Method

The system is verified using test scenarios:

### Test 1 — Valid Quote
Input:
```text
Quote WE-100 for Pidilite India