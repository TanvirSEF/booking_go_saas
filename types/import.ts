export type ImportConflictStrategy = 'skip' | 'update' | 'append';

export interface CsvParseResult<T = Record<string, string>> {
  rows: T[];
  headers: string[];
  totalRows: number;
  parseErrors: Array<{ line: number; error: string }>;
}

export interface ImportBatchResult {
  totalProcessed: number;
  importedCount: number;
  updatedCount: number;
  skippedCount: number;
  errors: Array<{ row: number; error: string }>;
}

export interface CustomerCsvRow {
  name: string;
  email: string;
  contact: string;
  gender?: string;
  dob?: string;
  description?: string;
}

export interface ServiceCsvRow {
  name: string;
  category: string;
  price: number;
  durationMinutes?: number;
  bufferMinutes?: number;
  description?: string;
  isFree?: boolean;
}

export interface StaffCsvRow {
  name: string;
  email: string;
  locations?: string;
  services?: string;
  colorCode?: string;
  description?: string;
}

export interface RestoreBundleOptions {
  dryRun?: boolean;
  preserveExisting?: boolean;
}

export interface RestoreBundleResult {
  dryRun: boolean;
  bundleVersion: string;
  sourceBusinessName: string;
  targetBusinessId: string;
  importedCounts: Record<string, number>;
  warnings: string[];
  errors: string[];
}
