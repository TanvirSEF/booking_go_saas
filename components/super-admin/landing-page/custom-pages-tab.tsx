"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  IconFileText,
  IconPlus,
  IconPencil,
  IconTrash,
  IconExternalLink,
  IconEye,
  IconLoader2,
  IconLock,
} from "@tabler/icons-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  saveCustomPageAction,
  deleteCustomPageAction,
} from "@/actions/landing-page";
import type { ICustomPageItem } from "@/types/landing-page";

interface CustomPagesTabProps {
  initialPages: ICustomPageItem[];
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function CustomPagesTab({ initialPages }: CustomPagesTabProps) {
  const router = useRouter();
  const [pages, setPages] = useState<ICustomPageItem[]>(initialPages || []);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");

  const [pageForm, setPageForm] = useState<ICustomPageItem>({
    id: "",
    name: "",
    slug: "",
    shortDescription: "",
    content: "",
    pageUrl: "",
    templateType: "content",
    header: true,
    footer: true,
    loginRequired: false,
  });

  const handleOpenAdd = () => {
    setEditingPageId(null);
    setPageForm({
      id: "page-" + Date.now(),
      name: "",
      slug: "",
      shortDescription: "",
      content: "<h2>Page Heading</h2><p>Write custom HTML or text here...</p>",
      pageUrl: "",
      templateType: "content",
      header: true,
      footer: true,
      loginRequired: false,
    });
    setActiveTab("edit");
    setModalOpen(true);
  };

  const handleOpenEdit = (p: ICustomPageItem) => {
    setEditingPageId(p.id);
    setPageForm({ ...p });
    setActiveTab("edit");
    setModalOpen(true);
  };

  const handleNameChange = (val: string) => {
    setPageForm((prev) => ({
      ...prev,
      name: val,
      slug: editingPageId ? prev.slug : slugify(val),
    }));
  };

  const handleSavePage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pageForm.name.trim()) {
      toast.error("Page name is required.");
      return;
    }
    if (!pageForm.slug.trim()) {
      toast.error("Page slug is required.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await saveCustomPageAction(pageForm);
      if (res.success && res.data) {
        toast.success(res.message || "Custom page saved successfully.");
        const updated = [...pages];
        const existingIdx = updated.findIndex((p) => p.id === pageForm.id);
        if (existingIdx >= 0) {
          updated[existingIdx] = res.data as ICustomPageItem;
        } else {
          updated.push(res.data as ICustomPageItem);
        }
        setPages(updated);
        setModalOpen(false);
        router.refresh();
      } else {
        toast.error(res.message || "Failed to save custom page.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePage = async (idOrSlug: string) => {
    try {
      const res = await deleteCustomPageAction(idOrSlug);
      if (res.success) {
        toast.success("Page deleted.");
        setPages((prev) => prev.filter((p) => p.id !== idOrSlug && p.slug !== idOrSlug));
        router.refresh();
      } else {
        toast.error(res.message || "Failed to delete page.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete page.");
    }
  };

  return (
    <Card className="rounded-xl border border-border bg-card shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border/60">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <IconFileText className="size-5 text-primary" />
            <span>Custom Pages Builder</span>
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Create and publish unlimited dynamic pages (About Us, Terms, Privacy Policy, Career) with custom content or external URLs.
          </CardDescription>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={handleOpenAdd}
          className="h-8 text-xs gap-1.5 shadow-xs"
        >
          <IconPlus className="size-3.5" />
          <span>Add New Page</span>
        </Button>
      </CardHeader>

      <CardContent className="pt-6">
        <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="font-semibold text-xs text-foreground">Page Title</TableHead>
                <TableHead className="font-semibold text-xs text-foreground">URL Path</TableHead>
                <TableHead className="font-semibold text-xs text-foreground">Type</TableHead>
                <TableHead className="hidden md:table-cell font-semibold text-xs text-foreground">
                  Navigation
                </TableHead>
                <TableHead className="text-right w-28 font-semibold text-xs text-foreground">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-xs text-muted-foreground">
                    No custom pages found. Click &ldquo;Add New Page&rdquo; to publish one.
                  </TableCell>
                </TableRow>
              ) : (
                pages.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium text-xs text-foreground">
                      <div className="flex items-center gap-2">
                        <span>{p.name}</span>
                        {p.loginRequired && (
                          <Badge variant="secondary" className="text-[10px] gap-1 px-1.5 py-0">
                            <IconLock className="size-2.5" />
                            <span>Auth Only</span>
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-primary">
                      {p.templateType === "url" ? (
                        <a
                          href={p.pageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline flex items-center gap-1"
                        >
                          <span className="truncate max-w-[200px]">{p.pageUrl}</span>
                          <IconExternalLink className="size-3" />
                        </a>
                      ) : (
                        <a
                          href={`/pages/${p.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline flex items-center gap-1"
                        >
                          <span>/pages/{p.slug}</span>
                          <IconExternalLink className="size-3" />
                        </a>
                      )}
                    </TableCell>
                    <TableCell className="text-xs capitalize text-muted-foreground">
                      {p.templateType === "url" ? "External Link" : "Rich Content"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                      <div className="flex gap-1.5">
                        {p.header && (
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                            Header
                          </Badge>
                        )}
                        {p.footer && (
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                            Footer
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(p)}
                          className="size-7 text-muted-foreground hover:text-foreground"
                        >
                          <IconPencil className="size-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeletePage(p.id)}
                          className="size-7 text-destructive hover:bg-destructive/10"
                        >
                          <IconTrash className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Add / Edit Custom Page Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">
              {editingPageId ? "Edit Custom Page" : "Add New Custom Page"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Define the page URL slug, display locations, and formatted body content.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSavePage} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Page Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={pageForm.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Terms and Conditions"
                  className="text-xs h-9"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  URL Slug <span className="text-destructive">*</span>
                </Label>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">/pages/</span>
                  <Input
                    value={pageForm.slug}
                    onChange={(e) =>
                      setPageForm((prev) => ({ ...prev, slug: slugify(e.target.value) }))
                    }
                    placeholder="terms_and_conditions"
                    className="text-xs h-9 font-mono"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Template Type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Content Type</Label>
                <Select
                  value={pageForm.templateType}
                  onValueChange={(val: "content" | "url") =>
                    setPageForm((prev) => ({ ...prev, templateType: val }))
                  }
                >
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="content" className="text-xs">
                      Rich HTML / Content Page
                    </SelectItem>
                    <SelectItem value="url" className="text-xs">
                      External URL Redirect
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {pageForm.templateType === "url" && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    Target External URL <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={pageForm.pageUrl}
                    onChange={(e) =>
                      setPageForm((prev) => ({ ...prev, pageUrl: e.target.value }))
                    }
                    placeholder="https://docs.yourcompany.com"
                    className="text-xs h-9"
                    required
                  />
                </div>
              )}
            </div>

            {/* Short Description */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Short Summary / Description</Label>
              <Textarea
                value={pageForm.shortDescription}
                onChange={(e) =>
                  setPageForm((prev) => ({ ...prev, shortDescription: e.target.value }))
                }
                placeholder="A brief overview shown in search snippets..."
                rows={2}
                className="text-xs"
              />
            </div>

            {/* Visibility Toggles */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 rounded-xl border border-border bg-muted/20">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium cursor-pointer">Show in Header</Label>
                <Switch
                  checked={pageForm.header}
                  onCheckedChange={(val) => setPageForm((prev) => ({ ...prev, header: val }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium cursor-pointer">Show in Footer</Label>
                <Switch
                  checked={pageForm.footer}
                  onCheckedChange={(val) => setPageForm((prev) => ({ ...prev, footer: val }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium cursor-pointer">Require Login</Label>
                <Switch
                  checked={pageForm.loginRequired}
                  onCheckedChange={(val) =>
                    setPageForm((prev) => ({ ...prev, loginRequired: val }))
                  }
                />
              </div>
            </div>

            {/* Rich Content Editor */}
            {pageForm.templateType === "content" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <Label className="text-xs font-semibold">
                    Page Content (HTML / Rich Text) <span className="text-destructive">*</span>
                  </Label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setActiveTab("edit")}
                      className={
                        activeTab === "edit"
                          ? "px-2.5 py-1 rounded-md text-xs font-semibold bg-primary text-primary-foreground"
                          : "px-2.5 py-1 rounded-md text-xs font-medium bg-muted text-muted-foreground hover:text-foreground"
                      }
                    >
                      Write
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("preview")}
                      className={
                        activeTab === "preview"
                          ? "px-2.5 py-1 rounded-md text-xs font-semibold bg-primary text-primary-foreground flex items-center gap-1"
                          : "px-2.5 py-1 rounded-md text-xs font-medium bg-muted text-muted-foreground hover:text-foreground flex items-center gap-1"
                      }
                    >
                      <IconEye size={13} />
                      <span>Preview</span>
                    </button>
                  </div>
                </div>

                {activeTab === "edit" ? (
                  <Textarea
                    value={pageForm.content}
                    onChange={(e) =>
                      setPageForm((prev) => ({ ...prev, content: e.target.value }))
                    }
                    placeholder="<h2>Welcome to BookingGo</h2><p>Detailed body content goes here...</p>"
                    rows={8}
                    className="text-xs font-mono"
                    required
                  />
                ) : (
                  <div className="p-4 rounded-lg border border-border bg-card min-h-[200px] prose dark:prose-invert max-w-none text-xs">
                    <div dangerouslySetInnerHTML={{ __html: pageForm.content || "<p>Empty</p>" }} />
                  </div>
                )}
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalOpen(false)}
                disabled={isSubmitting}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSubmitting} className="text-xs gap-1.5">
                {isSubmitting ? (
                  <IconLoader2 className="size-3.5 animate-spin" />
                ) : (
                  <IconFileText className="size-3.5" />
                )}
                <span>{editingPageId ? "Update Custom Page" : "Publish Page"}</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
