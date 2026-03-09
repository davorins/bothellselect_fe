// components/Filters/TeamFilters.tsx
import React from 'react';
import { Input, Select } from 'antd';

const { Option } = Select;

interface TeamFiltersProps {
  filters: {
    nameFilter: string;
    yearFilter: string | null;
    gradeFilter: string | null;
    genderFilter: string | null;
    statusFilter: string | null;
  };
  onFilterChange: (
    newFilters: Partial<{
      nameFilter: string;
      yearFilter: string | null;
      gradeFilter: string | null;
      genderFilter: string | null;
      statusFilter: string | null;
    }>,
  ) => void;
  onReset: () => void;
  gradeOptions: Array<{ value: string; label: string }>;
  yearOptions: number[];
}

export const TeamFilters: React.FC<TeamFiltersProps> = ({
  filters,
  onFilterChange,
  onReset,
  gradeOptions,
  yearOptions,
}) => {
  return (
    <div className='p-3' style={{ minWidth: '250px' }}>
      <h5 className='mb-3'>Filter Teams</h5>

      <div className='mb-3'>
        <label className='form-label'>Team Name</label>
        <Input
          type='text'
          className='form-control'
          value={filters.nameFilter}
          onChange={(e) => onFilterChange({ nameFilter: e.target.value })}
          placeholder='Search team name...'
          allowClear
        />
      </div>

      <div className='mb-3'>
        <label className='form-label'>Year</label>
        <Select
          style={{ width: '100%' }}
          value={filters.yearFilter}
          onChange={(value) => onFilterChange({ yearFilter: value })}
          allowClear
          placeholder='Select year'
        >
          {yearOptions.map((year) => (
            <Option key={year} value={year.toString()}>
              {year}
            </Option>
          ))}
        </Select>
      </div>

      <div className='mb-3'>
        <label className='form-label'>Grade</label>
        <Select
          style={{ width: '100%' }}
          value={filters.gradeFilter}
          onChange={(value) => onFilterChange({ gradeFilter: value })}
          allowClear
          placeholder='Select grade'
        >
          {gradeOptions.map((grade) => (
            <Option key={grade.value} value={grade.value}>
              {grade.label}
            </Option>
          ))}
        </Select>
      </div>

      <div className='mb-3'>
        <label className='form-label'>Gender</label>
        <Select
          style={{ width: '100%' }}
          value={filters.genderFilter}
          onChange={(value) => onFilterChange({ genderFilter: value })}
          allowClear
          placeholder='Select gender'
        >
          <Option value='Male'>Male</Option>
          <Option value='Female'>Female</Option>
        </Select>
      </div>

      <div className='mb-3'>
        <label className='form-label'>Status</label>
        <Select
          style={{ width: '100%' }}
          value={filters.statusFilter}
          onChange={(value) => onFilterChange({ statusFilter: value })}
          allowClear
          placeholder='Select status'
        >
          <Option value='active'>Active</Option>
          <Option value='pending'>Pending Payment</Option>
          <Option value='inactive'>Inactive</Option>
        </Select>
      </div>

      <button className='btn btn-outline-secondary w-100' onClick={onReset}>
        Reset Filters
      </button>
    </div>
  );
};
