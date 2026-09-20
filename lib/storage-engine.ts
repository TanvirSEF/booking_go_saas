import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { getSystemSetting } from '@/lib/system-settings';
import type { MediaUploadFolder, MediaUploadResult, DeleteMediaResult } from '@/types/media-upload';

export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'application/pdf',
];

export const VALID_FOLDERS: MediaUploadFolder[] = [
  'users-avatar',
  'logo',
  'receipts',
  'blog',
  'services',
  'meta',
  'general',
];

/**
 * Validates and stores an uploaded file into local public storage (or S3 adapter)
 */
export async function uploadMediaFile(
  file: File,
  targetFolder: MediaUploadFolder = 'general'
): Promise<MediaUploadResult> {
  try {
    if (!file || typeof file.arrayBuffer !== 'function') {
      return { success: false, error: 'No valid file provided.' };
    }

    // 1. MIME type validation
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return {
        success: false,
        error: `Unsupported file type: ${file.type}. Allowed formats: JPG, PNG, WEBP, GIF, SVG, PDF.`,
      };
    }

    // 2. Max size validation (resolving from DB with fallback to 10MB)
    const maxMbStr = await getSystemSetting('max_upload_size_mb', '10');
    const maxMb = Number(maxMbStr) || 10;
    const maxBytes = maxMb * 1024 * 1024;

    if (file.size > maxBytes) {
      return {
        success: false,
        error: `File size exceeds the ${maxMb}MB platform limit.`,
      };
    }

    // 3. Folder sanitization
    const folder = VALID_FOLDERS.includes(targetFolder) ? targetFolder : 'general';

    // 4. File extension and unique name generation
    const rawExt = file.name.split('.').pop()?.toLowerCase() || '';
    const safeExt = rawExt.replace(/[^a-z0-9]/g, '') || 'bin';
    const uniqueHash = crypto.randomUUID().slice(0, 8);
    const filename = `${folder}_${Date.now()}_${uniqueHash}.${safeExt}`;

    // 5. Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 6. Write to public/uploads directory
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', folder);
    await fs.mkdir(uploadDir, { recursive: true });

    const targetFilePath = path.join(uploadDir, filename);
    await fs.writeFile(targetFilePath, buffer);

    const publicUrl = `/uploads/${folder}/${filename}`;

    return {
      success: true,
      url: publicUrl,
      filename,
      size: file.size,
      mimeType: file.type,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Storage write failed';
    return { success: false, error: errorMsg };
  }
}

/**
 * Safely removes a file from storage, defending against directory traversal
 */
export async function deleteMediaFile(fileUrl: string): Promise<DeleteMediaResult> {
  try {
    if (!fileUrl || typeof fileUrl !== 'string') {
      return { success: false, error: 'File URL is required.' };
    }

    // Exclude default placeholder images
    if (fileUrl.includes('default') || fileUrl.includes('avatar.png') || fileUrl.includes('logo-')) {
      return { success: true, message: 'Skipped default asset deletion.' };
    }

    // Clean leading slash
    const sanitizedRelPath = fileUrl.replace(/^\/+/, '');

    // Resolve path
    const publicDir = path.join(process.cwd(), 'public');
    const uploadsDir = path.join(publicDir, 'uploads');
    const fullTarget = path.normalize(path.join(publicDir, sanitizedRelPath));

    // Security Check: Path MUST reside inside public/uploads
    if (!fullTarget.startsWith(uploadsDir)) {
      return {
        success: false,
        error: 'Security violation: Attempted deletion outside uploads directory.',
      };
    }

    // Attempt unlink if exists
    try {
      await fs.unlink(fullTarget);
      return { success: true, message: 'File deleted successfully.' };
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return { success: true, message: 'File already removed or not found.' };
      }
      throw err;
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to delete file';
    return { success: false, error: errorMsg };
  }
}
