import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import { Business } from "@/models/Business";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { CompanySidebar } from "@/components/dashboard/company-sidebar";
import { CompanyHeader } from "@/components/dashboard/company-header";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?callbackUrl=/dashboard");
  }

  if (session.user.role === "super admin") {
    redirect("/super-admin");
  }

  await connectToDatabase();

  let business = null;
  if (session.user.activeBusinessId) {
    business = await Business.findById(session.user.activeBusinessId)
      .select("name slug")
      .lean();
  }

  if (!business) {
    business = await Business.findOne({
      companyId: session.user.companyId || session.user.id,
    })
      .select("name slug")
      .lean();
  }

  return (
    <div data-theme="company" className="contents">
      <SidebarProvider data-theme="company">
        <CompanySidebar businessName={business?.name} />
        <SidebarInset>
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
