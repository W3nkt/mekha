alter table public.products
  drop column photo_url;

alter table public.products
  add column photo_urls text[] not null default '{}';

alter table public.products
  add constraint products_photo_urls_max_three check (
    array_length(photo_urls, 1) is null or array_length(photo_urls, 1) <= 3
  );

-- Public bucket: product photos are shown in order entry and (eventually)
-- public storefronts, so unlike verification-docs/order-evidence they don't
-- need signed read URLs. Uploads still go through a Worker-issued signed
-- upload URL scoped to the seller's own folder, so no storage.objects
-- policy is needed for writes either.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-photos',
  'product-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
