"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import { Plan } from "@/models/Plan";
import { User } from "@/models/User";

async function verifySuperAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "super admin") {
    throw new Error("Unauthorized: Super Admin access required");
  }
  return session.user;
}

export interface CreatePlanInput {
  name: string;
  packagePriceMonthly: number;
  packagePriceYearly: number;
  pricePerUserMonthly?: number;
  pricePerUserYearly?: number;
  pricePerBusinessMonthly?: number;
  pricePerBusinessYearly?: number;
  maxUsers: number;
  maxBusinesses: number;
  maxLocations?: number;
  maxServices?: number;
  storageLimitMb?: number;
  modules: string[];
  isCustomPlan?: boolean;
  isFreePlan?: boolean;
  hasTrial: boolean;
  trialDays: number;
  isEnabled?: boolean;
  description?: string;
}

export interface UpdatePlanInput extends CreatePlanInput {
  planId: string;
}

export interface UsagePricingInput {
  basicPackagePriceMonthly: number;
  basicPackagePriceYearly: number;
  perUserPriceMonthly: number;
  perUserPriceYearly: number;
  perBusinessPriceMonthly: number;
  perBusinessPriceYearly: number;
}

export async function createPlanAction(data: CreatePlanInput) {
  try {
    await verifySuperAdmin();
    await connectToDatabase();

    const name = data.name?.trim();
    if (!name) {
      return { success: false, error: "Plan name is required." };
    }

    const existing = await Plan.findOne({ name }).lean();
    if (existing) {
      return { success: false, error: `A plan named "${name}" already exists.` };
    }

    const isFreePlan = data.packagePriceMonthly === 0 && data.packagePriceYearly === 0;

    const newPlan = await Plan.create({
      name,
      packagePriceMonthly: Math.max(0, Number(data.packagePriceMonthly) || 0),
      packagePriceYearly: Math.max(0, Number(data.packagePriceYearly) || 0),
      pricePerUserMonthly: Math.max(0, Number(data.pricePerUserMonthly) || 0),
      pricePerUserYearly: Math.max(0, Number(data.pricePerUserYearly) || 0),
      pricePerBusinessMonthly: Math.max(0, Number(data.pricePerBusinessMonthly) || 0),
      pricePerBusinessYearly: Math.max(0, Number(data.pricePerBusinessYearly) || 0),
      maxUsers: Number(data.maxUsers),
      maxBusinesses: Number(data.maxBusinesses),
      maxLocations: data.maxLocations !== undefined ? Number(data.maxLocations) : -1,
      maxServices: data.maxServices !== undefined ? Number(data.maxServices) : -1,
      storageLimitMb: Number(data.storageLimitMb) || 1024,
      modules: Array.isArray(data.modules) ? data.modules : [],
      isCustomPlan: Boolean(data.isCustomPlan),
      isFreePlan,
      hasTrial: Boolean(data.hasTrial),
      trialDays: Math.max(0, Number(data.trialDays) || 0),
      isEnabled: data.isEnabled ?? true,
      description: data.description?.trim() || "",
    });

    revalidatePath("/super-admin/plans");
    revalidatePath("/super-admin");
    return { success: true, planId: String(newPlan._id) };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create plan";
    return { success: false, error: message };
  }
}

export async function updatePlanAction(data: UpdatePlanInput) {
  try {
    await verifySuperAdmin();
    await connectToDatabase();

    const { planId, name } = data;
    if (!name?.trim()) {
      return { success: false, error: "Plan name is required." };
    }

    const plan = await Plan.findById(planId);
    if (!plan) {
      return { success: false, error: "Plan not found." };
    }

    // Check duplicate name
    const existing = await Plan.findOne({
      name: name.trim(),
      _id: { $ne: plan._id },
    }).lean();
    if (existing) {
      return { success: false, error: `A plan named "${name}" already exists.` };
    }

    const isFreePlan = data.packagePriceMonthly === 0 && data.packagePriceYearly === 0;

    plan.name = name.trim();
    plan.packagePriceMonthly = Math.max(0, Number(data.packagePriceMonthly) || 0);
    plan.packagePriceYearly = Math.max(0, Number(data.packagePriceYearly) || 0);
    plan.pricePerUserMonthly = Math.max(0, Number(data.pricePerUserMonthly) || 0);
    plan.pricePerUserYearly = Math.max(0, Number(data.pricePerUserYearly) || 0);
    plan.pricePerBusinessMonthly = Math.max(0, Number(data.pricePerBusinessMonthly) || 0);
    plan.pricePerBusinessYearly = Math.max(0, Number(data.pricePerBusinessYearly) || 0);
    plan.maxUsers = Number(data.maxUsers);
    plan.maxBusinesses = Number(data.maxBusinesses);
    plan.maxLocations = data.maxLocations !== undefined ? Number(data.maxLocations) : -1;
    plan.maxServices = data.maxServices !== undefined ? Number(data.maxServices) : -1;
    plan.storageLimitMb = Number(data.storageLimitMb) || plan.storageLimitMb || 1024;
    plan.modules = Array.isArray(data.modules) ? data.modules : [];
    plan.isCustomPlan = Boolean(data.isCustomPlan);
    plan.isFreePlan = isFreePlan;
    plan.hasTrial = Boolean(data.hasTrial);
    plan.trialDays = Math.max(0, Number(data.trialDays) || 0);
    if (data.isEnabled !== undefined) {
      plan.isEnabled = data.isEnabled;
    }
    if (data.description !== undefined) {
      plan.description = data.description.trim();
    }

    await plan.save();

    revalidatePath("/super-admin/plans");
    revalidatePath("/super-admin");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update plan";
    return { success: false, error: message };
  }
}

export async function togglePlanStatusAction(planId: string, isEnabled: boolean) {
  try {
    await verifySuperAdmin();
    await connectToDatabase();

    const plan = await Plan.findById(planId);
    if (!plan) {
      return { success: false, error: "Plan not found." };
    }

    plan.isEnabled = isEnabled;
    await plan.save();

    revalidatePath("/super-admin/plans");
    return { success: true, isEnabled: plan.isEnabled };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to toggle plan status";
    return { success: false, error: message };
  }
}

export async function deletePlanAction(planId: string) {
  try {
    await verifySuperAdmin();
    await connectToDatabase();

    const plan = await Plan.findById(planId);
    if (!plan) {
      return { success: false, error: "Plan not found." };
    }

    // Guard against deleting plans that have active subscribers
    const activeSubscribersCount = await User.countDocuments({
      activePlanId: plan._id,
    });

    if (activeSubscribersCount > 0) {
      return {
        success: false,
        error: `Cannot delete "${plan.name}" because ${activeSubscribersCount} subscriber(s) are actively on this plan.`,
      };
    }

    await Plan.findByIdAndDelete(plan._id);

    revalidatePath("/super-admin/plans");
    revalidatePath("/super-admin");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete plan";
    return { success: false, error: message };
  }
}

export async function saveUsagePricingAction(data: UsagePricingInput) {
  try {
    await verifySuperAdmin();
    await connectToDatabase();

    // Update or create the Custom/Usage pricing plan
    await Plan.findOneAndUpdate(
      { isCustomPlan: true },
      {
        $set: {
          name: "Usage Plan",
          packagePriceMonthly: Math.max(0, Number(data.basicPackagePriceMonthly) || 0),
          packagePriceYearly: Math.max(0, Number(data.basicPackagePriceYearly) || 0),
          pricePerUserMonthly: Math.max(0, Number(data.perUserPriceMonthly) || 0),
          pricePerUserYearly: Math.max(0, Number(data.perUserPriceYearly) || 0),
          pricePerBusinessMonthly: Math.max(0, Number(data.perBusinessPriceMonthly) || 0),
          pricePerBusinessYearly: Math.max(0, Number(data.perBusinessPriceYearly) || 0),
          isEnabled: true,
        },
      },
      { upsert: true, new: true }
    );

    revalidatePath("/super-admin/plans");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to save usage pricing";
    return { success: false, error: message };
  }
}

export async function getPlansAction() {
  await verifySuperAdmin();
  await connectToDatabase();

  const rawPlans = await Plan.find().sort({ packagePriceMonthly: 1 }).lean();

  return rawPlans.map((p) => ({
    id: String(p._id),
    name: p.name,
    packagePriceMonthly: p.packagePriceMonthly,
    packagePriceYearly: p.packagePriceYearly,
    pricePerUserMonthly: p.pricePerUserMonthly,
    pricePerUserYearly: p.pricePerUserYearly,
    pricePerBusinessMonthly: p.pricePerBusinessMonthly,
    pricePerBusinessYearly: p.pricePerBusinessYearly,
    maxUsers: p.maxUsers,
    maxBusinesses: p.maxBusinesses,
    maxLocations: p.maxLocations ?? -1,
    maxServices: p.maxServices ?? -1,
    storageLimitMb: p.storageLimitMb ?? 1024,
    modules: p.modules || [],
    isCustomPlan: Boolean(p.isCustomPlan),
    isFreePlan: Boolean(p.isFreePlan),
    hasTrial: Boolean(p.hasTrial),
    trialDays: p.trialDays || 0,
    isEnabled: p.isEnabled ?? true,
    description: p.description,
  }));
}

