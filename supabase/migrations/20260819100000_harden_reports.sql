alter table public.reports add column if not exists reporter_phone text;
alter table public.reports add column if not exists reporter_ip text;
create index if not exists idx_reports_created_reporter on public.reports(reporter_id, created_at);
create index if not exists idx_reports_created_seller on public.reports(seller_id, created_at);
