create extension if not exists pgcrypto;

create table if not exists customer_cards (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  region text,
  market text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  product_name text,
  constraint_text text,
  above_waterline_only boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists quote_requests (
  id uuid primary key default gen_random_uuid(),
  telegram_chat_id bigint not null,
  telegram_user_id bigint,
  customer_card_id uuid references customer_cards(id),
  raw_message text not null,
  parsed_intent jsonb,
  status text not null default 'new',
  confidence numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_request_id uuid not null references quote_requests(id) on delete cascade,
  product_id uuid not null references products(id),
  requested_quantity integer,
  requested_use_case text,
  constraint_result text,
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists conversation_memory (
  id uuid primary key default gen_random_uuid(),
  customer_card_id uuid not null references customer_cards(id) on delete cascade,
  memory_key text not null,
  memory_value text not null,
  source_message_id bigint,
  last_seen_at timestamptz not null default now(),
  expiry_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (customer_card_id, memory_key)
);

create table if not exists bot_audit_log (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  telegram_chat_id bigint,
  telegram_user_id bigint,
  customer_card_id uuid references customer_cards(id),
  quote_request_id uuid references quote_requests(id),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists processed_updates (
  id uuid primary key default gen_random_uuid(),
  telegram_update_id bigint not null unique,
  processed_at timestamptz not null default now()
);

create index if not exists idx_quote_requests_customer on quote_requests(customer_card_id);
create index if not exists idx_quote_requests_status on quote_requests(status);
create index if not exists idx_audit_created_at on bot_audit_log(created_at desc);
