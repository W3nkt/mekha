# Facebook / Messenger integration setup

The code for issue #27 is deployable without enabling Facebook. Manual orders remain independent. Complete these steps only when enabling the integration.

## Meta Developer Console

1. Create or select the Meta app and add **Facebook Login for Business**.
2. Request/apply for `pages_read_engagement`, `pages_messaging`, and `pages_manage_metadata`.
3. Add the production callback URL configured as `META_REDIRECT_URI`.
4. Add the webhook callback URL `https://<api-host>/v1/webhooks/facebook`.
5. Subscribe the Page to `feed` and `messages` fields.
6. Generate a Page access token with the approved permissions. Never commit it.
7. Use Meta's webhook test tool and verify that the signature header is present.

## Worker secrets and variables

Configure these per environment with Wrangler (or the deployment secret manager):

- `META_APP_ID` — Meta app ID (variable).
- `META_APP_SECRET` — Meta app secret (secret).
- `META_VERIFY_TOKEN` — random webhook verification token (secret; must match Meta).
- `META_TOKEN_ENCRYPTION_KEY` — high-entropy secret used to encrypt stored Page tokens (secret; changing it makes existing connections unreadable).
- `META_REDIRECT_URI` — exact OAuth callback URL (variable).
- Existing `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` must also be configured.

After applying the Supabase migration, connect a Page through the app's OAuth flow or `POST /v1/facebook/connect`; send `page_id`, `page_name`, and the Page access token over HTTPS. Confirm `GET /v1/facebook/status` returns `connected` and test a duplicate webhook delivery.

## Operational checks

- Keep the Meta app in Live mode only after permissions are approved.
- Rotate the encryption key only with a planned token re-encryption migration.
- Monitor webhook 403s (signature/configuration problems) and draft creation failures.
- Revoke the Page token in Meta when disconnecting a seller account.
