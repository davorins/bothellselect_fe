import React from 'react';
import { Link } from 'react-router-dom';

interface TermsAndConditionsModuleProps {
  agreeToTerms: boolean;
  onAgreeToTermsChange: (agree: boolean) => void;
  validationError?: string;
  waiverModalId?: string;
}

const TermsAndConditionsModule: React.FC<TermsAndConditionsModuleProps> = ({
  agreeToTerms,
  onAgreeToTermsChange,
  validationError,
  waiverModalId = 'waiver',
}) => {
  return (
    <div className='card'>
      <div className='card-header bg-light'>
        <div className='d-flex align-items-center'>
          <span className='bg-white avatar avatar-sm me-2 text-gray-7 flex-shrink-0'>
            <i className='ti ti-file-text fs-16' />
          </span>
          <h4 className='text-dark'>Terms and Conditions</h4>
        </div>
      </div>
      <div className='card-body pb-1'>
        <div className='row'>
          <div className='col-md-12'>
            <div className='mb-3'>
              <label className='form-label'>
                <input
                  type='checkbox'
                  checked={agreeToTerms}
                  onChange={(e) => onAgreeToTermsChange(e.target.checked)}
                  required
                />{' '}
                By checking this box, you agree to the terms and conditions
                outlined in the{' '}
                <Link
                  to='#'
                  data-bs-toggle='modal'
                  data-bs-target={`#${waiverModalId}`}
                >
                  Waiver
                </Link>
              </label>
              {validationError && (
                <div className='invalid-feedback d-block'>
                  {validationError}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsAndConditionsModule;
