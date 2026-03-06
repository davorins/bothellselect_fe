// src/components/forms/DynamicFormField.tsx
import React from 'react';
import { Form } from 'react-bootstrap';
import Select from 'react-select';
import { VisibleField } from '../../types/form-config.types';

interface DynamicFormFieldProps {
  field: VisibleField;
  value: any;
  onChange: (fieldName: string, value: any) => void;
  onBlur?: (fieldName: string) => void;
  error?: string;
  disabled?: boolean;
  className?: string;
}

const DynamicFormField: React.FC<DynamicFormFieldProps> = ({
  field,
  value,
  onChange,
  onBlur,
  error,
  disabled = false,
  className = '',
}) => {
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { type, checked, value: inputValue } = e.target as HTMLInputElement;

    if (type === 'checkbox') {
      onChange(field.fieldName, checked);
    } else {
      onChange(field.fieldName, inputValue);
    }
  };

  const handleSelectChange = (selected: any) => {
    onChange(field.fieldName, selected?.value || '');
  };

  const handleBlur = () => {
    onBlur?.(field.fieldName);
  };

  const isInvalid = !!error;
  const isDisabled = disabled || field.isReadOnly;

  // Common props for all input types
  const commonProps = {
    id: `field-${field.fieldName}`,
    name: field.fieldName,
    placeholder: field.placeholder || `Enter ${field.label.toLowerCase()}`,
    disabled: isDisabled,
    onBlur: handleBlur,
    className: `form-control ${isInvalid ? 'is-invalid' : ''} ${className}`,
    'aria-describedby': error ? `${field.fieldName}-error` : undefined,
  };

  // Render different field types
  switch (field.fieldType) {
    case 'select':
      return (
        <Form.Group className='mb-3'>
          <Form.Label>
            {field.label}
            {field.isRequired && <span className='text-danger ms-1'>*</span>}
          </Form.Label>
          <Select
            options={field.options || []}
            value={field.options?.find((opt) => opt.value === value) || null}
            onChange={handleSelectChange}
            isDisabled={isDisabled}
            placeholder={
              field.placeholder || `Select ${field.label.toLowerCase()}`
            }
            className={isInvalid ? 'is-invalid' : ''}
            classNamePrefix='select'
            styles={{
              control: (base) => ({
                ...base,
                borderColor: isInvalid ? '#dc3545 !important' : '#ced4da',
                borderWidth: '1px',
                '&:hover': {
                  borderColor: isInvalid ? '#dc3545 !important' : '#80bdff',
                },
              }),
            }}
          />
          {error && (
            <div
              className='invalid-feedback d-block'
              id={`${field.fieldName}-error`}
            >
              {error}
            </div>
          )}
          {field.description && (
            <Form.Text className='text-muted'>{field.description}</Form.Text>
          )}
        </Form.Group>
      );

    case 'textarea':
      return (
        <Form.Group className='mb-3'>
          <Form.Label>
            {field.label}
            {field.isRequired && <span className='text-danger ms-1'>*</span>}
          </Form.Label>
          <textarea
            {...commonProps}
            value={value || ''}
            onChange={handleChange}
            rows={4}
          />
          {error && (
            <div className='invalid-feedback' id={`${field.fieldName}-error`}>
              {error}
            </div>
          )}
          {field.description && (
            <Form.Text className='text-muted'>{field.description}</Form.Text>
          )}
        </Form.Group>
      );

    case 'checkbox':
      return (
        <Form.Group className='mb-3'>
          <Form.Check
            type='checkbox'
            id={`field-${field.fieldName}`}
            label={
              <span>
                {field.label}
                {field.isRequired && (
                  <span className='text-danger ms-1'>*</span>
                )}
              </span>
            }
            checked={value || false}
            onChange={handleChange}
            disabled={isDisabled}
            isInvalid={isInvalid}
            feedback={error}
            feedbackType='invalid'
          />
          {field.description && (
            <Form.Text className='text-muted d-block mt-1'>
              {field.description}
            </Form.Text>
          )}
        </Form.Group>
      );

    case 'radio':
      return (
        <Form.Group className='mb-3'>
          <Form.Label>
            {field.label}
            {field.isRequired && <span className='text-danger ms-1'>*</span>}
          </Form.Label>
          <div>
            {field.options?.map((option) => (
              <Form.Check
                key={option.value}
                type='radio'
                id={`field-${field.fieldName}-${option.value}`}
                name={field.fieldName}
                label={option.label}
                value={option.value}
                checked={value === option.value}
                onChange={handleChange}
                disabled={isDisabled}
                inline
              />
            ))}
          </div>
          {error && (
            <div
              className='text-danger small mt-1'
              id={`${field.fieldName}-error`}
            >
              {error}
            </div>
          )}
          {field.description && (
            <Form.Text className='text-muted'>{field.description}</Form.Text>
          )}
        </Form.Group>
      );

    case 'date':
      return (
        <Form.Group className='mb-3'>
          <Form.Label>
            {field.label}
            {field.isRequired && <span className='text-danger ms-1'>*</span>}
          </Form.Label>
          <input
            type='date'
            {...commonProps}
            value={value || ''}
            onChange={handleChange}
          />
          {error && (
            <div className='invalid-feedback' id={`${field.fieldName}-error`}>
              {error}
            </div>
          )}
          {field.description && (
            <Form.Text className='text-muted'>{field.description}</Form.Text>
          )}
        </Form.Group>
      );

    case 'number':
      return (
        <Form.Group className='mb-3'>
          <Form.Label>
            {field.label}
            {field.isRequired && <span className='text-danger ms-1'>*</span>}
          </Form.Label>
          <input
            type='number'
            {...commonProps}
            value={value || ''}
            onChange={handleChange}
            min={field.validation?.min}
            max={field.validation?.max}
          />
          {error && (
            <div className='invalid-feedback' id={`${field.fieldName}-error`}>
              {error}
            </div>
          )}
          {field.description && (
            <Form.Text className='text-muted'>{field.description}</Form.Text>
          )}
        </Form.Group>
      );

    case 'email':
      return (
        <Form.Group className='mb-3'>
          <Form.Label>
            {field.label}
            {field.isRequired && <span className='text-danger ms-1'>*</span>}
          </Form.Label>
          <input
            type='email'
            {...commonProps}
            value={value || ''}
            onChange={handleChange}
          />
          {error && (
            <div className='invalid-feedback' id={`${field.fieldName}-error`}>
              {error}
            </div>
          )}
          {field.description && (
            <Form.Text className='text-muted'>{field.description}</Form.Text>
          )}
        </Form.Group>
      );

    case 'tel':
      return (
        <Form.Group className='mb-3'>
          <Form.Label>
            {field.label}
            {field.isRequired && <span className='text-danger ms-1'>*</span>}
          </Form.Label>
          <input
            type='tel'
            {...commonProps}
            value={value || ''}
            onChange={handleChange}
            maxLength={field.validation?.maxLength}
          />
          {error && (
            <div className='invalid-feedback' id={`${field.fieldName}-error`}>
              {error}
            </div>
          )}
          {field.description && (
            <Form.Text className='text-muted'>{field.description}</Form.Text>
          )}
        </Form.Group>
      );

    default: // text
      return (
        <Form.Group className='mb-3'>
          <Form.Label>
            {field.label}
            {field.isRequired && <span className='text-danger ms-1'>*</span>}
          </Form.Label>
          <input
            type='text'
            {...commonProps}
            value={value || ''}
            onChange={handleChange}
            maxLength={field.validation?.maxLength}
          />
          {error && (
            <div className='invalid-feedback' id={`${field.fieldName}-error`}>
              {error}
            </div>
          )}
          {field.description && (
            <Form.Text className='text-muted'>{field.description}</Form.Text>
          )}
        </Form.Group>
      );
  }
};

export default DynamicFormField;
