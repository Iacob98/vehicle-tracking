import { createClient } from '@supabase/supabase-js';

// Create Supabase client with Service Role key for server-side operations (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * Upload a file to Supabase Storage (SERVER-SIDE ONLY)
 * Uses Service Role key to bypass RLS
 * @param file File to upload
 * @param bucket Bucket name
 * @param organizationId Organization ID for path organization
 * @returns Public URL of uploaded file or null on error
 */
export async function uploadFileServer(
  file: File,
  bucket: 'vehicles' | 'documents' | 'expenses' | 'penalties',
  organizationId: string
): Promise<string | null> {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${organizationId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

    console.log(`📤 Uploading ${file.name} to ${bucket}/${fileName}...`);

    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('❌ Upload error:', error);
      return null;
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from(bucket).getPublicUrl(data.path);

    console.log(`✅ Uploaded to: ${publicUrl}`);
    return publicUrl;
  } catch (error) {
    console.error('❌ Exception uploading file:', error);
    return null;
  }
}

/**
 * Upload multiple files to Supabase Storage (SERVER-SIDE ONLY)
 * @param files Files to upload
 * @param bucket Bucket name
 * @param organizationId Organization ID
 * @returns Array of public URLs
 */
export async function uploadMultipleFilesServer(
  files: File[],
  bucket: 'vehicles' | 'documents' | 'expenses' | 'penalties',
  organizationId: string
): Promise<string[]> {
  const uploadPromises = files.map((file) => uploadFileServer(file, bucket, organizationId));
  const results = await Promise.all(uploadPromises);
  return results.filter((url): url is string => url !== null);
}

/**
 * Delete a file from Supabase Storage (SERVER-SIDE ONLY)
 * @param url Public URL of the file to delete
 * @param bucket Bucket name
 * @returns true if successful, false otherwise
 */
export async function deleteFileServer(url: string, bucket: string): Promise<boolean> {
  try {
    // Extract path from public URL
    const urlParts = url.split(`/${bucket}/`);
    if (urlParts.length < 2) {
      console.error('Invalid URL format');
      return false;
    }

    const filePath = urlParts[1];

    const { error } = await supabaseAdmin.storage.from(bucket).remove([filePath]);

    if (error) {
      console.error('Error deleting file:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Exception deleting file:', error);
    return false;
  }
}
