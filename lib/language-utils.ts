export interface LanguageMeta {
  flag: string;
  nativeName: string;
  name: string;
  direction: 'ltr' | 'rtl';
}

export const LANGUAGE_METADATA: Record<string, LanguageMeta> = {
  en: { flag: '🇺🇸', nativeName: 'English', name: 'English', direction: 'ltr' },
  ar: { flag: '🇸🇦', nativeName: 'العربية', name: 'Arabic', direction: 'rtl' },
  da: { flag: '🇩🇰', nativeName: 'Dansk', name: 'Danish', direction: 'ltr' },
  de: { flag: '🇩🇪', nativeName: 'Deutsch', name: 'German', direction: 'ltr' },
  es: { flag: '🇪🇸', nativeName: 'Español', name: 'Spanish', direction: 'ltr' },
  fr: { flag: '🇫🇷', nativeName: 'Français', name: 'French', direction: 'ltr' },
  it: { flag: '🇮🇹', nativeName: 'Italiano', name: 'Italian', direction: 'ltr' },
  ja: { flag: '🇯🇵', nativeName: '日本語', name: 'Japanese', direction: 'ltr' },
  nl: { flag: '🇳🇱', nativeName: 'Nederlands', name: 'Dutch', direction: 'ltr' },
  pl: { flag: '🇵🇱', nativeName: 'Polski', name: 'Polish', direction: 'ltr' },
  pt: { flag: '🇵🇹', nativeName: 'Português', name: 'Portuguese', direction: 'ltr' },
  ru: { flag: '🇷🇺', nativeName: 'Русский', name: 'Russian', direction: 'ltr' },
  tr: { flag: '🇹🇷', nativeName: 'Türkçe', name: 'Turkish', direction: 'ltr' },
  he: { flag: '🇮🇱', nativeName: 'עברית', name: 'Hebrew', direction: 'rtl' },
  zh: { flag: '🇨🇳', nativeName: '中文', name: 'Chinese', direction: 'ltr' },
};

export const TRANSLATION_GROUPS = [
  { id: 'all', label: 'All Groups' },
  { id: 'general', label: 'General' },
  { id: 'auth', label: 'Authentication' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'appointments', label: 'Appointments' },
  { id: 'services', label: 'Services' },
  { id: 'billing', label: 'Billing' },
  { id: 'customer', label: 'Customer Portal' },
  { id: 'settings', label: 'Settings' },
  { id: 'emails', label: 'Email Templates' },
] as const;

export function getLanguageFlag(code: string): string {
  const normalized = code.toLowerCase().trim();
  return LANGUAGE_METADATA[normalized]?.flag || '🌐';
}

export function getLanguageNativeName(code: string, fallbackName?: string): string {
  const normalized = code.toLowerCase().trim();
  return LANGUAGE_METADATA[normalized]?.nativeName || fallbackName || code.toUpperCase();
}
