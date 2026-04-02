# JIORP Telegram Quote Bot

This repository contains a production-shaped starter for the practical assessment.

## What it does
- Receives Telegram webhook updates
- Parses quote requests with Gemini when available
- Reads customer cards and products from Supabase
- Enforces product constraints in code
- Logs all actions to `bot_audit_log`
- Stores cross-conversation memory in Supabase
- Provides a reminder job scaffold for 9 AM follow-ups

## Setup
1. Create the Supabase tables using `sql/001_schema.sql`
2. Seed the data using `sql/002_seed.sql`
3. Copy `.env.example` to `.env`
4. Fill in the environment values
5. Install dependencies
6. Run the server
7. Set the Telegram webhook using `POST /admin/setup-webhook`

## Guardrail example
Input: `Quote WTZ-1800 for submerged pool`

Expected result: blocked, because `WTZ-1800` is above-waterline only.

## Notes
- Gemini is used only for parsing and summarization.
- All safety and eligibility logic stays in code.
- Reminder delivery is scaffolded through a separate script that can be scheduled.


## to run the system 
- npm run dev (to start the server)
- npx ngrok http 3000 (for temporary deployment)
- curl -X POST http://localhost:3000/admin/setup-webhook (for setting up the webhook)
