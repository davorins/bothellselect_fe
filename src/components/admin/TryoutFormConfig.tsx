// src/components/admin/TryoutFormConfig.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  TryoutSpecificConfig,
  SeasonEvent,
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

interface TryoutSession {
  id?: string;
  number: number;
  startTime: string;
  endTime: string;
  grades: string;
}

interface TryoutLocation {
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
}

interface ExtendedTryoutDetails {
  startDate: string;
  endDate: string;
  duration: string;
  gender: string;
  days: string[];
  location: TryoutLocation;
  tryoutSessions: TryoutSession[];
  notes: string[];
  dropOffTime: string;
  pickUpTime: string;
  hasLimitedSpots: boolean;
  contactEmail: string;
  ageGroups: string[];
  maxParticipants: number | null;
  whatToBring: string[];
}

interface ExtendedTryoutConfig extends TryoutSpecificConfig {
  tryoutDetails?: ExtendedTryoutDetails;
}

type TryoutConfigWithDescription = ExtendedTryoutConfig & {
  description: string;
};

const TryoutFormConfig: React.FC<TryoutFormConfigProps> = ({
  onTryoutConfigUpdate,
  initialConfig,
  isEditing = false,
  seasonEvents = [],
  selectedSeason = null,
  onSeasonSelect,
}) => {
  const defaultTryoutDetails: ExtendedTryoutDetails = {
    startDate: '',
    endDate: '',
    duration: '',
    gender: '',
    days: [],
    location: {
      name: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
    },
    tryoutSessions: [],
    notes: [],
    dropOffTime: '',
    pickUpTime: '',
    hasLimitedSpots: false,
    contactEmail: '',
    ageGroups: [],
    maxParticipants: null,
    whatToBring: [],
  };

  const [tryoutConfig, setTryoutConfig] = useState<TryoutConfigWithDescription>(
    () => {
      if (initialConfig) {
        return {
          ...initialConfig,
          description: initialConfig.description || '',
          tryoutDetails:
            (initialConfig as ExtendedTryoutConfig).tryoutDetails ||
            defaultTryoutDetails,
        };
      }

      return {
        tryoutName: '',
        tryoutYear: new Date().getFullYear(),
        displayName: '',
        registrationDeadline: '',
        tryoutDates: [],
        locations: [],
        divisions: [],
        ageGroups: [],
        requiresPayment: true,
        requiresRoster: false,
        requiresInsurance: true,
        paymentDeadline: '',
        refundPolicy: 'No refunds after tryout registration deadline',
        tryoutFee: 50,
        isActive: false,
        eventId: '',
        season: '',
        description: '',
        tryoutDetails: defaultTryoutDetails,
      };
    },
  );

  const [newSession, setNewSession] = useState<
    Omit<TryoutSession, 'id' | 'number'>
  >({
    startTime: '',
    endTime: '',
    grades: '',
  });
  const [newNote, setNewNote] = useState('');
  const [newWhatToBring, setNewWhatToBring] = useState('');
  const [originalTryoutName, setOriginalTryoutName] = useState<string>('');
  const [nameError, setNameError] = useState<string>('');
  const [seasonError, setSeasonError] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<
    'idle' | 'saving' | 'success' | 'error'
  >('idle');
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'basic' | 'schedule' | 'location' | 'details'
  >('basic');

  const initialConfigRef = useRef<TryoutConfigWithDescription | null>(null);

  useEffect(() => {
    if (initialConfig) {
      const configWithDetails: TryoutConfigWithDescription = {
        ...initialConfig,
        description: initialConfig.description || '',
        tryoutDetails:
          (initialConfig as ExtendedTryoutConfig).tryoutDetails ||
          defaultTryoutDetails,
      };
      setTryoutConfig(configWithDetails);
      setOriginalTryoutName(initialConfig.tryoutName || '');
      initialConfigRef.current = JSON.parse(JSON.stringify(configWithDetails));
    }
  }, [initialConfig]);

  useEffect(() => {
    if (selectedSeason && !isEditing) {
      const suggestedName = `${selectedSeason.season} Tryout ${selectedSeason.year}`;
      setTryoutConfig((prev) => ({
        ...prev,
        tryoutName: suggestedName,
        tryoutYear: selectedSeason.year,
        displayName: suggestedName,
        eventId: selectedSeason.eventId,
        season: selectedSeason.season,
      }));
    }
  }, [selectedSeason, isEditing]);

  useEffect(() => {
    if (!initialConfigRef.current) return;
    const currentConfigStr = JSON.stringify(tryoutConfig);
    const initialConfigStr = JSON.stringify(initialConfigRef.current);
    setHasChanges(currentConfigStr !== initialConfigStr);
  }, [tryoutConfig]);

  const updateTryoutDetails = (updates: Partial<ExtendedTryoutDetails>) => {
    setTryoutConfig((prev) => ({
      ...prev,
      tryoutDetails: { ...prev.tryoutDetails!, ...updates },
    }));
  };

  const handleDescriptionChange = (html: string) => {
    setTryoutConfig((prev) => ({ ...prev, description: html }));
  };

  const handleAddSession = () => {
    if (newSession.startTime && newSession.endTime && newSession.grades) {
      const sessions = tryoutConfig.tryoutDetails?.tryoutSessions || [];
      const newSessionWithId: TryoutSession = {
        ...newSession,
        id: Date.now().toString(),
        number: sessions.length + 1,
      };
      updateTryoutDetails({ tryoutSessions: [...sessions, newSessionWithId] });
      setNewSession({ startTime: '', endTime: '', grades: '' });
    }
  };

  const handleRemoveSession = (sessionId: string) => {
    const sessions = (tryoutConfig.tryoutDetails?.tryoutSessions || []).filter(
      (s) => s.id !== sessionId,
    );
    const renumberedSessions = sessions.map((session, idx) => ({
      ...session,
      number: idx + 1,
    }));
    updateTryoutDetails({ tryoutSessions: renumberedSessions });
  };

  const handleAddNote = () => {
    if (newNote.trim()) {
      updateTryoutDetails({
        notes: [...(tryoutConfig.tryoutDetails?.notes || []), newNote.trim()],
      });
      setNewNote('');
    }
  };

  const handleRemoveNote = (noteIndex: number) => {
    updateTryoutDetails({
      notes: tryoutConfig.tryoutDetails?.notes?.filter(
        (_, i) => i !== noteIndex,
      ),
    });
  };

  const handleAddWhatToBring = () => {
    if (newWhatToBring.trim()) {
      updateTryoutDetails({
        whatToBring: [
          ...(tryoutConfig.tryoutDetails?.whatToBring || []),
          newWhatToBring.trim(),
        ],
      });
      setNewWhatToBring('');
    }
  };

  const handleRemoveWhatToBring = (itemIndex: number) => {
    updateTryoutDetails({
      whatToBring: tryoutConfig.tryoutDetails?.whatToBring?.filter(
        (_, i) => i !== itemIndex,
      ),
    });
  };

  const handleDayToggle = (day: string) => {
    const currentDays = tryoutConfig.tryoutDetails?.days || [];
    const updatedDays = currentDays.includes(day)
      ? currentDays.filter((d) => d !== day)
      : [...currentDays, day];
    updateTryoutDetails({ days: updatedDays });
  };

  const handleAgeGroupToggle = (ageGroup: string) => {
    const currentGroups = tryoutConfig.tryoutDetails?.ageGroups || [];
    const updatedGroups = currentGroups.includes(ageGroup)
      ? currentGroups.filter((g) => g !== ageGroup)
      : [...currentGroups, ageGroup];
    updateTryoutDetails({ ageGroups: updatedGroups });
  };

  const validateTryoutName = (name: string): boolean => {
    if (!name.trim()) {
      setNameError('Tryout name is required');
      return false;
    }
    if (name.length < 3) {
      setNameError('Tryout name must be at least 3 characters');
      return false;
    }
    setNameError('');
    return true;
  };

  const validateSeason = (): boolean => {
    if (!tryoutConfig.eventId || !tryoutConfig.season) {
      setSeasonError('Please select a season first');
      return false;
    }
    setSeasonError('');
    return true;
  };

  const handleTryoutNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    validateTryoutName(newName);
    setTryoutConfig((prev) => ({ ...prev, tryoutName: newName }));
  };

  const handleSeasonSelect = (season: SeasonEvent) => {
    if (onSeasonSelect) {
      onSeasonSelect(season);
    }
    const updates: Partial<TryoutConfigWithDescription> = {
      eventId: season.eventId,
      season: season.season,
      tryoutYear: season.year,
    };
    if (!isEditing && !tryoutConfig.tryoutName) {
      const suggestedName = `${season.season} Tryout ${season.year}`;
      updates.tryoutName = suggestedName;
      updates.displayName = suggestedName;
    }
    setTryoutConfig((prev) => ({ ...prev, ...updates }));
  };

  const generateDescriptionFromDetails = (
    details: ExtendedTryoutDetails,
  ): string => {
    let desc = '';
    if (details.startDate) desc += `Start Date: ${details.startDate}\n`;
    if (details.endDate) desc += `End Date: ${details.endDate}\n`;
    if (details.duration) desc += `Duration: ${details.duration}\n`;
    if (details.gender) desc += `Gender: ${details.gender}\n`;
    if (details.days.length) desc += `Days: ${details.days.join(', ')}\n\n`;
    if (details.tryoutSessions.length) {
      desc += `Tryout Sessions:\n`;
      details.tryoutSessions.forEach((session) => {
        desc += `${session.number}) ${session.startTime} - ${session.endTime} (${session.grades})\n`;
      });
      desc += '\n';
    }
    if (details.location.name) {
      desc += `Location: ${details.location.name}`;
      if (details.location.address) {
        desc += ` (${details.location.address}`;
        if (details.location.city) desc += `, ${details.location.city}`;
        if (details.location.state) desc += `, ${details.location.state}`;
        if (details.location.zipCode) desc += ` ${details.location.zipCode}`;
        desc += `)`;
      }
      desc += '\n\n';
    }
    if (details.dropOffTime) desc += `Check-in: ${details.dropOffTime}\n`;
    if (details.whatToBring.length) {
      desc += `What to Bring:\n`;
      details.whatToBring.forEach((item) => {
        desc += `• ${item}\n`;
      });
      desc += '\n';
    }
    if (details.notes.length) {
      desc += `Notes:\n`;
      details.notes.forEach((note) => {
        desc += `• ${note}\n`;
      });
      desc += '\n';
    }
    if (details.contactEmail) desc += `Contact: ${details.contactEmail}\n`;
    return desc;
  };

  const handleSave = async () => {
    if (!validateSeason() || !validateTryoutName(tryoutConfig.tryoutName)) {
      return;
    }

    const configToSave: TryoutSpecificConfig = {
      tryoutName: tryoutConfig.tryoutName,
      tryoutYear: Number(tryoutConfig.tryoutYear),
      displayName: tryoutConfig.displayName,
      registrationDeadline: tryoutConfig.registrationDeadline,
      tryoutDates: tryoutConfig.tryoutDates || [],
      locations: tryoutConfig.locations || [],
      divisions: tryoutConfig.divisions,
      ageGroups: tryoutConfig.ageGroups,
      requiresPayment: tryoutConfig.requiresPayment,
      requiresRoster: tryoutConfig.requiresRoster,
      requiresInsurance: tryoutConfig.requiresInsurance,
      paymentDeadline: tryoutConfig.paymentDeadline,
      refundPolicy: tryoutConfig.refundPolicy,
      tryoutFee: Number(tryoutConfig.tryoutFee) || 50,
      isActive: tryoutConfig.isActive,
      eventId: tryoutConfig.eventId,
      season: tryoutConfig.season,
      description: tryoutConfig.description || '',
      tryoutDetails: tryoutConfig.tryoutDetails,
    };

    console.log(
      '📤 FINAL CONFIG TO SAVE:',
      JSON.stringify(configToSave, null, 2),
    );
    console.log('📤 tryoutDetails being saved:', configToSave.tryoutDetails);

    setIsSaving(true);
    setSaveStatus('saving');

    try {
      await onTryoutConfigUpdate(configToSave, originalTryoutName);
      setSaveStatus('success');
      setHasChanges(false);
      initialConfigRef.current = JSON.parse(JSON.stringify(tryoutConfig));
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error: any) {
      console.error('Error saving tryout config:', error);
      setSaveStatus('error');
      alert(`Error saving tryout config: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (initialConfigRef.current) {
      setTryoutConfig(JSON.parse(JSON.stringify(initialConfigRef.current)));
    }
    setHasChanges(false);
    setNameError('');
    setSeasonError('');
  };

  return (
    <div className='tryout-form-config'>
      {/* Header */}
      <div className='d-flex justify-content-between align-items-center mb-4'>
        <h4>
          Tryout Configuration
          {tryoutConfig.tryoutName && `: ${tryoutConfig.tryoutName}`}
          {!tryoutConfig.tryoutName && ' (New Tryout)'}
        </h4>
        <div className='d-flex align-items-center gap-2'>
          <div className='form-check form-switch me-3'>
            <input
              className='form-check-input'
              type='checkbox'
              checked={tryoutConfig.isActive}
              onChange={(e) =>
                setTryoutConfig((prev) => ({
                  ...prev,
                  isActive: e.target.checked,
                }))
              }
              style={{ transform: 'scale(1.5)' }}
            />
            <label className='form-check-label fw-bold'>
              {tryoutConfig.isActive ? 'Tryout Active' : 'Tryout Inactive'}
            </label>
          </div>
          {saveStatus === 'success' && (
            <span className='text-success'>
              <i className='ti ti-circle-check me-1'></i>Saved!
            </span>
          )}
          {saveStatus === 'error' && (
            <span className='text-danger'>
              <i className='ti ti-alert-circle me-1'></i>Error
            </span>
          )}
        </div>
      </div>

      {/* Unsaved Changes Bar */}
      <div className='card mb-4'>
        <div className='card-body'>
          <div className='d-flex justify-content-between align-items-center'>
            <div>
              {hasChanges && (
                <span className='text-warning'>
                  <i className='ti ti-alert-circle me-1'></i>Unsaved changes
                </span>
              )}
              {seasonError && (
                <span className='text-danger ms-3'>
                  <i className='ti ti-alert-triangle me-1'></i>
                  {seasonError}
                </span>
              )}
            </div>
            <div className='d-flex gap-2'>
              {hasChanges && (
                <button
                  className='btn btn-outline-secondary'
                  onClick={handleCancel}
                  disabled={isSaving}
                >
                  Cancel
                </button>
              )}
              <button
                className='btn btn-primary'
                onClick={handleSave}
                disabled={isSaving || !hasChanges}
              >
                {isSaving ? (
                  <>
                    <span className='spinner-border spinner-border-sm me-2'></span>
                    Saving...
                  </>
                ) : isEditing ? (
                  'Update Tryout'
                ) : (
                  'Create Tryout'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <ul className='nav nav-tabs mb-4'>
        <li className='nav-item'>
          <button
            className={`nav-link ${activeTab === 'basic' ? 'active' : ''}`}
            onClick={() => setActiveTab('basic')}
          >
            <i className='ti ti-settings me-1'></i>Basic
          </button>
        </li>
        <li className='nav-item'>
          <button
            className={`nav-link ${activeTab === 'schedule' ? 'active' : ''}`}
            onClick={() => setActiveTab('schedule')}
          >
            <i className='ti ti-calendar me-1'></i>Schedule
          </button>
        </li>
        <li className='nav-item'>
          <button
            className={`nav-link ${activeTab === 'location' ? 'active' : ''}`}
            onClick={() => setActiveTab('location')}
          >
            <i className='ti ti-map-pin me-1'></i>Location
          </button>
        </li>
        <li className='nav-item'>
          <button
            className={`nav-link ${activeTab === 'details' ? 'active' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            <i className='ti ti-info-circle me-1'></i>Details
          </button>
        </li>
      </ul>

      {/* ========== BASIC TAB ========== */}
      {activeTab === 'basic' && (
        <>
          <div className='card mb-4'>
            <div className='card-header'>
              <h5>Tryout Description</h5>
              <small className='text-muted'>
                This description will appear above the tryout registration form
              </small>
            </div>
            <div className='card-body'>
              <RichTextEditor
                value={tryoutConfig.description}
                onChange={handleDescriptionChange}
                placeholder='Enter a detailed description...'
                showPreview={true}
              />
            </div>
          </div>

          {!isEditing && (
            <div className='card mb-4'>
              <div className='card-header'>
                <h5>Link to Season</h5>
                <small className='text-muted'>
                  Tryouts must be linked to an existing season
                </small>
              </div>
              <div className='card-body'>
                {seasonEvents.length === 0 ? (
                  <div className='alert alert-warning'>
                    No seasons found. Please create a season first.
                  </div>
                ) : (
                  <div className='list-group'>
                    {seasonEvents.map((season) => (
                      <button
                        key={season.eventId}
                        type='button'
                        className={`list-group-item list-group-item-action ${selectedSeason?.eventId === season.eventId ? 'active' : ''}`}
                        onClick={() => handleSeasonSelect(season)}
                      >
                        <div className='d-flex w-100 justify-content-between'>
                          <h6 className='mb-1'>{season.season}</h6>
                          <small>{season.year}</small>
                        </div>
                        <small>Event ID: {season.eventId}</small>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className='card mb-4'>
            <div className='card-header'>
              <h5>Basic Information</h5>
            </div>
            <div className='card-body'>
              <div className='row'>
                <div className='col-md-6 mb-3'>
                  <label className='form-label'>Tryout Name *</label>
                  <input
                    type='text'
                    className={`form-control ${nameError ? 'is-invalid' : ''}`}
                    value={tryoutConfig.tryoutName}
                    onChange={handleTryoutNameChange}
                    disabled={!tryoutConfig.eventId && !isEditing}
                  />
                  {nameError && (
                    <div className='invalid-feedback'>{nameError}</div>
                  )}
                </div>
                <div className='col-md-6 mb-3'>
                  <label className='form-label'>Tryout Year *</label>
                  <input
                    type='number'
                    className='form-control'
                    value={tryoutConfig.tryoutYear}
                    onChange={(e) =>
                      setTryoutConfig((prev) => ({
                        ...prev,
                        tryoutYear:
                          parseInt(e.target.value) || new Date().getFullYear(),
                      }))
                    }
                    disabled={!tryoutConfig.eventId && !isEditing}
                  />
                </div>
              </div>
              <div className='row'>
                <div className='col-md-6 mb-3'>
                  <label className='form-label'>Display Name</label>
                  <input
                    type='text'
                    className='form-control'
                    value={tryoutConfig.displayName || ''}
                    onChange={(e) =>
                      setTryoutConfig((prev) => ({
                        ...prev,
                        displayName: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className='col-md-6 mb-3'>
                  <label className='form-label'>Tryout Fee</label>
                  <div className='input-group'>
                    <span className='input-group-text'>$</span>
                    <input
                      type='number'
                      className='form-control'
                      value={tryoutConfig.tryoutFee}
                      onChange={(e) =>
                        setTryoutConfig((prev) => ({
                          ...prev,
                          tryoutFee: Number(e.target.value) || 50,
                        }))
                      }
                      min='0'
                    />
                  </div>
                </div>
              </div>
              <div className='row'>
                <div className='col-md-6 mb-3'>
                  <label className='form-label'>Start Date</label>
                  <input
                    type='text'
                    className='form-control'
                    placeholder='e.g., February 27'
                    value={tryoutConfig.tryoutDetails?.startDate || ''}
                    onChange={(e) =>
                      updateTryoutDetails({ startDate: e.target.value })
                    }
                  />
                </div>
                <div className='col-md-6 mb-3'>
                  <label className='form-label'>End Date</label>
                  <input
                    type='text'
                    className='form-control'
                    placeholder='e.g., February 28'
                    value={tryoutConfig.tryoutDetails?.endDate || ''}
                    onChange={(e) =>
                      updateTryoutDetails({ endDate: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className='row'>
                <div className='col-md-6 mb-3'>
                  <label className='form-label'>Duration</label>
                  <input
                    type='text'
                    className='form-control'
                    placeholder='e.g., 2 days'
                    value={tryoutConfig.tryoutDetails?.duration || ''}
                    onChange={(e) =>
                      updateTryoutDetails({ duration: e.target.value })
                    }
                  />
                </div>
                <div className='col-md-6 mb-3'>
                  <label className='form-label'>Gender</label>
                  <select
                    className='form-select'
                    value={tryoutConfig.tryoutDetails?.gender || ''}
                    onChange={(e) =>
                      updateTryoutDetails({ gender: e.target.value })
                    }
                  >
                    <option value=''>Select gender</option>
                    <option value='Boys'>Boys Only</option>
                    <option value='Girls'>Girls Only</option>
                    <option value='Boys & Girls'>Boys & Girls</option>
                  </select>
                </div>
              </div>
              <div className='mb-3'>
                <label className='form-label'>Age Groups / Grades</label>
                <div className='d-flex gap-3 flex-wrap'>
                  {['3rd-5th', '6th-8th', '9th-12th'].map((group) => (
                    <div key={group} className='form-check'>
                      <input
                        type='checkbox'
                        className='form-check-input'
                        id={`age-group-${group}`}
                        checked={
                          tryoutConfig.tryoutDetails?.ageGroups?.includes(
                            group,
                          ) || false
                        }
                        onChange={() => handleAgeGroupToggle(group)}
                      />
                      <label
                        className='form-check-label'
                        htmlFor={`age-group-${group}`}
                      >
                        {group}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <div className='mb-3'>
                <label className='form-label'>Days of Week</label>
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
                        id={`day-${day}`}
                        checked={
                          tryoutConfig.tryoutDetails?.days?.includes(day) ||
                          false
                        }
                        onChange={() => handleDayToggle(day)}
                      />
                      <label
                        className='form-check-label'
                        htmlFor={`day-${day}`}
                      >
                        {day.slice(0, 3)}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ========== SCHEDULE TAB ========== */}
      {activeTab === 'schedule' && (
        <>
          <div className='card mb-4'>
            <div className='card-header'>
              <h5>Tryout Sessions</h5>
              <small className='text-muted'>
                Add tryout sessions by grade level
              </small>
            </div>
            <div className='card-body'>
              {(tryoutConfig.tryoutDetails?.tryoutSessions || []).map(
                (session) => (
                  <div
                    key={session.id}
                    className='d-flex justify-content-between align-items-center mb-2 p-2 bg-light rounded'
                  >
                    <div>
                      <strong>Session {session.number}:</strong>{' '}
                      {session.startTime} - {session.endTime}
                      <span className='text-muted ms-2'>
                        Grades: {session.grades}
                      </span>
                    </div>
                    <button
                      className='btn btn-sm btn-outline-danger'
                      onClick={() => handleRemoveSession(session.id!)}
                    >
                      <i className='ti ti-trash'></i>
                    </button>
                  </div>
                ),
              )}
              <div className='row mt-3'>
                <div className='col-md-3 mb-2'>
                  <input
                    type='text'
                    className='form-control'
                    placeholder='Start time (e.g., 5:00 PM)'
                    value={newSession.startTime}
                    onChange={(e) =>
                      setNewSession({
                        ...newSession,
                        startTime: e.target.value,
                      })
                    }
                  />
                </div>
                <div className='col-md-3 mb-2'>
                  <input
                    type='text'
                    className='form-control'
                    placeholder='End time (e.g., 6:30 PM)'
                    value={newSession.endTime}
                    onChange={(e) =>
                      setNewSession({ ...newSession, endTime: e.target.value })
                    }
                  />
                </div>
                <div className='col-md-4 mb-2'>
                  <input
                    type='text'
                    className='form-control'
                    placeholder='Grades (e.g., 4th-5th grade)'
                    value={newSession.grades}
                    onChange={(e) =>
                      setNewSession({ ...newSession, grades: e.target.value })
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
                    <i className='ti ti-plus'></i> Add
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className='row'>
            <div className='col-md-6 mb-3'>
              <label className='form-label'>Check-in / Drop-off Time</label>
              <input
                type='text'
                className='form-control'
                placeholder='e.g., 4:30-5:00 PM'
                value={tryoutConfig.tryoutDetails?.dropOffTime || ''}
                onChange={(e) =>
                  updateTryoutDetails({ dropOffTime: e.target.value })
                }
              />
            </div>
            <div className='col-md-6 mb-3'>
              <label className='form-label'>Pick-up Time</label>
              <input
                type='text'
                className='form-control'
                placeholder='e.g., 9:30 PM'
                value={tryoutConfig.tryoutDetails?.pickUpTime || ''}
                onChange={(e) =>
                  updateTryoutDetails({ pickUpTime: e.target.value })
                }
              />
            </div>
          </div>

          <div className='mb-3'>
            <div className='form-check form-switch'>
              <input
                className='form-check-input'
                type='checkbox'
                checked={tryoutConfig.tryoutDetails?.hasLimitedSpots || false}
                onChange={(e) =>
                  updateTryoutDetails({ hasLimitedSpots: e.target.checked })
                }
              />
              <label className='form-check-label fw-bold'>
                Limited Spots Available
              </label>
            </div>
          </div>

          <div className='mb-3'>
            <label className='form-label'>Max Participants (Optional)</label>
            <input
              type='number'
              className='form-control'
              placeholder='e.g., 50'
              value={tryoutConfig.tryoutDetails?.maxParticipants || ''}
              onChange={(e) =>
                updateTryoutDetails({
                  maxParticipants: parseInt(e.target.value) || null,
                })
              }
              min='1'
            />
          </div>

          <div className='row'>
            <div className='col-md-6 mb-3'>
              <label className='form-label'>Registration Deadline</label>
              <input
                type='date'
                className='form-control'
                value={tryoutConfig.registrationDeadline || ''}
                onChange={(e) =>
                  setTryoutConfig((prev) => ({
                    ...prev,
                    registrationDeadline: e.target.value,
                  }))
                }
              />
            </div>
            <div className='col-md-6 mb-3'>
              <label className='form-label'>Payment Deadline</label>
              <input
                type='date'
                className='form-control'
                value={tryoutConfig.paymentDeadline || ''}
                onChange={(e) =>
                  setTryoutConfig((prev) => ({
                    ...prev,
                    paymentDeadline: e.target.value,
                  }))
                }
              />
            </div>
          </div>
        </>
      )}

      {/* ========== LOCATION TAB ========== */}
      {activeTab === 'location' && (
        <div className='card mb-4'>
          <div className='card-header'>
            <h5>Tryout Location</h5>
            <small className='text-muted'>
              Enter the physical location of the tryout
            </small>
          </div>
          <div className='card-body'>
            <div className='mb-3'>
              <label className='form-label'>Location Name</label>
              <input
                type='text'
                className='form-control'
                placeholder='e.g., Skyview Middle School'
                value={tryoutConfig.tryoutDetails?.location?.name || ''}
                onChange={(e) =>
                  updateTryoutDetails({
                    location: {
                      ...tryoutConfig.tryoutDetails?.location,
                      name: e.target.value,
                      address:
                        tryoutConfig.tryoutDetails?.location?.address || '',
                      city: tryoutConfig.tryoutDetails?.location?.city || '',
                      state: tryoutConfig.tryoutDetails?.location?.state || '',
                      zipCode:
                        tryoutConfig.tryoutDetails?.location?.zipCode || '',
                    },
                  })
                }
              />
            </div>
            <div className='mb-3'>
              <label className='form-label'>Street Address</label>
              <input
                type='text'
                className='form-control'
                placeholder='e.g., 21404 35th Ave SE'
                value={tryoutConfig.tryoutDetails?.location?.address || ''}
                onChange={(e) =>
                  updateTryoutDetails({
                    location: {
                      ...tryoutConfig.tryoutDetails?.location,
                      name: tryoutConfig.tryoutDetails?.location?.name || '',
                      address: e.target.value,
                      city: tryoutConfig.tryoutDetails?.location?.city || '',
                      state: tryoutConfig.tryoutDetails?.location?.state || '',
                      zipCode:
                        tryoutConfig.tryoutDetails?.location?.zipCode || '',
                    },
                  })
                }
              />
            </div>
            <div className='row'>
              <div className='col-md-4 mb-3'>
                <label className='form-label'>City</label>
                <input
                  type='text'
                  className='form-control'
                  placeholder='Bothell'
                  value={tryoutConfig.tryoutDetails?.location?.city || ''}
                  onChange={(e) =>
                    updateTryoutDetails({
                      location: {
                        ...tryoutConfig.tryoutDetails?.location,
                        name: tryoutConfig.tryoutDetails?.location?.name || '',
                        address:
                          tryoutConfig.tryoutDetails?.location?.address || '',
                        city: e.target.value,
                        state:
                          tryoutConfig.tryoutDetails?.location?.state || '',
                        zipCode:
                          tryoutConfig.tryoutDetails?.location?.zipCode || '',
                      },
                    })
                  }
                />
              </div>
              <div className='col-md-4 mb-3'>
                <label className='form-label'>State</label>
                <input
                  type='text'
                  className='form-control'
                  placeholder='WA'
                  value={tryoutConfig.tryoutDetails?.location?.state || ''}
                  onChange={(e) =>
                    updateTryoutDetails({
                      location: {
                        ...tryoutConfig.tryoutDetails?.location,
                        name: tryoutConfig.tryoutDetails?.location?.name || '',
                        address:
                          tryoutConfig.tryoutDetails?.location?.address || '',
                        city: tryoutConfig.tryoutDetails?.location?.city || '',
                        state: e.target.value,
                        zipCode:
                          tryoutConfig.tryoutDetails?.location?.zipCode || '',
                      },
                    })
                  }
                />
              </div>
              <div className='col-md-4 mb-3'>
                <label className='form-label'>ZIP Code</label>
                <input
                  type='text'
                  className='form-control'
                  placeholder='98021'
                  value={tryoutConfig.tryoutDetails?.location?.zipCode || ''}
                  onChange={(e) =>
                    updateTryoutDetails({
                      location: {
                        ...tryoutConfig.tryoutDetails?.location,
                        name: tryoutConfig.tryoutDetails?.location?.name || '',
                        address:
                          tryoutConfig.tryoutDetails?.location?.address || '',
                        city: tryoutConfig.tryoutDetails?.location?.city || '',
                        state:
                          tryoutConfig.tryoutDetails?.location?.state || '',
                        zipCode: e.target.value,
                      },
                    })
                  }
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========== DETAILS TAB ========== */}
      {activeTab === 'details' && (
        <>
          <div className='card mb-4'>
            <div className='card-header'>
              <h5>What to Bring</h5>
              <small className='text-muted'>
                Items players should bring to the tryout
              </small>
            </div>
            <div className='card-body'>
              <div className='input-group mb-3'>
                <input
                  type='text'
                  className='form-control'
                  placeholder='e.g., Basketball shoes, Water bottle'
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
              {(tryoutConfig.tryoutDetails?.whatToBring || []).map(
                (item, idx) => (
                  <div
                    key={idx}
                    className='d-flex justify-content-between align-items-center mb-2 p-2 bg-light rounded'
                  >
                    <span>{item}</span>
                    <button
                      className='btn btn-sm btn-outline-danger'
                      onClick={() => handleRemoveWhatToBring(idx)}
                    >
                      <i className='ti ti-trash'></i>
                    </button>
                  </div>
                ),
              )}
            </div>
          </div>

          <div className='card mb-4'>
            <div className='card-header'>
              <h5>Important Notes</h5>
              <small className='text-muted'>
                Additional information for parents and players
              </small>
            </div>
            <div className='card-body'>
              <div className='input-group mb-3'>
                <input
                  type='text'
                  className='form-control'
                  placeholder='Add an important note'
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
              {(tryoutConfig.tryoutDetails?.notes || []).map((note, idx) => (
                <div
                  key={idx}
                  className='d-flex justify-content-between align-items-center mb-2 p-2 bg-light rounded'
                >
                  <span>{note}</span>
                  <button
                    className='btn btn-sm btn-outline-danger'
                    onClick={() => handleRemoveNote(idx)}
                  >
                    <i className='ti ti-trash'></i>
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className='card mb-4'>
            <div className='card-header'>
              <h5>Contact & Policies</h5>
            </div>
            <div className='card-body'>
              <div className='mb-3'>
                <label className='form-label'>Contact Email</label>
                <input
                  type='email'
                  className='form-control'
                  placeholder='e.g., info@bothellselect.com'
                  value={tryoutConfig.tryoutDetails?.contactEmail || ''}
                  onChange={(e) =>
                    updateTryoutDetails({ contactEmail: e.target.value })
                  }
                />
                <small className='text-muted'>
                  Email for parents to contact with questions
                </small>
              </div>
              <div className='mb-3'>
                <label className='form-label'>Refund Policy</label>
                <textarea
                  className='form-control'
                  rows={3}
                  value={tryoutConfig.refundPolicy}
                  onChange={(e) =>
                    setTryoutConfig((prev) => ({
                      ...prev,
                      refundPolicy: e.target.value,
                    }))
                  }
                />
              </div>
              <div className='row'>
                <div className='col-md-6'>
                  <div className='form-check form-switch mb-3'>
                    <input
                      className='form-check-input'
                      type='checkbox'
                      checked={tryoutConfig.requiresRoster}
                      onChange={(e) =>
                        setTryoutConfig((prev) => ({
                          ...prev,
                          requiresRoster: e.target.checked,
                        }))
                      }
                    />
                    <label className='form-check-label'>
                      Requires Roster Info
                    </label>
                  </div>
                </div>
                <div className='col-md-6'>
                  <div className='form-check form-switch mb-3'>
                    <input
                      className='form-check-input'
                      type='checkbox'
                      checked={tryoutConfig.requiresInsurance}
                      onChange={(e) =>
                        setTryoutConfig((prev) => ({
                          ...prev,
                          requiresInsurance: e.target.checked,
                        }))
                      }
                    />
                    <label className='form-check-label'>
                      Requires Insurance
                    </label>
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
