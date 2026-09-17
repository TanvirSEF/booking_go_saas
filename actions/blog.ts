'use server';

import { Types } from 'mongoose';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/auth';
import { connectToDatabase } from '@/lib/db';
import { Blog, type BlogStatus } from '@/models/Blog';
import { Business } from '@/models/Business';
import { User } from '@/models/User';
import type {
  BlogPostDTO,
  CreateBlogPostInput,
  UpdateBlogPostInput,
  BlogFilterParams,
  PaginatedBlogPostsResult,
  BlogActionResponse,
} from '@/types/blog';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function generateUniqueSlug(
  businessId: Types.ObjectId,
  baseText: string,
  currentPostId?: Types.ObjectId
): Promise<string> {
  const baseSlug = slugify(baseText) || 'article';
  let candidateSlug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await Blog.findOne({
      businessId,
      slug: candidateSlug,
      ...(currentPostId ? { _id: { $ne: currentPostId } } : {}),
    })
      .select('_id')
      .lean();

    if (!existing) {
      return candidateSlug;
    }

    candidateSlug = `${baseSlug}-${counter}`;
    counter++;
  }
}

const createBlogPostSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200).trim(),
  slug: z.string().trim().optional(),
  summary: z.string().max(350).trim().optional().default(''),
  content: z.string().min(10, 'Content must be at least 10 characters').trim(),
  image: z.string().trim().optional().default(''),
  category: z.string().trim().optional().default('General'),
  tags: z.array(z.string().trim()).optional().default([]),
  status: z.enum(['draft', 'published', 'archived'] as const).optional().default('published'),
  publishedAt: z.string().optional(),
  theme: z.string().trim().optional().default('default'),
});

const updateBlogPostSchema = z.object({
  id: z.string().min(1, 'Post ID is required'),
  title: z.string().min(3, 'Title must be at least 3 characters').max(200).trim().optional(),
  slug: z.string().trim().optional(),
  summary: z.string().max(350).trim().optional(),
  content: z.string().min(10, 'Content must be at least 10 characters').trim().optional(),
  image: z.string().trim().optional(),
  category: z.string().trim().optional(),
  tags: z.array(z.string().trim()).optional(),
  status: z.enum(['draft', 'published', 'archived'] as const).optional(),
  publishedAt: z.string().optional(),
  theme: z.string().trim().optional(),
});

async function resolveTenantContext() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized. Please log in.');
  }

  await connectToDatabase();

  const user = await User.findById(session.user.id).lean();
  if (!user) {
    throw new Error('User account not found.');
  }

  const companyId =
    user.role === 'company'
      ? user._id
      : user.companyId
        ? new Types.ObjectId(user.companyId)
        : null;

  if (!companyId) {
    throw new Error('Company context could not be determined.');
  }

  let activeBusinessId = user.activeBusinessId;
  if (!activeBusinessId) {
    const defaultBusiness = await Business.findOne({ companyId }).lean();
    if (defaultBusiness) {
      activeBusinessId = defaultBusiness._id;
      await User.findByIdAndUpdate(user._id, { activeBusinessId: defaultBusiness._id });
    }
  }

  if (!activeBusinessId) {
    throw new Error('No active business found for this organization.');
  }

  return {
    userId: user._id,
    companyId,
    businessId: activeBusinessId,
  };
}

/**
 * Public action: Retrieve published blog posts for a business storefront.
 */
export async function getPublicBlogPostsAction(
  businessSlug: string,
  params: BlogFilterParams = {}
): Promise<BlogActionResponse<PaginatedBlogPostsResult>> {
  try {
    await connectToDatabase();

    const business = await Business.findOne({
      slug: businessSlug,
      isActive: { $ne: false },
    }).lean();

    if (!business) {
      return { success: false, error: 'Storefront business not found.' };
    }

    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(params.limit) || 12));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {
      businessId: business._id,
      status: 'published',
    };

    if (params.category && params.category !== 'all') {
      query.category = params.category;
    }

    if (params.search && params.search.trim()) {
      const sanitized = params.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(sanitized, 'i');
      query.$or = [{ title: searchRegex }, { summary: searchRegex }];
    }

    const [items, totalFiltered, distinctCategories] = await Promise.all([
      Blog.find(query)
        .sort({ publishedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate<{ authorId: { _id: Types.ObjectId; name: string; avatar?: string } }>('authorId', 'name avatar')
        .lean(),
      Blog.countDocuments(query),
      Blog.distinct('category', { businessId: business._id, status: 'published' }),
    ]);

    const posts: BlogPostDTO[] = items.map((doc) => {
      const author = doc.authorId as { _id?: Types.ObjectId; name?: string; avatar?: string } | null;
      return {
        id: String(doc._id),
        title: doc.title,
        slug: doc.slug,
        summary: doc.summary || '',
        content: doc.content,
        image: doc.image || '',
        category: doc.category || 'General',
        tags: doc.tags || [],
        status: doc.status,
        publishedAt: doc.publishedAt ? doc.publishedAt.toISOString() : doc.createdAt.toISOString(),
        theme: doc.theme || 'default',
        views: doc.views || 0,
        author: author?._id
          ? { id: String(author._id), name: author.name || 'Author', avatar: author.avatar }
          : undefined,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
      };
    });

    return {
      success: true,
      data: {
        posts,
        pagination: {
          page,
          limit,
          total: totalFiltered,
          totalPages: Math.ceil(totalFiltered / limit) || 1,
        },
        categories: (distinctCategories as string[]).filter(Boolean),
        counts: {
          total: totalFiltered,
          published: totalFiltered,
          draft: 0,
          archived: 0,
        },
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve blog posts.';
    return { success: false, error: message };
  }
}

/**
 * Public action: Retrieve single blog post by SEO slug and auto-increment views.
 */
export async function getPublicBlogPostBySlugAction(
  businessSlug: string,
  postSlug: string
): Promise<BlogActionResponse<BlogPostDTO>> {
  try {
    await connectToDatabase();

    const business = await Business.findOne({
      slug: businessSlug,
      isActive: { $ne: false },
    }).lean();

    if (!business) {
      return { success: false, error: 'Storefront business not found.' };
    }

    const post = await Blog.findOne({
      businessId: business._id,
      slug: postSlug.toLowerCase().trim(),
      status: 'published',
    })
      .populate<{ authorId: { _id: Types.ObjectId; name: string; avatar?: string } }>('authorId', 'name avatar')
      .lean();

    if (!post) {
      return { success: false, error: 'Blog post not found.' };
    }

    // Auto-increment views non-blockingly
    Blog.updateOne({ _id: post._id }, { $inc: { views: 1 } }).catch(() => {});

    const author = post.authorId as { _id?: Types.ObjectId; name?: string; avatar?: string } | null;

    return {
      success: true,
      data: {
        id: String(post._id),
        title: post.title,
        slug: post.slug,
        summary: post.summary || '',
        content: post.content,
        image: post.image || '',
        category: post.category || 'General',
        tags: post.tags || [],
        status: post.status,
        publishedAt: post.publishedAt ? post.publishedAt.toISOString() : post.createdAt.toISOString(),
        theme: post.theme || 'default',
        views: (post.views || 0) + 1,
        author: author?._id
          ? { id: String(author._id), name: author.name || 'Author', avatar: author.avatar }
          : undefined,
        createdAt: post.createdAt.toISOString(),
        updatedAt: post.updatedAt.toISOString(),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve blog post.';
    return { success: false, error: message };
  }
}

/**
 * Public action: Fetch distinct categories for published blog posts.
 */
export async function getPublicBlogCategoriesAction(
  businessSlug: string
): Promise<BlogActionResponse<string[]>> {
  try {
    await connectToDatabase();

    const business = await Business.findOne({
      slug: businessSlug,
      isActive: { $ne: false },
    }).lean();

    if (!business) {
      return { success: false, error: 'Storefront business not found.' };
    }

    const categories = await Blog.distinct('category', {
      businessId: business._id,
      status: 'published',
    });

    return {
      success: true,
      data: (categories as string[]).filter(Boolean),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve categories.';
    return { success: false, error: message };
  }
}

/**
 * Tenant action: Query all blog posts for the active business (admin dashboard).
 */
export async function getCompanyBlogPostsAction(
  params: BlogFilterParams = {}
): Promise<BlogActionResponse<PaginatedBlogPostsResult>> {
  try {
    const { businessId } = await resolveTenantContext();

    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
    const skip = (page - 1) * limit;

    const bId = new Types.ObjectId(businessId);
    const query: Record<string, unknown> = { businessId: bId };

    if (params.status && params.status !== 'all') {
      query.status = params.status;
    }

    if (params.category && params.category !== 'all') {
      query.category = params.category;
    }

    if (params.search && params.search.trim()) {
      const sanitized = params.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(sanitized, 'i');
      query.$or = [{ title: searchRegex }, { summary: searchRegex }];
    }

    const [items, totalFiltered, countAggregation, distinctCategories] = await Promise.all([
      Blog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate<{ authorId: { _id: Types.ObjectId; name: string; avatar?: string } }>('authorId', 'name avatar')
        .lean(),
      Blog.countDocuments(query),
      Blog.aggregate([
        { $match: { businessId: bId } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Blog.distinct('category', { businessId: bId }),
    ]);

    const counts = {
      total: 0,
      published: 0,
      draft: 0,
      archived: 0,
    };

    countAggregation.forEach((entry: { _id: string; count: number }) => {
      counts.total += entry.count;
      if (entry._id === 'published') counts.published = entry.count;
      else if (entry._id === 'draft') counts.draft = entry.count;
      else if (entry._id === 'archived') counts.archived = entry.count;
    });

    const posts: BlogPostDTO[] = items.map((doc) => {
      const author = doc.authorId as { _id?: Types.ObjectId; name?: string; avatar?: string } | null;
      return {
        id: String(doc._id),
        title: doc.title,
        slug: doc.slug,
        summary: doc.summary || '',
        content: doc.content,
        image: doc.image || '',
        category: doc.category || 'General',
        tags: doc.tags || [],
        status: doc.status,
        publishedAt: doc.publishedAt ? doc.publishedAt.toISOString() : doc.createdAt.toISOString(),
        theme: doc.theme || 'default',
        views: doc.views || 0,
        author: author?._id
          ? { id: String(author._id), name: author.name || 'Author', avatar: author.avatar }
          : undefined,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
      };
    });

    return {
      success: true,
      data: {
        posts,
        pagination: {
          page,
          limit,
          total: totalFiltered,
          totalPages: Math.ceil(totalFiltered / limit) || 1,
        },
        categories: (distinctCategories as string[]).filter(Boolean),
        counts,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve blog posts.';
    return { success: false, error: message };
  }
}

/**
 * Tenant action: Create a new blog post with automatic collision-safe slug generation.
 */
export async function createBlogPostAction(
  rawInput: CreateBlogPostInput
): Promise<BlogActionResponse<BlogPostDTO>> {
  try {
    const { userId, companyId, businessId } = await resolveTenantContext();
    const input = createBlogPostSchema.parse(rawInput);

    const bId = new Types.ObjectId(businessId);
    const slug = await generateUniqueSlug(bId, input.slug || input.title);

    const post = await Blog.create({
      companyId,
      businessId: bId,
      authorId: userId,
      title: input.title,
      slug,
      summary: input.summary || '',
      content: input.content,
      image: input.image || '',
      category: input.category || 'General',
      tags: input.tags || [],
      status: input.status || 'published',
      publishedAt: input.publishedAt ? new Date(input.publishedAt) : new Date(),
      theme: input.theme || 'default',
      views: 0,
    });

    revalidatePath('/blog');
    revalidatePath('/dashboard/blog');

    return {
      success: true,
      message: 'Blog post created successfully.',
      data: {
        id: String(post._id),
        title: post.title,
        slug: post.slug,
        summary: post.summary || '',
        content: post.content,
        image: post.image || '',
        category: post.category || 'General',
        tags: post.tags || [],
        status: post.status,
        publishedAt: post.publishedAt.toISOString(),
        theme: post.theme || 'default',
        views: 0,
        createdAt: post.createdAt.toISOString(),
        updatedAt: post.updatedAt.toISOString(),
      },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0]?.message || 'Validation error.' };
    }
    const message = error instanceof Error ? error.message : 'Failed to create blog post.';
    return { success: false, error: message };
  }
}

/**
 * Tenant action: Update an existing blog post.
 */
export async function updateBlogPostAction(
  rawInput: UpdateBlogPostInput
): Promise<BlogActionResponse<BlogPostDTO>> {
  try {
    const { businessId } = await resolveTenantContext();
    const input = updateBlogPostSchema.parse(rawInput);

    if (!Types.ObjectId.isValid(input.id)) {
      return { success: false, error: 'Invalid blog post ID format.' };
    }

    const bId = new Types.ObjectId(businessId);
    const post = await Blog.findOne({
      _id: new Types.ObjectId(input.id),
      businessId: bId,
    });

    if (!post) {
      return { success: false, error: 'Blog post not found.' };
    }

    if (input.title !== undefined) post.title = input.title;
    if (input.summary !== undefined) post.summary = input.summary;
    if (input.content !== undefined) post.content = input.content;
    if (input.image !== undefined) post.image = input.image;
    if (input.category !== undefined) post.category = input.category;
    if (input.tags !== undefined) post.tags = input.tags;
    if (input.status !== undefined) post.status = input.status;
    if (input.publishedAt !== undefined) post.publishedAt = new Date(input.publishedAt);
    if (input.theme !== undefined) post.theme = input.theme;

    // Handle slug update if explicitly requested or if title changed and slug wasn't customized
    if (input.slug !== undefined && input.slug.trim() !== '') {
      post.slug = await generateUniqueSlug(bId, input.slug, post._id as Types.ObjectId);
    }

    await post.save();

    revalidatePath('/blog');
    revalidatePath('/dashboard/blog');

    return {
      success: true,
      message: 'Blog post updated successfully.',
      data: {
        id: String(post._id),
        title: post.title,
        slug: post.slug,
        summary: post.summary || '',
        content: post.content,
        image: post.image || '',
        category: post.category || 'General',
        tags: post.tags || [],
        status: post.status,
        publishedAt: post.publishedAt.toISOString(),
        theme: post.theme || 'default',
        views: post.views || 0,
        createdAt: post.createdAt.toISOString(),
        updatedAt: post.updatedAt.toISOString(),
      },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0]?.message || 'Validation error.' };
    }
    const message = error instanceof Error ? error.message : 'Failed to update blog post.';
    return { success: false, error: message };
  }
}

/**
 * Tenant action: Toggle post published / draft status.
 */
export async function toggleBlogPostStatusAction(
  id: string
): Promise<BlogActionResponse<{ status: BlogStatus }>> {
  try {
    const { businessId } = await resolveTenantContext();

    if (!Types.ObjectId.isValid(id)) {
      return { success: false, error: 'Invalid blog post ID format.' };
    }

    const post = await Blog.findOne({
      _id: new Types.ObjectId(id),
      businessId: new Types.ObjectId(businessId),
    });

    if (!post) {
      return { success: false, error: 'Blog post not found.' };
    }

    post.status = post.status === 'published' ? 'draft' : 'published';
    await post.save();

    revalidatePath('/blog');
    revalidatePath('/dashboard/blog');

    return {
      success: true,
      message: `Blog post is now ${post.status}.`,
      data: { status: post.status },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to toggle status.';
    return { success: false, error: message };
  }
}

/**
 * Tenant action: Delete an individual blog post.
 */
export async function deleteBlogPostAction(
  id: string
): Promise<BlogActionResponse> {
  try {
    const { businessId } = await resolveTenantContext();

    if (!Types.ObjectId.isValid(id)) {
      return { success: false, error: 'Invalid blog post ID format.' };
    }

    const result = await Blog.deleteOne({
      _id: new Types.ObjectId(id),
      businessId: new Types.ObjectId(businessId),
    });

    if (result.deletedCount === 0) {
      return { success: false, error: 'Blog post not found or already removed.' };
    }

    revalidatePath('/blog');
    revalidatePath('/dashboard/blog');

    return {
      success: true,
      message: 'Blog post deleted successfully.',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete blog post.';
    return { success: false, error: message };
  }
}
