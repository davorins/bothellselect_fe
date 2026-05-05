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
  hideUI?: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

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
}) => {
  const [showNewPlayerForm, setShowNewPlayerForm] = useState(false);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveErrors, setSaveErrors] = useState<Record<string, string>>({});
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

  // ── Anti-duplicate refs ───────────────────────────────────────────────────────
  const isSubmittingRef = useRef(false);
  const hasSavedPlayersRef = useRef(false);
  const lastSubmitTimestampRef = useRef(0);

  // Validation loop-prevention refs
  const isValidatingRef = useRef(false);
  const validationTimeoutRef = useRef<NodeJS.Timeout>();
  const prevValidationKeyRef = useRef<string>('');

  const {
    getVisibleFields,
    validateField,
    processFieldValue,
    loading: fieldsLoading,
  } = useDynamicFormFields('player', { registrationYear });

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

  // ── Validation ───────────────────────────────────────────────────────────────

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

  useEffect(() => {
    return () => {
      isSubmittingRef.current = false;
      hasSavedPlayersRef.current = false;
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, []);

  // ── Validation effect ────────────────────────────────────────────────────────

  useEffect(() => {
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

  // ── Field change with auto-calculation ──────────────────────────────────────

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

    if (field === 'grade' && value && !updatedPlayer.dob) {
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
    setGradeConfirmed((prev) => ({ ...prev, [index]: false }));
  };

  // ── Add / remove ─────────────────────────────────────────────────────────────

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

  // Initial player setup for existing users
  useEffect(() => {
    if (isExistingUser && allExistingPlayersPaid() && players.length === 0) {
      // Don't auto-add a player - wait for user to click Add New Player button
      setShowNewPlayerForm(false);
    }
  }, [isExistingUser, allExistingPlayersPaid(), players.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Backend save ─────────────────────────────────────────────────────────────

  const savePlayersToBackend = async (
    playersToSave: Player[],
  ): Promise<boolean> => {
    if (!parentId || !authToken) {
      setSaveErrors({ general: 'Authentication required. Please try again.' });
      return false;
    }

    try {
      const uniquePlayerMap = new Map<string, Player>();

      const newPlayersToSave = playersToSave.filter((p) => {
        if (p._id) return false;

        const alreadyExists = [...existingPlayers, ...paidPlayers].some((e) =>
          isSamePlayer(e, p),
        );
        if (alreadyExists) return false;

        const uniqueKey = `${p.fullName?.trim().toLowerCase()}|${p.dob}|${p.gender}`;
        if (uniquePlayerMap.has(uniqueKey)) {
          console.log(
            'Duplicate player detected in batch, skipping:',
            p.fullName,
          );
          return false;
        }
        uniquePlayerMap.set(uniqueKey, p);
        return true;
      });

      console.log('Unique new players to save:', newPlayersToSave.length);

      if (newPlayersToSave.length === 0) {
        return true;
      }

      const savedPlayers: Player[] = [];

      for (const player of newPlayersToSave) {
        const isValid = getVisibleFields(player).every(
          (f) => !validateField(f, player[f.fieldName as keyof Player]),
        );

        if (!isValid) {
          console.log('Invalid player, skipping save:', player.fullName);
          continue;
        }

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
          console.error(`Error saving player ${player.fullName}:`, err);

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

      console.log(`Successfully saved ${savedPlayers.length} players`);

      if (savedPlayers.length > 0) {
        const updatedPlayers = players.map((orig) => {
          if (orig._id) return orig;
          const saved = savedPlayers.find((s) => isSamePlayer(s, orig));
          return saved || orig;
        });

        if (JSON.stringify(updatedPlayers) !== JSON.stringify(players)) {
          onPlayersChange(updatedPlayers);
        }
      }

      setSaveErrors({});
      return true;
    } catch (error: any) {
      console.error('Save players error:', error);

      if (
        error.response?.data?.error?.includes('already exists') ||
        error.response?.data?.error?.includes('duplicate')
      ) {
        const duplicateId = error.response.data.duplicatePlayerId;
        if (duplicateId) {
          const playerName =
            error.response.data.error.match(/Player "([^"]+)"/)?.[1];
          if (playerName) {
            const updatedPlayers = players.map((p) =>
              p.fullName === playerName ? { ...p, _id: duplicateId } : p,
            );
            onPlayersChange(updatedPlayers);
            setSaveErrors({
              general: `Player "${playerName}" already exists in your account. They have been added to your selection.`,
            });
            return true;
          }
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
    const now = Date.now();
    if (now - lastSubmitTimestampRef.current < 2000) {
      console.log('Submit debounced — too soon after last attempt.');
      return;
    }

    if (isSubmittingRef.current) {
      console.log('Submission already in progress, skipping.');
      return;
    }

    if (hasSavedPlayersRef.current) {
      console.log('Players already saved, proceeding to complete.');
      setTimeout(() => onComplete?.(), 100);
      return;
    }

    lastSubmitTimestampRef.current = now;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setSaveErrors({});

    if (!validateAllPlayers()) {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
      window.scrollTo(0, 0);
      return;
    }

    try {
      const brandNew = players.filter((p) => !p._id);

      if (brandNew.length > 0) {
        hasSavedPlayersRef.current = true;

        const ok = await savePlayersToBackend(brandNew);

        if (!ok) {
          hasSavedPlayersRef.current = false;
          setIsSubmitting(false);
          isSubmittingRef.current = false;
          window.scrollTo(0, 0);
          return;
        }
      }

      setTimeout(() => onComplete?.(), 100);
    } catch (error) {
      console.error('Submission error:', error);
      hasSavedPlayersRef.current = false;
      setSaveErrors({
        general: 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  };

  // ── Shared player form renderer ───────────────────────────────────────────────
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
            <h6 className='text-primary'>New Player {displayIndex + 1}</h6>
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

  const renderPlayerList = () => {
    if (hideUI) return null;
    if (
      !isExistingUser ||
      (allExistingPlayers().length === 0 && !showCheckboxes)
    )
      return null;

    // Don't show the Your Players card if there are no unpaid players and we're in initial state
    const hasNoUnpaidPlayers = !hasUnpaidPlayers();
    const hasNotStartedAdding =
      !showNewPlayerForm && players.filter((p) => !p._id).length === 0;

    if (
      hasNoUnpaidPlayers &&
      hasNotStartedAdding &&
      selectedPlayerIds.length === 0
    ) {
      return null;
    }

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
        </div>
      </div>
    );
  };

  // ── Render: new player form (styled like Case 2) ───────────────────────────────────

  const renderNewPlayerForm = () => {
    const newPlayers = players.filter((p) => !p._id);

    // For existing-user path: only show if user clicked "Add Player" OR there are new players
    if (isExistingUser && !showNewPlayerForm && newPlayers.length === 0) {
      return null;
    }

    // Nothing to render yet
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
                <i className='ti ti-plus me-2'></i>
                Add Another Player
              </button>
            </div>
          )}

          {Object.keys(validationErrors).length > 0 && !hideUI && (
            <div className='alert alert-warning mt-3'>
              <i className='ti ti-alert-triangle me-2'></i>
              Please complete all required player information to continue.
            </div>
          )}
        </>
      );
    }

    // For existing users, style like Case 2 (inline, no outer card wrapper)
    if (isExistingUser) {
      return (
        <div className='card mb-4'>
          <div className='card-header bg-light'>
            <div className='d-flex align-items-center'>
              <span className='bg-white avatar avatar-sm me-2 text-gray-7 flex-shrink-0'>
                <i className='ti ti-users fs-16' />
              </span>
              <h4 className='text-dark'>Add New Player</h4>
            </div>
          </div>
          <div className='card-body'>
            <div>
              <div className='mb-4'>
                <p className='text-muted'>
                  Add information for each player you'd like to add to your
                  account.
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

              {allowMultiple && newPlayers.length < maxPlayers && (
                <div className='text-center mt-4'>
                  <button
                    type='button'
                    className='btn btn-outline-primary'
                    onClick={addPlayer}
                  >
                    <i className='ti ti-plus me-2'></i>
                    Add Another Player
                  </button>
                </div>
              )}

              {Object.keys(validationErrors).length > 0 && (
                <div className='alert alert-warning mt-3'>
                  <i className='ti ti-alert-triangle me-2'></i>
                  Please complete all required player information to continue.
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    // New user path (Case 2) - keep original styling
    return (
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

          {allowMultiple && newPlayers.length < maxPlayers && (
            <div className='text-center mt-4'>
              <button
                type='button'
                className='btn btn-outline-primary'
                onClick={addPlayer}
              >
                <i className='ti ti-plus me-2'></i>
                Add Another Player
              </button>
            </div>
          )}

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

  // ── Render: CTA ───────────────────────────────────────────────────────────────

  const renderUniversalCTA = () => {
    if (hideUI) return null;

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

    let buttonText = '';
    let titleText = '';
    let subtitleText = '';

    if (!requiresPayment) {
      const isInitial =
        !isExistingUser ||
        (existingPlayers.length === 0 && paidPlayers.length === 0);
      const isPostPayment =
        isExistingUser &&
        (existingPlayers.length > 0 || paidPlayers.length > 0);

      if (isInitial) {
        titleText = 'Ready to Complete Registration';
        buttonText = 'Complete Registration';
        subtitleText = hasAny
          ? hasNew
            ? `${players.filter((p) => !p._id).length} new player(s) ready to be registered`
            : `${selectedPlayerIds.length} existing player(s) selected`
          : 'Add or select players to continue';
      } else if (isPostPayment) {
        titleText = 'Ready to Add Players';
        buttonText = 'Add Players to Account';
        subtitleText = hasNew
          ? `${players.filter((p) => !p._id).length} new player(s) ready to be added`
          : 'Add a new player to continue';
      }
    } else {
      titleText = 'Ready to Make Payment';
      buttonText = 'Continue to Payment';
      const total =
        selectedPlayerIds.length + players.filter((p) => !p._id).length;
      subtitleText = hasAny
        ? total > 0
          ? `${total} player(s) ready for payment`
          : 'Add or select players to continue'
        : 'Add or select players to continue';
    }

    return (
      <div className='card mt-4'>
        <div className='card-body'>
          <div className='d-flex justify-content-between align-items-center'>
            <div>
              <h5 className='mb-1'>{titleText}</h5>
              <p className='text-muted mb-0'>{subtitleText}</p>
              {!isFormValid && hasAny && (
                <p className='text-warning small mb-0 mt-1'>
                  <i className='ti ti-alert-triangle me-1'></i>
                  {hasNew && !areNewValid
                    ? 'Complete all required information for new players'
                    : 'Select at least one player or add a new player'}
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

  // ── New user path (Case 2) ─────────────────────────────────────────────────────────────

  if (!isExistingUser && !hideUI) {
    const newPlayers = players.filter((p) => !p._id);

    const allValid =
      newPlayers.length > 0 &&
      newPlayers.every((p, _i) => {
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

            {newPlayers.length > 0 && (
              <div>
                {newPlayers.map((player, index) => {
                  const actualIndex = players.findIndex((p) => p === player);
                  return renderPlayerFormItem(
                    player,
                    actualIndex,
                    index,
                    newPlayers.length,
                  );
                })}
              </div>
            )}

            {allowMultiple && newPlayers.length < maxPlayers && (
              <div className='text-center mt-4'>
                <button
                  type='button'
                  className='btn btn-outline-primary'
                  onClick={addPlayer}
                >
                  <i className='ti ti-plus me-2'></i>
                  {newPlayers.length === 0
                    ? 'Add Player'
                    : 'Add Another Player'}
                </button>
              </div>
            )}

            {!allowMultiple && newPlayers.length === 0 && (
              <div className='text-center mt-4'>
                <button
                  type='button'
                  className='btn btn-outline-primary'
                  onClick={addPlayer}
                >
                  <i className='ti ti-plus me-2'></i>
                  Add Player
                </button>
              </div>
            )}

            {Object.keys(validationErrors).length > 0 &&
              newPlayers.length > 0 && (
                <div className='alert alert-warning mt-3'>
                  <i className='ti ti-alert-triangle me-2'></i>
                  Please complete all required player information to continue.
                </div>
              )}
          </div>
        </div>

        {newPlayers.length > 0 && (
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
                    {newPlayers.length} player
                    {newPlayers.length !== 1 ? 's' : ''} added
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
                  disabled={
                    isSubmitting ||
                    isSubmittingRef.current ||
                    newPlayers.length === 0 ||
                    !allValid
                  }
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

  // ── Existing user path (Case 1) ────────────────────────────────────────────────────────

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
    return <>{renderNewPlayerForm()}</>;
  }

  // Determine what to show for existing user
  const hasNewPlayers = players.some((p) => !p._id && p.fullName?.trim());
  const hasSelectedAny = selectedPlayerIds.length > 0;
  const shouldShowReadySection = hasNewPlayers || hasSelectedAny;
  const isInInitialState =
    !showNewPlayerForm &&
    players.filter((p) => !p._id).length === 0 &&
    !hasSelectedAny;

  return (
    <div>
      {saveErrors.general && (
        <div className='alert alert-danger mb-4'>
          <i className='ti ti-alert-circle me-2'></i>
          {saveErrors.general}
        </div>
      )}

      {/* Your Players card - shows existing players */}
      {renderPlayerList()}

      {/* Initial State Card - Add New Player to Account (matches Case 2 styling) */}
      {isInInitialState && (
        <div className='card mb-4'>
          <div className='card-header bg-light'>
            <div className='d-flex align-items-center'>
              <span className='bg-white avatar avatar-sm me-2 text-gray-7 flex-shrink-0'>
                <i className='ti ti-user-plus fs-16' />
              </span>
              <h4 className='text-dark'>Add Players to Account</h4>
            </div>
          </div>
          <div className='card-body text-center py-5'>
            <i className='ti ti-users fs-1 text-muted mb-3 d-block'></i>
            <h5 className='mb-2'>Ready to Add Players</h5>
            <p className='text-muted mb-4'>
              Add a new player to your account for future season and training
              registrations.
            </p>
            <button
              type='button'
              className='btn btn-primary btn-lg'
              onClick={() => setShowNewPlayerForm(true)}
            >
              <i className='ti ti-plus me-2'></i>
              Add New Player to Account
            </button>
          </div>
        </div>
      )}

      {/* New Player Information section (shown after clicking Add New Player button) */}
      {!isInInitialState && renderNewPlayerForm()}

      {/* Ready to Add Players CTA - shown after adding players */}
      {shouldShowReadySection && renderUniversalCTA()}

      {/* Info alert for edge cases */}
      {requiresPayment &&
        !hasUnpaidPlayers() &&
        !showNewPlayerForm &&
        players.filter((p) => !p._id).length === 0 &&
        selectedPlayerIds.length === 0 &&
        !allExistingPlayersPaid() && (
          <div className='alert alert-info text-center mt-4'>
            <i className='ti ti-info-circle me-2'></i>
            Please select existing players or click "Add New Player to Account"
            to continue.
          </div>
        )}
    </div>
  );
};

export default DynamicPlayerRegistrationModule;
