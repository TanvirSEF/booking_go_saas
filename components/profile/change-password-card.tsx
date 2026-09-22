"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  IconKey,
  IconLock,
  IconEye,
  IconEyeOff,
  IconCheck,
  IconX,
  IconLoader2,
  IconDeviceFloppy,
} from "@tabler/icons-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { changeUserPasswordAction } from "@/actions/user-profile";

export function ChangePasswordCard() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isPending, setIsPending] = useState(false);

  // Real-time validations
  const isLengthValid = newPassword.length >= 6;
  const isMatching = confirmPassword.length > 0 && newPassword === confirmPassword;
  const isMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword) {
      toast.error("Please enter your current password.");
      return;
    }

    if (!isLengthValid) {
      toast.error("New password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New password and confirmation do not match.");
      return;
    }

    try {
      setIsPending(true);
      const res = await changeUserPasswordAction({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      if (res.success) {
        toast.success(res.message || "Password successfully changed!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        toast.error(res.error || "Failed to change password.");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred while changing password.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Card className="rounded-xl border-border bg-card shadow-xs">
      <CardHeader className="border-b border-border/60 pb-4">
        <div className="flex items-center gap-2 text-primary font-semibold">
          <IconKey className="size-5" />
          <CardTitle className="text-base font-bold text-foreground">
            Change Password
          </CardTitle>
        </div>
        <CardDescription className="text-xs text-muted-foreground mt-0.5">
          Update your account authentication credentials with secure encryption.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Password */}
          <div className="space-y-1.5">
            <Label htmlFor="current-password" className="text-xs font-semibold">
              Current Password
            </Label>
            <div className="relative">
              <IconLock className="size-4 absolute left-3 top-2.5 text-muted-foreground" />
              <Input
                id="current-password"
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="pl-9 pr-9 h-9 text-xs font-mono"
                disabled={isPending}
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
              >
                {showCurrent ? <IconEyeOff className="size-4" /> : <IconEye className="size-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* New Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="new-password" className="text-xs font-semibold">
                  New Password
                </Label>
                {newPassword.length > 0 && (
                  <span
                    className={`text-[10px] font-medium ${
                      isLengthValid ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
                    }`}
                  >
                    {isLengthValid ? "✓ At least 6 characters" : "Min 6 characters"}
                  </span>
                )}
              </div>
              <div className="relative">
                <IconLock className="size-4 absolute left-3 top-2.5 text-muted-foreground" />
                <Input
                  id="new-password"
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="pl-9 pr-9 h-9 text-xs font-mono"
                  disabled={isPending}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  {showNew ? <IconEyeOff className="size-4" /> : <IconEye className="size-4" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="confirm-password" className="text-xs font-semibold">
                  Confirm New Password
                </Label>
                {confirmPassword.length > 0 && (
                  <span
                    className={`text-[10px] font-medium flex items-center gap-1 ${
                      isMatching
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-destructive"
                    }`}
                  >
                    {isMatching ? (
                      <>
                        <IconCheck className="size-3" />
                        Passwords match
                      </>
                    ) : (
                      <>
                        <IconX className="size-3" />
                        Do not match
                      </>
                    )}
                  </span>
                )}
              </div>
              <div className="relative">
                <IconLock className="size-4 absolute left-3 top-2.5 text-muted-foreground" />
                <Input
                  id="confirm-password"
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className={`pl-9 pr-9 h-9 text-xs font-mono ${
                    isMismatch ? "border-destructive focus-visible:ring-destructive" : ""
                  }`}
                  disabled={isPending}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  {showConfirm ? <IconEyeOff className="size-4" /> : <IconEye className="size-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={isPending || (newPassword.length > 0 && (!isLengthValid || !isMatching))}
              className="text-xs h-9 gap-1.5"
            >
              {isPending ? (
                <IconLoader2 className="size-4 animate-spin" />
              ) : (
                <IconDeviceFloppy className="size-4" />
              )}
              {isPending ? "Updating..." : "Update Password"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
