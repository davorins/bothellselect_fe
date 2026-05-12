// src/components/admin/TryoutFormConfig.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  TryoutSpecificConfig,
  SeasonEvent,
  TryoutLocation,
  TryoutSession,
} from '../../types/registration-types';
import RichTextEditor from '../common/RichTextEditor';

interface TryoutFormConfigProps {
  onTryoutConfigUpdate: (
    config: TryoutSpecificConfig,
    originalName?: string,
  ) => void;
  initialConfig?: TryoutSpecificConfig;
  isEditing?: boolean;
  seasonEvents: SeasonEvent[];
  selectedSeason?: SeasonEvent | null;
  onSeasonSelect?: (season: SeasonEvent) => void;
}

const TryoutFormConfig: React.FC<TryoutFormConfigProps> = ({
  onTryoutConfigUpdate,
  initialConfig,
  isEditing = false,
  seasonEvents = [],
  selectedSeason = null,
  onSeasonSelect,
}) => {
  // State for the form
  const [tryoutName, setTryoutName] = useState('');
  const [tryoutYear, setTryoutYear] = useState(new Date().getFullYear());
  const [displayName, setDisplayName] = useState('');
  const [tryoutFee, setTryoutFee] = useState(50);
  const [isActive, setIsActive] = useState(false);
  const [description, setDescription] = useState('');
  const [eventId, setEventId] = useState('');
  const [season, setSeason] = useState('');
  const [registrationDeadline, setRegistrationDeadline] = useState('');
  const [paymentDeadline, setPaymentDeadline] = useState('');
  const [refundPolicy, setRefundPolicy] = useState(
    'No refunds after tryout registration deadline',
  );
  const [requiresRoster, setRequiresRoster] = useState(false);
  const [requiresInsurance, setRequiresInsurance] = useState(true);

  // Tryout Details state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [duration, setDuration] = useState('');
  const [gender, setGender] = useState('');
  const [days, setDays] = useState<string[]>([]);
  const [tryoutSessions, setTryoutSessions] = useState<TryoutSession[]>([]);
  const [notes, setNotes] = useState<string[]>([]);
  const [dropOffTime, setDropOffTime] = useState('');
  const [pickUpTime, setPickUpTime] = useState('');
  const [hasLimitedSpots, setHasLimitedSpots] = useState(false);
  const [contactEmail, setContactEmail] = useState('');
  const [ageGroups, setAgeGroups] = useState<string[]>([]);
  const [maxParticipants, setMaxParticipants] = useState<number | null>(null);
  const [whatToBring, setWhatToBring] = useState<string[]>([]);

  // New session form state
  const [newSession, setNewSession] = useState<{
    date: string;
    startTime: string;
    endTime: string;
    grades: string;
    location: TryoutLocation;
  }>({
    date: '',
    startTime: '',
    endTime: '',
    grades: '',
    location: {
      name: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
    },
  });

  const [newNote, setNewNote] = useState('');
  const [newWhatToBring, setNewWhatToBring] = useState('');
  const [originalTryoutName, setOriginalTryoutName] = useState('');
  const [nameError, setNameError] = useState('');
  const [seasonError, setSeasonError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<
    'idle' | 'saving' | 'success' | 'error'
  >('idle');
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'schedule' | 'details'>(
    'basic',
  );

  const initialConfigRef = useRef<any>(null);

  // Load initial config when provided
  useEffect(() => {
    if (initialConfig) {
      setTryoutName(initialConfig.tryoutName || '');
      setTryoutYear(initialConfig.tryoutYear || new Date().getFullYear());
      setDisplayName(initialConfig.displayName || '');
      setTryoutFee(initialConfig.tryoutFee || 50);
      setIsActive(initialConfig.isActive || false);
      setDescription(initialConfig.description || '');
      setEventId(initialConfig.eventId || '');
      setSeason(initialConfig.season || '');
      setRegistrationDeadline(initialConfig.registrationDeadline || '');
      setPaymentDeadline(initialConfig.paymentDeadline || '');
      setRefundPolicy(
        initialConfig.refundPolicy ||
          'No refunds after tryout registration deadline',
      );
      setRequiresRoster(initialConfig.requiresRoster || false);
      setRequiresInsurance(initialConfig.requiresInsurance ?? true);
      setOriginalTryoutName(initialConfig.tryoutName || '');

      // Load tryout details
      const details = initialConfig.tryoutDetails;
      if (details) {
        setStartDate(details.startDate || '');
        setEndDate(details.endDate || '');
        setDuration(details.duration || '');
        setGender(details.gender || '');
        setDays(details.days || []);
        setTryoutSessions(details.tryoutSessions || []);
        setNotes(details.notes || []);
        setDropOffTime(details.dropOffTime || '');
        setPickUpTime(details.pickUpTime || '');
        setHasLimitedSpots(details.hasLimitedSpots || false);
        setContactEmail(details.contactEmail || '');
        setAgeGroups(details.ageGroups || []);
        setMaxParticipants(details.maxParticipants || null);
        setWhatToBring(details.whatToBring || []);
      }

      initialConfigRef.current = {
        tryoutName: initialConfig.tryoutName,
        tryoutYear: initialConfig.tryoutYear,
        tryoutFee: initialConfig.tryoutFee,
        isActive: initialConfig.isActive,
        description: initialConfig.description,
        eventId: initialConfig.eventId,
        season: initialConfig.season,
        tryoutSessions: details?.tryoutSessions || [],
      };
    }
  }, [initialConfig]);

  // Auto-suggest name when season is selected
  useEffect(() => {
    if (selectedSeason && !isEditing && !tryoutName) {
      const suggestedName = `${selectedSeason.season} Tryout ${selectedSeason.year}`;
      setTryoutName(suggestedName);
      setDisplayName(suggestedName);
      setTryoutYear(selectedSeason.year);
      setEventId(selectedSeason.eventId);
      setSeason(selectedSeason.season);
    }
  }, [selectedSeason, isEditing]);

  // Track changes
  useEffect(() => {
    if (initialConfigRef.current) {
      const current = {
        tryoutName,
        tryoutYear,
        tryoutFee,
        isActive,
        description,
        eventId,
        season,
        tryoutSessions,
      };
      setHasChanges(
        JSON.stringify(current) !== JSON.stringify(initialConfigRef.current),
      );
    }
  }, [
    tryoutName,
    tryoutYear,
    tryoutFee,
    isActive,
    description,
    eventId,
    season,
    tryoutSessions,
  ]);

  // Handlers for tryout sessions with location
  const handleAddSession = () => {
    if (newSession.startTime && newSession.endTime && newSession.grades) {
      const newSessionWithId: TryoutSession = {
        id: Date.now().toString(),
        number: tryoutSessions.length + 1,
        date: newSession.date,
        startTime: newSession.startTime,
        endTime: newSession.endTime,
        grades: newSession.grades,
        location: newSession.location.name
          ? { ...newSession.location }
          : undefined,
      };
      setTryoutSessions([...tryoutSessions, newSessionWithId]);
      setNewSession({
        date: '',
        startTime: '',
        endTime: '',
        grades: '',
        location: {
          name: '',
          address: '',
          city: '',
          state: '',
          zipCode: '',
        },
      });
    }
  };

  const handleRemoveSession = (sessionId: string) => {
    const filtered = tryoutSessions.filter((s) => s.id !== sessionId);
    const renumbered = filtered.map((session, idx) => ({
      ...session,
      number: idx + 1,
    }));
    setTryoutSessions(renumbered);
  };

  const handleUpdateSessionLocation = (
    sessionId: string,
    location: Partial<TryoutLocation>,
  ) => {
    setTryoutSessions((prev) =>
      prev.map((session) =>
        session.id === sessionId
          ? {
              ...session,
              location: {
                name: session.location?.name || '',
                address: session.location?.address || '',
                city: session.location?.city || '',
                state: session.location?.state || '',
                zipCode: session.location?.zipCode || '',
                ...location,
              },
            }
          : session,
      ),
    );
  };

  const handleAddNote = () => {
    if (newNote.trim()) {
      setNotes([...notes, newNote.trim()]);
      setNewNote('');
    }
  };

  const handleRemoveNote = (index: number) => {
    setNotes(notes.filter((_, i) => i !== index));
  };

  const handleAddWhatToBring = () => {
    if (newWhatToBring.trim()) {
      setWhatToBring([...whatToBring, newWhatToBring.trim()]);
      setNewWhatToBring('');
    }
  };

  const handleRemoveWhatToBring = (index: number) => {
    setWhatToBring(whatToBring.filter((_, i) => i !== index));
  };

  const handleDayToggle = (day: string) => {
    setDays(
      days.includes(day) ? days.filter((d) => d !== day) : [...days, day],
    );
  };

  const handleAgeGroupToggle = (group: string) => {
    setAgeGroups(
      ageGroups.includes(group)
        ? ageGroups.filter((g) => g !== group)
        : [...ageGroups, group],
    );
  };

  const handleSeasonSelect = (seasonEvent: SeasonEvent) => {
    if (onSeasonSelect) onSeasonSelect(seasonEvent);
    setEventId(seasonEvent.eventId);
    setSeason(seasonEvent.season);
    setTryoutYear(seasonEvent.year);
    if (!isEditing && !tryoutName) {
      const suggestedName = `${seasonEvent.season} Tryout ${seasonEvent.year}`;
      setTryoutName(suggestedName);
      setDisplayName(suggestedName);
    }
  };

  const validateTryoutName = (name: string): boolean => {
    if (!name.trim()) {
      setNameError('Tryout name is required');
      return false;
    }
    setNameError('');
    return true;
  };

  const handleSave = async () => {
    if (!eventId || !season) {
      setSeasonError('Please select a season first');
      return;
    }
    if (!validateTryoutName(tryoutName)) return;

    // Build the config object matching your API expectations
    const configToSave: TryoutSpecificConfig = {
      tryoutName,
      tryoutYear,
      displayName: displayName || undefined,
      registrationDeadline,
      tryoutDates: [],
      locations: [], // Deprecated - now using session locations
      divisions: [],
      ageGroups,
      requiresPayment: true,
      requiresRoster,
      requiresInsurance,
      paymentDeadline: paymentDeadline || undefined,
      refundPolicy,
      tryoutFee,
      isActive,
      eventId,
      season,
      description: description || '',
      tryoutDetails: {
        startDate,
        endDate,
        duration,
        gender,
        days,
        location: { name: '', address: '', city: '', state: '', zipCode: '' }, // Deprecated
        locations: [], // Deprecated
        tryoutSessions,
        notes,
        dropOffTime,
        pickUpTime,
        hasLimitedSpots,
        contactEmail,
        ageGroups,
        maxParticipants,
        whatToBring,
      },
    };

    setIsSaving(true);
    setSaveStatus('saving');

    try {
      await onTryoutConfigUpdate(configToSave, originalTryoutName);
      setSaveStatus('success');
      setHasChanges(false);
      initialConfigRef.current = {
        tryoutName,
        tryoutYear,
        tryoutFee,
        isActive,
        description,
        eventId,
        season,
        tryoutSessions,
      };
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error: any) {
      console.error('Error saving:', error);
      setSaveStatus('error');
      alert(`Error: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const getFullAddress = (location: TryoutLocation): string => {
    return [location.address, location.city, location.state, location.zipCode]
      .filter(Boolean)
      .join(', ');
  };

  return (
    <div className='tryout-form-config'>
      {/* Header */}
      <div className='d-flex justify-content-between align-items-center mb-4'>
        <h4>Tryout Configuration{tryoutName && `: ${tryoutName}`}</h4>
        <div className='d-flex align-items-center gap-2'>
          <div className='form-check form-switch me-3'>
            <input
              className='form-check-input'
              type='checkbox'
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              style={{ transform: 'scale(1.5)' }}
            />
            <label className='form-check-label fw-bold'>
              {isActive ? 'Active' : 'Inactive'}
            </label>
          </div>
          {saveStatus === 'success' && (
            <span className='text-success'>
              <i className='ti ti-circle-check'></i> Saved!
            </span>
          )}
          {saveStatus === 'error' && (
            <span className='text-danger'>
              <i className='ti ti-alert-circle'></i> Error
            </span>
          )}
        </div>
      </div>

      {/* Save Bar */}
      <div className='card mb-4'>
        <div className='card-body'>
          <div className='d-flex justify-content-between align-items-center'>
            <div>
              {hasChanges && (
                <span className='text-warning'>
                  <i className='ti ti-alert-circle'></i> Unsaved changes
                </span>
              )}
              {seasonError && (
                <span className='text-danger ms-3'>{seasonError}</span>
              )}
            </div>
            <button
              className='btn btn-primary'
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
            >
              {isSaving
                ? 'Saving...'
                : isEditing
                  ? 'Update Tryout'
                  : 'Create Tryout'}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs - Removed separate Location tab since location is now per session */}
      <ul className='nav nav-tabs mb-4'>
        <li className='nav-item'>
          <button
            className={`nav-link ${activeTab === 'basic' ? 'active' : ''}`}
            onClick={() => setActiveTab('basic')}
          >
            <i className='ti ti-settings'></i> Basic
          </button>
        </li>
        <li className='nav-item'>
          <button
            className={`nav-link ${activeTab === 'schedule' ? 'active' : ''}`}
            onClick={() => setActiveTab('schedule')}
          >
            <i className='ti ti-calendar'></i> Schedule & Locations
          </button>
        </li>
        <li className='nav-item'>
          <button
            className={`nav-link ${activeTab === 'details' ? 'active' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            <i className='ti ti-info-circle'></i> Details
          </button>
        </li>
      </ul>

      {/* BASIC TAB */}
      {activeTab === 'basic' && (
        <>
          <div className='card mb-4'>
            <div className='card-header'>
              <h5>Description</h5>
            </div>
            <div className='card-body'>
              <RichTextEditor
                value={description}
                onChange={setDescription}
                placeholder='Enter description...'
                showPreview={true}
              />
            </div>
          </div>

          {!isEditing && (
            <div className='card mb-4'>
              <div className='card-header'>
                <h5>Link to Season</h5>
              </div>
              <div className='card-body'>
                {seasonEvents.length === 0 ? (
                  <div className='alert alert-warning'>
                    No seasons found. Create a season first.
                  </div>
                ) : (
                  <div className='list-group'>
                    {seasonEvents.map((se) => (
                      <button
                        key={se.eventId}
                        className={`list-group-item list-group-item-action ${eventId === se.eventId ? 'active' : ''}`}
                        onClick={() => handleSeasonSelect(se)}
                      >
                        <div className='d-flex justify-content-between'>
                          <strong>{se.season}</strong>
                          <small>{se.year}</small>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className='card'>
            <div className='card-header'>
              <h5>Basic Information</h5>
            </div>
            <div className='card-body'>
              <div className='row'>
                <div className='col-md-6 mb-3'>
                  <label>Tryout Name *</label>
                  <input
                    type='text'
                    className={`form-control ${nameError ? 'is-invalid' : ''}`}
                    value={tryoutName}
                    onChange={(e) => setTryoutName(e.target.value)}
                  />
                  {nameError && (
                    <div className='invalid-feedback'>{nameError}</div>
                  )}
                </div>
                <div className='col-md-6 mb-3'>
                  <label>Year</label>
                  <input
                    type='number'
                    className='form-control'
                    value={tryoutYear}
                    onChange={(e) =>
                      setTryoutYear(
                        parseInt(e.target.value) || new Date().getFullYear(),
                      )
                    }
                  />
                </div>
                <div className='col-md-6 mb-3'>
                  <label>Display Name</label>
                  <input
                    type='text'
                    className='form-control'
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>
                <div className='col-md-6 mb-3'>
                  <label>Fee ($)</label>
                  <input
                    type='number'
                    className='form-control'
                    value={tryoutFee}
                    onChange={(e) => setTryoutFee(Number(e.target.value))}
                    min='0'
                  />
                </div>
                <div className='col-md-6 mb-3'>
                  <label>Start Date</label>
                  <input
                    type='text'
                    className='form-control'
                    placeholder='e.g., February 27'
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className='col-md-6 mb-3'>
                  <label>End Date</label>
                  <input
                    type='text'
                    className='form-control'
                    placeholder='e.g., February 28'
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
                <div className='col-md-6 mb-3'>
                  <label>Duration</label>
                  <input
                    type='text'
                    className='form-control'
                    placeholder='e.g., 2 days'
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                  />
                </div>
                <div className='col-md-6 mb-3'>
                  <label>Gender</label>
                  <select
                    className='form-select'
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                  >
                    <option value=''>Select</option>
                    <option value='Boys'>Boys Only</option>
                    <option value='Girls'>Girls Only</option>
                    <option value='Boys & Girls'>Co-ed</option>
                  </select>
                </div>
                <div className='col-12 mb-3'>
                  <label>Age Groups</label>
                  <div className='d-flex gap-3'>
                    {['3rd-5th', '6th-8th', '9th-12th'].map((group) => (
                      <div key={group} className='form-check'>
                        <input
                          type='checkbox'
                          className='form-check-input'
                          checked={ageGroups.includes(group)}
                          onChange={() => handleAgeGroupToggle(group)}
                        />
                        <label className='form-check-label'>{group}</label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className='col-12 mb-3'>
                  <label>Days</label>
                  <div className='d-flex gap-3 flex-wrap'>
                    {[
                      'Monday',
                      'Tuesday',
                      'Wednesday',
                      'Thursday',
                      'Friday',
                      'Saturday',
                      'Sunday',
                    ].map((day) => (
                      <div key={day} className='form-check'>
                        <input
                          type='checkbox'
                          className='form-check-input'
                          checked={days.includes(day)}
                          onChange={() => handleDayToggle(day)}
                        />
                        <label className='form-check-label'>
                          {day.slice(0, 3)}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* SCHEDULE & LOCATIONS TAB - Sessions with integrated location */}
      {activeTab === 'schedule' && (
        <>
          <div className='card mb-4'>
            <div className='card-header'>
              <h5>Tryout Sessions with Locations</h5>
              <small className='text-muted'>
                Add each tryout session with its date, time, grade group, and
                location
              </small>
            </div>
            <div className='card-body'>
              {/* Existing Sessions List */}
              {tryoutSessions.map((session) => (
                <div key={session.id} className='card mb-3 bg-light'>
                  <div className='card-body'>
                    <div className='d-flex justify-content-between align-items-start mb-3'>
                      <h6 className='mb-0'>Session {session.number}</h6>
                      <button
                        className='btn btn-sm btn-outline-danger'
                        onClick={() => handleRemoveSession(session.id!)}
                      >
                        <i className='ti ti-trash'></i> Remove
                      </button>
                    </div>
                    <div className='row'>
                      <div className='col-md-3 mb-2'>
                        <strong>Date:</strong>
                        <p className='mb-0'>
                          {session.date || 'Not specified'}
                        </p>
                      </div>
                      <div className='col-md-3 mb-2'>
                        <strong>Time:</strong>
                        <p className='mb-0'>
                          {session.startTime} - {session.endTime}
                        </p>
                      </div>
                      <div className='col-md-3 mb-2'>
                        <strong>Grades:</strong>
                        <p className='mb-0'>{session.grades}</p>
                      </div>
                      <div className='col-md-3 mb-2'>
                        <strong>Location:</strong>
                        {session.location?.name ? (
                          <>
                            <p className='mb-0'>{session.location.name}</p>
                            {getFullAddress(session.location) && (
                              <small className='text-muted'>
                                {getFullAddress(session.location)}
                              </small>
                            )}
                          </>
                        ) : (
                          <p className='mb-0 text-muted'>No location set</p>
                        )}
                      </div>
                    </div>

                    {/* Edit Location Button */}
                    <button
                      className='btn btn-sm btn-outline-secondary mt-2'
                      onClick={() => {
                        const newLocation = prompt(
                          'Enter location name:',
                          session.location?.name || '',
                        );
                        if (newLocation) {
                          handleUpdateSessionLocation(session.id!, {
                            name: newLocation,
                          });
                        }
                      }}
                    >
                      <i className='ti ti-edit'></i> Edit Location
                    </button>
                  </div>
                </div>
              ))}

              {/* Add New Session Form */}
              <div className='border-top pt-4'>
                <h6 className='mb-3'>Add New Session</h6>
                <div className='row'>
                  <div className='col-md-2 mb-2'>
                    <input
                      type='text'
                      className='form-control'
                      placeholder='Date (e.g., Mar 15)'
                      value={newSession.date}
                      onChange={(e) =>
                        setNewSession({ ...newSession, date: e.target.value })
                      }
                    />
                  </div>
                  <div className='col-md-2 mb-2'>
                    <input
                      type='text'
                      className='form-control'
                      placeholder='Start time'
                      value={newSession.startTime}
                      onChange={(e) =>
                        setNewSession({
                          ...newSession,
                          startTime: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className='col-md-2 mb-2'>
                    <input
                      type='text'
                      className='form-control'
                      placeholder='End time'
                      value={newSession.endTime}
                      onChange={(e) =>
                        setNewSession({
                          ...newSession,
                          endTime: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className='col-md-3 mb-2'>
                    <input
                      type='text'
                      className='form-control'
                      placeholder='Grades (e.g., 4th-5th)'
                      value={newSession.grades}
                      onChange={(e) =>
                        setNewSession({ ...newSession, grades: e.target.value })
                      }
                    />
                  </div>
                  <div className='col-md-3 mb-2'>
                    <input
                      type='text'
                      className='form-control'
                      placeholder='Location name'
                      value={newSession.location.name}
                      onChange={(e) =>
                        setNewSession({
                          ...newSession,
                          location: {
                            ...newSession.location,
                            name: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                </div>
                <div className='row'>
                  <div className='col-md-4 mb-2'>
                    <input
                      type='text'
                      className='form-control'
                      placeholder='Address (optional)'
                      value={newSession.location.address}
                      onChange={(e) =>
                        setNewSession({
                          ...newSession,
                          location: {
                            ...newSession.location,
                            address: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                  <div className='col-md-2 mb-2'>
                    <input
                      type='text'
                      className='form-control'
                      placeholder='City'
                      value={newSession.location.city}
                      onChange={(e) =>
                        setNewSession({
                          ...newSession,
                          location: {
                            ...newSession.location,
                            city: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                  <div className='col-md-2 mb-2'>
                    <input
                      type='text'
                      className='form-control'
                      placeholder='State'
                      value={newSession.location.state}
                      onChange={(e) =>
                        setNewSession({
                          ...newSession,
                          location: {
                            ...newSession.location,
                            state: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                  <div className='col-md-2 mb-2'>
                    <input
                      type='text'
                      className='form-control'
                      placeholder='ZIP'
                      value={newSession.location.zipCode}
                      onChange={(e) =>
                        setNewSession({
                          ...newSession,
                          location: {
                            ...newSession.location,
                            zipCode: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                  <div className='col-md-2 mb-2'>
                    <button
                      className='btn btn-primary w-100'
                      onClick={handleAddSession}
                      disabled={
                        !newSession.startTime ||
                        !newSession.endTime ||
                        !newSession.grades
                      }
                    >
                      <i className='ti ti-plus'></i> Add Session
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className='row'>
            <div className='col-md-6 mb-3'>
              <label>Check-in Time</label>
              <input
                type='text'
                className='form-control'
                value={dropOffTime}
                onChange={(e) => setDropOffTime(e.target.value)}
              />
            </div>
            <div className='col-md-6 mb-3'>
              <label>Pick-up Time</label>
              <input
                type='text'
                className='form-control'
                value={pickUpTime}
                onChange={(e) => setPickUpTime(e.target.value)}
              />
            </div>
            <div className='col-md-6 mb-3'>
              <div className='form-check form-switch'>
                <input
                  className='form-check-input'
                  type='checkbox'
                  checked={hasLimitedSpots}
                  onChange={(e) => setHasLimitedSpots(e.target.checked)}
                />
                <label>Limited Spots</label>
              </div>
            </div>
            <div className='col-md-6 mb-3'>
              <label>Max Participants</label>
              <input
                type='number'
                className='form-control'
                value={maxParticipants || ''}
                onChange={(e) =>
                  setMaxParticipants(
                    e.target.value ? parseInt(e.target.value) : null,
                  )
                }
              />
            </div>
            <div className='col-md-6 mb-3'>
              <label>Registration Deadline</label>
              <input
                type='date'
                className='form-control'
                value={registrationDeadline}
                onChange={(e) => setRegistrationDeadline(e.target.value)}
              />
            </div>
            <div className='col-md-6 mb-3'>
              <label>Payment Deadline</label>
              <input
                type='date'
                className='form-control'
                value={paymentDeadline}
                onChange={(e) => setPaymentDeadline(e.target.value)}
              />
            </div>
          </div>
        </>
      )}

      {/* DETAILS TAB */}
      {activeTab === 'details' && (
        <>
          <div className='card mb-4'>
            <div className='card-header'>
              <h5>What to Bring</h5>
            </div>
            <div className='card-body'>
              <div className='input-group mb-3'>
                <input
                  type='text'
                  className='form-control'
                  placeholder='Item to bring'
                  value={newWhatToBring}
                  onChange={(e) => setNewWhatToBring(e.target.value)}
                />
                <button
                  className='btn btn-outline-primary'
                  onClick={handleAddWhatToBring}
                  disabled={!newWhatToBring.trim()}
                >
                  Add
                </button>
              </div>
              {whatToBring.map((item, idx) => (
                <div
                  key={idx}
                  className='d-flex justify-content-between align-items-center mb-2 p-2 bg-light rounded'
                >
                  <span>{item}</span>
                  <button
                    className='btn btn-sm btn-outline-danger'
                    onClick={() => handleRemoveWhatToBring(idx)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className='card mb-4'>
            <div className='card-header'>
              <h5>Notes</h5>
            </div>
            <div className='card-body'>
              <div className='input-group mb-3'>
                <input
                  type='text'
                  className='form-control'
                  placeholder='Add note'
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddNote()}
                />
                <button
                  className='btn btn-outline-primary'
                  onClick={handleAddNote}
                  disabled={!newNote.trim()}
                >
                  Add
                </button>
              </div>
              {notes.map((note, idx) => (
                <div
                  key={idx}
                  className='d-flex justify-content-between align-items-center mb-2 p-2 bg-light rounded'
                >
                  <span>{note}</span>
                  <button
                    className='btn btn-sm btn-outline-danger'
                    onClick={() => handleRemoveNote(idx)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className='card'>
            <div className='card-header'>
              <h5>Contact & Policies</h5>
            </div>
            <div className='card-body'>
              <div className='mb-3'>
                <label>Contact Email</label>
                <input
                  type='email'
                  className='form-control'
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                />
              </div>
              <div className='mb-3'>
                <label>Refund Policy</label>
                <textarea
                  className='form-control'
                  rows={3}
                  value={refundPolicy}
                  onChange={(e) => setRefundPolicy(e.target.value)}
                />
              </div>
              <div className='row'>
                <div className='col-md-6'>
                  <div className='form-check form-switch'>
                    <input
                      className='form-check-input'
                      type='checkbox'
                      checked={requiresRoster}
                      onChange={(e) => setRequiresRoster(e.target.checked)}
                    />
                    <label>Requires Roster Info</label>
                  </div>
                </div>
                <div className='col-md-6'>
                  <div className='form-check form-switch'>
                    <input
                      className='form-check-input'
                      type='checkbox'
                      checked={requiresInsurance}
                      onChange={(e) => setRequiresInsurance(e.target.checked)}
                    />
                    <label>Requires Insurance</label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TryoutFormConfig;
