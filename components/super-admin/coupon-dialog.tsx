"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  createCouponAction,
  updateCouponAction,
  deleteCouponAction,
  type CouponItem,
} from "@/actions/coupon";

function generateCouponCode(length = 10): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

interface CreateCouponDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateCouponDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateCouponDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [discount, setDiscount] = useState("");
  const [limit, setLimit] = useState("");
  const [codeMode, setCodeMode] = useState<"manual" | "auto">("manual");
  const [code, setCode] = useState("");

  const handleReset = () => {
    setName("");
    setDiscount("");
    setLimit("");
    setCodeMode("manual");
    setCode("");
  };

  const handleCreate = () => {
    if (!name.trim()) {
      toast.error("Please enter a coupon name.");
      return;
    }

    const discountNum = Number(discount);
    if (isNaN(discountNum) || discountNum < 0 || discountNum > 100) {
      toast.error("Please enter a valid discount percentage (0 - 100).");
      return;
    }

    const limitNum = Number(limit);
    if (isNaN(limitNum) || limitNum < 1) {
      toast.error("Limit must be at least 1.");
      return;
    }

    if (!code.trim()) {
      toast.error("Please enter or generate a coupon code.");
      return;
    }

    startTransition(async () => {
      const res = await createCouponAction({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        discount: discountNum,
        limit: limitNum,
        discountType: "percentage",
      });

      if (res.success) {
        toast.success("Coupon created successfully.");
        handleReset();
        onOpenChange(false);
        onSuccess?.();
        router.refresh();
      } else {
        toast.error(res.error || "Failed to create coupon.");
      }
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) handleReset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-foreground">
            Create New Coupon
          </DialogTitle>
          <DialogDescription className="sr-only">
            Create a new promotional discount coupon for SaaS subscriptions.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="create-coupon-name" className="text-sm font-medium text-foreground">
              Name
            </Label>
            <Input
              id="create-coupon-name"
              placeholder="Enter Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isPending}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="create-coupon-discount" className="text-sm font-medium text-foreground">
                Discount
              </Label>
              <Input
                id="create-coupon-discount"
                type="number"
                placeholder="Enter Discount"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                disabled={isPending}
                min={0}
                max={100}
              />
              <span className="text-[11px] text-muted-foreground">
                Note: Discount in Percentage
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="create-coupon-limit" className="text-sm font-medium text-foreground">
                Limit
              </Label>
              <Input
                id="create-coupon-limit"
                type="number"
                placeholder="Enter Limit"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                disabled={isPending}
                min={1}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium text-foreground">Code</Label>
            <RadioGroup
              value={codeMode}
              onValueChange={(val: "manual" | "auto") => {
                setCodeMode(val);
                if (val === "auto") {
                  setCode(generateCouponCode(10));
                }
              }}
              className="flex items-center gap-6"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="manual" id="code-mode-manual" />
                <Label htmlFor="code-mode-manual" className="cursor-pointer text-sm font-normal text-foreground">
                  Manual
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="auto" id="code-mode-auto" />
                <Label htmlFor="code-mode-auto" className="cursor-pointer text-sm font-normal text-foreground">
                  Auto Generate
                </Label>
              </div>
            </RadioGroup>

            <Input
              id="create-coupon-code"
              placeholder="Enter Code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              disabled={isPending}
              className="font-mono uppercase tracking-wider"
            />
          </div>
        </div>

        <DialogFooter className="mt-2 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              handleReset();
              onOpenChange(false);
            }}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleCreate}
            disabled={isPending}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isPending ? "Creating..." : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface EditCouponDialogProps {
  coupon: CouponItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EditCouponDialog({
  coupon,
  open,
  onOpenChange,
  onSuccess,
}: EditCouponDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [prevCouponId, setPrevCouponId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [discount, setDiscount] = useState("");
  const [limit, setLimit] = useState("");
  const [code, setCode] = useState("");

  if (coupon && coupon.id !== prevCouponId) {
    setPrevCouponId(coupon.id);
    setName(coupon.name);
    setDiscount(String(coupon.discount));
    setLimit(String(coupon.limit));
    setCode(coupon.code);
  }

  const handleUpdate = () => {
    if (!coupon) return;

    if (!name.trim()) {
      toast.error("Please enter a coupon name.");
      return;
    }

    const discountNum = Number(discount);
    if (isNaN(discountNum) || discountNum < 0 || discountNum > 100) {
      toast.error("Please enter a valid discount percentage (0 - 100).");
      return;
    }

    const limitNum = Number(limit);
    if (isNaN(limitNum) || limitNum < 1) {
      toast.error("Limit must be at least 1.");
      return;
    }

    if (!code.trim()) {
      toast.error("Please enter a coupon code.");
      return;
    }

    startTransition(async () => {
      const res = await updateCouponAction({
        couponId: coupon.id,
        name: name.trim(),
        code: code.trim().toUpperCase(),
        discount: discountNum,
        limit: limitNum,
        discountType: "percentage",
      });

      if (res.success) {
        toast.success("Coupon updated successfully.");
        onOpenChange(false);
        onSuccess?.();
        router.refresh();
      } else {
        toast.error(res.error || "Failed to update coupon.");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-foreground">
            Edit Coupon
          </DialogTitle>
          <DialogDescription className="sr-only">
            Update promotional discount coupon parameters and limits.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-coupon-name" className="text-sm font-medium text-foreground">
              Name
            </Label>
            <Input
              id="edit-coupon-name"
              placeholder="Enter Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isPending}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-coupon-discount" className="text-sm font-medium text-foreground">
                Discount
              </Label>
              <Input
                id="edit-coupon-discount"
                type="number"
                placeholder="Enter Discount"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                disabled={isPending}
                min={0}
                max={100}
              />
              <span className="text-[11px] text-muted-foreground">
                Note: Discount in Percentage
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-coupon-limit" className="text-sm font-medium text-foreground">
                Limit
              </Label>
              <Input
                id="edit-coupon-limit"
                type="number"
                placeholder="Enter Limit"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                disabled={isPending}
                min={1}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-coupon-code" className="text-sm font-medium text-foreground">
              Code
            </Label>
            <Input
              id="edit-coupon-code"
              placeholder="Enter Code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              disabled={isPending}
              className="font-mono uppercase tracking-wider"
            />
          </div>
        </div>

        <DialogFooter className="mt-2 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleUpdate}
            disabled={isPending}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isPending ? "Updating..." : "Update"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface DeleteCouponDialogProps {
  coupon: CouponItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function DeleteCouponDialog({
  coupon,
  open,
  onOpenChange,
  onSuccess,
}: DeleteCouponDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (!coupon) return;

    startTransition(async () => {
      const res = await deleteCouponAction(coupon.id);
      if (res.success) {
        toast.success("Coupon deleted successfully.");
        onOpenChange(false);
        onSuccess?.();
        router.refresh();
      } else {
        toast.error(res.error || "Failed to delete coupon.");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-foreground">
            Delete Coupon
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Are you sure you want to delete &ldquo;{coupon?.name}&rdquo; ({coupon?.code})? This action will permanently remove the promotional code and its redemption logs.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-4 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isPending}
          >
            {isPending ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
