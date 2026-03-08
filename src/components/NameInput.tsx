// src/components/NameInput.tsx
import React, { useState, useEffect, useCallback } from 'react';

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

// Capitalizes first letter, lowercases the rest.
// Handles hyphenated names like "Mary-Jane" → "Mary-Jane"
const capitalizeName = (name: string): string => {
  if (!name || !name.trim()) return name;
  return name
    .trim()
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('-');
};

/**
 * Normalizes a middle name value according to these rules:
 *
 *  Single letter    "j"        → "J."
 *  Two letters      "jo"       → "Jo"   (treated as a short full name, not initial)
 *  Multi-char with dots "a.b." → "A.B." (compact initials, no spaces)
 *  Multi-char no dots "ab"     → "A.B." (each char becomes an initial)
 *  3+ letters       "andrew"   → "Andrew" (full name, normal capitalize)
 *
 *  Multiple words   "anne charlotte" → each word processed independently
 *  Hyphenated       "anne-charlotte" → "Anne-Charlotte"
 */
const normalizeMiddleName = (middle: string): string => {
  if (!middle || !middle.trim()) return middle;

  // If it contains spaces, process each word independently and rejoin
  if (middle.trim().includes(' ')) {
    return middle
      .trim()
      .split(/\s+/)
      .map((word) => normalizeMiddleName(word))
      .join(' ');
  }

  // Strip all dots to inspect raw letters
  const stripped = middle.trim().replace(/\./g, '');

  // All dots / empty after stripping — just return as-is
  if (!stripped) return middle.trim();

  // Check if original input looks like initials (contains dots, e.g. "a.b" / "A.B.")
  const looksLikeInitials = middle.includes('.');

  if (looksLikeInitials) {
    // Treat each letter segment as an initial: "a.b." → "A.B."
    return stripped
      .split('')
      .map((ch) => ch.toUpperCase() + '.')
      .join('');
  }

  const len = stripped.length;

  if (len === 1) {
    // Single letter → initial with dot: "j" → "J."
    return stripped.toUpperCase() + '.';
  }

  if (len === 2) {
    // Two letters → treat as a short full name: "jo" → "Jo"
    return capitalizeName(stripped);
  }

  // 3+ letters with no dots → full name: "andrew" → "Andrew"
  // But if every character is a letter and there are only 2–3 chars that look
  // like packed initials (all consonants or no vowels), still treat as full name —
  // we can't reliably detect intent, so we default to full name for 3+ chars.
  return capitalizeName(stripped);
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
    return { firstName: words[0], middleName: '', lastName: words[1], suffix };
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

  return null;
};

const buildFullName = (
  firstName: string,
  middleName: string,
  lastName: string,
  suffix: string,
) => {
  const parts = [];
  if (firstName?.trim()) parts.push(capitalizeName(firstName));
  if (middleName?.trim()) parts.push(normalizeMiddleName(middleName));
  if (lastName?.trim()) parts.push(capitalizeName(lastName));
  if (suffix?.trim()) parts.push(suffix.trim()); // suffixes keep their own casing (Jr., PhD, etc.)
  return parts.join(' ');
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
    if (onClearError) onClearError();
  };

  const handleMiddleName = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setMiddleName(newValue);
    emit(firstName, newValue, lastName, suffix);
    if (onClearError) onClearError();
  };

  const handleLastName = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLastName(newValue);
    emit(firstName, middleName, newValue, suffix);
    if (onClearError) onClearError();
  };

  const handleSuffix = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value;
    setSuffix(newValue);
    emit(firstName, middleName, lastName, newValue);
    if (onClearError) onClearError();
  };

  const handleBlur = () => {
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
            onBlur={handleBlur}
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
              onBlur={handleBlur}
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
            onBlur={handleBlur}
            required={required}
          />
        </div>

        {showSuffix && (
          <div style={{ minWidth: '90px', maxWidth: '110px' }}>
            <select
              className='form-control'
              value={suffix}
              onChange={handleSuffix}
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

      {error && <div className='invalid-feedback d-block mt-1'>{error}</div>}
    </div>
  );
};

export default NameInput;
