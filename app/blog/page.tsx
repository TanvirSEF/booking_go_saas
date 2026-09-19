import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  IconArrowRight,
  IconArticle,
  IconCalendar,
  IconClock,
  IconEye,
  IconSparkles,
  IconTrendingUp,
} from "@tabler/icons-react";
import { getPublicBlogPostsAction, getPublicBlogCategoriesAction } from "@/actions/blog";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Blog & Insights | Expert Tips & Industry News",
  description: "Explore our latest articles, expert guides, beauty advice, and company news.",
};

interface PublicBlogPageProps {
  searchParams?: Promise<{
    category?: string;
    search?: string;
    page?: string;
    business?: string;
  }>;
}

function estimateReadingTime(text: string): string {
  const wordCount = text.trim().split(/\s+/).length;
  const minutes = Math.max(1, Math.ceil(wordCount / 200));
  return `${minutes} min read`;
}

export default async function PublicBlogPage({ searchParams }: PublicBlogPageProps) {
  const resolvedParams = searchParams ? await searchParams : {};
  const currentCategory = resolvedParams.category || "all";
  const businessSlug = resolvedParams.business || "";
  const currentPage = Math.max(1, Number(resolvedParams.page) || 1);

  const [postsRes, categoriesRes] = await Promise.all([
    getPublicBlogPostsAction(businessSlug, {
      page: currentPage,
      limit: 12,
      category: currentCategory === "all" ? undefined : currentCategory,
      search: resolvedParams.search,
    }),
    getPublicBlogCategoriesAction(businessSlug),
  ]);

  const posts = postsRes.data?.posts || [];
  const categories = categoriesRes.data || [];
  const total = postsRes.data?.pagination.total || 0;

  // Featured first post if on page 1
  const featuredPost = currentPage === 1 && posts.length > 0 ? posts[0] : null;
  const gridPosts = currentPage === 1 && posts.length > 0 ? posts.slice(1) : posts;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header Banner */}
      <header className="border-b border-border/50 bg-muted/20 py-12 sm:py-16 px-4">
        <div className="max-w-6xl mx-auto text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <IconSparkles size={14} />
            <span>Discover Knowledge & Insights</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-foreground">
            Blog & Marketing Stories
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
            Stay informed with our latest news, insider beauty tips, service guides, and expert recommendations.
          </p>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto w-full px-4 py-8 sm:py-12 flex-1 space-y-10">
        {/* Category Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <Link
            href="/blog"
            className={
              currentCategory === "all"
                ? "px-3.5 py-1.5 rounded-full text-xs font-semibold bg-primary text-primary-foreground shadow-2xs transition-all shrink-0"
                : "px-3.5 py-1.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all shrink-0"
            }
          >
            All Topics
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat}
              href={`/blog?category=${encodeURIComponent(cat)}`}
              className={
                currentCategory === cat
                  ? "px-3.5 py-1.5 rounded-full text-xs font-semibold bg-primary text-primary-foreground shadow-2xs transition-all shrink-0"
                  : "px-3.5 py-1.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all shrink-0"
              }
            >
              {cat}
            </Link>
          ))}
        </div>

        {posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-border/60 bg-card">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground mb-3">
              <IconArticle size={28} />
            </div>
            <h2 className="text-lg font-bold text-foreground">No articles published yet</h2>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              Check back soon for exciting tips, guides, and marketing updates!
            </p>
          </div>
        ) : (
          <>
            {/* Featured Article Card */}
            {featuredPost && (
              <div className="group relative rounded-2xl border border-border/70 bg-card shadow-xs overflow-hidden transition-all hover:shadow-md hover:border-primary/40">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-0">
                  <div className="relative md:col-span-7 h-64 sm:h-80 md:h-auto bg-muted overflow-hidden">
                    {featuredPost.image ? (
                      <Image
                        src={featuredPost.image}
                        alt={featuredPost.title}
                        fill
                        unoptimized
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center text-muted-foreground">
                        <IconArticle size={48} />
                      </div>
                    )}
                    <div className="absolute top-3 left-3">
                      <Badge className="bg-primary text-primary-foreground font-bold shadow-xs">
                        Featured Story
                      </Badge>
                    </div>
                  </div>

                  <div className="md:col-span-5 p-6 sm:p-8 flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs font-semibold">
                          {featuredPost.category}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
                          <IconClock size={13} />
                          {estimateReadingTime(featuredPost.content)}
                        </span>
                      </div>

                      <h2 className="text-xl sm:text-2xl font-bold text-foreground group-hover:text-primary transition-colors leading-snug">
                        <Link href={`/blog/${featuredPost.slug}`}>
                          {featuredPost.title}
                        </Link>
                      </h2>

                      {featuredPost.summary && (
                        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                          {featuredPost.summary}
                        </p>
                      )}
                    </div>

                    <div className="pt-4 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <IconCalendar size={14} />
                        <span>
                          {new Date(featuredPost.publishedAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>

                      <Link
                        href={`/blog/${featuredPost.slug}`}
                        className="inline-flex items-center gap-1 font-semibold text-primary group-hover:translate-x-1 transition-transform"
                      >
                        <span>Read Article</span>
                        <IconArrowRight size={14} />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Remaining Articles Grid */}
            {gridPosts.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <IconTrendingUp size={16} className="text-primary" />
                  <span>Recent Articles ({total})</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {gridPosts.map((post) => (
                    <article
                      key={post.id}
                      className="group flex flex-col rounded-xl border border-border/60 bg-card shadow-2xs overflow-hidden transition-all hover:shadow-md hover:border-primary/30"
                    >
                      {/* Image */}
                      <Link href={`/blog/${post.slug}`} className="relative h-48 w-full bg-muted overflow-hidden">
                        {post.image ? (
                          <Image
                            src={post.image}
                            alt={post.title}
                            fill
                            unoptimized
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex size-full items-center justify-center text-muted-foreground">
                            <IconArticle size={32} />
                          </div>
                        )}
                        <div className="absolute top-2.5 left-2.5">
                          <Badge variant="secondary" className="bg-background/90 backdrop-blur-xs text-[10px] font-bold">
                            {post.category}
                          </Badge>
                        </div>
                      </Link>

                      {/* Content */}
                      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                            <span className="flex items-center gap-1 font-medium">
                              <IconCalendar size={12} />
                              {new Date(post.publishedAt).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                            <span className="flex items-center gap-1 font-mono">
                              <IconEye size={12} />
                              {post.views || 0}
                            </span>
                          </div>

                          <h3 className="font-bold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                            <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                          </h3>

                          {post.summary && (
                            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                              {post.summary}
                            </p>
                          )}
                        </div>

                        <div className="pt-3 border-t border-border/40 flex items-center justify-between text-xs">
                          <span className="text-[11px] text-muted-foreground">
                            {estimateReadingTime(post.content)}
                          </span>
                          <Link
                            href={`/blog/${post.slug}`}
                            className="inline-flex items-center gap-1 font-semibold text-primary group-hover:translate-x-0.5 transition-transform"
                          >
                            <span>Read</span>
                            <IconArrowRight size={13} />
                          </Link>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
