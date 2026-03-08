import React, { useRef, useState, useEffect, useMemo } from 'react';
import { ValidationErrors, PlayerFormData } from '../../../../types/types';
import { getDefaultAvatar } from '../../../../utils/r2Utils';
import { calculateGradeFromDOB } from '../../../../utils/gradeUtils';
import SchoolAutocomplete from '../../../../components/SchoolAutocomplete';
import Select from 'react-select';
import { commonHealthConditions } from '../../../constants/healthConditions';
import NameInput from '../../../../components/NameInput';
import DynamicFormField from '../../../../components/forms/DynamicFormField';
import { useDynamicFormFields } from '../../../hooks/useDynamicFormFields';
import { Player as RegistrationPlayer } from '../../../../types/registration-types';
import { validateFullName } from '../../../../components/NameInput';
import {
  validateRequired,
  validateDateOfBirth,
  validateGrade,
} from '../../../../utils/validation';

interface NewPlayerFormProps {
  newPlayer: PlayerFormData;
  playerErrors: ValidationErrors;
  setNewPlayer: React.Dispatch<React.SetStateAction<PlayerFormData>>;
  setPlayerErrors: React.Dispatch<React.SetStateAction<ValidationErrors>>;
  setShowPlayerForm: React.Dispatch<React.SetStateAction<boolean>>;
  addPlayer: () => void;
  // Avatar props
  avatarPreview?: string | null;
  onAvatarChange?: (file: File) => void;
  onAvatarRemove?: () => void;
}

// Convert PlayerFormData to the shape useDynamicFormFields expects
const toRegistrationPlayer = (player: PlayerFormData): RegistrationPlayer => ({
  _id: player._id || '',
  fullName: player.fullName || '',
  gender: player.gender || '',
  dob: player.dob || '',
  schoolName: player.schoolName || '',
  healthConcerns: player.healthConcerns || '',
  aauNumber: player.aauNumber || '',
  registrationYear: new Date().getFullYear(),
  season: 'N/A',
  grade: player.grade || '',
  isGradeOverridden: player.isGradeOverridden || false,
  avatar: '',
});

const NewPlayerForm: React.FC<NewPlayerFormProps> = ({
  newPlayer,
  playerErrors,
  setNewPlayer,
  setPlayerErrors,
  setShowPlayerForm,
  addPlayer,
  avatarPreview,
  onAvatarChange,
  onAvatarRemove,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const DEFAULT_AVATAR = getDefaultAvatar(
    'player',
    newPlayer.gender as 'Male' | 'Female',
  );

  // ── Dynamic fields ────────────────────────────────────────────────────────
  const { getVisibleFields, validateField } = useDynamicFormFields('player', {
    registrationYear: new Date().getFullYear(),
  });

  const visibleFields = useMemo(
    () => getVisibleFields(toRegistrationPlayer(newPlayer)),
    [newPlayer, getVisibleFields],
  );

  // Exclude fields we handle manually (fullName, schoolName) and purely informational ones (age)
  const dynamicFields = useMemo(
    () =>
      visibleFields.filter(
        (f) =>
          f.fieldName !== 'fullName' &&
          f.fieldName !== 'schoolName' &&
          f.fieldName !== 'age',
      ),
    [visibleFields],
  );

  const hasField = (name: string) =>
    visibleFields.some((f) => f.fieldName === name);

  // ── Health conditions state ───────────────────────────────────────────────
  const [selectedConditions, setSelectedConditions] = useState<any[]>([]);
  const [customCondition, setCustomCondition] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  // Parse existing health concerns on mount
  useEffect(() => {
    if (!newPlayer.healthConcerns) return;
    const concerns = newPlayer.healthConcerns.split(',').map((c) => c.trim());
    const preSelected = concerns
      .filter((c) => commonHealthConditions.some((cond) => cond.label === c))
      .map(
        (c) =>
          commonHealthConditions.find((cond) => cond.label === c) || {
            value: 'custom',
            label: c,
          },
      );
    const custom = concerns
      .filter((c) => !commonHealthConditions.some((cond) => cond.label === c))
      .join(', ');
    setSelectedConditions(preSelected);
    if (custom) {
      setCustomCondition(custom);
      setShowCustomInput(true);
    }
  }, []); // only on mount

  // ── Handlers ─────────────────────────────────────────────────────────────

  const clearError = (name: string) => {
    if (playerErrors[name])
      setPlayerErrors((prev) => {
        const n = { ...prev };
        delete n[name];
        return n;
      });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0] && onAvatarChange) {
      onAvatarChange(e.target.files[0]);
    }
  };

  const handleRemoveAvatar = () => {
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (onAvatarRemove) onAvatarRemove();
  };

  // Handler for DynamicFormField (matches AddPlayer pattern)
  const handleDynamicFieldChange = (fieldName: string, value: any) => {
    setNewPlayer((prev) => {
      const updated = { ...prev, [fieldName]: value };
      // Auto-calculate grade when DOB changes (unless overridden)
      if (
        fieldName === 'dob' &&
        !prev.isGradeOverridden &&
        value?.match(/^\d{4}-\d{2}-\d{2}$/)
      ) {
        updated.grade = calculateGradeFromDOB(value, new Date().getFullYear());
      }
      return updated;
    });
    clearError(fieldName);
  };

  const handleSchoolChange = (val: string) => {
    setNewPlayer((prev) => ({ ...prev, schoolName: val }));
    clearError('schoolName');
  };

  const handleGradeOverride = () => {
    setNewPlayer((prev) => ({ ...prev, isGradeOverridden: true }));
  };

  const updateHealthConcerns = (conditions: any[], custom: string) => {
    const labels = conditions
      .filter((c) => c.value !== 'custom')
      .map((c) => c.label);
    let healthConcerns = labels.join(', ');
    if (custom.trim() && showCustomInput) {
      healthConcerns = healthConcerns
        ? `${healthConcerns}, ${custom.trim()}`
        : custom.trim();
    }
    setNewPlayer((prev) => ({ ...prev, healthConcerns }));
  };

  const handleConditionChange = (selected: any) => {
    setSelectedConditions(selected || []);
    const hasCustom = selected?.some((item: any) => item.value === 'custom');
    setShowCustomInput(hasCustom);
    updateHealthConcerns(selected || [], customCondition);
  };

  const handleCustomConditionChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = e.target.value;
    setCustomCondition(value);
    updateHealthConcerns(selectedConditions, value);
  };

  // ── Validation (dynamic — mirrors AddPlayer.validateForm) ─────────────────
  const validate = (): ValidationErrors => {
    const errs: ValidationErrors = {};

    // fullName is always required regardless of config
    const nameError = validateFullName(newPlayer.fullName, true);
    if (nameError) errs.fullName = nameError;

    // schoolName — check against visible fields
    const schoolField = visibleFields.find((f) => f.fieldName === 'schoolName');
    if (schoolField) {
      const err = validateField(schoolField, newPlayer.schoolName || '');
      if (err) errs.schoolName = err;
    } else if (!newPlayer.schoolName?.trim()) {
      // default required if not in config at all
      errs.schoolName = 'School name is required';
    }

    // All other dynamic fields
    visibleFields
      .filter(
        (f) =>
          f.fieldName !== 'fullName' &&
          f.fieldName !== 'schoolName' &&
          f.fieldName !== 'age',
      )
      .forEach((field) => {
        const raw = newPlayer[field.fieldName as keyof PlayerFormData];
        const value = raw !== undefined && raw !== null ? String(raw) : '';
        const err = validateField(field, value);
        if (err) errs[field.fieldName] = err;
      });

    return errs;
  };

  // ── Submit / Cancel ───────────────────────────────────────────────────────

  const handleSubmit = () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setPlayerErrors(errs);
      // Scroll to first error
      const firstKey = Object.keys(errs)[0];
      const el = document.querySelector(`[name="${firstKey}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    addPlayer();
  };

  const handleCancel = () => {
    setShowPlayerForm(false);
    setNewPlayer({
      fullName: '',
      gender: '',
      dob: '',
      schoolName: '',
      grade: '',
      healthConcerns: '',
      aauNumber: '',
      isGradeOverridden: false,
    });
    setSelectedConditions([]);
    setCustomCondition('');
    setShowCustomInput(false);
    setPlayerErrors({});
    if (onAvatarRemove) onAvatarRemove();
  };

  // ── Column sizing (mirrors AddPlayer) ─────────────────────────────────────
  const colClass = useMemo(() => {
    const count = dynamicFields.length;
    if (count === 1) return 'col-md-12';
    if (count === 2) return 'col-md-6';
    if (count === 3) return 'col-md-4';
    if (count === 4) return 'col-md-6 col-lg-3';
    return 'col-md-6 col-lg-4 col-xl-3';
  }, [dynamicFields.length]);

  const schoolField = visibleFields.find((f) => f.fieldName === 'schoolName');

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className='border rounded p-3 mt-3'>
      {/* Avatar upload */}
      <div className='d-flex align-items-center flex-wrap row-gap-3 mb-3'>
        <div className='d-flex align-items-center justify-content-center avatar avatar-xxl border border-dashed me-2 flex-shrink-0 text-dark frames'>
          {avatarPreview ? (
            <img
              src={avatarPreview}
              alt='Player avatar preview'
              className='img-fluid rounded'
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => {
                (e.target as HTMLImageElement).src = DEFAULT_AVATAR;
              }}
            />
          ) : (
            <i className='ti ti-photo-plus fs-16' />
          )}
        </div>
        <div className='profile-upload'>
          <div className='profile-uploader d-flex align-items-center'>
            <div className='drag-upload-btn mb-3'>
              Upload Photo
              <input
                type='file'
                className='form-control image-sign'
                ref={fileInputRef}
                onChange={handleFileChange}
                accept='image/jpeg, image/png'
              />
            </div>
            {avatarPreview && (
              <button
                type='button'
                className='btn btn-primary mb-3 ms-2'
                onClick={handleRemoveAvatar}
              >
                Remove
              </button>
            )}
          </div>
          <p className='fs-12'>Upload image size 4MB, Format JPG, PNG</p>
        </div>
      </div>

      {/* Full Name — always shown, always required */}
      <div className='row'>
        <div className='col-12'>
          <NameInput
            value={newPlayer.fullName}
            onChange={(val) => {
              setNewPlayer((prev) => ({ ...prev, fullName: val }));
              clearError('fullName');
            }}
            error={playerErrors.fullName}
            required
          />
        </div>
      </div>

      {/* School Name — dynamic visibility */}
      {(schoolField || !visibleFields.length) && (
        <div className='row'>
          <div className='col-12'>
            <div className='mb-3'>
              <label className='form-label'>
                {schoolField?.label || 'School Name'}
                {(schoolField?.isRequired ?? true) && (
                  <span className='text-danger ms-1'>*</span>
                )}
              </label>
              <SchoolAutocomplete
                value={newPlayer.schoolName}
                onChange={handleSchoolChange}
                isInvalid={!!playerErrors.schoolName}
                placeholder='Enter school name'
              />
              {playerErrors.schoolName && (
                <div className='invalid-feedback d-block'>
                  {playerErrors.schoolName}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Dynamic fields — gender, dob, grade, aauNumber, etc. */}
      <div className='row'>
        {dynamicFields.map((field) => (
          <div className={colClass} key={field.fieldName}>
            <DynamicFormField
              field={field}
              value={
                (newPlayer[
                  field.fieldName as keyof PlayerFormData
                ] as string) ?? ''
              }
              onChange={handleDynamicFieldChange}
              error={playerErrors[field.fieldName]}
            />

            {/* Grade auto-calc helper */}
            {field.fieldName === 'grade' &&
              newPlayer.dob &&
              !newPlayer.isGradeOverridden &&
              newPlayer.grade && (
                <div className='text-muted small mt-1'>
                  Auto-calculated from DOB
                  <button
                    type='button'
                    className='btn btn-link btn-sm p-0 ms-2'
                    onClick={handleGradeOverride}
                  >
                    Adjust
                  </button>
                </div>
              )}
          </div>
        ))}
      </div>

      {/* Medical History */}
      <div className='row p-3'>
        <div className='card p-0'>
          <div className='card-header bg-light py-2'>
            <div className='d-flex align-items-center'>
              <span className='bg-white avatar avatar-sm me-2 text-gray-7 flex-shrink-0'>
                <i className='ti ti-heartbeat fs-16' />
              </span>
              <h5 className='text-dark mb-0'>Medical History</h5>
            </div>
          </div>
          <div className='card-body'>
            <div className='mb-3'>
              <label className='form-label'>Health Conditions</label>
              <Select
                isMulti
                name='healthConditions'
                options={commonHealthConditions}
                className='basic-multi-select'
                classNamePrefix='select'
                value={selectedConditions}
                onChange={handleConditionChange}
                placeholder='Select health conditions...'
              />
              <small className='text-muted'>Select all that apply</small>
            </div>
            {showCustomInput && (
              <div className='mb-3'>
                <label className='form-label'>Specify Other Condition(s)</label>
                <input
                  type='text'
                  className='form-control'
                  value={customCondition}
                  onChange={handleCustomConditionChange}
                  placeholder='Please describe any other health conditions...'
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className='text-end'>
        <button
          type='button'
          className='btn btn-light me-2'
          onClick={handleCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default NewPlayerForm;
