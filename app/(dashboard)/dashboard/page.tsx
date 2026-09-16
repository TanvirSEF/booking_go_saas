import Link from "next/link";
import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import { IconBuilding, IconLogout, IconShieldCheck } from "@tabler/icons-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Tenant Dashboard | BookingGo",
  description: "Company management portal.",
};

export default async function TenantDashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?callbackUrl=/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/20 p-6">
      <Card className="w-full max-w-lg rounded-2xl border-border bg-card p-6 shadow-md text-center">
        <CardHeader className="space-y-2 p-0 pb-4">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
            <IconBuilding size={32} />
          </div>
          <CardTitle className="text-xl font-bold text-card-foreground">
            Tenant Dashboard
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Welcome, {session.user.name || session.user.email}! You are logged in with the role:
          </CardDescription>
          <div className="flex justify-center pt-1">
            <Badge variant="secondary" className="capitalize">
              {session.user.role}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-4 p-0 pt-4 text-xs text-muted-foreground">
          <div className="rounded-xl border border-border/60 bg-muted/30 p-4 text-left">
            <div className="flex items-center gap-2 font-semibold text-foreground">
              <IconShieldCheck size={16} className="text-amber-500" />
              <span>RBAC Security Confirmation:</span>
            </div>
            <p className="mt-1 leading-relaxed">
              If you arrived here while attempting to access <code className="font-mono text-primary">/super-admin</code>,
              the proxy and layout route-guards correctly intercepted and blocked unauthorized access.
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <Button asChild variant="outline" size="sm" className="rounded-xl">
              <Link href="/super-admin">Try /super-admin</Link>
            </Button>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <Button type="submit" variant="destructive" size="sm" className="gap-2 rounded-xl">
                <IconLogout size={14} />
                <span>Log out</span>
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
