-- ==============================================================================
-- WINTERBUILDS MIGRATION: FIX APPLICATION PERSISTENCE & GOOGLE DRIVE INTEGRATION
-- Ensures google_drive_url column, apk_storage_path nullability, published_at index,
-- and RLS policies allow authenticated and service_role administrative writes.
-- ==============================================================================

-- 1. Ensure google_drive_url column exists
ALTER TABLE public.applications 
  ADD COLUMN IF NOT EXISTS google_drive_url TEXT;

-- 2. Drop NOT NULL constraint on apk_storage_path so external Drive URLs don't require storage files
ALTER TABLE public.applications 
  ALTER COLUMN apk_storage_path DROP NOT NULL;

-- 3. Ensure published_at is set for all existing published applications
UPDATE public.applications
SET published_at = created_at
WHERE status = 'published' AND published_at IS NULL;

-- 4. Create index on status and created_at for fast catalog queries
CREATE INDEX IF NOT EXISTS idx_applications_status_created 
  ON public.applications (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_applications_google_drive_url 
  ON public.applications (google_drive_url) 
  WHERE google_drive_url IS NOT NULL;

-- 5. RLS Policies: Ensure service_role and authenticated admins can insert/update/delete
DROP POLICY IF EXISTS "Service role full access to applications" ON public.applications;
CREATE POLICY "Service role full access to applications"
  ON public.applications
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Ensure public can read published applications
DROP POLICY IF EXISTS "Public read published applications" ON public.applications;
CREATE POLICY "Public read published applications"
  ON public.applications
  FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

-- Grant permissions
GRANT ALL ON public.applications TO service_role;
GRANT SELECT ON public.applications TO anon, authenticated;
GRANT ALL ON public.applications TO authenticated;
