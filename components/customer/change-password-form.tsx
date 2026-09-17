"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Lock, Loader2, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { updateCustomerProfileAction } from "@/actions/customer-appointment";

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword) {
      toast.error("Please enter your current password.");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }

    try {
      setIsPending(true);
      const res = await updateCustomerProfileAction({
        currentPassword,
        newPassword,
      });

      if (res?.error) {
        toast.error(res.error || "Failed to update password.");
      } else {
        toast.success("Password updated successfully!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred while changing password.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Card className="border-border/80 bg-white dark:bg-zinc-900">
      <CardHeader>
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          <Lock className="w-5 h-5 text-primary" />
          Security & Password
        </CardTitle>
        <CardDescription>
          Ensure your account uses a strong, secure password.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">Current Password</Label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <Input
                id="current-password"
                type="password"
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="pl-9"
                disabled={isPending}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <Input
                id="new-password"
                type="password"
                placeholder="At least 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="pl-9"
                disabled={isPending}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm New Password</Label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <Input
                id="confirm-password"
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-9"
                disabled={isPending}
                required
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button type="submit" disabled={isPending} className="gap-2">
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ShieldCheck className="w-4 h-4" />
              )}
              {isPending ? "Updating Password..." : "Update Password"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
