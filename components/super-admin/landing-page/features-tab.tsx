"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  IconListDetails,
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
  updateFeaturesSectionAction,
  resetLandingPageSectionAction,
  toggleLandingPageSectionAction,
} from "@/actions/landing-page";
import type { IFeaturesSetting, IFeatureCard } from "@/types/landing-page";

interface FeaturesTabProps {
  initialData: IFeaturesSetting;
}

export function FeaturesTab({ initialData }: FeaturesTabProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<IFeaturesSetting>({
    status: initialData?.status ?? true,
    title: initialData?.title || "Features",
    heading: initialData?.heading || "Streamlined Booking & Operations for Growing Businesses",
    description:
      initialData?.description ||
      "BookingGo SaaS simplifies the booking lifecycle, allowing businesses to efficiently manage appointments, schedules, and staff.",
    buyNowLink: initialData?.buyNowLink || "",
    cards: initialData?.cards || [],
  });

  const [isPending, setIsPending] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  const handleToggleStatus = async (newStatus: boolean) => {
    setFormData((prev) => ({ ...prev, status: newStatus }));
    try {
      setIsToggling(true);
      const res = await toggleLandingPageSectionAction("features", newStatus);
      if (res.success) {
        toast.success(`Features section ${newStatus ? "enabled" : "disabled"} successfully.`);
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
  const [cardForm, setCardForm] = useState<IFeatureCard>({
    id: "",
    logo: "calendar",
    heading: "",
    description: "",
    link: "#",
    buttonText: "Find Out More",
  });

  const handleOpenAddCard = () => {
    setEditingCardIndex(null);
    setCardForm({
      id: "feat-" + Date.now(),
      logo: "calendar",
      heading: "",
      description: "",
      link: "#",
      buttonText: "Find Out More",
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
    try {
      setIsPending(true);
      const res = await updateFeaturesSectionAction(formData);
      if (res.success) {
        toast.success(res.message || "Features section updated successfully.");
        router.refresh();
      } else {
        toast.error(res.message || "Failed to update features.");
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
      const res = await resetLandingPageSectionAction("features");
      if (res.success) {
        toast.success("Features section restored to factory default.");
        router.refresh();
      } else {
        toast.error(res.message || "Failed to reset features.");
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
            <IconListDetails className="size-5 text-primary" />
            <span>Features Section Setting</span>
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Manage section copy and feature cards showcasing core booking management capabilities.
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
                Features Section Visibility
              </Label>
              <p className="text-xs text-muted-foreground">
                Enable or hide the features grid on the marketing page.
              </p>
            </div>
            <Switch
              checked={formData.status}
              onCheckedChange={handleToggleStatus}
              disabled={isToggling}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="features-title" className="text-xs font-semibold text-foreground">
                Section Category Label
              </Label>
              <Input
                id="features-title"
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Features"
                className="text-xs h-9"
                disabled={!formData.status || isPending}
              />
            </div>

            {/* Heading */}
            <div className="space-y-1.5">
              <Label htmlFor="features-heading" className="text-xs font-semibold text-foreground">
                Main Headline
              </Label>
              <Input
                id="features-heading"
                value={formData.heading}
                onChange={(e) => setFormData((prev) => ({ ...prev, heading: e.target.value }))}
                placeholder="Streamlined Booking & Operations..."
                className="text-xs h-9"
                disabled={!formData.status || isPending}
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="features-desc" className="text-xs font-semibold text-foreground">
              Description
            </Label>
            <Textarea
              id="features-desc"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="BookingGo SaaS simplifies the booking lifecycle..."
              rows={2}
              className="text-xs"
              disabled={!formData.status || isPending}
            />
          </div>

          {/* Cards Manager */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold text-foreground">
                Feature Cards ({formData.cards.length})
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
                <span>Add Feature Card</span>
              </Button>
            </div>

            <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="w-16 font-semibold text-xs text-foreground">Icon</TableHead>
                    <TableHead className="font-semibold text-xs text-foreground">Card Title</TableHead>
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
                        No feature cards defined. Click &ldquo;Add Feature Card&rdquo; above.
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
              <span>Save Features Section</span>
            </Button>
          </div>
        </form>
      </CardContent>

      {/* Add / Edit Card Modal */}
      <Dialog open={cardModalOpen} onOpenChange={setCardModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">
              {editingCardIndex !== null ? "Edit Feature Card" : "Add Feature Card"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Define the card icon keyword, heading, description, and link.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveCard} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Icon Keyword</Label>
              <Input
                value={cardForm.logo}
                onChange={(e) => setCardForm((prev) => ({ ...prev, logo: e.target.value }))}
                placeholder="calendar, users, chart, clock, shield"
                className="text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Card Heading <span className="text-destructive">*</span>
              </Label>
              <Input
                value={cardForm.heading}
                onChange={(e) => setCardForm((prev) => ({ ...prev, heading: e.target.value }))}
                placeholder="e.g. Streamlined Booking Management"
                className="text-xs h-9"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Description</Label>
              <Textarea
                value={cardForm.description}
                onChange={(e) => setCardForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Brief summary of this feature..."
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
                  placeholder="Find Out More"
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
                {editingCardIndex !== null ? "Update Card" : "Add Card"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
