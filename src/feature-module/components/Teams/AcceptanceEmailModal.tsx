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

  // ── Builds payment rows for the HTML preview ─────────────────────────────
  const buildPaymentRowsHtml = () => {
    let html = '';
    if (paymentType === 'square' || paymentType === 'both') {
      html += `<tr><td style="padding:10px 0;border-bottom:1px solid #eee;">
        <strong>Square</strong><br/>
        <a href="${squareLink || '#'}" style="color:#594230;word-break:break-all;">${squareLink || '[Square link]'}</a>
      </td></tr>`;
    }
    if (paymentType === 'zelle' || paymentType === 'both') {
      html += `<tr><td style="padding:10px 0;border-bottom:1px solid #eee;">
        <strong>Zelle</strong><br/>
        <span style="color:#333;">${zelleInfo || '[Zelle info]'}</span>
      </td></tr>`;
    }
    return html;
  };

  // ── HTML email preview — matches what parents will actually receive ───────
  const buildPreview = () => `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:30px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">
    <div style="background:#f3f4f6;padding:30px 20px;text-align:center;">
      <img src="https://partizanhoops.com/assets/img/logo.png" alt="Partizan Basketball"
           style="max-width:160px;height:auto;margin-bottom:16px;" />
      <h1 style="margin:0;color:#000;font-size:24px;">Congratulations!</h1>
            <p style="margin:8px 0 0;color:rgba(0,0,0,0.85);font-size:15px;">
              Your child has been accepted to join the Partizan Family!
            </p>
    </div>
    <div style="padding:30px 24px;">
      <p style="font-size:16px;color:#333;margin-top:0;">Dear Parent/Guardian,</p>
      <p style="font-size:15px;color:#444;line-height:1.7;">
        We are happy to inform you that your child has been selected to join the team! We look forward to a successful season and your child improving their basketball skills, basketball IQ, and improving their leadership skills as well.
      </p>
      <div style="background:#fff8e1;border-left:4px solid #f59e0b;padding:16px;border-radius:4px;margin:24px 0;">
        <h3 style="margin:0 0 8px;color:#92400e;font-size:16px;">⚠️ Action Required — Payment Deadline</h3>
        <p style="margin:0;color:#78350f;font-size:14px;line-height:1.6;">
          To secure your child's spot on the team, payment must be completed within
          <strong>${paymentDeadlineHours} hour${paymentDeadlineHours !== 1 ? 's' : ''}</strong>
          of receiving this email.
        </p>
      </div>
      <h3 style="color:#594230;font-size:16px;margin-bottom:8px;">Payment Options</h3>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;overflow:hidden;">
        <tbody>${buildPaymentRowsHtml()}</tbody>
      </table>
      ${
        additionalInfo.trim()
          ? `
      <div style="background:#f0f4f8;padding:15px;border-radius:5px;margin:20px 0;border-left:4px solid #594230;">
        <h3 style="margin-top:0;color:#594230;">Additional Information</h3>
        <p style="margin:0;white-space:pre-line;color:#333;">${additionalInfo.trim()}</p>
      </div>`
          : ''
      }
      <p style="font-size:14px;color:#555;margin-top:24px;">
        If you have any questions please reach out at
        <a href="mailto:partizanhoops@proton.me" style="color:#594230;">partizanhoops@proton.me</a>.
      </p>
      <p style="font-size:15px;font-weight:bold;color:#333;">We look forward to a great season ahead!</p>
      <p style="font-size:14px;color:#555;margin-bottom:0;">
        Best regards,<br/>
        <strong>${teamDisplayName} Coaching Staff</strong><br/>
        Partizan Basketball
      </p>
    </div>
    <div style="background:#f3f4f6;padding:16px 24px;text-align:center;font-size:12px;color:#6b7280;">
      <p style="margin:0;">Partizan Basketball &nbsp;|&nbsp; partizanhoops@proton.me</p>
    </div>
  </div>
</body>
</html>`;

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
                  Live preview of the email parents will receive.{' '}
                  <strong>[Player Name]</strong> will be replaced with each
                  player's actual name.
                </div>
                <iframe
                  srcDoc={buildPreview()}
                  title='Email Preview'
                  style={{
                    width: '100%',
                    height: '520px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    background: '#fff',
                  }}
                />
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
