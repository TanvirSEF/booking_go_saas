import React from "react";
import {
  IconCar,
  IconShieldLock,
  IconBrandPaypal,
  IconCamera,
  IconBrandStripe,
  IconCheck,
  IconMinus,
} from "@tabler/icons-react";

export interface SystemModule {
  id: string;
  name: string;
  category: string;
  iconBg: string;
  iconColor: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  defaultMonthlyPrice: number;
  defaultYearlyPrice: number;
}

export const SYSTEM_MODULES: SystemModule[] = [
  {
    id: "CarService",
    name: "Car Service",
    category: "Theme Addon",
    iconBg: "bg-orange-500/10",
    iconColor: "text-orange-500",
    icon: IconCar,
    defaultMonthlyPrice: 0,
    defaultYearlyPrice: 0,
  },
  {
    id: "GoogleCaptcha",
    name: "Google Captcha",
    category: "Security Addon",
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-500",
    icon: IconShieldLock,
    defaultMonthlyPrice: 0,
    defaultYearlyPrice: 0,
  },
  {
    id: "Paypal",
    name: "Paypal",
    category: "Payment Gateway Addon",
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-500",
    icon: IconBrandPaypal,
    defaultMonthlyPrice: 0,
    defaultYearlyPrice: 0,
  },
  {
    id: "Photography",
    name: "Photography",
    category: "Theme Addon",
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-500",
    icon: IconCamera,
    defaultMonthlyPrice: 0,
    defaultYearlyPrice: 0,
  },
  {
    id: "Stripe",
    name: "Stripe",
    category: "Payment Gateway Addon",
    iconBg: "bg-indigo-500/10",
    iconColor: "text-indigo-500",
    icon: IconBrandStripe,
    defaultMonthlyPrice: 0,
    defaultYearlyPrice: 0,
  },
];

export function ModuleCheckIndicator({ isIncluded }: { isIncluded: boolean }) {
  if (isIncluded) {
    return (
      <div className="flex size-5 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
        <IconCheck size={13} stroke={2.5} />
      </div>
    );
  }

  return (
    <div className="flex size-5 items-center justify-center rounded-full bg-muted text-muted-foreground/50">
      <IconMinus size={13} stroke={2.5} />
    </div>
  );
}
