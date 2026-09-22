export type CustomFieldType =
  | 'text'
  | 'number'
  | 'email'
  | 'date'
  | 'select'
  | 'textarea'
  | 'radio'
  | 'checkbox';

export interface CustomFieldDTO {
  id: string;
  label: string;
  type: CustomFieldType;
  options: string[];
  placeholder: string;
  defaultValue: string;
  isRequired: boolean;
  order: number;
  createdAt: string;
}

export interface CreateCustomFieldInput {
  label: string;
  type: CustomFieldType;
  options?: string[];
  placeholder?: string;
  defaultValue?: string;
  isRequired?: boolean;
}

export interface UpdateCustomFieldInput {
  id: string;
  label?: string;
  type?: CustomFieldType;
  options?: string[];
  placeholder?: string;
  defaultValue?: string;
  isRequired?: boolean;
}

export interface ReorderCustomFieldsInput {
  orderedIds: string[];
}

export interface CustomFieldActionResponse<T = unknown> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}

export interface CustomFieldsValidationResult {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  data?: Record<string, unknown>;
}
