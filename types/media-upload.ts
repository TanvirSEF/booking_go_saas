export type MediaUploadFolder =
  | 'users-avatar'
  | 'logo'
  | 'receipts'
  | 'blog'
  | 'services'
  | 'meta'
  | 'general';

export interface MediaUploadResult {
  success: boolean;
  url?: string;
  filename?: string;
  size?: number;
  mimeType?: string;
  error?: string;
}

export interface DeleteMediaResult {
  success: boolean;
  message?: string;
  error?: string;
}
