create table public.users (
  id uuid primary key default gen_random_uuid(),
  phone text unique,
  email text unique,
  role text not null default 'buyer' check (role in ('buyer', 'seller', 'admin')),
  status text not null default 'active' check (status in ('active', 'suspended', 'deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_contact_required check (phone is not null or email is not null)
);

create table public.seller_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.users(id) on delete cascade,
  business_name text not null,
  business_name_lao text,
  description text,
  province text,
  district text,
  logo_url text,
  phone text,
  verification_status text not null default 'unverified' check (
    verification_status in (
      'unverified',
      'pending',
      'verified',
      'rejected',
      'suspended',
      'additional_info_required'
    )
  ),
  etrust_id text,
  facebook_url text,
  tiktok_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.seller_identifiers (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.seller_profiles(id) on delete cascade,
  type text not null check (
    type in ('phone', 'social_account', 'business_registration', 'e_trust', 'payment_identity')
  ),
  value text not null,
  verification_status text not null default 'unverified' check (
    verification_status in ('unverified', 'pending', 'verified', 'rejected')
  ),
  created_at timestamptz not null default now()
);

create table public.seller_verifications (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.seller_profiles(id) on delete cascade,
  verification_type text not null,
  submitted_data jsonb,
  document_paths text[],
  status text not null default 'pending' check (
    status in ('pending', 'approved', 'rejected', 'additional_info_required')
  ),
  reviewed_by uuid references public.users(id) on delete set null,
  reviewer_notes text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.trust_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  seller_id uuid references public.seller_profiles(id) on delete set null,
  query_type text not null check (
    query_type in ('shop_name', 'phone', 'seller_id', 'profile_link', 'facebook_url')
  ),
  query_value text not null,
  result jsonb,
  created_at timestamptz not null default now()
);

create table public.risk_signals (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.seller_profiles(id) on delete cascade,
  signal_type text not null,
  severity text not null check (severity in ('positive', 'warning', 'critical')),
  source_type text not null check (source_type in ('system', 'report', 'admin', 'verification')),
  evidence_id uuid,
  is_active boolean not null default true,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid references public.users(id) on delete set null,
  -- restrict: seller_profiles rows with transactional history (orders,
  -- reviews, reports, cod_settlements, subscriptions) must not be
  -- hard-deletable out from under that history; use seller status changes
  -- instead. Sub-resources owned entirely by the seller (identifiers,
  -- verifications, risk_signals, products, customers) cascade instead.
  seller_id uuid not null references public.seller_profiles(id) on delete restrict,
  product_snapshot jsonb not null,
  amount numeric(12, 2) not null check (amount >= 0),
  delivery_fee numeric(12, 2) not null default 0 check (delivery_fee >= 0),
  terms jsonb,
  payment_method text check (payment_method in ('cod', 'bank_transfer', 'qr', 'other')),
  buyer_confirmed_at timestamptz,
  seller_confirmed_at timestamptz,
  status text not null default 'draft' check (
    status in ('draft', 'confirmed', 'packed', 'shipped', 'delivered', 'settled', 'returned', 'disputed')
  ),
  tracking_number text,
  courier text,
  delivery_address jsonb,
  safe_order_url text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_evidence (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  uploaded_by uuid references public.users(id) on delete set null,
  type text not null check (
    type in ('payment_receipt', 'screenshot', 'delivery_photo', 'invoice', 'document', 'other')
  ),
  storage_path text not null,
  file_hash text not null,
  file_size_bytes integer check (file_size_bytes is null or file_size_bytes >= 0),
  mime_type text,
  created_at timestamptz not null default now()
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete set null,
  buyer_id uuid not null references public.users(id),
  -- restrict: see the seller_id comment on public.orders above.
  seller_id uuid not null references public.seller_profiles(id) on delete restrict,
  rating_overall integer check (rating_overall between 1 and 5),
  rating_description integer check (rating_description between 1 and 5),
  rating_delivery integer check (rating_delivery between 1 and 5),
  rating_communication integer check (rating_communication between 1 and 5),
  review_text text,
  photo_urls text[],
  verified_transaction boolean not null default false,
  status text not null default 'active' check (status in ('active', 'hidden', 'deleted')),
  created_at timestamptz not null default now()
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.users(id),
  -- restrict: see the seller_id comment on public.orders above.
  seller_id uuid not null references public.seller_profiles(id) on delete restrict,
  order_id uuid references public.orders(id) on delete set null,
  report_type text not null check (
    report_type in (
      'product_not_received',
      'wrong_product',
      'misleading_description',
      'suspected_fake_seller',
      'payment_issue',
      'seller_impersonation',
      'suspicious_advertisement',
      'other'
    )
  ),
  description text not null,
  evidence_paths text[],
  status text not null default 'pending' check (
    status in ('pending', 'under_review', 'resolved', 'dismissed')
  ),
  ai_classification jsonb,
  created_at timestamptz not null default now()
);

create table public.disputes (
  id uuid primary key default gen_random_uuid(),
  -- restrict (not cascade/set null): a dispute is the compliance record of
  -- last resort and must block order deletion outright, unlike the
  -- cascade-deleted order_evidence/courier_labels artifacts or the
  -- set-null'd reviews/reports that are meant to outlive the order.
  order_id uuid not null references public.orders(id) on delete restrict,
  opened_by uuid references public.users(id) on delete set null,
  status text not null default 'open' check (status in ('open', 'under_review', 'resolved', 'escalated')),
  summary text,
  resolution text,
  resolved_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.seller_profiles(id) on delete cascade,
  name text not null,
  name_lao text,
  photo_url text,
  price numeric(12, 2) not null check (price >= 0),
  cost numeric(12, 2) check (cost is null or cost >= 0),
  stock_count integer not null default 0 check (stock_count >= 0),
  sku text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.seller_profiles(id) on delete cascade,
  phone text not null,
  name text,
  province text,
  district text,
  village_landmark text,
  gps_lat numeric(10, 8) check (gps_lat is null or gps_lat between -90 and 90),
  gps_lng numeric(11, 8) check (gps_lng is null or gps_lng between -180 and 180),
  order_count integer not null default 0 check (order_count >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (seller_id, phone)
);

create table public.courier_labels (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  courier text not null,
  tracking_number text,
  label_pdf_path text,
  status text not null default 'pending' check (status in ('pending', 'printed', 'dispatched')),
  courier_response jsonb,
  created_at timestamptz not null default now()
);

create table public.cod_settlements (
  id uuid primary key default gen_random_uuid(),
  -- restrict: see the seller_id comment on public.orders above.
  seller_id uuid not null references public.seller_profiles(id) on delete restrict,
  courier text not null,
  file_path text,
  import_status text not null default 'pending' check (
    import_status in ('pending', 'processing', 'completed', 'error')
  ),
  matched_count integer not null default 0 check (matched_count >= 0),
  unmatched_count integer not null default 0 check (unmatched_count >= 0),
  imported_at timestamptz not null default now()
);

create table public.cod_settlement_lines (
  id uuid primary key default gen_random_uuid(),
  settlement_id uuid not null references public.cod_settlements(id) on delete cascade,
  tracking_number text not null,
  order_id uuid references public.orders(id) on delete set null,
  amount numeric(12, 2) check (amount is null or amount >= 0),
  matched boolean not null default false,
  discrepancy numeric(12, 2),
  status text not null default 'pending' check (status in ('pending', 'matched', 'unmatched', 'discrepancy'))
);

create table public.sync_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id),
  operation text not null check (operation in ('create', 'update', 'delete')),
  entity_type text not null,
  entity_id uuid,
  payload jsonb not null,
  synced_at timestamptz,
  attempts integer not null default 0 check (attempts >= 0),
  last_error text,
  created_at timestamptz not null default now()
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  -- restrict: see the seller_id comment on public.orders above.
  seller_id uuid not null references public.seller_profiles(id) on delete restrict,
  plan text not null check (plan in ('free', 'standard', 'pro')),
  status text not null default 'active' check (status in ('active', 'cancelled', 'expired', 'trial')),
  started_at timestamptz not null default now(),
  expires_at timestamptz,
  payment_reference text,
  constraint subscriptions_expiry_after_start check (expires_at is null or expires_at >= started_at)
);

create table public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references public.users(id),
  entity_type text not null check (entity_type in ('seller', 'report', 'review', 'dispute', 'verification')),
  entity_id uuid not null,
  action text not null,
  reason text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.users(id) on delete set null,
  event text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

-- Required lookup and filtering indexes.
create index idx_seller_profiles_owner on public.seller_profiles(owner_user_id);
create index idx_seller_profiles_verification on public.seller_profiles(verification_status);
create index idx_orders_seller on public.orders(seller_id);
create index idx_orders_buyer on public.orders(buyer_id);
create index idx_orders_status on public.orders(status);
create index idx_orders_tracking on public.orders(tracking_number);
create index idx_customers_seller_phone on public.customers(seller_id, phone);
create index idx_products_seller on public.products(seller_id);
create index idx_reviews_seller on public.reviews(seller_id);
create index idx_reports_seller on public.reports(seller_id);
create index idx_audit_logs_actor on public.audit_logs(actor_id);
create index idx_audit_logs_entity on public.audit_logs(entity_type, entity_id);
create index idx_sync_queue_user on public.sync_queue(user_id, synced_at);

-- PostgreSQL does not automatically index the referencing side of foreign keys.
create index idx_seller_identifiers_seller on public.seller_identifiers(seller_id);
create index idx_seller_verifications_seller on public.seller_verifications(seller_id);
create index idx_seller_verifications_reviewer on public.seller_verifications(reviewed_by);
create index idx_trust_checks_user on public.trust_checks(user_id);
create index idx_trust_checks_seller on public.trust_checks(seller_id);
create index idx_risk_signals_seller on public.risk_signals(seller_id);
create index idx_order_evidence_order on public.order_evidence(order_id);
create index idx_order_evidence_uploader on public.order_evidence(uploaded_by);
create index idx_reviews_order on public.reviews(order_id);
create index idx_reviews_buyer on public.reviews(buyer_id);
create index idx_reports_reporter on public.reports(reporter_id);
create index idx_reports_order on public.reports(order_id);
create index idx_disputes_order on public.disputes(order_id);
create index idx_disputes_opened_by on public.disputes(opened_by);
create index idx_disputes_resolved_by on public.disputes(resolved_by);
create index idx_courier_labels_order on public.courier_labels(order_id);
create index idx_cod_settlements_seller on public.cod_settlements(seller_id);
create index idx_cod_settlement_lines_settlement on public.cod_settlement_lines(settlement_id);
create index idx_cod_settlement_lines_order on public.cod_settlement_lines(order_id);
create index idx_subscriptions_seller on public.subscriptions(seller_id);
create index idx_moderation_actions_admin on public.moderation_actions(admin_user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger users_set_updated_at
before update on public.users
for each row execute function public.set_updated_at();

create trigger seller_profiles_set_updated_at
before update on public.seller_profiles
for each row execute function public.set_updated_at();

create trigger orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

create trigger customers_set_updated_at
before update on public.customers
for each row execute function public.set_updated_at();

-- RLS is mandatory on every application table. Tables without an explicit
-- policy are default-deny for anon and authenticated clients.
alter table public.users enable row level security;
alter table public.seller_profiles enable row level security;
alter table public.seller_identifiers enable row level security;
alter table public.seller_verifications enable row level security;
alter table public.trust_checks enable row level security;
alter table public.risk_signals enable row level security;
alter table public.orders enable row level security;
alter table public.order_evidence enable row level security;
alter table public.reviews enable row level security;
alter table public.reports enable row level security;
alter table public.disputes enable row level security;
alter table public.products enable row level security;
alter table public.customers enable row level security;
alter table public.courier_labels enable row level security;
alter table public.cod_settlements enable row level security;
alter table public.cod_settlement_lines enable row level security;
alter table public.sync_queue enable row level security;
alter table public.subscriptions enable row level security;
alter table public.moderation_actions enable row level security;
alter table public.audit_logs enable row level security;

create policy seller_own_profile
on public.seller_profiles
for all
to authenticated
using (owner_user_id = (select auth.uid()))
with check (owner_user_id = (select auth.uid()));

create policy public_read_seller
on public.seller_profiles
for select
to anon, authenticated
using (verification_status <> 'suspended');

create policy seller_own_orders
on public.orders
for all
to authenticated
using (
  seller_id in (
    select seller_profiles.id
    from public.seller_profiles
    where seller_profiles.owner_user_id = (select auth.uid())
  )
)
with check (
  seller_id in (
    select seller_profiles.id
    from public.seller_profiles
    where seller_profiles.owner_user_id = (select auth.uid())
  )
);

create policy buyer_own_orders
on public.orders
for select
to authenticated
using (buyer_id = (select auth.uid()));
