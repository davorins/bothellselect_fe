import React from 'react';
import { CoachFilterParams } from '../../../types/coachTypes';

interface CoachFiltersProps {
  filters: CoachFilterParams;
  onFilterChange: (newFilters: Partial<CoachFilterParams>) => void;
  onReset: () => void;
}

export const CoachFilters: React.FC<CoachFiltersProps> = ({
  filters,
  onFilterChange,
  onReset,
}) => {
  const {
    nameFilter,
    emailFilter,
    phoneFilter,
    statusFilter,
    aauNumberFilter,
  } = filters;

  return (
    <form>
      <div className='d-flex align-items-center border-bottom p-3'>
        <h4>Filter Coaches</h4>
      </div>
      <div className='p-3 pb-0 border-bottom'>
        <div className='row'>
          <div className='col-md-12'>
            <div className='mb-3'>
              <label className='form-label'>Name</label>
              <input
                type='text'
                className='form-control'
                placeholder='Search by name...'
                value={nameFilter}
                onChange={(e) => onFilterChange({ nameFilter: e.target.value })}
              />
            </div>
          </div>
          <div className='col-md-6'>
            <div className='mb-3'>
              <label className='form-label'>Email</label>
              <input
                type='text'
                className='form-control'
                placeholder='Search by email...'
                value={emailFilter}
                onChange={(e) =>
                  onFilterChange({ emailFilter: e.target.value })
                }
              />
            </div>
          </div>
          <div className='col-md-6'>
            <div className='mb-3'>
              <label className='form-label'>Phone</label>
              <input
                type='text'
                className='form-control'
                placeholder='Search by phone...'
                value={phoneFilter}
                onChange={(e) => {
                  const cleanedValue = e.target.value.replace(/\D/g, '');
                  onFilterChange({ phoneFilter: cleanedValue });
                }}
              />
            </div>
          </div>
          <div className='col-md-6'>
            <div className='mb-3'>
              <label className='form-label'>Status</label>
              <select
                className='form-select'
                value={statusFilter || ''}
                onChange={(e) =>
                  onFilterChange({ statusFilter: e.target.value || null })
                }
              >
                <option value=''>All Statuses</option>
                <option value='Active'>Active</option>
                <option value='Inactive'>Inactive</option>
                <option value='Certified'>Certified</option>
              </select>
            </div>
          </div>
          <div className='col-md-6'>
            <div className='mb-3'>
              <label className='form-label'>AAU Number</label>
              <input
                type='text'
                className='form-control'
                placeholder='Search by AAU number...'
                value={aauNumberFilter || ''}
                onChange={(e) =>
                  onFilterChange({ aauNumberFilter: e.target.value })
                }
              />
            </div>
          </div>
        </div>
      </div>
      <div className='p-3 d-flex align-items-center justify-content-end'>
        <button type='button' className='btn btn-primary' onClick={onReset}>
          Reset
        </button>
      </div>
    </form>
  );
};
