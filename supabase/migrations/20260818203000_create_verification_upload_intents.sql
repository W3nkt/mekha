create table public.verification_upload_intents (
  path text primary key,
  seller_id uuid not null references public.seller_profiles(id) on delete cascade,
  verification_type text not null check (verification_type in ('identity', 'business_registration', 'e_trust', 'social_account', 'payment_identity')),
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'application/pdf')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index verification_upload_intents_expiry_idx on public.verification_upload_intents (expires_at);
alter table public.verification_upload_intents enable row level security;
revoke all on public.verification_upload_intents from anon, authenticated;
