export type BlogStatus = 'draft' | 'published' | 'archived';

export interface BlogAuthorDTO {
  id: string;
  name: string;
  avatar?: string;
}

export interface BlogPostDTO {
  id: string;
  title: string;
  slug: string;
  summary: string;
  content: string;
  image: string;
  category: string;
  tags: string[];
  status: BlogStatus;
  publishedAt: string;
  theme: string;
  views: number;
  author?: BlogAuthorDTO;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBlogPostInput {
  title: string;
  slug?: string;
  summary?: string;
  content: string;
  image?: string;
  category?: string;
  tags?: string[];
  status?: BlogStatus;
  publishedAt?: string;
  theme?: string;
}

export interface UpdateBlogPostInput {
  id: string;
  title?: string;
  slug?: string;
  summary?: string;
  content?: string;
  image?: string;
  category?: string;
  tags?: string[];
  status?: BlogStatus;
  publishedAt?: string;
  theme?: string;
}

export interface BlogFilterParams {
  page?: number;
  limit?: number;
  status?: BlogStatus | 'all';
  category?: string;
  search?: string;
}

export interface BlogCounts {
  total: number;
  published: number;
  draft: number;
  archived: number;
}

export interface PaginatedBlogPostsResult {
  posts: BlogPostDTO[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  categories: string[];
  counts: BlogCounts;
}

export interface BlogActionResponse<T = unknown> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}
