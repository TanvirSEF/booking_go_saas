import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { Business } from "@/models/Business";
import { Plan } from "@/models/Plan";
import {
  SubscribersView,
} from "@/components/super-admin/subscribers-view";
import {
  CompanyItem,
  PlanOption,
} from "@/components/super-admin/company-dialog";

export const metadata = {
  title: "Subscribers | Super Admin",
};

export const revalidate = 0; // Dynamic data for live status

function formatExpireDate(d?: Date | null): string {
  if (!d) return "10-10-26";
  const date = new Date(d);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);
  return `${day}-${month}-${year}`;
}

export default async function CompaniesPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?callbackUrl=/super-admin/companies");
  }

  if (session.user.role !== "super admin") {
    redirect("/dashboard");
  }

  await connectToDatabase();

  // Fetch all company users
  const rawCompanies = await User.find({ role: "company" })
    .populate("activePlanId", "name")
    .sort({ createdAt: -1 })
    .lean();

  // Fetch businesses for each company
  const companyIds = rawCompanies.map((c) => c._id);
  const businesses = await Business.find({ companyId: { $in: companyIds } })
    .select("companyId name slug")
    .lean();

  const businessMap = new Map(
    businesses.map((b) => [String(b.companyId), b])
  );

  // Fetch available subscription plans
  const rawPlans = await Plan.find({ isEnabled: true })
    .select("name packagePriceMonthly")
    .lean();

  const companies: CompanyItem[] = rawCompanies.map((c) => {
    const b = businessMap.get(String(c._id));
    const plan = c.activePlanId as { _id?: unknown; name?: string } | null;

    return {
      id: String(c._id),
      name: c.name,
      email: c.email,
      isActive: c.isActive ?? true,
      role: c.role,
      businessName: b?.name,
      businessSlug: b?.slug,
      planName: plan?.name ? `${plan.name} Plan` : "Basic Plan",
      planId: plan?._id ? String(plan._id) : undefined,
      planExpiredDate: formatExpireDate(c.planExpireDate),
      createdAt: new Date(c.createdAt).toLocaleDateString(),
    };
  });

  const plans: PlanOption[] = rawPlans.map((p) => ({
    id: String(p._id),
    name: p.name,
    packagePriceMonthly: p.packagePriceMonthly,
  }));

  return (
    <div className="w-full">
      <SubscribersView initialCompanies={companies} plans={plans} />
    </div>
  );
}
