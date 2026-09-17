"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { User, Mail, Phone, Calendar, Loader2, Save } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateCustomerProfileAction, type CustomerProfileData } from "@/actions/customer-appointment";

interface ProfileFormProps {
  initialData: CustomerProfileData;
}

export function ProfileForm({ initialData }: ProfileFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialData.name || "");
  const [contact, setContact] = useState(initialData.contact || "");
  const [gender, setGender] = useState(initialData.gender || "");
  const [dob, setDob] = useState(initialData.dob || "");
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Full name is required.");
      return;
    }

    try {
      setIsPending(true);
      const res = await updateCustomerProfileAction({
        name: name.trim(),
        contact: contact.trim(),
        gender,
        dob,
      });

      if (res?.error) {
        toast.error(res.error || "Failed to update profile.");
      } else {
        toast.success("Profile information updated successfully!");
        router.refresh();
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred while saving profile.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Card className="border-border/80 bg-white dark:bg-zinc-900">
      <CardHeader>
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          <User className="w-5 h-5 text-primary" />
          Personal Information
        </CardTitle>
        <CardDescription>
          Update your contact and personal information for bookings.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  className="pl-9"
                  disabled={isPending}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  id="email"
                  value={initialData.email}
                  disabled
                  className="pl-9 bg-muted/50 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact">Phone Number</Label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  id="contact"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="pl-9"
                  disabled={isPending}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <Select value={gender} onValueChange={setGender} disabled={isPending}>
                <SelectTrigger id="gender">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="dob">Date of Birth</Label>
              <div className="relative">
                <Calendar className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  id="dob"
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="pl-9"
                  disabled={isPending}
                />
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button type="submit" disabled={isPending} className="gap-2">
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
