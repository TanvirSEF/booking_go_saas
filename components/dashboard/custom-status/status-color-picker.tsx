"use client";

import { IconCheck } from "@tabler/icons-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const PRESET_COLORS = [
  { name: "Teal", hex: "#14b8a6" },
  { name: "Emerald", hex: "#10b981" },
  { name: "Blue", hex: "#3b82f6" },
  { name: "Indigo", hex: "#6366f1" },
  { name: "Purple", hex: "#8b5cf6" },
  { name: "Pink", hex: "#ec4899" },
  { name: "Rose", hex: "#f43f5e" },
  { name: "Orange", hex: "#f97316" },
  { name: "Amber", hex: "#f59e0b" },
  { name: "Slate", hex: "#64748b" },
];

interface StatusColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  disabled?: boolean;
}

export function StatusColorPicker({
  color,
  onChange,
  disabled = false,
}: StatusColorPickerProps) {
  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.trim();
    if (!val.startsWith("#") && val.length > 0) {
      val = "#" + val;
    }
    onChange(val);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold">Status Color</Label>
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded-full border border-border shadow-xs shrink-0"
            style={{ backgroundColor: color || "#14b8a6" }}
          />
          <span className="text-xs font-mono font-medium text-muted-foreground uppercase">
            {color || "#14b8a6"}
          </span>
        </div>
      </div>

      {/* Preset color swatches */}
      <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
        {PRESET_COLORS.map((preset) => {
          const isSelected = color?.toLowerCase() === preset.hex.toLowerCase();
          return (
            <button
              key={preset.hex}
              type="button"
              disabled={disabled}
              onClick={() => onChange(preset.hex)}
              title={preset.name}
              className={cn(
                "h-8 w-full rounded-lg transition-all flex items-center justify-center relative hover:scale-105 active:scale-95 border",
                isSelected
                  ? "ring-2 ring-primary ring-offset-2 border-transparent scale-105 shadow-xs"
                  : "border-border/40 hover:border-border"
              )}
              style={{ backgroundColor: preset.hex }}
            >
              {isSelected && <IconCheck size={14} className="text-white drop-shadow-md stroke-[3]" />}
            </button>
          );
        })}
      </div>

      {/* Custom Hex input */}
      <div className="flex items-center gap-2 pt-1">
        <div className="relative flex-1">
          <Input
            value={color}
            onChange={handleHexChange}
            placeholder="#14b8a6"
            maxLength={7}
            disabled={disabled}
            className="h-9 text-xs font-mono pl-3"
          />
        </div>
        <input
          type="color"
          value={color?.startsWith("#") && color.length === 7 ? color : "#14b8a6"}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="h-9 w-10 p-0.5 rounded-lg border border-border bg-card cursor-pointer"
        />
      </div>
    </div>
  );
}
