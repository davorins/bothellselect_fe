// NewGuardianForm.tsx
import React, { useRef, useState } from 'react';
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
  addGuardian: (avatarFile?: File) => void;
  onAvatarFileChange?: (file: File | null) => void;
  visibleFields?: any[];
  mainAddress?: Address;
}

const NewGuardianForm: React.FC<NewGuardianFormProps> = ({
  newGuardian,
  guardianErrors,
  setNewGuardian,
  setGuardianErrors,
  setShowGuardianForm,
  addGuardian,
  onAvatarFileChange,
  visibleFields = [],
  mainAddress,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const DEFAULT_AVATAR = getDefaultAvatar('parent');
  const [sameAsMain, setSameAsMain] = useState(false);

  // ── Avatar state lives here — no dependency on parent props ──────────────
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const hasField = (fieldName: string) => {
    if (visibleFields.length === 0) return true;
    return visibleFields.some((f) => f.fieldName === fieldName);
  };

  // Log what's happening for debugging
  console.log(
    '🔍 NewGuardianForm - visibleFields:',
    visibleFields.map((f) => f.fieldName),
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    onAvatarFileChange?.(file);
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    onAvatarFileChange?.(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewGuardian((prev) => ({ ...prev, [name]: value }));
    if (guardianErrors[name])
      setGuardianErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleAddressChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: keyof Address,
  ) => {
    setNewGuardian((prev) => ({
      ...prev,
      address: { ...prev.address, [field]: e.target.value },
    }));
    if (guardianErrors[`address.${field}`])
      setGuardianErrors((prev) => {
        const n = { ...prev };
        delete n[`address.${field}`];
        return n;
      });
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewGuardian((prev) => ({
      ...prev,
      phone: formatPhoneNumber(e.target.value.replace(/\D/g, '')),
    }));
    if (guardianErrors.phone)
      setGuardianErrors((prev) => ({ ...prev, phone: '' }));
  };

  const handleAauNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewGuardian((prev) => ({ ...prev, aauNumber: e.target.value }));
  };

  const handleCoachChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setNewGuardian((prev) => ({
      ...prev,
      isCoach: checked,
      aauNumber: checked ? prev.aauNumber : '',
    }));
  };

  const handleSameAsMainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setSameAsMain(checked);
    if (checked && mainAddress) {
      setNewGuardian((prev) => ({
        ...prev,
        address: {
          street: mainAddress.street || '',
          street2: mainAddress.street2 || '',
          city: mainAddress.city || '',
          state: mainAddress.state || '',
          zip: mainAddress.zip || '',
        },
      }));
    }
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
    handleRemoveAvatar();
    setSameAsMain(false);
  };

  const handleSubmit = () => {
    addGuardian(avatarFile ?? undefined);
  };

  return (
    <div className='border rounded p-3 mt-3'>
      <h5 className='mb-3'>Add New Parent/Guardian</h5>

      {/* ── Avatar — self-contained, no save required ───────────────────── */}
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
                accept='image/jpeg, image/png, image/webp'
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

      {/* ── Full Name ────────────────────────────────────────────────────── */}
      <div className='row'>
        <div className='col-12'>
          <div className='mb-3'>
            <NameInput
              value={newGuardian.fullName}
              onChange={(val) => {
                setNewGuardian((prev) => ({ ...prev, fullName: val }));
                if (guardianErrors.fullName)
                  setGuardianErrors((prev) => ({ ...prev, fullName: '' }));
              }}
              onClearError={() =>
                setGuardianErrors((prev) => ({ ...prev, fullName: '' }))
              }
              error={guardianErrors.fullName}
              required={true}
            />
          </div>
        </div>
      </div>

      {/* ── First row: Email, Phone, Relationship ────────────────────────── */}
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
                className={`form-control ${guardianErrors.email ? 'is-invalid' : ''}`}
                name='email'
                value={newGuardian.email}
                onChange={handleChange}
              />
              {guardianErrors.email && (
                <div className='invalid-feedback d-block'>
                  {guardianErrors.email}
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
                className={`form-control ${guardianErrors.phone ? 'is-invalid' : ''}`}
                name='phone'
                value={newGuardian.phone}
                onChange={handlePhoneChange}
                maxLength={14}
              />
              {guardianErrors.phone && (
                <div className='invalid-feedback d-block'>
                  {guardianErrors.phone}
                </div>
              )}
            </div>
          </div>
        )}

        {hasField('relationship') && (
          <div className='col-md-4'>
            <div className='mb-3'>
              <label className='form-label'>
                Relationship
                {visibleFields.find((f) => f.fieldName === 'relationship')
                  ?.isRequired && <span className='text-danger ms-1'>*</span>}
              </label>
              <input
                type='text'
                className={`form-control ${guardianErrors.relationship ? 'is-invalid' : ''}`}
                name='relationship'
                value={newGuardian.relationship}
                onChange={handleChange}
              />
              {guardianErrors.relationship && (
                <div className='invalid-feedback d-block'>
                  {guardianErrors.relationship}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Second row: Coach checkbox + AAU ─────────────────────────────── */}
      {hasField('isCoach') && (
        <div className='row align-items-start'>
          <div className='col-md-3'>
            <div className='mb-3'>
              <div className='form-check mt-2'>
                <input
                  type='checkbox'
                  className='form-check-input'
                  id='new-guardian-isCoach'
                  checked={newGuardian.isCoach}
                  onChange={handleCoachChange}
                />
                <label
                  className='form-check-label'
                  htmlFor='new-guardian-isCoach'
                >
                  This guardian is a coach
                </label>
              </div>
            </div>
          </div>

          {newGuardian.isCoach && (
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
                  className={`form-control ${guardianErrors.aauNumber ? 'is-invalid' : ''}`}
                  name='aauNumber'
                  value={newGuardian.aauNumber}
                  onChange={handleAauNumberChange}
                  placeholder='Enter AAU number'
                />
                {guardianErrors.aauNumber && (
                  <div className='invalid-feedback d-block'>
                    {guardianErrors.aauNumber}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Same as main address ─────────────────────────────────────────── */}
      {mainAddress && (
        <div className='row mb-3'>
          <div className='col-12'>
            <div className='form-check'>
              <input
                type='checkbox'
                className='form-check-input'
                id='new-guardian-same-address'
                checked={sameAsMain}
                onChange={handleSameAsMainChange}
              />
              <label
                className='form-check-label'
                htmlFor='new-guardian-same-address'
              >
                Same as main address
              </label>
            </div>
          </div>
        </div>
      )}

      {/* ── Address — each field checked independently ───────────────────── */}
      {!sameAsMain &&
        (hasField('address') ||
          hasField('city') ||
          hasField('state') ||
          hasField('zip')) && (
          <div className='row'>
            {hasField('address') && (
              <>
                <div className='col-md-6'>
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
                      className={`form-control ${guardianErrors['address.street'] ? 'is-invalid' : ''}`}
                      value={newGuardian.address.street}
                      onChange={(e) => handleAddressChange(e, 'street')}
                    />
                    {guardianErrors['address.street'] && (
                      <div className='invalid-feedback d-block'>
                        {guardianErrors['address.street']}
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
                      value={newGuardian.address.street2}
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
                    className={`form-control ${guardianErrors['address.city'] ? 'is-invalid' : ''}`}
                    value={newGuardian.address.city}
                    onChange={(e) => handleAddressChange(e, 'city')}
                  />
                  {guardianErrors['address.city'] && (
                    <div className='invalid-feedback d-block'>
                      {guardianErrors['address.city']}
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
                    className={`form-control ${guardianErrors['address.state'] ? 'is-invalid' : ''}`}
                    value={newGuardian.address.state}
                    onChange={(e) => handleAddressChange(e, 'state')}
                    maxLength={2}
                  />
                  {guardianErrors['address.state'] && (
                    <div className='invalid-feedback d-block'>
                      {guardianErrors['address.state']}
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
                    className={`form-control ${guardianErrors['address.zip'] ? 'is-invalid' : ''}`}
                    value={newGuardian.address.zip}
                    onChange={(e) => handleAddressChange(e, 'zip')}
                    maxLength={10}
                  />
                  {guardianErrors['address.zip'] && (
                    <div className='invalid-feedback d-block'>
                      {guardianErrors['address.zip']}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

      {/* ── Buttons ──────────────────────────────────────────────────────── */}
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

export default NewGuardianForm;
