# Sprint 4 end-to-end UAT sign-off

Automated smoke checks:

```sh
SMOKE_WEB_URL=http://127.0.0.1:4173 SMOKE_API_URL=https://mekha-api.wen-kt2020.workers.dev node scripts/sprint4-smoke.mjs
corepack pnpm exec playwright test
```

The following scenarios require a deployed staging build and physical devices. Record screenshots, timings, tester, and date in `docs/SESSION-LOG.md`; CI cannot prove real-device rendering, install UX, or push delivery.

| # | Scenario | Pass/Fail | Tester/date | Evidence |
| --- | --- | --- | --- | --- |
| 1 | Offline order creation and sync | ___ | ___ | ___ |
| 2 | App load with no network | ___ | ___ | ___ |
| 3 | Background sync after force-close | ___ | ___ | ___ |
| 4 | Service worker update banner | ___ | ___ | ___ |
| 5 | PWA install and standalone mode | ___ | ___ | ___ |
| 6 | Push notification delivery and deep link | ___ | ___ | ___ |
| 7 | Performance (interactive <3s, Lighthouse targets) | ___ | ___ | ___ |
| 8 | Lao tone marks, stacked vowels, and PDF | ___ | ___ | ___ |
| 9 | Playwright CI green with HTML artifact | ___ | ___ | ___ |

## Release gate

- [ ] All nine scenarios pass on Android 9/2GB and Android 14 (or documented emulator fallback).
- [ ] Zero critical bugs remain open.
- [ ] Founder/designated tester signs off below and updates `docs/SESSION-LOG.md`.

Sprint 4 signed off by: `__________________` Date: `____________`.
