/**
 * File Validation Utilities
 * Provides server-side validation for uploaded files
 */

import { createFileUploadError, createFileTypeError, createFileSizeError } from './errors';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Maximum file size: 10MB
 * Reasonable size for receipt/document images
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes

/**
 * Allowed MIME types for images
 */
export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic', // iOS photos
  'image/heif', // iOS photos
] as const;

/**
 * Allowed file extensions (without dot)
 */
export const ALLOWED_IMAGE_EXTENSIONS = [
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'heic',
  'heif',
] as const;

/**
 * Allowed MIME types for PDF documents
 */
export const ALLOWED_DOCUMENT_MIME_TYPES = [
  'application/pdf',
  ...ALLOWED_IMAGE_MIME_TYPES,
] as const;

/**
 * Allowed document extensions (without dot)
 */
export const ALLOWED_DOCUMENT_EXTENSIONS = [
  'pdf',
  ...ALLOWED_IMAGE_EXTENSIONS,
] as const;

// ============================================================================
// VALIDATION RESULT TYPES
// ============================================================================

export interface FileValidationResult {
  valid: boolean;
  error?: ReturnType<typeof createFileUploadError | typeof createFileTypeError | typeof createFileSizeError>;
  file?: File;
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate uploaded file size
 * @param file - File to validate
 * @param maxSize - Maximum allowed size in bytes (default: 10MB)
 * @returns true if valid, false otherwise
 */
export function validateFileSize(file: File, maxSize: number = MAX_FILE_SIZE): boolean {
  return file.size <= maxSize;
}

/**
 * Validate file MIME type
 * @param file - File to validate
 * @param allowedTypes - Array of allowed MIME types
 * @returns true if valid, false otherwise
 */
export function validateFileMimeType(file: File, allowedTypes: readonly string[]): boolean {
  return allowedTypes.includes(file.type);
}

/**
 * Get file extension from filename
 * @param filename - Name of the file
 * @returns Extension without dot (lowercase), or empty string if no extension
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  if (parts.length < 2) return '';
  return parts[parts.length - 1].toLowerCase();
}

/**
 * Validate file extension
 * @param filename - Name of the file
 * @param allowedExtensions - Array of allowed extensions (without dot)
 * @returns true if valid, false otherwise
 */
export function validateFileExtension(filename: string, allowedExtensions: readonly string[]): boolean {
  const ext = getFileExtension(filename);
  return allowedExtensions.includes(ext);
}

/**
 * Comprehensive image file validation
 * Checks:
 * - File size (max 10MB)
 * - MIME type (image types only)
 * - File extension
 *
 * @param file - File to validate
 * @param maxSize - Optional custom max size
 * @returns Validation result with detailed error if invalid
 */
export function validateImageFile(
  file: File,
  maxSize: number = MAX_FILE_SIZE
): FileValidationResult {
  // Check if file exists
  if (!file) {
    return {
      valid: false,
      error: createFileUploadError('Файл не найден', 'File is required'),
    };
  }

  // Check file size
  if (!validateFileSize(file, maxSize)) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(0);
    return {
      valid: false,
      error: createFileSizeError(
        `Файл слишком большой (${sizeMB}MB). Максимум ${maxSizeMB}MB`,
        file.size,
        maxSize
      ),
    };
  }

  // Check MIME type
  if (!validateFileMimeType(file, ALLOWED_IMAGE_MIME_TYPES)) {
    return {
      valid: false,
      error: createFileTypeError(
        `Недопустимый тип файла: ${file.type}. Разрешены только изображения (JPG, PNG, GIF, WebP, HEIC)`,
        file.type,
        ALLOWED_IMAGE_MIME_TYPES as unknown as string[]
      ),
    };
  }

  // Check file extension
  if (!validateFileExtension(file.name, ALLOWED_IMAGE_EXTENSIONS)) {
    const ext = getFileExtension(file.name);
    return {
      valid: false,
      error: createFileTypeError(
        `Недопустимое расширение файла: .${ext}. Разрешены: ${ALLOWED_IMAGE_EXTENSIONS.join(', ')}`,
        ext,
        ALLOWED_IMAGE_EXTENSIONS as unknown as string[]
      ),
    };
  }

  return {
    valid: true,
    file,
  };
}

/**
 * Comprehensive document file validation (images + PDF)
 * Checks:
 * - File size (max 10MB)
 * - MIME type (images + PDF)
 * - File extension
 *
 * @param file - File to validate
 * @param maxSize - Optional custom max size
 * @returns Validation result with detailed error if invalid
 */
export function validateDocumentFile(
  file: File,
  maxSize: number = MAX_FILE_SIZE
): FileValidationResult {
  // Check if file exists
  if (!file) {
    return {
      valid: false,
      error: createFileUploadError('Файл не найден', 'File is required'),
    };
  }

  // Check file size
  if (!validateFileSize(file, maxSize)) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(0);
    return {
      valid: false,
      error: createFileSizeError(
        `Файл слишком большой (${sizeMB}MB). Максимум ${maxSizeMB}MB`,
        file.size,
        maxSize
      ),
    };
  }

  // Check MIME type
  if (!validateFileMimeType(file, ALLOWED_DOCUMENT_MIME_TYPES)) {
    return {
      valid: false,
      error: createFileTypeError(
        `Недопустимый тип файла: ${file.type}. Разрешены: изображения и PDF`,
        file.type,
        ALLOWED_DOCUMENT_MIME_TYPES as unknown as string[]
      ),
    };
  }

  // Check file extension
  if (!validateFileExtension(file.name, ALLOWED_DOCUMENT_EXTENSIONS)) {
    const ext = getFileExtension(file.name);
    return {
      valid: false,
      error: createFileTypeError(
        `Недопустимое расширение файла: .${ext}. Разрешены: ${ALLOWED_DOCUMENT_EXTENSIONS.join(', ')}`,
        ext,
        ALLOWED_DOCUMENT_EXTENSIONS as unknown as string[]
      ),
    };
  }

  return {
    valid: true,
    file,
  };
}

/**
 * Format file size for display
 * @param bytes - Size in bytes
 * @returns Formatted string (e.g., "2.5 MB", "150 KB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
