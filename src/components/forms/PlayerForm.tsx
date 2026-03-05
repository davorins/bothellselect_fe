// src/components/forms/PlayerForm.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Player } from '../../types/registration-types';
import { useDynamicFormFields } from '../../feature-module/hooks/useDynamicFormFields';
import GradeConfirmationBanner from '../../feature-module/components/registration-modules/GradeConfirmationBanner';
import PlayerFormFields from './PlayerFormFields';
import { commonHealthConditions } from '../../feature-module/constants/healthConditions';
import { getAvatarUrl, getDefaultAvatar } from '../../utils/r2Utils';
import { calculateGradeFromDOB } from '../../utils/gradeUtils'; // Add this import
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

// Define interface for health condition options
interface HealthConditionOption {
  value: string;
  label: string;
}

interface PlayerFormProps {
  player: Player;
  index: number;
  totalPlayers: number;
  onPlayerChange: (index: number, field: keyof Player, value: string) => void;
  onRemovePlayer: (index: number) => void;
  validationErrors?: Record<string, string>;
  registrationYear: number;
  parentId?: string | null;
  token?: string | null;
  onAvatarChange?: (playerId: string, avatarUrl: string) => void;
  onGradeConfirm?: (index: number) => void;
  onPlayerChangeBatch?: (index: number, fields: Partial<Player>) => void;
  hideAvatar?: boolean;
}

const PlayerForm: React.FC<PlayerFormProps> = ({
  player,
  index,
  totalPlayers,
  onPlayerChange,
  onRemovePlayer,
  validationErrors = {},
  registrationYear,
  parentId,
  token,
  onAvatarChange,
  onGradeConfirm,
  onPlayerChangeBatch,
  hideAvatar = false,
}) => {
  const [gradeConfirmed, setGradeConfirmed] = useState(false);
  const [healthConditions, setHealthConditions] = useState<
    HealthConditionOption[]
  >([]);
  const [customCondition, setCustomCondition] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  // Avatar state
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { getVisibleFields } = useDynamicFormFields('player', {
    registrationYear,
  });
  const visibleFields = getVisibleFields(player);

  // Handle player change with grade calculation
  const handlePlayerChangeWithCalculation = (
    field: keyof Player,
    value: string,
  ) => {
    if (field === 'dob' && value) {
      const calculatedGrade = calculateGradeFromDOB(value, registrationYear);
      if (calculatedGrade) {
        // Send dob + grade together in one state update to avoid stale closure
        if (onPlayerChangeBatch) {
          onPlayerChangeBatch(index, { dob: value, grade: calculatedGrade });
          return;
        }
      }
    }
    onPlayerChange(index, field, value);
  };

  // Reset grade confirmation when DOB or grade changes
  useEffect(() => {
    if (player.dob && player.grade) {
      // Reset grade confirmation when DOB changes or grade changes
      setGradeConfirmed(false);
    }
  }, [player.dob, player.grade]);

  // Parse health concerns on mount
  useEffect(() => {
    if (player.healthConcerns) {
      const parseHealthConcerns = (healthConcerns: string = '') => {
        const concerns = healthConcerns
          .split(',')
          .map((c: string) => c.trim())
          .filter(Boolean);

        const selected = concerns
          .filter((c: string) =>
            commonHealthConditions.some((hc) => hc.label === c),
          )
          .map(
            (c: string) =>
              commonHealthConditions.find((hc) => hc.label === c) ?? {
                value: 'custom',
                label: c,
              },
          );

        const custom = concerns
          .filter(
            (c: string) => !commonHealthConditions.some((hc) => hc.label === c),
          )
          .join(', ');

        return { selected, custom, hasCustom: !!custom };
      };

      const { selected, custom, hasCustom } = parseHealthConcerns(
        player.healthConcerns,
      );
      setHealthConditions(selected);
      setCustomCondition(custom);
      setShowCustomInput(hasCustom);
    }
  }, [player.healthConcerns]);

  // ── Avatar handlers (matches guardian section exactly) ───────────────────
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !parentId || !token) return;

    // For new players without _id, we need to save first
    if (!player._id) {
      alert('Please save the player first before uploading an avatar.');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    setIsAvatarUploading(true);
    try {
      const fd = new FormData();
      fd.append('avatar', file);

      const response = await axios.put(
        `${API_BASE_URL}/upload/player/${player._id}/avatar`,
        fd,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      // Notify parent component about avatar change
      if (onAvatarChange && player._id) {
        onAvatarChange(player._id, response.data.avatarUrl);
      }

      // Clear preview after successful upload (actual image will load from URL)
      setAvatarPreview(null);
    } catch (err) {
      console.error('Player avatar upload failed:', err);
      alert('Failed to upload player avatar. Please try again.');
      setAvatarPreview(null);
    } finally {
      setIsAvatarUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAvatarDelete = async () => {
    if (!player._id || !parentId || !token) return;

    setIsAvatarUploading(true);
    try {
      await axios.delete(`${API_BASE_URL}/upload/player/${player._id}/avatar`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Notify parent component about avatar deletion
      if (onAvatarChange && player._id) {
        onAvatarChange(player._id, '');
      }

      setAvatarPreview(null);
    } catch (err) {
      console.error('Player avatar delete failed:', err);
      alert('Failed to delete player avatar. Please try again.');
    } finally {
      setIsAvatarUploading(false);
    }
  };

  const handleConditionsChange = (
    selected: readonly HealthConditionOption[] | null,
  ) => {
    const arr = selected ? [...selected] : [];
    const hasCustom = arr.some(
      (c: HealthConditionOption) => c.value === 'custom',
    );
    setHealthConditions(arr);
    setShowCustomInput(hasCustom);
    updateHealthConcerns(arr, customCondition);
  };

  const handleCustomConditionChange = (value: string) => {
    setCustomCondition(value);
    updateHealthConcerns(healthConditions, value);
  };

  const updateHealthConcerns = (
    conditions: HealthConditionOption[],
    custom: string,
  ) => {
    const labels = conditions
      .filter((c: HealthConditionOption) => c.value !== 'custom')
      .map((c: HealthConditionOption) => c.label);
    let healthConcerns = labels.join(', ');
    if (custom.trim() && showCustomInput) {
      healthConcerns = healthConcerns
        ? `${healthConcerns}, ${custom.trim()}`
        : custom.trim();
    }
    onPlayerChange(index, 'healthConcerns', healthConcerns);
  };

  const handleGradeConfirm = () => {
    setGradeConfirmed(true);
    onGradeConfirm?.(index);
  };

  const handleGradeOverride = () => {
    onPlayerChange(index, 'isGradeOverridden', 'true');
    setGradeConfirmed(false);
  };

  // Helper function to get grade label
  const getGradeLabel = (grade: string): string => {
    if (!grade) return '';
    if (grade === 'PK') return 'Pre-Kindergarten';
    if (grade === 'K') return 'Kindergarten';
    const num = parseInt(grade, 10);
    if (isNaN(num)) return grade;
    const suffix =
      num === 1 ? 'st' : num === 2 ? 'nd' : num === 3 ? 'rd' : 'th';
    return `${num}${suffix} Grade`;
  };

  // Render avatar block (copied from guardian section)
  const renderAvatarBlock = () => {
    const defaultPlayerAvatar = getDefaultAvatar(
      'player',
      player.gender as 'Male' | 'Female',
    );

    const displayAvatar =
      avatarPreview ||
      (player.avatar ? getAvatarUrl(player.avatar, defaultPlayerAvatar) : null);

    const hasSavedId = !!player._id;

    return (
      <div className='d-flex align-items-center flex-wrap row-gap-3 mb-3'>
        <div className='d-flex align-items-center justify-content-center avatar avatar-xxl border border-dashed me-2 flex-shrink-0 text-dark frames'>
          {displayAvatar ? (
            <img
              src={displayAvatar}
              alt='Player avatar'
              className='img-fluid rounded'
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => {
                (e.target as HTMLImageElement).src = defaultPlayerAvatar;
              }}
            />
          ) : (
            <i className='ti ti-photo-plus fs-16' />
          )}
        </div>
        <div className='profile-upload'>
          <div className='profile-uploader d-flex align-items-center'>
            <div className='drag-upload-btn mb-3'>
              {hasSavedId ? 'Upload Photo' : 'Save player first'}
              {hasSavedId && (
                <input
                  type='file'
                  className='form-control image-sign'
                  ref={fileInputRef}
                  onChange={handleAvatarChange}
                  accept='image/jpeg, image/png, image/webp'
                  disabled={isAvatarUploading}
                />
              )}
            </div>
            {displayAvatar && hasSavedId && (
              <button
                type='button'
                className='btn btn-primary mb-3 ms-2'
                onClick={handleAvatarDelete}
                disabled={isAvatarUploading}
              >
                Remove
              </button>
            )}
          </div>
          <p className='fs-12'>
            {hasSavedId
              ? 'Upload image size 4MB, Format JPG, PNG'
              : 'Save the player first to enable avatar upload'}
          </p>
          {isAvatarUploading && (
            <div className='text-primary'>Uploading...</div>
          )}
        </div>
      </div>
    );
  };

  // Determine if we should show the grade confirmation banner
  const isOverridden =
    player.isGradeOverridden === true ||
    (player.isGradeOverridden as unknown as string) === 'true';
  const showGradeBanner =
    player.dob && player.grade && !gradeConfirmed && !isOverridden;

  return (
    <div className='mb-4'>
      {totalPlayers > 1 && (
        <div className='d-flex justify-content-between align-items-center mb-3'>
          <h6 className='text-primary'>New Player {index + 1}</h6>
          <button
            type='button'
            className='btn btn-sm btn-outline-danger'
            onClick={() => onRemovePlayer(index)}
          >
            Remove Player
          </button>
        </div>
      )}

      {/* Avatar block - matches guardian section exactly */}
      {!hideAvatar && renderAvatarBlock()}

      <PlayerFormFields
        player={player}
        onChange={handlePlayerChangeWithCalculation}
        visibleFields={visibleFields}
        errors={validationErrors}
        selectedConditions={healthConditions}
        onConditionsChange={handleConditionsChange}
        showCustomConditionInput={showCustomInput}
        customCondition={customCondition}
        onCustomConditionChange={handleCustomConditionChange}
        currentYear={registrationYear}
        isGradeOverridden={player.isGradeOverridden || false}
        onGradeOverride={handleGradeOverride}
        gradeSlot={
          showGradeBanner ? (
            <div className='mb-3'>
              <GradeConfirmationBanner
                playerIndex={index}
                player={player}
                gradeConfirmed={gradeConfirmed}
                onConfirm={handleGradeConfirm}
                onAdjust={handleGradeOverride}
                onChange={(val) => onPlayerChange(index, 'grade', val)}
                validationError={validationErrors?.grade}
              />
            </div>
          ) : null
        }
      />
    </div>
  );
};

export default PlayerForm;
