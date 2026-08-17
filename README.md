# Mekha

Mekha is the internal monorepo for KhaiDee (seller OS) and LaoTrust (trust layer).

## Requirements

- Node.js 20 or newer
- pnpm 9 or newer (Corepack recommended)

## Local development

```sh
corepack enable
pnpm install
pnpm dev
```

The `dev` command starts the web, API, and admin placeholders concurrently. Replace each placeholder with its framework scaffold in the corresponding follow-up issue.

Copy `.env.example` to `.env.local` and fill in values for local integrations. Never commit the resulting file.

## Commands

- `pnpm build` builds every workspace in dependency order.
- `pnpm test` runs workspace tests after dependency builds.
- `pnpm lint` runs workspace lint checks.
- `pnpm type-check` checks TypeScript across the monorepo.
- `pnpm format` formats TypeScript, Markdown, and JSON files.
- `pnpm db:start` starts the local Supabase stack (Docker Desktop required).
- `pnpm db:status` reports local Supabase service health.
- `pnpm db:reset` rebuilds the local database from migrations and seed data.
- `pnpm db:types` regenerates shared database types from the local database.

## Structure

- `apps/web` — KhaiDee React PWA
- `apps/api` — Cloudflare Workers API
- `apps/admin` — administration dashboard
- `packages/types` — shared TypeScript contracts
- `packages/ui` — shared React components
- `packages/utils` — shared utilities
- `packages/typescript-config` — shared TypeScript configurations
- `supabase` — database migrations and seed data
