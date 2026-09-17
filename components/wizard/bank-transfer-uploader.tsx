'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { uploadReceiptAction } from '@/actions/appointment-payment';
import {
  IconUpload,
  IconX,
  IconCheck,
  IconLoader2,
  IconAlertCircle,
} from '@tabler/icons-react';

interface BankTransferUploaderProps {
  value?: string;
  onChange: (url: string) => void;
  disabled?: boolean;
}

export function BankTransferUploader({
  value,
  onChange,
  disabled = false,
}: BankTransferUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileProcess = async (file: File) => {
    setErrorMessage(null);

    // Validation: Max 5MB
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('File size exceeds the 5MB limit. Please upload a smaller file.');
      return;
    }

    // Validation: Allowed formats
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setErrorMessage('Unsupported file format. Please upload PNG, JPG, or PDF.');
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      const res = await uploadReceiptAction(formData);

      if (!res.success || !res.url) {
        setErrorMessage(res.error || 'Failed to upload receipt. Please try again.');
      } else {
        setFileName(file.name);
        setFileSize(formatBytes(file.size));
        onChange(res.url);
      }
    } catch {
      setErrorMessage('An unexpected error occurred during file upload.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled || isUploading) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const handleRemove = () => {
    onChange('');
    setFileName(null);
    setFileSize(null);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (value) {
    return (
      <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-between">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
            <IconCheck size={16} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">
              {fileName || 'Receipt Slip Uploaded'}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 bg-background">
                {fileSize || 'Attached'}
              </Badge>
              <span className="text-[11px] text-emerald-600 font-medium">Ready for review</span>
            </div>
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleRemove}
          disabled={disabled}
          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive cursor-pointer"
        >
          <IconX size={16} />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled && !isUploading) setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => {
          if (!disabled && !isUploading) fileInputRef.current?.click();
        }}
        className={`p-5 rounded-xl border-2 border-dashed text-center transition-all cursor-pointer ${
          isDragOver
            ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
            : 'border-border/80 hover:border-primary/60 hover:bg-muted/30'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,application/pdf"
          onChange={handleFileInputChange}
          disabled={disabled || isUploading}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            {isUploading ? (
              <IconLoader2 size={20} className="animate-spin" />
            ) : (
              <IconUpload size={20} />
            )}
          </div>

          <div>
            <p className="text-xs font-semibold text-foreground">
              {isUploading ? 'Uploading Receipt...' : 'Upload Bank Deposit Slip / Receipt'}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Drag & drop here or click to browse (PNG, JPG, PDF up to 5MB)
            </p>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-[11px] flex items-center gap-2">
          <IconAlertCircle size={14} className="shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
