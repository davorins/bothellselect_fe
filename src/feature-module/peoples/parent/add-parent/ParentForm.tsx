// ParentForm.tsx
import React, { useEffect } from 'react';
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
  onClearError?: (field: string) => void; // ← new: lets NameInput clear its error on type
  isEdit?: boolean;
  isUploading?: boolean;
  visibleFields?: any[];
  hasAddressField?: boolean;
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
  onClearError,
  isEdit = false,
  isUploading = false,
  visibleFields = [],
  hasAddressField = false,
}) => {
  const hasField = (fieldName: string) =>
    visibleFields.length === 0 ||
    visibleFields.some((f) => f.fieldName === fieldName);

  const hasNameField = hasField('fullName') || hasField('parentFullName');
  const nameError = errors.fullName || errors.parentFullName;

  const onFieldChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    handleInputChange(e);
  };

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
        {/* Avatar - always show */}
        <div className='d-flex align-items-center flex-wrap row-gap-3 mb-4'>
          <div className='d-flex align-items-center justify-content-center avatar avatar-xxl border border-dashed me-3 flex-shrink-0 text-dark frames'>
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt='Parent Avatar'
                className='img-fluid rounded'
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
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
                  onChange={handleAvatarChange}
                  accept='image/jpeg, image/png, image/webp'
                  disabled={isUploading}
                />
              </div>
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

        {/* Full Name */}
        {hasNameField && (
          <div className='row'>
            <div className='col-12'>
              <NameInput
                value={formData.fullName}
                onChange={(val) =>
                  handleInputChange({
                    target: { name: 'fullName', value: val },
                  } as React.ChangeEvent<HTMLInputElement>)
                }
                onClearError={() => onClearError?.('fullName')}
                error={nameError}
                required={
                  visibleFields.find(
                    (f) =>
                      f.fieldName === 'fullName' ||
                      f.fieldName === 'parentFullName',
                  )?.isRequired
                }
              />
            </div>
          </div>
        )}

        {/* First row: Email, Password (if new), Phone */}
        <div className='row'>
          {hasField('email') && (
            <div className='col-md-4'>
              <div className='mb-3'>
                <label className='form-label'>
                  Email
                  {visibleFields.find((f) => f.fieldName === 'email')
                    ?.isRequired && <span className='text-danger ms-1'>*</span>}
                </label>
                <input
                  type='email'
                  className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                  name='email'
                  value={formData.email}
                  onChange={onFieldChange}
                />
                {errors.email && (
                  <div className='invalid-feedback d-block'>{errors.email}</div>
                )}
              </div>
            </div>
          )}

          {!isEdit && (
            <div className='col-md-4'>
              <div className='mb-3'>
                <label className='form-label'>
                  Password
                  <span className='text-danger ms-1'>*</span>
                </label>
                <input
                  type='password'
                  className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                  name='password'
                  value={formData.password || ''}
                  onChange={onFieldChange}
                />
                {errors.password && (
                  <div className='invalid-feedback d-block'>
                    {errors.password}
                  </div>
                )}
              </div>
            </div>
          )}

          {hasField('phone') && (
            <div className='col-md-4'>
              <div className='mb-3'>
                <label className='form-label'>
                  Phone
                  {visibleFields.find((f) => f.fieldName === 'phone')
                    ?.isRequired && <span className='text-danger ms-1'>*</span>}
                </label>
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
          )}
        </div>

        {/* Second row: Relationship + Coach checkbox + AAU (slides in when checked) */}
        {(hasField('relationship') || hasField('isCoach')) && (
          <div className='row align-items-start'>
            {hasField('relationship') && (
              <div className='col-md-4'>
                <div className='mb-3'>
                  <label className='form-label'>
                    Relationship to Player
                    {visibleFields.find((f) => f.fieldName === 'relationship')
                      ?.isRequired && (
                      <span className='text-danger ms-1'>*</span>
                    )}
                  </label>
                  <input
                    type='text'
                    className={`form-control ${errors.relationship ? 'is-invalid' : ''}`}
                    name='relationship'
                    value={formData.relationship}
                    onChange={onFieldChange}
                  />
                  {errors.relationship && (
                    <div className='invalid-feedback d-block'>
                      {errors.relationship}
                    </div>
                  )}
                </div>
              </div>
            )}

            {hasField('isCoach') && (
              <div className='col-md-2'>
                <div className='mb-3'>
                  <div className='form-check mt-4'>
                    <input
                      type='checkbox'
                      className='form-check-input'
                      id='parent-isCoach'
                      name='isCoach'
                      checked={formData.isCoach}
                      onChange={handleInputChange}
                    />
                    <label
                      className='form-check-label'
                      htmlFor='parent-isCoach'
                    >
                      Are you a coach?
                    </label>
                  </div>
                </div>
              </div>
            )}

            {hasField('isCoach') && formData.isCoach && (
              <div className='col-md-6'>
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
                    value={formData.aauNumber}
                    onChange={handleAauNumberChange}
                    placeholder='Enter your AAU number'
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

        {/* Address Information — each field checked independently */}
        {hasAddressField && (
          <div className='row mt-3'>
            <div className='col-12'>
              <h6 className='mb-3'>
                <i className='ti ti-map me-2' />
                Address Information
              </h6>
            </div>

            {hasField('address') && (
              <>
                <div className='col-md-8'>
                  <div className='mb-3'>
                    <label className='form-label'>
                      Street Address
                      {visibleFields.find((f) => f.fieldName === 'address')
                        ?.isRequired && (
                        <span className='text-danger ms-1'>*</span>
                      )}
                    </label>
                    <input
                      type='text'
                      className={`form-control ${errors['address.street'] ? 'is-invalid' : ''}`}
                      value={formData.address.street}
                      onChange={(e) => handleAddressChange(e, 'street')}
                    />
                    {errors['address.street'] && (
                      <div className='invalid-feedback d-block'>
                        {errors['address.street']}
                      </div>
                    )}
                  </div>
                </div>
                <div className='col-md-4'>
                  <div className='mb-3'>
                    <label className='form-label'>Apt/Suite (optional)</label>
                    <input
                      type='text'
                      className='form-control'
                      value={formData.address.street2}
                      onChange={(e) => handleAddressChange(e, 'street2')}
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
                    {visibleFields.find((f) => f.fieldName === 'city')
                      ?.isRequired && (
                      <span className='text-danger ms-1'>*</span>
                    )}
                  </label>
                  <input
                    type='text'
                    className={`form-control ${errors['address.city'] ? 'is-invalid' : ''}`}
                    value={formData.address.city}
                    onChange={(e) => handleAddressChange(e, 'city')}
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
                    {visibleFields.find((f) => f.fieldName === 'state')
                      ?.isRequired && (
                      <span className='text-danger ms-1'>*</span>
                    )}
                  </label>
                  <input
                    type='text'
                    className={`form-control ${errors['address.state'] ? 'is-invalid' : ''}`}
                    value={formData.address.state}
                    onChange={(e) => handleAddressChange(e, 'state')}
                    maxLength={2}
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
                    {visibleFields.find((f) => f.fieldName === 'zip')
                      ?.isRequired && (
                      <span className='text-danger ms-1'>*</span>
                    )}
                  </label>
                  <input
                    type='text'
                    className={`form-control ${errors['address.zip'] ? 'is-invalid' : ''}`}
                    value={formData.address.zip}
                    onChange={(e) => handleAddressChange(e, 'zip')}
                    maxLength={10}
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

export default ParentForm;
