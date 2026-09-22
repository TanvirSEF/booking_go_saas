import type { ITopbarSetting } from "@/types/landing-page";

interface LandingTopbarProps {
  data: ITopbarSetting;
}

export function LandingTopbar({ data }: LandingTopbarProps) {
  if (!data?.status || !data?.notificationMsg) {
    return null;
  }

  return (
    <div className="w-full bg-primary text-primary-foreground py-2 px-4 text-center text-xs font-medium tracking-wide flex items-center justify-center gap-2 relative z-50">
      <span className="inline-flex items-center rounded-full bg-primary-foreground/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
        Offer
      </span>
      <span>{data.notificationMsg}</span>
    </div>
  );
}
