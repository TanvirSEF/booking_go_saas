"use client";

import * as React from "react";
import {
  IconDeviceDesktop,
  IconDeviceMobile,
  IconMail,
  IconSparkles,
} from "@tabler/icons-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface PreviewDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateName: string;
  fromSender: string;
  subject: string;
  content: string;
  language: string;
}

const SAMPLE_VARIABLES: Record<string, string> = {
  app_name: "BookingGo SaaS",
  company_name: "Acme Wellness & Spa",
  business_name: "Acme Downtown Flagship",
  app_url: "https://bookinggo.app",
  email: "sarah.connor@example.com",
  password: "DemoPassword#2026",
  customer: "Sarah Connor",
  customer_name: "Sarah Connor",
  service: "Full Body Massage & Aromatherapy",
  service_name: "Full Body Massage & Aromatherapy",
  location: "Central Plaza, Suite 400",
  staff: "Dr. Alexander Wright",
  staff_name: "Dr. Alexander Wright",
  appointment_date: "September 24, 2026",
  appointment_time: "02:30 PM",
  appointment_number: "BGO-2026-8891",
  status: "Confirmed",
  tracking_url: "https://bookinggo.app/appointments/track/BGO-2026-8891",
};

function interpolatePreview(template: string, vars: Record<string, string>): string {
  if (!template) return "";
  let rendered = template;
  for (const [k, v] of Object.entries(vars)) {
    const regex = new RegExp(`\\{\\s*${k}\\s*\\}`, "gi");
    rendered = rendered.replace(regex, v);
  }
  return rendered;
}

export function PreviewDrawer({
  open,
  onOpenChange,
  templateName,
  fromSender,
  subject,
  content,
  language,
}: PreviewDrawerProps) {
  const [device, setDevice] = React.useState<"desktop" | "mobile">("desktop");

  const renderedSubject = interpolatePreview(subject || templateName, SAMPLE_VARIABLES);
  const renderedContent = interpolatePreview(content || "<p>No content provided</p>", SAMPLE_VARIABLES);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl p-0 flex flex-col bg-background border-border overflow-hidden"
      >
        <SheetHeader className="p-4 border-b border-border/60 bg-muted/20 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <IconMail size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <SheetTitle className="text-base font-bold text-foreground">
                    Live Email Preview
                  </SheetTitle>
                  <Badge variant="outline" className="text-[10px] font-bold uppercase">
                    {language}
                  </Badge>
                </div>
                <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                  Preview rendered with realistic sample customer data.
                </SheetDescription>
              </div>
            </div>

            {/* Device Switcher */}
            <div className="flex items-center rounded-lg border border-border bg-card p-0.5 shadow-2xs">
              <Button
                variant={device === "desktop" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setDevice("desktop")}
                className="h-7 px-2 text-xs gap-1 rounded-md"
              >
                <IconDeviceDesktop size={14} />
                <span className="hidden sm:inline">Desktop</span>
              </Button>
              <Button
                variant={device === "mobile" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setDevice("mobile")}
                className="h-7 px-2 text-xs gap-1 rounded-md"
              >
                <IconDeviceMobile size={14} />
                <span className="hidden sm:inline">Mobile</span>
              </Button>
            </div>
          </div>
        </SheetHeader>

        {/* Email Client Simulated Header */}
        <div className="p-4 border-b border-border/60 bg-card space-y-2 text-xs shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-muted-foreground w-16">Subject:</span>
            <span className="font-semibold text-foreground break-all">{renderedSubject}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-muted-foreground w-16">From:</span>
            <span className="text-foreground">{fromSender || "BookingGo Notifications"} &lt;notifications@bookinggo.app&gt;</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-muted-foreground w-16">To:</span>
            <span className="text-foreground">Sarah Connor &lt;sarah.connor@example.com&gt;</span>
          </div>
        </div>

        {/* Rendered Email Canvas */}
        <div className="flex-1 overflow-y-auto bg-muted/40 p-4 sm:p-6 flex justify-center items-start">
          <div
            className={`w-full bg-card rounded-2xl border border-border/70 shadow-sm overflow-hidden transition-all ${
              device === "mobile" ? "max-w-sm" : "max-w-xl"
            }`}
          >
            {/* Header Banner */}
            <div className="bg-primary px-6 py-5 text-center text-primary-foreground">
              <div className="inline-flex size-10 items-center justify-center rounded-xl bg-white/20 mb-2">
                <IconSparkles size={20} />
              </div>
              <h2 className="text-lg font-bold tracking-tight">
                {SAMPLE_VARIABLES.business_name}
              </h2>
              <p className="text-xs text-primary-foreground/80 mt-0.5">
                Appointment Notification
              </p>
            </div>

            {/* Email Body HTML Content */}
            <div
              className="p-6 text-sm text-foreground leading-relaxed prose prose-sm dark:prose-invert max-w-none break-words"
              dangerouslySetInnerHTML={{ __html: renderedContent }}
            />

            {/* Email Footer */}
            <div className="border-t border-border/60 bg-muted/30 px-6 py-4 text-center text-[11px] text-muted-foreground space-y-1">
              <p>
                © {new Date().getFullYear()} {SAMPLE_VARIABLES.company_name}. All rights reserved.
              </p>
              <p>
                Sent via <span className="font-semibold text-foreground">BookingGo SaaS</span>
              </p>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
