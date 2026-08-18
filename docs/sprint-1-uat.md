# Sprint 1 UAT and integration test

## Automated smoke test

Run against the deployed environments:

```sh
SMOKE_API_URL=https://mekha-api.wen-kt2020.workers.dev \
SMOKE_WEB_URL=https://mekha.satsx.net \
SMOKE_SELLER_ID=<public-seller-uuid> \
node scripts/sprint1-smoke.mjs
```

The script checks API health, public request validation, anonymous admin rejection, public HTML secret leakage, profile availability, numeric-score absence, and the OG endpoint's PNG signature. `SMOKE_SELLER_ID` is intentionally opt-in so CI never depends on production fixture data.

## Manual UAT matrix

The following require credentials, a configured SMS provider, seeded seller data, or a physical device and must be recorded against the deployed URL:

| Area | Evidence to capture |
| --- | --- |
| Buyer search/profile/share/QR | Browser/incognito screenshots and scanned URL |
| Seller OTP/profile/document upload | Phone model, OTP timestamp, upload/status screenshots |
| Admin approve/reject/suspend | Queue/detail and resulting public badge screenshots |
| Trust signals | Before/after order and verification fixtures |
| Performance | Network search timing and DevTools FCP under 3G |
| Mobile/PWA | Android version, native share, install, relaunch, Lao rendering |
| Security | 403 admin, cross-seller document denial, expiry test, browser network export |

Do not use a development OTP bypass or service-role credentials for production UAT.
