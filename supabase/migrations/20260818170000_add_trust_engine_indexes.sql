create index if not exists idx_seller_identifiers_trust_lookup
on public.seller_identifiers (seller_id, type, verification_status);

create index if not exists idx_seller_verifications_trust_lookup
on public.seller_verifications (seller_id, status, verification_type);

create index if not exists idx_orders_seller_disputed
on public.orders (seller_id)
where status = 'disputed';

create index if not exists idx_reviews_seller_verified_active
on public.reviews (seller_id, created_at desc)
where status = 'active' and verified_transaction = true;

create index if not exists idx_reports_seller_unresolved
on public.reports (seller_id)
where status in ('pending', 'under_review');

create index if not exists idx_audit_logs_seller_profile_changes
on public.audit_logs (entity_id, created_at desc)
where entity_type = 'seller_profile';
