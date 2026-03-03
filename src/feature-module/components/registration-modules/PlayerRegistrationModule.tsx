// PlayerRegistrationModule.tsx - FULL UPDATED VERSION WITH GRADE CONFIRMATION
import React, { useState, useEffect, useCallback } from 'react';
import { Player } from '../../../types/registration-types';
import { calculateGradeFromDOB } from '../../../utils/gradeUtils';
import SchoolAutocomplete from '../../../components/SchoolAutocomplete';
import axios from 'axios';
import Select from 'react-select';
import { commonHealthConditions } from '../../constants/healthConditions';
import GradeConfirmationBanner from './GradeConfirmationBanner';
import NameInput from '../../../components/NameInput';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlayerRegistrationModuleProps {
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
}

// ─── Constants ────────────────────────────────────────────────────────────────

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

// Custom styles for react-select
const selectStyles = {
  control: (base: any) => ({
    ...base,
    minHeight: '38px',
    borderColor: '#d9d9d9',
    '&:hover': { borderColor: '#40a9ff' },
  }),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const isSamePlayer = (player1: Player, player2: Player): boolean => {
  return (
    player1.fullName?.trim().toLowerCase() ===
      player2.fullName?.trim().toLowerCase() &&
    player1.dob === player2.dob &&
    player1.gender === player2.gender
  );
};

// ─── Custom hooks ─────────────────────────────────────────────────────────────

const useDebounce = (value: any, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

// ─── PlayerRegistrationModule ─────────────────────────────────────────────────

const PlayerRegistrationModule: React.FC<PlayerRegistrationModuleProps> = ({
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
}) => {
  const [showNewPlayerForm, setShowNewPlayerForm] = useState(false);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveErrors, setSaveErrors] = useState<Record<string, string>>({});
  const [hasSavedPlayers, setHasSavedPlayers] = useState(false);

  // ── Grade confirmation state ─────────────────────────────────────────────────
  // Keyed by player index. True = parent has verified the auto-calculated grade.
  const [gradeConfirmed, setGradeConfirmed] = useState<Record<number, boolean>>(
    {},
  );

  // ── Health conditions state ──────────────────────────────────────────────────
  const [playerHealthConditions, setPlayerHealthConditions] = useState<
    Record<number, any[]>
  >({});
  const [playerCustomConditions, setPlayerCustomConditions] = useState<
    Record<number, string>
  >({});
  const [playerShowCustomInput, setPlayerShowCustomInput] = useState<
    Record<number, boolean>
  >({});

  const debouncedPlayers = useDebounce(players, 500);

  // ── Player helpers ────────────────────────────────────────────────────────────

  const allExistingPlayers = useCallback(() => {
    return [...(existingPlayers || []), ...(paidPlayers || [])];
  }, [existingPlayers, paidPlayers]);

  const unpaidExistingPlayers = useCallback(() => {
    return existingPlayers.filter(
      (player) =>
        !paidPlayers.some((paidPlayer) => paidPlayer._id === player._id),
    );
  }, [existingPlayers, paidPlayers]);

  const allExistingPlayersPaid = useCallback(() => {
    return unpaidExistingPlayers().length === 0 && existingPlayers.length > 0;
  }, [unpaidExistingPlayers, existingPlayers]);

  const hasUnpaidPlayers = useCallback(() => {
    return unpaidExistingPlayers().length > 0;
  }, [unpaidExistingPlayers]);

  const hasPaidPlayers = useCallback(() => {
    return paidPlayers.length > 0;
  }, [paidPlayers]);

  // ── Health conditions helpers ─────────────────────────────────────────────────

  const parseHealthConcerns = (healthConcerns: string = '') => {
    const concerns = healthConcerns.split(',').map((c) => c.trim());
    const selected = concerns
      .filter((c) =>
        commonHealthConditions.some((condition) => condition.label === c),
      )
      .map((c) => {
        const found = commonHealthConditions.find(
          (condition) => condition.label === c,
        );
        return found || { value: 'custom', label: c };
      });
    const custom = concerns
      .filter(
        (c) =>
          !commonHealthConditions.some((condition) => condition.label === c),
      )
      .join(', ');
    return { selected, custom, hasCustom: !!custom };
  };

  const handlePlayerConditionChange = (index: number, selected: any) => {
    setPlayerHealthConditions((prev) => ({ ...prev, [index]: selected || [] }));
    const hasCustom = selected?.some((item: any) => item.value === 'custom');
    setPlayerShowCustomInput((prev) => ({ ...prev, [index]: hasCustom }));
    updatePlayerHealthConcerns(
      index,
      selected || [],
      playerCustomConditions[index] || '',
    );
  };

  const handlePlayerCustomConditionChange = (index: number, value: string) => {
    setPlayerCustomConditions((prev) => ({ ...prev, [index]: value }));
    updatePlayerHealthConcerns(
      index,
      playerHealthConditions[index] || [],
      value,
    );
  };

  const updatePlayerHealthConcerns = (
    index: number,
    conditions: any[],
    custom: string,
  ) => {
    const selectedLabels = conditions
      .filter((c: any) => c.value !== 'custom')
      .map((c: any) => c.label);
    let healthConcerns = selectedLabels.join(', ');
    if (custom.trim() && playerShowCustomInput[index]) {
      healthConcerns = healthConcerns
        ? `${healthConcerns}, ${custom.trim()}`
        : custom.trim();
    }
    handlePlayerChange(index, 'healthConcerns', healthConcerns);
  };

  // Initialize health conditions when new players are added
  useEffect(() => {
    players.forEach((player, index) => {
      if (!player._id && !playerHealthConditions[index]) {
        const { selected, custom, hasCustom } = parseHealthConcerns(
          player.healthConcerns,
        );
        setPlayerHealthConditions((prev) => ({ ...prev, [index]: selected }));
        setPlayerCustomConditions((prev) => ({ ...prev, [index]: custom }));
        setPlayerShowCustomInput((prev) => ({ ...prev, [index]: hasCustom }));
      }
    });
  }, [players.length]);

  // ── Player field change handler ───────────────────────────────────────────────

  const handlePlayerChange = (
    index: number,
    field: keyof Player,
    value: string,
  ) => {
    const updatedPlayers = [...players];
    const updatedPlayer = { ...updatedPlayers[index], [field]: value };

    if (field === 'dob' && !updatedPlayer.isGradeOverridden) {
      const dob = value;
      if (dob && dob.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const calculatedGrade = calculateGradeFromDOB(dob, registrationYear);
        console.log('📊 Grade calculation for player:', {
          name: updatedPlayer.fullName,
          dob,
          registrationYear,
          calculatedGrade,
        });
        updatedPlayer.grade = calculatedGrade;

        if (
          updatedPlayers[index].grade &&
          updatedPlayers[index].grade !== calculatedGrade
        ) {
          console.warn('⚠️ Grade mismatch detected:', {
            previous: updatedPlayers[index].grade,
            calculated: calculatedGrade,
            dob,
          });
        }
      }
      // Reset grade confirmation whenever DOB changes
      setGradeConfirmed((prev) => ({ ...prev, [index]: false }));
    }

    updatedPlayers[index] = updatedPlayer;
    onPlayersChange(updatedPlayers);
  };

  const handleGradeOverride = (index: number) => {
    const updatedPlayers = [...players];
    updatedPlayers[index] = {
      ...updatedPlayers[index],
      isGradeOverridden: true,
    };
    onPlayersChange(updatedPlayers);
    // Clear confirmation since grade is now being manually set
    setGradeConfirmed((prev) => ({ ...prev, [index]: false }));
  };

  // ── Add / remove players ──────────────────────────────────────────────────────

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
    const updatedPlayers = [...players, newPlayer];
    onPlayersChange(updatedPlayers);
    onPaymentCalculation?.(
      updatedPlayers.filter((p) => !p._id || selectedPlayerIds.includes(p._id!))
        .length,
    );
    setShowNewPlayerForm(true);
  };

  const removePlayer = (index: number) => {
    const updatedPlayers = [...players];
    const removedPlayer = updatedPlayers[index];
    updatedPlayers.splice(index, 1);
    onPlayersChange(updatedPlayers);

    // Clean up per-player state
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

    if (removedPlayer._id && onPlayerSelection)
      onPlayerSelection(removedPlayer._id);

    onPaymentCalculation?.(
      updatedPlayers.filter((p) => !p._id || selectedPlayerIds.includes(p._id!))
        .length,
    );

    if (updatedPlayers.every((p) => p._id)) setShowNewPlayerForm(false);
  };

  // ── Player selection (existing players checkbox) ──────────────────────────────

  const handlePlayerSelection = (playerId: string) => {
    if (!requiresPayment || !onPlayerSelection) return;

    onPlayerSelection(playerId);

    const isSelected = selectedPlayerIds.includes(playerId);
    const player = unpaidExistingPlayers().find((p) => p._id === playerId);

    if (player) {
      if (isSelected) {
        const updatedPlayers = players.filter(
          (p: Player) => !(p._id && p._id === playerId),
        );
        onPlayersChange(updatedPlayers);
        onPaymentCalculation?.(
          updatedPlayers.filter(
            (p) =>
              !p._id ||
              selectedPlayerIds
                .filter((id) => id !== playerId)
                .includes(p._id!),
          ).length,
        );
      } else {
        if (!players.some((p: Player) => p._id === playerId)) {
          const updatedPlayers = [
            ...players,
            { ...player, registrationYear, season },
          ];
          onPlayersChange(updatedPlayers);
        }
        onPaymentCalculation?.(
          players.filter(
            (p) => !p._id || [...selectedPlayerIds, playerId].includes(p._id!),
          ).length,
        );
      }
    }
  };

  // ── Validation ────────────────────────────────────────────────────────────────

  const validateAllPlayers = useCallback(() => {
    console.log('🔍 Running player validation...');
    const errors: Record<string, string> = {};

    const hasSelectedUnpaidPlayers = selectedPlayerIds.length > 0;
    const hasNewPlayers = players.some((p) => !p._id && p.fullName?.trim());
    const hasPlayersToProcess = hasSelectedUnpaidPlayers || hasNewPlayers;

    if (!hasPlayersToProcess) {
      errors.general =
        'Please select at least one player or add a new player to continue.';
      setValidationErrors(errors);
      onValidationChange?.(false);
      return false;
    }

    let hasValidNewPlayers = true;

    players.forEach((player, index) => {
      if (!player._id) {
        if (!player.fullName?.trim()) {
          errors[`player${index}FullName`] = 'Full name is required';
          hasValidNewPlayers = false;
        }
        if (!player.gender) {
          errors[`player${index}Gender`] = 'Gender is required';
          hasValidNewPlayers = false;
        }
        if (!player.dob) {
          errors[`player${index}Dob`] = 'Date of birth is required';
          hasValidNewPlayers = false;
        }
        if (!player.schoolName?.trim()) {
          errors[`player${index}School`] = 'School name is required';
          hasValidNewPlayers = false;
        }
        if (!player.grade) {
          errors[`player${index}Grade`] = 'Grade is required';
          hasValidNewPlayers = false;
        } else if (player.dob && !gradeConfirmed[index]) {
          // Grade exists but parent hasn't confirmed it yet
          errors[`player${index}Grade`] = 'Please confirm the grade is correct';
          hasValidNewPlayers = false;
        }
      }
    });

    if (hasNewPlayers && !hasValidNewPlayers) {
      errors.general =
        'Please complete all required information for new players.';
    }

    setValidationErrors(errors);

    const formIsValid =
      hasPlayersToProcess && (!hasNewPlayers || hasValidNewPlayers);

    console.log('🔍 Enhanced player validation result:', {
      isValid: formIsValid,
      hasSelectedUnpaidPlayers,
      hasNewPlayers,
      hasValidNewPlayers,
      hasPlayersToProcess,
      gradeConfirmed,
      errorCount: Object.keys(errors).length,
    });

    onValidationChange?.(formIsValid);
    return formIsValid;
  }, [players, selectedPlayerIds, gradeConfirmed, onValidationChange]);

  useEffect(() => {
    if (debouncedPlayers.length > 0 || selectedPlayerIds.length > 0) {
      validateAllPlayers();
    }
  }, [debouncedPlayers, selectedPlayerIds, gradeConfirmed]);

  // ── Initialize with new player form if all existing players are paid ──────────

  useEffect(() => {
    if (isExistingUser && allExistingPlayersPaid() && players.length === 0) {
      console.log('🎯 All existing players are paid, showing new player form');
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
  }, [
    isExistingUser,
    allExistingPlayersPaid,
    players.length,
    onPlayersChange,
    onPaymentCalculation,
    registrationYear,
    season,
  ]);

  // ── Backend save ──────────────────────────────────────────────────────────────

  const savePlayersToBackend = async (
    playersToSave: Player[],
  ): Promise<boolean> => {
    if (!parentId || !authToken) {
      setSaveErrors({ general: 'Authentication required. Please try again.' });
      return false;
    }

    if (hasSavedPlayers) {
      console.log('ℹ️ Players already saved, skipping duplicate save');
      return true;
    }

    try {
      console.log('💾 Starting player save process...', {
        playerCount: playersToSave.length,
        parentId,
        season,
        registrationYear,
        requiresPayment,
      });

      const savedPlayers: Player[] = [];

      const newPlayersToSave = playersToSave.filter((p) => {
        if (p._id) return false;
        const allExisting = [...existingPlayers, ...paidPlayers];
        const isDuplicate = allExisting.some((existing) =>
          isSamePlayer(existing, p),
        );
        if (isDuplicate) {
          console.log('⚠️ Skipping duplicate player:', {
            name: p.fullName,
            dob: p.dob,
            gender: p.gender,
          });
          return false;
        }
        return true;
      });

      console.log('🔍 Filtered new players to save:', newPlayersToSave.length);

      if (newPlayersToSave.length === 0) {
        console.log('ℹ️ No new players to save');
        setHasSavedPlayers(true);
        return true;
      }

      for (const player of newPlayersToSave) {
        if (
          !player.fullName?.trim() ||
          !player.gender ||
          !player.dob ||
          !player.schoolName?.trim()
        ) {
          console.error('❌ Player missing required fields:', player);
          setSaveErrors((prev) => ({
            ...prev,
            [player.fullName]: 'Missing required fields',
          }));
          continue;
        }

        const playerData = {
          fullName: player.fullName.trim(),
          gender: player.gender,
          dob: player.dob,
          schoolName: player.schoolName.trim(),
          healthConcerns: player.healthConcerns || '',
          aauNumber: player.aauNumber || '',
          registrationYear,
          season,
          parentId,
          grade: player.grade || '',
          isGradeOverridden: player.isGradeOverridden || false,
          skipSeasonRegistration: !requiresPayment,
        };

        const response = await axios.post(
          `${API_BASE_URL}/players/register`,
          playerData,
          {
            headers: {
              Authorization: `Bearer ${authToken}`,
              'Content-Type': 'application/json',
            },
          },
        );

        console.log('✅ Player saved successfully:', {
          response: response.data,
          skipSeasonRegistration: !requiresPayment,
        });

        if (response.data.error?.includes('already exists')) {
          console.log(
            '⚠️ Backend detected duplicate, skipping:',
            player.fullName,
          );
          if (response.data.duplicatePlayerId) {
            savedPlayers.push({
              ...player,
              _id: response.data.duplicatePlayerId,
            });
          }
          continue;
        }

        savedPlayers.push(response.data.player || response.data);
      }

      if (savedPlayers.length > 0) {
        const finalPlayers: Player[] = players.map((originalPlayer) => {
          if (originalPlayer._id) return originalPlayer;
          const saved = savedPlayers.find(
            (s) =>
              s.fullName.trim().toLowerCase() ===
                originalPlayer.fullName.trim().toLowerCase() &&
              s.dob === originalPlayer.dob &&
              s.gender === originalPlayer.gender,
          );
          return saved || originalPlayer;
        });

        console.log('FINAL PLAYERS LIST TO SEND TO PARENT:', {
          finalPlayers,
          requiresPayment,
        });
        onPlayersChange(finalPlayers);
        setHasSavedPlayers(true);
        return true;
      }

      setSaveErrors({});
      return true;
    } catch (error: any) {
      console.error('❌ Error saving players:', error);

      if (
        error.response?.data?.error?.includes('already exists') ||
        error.response?.data?.error?.includes('duplicate')
      ) {
        const duplicateId = error.response.data.duplicatePlayerId;
        if (duplicateId) {
          const playerName =
            error.response.data.error.match(/Player "([^"]+)"/)?.[1];
          const updatedPlayers = players.map((p) =>
            p.fullName === playerName ? { ...p, _id: duplicateId } : p,
          );
          onPlayersChange(updatedPlayers);
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

    const isValid = validateAllPlayers();
    if (!isValid) {
      setIsSubmitting(false);
      window.scrollTo(0, 0);
      return;
    }

    try {
      const brandNewPlayers = players.filter((p) => !p._id);

      console.log('🔍 Players to process:', {
        total: players.length,
        brandNew: brandNewPlayers.length,
        existing: players.filter((p) => p._id).length,
        hasSavedPlayers,
      });

      if (brandNewPlayers.length > 0 && !hasSavedPlayers) {
        const saveSuccess = await savePlayersToBackend(brandNewPlayers);
        if (!saveSuccess) {
          setIsSubmitting(false);
          window.scrollTo(0, 0);
          return;
        }
        setHasSavedPlayers(true);
      } else if (hasSavedPlayers) {
        console.log('ℹ️ Players already saved, skipping duplicate save');
      } else {
        console.log(
          'ℹ️ No new players to save, only existing players selected',
        );
      }

      console.log(
        '✅ Player selection/save completed, proceeding to next step',
      );
      onComplete?.();
    } catch (error) {
      console.error('Error submitting player form:', error);
      setSaveErrors({
        general: 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Render helpers ────────────────────────────────────────────────────────────

  const renderPlayerList = () => {
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
          {/* Paid players */}
          {hasPaidPlayers() && requiresPayment && (
            <div className='mb-4'>
              <h6 className='text-success mb-3'>
                <i className='ti ti-circle-check me-2'></i>
                Already Registered & Paid
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

          {/* Unpaid players */}
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

          {/* Add player button */}
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

  const renderNewPlayerForm = () => {
    if (!showNewPlayerForm && players.filter((p) => !p._id).length === 0)
      return null;

    const newPlayers = players.filter((p) => !p._id);

    return (
      <div className='card'>
        <div className='card-header bg-light'>
          <div className='d-flex align-items-center justify-content-between'>
            <div className='d-flex align-items-center'>
              <span className='bg-white avatar avatar-sm me-2 text-gray-7 flex-shrink-0'>
                <i className='ti ti-user-plus fs-16' />
              </span>
              <h4 className='text-dark'>
                {newPlayers.length > 1
                  ? 'New Players Information'
                  : 'New Player Information'}
              </h4>
            </div>
            {newPlayers.length > 0 && (
              <button
                type='button'
                className='btn btn-sm btn-outline-danger'
                onClick={() => {
                  setShowNewPlayerForm(false);
                  const updatedPlayers = players.filter((p) => p._id);
                  onPlayersChange(updatedPlayers);
                  onPaymentCalculation?.(selectedPlayerIds.length);
                }}
              >
                Cancel
              </button>
            )}
          </div>
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

                <div className='row'>
                  {/* Full Name */}
                  <div className='col-md-6'>
                    <NameInput
                      value={player.fullName}
                      onChange={(fullName) =>
                        handlePlayerChange(actualIndex, 'fullName', fullName)
                      }
                      error={validationErrors[`player${actualIndex}FullName`]}
                      required
                    />
                  </div>

                  {/* Gender */}
                  <div className='col-md-6'>
                    <div className='mb-3'>
                      <label className='form-label'>Gender</label>
                      <select
                        className={`form-control ${validationErrors[`player${actualIndex}Gender`] ? 'is-invalid' : ''}`}
                        value={player.gender}
                        onChange={(e) =>
                          handlePlayerChange(
                            actualIndex,
                            'gender',
                            e.target.value,
                          )
                        }
                        required
                      >
                        <option value=''>Select Gender</option>
                        <option value='Male'>Male</option>
                        <option value='Female'>Female</option>
                      </select>
                      {validationErrors[`player${actualIndex}Gender`] && (
                        <div className='invalid-feedback'>
                          {validationErrors[`player${actualIndex}Gender`]}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Date of Birth */}
                  <div className='col-md-6'>
                    <div className='mb-3'>
                      <label className='form-label'>Date of Birth</label>
                      <input
                        type='date'
                        className={`form-control ${validationErrors[`player${actualIndex}Dob`] ? 'is-invalid' : ''}`}
                        value={player.dob}
                        onChange={(e) =>
                          handlePlayerChange(actualIndex, 'dob', e.target.value)
                        }
                        required
                      />
                      {validationErrors[`player${actualIndex}Dob`] && (
                        <div className='invalid-feedback'>
                          {validationErrors[`player${actualIndex}Dob`]}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* School Name */}
                  <div className='col-md-6'>
                    <div className='mb-3'>
                      <label className='form-label'>School Name</label>
                      <SchoolAutocomplete
                        value={player.schoolName}
                        onChange={(val) =>
                          handlePlayerChange(actualIndex, 'schoolName', val)
                        }
                      />
                      {validationErrors[`player${actualIndex}School`] && (
                        <div className='invalid-feedback'>
                          {validationErrors[`player${actualIndex}School`]}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ── Grade — replaced with GradeConfirmationBanner ── */}
                  <div className='col-md-6'>
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
                        validationErrors[`player${actualIndex}Grade`]
                      }
                    />
                  </div>

                  {/* AAU Number */}
                  <div className='col-md-6'>
                    <div className='mb-3'>
                      <label className='form-label'>AAU Number</label>
                      <input
                        type='text'
                        className='form-control'
                        value={player.aauNumber}
                        onChange={(e) =>
                          handlePlayerChange(
                            actualIndex,
                            'aauNumber',
                            e.target.value,
                          )
                        }
                        placeholder='If applicable'
                      />
                    </div>
                  </div>
                </div>

                {/* Health Conditions */}
                <div className='row mt-3'>
                  <div className='col-12'>
                    <div className='card bg-light'>
                      <div className='card-header bg-transparent py-2'>
                        <div className='d-flex align-items-center'>
                          <span className='bg-white avatar avatar-sm me-2 text-gray-7 flex-shrink-0'>
                            <i className='ti ti-heartbeat fs-16' />
                          </span>
                          <h6 className='mb-0'>Medical History</h6>
                        </div>
                      </div>
                      <div className='card-body pb-2'>
                        <div className='mb-3'>
                          <label className='form-label'>
                            Health Conditions
                          </label>
                          <Select
                            isMulti
                            options={commonHealthConditions}
                            className='basic-multi-select'
                            classNamePrefix='select'
                            value={playerHealthConditions[actualIndex] || []}
                            onChange={(selected) =>
                              handlePlayerConditionChange(actualIndex, selected)
                            }
                            styles={selectStyles}
                            placeholder='Select health conditions...'
                          />
                          <small className='text-muted'>
                            Select all that apply
                          </small>
                        </div>
                        {playerShowCustomInput[actualIndex] && (
                          <div className='mb-3'>
                            <label className='form-label'>
                              Specify Other Condition(s)
                            </label>
                            <input
                              type='text'
                              className='form-control'
                              value={playerCustomConditions[actualIndex] || ''}
                              onChange={(e) =>
                                handlePlayerCustomConditionChange(
                                  actualIndex,
                                  e.target.value,
                                )
                              }
                              placeholder='Please describe any other health conditions...'
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Add another player */}
                {index === newPlayers.length - 1 && (
                  <div className='mt-4'>
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

  const renderUniversalCTA = () => {
    const hasSelectedUnpaidPlayers = selectedPlayerIds.length > 0;
    const hasNewPlayers = players.some((p) => !p._id && p.fullName?.trim());
    const hasPlayersToProcess = hasSelectedUnpaidPlayers || hasNewPlayers;

    const areNewPlayersValid = players
      .filter((p) => !p._id)
      .every((player, idx) => {
        const actualIndex = players.findIndex((p) => p === player);
        return (
          player.fullName?.trim() &&
          player.gender &&
          player.dob &&
          player.schoolName?.trim() &&
          player.grade &&
          gradeConfirmed[actualIndex]
        );
      });

    const isNewPlayersSectionValid = hasNewPlayers ? areNewPlayersValid : true;
    const isFormValid = hasPlayersToProcess && isNewPlayersSectionValid;

    if (!requiresPayment) {
      const isOffSeasonInitialRegistration =
        !isExistingUser ||
        (existingPlayers.length === 0 && paidPlayers.length === 0);
      const isPostPaymentScenario =
        isExistingUser &&
        (existingPlayers.length > 0 || paidPlayers.length > 0);

      if (isOffSeasonInitialRegistration) {
        if (!hasNewPlayers && !hasSelectedUnpaidPlayers) return null;

        return (
          <div className='card mt-4'>
            <div className='card-body'>
              <div className='d-flex justify-content-between align-items-center'>
                <div>
                  <h5 className='mb-1'>Ready to Complete Registration</h5>
                  <p className='text-muted mb-0'>
                    {hasNewPlayers
                      ? `${players.filter((p) => !p._id).length} new player${players.filter((p) => !p._id).length !== 1 ? 's' : ''} ready to be registered`
                      : `${selectedPlayerIds.length} existing player${selectedPlayerIds.length !== 1 ? 's' : ''} selected`}
                  </p>
                  {!isFormValid && (
                    <p className='text-warning small mb-0 mt-1'>
                      <i className='ti ti-alert-triangle me-1'></i>
                      {hasNewPlayers && !areNewPlayersValid
                        ? 'Complete all required information for new players'
                        : 'Select at least one player or add a new player'}
                    </p>
                  )}
                </div>
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
                    <>
                      <i className='ti ti-check me-2'></i>Complete Registration
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      }

      if (isPostPaymentScenario) {
        if (!hasNewPlayers) return null;

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
                      <i className='ti ti-alert-triangle me-1'></i>
                      Complete all required information for new players
                    </p>
                  )}
                </div>
                <button
                  type='button'
                  className={`btn btn-lg ${isFormValid ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={handleSubmit}
                  disabled={isSubmitting || !isFormValid}
                >
                  {isSubmitting ? (
                    <>
                      <span className='spinner-border spinner-border-sm me-2'></span>
                      Adding Players...
                    </>
                  ) : (
                    <>
                      <i className='ti ti-user-plus me-2'></i>Add Players to
                      Account
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      }
    }

    // Payment-required path
    const totalPlayersNeedingPayment =
      selectedPlayerIds.length + players.filter((p) => !p._id).length;

    if (!hasPlayersToProcess) return null;

    return (
      <div className='card mt-4'>
        <div className='card-body'>
          <div className='d-flex justify-content-between align-items-center'>
            <div>
              <h5 className='mb-1'>Ready to Make Payment</h5>
              <p className='text-muted mb-0'>
                {isFormValid ? (
                  <>
                    {totalPlayersNeedingPayment} player
                    {totalPlayersNeedingPayment !== 1 ? 's' : ''} ready for
                    payment
                    {hasSelectedUnpaidPlayers &&
                      hasNewPlayers &&
                      ' (selected existing + new players)'}
                    {hasSelectedUnpaidPlayers &&
                      !hasNewPlayers &&
                      ' (selected existing players)'}
                    {!hasSelectedUnpaidPlayers &&
                      hasNewPlayers &&
                      ' (new players)'}
                  </>
                ) : (
                  'Select players or add new players to continue'
                )}
              </p>
              {!isFormValid && (
                <p className='text-warning small mb-0 mt-1'>
                  <i className='ti ti-alert-triangle me-1'></i>
                  {hasNewPlayers && !areNewPlayersValid
                    ? 'Complete all required information for new players'
                    : 'Select at least one player or add a new player'}
                </p>
              )}
            </div>
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
                <>
                  <i className='ti ti-credit-card me-2'></i>Continue to Payment
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ── New user path ─────────────────────────────────────────────────────────────

  if (!isExistingUser) {
    const allNewPlayersValid = players.every(
      (p, idx) =>
        p.fullName?.trim() &&
        p.gender &&
        p.dob &&
        p.schoolName?.trim() &&
        p.grade &&
        gradeConfirmed[idx],
    );

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
                  {!allNewPlayersValid && (
                    <p className='text-warning small mb-0 mt-1'>
                      <i className='ti ti-alert-triangle me-1'></i>
                      Complete all required information for players
                    </p>
                  )}
                </div>
                <button
                  type='button'
                  className={`btn btn-lg ${allNewPlayersValid ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={handleSubmit}
                  disabled={
                    isSubmitting || players.length === 0 || !allNewPlayersValid
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

  // ── Existing user path ────────────────────────────────────────────────────────

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

export default PlayerRegistrationModule;
