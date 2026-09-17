'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { IconPlus, IconX } from '@tabler/icons-react';

interface FieldOptionsInputProps {
  options: string[];
  onChange: (options: string[]) => void;
  disabled?: boolean;
}

export function FieldOptionsInput({
  options = [],
  onChange,
  disabled = false,
}: FieldOptionsInputProps) {
  const [newOption, setNewOption] = useState('');

  const handleAddOption = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newOption.trim();
    if (!trimmed) return;

    if (!options.includes(trimmed)) {
      onChange([...options, trimmed]);
    }
    setNewOption('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddOption();
    }
  };

  const handleRemoveOption = (indexToRemove: number) => {
    if (disabled) return;
    onChange(options.filter((_, idx) => idx !== indexToRemove));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Input
          type="text"
          value={newOption}
          onChange={(e) => setNewOption(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type an option and press Add (or Enter)..."
          disabled={disabled}
          className="rounded-xl bg-background border-border text-xs h-9"
        />
        <Button
          type="button"
          onClick={() => handleAddOption()}
          disabled={disabled || !newOption.trim()}
          size="sm"
          className="rounded-xl text-xs font-semibold shrink-0 gap-1"
        >
          <IconPlus size={14} />
          <span>Add</span>
        </Button>
      </div>

      {options.length === 0 ? (
        <p className="text-[11px] text-muted-foreground italic">
          No options added yet. Please provide at least 1 option for this field.
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {options.map((opt, index) => (
            <Badge
              key={`${opt}-${index}`}
              variant="secondary"
              className="rounded-lg text-xs py-1 px-2.5 gap-1.5 flex items-center bg-muted/80 text-foreground border border-border"
            >
              <span>{opt}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemoveOption(index)}
                  className="size-3.5 rounded-full hover:bg-foreground/20 inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <IconX size={10} />
                  <span className="sr-only">Remove {opt}</span>
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
