create extension if not exists pg_trgm with schema extensions;

create index if not exists idx_seller_profiles_business_name_trgm
on public.seller_profiles using gin (business_name extensions.gin_trgm_ops)
where verification_status <> 'suspended';

create index if not exists idx_seller_profiles_business_name_lao_trgm
on public.seller_profiles using gin (business_name_lao extensions.gin_trgm_ops)
where verification_status <> 'suspended';

create index if not exists idx_seller_profiles_phone_public
on public.seller_profiles (phone)
where verification_status <> 'suspended';

create index if not exists idx_seller_profiles_etrust_public
on public.seller_profiles (etrust_id)
where verification_status <> 'suspended';

create index if not exists idx_orders_seller_verified
on public.orders (seller_id)
where status in ('delivered', 'settled');

create index if not exists idx_risk_signals_seller_active
on public.risk_signals (seller_id, severity)
where is_active = true and status = 'active';
