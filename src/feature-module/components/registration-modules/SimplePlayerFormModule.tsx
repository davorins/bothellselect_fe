// components/registration-modules/SimplePlayerFormModule.tsx
import React, { useState, useEffect } from 'react';
import { Player } from '../../../types/registration-types';
import { calculateGradeFromDOB } from '../../../utils/registration-utils';
import SchoolAutocomplete from '../../../components/SchoolAutocomplete';
import NameInput from '../../../components/NameInput';

interface SimplePlayerFormModuleProps {
  players: Player[];
  onPlayersChange: (players: Player[]) => void;
  registrationYear: number;
  season: string;
  onValidationChange?: (isValid: boolean) => void;
  maxPlayers?: number;
}

const SimplePlayerFormModule: React.FC<SimplePlayerFormModuleProps> = ({
  players,
  onPlayersChange,
  registrationYear,
  season,
  onValidationChange,
  maxPlayers = 10,
}) => {
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  // Helper to create a new player
  const createNewPlayer = (): Player => ({
    fullName: '',
    gender: '',
    dob: '',
    schoolName: '',
    healthConcerns: '',
    aauNumber: '',
    registrationYear,
    season,
    grade: '',
  });

  // Add a new player
  const addPlayer = () => {
    if (players.length >= maxPlayers) {
      return; // Don't exceed max players
    }
    const newPlayer = createNewPlayer();
    const updatedPlayers = [...players, newPlayer];
    onPlayersChange(updatedPlayers);
  };

  // Remove a player
  const removePlayer = (index: number) => {
    const updatedPlayers = [...players];
    updatedPlayers.splice(index, 1);
    onPlayersChange(updatedPlayers);
  };

  // Handle player field changes
  const handlePlayerChange = (
    index: number,
    field: keyof Player,
    value: string,
  ) => {
    const updatedPlayers = [...players];
    const updatedPlayer = { ...updatedPlayers[index], [field]: value };

    if (field === 'dob' && !updatedPlayer.isGradeOverridden) {
      // Calculate grade from DOB
      if (value && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const calculatedGrade = calculateGradeFromDOB(value, registrationYear);
        updatedPlayer.grade = calculatedGrade;
      }
    }

    updatedPlayers[index] = updatedPlayer;
    onPlayersChange(updatedPlayers);
  };

  // Handle grade override
  const handleGradeOverride = (index: number) => {
    const updatedPlayers = [...players];
    updatedPlayers[index] = {
      ...updatedPlayers[index],
      isGradeOverridden: true,
    };
    onPlayersChange(updatedPlayers);
  };

  // Validate all players
  const validateAllPlayers = (): boolean => {
    const errors: Record<string, string> = {};

    if (players.length === 0) {
      // No players is valid (optional)
      setValidationErrors(errors);
      onValidationChange?.(true);
      return true;
    }

    let allValid = true;

    players.forEach((player, index) => {
      if (!player.fullName?.trim()) {
        errors[`player${index}FullName`] = 'Full name is required';
        allValid = false;
      }
      if (!player.gender) {
        errors[`player${index}Gender`] = 'Gender is required';
        allValid = false;
      }
      if (!player.dob) {
        errors[`player${index}Dob`] = 'Date of birth is required';
        allValid = false;
      }
      if (!player.schoolName?.trim()) {
        errors[`player${index}School`] = 'School name is required';
        allValid = false;
      }
      if (!player.grade) {
        errors[`player${index}Grade`] = 'Grade is required';
        allValid = false;
      }
    });

    setValidationErrors(errors);
    onValidationChange?.(allValid);
    return allValid;
  };

  // Validate when players change
  useEffect(() => {
    validateAllPlayers();
  }, [players]);

  // If no players, show add button
  if (players.length === 0) {
    return (
      <div className='text-center py-4 border rounded bg-light'>
        <i className='ti ti-user-plus fs-1 text-muted mb-3 d-block'></i>
        <p className='text-muted mb-3'>No players added yet</p>
        <button type='button' className='btn btn-primary' onClick={addPlayer}>
          Add First Player
        </button>
        <div className='mt-3'>
          <p className='text-muted small mb-0'>
            Players are optional. You can add them later from your dashboard.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Player forms */}
      {players.map((player, index) => (
        <div
          key={index}
          className='player-form-section mb-4 border rounded p-4'
        >
          <div className='d-flex justify-content-between align-items-center mb-3'>
            <h6 className='text-primary mb-0'>Player {index + 1}</h6>
            {players.length > 1 && (
              <button
                type='button'
                className='btn btn-sm btn-outline-danger'
                onClick={() => removePlayer(index)}
              >
                <i className='ti ti-trash me-1'></i>
                Remove
              </button>
            )}
          </div>

          <div className='row'>
            <div className='col-md-6'>
              <NameInput
                value={player.fullName}
                onChange={(val) => handlePlayerChange(index, 'fullName', val)}
                error={validationErrors[`player${index}FullName`]}
                required
              />
            </div>

            <div className='col-md-6'>
              <div className='mb-3'>
                <label className='form-label'>
                  Gender <span className='text-danger'>*</span>
                </label>
                <select
                  className={`form-control ${
                    validationErrors[`player${index}Gender`] ? 'is-invalid' : ''
                  }`}
                  value={player.gender}
                  onChange={(e) =>
                    handlePlayerChange(index, 'gender', e.target.value)
                  }
                >
                  <option value=''>Select Gender</option>
                  <option value='Male'>Male</option>
                  <option value='Female'>Female</option>
                </select>
                {validationErrors[`player${index}Gender`] && (
                  <div className='invalid-feedback'>
                    {validationErrors[`player${index}Gender`]}
                  </div>
                )}
              </div>
            </div>

            <div className='col-md-6'>
              <div className='mb-3'>
                <label className='form-label'>
                  Date of Birth <span className='text-danger'>*</span>
                </label>
                <input
                  type='date'
                  className={`form-control ${
                    validationErrors[`player${index}Dob`] ? 'is-invalid' : ''
                  }`}
                  value={player.dob}
                  onChange={(e) =>
                    handlePlayerChange(index, 'dob', e.target.value)
                  }
                />
                {validationErrors[`player${index}Dob`] && (
                  <div className='invalid-feedback'>
                    {validationErrors[`player${index}Dob`]}
                  </div>
                )}
              </div>
            </div>

            <div className='col-md-6'>
              <div className='mb-3'>
                <label className='form-label'>
                  School Name <span className='text-danger'>*</span>
                </label>
                <SchoolAutocomplete
                  value={player.schoolName}
                  onChange={(val) =>
                    handlePlayerChange(index, 'schoolName', val)
                  }
                />
                {validationErrors[`player${index}School`] && (
                  <div className='invalid-feedback'>
                    {validationErrors[`player${index}School`]}
                  </div>
                )}
              </div>
            </div>

            <div className='col-md-6'>
              <div className='mb-3'>
                <label className='form-label'>
                  Grade <span className='text-danger'>*</span>
                </label>
                <select
                  className={`form-control ${
                    validationErrors[`player${index}Grade`] ? 'is-invalid' : ''
                  }`}
                  value={player.grade}
                  onChange={(e) =>
                    handlePlayerChange(index, 'grade', e.target.value)
                  }
                >
                  <option value=''>Select Grade</option>
                  <option value='PK'>Pre-Kindergarten</option>
                  <option value='K'>Kindergarten</option>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((grade) => (
                    <option key={grade} value={grade.toString()}>
                      {grade} Grade
                    </option>
                  ))}
                </select>
                {player.dob && !player.isGradeOverridden && player.grade && (
                  <div className='text-muted small mt-1'>
                    Auto-calculated: {player.grade} Grade
                    <button
                      type='button'
                      className='btn btn-link btn-sm p-0 ms-2'
                      onClick={() => handleGradeOverride(index)}
                    >
                      Adjust Grade
                    </button>
                  </div>
                )}
                {validationErrors[`player${index}Grade`] && (
                  <div className='invalid-feedback'>
                    {validationErrors[`player${index}Grade`]}
                  </div>
                )}
              </div>
            </div>

            <div className='col-md-6'>
              <div className='mb-3'>
                <label className='form-label'>Health Concerns</label>
                <input
                  type='text'
                  className='form-control'
                  value={player.healthConcerns}
                  onChange={(e) =>
                    handlePlayerChange(index, 'healthConcerns', e.target.value)
                  }
                  placeholder='Any allergies, medications, or health conditions'
                />
              </div>
            </div>

            <div className='col-md-6'>
              <div className='mb-3'>
                <label className='form-label'>AAU Number</label>
                <input
                  type='text'
                  className='form-control'
                  value={player.aauNumber}
                  onChange={(e) =>
                    handlePlayerChange(index, 'aauNumber', e.target.value)
                  }
                  placeholder='If applicable'
                />
              </div>
            </div>
          </div>

          {/* Validation summary for this player */}
          {(validationErrors[`player${index}FullName`] ||
            validationErrors[`player${index}Gender`] ||
            validationErrors[`player${index}Dob`] ||
            validationErrors[`player${index}School`] ||
            validationErrors[`player${index}Grade`]) && (
            <div className='alert alert-warning small mt-3'>
              <i className='ti ti-alert-triangle me-1'></i>
              Please complete all required fields for this player
            </div>
          )}
        </div>
      ))}

      {/* Add another player button at bottom */}
      {players.length < maxPlayers && (
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
    </div>
  );
};

export default SimplePlayerFormModule;
