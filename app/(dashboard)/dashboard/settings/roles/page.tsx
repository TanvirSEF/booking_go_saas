import { Metadata } from "next";
import {
  getCompanyRolesAction,
  getAvailablePermissionsAction,
} from "@/actions/role-permission";
import { RolesTable } from "@/components/dashboard/roles/roles-table";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Roles & Permissions | Company Settings | Dashboard",
  description: "Configure custom staff roles, assign granular module permissions, and manage operational access scopes.",
};

export default async function RolesAndPermissionsPage() {
  const [rolesRes, permsRes] = await Promise.all([
    getCompanyRolesAction(),
    getAvailablePermissionsAction(),
  ]);

  const roles = rolesRes.data || [];
  const moduleGroups = permsRes.data || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Roles & Permissions
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Customize role-based access control (RBAC) matrices, configure modular permissions, and safeguard administrative operations.
        </p>
      </div>

      <RolesTable
        initialRoles={roles}
        moduleGroups={moduleGroups}
      />
    </div>
  );
}
