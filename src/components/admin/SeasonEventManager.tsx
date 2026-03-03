// src/components/admin/SeasonEventManager.tsx
import React, { useState } from 'react';
import { SeasonEvent } from '../../types/registration-types';

interface SeasonEventManagerProps {
  seasonEvents: SeasonEvent[];
  onSeasonCreate: (season: Omit<SeasonEvent, 'eventId'>) => Promise<boolean>;
  onSeasonUpdate: (events: SeasonEvent[]) => void;
}

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const SeasonEventManager: React.FC<SeasonEventManagerProps> = ({
  seasonEvents,
  onSeasonCreate,
  onSeasonUpdate,
}) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newSeason, setNewSeason] = useState({
    season: '',
    year: new Date().getFullYear(),
    eventId: '',
  });

  const handleCreateSeason = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await onSeasonCreate(newSeason);
    if (success) {
      setShowCreateForm(false);
      setNewSeason({
        season: '',
        year: new Date().getFullYear(),
        eventId: '',
      });
    }
  };

  const deleteSeason = async (season: SeasonEvent) => {
    if (!window.confirm(`Delete ${season.season} ${season.year}?`)) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/admin/season-events/${season.eventId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (response.ok) {
        onSeasonUpdate(
          seasonEvents.filter((s) => s.eventId !== season.eventId)
        );
      }
    } catch (error) {
      console.error('Error deleting season:', error);
    }
  };

  return (
    <div className='season-event-manager'>
      <div className='d-flex justify-content-between align-items-center mb-4'>
        <h4>Manage Season Events</h4>
        <button
          className='btn btn-primary'
          onClick={() => setShowCreateForm(true)}
        >
          <i className='ti ti-plus me-2'></i>
          New Season Event
        </button>
      </div>

      {/* Create New Season Form */}
      {showCreateForm && (
        <div className='card mb-4'>
          <div className='card-header'>
            <h5>Create New Season Event</h5>
          </div>
          <div className='card-body'>
            <form onSubmit={handleCreateSeason}>
              <div className='row'>
                <div className='col-md-4'>
                  <div className='mb-3'>
                    <label className='form-label'>Season Name</label>
                    <input
                      type='text'
                      className='form-control'
                      value={newSeason.season}
                      onChange={(e) =>
                        setNewSeason((prev) => ({
                          ...prev,
                          season: e.target.value,
                        }))
                      }
                      placeholder='e.g., Partizan Team, Winter Classic'
                      required
                    />
                  </div>
                </div>
                <div className='col-md-3'>
                  <div className='mb-3'>
                    <label className='form-label'>Year</label>
                    <input
                      type='number'
                      className='form-control'
                      value={newSeason.year}
                      onChange={(e) =>
                        setNewSeason((prev) => ({
                          ...prev,
                          year: parseInt(e.target.value),
                        }))
                      }
                      min={2020}
                      max={2030}
                      required
                    />
                  </div>
                </div>
                <div className='col-md-3'>
                  <div className='mb-3'>
                    <label className='form-label'>Event ID</label>
                    <input
                      type='text'
                      className='form-control'
                      value={newSeason.eventId}
                      onChange={(e) =>
                        setNewSeason((prev) => ({
                          ...prev,
                          eventId: e.target.value,
                        }))
                      }
                      placeholder='e.g., partizan-2026'
                      required
                    />
                    <small className='text-muted'>
                      Unique identifier for the season
                    </small>
                  </div>
                </div>
                <div className='col-md-2 d-flex align-items-end'>
                  <div className='mb-3'>
                    <button type='submit' className='btn btn-success me-2'>
                      Create
                    </button>
                    <button
                      type='button'
                      className='btn btn-secondary'
                      onClick={() => setShowCreateForm(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Seasons List */}
      <div className='card'>
        <div className='card-header'>
          <h5>Existing Season Events</h5>
        </div>
        <div className='card-body'>
          {seasonEvents.length === 0 ? (
            <div className='text-center p-4'>
              <i className='ti ti-calendar-off fs-1 text-muted mb-3'></i>
              <p>No season events created yet</p>
            </div>
          ) : (
            <div className='table-responsive'>
              <table className='table table-striped'>
                <thead>
                  <tr>
                    <th>Season</th>
                    <th>Year</th>
                    <th>Event ID</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {seasonEvents.map((season) => (
                    <tr key={season.eventId}>
                      <td>
                        <strong>{season.season}</strong>
                      </td>
                      <td>{season.year}</td>
                      <td>
                        <code>{season.eventId}</code>
                      </td>
                      <td>
                        <span className='badge bg-secondary'>No Form</span>
                      </td>
                      <td>
                        <button
                          className='btn btn-sm btn-outline-danger'
                          onClick={() => deleteSeason(season)}
                        >
                          <i className='ti ti-trash'></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SeasonEventManager;
