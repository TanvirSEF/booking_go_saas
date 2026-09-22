"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  IconUser,
  IconMail,
  IconPhone,
  IconPhoto,
  IconShieldCheck,
  IconCalendar,
  IconLoader2,
  IconDeviceFloppy,
} from "@tabler/icons-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MediaUploader } from "@/components/shared/media-uploader";
import { updateUserProfileAction } from "@/actions/user-profile";
import type { UserProfileDTO } from "@/types/user-profile";

interface PersonalInfoCardProps {
  profile: UserProfileDTO;
  onProfileUpdated?: (updated: UserProfileDTO) => void;
}

export function PersonalInfoCard({ profile, onProfileUpdated }: PersonalInfoCardProps) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: profile.name || "",
    email: profile.email || "",
    mobileNo: profile.mobileNo || "",
    avatar: profile.avatar || "/uploads/users-avatar/avatar.png",
  });
  const [isPending, setIsPending] = useState(false);

  const initials = formData.name
    ? formData.name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "U";

  const memberSince = profile.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "N/A";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Full name is required.");
      return;
    }

    try {
      setIsPending(true);
      const res = await updateUserProfileAction({
        name: formData.name.trim(),
        email: formData.email.trim() || undefined,
        mobileNo: formData.mobileNo.trim() || undefined,
        avatar: formData.avatar.trim() || undefined,
      });

      if (res.success && res.data) {
        toast.success(res.message || "Profile updated successfully!");
        if (onProfileUpdated) {
          onProfileUpdated(res.data);
        }
        router.refresh();
      } else {
        toast.error(res.error || "Failed to update profile.");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred while updating profile.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Card className="rounded-xl border-border bg-card shadow-xs">
      <CardHeader className="border-b border-border/60 pb-4">
        <div className="flex items-center gap-2 text-primary font-semibold">
          <IconUser className="size-5" />
          <CardTitle className="text-base font-bold text-foreground">
            Personal Information
          </CardTitle>
        </div>
        <CardDescription className="text-xs text-muted-foreground mt-0.5">
          Update your personal details, email, contact phone number, and avatar image.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Preview and Details */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-xl border border-border/60 bg-muted/20 p-4">
            <Avatar className="size-16 border-2 border-primary/20 bg-primary/10 text-primary shrink-0">
              <AvatarImage src={formData.avatar} alt={formData.name} />
              <AvatarFallback className="text-lg font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1.5 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-sm font-bold text-foreground truncate">
                  {formData.name || "User Name"}
                </h4>
                <Badge variant="secondary" className="gap-1 text-[11px] capitalize">
                  <IconShieldCheck className="size-3.5 text-primary" />
                  {profile.role}
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <IconCalendar className="size-3.5" />
                  Member since {memberSince}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div className="space-y-1.5">
              <Label htmlFor="profile-name" className="text-xs font-semibold">
                Full Name
              </Label>
              <div className="relative">
                <IconUser className="size-4 absolute left-3 top-2.5 text-muted-foreground" />
                <Input
                  id="profile-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="John Doe"
                  className="pl-9 h-9 text-xs"
                  disabled={isPending}
                  required
                />
              </div>
            </div>

            {/* Email Address */}
            <div className="space-y-1.5">
              <Label htmlFor="profile-email" className="text-xs font-semibold">
                Email Address
              </Label>
              <div className="relative">
                <IconMail className="size-4 absolute left-3 top-2.5 text-muted-foreground" />
                <Input
                  id="profile-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@example.com"
                  className="pl-9 h-9 text-xs"
                  disabled={isPending}
                  required
                />
              </div>
            </div>

            {/* Phone / Mobile */}
            <div className="space-y-1.5">
              <Label htmlFor="profile-phone" className="text-xs font-semibold">
                Phone / Mobile Number
              </Label>
              <div className="relative">
                <IconPhone className="size-4 absolute left-3 top-2.5 text-muted-foreground" />
                <Input
                  id="profile-phone"
                  value={formData.mobileNo}
                  onChange={(e) => setFormData({ ...formData, mobileNo: e.target.value })}
                  placeholder="+1 (555) 000-0000"
                  className="pl-9 h-9 text-xs"
                  disabled={isPending}
                />
              </div>
            </div>

            {/* Avatar Upload */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="profile-avatar" className="text-xs font-semibold flex items-center gap-1.5">
                <IconPhoto className="size-4 text-muted-foreground" />
                Profile Avatar Photo
              </Label>
              <MediaUploader
                value={formData.avatar}
                onChange={(url) => setFormData({ ...formData, avatar: url })}
                folder="users-avatar"
                placeholder="Upload avatar photo or enter custom image URL"
                disabled={isPending}
                aspectRatio="square"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={isPending}
              className="text-xs h-9 gap-1.5"
            >
              {isPending ? (
                <IconLoader2 className="size-4 animate-spin" />
              ) : (
                <IconDeviceFloppy className="size-4" />
              )}
              {isPending ? "Saving..." : "Save Profile Changes"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
