// GuardianForm.tsx
import React, { useRef, useState } from 'react';
import { GuardianFormData } from '../../../../types/types';
import { Address } from '../../../../utils/address';
import { formatPhoneNumber } from '../../../../utils/phone';
import NameInput from '../../../../components/NameInput';
import { getDefaultAvatar, getAvatarUrl } from '../../../../utils/r2Utils';
import {
  validatePhoneNumber,
  validateEmail,
  validateRequired,
  validateState,
  validateZipCode,
} from '../../../../utils/validation';

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
  avatarPreview?: string | null;
  avatarUploading?: boolean;
  onAvatarChange?: (file: File, index: number) => void;
  onAvatarRemove?: (index: number) => void;
  errors?: Record<string, string>;
  visibleFields?: any[];
  mainAddress?: Address;
  onSameAsMainChange?: (index: number, checked: boolean) => void;
  sameAsMain?: boolean;
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
  visibleFields = [],
  mainAddress,
  onSameAsMainChange,
  sameAsMain = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const DEFAULT_AVATAR = getDefaultAvatar('parent');

  const hasField = (fieldName: string) => {
    if (visibleFields.length === 0) return true;
    return visibleFields.some((f) => f.fieldName === fieldName);
  };

  const isFieldRequired = (fieldName: string): boolean => {
    if (visibleFields.length === 0) return false;
    const field = visibleFields.find((f) => f.fieldName === fieldName);
    return field?.isRequired || false;
  };

  const hasSavedId =
    !!guardian._id &&
    !guardian._id.toString().startsWith('temp_') &&
    guardian._id.toString().length === 24;

  const existingAvatar = guardian.avatar
    ? getAvatarUrl(guardian.avatar, DEFAULT_AVATAR)
    : null;

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

  const handleCoachChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    handleGuardianInputChange(
      {
        target: { name: 'isCoach', value: checked },
      } as any,
      index,
    );
    if (!checked) {
      handleGuardianInputChange(
        {
          target: { name: 'aauNumber', value: '' },
        } as any,
        index,
      );
    }
  };

  return (
    <div id={`guardian-${index}`} className='border rounded p-0 mb-3'>
      <div className='card-header d-flex align-items-center justify-content-between bg-light'>
        <h5 className='mb-0'>{guardian.fullName || `Guardian ${index + 1}`}</h5>
        <button
          type='button'
          className='btn btn-danger btn-sm'
          onClick={() => removeGuardian(index)}
          disabled={avatarUploading}
        >
          <i className='ti ti-trash me-1' /> Remove
        </button>
      </div>
      <div className='card-body pb-0'>
        {/* Avatar upload */}
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
      </div>

      <div className='card-body pb-0'>
        {/* Full Name - Always visible like NewGuardianForm */}
        <div className='row'>
          <div className='col-12'>
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
              error={errors.fullName}
              required={true}
            />
          </div>
        </div>

        {/* First row: Email, Phone, Relationship */}
        <div className='row'>
          {hasField('email') && (
            <div className='col-md-4'>
              <div className='mb-3'>
                <label className='form-label'>
                  Email
                  {isFieldRequired('email') && (
                    <span className='text-danger ms-1'>*</span>
                  )}
                </label>
                <input
                  type='email'
                  className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                  name='email'
                  value={guardian.email}
                  onChange={(e) => handleGuardianInputChange(e, index)}
                  disabled={sameAsMain}
                />
                {errors.email && (
                  <div className='invalid-feedback d-block'>{errors.email}</div>
                )}
              </div>
            </div>
          )}

          {hasField('phone') && (
            <div className='col-md-4'>
              <div className='mb-3'>
                <label className='form-label'>
                  Phone
                  {isFieldRequired('phone') && (
                    <span className='text-danger ms-1'>*</span>
                  )}
                </label>
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
                  disabled={sameAsMain}
                />
                {errors.phone && (
                  <div className='invalid-feedback d-block'>{errors.phone}</div>
                )}
              </div>
            </div>
          )}

          {hasField('relationship') && (
            <div className='col-md-4'>
              <div className='mb-3'>
                <label className='form-label'>
                  Relationship
                  {isFieldRequired('relationship') && (
                    <span className='text-danger ms-1'>*</span>
                  )}
                </label>
                <input
                  type='text'
                  className={`form-control ${errors.relationship ? 'is-invalid' : ''}`}
                  name='relationship'
                  value={guardian.relationship}
                  onChange={(e) => handleGuardianInputChange(e, index)}
                  disabled={sameAsMain}
                />
                {errors.relationship && (
                  <div className='invalid-feedback d-block'>
                    {errors.relationship}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Second row: Coach checkbox and AAU */}
        {hasField('isCoach') && (
          <div className='row'>
            <div className='col-md-3'>
              <div className='mb-3'>
                <div className='form-check mt-2'>
                  <input
                    type='checkbox'
                    className='form-check-input'
                    id={`guardian-${index}-isCoach`}
                    name='isCoach'
                    checked={guardian.isCoach || false}
                    onChange={handleCoachChange}
                    disabled={sameAsMain}
                  />
                  <label
                    className='form-check-label'
                    htmlFor={`guardian-${index}-isCoach`}
                  >
                    This guardian is a coach
                  </label>
                </div>
              </div>
            </div>

            {guardian.isCoach && (
              <div className='col-md-9'>
                <div className='mb-3'>
                  <label className='form-label'>
                    AAU Number
                    <span className='text-muted ms-1 fw-normal'>
                      (Required for coaches)
                    </span>
                  </label>
                  <input
                    type='text'
                    className={`form-control ${errors.aauNumber ? 'is-invalid' : ''}`}
                    name='aauNumber'
                    value={guardian.aauNumber}
                    onChange={(e) => handleAauNumberChange(e, true, index)}
                    disabled={sameAsMain}
                  />
                  {errors.aauNumber && (
                    <div className='invalid-feedback d-block'>
                      {errors.aauNumber}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Same as main address checkbox */}
        {mainAddress && onSameAsMainChange && (
          <div className='row mb-3'>
            <div className='col-12'>
              <div className='form-check'>
                <input
                  type='checkbox'
                  className='form-check-input'
                  id={`guardian-same-address-${index}`}
                  checked={sameAsMain}
                  onChange={(e) => onSameAsMainChange(index, e.target.checked)}
                />
                <label
                  className='form-check-label'
                  htmlFor={`guardian-same-address-${index}`}
                >
                  Same as main address
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Address Section */}
        {!sameAsMain &&
          (hasField('address') ||
            hasField('city') ||
            hasField('state') ||
            hasField('zip')) && (
            <div className='row mt-2'>
              {hasField('address') && (
                <>
                  <div className='col-md-6'>
                    <div className='mb-3'>
                      <label className='form-label'>
                        Street Address
                        {isFieldRequired('address') && (
                          <span className='text-danger ms-1'>*</span>
                        )}
                      </label>
                      <input
                        type='text'
                        className={`form-control ${errors['address.street'] ? 'is-invalid' : ''}`}
                        value={guardian.address.street}
                        onChange={(e) =>
                          handleGuardianAddressChange(e, 'street', index)
                        }
                        disabled={sameAsMain}
                      />
                      {errors['address.street'] && (
                        <div className='invalid-feedback d-block'>
                          {errors['address.street']}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className='col-md-6'>
                    <div className='mb-3'>
                      <label className='form-label'>Apt/Suite (optional)</label>
                      <input
                        type='text'
                        className='form-control'
                        value={guardian.address.street2}
                        onChange={(e) =>
                          handleGuardianAddressChange(e, 'street2', index)
                        }
                        disabled={sameAsMain}
                      />
                    </div>
                  </div>
                </>
              )}

              {hasField('city') && (
                <div className='col-md-4'>
                  <div className='mb-3'>
                    <label className='form-label'>
                      City
                      {isFieldRequired('city') && (
                        <span className='text-danger ms-1'>*</span>
                      )}
                    </label>
                    <input
                      type='text'
                      className={`form-control ${errors['address.city'] ? 'is-invalid' : ''}`}
                      value={guardian.address.city}
                      onChange={(e) =>
                        handleGuardianAddressChange(e, 'city', index)
                      }
                      disabled={sameAsMain}
                    />
                    {errors['address.city'] && (
                      <div className='invalid-feedback d-block'>
                        {errors['address.city']}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {hasField('state') && (
                <div className='col-md-4'>
                  <div className='mb-3'>
                    <label className='form-label'>
                      State
                      {isFieldRequired('state') && (
                        <span className='text-danger ms-1'>*</span>
                      )}
                    </label>
                    <input
                      type='text'
                      className={`form-control ${errors['address.state'] ? 'is-invalid' : ''}`}
                      value={guardian.address.state}
                      onChange={(e) =>
                        handleGuardianAddressChange(e, 'state', index)
                      }
                      maxLength={2}
                      disabled={sameAsMain}
                    />
                    {errors['address.state'] && (
                      <div className='invalid-feedback d-block'>
                        {errors['address.state']}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {hasField('zip') && (
                <div className='col-md-4'>
                  <div className='mb-3'>
                    <label className='form-label'>
                      ZIP Code
                      {isFieldRequired('zip') && (
                        <span className='text-danger ms-1'>*</span>
                      )}
                    </label>
                    <input
                      type='text'
                      className={`form-control ${errors['address.zip'] ? 'is-invalid' : ''}`}
                      value={guardian.address.zip}
                      onChange={(e) =>
                        handleGuardianAddressChange(e, 'zip', index)
                      }
                      maxLength={10}
                      disabled={sameAsMain}
                    />
                    {errors['address.zip'] && (
                      <div className='invalid-feedback d-block'>
                        {errors['address.zip']}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
      </div>
    </div>
  );
};

export default GuardianForm;
