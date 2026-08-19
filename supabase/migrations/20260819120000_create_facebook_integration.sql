create table public.facebook_integrations (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null unique references public.seller_profiles(id) on delete cascade,
  page_id text not null unique,
  page_name text,
  encrypted_page_access_token text not null,
  status text not null default 'connected' check (status in ('connected', 'disconnected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.facebook_messages (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid not null references public.facebook_integrations(id) on delete cascade,
  external_message_id text not null unique,
  source text not null check (source in ('comment', 'messenger')),
  sender_name text,
  sender_profile_url text,
  message_text text not null,
  post_id text,
  intent_detected boolean not null default false,
  order_id uuid references public.orders(id) on delete set null,
  raw_payload jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now()
);

create index facebook_messages_integration_received_idx
  on public.facebook_messages (integration_id, received_at desc);

alter table public.facebook_integrations enable row level security;
alter table public.facebook_messages enable row level security;

create policy seller_manage_facebook_integration
on public.facebook_integrations for all to authenticated
using (seller_id in (select id from public.seller_profiles where owner_user_id = (select auth.uid())))
with check (seller_id in (select id from public.seller_profiles where owner_user_id = (select auth.uid())));

create policy seller_read_facebook_messages
on public.facebook_messages for select to authenticated
using (integration_id in (
  select facebook_integrations.id from public.facebook_integrations
  join public.seller_profiles on seller_profiles.id = facebook_integrations.seller_id
  where seller_profiles.owner_user_id = (select auth.uid())
));
