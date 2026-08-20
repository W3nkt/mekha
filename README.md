# Mekha

[![CI](https://github.com/W3nkt/mekha/actions/workflows/ci.yml/badge.svg)](https://github.com/W3nkt/mekha/actions/workflows/ci.yml)
[![Deploy Web](https://github.com/W3nkt/mekha/actions/workflows/deploy-web.yml/badge.svg)](https://github.com/W3nkt/mekha/actions/workflows/deploy-web.yml)
[![Deploy API](https://github.com/W3nkt/mekha/actions/workflows/deploy-api.yml/badge.svg)](https://github.com/W3nkt/mekha/actions/workflows/deploy-api.yml)
[![Database Migrations](https://github.com/W3nkt/mekha/actions/workflows/db-migrate.yml/badge.svg)](https://github.com/W3nkt/mekha/actions/workflows/db-migrate.yml)

Mekha is the internal monorepo for KhaiDee (seller OS) and LaoTrust (trust layer).

## Requirements

- Node.js 22 or newer
- pnpm 9 or newer (Corepack recommended)

## Local development

```sh
corepack enable
pnpm install
pnpm dev
```

The `dev` command starts the web, API, and admin placeholders concurrently. Replace each placeholder with its framework scaffold in the corresponding follow-up issue.

Copy `.env.example` to `.env.local` and fill in values for hosted integrations. Never commit the resulting file. This repository is linked to the hosted Mekha Supabase project in Singapore.

Values requiring repository-owner access are tracked in `.setup-inputs.example`. Copy it to `.setup-inputs.local`, fill it in, and add the corresponding values to GitHub Actions secrets. The local input file is ignored by Git.

The expected `main` branch policy is versioned in `.github/branch-protection.json` so repository protection can be audited and reapplied consistently.

## Commands

- `pnpm build` builds every workspace in dependency order.
- `pnpm test` runs workspace tests after dependency builds.
- `pnpm lint` runs workspace lint checks.
- `pnpm type-check` checks TypeScript across the monorepo.
- `pnpm format` formats TypeScript, Markdown, and JSON files.
- `pnpm db:push` applies pending migrations to the linked hosted project.
- `pnpm db:pull` captures hosted schema changes as a local migration.
- `pnpm db:types` regenerates shared database types from the linked project.
- `pnpm db:start`, `pnpm db:status`, and `pnpm db:reset` are optional local-stack commands that require Docker Desktop.
- `pnpm db:seed` idempotently loads all 18 Lao provinces and 148 districts. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` first.

Do not run destructive database commands against the hosted production project. Review migrations with `supabase db push --dry-run` before applying them.

## Structure

- `apps/web` — KhaiDee React PWA
- `apps/api` — Cloudflare Workers API
- `apps/admin` — administration dashboard
- `packages/types` — shared TypeScript contracts
- `packages/ui` — shared React components
- `packages/utils` — shared utilities
- `packages/typescript-config` — shared TypeScript configurations
- `supabase` — database migrations and seed data
