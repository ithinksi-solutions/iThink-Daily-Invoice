-- =============================================================================
-- 003_storage_buckets.sql: Storage Bucket & RLS Policies
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'bill-slips',
    'bill-slips',
    false,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "storage_upload_policy" ON storage.objects;
CREATE POLICY "storage_upload_policy"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'bill-slips'
    AND (
        public.is_admin()
        OR (storage.foldername(name))[1] = auth.uid()::text
    )
);

DROP POLICY IF EXISTS "storage_select_policy" ON storage.objects;
CREATE POLICY "storage_select_policy"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'bill-slips'
    AND (
        public.is_admin()
        OR (storage.foldername(name))[1] = auth.uid()::text
    )
);

DROP POLICY IF EXISTS "storage_delete_policy" ON storage.objects;
CREATE POLICY "storage_delete_policy"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'bill-slips'
    AND public.is_admin()
);
