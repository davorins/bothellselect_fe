import React, { useState, useEffect } from 'react';
import { Team, WizardStepCommonProps } from '../../../types/registration-types';
import { validateTeam } from '../../../utils/registration-utils';

// Extend the base props with common wizard props
interface TeamRegistrationModuleProps extends WizardStepCommonProps {
  team: Team;
  onTeamChange: (team: Team) => void;
  tournament: string;
  registrationYear: number;
  isExistingUser?: boolean;
  existingTeams?: Team[];
  onValidationChange?: (isValid: boolean) => void;
}

const TeamRegistrationModule: React.FC<TeamRegistrationModuleProps> = ({
  team,
  onTeamChange,
  tournament,
  registrationYear,
  isExistingUser = false,
  existingTeams = [],
  onValidationChange,
  onComplete,
  onBack,
  // formData, updateFormData, eventData are available from WizardStepCommonProps
}) => {
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  const handleTeamSelection = (teamId: string) => {
    setSelectedTeamId(teamId);
    const selectedTeam = existingTeams.find((t) => t._id === teamId);
    if (selectedTeam) {
      onTeamChange({
        ...selectedTeam,
        registrationYear,
        tournament,
      });
    }
  };

  const handleNewTeamChange = (field: keyof Team, value: string) => {
    const updatedTeam = { ...team, [field]: value };
    onTeamChange(updatedTeam);
  };

  const validateTeamData = (): boolean => {
    const errors = validateTeam(team);
    setValidationErrors(errors);
    const isValid = Object.keys(errors).length === 0;
    onValidationChange?.(isValid);
    return isValid;
  };

  useEffect(() => {
    validateTeamData();
  }, [team]);

  return (
    <div className='card'>
      <div className='card-header bg-light'>
        <h4>Team Information</h4>
      </div>
      <div className='card-body'>
        {isExistingUser && existingTeams.length > 0 && (
          <div className='mb-4'>
            <h5>Select Team</h5>
            <p>Choose which team to register for the {tournament}:</p>

            {existingTeams.map((existingTeam) => (
              <div key={existingTeam._id} className='form-check mb-3'>
                <input
                  type='radio'
                  className='form-check-input'
                  id={`team-${existingTeam._id}`}
                  checked={selectedTeamId === existingTeam._id}
                  onChange={() => handleTeamSelection(existingTeam._id!)}
                />
                <label
                  className='form-check-label d-flex align-items-center'
                  htmlFor={`team-${existingTeam._id}`}
                >
                  <span>
                    {existingTeam.name} ({existingTeam.grade} Grade,{' '}
                    {existingTeam.sex}, {existingTeam.levelOfCompetition})
                  </span>
                </label>
              </div>
            ))}

            <div className='form-check mb-3'>
              <input
                type='radio'
                className='form-check-input'
                id='new-team'
                checked={selectedTeamId === null}
                onChange={() => {
                  setSelectedTeamId(null);
                  onTeamChange({
                    name: '',
                    grade: '',
                    sex: 'Male',
                    levelOfCompetition: 'Gold',
                    registrationYear,
                    tournament,
                    coachIds: [],
                  });
                }}
              />
              <label className='form-check-label' htmlFor='new-team'>
                Create a new team
              </label>
            </div>
          </div>
        )}

        {(selectedTeamId === null || !isExistingUser) && (
          <div className='row'>
            <div className='col-md-12'>
              <div className='mb-3'>
                <label className='form-label'>Team Name</label>
                <input
                  type='text'
                  className={`form-control ${
                    validationErrors.name ? 'is-invalid' : ''
                  }`}
                  value={team.name}
                  onChange={(e) => handleNewTeamChange('name', e.target.value)}
                  required
                />
                {validationErrors.name && (
                  <div className='invalid-feedback'>
                    {validationErrors.name}
                  </div>
                )}
              </div>
            </div>
            <div className='col-md-6'>
              <div className='mb-3'>
                <label className='form-label'>Grade</label>
                <select
                  className={`form-control ${
                    validationErrors.grade ? 'is-invalid' : ''
                  }`}
                  value={team.grade}
                  onChange={(e) => handleNewTeamChange('grade', e.target.value)}
                  required
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
                {validationErrors.grade && (
                  <div className='invalid-feedback'>
                    {validationErrors.grade}
                  </div>
                )}
              </div>
            </div>
            <div className='col-md-6'>
              <div className='mb-3'>
                <label className='form-label'>Team Gender</label>
                <select
                  className={`form-control ${
                    validationErrors.sex ? 'is-invalid' : ''
                  }`}
                  value={team.sex}
                  onChange={(e) => handleNewTeamChange('sex', e.target.value)}
                  required
                >
                  <option value='Male'>Male</option>
                  <option value='Female'>Female</option>
                </select>
                {validationErrors.sex && (
                  <div className='invalid-feedback'>{validationErrors.sex}</div>
                )}
              </div>
            </div>
            <div className='col-md-12'>
              <div className='mb-3'>
                <label className='form-label'>Level of Competition</label>
                <select
                  className={`form-control ${
                    validationErrors.levelOfCompetition ? 'is-invalid' : ''
                  }`}
                  value={team.levelOfCompetition}
                  onChange={(e) =>
                    handleNewTeamChange('levelOfCompetition', e.target.value)
                  }
                  required
                >
                  <option value='Gold'>Gold (Competitive)</option>
                  <option value='Silver'>Silver (Recreational)</option>
                </select>
                {validationErrors.levelOfCompetition && (
                  <div className='invalid-feedback'>
                    {validationErrors.levelOfCompetition}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamRegistrationModule;
