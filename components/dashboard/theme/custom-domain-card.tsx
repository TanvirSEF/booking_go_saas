'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
  IconWorld,
  IconCheck,
  IconAlertCircle,
  IconLoader2,
  IconDeviceFloppy,
  IconRefresh,
  IconCopy,
} from '@tabler/icons-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { saveCustomDomainMappingAction, verifyCustomDomainAction } from '@/actions/theme-setting';
import { cn } from '@/lib/utils';
import type { DomainMappingDTO } from '@/types/theme-setting';

interface CustomDomainCardProps {
  initialData: DomainMappingDTO;
}

const FQDN_REGEX = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
const SUBDOMAIN_REGEX = /^[a-z0-9-]+$/;
const CNAME_TARGET = 'cname.bookinggo.app';

const DNS_ROWS = [
  { type: 'Record Type', value: 'CNAME' },
  { type: 'Host / Name', value: '@ (root) or your-subdomain' },
  { type: 'Target / Value', value: CNAME_TARGET },
  { type: 'TTL', value: '3600 (Auto)' },
];

export function CustomDomainCard({ initialData }: CustomDomainCardProps) {
  const [mapping, setMapping] = useState<DomainMappingDTO>(initialData);
  const [customDomain, setCustomDomain] = useState(initialData.customDomain ?? '');
  const [subdomain, setSubdomain] = useState(initialData.subdomain ?? '');
  const [savePending, startSave] = useTransition();
  const [verifyPending, startVerify] = useTransition();

  const domainError =
    customDomain && !FQDN_REGEX.test(customDomain)
      ? 'Enter a valid FQDN (e.g. booking.mycompany.com)'
      : null;

  const subdomainError =
    subdomain && !SUBDOMAIN_REGEX.test(subdomain)
      ? 'Only lowercase letters, numbers and hyphens allowed'
      : null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (domainError || subdomainError) return;

    startSave(async () => {
      const res = await saveCustomDomainMappingAction({
        customDomain: customDomain || undefined,
        subdomain: subdomain || undefined,
      });
      if (res.success && res.data) {
        setMapping(res.data);
        toast.success(res.message ?? 'Domain mapping saved.');
      } else {
        toast.error(res.error ?? 'Failed to save domain mapping.');
      }
    });
  };

  const handleVerify = () => {
    startVerify(async () => {
      const res = await verifyCustomDomainAction();
      if (res.success) {
        setMapping((prev) => ({
          ...prev,
          isVerified: true,
          verifiedAt: new Date().toISOString(),
        }));
        toast.success('DNS verification successful!');
      } else {
        toast.error(res.error ?? 'DNS verification failed. Check your CNAME record.');
      }
    });
  };

  const copyTarget = () => {
    navigator.clipboard.writeText(CNAME_TARGET);
    toast.success('CNAME target copied to clipboard.');
  };

  return (
    <Card className="border-border/60 bg-card shadow-xs">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <IconWorld size={16} className="text-primary" />
          Domain Configuration
        </CardTitle>
        <CardDescription className="text-xs">
          Point a custom domain to your public booking page using a DNS CNAME record.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="custom-domain" className="text-xs font-semibold">
                Custom Domain (FQDN)
              </Label>
              <Input
                id="custom-domain"
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value.toLowerCase().trim())}
                placeholder="booking.mycompany.com"
                className={cn(
                  'h-9 text-xs font-mono',
                  domainError && 'border-destructive focus-visible:ring-destructive'
                )}
                disabled={savePending}
              />
              {domainError && (
                <p className="text-[11px] text-destructive flex items-center gap-1">
                  <IconAlertCircle size={11} />
                  {domainError}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="subdomain" className="text-xs font-semibold">
                Subdomain Handle
              </Label>
              <div className="relative">
                <Input
                  id="subdomain"
                  value={subdomain}
                  onChange={(e) => setSubdomain(e.target.value.toLowerCase().trim())}
                  placeholder="mycompany"
                  className={cn(
                    'h-9 text-xs font-mono pr-32',
                    subdomainError && 'border-destructive focus-visible:ring-destructive'
                  )}
                  disabled={savePending}
                />
                <span className="absolute right-3 top-2.5 text-[11px] text-muted-foreground font-mono">
                  .bookinggo.app
                </span>
              </div>
              {subdomainError && (
                <p className="text-[11px] text-destructive flex items-center gap-1">
                  <IconAlertCircle size={11} />
                  {subdomainError}
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              size="sm"
              disabled={savePending || !!domainError || !!subdomainError}
              className="h-8 text-xs gap-1.5"
            >
              {savePending ? (
                <IconLoader2 size={13} className="animate-spin" />
              ) : (
                <IconDeviceFloppy size={13} />
              )}
              {savePending ? 'Saving…' : 'Save Domain Mapping'}
            </Button>
          </div>
        </form>

        {/* DNS Instructions */}
        <div className="space-y-3 pt-3 border-t border-border/60">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-foreground">DNS CNAME Configuration</p>
            <div className="flex items-center gap-2">
              {mapping.isVerified ? (
                <Badge className="h-5 px-2 text-[10px] bg-green-500/10 text-green-600 border-green-500/20 dark:text-green-400">
                  <IconCheck size={10} className="mr-1" />
                  Verified
                </Badge>
              ) : (
                <Badge variant="outline" className="h-5 px-2 text-[10px] bg-yellow-500/10 text-yellow-600 border-yellow-500/20 dark:text-yellow-400">
                  <span className="mr-1 text-yellow-500">●</span>
                  Pending DNS Propagation
                </Badge>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/30 overflow-hidden">
            <div className="grid grid-cols-[140px_1fr] text-xs">
              {DNS_ROWS.map((row, i) => (
                <div key={row.type} className={cn('contents', i < DNS_ROWS.length - 1 && '[&>*]:border-b [&>*]:border-border/40')}>
                  <div className="px-3 py-2 font-semibold text-muted-foreground bg-muted/50 border-r border-border/40">
                    {row.type}
                  </div>
                  <div className="px-3 py-2 font-mono text-foreground flex items-center justify-between gap-2">
                    <span>{row.value}</span>
                    {row.value === CNAME_TARGET && (
                      <button
                        type="button"
                        onClick={copyTarget}
                        className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                        title="Copy CNAME target"
                      >
                        <IconCopy size={12} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground">
            Add this CNAME record in your DNS provider (Cloudflare, Namecheap, GoDaddy, etc.), then click{' '}
            <strong className="text-foreground">Verify DNS Record</strong> below. Propagation can take up to 24–48 hours.
          </p>

          {!mapping.isVerified && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={verifyPending || !mapping.customDomain}
              onClick={handleVerify}
              className="h-8 text-xs gap-1.5"
            >
              {verifyPending ? (
                <IconLoader2 size={13} className="animate-spin" />
              ) : (
                <IconRefresh size={13} />
              )}
              {verifyPending ? 'Verifying…' : 'Verify DNS Record'}
            </Button>
          )}

          {mapping.isVerified && mapping.verifiedAt && (
            <p className="text-[11px] text-green-600 dark:text-green-400">
              Verified on {new Date(mapping.verifiedAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
