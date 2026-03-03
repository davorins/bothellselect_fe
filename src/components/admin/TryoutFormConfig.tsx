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
    originalName?: string
  ) => void;
  initialConfig?: TryoutSpecificConfig;
  isEditing?: boolean;
  seasonEvents: SeasonEvent[];
  selectedSeason?: SeasonEvent | null;
  onSeasonSelect?: (season: SeasonEvent) => void;
}

// Helper type to ensure description is always a string
type TryoutConfigWithDescription = TryoutSpecificConfig & {
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
  // Initialize state with all required fields including description as string
  const [tryoutConfig, setTryoutConfig] = useState<TryoutConfigWithDescription>(
    () => {
      if (initialConfig) {
        return {
          ...initialConfig,
          description: initialConfig.description || '',
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
      };
    }
  );

  const [newDate, setNewDate] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [originalTryoutName, setOriginalTryoutName] = useState<string>('');
  const [nameError, setNameError] = useState<string>('');
  const [seasonError, setSeasonError] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<
    'idle' | 'saving' | 'success' | 'error'
  >('idle');
  const [hasChanges, setHasChanges] = useState(false);
  const initialConfigRef = useRef<TryoutConfigWithDescription | null>(null);

  // Update ref when initial config changes
  useEffect(() => {
    if (initialConfig) {
      console.log('📦 Initial config loaded:', {
        description: initialConfig.description,
        descriptionLength: initialConfig.description?.length,
      });

      const configWithDescription: TryoutConfigWithDescription = {
        ...initialConfig,
        description: initialConfig.description || '',
      };

      setTryoutConfig(configWithDescription);
      setOriginalTryoutName(initialConfig.tryoutName || '');
      initialConfigRef.current = JSON.parse(
        JSON.stringify(configWithDescription)
      );
    }
  }, [initialConfig]);

  // Auto-fill tryout name based on season
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

  // Track changes
  useEffect(() => {
    if (!initialConfigRef.current) return;

    const currentConfigStr = JSON.stringify(tryoutConfig);
    const initialConfigStr = JSON.stringify(initialConfigRef.current);

    const hasUnsavedChanges = currentConfigStr !== initialConfigStr;
    setHasChanges(hasUnsavedChanges);

    if (hasUnsavedChanges) {
      console.log('🔄 Config has unsaved changes:', {
        descriptionChanged:
          tryoutConfig.description !== initialConfigRef.current?.description,
        newDescriptionLength: tryoutConfig.description?.length || 0,
        oldDescriptionLength:
          initialConfigRef.current?.description?.length || 0,
      });
    }
  }, [tryoutConfig]);

  // Description handler - fixed
  const handleDescriptionChange = (html: string) => {
    console.log('📝 Description updated:', {
      length: html.length,
      hasContent: html.trim().length > 0,
      preview: html.substring(0, 100) + '...',
    });

    setTryoutConfig((prev) => ({
      ...prev,
      description: html,
    }));
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

  const addDate = () => {
    if (newDate) {
      setTryoutConfig((prev) => ({
        ...prev,
        tryoutDates: [...prev.tryoutDates, newDate],
      }));
      setNewDate('');
    }
  };

  const removeDate = (index: number) => {
    setTryoutConfig((prev) => ({
      ...prev,
      tryoutDates: prev.tryoutDates.filter((_, i) => i !== index),
    }));
  };

  const addLocation = () => {
    if (newLocation.trim()) {
      setTryoutConfig((prev) => ({
        ...prev,
        locations: [...prev.locations, newLocation.trim()],
      }));
      setNewLocation('');
    }
  };

  const removeLocation = (index: number) => {
    setTryoutConfig((prev) => ({
      ...prev,
      locations: prev.locations.filter((_, i) => i !== index),
    }));
  };

  const handleSave = async () => {
    console.log('💾 Starting save process...');

    if (!validateSeason()) {
      return;
    }

    if (!validateTryoutName(tryoutConfig.tryoutName)) {
      return;
    }

    if (!tryoutConfig.tryoutYear) {
      alert('Tryout year is required');
      return;
    }

    if (tryoutConfig.tryoutFee < 0) {
      alert('Tryout fee must be a positive number');
      return;
    }

    // Prepare config for saving - convert to TryoutSpecificConfig
    const configToSave: TryoutSpecificConfig = {
      ...tryoutConfig,
      tryoutFee: Number(tryoutConfig.tryoutFee) || 50,
      tryoutYear: Number(tryoutConfig.tryoutYear),
      description: tryoutConfig.description, // Already guaranteed to be string
    };

    console.log('📤 Sending config to save:', {
      tryoutName: configToSave.tryoutName,
      description: configToSave.description,
      descriptionLength: configToSave.description?.length,
      tryoutYear: configToSave.tryoutYear,
      tryoutFee: configToSave.tryoutFee,
    });

    setIsSaving(true);
    setSaveStatus('saving');

    try {
      await onTryoutConfigUpdate(configToSave, originalTryoutName);
      console.log('✅ Save successful!');
      setSaveStatus('success');
      setHasChanges(false);
      initialConfigRef.current = JSON.parse(JSON.stringify(tryoutConfig));

      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error: any) {
      console.error('❌ Error saving tryout config:', error);
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
                  <>
                    <i className='ti ti-device-floppy me-2'></i>
                    Update Tryout
                  </>
                ) : (
                  <>
                    <i className='ti ti-plus me-2'></i>
                    Create Tryout
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className='card mb-4'>
        <div className='card-header'>
          <h5>Tryout Description</h5>
          <small className='text-muted'>
            This description will appear above the tryout registration form
          </small>
        </div>
        <div className='card-body'>
          <div className='mb-3'>
            <label className='form-label'>Tryout Description *</label>
            <RichTextEditor
              value={tryoutConfig.description}
              onChange={handleDescriptionChange}
              placeholder='Enter a detailed description of this tryout...'
              showPreview={true}
            />
            <small className='form-text text-muted'>
              Include details like dates, times, location, what to bring, etc.
            </small>
          </div>

          <div className='alert alert-info mt-4'>
            <i className='ti ti-info-circle me-2'></i>
            <strong>How it will appear to parents:</strong>
            <div className='mt-3 description-preview p-4 bg-white rounded border'>
              <div className='d-flex align-items-center mb-3'>
                <i className='ti ti-target-arrow text-primary me-2'></i>
                <h5 className='mb-0 text-primary'>
                  {tryoutConfig.tryoutName || 'Tryout'}{' '}
                  {tryoutConfig.tryoutYear}
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
                    tryoutConfig.description ||
                    '<p class="text-muted">No description set yet</p>',
                }}
              />
            </div>
          </div>
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
            <div className='mb-3'>
              <label className='form-label'>Select Season *</label>
              {seasonEvents.length === 0 ? (
                <div className='alert alert-warning'>
                  <i className='ti ti-alert-triangle me-2'></i>
                  No seasons found. Please create a season first.
                  <div className='mt-2'>
                    <a
                      href='/admin/seasons'
                      className='btn btn-sm btn-primary'
                      target='_blank'
                      rel='noopener noreferrer'
                    >
                      <i className='ti ti-calendar-plus me-1'></i>
                      Create Season
                    </a>
                  </div>
                </div>
              ) : (
                <div className='list-group'>
                  {seasonEvents.map((season) => (
                    <button
                      key={season.eventId}
                      type='button'
                      className={`list-group-item list-group-item-action ${
                        selectedSeason?.eventId === season.eventId
                          ? 'active'
                          : ''
                      }`}
                      onClick={() => handleSeasonSelect(season)}
                    >
                      <div className='d-flex w-100 justify-content-between'>
                        <h6 className='text-black mb-1'>{season.season}</h6>
                        <small className='text-black'>{season.year}</small>
                      </div>
                      <small className='text-muted'>
                        Event ID: {season.eventId}
                      </small>
                    </button>
                  ))}
                </div>
              )}
              {seasonError && (
                <div className='invalid-feedback d-block'>{seasonError}</div>
              )}
            </div>

            {selectedSeason && (
              <div className='alert alert-info'>
                <i className='ti ti-link me-2'></i>
                Linked to:{' '}
                <strong>
                  {selectedSeason.season} {selectedSeason.year}
                </strong>
                <div className='mt-1'>
                  <small>Event ID: {selectedSeason.eventId}</small>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {isEditing && tryoutConfig.eventId && tryoutConfig.season && (
        <div className='card mb-4'>
          <div className='card-header'>
            <h5>Linked Season</h5>
          </div>
          <div className='card-body'>
            <div className='alert alert-info'>
              <i className='ti ti-link me-2'></i>
              This tryout is linked to:{' '}
              <strong>
                {tryoutConfig.season} {tryoutConfig.tryoutYear}
              </strong>
              <div className='mt-1'>
                <small>Event ID: {tryoutConfig.eventId}</small>
              </div>
              <div className='mt-1'>
                <small className='text-muted'>
                  Season cannot be changed after creation
                </small>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className='card mb-4'>
        <div className='card-header'>
          <h5>Basic Tryout Information</h5>
        </div>
        <div className='card-body'>
          <div className='row'>
            <div className='col-md-6'>
              <div className='mb-3'>
                <label className='form-label'>Tryout Name *</label>
                <input
                  type='text'
                  className={`form-control ${nameError ? 'is-invalid' : ''}`}
                  value={tryoutConfig.tryoutName}
                  onChange={handleTryoutNameChange}
                  onBlur={(e) => validateTryoutName(e.target.value)}
                  placeholder='e.g., Spring Tryouts 2025'
                  disabled={!tryoutConfig.eventId && !isEditing}
                />
                {nameError ? (
                  <div className='invalid-feedback'>{nameError}</div>
                ) : (
                  <small className='form-text text-muted'>
                    Unique name for this tryout. Cannot be changed after
                    creation.
                  </small>
                )}
              </div>
            </div>
            <div className='col-md-6'>
              <div className='mb-3'>
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
                  min='2024'
                  max='2030'
                  disabled={!tryoutConfig.eventId && !isEditing}
                />
                <small className='form-text text-muted'>
                  Year the tryout will take place (auto-filled from season)
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
                  value={tryoutConfig.displayName || ''}
                  onChange={(e) =>
                    setTryoutConfig((prev) => ({
                      ...prev,
                      displayName: e.target.value,
                    }))
                  }
                  placeholder='e.g., Partizan Spring Tryouts'
                  disabled={!tryoutConfig.eventId && !isEditing}
                />
                <small className='form-text text-muted'>
                  User-friendly name shown to registrants
                </small>
              </div>
            </div>
            <div className='col-md-6'>
              <div className='mb-3'>
                <label className='form-label'>Tryout Fee *</label>
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
                    step='1'
                    disabled={!tryoutConfig.eventId && !isEditing}
                  />
                </div>
                <small className='form-text text-muted'>Price per player</small>
              </div>
            </div>
          </div>
        </div>
      </div>

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
                  value={tryoutConfig.registrationDeadline || ''}
                  onChange={(e) =>
                    setTryoutConfig((prev) => ({
                      ...prev,
                      registrationDeadline: e.target.value,
                    }))
                  }
                  disabled={!tryoutConfig.eventId && !isEditing}
                />
                <small className='form-text text-muted'>
                  Last day to register for tryouts
                </small>
              </div>

              <div className='mb-3'>
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
                  disabled={!tryoutConfig.eventId && !isEditing}
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
                  checked={tryoutConfig.requiresRoster}
                  onChange={(e) =>
                    setTryoutConfig((prev) => ({
                      ...prev,
                      requiresRoster: e.target.checked,
                    }))
                  }
                  disabled={!tryoutConfig.eventId && !isEditing}
                />
                <label className='form-check-label'>Requires Roster Info</label>
                <small className='form-text text-muted d-block'>
                  Players must provide roster information
                </small>
              </div>

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
                  disabled={!tryoutConfig.eventId && !isEditing}
                />
                <label className='form-check-label'>Requires Insurance</label>
                <small className='form-text text-muted d-block'>
                  Players must provide proof of insurance
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
                  placeholder='Enter refund policy details...'
                  disabled={!tryoutConfig.eventId && !isEditing}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className='row mb-4'>
        <div className='col-md-6'>
          <div className='card h-100'>
            <div className='card-header'>
              <h6 className='mb-0'>Tryout Dates</h6>
            </div>
            <div className='card-body'>
              <div className='input-group mb-3'>
                <input
                  type='date'
                  className='form-control'
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  disabled={!tryoutConfig.eventId && !isEditing}
                />
                <button
                  className='btn btn-outline-primary'
                  type='button'
                  onClick={addDate}
                  disabled={(!tryoutConfig.eventId && !isEditing) || !newDate}
                >
                  Add
                </button>
              </div>

              {tryoutConfig.tryoutDates.length > 0 ? (
                <div className='list-group'>
                  {tryoutConfig.tryoutDates.map((date, index) => (
                    <div
                      key={index}
                      className='list-group-item d-flex justify-content-between align-items-center'
                    >
                      <span>{new Date(date).toLocaleDateString()}</span>
                      <button
                        className='btn btn-sm btn-outline-danger'
                        onClick={() => removeDate(index)}
                        disabled={!tryoutConfig.eventId && !isEditing}
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

        <div className='col-md-6'>
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
                  placeholder='Add location (e.g., Bothell High School Gym)'
                  disabled={!tryoutConfig.eventId && !isEditing}
                />
                <button
                  className='btn btn-outline-primary'
                  type='button'
                  onClick={addLocation}
                  disabled={
                    (!tryoutConfig.eventId && !isEditing) || !newLocation.trim()
                  }
                >
                  Add
                </button>
              </div>

              {tryoutConfig.locations.length > 0 ? (
                <div className='list-group'>
                  {tryoutConfig.locations.map((location, index) => (
                    <div
                      key={index}
                      className='list-group-item d-flex justify-content-between align-items-center'
                    >
                      <span>{location}</span>
                      <button
                        className='btn btn-sm btn-outline-danger'
                        onClick={() => removeLocation(index)}
                        disabled={!tryoutConfig.eventId && !isEditing}
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
      </div>

      <div className='card'>
        <div className='card-header'>
          <h5>Payment Configuration</h5>
        </div>
        <div className='card-body'>
          <div className='row'>
            <div className='col-md-6'>
              <div className='mb-3'>
                <label className='form-label'>Tryout Fee (per player) *</label>
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
                    step='1'
                    disabled={!tryoutConfig.eventId && !isEditing}
                  />
                </div>
                <small className='form-text text-muted'>
                  Per player tryout fee. This will be used for payment
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
                    checked={tryoutConfig.requiresPayment}
                    onChange={(e) =>
                      setTryoutConfig((prev) => ({
                        ...prev,
                        requiresPayment: e.target.checked,
                      }))
                    }
                    style={{ transform: 'scale(1.2)' }}
                    disabled={!tryoutConfig.eventId && !isEditing}
                  />
                  <label className='form-check-label fw-bold'>
                    {tryoutConfig.requiresPayment
                      ? 'Payment Required'
                      : 'Free Tryout'}
                  </label>
                  <small className='form-text text-muted d-block'>
                    {tryoutConfig.requiresPayment
                      ? 'Players must complete payment to register for tryout'
                      : 'No payment required for this tryout'}
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

export default TryoutFormConfig;
