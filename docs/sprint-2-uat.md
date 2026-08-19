# Sprint 2 seller OS UAT

Issue #29 is a device-and-credential UAT gate. Run the automated smoke checks first, then record the manual evidence below against the deployed staging URL. Do not use service-role credentials or an OTP bypass.

## Automated checks

```sh
SMOKE_API_URL=https://mekha-api.wen-kt2020.workers.dev node scripts/sprint2-smoke.mjs
```

The script verifies public health/search behavior, protected seller/customer/export routes, and Facebook webhook signature rejection.

## Device matrix

| Device | OS | Cold start | 5-order median | 200-order scroll | Offline restart | Result/evidence |
| --- | --- | ---: | ---: | --- | --- | --- |
| Samsung Galaxy A03 | Android 9+ / 2GB | ___ s | ___ s | pass/fail | pass/fail | ___ |
| Mid-range Android | Android 12+ / 4GB | ___ s | ___ s | pass/fail | pass/fail | ___ |
| iPhone (if available) | ___ | ___ s | ___ s | pass/fail | pass/fail | ___ |

## Day-in-the-life checklist

- [ ] Process three Facebook drafts and two manual orders.
- [ ] Generate five A6 labels and advance orders to shipped.
- [ ] Add a camera product photo and adjust two stock counts.
- [ ] Confirm low-stock alerts at five units or fewer.
- [ ] Import five matching and one discrepant COD settlement.
- [ ] Verify monthly totals and open the MOIC CSV in Google Sheets.
- [ ] Create two orders offline, kill/reopen the app, then reconnect and verify sync.
- [ ] Complete Lao-language and tone-mark review on each seller screen.
- [ ] Confirm cross-seller API isolation and no browser exposure of service-role keys.

Record screenshots, timings, device/OS versions, and any bug as a separate GitHub issue before closing Sprint 2.
