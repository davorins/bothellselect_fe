// src/components/forms/PlayerFormFields.tsx (UPDATED VERSION)
import React, { useEffect, useState } from 'react';
import Select, { MultiValue } from 'react-select';
import { Player } from '../../types/registration-types';
import { VisibleField } from '../../types/form-config.types';
import DynamicFormField from './DynamicFormField';
import SchoolAutocomplete from '../SchoolAutocomplete';
import NameInput from '../NameInput';
import { commonHealthConditions } from '../../feature-module/constants/healthConditions';
import { calculateGradeFromDOB } from '../../utils/gradeUtils';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PlayerFormFieldsProps {
  /** The player object being edited (or a partial NewPlayerForm) */
  player: Partial<Player>;

  /** Called whenever any core field changes */
  onChange: (field: keyof Player, value: string) => void;

  /** Visible fields returned by useDynamicFormFields */
  visibleFields: VisibleField[];

  /** Validation errors keyed by field name */
  errors?: Record<string, string>;

  /** Health-condition select value */
  selectedConditions: any[];
  onConditionsChange: (selected: MultiValue<any>) => void;

  /** Whether the "Other / custom" condition text input should show */
  showCustomConditionInput: boolean;
  customCondition: string;
  onCustomConditionChange: (value: string) => void;

  /** Optional slot rendered between the core fields and the health section */
  gradeSlot?: React.ReactNode;

  /** When true all inputs are disabled (view mode) */
  disabled?: boolean;

  /** Current year for grade calculation */
  currentYear?: number;

  /** Whether grade is overridden manually */
  isGradeOverridden?: boolean;

  /** Callback when grade override is toggled */
  onGradeOverride?: (overridden: boolean) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CORE_FIELD_NAMES = new Set([
  'fullName',
  'gender',
  'dob',
  'schoolName',
  'grade',
  'aauNumber',
  'age',
]);

const selectStyles = {
  control: (base: any) => ({
    ...base,
    minHeight: '38px',
    borderColor: '#d9d9d9',
    '&:hover': { borderColor: '#40a9ff' },
  }),
};

const gradeOptions = [
  { value: 'PK', label: 'Pre-Kindergarten' },
  { value: 'K', label: 'Kindergarten' },
  ...Array.from({ length: 12 }, (_, i) => ({
    value: `${i + 1}`,
    label: `${i + 1}${i === 0 ? 'st' : i === 1 ? 'nd' : i === 2 ? 'rd' : 'th'} Grade`,
  })),
];

// ─── Component ────────────────────────────────────────────────────────────────

const PlayerFormFields: React.FC<PlayerFormFieldsProps> = ({
  player,
  onChange,
  visibleFields,
  errors = {},
  selectedConditions,
  onConditionsChange,
  showCustomConditionInput,
  customCondition,
  onCustomConditionChange,
  gradeSlot,
  disabled = false,
  currentYear = new Date().getFullYear(),
  isGradeOverridden = false,
  onGradeOverride,
}) => {
  const hasField = (name: string) =>
    visibleFields.some((f) => f.fieldName === name);

  // Filter out age field from extra fields since we don't want to display it
  const extraFields = visibleFields.filter(
    (f) => !CORE_FIELD_NAMES.has(f.fieldName) && f.fieldName !== 'age',
  );

  // Simple handler that just passes changes up
  const handleFieldChange = (field: keyof Player, value: string) => {
    onChange(field, value);
  };

  const handleGradeOverrideClick = () => {
    if (onGradeOverride) {
      onGradeOverride(true);
    }
  };

  return (
    <>
      {/* ── Row 1: Full Name ── */}
      <div className='row'>
        <div className='col-md-12'>
          <NameInput
            value={player.fullName ?? ''}
            onChange={(fullName) => handleFieldChange('fullName', fullName)}
            error={errors.fullName}
            required
          />
        </div>
      </div>

      {/* ── Row 2: School Name ── */}
      {hasField('schoolName') && (
        <div className='row'>
          <div className='col-md-12'>
            <div className='mb-3'>
              <label className='form-label'>
                School Name <span className='text-danger'>*</span>
              </label>
              {disabled ? (
                <input
                  type='text'
                  className='form-control'
                  value={player.schoolName ?? ''}
                  disabled
                />
              ) : (
                <SchoolAutocomplete
                  value={player.schoolName ?? ''}
                  onChange={(val) => handleFieldChange('schoolName', val)}
                  isInvalid={!!errors.schoolName}
                />
              )}
              {errors.schoolName && (
                <div className='invalid-feedback d-block'>
                  {errors.schoolName}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Row 3: Gender + Date of Birth + Grade + AAU Number ── */}
      <div className='row'>
        {/* Calculate column width based on how many fields are visible */}
        {(() => {
          const visibleFieldsList = [
            hasField('gender') && 'gender',
            hasField('dob') && 'dob',
            hasField('grade') && 'grade',
            hasField('aauNumber') && 'aauNumber',
          ].filter(Boolean);

          const fieldCount = visibleFieldsList.length;
          const colWidth = fieldCount > 0 ? Math.floor(12 / fieldCount) : 12;

          return (
            <>
              {/* Gender */}
              {hasField('gender') && (
                <div className={`col-md-${colWidth}`}>
                  <div className='mb-3'>
                    <label className='form-label'>
                      Gender <span className='text-danger'>*</span>
                    </label>
                    <select
                      className={`form-control ${errors.gender ? 'is-invalid' : ''}`}
                      value={player.gender ?? ''}
                      onChange={(e) =>
                        handleFieldChange('gender', e.target.value)
                      }
                      disabled={disabled}
                    >
                      <option value=''>Select Gender</option>
                      <option value='Male'>Male</option>
                      <option value='Female'>Female</option>
                    </select>
                    {errors.gender && (
                      <div className='invalid-feedback d-block'>
                        {errors.gender}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Date of Birth */}
              {hasField('dob') && (
                <div className={`col-md-${colWidth}`}>
                  <div className='mb-3'>
                    <label className='form-label'>
                      Date of Birth <span className='text-danger'>*</span>
                    </label>
                    <input
                      type='date'
                      className={`form-control ${errors.dob ? 'is-invalid' : ''}`}
                      value={player.dob ?? ''}
                      onChange={(e) => handleFieldChange('dob', e.target.value)}
                      disabled={disabled}
                    />
                    {errors.dob && (
                      <div className='invalid-feedback d-block'>
                        {errors.dob}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Grade */}
              {hasField('grade') && (
                <div className={`col-md-${colWidth}`}>
                  {gradeSlot ?? (
                    <div className='mb-3'>
                      <label className='form-label'>
                        Grade <span className='text-danger'>*</span>
                      </label>
                      <select
                        className={`form-control ${errors.grade ? 'is-invalid' : ''}`}
                        value={player.grade ?? ''}
                        onChange={(e) =>
                          handleFieldChange('grade', e.target.value)
                        }
                        disabled={disabled}
                      >
                        <option value=''>Select Grade</option>
                        {gradeOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      {/* Auto-calc helper text */}
                      {player.dob && !isGradeOverridden && player.grade && (
                        <div className='text-muted small mt-1'>
                          Auto-calculated from DOB
                          <button
                            type='button'
                            className='btn btn-link btn-sm p-0 ms-2'
                            onClick={handleGradeOverrideClick}
                            disabled={disabled}
                          >
                            Adjust
                          </button>
                        </div>
                      )}
                      {errors.grade && (
                        <div className='invalid-feedback d-block'>
                          {errors.grade}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* AAU Number */}
              {hasField('aauNumber') && (
                <div className={`col-md-${colWidth}`}>
                  <div className='mb-3'>
                    <label className='form-label'>AAU Number</label>
                    <input
                      type='text'
                      className='form-control'
                      value={player.aauNumber ?? ''}
                      onChange={(e) =>
                        handleFieldChange('aauNumber', e.target.value)
                      }
                      placeholder='If applicable'
                      disabled={disabled}
                    />
                  </div>
                </div>
              )}
            </>
          );
        })()}
      </div>

      {/* ── Extra dynamic fields (anything not in the core set) - age is filtered out ── */}
      {extraFields.length > 0 && (
        <div className='row'>
          {extraFields.map((field) => (
            <div className='col-md-6' key={field.fieldName}>
              <DynamicFormField
                field={field}
                value={player[field.fieldName as keyof Player] as string}
                onChange={(fieldName, value) =>
                  handleFieldChange(fieldName as keyof Player, value)
                }
                error={errors[field.fieldName]}
                disabled={disabled || field.isReadOnly}
              />
            </div>
          ))}
        </div>
      )}

      {/* ── Medical History ── */}
      <div className='row mt-3'>
        <div className='col-12'>
          <div className='card bg-light'>
            <div className='card-header bg-transparent py-2'>
              <div className='d-flex align-items-center'>
                <span className='bg-white avatar avatar-sm me-2 text-gray-7 flex-shrink-0'>
                  <i className='ti ti-heartbeat fs-16' />
                </span>
                <h6 className='mb-0'>Medical History</h6>
              </div>
            </div>
            <div className='card-body pb-2'>
              <div className='mb-3'>
                <label className='form-label'>Health Conditions</label>
                <Select
                  isMulti
                  options={commonHealthConditions}
                  className='basic-multi-select'
                  classNamePrefix='select'
                  value={selectedConditions}
                  onChange={onConditionsChange}
                  styles={selectStyles}
                  placeholder='Select health conditions...'
                  isDisabled={disabled}
                />
                <small className='text-muted'>Select all that apply</small>
              </div>

              {showCustomConditionInput && !disabled && (
                <div className='mb-3'>
                  <label className='form-label'>
                    Specify Other Condition(s)
                  </label>
                  <input
                    type='text'
                    className='form-control'
                    value={customCondition}
                    onChange={(e) => onCustomConditionChange(e.target.value)}
                    placeholder='Please describe any other health conditions...'
                  />
                </div>
              )}

              {showCustomConditionInput && disabled && customCondition && (
                <div className='mb-3'>
                  <label className='form-label'>Other Condition(s)</label>
                  <input
                    type='text'
                    className='form-control'
                    value={customCondition}
                    disabled
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PlayerFormFields;
