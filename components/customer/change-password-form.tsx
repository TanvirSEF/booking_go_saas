"use client";

import { useState } from "react";
import { toast } from "sonner";
import { IconLock, IconKey, IconLoader2, IconDeviceFloppy } from "@tabler/icons-react";
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
        toast.success("Password changed successfully!");
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
    <Card className="border-border/60 bg-card text-card-foreground">
      <CardHeader>
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          <IconLock className="w-5 h-5 text-primary" />
          Security & Password
        </CardTitle>
        <CardDescription>
          Update your password to keep your customer account secure.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">Current Password</Label>
            <div className="relative">
              <IconKey className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="pl-9"
                disabled={isPending}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <div className="relative">
              <IconLock className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="•••••••• (min 6 chars)"
                className="pl-9"
                disabled={isPending}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm New Password</Label>
            <div className="relative">
              <IconLock className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="pl-9"
                disabled={isPending}
                required
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button type="submit" disabled={isPending} className="w-full gap-2">
              {isPending ? (
                <IconLoader2 className="w-4 h-4 animate-spin" />
              ) : (
                <IconDeviceFloppy className="w-4 h-4" />
              )}
              {isPending ? "Updating..." : "Change Password"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
