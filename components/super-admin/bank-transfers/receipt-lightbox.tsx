"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "cn";
import {
  IconZoomIn,
  IconZoomOut,
  IconRefresh,
  IconRotateClockwise,
  IconDownload,
  IconExternalLink,
  IconFileText,
  IconAlertCircle,
  IconReceipt,
  IconX,
} from "@tabler/icons-react";
import type { BankTransferStatus } from "@/types/bank-transfer";

interface ReceiptLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  receiptUrl: string | null;
  orderNumber?: string;
  companyName?: string;
  amount?: number;
  currency?: string;
  transactionRef?: string;
  status?: BankTransferStatus;
}

export function ReceiptLightbox({
  isOpen,
  onClose,
  receiptUrl,
  orderNumber,
  companyName,
  amount,
  currency = "USD",
  transactionRef,
  status,
}: ReceiptLightboxProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const handleZoomIn = useCallback(() => setZoom((prev) => Math.min(Number((prev + 0.25).toFixed(2)), 3)), []);
  const handleZoomOut = useCallback(() => setZoom((prev) => Math.max(Number((prev - 0.25).toFixed(2)), 0.5)), []);
  const handleReset = useCallback(() => {
    setZoom(1);
    setRotation(0);
  }, []);
  const handleRotate = useCallback(() => setRotation((prev) => (prev + 90) % 360), []);

  // Keyboard shortcut support when modal is open
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        handleZoomIn();
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        handleZoomOut();
      } else if (e.key === "0") {
        e.preventDefault();
        handleReset();
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        handleRotate();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleZoomIn, handleZoomOut, handleReset, handleRotate]);

  if (!receiptUrl) return null;

  const isPdf =
    receiptUrl.toLowerCase().endsWith(".pdf") ||
    receiptUrl.includes("application/pdf");

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          handleReset();
          onClose();
        }
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="w-[96vw] max-w-5xl sm:max-w-4xl md:max-w-5xl lg:max-w-6xl h-[90vh] max-h-[880px] flex flex-col p-0 overflow-hidden border border-border bg-card shadow-2xl rounded-2xl"
      >
        {/* Modal Header */}
        <DialogHeader className="px-4 sm:px-6 py-3.5 border-b border-border bg-muted/25 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 space-y-0 shrink-0">
          {/* Left info column */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
              <IconReceipt size={22} />
            </div>
            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-sm sm:text-base font-semibold tracking-tight text-foreground truncate">
                  Deposit Receipt Proof
                </DialogTitle>
                {orderNumber && (
                  <Badge variant="outline" className="font-mono text-[11px] px-2 py-0.5 border-border bg-background/80 font-medium">
                    {orderNumber}
                  </Badge>
                )}
                {status && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] font-semibold tracking-wide px-2 py-0.5",
                      status === "Approved" && "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                      status === "Rejected" && "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400",
                      status === "Pending" && "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    )}
                  >
                    {status}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground truncate">
                {companyName && <span className="font-medium text-foreground truncate">{companyName}</span>}
                {companyName && amount !== undefined && <span>•</span>}
                {amount !== undefined && (
                  <span className="font-semibold text-foreground">
                    ${amount.toFixed(2)}{" "}
                    <span className="text-[10px] font-normal text-muted-foreground">{currency}</span>
                  </span>
                )}
                {transactionRef && (
                  <>
                    <span>•</span>
                    <span className="truncate">
                      Ref: <span className="font-mono font-medium text-foreground">{transactionRef}</span>
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right Toolbar & Action controls */}
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            {!isPdf && (
              <div className="flex items-center rounded-xl border border-border bg-background/90 p-0.5 shadow-2xs">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                  onClick={handleZoomOut}
                  disabled={zoom <= 0.5}
                  title="Zoom Out (-)"
                >
                  <IconZoomOut size={16} />
                </Button>
                <span className="text-xs font-mono font-semibold text-foreground px-2 min-w-12 text-center select-none">
                  {Math.round(zoom * 100)}%
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                  onClick={handleZoomIn}
                  disabled={zoom >= 3}
                  title="Zoom In (+)"
                >
                  <IconZoomIn size={16} />
                </Button>
                <div className="h-4 w-[1px] bg-border mx-0.5" />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                  onClick={handleRotate}
                  title="Rotate 90° Clockwise (R)"
                >
                  <IconRotateClockwise size={16} />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                  onClick={handleReset}
                  title="Reset View (0)"
                >
                  <IconRefresh size={16} />
                </Button>
              </div>
            )}

            {/* Open & Download Buttons */}
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                asChild
                className="h-8 gap-1.5 text-xs rounded-lg px-2.5 cursor-pointer shadow-2xs"
              >
                <a
                  href={receiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Open original file in a new browser tab"
                >
                  <IconExternalLink size={14} />
                  <span className="hidden md:inline">Open</span>
                </a>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                asChild
                className="h-8 gap-1.5 text-xs rounded-lg px-2.5 cursor-pointer shadow-2xs"
              >
                <a
                  href={receiptUrl}
                  download
                  title="Download receipt file to your local computer"
                >
                  <IconDownload size={14} />
                  <span className="hidden md:inline">Download</span>
                </a>
              </Button>
            </div>

            {/* Dedicated Header Close Button */}
            <div className="pl-1 border-l border-border">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  handleReset();
                  onClose();
                }}
                className="size-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer transition-colors"
                title="Close Lightbox (Esc)"
              >
                <IconX size={18} />
                <span className="sr-only">Close</span>
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Viewport Canvas */}
        <div className="flex-1 overflow-auto bg-muted/40 dark:bg-muted/15 p-4 sm:p-8 flex items-center justify-center relative min-h-[350px]">
          {isPdf ? (
            <div className="w-full h-full min-h-[500px] flex flex-col rounded-xl overflow-hidden border border-border bg-background shadow-xs">
              <iframe
                src={receiptUrl}
                className="w-full h-full flex-1 border-0"
                title="Bank Deposit Receipt PDF Document"
              />
              <div className="px-4 py-2 bg-muted/30 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <IconFileText size={16} className="text-primary" />
                  <span>PDF Document Viewer</span>
                </div>
                <a
                  href={receiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary font-medium hover:underline flex items-center gap-1"
                >
                  View full window <IconExternalLink size={12} />
                </a>
              </div>
            </div>
          ) : receiptUrl ? (
            <div
              className="max-w-full max-h-full flex items-center justify-center p-2 transition-all duration-150"
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                transformOrigin: "center center",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={receiptUrl}
                alt={`Bank Deposit Slip Proof - ${orderNumber || "Payment"}`}
                className="max-w-full max-h-[72vh] object-contain rounded-xl shadow-lg border border-border/40 select-none bg-background"
                draggable={false}
              />
            </div>
          ) : (
            <div className="py-16 text-center text-muted-foreground flex flex-col items-center">
              <IconAlertCircle size={36} className="mb-2 text-muted-foreground/60" />
              <p className="text-sm font-medium">No receipt attachment found.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
