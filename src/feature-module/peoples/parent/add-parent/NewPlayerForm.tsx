import React, { useRef, useState, useEffect } from 'react';
import { ValidationErrors } from '../../../../types/types';
import { getDefaultAvatar } from '../../../../utils/r2Utils';
import { calculateGradeFromDOB } from '../../../../utils/gradeUtils';
import SchoolAutocomplete from '../../../../components/SchoolAutocomplete';
import { PlayerFormData } from '../../../../types/types';
import Select from 'react-select';
import { commonHealthConditions } from '../../../constants/healthConditions';
import NameInput from '../../../../components/NameInput';

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

const gradeOptions = [
  { value: 'PK', label: 'Pre-Kindergarten' },
  { value: 'K', label: 'Kindergarten' },
  ...Array.from({ length: 12 }, (_, i) => ({
    value: `${i + 1}`,
    label: `${i + 1}${i === 0 ? 'st' : i === 1 ? 'nd' : i === 2 ? 'rd' : 'th'} Grade`,
  })),
];

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

  // Health conditions state
  const [selectedConditions, setSelectedConditions] = useState<any[]>([]);
  const [customCondition, setCustomCondition] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  // Parse health concerns on mount and when newPlayer changes
  useEffect(() => {
    if (newPlayer.healthConcerns) {
      const concerns = newPlayer.healthConcerns.split(',').map((c) => c.trim());
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

      setSelectedConditions(preSelected);
      if (customConcerns) {
        setCustomCondition(customConcerns);
        setShowCustomInput(true);
      }
    }
  }, [newPlayer.healthConcerns]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0] && onAvatarChange) {
      onAvatarChange(e.target.files[0]);
    }
  };

  const handleRemoveAvatar = () => {
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (onAvatarRemove) onAvatarRemove();
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;

    setNewPlayer((prev) => {
      const updated = { ...prev, [name]: value };

      // Auto-calculate grade when DOB changes (unless overridden)
      if (
        name === 'dob' &&
        !prev.isGradeOverridden &&
        value.match(/^\d{4}-\d{2}-\d{2}$/)
      ) {
        updated.grade = calculateGradeFromDOB(value, new Date().getFullYear());
      }

      return updated;
    });

    if (playerErrors[name]) {
      setPlayerErrors((prev) => {
        const n = { ...prev };
        delete n[name];
        return n;
      });
    }
  };

  const handleSchoolChange = (val: string) => {
    setNewPlayer((prev) => ({ ...prev, schoolName: val }));
    if (playerErrors.schoolName) {
      setPlayerErrors((prev) => {
        const n = { ...prev };
        delete n.schoolName;
        return n;
      });
    }
  };

  const handleGradeOverride = () => {
    setNewPlayer((prev) => ({ ...prev, isGradeOverridden: true }));
  };

  // Health conditions handlers
  const handleConditionChange = (selected: any) => {
    setSelectedConditions(selected || []);

    // Check if "Other" is selected
    const hasCustom = selected?.some((item: any) => item.value === 'custom');
    setShowCustomInput(hasCustom);

    // Update player healthConcerns
    updateHealthConcerns(selected || [], customCondition);
  };

  const handleCustomConditionChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = e.target.value;
    setCustomCondition(value);
    updateHealthConcerns(selectedConditions, value);
  };

  const updateHealthConcerns = (conditions: any[], custom: string) => {
    const selectedLabels = conditions
      .filter((c: any) => c.value !== 'custom')
      .map((c: any) => c.label);

    let healthConcerns = selectedLabels.join(', ');

    if (custom.trim() && showCustomInput) {
      if (healthConcerns) {
        healthConcerns += ', ' + custom.trim();
      } else {
        healthConcerns = custom.trim();
      }
    }

    setNewPlayer((prev) => ({ ...prev, healthConcerns }));
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
    <div className='border rounded p-3 mt-3'>
      <h5 className='mb-3'>Add New Player</h5>

      {/* Avatar upload — identical structure to NewGuardianForm */}
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

      {/* Row 1 — Full Name, Gender, DOB, School */}
      <div className='row row-cols-xxl-12 row-cols-md-12'>
        <div className='col-xxl col-xl-6 col-md-12'>
          <NameInput
            value={newPlayer.fullName}
            onChange={(val) =>
              handleChange({
                target: { name: 'fullName', value: val },
              } as React.ChangeEvent<HTMLInputElement>)
            }
            error={playerErrors.fullName}
            required
          />
        </div>
        <div className='col-xxl col-xl-3 col-md-12'>
          <div className='mb-3'>
            <label className='form-label'>School Name</label>
            <SchoolAutocomplete
              value={newPlayer.schoolName}
              onChange={handleSchoolChange}
            />
            {playerErrors.schoolName && (
              <div className='invalid-feedback d-block'>
                {playerErrors.schoolName}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className='row row-cols-xxl-12 row-cols-md-12'>
        <div className='col-xxl col-xl-3 col-md-12'>
          <div className='mb-3'>
            <label className='form-label'>Gender</label>
            <select
              className={`form-control ${playerErrors.gender ? 'is-invalid' : ''}`}
              name='gender'
              value={newPlayer.gender}
              onChange={handleChange}
              required
            >
              <option value=''>Select Gender</option>
              <option value='Male'>Male</option>
              <option value='Female'>Female</option>
            </select>
            {playerErrors.gender && (
              <div className='invalid-feedback d-block'>
                {playerErrors.gender}
              </div>
            )}
          </div>
        </div>
        <div className='col-xxl col-xl-3 col-md-12'>
          <div className='mb-3'>
            <label className='form-label'>Date of Birth</label>
            <input
              type='date'
              className={`form-control ${playerErrors.dob ? 'is-invalid' : ''}`}
              name='dob'
              value={newPlayer.dob}
              onChange={handleChange}
              required
            />
            {playerErrors.dob && (
              <div className='invalid-feedback d-block'>{playerErrors.dob}</div>
            )}
          </div>
        </div>
        <div className='col-xxl col-xl-3 col-md-12'>
          <div className='mb-3'>
            <label className='form-label'>Grade</label>
            <select
              className={`form-control ${playerErrors.grade ? 'is-invalid' : ''}`}
              name='grade'
              value={newPlayer.grade}
              onChange={handleChange}
              required
            >
              <option value=''>Select Grade</option>
              {gradeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {/* Auto-calc helper text */}
            {newPlayer.dob && !newPlayer.isGradeOverridden && (
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
            {playerErrors.grade && (
              <div className='invalid-feedback d-block'>
                {playerErrors.grade}
              </div>
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
              value={newPlayer.aauNumber}
              onChange={handleChange}
            />
          </div>
        </div>
      </div>
      <div className='row row-cols-xxl-12 row-cols-md-12'>
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

      <div className='text-end'>
        <button
          type='button'
          className='btn btn-light me-2'
          onClick={handleCancel}
        >
          Cancel
        </button>
        <button type='button' className='btn btn-primary' onClick={addPlayer}>
          Add Player
        </button>
      </div>
    </div>
  );
};

export default NewPlayerForm;
