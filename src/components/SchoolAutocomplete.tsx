import React, { useState, useEffect } from 'react';

interface Props {
  value: string;
  onChange: (val: string) => void;
  isInvalid?: boolean;
  className?: string;
  placeholder?: string;
}

interface School {
  _id: string;
  name: string;
}

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const SchoolAutocomplete: React.FC<Props> = ({
  value,
  onChange,
  isInvalid,
  className = '',
  placeholder = 'Start typing school name...',
}) => {
  const [query, setQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState<School[]>([]);
  const [showList, setShowList] = useState(false);

  // Update query when value prop changes externally
  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/schools?search=${encodeURIComponent(query)}`,
        );
        const data = await res.json();
        setSuggestions(data);
      } catch (err) {
        console.error('Failed to fetch schools', err);
      }
    }, 200);

    return () => clearTimeout(timeout);
  }, [query]);

  const handleSelect = (name: string) => {
    setQuery(name);
    onChange(name);
    setShowList(false);
  };

  const handleBlur = async () => {
    // Small delay to allow click on suggestion to register
    setTimeout(async () => {
      const exists = suggestions.find(
        (s) => s.name.toLowerCase() === query.toLowerCase(),
      );
      if (!exists && query.trim() !== '') {
        try {
          const res = await fetch(`${API_BASE_URL}/schools/addIfMissing`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ schoolName: query.trim() }),
          });
          const data = await res.json();
          if (data.success) {
            onChange(data.school.name);
          }
        } catch (err) {
          console.error('Failed to add new school', err);
        }
      }
      setShowList(false);
    }, 200);
  };

  // Determine the input class
  const inputClass = isInvalid ? 'form-control is-invalid' : 'form-control';

  return (
    <div className='position-relative'>
      <input
        type='text'
        className={inputClass}
        value={query}
        onChange={(e) => {
          const val = e.target.value;
          setQuery(val);
          onChange(val);
          setShowList(true);
        }}
        onBlur={handleBlur}
        placeholder={placeholder}
      />

      {showList && suggestions.length > 0 && (
        <ul
          className='list-group position-absolute w-100'
          style={{ zIndex: 1000, maxHeight: '200px', overflowY: 'auto' }}
        >
          {suggestions.map((s) => (
            <li
              key={s._id}
              className='list-group-item list-group-item-action'
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(s.name);
              }}
              style={{ cursor: 'pointer' }}
            >
              {s.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SchoolAutocomplete;
