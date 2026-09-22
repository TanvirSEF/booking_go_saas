"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  IconStar,
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
  updateReviewsSectionAction,
  resetLandingPageSectionAction,
  toggleLandingPageSectionAction,
} from "@/actions/landing-page";
import type { IReviewsSetting, IReviewItem } from "@/types/landing-page";

interface ReviewsTabProps {
  initialData: IReviewsSetting;
}

export function ReviewsTab({ initialData }: ReviewsTabProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<IReviewsSetting>({
    status: initialData?.status ?? true,
    items: initialData?.items || [],
  });

  const [isPending, setIsPending] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  const handleToggleStatus = async (newStatus: boolean) => {
    setFormData((prev) => ({ ...prev, status: newStatus }));
    try {
      setIsToggling(true);
      const res = await toggleLandingPageSectionAction("reviews", newStatus);
      if (res.success) {
        toast.success(`Reviews section ${newStatus ? "enabled" : "disabled"} successfully.`);
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

  // Review modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [reviewForm, setReviewForm] = useState<IReviewItem>({
    id: "",
    tag: "SOLID FOUNDATION",
    heading: "",
    description: "",
    link: "/login",
    buttonText: "View Live Demo",
  });

  const handleOpenAdd = () => {
    setEditingIndex(null);
    setReviewForm({
      id: "rev-" + Date.now(),
      tag: "SOLID FOUNDATION",
      heading: "",
      description: "",
      link: "/login",
      buttonText: "View Live Demo",
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (index: number) => {
    setEditingIndex(index);
    setReviewForm({ ...formData.items[index] });
    setModalOpen(true);
  };

  const handleSaveReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewForm.heading.trim() || !reviewForm.description.trim()) {
      toast.error("Both heading and review body are required.");
      return;
    }

    const updated = [...formData.items];
    if (editingIndex !== null) {
      updated[editingIndex] = reviewForm;
    } else {
      updated.push(reviewForm);
    }

    setFormData((prev) => ({ ...prev, items: updated }));
    setModalOpen(false);
  };

  const handleDelete = (index: number) => {
    const updated = formData.items.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, items: updated }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsPending(true);
      const res = await updateReviewsSectionAction(formData);
      if (res.success) {
        toast.success(res.message || "Reviews section updated successfully.");
        router.refresh();
      } else {
        toast.error(res.message || "Failed to update reviews.");
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
      const res = await resetLandingPageSectionAction("reviews");
      if (res.success) {
        toast.success("Reviews restored to factory default.");
        router.refresh();
      } else {
        toast.error(res.message || "Failed to reset reviews.");
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
            <IconStar className="size-5 text-primary" />
            <span>Reviews & Testimonials Setting</span>
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Manage customer feedback, testimonials, trust rating badges, and review cards.
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
                Reviews Section Visibility
              </Label>
              <p className="text-xs text-muted-foreground">
                Display the client reviews & ratings carousel on the marketing page.
              </p>
            </div>
            <Switch
              checked={formData.status}
              onCheckedChange={handleToggleStatus}
              disabled={isToggling}
            />
          </div>

          {/* Testimonials List Manager */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold text-foreground">
                Customer Testimonials ({formData.items.length})
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleOpenAdd}
                disabled={!formData.status || isPending}
                className="h-8 text-xs gap-1"
              >
                <IconPlus className="size-3.5" />
                <span>Add Review</span>
              </Button>
            </div>

            <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="w-32 font-semibold text-xs text-foreground">Tag Badge</TableHead>
                    <TableHead className="font-semibold text-xs text-foreground">Heading</TableHead>
                    <TableHead className="hidden md:table-cell font-semibold text-xs text-foreground">
                      Review Body
                    </TableHead>
                    <TableHead className="text-right w-24 font-semibold text-xs text-foreground">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {formData.items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-6 text-xs text-muted-foreground">
                        No testimonials added yet. Click &ldquo;Add Review&rdquo; above.
                      </TableCell>
                    </TableRow>
                  ) : (
                    formData.items.map((item, idx) => (
                      <TableRow key={item.id || idx}>
                        <TableCell>
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-primary/10 text-primary uppercase">
                            {item.tag}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium text-xs text-foreground">{item.heading}</TableCell>
                        <TableCell className="hidden md:table-cell text-xs text-muted-foreground line-clamp-1 max-w-sm">
                          {item.description}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEdit(idx)}
                              className="size-7 text-muted-foreground hover:text-foreground"
                            >
                              <IconPencil className="size-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(idx)}
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
              <span>Save Reviews</span>
            </Button>
          </div>
        </form>
      </CardContent>

      {/* Add / Edit Review Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">
              {editingIndex !== null ? "Edit Testimonial" : "Add Testimonial"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Define customer quote, rating badge, and review headline.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveReview} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Badge Tag</Label>
              <Input
                value={reviewForm.tag}
                onChange={(e) => setReviewForm((prev) => ({ ...prev, tag: e.target.value }))}
                placeholder="e.g. SOLID FOUNDATION or HIGH CONVERSION"
                className="text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Headline <span className="text-destructive">*</span>
              </Label>
              <Input
                value={reviewForm.heading}
                onChange={(e) => setReviewForm((prev) => ({ ...prev, heading: e.target.value }))}
                placeholder="e.g. Transformed our client booking efficiency overnight"
                className="text-xs h-9"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Testimonial Body <span className="text-destructive">*</span>
              </Label>
              <Textarea
                value={reviewForm.description}
                onChange={(e) => setReviewForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="What the client said about BookingGo..."
                rows={4}
                className="text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Button Text</Label>
                <Input
                  value={reviewForm.buttonText}
                  onChange={(e) => setReviewForm((prev) => ({ ...prev, buttonText: e.target.value }))}
                  placeholder="View Live Demo"
                  className="text-xs h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Destination Link</Label>
                <Input
                  value={reviewForm.link}
                  onChange={(e) => setReviewForm((prev) => ({ ...prev, link: e.target.value }))}
                  placeholder="/login"
                  className="text-xs h-9"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" className="text-xs">
                {editingIndex !== null ? "Update Review" : "Add Review"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
