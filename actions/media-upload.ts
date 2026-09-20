'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { uploadMediaFile, deleteMediaFile } from '@/lib/storage-engine';
import type { MediaUploadFolder, MediaUploadResult, DeleteMediaResult } from '@/types/media-upload';

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Graceful no-op in background tasks or tests
  }
}

/**
 * Server action for uploading media files from Server Actions or form actions
 */
export async function uploadMediaAction(formData: FormData): Promise<MediaUploadResult> {
  try {
    const file = (formData.get('file') || formData.get('receipt') || formData.get('avatar')) as File | null;
    const folder = (formData.get('folder') as MediaUploadFolder) || 'general';

    if (!file) {
      return { success: false, error: 'No file provided.' };
    }

    const result = await uploadMediaFile(file, folder);

    if (result.success) {
      safeRevalidatePath('/dashboard');
      safeRevalidatePath('/super-admin');
    }

    return result;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to upload media';
    return { success: false, error: errorMsg };
  }
}

/**
 * Server action for deleting an uploaded media asset with security checks
 */
export async function deleteMediaAction(fileUrl: string): Promise<DeleteMediaResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized: Please log in to delete files.' };
    }

    const result = await deleteMediaFile(fileUrl);
    return result;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to delete file';
    return { success: false, error: errorMsg };
  }
}
