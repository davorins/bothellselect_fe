import React from 'react';
import { PlayerFilterParams } from '../../../types/playerTypes';
import { formatGrade } from '../../../utils/playerUtils';

interface PlayerFiltersProps {
  filters: PlayerFilterParams;
  onFilterChange: (newFilters: Partial<PlayerFilterParams>) => void;
  onReset: () => void;
}

export const PlayerFilters: React.FC<PlayerFiltersProps> = ({
  filters,
  onFilterChange,
  onReset,
}) => {
  const { nameFilter, genderFilter, gradeFilter, ageFilter, statusFilter } =
    filters;

  return (
    <form>
      <div className='d-flex align-items-center border-bottom p-3'>
        <h4>Filter</h4>
      </div>
      <div className='p-3 pb-0 border-bottom'>
        <div className='row'>
          <div className='col-md-12'>
            <div className='mb-3'>
              <label className='form-label'>Player Name</label>
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
              <label className='form-label'>Gender</label>
              <select
                className='form-select'
                value={genderFilter || ''}
                onChange={(e) =>
                  onFilterChange({ genderFilter: e.target.value || null })
                }
              >
                <option value=''>All Genders</option>
                <option value='Male'>Male</option>
                <option value='Female'>Female</option>
              </select>
            </div>
          </div>
          <div className='col-md-6'>
            <div className='mb-3'>
              <label className='form-label'>Age</label>
              <select
                className='form-select'
                value={ageFilter || ''}
                onChange={(e) =>
                  onFilterChange({
                    ageFilter: e.target.value ? parseInt(e.target.value) : null,
                  })
                }
              >
                <option value=''>All Ages</option>
                {Array.from({ length: 18 }, (_, i) => i + 5).map((age) => (
                  <option key={age} value={age}>
                    {age}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className='col-md-12'>
            <div className='mb-3'>
              <label className='form-label'>School</label>
              <input
                type='text'
                className='form-control'
                value={filters.schoolFilter || ''}
                onChange={(e) =>
                  onFilterChange({ schoolFilter: e.target.value || null })
                }
                placeholder='Search by school'
              />
            </div>
          </div>
          <div className='col-md-6'>
            <div className='mb-3'>
              <label className='form-label'>Grade</label>
              <select
                className='form-select'
                value={gradeFilter || ''}
                onChange={(e) =>
                  onFilterChange({ gradeFilter: e.target.value || null })
                }
              >
                <option value=''>All Grades</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((grade) => (
                  <option key={grade} value={formatGrade(grade)}>
                    {formatGrade(grade)}
                  </option>
                ))}
              </select>
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
                <option value='Pending Payment'>Pending Payment</option>
                <option value='Inactive'>Inactive</option>
              </select>
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
