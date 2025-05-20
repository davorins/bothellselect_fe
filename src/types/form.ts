// types/form.ts

export interface PaymentConfig {
  amount: number;
  description: string;
  currency?: 'USD' | 'CAD' | 'EUR' | 'GBP';
}

export type FieldType =
  | 'text'
  | 'number'
  | 'email'
  | 'select'
  | 'checkbox'
  | 'radio'
  | 'payment'
  | 'section';

export interface BaseFormField {
  id: string;
  label: string;
  required: boolean;
  placeholder?: string;
  options?: { label: string; value: string }[];
  defaultValue?: string | boolean;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
  };
  conditional?: {
    fieldId: string;
    value: string | boolean;
  };
}

export interface TextFormField extends BaseFormField {
  type: 'text' | 'email' | 'number';
}

export interface SelectFormField extends BaseFormField {
  type: 'select' | 'radio';
}

export interface CheckboxFormField extends BaseFormField {
  type: 'checkbox';
}

export interface PaymentFormField extends BaseFormField {
  type: 'payment';
  paymentConfig: PaymentConfig;
}

export interface SectionFormField extends BaseFormField {
  type: 'section';
}

export type FormField =
  | TextFormField
  | SelectFormField
  | CheckboxFormField
  | PaymentFormField
  | SectionFormField;

export interface Form {
  _id: string;
  title: string;
  description: string;
  fields: FormField[];
  status: boolean;
  tags: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiResponses<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: Record<string, string>;
}
