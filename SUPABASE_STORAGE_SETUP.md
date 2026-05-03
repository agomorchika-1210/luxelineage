# 📦 Supabase Storage Setup for Product Images

This guide will help you set up Supabase Storage to store product images.

## Step 1: Create Storage Bucket

### Option A: Using Supabase Dashboard (Recommended)

1. Go to your **Supabase Dashboard**
2. Navigate to **Storage** in the left sidebar
3. Click **New bucket**
4. Configure the bucket:
   - **Name**: `product-images`
   - **Public bucket**: ✅ **Yes** (check this - images need to be publicly accessible)
   - **File size limit**: `5242880` (5MB)
   - **Allowed MIME types**: 
     - `image/jpeg`
     - `image/jpg`
     - `image/png`
     - `image/webp`
     - `image/gif`
5. Click **Create bucket**

### Option B: Using SQL Editor

Run the SQL script in `supabase-storage-setup.sql`:

```sql
-- Create product images bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'product-images',
    'product-images',
    true, -- Public bucket
    5242880, -- 5MB file size limit
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;
```

## Step 2: Set Up Storage Policies

After creating the bucket, you need to set up policies for access control.

### Using Supabase Dashboard:

1. Go to **Storage** > **Policies**
2. Select the `product-images` bucket
3. Create these policies:

**Policy 1: Public Read Access**
- Policy name: `Public can view product images`
- Allowed operation: `SELECT`
- Policy definition:
```sql
bucket_id = 'product-images'
```

**Policy 2: Authenticated Upload**
- Policy name: `Admins can upload product images`
- Allowed operation: `INSERT`
- Policy definition:
```sql
bucket_id = 'product-images' AND auth.role() = 'authenticated'
```

**Policy 3: Authenticated Update**
- Policy name: `Admins can update product images`
- Allowed operation: `UPDATE`
- Policy definition:
```sql
bucket_id = 'product-images' AND auth.role() = 'authenticated'
```

**Policy 4: Authenticated Delete**
- Policy name: `Admins can delete product images`
- Allowed operation: `DELETE`
- Policy definition:
```sql
bucket_id = 'product-images' AND auth.role() = 'authenticated'
```

### Using SQL Editor:

Run the policies section from `supabase-storage-setup.sql`:

```sql
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
```

## Step 3: Verify Setup

1. Go to **Storage** > **Buckets**
2. Verify `product-images` bucket exists and is marked as **Public**
3. Try uploading a test image through the admin panel

## Step 4: Test Image Upload

1. Go to **Admin** > **Inventory**
2. Click **Add Product**
3. Click **Upload Image**
4. Select an image file
5. The image should upload and display a preview

## Troubleshooting

### Upload Fails with "Bucket not found"

- Verify the bucket name is exactly `product-images`
- Check that the bucket exists in Storage > Buckets

### Upload Fails with "Policy violation"

- Check that storage policies are set up correctly
- Verify you're logged in as an authenticated user
- Check that the `auth.role() = 'authenticated'` condition is met

### Images Not Displaying

- Verify the bucket is set to **Public**
- Check the image URL in the browser console
- Verify the storage policies allow public read access

### File Size Too Large

- Default limit is 5MB
- To increase, update the bucket's `file_size_limit` in the database
- Or compress images before uploading

## Usage in Code

The image upload is handled automatically in the inventory modal:

```typescript
// When you select an image file
const imageUrl = await uploadImageToSupabase(file, 'products')
// Returns: https://[project].supabase.co/storage/v1/object/public/product-images/products/...
```

The uploaded image URL is automatically saved with the product.

## Next Steps

- ✅ Bucket created
- ✅ Policies configured
- ✅ Test upload working
- 🎉 Ready to use!

