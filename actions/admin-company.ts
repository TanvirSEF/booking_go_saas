"use server";

import { Types } from "mongoose";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { Business } from "@/models/Business";
import { Plan } from "@/models/Plan";
import { hashPassword } from "@/lib/password";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function verifySuperAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "super admin") {
    throw new Error("Unauthorized: Super Admin access required");
  }
  return session.user;
}

export interface CreateCompanyInput {
  name: string;
  businessName: string;
  email: string;
  password: string;
  isActive?: boolean;
  planId?: string;
}

export interface UpdateCompanyInput {
  companyId: string;
  name: string;
  businessName?: string;
  email: string;
  planId?: string;
}

export async function createCompanyAction(data: CreateCompanyInput) {
  try {
    await verifySuperAdmin();
    await connectToDatabase();

    const name = data.name?.trim();
    const businessName = data.businessName?.trim();
    const email = data.email?.toLowerCase().trim();
    const password = data.password?.trim();

    if (!name || !businessName || !email || !password) {
      return { success: false, error: "Please fill in all required fields." };
    }

    if (password.length < 4) {
      return { success: false, error: "Password must be at least 4 characters." };
    }

    // Check email uniqueness
    const existing = await User.findOne({ email }).lean();
    if (existing) {
      return { success: false, error: "A user or subscriber with this email already exists." };
    }

    // Resolve Plan
    let activePlan = null;
    if (data.planId) {
      activePlan = await Plan.findById(data.planId);
    }
    if (!activePlan) {
      activePlan = await Plan.findOne({ name: "Basic" });
    }

    const hashedPassword = await hashPassword(password);
    const planExpireDate = new Date();
    planExpireDate.setFullYear(planExpireDate.getFullYear() + 1); // 1 year default

    // Create Company User
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "company",
      isActive: data.isActive ?? true,
      activePlanId: activePlan?._id,
      planExpireDate,
      totalBusiness: 1,
      totalUser: 1,
      emailVerifiedAt: new Date(),
    });

    // Create Default Business
    const baseSlug = slugify(businessName) || "business";
    let slug = baseSlug;
    let counter = 1;
    while (await Business.findOne({ slug }).lean()) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const business = await Business.create({
      companyId: user._id,
      name: businessName,
      slug,
      formType: "form-layout",
      layout: "Formlayout1",
      themeColor: "color1-Formlayout1",
      currency: "USD",
      currencySymbol: "$",
      appointmentPrefix: "#APP000",
      maximumSlot: 1,
      appointmentReminderHours: 24,
    });

    user.activeBusinessId = business._id;
    await user.save();

    revalidatePath("/super-admin/companies");
    revalidatePath("/super-admin");

    return {
      success: true,
      companyId: String(user._id),
      businessSlug: slug,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create company subscriber";
    return { success: false, error: message };
  }
}

export async function toggleCompanyStatusAction(companyId: string, isActive: boolean) {
  try {
    await verifySuperAdmin();
    await connectToDatabase();

    const company = await User.findOne({ _id: companyId, role: "company" });
    if (!company) {
      return { success: false, error: "Company subscriber not found." };
    }

    company.isActive = isActive;
    await company.save();

    revalidatePath("/super-admin/companies");
    return { success: true, isActive: company.isActive };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to toggle status";
    return { success: false, error: message };
  }
}

export async function updateCompanyAction(input: UpdateCompanyInput) {
  try {
    await verifySuperAdmin();
    await connectToDatabase();

    const { companyId, name, businessName, email, planId } = input;

    const company = await User.findOne({ _id: companyId, role: "company" });
    if (!company) {
      return { success: false, error: "Company subscriber not found." };
    }

    const normalizedEmail = email.toLowerCase().trim();
    if (normalizedEmail !== company.email) {
      const existing = await User.findOne({
        email: normalizedEmail,
        _id: { $ne: company._id },
      }).lean();

      if (existing) {
        return { success: false, error: "This email address is already in use." };
      }
      company.email = normalizedEmail;
    }

    company.name = name.trim();

    if (planId) {
      company.activePlanId = new Types.ObjectId(planId);
    }

    if (businessName?.trim() && company.activeBusinessId) {
      await Business.findByIdAndUpdate(company.activeBusinessId, {
        name: businessName.trim(),
      });
    }

    await company.save();

    revalidatePath("/super-admin/companies");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update subscriber";
    return { success: false, error: message };
  }
}

export async function resetCompanyPasswordAction(companyId: string, newPassword: string) {
  try {
    await verifySuperAdmin();
    await connectToDatabase();

    if (!newPassword || newPassword.length < 4) {
      return { success: false, error: "Password must be at least 4 characters." };
    }

    const company = await User.findOne({ _id: companyId, role: "company" });
    if (!company) {
      return { success: false, error: "Company subscriber not found." };
    }

    company.password = await hashPassword(newPassword);
    await company.save();

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to reset password";
    return { success: false, error: message };
  }
}

export async function deleteCompanyAction(companyId: string) {
  try {
    await verifySuperAdmin();
    await connectToDatabase();

    const company = await User.findOne({ _id: companyId, role: "company" });
    if (!company) {
      return { success: false, error: "Company subscriber not found." };
    }

    // Delete associated businesses
    await Business.deleteMany({ companyId: company._id });

    // Delete the company user
    await User.deleteOne({ _id: company._id });

    revalidatePath("/super-admin/companies");
    revalidatePath("/super-admin");

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete company";
    return { success: false, error: message };
  }
}

function formatExpireDate(d?: Date | null): string {
  if (!d) return "10-10-26";
  const date = new Date(d);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);
  return `${day}-${month}-${year}`;
}

export async function getCompaniesAction() {
  await verifySuperAdmin();
  await connectToDatabase();

  const rawCompanies = await User.find({ role: "company" })
    .populate("activePlanId", "name")
    .sort({ createdAt: -1 })
    .lean();

  const companyIds = rawCompanies.map((c) => c._id);
  const businesses = await Business.find({ companyId: { $in: companyIds } })
    .select("companyId name slug")
    .lean();

  const businessMap = new Map(
    businesses.map((b) => [String(b.companyId), b])
  );

  return rawCompanies.map((c) => {
    const b = businessMap.get(String(c._id));
    const plan = c.activePlanId as { _id?: unknown; name?: string } | null;

    return {
      id: String(c._id),
      name: c.name,
      email: c.email,
      isActive: c.isActive ?? true,
      role: c.role,
      businessName: b?.name,
      businessSlug: b?.slug,
      planName: plan?.name ? `${plan.name} Plan` : "Basic Plan",
      planId: plan?._id ? String(plan._id) : undefined,
      planExpiredDate: formatExpireDate(c.planExpireDate),
      createdAt: new Date(c.createdAt).toLocaleDateString(),
    };
  });
}

