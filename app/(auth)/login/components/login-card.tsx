import { ReactNode } from "react";

interface LoginCardProps {
  children: ReactNode;
}

export function LoginCard({ children }: LoginCardProps) {
  return (
    <div className="relative w-full max-w-[440px]">
      {/* Top-Left Corner Accent Bracket */}
      <div className="pointer-events-none absolute -top-3 -left-3 size-6 rounded-tl-lg border-t-2 border-l-2 border-[#584ED2]" />

      {/* Bottom-Right Corner Accent Bracket */}
      <div className="pointer-events-none absolute -bottom-3 -right-3 size-6 rounded-br-lg border-b-2 border-r-2 border-[#584ED2]" />

      {/* Main Card Container */}
      <div className="relative w-full rounded-2xl border border-slate-100 bg-white p-8 shadow-sm sm:p-10 dark:border-slate-800 dark:bg-card">
        {/* Title & Subtitle */}
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-foreground">
            Log in to your account
          </h1>
          <p className="mt-2 text-xs text-slate-500 sm:text-sm dark:text-muted-foreground">
            Enter your email and password below to log in
          </p>
        </div>

        {children}
      </div>
    </div>
  );
}
