// form.ts Update to include all missing exports
export interface FormField {
  id: string;
  type:
    | 'text'
    | 'email'
    | 'number'
    | 'tel'
    | 'url'
    | 'password'
    | 'textarea'
    | 'select'
    | 'checkbox'
    | 'radio'
    | 'date'
    | 'file'
    | 'payment'
    | 'section'
    | 'heading'
    | 'divider';
  label: string;
  name: string;
  required: boolean;
  order: number;
  placeholder?: string;
  helpText?: string;
  defaultValue?: any;
  options?: FormFieldOption[];
  fileConfig?: FileConfig;
  paymentConfig?: PaymentConfig;
  style?: FieldStyle;
  validation?: ValidationRules;
  conditionalLogic?: {
    dependsOn: string;
    condition: 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan';
    value: any;
    show: boolean;
  };
}

export interface FormFieldOption {
  label: string;
  value: string;
  selected?: boolean;
}

export interface FileConfig {
  accept?: string;
  maxSize?: number;
  multiple?: boolean;
}

export interface PaymentConfig {
  amount: number;
  description?: string;
  currency?: string;
  recurring?: boolean;
  recurringInterval?: 'monthly' | 'yearly' | 'weekly';
}

export interface FieldStyle {
  rows?: number;
  width?: string;
  className?: string;
}

export interface ValidationRules {
  pattern?: string;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  customMessage?: string;
}

export interface SubmitButtonStyle {
  color: string;
  backgroundColor: string;
  textColor: string;
}

export interface FormSettings {
  submitText: string;
  resetText: string;
  successMessage: string;
  redirectUrl: string;
  sendEmail: boolean;
  emailTo: string[];
  storeSubmissions: boolean;
  captcha: boolean;
  allowedRoles?: string[];
  passwordProtected?: boolean;
  formPassword?: string;
  submitButtonStyle: SubmitButtonStyle;
}

export interface Form {
  _id?: string;
  name: string;
  title: string;
  description: string;
  status: 'draft' | 'published' | 'archived';
  fields: FormField[];
  settings: FormSettings;
  submissions?: number;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  tags?: string[];
}

// Aliases for compatibility
export type FormData = Form;
export type PaymentFormField = FormField & { type: 'payment' };
export type SectionFormField = FormField & { type: 'section' };
export type FieldType = FormField['type'];

// Add ApiResponses if missing
export interface ApiResponses {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}
