import { ProfileForm } from "@/components/customer/profile-form";
import { ChangePasswordForm } from "@/components/customer/change-password-form";
import { getCustomerProfileAction } from "@/actions/customer-appointment";

export const dynamic = "force-dynamic";

export default async function CustomerProfilePage() {
  const res = await getCustomerProfileAction();
  const profile = res.data || {
    id: '',
    name: '',
    email: '',
    contact: '',
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Account Settings
        </h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          Manage your personal details and security preferences.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <ProfileForm initialData={profile} />
        </div>
        <div>
          <ChangePasswordForm />
        </div>
      </div>
    </div>
  );
}
