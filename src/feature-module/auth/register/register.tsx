import React, {
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
} from 'react';
import { useNavigate, Link } from 'react-router-dom';
import GuardianRegistrationModule from '../../components/registration-modules/GuardianRegistrationModule';
import TermsAndConditionsModule from '../../components/registration-modules/TermsAndConditionsModule';
import AccountCreationModule from '../../components/registration-modules/AccountCreationModule';
import EmailVerificationStep from '../../auth/emailVerification/emailVerificationStep';
import StepIndicator from '../../../components/common/StepIndicator';
import { Guardian, Address, Player } from '../../../types/registration-types';
import { useAuth } from '../../../context/AuthContext';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import { all_routes } from '../../router/all_routes';
import ImageWithBasePath from '../../../core/common/imageWithBasePath';
import { useDynamicFormFields } from '../../hooks/useDynamicFormFields';
import PlayerFormFields from '../../../components/forms/PlayerFormFields';
import GradeConfirmationBanner from '../../components/registration-modules/GradeConfirmationBanner';
import { commonHealthConditions } from '../../constants/healthConditions';

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
  tempAccount?: { email: string; password: string };
}

const parseHealthConcerns = (healthConcerns: string = '') => {
  const concerns = healthConcerns
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean);
  const selected = concerns
    .filter((c) => commonHealthConditions.some((hc) => hc.label === c))
    .map(
      (c) =>
        commonHealthConditions.find((hc) => hc.label === c) ?? {
          value: 'custom',
          label: c,
        },
    );
  const custom = concerns
    .filter((c) => !commonHealthConditions.some((hc) => hc.label === c))
    .join(', ');
  return { selected, custom, hasCustom: !!custom };
};

const Register = () => {
  const navigate = useNavigate();
  const routes = all_routes;
  const { createTempAccount, register, refreshAuthData } = useAuth();

  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const currentYear = new Date().getFullYear();

  type RegistrationStep =
    | 'account'
    | 'verifyEmail'
    | 'guardian'
    | 'players'
    | 'review'
    | 'success';

  const [currentStep, setCurrentStep] = useState<RegistrationStep>('account');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVerificationSent, setIsVerificationSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isLoadingUserData] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationTimestamp, setRegistrationTimestamp] = useState('');
  const [showPlayerChoice, setShowPlayerChoice] = useState(false);

  // ── FIX 1: agreeToTerms as its own state, NOT nested inside formData ──────────
  // When agreeToTerms lives inside formData, React batches the setFormData call
  // and the disabled check on the button may read a stale closure value.
  // A top-level useState gives a direct, always-current reference.
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [guardianData, setGuardianData] = useState<Guardian>({
    fullName: '',
    relationship: '',
    phone: '',
    email: '',
    address: { street: '', street2: '', city: '', state: '', zip: '' },
    isCoach: false,
    aauNumber: '',
  });

  const [players, setPlayers] = useState<Player[]>([]);

  // ── FIX 2: gradeConfirmed stored in a ref as well as state ───────────────────
  // The pre-submit validation loop reads gradeConfirmed from the closure captured
  // when handleSubmit was defined. If the user confirms a grade between renders,
  // the stale closure sees the old gradeConfirmed object and incorrectly blocks
  // player 2+. Keeping a ref in sync gives handleSubmit always-current data.
  const [gradeConfirmed, setGradeConfirmed] = useState<Record<number, boolean>>(
    {},
  );
  const gradeConfirmedRef = useRef<Record<number, boolean>>({});

  const setGradeConfirmedSync = useCallback(
    (updater: (prev: Record<number, boolean>) => Record<number, boolean>) => {
      setGradeConfirmed((prev) => {
        const next = updater(prev);
        gradeConfirmedRef.current = next;
        return next;
      });
    },
    [],
  );

  const [playerHealthConditions, setPlayerHealthConditions] = useState<
    Record<number, any[]>
  >({});
  const [playerCustomConditions, setPlayerCustomConditions] = useState<
    Record<number, string>
  >({});
  const [playerShowCustomInput, setPlayerShowCustomInput] = useState<
    Record<number, boolean>
  >({});
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [guardianValidationErrors, setGuardianValidationErrors] = useState<
    Record<string, string>
  >({});

  const {
    getVisibleFields,
    validateField,
    processFieldValue,
    loading: fieldsLoading,
  } = useDynamicFormFields('player', { registrationYear: currentYear });

  const { getVisibleFields: getGuardianVisibleFields } = useDynamicFormFields(
    'parent',
    { registrationYear: currentYear },
  );

  const steps = useMemo(
    () => [
      { id: 'account', label: 'Account', number: 1, icon: 'ti ti-user-plus' },
      {
        id: 'verifyEmail',
        label: 'Verify Email',
        number: 2,
        icon: 'ti ti-mail-check',
      },
      {
        id: 'guardian',
        label: 'Guardian Info',
        number: 3,
        icon: 'ti ti-user-shield',
      },
      { id: 'players', label: 'Player Info', number: 4, icon: 'ti ti-users' },
      { id: 'review', label: 'Review', number: 5, icon: 'ti ti-checklist' },
    ],
    [],
  );

  const createNewPlayer = useCallback(
    (): Player => ({
      fullName: '',
      gender: '',
      dob: '',
      schoolName: '',
      healthConcerns: '',
      aauNumber: '',
      registrationYear: currentYear,
      season: 'Partizan Team',
      grade: '',
    }),
    [currentYear],
  );

  useEffect(() => {
    players.forEach((player, index) => {
      if (playerHealthConditions[index] === undefined) {
        const { selected, custom, hasCustom } = parseHealthConcerns(
          player.healthConcerns,
        );
        setPlayerHealthConditions((prev) => ({ ...prev, [index]: selected }));
        setPlayerCustomConditions((prev) => ({ ...prev, [index]: custom }));
        setPlayerShowCustomInput((prev) => ({ ...prev, [index]: hasCustom }));
      }
    });
  }, [players.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const updatePlayerHealthConcerns = useCallback(
    (index: number, conditions: any[], custom: string, showCustom: boolean) => {
      const labels = conditions
        .filter((c) => c.value !== 'custom')
        .map((c) => c.label);
      let healthConcerns = labels.join(', ');
      if (custom.trim() && showCustom) {
        healthConcerns = healthConcerns
          ? `${healthConcerns}, ${custom.trim()}`
          : custom.trim();
      }
      setPlayers((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], healthConcerns };
        return updated;
      });
    },
    [],
  );

  const handlePlayerConditionChange = (index: number, selected: any) => {
    const arr = selected ? [...selected] : [];
    const hasCustom = arr.some((c: any) => c.value === 'custom');
    setPlayerHealthConditions((prev) => ({ ...prev, [index]: arr }));
    setPlayerShowCustomInput((prev) => ({ ...prev, [index]: hasCustom }));
    updatePlayerHealthConcerns(
      index,
      arr,
      playerCustomConditions[index] || '',
      hasCustom,
    );
  };

  const handlePlayerCustomConditionChange = (index: number, value: string) => {
    setPlayerCustomConditions((prev) => ({ ...prev, [index]: value }));
    updatePlayerHealthConcerns(
      index,
      playerHealthConditions[index] || [],
      value,
      playerShowCustomInput[index] || false,
    );
  };

  const handlePlayerChange = useCallback(
    (index: number, field: keyof Player, value: string) => {
      if (field === 'dob') {
        // Reset grade confirmation when DOB changes so auto-calculated grade
        // needs re-confirming — but only if grade will be recalculated.
        setGradeConfirmedSync((prev) => ({ ...prev, [index]: false }));
        setValidationErrors((prev) => {
          const n = { ...prev };
          delete n[`player${index}_grade`];
          delete n[`player${index}_gradeConfirmation`];
          return n;
        });
      }

      setPlayers((prevPlayers) => {
        const updated = [...prevPlayers];
        const updatedPlayer = { ...updated[index], [field]: value };

        const tempFormData = { ...updatedPlayer, [field]: value };
        const visibleFields = getVisibleFields(tempFormData);
        const isDobEnabled = visibleFields.some(
          (f) => f.fieldName === 'dob' && f.isEnabled === true,
        );

        if (
          field === 'dob' &&
          value &&
          !updatedPlayer.isGradeOverridden &&
          isDobEnabled
        ) {
          const dobFormData = { ...updatedPlayer, dob: value };
          const dobVisibleFields = getVisibleFields(dobFormData);

          dobVisibleFields.forEach((f) => {
            if (f.fieldName === 'grade' || f.fieldName === 'age') {
              const calculatedValue = processFieldValue(f, dobFormData, {
                registrationYear: currentYear,
              });
              if (calculatedValue !== undefined) {
                if (f.fieldName === 'age') {
                  updatedPlayer.age = calculatedValue as number;
                } else if (f.fieldName === 'grade') {
                  updatedPlayer.grade = calculatedValue as string;
                  // Auto-confirm grade calculated from DOB
                  setGradeConfirmedSync((prev) => ({ ...prev, [index]: true }));
                }
              }
            }
          });
        }

        // ── FIX 3: Auto-confirm grade on manual selection ─────────────────────
        // In the original code, handlePlayerChange set isGradeOverridden=true
        // and gradeConfirmed=true for manual grade entry. But GradeConfirmationBanner
        // also requires an explicit "Confirm" button click, which resets
        // gradeConfirmed back to false via onAdjust. This created a race where
        // player 2's grade was set but not "confirmed" in the banner's view,
        // causing validateAllPlayers to fail and bail out before the API call.
        // Solution: mark grade confirmed immediately on any grade field change
        // so players don't need to click a separate confirm button.
        if (field === 'grade' && value) {
          updatedPlayer.isGradeOverridden = true;
          setGradeConfirmedSync((prev) => ({ ...prev, [index]: true }));
        }

        updated[index] = updatedPlayer;
        return updated;
      });

      setValidationErrors((prev) => {
        if (
          !prev[`player${index}_${field}`] &&
          !prev[`player${index}_gradeConfirmation`]
        )
          return prev;
        const n = { ...prev };
        delete n[`player${index}_${field}`];
        delete n[`player${index}_gradeConfirmation`];
        return n;
      });
    },
    [getVisibleFields, processFieldValue, currentYear, setGradeConfirmedSync],
  );

  const handleGradeOverride = (index: number) => {
    setPlayers((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], isGradeOverridden: true };
      return updated;
    });
    // Keep confirmed=true when overriding so validation doesn't block
    setGradeConfirmedSync((prev) => ({ ...prev, [index]: true }));
  };

  // ── FIX 4: Remove players.length from useCallback deps ───────────────────────
  // players.length in the dep array caused handleAddAnotherPlayer to get a new
  // reference on every add, which is harmless but unnecessary. More importantly,
  // the functional setPlayers update already has access to the latest state.
  const handleAddAnotherPlayer = useCallback(() => {
    const newPlayer = createNewPlayer();
    setPlayers((prev) => [...prev, newPlayer]);
  }, [createNewPlayer]);

  const removePlayer = (index: number) => {
    setPlayers((prev) => {
      const updated = [...prev];
      updated.splice(index, 1);
      return updated;
    });
    setPlayerHealthConditions((prev) => {
      const n = { ...prev };
      delete n[index];
      return n;
    });
    setPlayerCustomConditions((prev) => {
      const n = { ...prev };
      delete n[index];
      return n;
    });
    setPlayerShowCustomInput((prev) => {
      const n = { ...prev };
      delete n[index];
      return n;
    });
    setGradeConfirmedSync((prev) => {
      const n = { ...prev };
      delete n[index];
      return n;
    });
    setValidationErrors((prev) => {
      const n = { ...prev };
      Object.keys(n).forEach((key) => {
        if (key.startsWith(`player${index}`)) delete n[key];
      });
      return n;
    });
  };

  const validateGuardianFields = useCallback((): boolean => {
    const errors: Record<string, string> = {};
    let isValid = true;

    const formDataForVisibility = {
      guardianFullName: guardianData.fullName,
      relationship: guardianData.relationship,
      email: guardianData.email,
      phone: guardianData.phone,
      address: guardianData.address,
      city: guardianData.address?.city,
      state: guardianData.address?.state,
      zip: guardianData.address?.zip,
      isCoach: guardianData.isCoach,
      aauNumber: guardianData.aauNumber,
    };

    const visibleFields = getGuardianVisibleFields(
      formDataForVisibility as any,
    );
    const isFieldVisible = (fieldName: string) =>
      visibleFields.some((f) => f.fieldName === fieldName);

    if (!guardianData.fullName.trim()) {
      errors.fullName = 'Full name is required';
      isValid = false;
    }

    if (isFieldVisible('relationship') && !guardianData.relationship.trim()) {
      errors.relationship = 'Relationship is required';
      isValid = false;
    }

    if (isFieldVisible('phone')) {
      if (!guardianData.phone.trim()) {
        errors.phone = 'Phone number is required';
        isValid = false;
      } else if (guardianData.phone.replace(/\D/g, '').length !== 10) {
        errors.phone = 'Please enter a valid 10-digit phone number';
        isValid = false;
      }
    }

    const isAddressVisible =
      isFieldVisible('address') ||
      isFieldVisible('city') ||
      isFieldVisible('state') ||
      isFieldVisible('zip');

    if (isAddressVisible) {
      if (!guardianData.address?.street?.trim()) {
        errors['address.street'] = 'Street address is required';
        isValid = false;
      }
      if (!guardianData.address?.city?.trim()) {
        errors['address.city'] = 'City is required';
        isValid = false;
      }
      if (!guardianData.address?.state?.trim()) {
        errors['address.state'] = 'State is required';
        isValid = false;
      } else if (guardianData.address.state.length !== 2) {
        errors['address.state'] = 'State must be 2 letters';
        isValid = false;
      }
      if (!guardianData.address?.zip?.trim()) {
        errors['address.zip'] = 'ZIP code is required';
        isValid = false;
      } else if (!/^\d{5}(-\d{4})?$/.test(guardianData.address.zip)) {
        errors['address.zip'] = 'Invalid ZIP code';
        isValid = false;
      }
    }

    if (
      guardianData.isCoach &&
      (!guardianData.aauNumber || !guardianData.aauNumber.trim())
    ) {
      errors.aauNumber = 'AAU Number is required for coaches';
      isValid = false;
    }

    setGuardianValidationErrors(errors);
    return isValid;
  }, [guardianData, getGuardianVisibleFields]);

  const isGuardianFormValid = useMemo(() => {
    const formDataForVisibility = {
      guardianFullName: guardianData.fullName,
      relationship: guardianData.relationship,
      email: guardianData.email,
      phone: guardianData.phone,
      address: guardianData.address,
      city: guardianData.address?.city,
      state: guardianData.address?.state,
      zip: guardianData.address?.zip,
      isCoach: guardianData.isCoach,
      aauNumber: guardianData.aauNumber,
    };

    const visibleFields = getGuardianVisibleFields(
      formDataForVisibility as any,
    );
    const isFieldVisible = (fieldName: string) =>
      visibleFields.some((f) => f.fieldName === fieldName);
    const isAddressVisible =
      isFieldVisible('address') ||
      isFieldVisible('city') ||
      isFieldVisible('state') ||
      isFieldVisible('zip');

    if (!guardianData.fullName.trim()) return false;
    if (isFieldVisible('relationship') && !guardianData.relationship.trim())
      return false;
    if (isFieldVisible('phone')) {
      if (!guardianData.phone.trim()) return false;
      if (guardianData.phone.replace(/\D/g, '').length !== 10) return false;
    }
    if (isAddressVisible) {
      if (!guardianData.address?.street?.trim()) return false;
      if (!guardianData.address?.city?.trim()) return false;
      if (!guardianData.address?.state?.trim()) return false;
      if (guardianData.address.state.length !== 2) return false;
      if (!guardianData.address?.zip?.trim()) return false;
      if (!/^\d{5}(-\d{4})?$/.test(guardianData.address.zip)) return false;
    }
    if (
      guardianData.isCoach &&
      (!guardianData.aauNumber || !guardianData.aauNumber.trim())
    )
      return false;

    return true;
  }, [guardianData, getGuardianVisibleFields]);

  // ── FIX 5: validateAllPlayers reads gradeConfirmedRef (always current) ────────
  // The original read gradeConfirmed from the useCallback closure, which could
  // be stale when the user had confirmed a grade between the callback creation
  // and invocation. The ref is always up-to-date regardless of closure age.
  const validateAllPlayers = useCallback((): boolean => {
    const errors: Record<string, string> = {};
    let isValid = true;
    const confirmedSnapshot = gradeConfirmedRef.current;

    players.forEach((player, index) => {
      const visibleFields = getVisibleFields(player);

      visibleFields.forEach((field) => {
        if (!field.isEnabled) return;
        if (!field.isRequired) {
          const val = player[field.fieldName as keyof Player];
          if (!val || (typeof val === 'string' && !val.trim())) return;
        }
        const value = player[field.fieldName as keyof Player];
        const error = validateField(field, value);
        if (error) {
          errors[`player${index}_${field.fieldName}`] = error;
          isValid = false;
        }
      });

      const gradeField = visibleFields.find((f) => f.fieldName === 'grade');
      if (gradeField && gradeField.isEnabled) {
        if (!player.grade || !player.grade.trim()) {
          errors[`player${index}_grade`] = 'Grade is required';
          isValid = false;
        } else if (!confirmedSnapshot[index]) {
          errors[`player${index}_gradeConfirmation`] =
            'Please confirm the grade is correct';
          isValid = false;
        }
      }
    });

    setValidationErrors(errors);
    return isValid;
  }, [players, getVisibleFields, validateField]);
  // NOTE: gradeConfirmedRef intentionally omitted from deps — it's a ref.

  const isPlayersFormValid = useMemo(() => {
    if (players.length === 0) return true;
    const confirmedSnapshot = gradeConfirmedRef.current;
    return players.every((player, index) => {
      const visibleFields = getVisibleFields(player);
      for (const field of visibleFields) {
        if (!field.isEnabled) continue;
        if (field.isRequired) {
          const value = player[field.fieldName as keyof Player];
          if (!value || (typeof value === 'string' && !value.trim()))
            return false;
        }
      }
      const gradeField = visibleFields.find((f) => f.fieldName === 'grade');
      if (gradeField && gradeField.isEnabled) {
        const hasGrade = player.grade && player.grade.trim().length > 0;
        if (!hasGrade || !confirmedSnapshot[index]) return false;
      }
      return true;
    });
  }, [players, gradeConfirmed, getVisibleFields]);
  // gradeConfirmed (state) kept in deps so useMemo re-runs when confirmed changes

  const handleGuardianComplete = useCallback(() => {
    const isValid = validateGuardianFields();
    if (isValid) {
      setFormError(null);
      setShowPlayerChoice(true);
    } else {
      setFormError('Please complete all required fields');
      window.scrollTo(0, 0);
    }
  }, [validateGuardianFields]);

  useEffect(() => {
    if (currentStep === 'guardian' && !showPlayerChoice && formData.email) {
      if (guardianData.email !== formData.email) {
        setGuardianData((prev) => ({ ...prev, email: formData.email }));
      }
    }
  }, [currentStep, showPlayerChoice, formData.email, guardianData.email]);

  const handleStepClick = useCallback(
    (stepId: string) => {
      const stepIndex = steps.findIndex((s) => s.id === stepId);
      const currentIndex = steps.findIndex((s) => s.id === currentStep);
      if (stepIndex <= currentIndex) setCurrentStep(stepId as RegistrationStep);
    },
    [steps, currentStep],
  );

  const handleAccountCreated = useCallback(
    async ({ email, password }: { email: string; password: string }) => {
      setIsProcessing(true);
      setFormError(null);
      try {
        localStorage.setItem('pendingEmail', email);
        await createTempAccount(email, password);
        if (isMounted.current) {
          setFormData((prev) => ({
            ...prev,
            email,
            password,
            tempAccount: { email, password },
          }));
          setIsVerificationSent(true);
          setCurrentStep('verifyEmail');
        }
      } catch (error: any) {
        if (isMounted.current) {
          let msg = 'Failed to create account';
          if (
            error.message?.includes('network') ||
            error.code === 'ERR_NETWORK'
          )
            msg = 'Network error: Please check your connection.';
          else if (error.message?.includes('already exists'))
            msg = 'Email already registered. Please sign in.';
          else if (error.message) msg = error.message;
          setFormError(msg);
        }
      } finally {
        if (isMounted.current) setIsProcessing(false);
      }
    },
    [createTempAccount],
  );

  const handleVerified = useCallback(() => {
    setCurrentStep('guardian');
    setShowPlayerChoice(false);
  }, []);

  const handleBack = useCallback(() => {
    switch (currentStep) {
      case 'verifyEmail':
        setCurrentStep('account');
        break;
      case 'guardian':
        setShowPlayerChoice(false);
        setCurrentStep('verifyEmail');
        break;
      case 'players':
        setCurrentStep('guardian');
        break;
      case 'review':
        setCurrentStep('players');
        break;
    }
  }, [currentStep]);

  const handleGuardianChange = useCallback((updated: Guardian) => {
    setGuardianData(updated);
  }, []);

  const handleSkipPlayers = useCallback(() => {
    setShowPlayerChoice(false);
    setCurrentStep('review');
  }, []);

  const handleAddPlayers = useCallback(() => {
    setShowPlayerChoice(false);
    setCurrentStep('players');
    if (players.length === 0) {
      setPlayers([createNewPlayer()]);
    }
  }, [createNewPlayer, players.length]);

  const handlePlayersContinue = useCallback(() => {
    if (validateAllPlayers()) {
      setFormError(null);
      setCurrentStep('review');
    } else {
      setFormError('Please complete all required player information');
      window.scrollTo(0, 0);
    }
  }, [validateAllPlayers]);

  // ── FIX 1 handler: update the separate agreeToTerms state ────────────────────
  const handleAgreeToTermsChange = useCallback((agree: boolean) => {
    setAgreeToTerms(agree);
  }, []);

  // ── handleSubmit ──────────────────────────────────────────────────────────────
  // Key fixes vs original:
  // 1. Reads agreeToTerms from the dedicated state (never stale).
  // 2. Reads gradeConfirmedRef.current for the validation loop so stale
  //    closures can't cause player 2+ to be incorrectly blocked.
  // 3. Removed the token polling loop — register() must set the token before
  //    returning; if it doesn't, that's a bug in register() to fix there.
  //    The polling loop was masking that and adding 0–7.5 s of latency.
  // 4. Removed the 1-second delay between player registrations — sequential
  //    awaits already prevent race conditions; the delay only hurts UX.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!agreeToTerms) {
      setFormError('Please agree to the terms and conditions');
      window.scrollTo(0, 0);
      return;
    }

    if (!validateGuardianFields()) {
      setFormError('Please complete all required guardian information');
      window.scrollTo(0, 0);
      return;
    }

    const playersToRegister = players.filter(
      (p) => p.fullName && p.fullName.trim().length > 0,
    );

    // Validate all players using the ref so we always see confirmed grades
    const confirmedSnapshot = gradeConfirmedRef.current;
    if (playersToRegister.length > 0) {
      for (let i = 0; i < playersToRegister.length; i++) {
        const player = playersToRegister[i];
        const originalIndex = players.findIndex((p) => p === player);

        if (!player.gender) {
          setFormError(`Please select a gender for ${player.fullName}`);
          window.scrollTo(0, 0);
          return;
        }
        if (!player.grade || !player.grade.trim()) {
          setFormError(`Please select a grade for ${player.fullName}`);
          window.scrollTo(0, 0);
          return;
        }
        if (!confirmedSnapshot[originalIndex]) {
          setFormError(
            `Please confirm the grade for ${player.fullName} (Player ${i + 1})`,
          );
          window.scrollTo(0, 0);
          return;
        }
      }
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const formDataForVisibility = {
        guardianFullName: guardianData.fullName,
        relationship: guardianData.relationship,
        email: guardianData.email,
        phone: guardianData.phone,
        address: guardianData.address,
        city: guardianData.address?.city,
        state: guardianData.address?.state,
        zip: guardianData.address?.zip,
        isCoach: guardianData.isCoach,
        aauNumber: guardianData.aauNumber,
      };

      const visibleFields = getGuardianVisibleFields(
        formDataForVisibility as any,
      );
      const isAddressVisible = visibleFields.some(
        (f) =>
          f.fieldName === 'address' ||
          f.fieldName === 'city' ||
          f.fieldName === 'state' ||
          f.fieldName === 'zip',
      );

      const addressObject = isAddressVisible
        ? {
            street: guardianData.address?.street || '',
            street2: guardianData.address?.street2 || '',
            city: guardianData.address?.city || '',
            state: guardianData.address?.state || '',
            zip: guardianData.address?.zip || '',
          }
        : {
            street: '123 Main Street',
            street2: '',
            city: 'Seattle',
            state: 'WA',
            zip: '98101',
          };

      const registeredParent = await register(
        formData.email.trim(),
        formData.password.trim(),
        guardianData.fullName.trim(),
        guardianData.phone.replace(/\D/g, ''),
        addressObject,
        guardianData.relationship.trim(),
        guardianData.isCoach,
        guardianData.aauNumber || '',
        agreeToTerms,
      );

      console.log('✅ Parent registered:', registeredParent._id);

      // ── FIX 6: Get token from register() return value, not polling ────────────
      // register() should return the token or set it in localStorage before
      // resolving. We read it directly rather than polling.
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error(
          'Authentication token not available after registration. Please try again.',
        );
      }

      // Register players sequentially — no artificial delay needed
      if (playersToRegister.length > 0) {
        console.log(`📝 Registering ${playersToRegister.length} player(s)...`);

        for (let i = 0; i < playersToRegister.length; i++) {
          const player = playersToRegister[i];
          console.log(
            `  Player ${i + 1}/${playersToRegister.length}: ${player.fullName}`,
          );

          const playerData = {
            fullName: player.fullName.trim(),
            gender: player.gender,
            dob: player.dob || null,
            schoolName: player.schoolName?.trim() || '',
            healthConcerns: player.healthConcerns || '',
            aauNumber: player.aauNumber || '',
            registrationYear: currentYear,
            season: 'Partizan Team',
            parentId: registeredParent._id,
            grade: player.grade,
            isGradeOverridden: player.isGradeOverridden || false,
            skipSeasonRegistration: true,
          };

          const response = await fetch(
            `${process.env.REACT_APP_API_BASE_URL}/players/register`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(playerData),
            },
          );

          const data = await response.json();

          if (!response.ok) {
            throw new Error(
              data.error || `Failed to register ${player.fullName}`,
            );
          }

          console.log(
            `  ✅ ${player.fullName} registered (ID: ${data.player?._id})`,
          );
        }

        console.log(`✅ All ${playersToRegister.length} player(s) registered.`);
      }

      localStorage.removeItem('pendingEmail');
      await refreshAuthData();

      setRegistrationTimestamp(new Date().toLocaleString());
      setCurrentStep('success');
    } catch (error: any) {
      console.error('❌ Registration error:', error);
      setFormError(error.message || 'Registration failed. Please try again.');
      window.scrollTo(0, 0);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleComplete = useCallback(() => {
    navigate(routes.adminDashboard);
  }, [navigate, routes.adminDashboard]);

  const handleAddMorePlayers = useCallback(() => {
    setCurrentStep('players');
    handleAddAnotherPlayer();
  }, [handleAddAnotherPlayer]);

  const renderStepContent = () => {
    switch (currentStep) {
      case 'account':
        return <AccountCreationModule onComplete={handleAccountCreated} />;

      case 'verifyEmail':
        return (
          <EmailVerificationStep
            email={formData.email || localStorage.getItem('pendingEmail') || ''}
            onVerified={handleVerified}
            onBack={handleBack}
            isVerificationSent={isVerificationSent}
          />
        );

      case 'guardian':
        if (showPlayerChoice) {
          return (
            <div className='card mb-4'>
              <div className='card-header bg-light'>
                <div className='d-flex align-items-center'>
                  <span className='bg-white avatar avatar-sm me-2 text-gray-7 flex-shrink-0'>
                    <i className='ti ti-users fs-16' />
                  </span>
                  <h4 className='text-dark'>Add Players Now?</h4>
                </div>
              </div>
              <div className='card-body'>
                <div className='text-center py-4'>
                  <i className='ti ti-user-question fs-1 text-primary mb-3'></i>
                  <h3>Would you like to add players to your account?</h3>
                  <p className='text-muted'>
                    You can add players now or add them later from your
                    dashboard.
                  </p>
                  <div className='row mt-4'>
                    <div className='col-md-6 mb-3'>
                      <div className='card h-100 border-success border-2'>
                        <div className='card-body text-center d-flex flex-column'>
                          <i className='ti ti-user-plus fs-1 text-success mb-3'></i>
                          <h4 className='text-success'>Add Players Now</h4>
                          <p className='text-muted small'>
                            Add player information now to save time for future
                            registrations
                          </p>
                          <div className='mt-auto'>
                            <button
                              type='button'
                              className='btn btn-success w-100'
                              onClick={handleAddPlayers}
                            >
                              <i className='ti ti-plus me-2'></i>Add Players Now
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className='col-md-6 mb-3'>
                      <div className='card h-100 border-primary border-2'>
                        <div className='card-body text-center d-flex flex-column'>
                          <i className='ti ti-clock fs-1 text-primary mb-3'></i>
                          <h4 className='text-primary'>Add Later</h4>
                          <p className='text-muted small'>
                            Skip for now and add players from your dashboard
                            later
                          </p>
                          <div className='mt-auto'>
                            <button
                              type='button'
                              className='btn btn-outline-primary w-100'
                              onClick={handleSkipPlayers}
                            >
                              <i className='ti ti-arrow-right me-2'></i>Continue
                              to Review
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        }

        return (
          <div className='card mb-4'>
            <div className='card-header bg-light'>
              <div className='d-flex align-items-center'>
                <span className='bg-white avatar avatar-sm me-2 text-gray-7 flex-shrink-0'>
                  <i className='ti ti-user-shield fs-16' />
                </span>
                <h4 className='text-dark'>Guardian Information</h4>
              </div>
            </div>
            <div className='card-body'>
              <GuardianRegistrationModule
                guardian={guardianData}
                onGuardianChange={handleGuardianChange}
                isAdditional={false}
                errors={guardianValidationErrors}
                isEmailReadOnly={true}
                emailLabel='Email (from account)'
              />
              <div className='d-flex justify-content-between align-items-center mt-4'>
                <button
                  type='button'
                  className={`btn ${isGuardianFormValid ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={handleGuardianComplete}
                  disabled={!isGuardianFormValid}
                  style={{ marginLeft: 'auto' }}
                >
                  Continue <i className='ti ti-arrow-right ms-2'></i>
                </button>
              </div>
            </div>
          </div>
        );

      case 'players':
        if (fieldsLoading) {
          return (
            <div className='card mb-4'>
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
          <div className='card mb-4'>
            <div className='card-header bg-light'>
              <div className='d-flex align-items-center'>
                <span className='bg-white avatar avatar-sm me-2 text-gray-7 flex-shrink-0'>
                  <i className='ti ti-users fs-16' />
                </span>
                <h4 className='text-dark'>Player Registration (Optional)</h4>
              </div>
            </div>
            <div className='card-body'>
              <p className='text-muted mb-4'>
                You can register players now or add them later from your
                dashboard.
              </p>

              {players.map((player, index) => {
                const visibleFields = getVisibleFields(player);
                const playerErrors = Object.fromEntries(
                  Object.entries(validationErrors)
                    .filter(([key]) => key.startsWith(`player${index}_`))
                    .map(([key, value]) => [
                      key.replace(`player${index}_`, ''),
                      value,
                    ]),
                );

                return (
                  <div
                    key={index}
                    className='player-form-section mb-4 border-bottom pb-4'
                  >
                    {players.length > 1 && (
                      <div className='d-flex justify-content-between align-items-center mb-3'>
                        <h6 className='text-primary'>Player {index + 1}</h6>
                        <button
                          type='button'
                          className='btn btn-sm btn-outline-danger'
                          onClick={() => removePlayer(index)}
                        >
                          Remove Player
                        </button>
                      </div>
                    )}

                    <PlayerFormFields
                      player={player}
                      onChange={(field, value) =>
                        handlePlayerChange(index, field, value)
                      }
                      visibleFields={visibleFields}
                      errors={playerErrors}
                      selectedConditions={playerHealthConditions[index] || []}
                      onConditionsChange={(selected) =>
                        handlePlayerConditionChange(index, selected)
                      }
                      showCustomConditionInput={
                        playerShowCustomInput[index] || false
                      }
                      customCondition={playerCustomConditions[index] || ''}
                      onCustomConditionChange={(value) =>
                        handlePlayerCustomConditionChange(index, value)
                      }
                      currentYear={currentYear}
                      isGradeOverridden={player.isGradeOverridden}
                      onGradeOverride={(overridden) => {
                        setPlayers((prev) => {
                          const updated = [...prev];
                          updated[index] = {
                            ...updated[index],
                            isGradeOverridden: overridden,
                          };
                          return updated;
                        });
                      }}
                      gradeSlot={
                        <div className='mb-3'>
                          <GradeConfirmationBanner
                            playerIndex={index}
                            player={player}
                            gradeConfirmed={gradeConfirmed[index] ?? false}
                            onConfirm={() =>
                              setGradeConfirmedSync((prev) => ({
                                ...prev,
                                [index]: true,
                              }))
                            }
                            onAdjust={() => handleGradeOverride(index)}
                            onChange={(val) =>
                              handlePlayerChange(index, 'grade', val)
                            }
                            validationError={
                              validationErrors[
                                `player${index}_gradeConfirmation`
                              ] || validationErrors[`player${index}_grade`]
                            }
                          />
                        </div>
                      }
                    />
                  </div>
                );
              })}

              <div className='mt-3'>
                <button
                  type='button'
                  className='btn btn-outline-primary'
                  onClick={handleAddAnotherPlayer}
                >
                  <i className='ti ti-plus me-2'></i>Add Another Player
                </button>
              </div>

              <div className='d-flex justify-content-between align-items-center mt-4'>
                <button
                  type='button'
                  className={`btn ${
                    players.length === 0 || isPlayersFormValid
                      ? 'btn-primary'
                      : 'btn-secondary'
                  }`}
                  onClick={handlePlayersContinue}
                  disabled={players.length > 0 && !isPlayersFormValid}
                  style={{ marginLeft: 'auto' }}
                >
                  Continue to Review <i className='ti ti-arrow-right ms-2'></i>
                </button>
              </div>
            </div>
          </div>
        );

      case 'review':
        return (
          // ── FIX 7: form wraps only the review card; submit button reads ────────
          // the dedicated agreeToTerms state so it's never stale-disabled.
          <form onSubmit={handleSubmit}>
            <div className='card mb-4'>
              <div className='card-header bg-light'>
                <div className='d-flex align-items-center'>
                  <span className='bg-white avatar avatar-sm me-2 text-gray-7 flex-shrink-0'>
                    <i className='ti ti-checklist fs-16' />
                  </span>
                  <h4 className='text-dark'>Review Information</h4>
                </div>
              </div>
              <div className='card-body'>
                <div className='row'>
                  <div className='col-md-6'>
                    <h5>Account Information</h5>
                    <p>
                      <strong>Email:</strong> {formData.email}
                    </p>
                  </div>
                  <div className='col-md-6'>
                    <h5>Guardian Information</h5>
                    <p>
                      <strong>Name:</strong> {guardianData.fullName}
                    </p>
                    <p>
                      <strong>Relationship:</strong> {guardianData.relationship}
                    </p>
                    <p>
                      <strong>Phone:</strong> {guardianData.phone}
                    </p>
                    {guardianData.isCoach && guardianData.aauNumber && (
                      <p>
                        <strong>AAU Number:</strong> {guardianData.aauNumber}
                      </p>
                    )}
                  </div>
                </div>

                {players.length > 0 && (
                  <div className='mt-4'>
                    <h5>Players ({players.length})</h5>
                    {players.map((player, index) => {
                      const visibleFields = getVisibleFields(player);
                      const displayOrder = [
                        'fullName',
                        'grade',
                        'age',
                        'dob',
                        'gender',
                        'schoolName',
                        'aauNumber',
                        'healthConcerns',
                      ];
                      const sortedFields = [...visibleFields].sort((a, b) => {
                        const orderA = displayOrder.indexOf(a.fieldName);
                        const orderB = displayOrder.indexOf(b.fieldName);
                        if (orderA === -1 && orderB === -1)
                          return a.fieldName.localeCompare(b.fieldName);
                        if (orderA === -1) return 1;
                        if (orderB === -1) return -1;
                        return orderA - orderB;
                      });
                      const fieldsWithValues = sortedFields.filter((field) => {
                        const value = player[field.fieldName as keyof Player];
                        return (
                          value &&
                          (typeof value === 'string' ? value.trim() : true)
                        );
                      });
                      if (fieldsWithValues.length === 0) return null;
                      return (
                        <div key={index} className='border rounded p-3 mb-2'>
                          <div className='row'>
                            {fieldsWithValues.map((field) => {
                              let value =
                                player[field.fieldName as keyof Player];
                              if (!value) return null;
                              let displayValue = value;
                              if (field.fieldName === 'dob' && value) {
                                displayValue = new Date(
                                  value as string,
                                ).toLocaleDateString();
                              }
                              return (
                                <div
                                  key={field.fieldName}
                                  className='col-md-6 mb-2'
                                >
                                  <span className='text-muted'>
                                    {field.label || field.fieldName}:
                                  </span>{' '}
                                  <strong>{displayValue as string}</strong>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <TermsAndConditionsModule
                  agreeToTerms={agreeToTerms}
                  onAgreeToTermsChange={handleAgreeToTermsChange}
                  validationError={formError || undefined}
                  waiverModalId='waiver'
                />

                <div className='d-flex justify-content-end mt-4'>
                  <button
                    type='submit'
                    className='btn btn-success'
                    disabled={isSubmitting || !agreeToTerms}
                  >
                    {isSubmitting ? (
                      <>
                        <span className='spinner-border spinner-border-sm me-2'></span>
                        Processing...
                      </>
                    ) : (
                      <>
                        <i className='ti ti-check me-2'></i>Complete
                        Registration
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </form>
        );

      case 'success':
        return (
          <div className='card border-0 shadow-sm'>
            <div className='card-header'>
              <h4 className='mb-0'>🎉 Registration Complete!</h4>
            </div>
            <div className='card-body'>
              <div className='text-center py-4'>
                <i className='ti ti-circle-check fs-1 text-success mb-3'></i>
                <h3>Welcome to Partizan Basketball!</h3>
                <div className='alert alert-success mb-3'>
                  <div className='d-flex align-items-center'>
                    <i className='ti ti-mail-check fs-4 me-3'></i>
                    <div>
                      <h5 className='mb-1'>Welcome Email Sent!</h5>
                      <p className='mb-0'>
                        A welcome email has been sent to{' '}
                        <strong>{formData.email}</strong>
                      </p>
                      <small className='text-muted'>
                        Please check your inbox (and spam folder) for account
                        details.
                      </small>
                    </div>
                  </div>
                </div>
                <p className='text-muted'>
                  Your account has been created successfully.
                  {players.length > 0
                    ? ` ${players.length} player${
                        players.length > 1 ? 's have' : ' has'
                      } been added to your account.`
                    : ' You can add players later from your dashboard.'}
                </p>
              </div>

              <div className='card border mb-4'>
                <div className='card-header bg-light'>
                  <div className='d-flex justify-content-between align-items-center'>
                    <h5 className='mb-0'>Registration Details</h5>
                    <span className='badge bg-success'>
                      <i className='ti ti-mail me-1'></i>Email Sent
                    </span>
                  </div>
                </div>
                <div className='card-body'>
                  <div className='row mb-3'>
                    <div className='col-md-6'>
                      <p>
                        <strong>Registration Date:</strong>
                      </p>
                      <p>{registrationTimestamp}</p>
                    </div>
                    <div className='col-md-6'>
                      <p>
                        <strong>Account Email:</strong>
                      </p>
                      <p>{formData.email}</p>
                    </div>
                  </div>
                  <div className='mb-3'>
                    <p>
                      <strong>Guardian:</strong>
                    </p>
                    <p>{guardianData.fullName}</p>
                  </div>
                  {players.length > 0 && (
                    <div className='mb-3'>
                      <p>
                        <strong>Players Registered:</strong>
                      </p>
                      <ul className='list-group'>
                        {players.map((player, index) => (
                          <li
                            key={index}
                            className='list-group-item d-flex justify-content-between'
                          >
                            <div>
                              <strong>{player.fullName}</strong>
                              <span className='text-muted small d-block'>
                                {player.grade} Grade • {player.gender}
                              </span>
                            </div>
                            <span className='badge bg-success'>Added</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              <div className='d-flex justify-content-between'>
                <button
                  type='button'
                  className='btn btn-outline-primary'
                  onClick={handleAddMorePlayers}
                >
                  <i className='ti ti-plus me-2'></i>
                  {players.length === 0
                    ? 'Add Players Now'
                    : 'Add More Players'}
                </button>
                <button
                  type='button'
                  className='btn btn-primary'
                  onClick={handleComplete}
                >
                  <i className='ti ti-home me-2'></i>Go to Dashboard
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (isProcessing || isLoadingUserData) {
    return (
      <div className='container-fuild'>
        <div className='login-wrapper w-100 overflow-hidden position-relative flex-wrap d-block vh-100'>
          <div className='row justify-content-center align-items-center vh-100'>
            <LoadingSpinner />
            <p className='mt-3 text-muted'>Loading registration...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='container-fuild'>
      <div className='login-wrapper w-100 overflow-hidden position-relative flex-wrap d-block vh-100'>
        <div className='row'>
          <div className='col-lg-6'>
            <div className='d-lg-flex align-items-center justify-content-center bg-light-300 d-lg-block d-none flex-wrap vh-100 overflowy-auto bg-01'>
              <ImageWithBasePath
                src='assets/img/authentication/authentication.png'
                alt='Img'
              />
            </div>
          </div>
          <div className='col-lg-6 col-md-12 col-sm-12'>
            <div className='row justify-content-center align-items-center vh-100 overflow-auto flex-wrap'>
              <div className='col-md-10 mx-auto p-4'>
                <div className='mx-auto mb-4 text-center'>
                  <ImageWithBasePath
                    src='assets/img/logo.png'
                    className='img-fluid'
                    alt='Logo'
                  />
                </div>

                <div className='form-header text-center mb-4'>
                  <h2 className='mt-3'>Create Your Account</h2>
                  <p>
                    {currentStep === 'success'
                      ? 'Welcome to Partizan Basketball!'
                      : 'Register to join Partizan Basketball. Players can be added now or later.'}
                  </p>
                </div>

                {currentStep !== 'success' && (
                  <StepIndicator
                    steps={steps}
                    currentStep={currentStep}
                    className='mb-4'
                  />
                )}

                <div className='form-content'>
                  {formError && (
                    <div className='alert alert-danger mb-4'>
                      <i className='ti ti-alert-circle me-2'></i>
                      {formError}
                      {formError.includes('already registered') && (
                        <div className='mt-2'>
                          <Link
                            to={routes.login}
                            className='btn btn-sm btn-outline-primary'
                          >
                            Sign In Instead
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                  <div className='step-content'>{renderStepContent()}</div>
                </div>

                {currentStep !== 'success' &&
                  currentStep !== 'verifyEmail' &&
                  currentStep !== 'account' && (
                    <div className='text-center mt-4'>
                      <h6 className='fw-normal text-dark mb-0'>
                        Already have an account?
                        <Link to={routes.login} className='hover-a'>
                          {' '}
                          Sign In
                        </Link>
                      </h6>
                    </div>
                  )}

                <div className='mt-5 text-center'>
                  <p className='mb-0'>
                    © {currentYear} Partizan by{' '}
                    <a href='https://rainbootsmarketing.com/'>Rainboots</a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
