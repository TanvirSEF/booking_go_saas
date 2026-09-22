"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  IconHelp,
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
  updateFaqSectionAction,
  resetLandingPageSectionAction,
  toggleLandingPageSectionAction,
} from "@/actions/landing-page";
import type { IFaqSetting, IFaqItem } from "@/types/landing-page";

interface FaqTabProps {
  initialData: IFaqSetting;
}

export function FaqTab({ initialData }: FaqTabProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<IFaqSetting>({
    status: initialData?.status ?? true,
    title: initialData?.title || "FAQ",
    heading: initialData?.heading || "Frequently Asked Questions",
    description:
      initialData?.description ||
      "Find answers to common questions regarding BookingGo SaaS platform features and setup.",
    items: initialData?.items || [],
  });

  const [isPending, setIsPending] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  const handleToggleStatus = async (newStatus: boolean) => {
    setFormData((prev) => ({ ...prev, status: newStatus }));
    try {
      setIsToggling(true);
      const res = await toggleLandingPageSectionAction("faq", newStatus);
      if (res.success) {
        toast.success(`FAQ section ${newStatus ? "enabled" : "disabled"} successfully.`);
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

  // FAQ Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [faqForm, setFaqForm] = useState<IFaqItem>({
    id: "",
    question: "",
    answer: "",
  });

  const handleOpenAdd = () => {
    setEditingIndex(null);
    setFaqForm({
      id: "faq-" + Date.now(),
      question: "",
      answer: "",
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (index: number) => {
    setEditingIndex(index);
    setFaqForm({ ...formData.items[index] });
    setModalOpen(true);
  };

  const handleSaveFaq = (e: React.FormEvent) => {
    e.preventDefault();
    if (!faqForm.question.trim() || !faqForm.answer.trim()) {
      toast.error("Both question and answer are required.");
      return;
    }

    const updated = [...formData.items];
    if (editingIndex !== null) {
      updated[editingIndex] = faqForm;
    } else {
      updated.push(faqForm);
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
      const res = await updateFaqSectionAction(formData);
      if (res.success) {
        toast.success(res.message || "FAQ section updated successfully.");
        router.refresh();
      } else {
        toast.error(res.message || "Failed to update FAQ.");
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
      const res = await resetLandingPageSectionAction("faq");
      if (res.success) {
        toast.success("FAQ section restored to factory default.");
        router.refresh();
      } else {
        toast.error(res.message || "Failed to reset FAQ.");
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
            <IconHelp className="size-5 text-primary" />
            <span>FAQ (Frequently Asked Questions) Setting</span>
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Manage accordion Q&A entries, troubleshooting help, and common onboarding questions.
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
                FAQ Section Visibility
              </Label>
              <p className="text-xs text-muted-foreground">
                Display the collapsible FAQ accordion on the public marketing page.
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
              <Label htmlFor="faq-title" className="text-xs font-semibold text-foreground">
                Section Category Label
              </Label>
              <Input
                id="faq-title"
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="FAQ"
                className="text-xs h-9"
                disabled={!formData.status || isPending}
              />
            </div>

            {/* Heading */}
            <div className="space-y-1.5">
              <Label htmlFor="faq-heading" className="text-xs font-semibold text-foreground">
                Main Headline
              </Label>
              <Input
                id="faq-heading"
                value={formData.heading}
                onChange={(e) => setFormData((prev) => ({ ...prev, heading: e.target.value }))}
                placeholder="Frequently Asked Questions"
                className="text-xs h-9"
                disabled={!formData.status || isPending}
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="faq-desc" className="text-xs font-semibold text-foreground">
              Description
            </Label>
            <Textarea
              id="faq-desc"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Find answers to common questions regarding BookingGo..."
              rows={2}
              className="text-xs"
              disabled={!formData.status || isPending}
            />
          </div>

          {/* FAQ Items Manager */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold text-foreground">
                Questions & Answers ({formData.items.length})
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
                <span>Add Question</span>
              </Button>
            </div>

            <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="w-12 font-semibold text-xs text-foreground">#</TableHead>
                    <TableHead className="font-semibold text-xs text-foreground">Question</TableHead>
                    <TableHead className="hidden md:table-cell font-semibold text-xs text-foreground">
                      Answer
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
                        No FAQ items configured. Click &ldquo;Add Question&rdquo; above.
                      </TableCell>
                    </TableRow>
                  ) : (
                    formData.items.map((item, idx) => (
                      <TableRow key={item.id || idx}>
                        <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell className="font-medium text-xs text-foreground">{item.question}</TableCell>
                        <TableCell className="hidden md:table-cell text-xs text-muted-foreground line-clamp-1 max-w-sm">
                          {item.answer}
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
              <span>Save FAQ Section</span>
            </Button>
          </div>
        </form>
      </CardContent>

      {/* Add / Edit FAQ Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">
              {editingIndex !== null ? "Edit Question" : "Add Question"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Define the question title and helpful detailed answer.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveFaq} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Question <span className="text-destructive">*</span>
              </Label>
              <Input
                value={faqForm.question}
                onChange={(e) => setFaqForm((prev) => ({ ...prev, question: e.target.value }))}
                placeholder="e.g. Can clients pay online when booking an appointment?"
                className="text-xs h-9"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Answer <span className="text-destructive">*</span>
              </Label>
              <Textarea
                value={faqForm.answer}
                onChange={(e) => setFaqForm((prev) => ({ ...prev, answer: e.target.value }))}
                placeholder="Explain clearly how this feature works..."
                rows={4}
                className="text-xs"
                required
              />
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
                {editingIndex !== null ? "Update Question" : "Add Question"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
