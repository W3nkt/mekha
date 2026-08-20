create index if not exists idx_seller_profiles_phone_trgm
on public.seller_profiles using gin (phone extensions.gin_trgm_ops)
where verification_status <> 'suspended';
