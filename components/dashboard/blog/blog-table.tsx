"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  IconArticle,
  IconClock,
  IconEdit,
  IconExternalLink,
  IconEye,
  IconPlus,
  IconSearch,
  IconTrash,
} from "@tabler/icons-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import { toast } from "sonner";
import { BlogEditorDialog } from "@/components/dashboard/blog/blog-editor-dialog";
import {
  getCompanyBlogPostsAction,
  toggleBlogPostStatusAction,
  deleteBlogPostAction,
} from "@/actions/blog";
import type { BlogPostDTO, BlogStatus, PaginatedBlogPostsResult } from "@/types/blog";

interface BlogTableProps {
  initialData: PaginatedBlogPostsResult;
}

export function BlogTable({ initialData }: BlogTableProps) {
  const [data, setData] = React.useState<PaginatedBlogPostsResult>(initialData);
  const [statusFilter, setStatusFilter] = React.useState<BlogStatus | "all">("all");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [page, setPage] = React.useState<number>(1);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  // Modal states
  const [isEditorOpen, setIsEditorOpen] = React.useState<boolean>(false);
  const [editingPost, setEditingPost] = React.useState<BlogPostDTO | null>(null);
  const [deletingPostId, setDeletingPostId] = React.useState<string | null>(null);
  const [isDeleting, setIsDeleting] = React.useState<boolean>(false);

  const fetchPosts = React.useCallback(
    async (targetPage = page, targetStatus = statusFilter, targetCategory = categoryFilter, targetSearch = searchQuery) => {
      setIsLoading(true);
      try {
        const res = await getCompanyBlogPostsAction({
          page: targetPage,
          limit: 10,
          status: targetStatus === "all" ? undefined : targetStatus,
          category: targetCategory === "all" ? undefined : targetCategory,
          search: targetSearch.trim() || undefined,
        });

        if (res.success && res.data) {
          setData(res.data);
        } else {
          toast.error(res.error || "Failed to fetch articles");
        }
      } catch {
        toast.error("Failed to load blog posts");
      } finally {
        setIsLoading(false);
      }
    },
    [page, statusFilter, categoryFilter, searchQuery]
  );

  const handleStatusChange = (newStatus: BlogStatus | "all") => {
    setStatusFilter(newStatus);
    setPage(1);
    fetchPosts(1, newStatus, categoryFilter, searchQuery);
  };

  const handleCategoryChange = (newCategory: string) => {
    setCategoryFilter(newCategory);
    setPage(1);
    fetchPosts(1, statusFilter, newCategory, searchQuery);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    setPage(1);
    // debounced search
    const timer = setTimeout(() => {
      fetchPosts(1, statusFilter, categoryFilter, query);
    }, 350);
    return () => clearTimeout(timer);
  };

  const handleToggleStatus = async (post: BlogPostDTO) => {
    const updatedStatus: BlogStatus = post.status === "published" ? "draft" : "published";

    // Optimistic update
    setData((prev) => ({
      ...prev,
      posts: prev.posts.map((p) => (p.id === post.id ? { ...p, status: updatedStatus } : p)),
    }));

    try {
      const res = await toggleBlogPostStatusAction(post.id);
      if (res.success) {
        toast.success(`Article is now ${updatedStatus}`);
        fetchPosts();
      } else {
        toast.error(res.error || "Failed to toggle status");
        fetchPosts();
      }
    } catch {
      toast.error("Failed to update status");
      fetchPosts();
    }
  };

  const handleDeletePost = async () => {
    if (!deletingPostId) return;
    setIsDeleting(true);

    try {
      const res = await deleteBlogPostAction(deletingPostId);
      if (res.success) {
        toast.success("Blog article deleted");
        setDeletingPostId(null);
        fetchPosts();
      } else {
        toast.error(res.error || "Failed to delete article");
      }
    } catch {
      toast.error("Failed to delete article");
    } finally {
      setIsDeleting(false);
    }
  };

  const counts = data.counts || { total: 0, published: 0, draft: 0, archived: 0 };

  return (
    <div className="space-y-5">
      {/* Top Action Bar & Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { key: "all", label: "All Posts", count: counts.total },
            { key: "published", label: "Published", count: counts.published },
            { key: "draft", label: "Drafts", count: counts.draft },
            { key: "archived", label: "Archived", count: counts.archived },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleStatusChange(tab.key as BlogStatus | "all")}
              className={
                statusFilter === tab.key
                  ? "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground shadow-2xs transition-colors shrink-0"
                  : "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
              }
            >
              <span>{tab.label}</span>
              <span
                className={
                  statusFilter === tab.key
                    ? "px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-primary-foreground/20 text-primary-foreground"
                    : "px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-background text-muted-foreground border border-border/60"
                }
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Create Article CTA */}
        <Button
          onClick={() => {
            setEditingPost(null);
            setIsEditorOpen(true);
          }}
          size="sm"
          className="font-semibold gap-1.5 shrink-0 shadow-2xs"
        >
          <IconPlus size={16} />
          <span>Write New Article</span>
        </Button>
      </div>

      {/* Search & Category Filter Row */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search articles by title or keyword..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="pl-9 text-xs h-9"
          />
        </div>

        {data.categories.length > 0 && (
          <div className="w-full sm:w-56">
            <Select value={categoryFilter} onValueChange={handleCategoryChange}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">
                  All Categories
                </SelectItem>
                {data.categories.map((cat) => (
                  <SelectItem key={cat} value={cat} className="text-xs">
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Posts Table */}
      <div className="rounded-xl border border-border/70 bg-card shadow-2xs overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="w-[80px]">Cover</TableHead>
              <TableHead className="min-w-[240px]">Article Details</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-center">Views</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Published Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <p className="text-xs">Loading articles...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : data.posts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-56 text-center">
                  <div className="flex flex-col items-center justify-center p-6">
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-muted/80 text-muted-foreground mb-3">
                      <IconArticle size={24} />
                    </div>
                    <p className="text-sm font-semibold text-foreground">No marketing articles found</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                      {searchQuery || statusFilter !== "all" || categoryFilter !== "all"
                        ? "Try adjusting your filters or search keywords."
                        : "Start creating engaging blog articles to improve your organic search ranking and customer reach."}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingPost(null);
                        setIsEditorOpen(true);
                      }}
                      className="mt-3 gap-1.5 text-xs"
                    >
                      <IconPlus size={14} />
                      <span>Write First Article</span>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data.posts.map((post) => (
                <TableRow key={post.id} className="hover:bg-muted/30 transition-colors">
                  {/* Thumbnail Cover */}
                  <TableCell>
                    <div className="relative size-12 rounded-lg overflow-hidden border border-border/60 bg-muted shrink-0">
                      {post.image ? (
                        <Image
                          src={post.image}
                          alt={post.title}
                          fill
                          unoptimized
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center text-muted-foreground">
                          <IconArticle size={18} />
                        </div>
                      )}
                    </div>
                  </TableCell>

                  {/* Title & SEO Slug */}
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-semibold text-xs text-foreground line-clamp-1">
                        {post.title}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-muted-foreground truncate max-w-[200px]">
                          /blog/{post.slug}
                        </span>
                        {post.status === "published" && (
                          <Link
                            href={`/blog/${post.slug}`}
                            target="_blank"
                            className="text-primary hover:text-primary/80 inline-flex items-center gap-0.5 text-[10px] font-medium"
                          >
                            <span>Preview</span>
                            <IconExternalLink size={10} />
                          </Link>
                        )}
                      </div>
                    </div>
                  </TableCell>

                  {/* Category */}
                  <TableCell>
                    <Badge variant="secondary" className="text-[10px] font-medium py-0.5">
                      {post.category || "General"}
                    </Badge>
                  </TableCell>

                  {/* Views */}
                  <TableCell className="text-center">
                    <div className="inline-flex items-center gap-1 rounded-md bg-muted/50 px-2 py-0.5 text-[11px] font-mono font-medium text-foreground">
                      <IconEye size={12} className="text-muted-foreground" />
                      <span>{post.views || 0}</span>
                    </div>
                  </TableCell>

                  {/* Status & Quick Toggle */}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={post.status === "published"}
                        onCheckedChange={() => handleToggleStatus(post)}
                        aria-label="Toggle publication status"
                        className="scale-90"
                      />
                      <Badge
                        variant="outline"
                        className={
                          post.status === "published"
                            ? "text-[10px] capitalize font-semibold border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : post.status === "draft"
                              ? "text-[10px] capitalize font-semibold border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                              : "text-[10px] capitalize font-semibold border-muted-foreground/30 bg-muted text-muted-foreground"
                        }
                      >
                        {post.status}
                      </Badge>
                    </div>
                  </TableCell>

                  {/* Published Date */}
                  <TableCell>
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <IconClock size={12} />
                      <span>
                        {new Date(post.publishedAt || post.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </TableCell>

                  {/* Action Buttons */}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingPost(post);
                          setIsEditorOpen(true);
                        }}
                        className="size-7 text-muted-foreground hover:text-foreground"
                        title="Edit Article"
                      >
                        <IconEdit size={14} />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingPostId(post.id)}
                        className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        title="Delete Article"
                      >
                        <IconTrash size={14} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination Footer */}
        {data.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between p-3 border-t border-border/60 bg-muted/10 text-xs">
            <span className="text-muted-foreground">
              Page {data.pagination.page} of {data.pagination.totalPages} ({data.pagination.total} total)
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const prev = Math.max(1, page - 1);
                  setPage(prev);
                  fetchPosts(prev);
                }}
                disabled={page <= 1 || isLoading}
                className="h-7 text-xs"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const next = Math.min(data.pagination.totalPages, page + 1);
                  setPage(next);
                  fetchPosts(next);
                }}
                disabled={page >= data.pagination.totalPages || isLoading}
                className="h-7 text-xs"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Editor Modal */}
      <BlogEditorDialog
        open={isEditorOpen}
        onOpenChange={setIsEditorOpen}
        post={editingPost}
        onSaved={fetchPosts}
      />

      {/* Delete Confirmation Alert */}
      <Dialog open={!!deletingPostId} onOpenChange={(open) => !open && setDeletingPostId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-destructive flex items-center gap-2">
              <IconTrash size={18} />
              Delete Blog Article
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to permanently delete this article? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeletingPostId(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeletePost}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete Permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
