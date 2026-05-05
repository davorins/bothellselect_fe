import React, {
  useEffect,
  useRef,
  useCallback,
  useState,
  useMemo,
} from 'react';
import { Guardian, Address } from '../../../types/registration-types';
import { formatAddress } from '../../../utils/registration-utils';
import { formatPhoneNumber } from '../../../utils/phone';
import AddressInput from '../../../components/common/AddressInput';
import NameInput from '../../../components/NameInput';
import { useDynamicFormFields } from '../../hooks/useDynamicFormFields';

interface GuardianRegistrationModuleProps {
  guardian: Guardian;
  onGuardianChange: (guardian: Guardian) => void;
  parentAddress?: Address;
  isAdditional?: boolean;
  onValidationChange?: (isValid: boolean) => void;
  showUsePrimaryAddress?: boolean;
  errors?: Record<string, string>;
  registrationYear?: number;
}

const GuardianRegistrationModule: React.FC<GuardianRegistrationModuleProps> = ({
  guardian,
  onGuardianChange,
  parentAddress,
  isAdditional = false,
  onValidationChange,
  showUsePrimaryAddress = false,
  errors = {},
  registrationYear = new Date().getFullYear(),
}) => {
  const [useParentAddress, setUseParentAddress] = React.useState(
    guardian.usePrimaryAddress || false,
  );

  const {
    getVisibleFields,
    validateField,
    loading: fieldsLoading,
  } = useDynamicFormFields(isAdditional ? 'guardian' : 'parent', {
    registrationYear,
  });

  // Create form data for visibility check
  const formDataForVisibility = useMemo(
    () => ({
      guardianFullName: guardian.fullName,
      relationship: guardian.relationship,
      email: guardian.email,
      phone: guardian.phone,
      address: guardian.address,
      city: guardian.address?.city,
      state: guardian.address?.state,
      zip: guardian.address?.zip,
      isCoach: guardian.isCoach,
      aauNumber: guardian.aauNumber,
    }),
    [guardian],
  );

  // visibleFields only contains fields that are ENABLED in the config
  const visibleFields = getVisibleFields(formDataForVisibility as any);

  // Helper to check if a dynamic field is visible
  const isDynamicFieldVisible = useCallback(
    (fieldName: string) => {
      return visibleFields.some((f) => f.fieldName === fieldName);
    },
    [visibleFields],
  );

  // Helper to check if a dynamic field is required
  const isDynamicFieldRequired = useCallback(
    (fieldName: string) => {
      const field = visibleFields.find((f) => f.fieldName === fieldName);
      return field?.isRequired || false;
    },
    [visibleFields],
  );

  const guardianRef = useRef(guardian);
  useEffect(() => {
    guardianRef.current = guardian;
  }, [guardian]);

  const onGuardianChangeRef = useRef(onGuardianChange);
  useEffect(() => {
    onGuardianChangeRef.current = onGuardianChange;
  }, [onGuardianChange]);

  const onValidationChangeRef = useRef(onValidationChange);
  useEffect(() => {
    onValidationChangeRef.current = onValidationChange;
  }, [onValidationChange]);

  const relationshipOptions = [
    { value: '', label: 'Select Relationship' },
    { value: 'Mother', label: 'Mother' },
    { value: 'Father', label: 'Father' },
    { value: 'Guardian', label: 'Guardian' },
    { value: 'Parent/Guardian', label: 'Parent/Guardian' },
    { value: 'Other', label: 'Other' },
  ];

  // Validate form - ONLY validates fields in visibleFields
  const validateForm = useCallback(() => {
    let isValid = true;

    // 1. Full Name - ALWAYS required (not in visibleFields)
    if (!guardian.fullName?.trim()) {
      isValid = false;
    }

    // 2. Dynamic fields - ONLY validate fields that are in visibleFields
    visibleFields.forEach((field) => {
      let value: any = null;

      switch (field.fieldName) {
        case 'guardianFullName':
          value = guardian.fullName;
          break;
        case 'relationship':
          value = guardian.relationship;
          break;
        case 'email':
          value = guardian.email;
          break;
        case 'phone':
          value = guardian.phone;
          break;
        case 'address':
          value = guardian.address?.street;
          break;
        case 'city':
          value = guardian.address?.city;
          break;
        case 'state':
          value = guardian.address?.state;
          break;
        case 'zip':
          value = guardian.address?.zip;
          break;
        case 'isCoach':
          value = guardian.isCoach;
          break;
        case 'aauNumber':
          value = guardian.aauNumber;
          break;
        default:
          value = (guardian as any)[field.fieldName];
      }

      const error = validateField(field, value);
      if (error) {
        isValid = false;
      }
    });

    onValidationChangeRef.current?.(isValid);
    return isValid;
  }, [guardian, visibleFields, validateField]);

  // Run validation when relevant data changes
  useEffect(() => {
    validateForm();
  }, [
    guardian.fullName,
    guardian.relationship,
    guardian.email,
    guardian.phone,
    guardian.address?.street,
    guardian.address?.city,
    guardian.address?.state,
    guardian.address?.zip,
    visibleFields,
    validateForm,
  ]);

  useEffect(() => {
    if (useParentAddress && parentAddress) {
      onGuardianChangeRef.current({
        ...guardianRef.current,
        address: { ...parentAddress },
        usePrimaryAddress: true,
      });
    }
  }, [useParentAddress, parentAddress]);
  const handleChange = useCallback(
    (field: keyof Guardian, value: any) => {
      onGuardianChange({ ...guardian, [field]: value });
    },
    [guardian, onGuardianChange],
  );

  const handlePhoneChange = useCallback(
    (value: string) => {
      handleChange('phone', formatPhoneNumber(value));
    },
    [handleChange],
  );

  const handleAddressChange = useCallback(
    (addr: Address) => {
      onGuardianChange({ ...guardian, address: addr });
    },
    [guardian, onGuardianChange],
  );

  const handleUseParentAddressChange = useCallback(
    (checked: boolean) => {
      setUseParentAddress(checked);
      if (checked && parentAddress) {
        onGuardianChange({
          ...guardianRef.current,
          address: { ...parentAddress },
          usePrimaryAddress: true,
        });
      } else {
        onGuardianChange({
          ...guardianRef.current,
          usePrimaryAddress: false,
        });
      }
    },
    [parentAddress, onGuardianChange],
  );

  const getError = (fieldName: string): string | undefined => errors[fieldName];

  if (fieldsLoading) {
    return (
      <div className='card'>
        <div className='card-header bg-light'>
          <div className='d-flex align-items-center'>
            <span className='bg-white avatar avatar-sm me-2 text-gray-7 flex-shrink-0'>
              <i className='ti ti-loader fs-16' />
            </span>
            <h4 className='text-dark'>
              {isAdditional
                ? 'Additional Guardian Information'
                : 'Parent Information'}
            </h4>
          </div>
        </div>
        <div className='card-body text-center py-4'>
          <div className='spinner-border text-primary' role='status'>
            <span className='visually-hidden'>Loading...</span>
          </div>
          <p className='mt-2 text-muted'>Loading form configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className='card'>
      <div className='card-header bg-light'>
        <div className='d-flex align-items-center'>
          <span className='bg-white avatar avatar-sm me-2 text-gray-7 flex-shrink-0'>
            <i className='ti ti-user-shield fs-16' />
          </span>
          <h4 className='text-dark'>
            {isAdditional
              ? 'Additional Guardian Information'
              : 'Parent Information'}
          </h4>
        </div>
      </div>
      <div className='card-body pb-3'>
        <div className='row'>
          {/* Full Name - ALWAYS visible, ALWAYS required */}
          <div className='col-md-6'>
            <NameInput
              value={guardian.fullName}
              onChange={(val) => handleChange('fullName', val)}
              error={getError('fullName')}
              required={true}
            />
          </div>

          {/* Relationship - ONLY show if visible in config */}
          {isDynamicFieldVisible('relationship') && (
            <div className='col-md-6'>
              <div className='mb-3'>
                <label className='form-label'>
                  Relationship to Player
                  {isDynamicFieldRequired('relationship') && (
                    <span className='text-danger ms-1'>*</span>
                  )}
                </label>
                <select
                  className={`form-control ${getError('relationship') ? 'is-invalid' : ''}`}
                  value={guardian.relationship}
                  onChange={(e) => handleChange('relationship', e.target.value)}
                  required={isDynamicFieldRequired('relationship')}
                >
                  {relationshipOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {getError('relationship') && (
                  <div className='invalid-feedback'>
                    {getError('relationship')}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Phone - ONLY show if visible in config */}
          {isDynamicFieldVisible('phone') && (
            <div className='col-md-6'>
              <div className='mb-3'>
                <label className='form-label'>
                  Phone Number
                  {isDynamicFieldRequired('phone') && (
                    <span className='text-danger ms-1'>*</span>
                  )}
                </label>
                <input
                  type='text'
                  className={`form-control ${getError('phone') ? 'is-invalid' : ''}`}
                  value={guardian.phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  maxLength={14}
                  required={isDynamicFieldRequired('phone')}
                  placeholder='(555) 123-4567'
                />
                {getError('phone') && (
                  <div className='invalid-feedback'>{getError('phone')}</div>
                )}
              </div>
            </div>
          )}

          {/* Email - ONLY show if visible in config */}
          {isDynamicFieldVisible('email') && (
            <div className='col-md-6'>
              <div className='mb-3'>
                <label className='form-label'>
                  Email
                  {isDynamicFieldRequired('email') && (
                    <span className='text-danger ms-1'>*</span>
                  )}
                </label>
                <input
                  type='email'
                  className={`form-control ${getError('email') ? 'is-invalid' : ''}`}
                  value={guardian.email}
                  onChange={(e) =>
                    handleChange('email', e.target.value.toLowerCase())
                  }
                  required={isDynamicFieldRequired('email')}
                  placeholder='email@example.com'
                />
                {getError('email') && (
                  <div className='invalid-feedback'>{getError('email')}</div>
                )}
              </div>
            </div>
          )}

          {/* Address Section - ONLY show if ANY address-related field is visible in config */}
          {(isDynamicFieldVisible('address') ||
            isDynamicFieldVisible('city') ||
            isDynamicFieldVisible('state') ||
            isDynamicFieldVisible('zip')) && (
            <div className='col-md-12'>
              {isAdditional && showUsePrimaryAddress && parentAddress && (
                <div
                  className={`border rounded-2 p-3 mb-3 d-flex align-items-start gap-3 ${
                    useParentAddress
                      ? 'border-success bg-success bg-opacity-10'
                      : 'border-1 border-primary border-opacity-10'
                  }`}
                  style={{ cursor: 'pointer' }}
                  onClick={() =>
                    handleUseParentAddressChange(!useParentAddress)
                  }
                >
                  <input
                    type='checkbox'
                    className='form-check-input flex-shrink-0'
                    style={{
                      width: '1.2rem',
                      height: '1.2rem',
                      marginTop: '2px',
                    }}
                    checked={useParentAddress}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleUseParentAddressChange(e.target.checked);
                    }}
                    id={`use-parent-address-${guardian.email}`}
                  />
                  <div>
                    <div
                      className='fw-semibold text-primary'
                      style={{ fontSize: '0.95rem' }}
                    >
                      <i
                        className={`ti ${useParentAddress ? 'ti-circle-check text-success' : 'ti-home text-primary'} me-2`}
                      />
                      Same address as primary guardian
                    </div>
                    <div className='text-muted small mt-1'>
                      <i className='ti ti-map-pin me-1' />
                      {formatAddress(parentAddress)}
                    </div>
                  </div>
                </div>
              )}

              {!useParentAddress && (
                <AddressInput
                  value={guardian.address}
                  onChange={handleAddressChange}
                  error={getError('address')}
                  label={isAdditional ? 'Address (Optional)' : 'Address'}
                  required={isDynamicFieldRequired('address')}
                />
              )}

              {useParentAddress && isAdditional && (
                <div
                  className='alert alert-info py-2 px-3 mb-3'
                  style={{ fontSize: '0.85rem' }}
                >
                  <i className='ti ti-circle-check text-success me-2'></i>
                  Using primary guardian's address:{' '}
                  <strong>{formatAddress(parentAddress!)}</strong>
                </div>
              )}
            </div>
          )}

          {/* Coach checkbox - STATIC */}
          <div className='col-md-6'>
            <div className='mb-3'>
              <label className='form-label'>
                <input
                  type='checkbox'
                  className='me-2'
                  checked={guardian.isCoach}
                  onChange={(e) => handleChange('isCoach', e.target.checked)}
                />
                {isAdditional
                  ? 'Is this guardian a coach?'
                  : 'Are you a coach?'}
              </label>
            </div>
          </div>

          {/* AAU Number - STATIC */}
          {guardian.isCoach && (
            <div className='col-md-6'>
              <div className='mb-3'>
                <label className='form-label'>
                  AAU Number
                  <span className='text-danger ms-1'>*</span>
                </label>
                <input
                  type='text'
                  className={`form-control ${getError('aauNumber') ? 'is-invalid' : ''}`}
                  value={guardian.aauNumber}
                  onChange={(e) => handleChange('aauNumber', e.target.value)}
                  required={guardian.isCoach}
                  placeholder='AAU membership number'
                />
                {getError('aauNumber') && (
                  <div className='invalid-feedback'>
                    {getError('aauNumber')}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GuardianRegistrationModule;
