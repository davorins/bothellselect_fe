import React, { useState, useEffect, ChangeEvent } from 'react';
import {
  UserRegistrationData,
  Guardian,
  Address,
  WizardStepCommonProps,
  TournamentSpecificConfig,
} from '../../../types/registration-types';
import GuardianRegistrationModule from './GuardianRegistrationModule';
import { formatPhoneNumber, validatePhoneNumber } from '../../../utils/phone';

interface Props extends WizardStepCommonProps {
  isExistingUser?: boolean;
  initialData?: Partial<UserRegistrationData> | null;
  tournamentConfig?: TournamentSpecificConfig;
  registrationType?: 'tournament' | 'tryout' | 'training' | 'player';
}

const UserRegistrationModule: React.FC<Props> = ({
  isExistingUser = false,
  initialData = null,
  onComplete,
  onBack,
  formData,
  updateFormData,
  onValidationChange,
}) => {
  // Safe initialization with null checks
  const [localData, setLocalData] = useState<UserRegistrationData>({
    email: formData.tempAccount?.email || initialData?.email || '',
    fullName: initialData?.fullName || '',
    relationship: initialData?.relationship || '',
    phone: initialData?.phone || '',
    address: initialData?.address || {
      street: '',
      street2: '',
      city: '',
      state: '',
      zip: '',
    },
    isCoach: initialData?.isCoach || false,
    aauNumber: initialData?.aauNumber || '',
    agreeToTerms: initialData?.agreeToTerms || false,
    additionalGuardians: initialData?.additionalGuardians || [],
    password: '',
    confirmPassword: '',
  });

  const [showAdditionalGuardian, setShowAdditionalGuardian] = useState(false);
  const [additionalGuardian, setAdditionalGuardian] = useState<Guardian>({
    fullName: '',
    relationship: '',
    phone: '',
    email: '',
    address: { street: '', street2: '', city: '', state: '', zip: '' },
    isCoach: false,
    aauNumber: '',
    usePrimaryAddress: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isValid, setIsValid] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [additionalGuardianErrors, setAdditionalGuardianErrors] = useState<
    Record<string, string>
  >({});
  const [isAdditionalGuardianValid, setIsAdditionalGuardianValid] =
    useState(false);

  useEffect(() => {
    validateForm();
  }, [localData, showAdditionalGuardian]);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const checked = (e.target as any).checked;

    if (name === 'phone') {
      // Format phone number as user types
      const formattedPhone = formatPhoneNumber(value);
      setLocalData((prev) => ({ ...prev, phone: formattedPhone }));
    } else if (name === 'agreeToTerms') {
      setLocalData((prev) => ({
        ...prev,
        agreeToTerms: checked,
      }));
    } else {
      setLocalData((prev) => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      }));
    }

    // Clear errors when user types
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleGuardianChange = (guardian: Guardian) => {
    console.log('🔄 Primary guardian updated:', guardian);
    setLocalData((prev) => ({
      ...prev,
      fullName: guardian.fullName,
      relationship: guardian.relationship,
      phone: guardian.phone,
      email: guardian.email,
      address: guardian.address,
      isCoach: guardian.isCoach,
      aauNumber: guardian.aauNumber,
    }));
  };

  const handleAdditionalGuardianChange = (guardian: Guardian) => {
    setAdditionalGuardian(guardian);
    // Validate the additional guardian in real-time
    validateAdditionalGuardian(guardian);
  };

  // Enhanced address validation function
  const validateAddress = (address: Address): boolean => {
    if (!address.street?.trim()) return false;
    if (!address.city?.trim()) return false;
    if (!address.state?.trim()) return false;
    if (!/^[A-Z]{2}$/.test(address.state)) return false;
    if (!address.zip?.trim()) return false;
    if (!/^\d{5}(-\d{4})?$/.test(address.zip)) return false;
    return true;
  };

  // Validate additional guardian form
  const validateAdditionalGuardian = (guardian: Guardian): boolean => {
    const err: Record<string, string> = {};

    if (!guardian.fullName?.trim()) {
      err.fullName = 'Full name is required';
    }

    if (!guardian.relationship?.trim()) {
      err.relationship = 'Relationship is required';
    }

    if (!guardian.phone?.trim()) {
      err.phone = 'Phone number is required';
    } else if (!validatePhoneNumber(guardian.phone)) {
      err.phone = 'Please enter a valid 10-digit phone number';
    }

    if (!guardian.email?.trim()) {
      err.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guardian.email)) {
      err.email = 'Please enter a valid email address';
    }

    // Validate address only if not using primary address
    if (!guardian.usePrimaryAddress && !validateAddress(guardian.address)) {
      err.address =
        'Please enter a complete address with street, city, state, and ZIP code';
    }

    setAdditionalGuardianErrors(err);
    const isValid = Object.keys(err).length === 0;
    setIsAdditionalGuardianValid(isValid);
    return isValid;
  };

  const addGuardian = () => {
    // Validate the additional guardian before adding
    const isGuardianValid = validateAdditionalGuardian(additionalGuardian);

    if (!isGuardianValid) {
      // Show error message and prevent adding
      setErrors((prev) => ({
        ...prev,
        additionalGuardian:
          'Please complete all required fields for the additional guardian',
      }));
      return;
    }

    // If "use primary address" is checked, copy the primary address
    const guardianToAdd = additionalGuardian.usePrimaryAddress
      ? {
          ...additionalGuardian,
          address: { ...localData.address }, // Copy primary address
        }
      : additionalGuardian;

    setLocalData((prev) => ({
      ...prev,
      additionalGuardians: [...prev.additionalGuardians, guardianToAdd],
    }));

    // Reset the additional guardian form
    setAdditionalGuardian({
      fullName: '',
      relationship: '',
      phone: '',
      email: '',
      address: { street: '', street2: '', city: '', state: '', zip: '' },
      isCoach: false,
      aauNumber: '',
      usePrimaryAddress: false,
    });
    setAdditionalGuardianErrors({});
    setIsAdditionalGuardianValid(false);
    setShowAdditionalGuardian(false);

    // Clear any previous additional guardian errors
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors.additionalGuardian;
      return newErrors;
    });
  };

  const removeGuardian = (index: number) => {
    setLocalData((prev) => ({
      ...prev,
      additionalGuardians: prev.additionalGuardians.filter(
        (_, i) => i !== index
      ),
    }));
  };

  const validateForm = () => {
    const err: Record<string, string> = {};

    // Validate primary guardian (user) - all required fields INCLUDING agreeToTerms
    if (!localData.fullName?.trim()) err.fullName = 'Full name is required';
    if (!localData.relationship?.trim())
      err.relationship = 'Relationship is required';
    if (!localData.email?.trim()) err.email = 'Email is required';
    if (!localData.phone?.trim()) err.phone = 'Phone number is required';
    if (!localData.agreeToTerms)
      err.agreeToTerms = 'You must agree to the terms and conditions';

    // Validate phone format for primary user
    if (localData.phone?.trim()) {
      if (!validatePhoneNumber(localData.phone)) {
        err.phone = 'Please enter a valid 10-digit phone number';
      }
    }

    // Validate email format for primary user
    if (localData.email?.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(localData.email)) {
        err.email = 'Please enter a valid email address';
      }
    }

    // Validate address for primary user - REQUIRED for primary guardian
    if (!validateAddress(localData.address)) {
      err.address =
        'Please enter a complete address with street, city, state, and ZIP code in format: 123 Main St, Seattle, WA 98101';
    }

    // Only validate additional guardians that have COMPLETE data (user intentionally added them)
    localData.additionalGuardians.forEach((g, i) => {
      // Check if this guardian has SIGNIFICANT data (user intended to add them)
      const hasSignificantData =
        (g.fullName?.trim() && g.fullName.trim().length > 1) ||
        (g.email?.trim() && g.email.includes('@')) ||
        (g.phone?.trim() && g.phone.replace(/\D/g, '').length >= 10);

      if (hasSignificantData) {
        // Now validate ALL required fields for additional guardians
        if (!g.fullName?.trim() || g.fullName.trim().length < 2) {
          err[`guardian${i}_fullName`] = 'Full name is required';
        }
        if (!g.relationship?.trim()) {
          err[`guardian${i}_relationship`] = 'Relationship is required';
        }
        if (!g.phone?.trim()) {
          err[`guardian${i}_phone`] = 'Phone number is required';
        } else if (!validatePhoneNumber(g.phone)) {
          err[`guardian${i}_phone`] =
            'Please enter a valid 10-digit phone number';
        }
        if (!g.email?.trim()) {
          err[`guardian${i}_email`] = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(g.email)) {
          err[`guardian${i}_email`] = 'Please enter a valid email address';
        }

        // Validate address for additional guardians ONLY if not using primary address
        if (!g.usePrimaryAddress) {
          if (!validateAddress(g.address)) {
            err[`guardian${i}_address`] =
              'Please enter a complete address with street, city, state, and ZIP code';
          }
        }
      }
      // If no significant data, don't validate - it's an empty/incomplete guardian
    });

    console.log('🔍 UserRegistrationModule Validation:', {
      isValid: Object.keys(err).length === 0,
      errors: err,
      additionalGuardiansCount: localData.additionalGuardians.length,
      additionalGuardiansWithData: localData.additionalGuardians.filter(
        (g) =>
          (g.fullName?.trim() && g.fullName.trim().length > 1) ||
          (g.email?.trim() && g.email.includes('@')) ||
          (g.phone?.trim() && g.phone.replace(/\D/g, '').length >= 10)
      ).length,
    });

    setErrors(err);
    const formIsValid = Object.keys(err).length === 0;
    setIsValid(formIsValid);
    onValidationChange?.(formIsValid);

    return formIsValid; // Return the validation result
  };

  // Enhanced submit handler with proper address formatting
  const handleSubmit = async () => {
    // Run validation synchronously before checking isValid
    validateForm();

    // Small delay to ensure state is updated
    await new Promise((resolve) => setTimeout(resolve, 50));

    if (!isValid) {
      console.log('❌ Form is not valid, cannot proceed');

      // Find the first error to show specific message
      const firstErrorKey = Object.keys(errors)[0];
      if (firstErrorKey) {
        const fieldName = firstErrorKey
          .replace(/([A-Z])/g, ' $1')
          .toLowerCase();
        setErrors((prev) => ({
          ...prev,
          submit: `Please complete the required field: ${fieldName}`,
        }));
      } else {
        setErrors((prev) => ({
          ...prev,
          submit: 'Please complete all required fields and agree to terms',
        }));
      }

      window.scrollTo(0, 0);
      return;
    }

    setIsSubmitting(true);
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors.submit;
      return newErrors;
    }); // Clear previous errors

    try {
      console.log('✅ UserRegistrationModule submitting data:', localData);

      // 🔥 CRITICAL FIX: Ensure primary user address is sent as OBJECT, not string
      const normalizedData = {
        ...localData,
        // Primary user address should be an object with separate fields
        address: {
          street: localData.address.street?.trim() || '',
          street2: localData.address.street2?.trim() || '',
          city: localData.address.city?.trim() || '',
          state: (localData.address.state?.trim() || '').toUpperCase(),
          zip: localData.address.zip?.trim() || '',
        },
        // Additional guardians should also have address as object
        additionalGuardians: localData.additionalGuardians.map((guardian) => ({
          ...guardian,
          // If using primary address, copy the normalized primary address
          address: guardian.usePrimaryAddress
            ? {
                street: localData.address.street?.trim() || '',
                street2: localData.address.street2?.trim() || '',
                city: localData.address.city?.trim() || '',
                state: (localData.address.state?.trim() || '').toUpperCase(),
                zip: localData.address.zip?.trim() || '',
              }
            : {
                // Otherwise use their own address as object
                street: guardian.address.street?.trim() || '',
                street2: guardian.address.street2?.trim() || '',
                city: guardian.address.city?.trim() || '',
                state: (guardian.address.state?.trim() || '').toUpperCase(),
                zip: guardian.address.zip?.trim() || '',
              },
        })),
        // Remove password confirm for backend
        confirmPassword: undefined,
      };

      console.log('📤 Normalized data for submission:', normalizedData);

      // Transform the data to match what Register.tsx expects
      const formDataToPass = {
        user: normalizedData,
      };

      console.log(
        '🔍 UserRegistrationModule - formDataToPass:',
        formDataToPass
      );

      // Pass the transformed data to the parent component
      onComplete?.(formDataToPass);
    } catch (error) {
      console.error('❌ Error in UserRegistrationModule:', error);
      setErrors((prev) => ({
        ...prev,
        submit:
          'Failed to save user information. Please check your address format and try again.',
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelAdditionalGuardian = () => {
    setShowAdditionalGuardian(false);
    setAdditionalGuardian({
      fullName: '',
      relationship: '',
      phone: '',
      email: '',
      address: { street: '', street2: '', city: '', state: '', zip: '' },
      isCoach: false,
      aauNumber: '',
      usePrimaryAddress: false,
    });
    setAdditionalGuardianErrors({});
    setIsAdditionalGuardianValid(false);

    // Clear any additional guardian errors
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors.additionalGuardian;
      return newErrors;
    });
  };

  // Determine if main CTA should be disabled
  const isMainCTADisabled = !isValid || isSubmitting || showAdditionalGuardian;

  return (
    <div className='card'>
      <div className='card-header bg-light'>
        <div className='d-flex align-items-center'>
          <span className='bg-white avatar avatar-sm me-2 text-gray-7 flex-shrink-0'>
            <i className='ti ti-user-shield fs-16' />
          </span>
          <h4 className='text-dark'>Parent/Guardian Information</h4>
        </div>
      </div>
      <div className='card-body'>
        {/* Show backend validation errors */}
        {errors.submit && (
          <div className='alert alert-danger mb-4'>
            <i className='ti ti-alert-circle me-2'></i>
            {errors.submit}
            <div className='mt-2 small'>
              Please ensure:
              <ul className='mb-0'>
                <li>State is a valid 2-letter code (e.g., WA, CA, NY)</li>
                <li>
                  ZIP code is in correct format (e.g., 98012 or 98012-1234)
                </li>
                <li>All address fields are properly filled</li>
              </ul>
            </div>
          </div>
        )}

        <GuardianRegistrationModule
          guardian={{
            fullName: localData.fullName,
            relationship: localData.relationship,
            phone: localData.phone,
            email: localData.email,
            address: localData.address,
            isCoach: localData.isCoach,
            aauNumber: localData.aauNumber,
          }}
          onGuardianChange={handleGuardianChange}
          isAdditional={false}
          errors={errors}
        />

        {/* Additional Guardians Section */}
        <div className='mt-4 mb-2'>
          <h5>Additional Guardians (Optional)</h5>
          <p className='text-muted'>
            Add other parents or guardians who should have access to this
            account.
          </p>
        </div>

        {localData.additionalGuardians.map((g, i) => (
          <div key={i} className='card'>
            <div className='card-body'>
              <div className='d-flex justify-content-between align-items-start'>
                <div>
                  <h6>{g.fullName}</h6>
                  <p className='mb-1'>
                    <strong>Email:</strong> {g.email}
                  </p>
                  <p className='mb-1'>
                    <strong>Relationship:</strong> {g.relationship}
                  </p>
                  {g.usePrimaryAddress && (
                    <p className='mb-1 text-success'>
                      <i className='ti ti-check me-1'></i>
                      Same address as primary guardian
                    </p>
                  )}
                </div>
                <button
                  type='button'
                  className='btn btn-sm btn-danger'
                  onClick={() => removeGuardian(i)}
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}

        {!showAdditionalGuardian ? (
          <div className='mt-3 mb-5'>
            <button
              type='button'
              className='btn btn-outline-primary'
              onClick={() => setShowAdditionalGuardian(true)}
            >
              + Add Another Guardian
            </button>
          </div>
        ) : (
          <div className='mb-3'>
            {errors.additionalGuardian && (
              <div className='alert alert-danger mb-3'>
                <i className='ti ti-alert-circle me-2'></i>
                {errors.additionalGuardian}
              </div>
            )}
            <GuardianRegistrationModule
              guardian={additionalGuardian}
              onGuardianChange={handleAdditionalGuardianChange}
              isAdditional={true}
              parentAddress={localData.address}
              showUsePrimaryAddress={true}
              errors={additionalGuardianErrors}
            />
            <div className='mb-5'>
              <button
                type='button'
                className='btn btn-primary me-2'
                onClick={addGuardian}
                disabled={!isAdditionalGuardianValid}
              >
                Add Guardian
              </button>
              <button
                type='button'
                className='btn btn-secondary'
                onClick={handleCancelAdditionalGuardian}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Terms and Conditions Section */}
        <div className='card'>
          <div className='card-header bg-light'>
            <div className='d-flex align-items-center'>
              <span className='bg-white avatar avatar-sm me-2 text-gray-7 flex-shrink-0'>
                <i className='ti ti-file-text fs-16' />
              </span>
              <h4 className='text-dark'>Terms and Conditions</h4>
            </div>
          </div>
          <div className='card-body'>
            <div className='row'>
              <div className='col-md-12'>
                <div className='mb-3'>
                  <label className='form-label'>
                    <input
                      type='checkbox'
                      name='agreeToTerms'
                      checked={localData.agreeToTerms}
                      onChange={handleChange}
                      required
                    />{' '}
                    By checking this box, you agree to the terms and conditions
                    outlined in the{' '}
                    <a href='#' data-bs-toggle='modal' data-bs-target='#waiver'>
                      Waiver
                    </a>
                  </label>
                  {errors.agreeToTerms && (
                    <div className='invalid-feedback d-block'>
                      {errors.agreeToTerms}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className='d-flex justify-content-end mt-4'>
          <button
            type='button'
            className='btn btn-primary'
            onClick={handleSubmit}
            disabled={isMainCTADisabled}
          >
            {isSubmitting ? (
              <>
                <span className='spinner-border spinner-border-sm me-2'></span>
                Processing...
              </>
            ) : (
              'Continue to Player Registration'
            )}
          </button>
        </div>

        {/* Helper text when CTA is disabled due to additional guardian form */}
        {showAdditionalGuardian && (
          <div className='alert alert-info mt-3'>
            <i className='ti ti-info-circle me-2'></i>
            Please complete or cancel the additional guardian form to continue.
          </div>
        )}
      </div>
    </div>
  );
};

export default UserRegistrationModule;
