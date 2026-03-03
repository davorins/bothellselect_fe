import React, { useEffect, useRef, useCallback } from 'react';
import { Guardian, Address } from '../../../types/registration-types';
import { formatAddress } from '../../../utils/registration-utils';
import { formatPhoneNumber } from '../../../utils/phone';
import AddressInput from '../../../components/common/AddressInput';
import NameInput from '../../../components/NameInput';

interface GuardianRegistrationModuleProps {
  guardian: Guardian;
  onGuardianChange: (guardian: Guardian) => void;
  parentAddress?: Address;
  isAdditional?: boolean;
  onValidationChange?: (isValid: boolean) => void;
  showUsePrimaryAddress?: boolean;
  errors?: Record<string, string>;
}

const GuardianRegistrationModule: React.FC<GuardianRegistrationModuleProps> = ({
  guardian,
  onGuardianChange,
  parentAddress,
  isAdditional = false,
  onValidationChange,
  showUsePrimaryAddress = false,
  errors = {},
}) => {
  const [useParentAddress, setUseParentAddress] = React.useState(
    guardian.usePrimaryAddress || false,
  );

  // Keep a stable ref to guardian so effects don't need it as a dep
  const guardianRef = useRef(guardian);
  useEffect(() => {
    guardianRef.current = guardian;
  }, [guardian]);

  // Keep a stable ref to onGuardianChange so effects don't re-fire when the
  // parent re-renders and passes a new function reference
  const onGuardianChangeRef = useRef(onGuardianChange);
  useEffect(() => {
    onGuardianChangeRef.current = onGuardianChange;
  }, [onGuardianChange]);

  // Keep a stable ref to onValidationChange for the same reason
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

  // Validate address whenever it changes — intentionally only depend on the
  // address fields, NOT on the onValidationChange callback, to avoid an
  // infinite render loop when the parent passes a new function ref each render.
  useEffect(() => {
    const isValid =
      !!guardian.address?.street?.trim() &&
      !!guardian.address?.city?.trim() &&
      /^[A-Z]{2}$/.test(guardian.address?.state || '') &&
      /^\d{5}(-\d{4})?$/.test(guardian.address?.zip || '');
    onValidationChangeRef.current?.(isValid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    guardian.address?.street,
    guardian.address?.city,
    guardian.address?.state,
    guardian.address?.zip,
  ]);

  // Sync parent address when "use primary" is toggled on — uses refs so that
  // neither `guardian` nor `onGuardianChange` need to be in the dep array,
  // which would otherwise cause an infinite loop.
  useEffect(() => {
    if (useParentAddress && parentAddress) {
      onGuardianChangeRef.current({
        ...guardianRef.current,
        address: { ...parentAddress },
        usePrimaryAddress: true,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          {/* Full Name */}
          <div className='col-md-6'>
            <NameInput
              value={guardian.fullName}
              onChange={(val) => handleChange('fullName', val)}
              error={getError('fullName')}
              required={!isAdditional}
            />
          </div>

          {/* Relationship */}
          <div className='col-md-6'>
            <div className='mb-3'>
              <label className='form-label'>
                Relationship to Player
                {!isAdditional && <span className='text-danger ms-1'>*</span>}
              </label>
              <select
                className={`form-control ${getError('relationship') ? 'is-invalid' : ''}`}
                value={guardian.relationship}
                onChange={(e) => handleChange('relationship', e.target.value)}
                required={!isAdditional}
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

          {/* Phone */}
          <div className='col-md-6'>
            <div className='mb-3'>
              <label className='form-label'>
                Phone Number
                {!isAdditional && <span className='text-danger ms-1'>*</span>}
              </label>
              <input
                type='text'
                className={`form-control ${getError('phone') ? 'is-invalid' : ''}`}
                value={guardian.phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                maxLength={14}
                required={!isAdditional}
                placeholder='(555) 123-4567'
              />
              {getError('phone') && (
                <div className='invalid-feedback'>{getError('phone')}</div>
              )}
            </div>
          </div>

          {/* Email */}
          <div className='col-md-6'>
            <div className='mb-3'>
              <label className='form-label'>
                Email
                {!isAdditional && <span className='text-danger ms-1'>*</span>}
              </label>
              <input
                type='email'
                className={`form-control ${getError('email') ? 'is-invalid' : ''}`}
                value={guardian.email}
                onChange={(e) =>
                  handleChange('email', e.target.value.toLowerCase())
                }
                required={!isAdditional}
                placeholder='email@example.com'
              />
              {getError('email') && (
                <div className='invalid-feedback'>{getError('email')}</div>
              )}
            </div>
          </div>

          {/* Address */}
          <div className='col-md-12'>
            {/* "Same as primary" — prominent card style for additional guardians */}
            {isAdditional && showUsePrimaryAddress && parentAddress && (
              <div
                className={`border rounded-2 p-3 mb-3 d-flex align-items-start gap-3 ${
                  useParentAddress
                    ? 'border-success bg-success bg-opacity-10'
                    : 'border-1 border-primary border-opacity-10'
                }`}
                style={{ cursor: 'pointer' }}
                onClick={() => handleUseParentAddressChange(!useParentAddress)}
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

            {/* AddressInput — hidden when "same as primary" is checked */}
            {!useParentAddress && (
              <AddressInput
                value={guardian.address}
                onChange={handleAddressChange}
                error={getError('address')}
                label={isAdditional ? 'Address (Optional)' : 'Address'}
                required={!isAdditional}
              />
            )}

            {/* Confirmation when using parent address */}
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

          {/* Coach checkbox */}
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

          {/* AAU Number — only when isCoach */}
          {guardian.isCoach && (
            <div className='col-md-6'>
              <div className='mb-3'>
                <label className='form-label'>AAU Number</label>
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
