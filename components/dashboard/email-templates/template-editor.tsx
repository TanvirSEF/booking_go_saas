"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  IconArrowLeft,
  IconCheck,
  IconCopy,
  IconEye,
  IconLoader2,
  IconRotateDot,
  IconSend,
  IconSparkles,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  getEmailTemplateDetailsAction,
  updateEmailTemplateAction,
  resetEmailTemplateToDefaultAction,
} from "@/actions/email-template";
import { TestEmailModal } from "@/components/dashboard/email-templates/test-email-modal";
import { PreviewDrawer } from "@/components/dashboard/email-templates/preview-drawer";
import type { EmailTemplateDTO } from "@/types/email-template";

interface TemplateEditorProps {
  initialTemplate: EmailTemplateDTO;
  initialLang?: string;
}

const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "es", label: "Spanish", flag: "🇪🇸" },
  { code: "fr", label: "French", flag: "🇫🇷" },
  { code: "ar", label: "Arabic", flag: "🇸🇦" },
  { code: "de", label: "German", flag: "🇩🇪" },
  { code: "it", label: "Italian", flag: "🇮🇹" },
];

export function TemplateEditor({
  initialTemplate,
  initialLang = "en",
}: TemplateEditorProps) {
  const router = useRouter();

  const [template, setTemplate] = React.useState<EmailTemplateDTO>(initialTemplate);
  const [currentLang, setCurrentLang] = React.useState<string>(initialLang);

  // Form Fields
  const [fromSender, setFromSender] = React.useState<string>(initialTemplate.from || "BookingGo Notifications");
  const [subject, setSubject] = React.useState<string>(
    initialTemplate.currentTranslation?.subject ||
    initialTemplate.translations?.find((t) => t.lang === initialLang)?.subject ||
    initialTemplate.name
  );
  const [content, setContent] = React.useState<string>(
    initialTemplate.currentTranslation?.content ||
    initialTemplate.translations?.find((t) => t.lang === initialLang)?.content ||
    ""
  );

  // Active element target for variable insertion
  const [activeTarget, setActiveTarget] = React.useState<"subject" | "content">("content");
  const subjectInputRef = React.useRef<HTMLInputElement | null>(null);
  const contentTextareaRef = React.useRef<HTMLTextAreaElement | null>(null);

  // Modals & Drawers
  const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);
  const [isTestOpen, setIsTestOpen] = React.useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = React.useState(false);

  // Loading States
  const [isSaving, setIsSaving] = React.useState(false);
  const [isSwitchingLang, setIsSwitchingLang] = React.useState(false);
  const [isResetting, setIsResetting] = React.useState(false);

  // Load translation when language changes
  const handleLanguageChange = async (newLang: string) => {
    if (newLang === currentLang) return;
    setIsSwitchingLang(true);

    try {
      const res = await getEmailTemplateDetailsAction(template.slug, newLang);
      if (res.success && res.data) {
        setTemplate(res.data);
        setCurrentLang(newLang);
        setFromSender(res.data.from || "BookingGo Notifications");
        setSubject(res.data.currentTranslation?.subject || res.data.name);
        setContent(res.data.currentTranslation?.content || "");
      } else {
        toast.error(res.error || "Failed to load language translation");
      }
    } catch {
      toast.error("Error switching language translation");
    } finally {
      setIsSwitchingLang(false);
    }
  };

  // Insert or Copy Variable Chip
  const handleInsertVariable = (variableName: string) => {
    const formattedShortcode = `{${variableName}}`;

    if (activeTarget === "subject" && subjectInputRef.current) {
      const input = subjectInputRef.current;
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const newSubject = subject.slice(0, start) + formattedShortcode + subject.slice(end);
      setSubject(newSubject);
      toast.success(`Inserted ${formattedShortcode} into subject`);
    } else if (contentTextareaRef.current) {
      const textarea = contentTextareaRef.current;
      const start = textarea.selectionStart || 0;
      const end = textarea.selectionEnd || 0;
      const newContent = content.slice(0, start) + formattedShortcode + content.slice(end);
      setContent(newContent);
      toast.success(`Inserted ${formattedShortcode} into email body`);
    } else {
      // Fallback copy to clipboard
      navigator.clipboard.writeText(formattedShortcode);
      toast.success(`Copied ${formattedShortcode} to clipboard`);
    }
  };

  // Save Template Action
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) {
      toast.error("Please enter a subject line.");
      return;
    }
    if (!content.trim()) {
      toast.error("Please enter email body content.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await updateEmailTemplateAction({
        templateId: template.id,
        lang: currentLang,
        subject: subject.trim(),
        content: content.trim(),
        from: fromSender.trim() || "BookingGo Notifications",
      });

      if (res.success && res.data) {
        toast.success(res.message || "Email template updated successfully!");
        setTemplate({
          ...template,
          isCustomized: true,
          from: res.data.from,
        });
        router.refresh();
      } else {
        toast.error(res.error || "Failed to save email template.");
      }
    } catch {
      toast.error("An error occurred while saving email template.");
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to Default Action
  const handleResetToDefault = async () => {
    setIsResetting(true);
    try {
      const res = await resetEmailTemplateToDefaultAction(template.slug, currentLang);
      if (res.success) {
        toast.success(res.message || "Template reset to system default!");
        setIsResetDialogOpen(false);
        // Reload default translation
        const detailRes = await getEmailTemplateDetailsAction(template.slug, currentLang);
        if (detailRes.success && detailRes.data) {
          setTemplate(detailRes.data);
          setSubject(detailRes.data.currentTranslation?.subject || detailRes.data.name);
          setContent(detailRes.data.currentTranslation?.content || "");
          setFromSender(detailRes.data.from || "BookingGo Notifications");
        }
        router.refresh();
      } else {
        toast.error(res.error || "Failed to reset template.");
      }
    } catch {
      toast.error("Failed to reset email template.");
    } finally {
      setIsResetting(false);
    }
  };

  const availableVars = template.variables && template.variables.length > 0
    ? template.variables
    : [
        "customer",
        "customer_name",
        "service",
        "service_name",
        "staff",
        "staff_name",
        "location",
        "appointment_date",
        "appointment_time",
        "appointment_number",
        "status",
        "tracking_url",
        "company_name",
        "business_name",
      ];

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="h-8 gap-1 text-xs">
            <Link href="/dashboard/settings/email-templates">
              <IconArrowLeft size={14} />
              <span>Back to Templates</span>
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-foreground truncate">
                {template.name}
              </h1>
              {template.isCustomized ? (
                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-bold">
                  Customized
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[10px] font-medium">
                  System Default
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Module: <strong className="text-foreground capitalize">{template.moduleName}</strong> • Slug: <code className="font-mono">{template.slug}</code>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsPreviewOpen(true)}
            className="h-8 gap-1.5 text-xs font-semibold shadow-2xs"
          >
            <IconEye size={14} />
            <span>Live Preview</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsTestOpen(true)}
            className="h-8 gap-1.5 text-xs font-semibold shadow-2xs"
          >
            <IconSend size={14} />
            <span>Send Test Email</span>
          </Button>

          {template.isCustomized && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsResetDialogOpen(true)}
              className="h-8 gap-1 text-xs text-muted-foreground hover:text-destructive"
            >
              <IconRotateDot size={14} />
              <span>Reset Default</span>
            </Button>
          )}
        </div>
      </div>

      {/* Language Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-xs font-semibold text-muted-foreground shrink-0 mr-1">
          Language:
        </span>
        {SUPPORTED_LANGUAGES.map((lang) => {
          const isSelected = currentLang === lang.code;

          return (
            <Button
              key={lang.code}
              type="button"
              variant={isSelected ? "default" : "outline"}
              size="sm"
              disabled={isSwitchingLang}
              onClick={() => handleLanguageChange(lang.code)}
              className={`h-8 px-3 text-xs gap-1.5 rounded-lg shrink-0 ${
                isSelected ? "font-bold shadow-2xs" : "text-muted-foreground font-medium"
              }`}
            >
              <span>{lang.flag}</span>
              <span>{lang.label}</span>
              {isSelected && <IconCheck size={12} className="shrink-0" />}
            </Button>
          );
        })}
        {isSwitchingLang && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground ml-2">
            <IconLoader2 size={13} className="animate-spin" />
            <span>Loading...</span>
          </div>
        )}
      </div>

      {/* Main Editor Form */}
      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left / Center 2 Columns: Email Fields & Rich HTML Body */}
          <div className="lg:col-span-2 space-y-4">
            {/* Sender From Name & Subject */}
            <div className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5 space-y-4 shadow-2xs">
              <div className="space-y-1.5">
                <Label htmlFor="from-sender" className="text-xs font-semibold text-foreground">
                  Sender Display Name (<code className="font-mono">from</code>)
                </Label>
                <Input
                  id="from-sender"
                  value={fromSender}
                  onChange={(e) => setFromSender(e.target.value)}
                  placeholder="e.g. BookingGo Notifications"
                  className="text-xs h-9"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="email-subject" className="text-xs font-semibold text-foreground">
                    Email Subject Line <span className="text-destructive">*</span>
                  </Label>
                  <span className="text-[11px] text-muted-foreground">
                    Supports variable shortcodes
                  </span>
                </div>
                <Input
                  ref={subjectInputRef}
                  id="email-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  onFocus={() => setActiveTarget("subject")}
                  placeholder="e.g. Appointment Confirmation: {service} [#{appointment_number}]"
                  className="text-xs h-9 font-medium"
                  required
                />
              </div>
            </div>

            {/* Email Body Content */}
            <div className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="email-content" className="text-xs font-semibold text-foreground">
                    Email Body HTML Content <span className="text-destructive">*</span>
                  </Label>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Enter formatted HTML or plain text with dynamic variable placeholders.
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px] uppercase font-mono">
                  HTML Body
                </Badge>
              </div>

              <Textarea
                ref={contentTextareaRef}
                id="email-content"
                rows={16}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onFocus={() => setActiveTarget("content")}
                placeholder="<p>Hello {customer},</p><p>Your appointment for {service} has been confirmed...</p>"
                className="font-mono text-xs leading-relaxed resize-y bg-muted/20"
                required
              />

              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                <span>Active Target for Variable Insertion: <strong className="text-foreground capitalize">{activeTarget}</strong></span>
                <span>Language: <strong className="text-foreground uppercase">{currentLang}</strong></span>
              </div>
            </div>

            {/* Submit Bar */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button asChild variant="outline" size="sm" className="text-xs">
                <Link href="/dashboard/settings/email-templates">Cancel</Link>
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSaving}
                className="font-semibold gap-1.5 text-xs shadow-2xs"
              >
                {isSaving ? (
                  <>
                    <IconLoader2 size={14} className="animate-spin" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <IconCheck size={14} />
                    <span>Save Template ({currentLang.toUpperCase()})</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Right Column: Available Variables Toolbar */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5 space-y-3 shadow-2xs sticky top-20">
              <div className="flex items-center gap-2 border-b border-border/60 pb-3">
                <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <IconSparkles size={15} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-foreground">
                    Dynamic Variable Chips
                  </h3>
                  <p className="text-[10px] text-muted-foreground">
                    Click chip to insert at active cursor
                  </p>
                </div>
              </div>

              <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                {availableVars.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => handleInsertVariable(v)}
                    className="w-full text-left flex items-center justify-between p-2 rounded-lg border border-border/50 bg-muted/30 hover:bg-primary/10 hover:border-primary/40 transition-colors group cursor-pointer"
                  >
                    <code className="text-xs font-mono font-semibold text-primary group-hover:text-primary">
                      {'{' + v + '}'}
                    </code>
                    <IconCopy size={12} className="text-muted-foreground group-hover:text-primary shrink-0 opacity-60 group-hover:opacity-100" />
                  </button>
                ))}
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/20 p-2.5 text-[11px] text-muted-foreground leading-relaxed">
                💡 <strong>Tip:</strong> Variables automatically resolve to the real customer and appointment values at runtime.
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Live Preview Slide-over */}
      <PreviewDrawer
        open={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        templateName={template.name}
        fromSender={fromSender}
        subject={subject}
        content={content}
        language={currentLang}
      />

      {/* Send Test Email Modal */}
      <TestEmailModal
        open={isTestOpen}
        onOpenChange={setIsTestOpen}
        templateId={template.id}
        templateName={template.name}
        defaultLang={currentLang}
        availableLanguages={template.translations?.map((t) => t.lang)}
      />

      {/* Reset Confirmation Dialog */}
      <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-destructive flex items-center gap-2">
              <IconRotateDot size={18} />
              Reset to System Default
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to discard your custom template for <strong>{template.name}</strong> ({currentLang.toUpperCase()}) and restore the system default content?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsResetDialogOpen(false)}
              disabled={isResetting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleResetToDefault}
              disabled={isResetting}
            >
              {isResetting ? "Resetting..." : "Reset to Default"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
