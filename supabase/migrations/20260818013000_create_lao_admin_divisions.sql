create table public.lao_provinces (
  id text primary key,
  name_en text not null,
  name_lo text not null,
  sort_order integer not null default 0 check (sort_order >= 0)
);

create table public.lao_districts (
  id text primary key,
  province_id text not null references public.lao_provinces(id) on update cascade on delete restrict,
  name_en text not null,
  name_lo text not null,
  sort_order integer not null default 0 check (sort_order >= 0)
);

create index idx_lao_districts_province_sort
  on public.lao_districts (province_id, sort_order);

alter table public.lao_provinces enable row level security;
alter table public.lao_districts enable row level security;

create policy lao_provinces_public_read
  on public.lao_provinces for select
  to anon, authenticated
  using (true);

create policy lao_districts_public_read
  on public.lao_districts for select
  to anon, authenticated
  using (true);

grant select on public.lao_provinces, public.lao_districts to anon, authenticated;
