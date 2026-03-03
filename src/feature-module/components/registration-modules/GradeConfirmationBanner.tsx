import React, { useEffect, useState } from 'react';
import {
  ALL_GRADES,
  GRADE_LABELS,
  getGradeLabel,
} from '../../constants/gradeConstants';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GradeConfirmationBannerProps {
  /** Numeric key used by the parent to track confirmed state per row */
  playerIndex: number;
  player: {
    dob: string;
    grade: string;
    isGradeOverridden?: boolean;
    fullName?: string;
  };
  /** Whether the parent has recorded this grade as confirmed */
  gradeConfirmed: boolean;
  /** Called when the user clicks "Yes, this grade is correct" */
  onConfirm: () => void;
  /**
   * Called when the user clicks "No, let me adjust".
   * Use this to set isGradeOverridden = true on the player object so the
   * parent knows not to recalculate grade from DOB on future changes.
   */
  onAdjust: () => void;
  /** Called whenever the grade value should change */
  onChange: (value: string) => void;
  validationError?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

const GradeConfirmationBanner: React.FC<GradeConfirmationBannerProps> = ({
  playerIndex,
  player,
  gradeConfirmed,
  onConfirm,
  onAdjust,
  onChange,
  validationError,
}) => {
  const [adjustMode, setAdjustMode] = useState(false);
  const [animate, setAnimate] = useState(false);

  // Slide-in animation fires each time a new auto-calculated grade appears
  useEffect(() => {
    if (player.dob && player.grade && !gradeConfirmed) {
      setAnimate(false);
      const t = setTimeout(() => setAnimate(true), 30);
      return () => clearTimeout(t);
    }
  }, [player.dob, player.grade, gradeConfirmed]);

  // Reset local adjust mode whenever the parent re-opens confirmation
  // (e.g. parent changed DOB which cleared gradeConfirmed)
  useEffect(() => {
    if (!gradeConfirmed) setAdjustMode(false);
  }, [gradeConfirmed]);

  const gradeDropdown = (showConfirmButtons: boolean) => (
    <div className='mb-3'>
      <label className='form-label'>
        Grade <span className='text-danger'>*</span>
      </label>
      <select
        className={`form-control ${validationError ? 'is-invalid' : ''}`}
        value={player.grade}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value=''>Select Grade</option>
        {ALL_GRADES.map((g) => (
          <option key={g} value={g}>
            {GRADE_LABELS[g]}
          </option>
        ))}
      </select>

      {showConfirmButtons && (
        <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
          <button
            type='button'
            className='btn btn-sm btn-success'
            onClick={onConfirm}
            disabled={!player.grade}
          >
            ✓ Confirm this grade
          </button>
          <button
            type='button'
            className='btn btn-sm btn-outline-secondary'
            onClick={() => setAdjustMode(false)}
          >
            Cancel
          </button>
        </div>
      )}

      {validationError && (
        <div
          className={
            showConfirmButtons ? 'text-danger small mt-1' : 'invalid-feedback'
          }
        >
          {validationError}
        </div>
      )}
    </div>
  );

  // ── Case 1: No DOB yet — plain dropdown, no confirmation needed ──────────────
  if (!player.dob) return gradeDropdown(false);

  // ── Case 2: Confirmed — show compact green badge ─────────────────────────────
  if (gradeConfirmed) {
    return (
      <div className='mb-3'>
        <label className='form-label'>Grade</label>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '9px 14px',
            background: '#f0fdf4',
            border: '1px solid #86efac',
            borderRadius: '8px',
          }}
        >
          <span style={{ color: '#16a34a', fontSize: '18px' }}>✓</span>
          <span style={{ fontWeight: 600, color: '#15803d' }}>
            {getGradeLabel(player.grade)}
          </span>
          <button
            type='button'
            onClick={() => {
              setAdjustMode(true);
              onAdjust();
            }}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              color: '#6b7280',
              fontSize: '12px',
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: 0,
            }}
          >
            Change grade
          </button>
        </div>
      </div>
    );
  }

  // ── Case 3: Manual adjust mode — dropdown + confirm/cancel ──────────────────
  if (adjustMode || player.isGradeOverridden) return gradeDropdown(true);

  // ── Case 4: DOB entered, grade auto-calculated — prompt for confirmation ─────
  return (
    <div className='mb-3'>
      <label className='form-label'>
        Grade <span className='text-danger'>*</span>
      </label>

      <div
        style={{
          opacity: animate ? 1 : 0,
          transform: animate ? 'translateY(0)' : 'translateY(-6px)',
          transition: 'opacity 0.25s ease, transform 0.25s ease',
          border: '2px solid #f59e0b',
          borderRadius: '10px',
          overflow: 'hidden',
          boxShadow: '0 2px 12px rgba(245,158,11,0.15)',
        }}
      >
        {/* Header stripe */}
        <div
          style={{
            background: '#fffbeb',
            borderBottom: '1px solid #fde68a',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span style={{ fontSize: '18px' }}>⚠️</span>
          <span
            style={{
              fontWeight: 700,
              fontSize: '13px',
              color: '#92400e',
              letterSpacing: '0.02em',
              textTransform: 'uppercase',
            }}
          >
            Please verify this grade
          </span>
        </div>

        {/* Body */}
        <div style={{ background: '#fffdf5', padding: '14px 16px' }}>
          <p
            style={{
              margin: '0 0 12px',
              fontSize: '14px',
              color: '#374151',
              lineHeight: '1.5',
            }}
          >
            Based on the date of birth, we calculated{' '}
            <strong style={{ color: '#1d4ed8', fontSize: '15px' }}>
              {getGradeLabel(player.grade)}
            </strong>
            . Some children start school earlier or later than typical.{' '}
            <strong>Is this the correct grade for this season?</strong>
          </p>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type='button'
              onClick={onConfirm}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: '#16a34a',
                color: '#fff',
                border: 'none',
                borderRadius: '7px',
                padding: '9px 18px',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
                boxShadow: '0 1px 4px rgba(22,163,74,0.3)',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.background =
                  '#15803d')
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.background =
                  '#16a34a')
              }
            >
              ✓ Yes, {getGradeLabel(player.grade)} is correct
            </button>

            <button
              type='button'
              onClick={() => {
                setAdjustMode(true);
                onAdjust();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: '#fff',
                color: '#374151',
                border: '1.5px solid #d1d5db',
                borderRadius: '7px',
                padding: '9px 18px',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'border-color 0.15s, background 0.15s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor =
                  '#9ca3af';
                (e.currentTarget as HTMLButtonElement).style.background =
                  '#f9fafb';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor =
                  '#d1d5db';
                (e.currentTarget as HTMLButtonElement).style.background =
                  '#fff';
              }}
            >
              ✏️ No, let me select the correct grade
            </button>
          </div>
        </div>
      </div>

      {validationError && (
        <div className='text-danger small mt-2'>
          <i className='ti ti-alert-circle me-1'></i>
          {validationError}
        </div>
      )}
    </div>
  );
};

export default GradeConfirmationBanner;
