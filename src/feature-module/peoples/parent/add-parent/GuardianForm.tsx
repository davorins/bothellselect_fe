import React, { useRef } from 'react';
import { GuardianFormData } from '../../../../types/types';
import { Address } from '../../../../utils/address';
import { formatPhoneNumber } from '../../../../utils/phone';
import NameInput from '../../../../components/NameInput';
import { getDefaultAvatar, getAvatarUrl } from '../../../../utils/r2Utils';

interface GuardianFormProps {
  guardian: GuardianFormData;
  index: number;
  handleGuardianInputChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    index: number,
  ) => void;
  handleGuardianAddressChange: (
    e: React.ChangeEvent<HTMLInputElement>,
    field: keyof Address,
    index: number,
  ) => void;
  removeGuardian: (index: number) => void;
  handleAauNumberChange: (
    e: React.ChangeEvent<HTMLInputElement>,
    isGuardian: boolean,
    index: number,
  ) => void;
  // ✅ Avatar props
  avatarPreview?: string | null;
  avatarUploading?: boolean;
  onAvatarChange?: (file: File, index: number) => void;
  onAvatarRemove?: (index: number) => void;
  errors?: {
    phone?: string;
    [key: string]: any;
  };
}

const GuardianForm: React.FC<GuardianFormProps> = ({
  guardian,
  index,
  handleGuardianInputChange,
  handleGuardianAddressChange,
  removeGuardian,
  handleAauNumberChange,
  avatarPreview,
  avatarUploading = false,
  onAvatarChange,
  onAvatarRemove,
  errors = {},
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const DEFAULT_AVATAR = getDefaultAvatar('parent');

  // Check if guardian has an ID (exists in database)
  const hasSavedId = !!guardian._id;

  // Resolve existing saved avatar — handles R2, legacy, null
  const existingAvatar = guardian.avatar
    ? getAvatarUrl(guardian.avatar, DEFAULT_AVATAR)
    : null;

  // Preview takes priority over saved avatar
  const displayAvatar = avatarPreview || existingAvatar;
  const hasAvatar = !!displayAvatar;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && onAvatarChange) {
      onAvatarChange(e.target.files[0], index);
    }
  };

  const handleRemove = () => {
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (onAvatarRemove) onAvatarRemove(index);
  };

  return (
    <div id={`guardian-${index}`} className='border rounded p-3 mb-3'>
      {/* ✅ Avatar upload row - Now with proper save-first message */}
      <div className='d-flex align-items-center flex-wrap row-gap-3 mb-3'>
        <div className='d-flex align-items-center justify-content-center avatar avatar-xxl border border-dashed me-2 flex-shrink-0 text-dark frames'>
          {hasAvatar ? (
            <img
              src={displayAvatar!}
              alt='Guardian avatar'
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
              {hasSavedId ? 'Upload Photo' : 'Save guardian first'}
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
              : 'Save the guardian first to enable avatar upload'}
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

      {/* Form fields - rest of your component remains the same */}
      <div className='row row-cols-xxl-5 row-cols-md-6'>
        <div className='col-xxl col-xl-3 col-md-6'>
          <NameInput
            value={guardian.fullName}
            onChange={(val) =>
              handleGuardianInputChange(
                {
                  target: { name: 'fullName', value: val },
                } as React.ChangeEvent<HTMLInputElement>,
                index,
              )
            }
            required
          />
        </div>
        <div className='col-xxl col-xl-3 col-md-6'>
          <div className='mb-3'>
            <label className='form-label'>Email</label>
            <input
              type='email'
              className='form-control'
              name='email'
              value={guardian.email}
              onChange={(e) => handleGuardianInputChange(e, index)}
              required
            />
          </div>
        </div>
        <div className='col-xxl col-xl-3 col-md-6'>
          <div className='mb-3'>
            <label className='form-label'>Phone</label>
            <input
              type='tel'
              className={`form-control ${errors.phone ? 'is-invalid' : ''}`}
              name='phone'
              value={formatPhoneNumber(guardian.phone)}
              onChange={(e) => {
                const rawValue = e.target.value.replace(/\D/g, '');
                const syntheticEvent = {
                  ...e,
                  target: { ...e.target, value: rawValue, name: 'phone' },
                };
                handleGuardianInputChange(syntheticEvent, index);
              }}
              maxLength={14}
              required
            />
            {errors.phone && (
              <div className='invalid-feedback d-block'>{errors.phone}</div>
            )}
          </div>
        </div>
        <div className='col-xxl col-xl-3 col-md-6'>
          <div className='mb-3'>
            <label className='form-label'>Relationship</label>
            <input
              type='text'
              className='form-control'
              name='relationship'
              value={guardian.relationship}
              onChange={(e) => handleGuardianInputChange(e, index)}
              required
            />
          </div>
        </div>
        <div className='col-xxl col-xl-3 col-md-6'>
          <div className='mb-3'>
            <label className='form-label'>AAU Number</label>
            <input
              type='text'
              className='form-control'
              name='aauNumber'
              value={guardian.aauNumber}
              onChange={(e) => handleAauNumberChange(e, true, index)}
            />
          </div>
        </div>
      </div>

      <div className='row row-cols-xxl-5 row-cols-md-6'>
        <div className='col-xxl col-xl-1 col-md-3'>
          <div className='mb-3'>
            <label className='form-label'>Street Address</label>
            <input
              type='text'
              className='form-control'
              value={guardian.address.street}
              onChange={(e) => handleGuardianAddressChange(e, 'street', index)}
              required
            />
          </div>
        </div>
        <div className='col-xxl col-xl-1 col-md-3'>
          <div className='mb-3'>
            <label className='form-label'>Apt/Unit (optional)</label>
            <input
              type='text'
              className='form-control'
              value={guardian.address.street2}
              onChange={(e) => handleGuardianAddressChange(e, 'street2', index)}
            />
          </div>
        </div>
        <div className='col-xxl col-xl-1 col-md-3'>
          <div className='mb-3'>
            <label className='form-label'>City</label>
            <input
              type='text'
              className='form-control'
              value={guardian.address.city}
              onChange={(e) => handleGuardianAddressChange(e, 'city', index)}
              required
            />
          </div>
        </div>
        <div className='col-xxl col-xl-1 col-md-3'>
          <div className='mb-3'>
            <label className='form-label'>State</label>
            <input
              type='text'
              className='form-control'
              value={guardian.address.state}
              onChange={(e) => handleGuardianAddressChange(e, 'state', index)}
              maxLength={2}
              required
            />
          </div>
        </div>
        <div className='col-xxl col-xl-1 col-md-3'>
          <div className='mb-3'>
            <label className='form-label'>ZIP Code</label>
            <input
              type='text'
              className='form-control'
              value={guardian.address.zip}
              onChange={(e) => handleGuardianAddressChange(e, 'zip', index)}
              maxLength={10}
              required
            />
          </div>
        </div>
        <div className='col-xxl col-xl-1 col-md-3 d-flex align-items-end'>
          <button
            type='button'
            className='btn btn-danger mb-3'
            onClick={() => removeGuardian(index)}
            disabled={avatarUploading}
          >
            Remove Guardian
          </button>
        </div>
      </div>
    </div>
  );
};

export default GuardianForm;
