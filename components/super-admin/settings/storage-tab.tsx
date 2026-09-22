"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  IconCloudUpload,
  IconLoader2,
  IconDeviceFloppy,
  IconEye,
  IconEyeOff,
} from "@tabler/icons-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateSystemSettingsGroupAction } from "@/actions/system-settings";
import { ResetGroupDialog } from "./reset-group-dialog";

interface StorageTabProps {
  initialData: Record<string, string>;
}

export function StorageTab({ initialData }: StorageTabProps) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    storage_type: (initialData.storage_type as "local" | "s3" | "wasabi") || "local",
    s3_key: initialData.s3_key || "",
    s3_secret: initialData.s3_secret || "",
    s3_region: initialData.s3_region || "us-east-1",
    s3_bucket: initialData.s3_bucket || "",
    s3_url: initialData.s3_url || "",
    s3_endpoint: initialData.s3_endpoint || "",
    max_upload_size_mb: initialData.max_upload_size_mb || "10",
  });
  const [showSecret, setShowSecret] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const isCloudStorage = formData.storage_type === "s3" || formData.storage_type === "wasabi";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsPending(true);
      const res = await updateSystemSettingsGroupAction("storage", formData);

      if (res.success) {
        toast.success(res.message || "Storage configuration saved successfully!");
        router.refresh();
      } else {
        toast.error(res.error || "Failed to update storage settings.");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred while saving storage configuration.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Card className="rounded-xl border-border bg-card shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border/60 pb-4">
        <div>
          <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
            <IconCloudUpload className="size-5 text-primary" />
            File Storage & Upload Configuration
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground mt-1">
            Choose storage engine for attachments, invoices, and company media assets.
          </CardDescription>
        </div>
        <ResetGroupDialog group="storage" groupLabel="Storage" />
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Storage Type */}
            <div className="space-y-1.5">
              <Label htmlFor="storage_type" className="text-xs font-semibold">
                Active Storage Driver
              </Label>
              <Select
                value={formData.storage_type}
                onValueChange={(val: "local" | "s3" | "wasabi") =>
                  setFormData({ ...formData, storage_type: val })
                }
                disabled={isPending}
              >
                <SelectTrigger id="storage_type" className="h-9 text-xs w-full">
                  <SelectValue placeholder="Driver" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="local" className="text-xs">
                    Local Filesystem (/public/uploads)
                  </SelectItem>
                  <SelectItem value="s3" className="text-xs">
                    Amazon Web Services (AWS S3)
                  </SelectItem>
                  <SelectItem value="wasabi" className="text-xs">
                    Wasabi Cloud Storage
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Max Upload Size */}
            <div className="space-y-1.5">
              <Label htmlFor="max_upload_size_mb" className="text-xs font-semibold">
                Max Upload Limit (MB)
              </Label>
              <Input
                id="max_upload_size_mb"
                type="number"
                min={1}
                max={500}
                value={formData.max_upload_size_mb}
                onChange={(e) =>
                  setFormData({ ...formData, max_upload_size_mb: e.target.value })
                }
                placeholder="10"
                className="h-9 text-xs"
                disabled={isPending}
              />
            </div>

            {/* Cloud specific fields */}
            {isCloudStorage && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="s3_key" className="text-xs font-semibold">
                    Access Key ID
                  </Label>
                  <Input
                    id="s3_key"
                    value={formData.s3_key}
                    onChange={(e) => setFormData({ ...formData, s3_key: e.target.value })}
                    placeholder="AKIA..."
                    className="h-9 text-xs font-mono"
                    disabled={isPending}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="s3_secret" className="text-xs font-semibold">
                    Secret Access Key
                  </Label>
                  <div className="relative">
                    <Input
                      id="s3_secret"
                      type={showSecret ? "text" : "password"}
                      value={formData.s3_secret}
                      onChange={(e) =>
                        setFormData({ ...formData, s3_secret: e.target.value })
                      }
                      placeholder="••••••••"
                      className="h-9 text-xs font-mono pr-9"
                      disabled={isPending}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                    >
                      {showSecret ? (
                        <IconEyeOff className="size-4" />
                      ) : (
                        <IconEye className="size-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="s3_region" className="text-xs font-semibold">
                    Bucket Region
                  </Label>
                  <Input
                    id="s3_region"
                    value={formData.s3_region}
                    onChange={(e) =>
                      setFormData({ ...formData, s3_region: e.target.value })
                    }
                    placeholder="us-east-1"
                    className="h-9 text-xs font-mono"
                    disabled={isPending}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="s3_bucket" className="text-xs font-semibold">
                    Bucket Name
                  </Label>
                  <Input
                    id="s3_bucket"
                    value={formData.s3_bucket}
                    onChange={(e) =>
                      setFormData({ ...formData, s3_bucket: e.target.value })
                    }
                    placeholder="my-bookinggo-storage"
                    className="h-9 text-xs font-mono"
                    disabled={isPending}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="s3_endpoint" className="text-xs font-semibold">
                    Custom S3 Endpoint (Wasabi / MinIO)
                  </Label>
                  <Input
                    id="s3_endpoint"
                    value={formData.s3_endpoint}
                    onChange={(e) =>
                      setFormData({ ...formData, s3_endpoint: e.target.value })
                    }
                    placeholder="https://s3.wasabisys.com"
                    className="h-9 text-xs font-mono"
                    disabled={isPending}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="s3_url" className="text-xs font-semibold">
                    Custom Public CDN URL
                  </Label>
                  <Input
                    id="s3_url"
                    value={formData.s3_url}
                    onChange={(e) => setFormData({ ...formData, s3_url: e.target.value })}
                    placeholder="https://cdn.yourdomain.com"
                    className="h-9 text-xs font-mono"
                    disabled={isPending}
                  />
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={isPending}
              className="text-xs h-9 gap-1.5"
            >
              {isPending ? (
                <IconLoader2 className="size-4 animate-spin" />
              ) : (
                <IconDeviceFloppy className="size-4" />
              )}
              {isPending ? "Saving..." : "Save Storage Settings"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
