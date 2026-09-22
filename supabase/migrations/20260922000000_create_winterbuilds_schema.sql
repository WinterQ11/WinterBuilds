-- ==============================================================================
-- WINTERBUILDS DATABASE SCHEMA & STORAGE SETUP
-- PostgreSQL / Supabase Migration
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ------------------------------------------------------------------------------
-- 1. ADMIN USERS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'superadmin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Security policy: authenticated admins can view admin list
CREATE POLICY "Admins can view admin list"
  ON public.admin_users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

-- Helper function to check if current authenticated user is an authorized admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users WHERE id = auth.uid()
  );
$$;

-- ------------------------------------------------------------------------------
-- 2. APPLICATIONS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  package_name TEXT NOT NULL,
  version_name TEXT NOT NULL,
  version_code BIGINT NOT NULL DEFAULT 1,
  description TEXT NOT NULL DEFAULT '',
  short_description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Utilities',
  icon_url TEXT DEFAULT '',
  screenshots JSONB NOT NULL DEFAULT '[]'::jsonb,
  apk_storage_path TEXT NOT NULL,
  apk_download_url TEXT NOT NULL DEFAULT '',
  apk_file_size BIGINT NOT NULL DEFAULT 0,
  apk_sha256 TEXT NOT NULL DEFAULT '',
  min_sdk INT DEFAULT 21,
  target_sdk INT DEFAULT 34,
  downloads_count BIGINT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  published_at TIMESTAMPTZ
);

-- Indexes for lightning fast searching and filtering
CREATE INDEX IF NOT EXISTS idx_applications_slug ON public.applications (slug);
CREATE INDEX IF NOT EXISTS idx_applications_package_name ON public.applications (package_name);
CREATE INDEX IF NOT EXISTS idx_applications_category ON public.applications (category);
CREATE INDEX IF NOT EXISTS idx_applications_status_published ON public.applications (status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_applications_downloads ON public.applications (downloads_count DESC);
CREATE INDEX IF NOT EXISTS idx_applications_featured ON public.applications (featured, downloads_count DESC);
CREATE INDEX IF NOT EXISTS idx_applications_trgm_name ON public.applications USING gin (name gin_trgm_ops);

-- RLS on Applications
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- 1) Public visitors: Can read only published apps
CREATE POLICY "Public read published applications"
  ON public.applications
  FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

-- 2) Authorized Admins: Full access (select all, insert, update, delete)
CREATE POLICY "Admins can select all applications"
  ON public.applications
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can insert applications"
  ON public.applications
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update applications"
  ON public.applications
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete applications"
  ON public.applications
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- 3. ATOMIC DOWNLOAD COUNTER FUNCTION
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.increment_app_downloads(target_app_id UUID)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_count BIGINT;
BEGIN
  UPDATE public.applications
  SET downloads_count = downloads_count + 1,
      updated_at = timezone('utc'::text, now())
  WHERE id = target_app_id
  RETURNING downloads_count INTO new_count;

  RETURN COALESCE(new_count, 0);
END;
$$;

-- Grant execution to anon and authenticated callers
GRANT EXECUTE ON FUNCTION public.increment_app_downloads(UUID) TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 4. STORAGE BUCKET CONFIGURATION (Supabase Storage)
-- ------------------------------------------------------------------------------
-- Insert storage buckets if they do not exist
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('apks', 'apks', true),
 ('media', 'media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage Policies for 'apks' bucket:
-- Public can download APK files
CREATE POLICY "Public read apks"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'apks');

-- Only admins can upload, update, delete APK objects
CREATE POLICY "Admins manage apks"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (bucket_id = 'apks' AND public.is_admin())
  WITH CHECK (bucket_id = 'apks' AND public.is_admin());

-- Storage Policies for 'media' bucket:
-- Public can read icons & screenshots
CREATE POLICY "Public read media"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'media');

CREATE POLICY "Admins manage media"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (bucket_id = 'media' AND public.is_admin())
  WITH CHECK (bucket_id = 'media' AND public.is_admin());
