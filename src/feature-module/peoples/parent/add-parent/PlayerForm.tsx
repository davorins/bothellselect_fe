// PlayerForm.tsx
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { PlayerFormData } from '../../../../types/types';
import { getDefaultAvatar, getAvatarUrl } from '../../../../utils/r2Utils';
import SchoolAutocomplete from '../../../../components/SchoolAutocomplete';
import Select from 'react-select';
import { commonHealthConditions } from '../../../constants/healthConditions';
import NameInput from '../../../../components/NameInput';
import DynamicFormField from '../../../../components/forms/DynamicFormField';
import { useDynamicFormFields } from '../../../hooks/useDynamicFormFields';
import { Player as RegistrationPlayer } from '../../../../types/registration-types';

interface PlayerFormProps {
  player: PlayerFormData;
  index: number;
  handlePlayerInputChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    index: number,
  ) => void;
  handlePlayerSchoolChange: (val: string, index: number) => void;
  removePlayer: (index: number) => void;
  avatarPreview?: string | null;
  avatarUploading?: boolean;
  onAvatarChange?: (file: File, index: number) => void;
  onAvatarRemove?: (index: number) => void;
  errors?: Record<string, string>;
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
  avatar: player.avatar || '',
});

const PlayerForm: React.FC<PlayerFormProps> = ({
  player,
  index,
  handlePlayerInputChange,
  handlePlayerSchoolChange,
  removePlayer,
  avatarPreview,
  avatarUploading = false,
  onAvatarChange,
  onAvatarRemove,
  errors = {},
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const defaultPlayerAvatar = getDefaultAvatar(
    'player',
    player.gender as 'Male' | 'Female',
  );

  // ── Dynamic fields ──────────────────────────────────────────────────────
  const { getVisibleFields } = useDynamicFormFields('player', {
    registrationYear: new Date().getFullYear(),
  });

  const visibleFields = useMemo(
    () => getVisibleFields(toRegistrationPlayer(player)),
    [player, getVisibleFields],
  );

  // Fields we render manually; everything else goes through DynamicFormField
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

  const schoolField = visibleFields.find((f) => f.fieldName === 'schoolName');

  // ── Health conditions state ─────────────────────────────────────────────
  const [selectedConditions, setSelectedConditions] = useState<any[]>([]);
  const [customCondition, setCustomCondition] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  useEffect(() => {
    if (!player.healthConcerns) return;
    const concerns = player.healthConcerns.split(',').map((c) => c.trim());
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

  // ── Avatar helpers ──────────────────────────────────────────────────────
  const existingAvatar = player.avatar
    ? getAvatarUrl(player.avatar, defaultPlayerAvatar)
    : null;
  const displayAvatar = avatarPreview || existingAvatar;
  const hasAvatar = !!displayAvatar;
  const hasSavedId =
    !!player._id &&
    !player._id.toString().startsWith('temp_') &&
    player._id.toString().length === 24;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0] && onAvatarChange) {
      onAvatarChange(e.target.files[0], index);
    }
    e.target.value = '';
  };

  const handleRemoveAvatar = () => {
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (onAvatarRemove) onAvatarRemove(index);
  };

  // ── DynamicFormField change handler ────────────────────────────────────
  const handleDynamicFieldChange = (fieldName: string, value: any) => {
    handlePlayerInputChange(
      {
        target: { name: fieldName, value },
      } as React.ChangeEvent<HTMLInputElement>,
      index,
    );
  };

  // ── Health conditions ───────────────────────────────────────────────────
  const updateHealthConcerns = (
    conditions: any[],
    custom: string,
    showCustom: boolean,
  ) => {
    const labels = conditions
      .filter((c) => c.value !== 'custom')
      .map((c) => c.label);
    let healthConcerns = labels.join(', ');
    if (custom.trim() && showCustom) {
      healthConcerns = healthConcerns
        ? `${healthConcerns}, ${custom.trim()}`
        : custom.trim();
    }
    handlePlayerInputChange(
      { target: { name: 'healthConcerns', value: healthConcerns } } as any,
      index,
    );
  };

  const handleConditionChange = (selected: any) => {
    const newSelected = selected || [];
    const hasCustom = newSelected.some((item: any) => item.value === 'custom');
    setSelectedConditions(newSelected);
    setShowCustomInput(hasCustom);
    updateHealthConcerns(newSelected, customCondition, hasCustom);
  };

  const handleCustomConditionChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = e.target.value;
    setCustomCondition(value);
    updateHealthConcerns(selectedConditions, value, showCustomInput);
  };

  // ── Column sizing ───────────────────────────────────────────────────────
  const colClass = useMemo(() => {
    const count = dynamicFields.length;
    if (count === 1) return 'col-md-12';
    if (count === 2) return 'col-md-6';
    if (count === 3) return 'col-md-4';
    if (count === 4) return 'col-md-6 col-lg-3';
    return 'col-md-6 col-lg-4 col-xl-3';
  }, [dynamicFields.length]);

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div id={`player-${index}`} className='card mb-4'>
      <div className='card-header d-flex align-items-center justify-content-between bg-light'>
        <h5 className='mb-0'>{player.fullName || `Player ${index + 1}`}</h5>
        <button
          type='button'
          className='btn btn-danger btn-sm'
          onClick={() => removePlayer(index)}
          disabled={avatarUploading}
        >
          <i className='ti ti-trash me-1' /> Remove
        </button>
      </div>

      <div className='card-body pb-0'>
        {/* Avatar */}
        <div className='d-flex align-items-center flex-wrap row-gap-3 mb-3'>
          <div className='d-flex align-items-center justify-content-center avatar avatar-xxl border border-dashed me-2 flex-shrink-0 text-dark frames'>
            {hasAvatar ? (
              <img
                src={displayAvatar!}
                alt='Player avatar'
                className='img-fluid rounded'
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = defaultPlayerAvatar;
                }}
              />
            ) : (
              <i className='ti ti-photo-plus fs-16' />
            )}
          </div>
          <div className='profile-upload'>
            <div className='profile-uploader d-flex align-items-center'>
              <div className='drag-upload-btn mb-3'>
                {hasSavedId ? 'Upload Photo' : 'Save player first'}
                {hasSavedId && (
                  <input
                    type='file'
                    className='form-control image-sign'
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept='image/jpeg, image/png, image/webp'
                    disabled={avatarUploading}
                  />
                )}
              </div>
              {hasAvatar && hasSavedId && (
                <button
                  type='button'
                  className='btn btn-primary mb-3 ms-2'
                  onClick={handleRemoveAvatar}
                  disabled={avatarUploading}
                >
                  Remove
                </button>
              )}
            </div>
            <p className='fs-12'>
              {hasSavedId
                ? 'Upload image size 4MB, Format JPG, PNG'
                : 'Save the player first to enable avatar upload'}
            </p>
            {avatarUploading && (
              <div className='text-primary mt-1'>
                <span
                  className='spinner-border spinner-border-sm me-1'
                  role='status'
                />
                Uploading...
              </div>
            )}
          </div>
        </div>

        {/* Full Name — always shown, always required */}
        <div className='row'>
          <div className='col-12'>
            <NameInput
              value={player.fullName}
              onChange={(val) =>
                handlePlayerInputChange(
                  {
                    target: { name: 'fullName', value: val },
                  } as React.ChangeEvent<HTMLInputElement>,
                  index,
                )
              }
              error={errors.fullName}
              required
            />
          </div>
        </div>

        {/* School Name — dynamic visibility */}
        {schoolField && (
          <div className='row'>
            <div className='col-12'>
              <div className='mb-3'>
                <label className='form-label'>
                  {schoolField.label}
                  {schoolField.isRequired && (
                    <span className='text-danger ms-1'>*</span>
                  )}
                </label>
                <SchoolAutocomplete
                  value={player.schoolName}
                  onChange={(val) => handlePlayerSchoolChange(val, index)}
                  isInvalid={!!errors.schoolName}
                  placeholder='Enter school name'
                />
                {errors.schoolName && (
                  <div className='invalid-feedback d-block'>
                    {errors.schoolName}
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
                  (player[field.fieldName as keyof PlayerFormData] as string) ??
                  ''
                }
                onChange={handleDynamicFieldChange}
                error={errors[field.fieldName]}
              />

              {/* Grade auto-calc helper */}
              {field.fieldName === 'grade' &&
                player.dob &&
                !player.isGradeOverridden &&
                player.grade && (
                  <div className='text-muted small mt-1'>
                    Auto-calculated from DOB
                    <button
                      type='button'
                      className='btn btn-link btn-sm p-0 ms-2'
                      onClick={() =>
                        handlePlayerInputChange(
                          {
                            target: { name: 'isGradeOverridden', value: true },
                          } as any,
                          index,
                        )
                      }
                    >
                      Adjust
                    </button>
                  </div>
                )}
            </div>
          ))}
        </div>

        {/* Medical History — always shown */}
        <div className='row row-cols-xxl-12 row-cols-md-12 p-3'>
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
                  <label className='form-label'>
                    Specify Other Condition(s)
                  </label>
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
      </div>
    </div>
  );
};

export default PlayerForm;
