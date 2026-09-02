import React, { useState, useEffect } from 'react';
import { OverlayTrigger, Tooltip, Button, Alert, Badge } from 'react-bootstrap';
import axios from 'axios';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

interface EventConfig {
  _id?: string;
  eventType: 'tryout' | 'training' | 'tournament';
  title: string;
  description: string;
  startDate: string;
  endDate?: string;
  startTime: string;
  endTime: string;
  location: {
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
  };
  gender: 'Boys' | 'Girls' | 'Boys & Girls' | 'Co-ed';
  grades: string;
  price: number;
  registrationOpen: boolean;
  whatToBring: string[];
  whatToExpect: string;
  importantNotes: string[];
  imageUrl: string;
}

interface AdminEventConfigProps {
  eventType: 'tryout' | 'training' | 'tournament';
  title: string;
  icon: string;
  color: string;
  badgeColor: string;
}

const AdminEventConfig: React.FC<AdminEventConfigProps> = ({
  eventType,
  title,
  icon,
  color,
  badgeColor,
}) => {
  const [config, setConfig] = useState<EventConfig>({
    eventType,
    title: `Bothell Select ${title}`,
    description: `Join Bothell Select Basketball for ${title.toLowerCase()}.`,
    startDate: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '12:00',
    location: {
      name: 'Bothell High School',
      address: '18100 92nd Ave NE',
      city: 'Bothell',
      state: 'WA',
      zip: '98011',
    },
    gender: 'Boys & Girls',
    grades: '4th – 8th Grade',
    price: eventType === 'tryout' ? 50 : eventType === 'training' ? 75 : 425,
    registrationOpen: false,
    whatToBring: [
      'Basketball shoes',
      'Water bottle',
      'Athletic wear',
      'Completed waiver',
    ],
    whatToExpect: 'Skill demonstrations, drills, and scrimmages.',
    importantNotes: [],
    imageUrl: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, [eventType]);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_BASE_URL}/event-config?eventType=${eventType}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.data.success && response.data.configs.length > 0) {
        const activeConfig = response.data.configs.find((c: any) => c.isActive);
        if (activeConfig) {
          const startDate = new Date(activeConfig.startDate)
            .toISOString()
            .split('T')[0];
          setConfig({ ...activeConfig, startDate });
        }
      }
    } catch (error: any) {
      console.error('Error fetching config:', error);
      setError(error.response?.data?.error || 'Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
    setError(null);
    setSuccessMessage(null);
  };

  const handleLocationChange = (field: string, value: string) => {
    setConfig((prev) => ({
      ...prev,
      location: { ...prev.location, [field]: value },
    }));
    setHasChanges(true);
  };

  const handleArrayChange = (
    field: 'whatToBring' | 'importantNotes',
    value: string,
  ) => {
    const items = value.split('\n').filter((item) => item.trim());
    setConfig((prev) => ({ ...prev, [field]: items }));
    setHasChanges(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_BASE_URL}/event-config`,
        config,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.data.success) {
        setSuccessMessage(`${title} configuration saved successfully!`);
        if (response.data.config) {
          setConfig((prev) => ({ ...prev, _id: response.data.config._id }));
        }
        setHasChanges(false);
      }
    } catch (error: any) {
      setError(
        error.response?.data?.error || `Failed to save ${title} configuration`,
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className='page-wrapper'>
      <div className='content content-two'>
        {error && (
          <Alert variant='danger' onClose={() => setError(null)} dismissible>
            {error}
          </Alert>
        )}

        {successMessage && (
          <Alert
            variant='success'
            onClose={() => setSuccessMessage(null)}
            dismissible
          >
            {successMessage}
          </Alert>
        )}

        <div className='d-md-flex d-block align-items-center justify-content-between border-bottom pb-3'>
          <div className='my-auto mb-2'>
            <h3 className='page-title mb-1'>
              <i className={`ti ${icon} me-2`} style={{ color }}></i>
              {title} Configuration
            </h3>
            <p className='text-muted mb-0'>
              Configure the {title.toLowerCase()} information displayed on the
              public page.
              {config.registrationOpen ? (
                <Badge bg='success' className='ms-2'>
                  <i className='ti ti-circle-check me-1'></i>
                  Registration Open
                </Badge>
              ) : (
                <Badge bg='warning' className='ms-2'>
                  <i className='ti ti-clock me-1'></i>
                  Coming Soon
                </Badge>
              )}
            </p>
          </div>
          <div className='d-flex my-xl-auto right-content align-items-center flex-wrap'>
            <div className='pe-1 mb-2'>
              <OverlayTrigger
                overlay={<Tooltip id='tooltip-refresh'>Refresh</Tooltip>}
              >
                <Button
                  variant='outline-light'
                  className='bg-white btn-icon me-1'
                  onClick={fetchConfig}
                >
                  <i className='ti ti-refresh' />
                </Button>
              </OverlayTrigger>
            </div>
            {hasChanges && (
              <div className='pe-1 mb-2'>
                <span className='text-muted small me-2'>
                  <i className='ti ti-info-circle'></i> Unsaved changes
                </span>
              </div>
            )}
          </div>
        </div>

        <div className='row'>
          <div className='col-12'>
            <form onSubmit={handleSubmit}>
              {/* Basic Information */}
              <div className='card'>
                <div className='card-header'>
                  <h5 className='mb-0'>Basic Information</h5>
                </div>
                <div className='card-body'>
                  <div className='row'>
                    <div className='col-md-12 mb-3'>
                      <label className='form-label'>Title</label>
                      <input
                        type='text'
                        className='form-control'
                        value={config.title}
                        onChange={(e) => handleChange('title', e.target.value)}
                        required
                      />
                    </div>
                    <div className='col-md-12 mb-3'>
                      <label className='form-label'>Description</label>
                      <textarea
                        className='form-control'
                        rows={3}
                        value={config.description}
                        onChange={(e) =>
                          handleChange('description', e.target.value)
                        }
                        placeholder='Brief description of the event'
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Date & Time */}
              <div className='card mt-4'>
                <div className='card-header'>
                  <h5 className='mb-0'>Date & Time</h5>
                </div>
                <div className='card-body'>
                  <div className='row'>
                    <div className='col-md-6 mb-3'>
                      <label className='form-label'>Start Date</label>
                      <input
                        type='date'
                        className='form-control'
                        value={config.startDate}
                        onChange={(e) =>
                          handleChange('startDate', e.target.value)
                        }
                        required
                      />
                    </div>
                    <div className='col-md-3 mb-3'>
                      <label className='form-label'>Start Time</label>
                      <input
                        type='time'
                        className='form-control'
                        value={config.startTime}
                        onChange={(e) =>
                          handleChange('startTime', e.target.value)
                        }
                        required
                      />
                    </div>
                    <div className='col-md-3 mb-3'>
                      <label className='form-label'>End Time</label>
                      <input
                        type='time'
                        className='form-control'
                        value={config.endTime}
                        onChange={(e) =>
                          handleChange('endTime', e.target.value)
                        }
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className='card mt-4'>
                <div className='card-header'>
                  <h5 className='mb-0'>Location</h5>
                </div>
                <div className='card-body'>
                  <div className='row'>
                    <div className='col-md-12 mb-3'>
                      <label className='form-label'>Location Name</label>
                      <input
                        type='text'
                        className='form-control'
                        value={config.location.name}
                        onChange={(e) =>
                          handleLocationChange('name', e.target.value)
                        }
                        required
                      />
                    </div>
                    <div className='col-md-12 mb-3'>
                      <label className='form-label'>Address</label>
                      <input
                        type='text'
                        className='form-control'
                        value={config.location.address}
                        onChange={(e) =>
                          handleLocationChange('address', e.target.value)
                        }
                      />
                    </div>
                    <div className='col-md-4 mb-3'>
                      <label className='form-label'>City</label>
                      <input
                        type='text'
                        className='form-control'
                        value={config.location.city}
                        onChange={(e) =>
                          handleLocationChange('city', e.target.value)
                        }
                      />
                    </div>
                    <div className='col-md-4 mb-3'>
                      <label className='form-label'>State</label>
                      <input
                        type='text'
                        className='form-control'
                        value={config.location.state}
                        onChange={(e) =>
                          handleLocationChange('state', e.target.value)
                        }
                      />
                    </div>
                    <div className='col-md-4 mb-3'>
                      <label className='form-label'>ZIP</label>
                      <input
                        type='text'
                        className='form-control'
                        value={config.location.zip}
                        onChange={(e) =>
                          handleLocationChange('zip', e.target.value)
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Eligibility */}
              <div className='card mt-4'>
                <div className='card-header'>
                  <h5 className='mb-0'>Eligibility</h5>
                </div>
                <div className='card-body'>
                  <div className='row'>
                    <div className='col-md-6 mb-3'>
                      <label className='form-label'>Gender</label>
                      <select
                        className='form-control'
                        value={config.gender}
                        onChange={(e) =>
                          handleChange(
                            'gender',
                            e.target.value as EventConfig['gender'],
                          )
                        }
                      >
                        <option value='Boys'>Boys</option>
                        <option value='Girls'>Girls</option>
                        <option value='Boys & Girls'>Boys & Girls</option>
                        <option value='Co-ed'>Co-ed</option>
                      </select>
                    </div>
                    <div className='col-md-6 mb-3'>
                      <label className='form-label'>Grades</label>
                      <input
                        type='text'
                        className='form-control'
                        value={config.grades}
                        onChange={(e) => handleChange('grades', e.target.value)}
                        placeholder='e.g., 4th – 8th Grade'
                      />
                    </div>
                    <div className='col-md-6 mb-3'>
                      <label className='form-label'>Price ($)</label>
                      <input
                        type='number'
                        className='form-control'
                        value={config.price}
                        onChange={(e) =>
                          handleChange('price', parseFloat(e.target.value))
                        }
                        min='0'
                        step='0.01'
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Registration Status */}
              <div className='card mt-4'>
                <div className='card-header'>
                  <h5 className='mb-0'>Registration Status</h5>
                </div>
                <div className='card-body'>
                  <div className='form-check form-switch'>
                    <input
                      className='form-check-input'
                      type='checkbox'
                      id='registrationOpen'
                      checked={config.registrationOpen}
                      onChange={(e) =>
                        handleChange('registrationOpen', e.target.checked)
                      }
                    />
                    <label
                      className='form-check-label'
                      htmlFor='registrationOpen'
                    >
                      <strong>
                        {config.registrationOpen ? (
                          <span className='text-success'>
                            <i className='ti ti-circle-check me-1'></i>
                            Registration is OPEN
                          </span>
                        ) : (
                          <span className='text-warning'>
                            <i className='ti ti-clock me-1'></i>
                            Registration is CLOSED (Coming Soon)
                          </span>
                        )}
                      </strong>
                    </label>
                  </div>
                  <p className='text-muted small mt-2'>
                    When enabled, the full registration form will be displayed
                    on the public page. When disabled, a "Coming Soon" message
                    with email notification signup will be shown.
                  </p>
                </div>
              </div>

              {/* What to Bring */}
              <div className='card mt-4'>
                <div className='card-header'>
                  <h5 className='mb-0'>What to Bring</h5>
                </div>
                <div className='card-body'>
                  <div className='mb-3'>
                    <label className='form-label'>Items (one per line)</label>
                    <textarea
                      className='form-control'
                      rows={4}
                      value={config.whatToBring.join('\n')}
                      onChange={(e) =>
                        handleArrayChange('whatToBring', e.target.value)
                      }
                      placeholder='Basketball shoes&#10;Water bottle&#10;Athletic wear'
                    />
                  </div>
                </div>
              </div>

              {/* What to Expect */}
              <div className='card mt-4'>
                <div className='card-header'>
                  <h5 className='mb-0'>What to Expect</h5>
                </div>
                <div className='card-body'>
                  <div className='mb-3'>
                    <label className='form-label'>Description</label>
                    <textarea
                      className='form-control'
                      rows={3}
                      value={config.whatToExpect}
                      onChange={(e) =>
                        handleChange('whatToExpect', e.target.value)
                      }
                      placeholder='Describe what participants can expect'
                    />
                  </div>
                </div>
              </div>

              {/* Important Notes */}
              <div className='card mt-4'>
                <div className='card-header'>
                  <h5 className='mb-0'>Important Notes</h5>
                </div>
                <div className='card-body'>
                  <div className='mb-3'>
                    <label className='form-label'>Notes (one per line)</label>
                    <textarea
                      className='form-control'
                      rows={3}
                      value={config.importantNotes.join('\n')}
                      onChange={(e) =>
                        handleArrayChange('importantNotes', e.target.value)
                      }
                      placeholder='Arrive 30 minutes early&#10;Bring a filled water bottle'
                    />
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className='mt-4 d-flex justify-content-end'>
                <Button
                  type='submit'
                  variant='primary'
                  disabled={saving}
                  className='px-4'
                >
                  {saving ? (
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
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminEventConfig;
