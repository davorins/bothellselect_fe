import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { Modal } from 'react-bootstrap';

interface AiEmail {
  _id: string;
  from: string;
  replyToEmail?: string;
  to?: string;
  subject?: string;
  body: string;
  category: string;
  confidence: number;
  aiDraft: string;
  humanEditedDraft?: string;
  finalResponse?: string;
  status: string;
  requiresHumanReview: boolean;
  reviewReason?: string;
  autoSent?: boolean;
  sentAt?: string;
  receivedAt: string;
}

interface AiSettings {
  enabled: boolean;
  automaticRepliesEnabled: boolean;
  confidenceThreshold: number;
  tone: string;
  allowedAutomaticCategories: string[];
  alwaysRequireHumanReview: string[];
}

const AiEmailAssistant: React.FC = () => {
  const [emails, setEmails] = useState<AiEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [settings, setSettings] = useState<AiSettings | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  const [selected, setSelected] = useState<AiEmail | null>(null);
  const [editedDraft, setEditedDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
  const token = localStorage.getItem('token');
  const authHeader = { Authorization: `Bearer ${token}` };

  const fetchEmails = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await axios.get(`${API_BASE_URL}/admin/ai-emails`, {
        headers: authHeader,
      });
      setEmails(response.data.emails || []);
    } catch (err) {
      console.error('Error loading AI emails:', err);
      setError('Failed to load AI emails.');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API_BASE_URL]);

  const fetchSettings = useCallback(async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/admin/ai-emails/settings`,
        { headers: authHeader },
      );
      setSettings(response.data.settings);
    } catch (err) {
      console.error('Error loading AI settings:', err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API_BASE_URL]);

  useEffect(() => {
    fetchEmails();
    fetchSettings();
  }, [fetchEmails, fetchSettings]);

  const openEmail = (email: AiEmail) => {
    setSelected(email);
    setEditedDraft(email.humanEditedDraft || email.aiDraft || '');
  };

  const closeEmail = () => {
    setSelected(null);
    setEditedDraft('');
  };

  const handleManualSend = async () => {
    if (!selected) return;
    setSending(true);
    try {
      await axios.post(
        `${API_BASE_URL}/admin/ai-emails/${selected._id}/send`,
        { draft: editedDraft },
        { headers: authHeader },
      );
      closeEmail();
      fetchEmails();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Send failed');
    } finally {
      setSending(false);
    }
  };

  const handleReject = async () => {
    if (!selected) return;
    const reason = window.prompt('Reason for rejection (optional):') || '';
    setSending(true);
    try {
      await axios.post(
        `${API_BASE_URL}/admin/ai-emails/${selected._id}/reject`,
        { reason },
        { headers: authHeader },
      );
      closeEmail();
      fetchEmails();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Reject failed');
    } finally {
      setSending(false);
    }
  };

  const toggleSetting = (key: keyof AiSettings) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: !settings[key] } as AiSettings);
  };

  const saveSettings = async () => {
    if (!settings) return;
    setSavingSettings(true);
    try {
      await axios.patch(`${API_BASE_URL}/admin/ai-emails/settings`, settings, {
        headers: authHeader,
      });
      alert('Settings saved.');
      setShowSettings(false);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const renderBadge = (email: AiEmail) => {
    const map: Record<string, string> = {
      new: 'bg-secondary',
      draft_ready: 'bg-warning text-dark',
      reviewed: 'bg-info text-dark',
      sent: 'bg-success',
      rejected: 'bg-danger',
    };
    return (
      <span className={`badge ${map[email.status] || 'bg-light text-dark'}`}>
        {email.status}
        {email.autoSent ? ' (auto)' : ''}
      </span>
    );
  };

  return (
    <div className='page-wrapper'>
      <div className='content'>
        <div className='d-md-flex d-block align-items-center justify-content-between mb-3'>
          <div className='my-auto mb-2'>
            <h4 className='mb-1'>AI Email Assistant</h4>
            <h6 className='text-muted'>
              Review and manage AI-generated email responses
            </h6>
          </div>
          <div>
            <button
              className='btn btn-outline-primary'
              onClick={() => setShowSettings(true)}
            >
              <i className='ti ti-settings me-1' /> Settings
            </button>
          </div>
        </div>

        <div className='card'>
          <div className='card-body'>
            <div className='d-flex justify-content-between align-items-center mb-3'>
              <h5 className='mb-0'>AI Email Inbox</h5>
              <span className='badge bg-primary'>
                {emails.length} email{emails.length === 1 ? '' : 's'}
              </span>
            </div>

            {loading && (
              <div className='text-center py-5'>
                <p className='text-muted mb-0'>Loading AI emails...</p>
              </div>
            )}

            {!loading && error && (
              <div className='alert alert-danger'>{error}</div>
            )}

            {!loading && !error && emails.length === 0 && (
              <div className='text-center py-5'>
                <h6>No AI emails yet</h6>
                <p className='text-muted mb-0'>
                  New parent emails processed by the AI assistant will appear
                  here.
                </p>
              </div>
            )}

            {!loading && !error && emails.length > 0 && (
              <div className='table-responsive'>
                <table className='table table-hover'>
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Subject</th>
                      <th>Category</th>
                      <th>Confidence</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {emails.map((email) => (
                      <tr
                        key={email._id}
                        onClick={() => openEmail(email)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td>
                          <strong>
                            {email.replyToEmail &&
                            email.replyToEmail !== email.from
                              ? email.replyToEmail
                              : email.from}
                          </strong>
                        </td>
                        <td>{email.subject || '(No subject)'}</td>
                        <td>
                          <span className='badge bg-light text-dark'>
                            {email.category}
                          </span>
                        </td>
                        <td>
                          <strong>{email.confidence}%</strong>
                        </td>
                        <td>{renderBadge(email)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Email Detail Modal ── */}
      <Modal show={!!selected} onHide={closeEmail} size='lg' centered>
        <Modal.Header closeButton>
          <Modal.Title>Review &amp; Send</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {selected && (
            <>
              <div className='mb-2'>
                <strong>From:</strong> {selected.from}
              </div>
              {selected.replyToEmail &&
                selected.replyToEmail !== selected.from && (
                  <div className='mb-2'>
                    <strong>Replying to:</strong> {selected.replyToEmail}
                  </div>
                )}
              <div className='mb-2'>
                <strong>To:</strong> {selected.to || '-'}
              </div>
              <div className='mb-2'>
                <strong>Subject:</strong> {selected.subject || '(none)'}
              </div>
              <div className='mb-2'>
                <strong>Category:</strong> {selected.category} (
                {selected.confidence}%)
              </div>
              {selected.reviewReason && (
                <div className='mb-2 text-muted'>
                  <strong>Reason:</strong> {selected.reviewReason}
                </div>
              )}

              <hr />

              <h6>Original message</h6>
              <div
                className='bg-light p-3 rounded mb-3'
                style={{
                  maxHeight: 180,
                  overflow: 'auto',
                  whiteSpace: 'pre-wrap',
                  fontSize: 13,
                }}
              >
                {selected.body}
              </div>

              <h6>AI draft (editable)</h6>
              <textarea
                className='form-control'
                rows={10}
                value={editedDraft}
                onChange={(e) => setEditedDraft(e.target.value)}
              />
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <button
            className='btn btn-light me-2'
            onClick={closeEmail}
            disabled={sending}
          >
            Cancel
          </button>
          <button
            className='btn btn-outline-danger me-2'
            onClick={handleReject}
            disabled={sending || selected?.status === 'sent'}
          >
            Reject
          </button>
          <button
            className='btn btn-primary'
            onClick={handleManualSend}
            disabled={sending || selected?.status === 'sent'}
          >
            {sending
              ? 'Sending...'
              : selected?.status === 'sent'
                ? 'Already sent'
                : 'Approve & Send'}
          </button>
        </Modal.Footer>
      </Modal>

      {/* ── Settings Modal ── */}
      <Modal
        show={showSettings && !!settings}
        onHide={() => setShowSettings(false)}
        size='lg'
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>AI Assistant Settings</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {settings && (
            <>
              <div className='form-check form-switch mb-3'>
                <input
                  className='form-check-input'
                  type='checkbox'
                  checked={settings.enabled}
                  onChange={() => toggleSetting('enabled')}
                  id='enabled'
                />
                <label className='form-check-label' htmlFor='enabled'>
                  AI assistant enabled
                </label>
              </div>

              <div className='form-check form-switch mb-3'>
                <input
                  className='form-check-input'
                  type='checkbox'
                  checked={settings.automaticRepliesEnabled}
                  onChange={() => toggleSetting('automaticRepliesEnabled')}
                  id='autoReplies'
                />
                <label className='form-check-label' htmlFor='autoReplies'>
                  Enable automatic replies (auto-send when confident)
                </label>
              </div>

              <div className='mb-3'>
                <label className='form-label'>
                  Confidence threshold: {settings.confidenceThreshold}%
                </label>
                <input
                  type='range'
                  min={0}
                  max={100}
                  value={settings.confidenceThreshold}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      confidenceThreshold: Number(e.target.value),
                    })
                  }
                  className='form-range'
                />
              </div>

              <div className='mb-3'>
                <label className='form-label'>
                  Categories that always require human review
                </label>
                <input
                  type='text'
                  className='form-control'
                  value={settings.alwaysRequireHumanReview.join(', ')}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      alwaysRequireHumanReview: e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                />
                <small className='text-muted'>
                  Comma-separated. These categories never auto-send.
                </small>
              </div>

              <div className='mb-3'>
                <label className='form-label'>
                  Allowed automatic categories
                </label>
                <input
                  type='text'
                  className='form-control'
                  value={settings.allowedAutomaticCategories.join(', ')}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      allowedAutomaticCategories: e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                />
                <small className='text-muted'>
                  Leave empty to allow all categories (except the ones above).
                  If set, only these categories may auto-send.
                </small>
              </div>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <button
            className='btn btn-light me-2'
            onClick={() => setShowSettings(false)}
            disabled={savingSettings}
          >
            Cancel
          </button>
          <button
            className='btn btn-primary'
            onClick={saveSettings}
            disabled={savingSettings}
          >
            {savingSettings ? 'Saving...' : 'Save'}
          </button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default AiEmailAssistant;
