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
import {
  SeasonOption,
  EmailTemplate,
  EmailCampaignData,
  ManualEmailRequest,
} from '../types/types';
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
  const [manualEmails, setManualEmails] = useState('');
  const { isAuthenticated, getAuthToken } = useAuth();
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

  const [sendingStatus, setSendingStatus] = useState<{
    manual: 'idle' | 'sending' | 'success' | 'error';
    campaign: 'idle' | 'sending' | 'success' | 'error';
  }>({
    manual: 'idle',
    campaign: 'idle',
  });

  const isValidEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

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

  const getCombinedEmails = (): string[] => {
    const selectedEmails = users
      .filter((user) => selectedUsers.includes(user._id))
      .map((user) => user.email);

    const manualEmailList = manualEmails
      .split(/[\n,;]+/)
      .map((email) => email.trim())
      .filter((email) => email && isValidEmail(email));

    return Array.from(new Set([...selectedEmails, ...manualEmailList]));
  };

  const getManualEmailsOnly = (): string[] => {
    const selectedUserEmails = users
      .filter((user) => selectedUsers.includes(user._id))
      .map((user) => user.email);

    return getCombinedEmails().filter(
      (email) => !selectedUserEmails.includes(email)
    );
  };

  const sendManualEmails = async (emails: string[]): Promise<boolean> => {
    if (!selectedTemplate) return false;

    setSendingStatus((prev) => ({ ...prev, manual: 'sending' }));

    try {
      const token = await getAuthToken();
      const response = await fetch(`${API_BASE_URL}/email/send-manual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          templateId: selectedTemplate._id,
          emails: emails,
          variables: {
            ...(selectedUsers.length > 0 && { parentIds: selectedUsers }),
            ...(selectedSeason &&
              selectedYear && {
                season: selectedSeason,
                year: selectedYear,
              }),
          },
        } as ManualEmailRequest),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      setSendingStatus((prev) => ({ ...prev, manual: 'success' }));
      return true;
    } catch (error) {
      console.error('Manual email send error:', error);
      setSendingStatus((prev) => ({ ...prev, manual: 'error' }));
      setError(
        `Failed to send manual emails: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
      return false;
    }
  };

  const sendRegularCampaign = async (): Promise<boolean> => {
    if (!selectedTemplate) return false;

    setSendingStatus((prev) => ({ ...prev, campaign: 'sending' }));

    try {
      const campaignData: EmailCampaignData = {
        templateId: selectedTemplate._id,
        ...(selectedUsers.length > 0 && { parentIds: selectedUsers }),
        ...(selectedSeason &&
          selectedYear && {
            season: selectedSeason,
            year: selectedYear,
          }),
      };

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
        throw new Error(await response.text());
      }

      setSendingStatus((prev) => ({ ...prev, campaign: 'success' }));
      return true;
    } catch (error) {
      console.error('Campaign send error:', error);
      setSendingStatus((prev) => ({ ...prev, campaign: 'error' }));
      setError(
        `Failed to send campaign: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
      return false;
    }
  };

  const handleSendCampaign = async () => {
    if (!selectedTemplate) {
      alert('Please select an email template');
      return;
    }

    setError(null);
    setSuccessMessage(null);

    const manualEmailsToSend = getManualEmailsOnly();
    const hasManualEmails = manualEmailsToSend.length > 0;
    const hasRegularRecipients =
      selectedUsers.length > 0 || (selectedSeason && selectedYear);

    if (!hasManualEmails && !hasRegularRecipients) {
      alert('Please select recipients or enter manual emails');
      return;
    }

    let manualSuccess = true;
    let campaignSuccess = true;

    // Send manual emails first if they exist
    if (hasManualEmails) {
      manualSuccess = await sendManualEmails(manualEmailsToSend);
    }

    // Send to regular recipients if they exist
    if (hasRegularRecipients) {
      campaignSuccess = await sendRegularCampaign();
    }

    // Show success message if all sends were successful
    if (manualSuccess && campaignSuccess) {
      setSuccessMessage(
        `${
          hasManualEmails && hasRegularRecipients
            ? 'All emails'
            : hasManualEmails
            ? 'Manual emails'
            : 'Campaign emails'
        } sent successfully!`
      );

      // Reset form
      setSelectedTemplate(null);
      setSelectedUsers([]);
      setManualEmails('');
      setSearchTerm('');
      setSelectedSeason('');
      setSelectedYear(null);
    }

    // Reset sending status after 3 seconds
    setTimeout(() => {
      setSendingStatus({ manual: 'idle', campaign: 'idle' });
    }, 3000);
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
              {sendingStatus.manual === 'success' && (
                <Alert variant='success' className='mt-2 p-2'>
                  Manual emails sent successfully!
                </Alert>
              )}
              {sendingStatus.campaign === 'success' && (
                <Alert variant='success' className='mt-2 p-2'>
                  Campaign emails sent successfully!
                </Alert>
              )}
              {sendingStatus.manual === 'error' && (
                <Alert variant='danger' className='mt-2 p-2'>
                  Failed to send manual emails
                </Alert>
              )}
              {sendingStatus.campaign === 'error' && (
                <Alert variant='danger' className='mt-2 p-2'>
                  Failed to send campaign emails
                </Alert>
              )}
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

                          {/* Search input */}
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

                          {/* Search results with checkboxes */}
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

                          {/* Select/Clear buttons */}
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

                          {/* Manual email entry */}
                          <div className='mt-3'>
                            <Form.Label>
                              Or manually enter email addresses (comma- or
                              newline-separated)
                            </Form.Label>
                            <Form.Control
                              as='textarea'
                              rows={3}
                              placeholder='e.g. parent1@example.com, parent2@example.com'
                              value={manualEmails}
                              onChange={(e) => setManualEmails(e.target.value)}
                            />
                          </div>
                        </Card.Body>
                      </Card>
                    </div>

                    <div className='text-end mt-4'>
                      <div className='text-end mt-4'>
                        <Button
                          onClick={handleSendCampaign}
                          disabled={
                            !selectedTemplate ||
                            (selectedUsers.length === 0 &&
                              !selectedSeason &&
                              getManualEmailsOnly().length === 0) ||
                            sendingStatus.manual === 'sending' ||
                            sendingStatus.campaign === 'sending'
                          }
                          variant='primary'
                        >
                          {sendingStatus.manual === 'sending' ||
                          sendingStatus.campaign === 'sending'
                            ? 'Sending...'
                            : 'Send Email Campaign'}
                        </Button>

                        {(selectedUsers.length > 0 ||
                          getManualEmailsOnly().length > 0) && (
                          <div className='mt-2'>
                            {selectedUsers.length > 0 && (
                              <div className='text-muted small'>
                                {selectedUsers.length} user
                                {selectedUsers.length !== 1 ? 's' : ''} selected
                              </div>
                            )}
                            {getManualEmailsOnly().length > 0 && (
                              <div className='text-muted small'>
                                {getManualEmailsOnly().length} manual email
                                {getManualEmailsOnly().length !== 1
                                  ? 's'
                                  : ''}{' '}
                                entered
                              </div>
                            )}
                          </div>
                        )}
                      </div>
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
