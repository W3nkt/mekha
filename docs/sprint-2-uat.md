# Sprint 2 day-in-the-life UAT

## Automated smoke

```sh
SMOKE_API_URL=https://mekha-api.wen-kt2020.workers.dev \
SMOKE_WEB_URL=https://mekha.satsx.net \
node scripts/sprint2-smoke.mjs
```

The smoke run verifies seller route reachability, anonymous finance/webhook rejection, and browser secret hygiene. It is safe to run without production seller credentials.

## Evidence matrix

| Flow | Evidence | Result |
| --- | --- | --- |
| Facebook queue → confirm 3 intents | queue + resulting orders | external Meta setup |
| 2 manual orders → 5-label batch | timer + thermal/A6 print | physical device/printer |
| Product photo/stock/low-stock | camera and catalogue screenshots | physical device |
| COD import (5 match, 1 discrepancy) | CSV + finance summary | fixture/account required |
| Order export in Sheets | opened CSV screenshot | manual desktop |
| Offline create → kill/reopen → sync | recording + server rows | physical device/network |
| Order-entry/cold-start performance | timings on low-end Android | physical device |
| Lao language audit | screen checklist | physical device |
| Cross-seller/API secret audit | request logs + network export | test accounts required |

Do not mark the gate complete from the smoke script alone: Meta permissions, courier APIs, SMS/auth, physical hardware, and device performance require external fixtures.
