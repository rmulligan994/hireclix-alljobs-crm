-- AI email feature usage (metering). Written by Next.js API with service role only.
create table if not exists public.email_ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  mode text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_email_ai_usage_user_month on public.email_ai_usage (user_id, created_at desc);

alter table public.email_ai_usage enable row level security;
