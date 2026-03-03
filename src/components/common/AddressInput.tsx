/**
 * AddressInput.tsx
 *
 * Address autocomplete using Nominatim (OpenStreetMap) — completely free,
 * no API key, no credit card, same service already used in MapPicker.tsx.
 *
 * Features:
 * - Dropdown autocomplete as parent types (min 3 chars)
 * - Nominatim response mapped directly to your Address object
 * - "Fill in separately" toggle for parents who prefer individual fields
 * - Debounced requests (500ms) to respect Nominatim rate limits
 * - US-biased results (countrycodes=us param)
 *
 * Usage:
 *   <AddressInput
 *     value={guardian.address}
 *     onChange={(addr) => onGuardianChange({ ...guardian, address: addr })}
 *     error={errors?.address}
 *     required
 *   />
 */

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Address } from '../../utils/address'; // adjust path as needed

// ─── Types ────────────────────────────────────────────────────────────────────

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  address: {
    house_number?: string;
    road?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    postcode?: string;
  };
}

interface AddressInputProps {
  value: Address;
  onChange: (address: Address) => void;
  error?: string;
  label?: string;
  required?: boolean;
}

// ─── State name → 2-letter code ───────────────────────────────────────────────

const STATE_MAP: Record<string, string> = {
  alabama: 'AL',
  alaska: 'AK',
  arizona: 'AZ',
  arkansas: 'AR',
  california: 'CA',
  colorado: 'CO',
  connecticut: 'CT',
  delaware: 'DE',
  florida: 'FL',
  georgia: 'GA',
  hawaii: 'HI',
  idaho: 'ID',
  illinois: 'IL',
  indiana: 'IN',
  iowa: 'IA',
  kansas: 'KS',
  kentucky: 'KY',
  louisiana: 'LA',
  maine: 'ME',
  maryland: 'MD',
  massachusetts: 'MA',
  michigan: 'MI',
  minnesota: 'MN',
  mississippi: 'MS',
  missouri: 'MO',
  montana: 'MT',
  nebraska: 'NE',
  nevada: 'NV',
  'new hampshire': 'NH',
  'new jersey': 'NJ',
  'new mexico': 'NM',
  'new york': 'NY',
  'north carolina': 'NC',
  'north dakota': 'ND',
  ohio: 'OH',
  oklahoma: 'OK',
  oregon: 'OR',
  pennsylvania: 'PA',
  'rhode island': 'RI',
  'south carolina': 'SC',
  'south dakota': 'SD',
  tennessee: 'TN',
  texas: 'TX',
  utah: 'UT',
  vermont: 'VT',
  virginia: 'VA',
  washington: 'WA',
  'west virginia': 'WV',
  wisconsin: 'WI',
  wyoming: 'WY',
  'district of columbia': 'DC',
};

const toStateCode = (name: string): string => {
  if (!name) return '';
  if (/^[A-Za-z]{2}$/.test(name.trim())) return name.trim().toUpperCase();
  return (
    STATE_MAP[name.toLowerCase().trim()] ||
    name.trim().toUpperCase().slice(0, 2)
  );
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const nominatimToAddress = (r: NominatimResult): Address => ({
  street: [r.address.house_number, r.address.road].filter(Boolean).join(' '),
  street2: '',
  city:
    r.address.city ||
    r.address.town ||
    r.address.village ||
    r.address.suburb ||
    r.address.county ||
    '',
  state: toStateCode(r.address.state || ''),
  zip: r.address.postcode || '',
});

const formatDisplay = (a: Address): string => {
  if (!a.street) return '';
  return [
    a.street,
    a.street2,
    a.city,
    a.state && a.zip ? `${a.state} ${a.zip}` : a.state || a.zip,
  ]
    .filter(Boolean)
    .join(', ');
};

const isComplete = (a: Address): boolean =>
  !!(a.street?.trim() && a.city?.trim() && a.state?.trim() && a.zip?.trim());

// ─── Component ────────────────────────────────────────────────────────────────

const AddressInput: React.FC<AddressInputProps> = ({
  value,
  onChange,
  error,
  label = 'Address',
  required = false,
}) => {
  const [inputValue, setInputValue] = useState(() => formatDisplay(value));
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSelection, setHasSelection] = useState(() => isComplete(value));
  const [showManualFields, setShowManualFields] = useState(false);

  const searchTimeout = useRef<NodeJS.Timeout>();
  const skipSearch = useRef(false);

  // ── Debounced search ───────────────────────────────────────────────────────
  useEffect(() => {
    if (skipSearch.current) {
      skipSearch.current = false;
      return;
    }
    if (hasSelection || inputValue.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const { data } = await axios.get(
          'https://nominatim.openstreetmap.org/search',
          {
            params: {
              q: inputValue,
              format: 'json',
              addressdetails: 1,
              limit: 5,
              countrycodes: 'us',
            },
          },
        );
        const filtered = (data as NominatimResult[]).filter(
          (r) => r.address?.road,
        );
        setSuggestions(filtered);
        setShowSuggestions(filtered.length > 0);
      } catch {
        /* silent fail */
      } finally {
        setIsSearching(false);
      }
    }, 500);
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [inputValue, hasSelection]);

  // ── Pick a suggestion ──────────────────────────────────────────────────────
  const handleSelect = (result: NominatimResult) => {
    const parsed = nominatimToAddress(result);
    skipSearch.current = true;
    setInputValue(formatDisplay(parsed));
    setHasSelection(true);
    setShowSuggestions(false);
    setSuggestions([]);
    onChange(parsed);
  };

  // ── Type in single-line box ────────────────────────────────────────────────
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setHasSelection(false);
    if (!e.target.value.trim())
      onChange({ street: '', street2: '', city: '', state: '', zip: '' });
  };

  // ── Manual field change ────────────────────────────────────────────────────
  const handleManualField = (field: keyof Address, val: string) => {
    const updated: Address = {
      ...value,
      [field]: field === 'state' ? val.toUpperCase().slice(0, 2) : val,
    };
    onChange(updated);
    setInputValue(formatDisplay(updated));
  };

  // ── Clear selection ────────────────────────────────────────────────────────
  const handleClear = () => {
    setHasSelection(false);
    setInputValue('');
    onChange({ street: '', street2: '', city: '', state: '', zip: '' });
  };

  const addressComplete = isComplete(value);

  return (
    <div className='mb-3'>
      {/* Label */}
      <label className='form-label'>
        {label}
        {required && <span className='text-danger ms-1'>*</span>}
      </label>

      {/* ── Search input (hidden when showing manual fields) ── */}
      {!showManualFields && (
        <div className='position-relative'>
          <div className='input-group'>
            <span className='input-group-text'>
              <i className={isSearching ? 'ti ti-loader-2' : 'ti ti-map-pin'} />
            </span>
            <input
              type='text'
              className={`form-control ${error ? 'is-invalid' : addressComplete ? 'is-valid' : ''}`}
              value={inputValue}
              onChange={handleInputChange}
              onFocus={() => {
                if (suggestions.length > 0) setShowSuggestions(true);
              }}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && suggestions.length > 0) {
                  e.preventDefault();
                  handleSelect(suggestions[0]);
                }
                if (e.key === 'Escape') setShowSuggestions(false);
              }}
              placeholder='Start typing your address...'
              autoComplete='off'
            />
            {/* Toggle to manual fields */}
            <button
              type='button'
              className='btn btn-outline-secondary'
              title='Fill in fields separately'
              onClick={() => setShowManualFields(true)}
              tabIndex={-1}
            >
              <i className='ti ti-list-details' />
            </button>
          </div>

          <div className='text-muted small mt-1'>
            <i className='ti ti-info-circle me-1'></i>
            Type your address and pick from the list — or{' '}
            <button
              type='button'
              className='btn btn-link btn-sm p-0'
              style={{ fontSize: '0.75rem' }}
              onClick={() => setShowManualFields(true)}
            >
              enter fields separately
            </button>
          </div>

          {/* ── Autocomplete dropdown ── */}
          {showSuggestions && suggestions.length > 0 && (
            <div
              className='list-group position-absolute w-100 shadow'
              style={{
                zIndex: 1050,
                top: '38px',
                maxHeight: '260px',
                overflowY: 'auto',
                border: '1px solid #dee2e6',
                borderRadius: '0 0 6px 6px',
              }}
            >
              {suggestions.map((item, idx) => {
                const preview = nominatimToAddress(item);
                return (
                  <button
                    key={idx}
                    type='button'
                    className='list-group-item list-group-item-action border-0 text-start py-2'
                    onMouseDown={() => handleSelect(item)}
                  >
                    <div className='d-flex align-items-start'>
                      <i className='ti ti-map-pin me-2 text-primary mt-1 flex-shrink-0' />
                      <div>
                        <div
                          className='fw-semibold'
                          style={{ fontSize: '0.875rem' }}
                        >
                          {preview.street || item.display_name.split(',')[0]}
                        </div>
                        <div
                          className='text-muted'
                          style={{ fontSize: '0.78rem' }}
                        >
                          {[preview.city, preview.state, preview.zip]
                            .filter(Boolean)
                            .join(', ')}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* ── Success confirmation after selection ── */}
          {hasSelection && addressComplete && !showSuggestions && (
            <div className='d-flex align-items-center gap-2 mt-1'>
              <span className='text-success small'>
                <i className='ti ti-circle-check me-1' />
                {value.street}
                {value.street2 ? `, ${value.street2}` : ''} · {value.city},{' '}
                {value.state} {value.zip}
              </span>
              <button
                type='button'
                className='btn btn-link btn-sm p-0 text-muted'
                style={{ fontSize: '0.75rem' }}
                onClick={handleClear}
              >
                Change
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Manual individual fields ── */}
      {showManualFields && (
        <div className='card border'>
          <div className='card-body pt-3 pb-2'>
            <div className='d-flex justify-content-between align-items-center mb-2'>
              <small className='text-muted'>
                <i className='ti ti-edit me-1'></i>Enter each part separately
              </small>
              <button
                type='button'
                className='btn btn-link btn-sm p-0'
                style={{ fontSize: '0.75rem' }}
                onClick={() => setShowManualFields(false)}
              >
                <i className='ti ti-search me-1'></i>Use address search
              </button>
            </div>
            <div className='row g-2'>
              <div className='col-12'>
                <input
                  type='text'
                  className={`form-control form-control-sm ${error && !value.street ? 'is-invalid' : ''}`}
                  placeholder='Street address *  (e.g. 123 Main St)'
                  value={value.street}
                  onChange={(e) => handleManualField('street', e.target.value)}
                />
              </div>
              <div className='col-12'>
                <input
                  type='text'
                  className='form-control form-control-sm'
                  placeholder='Apt, Suite, Unit — optional'
                  value={value.street2}
                  onChange={(e) => handleManualField('street2', e.target.value)}
                />
              </div>
              <div className='col-5'>
                <input
                  type='text'
                  className={`form-control form-control-sm ${error && !value.city ? 'is-invalid' : ''}`}
                  placeholder='City *'
                  value={value.city}
                  onChange={(e) => handleManualField('city', e.target.value)}
                />
              </div>
              <div className='col-2'>
                <input
                  type='text'
                  className={`form-control form-control-sm text-uppercase ${error && !value.state ? 'is-invalid' : ''}`}
                  placeholder='ST *'
                  value={value.state}
                  maxLength={2}
                  onChange={(e) => handleManualField('state', e.target.value)}
                />
              </div>
              <div className='col-5'>
                <input
                  type='text'
                  className={`form-control form-control-sm ${error && !value.zip ? 'is-invalid' : ''}`}
                  placeholder='ZIP *'
                  value={value.zip}
                  maxLength={10}
                  onChange={(e) => handleManualField('zip', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className='invalid-feedback d-block mt-1'>
          <i className='ti ti-alert-circle me-1'></i>
          {error}
        </div>
      )}
    </div>
  );
};

export default AddressInput;
