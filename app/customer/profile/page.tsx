import { getCustomerProfileAction } from "@/actions/customer-appointment";
import { ProfileForm } from "@/components/customer/profile-form";
import { ChangePasswordForm } from "@/components/customer/change-password-form";

export const dynamic = "force-dynamic";

export default async function CustomerProfilePage() {
  const res = await getCustomerProfileAction();
  const profile = res.data || {
    id: '',
    name: '',
    email: '',
    contact: '',
  };

  const initialData = profile || {
    name: "",
    email: "",
    contact: "",
    gender: "",
    dob: "",
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Profile & Security Settings
        </h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          Manage your personal details, contact preferences, and account security.
        </p>
      </div>

      <div className="space-y-6">
        <ProfileForm initialData={initialData} />
        <ChangePasswordForm />
      </div>
    </div>
  );
}
