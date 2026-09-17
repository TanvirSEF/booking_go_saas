"use client";

import {
  IconCheck,
  IconClock,
  IconTruck,
  IconShieldCheck,
  IconTool,
  IconAlertCircle,
  IconFlag,
  IconStar,
  IconPackage,
  IconFlame,
  IconSparkles,
  IconCar,
  IconCircleCheck,
  IconEye,
  IconTag,
} from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  "circle-check": IconCircleCheck,
  "check": IconCheck,
  "clock": IconClock,
  "shield-check": IconShieldCheck,
  "truck": IconTruck,
  "car": IconCar,
  "tool": IconTool,
  "package": IconPackage,
  "flag": IconFlag,
  "star": IconStar,
  "flame": IconFlame,
  "sparkles": IconSparkles,
  "alert": IconAlertCircle,
  "eye": IconEye,
  "tag": IconTag,
};

export const ICON_OPTIONS = Object.keys(ICON_MAP).map((key) => ({
  name: key,
  icon: ICON_MAP[key],
}));

interface StatusBadgePreviewProps {
  title: string;
  statusColor: string;
  icon?: string;
  className?: string;
}

export function StatusBadgePreview({
  title,
  statusColor,
  icon,
  className,
}: StatusBadgePreviewProps) {
  const IconComponent = (icon && ICON_MAP[icon]) ? ICON_MAP[icon] : IconCircleCheck;
  const color = statusColor || "#14b8a6";

  return (
    <Badge
      variant="outline"
      className={cn(
        "px-2.5 py-1 text-xs font-semibold rounded-full gap-1.5 inline-flex items-center transition-all border shadow-2xs",
        className
      )}
      style={{
        backgroundColor: `${color}18`,
        borderColor: `${color}40`,
        color: color,
      }}
    >
      <IconComponent className="w-3.5 h-3.5 shrink-0" />
      <span>{title || "Untitled Status"}</span>
    </Badge>
  );
}
