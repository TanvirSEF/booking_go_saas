"use client";

import React, { useState } from "react";
import { IconCheck, IconCode, IconCopy } from "@tabler/icons-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface EmbedCodeCardProps {
  businessSlug: string;
  businessName: string;
}

export function EmbedCodeCard({ businessSlug, businessName }: EmbedCodeCardProps) {
  const [copied, setCopied] = useState(false);

  const origin = React.useSyncExternalStore(
    () => () => {},
    () => (typeof window !== "undefined" ? window.location.origin : ""),
    () => ""
  );

  const embedUrl = `${origin || ""}/embed/${businessSlug}`;
  const iframeCode = `<iframe src="${embedUrl}" width="100%" height="700px" frameborder="0" style="border:0;" title="Book Appointment - ${businessName}"></iframe>`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(iframeCode);
      setCopied(true);
      toast.success("Embed code copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy code.");
    }
  };

  return (
    <Card className="rounded-2xl border border-border/60 bg-card shadow-xs">
      <CardHeader className="p-5 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <IconCode size={18} />
          </div>
          <div>
            <CardTitle className="text-base font-bold text-foreground">
              Embedded Code
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Copy this code and put anywhere on your website or blog
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5 pt-2">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <Input
            readOnly
            value={iframeCode}
            onClick={(e) => (e.target as HTMLInputElement).select()}
            className="h-10 font-mono text-xs select-all rounded-xl bg-muted/40 border-border/60"
          />
          <Button
            type="button"
            onClick={handleCopy}
            className="h-10 px-4 rounded-xl gap-1.5 shrink-0 text-xs font-medium cursor-pointer"
          >
            {copied ? (
              <>
                <IconCheck size={15} className="stroke-[3]" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <IconCopy size={15} />
                <span>Copy Code</span>
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
