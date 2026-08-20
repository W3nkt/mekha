# Mekha (ແມ່ຄ້າ) / LaoTrust

Seller trust and lightweight commerce OS for Lao social-commerce sellers. Cloudflare Workers/Hono API in `apps/api`, React PWA in `apps/web`, Supabase/Postgres in `supabase/migrations`, shared Zod types in `packages/types`, Turborepo + pnpm monorepo.

## PR workflow

Work is tracked as GitHub issues (`gh issue list`), one per sprint task, numbered `[S<sprint>-<n>]`. Standard flow:

1. Implement on a feature branch.
2. **Before opening (or merging) the PR, run the `code-reviewer` subagent** (`.claude/agents/code-reviewer.md`) against the branch's diff. This is a standing policy, not something to wait to be asked for — treat "implementation of an issue is done" as the trigger. Address any CONFIRMED findings before proceeding.
3. Open the PR with `Closes #<n>` (one keyword per issue, even when a PR bundles multiple issues) so GitHub auto-closes the issue on merge — several issues have been left open in the past because this was missed.
4. Merge once CI is green.

## Known gotcha: migration timestamp ordering

`.github/workflows/db-migrate.yml` runs `supabase db push --linked --yes`, which hard-fails (applying nothing) if any migration already applied to production has a later timestamp than an unapplied local one. This has broken the deploy pipeline for multiple consecutive merges before (parallel branches each minting a migration timestamp near "now", merged out of order). Before starting new work, check `gh run list --limit 20` for a red `Deploy Database Migrations` row — if present, read the pending migration files, confirm they're non-conflicting with what's already on remote, and apply with `supabase db push --linked --include-all --yes`.

## Local environment note

`pnpm` is not on PATH in this dev environment (neither Git Bash nor PowerShell) — don't assume `pnpm` commands can run. `node_modules` is already installed, though: each workspace's own `tsc --noEmit` and `apps/web`'s `vite build` run fine invoked directly via `../../node_modules/.bin/{tsc,vite}` from that workspace's directory (`lint` and `type-check` are both literally `tsc --noEmit` in every package here), which catches the same errors CI's `type-check`/`lint`/`build` steps would. `vitest` has no local binary, so `test` still needs CI.
