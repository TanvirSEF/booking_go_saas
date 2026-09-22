"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  IconDeviceDesktop,
  IconPlus,
  IconPencil,
  IconTrash,
  IconLoader2,
  IconDeviceFloppy,
  IconRotateClockwise,
} from "@tabler/icons-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { MediaUploader } from "@/components/shared/media-uploader";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  updateScreenshotsSectionAction,
  resetLandingPageSectionAction,
  toggleLandingPageSectionAction,
} from "@/actions/landing-page";
import type { IScreenshotsSetting, IScreenshotItem } from "@/types/landing-page";

interface ScreenshotsTabProps {
  initialData: IScreenshotsSetting;
}

export function ScreenshotsTab({ initialData }: ScreenshotsTabProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<IScreenshotsSetting>({
    status: initialData?.status ?? true,
    heading: initialData?.heading || "Explore Our Intuitive Interface",
    description:
      initialData?.description ||
      "Engineered for clarity and speed. Manage bookings, services, and staff from desktop or mobile effortlessly.",
    items: initialData?.items || [],
  });

  const [isPending, setIsPending] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  const handleToggleStatus = async (newStatus: boolean) => {
    setFormData((prev) => ({ ...prev, status: newStatus }));
    try {
      setIsToggling(true);
      const res = await toggleLandingPageSectionAction("screenshots", newStatus);
      if (res.success) {
        toast.success(`Screenshots section ${newStatus ? "enabled" : "disabled"} successfully.`);
        router.refresh();
      } else {
        toast.error(res.message || "Failed to toggle status.");
        setFormData((prev) => ({ ...prev, status: !newStatus }));
      }
    } catch {
      toast.error("Failed to update status.");
      setFormData((prev) => ({ ...prev, status: !newStatus }));
    } finally {
      setIsToggling(false);
    }
  };

  // Item modal state
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [itemForm, setItemForm] = useState<IScreenshotItem>({
    id: "",
    image: "",
    heading: "",
  });

  const handleOpenAddItem = () => {
    setEditingItemIndex(null);
    setItemForm({
      id: "screen-" + Date.now(),
      image: "",
      heading: "",
    });
    setItemModalOpen(true);
  };

  const handleOpenEditItem = (index: number) => {
    setEditingItemIndex(index);
    setItemForm({ ...formData.items[index] });
    setItemModalOpen(true);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemForm.heading.trim()) {
      toast.error("Screenshot caption / title is required.");
      return;
    }
    if (!itemForm.image.trim()) {
      toast.error("Screenshot image is required.");
      return;
    }

    const updatedItems = [...formData.items];
    if (editingItemIndex !== null) {
      updatedItems[editingItemIndex] = itemForm;
    } else {
      updatedItems.push(itemForm);
    }

    setFormData((prev) => ({ ...prev, items: updatedItems }));
    setItemModalOpen(false);
  };

  const handleDeleteItem = (index: number) => {
    const updatedItems = formData.items.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, items: updatedItems }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsPending(true);
      const res = await updateScreenshotsSectionAction(formData);
      if (res.success) {
        toast.success(res.message || "Screenshots section updated successfully.");
        router.refresh();
      } else {
        toast.error(res.message || "Failed to update screenshots.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsPending(false);
    }
  };

  const handleReset = async () => {
    try {
      setIsResetting(true);
      const res = await resetLandingPageSectionAction("screenshots");
      if (res.success) {
        toast.success("Screenshots section restored to factory default.");
        router.refresh();
      } else {
        toast.error(res.message || "Failed to reset screenshots.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reset failed.");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <Card className="rounded-xl border border-border bg-card shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border/60">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <IconDeviceDesktop className="size-5 text-primary" />
            <span>Screenshots & UI Showcase Setting</span>
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Manage high-resolution screenshots and preview slides showcasing dashboards, booking wizard, and calendar views.
          </CardDescription>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleReset}
          disabled={isResetting || isPending}
          className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-destructive hover:border-destructive/40"
        >
          {isResetting ? (
            <IconLoader2 className="size-3.5 animate-spin" />
          ) : (
            <IconRotateClockwise className="size-3.5" />
          )}
          <span>Reset Default</span>
        </Button>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
          {/* Status Toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/30">
            <div className="space-y-0.5">
              <Label className="text-sm font-semibold text-foreground">
                Screenshots Section Visibility
              </Label>
              <p className="text-xs text-muted-foreground">
                Display the screenshots gallery slider on the public landing page.
              </p>
            </div>
            <Switch
              checked={formData.status}
              onCheckedChange={handleToggleStatus}
              disabled={isToggling}
            />
          </div>

          {/* Heading */}
          <div className="space-y-1.5">
            <Label htmlFor="screen-heading" className="text-xs font-semibold text-foreground">
              Main Headline
            </Label>
            <Input
              id="screen-heading"
              value={formData.heading}
              onChange={(e) => setFormData((prev) => ({ ...prev, heading: e.target.value }))}
              placeholder="Explore Our Intuitive Interface"
              className="text-xs h-9"
              disabled={!formData.status || isPending}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="screen-desc" className="text-xs font-semibold text-foreground">
              Description
            </Label>
            <Textarea
              id="screen-desc"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Engineered for clarity and speed..."
              rows={2}
              className="text-xs"
              disabled={!formData.status || isPending}
            />
          </div>

          {/* Screenshots List Manager */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold text-foreground">
                Screenshot Slides ({formData.items.length})
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleOpenAddItem}
                disabled={!formData.status || isPending}
                className="h-8 text-xs gap-1"
              >
                <IconPlus className="size-3.5" />
                <span>Add Screenshot</span>
              </Button>
            </div>

            <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="w-20 font-semibold text-xs text-foreground">Image</TableHead>
                    <TableHead className="font-semibold text-xs text-foreground">Caption / Title</TableHead>
                    <TableHead className="text-right w-24 font-semibold text-xs text-foreground">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {formData.items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-6 text-xs text-muted-foreground">
                        No screenshots added yet. Click &ldquo;Add Screenshot&rdquo; above.
                      </TableCell>
                    </TableRow>
                  ) : (
                    formData.items.map((item, idx) => (
                      <TableRow key={item.id || idx}>
                        <TableCell>
                          <div className="size-10 rounded-md border border-border overflow-hidden bg-muted flex items-center justify-center">
                            {item.image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={item.image}
                                alt={item.heading}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <IconDeviceDesktop className="size-4 text-muted-foreground" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-xs text-foreground">{item.heading}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEditItem(idx)}
                              className="size-7 text-muted-foreground hover:text-foreground"
                            >
                              <IconPencil className="size-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteItem(idx)}
                              className="size-7 text-destructive hover:bg-destructive/10"
                            >
                              <IconTrash className="size-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <Button
              type="submit"
              size="sm"
              disabled={isPending}
              className="gap-2 h-9 text-xs px-5 shadow-xs"
            >
              {isPending ? (
                <IconLoader2 className="size-3.5 animate-spin" />
              ) : (
                <IconDeviceFloppy className="size-3.5" />
              )}
              <span>Save Screenshots</span>
            </Button>
          </div>
        </form>
      </CardContent>

      {/* Add / Edit Screenshot Modal */}
      <Dialog open={itemModalOpen} onOpenChange={setItemModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">
              {editingItemIndex !== null ? "Edit Screenshot" : "Add Screenshot"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Provide a caption and upload a high-resolution screenshot.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveItem} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Caption / Title <span className="text-destructive">*</span>
              </Label>
              <Input
                value={itemForm.heading}
                onChange={(e) => setItemForm((prev) => ({ ...prev, heading: e.target.value }))}
                placeholder="e.g. Executive Dashboard & Analytics"
                className="text-xs h-9"
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">
                Screenshot Image <span className="text-destructive">*</span>
              </Label>
              <MediaUploader
                value={itemForm.image}
                onChange={(url) => setItemForm((prev) => ({ ...prev, image: url }))}
                folder="general"
                placeholder="Upload screenshot or enter image URL"
                aspectRatio="banner"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setItemModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" className="text-xs">
                {editingItemIndex !== null ? "Update Screenshot" : "Add Screenshot"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
