"use server";

import { revalidatePath } from "next/cache";
import { Types } from "mongoose";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import { Category, type ICategoryDocument } from "@/models/Category";
import { Service } from "@/models/Service";
import { Business } from "@/models/Business";
import { User } from "@/models/User";

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Graceful no-op when called outside Next.js request context (e.g. scripts / tests)
  }
}

export interface CategoryItem {
  id: string;
  name: string;
  description: string;
  order: number;
  isActive: boolean;
  icon?: string;
  servicesCount: number;
  activeServicesCount: number;
  createdAt: string;
}

export interface CreateCategoryInput {
  name: string;
  description?: string;
  order?: number;
  isActive?: boolean;
  icon?: string;
  businessId?: string;
}

export interface UpdateCategoryInput {
  id: string;
  name?: string;
  description?: string;
  order?: number;
  isActive?: boolean;
  icon?: string;
}

interface TenantContext {
  userId?: Types.ObjectId;
  companyId: Types.ObjectId;
  businessId: Types.ObjectId;
}

/**
 * Resolves current tenant context from session or fallback parameters.
 */
async function resolveCategoryTenantContext(explicitBusinessId?: string): Promise<TenantContext> {
  await connectToDatabase();

  if (explicitBusinessId && Types.ObjectId.isValid(explicitBusinessId)) {
    const targetBusiness = await Business.findById(explicitBusinessId).lean();
    if (targetBusiness) {
      return {
        companyId: targetBusiness.companyId,
        businessId: targetBusiness._id,
      };
    }
  }

  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized: Please sign in to manage service categories.");
  }

  const user = await User.findById(session.user.id).lean();
  if (!user) {
    throw new Error("Authenticated user not found.");
  }

  const companyId =
    user.role === "company"
      ? user._id
      : user.companyId
        ? new Types.ObjectId(user.companyId)
        : null;

  if (!companyId) {
    throw new Error("Organization context could not be determined.");
  }

  let activeBusinessId = user.activeBusinessId;
  if (!activeBusinessId) {
    const defaultBusiness = await Business.findOne({ companyId }).lean();
    if (defaultBusiness) {
      activeBusinessId = defaultBusiness._id;
    }
  }

  if (!activeBusinessId) {
    throw new Error("No active business found for this organization.");
  }

  return {
    userId: user._id,
    companyId,
    businessId: activeBusinessId,
  };
}

/**
 * Retrieves service categories for the active business, ordered by sequential order and name.
 * Joins service statistics for badge counts.
 */
export async function getCategoriesAction(options?: {
  includeInactive?: boolean;
  businessId?: string;
}): Promise<{ success: boolean; data?: CategoryItem[]; error?: string }> {
  try {
    const { companyId, businessId } = await resolveCategoryTenantContext(options?.businessId);

    const query: Record<string, unknown> = {
      companyId,
      businessId,
    };

    if (!options?.includeInactive) {
      query.isActive = { $ne: false };
    }

    const [categoriesDocs, serviceStats]: [ICategoryDocument[], Array<{ _id: Types.ObjectId; totalCount: number; activeCount: number }>] = await Promise.all([
      Category.find(query).sort({ order: 1, name: 1 }).lean(),
      Service.aggregate([
        { $match: { companyId, businessId } },
        {
          $group: {
            _id: "$categoryId",
            totalCount: { $sum: 1 },
            activeCount: {
              $sum: { $cond: [{ $eq: ["$isActive", true] }, 1, 0] },
            },
          },
        },
      ]),
    ]);

    const statsMap = new Map<string, { total: number; active: number }>();
    for (const stat of serviceStats) {
      if (stat._id) {
        statsMap.set(String(stat._id), {
          total: stat.totalCount,
          active: stat.activeCount,
        });
      }
    }

    const data: CategoryItem[] = categoriesDocs.map((cat) => {
      const stats = statsMap.get(String(cat._id)) || { total: 0, active: 0 };
      return {
        id: String(cat._id),
        name: cat.name,
        description: cat.description || "",
        order: cat.order ?? 0,
        isActive: cat.isActive ?? true,
        icon: cat.icon || "",
        servicesCount: stats.total,
        activeServicesCount: stats.active,
        createdAt: cat.createdAt ? new Date(cat.createdAt).toISOString() : new Date().toISOString(),
      };
    });

    return { success: true, data };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load service categories";
    return { success: false, error: message };
  }
}

/**
 * Creates a new category with collision guard and auto-sequenced order.
 */
export async function createCategoryAction(
  input: CreateCategoryInput
): Promise<{ success: boolean; data?: CategoryItem; error?: string }> {
  try {
    const name = input.name?.trim();
    if (!name || name.length < 2) {
      return { success: false, error: "Category name must be at least 2 characters." };
    }

    const { companyId, businessId } = await resolveCategoryTenantContext(input.businessId);

    // Collision check: case-insensitive name within the same business
    const existing = await Category.findOne({
      companyId,
      businessId,
      name: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
    }).lean();

    if (existing) {
      return { success: false, error: `Category "${name}" already exists in this business.` };
    }

    // Determine sequential order if not provided
    let order = input.order;
    if (order === undefined || isNaN(order)) {
      const highestOrder = await Category.findOne({ companyId, businessId })
        .sort({ order: -1 })
        .select("order")
        .lean();
      order = highestOrder?.order !== undefined ? highestOrder.order + 1 : 0;
    }

    const newCategory: ICategoryDocument = await Category.create({
      companyId,
      businessId,
      name,
      description: input.description?.trim() || "",
      order,
      isActive: input.isActive ?? true,
      icon: input.icon?.trim() || "",
    });

    safeRevalidatePath("/dashboard/services/categories");
    safeRevalidatePath("/dashboard/services/catalog");
    safeRevalidatePath("/dashboard/services");

    return {
      success: true,
      data: {
        id: String(newCategory._id),
        name: newCategory.name,
        description: newCategory.description || "",
        order: newCategory.order ?? 0,
        isActive: newCategory.isActive ?? true,
        icon: newCategory.icon || "",
        servicesCount: 0,
        activeServicesCount: 0,
        createdAt: newCategory.createdAt.toISOString(),
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create category";
    return { success: false, error: message };
  }
}

/**
 * Updates an existing category's properties.
 */
export async function updateCategoryAction(
  input: UpdateCategoryInput
): Promise<{ success: boolean; data?: CategoryItem; error?: string }> {
  try {
    if (!input.id || !Types.ObjectId.isValid(input.id)) {
      return { success: false, error: "Invalid category ID." };
    }

    const categoryId = new Types.ObjectId(input.id);
    const category = await Category.findById(categoryId);
    if (!category) {
      return { success: false, error: "Category not found." };
    }

    // If name is changing, check for collision
    if (input.name !== undefined) {
      const cleanName = input.name.trim();
      if (cleanName.length < 2) {
        return { success: false, error: "Category name must be at least 2 characters." };
      }

      if (cleanName.toLowerCase() !== category.name.toLowerCase()) {
        const collision = await Category.findOne({
          _id: { $ne: category._id },
          businessId: category.businessId,
          name: { $regex: new RegExp(`^${cleanName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
        }).lean();

        if (collision) {
          return { success: false, error: `Category "${cleanName}" already exists in this business.` };
        }
      }
      category.name = cleanName;
    }

    if (input.description !== undefined) {
      category.description = input.description.trim();
    }
    if (input.order !== undefined && !isNaN(input.order)) {
      category.order = input.order;
    }
    if (input.isActive !== undefined) {
      category.isActive = input.isActive;
    }
    if (input.icon !== undefined) {
      category.icon = input.icon.trim();
    }

    await category.save();

    safeRevalidatePath("/dashboard/services/categories");
    safeRevalidatePath("/dashboard/services/catalog");
    safeRevalidatePath("/dashboard/services");

    return {
      success: true,
      data: {
        id: String(category._id),
        name: category.name,
        description: category.description || "",
        order: category.order ?? 0,
        isActive: category.isActive ?? true,
        icon: category.icon || "",
        servicesCount: 0,
        activeServicesCount: 0,
        createdAt: category.createdAt.toISOString(),
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update category";
    return { success: false, error: message };
  }
}

/**
 * Reorders multiple categories in bulk to support drag-and-drop hierarchy sorting.
 */
export async function reorderCategoriesAction(
  items: Array<{ id: string; order: number }>
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!Array.isArray(items) || items.length === 0) {
      return { success: false, error: "No category ordering items provided." };
    }

    await connectToDatabase();

    const bulkOps = items
      .filter((item) => item.id && Types.ObjectId.isValid(item.id))
      .map((item) => ({
        updateOne: {
          filter: { _id: new Types.ObjectId(item.id) },
          update: { $set: { order: Number(item.order) || 0 } },
        },
      }));

    if (bulkOps.length > 0) {
      await Category.bulkWrite(bulkOps);
    }

    safeRevalidatePath("/dashboard/services/categories");
    safeRevalidatePath("/dashboard/services/catalog");
    safeRevalidatePath("/dashboard/services");

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to reorder categories";
    return { success: false, error: message };
  }
}

/**
 * Toggles a category's active/inactive visibility status.
 */
export async function toggleCategoryStatusAction(
  id: string
): Promise<{ success: boolean; isActive?: boolean; error?: string }> {
  try {
    if (!id || !Types.ObjectId.isValid(id)) {
      return { success: false, error: "Invalid category ID." };
    }

    await connectToDatabase();

    const category = await Category.findById(id);
    if (!category) {
      return { success: false, error: "Category not found." };
    }

    category.isActive = !category.isActive;
    await category.save();

    safeRevalidatePath("/dashboard/services/categories");
    safeRevalidatePath("/dashboard/services/catalog");
    safeRevalidatePath("/dashboard/services");

    return { success: true, isActive: category.isActive };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to toggle category status";
    return { success: false, error: message };
  }
}

/**
 * Deletes a category if no services are assigned to it.
 */
export async function deleteCategoryAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!id || !Types.ObjectId.isValid(id)) {
      return { success: false, error: "Invalid category ID." };
    }

    await connectToDatabase();
    const categoryId = new Types.ObjectId(id);

    const category = await Category.findById(categoryId);
    if (!category) {
      return { success: false, error: "Category not found." };
    }

    const linkedServicesCount = await Service.countDocuments({
      categoryId,
    });

    if (linkedServicesCount > 0) {
      return {
        success: false,
        error: `Cannot delete category "${category.name}": ${linkedServicesCount} service(s) are assigned to it. Please reassign or delete those services first.`,
      };
    }

    await Category.findByIdAndDelete(categoryId);

    safeRevalidatePath("/dashboard/services/categories");
    safeRevalidatePath("/dashboard/services/catalog");
    safeRevalidatePath("/dashboard/services");

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete category";
    return { success: false, error: message };
  }
}
