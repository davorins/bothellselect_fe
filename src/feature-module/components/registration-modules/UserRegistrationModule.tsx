import React, {
  useState,
  useEffect,
  ChangeEvent,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import {
  UserRegistrationData,
  Guardian,
  Address,
  WizardStepCommonProps,
  TournamentSpecificConfig,
} from '../../../types/registration-types';
import GuardianRegistrationModule from './GuardianRegistrationModule';
import { formatPhoneNumber, validatePhoneNumber } from '../../../utils/phone';
import { useDynamicFormFields } from '../../hooks/useDynamicFormFields';

interface Props extends WizardStepCommonProps {
  isExistingUser?: boolean;
  initialData?: Partial<UserRegistrationData> | null;
  tournamentConfig?: TournamentSpecificConfig;
  registrationType?: 'tournament' | 'tryout' | 'training' | 'player';
  registrationYear?: number;
}

const UserRegistrationModule: React.FC<Props> = ({
  isExistingUser = false,
  initialData = null,
  onComplete,
  onBack,
  formData,
  updateFormData,
  onValidationChange,
  registrationType,
  registrationYear: propRegistrationYear,
}) => {
  const registrationYear = propRegistrationYear || new Date().getFullYear();

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

  // Use ref to track mounted state
  const isMounted = useRef(true);
  const validationTimeoutRef = useRef<NodeJS.Timeout>();

  // ── Dynamic form fields hook ────────────────────────────────────────────────
  const {
    getVisibleFields,
    validateField,
    loading: fieldsLoading,
  } = useDynamicFormFields('parent', { registrationYear });

  // Get visible fields based on current form data - memoized
  const visibleFields = useMemo(() => {
    const formDataForFields = {
      parentFullName: localData.fullName,
      relationship: localData.relationship,
      email: localData.email,
      phone: localData.phone,
      address: localData.address,
      city: localData.address.city,
      state: localData.address.state,
      zip: localData.address.zip,
      isCoach: localData.isCoach,
      aauNumber: localData.aauNumber,
    };
    return getVisibleFields(formDataForFields as any);
  }, [
    localData.fullName,
    localData.relationship,
    localData.email,
    localData.phone,
    localData.address,
    localData.address.city,
    localData.address.state,
    localData.address.zip,
    localData.isCoach,
    localData.aauNumber,
    getVisibleFields,
  ]);

  // Helper to check if a field is visible
  const isFieldVisible = useCallback(
    (fieldName: string) => {
      return visibleFields.some((f) => f.fieldName === fieldName);
    },
    [visibleFields],
  );

  // Helper to check if address section is visible
  const isAddressSectionVisible = useCallback(() => {
    return (
      isFieldVisible('address') ||
      isFieldVisible('city') ||
      isFieldVisible('state') ||
      isFieldVisible('zip')
    );
  }, [isFieldVisible]);

  // Address validation - only if address section is visible
  const validateAddress = useCallback(
    (address: Address): boolean => {
      if (!isAddressSectionVisible()) {
        return true;
      }

      if (!address.street?.trim()) return false;
      if (!address.city?.trim()) return false;
      if (!address.state?.trim()) return false;
      if (!/^[A-Z]{2}$/.test(address.state)) return false;
      if (!address.zip?.trim()) return false;
      if (!/^\d{5}(-\d{4})?$/.test(address.zip)) return false;
      return true;
    },
    [isAddressSectionVisible],
  );

  // Validate additional guardian form
  const validateAdditionalGuardian = useCallback(
    (guardian: Guardian): boolean => {
      const err: Record<string, string> = {};

      if (!guardian.fullName?.trim()) {
        err.fullName = 'Full name is required';
      }

      if (isFieldVisible('relationship') && !guardian.relationship?.trim()) {
        err.relationship = 'Relationship is required';
      }

      if (isFieldVisible('phone')) {
        if (!guardian.phone?.trim()) {
          err.phone = 'Phone number is required';
        } else if (!validatePhoneNumber(guardian.phone)) {
          err.phone = 'Please enter a valid 10-digit phone number';
        }
      }

      if (isFieldVisible('email')) {
        if (!guardian.email?.trim()) {
          err.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guardian.email)) {
          err.email = 'Please enter a valid email address';
        }
      }

      if (
        isAddressSectionVisible() &&
        !guardian.usePrimaryAddress &&
        !validateAddress(guardian.address)
      ) {
        err.address = 'Please enter a complete address';
      }

      // AAU number validation for additional guardians (if they are coaches)
      if (guardian.isCoach && !guardian.aauNumber?.trim()) {
        err.aauNumber = 'AAU number is required for coaches';
      }

      setAdditionalGuardianErrors(err);
      const isValid = Object.keys(err).length === 0;
      setIsAdditionalGuardianValid(isValid);
      return isValid;
    },
    [isFieldVisible, isAddressSectionVisible, validateAddress],
  );

  // Validation function - wrapped in useCallback with stable dependencies
  const validateForm = useCallback(() => {
    const err: Record<string, string> = {};

    // 1. Full Name - ALWAYS required
    if (!localData.fullName?.trim()) {
      err.fullName = 'Full name is required';
    }

    // 2. Dynamic fields - ONLY validate fields that are in visibleFields
    visibleFields.forEach((field) => {
      let value: any = null;

      switch (field.fieldName) {
        case 'parentFullName':
          value = localData.fullName;
          break;
        case 'relationship':
          value = localData.relationship;
          break;
        case 'email':
          value = localData.email;
          break;
        case 'phone':
          value = localData.phone;
          break;
        case 'address':
          value = localData.address?.street;
          break;
        case 'city':
          value = localData.address?.city;
          break;
        case 'state':
          value = localData.address?.state;
          break;
        case 'zip':
          value = localData.address?.zip;
          break;
        case 'isCoach':
          value = localData.isCoach;
          break;
        case 'aauNumber':
          value = localData.aauNumber;
          break;
        default:
          value = (localData as any)[field.fieldName];
      }

      const error = validateField(field, value);
      if (error) {
        if (field.fieldName === 'parentFullName') {
          err.fullName = error;
        } else if (field.fieldName === 'address') {
          err['address.street'] = error;
        } else if (field.fieldName === 'city') {
          err['address.city'] = error;
        } else if (field.fieldName === 'state') {
          err['address.state'] = error;
        } else if (field.fieldName === 'zip') {
          err['address.zip'] = error;
        } else {
          err[field.fieldName] = error;
        }
      }
    });

    // 3. Address validation - ONLY if address section is visible
    if (isAddressSectionVisible() && !validateAddress(localData.address)) {
      err.address = 'Please enter a complete address';
    }

    //4. AAU number validation (coach specific)
    if (localData.isCoach && !localData.aauNumber?.trim()) {
      err.aauNumber = 'AAU number is required for coaches';
    }

    // 5. Terms and conditions - ALWAYS required
    const registerType = (localData as any).registerType;
    const isSelfRegistration = !registerType || registerType === 'self';

    if (isSelfRegistration && !localData.agreeToTerms) {
      err.agreeToTerms = 'You must agree to the terms and conditions';
    }

    // 6. Additional guardians validation
    localData.additionalGuardians.forEach((g, i) => {
      const hasSignificantData =
        (g.fullName?.trim() && g.fullName.trim().length > 1) ||
        (g.email?.trim() && g.email.includes('@')) ||
        (g.phone?.trim() && g.phone.replace(/\D/g, '').length >= 10);

      if (hasSignificantData) {
        if (!g.fullName?.trim() || g.fullName.trim().length < 2) {
          err[`guardian${i}_fullName`] = 'Full name is required';
        }

        if (isFieldVisible('relationship') && !g.relationship?.trim()) {
          err[`guardian${i}_relationship`] = 'Relationship is required';
        }

        if (isFieldVisible('phone')) {
          if (!g.phone?.trim()) {
            err[`guardian${i}_phone`] = 'Phone number is required';
          } else if (!validatePhoneNumber(g.phone)) {
            err[`guardian${i}_phone`] =
              'Please enter a valid 10-digit phone number';
          }
        }

        if (isFieldVisible('email')) {
          if (!g.email?.trim()) {
            err[`guardian${i}_email`] = 'Email is required';
          } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(g.email)) {
            err[`guardian${i}_email`] = 'Please enter a valid email address';
          }
        }

        if (
          isAddressSectionVisible() &&
          !g.usePrimaryAddress &&
          !validateAddress(g.address)
        ) {
          err[`guardian${i}_address`] = 'Please enter a complete address';
        }
      }
    });

    setErrors(err);
    const formIsValid = Object.keys(err).length === 0;
    setIsValid(formIsValid);
    onValidationChange?.(formIsValid);

    return formIsValid;
  }, [
    localData,
    visibleFields,
    validateField,
    isAddressSectionVisible,
    validateAddress,
    isFieldVisible,
    onValidationChange,
  ]);

  // Debounced validation to prevent infinite loops
  useEffect(() => {
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }

    validationTimeoutRef.current = setTimeout(() => {
      if (isMounted.current) {
        validateForm();
      }
    }, 100);

    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, [
    localData.fullName,
    localData.relationship,
    localData.email,
    localData.phone,
    localData.address,
    localData.agreeToTerms,
    localData.additionalGuardians,
    localData.isCoach,
    localData.aauNumber,
    visibleFields,
    validateForm,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const checked = (e.target as any).checked;

    if (name === 'phone') {
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

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleGuardianChange = (guardian: Guardian) => {
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
    validateAdditionalGuardian(guardian);
  };

  const removeGuardian = (index: number) => {
    setLocalData((prev) => ({
      ...prev,
      additionalGuardians: prev.additionalGuardians.filter(
        (_, i) => i !== index,
      ),
    }));
  };

  // SINGLE BUTTON HANDLER - This is the key function
  const handleMainButtonClick = async () => {
    if (showAdditionalGuardian && !isAdditionalGuardianValid) {
      setErrors((prev) => ({
        ...prev,
        additionalGuardian:
          'Please complete all required fields for the additional guardian',
      }));
      document.getElementById('additional-guardian-form')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
      return;
    }

    let dataToSubmit = { ...localData };

    // === 1. Save Additional Guardian if form is open ===
    if (showAdditionalGuardian) {
      const isGuardianValid = validateAdditionalGuardian(additionalGuardian);

      if (!isGuardianValid) {
        setErrors((prev) => ({
          ...prev,
          additionalGuardian:
            'Please complete all required fields for the additional guardian',
        }));
        document.getElementById('additional-guardian-form')?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
        return;
      }

      const guardianToAdd = additionalGuardian.usePrimaryAddress
        ? {
            ...additionalGuardian,
            address: { ...localData.address },
          }
        : { ...additionalGuardian };

      // Add to our submission snapshot immediately
      dataToSubmit = {
        ...dataToSubmit,
        additionalGuardians: [
          ...dataToSubmit.additionalGuardians,
          guardianToAdd,
        ],
      };

      // Update real state for UI consistency
      setLocalData(dataToSubmit);

      // Reset additional guardian form
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

      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.additionalGuardian;
        return newErrors;
      });

      // Let React update state + run validation
      await new Promise((resolve) => setTimeout(resolve, 80));
    }

    // === 2. Validate the form (with possibly updated data) ===
    validateForm();

    await new Promise((resolve) => setTimeout(resolve, 60));

    if (!isValid) {
      const firstErrorKey = Object.keys(errors)[0];
      setErrors((prev) => ({
        ...prev,
        submit: firstErrorKey
          ? `Please complete the required field: ${firstErrorKey
              .replace(/([A-Z])/g, ' $1')
              .toLowerCase()}`
          : 'Please complete all required fields and agree to terms',
      }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // === 3. Submit ===
    setIsSubmitting(true);
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors.submit;
      return newErrors;
    });

    try {
      console.log(
        '✅ Submitting with guardians count:',
        dataToSubmit.additionalGuardians.length,
      );

      const dummyAddress = {
        street: '123 Main Street',
        street2: '',
        city: 'Seattle',
        state: 'WA',
        zip: '98101',
      };

      const normalizedData = {
        ...dataToSubmit,
        address: isAddressSectionVisible()
          ? {
              street: dataToSubmit.address.street?.trim() || '',
              street2: dataToSubmit.address.street2?.trim() || '',
              city: dataToSubmit.address.city?.trim() || '',
              state: (dataToSubmit.address.state?.trim() || '').toUpperCase(),
              zip: dataToSubmit.address.zip?.trim() || '',
            }
          : dummyAddress,

        additionalGuardians: dataToSubmit.additionalGuardians.map(
          (guardian) => ({
            ...guardian,
            address: guardian.usePrimaryAddress
              ? isAddressSectionVisible()
                ? {
                    street: dataToSubmit.address.street?.trim() || '',
                    street2: dataToSubmit.address.street2?.trim() || '',
                    city: dataToSubmit.address.city?.trim() || '',
                    state: (
                      dataToSubmit.address.state?.trim() || ''
                    ).toUpperCase(),
                    zip: dataToSubmit.address.zip?.trim() || '',
                  }
                : dummyAddress
              : {
                  street: guardian.address.street?.trim() || '',
                  street2: guardian.address.street2?.trim() || '',
                  city: guardian.address.city?.trim() || '',
                  state: (guardian.address.state?.trim() || '').toUpperCase(),
                  zip: guardian.address.zip?.trim() || '',
                },
          }),
        ),
      };

      console.log('📤 Final normalized data:', {
        guardiansCount: normalizedData.additionalGuardians.length,
        primaryGuardian: normalizedData.fullName,
      });

      onComplete?.({ user: normalizedData });
    } catch (error) {
      console.error('Error in UserRegistrationModule:', error);
      setErrors((prev) => ({
        ...prev,
        submit: 'Failed to save user information. Please try again.',
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
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors.additionalGuardian;
      return newErrors;
    });
  };

  const isMainCTADisabled =
    isSubmitting ||
    !isValid ||
    (showAdditionalGuardian && !isAdditionalGuardianValid);

  if (fieldsLoading) {
    return (
      <div className='card'>
        <div className='card-header bg-light'>
          <div className='d-flex align-items-center'>
            <span className='bg-white avatar avatar-sm me-2 text-gray-7 flex-shrink-0'>
              <i className='ti ti-loader fs-16' />
            </span>
            <h4 className='text-dark'>Parent/Guardian Information</h4>
          </div>
        </div>
        <div className='card-body text-center py-5'>
          <div className='spinner-border text-primary' role='status'>
            <span className='visually-hidden'>Loading...</span>
          </div>
          <p className='mt-3 text-muted'>Loading form configuration...</p>
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
          <h4 className='text-dark'>Parent/Guardian Information</h4>
        </div>
      </div>
      <div className='card-body'>
        {errors.submit && (
          <div className='alert alert-danger mb-4'>
            <i className='ti ti-alert-circle me-2'></i>
            {errors.submit}
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
          registrationYear={registrationYear}
          onValidationChange={() => {}}
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
          <div key={i} className='card mb-2'>
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
                      <i className='ti ti-check me-1'></i>Same address as
                      primary guardian
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
          <div id='additional-guardian-form' className='mb-3'>
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
              showUsePrimaryAddress={isAddressSectionVisible()}
              errors={additionalGuardianErrors}
              registrationYear={registrationYear}
            />
            <div className='mt-3'>
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
        <div className='card mt-4'>
          <div className='card-header bg-light'>
            <div className='d-flex align-items-center'>
              <span className='bg-white avatar avatar-sm me-2 text-gray-7 flex-shrink-0'>
                <i className='ti ti-file-text fs-16' />
              </span>
              <h4 className='text-dark'>Terms and Conditions</h4>
            </div>
          </div>
          <div className='card-body'>
            <div className='mb-3'>
              <label className='form-label'>
                <input
                  type='checkbox'
                  name='agreeToTerms'
                  checked={localData.agreeToTerms}
                  onChange={handleChange}
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

        {/* SINGLE BUTTON */}
        <div className='d-flex justify-content-end mt-4'>
          <button
            type='button'
            className='btn btn-primary btn-lg'
            onClick={handleMainButtonClick}
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

        {showAdditionalGuardian && (
          <div className='alert alert-info mt-3'>
            <i className='ti ti-info-circle me-2'></i>
            Fill in the additional guardian details above, then click "Continue
            to Player Registration" to save and proceed.
          </div>
        )}
      </div>
    </div>
  );
};

export default UserRegistrationModule;
