export interface TestimonialDTO {
  id: string;
  name: string;
  title: string;
  rating: number;
  description: string;
  image: string;
  isActive: boolean;
  order: number;
  createdAt: string;
}

export interface CreateTestimonialInput {
  name: string;
  title?: string;
  rating: number;
  description: string;
  image?: string;
  isActive?: boolean;
}

export interface UpdateTestimonialInput {
  id: string;
  name?: string;
  title?: string;
  rating?: number;
  description?: string;
  image?: string;
  isActive?: boolean;
}

export interface ReorderTestimonialsInput {
  orderedIds: string[];
}

export interface TestimonialActionResponse<T = unknown> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}
