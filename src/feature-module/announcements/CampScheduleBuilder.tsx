import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Modal } from 'react-bootstrap';
import dayjs from 'dayjs';
import axios from 'axios';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const COLOR_MAP: Record<string, string> = {
  camp: '#ff00d2',
  training: '#1abe17',
  game: '#dc3545',
  holidays: '#0f65cd',
  celebration: '#eab300',
  tryout: '#0d6efd',
};

export interface GeneratedEvent {
  title: string;
  caption: string;
  description: string;
  start: string;
  end: string;
  category: string;
  backgroundColor: string;
  school?: { name: string; address: string; website: string };
  allDay: boolean;
}

interface TimeSlot {
  id: number;
  startTime: string;
  endTime: string;
  gradeLabel: string;
}

interface WeekConfig {
  weekNum: number;
  weekStart: Date;
  weekEnd: Date;
  activeDays: number[];
  school: string | null;
}

interface Props {
  show: boolean;
  onHide: () => void;
  onGenerate: (events: GeneratedEvent[]) => Promise<void>;
  existingSchools?: string[];
}

let slotCounter = 10;

const defaultSlots: TimeSlot[] = [
  {
    id: 1,
    startTime: '09:00',
    endTime: '11:00',
    gradeLabel: '3rd / 4th / 5th grade',
  },
  {
    id: 2,
    startTime: '11:00',
    endTime: '13:00',
    gradeLabel: '6th / 7th / 8th grade',
  },
  {
    id: 3,
    startTime: '13:00',
    endTime: '15:00',
    gradeLabel: 'High School & College',
  },
];

function getMondayOf(d: Date): Date {
  // Create a copy to avoid mutating the original
  const dt = new Date(d);

  // Fix: Ensure we're working with local date, not UTC
  const year = dt.getFullYear();
  const month = dt.getMonth();
  const date = dt.getDate();

  const localDate = new Date(year, month, date);
  const day = localDate.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  const monday = new Date(year, month, date + diff);
  monday.setHours(0, 0, 0, 0);

  return monday;
}

function addDays(d: Date, n: number): Date {
  const dt = new Date(d);
  dt.setDate(dt.getDate() + n);
  return dt;
}

function fmt12(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'pm' : 'am';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}${m ? ':' + String(m).padStart(2, '0') : ''}${ampm}`;
}

function buildWeeks(startDateStr: string, numberOfWeeks: number): WeekConfig[] {
  if (!startDateStr) return [];

  // Parse the date parts to avoid timezone issues
  const [year, month, day] = startDateStr.split('-').map(Number);
  const startDate = new Date(year, month - 1, day);

  console.log('Start date (local):', startDate);
  console.log('Day of week (0=Sun,1=Mon):', startDate.getDay());

  // Check if the start date is a Monday (getDay() returns 1 for Monday)
  let firstMonday = startDate;
  if (startDate.getDay() !== 1) {
    // If not Monday, find the Monday of that week
    const dayOfWeek = startDate.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    firstMonday = new Date(year, month - 1, day + diff);
  }

  const result: WeekConfig[] = [];

  for (let w = 0; w < numberOfWeeks; w++) {
    const weekStart = new Date(firstMonday);
    weekStart.setDate(firstMonday.getDate() + w * 7);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    result.push({
      weekNum: w + 1,
      weekStart: new Date(weekStart),
      weekEnd,
      activeDays: [0, 1, 2, 3, 4],
      school: null,
    });
  }

  // Log the result
  console.log(
    'Built weeks:',
    result.map((w) => ({
      week: w.weekNum,
      start: w.weekStart.toISOString().split('T')[0],
      end: w.weekEnd.toISOString().split('T')[0],
    })),
  );

  return result;
}

// School search component with "add new" option
interface SchoolSearchProps {
  value: string | null;
  onChange: (schoolName: string | null) => void;
  placeholder?: string;
}

const SchoolSearch: React.FC<SchoolSearchProps> = ({
  value,
  onChange,
  placeholder = 'Search for a school...',
}) => {
  const [searchTerm, setSearchTerm] = useState(value || '');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

  useEffect(() => {
    if (value) {
      setSearchTerm(value);
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchSchools = async (query: string) => {
    if (!query.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_BASE_URL}/schools?search=${encodeURIComponent(query)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (response.data && Array.isArray(response.data)) {
        const schoolNames = response.data.map((s: any) => s.name);
        setSuggestions(schoolNames);
        setShowSuggestions(schoolNames.length > 0);
      }
    } catch (error) {
      console.error('Error searching schools:', error);
      setSuggestions([]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchSchools(value);
    }, 300);
  };

  const handleSelectSchool = (schoolName: string) => {
    setSearchTerm(schoolName);
    onChange(schoolName);
    setShowSuggestions(false);
  };

  const handleAddNew = async () => {
    if (searchTerm.trim() && !suggestions.includes(searchTerm)) {
      // Save to database
      try {
        const token = localStorage.getItem('token');
        await axios.post(
          `${API_BASE_URL}/schools/addIfMissing`,
          { schoolName: searchTerm },
          { headers: { Authorization: `Bearer ${token}` } },
        );
        onChange(searchTerm);
        setShowSuggestions(false);
      } catch (error) {
        console.error('Error adding school:', error);
        alert('Failed to add school. Please try again.');
      }
    }
  };

  const handleClear = () => {
    setSearchTerm('');
    onChange(null);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          type='text'
          className='form-control form-control-sm'
          placeholder={placeholder}
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() =>
            searchTerm && suggestions.length > 0 && setShowSuggestions(true)
          }
        />
        {value && (
          <button
            type='button'
            className='btn btn-sm btn-outline-secondary'
            onClick={handleClear}
            title='Clear'
          >
            <i className='ti ti-x' />
          </button>
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className='school-suggestions'>
          {suggestions.map((school) => (
            <div
              key={school}
              className='school-suggestion-item'
              onClick={() => handleSelectSchool(school)}
            >
              <i className='ti ti-building-community me-2' />
              {school}
            </div>
          ))}
          {searchTerm.trim() && !suggestions.includes(searchTerm) && (
            <div
              className='school-suggestion-item add-new'
              onClick={handleAddNew}
            >
              <i className='ti ti-plus me-2' />
              Add "{searchTerm}"
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default function CampScheduleBuilder({
  show,
  onHide,
  onGenerate,
  existingSchools = [],
}: Props) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

  // Step 0 – basics
  const [progName, setProgName] = useState('Summer Basketball Camp 2026');
  const [caption, setCaption] = useState('');
  const [category, setCategory] = useState('camp');
  const [description, setDescription] = useState('');
  const [genderBoys, setGenderBoys] = useState(true);
  const [genderGirls, setGenderGirls] = useState(true);
  const [numberOfWeeks, setNumberOfWeeks] = useState(6);
  const [startDate, setStartDate] = useState('2026-06-29');

  // Step 1 – weeks
  const [weeks, setWeeks] = useState<WeekConfig[]>([]);

  // Step 2 – time slots
  const [slots, setSlots] = useState<TimeSlot[]>(defaultSlots);

  // ── Step navigation ──────────────────────────────────────────────────────────

  const goToStep = (n: number) => {
    if (n === 1) {
      const newWeeks = buildWeeks(startDate, numberOfWeeks);
      setWeeks(newWeeks);
    }
    setStep(n);
  };

  // ── Week helpers ─────────────────────────────────────────────────────────────

  const toggleDay = (wi: number, di: number) => {
    setWeeks((prev) =>
      prev.map((w, i) => {
        if (i !== wi) return w;
        const has = w.activeDays.includes(di);
        return {
          ...w,
          activeDays: has
            ? w.activeDays.filter((d) => d !== di)
            : [...w.activeDays, di].sort((a, b) => a - b),
        };
      }),
    );
  };

  const setWeekSchool = (wi: number, schoolName: string | null) => {
    setWeeks((prev) =>
      prev.map((w, i) => (i === wi ? { ...w, school: schoolName } : w)),
    );
  };

  const applySchoolToAll = (schoolName: string | null) => {
    setWeeks((prev) => prev.map((w) => ({ ...w, school: schoolName })));
  };

  const applyDaysToAll = (days: number[]) => {
    setWeeks((prev) => prev.map((w) => ({ ...w, activeDays: [...days] })));
  };

  // ── Slot helpers ─────────────────────────────────────────────────────────────

  const updateSlot = (id: number, field: keyof TimeSlot, val: string) => {
    setSlots((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: val } : s)),
    );
  };

  const addSlot = () => {
    setSlots((prev) => [
      ...prev,
      {
        id: slotCounter++,
        startTime: '09:00',
        endTime: '10:00',
        gradeLabel: '',
      },
    ]);
  };

  const removeSlot = (id: number) => {
    setSlots((prev) => prev.filter((s) => s.id !== id));
  };

  // ── Event generation ──────────────────────────────────────────────────────────

  const buildEvents = useCallback((): GeneratedEvent[] => {
    const genderLabel = [genderBoys ? 'Boys' : '', genderGirls ? 'Girls' : '']
      .filter(Boolean)
      .join(' & ');

    const events: GeneratedEvent[] = [];

    weeks.forEach((wk) => {
      wk.activeDays.forEach((di) => {
        slots.forEach((slot) => {
          const date = addDays(wk.weekStart, di);
          const [sh, sm] = slot.startTime.split(':').map(Number);
          const [eh, em] = slot.endTime.split(':').map(Number);

          const startDt = new Date(date);
          startDt.setHours(sh, sm, 0, 0);
          const endDt = new Date(date);
          endDt.setHours(eh, em, 0, 0);

          const titleParts = [progName];
          if (genderLabel) titleParts.push(genderLabel);
          if (slot.gradeLabel) titleParts.push(slot.gradeLabel);

          events.push({
            title: titleParts.join(' – '),
            caption,
            description:
              description ||
              `Week ${wk.weekNum} · ${DAYS[di]} · ${fmt12(slot.startTime)}–${fmt12(slot.endTime)}`,
            start: startDt.toISOString(),
            end: endDt.toISOString(),
            category,
            backgroundColor: COLOR_MAP[category] || '#adb5bd',
            school: wk.school
              ? { name: wk.school, address: '', website: '' }
              : undefined,
            allDay: false,
          });
        });
      });
    });

    return events.sort(
      (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
    );
  }, [
    weeks,
    slots,
    progName,
    caption,
    description,
    category,
    genderBoys,
    genderGirls,
  ]);

  const preview = step === 3 ? buildEvents() : [];
  const totalDays = new Set(preview.map((e) => e.start.slice(0, 10))).size;

  const handleGenerate = async () => {
    setSaving(true);
    try {
      await onGenerate(buildEvents());
      onHide();
      setStep(0);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const stepLabels = ['Basics', 'Weeks', 'Time Slots', 'Preview'];

  return (
    <Modal show={show} onHide={onHide} size='lg' backdrop='static'>
      <Modal.Header closeButton>
        <Modal.Title>
          <i className='ti ti-calendar-plus me-2' />
          Camp / Program Schedule Builder
        </Modal.Title>
      </Modal.Header>

      <Modal.Body
        style={{ maxHeight: '72vh', overflowY: 'auto', padding: '1.25rem' }}
      >
        {/* Step indicator */}
        <div
          className='d-flex mb-4'
          style={{
            gap: 0,
            borderRadius: 8,
            overflow: 'hidden',
            border: '1px solid #dee2e6',
          }}
        >
          {stepLabels.map((label, i) => (
            <button
              key={i}
              type='button'
              onClick={() => (i < step ? setStep(i) : undefined)}
              style={{
                flex: 1,
                padding: '8px 4px',
                border: 'none',
                borderRight: i < 3 ? '1px solid #dee2e6' : 'none',
                background:
                  i === step ? '#0d6efd' : i < step ? '#d1e7dd' : '#f8f9fa',
                color: i === step ? '#fff' : i < step ? '#0a3622' : '#6c757d',
                cursor: i < step ? 'pointer' : 'default',
                fontSize: 13,
                fontWeight: i === step ? 600 : 400,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <span
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  background:
                    i === step
                      ? 'rgba(255,255,255,0.3)'
                      : i < step
                        ? '#0a3622'
                        : '#dee2e6',
                  color: i < step ? '#fff' : 'inherit',
                }}
              >
                {i < step ? '✓' : i + 1}
              </span>
              {label}
            </button>
          ))}
        </div>

        {/* ── STEP 0: Basics ── */}
        {step === 0 && (
          <div>
            <div className='row g-3'>
              <div className='col-md-8'>
                <label className='form-label fw-semibold'>Program name</label>
                <input
                  className='form-control'
                  value={progName}
                  onChange={(e) => setProgName(e.target.value)}
                />
              </div>
              <div className='col-md-4'>
                <label className='form-label fw-semibold'>Category</label>
                <select
                  className='form-select'
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value='camp'>Camp</option>
                  <option value='training'>Training</option>
                  <option value='tryout'>Tryout</option>
                  <option value='game'>Game</option>
                  <option value='celebration'>Celebration</option>
                </select>
              </div>
              <div className='col-md-6'>
                <label className='form-label fw-semibold'>
                  Start date (Monday)
                </label>
                <input
                  type='date'
                  className='form-control'
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className='col-md-6'>
                <label className='form-label fw-semibold'>
                  Number of weeks
                </label>
                <input
                  type='number'
                  className='form-control'
                  value={numberOfWeeks}
                  onChange={(e) =>
                    setNumberOfWeeks(parseInt(e.target.value) || 6)
                  }
                  min={1}
                  max={12}
                />
              </div>
              <div className='col-md-12'>
                <label className='form-label fw-semibold'>
                  Caption{' '}
                  <span className='text-muted fw-normal'>(optional)</span>
                </label>
                <input
                  className='form-control'
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                />
              </div>
              <div className='col-md-8'>
                <label className='form-label fw-semibold'>Gender</label>
                <div className='d-flex gap-3 mt-1'>
                  <div className='form-check'>
                    <input
                      className='form-check-input'
                      type='checkbox'
                      id='g-boys'
                      checked={genderBoys}
                      onChange={(e) => setGenderBoys(e.target.checked)}
                    />
                    <label className='form-check-label' htmlFor='g-boys'>
                      Boys
                    </label>
                  </div>
                  <div className='form-check'>
                    <input
                      className='form-check-input'
                      type='checkbox'
                      id='g-girls'
                      checked={genderGirls}
                      onChange={(e) => setGenderGirls(e.target.checked)}
                    />
                    <label className='form-check-label' htmlFor='g-girls'>
                      Girls
                    </label>
                  </div>
                </div>
              </div>
              <div className='col-md-12'>
                <label className='form-label fw-semibold'>
                  Description{' '}
                  <span className='text-muted fw-normal'>(optional)</span>
                </label>
                <textarea
                  className='form-control'
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 1: Weeks ── */}
        {step === 1 && (
          <div>
            <div
              className='alert alert-info d-flex align-items-start gap-2 py-2 mb-3'
              style={{ fontSize: 13 }}
            >
              <i className='ti ti-info-circle mt-1' />
              <div>
                Toggle which days are active each week, then search for a
                school.
              </div>
            </div>

            {/* Bulk actions */}
            <div className='d-flex gap-2 flex-wrap mb-3 p-3 bg-light rounded'>
              <span
                className='text-muted'
                style={{ fontSize: 13, alignSelf: 'center' }}
              >
                Apply to all weeks:
              </span>
              <button
                type='button'
                className='btn btn-sm btn-outline-secondary'
                onClick={() => applyDaysToAll([0, 1, 2])}
              >
                Mon–Wed
              </button>
              <button
                type='button'
                className='btn btn-sm btn-outline-secondary'
                onClick={() => applyDaysToAll([0, 1, 2, 3, 4])}
              >
                Mon–Fri
              </button>
              <button
                type='button'
                className='btn btn-sm btn-outline-secondary'
                onClick={() => applyDaysToAll([0, 1, 2, 3, 4, 5])}
              >
                Mon–Sat
              </button>

              {weeks[0]?.school && (
                <button
                  type='button'
                  className='btn btn-sm btn-outline-primary'
                  onClick={() => applySchoolToAll(weeks[0]?.school || null)}
                >
                  All →{' '}
                  {weeks[0]?.school
                    ?.replace(' Middle School', '')
                    .replace(' High School', '')}
                </button>
              )}
            </div>

            {weeks.map((wk, wi) => (
              <div key={wi} className='card mb-2 border'>
                <div className='card-body py-3 px-3'>
                  <div className='d-flex align-items-center justify-content-between mb-2'>
                    <span className='fw-semibold'>Week {wk.weekNum}</span>
                    <span className='text-muted' style={{ fontSize: 12 }}>
                      {dayjs(wk.weekStart).format('MMM D')} –{' '}
                      {dayjs(wk.weekEnd).format('MMM D')}
                    </span>
                  </div>

                  {/* Day toggles */}
                  <div className='d-flex gap-2 mb-3 flex-wrap'>
                    {DAYS.map((d, di) => (
                      <button
                        key={di}
                        type='button'
                        onClick={() => toggleDay(wi, di)}
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          border: '1px solid',
                          borderColor: wk.activeDays.includes(di)
                            ? '#0d6efd'
                            : '#dee2e6',
                          background: wk.activeDays.includes(di)
                            ? '#0d6efd'
                            : 'white',
                          color: wk.activeDays.includes(di)
                            ? 'white'
                            : '#6c757d',
                          fontWeight: 600,
                          fontSize: 11,
                          cursor: 'pointer',
                        }}
                      >
                        {d[0]}
                      </button>
                    ))}
                  </div>

                  {/* School search */}
                  <div className='mb-2'>
                    <label
                      className='form-label fw-semibold mb-1'
                      style={{ fontSize: 12 }}
                    >
                      School / Location
                    </label>
                    <SchoolSearch
                      value={wk.school}
                      onChange={(schoolName) => setWeekSchool(wi, schoolName)}
                      placeholder='Search for a school...'
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── STEP 2: Time slots ── */}
        {step === 2 && (
          <div>
            <div
              className='alert alert-info d-flex align-items-start gap-2 py-2 mb-3'
              style={{ fontSize: 13 }}
            >
              <i className='ti ti-info-circle mt-1' />
              Each slot is created on every active day across all weeks.
            </div>

            {slots.map((slot, si) => (
              <div key={slot.id} className='card mb-2 border'>
                <div className='card-body py-2 px-3'>
                  <div className='row g-2 align-items-center'>
                    <div className='col-auto'>
                      <span
                        className='badge bg-secondary rounded-pill'
                        style={{
                          width: 24,
                          height: 24,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {si + 1}
                      </span>
                    </div>
                    <div className='col-md-2'>
                      <label className='form-label form-label-sm mb-1'>
                        Start
                      </label>
                      <input
                        type='time'
                        className='form-control form-control-sm'
                        value={slot.startTime}
                        onChange={(e) =>
                          updateSlot(slot.id, 'startTime', e.target.value)
                        }
                      />
                    </div>
                    <div className='col-md-2'>
                      <label className='form-label form-label-sm mb-1'>
                        End
                      </label>
                      <input
                        type='time'
                        className='form-control form-control-sm'
                        value={slot.endTime}
                        onChange={(e) =>
                          updateSlot(slot.id, 'endTime', e.target.value)
                        }
                      />
                    </div>
                    <div className='col'>
                      <label className='form-label form-label-sm mb-1'>
                        Grade group / label
                      </label>
                      <input
                        className='form-control form-control-sm'
                        value={slot.gradeLabel}
                        onChange={(e) =>
                          updateSlot(slot.id, 'gradeLabel', e.target.value)
                        }
                      />
                    </div>
                    <div className='col-auto pt-3'>
                      <button
                        type='button'
                        className='btn btn-sm btn-outline-danger'
                        onClick={() => removeSlot(slot.id)}
                      >
                        <i className='ti ti-trash' />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <button
              type='button'
              className='btn btn-outline-secondary w-100 mt-1'
              onClick={addSlot}
            >
              <i className='ti ti-plus me-1' /> Add time slot
            </button>
          </div>
        )}

        {/* ── STEP 3: Preview ── */}
        {step === 3 && (
          <div>
            <div className='row g-2 mb-3'>
              {[
                { label: 'Total events', value: preview.length },
                { label: 'Weeks', value: weeks.length },
                { label: 'Active days', value: totalDays },
                { label: 'Daily slots', value: slots.length },
              ].map((s) => (
                <div key={s.label} className='col-3'>
                  <div
                    className='text-center p-2 rounded'
                    style={{
                      background: '#f8f9fa',
                      border: '1px solid #dee2e6',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 24,
                        fontWeight: 700,
                        color: '#0d6efd',
                      }}
                    >
                      {s.value}
                    </div>
                    <div style={{ fontSize: 11, color: '#6c757d' }}>
                      {s.label}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {preview.length === 0 ? (
              <div className='text-center py-4 text-muted'>
                <i className='ti ti-calendar-off fs-3 d-block mb-2' />
                No events generated — check your date range and week settings.
              </div>
            ) : (
              <div style={{ maxHeight: 380, overflowY: 'auto' }}>
                <table
                  className='table table-sm table-hover mb-0'
                  style={{ fontSize: 13 }}
                >
                  <thead className='table-light sticky-top'>
                    <tr>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Grade group</th>
                      <th>Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((ev, i) => {
                      const start = new Date(ev.start);
                      const end = new Date(ev.end);
                      const fmt = (d: Date) =>
                        d.toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                        });
                      const parts = ev.title.split(' – ');
                      const gradeLabel = parts[parts.length - 1];
                      return (
                        <table>
                          <tr key={i}>
                            <td>{dayjs(ev.start).format('ddd, MMM D')}</td>
                            <td>
                              {fmt(start)} – {fmt(end)}
                            </td>
                            <td>{gradeLabel}</td>
                            <td>{ev.school?.name}</td>
                          </tr>
                        </table>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Modal.Body>

      <Modal.Footer>
        {step > 0 && (
          <button
            type='button'
            className='btn btn-light me-auto'
            onClick={() => setStep(step - 1)}
          >
            <i className='ti ti-arrow-left me-1' /> Back
          </button>
        )}
        <button type='button' className='btn btn-light me-3' onClick={onHide}>
          Cancel
        </button>
        {step < 3 && (
          <button
            type='button'
            className='btn btn-primary'
            onClick={() => goToStep(step + 1)}
          >
            Next <i className='ti ti-arrow-right ms-1' />
          </button>
        )}
        {step === 3 && (
          <button
            type='button'
            className='btn btn-success'
            onClick={handleGenerate}
            disabled={saving || preview.length === 0}
          >
            {saving ? (
              <>
                <span className='spinner-border spinner-border-sm me-2' />
                Saving…
              </>
            ) : (
              <>
                <i className='ti ti-calendar-plus me-1' />
                Create {preview.length} events
              </>
            )}
          </button>
        )}
      </Modal.Footer>

      <style>{`
        .school-suggestions {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          max-height: 250px;
          overflow-y: auto;
          background: white;
          border: 1px solid #ddd;
          border-radius: 4px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          z-index: 1000;
        }
        
        .school-suggestion-item {
          padding: 8px 12px;
          cursor: pointer;
          transition: background 0.2s;
        }
        
        .school-suggestion-item:hover {
          background: #f0f0f0;
        }
        
        .school-suggestion-item.add-new {
          border-top: 1px solid #eee;
          color: #0d6efd;
        }
        
        .school-suggestion-item.add-new:hover {
          background: #e7f1ff;
        }
      `}</style>
    </Modal>
  );
}
