# Row-level security standard

Every application table migration must include the following baseline before adding narrowly scoped policies:

```sql
-- RLS is MANDATORY on every table. Default: deny all.
-- Sellers: own data only via (auth.uid() = owner_user_id)
-- Buyers: own orders only.
-- Admins: via service_role key server-side (bypasses RLS).
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
```

Do not grant anonymous or authenticated access without an explicit policy. The service-role key is server-only and must be stored as a Cloudflare Worker secret.
