import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { CustomerNav } from "@/components/customer/customer-nav";

interface CustomerLayoutProps {
  children: ReactNode;
}

export default async function CustomerLayout({ children }: CustomerLayoutProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?callbackUrl=/customer");
  }

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-zinc-950 flex flex-col">
      <CustomerNav user={session.user} />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
