import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IconBuilding, IconMail, IconCalendar } from "@tabler/icons-react";

export const metadata = {
  title: "Companies | Super Admin",
};

export default async function CompaniesPage() {
  await connectToDatabase();

  const companies = await User.find({ role: "company" })
    .select("name email isActive createdAt activePlanId")
    .populate("activePlanId", "name")
    .lean();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Subscribers & Companies
        </h1>
        <p className="text-sm text-muted-foreground">
          Registered tenants and company administrators.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {companies.map((company) => {
          const plan = company.activePlanId as { name?: string } | null;
          return (
            <Card key={String(company._id)} className="rounded-2xl border-border bg-card p-5 shadow-xs">
              <CardHeader className="p-0 pb-3">
                <div className="flex items-center justify-between">
                  <Badge variant={company.isActive ? "default" : "secondary"} className="text-[10px]">
                    {company.isActive ? "Active Tenant" : "Suspended"}
                  </Badge>
                  <span className="text-xs text-muted-foreground font-medium">
                    {plan?.name || "Free Tier"}
                  </span>
                </div>
                <CardTitle className="mt-2 text-base font-bold text-card-foreground">
                  {company.name}
                </CardTitle>
                <CardDescription className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <IconMail size={14} />
                  <span>{company.email}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between border-t border-border/50 p-0 pt-3 text-[11px] text-muted-foreground">
                <div className="flex items-center gap-1">
                  <IconCalendar size={13} />
                  <span>{new Date(company.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-1 text-primary font-medium">
                  <IconBuilding size={13} />
                  <span>Managed</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
