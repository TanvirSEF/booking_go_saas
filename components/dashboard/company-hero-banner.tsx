"use client";

import React, { useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import {
  IconCalendarCheck,
  IconExternalLink,
  IconSearch,
  IconShare,
  IconSparkles,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { EmbedShareDialog } from "@/components/wizard/embed-share-dialog";

interface CompanyHeroBannerProps {
  businessName: string;
  businessSlug: string;
}

export function CompanyHeroBanner({
  businessName,
  businessSlug,
}: CompanyHeroBannerProps) {
  const [shareOpen, setShareOpen] = useState(false);
  const [qrUrl, setQrUrl] = useState<string>("");

  React.useEffect(() => {
    if (typeof window === "undefined" || !businessSlug) return;
    const url = `${window.location.origin}/appointments/${businessSlug}`;
    QRCode.toDataURL(url, {
      width: 140,
      margin: 1,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
    })
      .then(setQrUrl)
      .catch(() => {});
  }, [businessSlug]);

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 p-6 sm:p-8 text-white shadow-lg">
        {/* Subtle decorative background pattern */}
        <div className="pointer-events-none absolute -right-12 -top-12 size-64 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-8 right-48 size-48 rounded-full bg-teal-400/10 blur-2xl" />

        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          {/* Left content */}
          <div className="space-y-3 max-w-xl">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300 backdrop-blur-xs">
              <IconSparkles size={14} />
              <span>{businessName}</span>
            </div>
            
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl text-white">
              {businessName}
            </h1>
            
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Your central hub for tracking, managing, and excelling — everything you need at your fingertips!
            </p>

            {/* Banner action buttons */}
            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              <Button
                asChild
                size="sm"
                variant="outline"
                className="rounded-xl border-emerald-400/30 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20 hover:text-white"
              >
                <Link href="/find-appointment" target="_blank" className="flex items-center gap-1.5 text-xs">
                  <IconSearch size={14} />
                  <span>Track Your Appointment</span>
                </Link>
              </Button>

              {businessSlug && (
                <Button
                  asChild
                  size="sm"
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-xs"
                >
                  <Link
                    href={`/appointments/${businessSlug}`}
                    target="_blank"
                    className="flex items-center gap-1.5 text-xs"
                  >
                    <IconExternalLink size={14} />
                    <span>Business Link</span>
                  </Link>
                </Button>
              )}

              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={() => setShareOpen(true)}
                className="size-8 sm:size-9 rounded-xl border-emerald-400/30 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20 hover:text-white cursor-pointer"
                title="Share & Embed Widget"
              >
                <IconShare size={15} />
              </Button>
            </div>
          </div>

          {/* Right illustration / QR Code preview matching screenshot */}
          <div className="flex items-center gap-4 self-center md:self-auto">
            {/* Circular calendar checkmark illustration */}
            <div className="hidden lg:flex size-24 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 backdrop-blur-xs">
              <IconCalendarCheck size={44} className="stroke-[1.5]" />
            </div>

            {/* QR Card */}
            {qrUrl && (
              <div
                onClick={() => setShareOpen(true)}
                className="group flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/95 p-2.5 text-slate-900 shadow-md backdrop-blur-xs transition-transform hover:scale-105 cursor-pointer"
                title="Click to view QR and embed code"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrUrl}
                  alt={`Booking QR code for ${businessName}`}
                  className="size-20 sm:size-24 rounded-lg object-contain"
                />
                <span className="mt-1 text-[10px] font-bold text-slate-700 group-hover:text-emerald-700">
                  Scan to Book
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <EmbedShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        businessSlug={businessSlug}
        businessName={businessName}
      />
    </>
  );
}
