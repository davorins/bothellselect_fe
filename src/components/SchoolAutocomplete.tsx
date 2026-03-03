import React, { useState, useEffect } from 'react';

interface Props {
  value: string;
  onChange: (val: string) => void;
  isInvalid?: boolean;
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
}) => {
  const [query, setQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState<School[]>([]);
  const [showList, setShowList] = useState(false);

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
  };

  return (
    <div className='position-relative'>
      <input
        type='text'
        className={`form-control ${isInvalid ? 'is-invalid' : ''}`}
        value={query}
        onChange={(e) => {
          const val = e.target.value;
          setQuery(val);
          onChange(val);
          setShowList(true);
        }}
        onBlur={handleBlur}
        placeholder='Start typing school name...'
      />

      {showList && suggestions.length > 0 && (
        <ul
          className='list-group position-absolute w-100'
          style={{ zIndex: 1000 }}
        >
          {suggestions.map((s) => (
            <li
              key={s._id}
              className='list-group-item list-group-item-action'
              onMouseDown={() => handleSelect(s.name)}
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
