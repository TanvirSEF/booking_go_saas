import { Metadata } from "next";
import { IconUser } from "@tabler/icons-react";
import { requireRole } from "@/lib/guards";
import { ACCESS } from "@/lib/roles";
import { getUserProfileAction } from "@/actions/user-profile";
import { PageHeader } from "@/components/dashboard/page-header";
import { ProfileHub } from "@/components/profile/profile-hub";
import type { UserProfileDTO } from "@/types/user-profile";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Account Profile | Company Dashboard",
  description:
    "Manage your company administrative profile, credentials, and interface preferences.",
};

export default async function CompanyProfilePage() {
  const session = await requireRole(ACCESS.company, "/dashboard/profile");

  const res = await getUserProfileAction();
  const profile: UserProfileDTO = res.data || {
    id: session.user.id || "",
    name: session.user.name || "Company Admin",
    email: session.user.email || "",
    mobileNo: "",
    avatar: "/uploads/users-avatar/avatar.png",
    role: session.user.role || "company",
    lang: "en",
    darkMode: false,
    createdAt: new Date().toISOString(),
  };

  return (
    <div className="min-h-screen pb-16">
      <PageHeader
        title="Account Profile"
        description="Manage your personal information, login credentials, and display preferences."
        icon={<IconUser size={22} />}
        breadcrumbs={[{ label: "Account Profile" }]}
      />

      <main className="w-full mx-auto px-4 sm:px-6 pt-8">
        <ProfileHub initialProfile={profile} />
      </main>
    </div>
  );
}
