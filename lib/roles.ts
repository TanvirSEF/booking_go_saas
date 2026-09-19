export const ROLES = {
  SUPER_ADMIN: 'super admin',
  COMPANY: 'company',
  STAFF: 'staff',
  CUSTOMER: 'customer',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_HOME: Record<Role, string> = {
  [ROLES.SUPER_ADMIN]: '/super-admin',
  [ROLES.COMPANY]: '/dashboard',
  [ROLES.STAFF]: '/dashboard', // Staff uses /dashboard until dedicated staff portal is built
  [ROLES.CUSTOMER]: '/customer',
};

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(ROLE_HOME, value);
}

// Access policy defined once using allowlists
export const ACCESS = {
  superAdmin: [ROLES.SUPER_ADMIN],
  company: [ROLES.COMPANY, ROLES.STAFF], // Staff allowed in company tenant dashboard
  staff: [ROLES.STAFF, ROLES.COMPANY],
  customer: [ROLES.CUSTOMER],
} as const satisfies Record<string, readonly Role[]>;

export function hasAccess(policy: readonly Role[], role: Role): boolean {
  return (policy as readonly string[]).includes(role);
}
