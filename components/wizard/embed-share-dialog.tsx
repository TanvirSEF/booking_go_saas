'use client';

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  IconLink,
  IconCode,
  IconQrcode,
  IconCopy,
  IconCheck,
  IconExternalLink,
  IconDownload,
  IconSparkles,
} from '@tabler/icons-react';
import { toast } from 'sonner';

export interface EmbedShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessSlug: string;
  businessName: string;
}

export function EmbedShareDialog({
  open,
  onOpenChange,
  businessSlug,
  businessName,
}: EmbedShareDialogProps) {
  const [activeTab, setActiveTab] = useState<'link' | 'embed' | 'qr'>('link');
  const [copiedType, setCopiedType] = useState<'link' | 'embed' | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isTransparent, setIsTransparent] = useState(false);
  const [embedHeight, setEmbedHeight] = useState('720px');

  // Compute absolute URLs safely
  const origin = React.useSyncExternalStore(
    () => () => {},
    () => (typeof window !== 'undefined' ? window.location.origin : ''),
    () => ''
  );

  const bookingUrl = `${origin || ''}/appointments/${businessSlug}`;
  const embedUrl = `${origin || ''}/embed/${businessSlug}${isTransparent ? '?bg=transparent' : ''}`;

  const iframeSnippet = `<iframe src="${embedUrl}" width="100%" height="${embedHeight}" frameborder="0" style="border:0; width:100%; min-height:${embedHeight};" title="Book Appointment with ${businessName}"></iframe>`;

  // Generate QR code Data URL
  useEffect(() => {
    if (!bookingUrl) return;

    let isMounted = true;

    QRCode.toDataURL(bookingUrl, {
      width: 256,
      margin: 2,
      color: {
        dark: '#1e293b',
        light: '#ffffff',
      },
    })
      .then((url) => {
        if (isMounted) setQrDataUrl(url);
      })
      .catch(() => {
        // Fallback or silent catch
      });

    return () => {
      isMounted = false;
    };
  }, [bookingUrl]);

  const handleCopy = async (text: string, type: 'link' | 'embed') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedType(type);
      toast.success(
        type === 'link'
          ? 'Booking link copied to clipboard!'
          : 'Iframe embed code copied to clipboard!'
      );
      setTimeout(() => setCopiedType(null), 2500);
    } catch {
      toast.error('Failed to copy to clipboard.');
    }
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `${businessSlug}-booking-qr.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success('QR Code image downloaded.');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden border-border/70 shadow-2xl">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-card p-6 border-b">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <IconSparkles className="text-primary" size={20} />
              <span>Share & Embed Booking Flow</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Share your direct booking link, embed a seamless widget on any website, or scan a QR code.
            </DialogDescription>
          </DialogHeader>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1.5 mt-4 p-1 bg-muted/60 rounded-xl border">
            <button
              type="button"
              onClick={() => setActiveTab('link')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'link'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <IconLink size={14} />
              <span>Direct Link</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('embed')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'embed'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <IconCode size={14} />
              <span>Embed Widget</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('qr')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'qr'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <IconQrcode size={14} />
              <span>QR Code</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Direct Link */}
        {activeTab === 'link' && (
          <div className="p-6 space-y-4 animate-in fade-in-50 duration-200">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                Public Booking Link
              </Label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <IconLink
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    readOnly
                    value={bookingUrl}
                    className="pl-9 text-xs font-mono select-all h-10 rounded-xl"
                  />
                </div>
                <Button
                  type="button"
                  onClick={() => handleCopy(bookingUrl, 'link')}
                  className="h-10 px-4 rounded-xl flex items-center gap-1.5 text-xs font-medium cursor-pointer shrink-0"
                >
                  {copiedType === 'link' ? (
                    <>
                      <IconCheck size={14} className="stroke-[3]" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <IconCopy size={14} />
                      <span>Copy Link</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-muted/30 border text-xs text-muted-foreground flex items-center justify-between">
              <span>Share this link via WhatsApp, Instagram bio, SMS, or Email.</span>
              <a
                href={bookingUrl}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline font-semibold flex items-center gap-1 shrink-0 ml-2"
              >
                <span>Open</span>
                <IconExternalLink size={13} />
              </a>
            </div>
          </div>
        )}

        {/* Tab 2: Embed Iframe Snippet */}
        {activeTab === 'embed' && (
          <div className="p-6 space-y-4 animate-in fade-in-50 duration-200">
            {/* Height & Transparent Background Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-muted-foreground">Height Preset:</span>
                {(['680px', '720px', '800px'] as const).map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setEmbedHeight(h)}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono transition-colors cursor-pointer ${
                      embedHeight === h
                        ? 'bg-primary text-primary-foreground font-bold border-primary'
                        : 'bg-muted/40 hover:bg-muted text-foreground'
                    }`}
                  >
                    {h}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setIsTransparent((t) => !t)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <Badge
                  variant="outline"
                  className={`text-[10px] ${isTransparent ? 'bg-primary text-primary-foreground border-primary' : ''}`}
                >
                  {isTransparent ? 'Transparent BG: ON' : 'Transparent BG: OFF'}
                </Badge>
              </button>
            </div>

            {/* Iframe Code Box */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-muted-foreground">
                  HTML Embed Snippet (WordPress, Shopify, Webflow, Squarespace)
                </Label>
                <Badge variant="secondary" className="text-[10px]">
                  iframe
                </Badge>
              </div>

              <textarea
                readOnly
                rows={3}
                value={iframeSnippet}
                className="w-full p-3 rounded-xl border border-input bg-muted/40 font-mono text-xs text-foreground select-all resize-none focus:outline-none focus:ring-2 focus:ring-ring leading-relaxed"
              />
            </div>

            {/* Copy Button & Live Preview Link */}
            <div className="flex items-center justify-between pt-1">
              <a
                href={embedUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
              >
                <IconExternalLink size={13} />
                <span>Test Frameless Embed View</span>
              </a>

              <Button
                type="button"
                onClick={() => handleCopy(iframeSnippet, 'embed')}
                className="h-9 px-4 rounded-xl flex items-center gap-1.5 text-xs font-medium cursor-pointer shadow-sm"
              >
                {copiedType === 'embed' ? (
                  <>
                    <IconCheck size={14} className="stroke-[3]" />
                    <span>Copied Snippet!</span>
                  </>
                ) : (
                  <>
                    <IconCopy size={14} />
                    <span>Copy HTML Snippet</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Tab 3: Live QR Code */}
        {activeTab === 'qr' && (
          <div className="p-6 text-center space-y-4 animate-in fade-in-50 duration-200">
            <div className="flex justify-center">
              {qrDataUrl ? (
                <div className="p-3 bg-white rounded-2xl border shadow-md inline-block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrDataUrl}
                    alt={`QR Code for ${businessName}`}
                    className="w-48 h-48 rounded-xl object-contain"
                  />
                </div>
              ) : (
                <div className="w-48 h-48 rounded-2xl border bg-muted/30 flex items-center justify-center animate-pulse">
                  <IconQrcode size={32} className="text-muted-foreground" />
                </div>
              )}
            </div>

            <div>
              <p className="font-semibold text-xs text-foreground">
                Scan with Phone Camera to Book Instantly
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5 max-w-xs mx-auto">
                Print this QR code on salon counters, business cards, table tents, or posters.
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadQr}
              disabled={!qrDataUrl}
              className="h-9 rounded-xl text-xs gap-1.5 cursor-pointer font-medium"
            >
              <IconDownload size={14} />
              <span>Download High-Res QR Image</span>
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
