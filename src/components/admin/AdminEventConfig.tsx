import React, { useState, useEffect } from 'react';
import axios from 'axios';

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
  gender: string;
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
}

const AdminEventConfig: React.FC<AdminEventConfigProps> = ({
  eventType,
  title,
  icon,
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
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    fetchConfig();
  }, [eventType]);

  const fetchConfig = async () => {
    try {
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
    } catch (error) {
      console.error('Error fetching config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const handleLocationChange = (field: string, value: string) => {
    setConfig((prev) => ({
      ...prev,
      location: { ...prev.location, [field]: value },
    }));
  };

  const handleArrayChange = (
    field: 'whatToBring' | 'importantNotes',
    value: string,
  ) => {
    const items = value.split('\n').filter((item) => item.trim());
    setConfig((prev) => ({ ...prev, [field]: items }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

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
        setMessage({
          type: 'success',
          text: `${title} configuration saved successfully!`,
        });
        if (response.data.config) {
          setConfig((prev) => ({ ...prev, _id: response.data.config._id }));
        }
      }
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to save configuration',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className='text-center py-5'>
        <div className='spinner-border text-primary' role='status'>
          <span className='visually-hidden'>Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className='admin-event-config'>
      <div className='page-header'>
        <h3>
          <i className={`ti ${icon} me-2`}></i>
          {title} Configuration
        </h3>
        <p className='text-muted'>
          Configure the {title.toLowerCase()} information displayed on the
          public page.
        </p>
      </div>

      {message && (
        <div
          className={`alert alert-${message.type === 'success' ? 'success' : 'danger'}`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Basic Information */}
        <div className='card mb-4'>
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
                  onChange={(e) => handleChange('description', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Date & Time */}
        <div className='card mb-4'>
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
                  onChange={(e) => handleChange('startDate', e.target.value)}
                  required
                />
              </div>
              <div className='col-md-6 mb-3'>
                <label className='form-label'>Start Time</label>
                <input
                  type='time'
                  className='form-control'
                  value={config.startTime}
                  onChange={(e) => handleChange('startTime', e.target.value)}
                  required
                />
              </div>
              <div className='col-md-6 mb-3'>
                <label className='form-label'>End Time</label>
                <input
                  type='time'
                  className='form-control'
                  value={config.endTime}
                  onChange={(e) => handleChange('endTime', e.target.value)}
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* Location */}
        <div className='card mb-4'>
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
                  onChange={(e) => handleLocationChange('name', e.target.value)}
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
                  onChange={(e) => handleLocationChange('city', e.target.value)}
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
                  onChange={(e) => handleLocationChange('zip', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Eligibility */}
        <div className='card mb-4'>
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
                  onChange={(e) => handleChange('gender', e.target.value)}
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
                />
              </div>
            </div>
          </div>
        </div>

        {/* Registration Status */}
        <div className='card mb-4'>
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
              <label className='form-check-label' htmlFor='registrationOpen'>
                <strong>
                  {config.registrationOpen
                    ? 'Registration is OPEN'
                    : 'Registration is CLOSED (Coming Soon)'}
                </strong>
              </label>
            </div>
            <p className='text-muted small mt-2'>
              When enabled, the full registration form will be displayed on the
              public page. When disabled, a "Coming Soon" message with email
              notification signup will be shown.
            </p>
          </div>
        </div>

        {/* What to Bring */}
        <div className='card mb-4'>
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
        <div className='card mb-4'>
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
                onChange={(e) => handleChange('whatToExpect', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Important Notes */}
        <div className='card mb-4'>
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

        <button type='submit' className='btn btn-primary' disabled={saving}>
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </form>
    </div>
  );
};

export default AdminEventConfig;
