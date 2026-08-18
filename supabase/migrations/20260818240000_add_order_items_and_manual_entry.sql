-- Manual order entry (S2-02) creates orders with one or more line items,
-- a per-seller human-readable friendly ID, and a walk-in customer that may
-- not have a platform user account. Nothing has written to product_snapshot
-- yet (order creation didn't exist before this migration), so this is a
-- clean structural swap rather than an additive change.
alter table public.orders
  drop column product_snapshot;

alter table public.orders
  add column customer_id uuid references public.customers(id) on delete set null,
  add column friendly_id text not null,
  add column note text;

create unique index idx_orders_seller_friendly_id
  on public.orders(seller_id, friendly_id);
create index idx_orders_customer on public.orders(customer_id);

alter table public.seller_profiles
  add column order_counter integer not null default 0 check (order_counter >= 0);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0),
  line_total numeric(12, 2) not null check (line_total >= 0),
  created_at timestamptz not null default now()
);
create index idx_order_items_order on public.order_items(order_id);
create index idx_order_items_product on public.order_items(product_id);

alter table public.order_items enable row level security;

-- Atomic per-seller order counter, used to generate friendly IDs
-- (ORD-0001, ORD-0002, ...) without a race between concurrent orders.
create or replace function public.next_seller_order_number(p_seller_id uuid)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  next_number integer;
begin
  update public.seller_profiles
  set order_counter = order_counter + 1
  where id = p_seller_id
  returning order_counter into next_number;
  return next_number;
end;
$$;
