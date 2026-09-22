"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  IconSparkles,
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
  updateHighlightSectionAction,
  resetLandingPageSectionAction,
  toggleLandingPageSectionAction,
} from "@/actions/landing-page";
import type { IHighlightSetting, IHighlightCard } from "@/types/landing-page";

interface HighlightTabProps {
  initialData: IHighlightSetting;
}

export function HighlightTab({ initialData }: HighlightTabProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<IHighlightSetting>({
    status: initialData?.status ?? true,
    heading:
      initialData?.heading || "Why Choose Dedicated Modules for Your Business?",
    description:
      initialData?.description ||
      "With BookingGo, you can conveniently manage all your business functions from a single unified hub.",
    image: initialData?.image || "/images/landing/dedicated.png",
    cards: initialData?.cards || [],
  });

  const [isPending, setIsPending] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  const handleToggleStatus = async (newStatus: boolean) => {
    setFormData((prev) => ({ ...prev, status: newStatus }));
    try {
      setIsToggling(true);
      const res = await toggleLandingPageSectionAction("highlight", newStatus);
      if (res.success) {
        toast.success(`Highlight section ${newStatus ? "enabled" : "disabled"} successfully.`);
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

  // Card modal state
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [editingCardIndex, setEditingCardIndex] = useState<number | null>(null);
  const [cardForm, setCardForm] = useState<IHighlightCard>({
    id: "",
    logo: "camera",
    heading: "",
    description: "",
    link: "#",
    buttonText: "Explore Theme",
  });

  const handleOpenAddCard = () => {
    setEditingCardIndex(null);
    setCardForm({
      id: "high-" + Date.now(),
      logo: "camera",
      heading: "",
      description: "",
      link: "#",
      buttonText: "Explore Theme",
    });
    setCardModalOpen(true);
  };

  const handleOpenEditCard = (index: number) => {
    setEditingCardIndex(index);
    setCardForm({ ...formData.cards[index] });
    setCardModalOpen(true);
  };

  const handleSaveCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardForm.heading.trim()) {
      toast.error("Card heading is required.");
      return;
    }

    const updatedCards = [...formData.cards];
    if (editingCardIndex !== null) {
      updatedCards[editingCardIndex] = cardForm;
    } else {
      updatedCards.push(cardForm);
    }

    setFormData((prev) => ({ ...prev, cards: updatedCards }));
    setCardModalOpen(false);
  };

  const handleDeleteCard = (index: number) => {
    const updatedCards = formData.cards.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, cards: updatedCards }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.heading.trim()) {
      toast.error("Section heading is required.");
      return;
    }

    try {
      setIsPending(true);
      const res = await updateHighlightSectionAction(formData);
      if (res.success) {
        toast.success(res.message || "Dedicated modules section updated successfully.");
        router.refresh();
      } else {
        toast.error(res.message || "Failed to update highlight section.");
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
      const res = await resetLandingPageSectionAction("highlight");
      if (res.success) {
        toast.success("Highlight section restored to factory default.");
        router.refresh();
      } else {
        toast.error(res.message || "Failed to reset highlight section.");
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
            <IconSparkles className="size-5 text-primary" />
            <span>Dedicated Modules (Highlight) Setting</span>
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Configure the dedicated industry themes and specialized modules section (e.g. Photography, Car Services, Custom Status).
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
                Highlight Section Visibility
              </Label>
              <p className="text-xs text-muted-foreground">
                Display the dedicated modules showcase on the public landing page.
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
            <Label htmlFor="high-heading" className="text-xs font-semibold text-foreground">
              Main Headline <span className="text-destructive">*</span>
            </Label>
            <Input
              id="high-heading"
              value={formData.heading}
              onChange={(e) => setFormData((prev) => ({ ...prev, heading: e.target.value }))}
              placeholder="Why Choose Dedicated Modules for Your Business?"
              className="text-xs h-9"
              required
              disabled={!formData.status || isPending}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="high-desc" className="text-xs font-semibold text-foreground">
              Description
            </Label>
            <Textarea
              id="high-desc"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="With BookingGo, you can conveniently manage all your business functions..."
              rows={2}
              className="text-xs"
              disabled={!formData.status || isPending}
            />
          </div>

          {/* Graphic Preview Uploader */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground">
              Side Graphic / Preview Illustration
            </Label>
            <MediaUploader
              value={formData.image}
              onChange={(url) => setFormData((prev) => ({ ...prev, image: url }))}
              folder="general"
              placeholder="Upload graphic or enter image URL"
              disabled={!formData.status || isPending}
              aspectRatio="square"
            />
          </div>

          {/* Cards Manager */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold text-foreground">
                Dedicated Module Cards ({formData.cards.length})
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleOpenAddCard}
                disabled={!formData.status || isPending}
                className="h-8 text-xs gap-1"
              >
                <IconPlus className="size-3.5" />
                <span>Add Module Card</span>
              </Button>
            </div>

            <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="w-16 font-semibold text-xs text-foreground">Icon</TableHead>
                    <TableHead className="font-semibold text-xs text-foreground">Module Title</TableHead>
                    <TableHead className="hidden md:table-cell font-semibold text-xs text-foreground">
                      Description
                    </TableHead>
                    <TableHead className="text-right w-24 font-semibold text-xs text-foreground">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {formData.cards.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-6 text-xs text-muted-foreground">
                        No module cards defined. Click &ldquo;Add Module Card&rdquo; above.
                      </TableCell>
                    </TableRow>
                  ) : (
                    formData.cards.map((card, idx) => (
                      <TableRow key={card.id || idx}>
                        <TableCell className="font-mono text-xs text-primary">{card.logo || "•"}</TableCell>
                        <TableCell className="font-medium text-xs text-foreground">{card.heading}</TableCell>
                        <TableCell className="hidden md:table-cell text-xs text-muted-foreground line-clamp-1 max-w-sm">
                          {card.description}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEditCard(idx)}
                              className="size-7 text-muted-foreground hover:text-foreground"
                            >
                              <IconPencil className="size-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteCard(idx)}
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
              <span>Save Dedicated Modules</span>
            </Button>
          </div>
        </form>
      </CardContent>

      {/* Add / Edit Card Modal */}
      <Dialog open={cardModalOpen} onOpenChange={setCardModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">
              {editingCardIndex !== null ? "Edit Module Card" : "Add Module Card"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Define the module icon keyword, title, description, and action link.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveCard} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Icon Keyword</Label>
              <Input
                value={cardForm.logo}
                onChange={(e) => setCardForm((prev) => ({ ...prev, logo: e.target.value }))}
                placeholder="camera, tool, tag, clock, sparkles"
                className="text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Module Heading <span className="text-destructive">*</span>
              </Label>
              <Input
                value={cardForm.heading}
                onChange={(e) => setCardForm((prev) => ({ ...prev, heading: e.target.value }))}
                placeholder="e.g. Photography Studio Business Theme"
                className="text-xs h-9"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Description</Label>
              <Textarea
                value={cardForm.description}
                onChange={(e) => setCardForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Brief summary of this dedicated module..."
                rows={3}
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Button Text</Label>
                <Input
                  value={cardForm.buttonText}
                  onChange={(e) => setCardForm((prev) => ({ ...prev, buttonText: e.target.value }))}
                  placeholder="Explore Theme"
                  className="text-xs h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Destination Link</Label>
                <Input
                  value={cardForm.link}
                  onChange={(e) => setCardForm((prev) => ({ ...prev, link: e.target.value }))}
                  placeholder="#"
                  className="text-xs h-9"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCardModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" className="text-xs">
                {editingCardIndex !== null ? "Update Module" : "Add Module"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
