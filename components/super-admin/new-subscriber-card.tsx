"use client";

import { IconPlus } from "@tabler/icons-react";

interface NewSubscriberCardProps {
  onClick: () => void;
}

export function NewSubscriberCard({ onClick }: NewSubscriberCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex min-h-[250px] w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-primary/35 bg-card p-6 text-center shadow-xs transition-all hover:border-primary hover:bg-primary/[0.02] cursor-pointer"
    >
      <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-2xs transition-transform group-hover:scale-105">
        <IconPlus size={20} stroke={2.5} />
      </div>
      <span className="mt-3 text-sm font-semibold text-foreground">
        New Subscriber
      </span>
      <span className="mt-1 text-xs text-muted-foreground">
        Click here to Create New Subscriber
      </span>
    </button>
  );
}
