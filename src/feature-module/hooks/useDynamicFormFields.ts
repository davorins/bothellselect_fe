// src/hooks/useDynamicFormFields.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import {
  FormFieldConfig,
  FormFieldValue,
  DynamicFormContext,
  VisibleField,
} from '../../types/form-config.types';
import { calculateAge, calculateGradeFromDOB } from '../../utils/gradeUtils';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

interface UseDynamicFormFieldsReturn {
  fields: FormFieldConfig[];
  loading: boolean;
  error: string | null;
  getVisibleFields: (formData: FormFieldValue) => VisibleField[];
  validateField: (field: VisibleField, value: any) => string | undefined;
  refresh: () => Promise<void>;
  isFieldVisible: (field: FormFieldConfig, formData: FormFieldValue) => boolean;
  processFieldValue: (
    field: FormFieldConfig,
    formData: FormFieldValue,
    context?: DynamicFormContext,
  ) => any;
}

export const useDynamicFormFields = (
  formType: 'parent' | 'player' | 'guardian' | 'team',
  context: DynamicFormContext = {},
): UseDynamicFormFieldsReturn => {
  const [fields, setFields] = useState<FormFieldConfig[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Cache for getVisibleFields results to prevent infinite loops
  const cacheRef = useRef<Map<string, VisibleField[]>>(new Map());

  const fetchFields = useCallback(async () => {
    try {
      setLoading(true);

      const response = await axios.get<{
        success: boolean;
        data: FormFieldConfig[];
      }>(`${API_BASE_URL}/form-fields/config/${formType}`, {
        timeout: 5000,
      });

      if (response.data.success && response.data.data) {
        console.log(
          `✅ Loaded ${formType} fields:`,
          response.data.data.map((f) => ({
            fieldName: f.fieldName,
            isEnabled: f.isEnabled,
            isRequired: f.isRequired,
          })),
        );
        setFields(response.data.data);
        setError(null);
      } else {
        setFields([]);
      }
    } catch (err: any) {
      console.error(`Error fetching ${formType} fields:`, err);
      setFields([]);
      setError(null);
    } finally {
      setLoading(false);
    }
  }, [formType]);

  useEffect(() => {
    fetchFields();
  }, [fetchFields]);

  const isFieldVisible = useCallback(
    (field: FormFieldConfig, formData: FormFieldValue): boolean => {
      // First check if field is enabled
      if (!field.isEnabled) {
        return false;
      }

      // Special case for grade field - ALWAYS show it regardless of DOB
      // Grade should be visible even when DOB is empty
      if (field.fieldName === 'grade') {
        return true;
      }

      // For age field - only show if DOB exists (since it's calculated)
      if (field.fieldName === 'age' && !formData.dob) {
        return false;
      }

      // Check dependencies if they exist
      if (field.dependencies && field.dependencies.length > 0) {
        return field.dependencies.every((dep) => {
          const dependsOnValue = formData[dep.field];

          switch (dep.operator) {
            case 'exists':
              return (
                !!dependsOnValue && dependsOnValue.toString().trim() !== ''
              );
            case 'notExists':
              return !dependsOnValue || dependsOnValue.toString().trim() === '';
            case 'equals':
              return dependsOnValue === dep.value;
            case 'notEquals':
              return dependsOnValue !== dep.value;
            case 'true':
              return dependsOnValue === true;
            case 'false':
              return dependsOnValue === false;
            default:
              return true;
          }
        });
      }

      return true;
    },
    [],
  );

  const processFieldValue = useCallback(
    (
      field: FormFieldConfig,
      formData: FormFieldValue,
      ctx: DynamicFormContext = context,
    ): any => {
      // For grade field: ONLY auto-calculate if DOB exists, otherwise return existing value or undefined
      if (field.fieldName === 'grade') {
        // If DOB exists, auto-calculate the grade
        if (formData.dob) {
          return calculateGradeFromDOB(
            formData.dob,
            ctx.registrationYear || new Date().getFullYear(),
          );
        }
        // If no DOB, return the existing grade value or undefined (allow manual entry)
        return formData.grade || undefined;
      }

      // For age field: only calculate if DOB exists
      if (field.fieldName === 'age' && formData.dob) {
        return calculateAge(formData.dob);
      }

      // For other fields with calculations
      if (field.calculation?.type === 'fromDOB' && formData.dob) {
        if (field.fieldName === 'age') {
          return calculateAge(formData.dob);
        }
        if (field.fieldName === 'grade') {
          return calculateGradeFromDOB(
            formData.dob,
            ctx.registrationYear || new Date().getFullYear(),
          );
        }
      }

      return formData[field.fieldName];
    },
    [context],
  );

  const validateField = useCallback(
    (field: VisibleField, value: any): string | undefined => {
      if (!field.isEnabled) {
        return undefined;
      }

      if (field.isRequired) {
        if (value === undefined || value === null || value === '') {
          return `${field.label} is required`;
        }
        if (field.fieldType === 'checkbox' && value === false) {
          return `${field.label} must be accepted`;
        }
        if (Array.isArray(value) && value.length === 0) {
          return `${field.label} is required`;
        }
      }

      if (value && value !== '') {
        switch (field.fieldType) {
          case 'email':
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
              return 'Please enter a valid email address';
            }
            break;
          case 'tel':
            const digits = value.replace(/\D/g, '');
            if (digits.length !== 10) {
              return 'Please enter a valid 10-digit phone number';
            }
            break;
          case 'number':
            if (isNaN(Number(value))) {
              return 'Please enter a valid number';
            }
            break;
        }
      }

      // Custom validation rules - with proper undefined checks
      if (field.validation) {
        if (
          field.validation.minLength !== undefined &&
          String(value).length < field.validation.minLength
        ) {
          return `${field.label} must be at least ${field.validation.minLength} characters`;
        }
        if (
          field.validation.maxLength !== undefined &&
          String(value).length > field.validation.maxLength
        ) {
          return `${field.label} must be no more than ${field.validation.maxLength} characters`;
        }
        // Fix: Check if pattern exists before using it
        if (
          field.validation.pattern &&
          typeof field.validation.pattern === 'string'
        ) {
          try {
            const regex = new RegExp(field.validation.pattern);
            if (!regex.test(String(value))) {
              return `Invalid format for ${field.label}`;
            }
          } catch (regexError) {
            console.error(
              `Invalid regex pattern for field ${field.fieldName}:`,
              field.validation.pattern,
            );
          }
        }
      }

      return undefined;
    },
    [],
  );

  // Memoized getVisibleFields with caching to prevent infinite loops
  const getVisibleFields = useCallback(
    (formData: FormFieldValue): VisibleField[] => {
      // Create a cache key based on formData and fields
      const cacheKey = JSON.stringify({
        formData: {
          dob: formData.dob,
          ...(formData.isCoach !== undefined && { isCoach: formData.isCoach }),
        },
        fieldIds: fields.map((f) => `${f.fieldName}:${f.isEnabled}`).join(','),
      });

      // Check cache
      if (cacheRef.current.has(cacheKey)) {
        return cacheRef.current.get(cacheKey)!;
      }

      // Calculate visible fields
      const visibleFields = fields.filter((field) =>
        isFieldVisible(field, formData),
      );

      const result = visibleFields
        .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
        .map((field) => ({
          ...field,
          value: processFieldValue(field, formData),
          isReadOnly: field.fieldName === 'age' || field.isReadOnly || false,
          error: undefined,
          touched: false,
        }));

      // Store in cache
      cacheRef.current.set(cacheKey, result);

      // Limit cache size - with proper undefined check
      if (cacheRef.current.size > 100) {
        const iterator = cacheRef.current.keys();
        const firstKey = iterator.next();
        if (!firstKey.done && firstKey.value !== undefined) {
          cacheRef.current.delete(firstKey.value);
        }
      }

      return result;
    },
    [fields, isFieldVisible, processFieldValue],
  );

  return {
    fields,
    loading,
    error,
    getVisibleFields,
    validateField,
    refresh: fetchFields,
    isFieldVisible,
    processFieldValue,
  };
};
