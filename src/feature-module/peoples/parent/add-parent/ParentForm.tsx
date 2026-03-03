import React from 'react';
import { ParentFormData, ValidationErrors } from '../../../../types/types';
import { Address } from '../../../../utils/address';
import { formatPhoneNumber } from '../../../../utils/phone';
import NameInput from '../../../../components/NameInput';

interface ParentFormProps {
  formData: ParentFormData;
  errors: ValidationErrors;
  avatarPreview: string | null;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleInputChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => void;
  handleAddressChange: (
    e: React.ChangeEvent<HTMLInputElement>,
    field: keyof Address,
  ) => void;
  handleAvatarChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removeAvatar: () => void;
  handleAauNumberChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isEdit?: boolean;
  isUploading?: boolean;
}

const ParentForm: React.FC<ParentFormProps> = ({
  formData,
  errors,
  avatarPreview,
  fileInputRef,
  handleInputChange,
  handleAddressChange,
  handleAvatarChange,
  removeAvatar,
  handleAauNumberChange,
  isEdit = false,
  isUploading = false,
}) => {
  return (
    <div className='card' id='primary-parent-card'>
      <div className='card-header bg-light'>
        <div className='d-flex align-items-center'>
          <span className='bg-white avatar avatar-sm me-2 text-gray-7 flex-shrink-0'>
            <i className='ti ti-info-square-rounded fs-16' />
          </span>
          <h4 className='text-dark mb-0'>Primary Parent Information</h4>
        </div>
      </div>

      <div className='card-body pb-1'>
        {/* Avatar - Always show upload option */}
        <div className='d-flex align-items-center flex-wrap row-gap-3 mb-4'>
          <div className='d-flex align-items-center justify-content-center avatar avatar-xxl border border-dashed me-3 flex-shrink-0 text-dark frames'>
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt='Parent Avatar'
                className='img-fluid rounded'
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => {
                  // Fallback to default if image fails
                  (e.target as HTMLImageElement).src = '';
                }}
              />
            ) : (
              <i className='ti ti-photo-plus fs-16' />
            )}
          </div>

          <div className='profile-upload'>
            <div className='profile-uploader d-flex align-items-center'>
              <div className='drag-upload-btn mb-3'>
                {/* Always show "Upload Photo" - user can select file anytime */}
                Upload Photo
                <input
                  type='file'
                  className='form-control image-sign'
                  ref={fileInputRef}
                  onChange={handleAvatarChange}
                  accept='image/jpeg, image/png, image/webp'
                  disabled={isUploading}
                />
              </div>

              {/* Show remove button only if there's an avatar preview */}
              {avatarPreview && (
                <button
                  type='button'
                  className='btn btn-primary mb-3 ms-2'
                  onClick={removeAvatar}
                  disabled={isUploading}
                >
                  Remove
                </button>
              )}
            </div>

            <p className='fs-12'>Upload image size 4MB, Format JPG, PNG</p>

            {isUploading && <div className='text-primary'>Uploading...</div>}
          </div>
        </div>

        {/* Main Fields - rest of the form remains the same */}
        <div className='row row-cols-xxl-5 row-cols-md-6'>
          {/* Full Name */}
          <div className='col-xxl col-xl-3 col-md-6'>
            <NameInput
              value={formData.fullName}
              onChange={(val) =>
                handleInputChange({
                  target: { name: 'fullName', value: val },
                } as React.ChangeEvent<HTMLInputElement>)
              }
              error={errors.fullName}
            />
          </div>
        </div>

        <div className='row row-cols-xxl-5 row-cols-md-6'>
          {/* Email */}
          <div className='col-xxl col-xl-3 col-md-6'>
            <div className='mb-3'>
              <label className='form-label'>Email</label>
              <input
                type='email'
                className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                name='email'
                value={formData.email}
                onChange={handleInputChange}
              />
              {errors.email && (
                <div className='invalid-feedback d-block'>{errors.email}</div>
              )}
            </div>
          </div>

          {/* Password (Create only) */}
          {!isEdit && (
            <div className='col-xxl col-xl-3 col-md-6'>
              <div className='mb-3'>
                <label className='form-label'>Password</label>
                <input
                  type='password'
                  className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                  name='password'
                  value={formData.password || ''}
                  onChange={handleInputChange}
                />
                {errors.password && (
                  <div className='invalid-feedback d-block'>
                    {errors.password}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Phone */}
          <div className='col-xxl col-xl-3 col-md-6'>
            <div className='mb-3'>
              <label className='form-label'>Phone</label>
              <input
                type='tel'
                className={`form-control ${errors.phone ? 'is-invalid' : ''}`}
                name='phone'
                value={formatPhoneNumber(formData.phone)}
                onChange={(e) => {
                  const rawValue = e.target.value.replace(/\D/g, '');
                  handleInputChange({
                    ...e,
                    target: { ...e.target, name: 'phone', value: rawValue },
                  } as React.ChangeEvent<HTMLInputElement>);
                }}
                maxLength={14}
              />
              {errors.phone && (
                <div className='invalid-feedback d-block'>{errors.phone}</div>
              )}
            </div>
          </div>

          {/* Relationship */}
          <div className='col-xxl col-xl-3 col-md-6'>
            <div className='mb-3'>
              <label className='form-label'>Relationship to Player</label>
              <input
                type='text'
                className={`form-control ${errors.relationship ? 'is-invalid' : ''}`}
                name='relationship'
                value={formData.relationship}
                onChange={handleInputChange}
              />
              {errors.relationship && (
                <div className='invalid-feedback d-block'>
                  {errors.relationship}
                </div>
              )}
            </div>
          </div>

          {/* AAU */}
          <div className='col-xxl col-xl-3 col-md-6'>
            <div className='mb-3'>
              <label className='form-label'>AAU Number</label>
              <input
                type='text'
                className='form-control'
                name='aauNumber'
                value={formData.aauNumber}
                onChange={handleAauNumberChange}
              />
            </div>
          </div>
        </div>

        {/* Address Section */}
        <div className='row row-cols-xxl-5 row-cols-md-6'>
          {(
            ['street', 'street2', 'city', 'state', 'zip'] as (keyof Address)[]
          ).map((field) => (
            <div key={field} className='col-xxl col-xl-1 col-md-3'>
              <div className='mb-3'>
                <label className='form-label'>
                  {field === 'street' && 'Street Address'}
                  {field === 'street2' && 'Apt/Unit (optional)'}
                  {field === 'city' && 'City'}
                  {field === 'state' && 'State'}
                  {field === 'zip' && 'ZIP Code'}
                </label>
                <input
                  type='text'
                  className={`form-control ${errors[`address.${field}`] ? 'is-invalid' : ''}`}
                  value={formData.address[field]}
                  onChange={(e) => handleAddressChange(e, field)}
                  maxLength={
                    field === 'state' ? 2 : field === 'zip' ? 10 : undefined
                  }
                />
                {errors[`address.${field}`] && (
                  <div className='invalid-feedback d-block'>
                    {errors[`address.${field}`]}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ParentForm;
