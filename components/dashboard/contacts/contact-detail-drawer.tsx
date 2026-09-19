"use client";

import * as React from "react";
import {
  IconArchive,
  IconCheck,
  IconClock,
  IconMail,
  IconMessage,
  IconNotes,
  IconPhone,
  IconSparkles,
  IconTrash,
  IconUser,
} from "@tabler/icons-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  getContactInquiryByIdAction,
  updateContactInquiryStatusAction,
  deleteContactInquiryAction,
} from "@/actions/contact-us";
import type { ContactInquiryDTO, ContactInquiryStatus } from "@/types/contact-us";

interface ContactDetailDrawerProps {
  inquiry: ContactInquiryDTO | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}

interface DrawerFormProps {
  initialInquiry: ContactInquiryDTO;
  onClose: () => void;
  onUpdated: () => void;
}

function DrawerDetailForm({ initialInquiry, onClose, onUpdated }: DrawerFormProps) {
  const [inquiry, setInquiry] = React.useState<ContactInquiryDTO>(initialInquiry);
  const [notes, setNotes] = React.useState<string>(initialInquiry.replyNotes || "");
  const [isUpdating, setIsUpdating] = React.useState<boolean>(false);
  const [isDeleting, setIsDeleting] = React.useState<boolean>(false);

  // Auto-mark as read on open if currently 'new'
  React.useEffect(() => {
    let isMounted = true;
    if (initialInquiry.status === "new") {
      void getContactInquiryByIdAction(initialInquiry.id).then((res) => {
        if (isMounted && res.success && res.data) {
          setInquiry(res.data);
          onUpdated();
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [initialInquiry.id, initialInquiry.status, onUpdated]);

  const handleUpdateStatus = async (newStatus: ContactInquiryStatus) => {
    setIsUpdating(true);
    try {
      const res = await updateContactInquiryStatusAction({
        id: inquiry.id,
        status: newStatus,
        replyNotes: notes.trim(),
      });

      if (res.success && res.data) {
        setInquiry(res.data);
        toast.success(
          newStatus === "replied"
            ? "Inquiry marked as replied!"
            : newStatus === "archived"
              ? "Inquiry archived!"
              : "Inquiry status updated!"
        );
        onUpdated();
      } else {
        toast.error(res.error || "Failed to update inquiry status.");
      }
    } catch {
      toast.error("An unexpected error occurred.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveNotes = async () => {
    setIsUpdating(true);
    try {
      const res = await updateContactInquiryStatusAction({
        id: inquiry.id,
        status: inquiry.status,
        replyNotes: notes.trim(),
      });

      if (res.success && res.data) {
        setInquiry(res.data);
        toast.success("Staff internal notes saved.");
        onUpdated();
      } else {
        toast.error(res.error || "Failed to save notes.");
      }
    } catch {
      toast.error("Failed to save internal notes.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await deleteContactInquiryAction(inquiry.id);
      if (res.success) {
        toast.success("Inquiry deleted.");
        onUpdated();
        onClose();
      } else {
        toast.error(res.error || "Failed to delete inquiry.");
      }
    } catch {
      toast.error("Failed to delete inquiry.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Status Badge & Meta Header */}
        <div className="flex items-center justify-between">
          <Badge
            variant="outline"
            className={
              inquiry.status === "new"
                ? "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold uppercase text-[10px]"
                : inquiry.status === "replied"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold uppercase text-[10px]"
                  : inquiry.status === "archived"
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold uppercase text-[10px]"
                    : "border-muted-foreground/30 bg-muted text-muted-foreground font-bold uppercase text-[10px]"
            }
          >
            {inquiry.status}
          </Badge>

          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <IconClock size={13} />
            {new Date(inquiry.createdAt).toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        {/* Sender Contact Card */}
        <div className="rounded-xl border border-border/70 bg-muted/20 p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold">
              <IconUser size={20} />
            </div>
            <div>
              <p className="font-bold text-sm text-foreground">{inquiry.name}</p>
              <p className="text-xs text-muted-foreground">Inquiring Customer</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-border/50 text-xs">
            <a
              href={`mailto:${inquiry.email}`}
              className="flex items-center gap-2 text-primary hover:underline truncate"
            >
              <IconMail size={14} className="shrink-0 text-muted-foreground" />
              <span className="truncate">{inquiry.email}</span>
            </a>

            {inquiry.contact ? (
              <a
                href={`tel:${inquiry.contact}`}
                className="flex items-center gap-2 text-foreground hover:text-primary transition-colors truncate"
              >
                <IconPhone size={14} className="shrink-0 text-muted-foreground" />
                <span>{inquiry.contact}</span>
              </a>
            ) : (
              <span className="flex items-center gap-2 text-muted-foreground">
                <IconPhone size={14} className="shrink-0 text-muted-foreground" />
                <span>No phone provided</span>
              </span>
            )}
          </div>

          {inquiry.theme && (
            <div className="pt-2 border-t border-border/50 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <IconSparkles size={12} className="text-primary" />
              <span>Origin Theme: <strong className="text-foreground">{inquiry.theme}</strong></span>
            </div>
          )}
        </div>

        {/* Subject & Message Block */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-foreground uppercase tracking-wider">
            Inquiry Subject & Message
          </Label>
          <div className="rounded-xl border border-border/80 bg-card p-4 space-y-2 shadow-2xs">
            <h4 className="font-bold text-sm text-foreground">{inquiry.subject}</h4>
            <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap">
              {inquiry.message}
            </p>
          </div>
        </div>

        {/* Staff Internal Notes */}
        <div className="space-y-2 pt-2 border-t border-border/60">
          <div className="flex items-center justify-between">
            <Label htmlFor="staff-notes" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <IconNotes size={14} className="text-primary" />
              Staff Internal Notes & Call Log
            </Label>
            {inquiry.repliedAt && (
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                Replied on {new Date(inquiry.repliedAt).toLocaleDateString()}
              </span>
            )}
          </div>
          <Textarea
            id="staff-notes"
            placeholder="Record follow-up logs, phone notes, or action taken..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="text-xs resize-none"
          />
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSaveNotes}
              disabled={isUpdating}
              className="text-xs h-7"
            >
              Save Notes
            </Button>
          </div>
        </div>
      </div>

      {/* Footer Action Buttons */}
      <SheetFooter className="p-4 border-t border-border/60 bg-muted/20 shrink-0 flex flex-row items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          disabled={isDeleting}
          className="text-xs text-destructive hover:bg-destructive/10 hover:text-destructive gap-1"
        >
          <IconTrash size={14} />
          <span>Delete</span>
        </Button>

        <div className="flex items-center gap-2">
          {inquiry.status !== "archived" ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleUpdateStatus("archived")}
              disabled={isUpdating}
              className="text-xs gap-1 text-muted-foreground hover:text-foreground"
            >
              <IconArchive size={14} />
              <span>Archive</span>
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleUpdateStatus("read")}
              disabled={isUpdating}
              className="text-xs gap-1"
            >
              <span>Unarchive</span>
            </Button>
          )}

          {inquiry.status !== "replied" && (
            <Button
              type="button"
              size="sm"
              onClick={() => handleUpdateStatus("replied")}
              disabled={isUpdating}
              className="text-xs font-semibold gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <IconCheck size={14} />
              <span>Mark as Replied</span>
            </Button>
          )}
        </div>
      </SheetFooter>
    </div>
  );
}

export function ContactDetailDrawer({
  inquiry,
  open,
  onOpenChange,
  onUpdated,
}: ContactDetailDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 flex flex-col h-full bg-card border-l border-border"
      >
        <SheetHeader className="p-4 border-b border-border/60 bg-muted/20 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <IconMessage size={18} />
            </div>
            <div>
              <SheetTitle className="text-base font-bold text-foreground">
                Inquiry Details
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground">
                Review visitor message and manage response status.
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {open && inquiry && (
          <DrawerDetailForm
            key={inquiry.id}
            initialInquiry={inquiry}
            onClose={() => onOpenChange(false)}
            onUpdated={onUpdated}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
