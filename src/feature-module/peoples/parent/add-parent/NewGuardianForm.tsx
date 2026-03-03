import React, { useRef } from 'react';
import { GuardianFormData, ValidationErrors } from '../../../../types/types';
import { Address } from '../../../../utils/address';
import { formatPhoneNumber } from '../../../../utils/phone';
import NameInput from '../../../../components/NameInput';
import { getDefaultAvatar } from '../../../../utils/r2Utils';

interface NewGuardianFormProps {
  newGuardian: GuardianFormData;
  guardianErrors: ValidationErrors;
  setNewGuardian: React.Dispatch<React.SetStateAction<GuardianFormData>>;
  setGuardianErrors: React.Dispatch<React.SetStateAction<ValidationErrors>>;
  setShowGuardianForm: React.Dispatch<React.SetStateAction<boolean>>;
  addGuardian: () => void;
  hasGuardians?: boolean;
  // ✅ Avatar props
  avatarPreview?: string | null;
  onAvatarChange?: (file: File) => void;
  onAvatarRemove?: () => void;
}

const NewGuardianForm: React.FC<NewGuardianFormProps> = ({
  newGuardian,
  guardianErrors,
  setNewGuardian,
  setGuardianErrors,
  setShowGuardianForm,
  addGuardian,
  avatarPreview,
  onAvatarChange,
  onAvatarRemove,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const DEFAULT_AVATAR = getDefaultAvatar('parent');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && onAvatarChange) {
      onAvatarChange(e.target.files[0]);
    }
  };

  const handleRemoveAvatar = () => {
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (onAvatarRemove) onAvatarRemove();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewGuardian((prev) => ({ ...prev, [name]: value }));
    if (guardianErrors[name]) {
      setGuardianErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleAddressChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: keyof Address,
  ) => {
    const { value } = e.target;
    setNewGuardian((prev) => ({
      ...prev,
      address: { ...prev.address, [field]: value },
    }));
    if (guardianErrors[`address.${field}`]) {
      setGuardianErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[`address.${field}`];
        return newErrors;
      });
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedPhone = formatPhoneNumber(e.target.value.replace(/\D/g, ''));
    setNewGuardian((prev) => ({ ...prev, phone: formattedPhone }));
    if (guardianErrors.phone) {
      setGuardianErrors((prev) => ({ ...prev, phone: '' }));
    }
  };

  const handleAauNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hasAauNumber = e.target.value.trim().length > 0;
    setNewGuardian((prev) => ({
      ...prev,
      aauNumber: e.target.value,
      isCoach: hasAauNumber,
    }));
  };

  const handleCancel = () => {
    setShowGuardianForm(false);
    setNewGuardian({
      fullName: '',
      email: '',
      phone: '',
      address: { street: '', street2: '', city: '', state: '', zip: '' },
      relationship: '',
      aauNumber: '',
      isCoach: false,
    });
    setGuardianErrors({});
    if (onAvatarRemove) onAvatarRemove();
  };

  return (
    <div className='border rounded p-3 mt-3'>
      <h5 className='mb-3'>Add New Parent/Guardian</h5>

      {/* ✅ Avatar upload */}
      <div className='d-flex align-items-center flex-wrap row-gap-3 mb-3'>
        <div className='d-flex align-items-center justify-content-center avatar avatar-xxl border border-dashed me-2 flex-shrink-0 text-dark frames'>
          {avatarPreview ? (
            <img
              src={avatarPreview}
              alt='Guardian avatar preview'
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

      {/* Form fields */}
      <div className='row row-cols-xxl-5 row-cols-md-6'>
        {/* Full Name */}
        <div className='col-xxl col-xl-3 col-md-6'>
          <NameInput
            value={newGuardian.fullName}
            onChange={(val) =>
              handleChange({
                target: { name: 'fullName', value: val },
              } as React.ChangeEvent<HTMLInputElement>)
            }
            error={guardianErrors.fullName}
            required
          />
        </div>
      </div>
      <div className='row row-cols-xxl-5 row-cols-md-6'>
        <div className='col-xxl col-xl-3 col-md-6'>
          <div className='mb-3'>
            <label className='form-label'>Email</label>
            <input
              type='email'
              className={`form-control ${guardianErrors.email ? 'is-invalid' : ''}`}
              name='email'
              value={newGuardian.email}
              onChange={handleChange}
              required
            />
            {guardianErrors.email && (
              <div className='invalid-feedback d-block'>
                {guardianErrors.email}
              </div>
            )}
          </div>
        </div>
        <div className='col-xxl col-xl-3 col-md-6'>
          <div className='mb-3'>
            <label className='form-label'>Phone</label>
            <input
              type='tel'
              className={`form-control ${guardianErrors.phone ? 'is-invalid' : ''}`}
              name='phone'
              value={newGuardian.phone}
              onChange={handlePhoneChange}
              required
            />
            {guardianErrors.phone && (
              <div className='invalid-feedback d-block'>
                {guardianErrors.phone}
              </div>
            )}
          </div>
        </div>
        <div className='col-xxl col-xl-3 col-md-6'>
          <div className='mb-3'>
            <label className='form-label'>Relationship</label>
            <input
              type='text'
              className={`form-control ${guardianErrors.relationship ? 'is-invalid' : ''}`}
              name='relationship'
              value={newGuardian.relationship}
              onChange={handleChange}
              required
            />
            {guardianErrors.relationship && (
              <div className='invalid-feedback d-block'>
                {guardianErrors.relationship}
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
              value={newGuardian.aauNumber}
              onChange={handleAauNumberChange}
            />
          </div>
        </div>
        <div className='col-xxl col-xl-3 col-md-6'>
          <div className='mb-0'>
            <div className='form-check form-switch'>
              <input
                type='hidden'
                name='newGuardian.isCoach'
                value={newGuardian.isCoach ? 'true' : 'false'}
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
              className={`form-control ${guardianErrors['address.street'] ? 'is-invalid' : ''}`}
              value={newGuardian.address.street}
              onChange={(e) => handleAddressChange(e, 'street')}
              required
            />
            {guardianErrors['address.street'] && (
              <div className='invalid-feedback d-block'>
                {guardianErrors['address.street']}
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
              value={newGuardian.address.street2}
              onChange={(e) => handleAddressChange(e, 'street2')}
            />
          </div>
        </div>
        <div className='col-xxl col-xl-1 col-md-3'>
          <div className='mb-3'>
            <label className='form-label'>City</label>
            <input
              type='text'
              className={`form-control ${guardianErrors['address.city'] ? 'is-invalid' : ''}`}
              value={newGuardian.address.city}
              onChange={(e) => handleAddressChange(e, 'city')}
              required
            />
            {guardianErrors['address.city'] && (
              <div className='invalid-feedback d-block'>
                {guardianErrors['address.city']}
              </div>
            )}
          </div>
        </div>
        <div className='col-xxl col-xl-1 col-md-3'>
          <div className='mb-3'>
            <label className='form-label'>State</label>
            <input
              type='text'
              className={`form-control ${guardianErrors['address.state'] ? 'is-invalid' : ''}`}
              value={newGuardian.address.state}
              onChange={(e) => handleAddressChange(e, 'state')}
              maxLength={2}
              required
            />
            {guardianErrors['address.state'] && (
              <div className='invalid-feedback d-block'>
                {guardianErrors['address.state']}
              </div>
            )}
          </div>
        </div>
        <div className='col-xxl col-xl-1 col-md-3'>
          <div className='mb-3'>
            <label className='form-label'>ZIP Code</label>
            <input
              type='text'
              className={`form-control ${guardianErrors['address.zip'] ? 'is-invalid' : ''}`}
              value={newGuardian.address.zip}
              onChange={(e) => handleAddressChange(e, 'zip')}
              maxLength={10}
              required
            />
            {guardianErrors['address.zip'] && (
              <div className='invalid-feedback d-block'>
                {guardianErrors['address.zip']}
              </div>
            )}
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
        <button type='button' className='btn btn-primary' onClick={addGuardian}>
          Add Parent/Guardian
        </button>
      </div>
    </div>
  );
};

export default NewGuardianForm;
