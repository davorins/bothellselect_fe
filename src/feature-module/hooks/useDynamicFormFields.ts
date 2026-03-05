// src/hooks/useDynamicFormFields.ts
import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
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
  formType: 'parent' | 'player' | 'guardian',
  context: DynamicFormContext = {},
): UseDynamicFormFieldsReturn => {
  const [fields, setFields] = useState<FormFieldConfig[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { getAuthToken } = useAuth();

  const fetchFields = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getAuthToken();
      const response = await axios.get<{
        success: boolean;
        data: FormFieldConfig[];
      }>(`${API_BASE_URL}/form-fields/config/${formType}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setFields(response.data.data);
        setError(null);
      }
    } catch (err: any) {
      console.error('Error fetching form fields:', err);
      setError(
        err.response?.data?.error || 'Failed to load form configuration',
      );
    } finally {
      setLoading(false);
    }
  }, [formType, getAuthToken]);

  useEffect(() => {
    fetchFields();
  }, [fetchFields]);

  const isFieldVisible = useCallback(
    (field: FormFieldConfig, formData: FormFieldValue): boolean => {
      if (!field.isEnabled) return false;

      // Always show grade field if DOB is present in formData
      if (field.fieldName === 'grade' && formData.dob) {
        return true;
      }

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
      // Handle calculated fields
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

      // Return existing value or default
      return formData[field.fieldName] !== undefined
        ? formData[field.fieldName]
        : field.fieldType === 'checkbox'
          ? false
          : '';
    },
    [context],
  );

  const validateField = useCallback(
    (field: VisibleField, value: any): string | undefined => {
      if (
        !field.isRequired &&
        (value === undefined || value === '' || value === false)
      ) {
        return undefined;
      }

      // Required validation
      if (field.isRequired) {
        if (value === undefined || value === '' || value === null) {
          return `${field.label} is required`;
        }
        if (field.fieldType === 'checkbox' && value === false) {
          return `${field.label} must be accepted`;
        }
      }

      // Pattern validation
      if (field.validation?.pattern && value && typeof value === 'string') {
        const regex = new RegExp(field.validation.pattern);
        if (!regex.test(value)) {
          return (
            field.validation.customMessage ||
            `Invalid format for ${field.label}`
          );
        }
      }

      // Length validation
      if (
        field.validation?.minLength &&
        value &&
        value.length < field.validation.minLength
      ) {
        return `${field.label} must be at least ${field.validation.minLength} characters`;
      }
      if (
        field.validation?.maxLength &&
        value &&
        value.length > field.validation.maxLength
      ) {
        return `${field.label} must be no more than ${field.validation.maxLength} characters`;
      }

      // Number validation
      if (field.fieldType === 'number' && value !== undefined && value !== '') {
        const num = Number(value);
        if (field.validation?.min !== undefined && num < field.validation.min) {
          return `${field.label} must be at least ${field.validation.min}`;
        }
        if (field.validation?.max !== undefined && num > field.validation.max) {
          return `${field.label} must be no more than ${field.validation.max}`;
        }
      }

      return undefined;
    },
    [],
  );

  const getVisibleFields = useCallback(
    (formData: FormFieldValue): VisibleField[] => {
      // First, get all fields that are visible based on normal rules
      const visibleFields = fields.filter((field) =>
        isFieldVisible(field, formData),
      );

      // If DOB is present, ensure grade is included even if it was filtered out
      if (formData.dob) {
        const gradeField = fields.find((f) => f.fieldName === 'grade');
        if (gradeField && !visibleFields.some((f) => f.fieldName === 'grade')) {
          visibleFields.push(gradeField);
        }
      }

      // Sort and map to VisibleField type
      return visibleFields
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .map((field) => {
          const value = processFieldValue(field, formData);

          // Only mark age as readOnly, keep grade editable
          const isReadOnly = field.fieldName === 'age' || field.isReadOnly;

          return {
            ...field,
            value,
            isReadOnly,
            error: undefined,
            touched: false,
          };
        });
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
