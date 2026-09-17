export interface CustomStatusDTO {
  id: string;
  title: string;
  statusColor: string;
  icon: string;
  order: number;
  createdAt: string;
}

export interface CreateCustomStatusInput {
  title: string;
  statusColor?: string;
  icon?: string;
}

export interface UpdateCustomStatusInput {
  id: string;
  title?: string;
  statusColor?: string;
  icon?: string;
}

export interface ReorderCustomStatusInput {
  orderedIds: string[];
}

export interface CustomStatusActionResponse<T = unknown> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}
