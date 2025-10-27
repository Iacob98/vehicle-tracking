/**
 * Upload a file to Supabase Storage via API endpoint (bypasses RLS using Service Role)
 * @param file File to upload
 * @param bucket Bucket name ('vehicles', 'documents', 'expenses', 'penalties')
 * @param organizationId Organization ID for path organization (not used, kept for compatibility)
 * @param baseUrl Base URL for API requests (optional, defaults to localhost for SSR, window.location.origin for client)
 * @returns Public URL of uploaded file or null on error
 */
export async function uploadFile(
  file: File,
  bucket: 'vehicles' | 'documents' | 'expenses' | 'penalties',
  organizationId?: string,
  baseUrl?: string
): Promise<string | null> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bucket', bucket);

    // Determine base URL: use provided baseUrl, or window.location.origin if available (client-side), or localhost for server-side
    const apiUrl = baseUrl
      ? `${baseUrl}/api/upload`
      : (typeof window !== 'undefined' ? `${window.location.origin}/api/upload` : 'http://localhost:3000/api/upload');

    const response = await fetch(apiUrl, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Upload failed:', errorData);
      return null;
    }

    const { url } = await response.json();
    return url;
  } catch (error) {
    console.error('Exception uploading file:', error);
    return null;
  }
}

/**
 * Upload multiple files to Supabase Storage
 * @param files Files to upload
 * @param bucket Bucket name
 * @param organizationId Organization ID for path organization
 * @returns Array of public URLs
 */
export async function uploadMultipleFiles(
  files: File[],
  bucket: 'vehicles' | 'documents' | 'expenses' | 'penalties',
  organizationId: string
): Promise<string[]> {
  const uploadPromises = files.map((file) => uploadFile(file, bucket, organizationId));
  const results = await Promise.all(uploadPromises);
  return results.filter((url): url is string => url !== null);
}

/**
 * Delete a file from Supabase Storage via API endpoint (bypasses RLS using Service Role)
 * @param url Public URL of the file to delete
 * @param bucket Bucket name
 * @param baseUrl Base URL for API requests (optional)
 * @returns true if successful, false otherwise
 */
export async function deleteFile(url: string, bucket: string, baseUrl?: string): Promise<boolean> {
  try {
    // Extract path from public URL
    const urlParts = url.split(`/${bucket}/`);
    if (urlParts.length < 2) {
      console.error('Invalid URL format');
      return false;
    }

    const filePath = urlParts[1];

    // Determine base URL: use provided baseUrl, or window.location.origin if available (client-side), or localhost for server-side
    const apiUrl = baseUrl
      ? `${baseUrl}/api/upload`
      : (typeof window !== 'undefined' ? `${window.location.origin}/api/upload` : 'http://localhost:3000/api/upload');

    // Use API endpoint to delete file (bypasses RLS)
    const response = await fetch(apiUrl, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bucket, filePath }),
    });

    if (!response.ok) {
      console.error('Delete failed:', await response.json());
      return false;
    }

    return true;
  } catch (error) {
    console.error('Exception deleting file:', error);
    return false;
  }
}

/**
 * Delete multiple files from Supabase Storage
 * @param urls Public URLs of files to delete
 * @param bucket Bucket name
 * @returns Number of successfully deleted files
 */
export async function deleteMultipleFiles(urls: string[], bucket: string): Promise<number> {
  const deletePromises = urls.map((url) => deleteFile(url, bucket));
  const results = await Promise.all(deletePromises);
  return results.filter((success) => success).length;
}
