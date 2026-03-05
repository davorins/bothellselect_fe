// src/feature-module/components/registration-modules/DynamicPlayerRegistrationModule.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Player } from '../../../types/registration-types';
import { useDynamicFormFields } from '../../hooks/useDynamicFormFields';
import GradeConfirmationBanner from './GradeConfirmationBanner';
import PlayerFormFields from '../../../components/forms/PlayerFormFields';
import { commonHealthConditions } from '../../constants/healthConditions';
import axios from 'axios';

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
  onComplete?: () => void;
  onBack?: () => void;
  parentId?: string;
  authToken?: string;
  maxPlayers?: number;
  allowMultiple?: boolean;
  requiresPayment?: boolean;
  hideUI?: boolean; // New prop to hide all UI elements
}

// ─── Constants ────────────────────────────────────────────────────────────────

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const isSamePlayer = (p1: Player, p2: Player): boolean =>
  p1.fullName?.trim().toLowerCase() === p2.fullName?.trim().toLowerCase() &&
  p1.dob === p2.dob &&
  p1.gender === p2.gender;

const useDebounce = (value: any, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const h = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(h);
  }, [value, delay]);
  return debouncedValue;
};

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
  hideUI = false, // Default to false
}) => {
  const [showNewPlayerForm, setShowNewPlayerForm] = useState(false);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveErrors, setSaveErrors] = useState<Record<string, string>>({});
  const [hasSavedPlayers, setHasSavedPlayers] = useState(false);
  const [gradeConfirmed, setGradeConfirmed] = useState<Record<number, boolean>>(
    {},
  );

  // Health conditions keyed by player index
  const [playerHealthConditions, setPlayerHealthConditions] = useState<
    Record<number, any[]>
  >({});
  const [playerCustomConditions, setPlayerCustomConditions] = useState<
    Record<number, string>
  >({});
  const [playerShowCustomInput, setPlayerShowCustomInput] = useState<
    Record<number, boolean>
  >({});

  // Use the dynamic form fields hook
  const {
    getVisibleFields,
    validateField,
    processFieldValue,
    loading: fieldsLoading,
  } = useDynamicFormFields('player', { registrationYear });

  const debouncedPlayers = useDebounce(players, 500);

  // ── Player helpers ───────────────────────────────────────────────────────────

  const allExistingPlayers = useCallback(
    () => [...(existingPlayers || []), ...(paidPlayers || [])],
    [existingPlayers, paidPlayers],
  );

  const unpaidExistingPlayers = useCallback(
    () =>
      existingPlayers.filter(
        (p) => !paidPlayers.some((pp) => pp._id === p._id),
      ),
    [existingPlayers, paidPlayers],
  );

  const allExistingPlayersPaid = useCallback(
    () => unpaidExistingPlayers().length === 0 && existingPlayers.length > 0,
    [unpaidExistingPlayers, existingPlayers],
  );

  const hasUnpaidPlayers = useCallback(
    () => unpaidExistingPlayers().length > 0,
    [unpaidExistingPlayers],
  );

  const hasPaidPlayers = useCallback(
    () => paidPlayers.length > 0,
    [paidPlayers],
  );

  // ── Health conditions ────────────────────────────────────────────────────────

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

  // ── Field change with auto-calculation ─────────────────────────────────────

  const handlePlayerChange = (
    index: number,
    field: keyof Player,
    value: string,
  ) => {
    const updated = [...players];
    const currentPlayer = updated[index];

    // Create updated player with the changed field
    const updatedPlayer = { ...currentPlayer, [field]: value };

    // If DOB changed, auto-calculate age and grade using the hook
    if (field === 'dob' && value) {
      // Create a temporary form data object with the new DOB
      const tempFormData = { ...updatedPlayer, dob: value };

      // Get visible fields for this player
      const visibleFields = getVisibleFields(tempFormData);

      // Process each field to get calculated values
      visibleFields.forEach((f) => {
        if (f.calculation?.type === 'fromDOB') {
          const calculatedValue = processFieldValue(f, tempFormData, {
            registrationYear,
          });
          if (calculatedValue !== undefined) {
            // Use type assertion to handle the dynamic field assignment
            const fieldName = f.fieldName as keyof Player;
            // Type-safe assignment based on field type
            if (fieldName === 'age') {
              updatedPlayer.age = calculatedValue as number;
            } else if (fieldName === 'grade') {
              updatedPlayer.grade = calculatedValue as string;
            } else {
              // For any other calculated fields, use a more generic approach
              (updatedPlayer as any)[fieldName] = calculatedValue;
            }
          }
        }
      });

      // Reset grade confirmation when DOB changes
      setGradeConfirmed((prev) => ({ ...prev, [index]: false }));
    }

    updated[index] = updatedPlayer;

    // Clear validation error for this field
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
    setGradeConfirmed((prev) => ({ ...prev, [index]: false }));
  };

  // ── Add / remove ─────────────────────────────────────────────────────────────

  const addPlayer = () => {
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

  // ── Existing player selection ────────────────────────────────────────────────

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

  // ── Validation using dynamic fields ───────────────────────────────────────

  const validateAllPlayers = useCallback(() => {
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

    let newPlayersValid = true;
    players.forEach((player, index) => {
      if (!player._id) {
        getVisibleFields(player).forEach((field) => {
          const error = validateField(
            field,
            player[field.fieldName as keyof Player],
          );
          if (error) {
            errors[`player${index}_${field.fieldName}`] = error;
            newPlayersValid = false;
          }
        });

        // Special handling for grade confirmation
        if (player.dob && player.grade && !gradeConfirmed[index]) {
          errors[`player${index}_grade`] =
            'Please confirm the grade is correct';
          newPlayersValid = false;
        }
      }
    });

    if (hasNew && !newPlayersValid)
      errors.general =
        'Please complete all required information for new players.';

    setValidationErrors(errors);
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
  ]);

  useEffect(() => {
    if (debouncedPlayers.length > 0 || selectedPlayerIds.length > 0)
      validateAllPlayers();
  }, [debouncedPlayers, selectedPlayerIds, gradeConfirmed, validateAllPlayers]);

  useEffect(() => {
    if (isExistingUser && allExistingPlayersPaid() && players.length === 0) {
      onPlayersChange([
        {
          fullName: '',
          gender: '',
          dob: '',
          schoolName: '',
          healthConcerns: '',
          aauNumber: '',
          registrationYear,
          season,
          grade: '',
        },
      ]);
      setShowNewPlayerForm(true);
      onPaymentCalculation?.(1);
    }
  }, [isExistingUser, allExistingPlayersPaid, players.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Backend save ─────────────────────────────────────────────────────────────

  const savePlayersToBackend = async (
    playersToSave: Player[],
  ): Promise<boolean> => {
    if (!parentId || !authToken) {
      setSaveErrors({ general: 'Authentication required. Please try again.' });
      return false;
    }
    if (hasSavedPlayers) return true;

    try {
      const newPlayersToSave = playersToSave.filter((p) => {
        if (p._id) return false;
        return ![...existingPlayers, ...paidPlayers].some((e) =>
          isSamePlayer(e, p),
        );
      });

      if (newPlayersToSave.length === 0) {
        setHasSavedPlayers(true);
        return true;
      }

      const savedPlayers: Player[] = [];
      for (const player of newPlayersToSave) {
        // Validate using dynamic fields
        const isValid = getVisibleFields(player).every(
          (f) => !validateField(f, player[f.fieldName as keyof Player]),
        );
        if (!isValid) {
          setSaveErrors((prev) => ({
            ...prev,
            [player.fullName]: 'Missing required fields',
          }));
          continue;
        }

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
          if (response.data.duplicatePlayerId)
            savedPlayers.push({
              ...player,
              _id: response.data.duplicatePlayerId,
            });
          continue;
        }
        savedPlayers.push(response.data.player || response.data);
      }

      if (savedPlayers.length > 0) {
        onPlayersChange(
          players.map((orig) => {
            if (orig._id) return orig;
            return (
              savedPlayers.find(
                (s) =>
                  s.fullName.trim().toLowerCase() ===
                    orig.fullName.trim().toLowerCase() &&
                  s.dob === orig.dob &&
                  s.gender === orig.gender,
              ) || orig
            );
          }),
        );
        setHasSavedPlayers(true);
        return true;
      }

      setSaveErrors({});
      return true;
    } catch (error: any) {
      if (
        error.response?.data?.error?.includes('already exists') ||
        error.response?.data?.error?.includes('duplicate')
      ) {
        const duplicateId = error.response.data.duplicatePlayerId;
        if (duplicateId) {
          const playerName =
            error.response.data.error.match(/Player "([^"]+)"/)?.[1];
          onPlayersChange(
            players.map((p) =>
              p.fullName === playerName ? { ...p, _id: duplicateId } : p,
            ),
          );
          setSaveErrors({
            general: `Player "${playerName}" already exists in your account. They have been added to your selection.`,
          });
          return true;
        }
        setSaveErrors({
          general:
            'A player with this information already exists. Please check your player list.',
        });
      } else if (error.response?.status === 409) {
        setSaveErrors({
          general:
            'This player appears to already exist in the system. Please check your existing players list.',
        });
      } else {
        setSaveErrors({
          general:
            error.response?.data?.error ||
            'Failed to save players. Please try again.',
        });
      }
      return false;
    }
  };

  // ── Submit ────────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSaveErrors({});
    if (!validateAllPlayers()) {
      setIsSubmitting(false);
      window.scrollTo(0, 0);
      return;
    }
    try {
      const brandNew = players.filter((p) => !p._id);
      if (brandNew.length > 0 && !hasSavedPlayers) {
        const ok = await savePlayersToBackend(brandNew);
        if (!ok) {
          setIsSubmitting(false);
          window.scrollTo(0, 0);
          return;
        }
        setHasSavedPlayers(true);
      }
      onComplete?.();
    } catch {
      setSaveErrors({
        general: 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Render: existing player list (hidden when hideUI is true) ─────────────────
  const renderPlayerList = () => {
    if (hideUI) return null; // Hide when in form-only mode
    if (
      !isExistingUser ||
      (allExistingPlayers().length === 0 && !showCheckboxes)
    )
      return null;
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
                      - {player.grade} Grade
                    </span>
                  </div>
                  <span className='badge bg-success'>
                    <i className='ti ti-check me-1'></i>Paid
                  </span>
                </div>
              ))}
            </div>
          )}

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
                      className={`d-flex justify-content-between align-items-center p-3 border rounded mb-2 ${isSelected ? 'border-primary bg-light' : ''}`}
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
                            - {player.grade} Grade
                          </span>
                        </div>
                      </div>
                      <span className='badge bg-warning text-dark'>
                        <i className='ti ti-clock me-1'></i>
                        {requiresPayment
                          ? 'Payment Pending'
                          : 'Registration Pending'}
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
                        - {player.grade} Grade
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

          {!showNewPlayerForm && (
            <div className='text-center mt-4'>
              <button
                type='button'
                className='btn btn-primary'
                onClick={addPlayer}
              >
                <i className='ti ti-plus me-2'></i>
                {requiresPayment
                  ? allExistingPlayersPaid()
                    ? 'Register New Player'
                    : 'Add Additional Player'
                  : isExistingUser &&
                      (existingPlayers.length > 0 || paidPlayers.length > 0)
                    ? 'Add New Player to Account'
                    : 'Add New Player'}
              </button>
              {allExistingPlayersPaid() && requiresPayment && (
                <p className='text-muted mt-2 small'>
                  All your current players are registered and paid. Add a new
                  player to register them for this season.
                </p>
              )}
              {!requiresPayment &&
                isExistingUser &&
                (existingPlayers.length > 0 || paidPlayers.length > 0) && (
                  <p className='text-muted mt-2 small'>
                    Add a new player to your account for future season
                    registrations.
                  </p>
                )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── Render: new player form using PlayerFormFields ─────────────────────────

  const renderNewPlayerForm = () => {
    if (!showNewPlayerForm && players.filter((p) => !p._id).length === 0)
      return null;
    const newPlayers = players.filter((p) => !p._id);

    // If hideUI is true, just render the PlayerFormFields without any wrapper
    if (hideUI) {
      return (
        <>
          {newPlayers.map((player, index) => {
            const actualIndex = players.findIndex((p) => p === player);
            const visibleFields = getVisibleFields(player);

            return (
              <div key={`new-${actualIndex}`} className='mb-4'>
                {newPlayers.length > 1 && (
                  <div className='d-flex justify-content-between align-items-center mb-3'>
                    <h6 className='text-primary'>New Player {index + 1}</h6>
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
                      .map(([k, v]) => [
                        k.replace(`player${actualIndex}_`, ''),
                        v,
                      ]),
                  )}
                  selectedConditions={playerHealthConditions[actualIndex] || []}
                  onConditionsChange={(selected) =>
                    handleConditionsChange(actualIndex, selected)
                  }
                  showCustomConditionInput={
                    playerShowCustomInput[actualIndex] || false
                  }
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
                        validationError={
                          validationErrors[`player${actualIndex}_grade`]
                        }
                      />
                    </div>
                  }
                />
              </div>
            );
          })}

          {Object.keys(validationErrors).length > 0 && !hideUI && (
            <div className='alert alert-warning mt-3'>
              <i className='ti ti-alert-triangle me-2'></i>
              Please complete all required player information to continue.
            </div>
          )}
        </>
      );
    }

    // Original render with card wrapper for non-hideUI mode
    return (
      <div className='card'>
        <div className='card-header d-flex justify-content-between align-items-center'>
          <div className='d-flex align-items-center'>
            <span className='bg-white avatar avatar-sm me-2 text-gray-7 flex-shrink-0'>
              <i className='ti ti-users fs-16' />
            </span>
            <h5>
              {newPlayers.length > 1
                ? 'New Players Information'
                : 'New Player Information'}
            </h5>
          </div>
          {newPlayers.length > 0 && (
            <button
              type='button'
              className='btn btn-sm btn-outline-danger'
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
          <div className='mb-4'>
            <h5>
              Register New Player{newPlayers.length > 1 ? 's' : ''} for {season}
            </h5>
            <p className='text-muted'>
              Add information for the new player
              {newPlayers.length > 1 ? 's' : ''} you'd like to register.
            </p>
          </div>

          {newPlayers.map((player, index) => {
            const actualIndex = players.findIndex((p) => p === player);
            const visibleFields = getVisibleFields(player);

            return (
              <div
                key={`new-${actualIndex}`}
                className='player-form-section mb-4 border-bottom pb-4'
              >
                {newPlayers.length > 1 && (
                  <div className='d-flex justify-content-between align-items-center mb-3'>
                    <h6 className='text-primary'>New Player {index + 1}</h6>
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
                      .map(([k, v]) => [
                        k.replace(`player${actualIndex}_`, ''),
                        v,
                      ]),
                  )}
                  selectedConditions={playerHealthConditions[actualIndex] || []}
                  onConditionsChange={(selected) =>
                    handleConditionsChange(actualIndex, selected)
                  }
                  showCustomConditionInput={
                    playerShowCustomInput[actualIndex] || false
                  }
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
                        validationError={
                          validationErrors[`player${actualIndex}_grade`]
                        }
                      />
                    </div>
                  }
                />
              </div>
            );
          })}

          {Object.keys(validationErrors).length > 0 && (
            <div className='alert alert-warning mt-3'>
              <i className='ti ti-alert-triangle me-2'></i>
              Please complete all required player information to continue.
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── Render: CTA (hidden when hideUI is true) ──────────────────────────────────

  const renderUniversalCTA = () => {
    if (hideUI) return null; // Hide when in form-only mode

    const hasSelectedUnpaid = selectedPlayerIds.length > 0;
    const hasNew = players.some((p) => !p._id && p.fullName?.trim());
    const hasAny = hasSelectedUnpaid || hasNew;

    const areNewValid = players
      .filter((p) => !p._id)
      .every((player) => {
        const actualIndex = players.findIndex((p) => p === player);
        const fieldsValid = getVisibleFields(player).every(
          (f) => !validateField(f, player[f.fieldName as keyof Player]),
        );
        return fieldsValid && player.grade && gradeConfirmed[actualIndex];
      });

    const isFormValid = hasAny && (hasNew ? areNewValid : true);

    const ctaButton = (label: React.ReactNode) => (
      <button
        type='button'
        className={`btn btn-lg ${isFormValid ? 'btn-primary' : 'btn-secondary'}`}
        onClick={handleSubmit}
        disabled={isSubmitting || !isFormValid}
      >
        {isSubmitting ? (
          <>
            <span className='spinner-border spinner-border-sm me-2'></span>
            Processing...
          </>
        ) : (
          label
        )}
      </button>
    );

    if (!requiresPayment) {
      const isInitial =
        !isExistingUser ||
        (existingPlayers.length === 0 && paidPlayers.length === 0);
      const isPostPayment =
        isExistingUser &&
        (existingPlayers.length > 0 || paidPlayers.length > 0);

      if (isInitial) {
        if (!hasAny) return null;
        return (
          <div className='card mt-4'>
            <div className='card-body'>
              <div className='d-flex justify-content-between align-items-center'>
                <div>
                  <h5 className='mb-1'>Ready to Complete Registration</h5>
                  <p className='text-muted mb-0'>
                    {hasNew
                      ? `${players.filter((p) => !p._id).length} new player${players.filter((p) => !p._id).length !== 1 ? 's' : ''} ready to be registered`
                      : `${selectedPlayerIds.length} existing player${selectedPlayerIds.length !== 1 ? 's' : ''} selected`}
                  </p>
                  {!isFormValid && (
                    <p className='text-warning small mb-0 mt-1'>
                      <i className='ti ti-alert-triangle me-1'></i>
                      {hasNew && !areNewValid
                        ? 'Complete all required information for new players'
                        : 'Select at least one player or add a new player'}
                    </p>
                  )}
                </div>
                {ctaButton(
                  <>
                    <i className='ti ti-check me-2'></i>Complete Registration
                  </>,
                )}
              </div>
            </div>
          </div>
        );
      }

      if (isPostPayment) {
        if (!hasNew) return null;
        return (
          <div className='card mt-4'>
            <div className='card-body'>
              <div className='d-flex justify-content-between align-items-center'>
                <div>
                  <h5 className='mb-1'>Ready to Add Players</h5>
                  <p className='text-muted mb-0'>
                    {players.filter((p) => !p._id).length} new player
                    {players.filter((p) => !p._id).length !== 1 ? 's' : ''}{' '}
                    ready to be added to your account
                  </p>
                  {!isFormValid && (
                    <p className='text-warning small mb-0 mt-1'>
                      <i className='ti ti-alert-triangle me-1'></i>Complete all
                      required information for new players
                    </p>
                  )}
                </div>
                {ctaButton(
                  <>
                    <i className='ti ti-user-plus me-2'></i>Add Players to
                    Account
                  </>,
                )}
              </div>
            </div>
          </div>
        );
      }
    }

    const total =
      selectedPlayerIds.length + players.filter((p) => !p._id).length;
    if (!hasAny) return null;
    return (
      <div className='card mt-4'>
        <div className='card-body'>
          <div className='d-flex justify-content-between align-items-center'>
            <div>
              <h5 className='mb-1'>Ready to Make Payment</h5>
              <p className='text-muted mb-0'>
                {isFormValid ? (
                  <>
                    {total} player{total !== 1 ? 's' : ''} ready for payment
                    {hasSelectedUnpaid &&
                      hasNew &&
                      ' (selected existing + new players)'}
                    {hasSelectedUnpaid &&
                      !hasNew &&
                      ' (selected existing players)'}
                    {!hasSelectedUnpaid && hasNew && ' (new players)'}
                  </>
                ) : (
                  'Select players or add new players to continue'
                )}
              </p>
              {!isFormValid && (
                <p className='text-warning small mb-0 mt-1'>
                  <i className='ti ti-alert-triangle me-1'></i>
                  {hasNew && !areNewValid
                    ? 'Complete all required information for new players'
                    : 'Select at least one player or add a new player'}
                </p>
              )}
            </div>
            {ctaButton(
              <>
                <i className='ti ti-credit-card me-2'></i>Continue to Payment
              </>,
            )}
          </div>
        </div>
      </div>
    );
  };

  // ── New user path (hidden when hideUI is true) ───────────────────────────────

  if (!isExistingUser && !hideUI) {
    const allValid = players.every((p, idx) => {
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
            {renderNewPlayerForm()}
            {!showNewPlayerForm && players.length === 0 && (
              <div className='text-center'>
                <button
                  type='button'
                  className='btn btn-primary'
                  onClick={addPlayer}
                >
                  <i className='ti ti-plus me-2'></i>Add Player
                </button>
              </div>
            )}
          </div>
        </div>

        {players.length > 0 && (
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
                    {players.length} player{players.length !== 1 ? 's' : ''}{' '}
                    added
                  </p>
                  {!allValid && (
                    <p className='text-warning small mb-0 mt-1'>
                      <i className='ti ti-alert-triangle me-1'></i>Complete all
                      required information for players
                    </p>
                  )}
                </div>
                <button
                  type='button'
                  className={`btn btn-lg ${allValid ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={handleSubmit}
                  disabled={isSubmitting || players.length === 0 || !allValid}
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
        )}
      </div>
    );
  }

  // ── Existing user path (hide UI elements when hideUI is true) ─────────────────

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

  // When hideUI is true, just render the form without any wrappers
  if (hideUI) {
    return <>{renderNewPlayerForm()}</>;
  }

  // Full render with all UI elements
  return (
    <div>
      {saveErrors.general && (
        <div className='alert alert-danger mb-4'>
          <i className='ti ti-alert-circle me-2'></i>
          {saveErrors.general}
        </div>
      )}
      {renderPlayerList()}
      {renderNewPlayerForm()}
      {renderUniversalCTA()}
      {requiresPayment &&
        !hasUnpaidPlayers() &&
        !showNewPlayerForm &&
        selectedPlayerIds.length === 0 && (
          <div className='alert alert-info text-center'>
            <i className='ti ti-info-circle me-2'></i>
            {allExistingPlayersPaid()
              ? 'All your players are already registered and paid. Click "Register New Player" to add another player.'
              : 'Please select existing players to register or add new players to continue.'}
          </div>
        )}
    </div>
  );
};

export default DynamicPlayerRegistrationModule;
