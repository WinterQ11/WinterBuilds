-- ==============================================================================
-- WINTERBUILDS MIGRATION: ADD GOOGLE DRIVE URL SUPPORT
-- Adds nullable google_drive_url column and allows external link workflows
-- ==============================================================================

-- 1. Add google_drive_url column to applications table
ALTER TABLE public.applications 
  ADD COLUMN IF NOT EXISTS google_drive_url TEXT;

-- 2. Drop NOT NULL constraint on apk_storage_path so apps can be published via Google Drive URL directly
ALTER TABLE public.applications 
  ALTER COLUMN apk_storage_path DROP NOT NULL;

-- 3. Document the column
COMMENT ON COLUMN public.applications.google_drive_url IS 'External Google Drive link for APK download page (preferred when set)';
