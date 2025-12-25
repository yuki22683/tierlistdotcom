// File validation utilities for secure uploads

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate image file before upload
 * @param file - File or Blob to validate
 * @param filename - Original filename for extension validation
 * @returns Validation result
 */
export function validateImageFile(file: File | Blob, filename?: string): FileValidationResult {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `ファイルサイズが大きすぎます。最大${MAX_FILE_SIZE / 1024 / 1024}MBまでです。`
    };
  }

  // Check minimum file size (avoid empty files)
  if (file.size < 100) {
    return {
      valid: false,
      error: 'ファイルが空またはデータが不正です。'
    };
  }

  // Check MIME type
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `サポートされていないファイル形式です。対応形式: ${ALLOWED_IMAGE_TYPES.join(', ')}`
    };
  }

  // Check file extension if filename is provided
  if (filename) {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (!ext || !ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
      return {
        valid: false,
        error: `サポートされていない拡張子です。対応拡張子: ${ALLOWED_IMAGE_EXTENSIONS.join(', ')}`
      };
    }
  }

  return { valid: true };
}

/**
 * Sanitize filename to prevent path traversal and other attacks
 * @param filename - Original filename
 * @returns Sanitized filename
 */
export function sanitizeFilename(filename: string): string {
  // Remove path separators and special characters
  return filename
    .replace(/[\/\\]/g, '')  // Remove path separators
    .replace(/[^\w\s.-]/g, '')  // Keep only alphanumeric, spaces, dots, hyphens
    .replace(/\s+/g, '-')  // Replace spaces with hyphens
    .toLowerCase();
}

/**
 * Generate safe filename with timestamp and random string
 * @param originalFilename - Original filename to extract extension
 * @returns Safe filename
 */
export function generateSafeFilename(originalFilename: string): string {
  const ext = originalFilename.split('.').pop()?.toLowerCase() || 'jpg';
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(7);
  return `${timestamp}-${randomStr}.${ext}`;
}
