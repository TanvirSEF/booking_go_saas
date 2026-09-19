import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  IconArrowLeft,
  IconArticle,
  IconCalendar,
  IconClock,
  IconEye,
  IconUser,
} from "@tabler/icons-react";
import { getPublicBlogPostBySlugAction } from "@/actions/blog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

interface PublicBlogSlugPageProps {
  params: Promise<{
    slug: string;
  }>;
  searchParams?: Promise<{
    business?: string;
  }>;
}

export async function generateMetadata({
  params,
  searchParams,
}: PublicBlogSlugPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const businessSlug = resolvedSearchParams.business || "";

  const res = await getPublicBlogPostBySlugAction(businessSlug, resolvedParams.slug);

  if (!res.success || !res.data) {
    return {
      title: "Article Not Found | Blog",
      description: "The requested blog article could not be found.",
    };
  }

  const post = res.data;
  return {
    title: `${post.title} | Blog`,
    description: post.summary || post.title,
    openGraph: {
      title: post.title,
      description: post.summary || post.title,
      images: post.image ? [post.image] : [],
      type: "article",
      publishedTime: post.publishedAt,
    },
  };
}

function estimateReadingTime(text: string): string {
  const wordCount = text.trim().split(/\s+/).length;
  const minutes = Math.max(1, Math.ceil(wordCount / 200));
  return `${minutes} min read`;
}

export default async function PublicBlogSlugPage({
  params,
  searchParams,
}: PublicBlogSlugPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const businessSlug = resolvedSearchParams.business || "";

  const res = await getPublicBlogPostBySlugAction(businessSlug, resolvedParams.slug);

  if (!res.success || !res.data) {
    notFound();
  }

  const post = res.data;

  return (
    <article className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Navigation Bar */}
      <nav className="border-b border-border/50 bg-muted/20 py-3.5 px-4 sticky top-0 z-20 backdrop-blur-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Button asChild variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <Link href="/blog">
              <IconArrowLeft size={15} />
              <span>Back to all articles</span>
            </Link>
          </Button>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs font-semibold">
              {post.category}
            </Badge>
          </div>
        </div>
      </nav>

      {/* Article Header Container */}
      <header className="max-w-4xl mx-auto w-full px-4 pt-8 sm:pt-12 pb-6 space-y-6">
        {/* Category & Stats */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground font-medium">
          <Badge className="bg-primary/10 text-primary border-primary/20 font-bold hover:bg-primary/20">
            {post.category}
          </Badge>

          <span className="flex items-center gap-1">
            <IconCalendar size={14} />
            {new Date(post.publishedAt).toLocaleDateString(undefined, {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </span>

          <span>•</span>

          <span className="flex items-center gap-1">
            <IconClock size={14} />
            {estimateReadingTime(post.content)}
          </span>

          <span>•</span>

          <span className="flex items-center gap-1 font-mono">
            <IconEye size={14} className="text-primary" />
            {post.views} views
          </span>
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
          {post.title}
        </h1>

        {/* Excerpt / Subtitle */}
        {post.summary && (
          <p className="text-base sm:text-lg text-muted-foreground font-normal leading-relaxed border-l-2 border-primary/60 pl-4 py-0.5">
            {post.summary}
          </p>
        )}

        {/* Author Info */}
        <div className="flex items-center gap-3 pt-2">
          <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
            <IconUser size={20} />
          </div>
          <div>
            <p className="text-xs font-bold text-foreground">
              {post.author?.name || "Editorial Team"}
            </p>
            <p className="text-[11px] text-muted-foreground">Author & Contributor</p>
          </div>
        </div>
      </header>

      {/* Hero Image */}
      {post.image && (
        <div className="max-w-4xl mx-auto w-full px-4 mb-8">
          <div className="relative w-full h-64 sm:h-96 rounded-2xl overflow-hidden border border-border/60 bg-muted shadow-sm">
            <Image
              src={post.image}
              alt={post.title}
              fill
              unoptimized
              priority
              className="object-cover"
            />
          </div>
        </div>
      )}

      {/* Article Body */}
      <main className="max-w-4xl mx-auto w-full px-4 flex-1 pb-16">
        <div className="prose prose-base dark:prose-invert max-w-none text-foreground/90 leading-relaxed space-y-4 whitespace-pre-wrap font-sans">
          {post.content}
        </div>

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="pt-8 mt-12 border-t border-border/60 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Related Topics
            </p>
            <div className="flex flex-wrap gap-1.5">
              {post.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs py-1 px-2.5 font-medium">
                  #{tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Footer Navigation & CTA */}
        <div className="mt-12 p-6 rounded-2xl border border-border/60 bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-sm text-foreground">Enjoyed this article?</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Explore more articles or book an appointment online with us.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="outline" className="text-xs">
              <Link href="/blog">
                <IconArticle size={14} className="mr-1.5" />
                Browse Articles
              </Link>
            </Button>
            <Button asChild size="sm" className="text-xs font-semibold">
              <Link href="/appointments">
                Book Appointment
              </Link>
            </Button>
          </div>
        </div>
      </main>
    </article>
  );
}
