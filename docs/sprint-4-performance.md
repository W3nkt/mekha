# Sprint 4 performance audit

The web build now splits vendor, React Query, Dexie, and i18n dependencies into cacheable chunks and generates a Workbox service worker. Run `corepack pnpm --filter @mekha/web build` and inspect `dist/assets` plus `dist/sw.js`.

CI runs Lighthouse on every push using `lighthouse-budget.json` and `lighthouserc.json`. Record real Android 9/2GB Fast 3G results here before release:

| Metric | Target | Measured | Evidence |
| --- | ---: | ---: | --- |
| Cold start / interactive | <3s | ___ | ___ |
| Performance | ≥90 | ___ | ___ |
| Accessibility | ≥95 | ___ | ___ |
| PWA | 100 | ___ | ___ |
| Initial JS gzip | ≤200KB | ___ | `dist/assets` |
| Monthly sync volume | <5MB | ___ | Network export |

Phase 5 APK size is intentionally excluded from this Phase 4 audit.
