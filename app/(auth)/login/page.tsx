import { Suspense } from "react";
import { Metadata } from "next";
import { LoginHeader } from "./components/login-header";
import { LoginCard } from "./components/login-card";
import { LoginForm } from "./components/login-form";
import { LoginFooter } from "./components/login-footer";

export const metadata: Metadata = {
  title: "Login | BookingGo",
  description: "Log in to your BookingGo account",
};

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen w-full flex-col justify-between overflow-x-hidden bg-[#fafbfc] dark:bg-background">
      {/* Subtle Dot Grid Background Pattern matching screenshot */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#818cf8_1.2px,transparent_1.2px)] [background-size:36px_36px] opacity-40 dark:bg-[radial-gradient(#6366f1_1.2px,transparent_1.2px)] dark:opacity-20" />

      {/* Top Floating Navbar */}
      <div className="relative z-10 w-full px-4 pt-6">
        <LoginHeader />
      </div>

      {/* Main Login Card Section */}
      <main className="relative z-10 my-auto flex w-full items-center justify-center px-4 py-12">
        <LoginCard>
          <Suspense
            fallback={
              <div className="flex h-64 items-center justify-center text-xs text-muted-foreground">
                Loading...
              </div>
            }
          >
            <LoginForm />
          </Suspense>
        </LoginCard>
      </main>

      {/* Bottom Copyright Pill */}
      <div className="relative z-10 w-full px-4">
        <LoginFooter />
      </div>
    </div>
  );
}
