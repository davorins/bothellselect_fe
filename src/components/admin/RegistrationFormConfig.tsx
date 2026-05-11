// components/admin/RegistrationFormConfig.tsx
import React, { useState, useEffect } from 'react';
import { Badge } from 'react-bootstrap';
import {
  RegistrationFormConfig as RegistrationFormConfigType,
  SeasonEvent,
  PricingPackage,
  TrainingDetails,
  TrainingSession,
} from '../../types/registration-types';
import RichTextEditor from '../common/RichTextEditor';

interface RegistrationFormConfigProps {
  seasonEvent: SeasonEvent;
  onConfigUpdate: (config: RegistrationFormConfigType) => void;
  initialConfig?: RegistrationFormConfigType;
}

// Extended type for internal use only
interface ExtendedFormConfig extends RegistrationFormConfigType {
  trainingDetails?: TrainingDetails;
}

const RegistrationFormConfig: React.FC<RegistrationFormConfigProps> = ({
  seasonEvent,
  onConfigUpdate,
  initialConfig,
}) => {
  const defaultTrainingDetails: TrainingDetails = {
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
    trainingSessions: [],
    notes: [],
    dropOffTime: '',
    pickUpTime: '',
    hasLimitedSpots: false,
    contactEmail: '',
    ageGroups: [],
    maxParticipants: null,
  };

  const defaultConfig: ExtendedFormConfig = {
    isActive: false,
    requiresPayment: true,
    requiresQualification: false,
    pricing: {
      basePrice: 0,
      packages: [],
    },
    description: '',
    trainingDetails: defaultTrainingDetails,
  };

  const [config, setConfig] = useState<ExtendedFormConfig>(defaultConfig);
  const [newPackage, setNewPackage] = useState<Omit<PricingPackage, 'id'>>({
    name: '',
    price: 0,
    description: '',
  });
  const [newSession, setNewSession] = useState<
    Omit<TrainingSession, 'id' | 'number'>
  >({
    startTime: '',
    endTime: '',
    grades: '',
  });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [activeTab, setActiveTab] = useState<
    'basic' | 'schedule' | 'location' | 'details'
  >('basic');

  useEffect(() => {
    if (initialConfig) {
      const extendedConfig = initialConfig as ExtendedFormConfig;
      const loadedConfig: ExtendedFormConfig = {
        isActive: extendedConfig.isActive ?? defaultConfig.isActive,
        requiresPayment:
          extendedConfig.requiresPayment ?? defaultConfig.requiresPayment,
        requiresQualification:
          extendedConfig.requiresQualification ??
          defaultConfig.requiresQualification,
        description: extendedConfig.description || '',
        pricing: {
          basePrice:
            extendedConfig.pricing?.basePrice ??
            defaultConfig.pricing.basePrice,
          packages:
            extendedConfig.pricing?.packages?.map((pkg) => ({
              id: pkg.id || Date.now().toString(),
              name: pkg.name || '',
              price: pkg.price || 0,
              description: pkg.description || '',
            })) || [],
        },
        trainingDetails: {
          ...defaultTrainingDetails,
          ...(extendedConfig.trainingDetails || {}),
        },
      };
      setConfig(loadedConfig);
      setHasUnsavedChanges(false);
    } else {
      setConfig(defaultConfig);
    }
  }, [initialConfig]);

  const updateConfig = (updates: Partial<ExtendedFormConfig>) => {
    setConfig((prev) => {
      const newConfig = { ...prev, ...updates };
      setHasUnsavedChanges(true);
      return newConfig;
    });
  };

  const updateTrainingDetails = (updates: Partial<TrainingDetails>) => {
    setConfig((prev) => ({
      ...prev,
      trainingDetails: { ...prev.trainingDetails!, ...updates },
    }));
    setHasUnsavedChanges(true);
  };

  const handleAddPackage = () => {
    if (newPackage.name && newPackage.price > 0) {
      const packageWithId: PricingPackage = {
        ...newPackage,
        id: Date.now().toString(),
      };
      setConfig((prev) => ({
        ...prev,
        pricing: {
          ...prev.pricing,
          packages: [...prev.pricing.packages, packageWithId],
        },
      }));
      setHasUnsavedChanges(true);
      setNewPackage({ name: '', price: 0, description: '' });
    }
  };

  const handleRemovePackage = (packageId: string) => {
    setConfig((prev) => ({
      ...prev,
      pricing: {
        ...prev.pricing,
        packages: prev.pricing.packages.filter((pkg) => pkg.id !== packageId),
      },
    }));
    setHasUnsavedChanges(true);
  };

  const handleAddSession = () => {
    if (newSession.startTime && newSession.endTime && newSession.grades) {
      const sessions = config.trainingDetails?.trainingSessions || [];
      const newSessionWithId: TrainingSession = {
        ...newSession,
        id: Date.now().toString(),
        number: sessions.length + 1,
      };
      updateTrainingDetails({
        trainingSessions: [...sessions, newSessionWithId],
      });
      setNewSession({ startTime: '', endTime: '', grades: '' });
    }
  };

  const handleRemoveSession = (sessionId: string) => {
    const sessions = (config.trainingDetails?.trainingSessions || []).filter(
      (s) => s.id !== sessionId,
    );
    // Renumber remaining sessions
    const renumberedSessions = sessions.map((session, idx) => ({
      ...session,
      number: idx + 1,
    }));
    updateTrainingDetails({ trainingSessions: renumberedSessions });
  };

  const handleAddNote = () => {
    if (newNote.trim()) {
      updateTrainingDetails({
        notes: [...(config.trainingDetails?.notes || []), newNote.trim()],
      });
      setNewNote('');
    }
  };

  const handleRemoveNote = (noteIndex: number) => {
    updateTrainingDetails({
      notes: config.trainingDetails?.notes?.filter((_, i) => i !== noteIndex),
    });
  };

  const handleDayToggle = (day: string) => {
    const currentDays = config.trainingDetails?.days || [];
    const updatedDays = currentDays.includes(day)
      ? currentDays.filter((d) => d !== day)
      : [...currentDays, day];
    updateTrainingDetails({ days: updatedDays });
  };

  const handleAgeGroupToggle = (ageGroup: string) => {
    const currentGroups = config.trainingDetails?.ageGroups || [];
    const updatedGroups = currentGroups.includes(ageGroup)
      ? currentGroups.filter((g) => g !== ageGroup)
      : [...currentGroups, ageGroup];
    updateTrainingDetails({ ageGroups: updatedGroups });
  };

  const handleSave = async () => {
    if (!hasUnsavedChanges) return;

    try {
      setIsSaving(true);

      // Generate description from structured data for backward compatibility
      const generatedDescription = generateDescriptionFromTrainingDetails(
        config.trainingDetails!,
      );

      const configToSave: RegistrationFormConfigType = {
        ...config,
        description: config.description || generatedDescription,
        pricing: {
          basePrice: config.pricing.basePrice || 0,
          packages: config.pricing.packages.map((pkg) => ({
            id: pkg.id || Date.now().toString(),
            name: pkg.name,
            price: pkg.price,
            description: pkg.description || '',
          })),
        },
      };

      await onConfigUpdate(configToSave);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Failed to save config:', error);
      alert('Failed to save configuration. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const generateDescriptionFromTrainingDetails = (
    details: TrainingDetails,
  ): string => {
    let desc = '';

    if (details.startDate) desc += `Start Date: ${details.startDate}\n`;
    if (details.endDate) desc += `End Date: ${details.endDate}\n`;
    if (details.duration) desc += `Duration: ${details.duration}\n`;
    if (details.gender) desc += `Gender: ${details.gender}\n`;
    if (details.days.length) desc += `Days: ${details.days.join(', ')}\n\n`;

    if (details.trainingSessions.length) {
      desc += `Times:\n`;
      details.trainingSessions.forEach((session) => {
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

    if (details.dropOffTime) desc += `Drop-off: ${details.dropOffTime}\n`;
    if (details.pickUpTime) desc += `Pick-up: ${details.pickUpTime}\n\n`;

    if (details.notes.length) {
      desc += `Notes:\n`;
      details.notes.forEach((note, i) => {
        desc += `Note #${i + 1}: ${note}\n`;
      });
      desc += '\n';
    }

    if (details.contactEmail) desc += `Contact: ${details.contactEmail}\n`;
    if (details.maxParticipants)
      desc += `Max Participants: ${details.maxParticipants}\n`;

    return desc;
  };

  // Common section styles
  const sectionStyle = { borderLeft: '3px solid #0d6efd', paddingLeft: '1rem' };

  return (
    <div className='card'>
      <div className='card-body'>
        {/* Header */}
        <div className='d-flex justify-content-between align-items-center mb-4'>
          <div>
            <h4 className='mb-1'>
              Training Configuration - {seasonEvent.season} {seasonEvent.year}
            </h4>
            <p className='text-muted mb-0'>
              {initialConfig
                ? 'Edit existing configuration'
                : 'Create new configuration'}
            </p>
          </div>
          <div className='d-flex align-items-center'>
            {hasUnsavedChanges && (
              <Badge bg='warning' className='me-3'>
                <i className='ti ti-alert-circle me-1'></i>
                Unsaved Changes
              </Badge>
            )}
            <button
              className='btn btn-primary'
              onClick={handleSave}
              disabled={!hasUnsavedChanges || isSaving}
            >
              {isSaving ? (
                <>
                  <span className='spinner-border spinner-border-sm me-2'></span>
                  Saving...
                </>
              ) : (
                <>
                  <i className='ti ti-device-floppy me-2'></i>
                  Save Configuration
                </>
              )}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <ul className='nav nav-tabs mb-4'>
          <li className='nav-item'>
            <button
              className={`nav-link ${activeTab === 'basic' ? 'active' : ''}`}
              onClick={() => setActiveTab('basic')}
            >
              <i className='ti ti-settings me-1'></i> Basic Settings
            </button>
          </li>
          <li className='nav-item'>
            <button
              className={`nav-link ${activeTab === 'schedule' ? 'active' : ''}`}
              onClick={() => setActiveTab('schedule')}
            >
              <i className='ti ti-calendar me-1'></i> Schedule & Sessions
            </button>
          </li>
          <li className='nav-item'>
            <button
              className={`nav-link ${activeTab === 'location' ? 'active' : ''}`}
              onClick={() => setActiveTab('location')}
            >
              <i className='ti ti-map-pin me-1'></i> Location
            </button>
          </li>
          <li className='nav-item'>
            <button
              className={`nav-link ${activeTab === 'details' ? 'active' : ''}`}
              onClick={() => setActiveTab('details')}
            >
              <i className='ti ti-info-circle me-1'></i> Additional Details
            </button>
          </li>
        </ul>

        {/* Tab Content */}
        <div className='tab-content'>
          {/* Basic Settings Tab */}
          <div className={`tab-pane ${activeTab === 'basic' ? 'active' : ''}`}>
            <div className='row'>
              <div className='col-md-6 mb-3'>
                <label className='form-label'>Start Date</label>
                <input
                  type='text'
                  className='form-control'
                  placeholder='e.g., June 29th'
                  value={config.trainingDetails?.startDate || ''}
                  onChange={(e) =>
                    updateTrainingDetails({ startDate: e.target.value })
                  }
                />
                <small className='text-muted'>Example: June 29th, 2026</small>
              </div>
              <div className='col-md-6 mb-3'>
                <label className='form-label'>End Date</label>
                <input
                  type='text'
                  className='form-control'
                  placeholder='e.g., August 21st'
                  value={config.trainingDetails?.endDate || ''}
                  onChange={(e) =>
                    updateTrainingDetails({ endDate: e.target.value })
                  }
                />
              </div>

              <div className='col-md-6 mb-3'>
                <label className='form-label'>Duration</label>
                <input
                  type='text'
                  className='form-control'
                  placeholder='e.g., 8-weeks'
                  value={config.trainingDetails?.duration || ''}
                  onChange={(e) =>
                    updateTrainingDetails({ duration: e.target.value })
                  }
                />
              </div>

              <div className='col-md-6 mb-3'>
                <label className='form-label'>Gender</label>
                <select
                  className='form-select'
                  value={config.trainingDetails?.gender || ''}
                  onChange={(e) =>
                    updateTrainingDetails({ gender: e.target.value })
                  }
                >
                  <option value=''>Select gender</option>
                  <option value='Boys'>Boys Only</option>
                  <option value='Girls'>Girls Only</option>
                  <option value='Boys & Girls'>Co-ed (Boys & Girls)</option>
                </select>
              </div>

              <div className='col-12 mb-3'>
                <label className='form-label'>Age Groups / Grades</label>
                <div className='d-flex gap-3 flex-wrap'>
                  {['3rd-5th', '6th-8th', '9th-12th'].map((group) => (
                    <div key={group} className='form-check'>
                      <input
                        type='checkbox'
                        className='form-check-input'
                        id={`age-group-${group}`}
                        checked={
                          config.trainingDetails?.ageGroups?.includes(group) ||
                          false
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
                <small className='text-muted'>
                  Select all applicable age groups
                </small>
              </div>

              <div className='col-12 mb-3'>
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
                          config.trainingDetails?.days?.includes(day) || false
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

          {/* Schedule & Sessions Tab */}
          <div
            className={`tab-pane ${activeTab === 'schedule' ? 'active' : ''}`}
          >
            <div className='row'>
              <div className='col-12 mb-4'>
                <div style={sectionStyle}>
                  <h6 className='mb-3'>Training Sessions</h6>

                  {(config.trainingDetails?.trainingSessions || []).map(
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
                          type='button'
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
                        placeholder='Start time (e.g., 9am)'
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
                        placeholder='End time (e.g., 11am)'
                        value={newSession.endTime}
                        onChange={(e) =>
                          setNewSession({
                            ...newSession,
                            endTime: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className='col-md-4 mb-2'>
                      <input
                        type='text'
                        className='form-control'
                        placeholder='Grades (e.g., 3rd, 4th, 5th grade)'
                        value={newSession.grades}
                        onChange={(e) =>
                          setNewSession({
                            ...newSession,
                            grades: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className='col-md-2 mb-2'>
                      <button
                        type='button'
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

              <div className='col-md-6 mb-3'>
                <label className='form-label'>Drop-off Time</label>
                <input
                  type='text'
                  className='form-control'
                  placeholder='e.g., 8:30-9:00 AM'
                  value={config.trainingDetails?.dropOffTime || ''}
                  onChange={(e) =>
                    updateTrainingDetails({ dropOffTime: e.target.value })
                  }
                />
              </div>

              <div className='col-md-6 mb-3'>
                <label className='form-label'>Pick-up Time</label>
                <input
                  type='text'
                  className='form-control'
                  placeholder='e.g., 3:00-3:30 PM'
                  value={config.trainingDetails?.pickUpTime || ''}
                  onChange={(e) =>
                    updateTrainingDetails({ pickUpTime: e.target.value })
                  }
                />
              </div>

              <div className='col-12 mb-3'>
                <div className='form-check form-switch'>
                  <input
                    className='form-check-input'
                    type='checkbox'
                    checked={config.trainingDetails?.hasLimitedSpots || false}
                    onChange={(e) =>
                      updateTrainingDetails({
                        hasLimitedSpots: e.target.checked,
                      })
                    }
                  />
                  <label className='form-check-label fw-bold'>
                    Limited Spots Available
                  </label>
                </div>
              </div>

              <div className='col-md-6 mb-3'>
                <label className='form-label'>
                  Max Participants (Optional)
                </label>
                <input
                  type='number'
                  className='form-control'
                  placeholder='e.g., 50'
                  value={config.trainingDetails?.maxParticipants || ''}
                  onChange={(e) =>
                    updateTrainingDetails({
                      maxParticipants: parseInt(e.target.value) || null,
                    })
                  }
                  min='1'
                />
              </div>
            </div>
          </div>

          {/* Location Tab */}
          <div
            className={`tab-pane ${activeTab === 'location' ? 'active' : ''}`}
          >
            <div className='row'>
              <div className='col-12 mb-3'>
                <label className='form-label'>Location Name</label>
                <input
                  type='text'
                  className='form-control'
                  placeholder='e.g., Kenmore Middle School'
                  value={config.trainingDetails?.location?.name || ''}
                  onChange={(e) =>
                    updateTrainingDetails({
                      location: {
                        ...config.trainingDetails?.location,
                        name: e.target.value,
                        address:
                          config.trainingDetails?.location?.address || '',
                        city: config.trainingDetails?.location?.city || '',
                        state: config.trainingDetails?.location?.state || '',
                        zipCode:
                          config.trainingDetails?.location?.zipCode || '',
                      },
                    })
                  }
                />
              </div>

              <div className='col-12 mb-3'>
                <label className='form-label'>Street Address</label>
                <input
                  type='text'
                  className='form-control'
                  placeholder='e.g., 20323 66th Avenue NE'
                  value={config.trainingDetails?.location?.address || ''}
                  onChange={(e) =>
                    updateTrainingDetails({
                      location: {
                        ...config.trainingDetails?.location,
                        name: config.trainingDetails?.location?.name || '',
                        address: e.target.value,
                        city: config.trainingDetails?.location?.city || '',
                        state: config.trainingDetails?.location?.state || '',
                        zipCode:
                          config.trainingDetails?.location?.zipCode || '',
                      },
                    })
                  }
                />
              </div>

              <div className='col-md-4 mb-3'>
                <label className='form-label'>City</label>
                <input
                  type='text'
                  className='form-control'
                  placeholder='Kenmore'
                  value={config.trainingDetails?.location?.city || ''}
                  onChange={(e) =>
                    updateTrainingDetails({
                      location: {
                        ...config.trainingDetails?.location,
                        name: config.trainingDetails?.location?.name || '',
                        address:
                          config.trainingDetails?.location?.address || '',
                        city: e.target.value,
                        state: config.trainingDetails?.location?.state || '',
                        zipCode:
                          config.trainingDetails?.location?.zipCode || '',
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
                  value={config.trainingDetails?.location?.state || ''}
                  onChange={(e) =>
                    updateTrainingDetails({
                      location: {
                        ...config.trainingDetails?.location,
                        name: config.trainingDetails?.location?.name || '',
                        address:
                          config.trainingDetails?.location?.address || '',
                        city: config.trainingDetails?.location?.city || '',
                        state: e.target.value,
                        zipCode:
                          config.trainingDetails?.location?.zipCode || '',
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
                  placeholder='98028'
                  value={config.trainingDetails?.location?.zipCode || ''}
                  onChange={(e) =>
                    updateTrainingDetails({
                      location: {
                        ...config.trainingDetails?.location,
                        name: config.trainingDetails?.location?.name || '',
                        address:
                          config.trainingDetails?.location?.address || '',
                        city: config.trainingDetails?.location?.city || '',
                        state: config.trainingDetails?.location?.state || '',
                        zipCode: e.target.value,
                      },
                    })
                  }
                />
              </div>

              <div className='col-12'>
                <button
                  type='button'
                  className='btn btn-outline-secondary btn-sm'
                  onClick={() => {
                    const addr = [
                      config.trainingDetails?.location?.address,
                      config.trainingDetails?.location?.city,
                      config.trainingDetails?.location?.state,
                      config.trainingDetails?.location?.zipCode,
                    ]
                      .filter(Boolean)
                      .join(', ');
                    if (addr) {
                      window.open(
                        `https://www.google.com/maps/search/${encodeURIComponent(addr)}`,
                        '_blank',
                      );
                    }
                  }}
                >
                  <i className='ti ti-map-search'></i> Preview in Google Maps
                </button>
              </div>
            </div>
          </div>

          {/* Additional Details Tab */}
          <div
            className={`tab-pane ${activeTab === 'details' ? 'active' : ''}`}
          >
            <div className='row'>
              <div className='col-12 mb-3'>
                <label className='form-label'>Contact Email</label>
                <input
                  type='email'
                  className='form-control'
                  placeholder='e.g., bothellselect@proton.me'
                  value={config.trainingDetails?.contactEmail || ''}
                  onChange={(e) =>
                    updateTrainingDetails({ contactEmail: e.target.value })
                  }
                />
                <small className='text-muted'>
                  This email will be displayed for parents to contact with
                  questions
                </small>
              </div>

              <div className='col-12 mb-4'>
                <label className='form-label'>Important Notes</label>
                <div className='border rounded p-3 bg-light'>
                  {(config.trainingDetails?.notes || []).map((note, idx) => (
                    <div
                      key={idx}
                      className='d-flex justify-content-between align-items-start mb-2 p-2 bg-white rounded'
                    >
                      <span className='flex-grow-1'>{note}</span>
                      <button
                        type='button'
                        className='btn btn-sm btn-outline-danger ms-2'
                        onClick={() => handleRemoveNote(idx)}
                      >
                        <i className='ti ti-trash'></i>
                      </button>
                    </div>
                  ))}

                  <div className='input-group mt-2'>
                    <input
                      type='text'
                      className='form-control'
                      placeholder='Add a note (e.g., Grade specifics, skill level policies)'
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddNote()}
                    />
                    <button
                      type='button'
                      className='btn btn-primary'
                      onClick={handleAddNote}
                      disabled={!newNote.trim()}
                    >
                      <i className='ti ti-plus'></i> Add Note
                    </button>
                  </div>
                </div>
              </div>

              <div className='col-12 mb-3'>
                <label className='form-label'>
                  Additional Description (Optional)
                </label>
                <RichTextEditor
                  value={config.description || ''}
                  onChange={(html) => updateConfig({ description: html })}
                  placeholder='Add any extra information not covered in the structured fields above...'
                  showPreview={true}
                />
                <small className='text-muted'>
                  This will appear alongside the structured information
                </small>
              </div>
            </div>
          </div>
        </div>

        {/* Form Settings Section (always visible) */}
        <hr className='my-4' />

        <div className='row'>
          <div className='col-md-6'>
            <div className='form-check form-switch mb-3'>
              <input
                className='form-check-input'
                type='checkbox'
                checked={config.isActive}
                onChange={(e) => updateConfig({ isActive: e.target.checked })}
              />
              <label className='form-check-label fw-bold'>Form Active</label>
              <small className='form-text text-muted d-block'>
                When active, this form will be visible to users
              </small>
            </div>
          </div>
          <div className='col-md-6'>
            <div className='form-check form-switch mb-3'>
              <input
                className='form-check-input'
                type='checkbox'
                checked={config.requiresPayment}
                onChange={(e) =>
                  updateConfig({ requiresPayment: e.target.checked })
                }
              />
              <label className='form-check-label fw-bold'>
                Requires Payment
              </label>
              <small className='form-text text-muted d-block'>
                Users must complete payment to register
              </small>
            </div>
          </div>
        </div>

        <div className='row'>
          <div className='col-md-6'>
            <div className='form-check form-switch mb-3'>
              <input
                className='form-check-input'
                type='checkbox'
                checked={config.requiresQualification}
                onChange={(e) =>
                  updateConfig({ requiresQualification: e.target.checked })
                }
              />
              <label className='form-check-label fw-bold'>
                Requires Tryout Qualification
              </label>
              <small className='form-text text-muted d-block'>
                Only users who passed tryouts can register
              </small>
            </div>
          </div>
          <div className='col-md-6'>
            <div className='mb-3'>
              <label className='form-label fw-bold'>Base Price</label>
              <div className='input-group'>
                <span className='input-group-text'>$</span>
                <input
                  type='number'
                  className='form-control'
                  value={config.pricing.basePrice}
                  onChange={(e) =>
                    updateConfig({
                      pricing: {
                        ...config.pricing,
                        basePrice: Number(e.target.value),
                      },
                    })
                  }
                  min='0'
                  step='1'
                />
              </div>
              <small className='form-text text-muted'>
                Default price when no packages are selected
              </small>
            </div>
          </div>
        </div>

        {/* Pricing Packages */}
        <div className='card mt-4'>
          <div className='card-header'>
            <h5 className='mb-0'>Pricing Packages</h5>
            <small className='text-muted'>
              Add optional pricing packages for users to choose from
            </small>
          </div>
          <div className='card-body'>
            <div className='row g-3 mb-4 p-3 bg-light rounded'>
              <div className='col-md-4'>
                <input
                  type='text'
                  className='form-control'
                  placeholder='Package Name *'
                  value={newPackage.name}
                  onChange={(e) =>
                    setNewPackage((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>
              <div className='col-md-3'>
                <div className='input-group'>
                  <span className='input-group-text'>$</span>
                  <input
                    type='number'
                    className='form-control'
                    placeholder='Price'
                    value={newPackage.price}
                    onChange={(e) =>
                      setNewPackage((prev) => ({
                        ...prev,
                        price: Number(e.target.value),
                      }))
                    }
                    min='0'
                  />
                </div>
              </div>
              <div className='col-md-3'>
                <input
                  type='text'
                  className='form-control'
                  placeholder='Description'
                  value={newPackage.description}
                  onChange={(e) =>
                    setNewPackage((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                />
              </div>
              <div className='col-md-2'>
                <button
                  type='button'
                  className='btn btn-primary w-100'
                  onClick={handleAddPackage}
                  disabled={!newPackage.name || newPackage.price <= 0}
                >
                  <i className='ti ti-plus me-1'></i>
                  Add
                </button>
              </div>
            </div>

            {config.pricing.packages.length > 0 ? (
              config.pricing.packages.map((pkg) => (
                <div key={pkg.id} className='card mb-2'>
                  <div className='card-body py-2'>
                    <div className='row align-items-center'>
                      <div className='col-md-4'>
                        <strong>{pkg.name}</strong>
                      </div>
                      <div className='col-md-3'>
                        <span className='text-success fw-bold'>
                          ${pkg.price}
                        </span>
                      </div>
                      <div className='col-md-4'>
                        <small className='text-muted'>
                          {pkg.description || 'No description'}
                        </small>
                      </div>
                      <div className='col-md-1 text-end'>
                        <button
                          type='button'
                          className='btn btn-sm btn-outline-danger'
                          onClick={() => handleRemovePackage(pkg.id!)}
                        >
                          <i className='ti ti-trash'></i>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className='text-center p-4 text-muted'>
                <i className='ti ti-package-off fs-1 mb-2'></i>
                <p>No pricing packages added yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegistrationFormConfig;
