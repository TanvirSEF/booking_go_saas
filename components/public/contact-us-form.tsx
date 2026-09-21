"use client";

import * as React from "react";
import { RecaptchaWidget, type RecaptchaWidgetRef } from "@/components/common/recaptcha-widget";
import { IconMail, IconSend } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { submitPublicContactInquiryAction } from "@/actions/contact-us";

interface ContactUsFormProps {
  businessSlug: string;
  theme?: string;
  className?: string;
}

export function ContactUsForm({
  businessSlug,
  theme = "default",
  className = "",
}: ContactUsFormProps) {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [contact, setContact] = React.useState("");
  const [subject, setSubject] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [recaptchaToken, setRecaptchaToken] = React.useState<string | null>(null);
  const recaptchaRef = React.useRef<RecaptchaWidgetRef>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      const token = await recaptchaRef.current?.execute("contact_us");
      const activeToken = token || recaptchaToken || undefined;

      const res = await submitPublicContactInquiryAction({
        businessSlug,
        name: name.trim(),
        email: email.trim(),
        contact: contact.trim(),
        subject: subject.trim(),
        message: message.trim(),
        theme,
        recaptchaToken: activeToken,
      });

      if (res.success) {
        toast.success(res.message || "Thank you! Your message has been sent.");
        setName("");
        setEmail("");
        setContact("");
        setSubject("");
        setMessage("");
      } else {
        toast.error(res.error || "Failed to submit inquiry. Please try again.");
        recaptchaRef.current?.reset();
        setRecaptchaToken(null);
      }
    } catch {
      toast.error("An unexpected error occurred while sending your message.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`rounded-2xl border border-border/70 bg-card p-6 sm:p-8 shadow-xs space-y-4 ${className}`}
    >
      <div className="flex items-center gap-2 pb-2 border-b border-border/60">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <IconMail size={18} />
        </div>
        <div>
          <h3 className="font-bold text-base text-foreground">Send Us a Message</h3>
          <p className="text-xs text-muted-foreground">
            We typically respond within 1-2 business hours.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="contact-name" className="text-xs font-semibold text-foreground">
            Full Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="contact-name"
            placeholder="John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="text-xs"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="contact-email" className="text-xs font-semibold text-foreground">
            Email Address <span className="text-destructive">*</span>
          </Label>
          <Input
            id="contact-email"
            type="email"
            placeholder="john@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="text-xs"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="contact-phone" className="text-xs font-semibold text-foreground">
            Phone Number (Optional)
          </Label>
          <Input
            id="contact-phone"
            type="tel"
            placeholder="+1 555-0199"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            className="text-xs"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="contact-subject" className="text-xs font-semibold text-foreground">
            Subject <span className="text-destructive">*</span>
          </Label>
          <Input
            id="contact-subject"
            placeholder="e.g. Appointment Inquiry or Pricing"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
            className="text-xs"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="contact-message" className="text-xs font-semibold text-foreground">
          Message <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="contact-message"
          placeholder="How can we help you today?"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          required
          className="text-xs resize-none"
        />
      </div>

      <RecaptchaWidget
        ref={recaptchaRef}
        action="contact_us"
        onChange={setRecaptchaToken}
        className="my-1"
      />

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full font-semibold text-xs gap-1.5"
      >
        {isSubmitting ? (
          <>
            <div className="size-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
            <span>Sending Message...</span>
          </>
        ) : (
          <>
            <IconSend size={15} />
            <span>Submit Inquiry</span>
          </>
        )}
      </Button>
    </form>
  );
}
