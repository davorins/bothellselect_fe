// src/components/admin/TournamentFormConfig.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  RegistrationFormConfig,
  TournamentSpecificConfig,
} from '../../types/registration-types';
import RichTextEditor from '../common/RichTextEditor';

interface TournamentFormConfigProps {
  onConfigUpdate?: (config: RegistrationFormConfig) => void;
  onTournamentConfigUpdate: (
    config: TournamentSpecificConfig,
    originalName?: string
  ) => Promise<void>;
  initialConfig?: RegistrationFormConfig;
  initialTournamentConfig?: TournamentSpecificConfig;
}

const TournamentFormConfig: React.FC<TournamentFormConfigProps> = ({
  onConfigUpdate,
  onTournamentConfigUpdate,
  initialConfig,
  initialTournamentConfig,
}) => {
  const [config, setConfig] = useState<RegistrationFormConfig>(
    initialConfig || {
      isActive: false,
      requiresPayment: true,
      requiresQualification: false,
      pricing: {
        basePrice: 0,
        packages: [],
      },
    }
  );

  const [tournamentConfig, setTournamentConfig] =
    useState<TournamentSpecificConfig>(
      () =>
        initialTournamentConfig || {
          tournamentName: '',
          tournamentYear: new Date().getFullYear(),
          displayName: '',
          registrationDeadline: '',
          tournamentDates: [],
          locations: [],
          divisions: ['Gold', 'Silver'],
          ageGroups: [],
          requiresRoster: true,
          requiresInsurance: true,
          paymentDeadline: '',
          refundPolicy: 'No refunds after registration deadline',
          rulesDocumentUrl: '',
          scheduleDocumentUrl: '',
          tournamentFee: 425,
          isActive: false,
        }
    );

  const [newDate, setNewDate] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newDivision, setNewDivision] = useState('');
  const [newAgeGroup, setNewAgeGroup] = useState('');
  const [originalTournamentName, setOriginalTournamentName] =
    useState<string>('');
  const [nameError, setNameError] = useState<string>('');

  // Add these new state variables
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<
    'idle' | 'saving' | 'success' | 'error'
  >('idle');
  const [hasChanges, setHasChanges] = useState(false);
  const initialConfigRef = useRef<TournamentSpecificConfig | null>(null);

  const handleDescriptionChange = (html: string) => {
    updateTournamentConfig({ description: html });
  };

  // Track original tournament name and setup initial config ref
  useEffect(() => {
    if (initialTournamentConfig?.tournamentName) {
      setOriginalTournamentName(initialTournamentConfig.tournamentName);
    }

    if (initialTournamentConfig) {
      initialConfigRef.current = JSON.parse(
        JSON.stringify(initialTournamentConfig)
      );
    }
  }, [initialTournamentConfig]);

  // Track changes
  useEffect(() => {
    if (!initialConfigRef.current) return;

    const currentConfigStr = JSON.stringify(tournamentConfig);
    const initialConfigStr = JSON.stringify(initialConfigRef.current);

    setHasChanges(currentConfigStr !== initialConfigStr);
  }, [tournamentConfig]);

  // Warn about unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue =
          'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasChanges]);

  // Update config if needed (for backward compatibility)
  const updateConfig = (updates: Partial<RegistrationFormConfig>) => {
    const updated = { ...config, ...updates };
    setConfig(updated);
    if (onConfigUpdate) {
      onConfigUpdate(updated);
    }
  };

  const updateTournamentConfig = (
    updates: Partial<TournamentSpecificConfig>
  ) => {
    setTournamentConfig((prev) => ({ ...prev, ...updates }));

    // Clear name error when user types
    if (updates.tournamentName !== undefined) {
      setNameError('');
    }
  };

  // Validate tournament name before saving
  const validateTournamentName = (name: string): boolean => {
    if (!name.trim()) {
      setNameError('Tournament name is required');
      return false;
    }
    if (name.length < 3) {
      setNameError('Tournament name must be at least 3 characters');
      return false;
    }
    setNameError('');
    return true;
  };

  const handleTournamentNameChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newName = e.target.value;
    validateTournamentName(newName);
    updateTournamentConfig({ tournamentName: newName });
  };

  const addDate = () => {
    if (newDate) {
      updateTournamentConfig({
        tournamentDates: [...tournamentConfig.tournamentDates, newDate],
      });
      setNewDate('');
    }
  };

  const removeDate = (index: number) => {
    const dates = [...tournamentConfig.tournamentDates];
    dates.splice(index, 1);
    updateTournamentConfig({ tournamentDates: dates });
  };

  const addLocation = () => {
    if (newLocation) {
      updateTournamentConfig({
        locations: [...tournamentConfig.locations, newLocation],
      });
      setNewLocation('');
    }
  };

  const removeLocation = (index: number) => {
    const locations = [...tournamentConfig.locations];
    locations.splice(index, 1);
    updateTournamentConfig({ locations });
  };

  const addDivision = () => {
    if (newDivision) {
      updateTournamentConfig({
        divisions: [...tournamentConfig.divisions, newDivision],
      });
      setNewDivision('');
    }
  };

  const removeDivision = (index: number) => {
    const divisions = [...tournamentConfig.divisions];
    divisions.splice(index, 1);
    updateTournamentConfig({ divisions });
  };

  const addAgeGroup = () => {
    if (newAgeGroup) {
      updateTournamentConfig({
        ageGroups: [...tournamentConfig.ageGroups, newAgeGroup],
      });
      setNewAgeGroup('');
    }
  };

  const removeAgeGroup = (index: number) => {
    const ageGroups = [...tournamentConfig.ageGroups];
    ageGroups.splice(index, 1);
    updateTournamentConfig({ ageGroups });
  };

  // Save handler
  const handleSave = async () => {
    // Validate required fields
    if (!validateTournamentName(tournamentConfig.tournamentName)) {
      return;
    }

    if (!tournamentConfig.tournamentYear) {
      alert('Tournament year is required');
      return;
    }

    if (
      tournamentConfig.tournamentFee === undefined ||
      tournamentConfig.tournamentFee < 0
    ) {
      alert('Tournament fee must be a positive number');
      return;
    }

    setIsSaving(true);
    setSaveStatus('saving');

    try {
      await onTournamentConfigUpdate(tournamentConfig, originalTournamentName);
      setSaveStatus('success');
      setHasChanges(false);
      initialConfigRef.current = JSON.parse(JSON.stringify(tournamentConfig));

      // Reset success status after 3 seconds
      setTimeout(() => {
        setSaveStatus('idle');
      }, 3000);
    } catch (error) {
      setSaveStatus('error');
      console.error('Error saving tournament config:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Cancel handler
  const handleCancel = () => {
    if (initialConfigRef.current) {
      setTournamentConfig(JSON.parse(JSON.stringify(initialConfigRef.current)));
    }
    setHasChanges(false);
    setNameError('');
  };

  return (
    <div className='tournament-form-config'>
      <div className='d-flex justify-content-between align-items-center mb-4'>
        <h4>
          Tournament Configuration
          {tournamentConfig.tournamentName &&
            `: ${tournamentConfig.tournamentName}`}
          {!tournamentConfig.tournamentName && ' (New Tournament)'}
        </h4>
        <div className='d-flex align-items-center gap-2'>
          <div className='form-check form-switch me-3'>
            <input
              className='form-check-input'
              type='checkbox'
              checked={tournamentConfig.isActive}
              onChange={(e) =>
                updateTournamentConfig({ isActive: e.target.checked })
              }
              style={{ transform: 'scale(1.5)' }}
            />
            <label className='form-check-label fw-bold'>
              {tournamentConfig.isActive
                ? 'Tournament Active'
                : 'Tournament Inactive'}
            </label>
          </div>

          {/* Save Status Indicator */}
          {saveStatus === 'success' && (
            <span className='text-success'>
              <i className='ti ti-circle-check me-1'></i>
              Saved successfully!
            </span>
          )}
          {saveStatus === 'error' && (
            <span className='text-danger'>
              <i className='ti ti-alert-circle me-1'></i>
              Error saving
            </span>
          )}
        </div>
      </div>

      {/* Save/Cancel Buttons */}
      <div className='card mb-4'>
        <div className='card-body'>
          <div className='d-flex justify-content-between align-items-center'>
            <div>
              {hasChanges && (
                <span className='text-warning'>
                  <i className='ti ti-alert-circle me-1'></i>
                  You have unsaved changes
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
                ) : tournamentConfig.tournamentName ? (
                  <>
                    <i className='ti ti-device-floppy me-2'></i>
                    Update Tournament
                  </>
                ) : (
                  <>
                    <i className='ti ti-plus me-2'></i>
                    Create Tournament
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className='card mb-4'>
        <div className='card-header'>
          <h5>Tournament Description</h5>
          <small className='text-muted'>
            This description will appear above the tournament registration form
          </small>
        </div>
        <div className='card-body'>
          <div className='mb-3'>
            <label className='form-label'>Tournament Description *</label>
            <RichTextEditor
              value={tournamentConfig.description || ''}
              onChange={handleDescriptionChange}
              placeholder='Enter a detailed description of this tournament...'
              showPreview={true}
            />
            <small className='form-text text-muted'>
              Include details like schedule, location, format, rules, etc.
            </small>
          </div>

          {/* Enhanced Preview Section */}
          <div className='alert alert-info mt-4'>
            <i className='ti ti-info-circle me-2'></i>
            <strong>How it will appear to parents:</strong>
            <div className='mt-3 description-preview p-4 bg-white rounded border'>
              <div className='d-flex align-items-center mb-3'>
                <i className='ti ti-trophy text-primary me-2'></i>
                <h5 className='mb-0 text-primary'>
                  {tournamentConfig.tournamentName || 'Tournament'}{' '}
                  {tournamentConfig.tournamentYear}
                </h5>
              </div>
              <div
                className='description-content'
                style={{
                  fontSize: '16px',
                  lineHeight: '1.6',
                  color: '#333',
                }}
                dangerouslySetInnerHTML={{
                  __html:
                    tournamentConfig.description ||
                    '<p class="text-muted">No description set yet</p>',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tournament Information Card */}
      <div className='card mb-4'>
        <div className='card-header'>
          <h5>Basic Tournament Information</h5>
        </div>
        <div className='card-body'>
          <div className='row'>
            <div className='col-md-6'>
              <div className='mb-3'>
                <label className='form-label'>Tournament Name *</label>
                <input
                  type='text'
                  className={`form-control ${nameError ? 'is-invalid' : ''}`}
                  value={tournamentConfig.tournamentName}
                  onChange={handleTournamentNameChange}
                  onBlur={(e) => validateTournamentName(e.target.value)}
                  placeholder='e.g., Spring Invitational 2024, Winter Classic'
                />
                {nameError ? (
                  <div className='invalid-feedback'>{nameError}</div>
                ) : (
                  <small className='form-text text-muted'>
                    Unique name for this tournament. Cannot be changed after
                    creation.
                  </small>
                )}
              </div>
            </div>
            <div className='col-md-6'>
              <div className='mb-3'>
                <label className='form-label'>Tournament Year *</label>
                <input
                  type='number'
                  className='form-control'
                  value={tournamentConfig.tournamentYear}
                  onChange={(e) =>
                    updateTournamentConfig({
                      tournamentYear:
                        parseInt(e.target.value) || new Date().getFullYear(),
                    })
                  }
                  min='2024'
                  max='2030'
                />
                <small className='form-text text-muted'>
                  Year the tournament will take place
                </small>
              </div>
            </div>
          </div>

          <div className='row'>
            <div className='col-md-6'>
              <div className='mb-3'>
                <label className='form-label'>Display Name (Optional)</label>
                <input
                  type='text'
                  className='form-control'
                  value={tournamentConfig.displayName || ''}
                  onChange={(e) =>
                    updateTournamentConfig({
                      displayName: e.target.value,
                    })
                  }
                  placeholder='e.g., Partizan Spring Tournament'
                />
                <small className='form-text text-muted'>
                  User-friendly name shown to registrants
                </small>
              </div>
            </div>
            <div className='col-md-6'>
              <div className='mb-3'>
                <label className='form-label'>Tournament Fee *</label>
                <div className='input-group'>
                  <span className='input-group-text'>$</span>
                  <input
                    type='number'
                    className='form-control'
                    value={tournamentConfig.tournamentFee}
                    onChange={(e) =>
                      updateTournamentConfig({
                        tournamentFee: Number(e.target.value) || 425,
                      })
                    }
                    min='0'
                    step='1'
                  />
                </div>
                <small className='form-text text-muted'>Price per team</small>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tournament Schedule */}
      <div className='row mb-4'>
        <div className='col-md-6'>
          <div className='card'>
            <div className='card-header'>
              <h5>Schedule</h5>
            </div>
            <div className='card-body'>
              <div className='mb-3'>
                <label className='form-label'>Registration Deadline</label>
                <input
                  type='date'
                  className='form-control'
                  value={tournamentConfig.registrationDeadline || ''}
                  onChange={(e) =>
                    updateTournamentConfig({
                      registrationDeadline: e.target.value,
                    })
                  }
                />
                <small className='form-text text-muted'>
                  Last day to register teams
                </small>
              </div>

              <div className='mb-3'>
                <label className='form-label'>Payment Deadline</label>
                <input
                  type='date'
                  className='form-control'
                  value={tournamentConfig.paymentDeadline || ''}
                  onChange={(e) =>
                    updateTournamentConfig({
                      paymentDeadline: e.target.value,
                    })
                  }
                />
                <small className='form-text text-muted'>
                  Last day to complete payment
                </small>
              </div>
            </div>
          </div>
        </div>

        <div className='col-md-6'>
          <div className='card h-100'>
            <div className='card-header'>
              <h5>Requirements</h5>
            </div>
            <div className='card-body'>
              <div className='form-check form-switch mb-3'>
                <input
                  className='form-check-input'
                  type='checkbox'
                  checked={tournamentConfig.requiresRoster}
                  onChange={(e) =>
                    updateTournamentConfig({
                      requiresRoster: e.target.checked,
                    })
                  }
                />
                <label className='form-check-label'>Requires Roster</label>
                <small className='form-text text-muted d-block'>
                  Teams must submit a complete roster
                </small>
              </div>

              <div className='form-check form-switch mb-3'>
                <input
                  className='form-check-input'
                  type='checkbox'
                  checked={tournamentConfig.requiresInsurance}
                  onChange={(e) =>
                    updateTournamentConfig({
                      requiresInsurance: e.target.checked,
                    })
                  }
                />
                <label className='form-check-label'>Requires Insurance</label>
                <small className='form-text text-muted d-block'>
                  Teams must provide proof of insurance
                </small>
              </div>

              <div className='mb-3'>
                <label className='form-label'>Refund Policy</label>
                <textarea
                  className='form-control'
                  rows={3}
                  value={tournamentConfig.refundPolicy}
                  onChange={(e) =>
                    updateTournamentConfig({
                      refundPolicy: e.target.value,
                    })
                  }
                  placeholder='Enter refund policy details...'
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tournament Details - Four columns layout */}
      <div className='row mb-4'>
        <div className='col-md-3'>
          <div className='card h-100'>
            <div className='card-header'>
              <h6 className='mb-0'>Tournament Dates</h6>
            </div>
            <div className='card-body'>
              <div className='input-group mb-3'>
                <input
                  type='date'
                  className='form-control'
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  placeholder='Add tournament date'
                />
                <button
                  className='btn btn-outline-primary'
                  type='button'
                  onClick={addDate}
                  disabled={isSaving}
                >
                  Add
                </button>
              </div>

              {tournamentConfig.tournamentDates.length > 0 ? (
                <div className='list-group'>
                  {tournamentConfig.tournamentDates.map((date, index) => (
                    <div
                      key={index}
                      className='list-group-item d-flex justify-content-between align-items-center'
                    >
                      <span>{new Date(date).toLocaleDateString()}</span>
                      <button
                        className='btn btn-sm btn-outline-danger'
                        onClick={() => removeDate(index)}
                        disabled={isSaving}
                      >
                        <i className='ti ti-trash'></i>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className='text-muted small mb-0'>No dates added yet</p>
              )}
            </div>
          </div>
        </div>

        <div className='col-md-3'>
          <div className='card h-100'>
            <div className='card-header'>
              <h6 className='mb-0'>Locations</h6>
            </div>
            <div className='card-body'>
              <div className='input-group mb-3'>
                <input
                  type='text'
                  className='form-control'
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  placeholder='Add location (e.g., Bothell High School)'
                />
                <button
                  className='btn btn-outline-primary'
                  type='button'
                  onClick={addLocation}
                  disabled={isSaving}
                >
                  Add
                </button>
              </div>

              {tournamentConfig.locations.length > 0 ? (
                <div className='list-group'>
                  {tournamentConfig.locations.map((location, index) => (
                    <div
                      key={index}
                      className='list-group-item d-flex justify-content-between align-items-center'
                    >
                      <span>{location}</span>
                      <button
                        className='btn btn-sm btn-outline-danger'
                        onClick={() => removeLocation(index)}
                        disabled={isSaving}
                      >
                        <i className='ti ti-trash'></i>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className='text-muted small mb-0'>No locations added yet</p>
              )}
            </div>
          </div>
        </div>

        <div className='col-md-3'>
          <div className='card h-100'>
            <div className='card-header'>
              <h6 className='mb-0'>Divisions</h6>
            </div>
            <div className='card-body'>
              <div className='input-group mb-3'>
                <input
                  type='text'
                  className='form-control'
                  value={newDivision}
                  onChange={(e) => setNewDivision(e.target.value)}
                  placeholder='Add division (e.g., U10, High School, Gold)'
                />
                <button
                  className='btn btn-outline-primary'
                  type='button'
                  onClick={addDivision}
                  disabled={isSaving}
                >
                  Add
                </button>
              </div>

              {tournamentConfig.divisions.length > 0 ? (
                <div className='list-group'>
                  {tournamentConfig.divisions.map((division, index) => (
                    <div
                      key={index}
                      className='list-group-item d-flex justify-content-between align-items-center'
                    >
                      <span>{division}</span>
                      <button
                        className='btn btn-sm btn-outline-danger'
                        onClick={() => removeDivision(index)}
                        disabled={isSaving}
                      >
                        <i className='ti ti-trash'></i>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className='text-muted small mb-0'>No divisions added yet</p>
              )}
            </div>
          </div>
        </div>

        <div className='col-md-3'>
          <div className='card h-100'>
            <div className='card-header'>
              <h6 className='mb-0'>Age Groups</h6>
            </div>
            <div className='card-body'>
              <div className='input-group mb-3'>
                <input
                  type='text'
                  className='form-control'
                  value={newAgeGroup}
                  onChange={(e) => setNewAgeGroup(e.target.value)}
                  placeholder='Add age group (e.g., U10, U12, High School)'
                />
                <button
                  className='btn btn-outline-primary'
                  type='button'
                  onClick={addAgeGroup}
                  disabled={isSaving}
                >
                  Add
                </button>
              </div>

              {tournamentConfig.ageGroups.length > 0 ? (
                <div className='list-group'>
                  {tournamentConfig.ageGroups.map((ageGroup, index) => (
                    <div
                      key={index}
                      className='list-group-item d-flex justify-content-between align-items-center'
                    >
                      <span>{ageGroup}</span>
                      <button
                        className='btn btn-sm btn-outline-danger'
                        onClick={() => removeAgeGroup(index)}
                        disabled={isSaving}
                      >
                        <i className='ti ti-trash'></i>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className='text-muted small mb-0'>No age groups added yet</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tournament Documents */}
      <div className='card mb-4'>
        <div className='card-header'>
          <h5>Tournament Documents</h5>
        </div>
        <div className='card-body'>
          <div className='row'>
            <div className='col-md-6'>
              <div className='mb-3'>
                <label className='form-label'>Rules Document URL</label>
                <input
                  type='url'
                  className='form-control'
                  value={tournamentConfig.rulesDocumentUrl || ''}
                  onChange={(e) =>
                    updateTournamentConfig({
                      rulesDocumentUrl: e.target.value,
                    })
                  }
                  placeholder='https://example.com/tournament-rules.pdf'
                />
                <small className='form-text text-muted'>
                  Link to tournament rules document
                </small>
              </div>
            </div>
            <div className='col-md-6'>
              <div className='mb-3'>
                <label className='form-label'>Schedule Document URL</label>
                <input
                  type='url'
                  className='form-control'
                  value={tournamentConfig.scheduleDocumentUrl || ''}
                  onChange={(e) =>
                    updateTournamentConfig({
                      scheduleDocumentUrl: e.target.value,
                    })
                  }
                  placeholder='https://example.com/tournament-schedule.pdf'
                />
                <small className='form-text text-muted'>
                  Link to tournament schedule document
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Configuration */}
      <div className='card'>
        <div className='card-header'>
          <h5>Payment Configuration</h5>
        </div>
        <div className='card-body'>
          <div className='row'>
            <div className='col-md-6'>
              <div className='mb-3'>
                <label className='form-label'>
                  Tournament Fee (per team) *
                </label>
                <div className='input-group'>
                  <span className='input-group-text'>$</span>
                  <input
                    type='number'
                    className='form-control'
                    value={tournamentConfig.tournamentFee}
                    onChange={(e) =>
                      updateTournamentConfig({
                        tournamentFee: Number(e.target.value) || 425,
                      })
                    }
                    min='0'
                    step='1'
                  />
                </div>
                <small className='form-text text-muted'>
                  Per team registration fee. This will be used for payment
                  calculations.
                </small>
              </div>
            </div>
            <div className='col-md-6'>
              <div className='mb-3'>
                <label className='form-label'>Requires Payment</label>
                <div className='form-check form-switch mt-2'>
                  <input
                    className='form-check-input'
                    type='checkbox'
                    checked={config.requiresPayment}
                    onChange={(e) =>
                      updateConfig({ requiresPayment: e.target.checked })
                    }
                    style={{ transform: 'scale(1.2)' }}
                  />
                  <label className='form-check-label fw-bold'>
                    {config.requiresPayment
                      ? 'Payment Required'
                      : 'Free Registration'}
                  </label>
                  <small className='form-text text-muted d-block'>
                    {config.requiresPayment
                      ? 'Teams must complete payment to register'
                      : 'No payment required for this tournament'}
                  </small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TournamentFormConfig;
