"use client";

import { useState } from "react";
import { PersonalInfoCard } from "./personal-info-card";
import { ChangePasswordCard } from "./change-password-card";
import { PreferencesCard } from "./preferences-card";
import { DangerZoneCard } from "./danger-zone-card";
import type { UserProfileDTO } from "@/types/user-profile";

interface ProfileHubProps {
  initialProfile: UserProfileDTO;
}

export function ProfileHub({ initialProfile }: ProfileHubProps) {
  const [profile, setProfile] = useState<UserProfileDTO>(initialProfile);

  return (
    <div className="space-y-6 mx-auto">
      {/* 1. Personal Information */}
      <PersonalInfoCard
        profile={profile}
        onProfileUpdated={(updated) => setProfile(updated)}
      />

      {/* 2. Change Password */}
      <ChangePasswordCard />

      {/* 3. Preferences & Appearance */}
      <PreferencesCard
        initialDarkMode={profile.darkMode}
        initialLang={profile.lang}
      />

      {/* 4. Danger Zone */}
      <DangerZoneCard userRole={profile.role} />
    </div>
  );
}
