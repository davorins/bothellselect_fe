// DuplicatePlayerModal.tsx
import React, { useState } from 'react';

export type DuplicateAction = 'link' | 'merge' | 'abandon';

export interface DuplicatePlayerInfo {
  playerId: string;
  playerName: string;
  grade: string;
  dob: string;
  existingParentId: string;
  existingParentName: string;
  existingParentEmail: string;
  confidenceScore?: number;
  isExactMatch?: boolean;
}

export interface BulkDuplicateInfo {
  players: DuplicatePlayerInfo[];
  allSameParent: boolean;
  parentName?: string;
  parentEmail?: string;
}

// For single player compatibility
export interface MatchedPlayerInfo extends DuplicatePlayerInfo {}

interface Props {
  // Bulk props (used when duplicateInfo is provided)
  duplicateInfo?: BulkDuplicateInfo;
  // Single player props (used for backward compatibility)
  matchedPlayer?: MatchedPlayerInfo;
  newParentId: string;
  newParentEmail: string;
  authToken: string;
  // Bulk actions
  onLinkAll?: (playerIds: string[]) => Promise<void>;
  onMergeAll?: () => Promise<void>;
  onProceedAsNewAll?: () => Promise<void>;
  // Single player actions
  onLink?: (playerId: string) => Promise<void>;
  onMergeSent?: () => void;
  onProceedAsNew?: () => Promise<void>;
  // Common actions
  onAbandon: () => Promise<void>;
  onClose: () => void;
  // Optional for single player
  confidenceScore?: number;
  isExactMatch?: boolean;
}

type Screen =
  | 'options'
  | 'confirm-link'
  | 'confirm-merge'
  | 'confirm-proceed'
  | 'confirm-abandon'
  | 'done-link'
  | 'done-merge'
  | 'done-proceed'
  | 'done-abandon';

const API_BASE = process.env.REACT_APP_API_BASE_URL;

const DuplicatePlayerModal: React.FC<Props> = ({
  duplicateInfo,
  matchedPlayer,
  newParentId,
  newParentEmail,
  authToken,
  onLinkAll,
  onMergeAll,
  onProceedAsNewAll,
  onLink,
  onMergeSent,
  onProceedAsNew,
  onAbandon,
  onClose,
  confidenceScore,
  isExactMatch,
}) => {
  const [screen, setScreen] = useState<Screen>('options');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Determine if this is bulk mode or single mode
  const isBulkMode = !!duplicateInfo && duplicateInfo.players.length > 0;
  const players = isBulkMode
    ? duplicateInfo!.players
    : matchedPlayer
      ? [matchedPlayer]
      : [];
  const allSameParent = isBulkMode ? duplicateInfo!.allSameParent : true;
  const parentName = isBulkMode
    ? duplicateInfo!.parentName
    : matchedPlayer?.existingParentName;
  const parentEmail = isBulkMode
    ? duplicateInfo!.parentEmail
    : matchedPlayer?.existingParentEmail;

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${authToken}`,
  };

  const handleLinkAll = async () => {
    setLoading(true);
    setError('');
    try {
      const playerIds = players.map((p) => p.playerId);
      if (onLinkAll) {
        const res = await fetch(`${API_BASE}/players/link-multiple-to-parent`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ playerIds, newParentId }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to link players');
        }
        await onLinkAll(playerIds);
      } else if (onLink && players[0]) {
        await onLink(players[0].playerId);
      }
      setScreen('done-link');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMergeAll = async () => {
    setLoading(true);
    setError('');
    try {
      if (onMergeAll && players[0]) {
        const res = await fetch(`${API_BASE}/parents/request-merge-bulk`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            existingParentId: players[0].existingParentId,
            newParentId,
            playerIds: players.map((p) => p.playerId),
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to send merge request');
        }
        await onMergeAll();
      } else if (onMergeSent) {
        onMergeSent();
      }
      setScreen('done-merge');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleProceedAsNewAll = async () => {
    setLoading(true);
    setError('');
    try {
      if (onProceedAsNewAll) {
        await onProceedAsNewAll();
      } else if (onProceedAsNew) {
        await onProceedAsNew();
      }
      setScreen('done-proceed');
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
      await onAbandon();
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
      <div className='modal-dialog modal-dialog-centered modal-lg'>
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
                    {players.length} Player{players.length !== 1 ? 's' : ''}{' '}
                    Already Registered
                  </h5>
                </div>
              </div>

              <div className='modal-body'>
                <p className='text-muted mb-3' style={{ fontSize: 13 }}>
                  The following player{players.length !== 1 ? 's are' : ' is'}{' '}
                  already linked to another account. Choose how to proceed for
                  all players.
                </p>

                {/* Players list */}
                <div className='border rounded-2 bg-light mb-4 p-3'>
                  {players.map((player, idx) => (
                    <div
                      key={player.playerId}
                      className={`d-flex align-items-center gap-3 ${idx > 0 ? 'mt-2 pt-2 border-top' : ''}`}
                    >
                      <div
                        className='avatar avatar-md bg-primary-transparent text-primary fw-semibold'
                        style={{ fontSize: 13, minWidth: 40 }}
                      >
                        {player.playerName
                          .split(' ')
                          .map((p) => p[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2)}
                      </div>
                      <div className='flex-fill'>
                        <p className='mb-0 fw-semibold'>{player.playerName}</p>
                        <p className='mb-0 text-muted' style={{ fontSize: 12 }}>
                          Grade {player.grade}
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
                          {player.existingParentName}
                        </p>
                      </div>
                    </div>
                  ))}

                  {allSameParent && parentName && (
                    <div className='mt-3 pt-2 border-top'>
                      <p className='mb-0 text-muted small'>
                        <i className='ti ti-info-circle me-1'></i>
                        All players belong to the same account:{' '}
                        <strong>{parentName}</strong> ({parentEmail})
                      </p>
                    </div>
                  )}
                </div>

                {/* Option 1 — Link All */}
                <div
                  className='d-flex align-items-start gap-3 p-3 border rounded-2 mb-2'
                  style={{ cursor: 'pointer' }}
                  role='button'
                  onClick={handleLinkAll}
                >
                  <span className='avatar avatar-sm bg-info-transparent text-info flex-shrink-0 mt-1'>
                    <i className='ti ti-link fs-16' />
                  </span>
                  <div>
                    <p className='mb-1 fw-semibold' style={{ fontSize: 14 }}>
                      Link all players to my account
                    </p>
                    <p className='mb-0 text-muted' style={{ fontSize: 12 }}>
                      Both accounts keep separate logins. All {players.length}{' '}
                      player{players.length !== 1 ? 's' : ''} will be linked.
                    </p>
                  </div>
                </div>

                {/* Option 2 — Merge */}
                {allSameParent && (
                  <div
                    className='d-flex align-items-start gap-3 p-3 border rounded-2 mb-2'
                    style={{ cursor: 'pointer' }}
                    role='button'
                    onClick={handleMergeAll}
                  >
                    <span className='avatar avatar-sm bg-warning-transparent text-warning flex-shrink-0 mt-1'>
                      <i className='ti ti-arrows-join fs-16' />
                    </span>
                    <div>
                      <p className='mb-1 fw-semibold' style={{ fontSize: 14 }}>
                        Request account merge
                      </p>
                      <p className='mb-0 text-muted' style={{ fontSize: 12 }}>
                        Send a request to {parentName} to combine both accounts
                        into one.
                      </p>
                    </div>
                  </div>
                )}

                {/* Option 3 — Proceed as New */}
                <div
                  className='d-flex align-items-start gap-3 p-3 border rounded-2 mb-2'
                  style={{ cursor: 'pointer' }}
                  role='button'
                  onClick={handleProceedAsNewAll}
                >
                  <span className='avatar avatar-sm bg-secondary-transparent text-secondary flex-shrink-0 mt-1'>
                    <i className='ti ti-user-plus fs-16' />
                  </span>
                  <div>
                    <p className='mb-1 fw-semibold' style={{ fontSize: 14 }}>
                      Create as new players (different people)
                    </p>
                    <p className='mb-0 text-muted' style={{ fontSize: 12 }}>
                      Create new player accounts for all.
                    </p>
                  </div>
                </div>

                {/* Option 4 — Abandon */}
                <div
                  className='d-flex align-items-start gap-3 p-3 border rounded-2 mb-0'
                  style={{ cursor: 'pointer' }}
                  role='button'
                  onClick={handleAbandon}
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

          {/* Done screens */}
          {screen === 'done-link' && (
            <div className='modal-body text-center py-5'>
              <span className='avatar avatar-lg bg-success-transparent text-success mb-3'>
                <i className='ti ti-check fs-24' />
              </span>
              <h5>Players linked successfully!</h5>
              <p className='text-muted' style={{ fontSize: 13 }}>
                {players.length} player
                {players.length !== 1 ? 's have' : ' has'} been linked.
              </p>
              <button className='btn btn-success btn-sm' onClick={onClose}>
                Continue
              </button>
            </div>
          )}

          {screen === 'done-merge' && (
            <div className='modal-body text-center py-5'>
              <span className='avatar avatar-lg bg-warning-transparent text-warning mb-3'>
                <i className='ti ti-mail fs-24' />
              </span>
              <h5>Merge request sent!</h5>
              <p className='text-muted' style={{ fontSize: 13 }}>
                An email was sent to {parentEmail}. You'll be notified once they
                accept.
              </p>
              <button className='btn btn-primary btn-sm mt-2' onClick={onClose}>
                Go to Dashboard
              </button>
            </div>
          )}

          {screen === 'done-proceed' && (
            <div className='modal-body text-center py-5'>
              <span className='avatar avatar-lg bg-success-transparent text-success mb-3'>
                <i className='ti ti-check fs-24' />
              </span>
              <h5>New players created!</h5>
              <p className='text-muted' style={{ fontSize: 13 }}>
                {players.length} new player
                {players.length !== 1 ? 's have' : ' has'} been created.
              </p>
              <button className='btn btn-success btn-sm' onClick={onClose}>
                Continue to payment
              </button>
            </div>
          )}

          {screen === 'done-abandon' && (
            <div className='modal-body text-center py-5'>
              <span className='avatar avatar-lg bg-danger-transparent text-danger mb-3'>
                <i className='ti ti-trash fs-24' />
              </span>
              <h5>Account deleted</h5>
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
