import { redirect } from "next/navigation";
import { requireRole, getSession } from "@/lib/guards";
import { ACCESS, ROLES } from "@/lib/roles";
import { getActiveBusiness } from "@/lib/business";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { CompanySidebar } from "@/components/dashboard/company-sidebar";
import { CompanyHeader } from "@/components/dashboard/company-header";

import { ImpersonationBanner } from "@/components/dashboard/impersonation-banner";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();

  if (!session?.user) {
    redirect("/login?callbackUrl=/dashboard");
  }

  // Super Admin can view /dashboard only if they have an active business selected
  if (session.user.role === ROLES.SUPER_ADMIN) {
    if (!session.user.activeBusinessId) {
      redirect("/super-admin");
    }
  } else {
    // For non-super admins, require company or staff role
    await requireRole(ACCESS.company, "/dashboard");
  }

  const business = await getActiveBusiness(session.user);

  return (
    <div data-theme="company" className="contents">
      <SidebarProvider data-theme="company">
        <CompanySidebar businessName={business?.name} />
        <SidebarInset>
          <ImpersonationBanner
            isImpersonating={Boolean(session.user.isImpersonating)}
            originalAdminName={session.user.originalAdminName}
            currentCompanyName={session.user.name || business?.name}
          />
          <CompanyHeader
            user={session.user}
            businessName={business?.name}
            businessSlug={business?.slug}
          />
          <main className="flex-1 overflow-y-auto overflow-x-hidden min-w-0 bg-muted/10 p-3 sm:p-4 md:p-6">
            <div className="mx-auto w-full min-w-0">{children}</div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
