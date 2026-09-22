import { Metadata } from "next";
import { IconArticle } from "@tabler/icons-react";
import { getCompanyBlogPostsAction } from "@/actions/blog";
import { BlogTable } from "@/components/dashboard/blog/blog-table";
import { PageHeader } from "@/components/dashboard/page-header";
import type { PaginatedBlogPostsResult } from "@/types/blog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Blog & Marketing Articles | Dashboard",
  description: "Create and manage SEO-optimized marketing articles, categories, and public storefront content.",
};

const defaultData: PaginatedBlogPostsResult = {
  posts: [],
  pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
  categories: [],
  counts: { total: 0, published: 0, draft: 0, archived: 0 },
};

export default async function DashboardBlogPage() {
  const res = await getCompanyBlogPostsAction({ page: 1, limit: 10 });
  const initialData: PaginatedBlogPostsResult = res.data || defaultData;

  return (
    <div className="min-h-screen pb-16">
      <PageHeader
        title="Marketing & Blog Articles"
        description="Publish SEO-rich content to drive organic customer traffic and educate your audience."
        icon={<IconArticle size={22} />}
        breadcrumbs={[{ label: "Blog Articles" }]}
      />

      <main className="w-full mx-auto px-4 sm:px-6 pt-8">
        <BlogTable initialData={initialData} />
      </main>
    </div>
  );
}
