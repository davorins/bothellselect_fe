import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useTournamentEvent } from '../../../context/TournamentEventContext';
import {
  Team,
  WizardStepCommonProps,
  TournamentSpecificConfig,
} from '../../../types/registration-types';

interface TournamentRegistrationModuleProps extends WizardStepCommonProps {
  isExistingUser?: boolean;
  existingTeams?: Team[];
  tournamentConfig?: TournamentSpecificConfig;
  coachId?: string;
}

const TournamentRegistrationModule: React.FC<
  TournamentRegistrationModuleProps
> = ({
  isExistingUser = false,
  existingTeams = [],
  tournamentConfig,
  coachId,
  onComplete,
  onBack,
  formData,
  updateFormData,
  eventData,
  onValidationChange,
}) => {
  const { parent: currentUser } = useAuth();
  const { tournamentEvent } = useTournamentEvent();

  // Refs
  const lastValidatedTeamsRef = useRef<string>('');
  const prevTeamsRef = useRef<Team[]>([]);

  // State
  const [existingTeamsState, setExistingTeamsState] =
    useState<Team[]>(existingTeams);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [showTournamentInfo, setShowTournamentInfo] = useState(true);
  const [hasValidTeam, setHasValidTeam] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [teamExistsWarning, setTeamExistsWarning] = useState<string | null>(
    null
  );
  const [isAlreadyRegistered, setIsAlreadyRegistered] = useState(false);
  const [tournamentError, setTournamentError] = useState<string | null>(null);
  const [showWelcomeBackPrompt, setShowWelcomeBackPrompt] = useState(false);
  const [hasCheckedPaidRegistrations, setHasCheckedPaidRegistrations] =
    useState(false);
  const [teamsToRegister, setTeamsToRegister] = useState<Team[]>([]);
  const [hasLoadedExistingTeams, setHasLoadedExistingTeams] = useState(false);

  // Get API base URL
  const API_BASE_URL =
    process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001';

  // Get tournament fee from config or default
  const tournamentFee = useMemo(() => {
    if (tournamentConfig?.tournamentFee) {
      return tournamentConfig.tournamentFee;
    }
    if (formData.eventData?.tournamentFee) {
      return formData.eventData.tournamentFee;
    }
    return 425;
  }, [tournamentConfig, formData.eventData]);

  // Get divisions from config or default
  const availableDivisions = useMemo(() => {
    if (tournamentConfig?.divisions && tournamentConfig.divisions.length > 0) {
      return tournamentConfig.divisions;
    }
    return ['Gold', 'Silver'];
  }, [tournamentConfig]);

  // Tournament event data
  const memoizedTournamentEvent = useMemo(() => {
    const event = tournamentEvent as any;

    if (event) {
      return {
        tournament: event.tournament || event.season || 'Tournament',
        year: event.year || new Date().getFullYear(),
        eventId: event.tournamentId || event.eventId || '',
        tournamentFee: event.tournamentFee || tournamentFee,
      };
    }

    if (eventData) {
      return {
        tournament: eventData.season || 'Tournament',
        year: eventData.year || new Date().getFullYear(),
        eventId: eventData.eventId || '',
        tournamentFee: eventData.tournamentFee || tournamentFee,
      };
    }

    return {
      tournament: 'Tournament',
      year: new Date().getFullYear(),
      eventId: '',
      tournamentFee: tournamentFee,
    };
  }, [eventData, tournamentEvent, tournamentFee]);

  // Initialize teams from formData - ONCE ONLY
  useEffect(() => {
    if (formData.teams && formData.teams.length > 0) {
      setTeams(formData.teams);
    } else if (formData.team) {
      setTeams([formData.team]);
    } else {
      setTeams([]);
    }
  }, []); // Empty dependency array - run only once

  // Function to check existing registration (same as old form)
  const checkExistingRegistration = useCallback(
    async (teamId: string) => {
      if (!isExistingUser || !currentUser?._id)
        return { isRegistered: false, isPaid: false };

      try {
        const response = await fetch(
          `${API_BASE_URL}/registrations/check/${
            currentUser._id
          }/${teamId}/${encodeURIComponent(
            memoizedTournamentEvent.tournament
          )}/${memoizedTournamentEvent.year}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          }
        );

        if (!response.ok) {
          console.error('Registration check failed:', response.status);
          return { isRegistered: false, isPaid: false };
        }

        const data = await response.json();
        return {
          isRegistered: data.isRegistered === true,
          isPaid: data.isPaid === true,
        };
      } catch (error) {
        console.error('Error checking registration:', error);
        return { isRegistered: false, isPaid: false };
      }
    },
    [
      isExistingUser,
      currentUser?._id,
      memoizedTournamentEvent.tournament,
      memoizedTournamentEvent.year,
      API_BASE_URL,
    ]
  );

  // Function to get team payment status
  const getTeamPaymentStatus = useCallback(
    async (team: Team): Promise<'paid' | 'pending' | 'not-registered'> => {
      if (!team._id) return 'not-registered';

      const { isRegistered, isPaid } = await checkExistingRegistration(
        team._id
      );

      if (isRegistered && isPaid) {
        return 'paid';
      } else if (isRegistered && !isPaid) {
        return 'pending';
      }
      return 'not-registered';
    },
    [checkExistingRegistration]
  );

  // Function to refresh team payment status
  const refreshTeamPaymentStatus = useCallback(async () => {
    if (!isExistingUser || !currentUser?._id) return;

    try {
      console.log('🔄 Refreshing team payment status...');
      const updatedExistingTeams = await Promise.all(
        existingTeamsState.map(async (team) => {
          if (!team._id) return team;

          try {
            const { isRegistered, isPaid } = await checkExistingRegistration(
              team._id
            );

            return {
              ...team,
              paymentComplete: isPaid,
              paymentStatus: isPaid
                ? 'paid'
                : isRegistered
                ? 'pending'
                : 'not-registered',
            };
          } catch (error) {
            console.warn(
              `Error refreshing status for team ${team._id}:`,
              error
            );
            return team;
          }
        })
      );

      setExistingTeamsState(updatedExistingTeams);

      // Update selected teams status as well
      setTeams((prevTeams) =>
        prevTeams.map((team) => {
          if (!team._id) return team;
          const updatedTeam = updatedExistingTeams.find(
            (t) => t._id === team._id
          );
          return updatedTeam || team;
        })
      );

      console.log('✅ Team payment status refreshed');
    } catch (error) {
      console.error('Error refreshing team payment status:', error);
    }
  }, [
    isExistingUser,
    currentUser,
    existingTeamsState,
    checkExistingRegistration,
  ]);

  useEffect(() => {
    if (hasCheckedPaidRegistrations && isExistingUser) {
      // Refresh status after a delay to ensure payment has been processed
      const timer = setTimeout(() => {
        refreshTeamPaymentStatus();
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [hasCheckedPaidRegistrations, isExistingUser, refreshTeamPaymentStatus]);

  // Load existing teams and check for unpaid registrations
  useEffect(() => {
    const loadExistingTeams = async () => {
      if (
        isExistingUser &&
        currentUser?._id &&
        memoizedTournamentEvent.tournament
      ) {
        try {
          setIsProcessing(true);

          const token = localStorage.getItem('token');

          // Fetch existing teams
          const response = await fetch(
            `${API_BASE_URL}/teams/by-coach/${currentUser._id}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (response.ok) {
            const teams = await response.json();
            console.log('Fetched existing teams:', teams);

            // Categorize teams by payment status
            const paidTeams: Team[] = [];
            const unpaidTeams: Team[] = [];
            const unregisteredTeams: Team[] = [];

            for (const team of teams) {
              try {
                const { isRegistered, isPaid } =
                  await checkExistingRegistration(team._id!);

                if (isRegistered && isPaid) {
                  // Already paid - should not be selectable
                  paidTeams.push({
                    ...team,
                    paymentComplete: true,
                    paymentStatus: 'paid',
                    tournament: memoizedTournamentEvent.tournament,
                    registrationYear: memoizedTournamentEvent.year,
                  });
                } else if (isRegistered && !isPaid) {
                  // Registered but unpaid - can be selected for payment
                  unpaidTeams.push({
                    ...team,
                    paymentComplete: false,
                    paymentStatus: 'pending',
                    tournament: memoizedTournamentEvent.tournament,
                    registrationYear: memoizedTournamentEvent.year,
                  });
                } else {
                  // Not registered at all - can be selected for registration
                  unregisteredTeams.push({
                    ...team,
                    paymentComplete: false,
                    paymentStatus: 'not-registered',
                  });
                }
              } catch (error) {
                console.warn(
                  `Error checking registration for team ${team._id}:`,
                  error
                );
                unregisteredTeams.push(team);
              }
            }

            console.log('Team categorization:', {
              paidTeams: paidTeams.length,
              unpaidTeams: unpaidTeams.length,
              unregisteredTeams: unregisteredTeams.length,
            });

            // Set all teams (for display)
            setExistingTeamsState([
              ...paidTeams,
              ...unpaidTeams,
              ...unregisteredTeams,
            ]);

            // If there are unpaid registrations, prepare for payment
            if (unpaidTeams.length > 0) {
              setSelectedTeamIds(unpaidTeams.map((team) => team._id!));
              setTeamsToRegister(unpaidTeams);
              setTeams(unpaidTeams);
              setShowWelcomeBackPrompt(true);
              setHasValidTeam(true);
            }
          }
        } catch (error) {
          console.error('Failed to fetch teams:', error);
        } finally {
          setIsProcessing(false);
          setHasLoadedExistingTeams(true);
          setHasCheckedPaidRegistrations(true);
        }
      } else {
        setHasLoadedExistingTeams(true);
      }
    };

    if (memoizedTournamentEvent.tournament && memoizedTournamentEvent.year) {
      loadExistingTeams();
    } else {
      setTournamentError(
        'Tournament information is missing. Please try again later.'
      );
      setHasLoadedExistingTeams(true);
    }
  }, [
    isExistingUser,
    currentUser,
    memoizedTournamentEvent,
    checkExistingRegistration,
    API_BASE_URL,
  ]);

  // Validation function - memoized
  const validateTeams = useCallback(
    (
      teamsToValidate: Team[]
    ): { errors: Record<string, string>; isValid: boolean } => {
      const errors: Record<string, string> = {};
      let hasValid = false;

      teamsToValidate.forEach((team, index) => {
        if (!team.name?.trim()) {
          errors[`teamName-${index}`] = 'Team name is required';
        }
        if (!team.grade?.trim()) {
          errors[`teamGrade-${index}`] = 'Grade is required';
        }
        if (!team.sex) {
          errors[`teamSex-${index}`] = 'Team gender is required';
        }
        if (
          !team.levelOfCompetition ||
          !availableDivisions.includes(team.levelOfCompetition)
        ) {
          errors[`teamLevel-${index}`] = 'Valid division is required';
        }

        if (
          team.name?.trim() &&
          team.grade?.trim() &&
          ['Male', 'Female'].includes(team.sex) &&
          availableDivisions.includes(team.levelOfCompetition)
        ) {
          hasValid = true;
        }
      });

      if (!hasValid && teamsToValidate.length > 0) {
        errors.general = 'At least one complete team is required';
      }

      return { errors, isValid: hasValid };
    },
    [availableDivisions]
  );

  // Run validation when teams change
  useEffect(() => {
    // Skip if teams haven't changed
    if (JSON.stringify(teams) === JSON.stringify(prevTeamsRef.current)) {
      return;
    }

    prevTeamsRef.current = teams;

    const { errors, isValid } = validateTeams(teams);
    setValidationErrors(errors);
    setHasValidTeam(isValid);
    onValidationChange?.(isValid);
  }, [teams, validateTeams, onValidationChange]);

  // Update formData when teams change - debounced
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (teams.length === 0 && !formData.team && !formData.teams?.length) {
        return;
      }

      updateFormData({
        team: teams[0],
        teams: teams,
      });
    }, 300); // Debounce by 300ms

    return () => clearTimeout(timeoutId);
  }, [teams, formData.team, formData.teams, updateFormData]);

  // Handle team selection for existing teams (same as old form)
  const handleTeamSelection = useCallback(
    async (teamId: string, isSelected: boolean) => {
      console.log('Team selection:', { teamId, isSelected });

      // Validate teamId first
      if (!teamId || teamId === 'undefined' || typeof teamId !== 'string') {
        console.error('Invalid team ID in handleTeamSelection:', teamId);
        setSaveError('Invalid team selection. Please try again.');
        return;
      }

      // Validate MongoDB ObjectId format
      if (!/^[0-9a-fA-F]{24}$/.test(teamId)) {
        console.error('Invalid team ID format:', teamId);
        setSaveError('Invalid team ID format. Please contact support.');
        return;
      }

      const { isRegistered, isPaid } = await checkExistingRegistration(teamId);

      if (isRegistered && isPaid) {
        setIsAlreadyRegistered(true);
        setSaveError(
          'You have already registered and paid for this team in the tournament.'
        );
        return;
      }

      if (isSelected) {
        // Add team to selected teams
        setSelectedTeamIds((prev) => {
          if (prev.includes(teamId)) {
            console.log('Team already selected:', teamId);
            return prev;
          }
          const newIds = [...prev, teamId];
          console.log('Adding team ID:', teamId, 'New selected IDs:', newIds);
          return newIds;
        });

        const selectedTeam = existingTeamsState.find((t) => t._id === teamId);
        if (selectedTeam && selectedTeam._id) {
          console.log('Found selected team:', selectedTeam.name);

          // Update teamsToRegister
          setTeamsToRegister((prev) => [
            ...prev,
            {
              ...selectedTeam,
              registrationYear: memoizedTournamentEvent.year,
              tournament: memoizedTournamentEvent.tournament,
            },
          ]);

          // Update teams - replace or add
          setTeams((prev) => {
            // Check if team already exists in teams
            const existingTeamIndex = prev.findIndex((t) => t._id === teamId);

            if (existingTeamIndex >= 0) {
              // Update existing team
              const newTeams = [...prev];
              newTeams[existingTeamIndex] = {
                ...selectedTeam,
                registrationYear: memoizedTournamentEvent.year,
                tournament: memoizedTournamentEvent.tournament,
              };

              console.log('Updated existing team in formData');
              return newTeams;
            } else {
              // Add new team
              console.log('Adding new team to formData');
              return [
                ...prev,
                {
                  ...selectedTeam,
                  registrationYear: memoizedTournamentEvent.year,
                  tournament: memoizedTournamentEvent.tournament,
                },
              ];
            }
          });
        } else {
          console.error('Selected team not found or has no ID:', {
            teamId,
            selectedTeam,
          });
          setSaveError('Selected team not found. Please try again.');
        }
      } else {
        // Remove team from selected teams
        setSelectedTeamIds((prev) => {
          const newIds = prev.filter((id) => id !== teamId);
          console.log('Removing team ID:', teamId, 'New selected IDs:', newIds);
          return newIds;
        });
        setTeamsToRegister((prev) =>
          prev.filter((team) => team._id !== teamId)
        );

        // Remove from teams
        setTeams((prev) => prev.filter((team) => team._id !== teamId));
      }

      setTeamExistsWarning(null);
      setIsAlreadyRegistered(false);
      setShowWelcomeBackPrompt(false);
    },
    [existingTeamsState, memoizedTournamentEvent, checkExistingRegistration]
  );

  const handleTeamChange = useCallback(
    (index: number, field: keyof Team, value: string) => {
      setTeams((prevTeams) => {
        if (field === 'sex') {
          const validSexValues = ['Male', 'Female']; // ONLY these two
          if (value === '' || !validSexValues.includes(value)) {
            value = 'Male';
          }
        }

        const updatedTeams = [...prevTeams];
        updatedTeams[index] = {
          ...updatedTeams[index],
          [field]: value,
        };
        return updatedTeams;
      });
    },
    []
  );

  const addNewTeam = useCallback(() => {
    const newTeam: Team = {
      name: '',
      grade: '',
      sex: 'Male',
      levelOfCompetition: availableDivisions[0] || 'Gold',
      registrationYear: memoizedTournamentEvent.year,
      tournament: memoizedTournamentEvent.tournament,
      coachIds: coachId ? [coachId] : [],
      paymentComplete: false,
      paymentStatus: 'pending',
    };

    setTeams((prev) => [...prev, newTeam]);
    setSelectedTeamIds([]);
    setTeamsToRegister([]);
  }, [availableDivisions, memoizedTournamentEvent, coachId]);

  const removeTeam = useCallback(
    (index: number) => {
      if (teams.length > 1) {
        setTeams((prev) => {
          const updatedTeams = prev.filter((_, i) => i !== index);
          const removedTeam = prev[index];
          if (removedTeam._id) {
            setSelectedTeamIds((prevIds) =>
              prevIds.filter((id) => id !== removedTeam._id)
            );
            setTeamsToRegister((prevTeams) =>
              prevTeams.filter((team) => team._id !== removedTeam._id)
            );
          }
          return updatedTeams;
        });
      }
    },
    [teams.length]
  );

  const calculateTotalAmount = useCallback((): number => {
    const validTeams = teams.filter(
      (team) =>
        team.name?.trim() &&
        team.grade?.trim() &&
        ['Male', 'Female'].includes(team.sex) &&
        availableDivisions.includes(team.levelOfCompetition)
    );
    return validTeams.length * tournamentFee;
  }, [teams, availableDivisions, tournamentFee]);

  // Function to register existing teams for tournament (same as old form)
  const registerExistingTeamsForTournament = useCallback(
    async (teamIds: string[]) => {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('❌ No authentication token found');
        throw new Error('Not authenticated. Please log in again.');
      }

      // Validate team IDs
      const validTeamIds = teamIds.filter((teamId) => {
        if (!teamId || typeof teamId !== 'string') {
          console.error('Invalid team ID:', teamId);
          return false;
        }

        // Check MongoDB ObjectId format
        if (!/^[0-9a-fA-F]{24}$/.test(teamId)) {
          console.error('Invalid team ID format (not ObjectId):', teamId);
          return false;
        }

        return true;
      });

      if (validTeamIds.length === 0) {
        throw new Error('No valid team IDs provided for registration');
      }

      console.log('🔍 DEBUG: Registering existing teams for tournament:', {
        validTeamIds,
        validTeamCount: validTeamIds.length,
        tournament: memoizedTournamentEvent.tournament,
        year: memoizedTournamentEvent.year,
        isAuthenticated: !!token,
      });

      const registrationPromises = validTeamIds.map(async (teamId) => {
        try {
          const selectedTeam = teams.find((t) => t._id === teamId);

          if (!selectedTeam) {
            console.error(`❌ Team not found in local state: ${teamId}`);
            throw new Error(`Team with ID ${teamId} not found`);
          }

          // Validate team has required properties
          if (!selectedTeam.levelOfCompetition) {
            console.error(`❌ Team missing levelOfCompetition:`, selectedTeam);
            throw new Error(
              `Team "${selectedTeam.name}" is missing division/level of competition`
            );
          }

          // Ensure levelOfCompetition is valid
          const validLevel = availableDivisions.includes(
            selectedTeam.levelOfCompetition
          )
            ? selectedTeam.levelOfCompetition
            : availableDivisions[0];

          const requestBody = {
            teamId,
            tournament: memoizedTournamentEvent.tournament,
            year: memoizedTournamentEvent.year,
            levelOfCompetition: validLevel,
            isAdmin: currentUser?.role === 'admin',
            // Add additional fields that might be required
            tournamentId: tournamentConfig?._id || null,
          };

          console.log('🔍 DEBUG: Sending registration request for team:', {
            teamId,
            teamName: selectedTeam.name,
            requestBody,
            endpoint: `${API_BASE_URL}/teams/register-tournament`,
          });

          const response = await fetch(
            `${API_BASE_URL}/teams/register-tournament`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(requestBody),
            }
          );

          console.log('🔍 DEBUG: Response received:', {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok,
          });

          if (!response.ok) {
            let errorMessage = `Team registration failed: ${response.status}`;

            try {
              const errorData = await response.json();
              console.error('🔍 DEBUG: Error response JSON:', errorData);
              errorMessage =
                errorData.message || errorData.error || errorMessage;

              // Handle specific error cases
              if (response.status === 400) {
                if (errorMessage.includes('already registered')) {
                  errorMessage = `Team "${selectedTeam.name}" is already registered for this tournament.`;
                } else if (errorMessage.includes('tournament')) {
                  errorMessage = `Tournament not found: ${memoizedTournamentEvent.tournament} ${memoizedTournamentEvent.year}`;
                }
              }
            } catch (e) {
              const errorText = await response.text();
              console.error('🔍 DEBUG: Error response text:', errorText);
              errorMessage = errorText || errorMessage;
            }

            throw new Error(errorMessage);
          }

          const result = await response.json();
          console.log('✅ Team registration successful:', {
            teamId,
            teamName: result.team?.name || selectedTeam.name,
            result,
          });

          return result.team || result;
        } catch (error) {
          console.error(`❌ Failed to register team ${teamId}:`, error);
          throw error; // Re-throw to be caught by Promise.all
        }
      });

      try {
        const results = await Promise.all(registrationPromises);
        console.log('✅ All teams registered successfully:', {
          count: results.length,
          teams: results.map((r) => r.name || r._id),
        });

        return results.filter(Boolean).map((r) => r.team || r);
      } catch (error) {
        console.error('❌ One or more team registrations failed:', error);
        throw error;
      }
    },
    [
      teams,
      memoizedTournamentEvent,
      availableDivisions,
      currentUser,
      tournamentConfig,
      API_BASE_URL,
    ]
  );

  // Save all teams function
  const saveAllTeams = useCallback(async (): Promise<Team[]> => {
    setIsProcessing(true);
    setSaveError(null);

    try {
      console.log('💾 SAVE ALL TEAMS: Starting team save process', {
        totalTeams: teams.length,
        existingTeamsCount: teams.filter((t) => t._id).length,
        newTeamsCount: teams.filter((t) => !t._id).length,
        selectedTeamIds: selectedTeamIds.length,
        teamsToRegisterCount: teamsToRegister.length,
        teams: teams.map((t: Team) => ({
          id: t._id,
          name: t.name,
          isExistingTeam: !!t._id,
          isNewTeam: !t._id,
          isSelected: selectedTeamIds.includes(t._id || ''),
          paymentStatus: t.paymentStatus,
          paymentComplete: t.paymentComplete,
        })),
      });

      // SCENARIO 1: Registering existing teams (abandoned cart or returning user)
      if (selectedTeamIds.length > 0 && teamsToRegister.length > 0) {
        console.log(
          '🔄 SCENARIO 1: Processing existing teams with payment pending',
          {
            teamCount: selectedTeamIds.length,
            tournament: memoizedTournamentEvent.tournament,
            year: memoizedTournamentEvent.year,
            teamIds: selectedTeamIds,
            teamsToRegister: teamsToRegister.map((t: Team) => ({
              id: t._id,
              name: t.name,
            })),
          }
        );

        // CRITICAL: Filter out teams that are already registered AND paid
        const teamsNeedingRegistration: string[] = [];
        const teamsAlreadyRegistered: Team[] = [];
        const teamsToProcess: Team[] = [];

        for (const teamId of selectedTeamIds) {
          const team = teams.find((t) => t._id === teamId);
          if (!team) {
            console.warn(`Team ${teamId} not found in local state`);
            continue;
          }

          // Check registration status
          const { isRegistered, isPaid } = await checkExistingRegistration(
            teamId
          );

          console.log(`Team "${team.name}" status check:`, {
            isRegistered,
            isPaid,
            teamId,
            localPaymentStatus: team.paymentStatus,
          });

          if (isRegistered && isPaid) {
            // Already paid - shouldn't be in selectedTeamIds, but handle gracefully
            console.log(`⚠️ Team "${team.name}" is already paid - skipping`);
            teamsAlreadyRegistered.push({
              ...team,
              paymentComplete: true,
              paymentStatus: 'paid',
            });
          } else if (isRegistered && !isPaid) {
            // Registered but payment pending - just needs payment
            console.log(
              `💰 Team "${team.name}" is registered but payment pending`
            );
            teamsAlreadyRegistered.push({
              ...team,
              paymentComplete: false,
              paymentStatus: 'pending',
              tournament: memoizedTournamentEvent.tournament,
              registrationYear: memoizedTournamentEvent.year,
            });
            teamsToProcess.push(team);
          } else {
            // Not registered yet - needs registration
            console.log(`📝 Team "${team.name}" needs registration`);
            teamsNeedingRegistration.push(teamId);
            teamsToProcess.push(team);
          }
        }

        console.log('📊 Team categorization:', {
          needsRegistration: teamsNeedingRegistration.length,
          alreadyRegistered: teamsAlreadyRegistered.length,
          teamsToProcess: teamsToProcess.length,
          teamsNeedingRegistration,
          teamsAlreadyRegistered: teamsAlreadyRegistered.map(
            (t: Team) => t.name
          ),
        });

        // Process teams that need registration
        let registeredTeams: Team[] = [];
        if (teamsNeedingRegistration.length > 0) {
          console.log('🏀 Registering new teams:', teamsNeedingRegistration);

          try {
            const newlyRegisteredTeams =
              await registerExistingTeamsForTournament(
                teamsNeedingRegistration
              );

            console.log('✅ Newly registered teams:', {
              count: newlyRegisteredTeams.length,
              teams: newlyRegisteredTeams.map((t: any) => ({
                id: t._id,
                name: t.name,
                type: typeof t,
              })),
            });

            // Transform and validate newly registered teams
            registeredTeams = newlyRegisteredTeams
              .filter((team: any) => team && team._id)
              .map((team: any) => ({
                ...team,
                registrationYear: memoizedTournamentEvent.year,
                tournament: memoizedTournamentEvent.tournament,
                paymentComplete: false,
                paymentStatus: 'pending',
                _id: team._id, // Ensure _id exists
              }));

            if (registeredTeams.length === 0) {
              throw new Error(
                'No valid teams were returned after registration'
              );
            }
          } catch (registrationError: any) {
            console.error('❌ Team registration failed:', registrationError);
            throw new Error(
              `Failed to register teams: ${registrationError.message}`
            );
          }
        }

        // Combine teams: Keep existing teams + newly registered teams
        const existingTeamsInState = teams.filter(
          (t) => t._id && !selectedTeamIds.includes(t._id)
        );
        const allTeams = [
          ...existingTeamsInState,
          ...teamsAlreadyRegistered,
          ...registeredTeams,
        ];

        console.log('🎯 Combined teams for payment:', {
          existingTeamsPreserved: existingTeamsInState.length,
          alreadyRegistered: teamsAlreadyRegistered.length,
          newlyRegistered: registeredTeams.length,
          totalTeams: allTeams.length,
          allTeams: allTeams.map((t: Team) => ({
            id: t._id,
            name: t.name,
            isExisting: existingTeamsInState.some((et) => et._id === t._id),
            isSelected: selectedTeamIds.includes(t._id || ''),
            paymentStatus: t.paymentStatus,
          })),
        });

        // Update local state - PRESERVE EXISTING TEAMS
        setTeams(allTeams);
        return allTeams;
      }
      // SCENARIO 2: Creating brand new teams (first-time registration OR adding to existing)
      else {
        console.log(
          '🆕 SCENARIO 2: Creating new teams (preserving existing teams)'
        );

        // Separate existing teams from new teams
        const existingTeamsInState = teams.filter((team) => team._id);
        const teamsToCreate = teams.filter(
          (team) => !team._id && team.name?.trim()
        );

        console.log('📋 Team breakdown:', {
          existingTeamsCount: existingTeamsInState.length,
          newTeamsCount: teamsToCreate.length,
          totalTeams: teams.length,
          existingTeams: existingTeamsInState.map((t: Team) => ({
            id: t._id,
            name: t.name,
          })),
          newTeams: teamsToCreate.map((t: Team) => ({
            name: t.name,
            grade: t.grade,
          })),
        });

        // If no new teams to create, return existing teams
        if (teamsToCreate.length === 0) {
          console.log('ℹ️ No new teams to create, returning existing teams');
          if (existingTeamsInState.length === 0) {
            throw new Error('No valid teams found to register');
          }
          return existingTeamsInState;
        }

        const token = localStorage.getItem('token');
        const tournamentName = memoizedTournamentEvent.tournament;
        const year = memoizedTournamentEvent.year;

        // Handle single team creation
        if (teamsToCreate.length === 1) {
          console.log('👤 Creating single team (while preserving existing)');

          try {
            const savedTeams = await createSingleTeam(teamsToCreate[0]);

            // Validate the returned teams have IDs
            const validNewTeams = savedTeams.filter((team: Team) => {
              if (!team._id) {
                console.error('Team created but missing ID:', team);
                return false;
              }
              return true;
            });

            if (validNewTeams.length === 0) {
              throw new Error(
                'Team creation failed - no valid team ID returned'
              );
            }

            // Combine existing teams with newly created team
            const allTeams = [...existingTeamsInState, ...validNewTeams];

            console.log(
              '✅ Single team created successfully (preserved existing):',
              {
                existingTeamsPreserved: existingTeamsInState.length,
                newTeamCreated: validNewTeams.length,
                totalTeams: allTeams.length,
                teamId: validNewTeams[0]._id,
                teamName: validNewTeams[0].name,
              }
            );

            // Update local state - PRESERVE EXISTING TEAMS
            setTeams(allTeams);
            return allTeams;
          } catch (singleError: any) {
            console.error('❌ Single team creation failed:', singleError);

            // Try fallback: create via multiple endpoint
            console.log('🔄 Trying fallback via multiple endpoint');
            try {
              const fallbackTeams = await createMultipleTeams(teamsToCreate);
              const validNewTeams = fallbackTeams.filter((t) => t._id);

              if (validNewTeams.length === 0) {
                throw new Error('Fallback team creation also failed');
              }

              // Combine existing teams with newly created teams
              const allTeams = [...existingTeamsInState, ...validNewTeams];
              setTeams(allTeams);
              return allTeams;
            } catch (fallbackError: any) {
              console.error('❌ Fallback team creation failed:', fallbackError);
              throw new Error(
                `Failed to create team: ${fallbackError.message}`
              );
            }
          }
        }
        // Handle multiple team creation
        else {
          console.log('👥 Creating multiple teams (while preserving existing)');

          try {
            const savedTeams = await createMultipleTeams(teamsToCreate);

            // Validate the returned teams
            const validNewTeams = savedTeams.filter((team: Team) => {
              if (!team._id) {
                console.error('Team created but missing ID:', team);
                return false;
              }
              return true;
            });

            if (validNewTeams.length === 0) {
              throw new Error(
                'Team creation failed - no valid team IDs returned'
              );
            }

            if (validNewTeams.length !== teamsToCreate.length) {
              console.warn(
                `⚠️ Created ${validNewTeams.length} out of ${teamsToCreate.length} new teams`
              );
            }

            // Combine existing teams with newly created teams
            const allTeams = [...existingTeamsInState, ...validNewTeams];

            console.log(
              '✅ Multiple teams created successfully (preserved existing):',
              {
                existingTeamsPreserved: existingTeamsInState.length,
                newTeamsCreated: validNewTeams.length,
                totalTeams: allTeams.length,
                expectedNewTeams: teamsToCreate.length,
                allTeams: allTeams.map((t: Team) => ({
                  id: t._id,
                  name: t.name,
                  isNew: !existingTeamsInState.some((et) => et._id === t._id),
                })),
              }
            );

            // Update local state - PRESERVE EXISTING TEAMS
            setTeams(allTeams);
            return allTeams;
          } catch (multiError: any) {
            console.error('❌ Multiple team creation failed:', multiError);

            // Fallback: try creating teams one by one
            console.log('🔄 Trying fallback: creating teams individually');
            const createdTeams: Team[] = [];

            for (const team of teamsToCreate) {
              try {
                console.log(`🔄 Creating individual team: ${team.name}`);
                const singleTeamResult = await createSingleTeam(team);
                createdTeams.push(...singleTeamResult.filter((t) => t._id));

                // Small delay between requests to avoid rate limiting
                await new Promise((resolve) => setTimeout(resolve, 300));
              } catch (individualError: any) {
                console.error(
                  `❌ Failed to create team ${team.name}:`,
                  individualError
                );
                // Continue with other teams
              }
            }

            if (createdTeams.length === 0) {
              throw new Error('Failed to create any teams. Please try again.');
            }

            // Combine existing teams with newly created teams
            const allTeams = [...existingTeamsInState, ...createdTeams];

            console.log(
              `✅ Created ${createdTeams.length} out of ${teamsToCreate.length} teams (preserved existing):`,
              {
                existingTeamsPreserved: existingTeamsInState.length,
                newTeamsCreated: createdTeams.length,
                totalTeams: allTeams.length,
              }
            );

            setTeams(allTeams);
            return allTeams;
          }
        }
      }
    } catch (error: any) {
      console.error('❌ Error saving teams:', error);

      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to save teams. Please try again.';

      setSaveError(errorMessage);

      // Log detailed error for debugging
      console.error('💀 Save teams error details:', {
        error,
        teamsCount: teams.length,
        selectedTeamIds,
        teamsToRegisterCount: teamsToRegister.length,
        tournament: memoizedTournamentEvent.tournament,
        year: memoizedTournamentEvent.year,
      });

      throw error; // Re-throw so handleContinue can catch it
    } finally {
      setIsProcessing(false);
    }
  }, [
    teams,
    selectedTeamIds,
    teamsToRegister,
    memoizedTournamentEvent,
    tournamentConfig,
    currentUser,
    coachId,
    formData.user,
    registerExistingTeamsForTournament,
    checkExistingRegistration,
    API_BASE_URL,
  ]);

  // Helper function for single team creation - FIXED VERSION
  const createSingleTeam = async (team: Team): Promise<Team[]> => {
    try {
      const token = localStorage.getItem('token');
      const tournamentName = memoizedTournamentEvent.tournament;
      const year = memoizedTournamentEvent.year;

      console.log('📤 Creating single team:', {
        teamName: team.name,
        tournament: tournamentName,
        year: year,
        hasToken: !!token,
        isAuthenticated: !!currentUser?._id,
      });

      const requestData = {
        email: formData.user?.email || currentUser?.email,
        fullName: formData.user?.fullName || currentUser?.fullName,
        phone: formData.user?.phone || currentUser?.phone,
        isCoach: true,
        aauNumber:
          formData.user?.aauNumber || currentUser?.aauNumber || 'NOT_PROVIDED',
        relationship: 'Coach',
        team: {
          name: team.name.trim(),
          grade: team.grade,
          sex: team.sex,
          levelOfCompetition: team.levelOfCompetition,
        },
        agreeToTerms: true,
        tournament: tournamentName,
        tournamentName: tournamentName,
        tournamentId: tournamentConfig?._id || null,
        year: year,
        isAdmin: currentUser?.role === 'admin',
        // Include address for new users
        ...(formData.user?.address &&
          !currentUser?._id && {
            address: formData.user.address,
          }),
      };

      console.log('📨 Sending single team creation request:', {
        endpoint: `${API_BASE_URL}/register/tournament-team`,
        data: {
          ...requestData,
          team: { ...requestData.team, name: team.name },
        },
      });

      const response = await fetch(`${API_BASE_URL}/register/tournament-team`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(requestData),
      });

      console.log('📥 Single team creation response:', {
        status: response.status,
        ok: response.ok,
      });

      if (!response.ok) {
        let errorText = '';
        try {
          const errorData = await response.json();
          errorText = JSON.stringify(errorData);
        } catch {
          errorText = await response.text();
        }

        // Handle duplicate team name error
        if (
          response.status === 400 &&
          errorText.includes('different team names')
        ) {
          throw new Error(
            `A team with name "${team.name}" already exists. Please use a different team name.`
          );
        }

        throw new Error(
          `Failed to create team (${response.status}): ${errorText}`
        );
      }

      const result = await response.json();
      console.log('✅ Single team creation result:', {
        success: result.success,
        hasTeam: !!result.team,
        teamId: result.team?._id || result.team?.id,
        team: result.team,
      });

      if (result.success && result.team) {
        // FIX: Handle both `_id` and `id` fields from server
        const teamId = result.team._id || result.team.id;

        if (!teamId) {
          console.error(
            '⚠️ Team created but no ID field returned:',
            result.team
          );
          throw new Error('Team created but no ID returned from server');
        }

        const savedTeam = {
          ...result.team,
          _id: teamId, // Ensure _id is set
          registrationYear: year,
          tournament: tournamentName,
          paymentComplete: false,
          paymentStatus: 'pending',
        };

        console.log('🎉 Single team created with ID:', savedTeam._id);
        return [savedTeam];
      } else {
        throw new Error(
          result.error || 'Team creation failed - no team returned'
        );
      }
    } catch (error: any) {
      console.error('❌ createSingleTeam error:', error);
      throw error;
    }
  };

  // Helper function for multiple teams creation - FIXED VERSION
  const createMultipleTeams = async (
    teamsToCreate: Team[]
  ): Promise<Team[]> => {
    try {
      const token = localStorage.getItem('token');
      const tournamentName = memoizedTournamentEvent.tournament;
      const year = memoizedTournamentEvent.year;

      console.log('📤 Creating multiple teams:', {
        teamCount: teamsToCreate.length,
        tournament: tournamentName,
        year: year,
        hasToken: !!token,
        isAuthenticated: !!currentUser?._id,
        teamNames: teamsToCreate.map((t) => t.name),
      });

      // Check for duplicate team names in the request
      const teamNames = teamsToCreate.map((t) => t.name.trim().toLowerCase());
      const uniqueTeamNames = new Set(teamNames);
      if (teamNames.length !== uniqueTeamNames.size) {
        throw new Error(
          'Duplicate team names found in your request. Please use unique names for each team.'
        );
      }

      // Prepare request data
      const requestData: any = {
        tournament: tournamentName,
        tournamentName: tournamentName,
        tournamentId: tournamentConfig?._id || null,
        year: year,
        teams: teamsToCreate.map((team: Team) => ({
          name: team.name.trim(),
          grade: team.grade,
          sex: team.sex,
          levelOfCompetition: team.levelOfCompetition,
        })),
        agreeToTerms: true,
        isAdmin: currentUser?.role === 'admin',
      };

      // Add user data if not authenticated
      if (!currentUser?._id) {
        requestData.email = formData.user?.email || '';
        requestData.password = formData.user?.password || '';
        requestData.fullName = formData.user?.fullName || '';
        requestData.phone = formData.user?.phone || '';
        requestData.isCoach = true;
        requestData.aauNumber = formData.user?.aauNumber || 'NOT_PROVIDED';
        requestData.relationship = 'Coach';

        // Add address if available
        if (formData.user?.address) {
          requestData.address = {
            street: formData.user.address.street || '',
            city: formData.user.address.city || '',
            state: formData.user.address.state || '',
            zip: formData.user.address.zip || '',
            ...(formData.user.address.street2 && {
              street2: formData.user.address.street2,
            }),
          };
        }
      }

      console.log('📨 Sending multiple team creation request:', {
        endpoint: `${API_BASE_URL}/register/tournament-team-multiple`,
        teamCount: requestData.teams.length,
        teamNames: requestData.teams.map((t: any) => t.name),
      });

      const response = await fetch(
        `${API_BASE_URL}/register/tournament-team-multiple`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: token ? `Bearer ${token}` : '',
          },
          body: JSON.stringify(requestData),
        }
      );

      console.log('📥 Multiple team creation response:', {
        status: response.status,
        ok: response.ok,
      });

      if (!response.ok) {
        let errorText = '';
        try {
          const errorData = await response.json();
          errorText = JSON.stringify(errorData);

          // Handle duplicate team name error
          if (
            response.status === 400 &&
            (errorText.includes('different team names') ||
              errorText.includes('Duplicate registration'))
          ) {
            throw new Error(
              'One or more team names already exist. Please use different team names.'
            );
          }
        } catch {
          errorText = await response.text();
        }
        throw new Error(
          `Failed to create teams (${response.status}): ${errorText}`
        );
      }

      const result = await response.json();
      console.log('✅ Multiple team creation result:', {
        success: result.success,
        hasTeams: !!result.teams,
        teamCount: result.teams?.length || 0,
        result: result,
      });

      if (result.success && result.teams && Array.isArray(result.teams)) {
        const savedTeams = result.teams.map((team: any) => {
          // FIX: Handle both `_id` and `id` fields from server
          const teamId = team._id || team.id;

          return {
            ...team,
            _id: teamId, // Ensure _id is set
            registrationYear: year,
            tournament: tournamentName,
            paymentComplete: false,
            paymentStatus: 'pending',
          };
        });

        // Validate all teams have IDs
        const teamsWithIds = savedTeams.filter((team: Team) => {
          if (!team._id) {
            console.error('❌ Team missing ID in multiple creation:', team);
            return false;
          }
          return true;
        });

        if (teamsWithIds.length === 0) {
          throw new Error(
            'No valid team IDs returned from multiple team creation'
          );
        }

        console.log('🎉 Multiple teams created successfully:', {
          created: teamsWithIds.length,
          requested: teamsToCreate.length,
          teamIds: teamsWithIds.map((t: Team) => t._id),
        });

        return teamsWithIds;
      } else {
        throw new Error(
          result.error || 'Teams creation failed - no teams returned'
        );
      }
    } catch (error: any) {
      console.error('❌ createMultipleTeams error:', error);
      throw error;
    }
  };

  // Main handleContinue function
  const handleContinue = useCallback(async () => {
    if (!hasValidTeam) {
      window.scrollTo(0, 0);
      return;
    }

    console.log('🔍 DEBUG handleContinue: Starting payment process', {
      hasValidTeam,
      teamsCount: teams.length,
      teams: teams.map((t) => ({
        id: t._id,
        name: t.name,
        level: t.levelOfCompetition,
        isNew: !t._id,
      })),
      selectedTeamIds,
      selectedTeamIdsCount: selectedTeamIds.length,
      tournament: memoizedTournamentEvent.tournament,
      year: memoizedTournamentEvent.year,
    });

    setIsProcessing(true);
    setSaveError(null);

    try {
      // Get all valid teams ready for payment
      const validTeams = teams.filter(
        (team) =>
          team.name?.trim() &&
          team.grade?.trim() &&
          ['Male', 'Female'].includes(team.sex) &&
          availableDivisions.includes(team.levelOfCompetition)
      );

      console.log('🔍 DEBUG handleContinue: Valid teams:', {
        validTeamsCount: validTeams.length,
        validTeams: validTeams.map((t) => ({ id: t._id, name: t.name })),
        allTeamsCount: teams.length,
      });

      if (validTeams.length === 0) {
        throw new Error('No valid teams to register');
      }

      // Check for already REGISTERED AND PAID teams
      console.log('🔍 Checking team payment status...');
      for (const team of validTeams) {
        if (team._id) {
          const { isRegistered, isPaid } = await checkExistingRegistration(
            team._id
          );

          console.log(`Team "${team.name}" payment status:`, {
            isRegistered,
            isPaid,
            teamId: team._id,
          });

          // Only throw error if BOTH registered AND paid
          if (isRegistered && isPaid) {
            throw new Error(
              `Team "${team.name}" is already registered and PAID for this tournament.`
            );
          }

          // If registered but not paid, that's OK - we'll process payment
          if (isRegistered && !isPaid) {
            console.log(`Team "${team.name}" needs payment completion`);
            // Update team status
            team.paymentComplete = false;
            team.paymentStatus = 'pending';
          }
        }
      }

      const totalAmount = calculateTotalAmount();

      // Get tournament details
      const tournamentName = memoizedTournamentEvent.tournament;

      // Create complete tournament config for receipt
      const tournamentReceiptConfig: TournamentSpecificConfig = {
        tournamentName: tournamentName,
        tournamentYear: memoizedTournamentEvent.year,
        displayName: tournamentConfig?.displayName || '',
        divisions: tournamentConfig?.divisions || availableDivisions,
        registrationDeadline: tournamentConfig?.registrationDeadline || '',
        tournamentDates: tournamentConfig?.tournamentDates || [],
        locations: tournamentConfig?.locations || [],
        ageGroups: tournamentConfig?.ageGroups || [],
        requiresRoster:
          tournamentConfig?.requiresRoster !== undefined
            ? tournamentConfig.requiresRoster
            : true,
        requiresInsurance:
          tournamentConfig?.requiresInsurance !== undefined
            ? tournamentConfig.requiresInsurance
            : true,
        paymentDeadline: tournamentConfig?.paymentDeadline || '',
        refundPolicy:
          tournamentConfig?.refundPolicy ||
          'No refunds after registration deadline',
        rulesDocumentUrl: tournamentConfig?.rulesDocumentUrl || '',
        scheduleDocumentUrl: tournamentConfig?.scheduleDocumentUrl || '',
        tournamentFee: tournamentFee,
        isActive:
          tournamentConfig?.isActive !== undefined
            ? tournamentConfig.isActive
            : true,
        _id:
          tournamentConfig?._id ||
          `tournament-${tournamentName.replace(/\s+/g, '-').toLowerCase()}-${
            memoizedTournamentEvent.year
          }`,
      };

      const paymentData = {
        amount: totalAmount,
        amountInCents: totalAmount * 100,
        teamCount: validTeams.length,
        perTeamAmount: tournamentFee,
        breakdown: {
          basePrice: tournamentFee,
          subtotal: totalAmount,
          total: totalAmount,
        },
      };

      // CRITICAL FIX: Save teams first AND wait for them to have IDs
      console.log('💾 Saving teams before payment...');
      const savedTeams = await saveAllTeams();

      console.log('✅ Teams saved:', {
        teamCount: savedTeams.length,
        savedTeams: savedTeams.map((t) => ({
          id: t._id,
          name: t.name,
          paymentStatus: t.paymentStatus,
          paymentComplete: t.paymentComplete,
        })),
      });

      // CRITICAL: Check if saved teams have IDs
      const teamsWithIds = savedTeams.filter((team) => team._id);
      if (teamsWithIds.length === 0) {
        throw new Error(
          'Failed to save teams properly. Teams do not have valid IDs. Please try again.'
        );
      }

      console.log('📋 Teams ready for payment (with IDs):', {
        teamCount: teamsWithIds.length,
        teams: teamsWithIds.map((t) => ({ id: t._id, name: t.name })),
      });

      updateFormData({
        payment: paymentData,
        tournamentConfig: tournamentReceiptConfig,
        teams: teamsWithIds, // Use teams WITH IDs
        team: teamsWithIds.length === 1 ? teamsWithIds[0] : undefined,
        // Ensure eventData has all required properties
        eventData: {
          season:
            formData.eventData?.season || memoizedTournamentEvent.tournament,
          year: memoizedTournamentEvent.year,
          eventId: formData.eventData?.eventId || '',
          tournamentFee: tournamentFee,
        },
        // Include user data for payment module
        user: formData.user || {
          email: currentUser?.email,
          fullName: currentUser?.fullName,
        },
      });

      console.log('Form data updated, ready for payment', {
        teamsCount: teamsWithIds.length,
        teams: teamsWithIds.map((t) => ({ id: t._id, name: t.name })),
        formDataTeams: formData.teams?.length || 0,
      });

      // Small delay to ensure state is updated
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Call onComplete to proceed to payment
      if (onComplete) {
        console.log('🎯 Calling onComplete to proceed to payment step');
        onComplete();
      } else {
        console.error('❌ onComplete callback is not defined');
        throw new Error('Cannot proceed to payment - missing callback');
      }
    } catch (error) {
      console.error('Error in handleContinue:', error);

      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === 'string'
          ? error
          : 'Failed to process registration. Please try again.';

      setValidationErrors((prev) => ({
        ...prev,
        general: errorMessage,
      }));
      setSaveError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }, [
    hasValidTeam,
    teams,
    availableDivisions,
    calculateTotalAmount,
    tournamentFee,
    memoizedTournamentEvent,
    tournamentConfig,
    updateFormData,
    onComplete,
    saveAllTeams,
    checkExistingRegistration,
    currentUser,
    formData.user,
    formData.eventData,
    selectedTeamIds,
  ]);

  // Tournament information display
  const renderTournamentInfo = useCallback(() => {
    if (!tournamentConfig || !showTournamentInfo) return null;

    return (
      <div className='card mb-4'>
        <div className='card-header bg-light d-flex justify-content-between align-items-center'>
          <div className='d-flex align-items-center'>
            <span className='bg-white avatar avatar-sm me-2 text-gray-7 flex-shrink-0'>
              <i className='ti ti-info-circle fs-16' />
            </span>
            <h6 className='mb-0'>Tournament Information</h6>
          </div>
          <button
            type='button'
            className='btn btn-sm btn-outline-secondary'
            onClick={() => setShowTournamentInfo(false)}
          >
            <i className='ti ti-x'></i>
          </button>
        </div>
        <div className='card-body'>
          <div className='row'>
            <div className='col-md-6'>
              <p className='mb-2'>
                <strong>Tournament Fee:</strong> ${tournamentFee} per team
              </p>
              {tournamentConfig.registrationDeadline && (
                <p className='mb-2'>
                  <strong>Registration Deadline:</strong>{' '}
                  {new Date(
                    tournamentConfig.registrationDeadline
                  ).toLocaleDateString()}
                </p>
              )}
            </div>
            <div className='col-md-6'>
              {tournamentConfig.tournamentDates &&
                tournamentConfig.tournamentDates.length > 0 && (
                  <p className='mb-2'>
                    <strong>Dates:</strong>{' '}
                    {tournamentConfig.tournamentDates
                      .map((d) => new Date(d).toLocaleDateString())
                      .join(', ')}
                  </p>
                )}
              {tournamentConfig.locations &&
                tournamentConfig.locations.length > 0 && (
                  <p className='mb-2'>
                    <strong>Locations:</strong>{' '}
                    {tournamentConfig.locations.join(', ')}
                  </p>
                )}
              {tournamentConfig.divisions &&
                tournamentConfig.divisions.length > 0 && (
                  <p className='mb-2'>
                    <strong>Divisions:</strong>{' '}
                    {tournamentConfig.divisions.join(', ')}
                  </p>
                )}
            </div>
          </div>

          {tournamentConfig.requiresRoster && (
            <div className='alert alert-warning mt-3'>
              <i className='ti ti-alert-triangle me-2'></i>
              <strong>Note:</strong> All teams must submit a complete roster
              before the tournament.
            </div>
          )}

          {tournamentConfig.requiresInsurance && (
            <div className='alert alert-info mt-3'>
              <i className='ti ti-shield me-2'></i>
              <strong>Insurance Required:</strong> Teams must provide proof of
              insurance.
            </div>
          )}
        </div>
      </div>
    );
  }, [tournamentConfig, showTournamentInfo, tournamentFee]);

  // Show welcome back prompt for existing users with unpaid registrations
  useEffect(() => {
    if (showWelcomeBackPrompt && teamsToRegister.length > 0) {
      console.log(
        'Showing welcome back prompt with teams:',
        teamsToRegister.length
      );
    }
  }, [showWelcomeBackPrompt, teamsToRegister]);

  return (
    <div className='card'>
      <div className='card-header bg-light'>
        <div className='d-flex align-items-center'>
          <span className='bg-white avatar avatar-sm me-2 text-gray-7 flex-shrink-0'>
            <i className='ti ti-trophy fs-16' />
          </span>
          <h4 className='text-dark'>
            {memoizedTournamentEvent.tournament} {memoizedTournamentEvent.year}{' '}
            - Team Registration
          </h4>
        </div>
      </div>
      <div className='card-body'>
        {tournamentError && (
          <div className='alert alert-danger mb-4'>
            <i className='ti ti-alert-circle me-2'></i>
            {tournamentError}
          </div>
        )}

        {isAlreadyRegistered && (
          <div className='alert alert-warning mb-4'>
            <i className='ti ti-alert-triangle me-2'></i>
            {saveError || 'This team is already registered for the tournament.'}
          </div>
        )}

        {validationErrors.general && (
          <div className='alert alert-danger mb-4'>
            <i className='ti ti-alert-circle me-2'></i>
            {validationErrors.general}
          </div>
        )}

        {saveError && !validationErrors.general && !isAlreadyRegistered && (
          <div className='alert alert-danger mb-4'>
            <i className='ti ti-alert-circle me-2'></i>
            {saveError}
          </div>
        )}

        {/* Welcome back prompt for existing users with unpaid registrations */}
        {showWelcomeBackPrompt && teamsToRegister.length > 0 && (
          <div className='alert alert-info mb-4'>
            <h4>👋 Welcome Back!</h4>
            <p className='mb-0'>
              We noticed you previously registered{' '}
              {teamsToRegister.length === 1 ? (
                <>
                  <strong>{teamsToRegister[0].name}</strong> for the{' '}
                  <strong>{memoizedTournamentEvent.tournament}</strong>{' '}
                  tournament
                </>
              ) : (
                <>
                  <strong>{teamsToRegister.length} teams</strong> for the{' '}
                  <strong>{memoizedTournamentEvent.tournament}</strong>{' '}
                  tournament
                </>
              )}
              but haven't completed payment yet. Please complete your payment
              below to finalize your registration.
            </p>
            <div className='mt-2'>
              <button
                className='btn btn-outline-secondary btn-sm'
                onClick={() => {
                  setShowWelcomeBackPrompt(false);
                  setSelectedTeamIds([]);
                  setTeamsToRegister([]);
                  setTeams([]);
                  addNewTeam();
                }}
              >
                Register different team(s) instead
              </button>
            </div>
          </div>
        )}

        {/* Tournament Information */}
        {renderTournamentInfo()}

        {!showTournamentInfo && tournamentConfig && (
          <div className='mb-4 text-end'>
            <button
              type='button'
              className='btn btn-sm btn-outline-info'
              onClick={() => setShowTournamentInfo(true)}
            >
              <i className='ti ti-info-circle me-1'></i>
              Show Tournament Info
            </button>
          </div>
        )}

        {/* Team selection for existing users */}
        {isExistingUser &&
          existingTeamsState.length > 0 &&
          !showWelcomeBackPrompt && (
            <div className='card mb-4'>
              <div className='card-header bg-light'>
                <h6 className='mb-0'>Your Existing Teams</h6>
                <small className='text-muted'>
                  Select teams you've previously created for this tournament
                </small>
              </div>
              <div className='card-body'>
                <div className='row'>
                  {existingTeamsState.map((team) => {
                    const isSelected = selectedTeamIds.includes(team._id!);
                    const isPending = teamsToRegister.some(
                      (t) => t._id === team._id
                    );
                    const isPaid = team.paymentStatus === 'paid';
                    const isDisabled = isPaid; // Disable if already paid

                    return (
                      <div key={team._id} className='col-md-6 mb-3'>
                        <div
                          className={`card border h-100 ${
                            isSelected ? 'border-primary bg-light' : ''
                          } ${
                            isDisabled
                              ? 'opacity-75'
                              : 'cursor-pointer hover-shadow'
                          }`}
                          onClick={() => {
                            if (!isDisabled) {
                              handleTeamSelection(team._id!, !isSelected);
                            }
                          }}
                          style={{
                            cursor: isDisabled ? 'not-allowed' : 'pointer',
                          }}
                        >
                          <div className='card-body'>
                            <div className='d-flex align-items-start'>
                              <div className='form-check flex-shrink-0 me-3'>
                                <input
                                  type='checkbox'
                                  className='form-check-input'
                                  checked={isSelected}
                                  onChange={() => {}}
                                  disabled={isDisabled}
                                  title={
                                    isDisabled
                                      ? 'Already paid for this tournament'
                                      : isPending
                                      ? 'Payment pending - click to complete'
                                      : 'Select team for registration'
                                  }
                                />
                              </div>
                              <div className='flex-grow-1'>
                                <div className='d-flex justify-content-between align-items-start'>
                                  <h6 className='mb-1'>{team.name}</h6>
                                  <div>
                                    {isPaid && (
                                      <span className='badge bg-success'>
                                        <i className='ti ti-check me-1'></i>
                                        Paid
                                      </span>
                                    )}
                                    {isPending && !isPaid && (
                                      <span className='badge bg-warning text-dark'>
                                        <i className='ti ti-clock me-1'></i>
                                        Payment Pending
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className='text-muted small mb-2'>
                                  {team.grade} Grade • {team.sex}
                                </div>
                                <div className='d-flex flex-wrap gap-1'>
                                  <span className='badge bg-secondary'>
                                    {team.levelOfCompetition || 'Not Set'}
                                  </span>
                                  {team.tournament && (
                                    <span className='badge bg-info'>
                                      {team.tournament} {team.registrationYear}
                                    </span>
                                  )}
                                </div>

                                {/* Disabled message for paid teams */}
                                {isPaid && (
                                  <div className='mt-2 text-success small'>
                                    <i className='ti ti-circle-check me-1'></i>
                                    Already registered and paid for this
                                    tournament
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Show pending payment message */}
                            {isPending && !isPaid && (
                              <div className='mt-3 pt-2 border-top'>
                                <div className='alert alert-warning mb-0 py-2'>
                                  <i className='ti ti-alert-circle me-2'></i>
                                  <strong>Payment Incomplete</strong>
                                  <div className='small'>
                                    Click to select and complete payment for
                                    this tournament
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

        {/* Team creation section */}
        <div className='card'>
          <div className='card-header bg-light d-flex justify-content-between align-items-center'>
            <div>
              <h6 className='mb-0'>
                {selectedTeamIds.length > 0 || showWelcomeBackPrompt
                  ? 'Additional Teams'
                  : 'Team Information'}
              </h6>
              <small className='text-muted'>
                ${tournamentFee} per team • Minimum 1 team required
              </small>
            </div>
            <button
              type='button'
              className='btn btn-sm btn-outline-primary'
              onClick={addNewTeam}
              disabled={isProcessing}
            >
              <i className='ti ti-plus me-1'></i>Add Team
            </button>
          </div>
          <div className='card-body'>
            {/* FIXED LOGIC: Show appropriate content based on user state */}
            {teams.length === 0 ? (
              <div className='text-center py-4'>
                {hasLoadedExistingTeams ? (
                  isExistingUser && existingTeamsState.length > 0 ? (
                    <>
                      {/* User has existing teams - show "Add New Team" */}
                      <p className='text-muted mb-3'>
                        Want to register a new team for this tournament?
                      </p>
                      <button
                        type='button'
                        className='btn btn-primary'
                        onClick={addNewTeam}
                      >
                        <i className='ti ti-plus me-1'></i>
                        Add New Team
                      </button>
                    </>
                  ) : (
                    <>
                      {/* New user or user with no existing teams - show "Create First Team" */}
                      <i className='ti ti-users fs-1 text-muted mb-3'></i>
                      <p className='text-muted mb-3'>
                        No teams added yet. Create your first team to register.
                      </p>
                      <button
                        type='button'
                        className='btn btn-primary'
                        onClick={addNewTeam}
                      >
                        <i className='ti ti-plus me-1'></i>
                        Create First Team
                      </button>
                    </>
                  )
                ) : (
                  // Loading state while checking existing teams
                  <div className='text-center'>
                    <div className='spinner-border text-primary mb-3" role="status'>
                      <span className='visually-hidden'>Loading...</span>
                    </div>
                    <p className='text-muted'>Checking for existing teams...</p>
                  </div>
                )}
              </div>
            ) : (
              // Render the teams list
              teams.map((team, index) => (
                <div key={index} className='mb-4 pb-4 border-bottom'>
                  <div className='d-flex justify-content-between align-items-center mb-3'>
                    <h6 className='mb-0'>
                      Team {index + 1}
                      {team._id && (
                        <span className='badge bg-info ms-2'>
                          Existing Team
                        </span>
                      )}
                    </h6>
                    {teams.length > 1 && (
                      <button
                        type='button'
                        className='btn btn-sm btn-outline-danger'
                        onClick={() => removeTeam(index)}
                      >
                        <i className='ti ti-trash'></i>
                      </button>
                    )}
                  </div>

                  <div className='row'>
                    <div className='col-md-12'>
                      <div className='mb-3'>
                        <label className='form-label'>Team Name *</label>
                        <input
                          type='text'
                          className={`form-control ${
                            validationErrors[`teamName-${index}`]
                              ? 'is-invalid'
                              : ''
                          }`}
                          value={team.name}
                          onChange={(e) =>
                            handleTeamChange(index, 'name', e.target.value)
                          }
                          placeholder='Enter team name (e.g., Thunder Hawks)'
                          required
                          disabled={Boolean(
                            team._id && selectedTeamIds.includes(team._id)
                          )}
                        />
                        {validationErrors[`teamName-${index}`] && (
                          <div className='invalid-feedback'>
                            {validationErrors[`teamName-${index}`]}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className='col-md-6'>
                      <div className='mb-3'>
                        <label className='form-label'>Grade *</label>
                        <select
                          className={`form-control ${
                            validationErrors[`teamGrade-${index}`]
                              ? 'is-invalid'
                              : ''
                          }`}
                          value={team.grade}
                          onChange={(e) =>
                            handleTeamChange(index, 'grade', e.target.value)
                          }
                          required
                          disabled={Boolean(
                            team._id && selectedTeamIds.includes(team._id)
                          )}
                        >
                          <option value=''>Select Grade</option>
                          <option value='PK'>Pre-Kindergarten</option>
                          <option value='K'>Kindergarten</option>
                          {Array.from({ length: 12 }, (_, i) => i + 1).map(
                            (grade) => (
                              <option key={grade} value={grade.toString()}>
                                {grade} Grade
                              </option>
                            )
                          )}
                        </select>
                        {validationErrors[`teamGrade-${index}`] && (
                          <div className='invalid-feedback'>
                            {validationErrors[`teamGrade-${index}`]}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className='col-md-6'>
                      <div className='mb-3'>
                        <label className='form-label'>Team Gender *</label>
                        <select
                          className={`form-control ${
                            validationErrors[`teamSex-${index}`]
                              ? 'is-invalid'
                              : ''
                          }`}
                          value={team.sex}
                          onChange={(e) =>
                            handleTeamChange(index, 'sex', e.target.value)
                          }
                          required
                          disabled={Boolean(
                            team._id && selectedTeamIds.includes(team._id)
                          )}
                        >
                          <option value=''>Select Gender</option>
                          <option value='Male'>Male</option>
                          <option value='Female'>Female</option>
                        </select>
                        {validationErrors[`teamSex-${index}`] && (
                          <div className='invalid-feedback'>
                            {validationErrors[`teamSex-${index}`]}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className='col-md-12'>
                      <div className='mb-3'>
                        <label className='form-label'>Division *</label>
                        <select
                          className={`form-control ${
                            validationErrors[`teamLevel-${index}`]
                              ? 'is-invalid'
                              : ''
                          }`}
                          value={team.levelOfCompetition}
                          onChange={(e) =>
                            handleTeamChange(
                              index,
                              'levelOfCompetition',
                              e.target.value
                            )
                          }
                          required
                        >
                          <option value=''>Select Division</option>
                          {availableDivisions.map((division) => (
                            <option key={division} value={division}>
                              {division}
                            </option>
                          ))}
                        </select>
                        {validationErrors[`teamLevel-${index}`] && (
                          <div className='invalid-feedback'>
                            {validationErrors[`teamLevel-${index}`]}
                          </div>
                        )}
                        <small className='text-muted'>
                          Choose the competitive division for your team
                        </small>
                      </div>
                    </div>
                  </div>

                  {team._id && selectedTeamIds.includes(team._id) && (
                    <div className='alert alert-info mt-3'>
                      <i className='ti ti-info-circle me-2'></i>
                      This is an existing team. Some fields cannot be modified.
                    </div>
                  )}
                </div>
              ))
            )}

            {teams.length > 0 && (
              <div className='mt-4 p-3 rounded'>
                <div className='d-flex justify-content-between align-items-center mb-3'>
                  <h6 className='mb-0'>Payment Summary</h6>
                  <span className='badge bg-primary'>
                    {
                      teams.filter(
                        (team) =>
                          team.name?.trim() &&
                          team.grade?.trim() &&
                          ['Male', 'Female'].includes(team.sex) &&
                          availableDivisions.includes(team.levelOfCompetition)
                      ).length
                    }{' '}
                    Valid Team(s)
                  </span>
                </div>
                <div className='d-flex justify-content-between align-items-center'>
                  <div>
                    <p className='mb-1'>
                      <strong>Tournament Fee:</strong> ${tournamentFee} per team
                    </p>
                    <p className='mb-0 text-muted small'>
                      {
                        teams.filter(
                          (team) =>
                            team.name?.trim() &&
                            team.grade?.trim() &&
                            ['Male', 'Female'].includes(team.sex) &&
                            availableDivisions.includes(team.levelOfCompetition)
                        ).length
                      }{' '}
                      team(s) × ${tournamentFee}
                    </p>
                  </div>
                  <div className='text-end'>
                    <h4 className='mb-0 text-primary'>
                      ${calculateTotalAmount()}
                    </h4>
                    <small className='text-muted'>Total Amount</small>
                  </div>
                </div>

                {tournamentConfig?.requiresRoster && (
                  <div className='alert alert-warning mt-3'>
                    <i className='ti ti-alert-triangle me-2'></i>
                    <strong>Important:</strong> Team rosters must be submitted
                    by the registration deadline.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className='d-flex justify-content-between mt-4'>
          {onBack && (
            <button
              type='button'
              className='btn btn-outline-secondary'
              onClick={onBack}
              disabled={isProcessing}
            >
              <i className='ti ti-arrow-left me-2'></i>
              Back
            </button>
          )}

          <button
            type='button'
            className='btn btn-primary'
            onClick={handleContinue}
            disabled={isProcessing || !hasValidTeam}
          >
            {isProcessing ? (
              <>
                <span className='spinner-border spinner-border-sm me-2'></span>
                Processing...
              </>
            ) : showWelcomeBackPrompt && teamsToRegister.length > 0 ? (
              <>
                Complete Payment for {teamsToRegister.length} Team
                {teamsToRegister.length > 1 ? 's' : ''}
                <i className='ti ti-credit-card ms-2'></i>
              </>
            ) : (
              <>
                Continue to Payment
                <i className='ti ti-credit-card ms-2'></i>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TournamentRegistrationModule;
