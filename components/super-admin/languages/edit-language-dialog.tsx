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
import { IconEdit, IconLoader2 } from '@tabler/icons-react';
import { toast } from 'sonner';
import { updateLanguageAction } from '@/actions/language';
import type { LanguageDTO, LanguageDirection } from '@/types/language';
import { getLanguageFlag } from '@/lib/language-utils';

interface EditLanguageDialogProps {
  language: LanguageDTO | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface EditFormInnerProps {
  language: LanguageDTO;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

function EditFormInner({ language, onOpenChange, onSuccess }: EditFormInnerProps) {
  const [name, setName] = React.useState(language.name);
  const [direction, setDirection] = React.useState<LanguageDirection>(language.direction);
  const [isDefault, setIsDefault] = React.useState(language.isDefault);
  const [status, setStatus] = React.useState(language.status);
  const [isPending, startTransition] = React.useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Language name is required');
      return;
    }

    startTransition(async () => {
      try {
        const res = await updateLanguageAction(language.code, {
          name: name.trim(),
          direction,
          isDefault,
          status,
        });

        if (res.success) {
          toast.success(res.message || 'Language updated successfully');
          onOpenChange(false);
          onSuccess?.();
        } else {
          toast.error(res.error || 'Failed to update language');
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'An error occurred';
        toast.error(msg);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <IconEdit size={16} />
          </div>
          <span>Edit Language: {language.name}</span>
        </DialogTitle>
        <DialogDescription className="text-xs text-muted-foreground">
          Update display title, layout direction, and fallback defaults for {getLanguageFlag(language.code)} {language.code.toUpperCase()}.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        {/* Readonly ISO Code */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-foreground">Language Code</Label>
          <Input
            value={language.code}
            disabled
            className="h-9 text-xs font-mono uppercase bg-muted/50 cursor-not-allowed"
          />
        </div>

        {/* Display Name */}
        <div className="space-y-1.5">
          <Label htmlFor="edit-name" className="text-xs font-semibold text-foreground">
            Display Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="edit-name"
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
          <Label htmlFor="edit-direction" className="text-xs font-semibold text-foreground">
            Text Direction
          </Label>
          <Select
            value={direction}
            onValueChange={(val: LanguageDirection) => setDirection(val)}
            disabled={isPending}
          >
            <SelectTrigger id="edit-direction" className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ltr" className="text-xs">
                Left-to-Right (LTR)
              </SelectItem>
              <SelectItem value="rtl" className="text-xs">
                Right-to-Left (RTL)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Status Switch */}
        <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 p-3">
          <div className="space-y-0.5">
            <Label htmlFor="edit-status" className="text-xs font-semibold text-foreground cursor-pointer">
              Active in App
            </Label>
            <p className="text-[11px] text-muted-foreground">
              {language.isDefault
                ? 'Default system language cannot be disabled.'
                : 'When disabled, users cannot select this language.'}
            </p>
          </div>
          <Switch
            id="edit-status"
            checked={status}
            onCheckedChange={setStatus}
            disabled={isPending || language.isDefault}
          />
        </div>

        {/* Default Switch */}
        <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 p-3">
          <div className="space-y-0.5">
            <Label htmlFor="edit-isDefault" className="text-xs font-semibold text-foreground cursor-pointer">
              Default Language
            </Label>
            <p className="text-[11px] text-muted-foreground">
              Make this the default fallback locale for the entire platform.
            </p>
          </div>
          <Switch
            id="edit-isDefault"
            checked={isDefault}
            onCheckedChange={setIsDefault}
            disabled={isPending || language.isDefault}
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
        <Button type="submit" size="sm" disabled={isPending || !name.trim()} className="text-xs">
          {isPending ? (
            <>
              <IconLoader2 size={14} className="animate-spin mr-1.5" />
              <span>Saving...</span>
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function EditLanguageDialog({
  language,
  open,
  onOpenChange,
  onSuccess,
}: EditLanguageDialogProps) {
  if (!language) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px] rounded-2xl">
        <EditFormInner
          key={language.code}
          language={language}
          onOpenChange={onOpenChange}
          onSuccess={onSuccess}
        />
      </DialogContent>
    </Dialog>
  );
}
