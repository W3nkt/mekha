-- All buckets are private. No storage.objects policies are added here, so
-- client access remains default-deny. The server issues short-lived signed URLs.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'verification-docs',
    'verification-docs',
    false,
    10485760,
    ARRAY['image/jpeg', 'image/png', 'application/pdf']
  ),
  (
    'order-evidence',
    'order-evidence',
    false,
    10485760,
    ARRAY['image/jpeg', 'image/png', 'application/pdf']
  ),
  (
    'courier-labels',
    'courier-labels',
    false,
    2097152,
    ARRAY['application/pdf']
  )
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
