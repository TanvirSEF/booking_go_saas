import { NextResponse, type NextRequest } from 'next/server';
import { uploadMediaFile } from '@/lib/storage-engine';
import type { MediaUploadFolder } from '@/types/media-upload';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = (formData.get('file') || formData.get('receipt') || formData.get('avatar')) as File | null;
    const folder = (formData.get('folder') as MediaUploadFolder) || 'general';

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided in form data.' },
        { status: 400 }
      );
    }

    const result = await uploadMediaFile(file, folder);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        url: result.url,
        filename: result.filename,
        size: result.size,
        mimeType: result.mimeType,
      },
      { status: 200 }
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Internal upload error';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
