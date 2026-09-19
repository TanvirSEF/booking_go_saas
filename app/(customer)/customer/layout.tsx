import { ReactNode } from "react";
import { requireRole } from "@/lib/guards";
import { ACCESS } from "@/lib/roles";
import { CustomerNav } from "@/components/customer/customer-nav";

interface CustomerLayoutProps {
  children: ReactNode;
}

export default async function CustomerLayout({ children }: CustomerLayoutProps) {
  const session = await requireRole(ACCESS.customer, "/customer");

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <CustomerNav user={session.user} />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
