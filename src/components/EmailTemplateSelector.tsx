import React, { useState, useEffect, useCallback } from 'react';
import {
  OverlayTrigger,
  Tooltip,
  Button,
  Card,
  Form,
  Alert,
} from 'react-bootstrap';
import { emailTemplateService } from '../services/emailTemplateService';
import { useAuth } from '../context/AuthContext';
import { SeasonOption, EmailTemplate, EmailCampaignData } from '../types/types';
import LoadingSpinner from '../components/common/LoadingSpinner';

interface User {
  _id: string;
  fullName: string;
  email: string;
  playersSeason?: string[];
  playersYear?: number[];
}

interface RawSeason {
  season: string;
  registrationYear: number;
}

export const EmailTemplateSelector: React.FC = () => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] =
    useState<EmailTemplate | null>(null);
  const [seasons, setSeasons] = useState<SeasonOption[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState({
    templates: true,
    seasons: true,
    users: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const { isAuthenticated, getAuthToken } = useAuth();
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const response = await emailTemplateService.getAll();
        const data = Array.isArray(response)
          ? response
          : response?.data?.data || response?.data || [];
        if (!Array.isArray(data)) throw new Error('Invalid data format');
        setTemplates(data);
      } catch (err) {
        setError('Failed to load email templates');
      } finally {
        setLoading((prev) => ({ ...prev, templates: false }));
      }
    };

    loadTemplates();
  }, []);

  useEffect(() => {
    const loadSeasons = async () => {
      if (!isAuthenticated) return;
      try {
        const token = await getAuthToken();
        const response = await fetch(`${API_BASE_URL}/players/seasons`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Fetch error');

        const data = await response.json();
        const seasonStrings = Array.from(
          new Set(
            (data as RawSeason[]).map(
              (s) => `${s.season}-${s.registrationYear}`
            )
          )
        );

        const unique = seasonStrings
          .map((seasonStr) => {
            const [season, year] = seasonStr.split('-');
            return { season, year: parseInt(year, 10) };
          })
          .sort((a, b) => b.year - a.year || a.season.localeCompare(b.season));
        setSeasons(unique);
      } catch (err) {
        setError('Failed to load seasons');
      } finally {
        setLoading((prev) => ({ ...prev, seasons: false }));
      }
    };

    loadSeasons();
  }, [isAuthenticated, getAuthToken, API_BASE_URL]);

  const searchUsers = useCallback(async () => {
    if (!searchTerm.trim()) {
      setUsers([]);
      return;
    }

    setLoading((prev) => ({ ...prev, users: true }));
    try {
      const token = await getAuthToken();
      const response = await fetch(
        `${API_BASE_URL}/users/search?q=${encodeURIComponent(searchTerm)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) throw new Error('Search failed');
      let userData: User[] = await response.json();

      if (selectedSeason && selectedYear) {
        userData = userData.filter(
          (user) =>
            user.playersSeason?.includes(selectedSeason) &&
            user.playersYear?.includes(selectedYear)
        );
      }

      setUsers(userData);
    } catch (err) {
      setError('Failed to search users');
    } finally {
      setLoading((prev) => ({ ...prev, users: false }));
    }
  }, [searchTerm, selectedSeason, selectedYear, API_BASE_URL, getAuthToken]);

  useEffect(() => {
    const timer = setTimeout(searchUsers, 300);
    return () => clearTimeout(timer);
  }, [searchUsers]);

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find((t) => t._id === templateId) || null;
    setSelectedTemplate(template);
  };

  const handleSeasonSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === '') {
      setSelectedSeason('');
      setSelectedYear(null);
      return;
    }

    const [season, year] = value.split('-');
    setSelectedSeason(season);
    setSelectedYear(parseInt(year));
    setSelectedUsers([]);
    setSearchTerm('');
    setUsers([]);
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedSeason('');
    setSelectedYear(null);

    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const selectAllUsers = () => {
    setSelectedSeason('');
    setSelectedYear(null);

    const allUserIds = users.map((u) => u._id);
    setSelectedUsers(allUserIds);
  };

  const clearAllSelections = () => {
    setSelectedUsers([]);
  };

  const handleSendCampaign = async () => {
    if (!selectedTemplate || (selectedUsers.length === 0 && !selectedSeason)) {
      alert('Please select a template and at least one recipient or a season.');
      return;
    }

    const campaignData: EmailCampaignData = {
      templateId: selectedTemplate._id,
      parentIds: selectedUsers.length > 0 ? selectedUsers : [],
      ...(selectedSeason && selectedYear
        ? { season: selectedSeason, year: selectedYear }
        : {}),
    };

    try {
      const token = await getAuthToken();
      const response = await fetch(`${API_BASE_URL}/email/send-campaign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(campaignData),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Send failed: ${response.status} ${text}`);
      }

      setSuccessMessage('Email campaign sent successfully!');
      setTimeout(() => setSuccessMessage(null), 4000);

      // Reset selections
      setSelectedTemplate(null);
      setSelectedSeason('');
      setSelectedYear(null);
      setSelectedUsers([]);
      setUsers([]);
      setSearchTerm('');
    } catch (error) {
      console.error(error);
      alert('Failed to send emails.');
    }
  };

  const isLoading = loading.templates || loading.seasons;

  return (
    <>
      {isLoading ? (
        <LoadingSpinner />
      ) : error ? (
        <div className='page-wrapper'>
          <Alert variant='danger' className='mt-4'>
            {error}
            <Button
              variant='primary'
              size='sm'
              onClick={() => setError(null)}
              className='ms-2'
            >
              Retry
            </Button>
          </Alert>
        </div>
      ) : (
        <>
          {successMessage && (
            <div className='page-wrapper'>
              <Alert
                variant='success'
                onClose={() => setSuccessMessage(null)}
                dismissible
                className='mt-4'
              >
                {successMessage}
              </Alert>
            </div>
          )}

          <div className='page-wrapper'>
            <div className='content content-two'>
              <div className='d-md-flex d-block align-items-center justify-content-between border-bottom pb-3'>
                <div className='my-auto mb-2'>
                  <h3 className='page-title mb-1'>Send Email Campaign</h3>
                </div>
                <div className='d-flex my-xl-auto right-content align-items-center flex-wrap'>
                  <div className='pe-1 mb-2'>
                    <OverlayTrigger
                      overlay={<Tooltip id='tooltip-top'>Refresh</Tooltip>}
                    >
                      <Button
                        variant='outline-light'
                        className='bg-white btn-icon me-1'
                        onClick={() => window.location.reload()}
                      >
                        <i className='ti ti-refresh' />
                      </Button>
                    </OverlayTrigger>
                  </div>
                </div>
              </div>

              <div className='row'>
                <div className='col-xxl-12 col-xl-12'>
                  <div className='flex-fill border-start ps-3'>
                    <div className='d-block align-items-center justify-content-between flex-wrap pt-3'>
                      <Card>
                        <Card.Body>
                          <h5 className='mb-2'>Select Template</h5>
                          <Form.Select
                            value={selectedTemplate?._id || ''}
                            onChange={(e) =>
                              handleTemplateSelect(e.target.value)
                            }
                            className='mb-2'
                          >
                            <option value=''>Choose a template...</option>
                            {templates.map((template) => (
                              <option key={template._id} value={template._id}>
                                {template.title} ({template.category})
                              </option>
                            ))}
                          </Form.Select>{' '}
                          {selectedTemplate && (
                            <Card>
                              <Card.Body>
                                <h5 className='mt-4 mb-4'>
                                  <span>Subject line: </span>
                                  {selectedTemplate.subject}
                                </h5>
                                <div
                                  className='p-5 border'
                                  dangerouslySetInnerHTML={{
                                    __html: selectedTemplate.content,
                                  }}
                                />
                              </Card.Body>
                            </Card>
                          )}
                        </Card.Body>
                      </Card>
                    </div>

                    <div className='d-block align-items-center justify-content-between flex-wrap'>
                      <Card>
                        <Card.Body>
                          <h5 className='mb-2'>Filter by Season</h5>
                          <Form.Select
                            value={
                              selectedSeason && selectedYear
                                ? `${selectedSeason}-${selectedYear}`
                                : ''
                            }
                            onChange={handleSeasonSelect}
                            className='mb-2'
                            disabled={selectedUsers.length > 0}
                          >
                            <option value=''>All Seasons</option>
                            {seasons.map((s) => (
                              <option
                                key={`${s.season}-${s.year}`}
                                value={`${s.season}-${s.year}`}
                              >
                                {s.season} {s.year}
                              </option>
                            ))}
                          </Form.Select>
                        </Card.Body>
                      </Card>
                    </div>

                    <div className='d-block align-items-center justify-content-between flex-wrap'>
                      <Card>
                        <Card.Body>
                          <h5 className='mb-2'>Search Users</h5>
                          <Form.Control
                            type='text'
                            placeholder='Search users by name or email'
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            disabled={
                              selectedSeason !== '' && selectedYear !== null
                            }
                          />
                          {loading.users && (
                            <div className='mt-2'>Loading users...</div>
                          )}
                          <div
                            className='mt-2 user-list'
                            style={{ maxHeight: '250px', overflowY: 'auto' }}
                          >
                            {users.length === 0 &&
                              searchTerm &&
                              !loading.users && <div>No users found</div>}
                            {users.map((user) => (
                              <Form.Check
                                key={user._id}
                                type='checkbox'
                                id={`user-${user._id}`}
                                label={`${user.fullName} (${user.email})`}
                                checked={selectedUsers.includes(user._id)}
                                onChange={() => toggleUserSelection(user._id)}
                              />
                            ))}
                          </div>

                          <div className='mt-2'>
                            <Button
                              variant='outline-primary'
                              size='sm'
                              onClick={selectAllUsers}
                              disabled={users.length === 0}
                              className='me-2'
                            >
                              Select All
                            </Button>
                            <Button
                              variant='outline-secondary'
                              size='sm'
                              onClick={clearAllSelections}
                              disabled={selectedUsers.length === 0}
                            >
                              Clear All
                            </Button>
                          </div>
                        </Card.Body>
                      </Card>
                    </div>

                    <div className='text-end mt-4'>
                      <Button
                        onClick={handleSendCampaign}
                        disabled={
                          !selectedTemplate ||
                          (selectedUsers.length === 0 && !selectedSeason)
                        }
                        variant='primary'
                      >
                        Send Campaign
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};
