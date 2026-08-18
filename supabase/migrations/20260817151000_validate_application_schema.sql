do $$
declare
  application_tables constant text[] := array[
    'users',
    'seller_profiles',
    'seller_identifiers',
    'seller_verifications',
    'trust_checks',
    'risk_signals',
    'orders',
    'order_evidence',
    'reviews',
    'reports',
    'disputes',
    'products',
    'customers',
    'courier_labels',
    'cod_settlements',
    'cod_settlement_lines',
    'sync_queue',
    'subscriptions',
    'moderation_actions',
    'audit_logs'
  ];
  required_indexes constant text[] := array[
    'idx_seller_profiles_owner',
    'idx_seller_profiles_verification',
    'idx_orders_seller',
    'idx_orders_buyer',
    'idx_orders_status',
    'idx_orders_tracking',
    'idx_customers_seller_phone',
    'idx_products_seller',
    'idx_reviews_seller',
    'idx_reports_seller',
    'idx_audit_logs_actor',
    'idx_audit_logs_entity',
    'idx_sync_queue_user'
  ];
  missing_count integer;
begin
  select count(*)
  into missing_count
  from unnest(application_tables) as expected(table_name)
  where to_regclass(format('public.%I', expected.table_name)) is null;

  if missing_count > 0 then
    raise exception '% application tables are missing', missing_count;
  end if;

  select count(*)
  into missing_count
  from pg_class as table_class
  join pg_namespace as table_namespace on table_namespace.oid = table_class.relnamespace
  where table_namespace.nspname = 'public'
    and table_class.relname = any(application_tables)
    and not table_class.relrowsecurity;

  if missing_count > 0 then
    raise exception '% application tables do not have RLS enabled', missing_count;
  end if;

  select count(*)
  into missing_count
  from unnest(required_indexes) as expected(index_name)
  where to_regclass(format('public.%I', expected.index_name)) is null;

  if missing_count > 0 then
    raise exception '% required indexes are missing', missing_count;
  end if;

  -- A supporting index must carry the FK's columns as its leading columns,
  -- in the same order (array containment alone would accept a composite
  -- index whose matching columns aren't leftmost, which Postgres can't
  -- actually use to satisfy the FK's lookups).
  select count(*)
  into missing_count
  from pg_constraint as foreign_key
  where foreign_key.contype = 'f'
    and foreign_key.connamespace = 'public'::regnamespace
    and not exists (
      select 1
      from pg_index as supporting_index
      where supporting_index.indrelid = foreign_key.conrelid
        and cardinality(supporting_index.indkey::smallint[]) >= cardinality(foreign_key.conkey)
        and (
          select bool_and(fk_col.value = idx_col.value)
          from unnest(foreign_key.conkey) with ordinality as fk_col(value, ord)
          join unnest(supporting_index.indkey::smallint[]) with ordinality as idx_col(value, ord)
            on idx_col.ord = fk_col.ord
        )
    );

  if missing_count > 0 then
    raise exception '% foreign keys do not have supporting indexes', missing_count;
  end if;
end;
$$;
