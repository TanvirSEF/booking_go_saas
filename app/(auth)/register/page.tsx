import { Suspense } from "react";
import { Metadata } from "next";
import { LoginHeader } from "../login/components/login-header";
import { LoginFooter } from "../login/components/login-footer";
import { RegisterCard } from "./components/register-card";
import { RegisterForm } from "./components/register-form";

export const metadata: Metadata = {
  title: "Register Company | BookingGo",
  description: "Create your company account and start managing appointments, staff, and services with BookingGo SaaS.",
};

export default function RegisterPage() {
  return (
    <div className="relative flex min-h-screen w-full flex-col justify-between overflow-x-hidden bg-[#fafbfc] dark:bg-background">
      {/* Subtle Dot Grid Background Pattern matching brand aesthetic */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#818cf8_1.2px,transparent_1.2px)] [background-size:36px_36px] opacity-40 dark:bg-[radial-gradient(#6366f1_1.2px,transparent_1.2px)] dark:opacity-20" />

      {/* Top Floating Navbar */}
      <div className="relative z-10 w-full px-4 pt-6">
        <LoginHeader />
      </div>

      {/* Main Registration Card Section */}
      <main className="relative z-10 my-auto flex w-full items-center justify-center px-4 py-10">
        <RegisterCard>
          <Suspense
            fallback={
              <div className="flex h-64 items-center justify-center text-xs text-muted-foreground">
                Loading registration form...
              </div>
            }
          >
            <RegisterForm />
          </Suspense>
        </RegisterCard>
      </main>

      {/* Bottom Copyright Pill */}
      <div className="relative z-10 w-full px-4">
        <LoginFooter />
      </div>
    </div>
  );
}
