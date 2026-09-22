"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { toast } from "sonner";
import {
  IconAlertTriangle,
  IconShieldLock,
  IconTrash,
  IconLoader2,
  IconLock,
} from "@tabler/icons-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteUserAccountAction } from "@/actions/user-profile";

interface DangerZoneCardProps {
  userRole: string;
}

export function DangerZoneCard({ userRole }: DangerZoneCardProps) {
  const isSuperAdmin = userRole === "super admin";

  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [isPending, setIsPending] = useState(false);

  const handleDeleteAccount = async () => {
    if (!password) {
      toast.error("Password confirmation is required.");
      return;
    }

    try {
      setIsPending(true);
      const res = await deleteUserAccountAction({ password });

      if (res.success) {
        toast.success(res.message || "Account permanently deleted.");
        setOpen(false);
        signOut({ callbackUrl: "/login" });
      } else {
        toast.error(res.error || "Failed to delete account.");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred during account deletion.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Card className="rounded-xl border-destructive/40 bg-card shadow-xs">
      <CardHeader className="border-b border-destructive/20 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-destructive font-semibold">
            <IconAlertTriangle className="size-5" />
            <CardTitle className="text-base font-bold text-foreground">
              Danger Zone
            </CardTitle>
          </div>
          {isSuperAdmin && (
            <Badge variant="outline" className="border-primary/30 text-primary text-[10px] gap-1">
              <IconShieldLock className="size-3" />
              Super Admin Protected
            </Badge>
          )}
        </div>
        <CardDescription className="text-xs text-muted-foreground mt-0.5">
          Irreversible account actions. Permanent deletion erases personal data and associated business branches.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-destructive/20 bg-destructive/5 p-4">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-destructive">
              Delete Account Permanently
            </h4>
            <p className="text-xs text-muted-foreground max-w-md">
              {isSuperAdmin
                ? "Super Admin accounts cannot be self-deleted due to critical platform infrastructure safeguards."
                : "Once deleted, all business booking branches, appointment schedules, and data cannot be recovered."}
            </p>
          </div>

          <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                disabled={isSuperAdmin}
                className="text-xs gap-1.5 shrink-0"
              >
                <IconTrash className="size-3.5" />
                Delete Account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <div className="flex size-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive mb-1">
                  <IconAlertTriangle className="size-5" />
                </div>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription className="text-xs text-muted-foreground">
                  This action cannot be undone. To permanently delete your account and deactivate
                  all your business operations, enter your current password below.
                </AlertDialogDescription>
              </AlertDialogHeader>

              <div className="space-y-1.5 py-2">
                <Label htmlFor="delete-confirm-password" className="text-xs font-semibold">
                  Confirm Account Password
                </Label>
                <div className="relative">
                  <IconLock className="size-4 absolute left-3 top-2.5 text-muted-foreground" />
                  <Input
                    id="delete-confirm-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password to confirm"
                    className="pl-9 h-9 text-xs font-mono"
                    disabled={isPending}
                    required
                  />
                </div>
              </div>

              <AlertDialogFooter>
                <AlertDialogCancel disabled={isPending} className="text-xs">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.preventDefault();
                    handleDeleteAccount();
                  }}
                  disabled={isPending || !password}
                  className="text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-1.5"
                >
                  {isPending ? (
                    <IconLoader2 className="size-3.5 animate-spin" />
                  ) : (
                    <IconTrash className="size-3.5" />
                  )}
                  {isPending ? "Deleting..." : "Permanently Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
