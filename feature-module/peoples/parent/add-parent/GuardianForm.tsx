import React from 'react';
import { GuardianFormData } from '../../../../types/types';
import { Address } from '../../../../utils/address';

interface GuardianFormProps {
  guardian: GuardianFormData;
  index: number;
  handleGuardianInputChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    index: number
  ) => void;
  handleGuardianAddressChange: (
    e: React.ChangeEvent<HTMLInputElement>,
    field: keyof Address,
    index: number
  ) => void;
  removeGuardian: (index: number) => void;
  handleAauNumberChange: (
    e: React.ChangeEvent<HTMLInputElement>,
    isGuardian: boolean,
    index: number
  ) => void;
}

const GuardianForm: React.FC<GuardianFormProps> = ({
  guardian,
  index,
  handleGuardianInputChange,
  handleGuardianAddressChange,
  removeGuardian,
  handleAauNumberChange,
}) => {
  return (
    <div key={guardian.id || index} id={`guardian-${index}`} className='mb-2'>
      <div className='row row-cols-xxl-5 row-cols-md-6'>
        <div className='col-xxl col-xl-3 col-md-6'>
          <div className='mb-3'>
            <label className='form-label'>Full Name</label>
            <input
              type='text'
              className='form-control'
              name='fullName'
              value={guardian.fullName}
              onChange={(e) => handleGuardianInputChange(e, index)}
              required
            />
          </div>
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
              className='form-control'
              name='phone'
              value={guardian.phone}
              onChange={(e) => handleGuardianInputChange(e, index)}
              required
            />
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
        <div className='col-xxl col-xl-3 col-md-6'>
          <div className='mb-0'>
            <div className='form-check form-switch'>
              <input
                type='hidden'
                name={`additionalGuardians[${index}].isCoach`}
                value={guardian.isCoach ? 'true' : 'false'}
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
            className='btn btn-danger'
            onClick={() => removeGuardian(index)}
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
};

export default GuardianForm;
