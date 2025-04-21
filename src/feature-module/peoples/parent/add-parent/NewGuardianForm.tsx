import React from 'react';
import { GuardianFormData, ValidationErrors } from '../../../../types/types';
import { Address } from '../../../../utils/address';
import { formatPhoneNumber } from '../../../../utils/phone';

interface NewGuardianFormProps {
  newGuardian: GuardianFormData;
  guardianErrors: ValidationErrors;
  setNewGuardian: React.Dispatch<React.SetStateAction<GuardianFormData>>;
  setGuardianErrors: React.Dispatch<React.SetStateAction<ValidationErrors>>;
  setShowGuardianForm: React.Dispatch<React.SetStateAction<boolean>>;
  addGuardian: () => void;
  hasGuardians?: boolean;
}

const NewGuardianForm: React.FC<NewGuardianFormProps> = ({
  newGuardian,
  guardianErrors,
  setNewGuardian,
  setGuardianErrors,
  setShowGuardianForm,
  addGuardian,
  hasGuardians,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewGuardian((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (guardianErrors[name]) {
      setGuardianErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleAddressChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: keyof Address
  ) => {
    const { value } = e.target;
    setNewGuardian((prev) => ({
      ...prev,
      address: {
        ...prev.address,
        [field]: value,
      },
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
    setNewGuardian((prev) => ({
      ...prev,
      phone: formattedPhone,
    }));

    if (guardianErrors.phone) {
      setGuardianErrors((prev) => ({
        ...prev,
        phone: '',
      }));
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

  const handleAddGuardian = () => {
    addGuardian();
    setShowGuardianForm(false); // Hide the form after adding
  };

  return (
    <>
      <div className='border rounded p-3 mt-3'>
        <h5 className='mb-3'>Add New Parent/Guardian</h5>
        <div className='row row-cols-xxl-5 row-cols-md-6'>
          <div className='col-xxl col-xl-3 col-md-6'>
            <div className='mb-3'>
              <label className='form-label'>Full Name</label>
              <input
                type='text'
                className={`form-control ${
                  guardianErrors.fullName ? 'is-invalid' : ''
                }`}
                name='fullName'
                value={newGuardian.fullName}
                onChange={handleChange}
                required
              />
              {guardianErrors.fullName && (
                <div className='invalid-feedback d-block'>
                  {guardianErrors.fullName}
                </div>
              )}
            </div>
          </div>
          <div className='col-xxl col-xl-3 col-md-6'>
            <div className='mb-3'>
              <label className='form-label'>Email</label>
              <input
                type='email'
                className={`form-control ${
                  guardianErrors.email ? 'is-invalid' : ''
                }`}
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
                className={`form-control ${
                  guardianErrors.phone ? 'is-invalid' : ''
                }`}
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
                className={`form-control ${
                  guardianErrors.relationship ? 'is-invalid' : ''
                }`}
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
                className={`form-control ${
                  guardianErrors['address.street'] ? 'is-invalid' : ''
                }`}
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
                className={`form-control ${
                  guardianErrors['address.city'] ? 'is-invalid' : ''
                }`}
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
                className={`form-control ${
                  guardianErrors['address.state'] ? 'is-invalid' : ''
                }`}
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
                className={`form-control ${
                  guardianErrors['address.zip'] ? 'is-invalid' : ''
                }`}
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
            onClick={() => {
              setShowGuardianForm(false);
              setNewGuardian({
                fullName: '',
                email: '',
                phone: '',
                address: {
                  street: '',
                  street2: '',
                  city: '',
                  state: '',
                  zip: '',
                },
                relationship: '',
                aauNumber: '',
                isCoach: false,
              });
              setGuardianErrors({});
            }}
          >
            Cancel
          </button>
          <button
            type='button'
            className='btn btn-primary'
            onClick={handleAddGuardian}
          >
            Add Parent/Guardian
          </button>
        </div>
      </div>
    </>
  );
};

export default NewGuardianForm;
