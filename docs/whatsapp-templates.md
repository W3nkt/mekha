# WhatsApp notification configuration

The Worker sends only Meta-approved Lao templates through the Cloud API. Submit these names in the Meta Business Manager before production use:

- `order_confirmed`
- `order_shipped`
- `cod_collected`
- `safe_order_new`
- `dispute_opened`

Configure Worker secrets `WHATSAPP_PHONE_NUMBER_ID` and `WHATSAPP_ACCESS_TOKEN`. Set `WHATSAPP_OPT_OUT` only for emergency suppression; user opt-out is stored in `users.whatsapp_opted_out`. Failed sends are logged and never fail the parent transaction.
