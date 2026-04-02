# SPEC

## Goal
Build a Telegram quote assistant that identifies customer cards, parses quote requests, validates product constraints, stores every decision in Supabase, and escalates unsafe or ambiguous cases to a human.

## Correctness rules
1. Every Telegram update must be processed once only.
2. Every quote request must be logged in `bot_audit_log`.
3. Product constraints are enforced in code, not by the LLM.
4. `WTZ-1700` and `WTZ-1800` must never be quoted for submerged applications.
5. When customer or product matching is uncertain, the bot must ask for clarification or escalate.

## Bot vs human boundaries
Bot may:
- parse messages
- match known customers and SKUs
- create quote drafts
- write audit logs
- send reminders

Human must:
- approve blocked or ambiguous quotes
- resolve customer mismatches
- override policy exceptions

## Failure modes
1. Wrong customer matched.
2. Wrong product matched.
3. Unsafe product accepted for a forbidden use case.

## Verification method
- Seed data check
- Guardrail case: `Quote WTZ-1800 for submerged pool`
- Memory persistence across separate chats
- Duplicate update dedupe
- Reminder logging test
