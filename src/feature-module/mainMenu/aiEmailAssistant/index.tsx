import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import './AiEmailAssistant.css';

interface AiEmail {
  _id: string;
  from: string;
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
        <div className='page-header d-flex justify-content-between align-items-center'>
          <div className='page-title'>
            <h4>AI Email Assistant</h4>
            <h6>Review and manage AI-generated email responses</h6>
          </div>
          <button
            className='btn btn-outline-primary'
            onClick={() => setShowSettings(true)}
          >
            <i className='ti ti-settings' /> Settings
          </button>
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
                          <strong>{email.from}</strong>
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

      {/* Email detail modal */}
      {selected && (
        <div className='modal-overlay' onClick={closeEmail}>
          <div
            className='modal'
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 720,
              width: '90%',
              background: '#fff',
              borderRadius: 8,
              padding: 24,
            }}
          >
            <div className='d-flex justify-content-between align-items-start mb-3'>
              <h4 className='mb-0'>Review & Send</h4>
              <button className='btn btn-sm btn-light' onClick={closeEmail}>
                ✕
              </button>
            </div>

            <p className='mb-1'>
              <strong>From:</strong> {selected.from}
            </p>
            <p className='mb-1'>
              <strong>To:</strong> {selected.to || '-'}
            </p>
            <p className='mb-1'>
              <strong>Subject:</strong> {selected.subject || '(none)'}
            </p>
            <p className='mb-1'>
              <strong>Category:</strong> {selected.category} (
              {selected.confidence}
              %)
            </p>
            {selected.reviewReason && (
              <p className='mb-1 text-muted'>
                <strong>Reason:</strong> {selected.reviewReason}
              </p>
            )}

            <hr />

            <h6>Original message</h6>
            <div
              style={{
                maxHeight: 180,
                overflow: 'auto',
                background: '#f7f7f7',
                padding: 12,
                borderRadius: 4,
                whiteSpace: 'pre-wrap',
                fontSize: 13,
              }}
            >
              {selected.body}
            </div>

            <hr />

            <h6>AI draft (editable)</h6>
            <textarea
              rows={10}
              value={editedDraft}
              onChange={(e) => setEditedDraft(e.target.value)}
              style={{ width: '100%', fontFamily: 'inherit' }}
            />

            <div className='d-flex justify-content-end gap-2 mt-3'>
              <button
                className='btn btn-outline-danger'
                onClick={handleReject}
                disabled={sending || selected.status === 'sent'}
              >
                Reject
              </button>
              <button
                className='btn btn-primary'
                onClick={handleManualSend}
                disabled={sending || selected.status === 'sent'}
              >
                {sending
                  ? 'Sending...'
                  : selected.status === 'sent'
                    ? 'Already sent'
                    : 'Approve & Send'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings modal */}
      {showSettings && settings && (
        <div className='modal-overlay' onClick={() => setShowSettings(false)}>
          <div
            className='modal'
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 560,
              width: '90%',
              background: '#fff',
              borderRadius: 8,
              padding: 24,
            }}
          >
            <h4>AI Assistant Settings</h4>

            <div className='form-check form-switch mb-2'>
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
            </div>

            <div className='mb-3'>
              <label className='form-label'>
                Allowed automatic categories (empty = allow all except blocked)
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
            </div>

            <div className='d-flex justify-content-end gap-2'>
              <button
                className='btn btn-outline-secondary'
                onClick={() => setShowSettings(false)}
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AiEmailAssistant;
