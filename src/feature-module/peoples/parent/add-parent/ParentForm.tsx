import React from 'react';
import { ParentFormData, ValidationErrors } from '../../../../types/types';
import { Address } from '../../../../utils/address';
import { formatPhoneNumber } from '../../../../utils/phone';

interface ParentFormProps {
  formData: ParentFormData;
  errors: ValidationErrors;
  avatarPreview: string | null;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleInputChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => void;
  handleAddressChange: (
    e: React.ChangeEvent<HTMLInputElement>,
    field: keyof Address
  ) => void;
  handleAvatarChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removeAvatar: () => void;
  handleAauNumberChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isEdit?: boolean;
  isUploading?: boolean;
  avatarFile?: File | null;
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
  avatarFile = null,
}) => {
  const getAvatarSource = () => {
    if (avatarPreview) {
      return avatarPreview;
    }
    if (formData.avatar) {
      // Check if it's already a full URL or needs the base URL
      if (formData.avatar.startsWith('http')) {
        return formData.avatar;
      }
      return `https://bothell-select.onrender.com${formData.avatar}`;
    }
    return null;
  };

  const avatarSrc = getAvatarSource();
  return (
    <div className='card'>
      <div className='card-header bg-light'>
        <div className='d-flex align-items-center'>
          <span className='bg-white avatar avatar-sm me-2 text-gray-7 flex-shrink-0'>
            <i className='ti ti-info-square-rounded fs-16' />
          </span>
          <h4 className='text-dark'>Primary Parent Information</h4>
        </div>
      </div>
      <div className='card-body pb-1'>
        <div className='row'>
          <div className='col-md-12'>
            <div className='d-flex align-items-center flex-wrap row-gap-3 mb-3'>
              <div className='d-flex align-items-center justify-content-center avatar avatar-xxl border border-dashed me-2 flex-shrink-0 text-dark frames'>
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt='Avatar Preview'
                    className='img-fluid rounded'
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                ) : formData.avatar ? (
                  <img
                    src={`https://bothell-select.onrender.com${formData.avatar}`}
                    alt='Avatar'
                    className='img-fluid rounded'
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  <i className='ti ti-photo-plus fs-16' />
                )}
              </div>
              <div className='profile-upload'>
                <div className='profile-uploader d-flex align-items-center'>
                  <div className='drag-upload-btn mb-3'>
                    Upload
                    <input
                      type='file'
                      className='form-control image-sign'
                      ref={fileInputRef}
                      onChange={handleAvatarChange}
                      accept='image/jpeg, image/png'
                      disabled={isUploading}
                    />
                  </div>
                  {(avatarPreview || formData.avatar) && (
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
                {isUploading && <div className='mt-2'>Uploading...</div>}
              </div>
            </div>
          </div>
        </div>
        <div className='row row-cols-xxl-5 row-cols-md-6'>
          <div className='col-xxl col-xl-3 col-md-6'>
            <div className='mb-3'>
              <label className='form-label'>Full Name</label>
              <input
                type='text'
                className={`form-control ${
                  errors.fullName ? 'is-invalid' : ''
                }`}
                name='fullName'
                value={formData.fullName}
                onChange={handleInputChange}
                required
              />
              {errors.fullName && (
                <div className='invalid-feedback d-block'>
                  {errors.fullName}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className='row row-cols-xxl-5 row-cols-md-6'>
          <div className='col-xxl col-xl-3 col-md-6'>
            <div className='mb-3'>
              <label className='form-label'>Email</label>
              <input
                type='email'
                className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                name='email'
                value={formData.email}
                onChange={handleInputChange}
                required
              />
              {errors.email && (
                <div className='invalid-feedback d-block'>{errors.email}</div>
              )}
            </div>
          </div>
          {!isEdit && (
            <div className='col-xxl col-xl-3 col-md-6'>
              <div className='mb-3'>
                <label className='form-label'>Password</label>
                <input
                  type='password'
                  className={`form-control ${
                    errors.password ? 'is-invalid' : ''
                  }`}
                  name='password'
                  value={formData.password || ''}
                  onChange={handleInputChange}
                  required
                  minLength={6}
                />
                {errors.password && (
                  <div className='invalid-feedback d-block'>
                    {errors.password}
                  </div>
                )}
              </div>
            </div>
          )}
          <div className='col-xxl col-xl-3 col-md-6'>
            <div className='mb-3'>
              <label className='form-label'>Phone</label>
              <input
                type='tel'
                className={`form-control ${errors.phone ? 'is-invalid' : ''}`}
                name='phone'
                value={formatPhoneNumber(formData.phone)}
                onChange={(e) => {
                  // Create a synthetic event with the raw digits
                  const rawValue = e.target.value.replace(/\D/g, '');
                  const syntheticEvent = {
                    ...e,
                    target: {
                      ...e.target,
                      value: rawValue,
                      name: 'phone',
                    },
                  };
                  handleInputChange(syntheticEvent);
                }}
                maxLength={14} // (123) 456-7890 is 14 characters
                required
              />
              {errors.phone && (
                <div className='invalid-feedback d-block'>{errors.phone}</div>
              )}
            </div>
          </div>
          <div className='col-xxl col-xl-3 col-md-6'>
            <div className='mb-3'>
              <label className='form-label'>Relationship to Player</label>
              <input
                type='text'
                className={`form-control ${
                  errors.relationship ? 'is-invalid' : ''
                }`}
                name='relationship'
                value={formData.relationship}
                onChange={handleInputChange}
                required
              />
              {errors.relationship && (
                <div className='invalid-feedback d-block'>
                  {errors.relationship}
                </div>
              )}
            </div>
          </div>
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
          <div className='col-xxl col-xl-3 col-md-6'>
            <div className='mb-0'>
              <div className='form-check form-switch'>
                <input
                  type='hidden'
                  name='isCoach'
                  value={formData.isCoach ? 'true' : 'false'}
                />
              </div>
            </div>
          </div>
        </div>
        <div className='row row-cols-xxl-5 row-cols-md-6'>
          <div className='col-xxl col-xl-1 col-md-3'>
            <div className='mb-3'>
              <label className='form-label'>Street Address</label>
              <input
                type='text'
                className={`form-control ${
                  errors['address.street'] ? 'is-invalid' : ''
                }`}
                value={formData.address.street}
                onChange={(e) => handleAddressChange(e, 'street')}
                required
              />
              {errors['address.street'] && (
                <div className='invalid-feedback d-block'>
                  {errors['address.street']}
                </div>
              )}
            </div>
          </div>
          <div className='col-xxl col-xl-1 col-md-3'>
            <div className='mb-3'>
              <label className='form-label'>Apt/Unit (optional)</label>
              <input
                type='text'
                className='form-control'
                value={formData.address.street2}
                onChange={(e) => handleAddressChange(e, 'street2')}
              />
            </div>
          </div>
          <div className='col-xxl col-xl-1 col-md-3'>
            <div className='mb-3'>
              <label className='form-label'>City</label>
              <input
                type='text'
                className={`form-control ${
                  errors['address.city'] ? 'is-invalid' : ''
                }`}
                value={formData.address.city}
                onChange={(e) => handleAddressChange(e, 'city')}
                required
              />
              {errors['address.city'] && (
                <div className='invalid-feedback d-block'>
                  {errors['address.city']}
                </div>
              )}
            </div>
          </div>
          <div className='col-xxl col-xl-1 col-md-3'>
            <div className='mb-3'>
              <label className='form-label'>State</label>
              <input
                type='text'
                className={`form-control ${
                  errors['address.state'] ? 'is-invalid' : ''
                }`}
                value={formData.address.state}
                onChange={(e) => handleAddressChange(e, 'state')}
                maxLength={2}
                required
              />
              {errors['address.state'] && (
                <div className='invalid-feedback d-block'>
                  {errors['address.state']}
                </div>
              )}
            </div>
          </div>
          <div className='col-xxl col-xl-1 col-md-3'>
            <div className='mb-3'>
              <label className='form-label'>ZIP Code</label>
              <input
                type='text'
                className={`form-control ${
                  errors['address.zip'] ? 'is-invalid' : ''
                }`}
                value={formData.address.zip}
                onChange={(e) => handleAddressChange(e, 'zip')}
                maxLength={10}
                required
              />
              {errors['address.zip'] && (
                <div className='invalid-feedback d-block'>
                  {errors['address.zip']}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParentForm;
