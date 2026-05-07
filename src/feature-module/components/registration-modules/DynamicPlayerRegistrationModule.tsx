// src/feature-module/components/registration-modules/DynamicPlayerRegistrationModule.tsx

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import { Player } from '../../../types/registration-types';
import { useDynamicFormFields } from '../../hooks/useDynamicFormFields';
import GradeConfirmationBanner from './GradeConfirmationBanner';
import PlayerFormFields from '../../../components/forms/PlayerFormFields';
import { commonHealthConditions } from '../../constants/healthConditions';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DynamicPlayerRegistrationModuleProps {
  players: Player[];
  onPlayersChange: (players: Player[]) => void;
  registrationYear: number;
  season: string;
  isExistingUser?: boolean;
  existingPlayers?: Player[];
  paidPlayers?: Player[];
  onValidationChange?: (isValid: boolean) => void;
  showCheckboxes?: boolean;
  selectedPlayerIds?: string[];
  onPlayerSelection?: (playerId: string) => void;
  onPaymentCalculation?: (playerCount: number) => void;
  onComplete?: (players: Player[]) => void;
  onBack?: () => void;
  parentId?: string;
  authToken?: string;
  maxPlayers?: number;
  allowMultiple?: boolean;
  requiresPayment?: boolean;
  hideUI?: boolean;
  onSaveComplete?: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const isSamePlayer = (p1: Player, p2: Player): boolean =>
  p1.fullName?.trim().toLowerCase() === p2.fullName?.trim().toLowerCase() &&
  p1.dob === p2.dob &&
  p1.gender === p2.gender;

const parseHealthConcerns = (healthConcerns: string = '') => {
  const concerns = healthConcerns
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean);
  const selected = concerns
    .filter((c) => commonHealthConditions.some((hc) => hc.label === c))
    .map(
      (c) =>
        commonHealthConditions.find((hc) => hc.label === c) ?? {
          value: 'custom',
          label: c,
        },
    );
  const custom = concerns
    .filter((c) => !commonHealthConditions.some((hc) => hc.label === c))
    .join(', ');
  return { selected, custom, hasCustom: !!custom };
};

// ─── Component ────────────────────────────────────────────────────────────────

const DynamicPlayerRegistrationModule: React.FC<
  DynamicPlayerRegistrationModuleProps
> = ({
  players,
  onPlayersChange,
  registrationYear,
  season,
  isExistingUser = false,
  existingPlayers = [],
  paidPlayers = [],
  onValidationChange,
  showCheckboxes = false,
  selectedPlayerIds = [],
  onPlayerSelection,
  onPaymentCalculation,
  onComplete,
  onBack,
  parentId,
  authToken,
  maxPlayers = 10,
  allowMultiple = true,
  requiresPayment = true,
  hideUI = false,
  onSaveComplete,
}) => {
  const [showNewPlayerForm, setShowNewPlayerForm] = useState(false);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gradeConfirmed, setGradeConfirmed] = useState<Record<number, boolean>>(
    {},
  );

  // ── KEY FIX: Only show validation errors after first submit attempt ─────────
  const hasAttemptedSubmitRef = useRef(false);

  const [playerHealthConditions, setPlayerHealthConditions] = useState<
    Record<number, any[]>
  >({});
  const [playerCustomConditions, setPlayerCustomConditions] = useState<
    Record<number, string>
  >({});
  const [playerShowCustomInput, setPlayerShowCustomInput] = useState<
    Record<number, boolean>
  >({});

  const isSubmittingRef = useRef(false);
  const hasSavedPlayersRef = useRef(false);
  const lastSubmitTimestampRef = useRef(0);
  const isValidatingRef = useRef(false);
  const validationTimeoutRef = useRef<NodeJS.Timeout>();
  const prevValidationKeyRef = useRef<string>('');

  const {
    getVisibleFields,
    validateField,
    processFieldValue,
    loading: fieldsLoading,
  } = useDynamicFormFields('player', { registrationYear });

  // ── Player helpers ────────────────────────────────────────────────────────────

  const unpaidExistingPlayers = useCallback(
    () =>
      existingPlayers.filter(
        (p) => !paidPlayers.some((pp) => pp._id === p._id),
      ),
    [existingPlayers, paidPlayers],
  );

  const hasUnpaidPlayers = useCallback(
    () => unpaidExistingPlayers().length > 0,
    [unpaidExistingPlayers],
  );

  const hasPaidPlayers = useCallback(
    () => paidPlayers.length > 0,
    [paidPlayers],
  );

  // ── Validation ────────────────────────────────────────────────────────────────

  const validateAllPlayers = useCallback((): boolean => {
    const errors: Record<string, string> = {};
    const hasSelectedUnpaid = selectedPlayerIds.length > 0;
    const hasNew = players.some((p) => !p._id && p.fullName?.trim());
    const hasAny = hasSelectedUnpaid || hasNew;

    if (!hasAny) {
      errors.general =
        'Please select at least one player or add a new player to continue.';
      setValidationErrors(errors);
      onValidationChange?.(false);
      return false;
    }

    if (isSubmittingRef.current || isSubmitting) {
      return true;
    }

    let newPlayersValid = true;
    players.forEach((player, index) => {
      if (!player._id) {
        const visibleFields = getVisibleFields(player);

        visibleFields.forEach((field) => {
          if (!field.isEnabled) return;
          if (!field.isRequired) {
            const value = player[field.fieldName as keyof Player];
            if (!value || (typeof value === 'string' && !value.trim())) return;
          }

          const value = player[field.fieldName as keyof Player];
          const error = validateField(field, value);
          if (error) {
            errors[`player${index}_${field.fieldName}`] = error;
            newPlayersValid = false;
          }
        });

        const hasGradeValue = player.grade && player.grade.trim();
        if (hasGradeValue && !gradeConfirmed[index]) {
          errors[`player${index}_grade`] =
            'Please confirm the grade is correct';
          newPlayersValid = false;
        }
      }
    });

    if (hasNew && !newPlayersValid) {
      errors.general =
        'Please complete all required information for new players.';
    }

    setValidationErrors((prev) => {
      if (JSON.stringify(prev) === JSON.stringify(errors)) return prev;
      return errors;
    });

    const valid = hasAny && (!hasNew || newPlayersValid);
    onValidationChange?.(valid);
    return valid;
  }, [
    players,
    selectedPlayerIds,
    gradeConfirmed,
    onValidationChange,
    getVisibleFields,
    validateField,
    isSubmitting,
  ]);

  const validationKey = useMemo(() => {
    return JSON.stringify({
      playersLength: players.length,
      newPlayersCount: players.filter((p) => !p._id).length,
      selectedCount: selectedPlayerIds.length,
      gradeConfirmedKeys: Object.keys(gradeConfirmed).length,
      playerGrades: players.map((p) => ({
        id: p._id,
        grade: p.grade,
        dob: p.dob,
      })),
    });
  }, [players, selectedPlayerIds, gradeConfirmed]);

  // ── Health conditions ─────────────────────────────────────────────────────────

  const updatePlayerHealthConcerns = useCallback(
    (index: number, conditions: any[], custom: string, showCustom: boolean) => {
      const labels = conditions
        .filter((c) => c.value !== 'custom')
        .map((c) => c.label);
      let healthConcerns = labels.join(', ');
      if (custom.trim() && showCustom) {
        healthConcerns = healthConcerns
          ? `${healthConcerns}, ${custom.trim()}`
          : custom.trim();
      }
      const updated = [...players];
      updated[index] = { ...updated[index], healthConcerns };
      onPlayersChange(updated);
    },
    [players, onPlayersChange],
  );

  const handleConditionsChange = (index: number, selected: any) => {
    const arr = selected ? [...selected] : [];
    const hasCustom = arr.some((c: any) => c.value === 'custom');
    setPlayerHealthConditions((prev) => ({ ...prev, [index]: arr }));
    setPlayerShowCustomInput((prev) => ({ ...prev, [index]: hasCustom }));
    updatePlayerHealthConcerns(
      index,
      arr,
      playerCustomConditions[index] || '',
      hasCustom,
    );
  };

  const handleCustomConditionChange = (index: number, value: string) => {
    setPlayerCustomConditions((prev) => ({ ...prev, [index]: value }));
    updatePlayerHealthConcerns(
      index,
      playerHealthConditions[index] || [],
      value,
      playerShowCustomInput[index] || false,
    );
  };

  useEffect(() => {
    players.forEach((player, index) => {
      if (!player._id && playerHealthConditions[index] === undefined) {
        const { selected, custom, hasCustom } = parseHealthConcerns(
          player.healthConcerns,
        );
        setPlayerHealthConditions((prev) => ({ ...prev, [index]: selected }));
        setPlayerCustomConditions((prev) => ({ ...prev, [index]: custom }));
        setPlayerShowCustomInput((prev) => ({ ...prev, [index]: hasCustom }));
      }
    });
  }, [players.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => {
      isSubmittingRef.current = false;
      hasSavedPlayersRef.current = false;
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, []);

  // ── KEY FIX: Only run background validation after first submit attempt ────────
  useEffect(() => {
    // Don't run validation on mount — wait until user tries to submit
    if (!hasAttemptedSubmitRef.current) return;
    if (isSubmittingRef.current || isSubmitting) return;

    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }

    validationTimeoutRef.current = setTimeout(() => {
      if (
        !isValidatingRef.current &&
        validationKey !== prevValidationKeyRef.current
      ) {
        isValidatingRef.current = true;
        validateAllPlayers();
        prevValidationKeyRef.current = validationKey;
        isValidatingRef.current = false;
      }
    }, 300);

    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, [validationKey, validateAllPlayers, isSubmitting]);

  // ── Field change ──────────────────────────────────────────────────────────────

  const handlePlayerChange = (
    index: number,
    field: keyof Player,
    value: string,
  ) => {
    const updated = [...players];
    const currentPlayer = updated[index];
    const updatedPlayer = { ...currentPlayer, [field]: value };

    if (field === 'dob' && value) {
      const tempFormData = { ...updatedPlayer, dob: value };
      const visibleFields = getVisibleFields(tempFormData);

      visibleFields.forEach((f) => {
        if (f.fieldName === 'grade' || f.fieldName === 'age') {
          const calculatedValue = processFieldValue(f, tempFormData, {
            registrationYear,
          });
          if (calculatedValue !== undefined) {
            const fieldName = f.fieldName as keyof Player;
            if (fieldName === 'age') {
              updatedPlayer.age = calculatedValue as number;
            } else if (fieldName === 'grade') {
              updatedPlayer.grade = calculatedValue as string;
              setGradeConfirmed((prev) => ({ ...prev, [index]: true }));
            }
          }
        }
      });
    }

    if (field === 'grade' && value) {
      updatedPlayer.isGradeOverridden = true;
      setGradeConfirmed((prev) => ({ ...prev, [index]: true }));
    }

    updated[index] = updatedPlayer;

    if (validationErrors[`player${index}_${field}`]) {
      setValidationErrors((prev) => {
        const n = { ...prev };
        delete n[`player${index}_${field}`];
        return n;
      });
    }

    onPlayersChange(updated);
  };

  const handleGradeOverride = (index: number) => {
    const updated = [...players];
    updated[index] = { ...updated[index], isGradeOverridden: true };
    onPlayersChange(updated);
    setGradeConfirmed((prev) => ({ ...prev, [index]: true }));
  };

  // ── Add / remove ──────────────────────────────────────────────────────────────

  const addPlayer = () => {
    if (players.filter((p) => !p._id).length >= maxPlayers) return;
    const newPlayer: Player = {
      fullName: '',
      gender: '',
      dob: '',
      schoolName: '',
      healthConcerns: '',
      aauNumber: '',
      registrationYear,
      season,
      grade: '',
    };
    const updated = [...players, newPlayer];
    onPlayersChange(updated);
    onPaymentCalculation?.(
      updated.filter((p) => !p._id || selectedPlayerIds.includes(p._id!))
        .length,
    );
    setShowNewPlayerForm(true);
  };

  const removePlayer = (index: number) => {
    const updated = [...players];
    const removed = updated.splice(index, 1)[0];
    onPlayersChange(updated);
    setPlayerHealthConditions((prev) => {
      const n = { ...prev };
      delete n[index];
      return n;
    });
    setPlayerCustomConditions((prev) => {
      const n = { ...prev };
      delete n[index];
      return n;
    });
    setPlayerShowCustomInput((prev) => {
      const n = { ...prev };
      delete n[index];
      return n;
    });
    setGradeConfirmed((prev) => {
      const n = { ...prev };
      delete n[index];
      return n;
    });
    if (removed._id && onPlayerSelection) onPlayerSelection(removed._id);
    onPaymentCalculation?.(
      updated.filter((p) => !p._id || selectedPlayerIds.includes(p._id!))
        .length,
    );
    if (updated.every((p) => p._id)) setShowNewPlayerForm(false);
  };

  // ── Existing player selection ─────────────────────────────────────────────────

  const handlePlayerSelection = (playerId: string) => {
    if (!requiresPayment || !onPlayerSelection) return;
    onPlayerSelection(playerId);
    const isSelected = selectedPlayerIds.includes(playerId);
    const player = unpaidExistingPlayers().find((p) => p._id === playerId);
    if (!player) return;
    if (isSelected) {
      const updated = players.filter((p) => p._id !== playerId);
      onPlayersChange(updated);
      onPaymentCalculation?.(
        updated.filter(
          (p) =>
            !p._id ||
            selectedPlayerIds.filter((id) => id !== playerId).includes(p._id!),
        ).length,
      );
    } else {
      if (!players.some((p) => p._id === playerId))
        onPlayersChange([...players, { ...player, registrationYear, season }]);
      onPaymentCalculation?.(
        players.filter(
          (p) => !p._id || [...selectedPlayerIds, playerId].includes(p._id!),
        ).length,
      );
    }
  };

  // ── Backend save ──────────────────────────────────────────────────────────────

  const savePlayersToBackend = async (
    playersToSave: Player[],
  ): Promise<boolean> => {
    if (!parentId || !authToken) {
      setValidationErrors({
        general: 'Authentication required. Please try again.',
      });
      return false;
    }

    const axios = (await import('axios')).default;
    const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

    try {
      const uniquePlayerMap = new Map<string, Player>();

      const newPlayersToSave = playersToSave.filter((p) => {
        if (p._id) return false;

        const alreadyExists = [...existingPlayers, ...paidPlayers].some((e) =>
          isSamePlayer(e, p),
        );
        if (alreadyExists) return false;

        const uniqueKey = `${p.fullName?.trim().toLowerCase()}|${p.dob}|${p.gender}`;
        if (uniquePlayerMap.has(uniqueKey)) return false;
        uniquePlayerMap.set(uniqueKey, p);
        return true;
      });

      if (newPlayersToSave.length === 0) return true;

      const savedPlayers: Player[] = [];

      for (const player of newPlayersToSave) {
        const isValid = getVisibleFields(player).every(
          (f) => !validateField(f, player[f.fieldName as keyof Player]),
        );
        if (!isValid) continue;

        try {
          const response = await axios.post(
            `${API_BASE_URL}/players/register`,
            {
              fullName: player.fullName.trim(),
              gender: player.gender,
              dob: player.dob,
              schoolName: player.schoolName?.trim() || '',
              healthConcerns: player.healthConcerns || '',
              aauNumber: player.aauNumber || '',
              registrationYear,
              season,
              parentId,
              grade: player.grade || '',
              isGradeOverridden: player.isGradeOverridden || false,
              skipSeasonRegistration: !requiresPayment,
            },
            {
              headers: {
                Authorization: `Bearer ${authToken}`,
                'Content-Type': 'application/json',
              },
            },
          );

          if (response.data.error?.includes('already exists')) {
            if (response.data.duplicatePlayerId) {
              savedPlayers.push({
                ...player,
                _id: response.data.duplicatePlayerId,
              });
            }
          } else {
            savedPlayers.push(response.data.player || response.data);
          }
        } catch (err: any) {
          if (
            err.response?.data?.error?.includes('already exists') ||
            err.response?.data?.error?.includes('duplicate')
          ) {
            const duplicateId = err.response.data.duplicatePlayerId;
            if (duplicateId) {
              savedPlayers.push({ ...player, _id: duplicateId });
            }
          }
        }
      }

      if (savedPlayers.length > 0) {
        const updatedPlayers = players.map((orig) => {
          if (orig._id) return orig;
          const saved = savedPlayers.find((s) => isSamePlayer(s, orig));
          return saved || orig;
        });
        if (JSON.stringify(updatedPlayers) !== JSON.stringify(players)) {
          onPlayersChange(updatedPlayers);
        }
        onSaveComplete?.();
      }

      return true;
    } catch (error: any) {
      console.error('Save players error:', error);
      if (
        error.response?.data?.error?.includes('already exists') ||
        error.response?.data?.error?.includes('duplicate')
      ) {
        return true;
      }
      setValidationErrors({
        general:
          error.response?.data?.error ||
          'Failed to save players. Please try again.',
      });
      return false;
    }
  };

  // ── Submit ────────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    const now = Date.now();
    if (now - lastSubmitTimestampRef.current < 2000) return;
    if (isSubmittingRef.current) return;

    hasAttemptedSubmitRef.current = true;
    lastSubmitTimestampRef.current = now;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setValidationErrors({});

    if (!validateAllPlayers()) {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
      window.scrollTo(0, 0);
      return;
    }
    setTimeout(() => onComplete?.(players), 100);
    setIsSubmitting(false);
    isSubmittingRef.current = false;
  };

  // ── Player form item renderer ─────────────────────────────────────────────────

  const renderPlayerFormItem = (
    player: Player,
    actualIndex: number,
    displayIndex: number,
    totalNew: number,
  ) => {
    const visibleFields = getVisibleFields(player);
    return (
      <div
        key={`new-${actualIndex}`}
        className={
          hideUI ? 'mb-4' : 'player-form-section mb-4 border-bottom pb-4'
        }
      >
        {totalNew > 1 && (
          <div className='d-flex justify-content-between align-items-center mb-3'>
            <h6 className='text-primary'>Player {displayIndex + 1}</h6>
            <button
              type='button'
              className='btn btn-sm btn-outline-danger'
              onClick={() => removePlayer(actualIndex)}
            >
              Remove Player
            </button>
          </div>
        )}

        <PlayerFormFields
          player={player}
          onChange={(field, value) =>
            handlePlayerChange(actualIndex, field, value)
          }
          visibleFields={visibleFields}
          errors={Object.fromEntries(
            Object.entries(validationErrors)
              .filter(([k]) => k.startsWith(`player${actualIndex}_`))
              .map(([k, v]) => [k.replace(`player${actualIndex}_`, ''), v]),
          )}
          selectedConditions={playerHealthConditions[actualIndex] || []}
          onConditionsChange={(selected) =>
            handleConditionsChange(actualIndex, selected)
          }
          showCustomConditionInput={playerShowCustomInput[actualIndex] || false}
          customCondition={playerCustomConditions[actualIndex] || ''}
          onCustomConditionChange={(value) =>
            handleCustomConditionChange(actualIndex, value)
          }
          currentYear={registrationYear}
          isGradeOverridden={player.isGradeOverridden}
          onGradeOverride={(overridden) => {
            const updated = [...players];
            updated[actualIndex] = {
              ...updated[actualIndex],
              isGradeOverridden: overridden,
            };
            onPlayersChange(updated);
          }}
          gradeSlot={
            <div className='mb-3'>
              <GradeConfirmationBanner
                playerIndex={actualIndex}
                player={player}
                gradeConfirmed={gradeConfirmed[actualIndex] ?? false}
                onConfirm={() =>
                  setGradeConfirmed((prev) => ({
                    ...prev,
                    [actualIndex]: true,
                  }))
                }
                onAdjust={() => handleGradeOverride(actualIndex)}
                onChange={(val) =>
                  handlePlayerChange(actualIndex, 'grade', val)
                }
                validationError={validationErrors[`player${actualIndex}_grade`]}
              />
            </div>
          }
        />
      </div>
    );
  };

  // ── Render: existing player list ──────────────────────────────────────────────
  // KEY FIX: Always render this when isExistingUser=true and there are any
  // players (paid or unpaid). Previously it hid itself when all were paid
  // and nothing was selected, making paid players invisible.

  const renderPlayerList = () => {
    if (hideUI) return null;
    if (!isExistingUser) return null;
    // Show the list if there are any paid OR unpaid players
    if (paidPlayers.length === 0 && existingPlayers.length === 0) return null;

    return (
      <div className='card mb-4'>
        <div className='card-header bg-light'>
          <div className='d-flex align-items-center'>
            <span className='bg-white avatar avatar-sm me-2 text-gray-7 flex-shrink-0'>
              <i className='ti ti-users fs-16' />
            </span>
            <h4 className='text-dark'>Your Players</h4>
          </div>
        </div>
        <div className='card-body'>
          {/* ── Paid players ── */}
          {hasPaidPlayers() && requiresPayment && (
            <div className='mb-4'>
              <h6 className='text-success mb-3'>
                <i className='ti ti-circle-check me-2'></i>Already Registered &
                Paid
              </h6>
              {paidPlayers.map((player) => (
                <div
                  key={player._id}
                  className='d-flex justify-content-between align-items-center p-3 border rounded mb-2 bg-light'
                >
                  <div>
                    <strong>{player.fullName}</strong>
                    <span className='text-muted ms-2'>
                      — {player.grade} Grade
                    </span>
                  </div>
                  <span className='badge bg-success'>
                    <i className='ti ti-check me-1'></i>Paid
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* ── Unpaid / selectable players ── */}
          {hasUnpaidPlayers() && (
            <div className='mb-4'>
              <h6 className='text-warning mb-3'>
                <i className='ti ti-alert-circle me-2'></i>
                {requiresPayment
                  ? 'Select Players to Register'
                  : 'Your Registered Players'}
              </h6>
              {unpaidExistingPlayers().map((player) => {
                if (requiresPayment) {
                  const isSelected = selectedPlayerIds.includes(player._id!);
                  return (
                    <div
                      key={player._id}
                      className={`d-flex justify-content-between align-items-center p-3 border rounded mb-2 ${
                        isSelected ? 'border-primary bg-light' : ''
                      }`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => handlePlayerSelection(player._id!)}
                    >
                      <div className='d-flex align-items-center'>
                        <input
                          type='checkbox'
                          className='form-check-input me-3'
                          checked={isSelected}
                          onChange={() => {}}
                          style={{ transform: 'scale(1.2)' }}
                        />
                        <div>
                          <strong>{player.fullName}</strong>
                          <span className='text-muted ms-2'>
                            — {player.grade} Grade
                          </span>
                        </div>
                      </div>
                      <span className='badge bg-warning text-dark'>
                        <i className='ti ti-clock me-1'></i>Payment Pending
                      </span>
                    </div>
                  );
                }
                return (
                  <div
                    key={player._id}
                    className='d-flex justify-content-between align-items-center p-3 border rounded mb-2'
                  >
                    <div>
                      <strong>{player.fullName}</strong>
                      <span className='text-muted ms-2'>
                        — {player.grade} Grade
                      </span>
                    </div>
                    <span className='badge bg-info'>
                      <i className='ti ti-user me-1'></i>Registered
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── Render: new player forms ──────────────────────────────────────────────────

  const renderNewPlayerForms = () => {
    const newPlayers = players.filter((p) => !p._id);

    if (isExistingUser && !showNewPlayerForm && newPlayers.length === 0) {
      return null;
    }

    if (newPlayers.length === 0) return null;

    if (hideUI) {
      return (
        <>
          {newPlayers.map((player, index) => {
            const actualIndex = players.findIndex((p) => p === player);
            return renderPlayerFormItem(
              player,
              actualIndex,
              index,
              newPlayers.length,
            );
          })}
          {allowMultiple && newPlayers.length < maxPlayers && (
            <div className='text-center mt-4'>
              <button
                type='button'
                className='btn btn-outline-primary'
                onClick={addPlayer}
              >
                <i className='ti ti-plus me-2'></i>Add Another Player
              </button>
            </div>
          )}
        </>
      );
    }

    return (
      <div className='card mb-4'>
        <div className='card-header bg-light d-flex justify-content-between align-items-center'>
          <div className='d-flex align-items-center'>
            <span className='bg-white avatar avatar-sm me-2 text-gray-7 flex-shrink-0'>
              <i className='ti ti-users fs-16' />
            </span>
            <h4 className='text-dark mb-0'>
              {isExistingUser ? 'Add New Player' : 'Player Information'}
            </h4>
          </div>
          {isExistingUser && (
            <button
              type='button'
              className='btn btn-sm btn-outline-secondary'
              onClick={() => {
                setShowNewPlayerForm(false);
                onPlayersChange(players.filter((p) => p._id));
                onPaymentCalculation?.(selectedPlayerIds.length);
              }}
            >
              Cancel
            </button>
          )}
        </div>
        <div className='card-body'>
          {!isExistingUser && (
            <div className='mb-4'>
              <h5>Register Players for {season}</h5>
              <p className='text-muted'>
                Add information for each player you'd like to register.
              </p>
            </div>
          )}
          {isExistingUser && (
            <p className='text-muted mb-4'>
              Add information for each new player you'd like to register.
            </p>
          )}

          {newPlayers.map((player, index) => {
            const actualIndex = players.findIndex((p) => p === player);
            return renderPlayerFormItem(
              player,
              actualIndex,
              index,
              newPlayers.length,
            );
          })}

          {allowMultiple && newPlayers.length < maxPlayers && (
            <div className='text-center mt-4'>
              <button
                type='button'
                className='btn btn-outline-primary'
                onClick={addPlayer}
              >
                <i className='ti ti-plus me-2'></i>Add Another Player
              </button>
            </div>
          )}

          {/* Only show field-level warnings after submit attempt */}
          {hasAttemptedSubmitRef.current &&
            Object.keys(validationErrors).some((k) => k !== 'general') && (
              <div className='alert alert-warning mt-3'>
                <i className='ti ti-alert-triangle me-2'></i>
                Please complete all required player information to continue.
              </div>
            )}
        </div>
      </div>
    );
  };

  // ── Render: CTA card ──────────────────────────────────────────────────────────

  const renderUniversalCTA = () => {
    if (hideUI) return null;

    const hasSelectedUnpaid = selectedPlayerIds.length > 0;
    const hasNewFilled = players.some((p) => !p._id && p.fullName?.trim());
    const hasNewForm = showNewPlayerForm || players.some((p) => !p._id);
    const hasAny = hasSelectedUnpaid || hasNewFilled;

    const newPlayerCount = players.filter((p) => !p._id).length;

    const areNewValid = players
      .filter((p) => !p._id)
      .every((player) => {
        const actualIndex = players.findIndex((p) => p === player);
        const fieldsValid = getVisibleFields(player).every(
          (f) => !validateField(f, player[f.fieldName as keyof Player]),
        );
        return fieldsValid && player.grade && gradeConfirmed[actualIndex];
      });

    const isFormValid = hasAny && (hasNewFilled ? areNewValid : true);

    let buttonText = requiresPayment
      ? 'Continue to Payment'
      : existingPlayers.length > 0 || paidPlayers.length > 0
        ? 'Add Players to Account'
        : 'Complete Registration';

    const total = selectedPlayerIds.length + newPlayerCount;

    return (
      <div className='card mt-4'>
        <div className='card-body'>
          <div className='d-flex justify-content-between align-items-center'>
            <div>
              <h5 className='mb-1'>
                {requiresPayment
                  ? 'Ready to Make Payment'
                  : 'Ready to Register'}
              </h5>
              <p className='text-muted mb-0'>
                {total > 0
                  ? `${total} player${total !== 1 ? 's' : ''} ready`
                  : 'Select or add players to continue'}
              </p>
              {hasNewForm && !areNewValid && hasNewFilled && (
                <p className='text-warning small mb-0 mt-1'>
                  <i className='ti ti-alert-triangle me-1'></i>
                  Complete all required information for new players
                </p>
              )}
            </div>
            <button
              type='button'
              className={`btn btn-lg ${isFormValid ? 'btn-primary' : 'btn-secondary'}`}
              onClick={handleSubmit}
              disabled={isSubmitting || isSubmittingRef.current || !isFormValid}
            >
              {isSubmitting ? (
                <>
                  <span className='spinner-border spinner-border-sm me-2'></span>
                  Processing...
                </>
              ) : (
                <>
                  <i
                    className={`${requiresPayment ? 'ti ti-credit-card' : 'ti ti-check'} me-2`}
                  ></i>
                  {buttonText}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ── New user path ─────────────────────────────────────────────────────────────

  if (!isExistingUser && !hideUI) {
    const newPlayers = players.filter((p) => !p._id);

    const allValid =
      newPlayers.length > 0 &&
      newPlayers.every((p) => {
        const idx = players.findIndex((pl) => pl === p);
        const fieldsValid = getVisibleFields(p).every(
          (f) => !validateField(f, p[f.fieldName as keyof Player]),
        );
        return fieldsValid && p.grade && gradeConfirmed[idx];
      });

    return (
      <div>
        <div className='card'>
          <div className='card-header bg-light'>
            <div className='d-flex align-items-center'>
              <span className='bg-white avatar avatar-sm me-2 text-gray-7 flex-shrink-0'>
                <i className='ti ti-shirt-sport fs-16' />
              </span>
              <h4 className='text-dark'>Player Information</h4>
            </div>
          </div>
          <div className='card-body'>
            <div className='mb-4'>
              <h5>Register Players for {season}</h5>
              <p className='text-muted'>
                Add information for each player you'd like to register.
              </p>
            </div>

            {newPlayers.map((player, index) => {
              const actualIndex = players.findIndex((p) => p === player);
              return renderPlayerFormItem(
                player,
                actualIndex,
                index,
                newPlayers.length,
              );
            })}

            <div className='text-center mt-4'>
              <button
                type='button'
                className='btn btn-outline-primary'
                onClick={addPlayer}
                disabled={newPlayers.length >= maxPlayers}
              >
                <i className='ti ti-plus me-2'></i>
                {newPlayers.length === 0 ? 'Add Player' : 'Add Another Player'}
              </button>
            </div>

            {hasAttemptedSubmitRef.current &&
              Object.keys(validationErrors).length > 0 &&
              newPlayers.length > 0 && (
                <div className='alert alert-warning mt-3'>
                  <i className='ti ti-alert-triangle me-2'></i>
                  Please complete all required player information to continue.
                </div>
              )}
          </div>
        </div>

        <div className='card mt-4'>
          <div className='card-body'>
            <div className='d-flex justify-content-between align-items-center'>
              <div>
                <h5 className='mb-1'>
                  {requiresPayment
                    ? 'Ready to Make Payment'
                    : 'Ready to Complete Registration'}
                </h5>
                <p className='text-muted mb-0'>
                  {newPlayers.length > 0
                    ? `${newPlayers.length} player${newPlayers.length !== 1 ? 's' : ''} added`
                    : 'No players added yet — click "Add Player" above'}
                </p>
                {newPlayers.length > 0 && !allValid && (
                  <p className='text-warning small mb-0 mt-1'>
                    <i className='ti ti-alert-triangle me-1'></i>
                    Complete all required information for each player
                  </p>
                )}
              </div>
              <button
                type='button'
                className={`btn btn-lg ${allValid ? 'btn-primary' : 'btn-secondary'}`}
                onClick={handleSubmit}
                disabled={isSubmitting || isSubmittingRef.current || !allValid}
              >
                {isSubmitting ? (
                  <>
                    <span className='spinner-border spinner-border-sm me-2'></span>
                    Processing...
                  </>
                ) : (
                  <>
                    <i
                      className={`${requiresPayment ? 'ti ti-credit-card' : 'ti ti-check'} me-2`}
                    ></i>
                    {requiresPayment
                      ? 'Continue to Payment'
                      : 'Complete Registration'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Existing user path ────────────────────────────────────────────────────────

  if (fieldsLoading && !hideUI) {
    return (
      <div className='text-center py-4'>
        <div className='spinner-border text-primary' role='status'>
          <span className='visually-hidden'>Loading form fields...</span>
        </div>
        <p className='mt-2'>Loading form configuration...</p>
      </div>
    );
  }

  if (hideUI) {
    return <>{renderNewPlayerForms()}</>;
  }

  const newPlayers = players.filter((p) => !p._id);
  const hasSelectedAny = selectedPlayerIds.length > 0;
  const shouldShowCTA =
    showNewPlayerForm || newPlayers.length > 0 || hasSelectedAny;

  // "Initial state" for existing users = no new form open, nothing selected
  // KEY FIX: This no longer hides renderPlayerList — paid players always show
  const isInInitialState =
    !showNewPlayerForm && newPlayers.length === 0 && !hasSelectedAny;

  return (
    <div>
      {/* Only show the general validation error after a submit attempt */}
      {hasAttemptedSubmitRef.current && validationErrors.general && (
        <div className='alert alert-danger mb-4'>
          <i className='ti ti-alert-circle me-2'></i>
          {validationErrors.general}
        </div>
      )}

      {/* Always render paid/unpaid player list for existing users */}
      {renderPlayerList()}

      {/* "Add New Player" prompt — shown in initial state (nothing selected/added yet) */}
      {isInInitialState && (
        <div className='card mb-4'>
          <div className='card-header bg-light'>
            <div className='d-flex align-items-center'>
              <span className='bg-white avatar avatar-sm me-2 text-gray-7 flex-shrink-0'>
                <i className='ti ti-user-plus fs-16' />
              </span>
              <h4 className='text-dark'>
                {hasPaidPlayers()
                  ? 'Register Another Player'
                  : 'Add Players to Account'}
              </h4>
            </div>
          </div>
          <div className='card-body text-center py-5'>
            <i className='ti ti-users fs-1 text-muted mb-3 d-block'></i>
            <h5 className='mb-2'>
              {hasPaidPlayers()
                ? 'Register an Additional Player'
                : 'Ready to Add Players'}
            </h5>
            <p className='text-muted mb-4'>
              {hasPaidPlayers()
                ? 'Would you like to register another player for this event?'
                : 'Add a new player to your account for this registration.'}
            </p>
            {hasUnpaidPlayers() && (
              <p className='text-warning mb-3'>
                <i className='ti ti-arrow-up me-1'></i>
                You also have players above with pending payment — select them
                to register.
              </p>
            )}
            <button
              type='button'
              className='btn btn-primary btn-lg'
              onClick={() => {
                addPlayer();
                setShowNewPlayerForm(true);
              }}
            >
              <i className='ti ti-plus me-2'></i>
              Add New Player
            </button>
          </div>
        </div>
      )}

      {/* New player form(s) */}
      {!isInInitialState && renderNewPlayerForms()}

      {/* CTA submit card */}
      {shouldShowCTA && renderUniversalCTA()}
    </div>
  );
};

export default DynamicPlayerRegistrationModule;
