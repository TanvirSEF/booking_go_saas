"use client";

import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import { IconCheck, IconCopy, IconQrcode } from "@tabler/icons-react";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

export function LandingQrCard() {
  const [qrUrl, setQrUrl] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);

  const origin = React.useSyncExternalStore(
    () => () => {},
    () => (typeof window !== "undefined" ? window.location.origin : ""),
    () => ""
  );

  const landingUrl = origin || "http://localhost:3000";

  useEffect(() => {
    if (!landingUrl) return;

    QRCode.toDataURL(landingUrl, {
      width: 180,
      margin: 1,
      color: {
        dark: "#072a33",
        light: "#ffffff",
      },
    })
      .then(setQrUrl)
      .catch(() => {});
  }, [landingUrl]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(landingUrl);
      setCopied(true);
      toast.success("Landing page link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link.");
    }
  };

  return (
    <Card className="flex min-h-[180px] flex-col items-center justify-between rounded-2xl border-none bg-[#d5f3e9] p-4 text-center shadow-xs lg:col-span-2">
      <div className="flex flex-1 items-center justify-center">
        <div className="flex size-24 items-center justify-center rounded-xl bg-white p-1.5 shadow-2xs">
          {qrUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qrUrl}
              alt="Landing Page QR Code"
              className="size-full rounded-lg object-contain"
            />
          ) : (
            <IconQrcode size={76} stroke={1.5} className="text-[#072a33]" />
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={handleCopy}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#072a33] py-1.5 px-3 text-xs font-semibold text-white transition-opacity hover:opacity-90 cursor-pointer"
        title="Copy Landing Page URL"
      >
        <span>Landing Page</span>
        {copied ? <IconCheck size={13} className="stroke-[3]" /> : <IconCopy size={13} />}
      </button>
    </Card>
  );
}
