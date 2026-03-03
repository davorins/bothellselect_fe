import React, { useRef, useState, useEffect } from 'react';
import { PlayerFormData } from '../../../../types/types';
import { Address } from '../../../../utils/address';
import { getDefaultAvatar, getAvatarUrl } from '../../../../utils/r2Utils';
import SchoolAutocomplete from '../../../../components/SchoolAutocomplete';
import Select from 'react-select';
import { commonHealthConditions } from '../../../constants/healthConditions';
import NameInput from '../../../../components/NameInput';

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
  selectedConditions?: any[];
  onConditionChange?: (selected: any) => void;
  customCondition?: string;
  onCustomConditionChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  showCustomInput?: boolean;
}

const gradeOptions = [
  { value: 'PK', label: 'Pre-Kindergarten' },
  { value: 'K', label: 'Kindergarten' },
  ...Array.from({ length: 12 }, (_, i) => ({
    value: `${i + 1}`,
    label: `${i + 1}${i === 0 ? 'st' : i === 1 ? 'nd' : i === 2 ? 'rd' : 'th'} Grade`,
  })),
];

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
  // New props with defaults
  selectedConditions: propSelectedConditions = [],
  onConditionChange,
  customCondition: propCustomCondition = '',
  onCustomConditionChange,
  showCustomInput: propShowCustomInput = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const defaultPlayerAvatar = getDefaultAvatar(
    'player',
    player.gender as 'Male' | 'Female',
  );

  // Use props if provided, otherwise use local state
  const [localSelectedConditions, setLocalSelectedConditions] = useState<any[]>(
    [],
  );
  const [localCustomCondition, setLocalCustomCondition] = useState('');
  const [localShowCustomInput, setLocalShowCustomInput] = useState(false);

  // Determine whether to use props or local state
  const useLocalState = !onConditionChange;

  const selectedConditions = useLocalState
    ? localSelectedConditions
    : propSelectedConditions;
  const customCondition = useLocalState
    ? localCustomCondition
    : propCustomCondition;
  const showCustomInput = useLocalState
    ? localShowCustomInput
    : propShowCustomInput;

  // Local handlers for when component is used standalone
  const handleLocalConditionChange = (selected: any) => {
    setLocalSelectedConditions(selected || []);
    const hasCustom = selected?.some((item: any) => item.value === 'custom');
    setLocalShowCustomInput(hasCustom);
    updateLocalHealthConcerns(selected || [], localCustomCondition);
  };

  const handleLocalCustomConditionChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = e.target.value;
    setLocalCustomCondition(value);
    updateLocalHealthConcerns(localSelectedConditions, value);
  };

  const updateLocalHealthConcerns = (conditions: any[], custom: string) => {
    const selectedLabels = conditions
      .filter((c: any) => c.value !== 'custom')
      .map((c: any) => c.label);

    let healthConcerns = selectedLabels.join(', ');

    if (custom.trim() && localShowCustomInput) {
      if (healthConcerns) {
        healthConcerns += ', ' + custom.trim();
      } else {
        healthConcerns = custom.trim();
      }
    }

    const syntheticEvent = {
      target: {
        name: 'healthConcerns',
        value: healthConcerns,
      },
    } as React.ChangeEvent<HTMLInputElement>;

    handlePlayerInputChange(syntheticEvent, index);
  };

  // Parse existing health concerns on mount (for local state mode)
  useEffect(() => {
    if (useLocalState && player.healthConcerns) {
      const concerns = player.healthConcerns.split(',').map((c) => c.trim());
      const preSelected = concerns
        .filter((c) =>
          commonHealthConditions.some((condition) => condition.label === c),
        )
        .map((c) => {
          const found = commonHealthConditions.find(
            (condition) => condition.label === c,
          );
          return found || { value: 'custom', label: c };
        });

      const customConcerns = concerns
        .filter(
          (c) =>
            !commonHealthConditions.some((condition) => condition.label === c),
        )
        .join(', ');

      setLocalSelectedConditions(preSelected);
      if (customConcerns) {
        setLocalCustomCondition(customConcerns);
        setLocalShowCustomInput(true);
      }
    }
  }, [player.healthConcerns, useLocalState]);

  // Resolve existing saved avatar
  const existingAvatar = player.avatar
    ? getAvatarUrl(player.avatar, defaultPlayerAvatar)
    : null;

  // Preview takes priority over saved avatar
  const displayAvatar = avatarPreview || existingAvatar;
  const hasAvatar = !!displayAvatar;
  const hasSavedId = !!player._id;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && onAvatarChange) {
      onAvatarChange(e.target.files[0], index);
    }
    e.target.value = '';
  };

  const handleRemove = () => {
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (onAvatarRemove) onAvatarRemove(index);
  };

  // Use the appropriate handler based on whether props are provided
  const handleConditionChange = onConditionChange || handleLocalConditionChange;
  const handleCustomConditionChange =
    onCustomConditionChange || handleLocalCustomConditionChange;

  // Custom styles for react-select
  const selectStyles = {
    control: (base: any) => ({
      ...base,
      minHeight: '38px',
      borderColor: '#d9d9d9',
      '&:hover': { borderColor: '#40a9ff' },
    }),
  };

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
        {/* Avatar upload section */}
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
                  onClick={handleRemove}
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

        {/* Player form fields */}
        <div className='row row-cols-xxl-12 row-cols-md-12'>
          <div className='col-xxl col-xl-6 col-md-12'>
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
          <div className='col-xxl col-xl-6 col-md-12'>
            <div className='mb-3'>
              <label className='form-label'>School Name</label>
              <SchoolAutocomplete
                value={player.schoolName}
                onChange={(val) => handlePlayerSchoolChange(val, index)}
              />
              {errors.schoolName && (
                <div className='invalid-feedback d-block'>
                  {errors.schoolName}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className='row row-cols-xxl-12 row-cols-md-12'>
          <div className='col-xxl col-xl-3 col-md-12'>
            <div className='mb-3'>
              <label className='form-label'>Date of Birth</label>
              <input
                type='date'
                className={`form-control ${errors.dob ? 'is-invalid' : ''}`}
                name='dob'
                value={player.dob}
                onChange={(e) => handlePlayerInputChange(e, index)}
                required
              />
              {errors.dob && (
                <div className='invalid-feedback'>{errors.dob}</div>
              )}
            </div>
          </div>
          <div className='col-xxl col-xl-3 col-md-12'>
            <div className='mb-3'>
              <label className='form-label'>Gender</label>
              <select
                className={`form-control ${errors.gender ? 'is-invalid' : ''}`}
                name='gender'
                value={player.gender}
                onChange={(e) => handlePlayerInputChange(e, index)}
                required
              >
                <option value=''>Select Gender</option>
                <option value='Male'>Male</option>
                <option value='Female'>Female</option>
              </select>
              {errors.gender && (
                <div className='invalid-feedback'>{errors.gender}</div>
              )}
            </div>
          </div>
          <div className='col-xxl col-xl-3 col-md-12'>
            <div className='mb-3'>
              <label className='form-label'>Grade</label>
              <select
                className={`form-control ${errors.grade ? 'is-invalid' : ''}`}
                name='grade'
                value={player.grade}
                onChange={(e) => handlePlayerInputChange(e, index)}
                required
              >
                <option value=''>Select Grade</option>
                {gradeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {errors.grade && (
                <div className='invalid-feedback'>{errors.grade}</div>
              )}
            </div>
          </div>
          <div className='col-xxl col-xl-3 col-md-12'>
            <div className='mb-3'>
              <label className='form-label'>AAU Number</label>
              <input
                type='text'
                className='form-control'
                name='aauNumber'
                value={player.aauNumber || ''}
                onChange={(e) => handlePlayerInputChange(e, index)}
              />
            </div>
          </div>
        </div>

        {/* Medical History Section - New */}
        <div className='row row-cols-xxl-12 row-cols-md-12'>
          <div className='col-xxl col-xl-12 col-md-12'>
            <div className='card mt-3'>
              <div className='card-header bg-light py-2'>
                <div className='d-flex align-items-center'>
                  <span className='bg-white avatar avatar-sm me-2 text-gray-7 flex-shrink-0'>
                    <i className='ti ti-heartbeat fs-16' />
                  </span>
                  <h5 className='text-dark mb-0'>Medical History</h5>
                </div>
              </div>
              <div className='card-body pb-1'>
                <div className='row'>
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
                      styles={selectStyles}
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
      </div>
    </div>
  );
};

export default PlayerForm;
