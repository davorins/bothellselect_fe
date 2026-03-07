// src/components/forms/ParentFormFields.tsx
import React from 'react';
import { Form } from 'react-bootstrap';
import { Parent } from '../../types/types';
import { VisibleField } from '../../types/form-config.types';
import NameInput from '../NameInput';
import { formatPhoneNumber } from '../../utils/phone';
import { ensureAddress } from '../../utils/address';

export interface ParentFormFieldsProps {
  parent: Partial<Parent>;
  onChange: (field: keyof Parent, value: string | boolean | object) => void;
  visibleFields: VisibleField[];
  errors?: Record<string, string>;
  disabled?: boolean;
}

const ParentFormFields: React.FC<ParentFormFieldsProps> = ({
  parent,
  onChange,
  visibleFields,
  errors = {},
  disabled = false,
}) => {
  const hasField = (name: string) =>
    visibleFields.some((f) => f.fieldName === name);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    onChange(
      name as keyof Parent,
      type === 'checkbox'
        ? checked
        : name === 'phone'
          ? formatPhoneNumber(value.replace(/\D/g, ''))
          : value,
    );
  };

  const handleAddressChange = (field: string, value: string) => {
    const currentAddress = ensureAddress(parent.address);
    onChange('address', {
      ...currentAddress,
      [field]: value,
    });
  };

  // Define valid address fields
  type AddressField = 'street' | 'street2' | 'city' | 'state' | 'zip';

  return (
    <>
      {/* Full Name - NameInput doesn't have disabled prop */}
      {hasField('fullName') && (
        <div className='row'>
          <div className='col-md-12'>
            <NameInput
              value={parent.fullName || ''}
              onChange={(val) => onChange('fullName', val)}
              error={errors.fullName}
              required={
                visibleFields.find((f) => f.fieldName === 'fullName')
                  ?.isRequired
              }
            />
          </div>
        </div>
      )}

      {/* Relationship to Player */}
      {hasField('relationship') && (
        <div className='row'>
          <div className='col-md-6'>
            <div className='mb-3'>
              <label className='form-label'>
                Relationship to Player{' '}
                {visibleFields.find((f) => f.fieldName === 'relationship')
                  ?.isRequired && <span className='text-danger'>*</span>}
              </label>
              <input
                type='text'
                className={`form-control ${errors.relationship ? 'is-invalid' : ''}`}
                name='relationship'
                value={parent.relationship || ''}
                onChange={handleInputChange}
                disabled={disabled}
                placeholder='e.g., Mother, Father, Guardian'
              />
              {errors.relationship && (
                <div className='invalid-feedback d-block'>
                  {errors.relationship}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Email + Phone */}
      <div className='row'>
        {hasField('email') && (
          <div className='col-md-6'>
            <div className='mb-3'>
              <label className='form-label'>
                Email{' '}
                {visibleFields.find((f) => f.fieldName === 'email')
                  ?.isRequired && <span className='text-danger'>*</span>}
              </label>
              <input
                type='email'
                className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                name='email'
                value={parent.email || ''}
                onChange={handleInputChange}
                disabled={disabled}
              />
              {errors.email && (
                <div className='invalid-feedback d-block'>{errors.email}</div>
              )}
            </div>
          </div>
        )}

        {hasField('phone') && (
          <div className='col-md-6'>
            <div className='mb-3'>
              <label className='form-label'>
                Phone Number{' '}
                {visibleFields.find((f) => f.fieldName === 'phone')
                  ?.isRequired && <span className='text-danger'>*</span>}
              </label>
              <input
                type='tel'
                className={`form-control ${errors.phone ? 'is-invalid' : ''}`}
                name='phone'
                value={parent.phone || ''}
                onChange={handleInputChange}
                disabled={disabled}
                placeholder='(123) 456-7890'
                maxLength={14}
              />
              {errors.phone && (
                <div className='invalid-feedback d-block'>{errors.phone}</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* AAU Number + Is Coach */}
      <div className='row'>
        {hasField('aauNumber') && (
          <div className='col-md-6'>
            <div className='mb-3'>
              <label className='form-label'>AAU Number</label>
              <input
                type='text'
                className='form-control'
                name='aauNumber'
                value={parent.aauNumber || ''}
                onChange={handleInputChange}
                disabled={disabled}
                placeholder='If applicable'
              />
            </div>
          </div>
        )}

        {hasField('isCoach') && (
          <div className='col-md-6'>
            <div className='mb-3'>
              <div className='form-check mt-4'>
                <input
                  type='checkbox'
                  className='form-check-input'
                  id='isCoach'
                  name='isCoach'
                  checked={parent.isCoach || false}
                  onChange={handleInputChange}
                  disabled={disabled}
                />
                <label className='form-check-label' htmlFor='isCoach'>
                  I am a coach
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Address Fields */}
      {hasField('address') && (
        <div className='card mt-3'>
          <div className='card-header bg-transparent py-2'>
            <h6 className='mb-0'>Address Information</h6>
          </div>
          <div className='card-body pb-2'>
            <div className='row'>
              <div className='col-md-8'>
                <div className='mb-3'>
                  <label className='form-label'>
                    Street Address <span className='text-danger'>*</span>
                  </label>
                  <input
                    type='text'
                    className={`form-control ${errors['address.street'] ? 'is-invalid' : ''}`}
                    value={ensureAddress(parent.address).street}
                    onChange={(e) =>
                      handleAddressChange('street', e.target.value)
                    }
                    disabled={disabled}
                    placeholder='123 Main St'
                  />
                  {errors['address.street'] && (
                    <div className='invalid-feedback d-block'>
                      {errors['address.street']}
                    </div>
                  )}
                </div>
              </div>
              <div className='col-md-4'>
                <div className='mb-3'>
                  <label className='form-label'>Apt/Suite (optional)</label>
                  <input
                    type='text'
                    className='form-control'
                    value={ensureAddress(parent.address).street2 || ''}
                    onChange={(e) =>
                      handleAddressChange('street2', e.target.value)
                    }
                    disabled={disabled}
                  />
                </div>
              </div>
            </div>
            <div className='row'>
              <div className='col-md-5'>
                <div className='mb-3'>
                  <label className='form-label'>
                    City <span className='text-danger'>*</span>
                  </label>
                  <input
                    type='text'
                    className={`form-control ${errors['address.city'] ? 'is-invalid' : ''}`}
                    value={ensureAddress(parent.address).city}
                    onChange={(e) =>
                      handleAddressChange('city', e.target.value)
                    }
                    disabled={disabled}
                    placeholder='Seattle'
                  />
                  {errors['address.city'] && (
                    <div className='invalid-feedback d-block'>
                      {errors['address.city']}
                    </div>
                  )}
                </div>
              </div>
              <div className='col-md-3'>
                <div className='mb-3'>
                  <label className='form-label'>
                    State <span className='text-danger'>*</span>
                  </label>
                  <input
                    type='text'
                    className={`form-control ${errors['address.state'] ? 'is-invalid' : ''}`}
                    value={ensureAddress(parent.address).state}
                    onChange={(e) =>
                      handleAddressChange('state', e.target.value.toUpperCase())
                    }
                    disabled={disabled}
                    maxLength={2}
                    placeholder='WA'
                  />
                  {errors['address.state'] && (
                    <div className='invalid-feedback d-block'>
                      {errors['address.state']}
                    </div>
                  )}
                </div>
              </div>
              <div className='col-md-4'>
                <div className='mb-3'>
                  <label className='form-label'>
                    ZIP Code <span className='text-danger'>*</span>
                  </label>
                  <input
                    type='text'
                    className={`form-control ${errors['address.zip'] ? 'is-invalid' : ''}`}
                    value={ensureAddress(parent.address).zip}
                    onChange={(e) => handleAddressChange('zip', e.target.value)}
                    disabled={disabled}
                    maxLength={10}
                    placeholder='98101'
                  />
                  {errors['address.zip'] && (
                    <div className='invalid-feedback d-block'>
                      {errors['address.zip']}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Extra dynamic fields */}
      {visibleFields
        .filter(
          (f) =>
            ![
              'fullName',
              'relationship',
              'email',
              'phone',
              'aauNumber',
              'isCoach',
              'address',
            ].includes(f.fieldName),
        )
        .map((field) => (
          <div key={field.fieldName} className='row'>
            <div className='col-md-12'>
              <div className='mb-3'>
                <label className='form-label'>
                  {field.label}
                  {field.isRequired && <span className='text-danger'>*</span>}
                </label>
                <input
                  type={field.fieldType === 'email' ? 'email' : 'text'}
                  className={`form-control ${errors[field.fieldName] ? 'is-invalid' : ''}`}
                  name={field.fieldName}
                  value={
                    (parent[field.fieldName as keyof Parent] as string) || ''
                  }
                  onChange={handleInputChange}
                  disabled={disabled || field.isReadOnly}
                  placeholder={field.placeholder}
                />
                {errors[field.fieldName] && (
                  <div className='invalid-feedback d-block'>
                    {errors[field.fieldName]}
                  </div>
                )}
                {field.description && (
                  <small className='text-muted'>{field.description}</small>
                )}
              </div>
            </div>
          </div>
        ))}
    </>
  );
};

export default ParentFormFields;
