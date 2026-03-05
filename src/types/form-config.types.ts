// src/types/form-config.types.ts
export type FieldType =
  | 'text'
  | 'number'
  | 'date'
  | 'select'
  | 'checkbox'
  | 'radio'
  | 'textarea'
  | 'email'
  | 'tel';
export type SectionType =
  | 'personal'
  | 'contact'
  | 'player'
  | 'medical'
  | 'emergency';
export type AppliesToType = 'parent' | 'player' | 'guardian';
export type DependencyOperator =
  | 'equals'
  | 'notEquals'
  | 'exists'
  | 'notExists'
  | 'true'
  | 'false';
export type CalculationType = 'fromDOB' | 'formula' | 'static';

export interface FieldOption {
  value: string;
  label: string;
  default?: boolean;
}

export interface FieldDependency {
  field: string;
  operator: DependencyOperator;
  value?: any;
}

export interface FieldValidation {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  min?: number;
  max?: number;
  customMessage?: string;
}

export interface FieldCalculation {
  type: CalculationType;
  formula?: string;
  dependsOn?: string[];
}

export interface FormFieldConfig {
  _id: string;
  fieldName: string;
  label: string;
  description?: string;
  placeholder?: string;
  fieldType: FieldType;
  options?: FieldOption[];
  isEnabled: boolean;
  isRequired: boolean;
  isReadOnly: boolean;
  displayOrder: number;
  section: SectionType;
  dependencies: FieldDependency[];
  calculation?: FieldCalculation;
  validation?: FieldValidation;
  appliesTo: AppliesToType[];
  allowOverride: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface FormFieldValue {
  [key: string]: any;
}

export interface DynamicFormContext {
  registrationYear?: number;
  parentData?: any;
  [key: string]: any;
}

export interface VisibleField extends FormFieldConfig {
  value?: any;
  error?: string;
  touched?: boolean;
}
