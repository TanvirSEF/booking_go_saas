import { notFound } from "next/navigation";
import { requireRole } from "@/lib/guards";
import { ACCESS } from "@/lib/roles";
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
  const { id } = await params;
  await requireRole(ACCESS.superAdmin, `/super-admin/coupons/${id}`);
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
