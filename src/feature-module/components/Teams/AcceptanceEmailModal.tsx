// components/Teams/AcceptanceEmailModal.tsx
import React, { useState } from 'react';

interface Player {
  _id?: string;
  id?: string;
  fullName?: string;
  name?: string;
}

export interface EmailPayload {
  additionalInfo: string;
  paymentType: 'square' | 'zelle' | 'both';
  squareLink: string;
  zelleInfo: string;
  paymentDeadlineHours: number;
}

interface AcceptanceEmailModalProps {
  team: {
    name: string;
    year?: number;
    grade?: string;
    gender?: string;
  };
  players: Player[];
  onSend: (payload: EmailPayload) => Promise<void>;
  onClose: () => void;
}

const AcceptanceEmailModal: React.FC<AcceptanceEmailModalProps> = ({
  team,
  players,
  onSend,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'compose' | 'preview'>('compose');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [paymentType, setPaymentType] = useState<'square' | 'zelle' | 'both'>(
    'square',
  );
  const [squareLink, setSquareLink] = useState('');
  const [zelleInfo, setZelleInfo] = useState('');
  const [paymentDeadlineHours, setPaymentDeadlineHours] = useState(24);
  const [sending, setSending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const teamDisplayName = `${team.name}${team.year ? ` ${team.year}` : ''}`;

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (
      (paymentType === 'square' || paymentType === 'both') &&
      !squareLink.trim()
    ) {
      errs.squareLink = 'Square payment link is required';
    }
    if (
      (paymentType === 'zelle' || paymentType === 'both') &&
      !zelleInfo.trim()
    ) {
      errs.zelleInfo = 'Zelle payment info is required';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const buildPaymentBlock = () => {
    const lines: string[] = [];
    if (paymentType === 'square' || paymentType === 'both') {
      lines.push(`Square: ${squareLink || '[Square link]'}`);
    }
    if (paymentType === 'zelle' || paymentType === 'both') {
      lines.push(`Zelle: ${zelleInfo || '[Zelle info]'}`);
    }
    return lines.join('\n');
  };

  // ── Email preview (plain-text style shown in a styled box) ───────────────
  const buildPreview =
    () => `Subject: Congratulations! Your Child Has Been Accepted to ${teamDisplayName}

Dear Parent/Guardian,

We are thrilled to inform you that your child has been officially selected to join the ${teamDisplayName} team! After careful evaluation of all tryout participants, your player demonstrated the skill, dedication, and character that makes them a perfect fit for our program.

Please take a moment to celebrate this achievement — it is well deserved!

──────────────────────────────
NEXT STEPS — ACTION REQUIRED
──────────────────────────────

To secure your child's spot on the team, payment must be completed within ${paymentDeadlineHours} hour${paymentDeadlineHours !== 1 ? 's' : ''} of receiving this email. Failure to complete payment within this window may result in the spot being offered to the next player on the waitlist.

Payment Options:
${buildPaymentBlock()}
${additionalInfo.trim() ? `\n──────────────────────────────\nADDITIONAL INFORMATION\n──────────────────────────────\n${additionalInfo.trim()}\n` : ''}
If you have any questions, please don't hesitate to reach out.

We look forward to a great season ahead!

Best regards,
${teamDisplayName} Coaching Staff`;

  const handleSend = async () => {
    if (!validate()) return;
    setSending(true);
    try {
      await onSend({
        additionalInfo,
        paymentType,
        squareLink,
        zelleInfo,
        paymentDeadlineHours,
      });
    } finally {
      setSending(false);
    }
  };

  const recipientCount = players.length;

  return (
    <div
      className='modal fade show'
      style={{
        display: 'block',
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 1050,
      }}
    >
      <div className='modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable'>
        <div className='modal-content'>
          {/* Header */}
          <div className='modal-header'>
            <div>
              <h4 className='modal-title mb-0'>
                <i className='ti ti-mail-forward me-2 text-primary' />
                Send Acceptance Email
              </h4>
              <small className='text-muted'>
                Will be sent to parents of <strong>{recipientCount}</strong>{' '}
                player{recipientCount !== 1 ? 's' : ''} on{' '}
                <strong>{teamDisplayName}</strong>
              </small>
            </div>
            <button
              type='button'
              className='btn-close custom-btn-close'
              onClick={onClose}
              disabled={sending}
              aria-label='Close'
            >
              <i className='ti ti-x' />
            </button>
          </div>

          {/* Tabs */}
          <div className='border-bottom px-3'>
            <ul className='nav nav-tabs border-0'>
              <li className='nav-item'>
                <button
                  className={`nav-link border-0 ${activeTab === 'compose' ? 'active fw-semibold' : 'text-muted'}`}
                  onClick={() => setActiveTab('compose')}
                >
                  <i className='ti ti-edit me-1' />
                  Compose
                </button>
              </li>
              <li className='nav-item'>
                <button
                  className={`nav-link border-0 ${activeTab === 'preview' ? 'active fw-semibold' : 'text-muted'}`}
                  onClick={() => setActiveTab('preview')}
                >
                  <i className='ti ti-eye me-1' />
                  Preview Email
                </button>
              </li>
            </ul>
          </div>

          <div className='modal-body'>
            {/* ── COMPOSE TAB ─────────────────────────────────────────── */}
            {activeTab === 'compose' && (
              <div>
                {/* Recipients */}
                <div className='mb-4'>
                  <label className='form-label fw-semibold'>
                    <i className='ti ti-users me-1 text-muted' />
                    Recipients
                  </label>
                  <div
                    className='border rounded p-2'
                    style={{
                      maxHeight: '100px',
                      overflowY: 'auto',
                      background: '#f8f9fa',
                    }}
                  >
                    {players.length === 0 ? (
                      <span className='text-muted small'>
                        No players on this team
                      </span>
                    ) : (
                      <div className='d-flex flex-wrap gap-1'>
                        {players.map((p, i) => {
                          const name = p.fullName || p.name || 'Unknown';
                          return (
                            <span
                              key={p._id || p.id || i}
                              className='badge bg-light text-dark border'
                            >
                              {name}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div className='form-text'>
                    Emails will be sent to the parents/guardians of each player
                    above.
                  </div>
                </div>

                {/* Payment Deadline */}
                <div className='mb-4'>
                  <label className='form-label fw-semibold'>
                    Payment Deadline <span className='text-danger'>*</span>
                  </label>
                  <div className='d-flex align-items-center gap-2'>
                    <input
                      type='number'
                      className='form-control'
                      style={{ width: '100px' }}
                      min={1}
                      max={168}
                      value={paymentDeadlineHours}
                      onChange={(e) =>
                        setPaymentDeadlineHours(Number(e.target.value))
                      }
                    />
                    <span className='text-muted'>
                      hours after receiving email
                    </span>
                  </div>
                  <div className='form-text'>
                    Default is 24 hours. Max 168 (1 week).
                  </div>
                </div>

                {/* Payment Method */}
                <div className='mb-4'>
                  <label className='form-label fw-semibold'>
                    Payment Method <span className='text-danger'>*</span>
                  </label>
                  <div className='d-flex gap-3 mb-3'>
                    {(['square', 'zelle', 'both'] as const).map((type) => (
                      <div key={type} className='form-check'>
                        <input
                          className='form-check-input'
                          type='radio'
                          id={`payment-${type}`}
                          name='paymentType'
                          checked={paymentType === type}
                          onChange={() => {
                            setPaymentType(type);
                            setErrors({});
                          }}
                        />
                        <label
                          className='form-check-label text-capitalize'
                          htmlFor={`payment-${type}`}
                        >
                          {type === 'both'
                            ? 'Both'
                            : type.charAt(0).toUpperCase() + type.slice(1)}
                        </label>
                      </div>
                    ))}
                  </div>

                  {(paymentType === 'square' || paymentType === 'both') && (
                    <div className='mb-3'>
                      <label className='form-label'>
                        Square Payment Link{' '}
                        <span className='text-danger'>*</span>
                      </label>
                      <input
                        type='url'
                        className={`form-control ${errors.squareLink ? 'is-invalid' : ''}`}
                        style={
                          errors.squareLink
                            ? { borderColor: '#dc3545' }
                            : undefined
                        }
                        placeholder='https://square.link/...'
                        value={squareLink}
                        onChange={(e) => {
                          setSquareLink(e.target.value);
                          if (errors.squareLink)
                            setErrors((prev) => ({ ...prev, squareLink: '' }));
                        }}
                      />
                      {errors.squareLink && (
                        <div className='invalid-feedback d-block'>
                          {errors.squareLink}
                        </div>
                      )}
                    </div>
                  )}

                  {(paymentType === 'zelle' || paymentType === 'both') && (
                    <div className='mb-3'>
                      <label className='form-label'>
                        Zelle Info <span className='text-danger'>*</span>
                      </label>
                      <input
                        type='text'
                        className={`form-control ${errors.zelleInfo ? 'is-invalid' : ''}`}
                        style={
                          errors.zelleInfo
                            ? { borderColor: '#dc3545' }
                            : undefined
                        }
                        placeholder='e.g. payments@club.com or (206) 555-1234'
                        value={zelleInfo}
                        onChange={(e) => {
                          setZelleInfo(e.target.value);
                          if (errors.zelleInfo)
                            setErrors((prev) => ({ ...prev, zelleInfo: '' }));
                        }}
                      />
                      {errors.zelleInfo && (
                        <div className='invalid-feedback d-block'>
                          {errors.zelleInfo}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Additional Info */}
                <div className='mb-3'>
                  <label className='form-label fw-semibold'>
                    Additional Information
                    <span className='text-muted fw-normal ms-1'>
                      (optional)
                    </span>
                  </label>
                  <textarea
                    className='form-control'
                    rows={4}
                    placeholder='e.g. First practice is Monday at 6pm. Please bring water and wear athletic gear...'
                    value={additionalInfo}
                    onChange={(e) => setAdditionalInfo(e.target.value)}
                  />
                  <div className='form-text'>
                    This will be included in a separate section at the bottom of
                    the email.
                  </div>
                </div>
              </div>
            )}

            {/* ── PREVIEW TAB ─────────────────────────────────────────── */}
            {activeTab === 'preview' && (
              <div>
                <div className='alert alert-info py-2 mb-3'>
                  <i className='ti ti-info-circle me-2' />
                  This is a preview of the email that will be sent. Each parent
                  will receive a personalized version with their child's name.
                </div>
                <div
                  className='border rounded p-4'
                  style={{
                    background: '#fafafa',
                    fontFamily: 'monospace',
                    fontSize: '13px',
                    whiteSpace: 'pre-wrap',
                    lineHeight: '1.7',
                    color: '#333',
                  }}
                >
                  {buildPreview()}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className='modal-footer'>
            <button
              type='button'
              className='btn btn-light me-2'
              onClick={onClose}
              disabled={sending}
            >
              Cancel
            </button>
            <button
              type='button'
              className='btn btn-primary d-flex align-items-center gap-2'
              onClick={handleSend}
              disabled={sending || recipientCount === 0}
            >
              {sending ? (
                <>
                  <span
                    className='spinner-border spinner-border-sm'
                    role='status'
                    aria-hidden='true'
                  />
                  Sending…
                </>
              ) : (
                <>
                  <i className='ti ti-send' />
                  Send to {recipientCount} Parent
                  {recipientCount !== 1 ? 's' : ''}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AcceptanceEmailModal;
