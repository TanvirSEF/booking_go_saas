import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getCouponDetailsAction } from "@/actions/coupon";
import { CouponDetailsView } from "@/components/super-admin/coupon-details-view";

export const metadata = {
  title: "Coupon Details | Super Admin",
};

interface CouponDetailsPageProps {
  params: Promise<{ id: string }>;
}

export default async function CouponDetailsPage({
  params,
}: CouponDetailsPageProps) {
  const session = await auth();
  if (!session?.user || session.user.role !== "super admin") {
    redirect("/login");
  }

  const { id } = await params;
  const result = await getCouponDetailsAction(id);

  if (!result.success || !result.coupon) {
    notFound();
  }

  return (
    <CouponDetailsView
      coupon={result.coupon}
      redemptions={result.redemptions || []}
    />
  );
}
