"use client";

import * as React from "react";
import Image from "next/image";
import {
  IconArticle,
  IconBold,
  IconCode,
  IconEye,
  IconHeading,
  IconItalic,
  IconLink,
  IconList,
  IconPhoto,
  IconQuote,
  IconSparkles,
  IconX,
} from "@tabler/icons-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { createBlogPostAction, updateBlogPostAction } from "@/actions/blog";
import type { BlogPostDTO, BlogStatus } from "@/types/blog";

const SUGGESTED_CATEGORIES = [
  "Hair Care",
  "Beauty & Wellness",
  "Tips & Guides",
  "News & Announcements",
  "Promotions & Deals",
  "Company Updates",
  "Health & Safety",
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

interface BlogEditorFormProps {
  post?: BlogPostDTO | null;
  onCancel: () => void;
  onSaved: () => void;
}

function BlogEditorForm({ post, onCancel, onSaved }: BlogEditorFormProps) {
  const isEdit = !!post;
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [title, setTitle] = React.useState(post?.title || "");
  const [slug, setSlug] = React.useState(post?.slug || (post?.title ? slugify(post.title) : ""));
  const [isCustomSlug, setIsCustomSlug] = React.useState(!!post?.slug);
  const [category, setCategory] = React.useState(post?.category || "General");
  const [summary, setSummary] = React.useState(post?.summary || "");
  const [content, setContent] = React.useState(post?.content || "");
  const [image, setImage] = React.useState(post?.image || "");
  const [status, setStatus] = React.useState<BlogStatus>(post?.status || "published");
  const [tagsInput, setTagsInput] = React.useState(post?.tags ? post.tags.join(", ") : "");
  const [activeTab, setActiveTab] = React.useState<"edit" | "preview">("edit");

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    if (!isCustomSlug && !isEdit) {
      setSlug(slugify(newTitle));
    }
  };

  const handleInsertToolbar = (syntax: string) => {
    setContent((prev) => prev + syntax);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Please enter an article title.");
      return;
    }

    if (!content.trim()) {
      toast.error("Please provide article content.");
      return;
    }

    const tagsArray = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    setIsSubmitting(true);
    try {
      if (isEdit && post) {
        const res = await updateBlogPostAction({
          id: post.id,
          title: title.trim(),
          slug: slug.trim() || undefined,
          summary: summary.trim(),
          content,
          image: image.trim(),
          category: category.trim() || "General",
          tags: tagsArray,
          status,
        });

        if (res.success) {
          toast.success("Blog article updated successfully!");
          onSaved();
        } else {
          toast.error(res.error || "Failed to update blog article.");
        }
      } else {
        const res = await createBlogPostAction({
          title: title.trim(),
          slug: slug.trim() || undefined,
          summary: summary.trim(),
          content,
          image: image.trim(),
          category: category.trim() || "General",
          tags: tagsArray,
          status,
        });

        if (res.success) {
          toast.success("Blog article created successfully!");
          onSaved();
        } else {
          toast.error(res.error || "Failed to create blog article.");
        }
      }
    } catch {
      toast.error("An unexpected error occurred while saving article.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Title & Slug */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="post-title" className="text-xs font-semibold text-foreground">
              Article Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="post-title"
              placeholder="e.g. 10 Essential Hair Care Tips for Summer 2026"
              value={title}
              onChange={handleTitleChange}
              required
              className="font-medium"
            />
          </div>

          {/* SEO Slug Preview */}
          <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <IconSparkles size={14} className="text-primary" />
                SEO Article URL
              </span>
              <button
                type="button"
                onClick={() => setIsCustomSlug(!isCustomSlug)}
                className="text-[11px] font-medium text-primary hover:underline"
              >
                {isCustomSlug ? "Auto-generate" : "Customize URL Slug"}
              </button>
            </div>
            {isCustomSlug ? (
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">/blog/</span>
                <Input
                  value={slug}
                  onChange={(e) => setSlug(slugify(e.target.value))}
                  placeholder="custom-article-slug"
                  className="h-7 text-xs"
                />
              </div>
            ) : (
              <p className="text-xs font-mono text-foreground/80 break-all">
                /blog/<span className="text-primary font-bold">{slug || "article-slug"}</span>
              </p>
            )}
          </div>
        </div>

        {/* Category & Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="post-category" className="text-xs font-semibold text-foreground">
              Category
            </Label>
            <Input
              id="post-category"
              placeholder="e.g. Tips & Guides"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="text-xs"
            />
            <div className="flex flex-wrap gap-1 mt-1.5">
              {SUGGESTED_CATEGORIES.slice(0, 4).map((cat) => (
                <Badge
                  key={cat}
                  variant="outline"
                  onClick={() => setCategory(cat)}
                  className="cursor-pointer text-[10px] py-0.5 px-2 hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  {cat}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="post-status" className="text-xs font-semibold text-foreground">
              Publishing Status
            </Label>
            <Select value={status} onValueChange={(val: BlogStatus) => setStatus(val)}>
              <SelectTrigger id="post-status" className="text-xs">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="published" className="text-xs">
                  🟢 Published (Visible to Public)
                </SelectItem>
                <SelectItem value="draft" className="text-xs">
                  🟡 Draft (Private Tenant Only)
                </SelectItem>
                <SelectItem value="archived" className="text-xs">
                  ⚪ Archived (Hidden)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Hero Image URL & Live Preview */}
        <div className="space-y-2">
          <Label htmlFor="post-image" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <IconPhoto size={15} className="text-primary" />
            Hero Thumbnail Image URL
          </Label>
          <div className="flex gap-2">
            <Input
              id="post-image"
              placeholder="https://images.unsplash.com/photo-... or custom URL"
              value={image}
              onChange={(e) => setImage(e.target.value)}
              className="text-xs"
            />
            {image && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setImage("")}
                className="shrink-0 text-xs text-muted-foreground hover:text-destructive"
              >
                <IconX size={14} />
              </Button>
            )}
          </div>

          {image && (
            <div className="relative w-full h-36 rounded-lg overflow-hidden border border-border/60 bg-muted">
              <Image
                src={image}
                alt="Article thumbnail preview"
                fill
                unoptimized
                className="object-cover"
                onError={() => {
                  toast.error("Failed to load thumbnail preview image.");
                }}
              />
            </div>
          )}
        </div>

        {/* Summary / Excerpt */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="post-summary" className="text-xs font-semibold text-foreground">
              Short Excerpt / SEO Meta Description
            </Label>
            <span className="text-[10px] text-muted-foreground">
              {summary.length} / 180 characters
            </span>
          </div>
          <Textarea
            id="post-summary"
            placeholder="A compelling 1-2 sentence overview shown on blog cards and Google search results."
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={2}
            maxLength={240}
            className="text-xs resize-none"
          />
        </div>

        {/* Tags Input */}
        <div className="space-y-1.5">
          <Label htmlFor="post-tags" className="text-xs font-semibold text-foreground">
            Tags (Comma-separated)
          </Label>
          <Input
            id="post-tags"
            placeholder="haircare, styling, summer, wellness"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            className="text-xs"
          />
        </div>

        {/* Content Editor with Markdown Toolbar and Preview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between border-b border-border/60 pb-2">
            <Label htmlFor="post-content" className="text-xs font-semibold text-foreground">
              Article Body Content <span className="text-destructive">*</span>
            </Label>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveTab("edit")}
                className={
                  activeTab === "edit"
                    ? "px-2.5 py-1 rounded-md text-xs font-semibold bg-primary text-primary-foreground transition-colors"
                    : "px-2.5 py-1 rounded-md text-xs font-medium bg-muted text-muted-foreground hover:text-foreground transition-colors"
                }
              >
                Write
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("preview")}
                className={
                  activeTab === "preview"
                    ? "px-2.5 py-1 rounded-md text-xs font-semibold bg-primary text-primary-foreground transition-colors flex items-center gap-1"
                    : "px-2.5 py-1 rounded-md text-xs font-medium bg-muted text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                }
              >
                <IconEye size={13} />
                Preview
              </button>
            </div>
          </div>

          {activeTab === "edit" ? (
            <div className="space-y-2">
              {/* Quick Markdown Toolbar */}
              <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border/60 bg-muted/40 p-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => handleInsertToolbar("## Heading 2\n")}
                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                  title="Heading"
                >
                  <IconHeading size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertToolbar("**bold text**")}
                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                  title="Bold"
                >
                  <IconBold size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertToolbar("*italic text*")}
                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                  title="Italic"
                >
                  <IconItalic size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertToolbar("\n- Bullet point\n")}
                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                  title="List"
                >
                  <IconList size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertToolbar("\n> Blockquote text\n")}
                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                  title="Quote"
                >
                  <IconQuote size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertToolbar("[Link Title](https://example.com)")}
                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                  title="Link"
                >
                  <IconLink size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertToolbar("\n```javascript\n// code here\n```\n")}
                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                  title="Code Block"
                >
                  <IconCode size={15} />
                </button>
              </div>

              <Textarea
                id="post-content"
                placeholder="Write your article content using markdown or formatted text..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={12}
                required
                className="font-mono text-xs leading-relaxed"
              />
            </div>
          ) : (
            <div className="rounded-lg border border-border/60 bg-muted/20 p-4 min-h-[280px] max-h-[400px] overflow-y-auto prose prose-sm dark:prose-invert max-w-none text-xs">
              {content ? (
                <div className="space-y-3 whitespace-pre-wrap font-sans text-foreground">
                  {content}
                </div>
              ) : (
                <p className="text-muted-foreground italic">
                  No content written yet. Switch to Write tab to begin.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <DialogFooter className="p-4 border-t border-border/60 bg-muted/20 shrink-0 gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isSubmitting} className="font-semibold gap-1.5">
          {isSubmitting ? (
            <>
              <div className="size-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              <span>Saving Article...</span>
            </>
          ) : (
            <>
              <span>{isEdit ? "Update Article" : "Publish / Save Article"}</span>
            </>
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}

interface BlogEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post?: BlogPostDTO | null;
  onSaved: () => void;
}

export function BlogEditorDialog({
  open,
  onOpenChange,
  post,
  onSaved,
}: BlogEditorDialogProps) {
  const isEdit = !!post;

  const handleSaved = () => {
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-card border-border">
        <DialogHeader className="p-5 border-b border-border/60 bg-muted/20 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <IconArticle size={20} />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-foreground">
                {isEdit ? "Edit Blog Article" : "Create New Marketing Article"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {isEdit
                  ? "Update article metadata, content, and publishing status."
                  : "Draft or publish SEO-optimized articles to boost your brand visibility."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {open && (
          <BlogEditorForm
            key={post?.id || "new-article"}
            post={post}
            onCancel={() => onOpenChange(false)}
            onSaved={handleSaved}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
