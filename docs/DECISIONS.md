# Architecture decisions

## ADR-001: Supabase production region

- Status: Accepted
- Date: 2026-08-17
- Decision: Host `mekha-production` in Singapore (`ap-southeast-1`).

Singapore is the nearest supported Supabase region to Laos and keeps platform data in Southeast Asia. This reduces latency for Lao users and satisfies the KhaiDee PRD N-09 data-residency requirement.

The production project must not be created in another region. Changing regions requires creating a new Supabase project and migrating the data.

Development currently uses the linked hosted project. Docker-based local Supabase remains optional. All hosted migrations must be reviewed with a dry run before they are applied, and production data must never be reset from development tooling.

## ADR-002: Phone-only authentication

- Status: Accepted
- Date: 2026-08-17
- Decision: Sellers authenticate with a six-digit phone OTP; email signup is disabled.

Production SMS is delivered through Twilio to E.164-formatted Lao numbers (`+856…`). User-entered `0…` numbers must be normalized to `+856…` by the application before calling Supabase Auth. Twilio credentials are configured in Supabase and must never be committed.

## ADR-003: Default-deny data and file access

- Status: Accepted
- Date: 2026-08-17
- Decision: Every application table uses RLS and every storage bucket is private.

The Cloudflare Worker is the only component permitted to use the service-role key. Private files are exposed to clients only through short-lived signed URLs.
