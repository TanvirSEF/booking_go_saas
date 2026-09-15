import { connectToDatabase } from "@/lib/db";
import { Coupon } from "@/models/Coupon";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IconTicket } from "@tabler/icons-react";

export const metadata = {
  title: "Coupon Codes | Super Admin",
};

export default async function CouponsPage() {
  await connectToDatabase();
  const coupons = await Coupon.find().lean();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Coupon Codes
        </h1>
        <p className="text-sm text-muted-foreground">
          Promotional discounts and coupons for subscription plans.
        </p>
      </div>

      {coupons.length === 0 ? (
        <Card className="flex flex-col items-center justify-center rounded-2xl border-dashed border-border p-12 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <IconTicket size={24} />
          </div>
          <CardTitle className="mt-4 text-base font-semibold text-foreground">
            No Coupons Created Yet
          </CardTitle>
          <CardDescription className="mt-1 text-xs text-muted-foreground">
            Promotional codes created by the administrator will be managed from this screen.
          </CardDescription>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {coupons.map((coupon) => (
            <Card key={String(coupon._id)} className="rounded-2xl border-border bg-card p-5">
              <CardHeader className="p-0 pb-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="font-mono text-xs">
                    {coupon.code}
                  </Badge>
                  <span className="text-sm font-bold text-foreground">
                    {coupon.discount}% OFF
                  </span>
                </div>
                <CardTitle className="mt-2 text-sm font-semibold text-card-foreground">
                  {coupon.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="border-t border-border/50 p-0 pt-3 text-xs text-muted-foreground">
                Limit: {coupon.limit} uses
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
