import { requireRole } from "@/lib/guards";
import { ACCESS } from "@/lib/roles";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { IconShieldCheck, IconUser, IconMail } from "@tabler/icons-react";

export const metadata = {
  title: "Profile | BookingGo Super Admin",
};

export default async function ProfilePage() {
  const session = await requireRole(ACCESS.superAdmin, "/super-admin/profile");

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Administrator Profile
        </h1>
        <p className="text-sm text-muted-foreground">
          Personal details and administrative access privileges.
        </p>
      </div>

      <Card className="rounded-2xl border-border bg-card p-6 shadow-xs">
        <CardHeader className="flex flex-row items-center gap-4 p-0 pb-6">
          <Avatar className="size-16 border-2 border-primary/20 bg-primary/10 text-primary">
            <AvatarFallback className="text-xl font-bold">
              {session.user.name?.slice(0, 2).toUpperCase() || "SA"}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-1">
            <CardTitle className="text-lg font-bold text-foreground">
              {session.user.name || "Super Admin"}
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              {session.user.email}
            </CardDescription>
            <div className="pt-1">
              <Badge variant="secondary" className="gap-1 text-[11px] capitalize">
                <IconShieldCheck size={14} />
                {session.user.role}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 border-t border-border/50 p-0 pt-6 text-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <IconUser size={16} />
              <span>Full Name</span>
            </div>
            <span className="font-semibold text-foreground">{session.user.name}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <IconMail size={16} />
              <span>Email Address</span>
            </div>
            <span className="font-semibold text-foreground">{session.user.email}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <IconShieldCheck size={16} />
              <span>Assigned Security Scope</span>
            </div>
            <Badge variant="outline" className="text-xs font-mono">
              ROLE_SUPER_ADMIN
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
