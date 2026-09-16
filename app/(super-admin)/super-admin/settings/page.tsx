import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IconSettings, IconShieldCheck } from "@tabler/icons-react";

export const metadata = {
  title: "Global Settings | Super Admin",
};

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Global Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          System-wide brand configuration, payment gateway keys, and platform defaults.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card className="rounded-2xl border-border bg-card p-6 shadow-xs">
          <CardHeader className="p-0 pb-4">
            <div className="flex items-center gap-2 text-primary font-semibold">
              <IconSettings size={18} />
              <span>Platform Configuration</span>
            </div>
            <CardTitle className="mt-1 text-base font-bold text-foreground">
              General System Settings
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Configure brand logo, title, and currency defaults.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 p-0 pt-2 text-xs">
            <div className="flex justify-between border-b border-border/50 py-2">
              <span className="text-muted-foreground">Platform Name</span>
              <span className="font-semibold text-foreground">BookingGo</span>
            </div>
            <div className="flex justify-between border-b border-border/50 py-2">
              <span className="text-muted-foreground">Default Currency</span>
              <span className="font-semibold text-foreground">USD ($)</span>
            </div>
            <div className="flex justify-between border-b border-border/50 py-2">
              <span className="text-muted-foreground">Primary Accent</span>
              <Badge variant="secondary" className="text-[10px]">Purple Nova</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border bg-card p-6 shadow-xs">
          <CardHeader className="p-0 pb-4">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold">
              <IconShieldCheck size={18} />
              <span>Security & Infrastructure</span>
            </div>
            <CardTitle className="mt-1 text-base font-bold text-foreground">
              Environment & Runtime
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Role-Based Access Control & NextAuth v5 session security.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 p-0 pt-2 text-xs">
            <div className="flex justify-between border-b border-border/50 py-2">
              <span className="text-muted-foreground">Next.js Framework</span>
              <span className="font-semibold text-foreground">16.3.4 (App Router)</span>
            </div>
            <div className="flex justify-between border-b border-border/50 py-2">
              <span className="text-muted-foreground">Route Guarding</span>
              <span className="font-semibold text-foreground">proxy.ts + SSR Layout</span>
            </div>
            <div className="flex justify-between border-b border-border/50 py-2">
              <span className="text-muted-foreground">Active Database</span>
              <span className="font-semibold text-foreground">MongoDB Atlas</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
