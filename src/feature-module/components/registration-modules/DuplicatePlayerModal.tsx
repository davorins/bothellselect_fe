import React, { useState } from 'react';

export type DuplicateAction = 'link' | 'merge' | 'abandon';

export interface MatchedPlayerInfo {
  playerId: string;
  playerName: string;
  grade: string;
  dob: string;
  existingParentId: string;
  existingParentName: string;
  existingParentEmail: string; // already masked by backend
}

interface Props {
  matchedPlayer: MatchedPlayerInfo;
  newParentId: string;
  newParentEmail: string;
  authToken: string;
  onLink: (playerId: string) => Promise<void>;
  onMergeSent: () => void;
  onAbandon: () => Promise<void>;
  onClose: () => void;
}

type Screen =
  | 'options'
  | 'confirm-link'
  | 'confirm-merge'
  | 'confirm-abandon'
  | 'done-link'
  | 'done-merge'
  | 'done-abandon';

const API_BASE = process.env.REACT_APP_API_BASE_URL;

const DuplicatePlayerModal: React.FC<Props> = ({
  matchedPlayer,
  newParentId,
  newParentEmail,
  authToken,
  onLink,
  onMergeSent,
  onAbandon,
  onClose,
}) => {
  const [screen, setScreen] = useState<Screen>('options');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const initials = matchedPlayer.playerName
    .split(' ')
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${authToken}`,
  };

  const handleLink = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/players/link-to-parent`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          playerId: matchedPlayer.playerId,
          newParentId,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to link player');
      }
      await onLink(matchedPlayer.playerId);
      setScreen('done-link');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMerge = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/parents/request-merge`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          existingParentId: matchedPlayer.existingParentId,
          newParentId,
          playerId: matchedPlayer.playerId,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send merge request');
      }
      onMergeSent();
      setScreen('done-merge');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAbandon = async () => {
    setLoading(true);
    setError('');
    try {
      await onAbandon(); // parent calls DELETE /parent/:id
      setScreen('done-abandon');
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  };

  return (
    <div
      className='modal show d-block'
      tabIndex={-1}
      style={{ background: 'rgba(0,0,0,0.5)', zIndex: 1055 }}
    >
      <div className='modal-dialog modal-dialog-centered'>
        <div className='modal-content'>
          {/* ── Options screen ──────────────────────────────────────────── */}
          {screen === 'options' && (
            <>
              <div className='modal-header border-0 pb-0'>
                <div className='d-flex align-items-center gap-2'>
                  <span className='avatar avatar-sm bg-warning-transparent text-warning flex-shrink-0'>
                    <i className='ti ti-alert-triangle fs-16' />
                  </span>
                  <h5 className='modal-title mb-0'>
                    Player already registered
                  </h5>
                </div>
              </div>

              <div className='modal-body'>
                <p className='text-muted mb-3' style={{ fontSize: 13 }}>
                  This player is already linked to another account. Choose how
                  to proceed.
                </p>

                {/* Player chip */}
                <div className='d-flex align-items-center gap-3 p-3 border rounded-2 bg-light mb-4'>
                  <div
                    className='avatar avatar-md bg-primary-transparent text-primary fw-semibold'
                    style={{ fontSize: 13, minWidth: 40 }}
                  >
                    {initials}
                  </div>
                  <div className='flex-fill'>
                    <p className='mb-0 fw-semibold'>
                      {matchedPlayer.playerName}
                    </p>
                    <p className='mb-0 text-muted' style={{ fontSize: 12 }}>
                      Grade {matchedPlayer.grade}
                    </p>
                  </div>
                  <div className='text-end'>
                    <span
                      className='badge bg-warning text-dark'
                      style={{ fontSize: 11 }}
                    >
                      Another account
                    </span>
                    <p
                      className='mb-0 text-muted mt-1'
                      style={{ fontSize: 11 }}
                    >
                      {matchedPlayer.existingParentName}
                    </p>
                  </div>
                </div>

                {/* Option 1 — Link */}
                <div
                  className='d-flex align-items-start gap-3 p-3 border rounded-2 mb-2'
                  style={{ cursor: 'pointer' }}
                  role='button'
                  onClick={() => setScreen('confirm-link')}
                >
                  <span className='avatar avatar-sm bg-info-transparent text-info flex-shrink-0 mt-1'>
                    <i className='ti ti-link fs-16' />
                  </span>
                  <div>
                    <p className='mb-1 fw-semibold' style={{ fontSize: 14 }}>
                      Link player to my account
                    </p>
                    <p className='mb-0 text-muted' style={{ fontSize: 12 }}>
                      Both accounts keep separate logins and can manage this
                      player.
                    </p>
                  </div>
                </div>

                {/* Option 2 — Merge */}
                <div
                  className='d-flex align-items-start gap-3 p-3 border rounded-2 mb-2'
                  style={{ cursor: 'pointer' }}
                  role='button'
                  onClick={() => setScreen('confirm-merge')}
                >
                  <span className='avatar avatar-sm bg-warning-transparent text-warning flex-shrink-0 mt-1'>
                    <i className='ti ti-arrows-join fs-16' />
                  </span>
                  <div>
                    <p className='mb-1 fw-semibold' style={{ fontSize: 14 }}>
                      Request account merge
                    </p>
                    <p className='mb-0 text-muted' style={{ fontSize: 12 }}>
                      Send a request to the other parent to combine both
                      accounts into one.
                    </p>
                  </div>
                </div>

                {/* Option 3 — Abandon */}
                <div
                  className='d-flex align-items-start gap-3 p-3 border rounded-2 mb-0'
                  style={{ cursor: 'pointer' }}
                  role='button'
                  onClick={() => setScreen('confirm-abandon')}
                >
                  <span className='avatar avatar-sm bg-danger-transparent text-danger flex-shrink-0 mt-1'>
                    <i className='ti ti-x fs-16' />
                  </span>
                  <div>
                    <p className='mb-1 fw-semibold' style={{ fontSize: 14 }}>
                      Cancel registration
                    </p>
                    <p className='mb-0 text-muted' style={{ fontSize: 12 }}>
                      Stop here and delete the account that was just created.
                    </p>
                  </div>
                </div>

                {error && (
                  <div
                    className='alert alert-danger mt-3 mb-0 py-2'
                    style={{ fontSize: 13 }}
                  >
                    <i className='ti ti-alert-circle me-2' />
                    {error}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── Confirm link ─────────────────────────────────────────────── */}
          {screen === 'confirm-link' && (
            <>
              <div className='modal-header border-0 pb-0'>
                <div className='d-flex align-items-center gap-2'>
                  <span className='avatar avatar-sm bg-info-transparent text-info flex-shrink-0'>
                    <i className='ti ti-link fs-16' />
                  </span>
                  <h5 className='modal-title mb-0'>
                    Link player to your account
                  </h5>
                </div>
              </div>
              <div className='modal-body'>
                <p className='text-muted mb-3' style={{ fontSize: 13 }}>
                  <strong>{matchedPlayer.playerName}</strong> will appear in
                  both accounts. Each parent keeps their own login and can
                  manage registrations independently.
                </p>
                <div
                  className='alert alert-info py-2 mb-3'
                  style={{ fontSize: 13 }}
                >
                  <i className='ti ti-info-circle me-2' />
                  The other account ({matchedPlayer.existingParentEmail}) will
                  not be notified of this action.
                </div>
                {error && (
                  <div
                    className='alert alert-danger py-2 mb-0'
                    style={{ fontSize: 13 }}
                  >
                    <i className='ti ti-alert-circle me-2' />
                    {error}
                  </div>
                )}
              </div>
              <div className='modal-footer border-0 pt-0 gap-2'>
                <button
                  className='btn btn-outline-secondary btn-sm'
                  onClick={() => {
                    setError('');
                    setScreen('options');
                  }}
                  disabled={loading}
                >
                  Back
                </button>
                <button
                  className='btn btn-info btn-sm text-white'
                  onClick={handleLink}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className='spinner-border spinner-border-sm me-1' />
                      Linking…
                    </>
                  ) : (
                    'Confirm link'
                  )}
                </button>
              </div>
            </>
          )}

          {/* ── Confirm merge ─────────────────────────────────────────────── */}
          {screen === 'confirm-merge' && (
            <>
              <div className='modal-header border-0 pb-0'>
                <div className='d-flex align-items-center gap-2'>
                  <span className='avatar avatar-sm bg-warning-transparent text-warning flex-shrink-0'>
                    <i className='ti ti-arrows-join fs-16' />
                  </span>
                  <h5 className='modal-title mb-0'>Request account merge</h5>
                </div>
              </div>
              <div className='modal-body'>
                <p className='text-muted mb-3' style={{ fontSize: 13 }}>
                  A merge request will be sent to{' '}
                  <strong>{matchedPlayer.existingParentEmail}</strong>. Until
                  they accept, {matchedPlayer.playerName} remains linked only to
                  their account.
                </p>
                <div
                  className='alert alert-warning py-2 mb-0'
                  style={{ fontSize: 13 }}
                >
                  <i className='ti ti-mail me-2' />
                  You will be notified by email once they respond.
                </div>
                {error && (
                  <div
                    className='alert alert-danger py-2 mt-2 mb-0'
                    style={{ fontSize: 13 }}
                  >
                    <i className='ti ti-alert-circle me-2' />
                    {error}
                  </div>
                )}
              </div>
              <div className='modal-footer border-0 pt-0 gap-2'>
                <button
                  className='btn btn-outline-secondary btn-sm'
                  onClick={() => {
                    setError('');
                    setScreen('options');
                  }}
                  disabled={loading}
                >
                  Back
                </button>
                <button
                  className='btn btn-warning btn-sm'
                  onClick={handleMerge}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className='spinner-border spinner-border-sm me-1' />
                      Sending…
                    </>
                  ) : (
                    'Send merge request'
                  )}
                </button>
              </div>
            </>
          )}

          {/* ── Confirm abandon ───────────────────────────────────────────── */}
          {screen === 'confirm-abandon' && (
            <>
              <div className='modal-header border-0 pb-0'>
                <div className='d-flex align-items-center gap-2'>
                  <span className='avatar avatar-sm bg-danger-transparent text-danger flex-shrink-0'>
                    <i className='ti ti-alert-circle fs-16' />
                  </span>
                  <h5 className='modal-title mb-0'>
                    Cancel and delete your account?
                  </h5>
                </div>
              </div>
              <div className='modal-body'>
                <div
                  className='alert alert-danger py-2 mb-0'
                  style={{ fontSize: 13 }}
                >
                  <p className='mb-1'>
                    Your newly created account (
                    <strong>{newParentEmail}</strong>) will be permanently
                    deleted. No player data will be affected.
                  </p>
                  <p className='mb-0'>This action cannot be undone.</p>
                </div>
                {error && (
                  <div
                    className='alert alert-danger py-2 mt-2 mb-0'
                    style={{ fontSize: 13 }}
                  >
                    <i className='ti ti-alert-circle me-2' />
                    {error}
                  </div>
                )}
              </div>
              <div className='modal-footer border-0 pt-0 gap-2'>
                <button
                  className='btn btn-outline-secondary btn-sm'
                  onClick={() => {
                    setError('');
                    setScreen('options');
                  }}
                  disabled={loading}
                >
                  Go back
                </button>
                <button
                  className='btn btn-danger btn-sm'
                  onClick={handleAbandon}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className='spinner-border spinner-border-sm me-1' />
                      Deleting…
                    </>
                  ) : (
                    'Yes, delete my account'
                  )}
                </button>
              </div>
            </>
          )}

          {/* ── Done: link ───────────────────────────────────────────────── */}
          {screen === 'done-link' && (
            <div className='modal-body text-center py-5'>
              <span className='avatar avatar-lg bg-success-transparent text-success mb-3'>
                <i className='ti ti-check fs-24' />
              </span>
              <h5>Player linked successfully</h5>
              <p className='text-muted' style={{ fontSize: 13 }}>
                {matchedPlayer.playerName} now appears in your account. You can
                manage their registrations independently.
              </p>
              <button className='btn btn-success btn-sm' onClick={onClose}>
                Continue to dashboard
              </button>
            </div>
          )}

          {/* ── Done: merge sent ─────────────────────────────────────────── */}
          {screen === 'done-merge' && (
            <div className='modal-body text-center py-5'>
              <span className='avatar avatar-lg bg-warning-transparent text-warning mb-3'>
                <i className='ti ti-mail fs-24' />
              </span>
              <h5>Merge request sent</h5>
              <p className='text-muted' style={{ fontSize: 13 }}>
                An email was sent to {matchedPlayer.existingParentEmail}. You'll
                be notified once they accept. Your account is active in the
                meantime.
              </p>
              <button className='btn btn-primary btn-sm' onClick={onClose}>
                Go to my account
              </button>
            </div>
          )}

          {/* ── Done: account deleted ────────────────────────────────────── */}
          {screen === 'done-abandon' && (
            <div className='modal-body text-center py-5'>
              <span className='avatar avatar-lg bg-danger-transparent text-danger mb-3'>
                <i className='ti ti-trash fs-24' />
              </span>
              <h5>Account deleted</h5>
              <p className='text-muted' style={{ fontSize: 13 }}>
                Your account has been removed. No player records were changed.
                You can register again at any time.
              </p>
              <button
                className='btn btn-outline-secondary btn-sm'
                onClick={() => (window.location.href = '/')}
              >
                Return to home
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DuplicatePlayerModal;
