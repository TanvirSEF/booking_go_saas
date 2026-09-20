'use server';

import { Types } from 'mongoose';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { connectToDatabase } from '@/lib/db';
import { User, type IUserDocument } from '@/models/User';
import { Business } from '@/models/Business';
import { hashPassword, verifyPassword } from '@/lib/password';
import {
  updateUserProfileSchema,
  changeUserPasswordSchema,
  updateUserPreferencesSchema,
  deleteUserAccountSchema,
  type UpdateUserProfileInput,
  type ChangeUserPasswordInput,
  type UpdateUserPreferencesInput,
  type DeleteUserAccountInput,
  type UserProfileDTO,
  type UserProfileActionResult,
} from '@/types/user-profile';

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Graceful no-op in background tasks or CLI tests
  }
}

async function resolveSessionUser() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized: Please log in to manage your profile.');
  }

  await connectToDatabase();
  return {
    userId: session.user.id,
    userObjectId: new Types.ObjectId(session.user.id),
    role: session.user.role || 'customer',
  };
}

function toUserProfileDTO(user: IUserDocument): UserProfileDTO {
  return {
    id: (user._id as Types.ObjectId).toString(),
    name: user.name,
    email: user.email,
    mobileNo: user.mobileNo || '',
    avatar: user.avatar || '/uploads/users-avatar/avatar.png',
    role: user.role,
    lang: user.lang || 'en',
    darkMode: Boolean(user.darkMode),
    emailVerifiedAt: user.emailVerifiedAt ? user.emailVerifiedAt.toISOString() : null,
    createdAt: user.createdAt?.toISOString?.() || new Date().toISOString(),
  };
}

/**
 * 1. Retrieves profile details for the authenticated user
 */
export async function getUserProfileAction(): Promise<UserProfileActionResult<UserProfileDTO>> {
  try {
    const session = await resolveSessionUser();
    const user = await User.findById(session.userObjectId);

    if (!user) {
      return { success: false, error: 'User account not found.' };
    }

    return {
      success: true,
      data: toUserProfileDTO(user),
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to retrieve profile';
    return { success: false, error: errorMsg };
  }
}

/**
 * 2. Updates user personal information (name, email, mobileNo, avatar)
 */
export async function updateUserProfileAction(
  rawInput: UpdateUserProfileInput
): Promise<UserProfileActionResult<UserProfileDTO>> {
  try {
    const session = await resolveSessionUser();
    const validated = updateUserProfileSchema.parse(rawInput);

    const user = await User.findById(session.userObjectId);
    if (!user) {
      return { success: false, error: 'User account not found.' };
    }

    // If email is being changed, ensure it's not taken by another user
    if (validated.email && validated.email !== user.email) {
      const existingUser = await User.findOne({
        email: validated.email,
        _id: { $ne: session.userObjectId },
      });

      if (existingUser) {
        return {
          success: false,
          error: `An account with email "${validated.email}" already exists.`,
        };
      }

      user.email = validated.email;
      user.emailVerifiedAt = undefined;
    }

    user.name = validated.name;
    if (validated.mobileNo !== undefined) user.mobileNo = validated.mobileNo;
    if (validated.avatar !== undefined) user.avatar = validated.avatar;

    await user.save();

    safeRevalidatePath('/super-admin/profile');
    safeRevalidatePath('/dashboard/profile');
    safeRevalidatePath('/customer/profile');

    return {
      success: true,
      message: 'Profile information updated successfully.',
      data: toUserProfileDTO(user),
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to update profile';
    return { success: false, error: errorMsg };
  }
}

/**
 * 3. Changes user account password with cryptographic verification
 */
export async function changeUserPasswordAction(
  rawInput: ChangeUserPasswordInput
): Promise<UserProfileActionResult<{ updated: boolean }>> {
  try {
    const session = await resolveSessionUser();
    const validated = changeUserPasswordSchema.parse(rawInput);

    const user = await User.findById(session.userObjectId);
    if (!user) {
      return { success: false, error: 'User account not found.' };
    }

    // Verify current password
    const isCurrentValid = await verifyPassword(validated.currentPassword, user.password);
    if (!isCurrentValid) {
      return {
        success: false,
        error: 'The current password you entered is incorrect.',
      };
    }

    // Hash and update new password
    const hashedPassword = await hashPassword(validated.newPassword);
    user.password = hashedPassword;
    await user.save();

    return {
      success: true,
      message: 'Password successfully changed.',
      data: { updated: true },
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to change password';
    return { success: false, error: errorMsg };
  }
}

/**
 * 4. Updates personal UI preferences (dark mode, interface language)
 */
export async function updateUserPreferencesAction(
  rawInput: UpdateUserPreferencesInput
): Promise<UserProfileActionResult<{ darkMode?: boolean; lang?: string }>> {
  try {
    const session = await resolveSessionUser();
    const validated = updateUserPreferencesSchema.parse(rawInput);

    const updateFields: Record<string, unknown> = {};
    if (validated.darkMode !== undefined) updateFields.darkMode = validated.darkMode;
    if (validated.lang !== undefined) updateFields.lang = validated.lang;

    const user = await User.findByIdAndUpdate(
      session.userObjectId,
      { $set: updateFields },
      { new: true }
    );

    if (!user) {
      return { success: false, error: 'User account not found.' };
    }

    safeRevalidatePath('/super-admin');
    safeRevalidatePath('/dashboard');
    safeRevalidatePath('/customer');

    return {
      success: true,
      message: 'Preferences updated successfully.',
      data: {
        darkMode: user.darkMode,
        lang: user.lang,
      },
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to update preferences';
    return { success: false, error: errorMsg };
  }
}

/**
 * 5. Deletes authenticated user's account with strict safeguards
 */
export async function deleteUserAccountAction(
  rawInput: DeleteUserAccountInput
): Promise<UserProfileActionResult<{ deleted: boolean }>> {
  try {
    const session = await resolveSessionUser();
    const validated = deleteUserAccountSchema.parse(rawInput);

    const user = await User.findById(session.userObjectId);
    if (!user) {
      return { success: false, error: 'User account not found.' };
    }

    // Hard safeguard: Super Admin accounts cannot be self-deleted
    if (user.role === 'super admin') {
      return {
        success: false,
        error: 'Security Safeguard: Super Admin accounts cannot be deleted.',
      };
    }

    // Verify password confirmation
    const isPasswordValid = await verifyPassword(validated.password, user.password);
    if (!isPasswordValid) {
      return {
        success: false,
        error: 'Invalid password. Account deletion aborted.',
      };
    }

    // If company owner, deactivate all their businesses
    if (user.role === 'company') {
      await Business.updateMany(
        { companyId: session.userObjectId },
        { $set: { 'settings.is_disable': '1' } }
      );
    }

    // Delete user account
    await User.findByIdAndDelete(session.userObjectId);

    return {
      success: true,
      message: 'Your account has been deleted permanently.',
      data: { deleted: true },
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to delete account';
    return { success: false, error: errorMsg };
  }
}
