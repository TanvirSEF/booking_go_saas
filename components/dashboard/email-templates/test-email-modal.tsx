"use client";

import * as React from "react";
import {
  IconLoader2,
  IconMail,
  IconSend,
  IconSparkles,
} from "@tabler/icons-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { sendTestEmailAction } from "@/actions/email-template";

interface TestEmailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateId: string;
  templateName: string;
  defaultLang?: string;
  availableLanguages?: string[];
}

const LANGUAGES = [
  { code: "en", label: "English (EN)" },
  { code: "es", label: "Spanish (ES)" },
  { code: "fr", label: "French (FR)" },
  { code: "ar", label: "Arabic (AR)" },
  { code: "de", label: "German (DE)" },
  { code: "it", label: "Italian (IT)" },
];

export function TestEmailModal({
  open,
  onOpenChange,
  templateId,
  templateName,
  defaultLang = "en",
  availableLanguages,
}: TestEmailModalProps) {
  const [email, setEmail] = React.useState("");
  const [lang, setLang] = React.useState(defaultLang);
  const [isSending, setIsSending] = React.useState(false);

  // reset or sync state on user interaction

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Please enter a valid recipient email address.");
      return;
    }

    setIsSending(true);
    try {
      const res = await sendTestEmailAction({
        templateId,
        recipientEmail: email.trim(),
        lang,
      });

      if (res.success) {
        toast.success(res.message || `Test email successfully dispatched to ${email}`);
        onOpenChange(false);
      } else {
        toast.error(res.error || "Failed to dispatch test email. Verify SMTP settings.");
      }
    } catch {
      toast.error("An unexpected error occurred while sending test email.");
    } finally {
      setIsSending(false);
    }
  };

  const activeLanguages = availableLanguages && availableLanguages.length > 0
    ? LANGUAGES.filter((l) => availableLanguages.includes(l.code) || l.code === "en")
    : LANGUAGES;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
    if (isOpen) setLang(defaultLang);
    onOpenChange(isOpen);
  }}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <form onSubmit={handleSend}>
          <DialogHeader className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <IconMail size={18} />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Send Test Email
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Dispatch a simulated preview of <strong className="text-foreground">{templateName}</strong> with realistic mock data.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="test-recipient-email" className="text-xs font-semibold text-foreground">
                Recipient Email Address <span className="text-destructive">*</span>
              </Label>
              <Input
                id="test-recipient-email"
                type="email"
                placeholder="e.g. admin@company.com or your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                The test email will be sent using your configured SMTP mailer.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="test-language" className="text-xs font-semibold text-foreground">
                Template Language Translation
              </Label>
              <Select value={lang} onValueChange={setLang}>
                <SelectTrigger id="test-language" className="text-xs h-9">
                  <SelectValue placeholder="Select Language" />
                </SelectTrigger>
                <SelectContent>
                  {activeLanguages.map((l) => (
                    <SelectItem key={l.code} value={l.code} className="text-xs">
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-xl border border-border/70 bg-muted/30 p-3 space-y-1.5">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <IconSparkles size={14} className="text-primary" />
                Sample Dynamic Variables
              </span>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Shortcodes like <code className="bg-background px-1 py-0.5 rounded text-foreground font-mono">{'{customer}'}</code>, <code className="bg-background px-1 py-0.5 rounded text-foreground font-mono">{'{service}'}</code>, and <code className="bg-background px-1 py-0.5 rounded text-foreground font-mono">{'{tracking_url}'}</code> will be dynamically populated.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSending}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSending}
              className="font-semibold gap-1.5 text-xs shadow-2xs"
            >
              {isSending ? (
                <>
                  <IconLoader2 size={14} className="animate-spin" />
                  <span>Dispatching Email...</span>
                </>
              ) : (
                <>
                  <IconSend size={14} />
                  <span>Send Test Email</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
