# Sprint 3 trust bridge UAT

Run automated checks against staging first:

```sh
SMOKE_API_URL=https://mekha-api.wen-kt2020.workers.dev node scripts/sprint3-smoke.mjs
```

Then execute the full buyer → seller → admin cycle with test accounts and record timestamps, screenshots, device/OS, and API references. Real-phone and Meta WhatsApp delivery checks require deployment secrets and approved templates; they cannot be simulated by CI.

## Trust bridge checklist

- [ ] Public seller profile shows badge metrics and caution signals.
- [ ] Buyer creates Safe Order and seller confirms; terms become immutable.
- [ ] Buyer and seller upload evidence; dispute PDF includes timestamps and hashes.
- [ ] Shipment reaches `shipped`, then COD settlement reaches `settled`.
- [ ] Buyer submits a linked verified review; public profile shows the verified badge.

## Report and moderation checklist

- [ ] Report includes category, 50+ character description, and evidence.
- [ ] AI classification appears as an explicitly labelled AI result (or null when unavailable).
- [ ] Admin substantiation creates a critical `MULTIPLE_REPORTS` risk signal.
- [ ] Public caution level changes only after moderation.

## Performance/security evidence

| Check | Target | Result/evidence |
| --- | --- | --- |
| Safe Order load on 3G | <1.5s | ___ |
| Dispute PDF generation | <5s | ___ |
| AI classification | <10s | ___ |
| WhatsApp notification | <30s | ___ |
| Terms mutation after confirmation | 409 | ___ |
| Anonymous access to admin/report identity | denied | ___ |

Log failures as separate GitHub issues with the `bug` label before sign-off.
