"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  IconLayoutNavbarCollapse,
  IconPlus,
  IconTrash,
  IconLoader2,
  IconDeviceFloppy,
  IconRotateClockwise,
} from "@tabler/icons-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { MediaUploader } from "@/components/shared/media-uploader";
import {
  updateFooterSectionAction,
  resetLandingPageSectionAction,
  toggleLandingPageSectionAction,
} from "@/actions/landing-page";
import type { IFooterSetting, IFooterLink } from "@/types/landing-page";

interface FooterTabProps {
  initialData: IFooterSetting;
}

export function FooterTab({ initialData }: FooterTabProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<IFooterSetting>({
    status: initialData?.status ?? true,
    logo: initialData?.logo || "/images/landing/footer-logo.png",
    description:
      initialData?.description ||
      "We build modern web tools to help you jump-start your daily business appointment operations.",
    copyright: initialData?.copyright || "All Rights Reserved to",
    supportLink: initialData?.supportLink || "/contact",
    websiteName: initialData?.websiteName || "BookingGo SaaS",
    websiteUrl: initialData?.websiteUrl || "https://bookinggo.io/",
    sections: initialData?.sections || [],
  });

  const [isPending, setIsPending] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  const handleToggleStatus = async (newStatus: boolean) => {
    setFormData((prev) => ({ ...prev, status: newStatus }));
    try {
      setIsToggling(true);
      const res = await toggleLandingPageSectionAction("footer", newStatus);
      if (res.success) {
        toast.success(`Footer section ${newStatus ? "enabled" : "disabled"} successfully.`);
        router.refresh();
      } else {
        toast.error(res.message || "Failed to toggle status.");
        setFormData((prev) => ({ ...prev, status: !newStatus }));
      }
    } catch {
      toast.error("Failed to update status.");
      setFormData((prev) => ({ ...prev, status: !newStatus }));
    } finally {
      setIsToggling(false);
    }
  };

  // Column link helpers
  const handleAddColumn = () => {
    setFormData((prev) => ({
      ...prev,
      sections: [
        ...prev.sections,
        {
          heading: "New Category",
          links: [{ title: "New Link", link: "#" }],
        },
      ],
    }));
  };

  const handleRemoveColumn = (colIdx: number) => {
    setFormData((prev) => ({
      ...prev,
      sections: prev.sections.filter((_, i) => i !== colIdx),
    }));
  };

  const handleUpdateColumnHeading = (colIdx: number, heading: string) => {
    const updated = [...formData.sections];
    updated[colIdx].heading = heading;
    setFormData((prev) => ({ ...prev, sections: updated }));
  };

  const handleAddLinkToColumn = (colIdx: number) => {
    const updated = [...formData.sections];
    updated[colIdx].links.push({ title: "New Link", link: "#" });
    setFormData((prev) => ({ ...prev, sections: updated }));
  };

  const handleUpdateLink = (
    colIdx: number,
    linkIdx: number,
    field: keyof IFooterLink,
    value: string
  ) => {
    const updated = [...formData.sections];
    updated[colIdx].links[linkIdx][field] = value;
    setFormData((prev) => ({ ...prev, sections: updated }));
  };

  const handleRemoveLink = (colIdx: number, linkIdx: number) => {
    const updated = [...formData.sections];
    updated[colIdx].links = updated[colIdx].links.filter((_, i) => i !== linkIdx);
    setFormData((prev) => ({ ...prev, sections: updated }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsPending(true);
      const res = await updateFooterSectionAction(formData);
      if (res.success) {
        toast.success(res.message || "Footer configuration saved successfully.");
        router.refresh();
      } else {
        toast.error(res.message || "Failed to update footer.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsPending(false);
    }
  };

  const handleReset = async () => {
    try {
      setIsResetting(true);
      const res = await resetLandingPageSectionAction("footer");
      if (res.success) {
        toast.success("Footer restored to factory default.");
        router.refresh();
      } else {
        toast.error(res.message || "Failed to reset footer.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reset failed.");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <Card className="rounded-xl border border-border bg-card shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border/60">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <IconLayoutNavbarCollapse className="size-5 text-primary" />
            <span>Footer & Navigation Links Setting</span>
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Configure footer logo, description, copyright bar, and multi-column navigation links.
          </CardDescription>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleReset}
          disabled={isResetting || isPending}
          className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-destructive hover:border-destructive/40"
        >
          {isResetting ? (
            <IconLoader2 className="size-3.5 animate-spin" />
          ) : (
            <IconRotateClockwise className="size-3.5" />
          )}
          <span>Reset Default</span>
        </Button>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
          {/* Status Toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/30">
            <div className="space-y-0.5">
              <Label className="text-sm font-semibold text-foreground">
                Footer Section Visibility
              </Label>
              <p className="text-xs text-muted-foreground">
                Display the global marketing page footer.
              </p>
            </div>
            <Switch
              checked={formData.status}
              onCheckedChange={handleToggleStatus}
              disabled={isToggling}
            />
          </div>

          {/* Footer Logo */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground">Footer Brand Logo</Label>
            <MediaUploader
              value={formData.logo}
              onChange={(url) => setFormData((prev) => ({ ...prev, logo: url }))}
              folder="logo"
              placeholder="Upload footer logo or enter URL"
              disabled={!formData.status || isPending}
              aspectRatio="square"
            />
          </div>

          {/* Company Description */}
          <div className="space-y-1.5">
            <Label htmlFor="footer-desc" className="text-xs font-semibold text-foreground">
              Company Brief / Mission Statement
            </Label>
            <Textarea
              id="footer-desc"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="We build modern web tools to help you jump-start your daily business appointment operations."
              rows={3}
              className="text-xs"
              disabled={!formData.status || isPending}
            />
          </div>

          {/* Copyright & Website */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="copyright" className="text-xs font-semibold text-foreground">
                Copyright Prefix
              </Label>
              <Input
                id="copyright"
                value={formData.copyright}
                onChange={(e) => setFormData((prev) => ({ ...prev, copyright: e.target.value }))}
                placeholder="All Rights Reserved to"
                className="text-xs h-9"
                disabled={!formData.status || isPending}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="website-name" className="text-xs font-semibold text-foreground">
                Website / Company Name
              </Label>
              <Input
                id="website-name"
                value={formData.websiteName}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, websiteName: e.target.value }))
                }
                placeholder="BookingGo SaaS"
                className="text-xs h-9"
                disabled={!formData.status || isPending}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="website-url" className="text-xs font-semibold text-foreground">
                Website URL
              </Label>
              <Input
                id="website-url"
                value={formData.websiteUrl}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, websiteUrl: e.target.value }))
                }
                placeholder="https://bookinggo.io/"
                className="text-xs h-9"
                disabled={!formData.status || isPending}
              />
            </div>
          </div>

          {/* Multi-Column Link Manager */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold text-foreground">
                Footer Navigation Columns ({formData.sections.length})
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddColumn}
                disabled={!formData.status || isPending}
                className="h-8 text-xs gap-1"
              >
                <IconPlus className="size-3.5" />
                <span>Add Link Column</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {formData.sections.map((col, colIdx) => (
                <div
                  key={colIdx}
                  className="rounded-xl border border-border bg-card p-4 space-y-3 relative shadow-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Input
                      value={col.heading}
                      onChange={(e) => handleUpdateColumnHeading(colIdx, e.target.value)}
                      placeholder="Column Heading (e.g. Company)"
                      className="text-xs font-semibold h-8"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveColumn(colIdx)}
                      className="size-7 text-destructive hover:bg-destructive/10 shrink-0"
                    >
                      <IconTrash className="size-3.5" />
                    </Button>
                  </div>

                  <div className="space-y-2 pt-1">
                    {col.links.map((link, linkIdx) => (
                      <div key={linkIdx} className="flex items-center gap-1.5">
                        <Input
                          value={link.title}
                          onChange={(e) =>
                            handleUpdateLink(colIdx, linkIdx, "title", e.target.value)
                          }
                          placeholder="Title"
                          className="text-xs h-7 w-2/5"
                        />
                        <Input
                          value={link.link}
                          onChange={(e) =>
                            handleUpdateLink(colIdx, linkIdx, "link", e.target.value)
                          }
                          placeholder="URL"
                          className="text-xs h-7 w-3/5"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveLink(colIdx, linkIdx)}
                          className="size-7 text-muted-foreground hover:text-destructive shrink-0"
                        >
                          <IconTrash className="size-3" />
                        </Button>
                      </div>
                    ))}

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddLinkToColumn(colIdx)}
                      className="w-full text-xs h-7 gap-1 mt-1 border-dashed"
                    >
                      <IconPlus className="size-3" />
                      <span>Add Link</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <Button
              type="submit"
              size="sm"
              disabled={isPending}
              className="gap-2 h-9 text-xs px-5 shadow-xs"
            >
              {isPending ? (
                <IconLoader2 className="size-3.5 animate-spin" />
              ) : (
                <IconDeviceFloppy className="size-3.5" />
              )}
              <span>Save Footer Settings</span>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
