import React, { useState, useEffect, useCallback } from 'react';

interface NameInputProps {
  value: string;
  onChange: (fullName: string) => void;
  error?: string;
  label?: string;
  required?: boolean;
}

const SUFFIXES = [
  '',
  'Jr.',
  'Sr.',
  'II',
  'III',
  'IV',
  'V',
  'Esq.',
  'PhD',
  'MD',
  'DDS',
];

// Simpler, more reliable parsing
const parseName = (fullName: string) => {
  if (!fullName || !fullName.trim()) {
    return { firstName: '', middleName: '', lastName: '', suffix: '' };
  }

  const trimmed = fullName.trim();

  // Check for suffix first (simpler pattern)
  let namePart = trimmed;
  let suffix = '';

  for (const s of SUFFIXES.filter(Boolean)) {
    if (trimmed.endsWith(` ${s}`)) {
      suffix = s;
      namePart = trimmed.substring(0, trimmed.lastIndexOf(` ${s}`)).trim();
      break;
    }
  }

  const words = namePart.split(/\s+/).filter(Boolean);

  // Handle different name structures
  if (words.length === 1) {
    return { firstName: words[0], middleName: '', lastName: '', suffix };
  } else if (words.length === 2) {
    return { firstName: words[0], middleName: '', lastName: words[1], suffix };
  } else {
    // First name, everything in between as middle, last name
    return {
      firstName: words[0],
      middleName: words.slice(1, -1).join(' '),
      lastName: words[words.length - 1],
      suffix,
    };
  }
};

const buildFullName = (
  firstName: string,
  middleName: string,
  lastName: string,
  suffix: string,
) => {
  const parts = [];
  if (firstName?.trim()) parts.push(firstName.trim());
  if (middleName?.trim()) parts.push(middleName.trim());
  if (lastName?.trim()) parts.push(lastName.trim());
  if (suffix?.trim()) parts.push(suffix.trim());
  return parts.join(' ');
};

const NameInput: React.FC<NameInputProps> = ({
  value,
  onChange,
  error,
  label = 'Full Name',
  required = false,
}) => {
  // Initialize state
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [suffix, setSuffix] = useState('');
  const [showMiddle, setShowMiddle] = useState(false);
  const [showSuffix, setShowSuffix] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize from value prop
  useEffect(() => {
    if (value !== undefined && value !== null) {
      console.log('Initializing NameInput with value:', value);
      const parsed = parseName(value);
      console.log('Parsed name:', parsed);

      setFirstName(parsed.firstName);
      setMiddleName(parsed.middleName);
      setLastName(parsed.lastName);
      setSuffix(parsed.suffix);
      setShowMiddle(!!parsed.middleName);
      setShowSuffix(!!parsed.suffix);
      setIsInitialized(true);
    }
  }, []); // Only run once on mount

  // Sync with parent when value changes externally
  useEffect(() => {
    if (!isInitialized) return;

    const currentFullName = buildFullName(
      firstName,
      middleName,
      lastName,
      suffix,
    );

    // Only update if the value from parent is different from what we have
    if (value !== currentFullName) {
      console.log('External value changed:', value);
      console.log('Current built name:', currentFullName);

      const parsed = parseName(value || '');
      setFirstName(parsed.firstName);
      setMiddleName(parsed.middleName);
      setLastName(parsed.lastName);
      setSuffix(parsed.suffix);
      setShowMiddle(!!parsed.middleName);
      setShowSuffix(!!parsed.suffix);
    }
  }, [value, isInitialized]);

  const emit = useCallback(
    (fn: string, mn: string, ln: string, sx: string) => {
      const fullName = buildFullName(fn, mn, ln, sx);
      console.log('Emitting name change:', fullName);
      onChange(fullName);
    },
    [onChange],
  );

  const handleFirstName = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setFirstName(newValue);
    emit(newValue, middleName, lastName, suffix);
  };

  const handleMiddleName = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setMiddleName(newValue);
    emit(firstName, newValue, lastName, suffix);
  };

  const handleLastName = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLastName(newValue);
    emit(firstName, middleName, newValue, suffix);
  };

  const handleSuffix = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value;
    setSuffix(newValue);
    emit(firstName, middleName, lastName, newValue);
  };

  const toggleMiddle = () => {
    if (showMiddle) {
      setMiddleName('');
      emit(firstName, '', lastName, suffix);
    }
    setShowMiddle(!showMiddle);
  };

  const toggleSuffix = () => {
    if (showSuffix) {
      setSuffix('');
      emit(firstName, middleName, lastName, '');
    }
    setShowSuffix(!showSuffix);
  };

  return (
    <div className='mb-3'>
      <div className='d-flex align-items-center justify-content-between mb-1'>
        <label className='form-label mb-0'>
          {label} {required && <span className='text-danger'>*</span>}
        </label>
        <div className='d-flex gap-2'>
          <button
            type='button'
            className={`btn btn-link btn-sm p-0 text-decoration-none ${showMiddle ? 'text-danger' : 'text-primary'}`}
            style={{ fontSize: '0.75rem' }}
            onClick={toggleMiddle}
            tabIndex={-1}
          >
            {showMiddle ? '− Middle name' : '+ Middle name'}
          </button>
          <span className='text-muted' style={{ fontSize: '0.75rem' }}>
            |
          </span>
          <button
            type='button'
            className={`btn btn-link btn-sm p-0 text-decoration-none ${showSuffix ? 'text-danger' : 'text-primary'}`}
            style={{ fontSize: '0.75rem' }}
            onClick={toggleSuffix}
            tabIndex={-1}
          >
            {showSuffix ? '− Suffix' : '+ Suffix'}
          </button>
        </div>
      </div>

      <div className='d-flex gap-2 flex-wrap'>
        <div className='flex-fill' style={{ minWidth: '120px' }}>
          <input
            type='text'
            className={`form-control ${error ? 'is-invalid' : ''}`}
            placeholder='First name *'
            value={firstName}
            onChange={handleFirstName}
            required={required}
          />
        </div>

        {showMiddle && (
          <div className='flex-fill' style={{ minWidth: '100px' }}>
            <input
              type='text'
              className='form-control'
              placeholder='Middle name'
              value={middleName}
              onChange={handleMiddleName}
            />
          </div>
        )}

        <div className='flex-fill' style={{ minWidth: '120px' }}>
          <input
            type='text'
            className={`form-control ${error ? 'is-invalid' : ''}`}
            placeholder='Last name *'
            value={lastName}
            onChange={handleLastName}
            required={required}
          />
        </div>

        {showSuffix && (
          <div style={{ minWidth: '90px', maxWidth: '110px' }}>
            <select
              className='form-control'
              value={suffix}
              onChange={handleSuffix}
            >
              {SUFFIXES.map((s) => (
                <option key={s} value={s}>
                  {s || 'Suffix'}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {error && <div className='invalid-feedback d-block mt-1'>{error}</div>}
    </div>
  );
};

export default NameInput;
