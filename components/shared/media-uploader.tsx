"use client";

import React, { useState, useRef } from "react";
import Image from "next/image";
import { toast } from "sonner";
import {
  IconUpload,
  IconX,
  IconLoader2,
  IconPhoto,
  IconCheck,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { MediaUploadFolder } from "@/types/media-upload";

interface MediaUploaderProps {
  value?: string;
  onChange: (url: string) => void;
  folder?: MediaUploadFolder;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  aspectRatio?: "square" | "wide" | "banner";
  maxSizeMb?: number;
  allowedTypes?: string[];
}

export function MediaUploader({
  value = "",
  onChange,
  folder = "general",
  placeholder = "Upload or enter media URL",
  disabled = false,
  aspectRatio = "square",
  maxSizeMb = 10,
  allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"],
}: MediaUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleUploadFile = async (file: File) => {
    // 1. Validation
    if (!allowedTypes.includes(file.type)) {
      toast.error(`Unsupported file format. Please upload ${allowedTypes.map((t) => t.split("/")[1]?.toUpperCase()).join(", ")}`);
      return;
    }

    if (file.size > maxSizeMb * 1024 * 1024) {
      toast.error(`File size exceeds the ${maxSizeMb}MB platform limit.`);
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(data.error || "Failed to upload media asset.");
        return;
      }

      toast.success("File uploaded successfully!");
      onChange(data.url);
    } catch (err) {
      console.error(err);
      toast.error("An error occurred during file upload.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUploadFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled || isUploading) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleUploadFile(file);
    }
  };

  const heightClass =
    aspectRatio === "square"
      ? "h-24 w-24"
      : aspectRatio === "wide"
      ? "h-28 w-full"
      : "h-36 w-full";

  return (
    <div className="space-y-2">
      {/* Visual Preview Box */}
      {value ? (
        <div className="relative group rounded-xl border border-border/80 bg-muted/30 p-2 overflow-hidden flex items-center gap-3">
          <div className={`relative ${heightClass} rounded-lg overflow-hidden border border-border/60 bg-muted shrink-0`}>
            {value.endsWith(".pdf") ? (
              <div className="flex h-full w-full flex-col items-center justify-center bg-muted text-foreground p-2">
                <IconCheck className="size-6 text-emerald-500" />
                <span className="text-[10px] font-mono mt-1 truncate max-w-full">PDF Attached</span>
              </div>
            ) : (
              <Image
                src={value}
                alt="Media preview"
                fill
                unoptimized
                className="object-cover"
                onError={() => {
                  toast.error("Unable to render image preview from this URL.");
                }}
              />
            )}
          </div>

          <div className="flex-1 min-w-0 space-y-1">
            <p className="text-xs font-semibold text-foreground truncate" title={value}>
              {value.split("/").pop() || "Uploaded Asset"}
            </p>
            <p className="text-[11px] font-mono text-muted-foreground truncate">{value}</p>
            <div className="flex items-center gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || isUploading}
                className="h-7 text-xs gap-1 cursor-pointer"
              >
                {isUploading ? (
                  <IconLoader2 className="size-3 animate-spin" />
                ) : (
                  <IconUpload className="size-3" />
                )}
                <span>Replace</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onChange("")}
                disabled={disabled || isUploading}
                className="h-7 text-xs text-muted-foreground hover:text-destructive cursor-pointer"
              >
                <IconX className="size-3" />
                <span>Remove</span>
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* Dropzone Upload Area */
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
          className={`p-4 rounded-xl border-2 border-dashed text-center transition-all cursor-pointer ${
            isDragOver
              ? "border-primary bg-primary/5 ring-2 ring-primary/20"
              : "border-border/80 hover:border-primary/60 hover:bg-muted/30"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <div className="flex flex-col items-center justify-center space-y-1.5">
            <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              {isUploading ? (
                <IconLoader2 className="size-5 animate-spin" />
              ) : (
                <IconPhoto className="size-5" />
              )}
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">
                {isUploading ? "Uploading File..." : "Click or drag file to upload"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                JPG, PNG, WEBP, SVG or GIF up to {maxSizeMb}MB
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={allowedTypes.join(",")}
        onChange={handleFileChange}
        disabled={disabled || isUploading}
        className="hidden"
      />

      {/* Direct URL text input fallback */}
      <div className="relative">
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-8 text-xs font-mono pr-8"
          disabled={disabled || isUploading}
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
          >
            <IconX className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
