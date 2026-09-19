import { requireRole } from "@/lib/guards";
import { ACCESS } from "@/lib/roles";
import { connectToDatabase } from "@/lib/db";
import { Coupon } from "@/models/Coupon";
import { CouponDataTable } from "@/components/super-admin/coupon-data-table";
import type { CouponItem } from "@/actions/coupon";

export const metadata = {
  title: "Manage Coupon | Super Admin",
};

export const revalidate = 0;

export default async function CouponsPage() {
  await requireRole(ACCESS.superAdmin, "/super-admin/coupons");

  await connectToDatabase();

  const rawCoupons = await Coupon.find().sort({ createdAt: -1 }).lean();

  const coupons: CouponItem[] = rawCoupons.map((c) => ({
    id: String(c._id),
    name: c.name,
    code: c.code,
    discountType: (c.discountType as "percentage" | "flat") || "percentage",
    discount: c.discount,
    limit: c.limit,
    usedCount: c.usedCount || 0,
    expiryDate: c.expiryDate ? new Date(c.expiryDate).toLocaleDateString() : null,
    isActive: c.isActive ?? true,
    createdAt: new Date(c.createdAt).toLocaleDateString(),
  }));

  return (
    <div className="w-full">
      <CouponDataTable initialCoupons={coupons} />
    </div>
  );
}
