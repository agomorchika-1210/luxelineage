-- ============================================
-- SUPABASE STORAGE BUCKETS SETUP
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- CREATE STORAGE BUCKETS
-- ============================================

-- Product images bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'product-images',
    'product-images',
    true, -- Public bucket (images can be accessed directly)
    5242880, -- 5MB file size limit
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- STORAGE POLICIES
-- ============================================

-- Allow public read access to product images
CREATE POLICY "Public can view product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

-- Allow authenticated admins to upload product images
CREATE POLICY "Admins can upload product images"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'product-images' 
    AND auth.role() = 'authenticated'
);

-- Allow authenticated admins to update product images
CREATE POLICY "Admins can update product images"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'product-images' 
    AND auth.role() = 'authenticated'
);

-- Allow authenticated admins to delete product images
CREATE POLICY "Admins can delete product images"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'product-images' 
    AND auth.role() = 'authenticated'
);

-- ============================================
-- ALTERNATIVE: If you want to use Supabase Dashboard
-- ============================================
-- 
-- You can also create buckets via Supabase Dashboard:
-- 1. Go to Storage section
-- 2. Click "New bucket"
-- 3. Name: product-images
-- 4. Public: Yes
-- 5. File size limit: 5MB
-- 6. Allowed MIME types: image/jpeg, image/jpg, image/png, image/webp, image/gif
-- 
-- Then run only the storage policies section above
-- ============================================

