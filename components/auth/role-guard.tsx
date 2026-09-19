import { requireRole } from '@/lib/guards';
import type { Role } from '@/lib/roles';

export async function RoleGuard({
  allowed,
  callbackUrl,
  children,
}: {
  allowed: readonly Role[];
  callbackUrl?: string;
  children: React.ReactNode;
}) {
  await requireRole(allowed, callbackUrl);
  return <>{children}</>;
}
