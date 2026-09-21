'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { IconPlus, IconLoader2, IconInfoCircle } from '@tabler/icons-react';
import { toast } from 'sonner';
import { createLanguageAction } from '@/actions/language';
import type { LanguageDirection } from '@/types/language';

interface CreateLanguageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const ISO_CODE_REGEX = /^[a-z]{2,3}(-[a-zA-Z]{2,4})?$/;

export function CreateLanguageDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateLanguageDialogProps) {
  const [code, setCode] = React.useState('');
  const [name, setName] = React.useState('');
  const [direction, setDirection] = React.useState<LanguageDirection>('ltr');
  const [isDefault, setIsDefault] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const [codeError, setCodeError] = React.useState<string | null>(null);

  const resetForm = () => {
    setCode('');
    setName('');
    setDirection('ltr');
    setIsDefault(false);
    setCodeError(null);
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toLowerCase().trim();
    setCode(val);
    if (val.length > 0 && !ISO_CODE_REGEX.test(val)) {
      setCodeError('Invalid ISO format. Examples: "en", "es", "ar", "zh-CN"');
    } else {
      setCodeError(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedCode = code.toLowerCase().trim();
    if (!ISO_CODE_REGEX.test(normalizedCode)) {
      setCodeError('Valid ISO code is required (e.g., "es", "fr", "ar", "zh-CN")');
      return;
    }

    if (!name.trim()) {
      toast.error('Language name is required');
      return;
    }

    startTransition(async () => {
      try {
        const res = await createLanguageAction({
          code: normalizedCode,
          name: name.trim(),
          direction,
          isDefault,
          status: true,
        });

        if (res.success) {
          toast.success(res.message || 'Language created successfully!');
          resetForm();
          onOpenChange(false);
          onSuccess?.();
        } else {
          toast.error(res.error || 'Failed to create language');
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'An error occurred';
        toast.error(msg);
      }
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!isPending) {
          if (!val) resetForm();
          onOpenChange(val);
        }
      }}
    >
      <DialogContent className="sm:max-w-[480px] rounded-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <IconPlus size={16} />
              </div>
              <span>Add System Language</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Create a new locale. Standard English dictionary keys will be automatically cloned to initialize translations.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Language Code */}
            <div className="space-y-1.5">
              <Label htmlFor="code" className="text-xs font-semibold text-foreground">
                Language ISO Code <span className="text-destructive">*</span>
              </Label>
              <Input
                id="code"
                placeholder="e.g. es, ar, fr, de, zh-CN"
                value={code}
                onChange={handleCodeChange}
                disabled={isPending}
                className="h-9 text-xs font-mono lowercase"
                maxLength={10}
                required
              />
              {codeError ? (
                <p className="text-[11px] text-destructive font-medium">{codeError}</p>
              ) : (
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <IconInfoCircle size={12} />
                  <span>2 or 3 letter lowercase ISO-639 locale identifier</span>
                </p>
              )}
            </div>

            {/* Language Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-semibold text-foreground">
                Display Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g. Spanish, Arabic, German"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isPending}
                className="h-9 text-xs"
                maxLength={60}
                required
              />
            </div>

            {/* Direction */}
            <div className="space-y-1.5">
              <Label htmlFor="direction" className="text-xs font-semibold text-foreground">
                Layout Direction
              </Label>
              <Select
                value={direction}
                onValueChange={(val: LanguageDirection) => setDirection(val)}
                disabled={isPending}
              >
                <SelectTrigger id="direction" className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ltr" className="text-xs">
                    Left-to-Right (LTR) — e.g. English, Spanish
                  </SelectItem>
                  <SelectItem value="rtl" className="text-xs">
                    Right-to-Left (RTL) — e.g. Arabic, Hebrew
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Default Switch */}
            <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 p-3">
              <div className="space-y-0.5">
                <Label htmlFor="isDefault" className="text-xs font-semibold text-foreground cursor-pointer">
                  Set as Default System Language
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  New visitors without stored preferences will automatically use this locale.
                </p>
              </div>
              <Switch
                id="isDefault"
                checked={isDefault}
                onCheckedChange={setIsDefault}
                disabled={isPending}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isPending || !code || !name || !!codeError}
              className="text-xs"
            >
              {isPending ? (
                <>
                  <IconLoader2 size={14} className="animate-spin mr-1.5" />
                  <span>Creating Locale...</span>
                </>
              ) : (
                'Create Language'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
