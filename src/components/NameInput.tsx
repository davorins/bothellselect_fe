// src/components/NameInput.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';

interface NameInputProps {
  value: string;
  onChange: (fullName: string) => void;
  onClearError?: () => void;
  error?: string;
  label?: string;
  required?: boolean;
  onBlur?: () => void;
}

export const SUFFIXES = [
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

export interface ParsedName {
  firstName: string;
  middleName: string;
  lastName: string;
  suffix: string;
}

// Capitalizes first letter of each part in a name, handling hyphens
const capitalizeName = (name: string): string => {
  if (!name || !name.trim()) return name;

  return name
    .trim()
    .split('-')
    .map((part) => {
      if (!part) return '';
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join('-');
};

// Remove any special characters, keep only letters, hyphens, and spaces (spaces will be handled separately)
const sanitizeName = (name: string): string => {
  // Allow only letters (including accented characters), hyphens, and spaces
  // Unicode range for accented characters: \u00C0-\u00FF
  return name.replace(/[^a-zA-Z\u00C0-\u00FF\s-]/g, '');
};

// Export these functions so they can be used in other files
export const parseName = (fullName: string): ParsedName => {
  if (!fullName || !fullName.trim()) {
    return { firstName: '', middleName: '', lastName: '', suffix: '' };
  }

  const trimmed = fullName.trim();

  // Check for suffix first
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

  if (words.length === 1) {
    return { firstName: words[0], middleName: '', lastName: '', suffix };
  } else if (words.length === 2) {
    return {
      firstName: words[0],
      middleName: '',
      lastName: words[1],
      suffix,
    };
  } else {
    return {
      firstName: words[0],
      middleName: words.slice(1, -1).join(' '),
      lastName: words[words.length - 1],
      suffix,
    };
  }
};

export const validateFullName = (
  fullName: string,
  required: boolean = true,
): string | null => {
  if (!fullName || !fullName.trim()) {
    return required ? 'Full name is required' : null;
  }

  const parsed = parseName(fullName);

  if (!parsed.firstName || !parsed.firstName.trim()) {
    return 'First name is required';
  }

  if (!parsed.lastName || !parsed.lastName.trim()) {
    return 'Last name is required';
  }

  if (parsed.firstName.length < 2) {
    return 'First name must be at least 2 characters';
  }

  if (parsed.lastName.length < 2) {
    return 'Last name must be at least 2 characters';
  }

  // Check for multiple words in first name
  if (parsed.firstName.trim().split(/\s+/).length > 1) {
    return 'First name should be a single word (use middle name field for additional names)';
  }

  // Check for multiple words in last name
  if (parsed.lastName.trim().split(/\s+/).length > 1) {
    return 'Last name should be a single word (use hyphenated names or single word only)';
  }

  // Check for invalid characters in first name
  const specialCharRegex = /[!@#$%^&*()<>.,?\/"\[\]{}\\|`~]/;
  if (specialCharRegex.test(parsed.firstName)) {
    return 'First name contains invalid characters (letters, hyphens, and spaces only)';
  }

  // Check for invalid characters in last name
  if (specialCharRegex.test(parsed.lastName)) {
    return 'Last name contains invalid characters (letters, hyphens, and spaces only)';
  }

  return null;
};

const buildFullName = (
  firstName: string,
  middleName: string,
  lastName: string,
  suffix: string,
) => {
  const parts = [];
  if (firstName?.trim()) parts.push(capitalizeName(firstName.trim()));
  if (middleName?.trim()) parts.push(middleName.trim()); // No formatting for middle name
  if (lastName?.trim()) parts.push(capitalizeName(lastName.trim()));
  if (suffix?.trim()) parts.push(suffix.trim());
  return parts.join(' ');
};

// Helper function to prevent multiple words in an input
const preventMultipleWords = (value: string): string => {
  const words = value.trim().split(/\s+/);
  return words[0] || '';
};

const NameInput: React.FC<NameInputProps> = ({
  value,
  onChange,
  error,
  label = 'Full Name',
  required = false,
  onClearError,
  onBlur,
}) => {
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [suffix, setSuffix] = useState('');
  const [showMiddle, setShowMiddle] = useState(false);
  const [showSuffix, setShowSuffix] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [localError, setLocalError] = useState<string>('');

  const firstNameRef = useRef<HTMLInputElement>(null);
  const middleNameRef = useRef<HTMLInputElement>(null);
  const lastNameRef = useRef<HTMLInputElement>(null);
  const suffixRef = useRef<HTMLSelectElement>(null);

  // Initialize from value prop
  useEffect(() => {
    if (value !== undefined && value !== null) {
      const parsed = parseName(value);
      setFirstName(parsed.firstName);
      setMiddleName(parsed.middleName);
      setLastName(parsed.lastName);
      setSuffix(parsed.suffix);
      setShowMiddle(!!parsed.middleName);
      setShowSuffix(!!parsed.suffix);
      setIsInitialized(true);
    }
  }, []);

  // Sync with parent when value changes externally
  useEffect(() => {
    if (!isInitialized) return;

    const currentFullName = buildFullName(
      firstName,
      middleName,
      lastName,
      suffix,
    );

    if (value !== currentFullName) {
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
      onChange(fullName);
    },
    [onChange],
  );

  const validateNameFields = (fn: string, ln: string): boolean => {
    const specialCharRegex = /[!@#$%^&*()<>.,?\/"\[\]{}\\|`~]/;

    if (fn.trim().split(/\s+/).length > 1) {
      setLocalError('First name should be a single word');
      return false;
    }
    if (ln.trim().split(/\s+/).length > 1) {
      setLocalError('Last name should be a single word');
      return false;
    }
    if (specialCharRegex.test(fn)) {
      setLocalError(
        'First name contains invalid characters (letters and hyphens only)',
      );
      return false;
    }
    if (specialCharRegex.test(ln)) {
      setLocalError(
        'Last name contains invalid characters (letters and hyphens only)',
      );
      return false;
    }
    setLocalError('');
    return true;
  };

  const handleFirstNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value;

    // Remove invalid characters
    newValue = sanitizeName(newValue);

    // Prevent multiple words
    if (newValue.trim().split(/\s+/).length > 1) {
      newValue = preventMultipleWords(newValue);
      setLocalError('First name should be a single word');
    } else {
      // Check for special characters after sanitization
      const specialCharRegex = /[!@#$%^&*()<>.,?\/"\[\]{}\\|`~]/;
      if (specialCharRegex.test(newValue)) {
        setLocalError(
          'First name contains invalid characters (letters and hyphens only)',
        );
      } else {
        setLocalError('');
      }
    }

    // Auto-capitalize
    newValue = capitalizeName(newValue);

    setFirstName(newValue);
    emit(newValue, middleName, lastName, suffix);
    if (onClearError) onClearError();
  };

  const handleFirstNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === ' ') {
      e.preventDefault();
      if (showMiddle && middleNameRef.current) {
        middleNameRef.current.focus();
      } else if (lastNameRef.current) {
        lastNameRef.current.focus();
      }
    }
  };

  const handleMiddleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value;
    // No sanitization or formatting for middle name - user can enter anything, including spaces
    setMiddleName(newValue);
    emit(firstName, newValue, lastName, suffix);
    if (onClearError) onClearError();
  };

  // Middle name does NOT treat space as tab - spaces are allowed
  // No onKeyDown handler for middle name

  const handleLastNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value;

    // Remove invalid characters
    newValue = sanitizeName(newValue);

    // Prevent multiple words
    if (newValue.trim().split(/\s+/).length > 1) {
      newValue = preventMultipleWords(newValue);
      setLocalError('Last name should be a single word');
    } else {
      // Check for special characters after sanitization
      const specialCharRegex = /[!@#$%^&*()<>.,?\/"\[\]{}\\|`~]/;
      if (specialCharRegex.test(newValue)) {
        setLocalError(
          'Last name contains invalid characters (letters and hyphens only)',
        );
      } else {
        setLocalError('');
      }
    }

    // Auto-capitalize
    newValue = capitalizeName(newValue);

    setLastName(newValue);
    emit(firstName, middleName, newValue, suffix);
    if (onClearError) onClearError();
  };

  const handleLastNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === ' ') {
      e.preventDefault();
      if (showSuffix && suffixRef.current) {
        suffixRef.current.focus();
      } else {
        e.currentTarget.blur();
      }
    }
  };

  const handleSuffixChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value;
    setSuffix(newValue);
    emit(firstName, middleName, lastName, newValue);
    if (onClearError) onClearError();
  };

  const handleSuffixKeyDown = (e: React.KeyboardEvent<HTMLSelectElement>) => {
    if (e.key === ' ') {
      e.preventDefault();
      e.currentTarget.blur();
    }
  };

  const handleBlur = () => {
    // Validate on blur
    if (firstName || lastName) {
      validateNameFields(firstName, lastName);
    }

    // Apply final formatting on blur
    if (firstName) {
      const formatted = capitalizeName(firstName);
      if (formatted !== firstName) {
        setFirstName(formatted);
        emit(formatted, middleName, lastName, suffix);
      }
    }

    if (lastName) {
      const formatted = capitalizeName(lastName);
      if (formatted !== lastName) {
        setLastName(formatted);
        emit(firstName, middleName, formatted, suffix);
      }
    }

    // No formatting for middle name on blur

    if (onBlur) onBlur();
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

  const displayError = error || localError;

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
            ref={firstNameRef}
            type='text'
            className={`form-control ${displayError ? 'is-invalid' : ''}`}
            placeholder='First name *'
            value={firstName}
            onChange={handleFirstNameChange}
            onKeyDown={handleFirstNameKeyDown}
            onBlur={handleBlur}
            required={required}
            title='Press space to go to next field. Letters and hyphens only.'
          />
        </div>

        {showMiddle && (
          <div className='flex-fill' style={{ minWidth: '100px' }}>
            <input
              ref={middleNameRef}
              type='text'
              className='form-control'
              placeholder='Middle name (any format)'
              value={middleName}
              onChange={handleMiddleNameChange}
              onBlur={handleBlur}
              title='Free text field - spaces allowed, any characters.'
            />
          </div>
        )}

        <div className='flex-fill' style={{ minWidth: '120px' }}>
          <input
            ref={lastNameRef}
            type='text'
            className={`form-control ${displayError ? 'is-invalid' : ''}`}
            placeholder='Last name *'
            value={lastName}
            onChange={handleLastNameChange}
            onKeyDown={handleLastNameKeyDown}
            onBlur={handleBlur}
            required={required}
            title='Press space to go to suffix. Letters and hyphens only.'
          />
        </div>

        {showSuffix && (
          <div style={{ minWidth: '90px', maxWidth: '110px' }}>
            <select
              ref={suffixRef}
              className='form-control'
              value={suffix}
              onChange={handleSuffixChange}
              onKeyDown={handleSuffixKeyDown}
              onBlur={handleBlur}
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

      {displayError && (
        <div className='invalid-feedback d-block mt-1'>{displayError}</div>
      )}
    </div>
  );
};

export default NameInput;
