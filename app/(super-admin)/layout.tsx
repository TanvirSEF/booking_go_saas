import { requireRole } from "@/lib/guards";
import { ACCESS } from "@/lib/roles";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/super-admin/admin-sidebar";
import { AdminHeader } from "@/components/super-admin/admin-header";

export default async function SuperAdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await requireRole(ACCESS.superAdmin, "/super-admin");

  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset>
        <AdminHeader user={session.user} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden min-w-0 bg-muted/10 p-3 sm:p-4 md:p-6">
          <div className="mx-auto w-full min-w-0">{children}</div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
