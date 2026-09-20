import { z } from 'zod';

export interface PermissionDefinition {
  key: string;
  label: string;
  description: string;
  module: string;
}

export interface PermissionModuleGroup {
  module: string;
  label: string;
  description: string;
  permissions: PermissionDefinition[];
}

export interface RoleDTO {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  isDefault: boolean;
  systemKey?: string | null;
  staffCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface StaffRoleDetailsDTO {
  staffId: string;
  staffName: string;
  email: string;
  roleId: string | null;
  roleName: string;
  isDefaultRole: boolean;
  effectivePermissions: string[];
  customPermissions: string[];
}

export const createRoleSchema = z.object({
  name: z
    .string()
    .min(2, 'Role name must be at least 2 characters')
    .max(100, 'Role name cannot exceed 100 characters')
    .trim(),
  description: z.string().max(300, 'Description cannot exceed 300 characters').optional().default(''),
  permissions: z.array(z.string().trim()).min(1, 'Please select at least one permission for this role'),
});

export type CreateRoleInput = z.infer<typeof createRoleSchema>;

export const updateRoleSchema = z.object({
  id: z.string().min(1, 'Role ID is required'),
  name: z
    .string()
    .min(2, 'Role name must be at least 2 characters')
    .max(100, 'Role name cannot exceed 100 characters')
    .trim(),
  description: z.string().max(300, 'Description cannot exceed 300 characters').optional().default(''),
  permissions: z.array(z.string().trim()).min(1, 'Please select at least one permission for this role'),
});

export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;

export const assignStaffRoleSchema = z.object({
  staffId: z.string().min(1, 'Staff ID is required'),
  roleId: z.string().min(1, 'Role ID is required'),
  customPermissions: z.array(z.string().trim()).optional().default([]),
});

export type AssignStaffRoleInput = z.infer<typeof assignStaffRoleSchema>;

export interface RoleActionResult<T = unknown> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}
