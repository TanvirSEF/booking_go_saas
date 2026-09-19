import { Metadata } from "next";
import { getCompanyBlogPostsAction } from "@/actions/blog";
import { BlogTable } from "@/components/dashboard/blog/blog-table";
import type { PaginatedBlogPostsResult } from "@/types/blog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Blog & Marketing Articles | Dashboard",
  description: "Create and manage SEO-optimized marketing articles, categories, and public storefront content.",
};

const defaultData: PaginatedBlogPostsResult = {
  posts: [],
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  },
  categories: [],
  counts: {
    total: 0,
    published: 0,
    draft: 0,
    archived: 0,
  },
};

export default async function DashboardBlogPage() {
  const res = await getCompanyBlogPostsAction({ page: 1, limit: 10 });
  const initialData: PaginatedBlogPostsResult = res.data || defaultData;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Marketing & Blog Articles
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Publish SEO-rich content to drive organic customer traffic and educate your audience.
        </p>
      </div>

      <BlogTable initialData={initialData} />
    </div>
  );
}
