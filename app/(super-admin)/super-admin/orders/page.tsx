import { connectToDatabase } from "@/lib/db";
import { Order } from "@/models/Order";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IconReceipt } from "@tabler/icons-react";

export const metadata = {
  title: "Orders & Transactions | Super Admin",
};

export default async function OrdersPage() {
  await connectToDatabase();
  const orders = await Order.find()
    .sort({ createdAt: -1 })
    .populate("companyId", "name email")
    .populate("planId", "name")
    .lean();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Orders & Transactions
        </h1>
        <p className="text-sm text-muted-foreground">
          Tenant subscription billing records and transactions.
        </p>
      </div>

      {orders.length === 0 ? (
        <Card className="flex flex-col items-center justify-center rounded-2xl border-dashed border-border p-12 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <IconReceipt size={24} />
          </div>
          <CardTitle className="mt-4 text-base font-semibold text-foreground">
            No Subscription Orders Recorded
          </CardTitle>
          <CardDescription className="mt-1 text-xs text-muted-foreground">
            When tenants upgrade or renew subscription packages, transactions will appear here.
          </CardDescription>
        </Card>
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {orders.map((order) => {
            const company = order.companyId as { name?: string; email?: string } | null;
            const plan = order.planId as { name?: string } | null;

            return (
              <div key={String(order._id)} className="flex items-center justify-between p-4 text-xs">
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold text-foreground">{order.orderNumber}</span>
                  <span className="text-muted-foreground">{company?.name || company?.email}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-medium text-foreground">{plan?.name || order.planName}</span>
                  <span className="font-bold text-foreground">${order.price}</span>
                  <Badge variant="secondary" className="capitalize">
                    {order.paymentStatus}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
