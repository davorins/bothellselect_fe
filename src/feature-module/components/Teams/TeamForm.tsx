// components/Teams/TeamForm.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import ReactSelect, { GroupBase } from 'react-select';
import { InternalTeamFormData } from '../../../types/teamTypes';
import { useAuth } from '../../../context/AuthContext';
import { all_routes } from '../../router/all_routes';

interface SelectOption {
  value: string;
  label: string;
}

interface Metadata {
  years: number[];
  grades: string[];
  tryoutSeasons: string[];
}

interface Coach {
  _id: string;
  fullName: string;
  email: string;
  phone?: string;
}

interface Player {
  _id: string;
  fullName: string;
  gender: string;
  grade: string;
  schoolName: string;
  dob?: string;
  age?: number;
}

type FormErrors = Partial<Record<keyof InternalTeamFormData, string>>;

const getGradeSuffix = (grade: string) => {
  const gradeNum = parseInt(grade);
  if (isNaN(gradeNum)) return grade;
  let suffix = 'th';
  if (gradeNum === 1) suffix = 'st';
  else if (gradeNum === 2) suffix = 'nd';
  else if (gradeNum === 3) suffix = 'rd';
  return `${gradeNum}${suffix}`;
};

const TeamForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getAuthToken, fetchAllParents } = useAuth();

  const isEdit = Boolean(id);
  const currentYear = new Date().getFullYear();

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});

  const [availableCoaches, setAvailableCoaches] = useState<Coach[]>([]);
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([]);
  const [playersLoading, setPlayersLoading] = useState(false);
  const [metadata, setMetadata] = useState<Metadata>({
    years: [],
    grades: [],
    tryoutSeasons: [],
  });
  const [currentTeamData, setCurrentTeamData] = useState<any>(null);

  const [formValues, setFormValues] = useState<InternalTeamFormData>({
    name: '',
    year: currentYear,
    grade: '',
    gender: 'Male',
    coachIds: [],
    playerIds: [],
    tryoutSeason: '',
    tryoutYear: currentYear,
    notes: '',
  });

  useEffect(() => {
    fetchFormData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchFormData = async () => {
    try {
      setLoading(true);
      const token = await getAuthToken();

      const metadataResponse = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/internal-teams/metadata`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (metadataResponse.ok) {
        const metadataData = await metadataResponse.json();
        setMetadata(metadataData);
        if (!isEdit && metadataData.tryoutSeasons?.[0]) {
          setFormValues((prev) => ({
            ...prev,
            tryoutSeason: metadataData.tryoutSeasons[0],
          }));
        }
      }

      const coaches = await fetchAllParents('isCoach=true');
      setAvailableCoaches(coaches.filter((p: any) => p.isCoach === true));

      if (isEdit) {
        const teamResponse = await fetch(
          `${process.env.REACT_APP_API_BASE_URL}/internal-teams/${id}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!teamResponse.ok) throw new Error('Failed to fetch team data');

        const team = await teamResponse.json();
        setCurrentTeamData(team);
        setFormValues({
          name: team.name || '',
          year: team.year || currentYear,
          grade: team.grade || '',
          gender: team.gender || 'Male',
          coachIds: team.coachIds?.map((c: any) => c._id) || [],
          playerIds: team.playerIds?.map((p: any) => p._id) || [],
          tryoutSeason: team.tryoutSeason || '',
          tryoutYear: team.tryoutYear || currentYear,
          notes: team.notes || '',
        });

        loadAllAvailablePlayers(
          team.tryoutSeason,
          team.tryoutYear,
          team.gender,
          team,
        );
      } else {
        setTimeout(() => {
          setFormValues((prev) => {
            if (prev.tryoutSeason && prev.tryoutYear) {
              loadAllAvailablePlayers(
                prev.tryoutSeason,
                prev.tryoutYear,
                prev.gender,
              );
            }
            return prev;
          });
        }, 150);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load form data');
    } finally {
      setLoading(false);
    }
  };

  const loadAllAvailablePlayers = async (
    tryoutSeason: string,
    tryoutYear: number,
    gender: string,
    teamData?: any,
  ) => {
    try {
      setPlayersLoading(true);
      const token = await getAuthToken();

      const queryParams = new URLSearchParams({
        season: tryoutSeason,
        year: tryoutYear.toString(),
        ...(gender ? { gender } : {}),
      });

      const playersResponse = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/internal-teams/available-players?${queryParams}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      const activeTeam = teamData || currentTeamData;

      if (playersResponse.ok) {
        const players = await playersResponse.json();
        const sortedPlayers = [...players].sort((a: Player, b: Player) => {
          const gradeA = parseInt(a.grade) || 0;
          const gradeB = parseInt(b.grade) || 0;
          return gradeA !== gradeB
            ? gradeA - gradeB
            : a.fullName.localeCompare(b.fullName);
        });

        if (isEdit && activeTeam?.playerIds) {
          const missingPlayers = activeTeam.playerIds.filter(
            (p: any) => !sortedPlayers.some((ap: Player) => ap._id === p._id),
          );
          setAvailablePlayers([...sortedPlayers, ...missingPlayers]);
        } else {
          setAvailablePlayers(sortedPlayers);
        }
      } else {
        if (isEdit && activeTeam?.playerIds) {
          setAvailablePlayers(activeTeam.playerIds);
        }
      }
    } catch {
      if (isEdit && currentTeamData?.playerIds) {
        setAvailablePlayers(currentTeamData.playerIds);
      }
    } finally {
      setPlayersLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof InternalTeamFormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleTryoutFieldChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    const updated = { ...formValues, [name]: value };
    setFormValues(updated);
    if (errors[name as keyof InternalTeamFormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    if (!isEdit && updated.tryoutSeason && updated.tryoutYear) {
      loadAllAvailablePlayers(
        updated.tryoutSeason,
        Number(updated.tryoutYear),
        updated.gender,
      );
    }
  };

  const handleGenderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const gender = e.target.value as 'Male' | 'Female';
    setFormValues((prev) => ({ ...prev, gender }));
    if (errors.gender) setErrors((prev) => ({ ...prev, gender: undefined }));
    if (!isEdit && formValues.tryoutSeason && formValues.tryoutYear) {
      loadAllAvailablePlayers(
        formValues.tryoutSeason,
        Number(formValues.tryoutYear),
        gender,
      );
    }
  };

  // ── Validation ────────────────────────────────────────────────────────────
  const validate = (): FormErrors => {
    const errs: FormErrors = {};

    if (!formValues.name?.trim()) errs.name = 'Team name is required';
    if (!formValues.year) errs.year = 'Team year is required';
    if (!formValues.grade) errs.grade = 'Team grade is required';
    if (!formValues.gender) errs.gender = 'Team gender is required';
    if (!formValues.tryoutSeason)
      errs.tryoutSeason = 'Tryout season is required';
    if (!formValues.tryoutYear) errs.tryoutYear = 'Tryout year is required';
    if (!(formValues.playerIds as string[])?.length)
      errs.playerIds = 'At least one player is required';

    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      const firstKey = Object.keys(errs)[0];
      document
        .querySelector(`[name="${firstKey}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    try {
      setSubmitting(true);
      const token = await getAuthToken();
      const url = isEdit
        ? `${process.env.REACT_APP_API_BASE_URL}/internal-teams/${id}`
        : `${process.env.REACT_APP_API_BASE_URL}/internal-teams`;

      const response = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formValues),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save team');
      }

      navigate(all_routes.teams);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save team');
    } finally {
      setSubmitting(false);
    }
  };

  // ── react-select options ──────────────────────────────────────────────────
  const coachOptions = useMemo<SelectOption[]>(
    () =>
      availableCoaches.map((c) => ({
        value: c._id,
        label: c.fullName + (c.email ? ` — ${c.email}` : ''),
      })),
    [availableCoaches],
  );

  const playerGroupedOptions = useMemo<GroupBase<SelectOption>[]>(() => {
    const grouped: { [key: string]: Player[] } = {};
    availablePlayers.forEach((p) => {
      const grade = p.grade || 'Unknown';
      if (!grouped[grade]) grouped[grade] = [];
      grouped[grade].push(p);
    });
    return Object.keys(grouped)
      .sort((a, b) => (parseInt(a) || 0) - (parseInt(b) || 0))
      .map((grade) => ({
        label: `${getGradeSuffix(grade)} Grade`,
        options: grouped[grade].map((p) => ({
          value: p._id,
          label: p.fullName + (p.schoolName ? ` — ${p.schoolName}` : ''),
        })),
      }));
  }, [availablePlayers]);

  const selectedCoachOptions = useMemo(
    () =>
      coachOptions.filter((o) =>
        (formValues.coachIds as string[]).includes(o.value),
      ),
    [coachOptions, formValues.coachIds],
  );

  const selectedPlayerOptions = useMemo(() => {
    const allOpts = playerGroupedOptions.flatMap((g) => g.options);
    return allOpts.filter((o) =>
      (formValues.playerIds as string[]).includes(o.value),
    );
  }, [playerGroupedOptions, formValues.playerIds]);

  if (loading) {
    return (
      <div className='page-wrapper'>
        <div className='content'>
          <div id='global-loader'>
            <div className='page-loader'></div>
          </div>
        </div>
      </div>
    );
  }

  const f = formValues;

  return (
    <div className='page-wrapper'>
      <div className='content'>
        {/* Header */}
        <div className='d-md-flex d-block align-items-center justify-content-between mb-3'>
          <div className='my-auto mb-2'>
            <h3 className='page-title mb-1'>Team Management</h3>
            <nav>
              <ol className='breadcrumb mb-0'>
                <li className='breadcrumb-item'>
                  <Link to={all_routes.adminDashboard}>Dashboard</Link>
                </li>
                <li className='breadcrumb-item'>
                  <Link to={all_routes.teams}>Teams</Link>
                </li>
              </ol>
            </nav>
          </div>
        </div>

        <div className='card'>
          <div className='card-header'>
            <h4 className='mb-0'>
              {isEdit ? 'Edit Team' : 'Create New Team from Tryouts'}
            </h4>
          </div>

          <div className='card-body'>
            {error && (
              <div
                className='alert alert-danger alert-dismissible'
                role='alert'
              >
                {error}
                <button
                  type='button'
                  className='btn-close'
                  onClick={() => setError(null)}
                  aria-label='Close'
                />
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              {/* Row 1: Team Name + Team Year */}
              <div className='row'>
                <div className='col-md-6'>
                  <div className='mb-3'>
                    <label className='form-label'>
                      Team Name <span className='text-danger'>*</span>
                    </label>
                    <input
                      type='text'
                      name='name'
                      className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                      placeholder='Enter team name (e.g., Partizan)'
                      value={f.name}
                      onChange={handleChange}
                    />
                    <div className='form-text text-muted'>
                      Enter the base team name. The year will be added
                      automatically in displays.
                    </div>
                    {errors.name && (
                      <div className='invalid-feedback d-block'>
                        {errors.name}
                      </div>
                    )}
                  </div>
                </div>

                <div className='col-md-6'>
                  <div className='mb-3'>
                    <label className='form-label'>
                      Team Year <span className='text-danger'>*</span>
                    </label>
                    <select
                      name='year'
                      className={`form-select ${errors.year ? 'is-invalid' : ''}`}
                      style={
                        errors.year ? { borderColor: '#dc3545' } : undefined
                      }
                      value={f.year}
                      onChange={handleChange}
                      disabled={isEdit}
                    >
                      <option value=''>Select year</option>
                      {metadata.years.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                    <div className='form-text text-muted'>
                      This year will be displayed with the team name.
                    </div>
                    {errors.year && (
                      <div className='invalid-feedback d-block'>
                        {errors.year}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Row 2: Grade, Gender, Tryout Season, Tryout Year */}
              <div className='row'>
                <div className='col-md-3 col-6'>
                  <div className='mb-3'>
                    <label className='form-label'>
                      Team Grade <span className='text-danger'>*</span>
                    </label>
                    <select
                      name='grade'
                      className={`form-select ${errors.grade ? 'is-invalid' : ''}`}
                      style={
                        errors.grade ? { borderColor: '#dc3545' } : undefined
                      }
                      value={f.grade}
                      onChange={handleChange}
                      disabled={isEdit}
                    >
                      <option value=''>Select grade</option>
                      <option value='1'>1st Grade</option>
                      <option value='2'>2nd Grade</option>
                      <option value='3'>3rd Grade</option>
                      <option value='4'>4th Grade</option>
                      <option value='5'>5th Grade</option>
                      <option value='6'>6th Grade</option>
                      <option value='7'>7th Grade</option>
                      <option value='8'>8th Grade</option>
                      <option value='9'>9th Grade</option>
                      <option value='10'>10th Grade</option>
                      <option value='11'>11th Grade</option>
                      <option value='12'>12th Grade</option>
                    </select>
                    {errors.grade && (
                      <div className='invalid-feedback d-block'>
                        {errors.grade}
                      </div>
                    )}
                  </div>
                </div>

                <div className='col-md-3 col-6'>
                  <div className='mb-3'>
                    <label className='form-label'>
                      Team Gender <span className='text-danger'>*</span>
                    </label>
                    <select
                      name='gender'
                      className={`form-select ${errors.gender ? 'is-invalid' : ''}`}
                      style={
                        errors.gender ? { borderColor: '#dc3545' } : undefined
                      }
                      value={f.gender}
                      onChange={handleGenderChange}
                      disabled={isEdit}
                    >
                      <option value=''>Select gender</option>
                      <option value='Male'>Male</option>
                      <option value='Female'>Female</option>
                    </select>
                    {errors.gender && (
                      <div className='invalid-feedback d-block'>
                        {errors.gender}
                      </div>
                    )}
                  </div>
                </div>

                <div className='col-md-3 col-6'>
                  <div className='mb-3'>
                    <label className='form-label'>
                      Tryout Season <span className='text-danger'>*</span>
                    </label>
                    <select
                      name='tryoutSeason'
                      className={`form-select ${errors.tryoutSeason ? 'is-invalid' : ''}`}
                      style={
                        errors.tryoutSeason
                          ? { borderColor: '#dc3545' }
                          : undefined
                      }
                      value={f.tryoutSeason}
                      onChange={handleTryoutFieldChange}
                      disabled={isEdit}
                    >
                      <option value=''>Select tryout season</option>
                      {metadata.tryoutSeasons.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    {errors.tryoutSeason && (
                      <div className='invalid-feedback d-block'>
                        {errors.tryoutSeason}
                      </div>
                    )}
                  </div>
                </div>

                <div className='col-md-3 col-6'>
                  <div className='mb-3'>
                    <label className='form-label'>
                      Tryout Year <span className='text-danger'>*</span>
                    </label>
                    <select
                      name='tryoutYear'
                      className={`form-select ${errors.tryoutYear ? 'is-invalid' : ''}`}
                      style={
                        errors.tryoutYear
                          ? { borderColor: '#dc3545' }
                          : undefined
                      }
                      value={f.tryoutYear}
                      onChange={handleTryoutFieldChange}
                      disabled={isEdit}
                    >
                      <option value=''>Select tryout year</option>
                      {metadata.years.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                    {errors.tryoutYear && (
                      <div className='invalid-feedback d-block'>
                        {errors.tryoutYear}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Row 3: Coaches + Players */}
              <div className='row'>
                <div className='col-md-6'>
                  <div className='mb-3'>
                    <label className='form-label'>Coaches</label>
                    <ReactSelect<SelectOption, true>
                      isMulti
                      options={coachOptions}
                      value={selectedCoachOptions}
                      onChange={(selected) =>
                        setFormValues((prev) => ({
                          ...prev,
                          coachIds: selected.map((o) => o.value),
                        }))
                      }
                      className='basic-multi-select'
                      classNamePrefix='select'
                      placeholder='Search and select coaches…'
                      noOptionsMessage={() => 'No coaches found'}
                    />
                    <div className='form-text text-muted'>
                      Type to search coaches by name or email.
                    </div>
                  </div>
                </div>

                <div className='col-md-6'>
                  <div className='mb-3'>
                    <label className='form-label'>
                      Players <span className='text-danger'>*</span>
                    </label>
                    <ReactSelect<SelectOption, true, GroupBase<SelectOption>>
                      isMulti
                      options={playerGroupedOptions}
                      value={selectedPlayerOptions}
                      onChange={(selected) => {
                        setFormValues((prev) => ({
                          ...prev,
                          playerIds: selected.map((o) => o.value),
                        }));
                        if (errors.playerIds)
                          setErrors((prev) => ({
                            ...prev,
                            playerIds: undefined,
                          }));
                      }}
                      className='basic-multi-select'
                      classNamePrefix='select'
                      placeholder={
                        playersLoading
                          ? 'Loading players…'
                          : 'Search and select players from all grades…'
                      }
                      isLoading={playersLoading}
                      noOptionsMessage={() =>
                        playersLoading ? 'Loading…' : 'No players found'
                      }
                      styles={
                        errors.playerIds
                          ? {
                              control: (base) => ({
                                ...base,
                                borderColor: '#dc3545',
                                '&:hover': { borderColor: '#dc3545' },
                              }),
                            }
                          : undefined
                      }
                    />
                    <div className='form-text text-muted'>
                      {isEdit
                        ? 'Type to search players by name or school.'
                        : 'Players from all grades who completed tryouts. Type to search.'}
                    </div>
                    {errors.playerIds && (
                      <div className='invalid-feedback d-block'>
                        {errors.playerIds}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className='mb-3'>
                <label className='form-label'>Notes</label>
                <textarea
                  name='notes'
                  className='form-control'
                  placeholder='Add any notes about this team...'
                  rows={3}
                  value={f.notes || ''}
                  onChange={handleChange}
                />
              </div>

              {/* Actions */}
              <div className='d-flex align-items-center gap-2'>
                <button
                  type='submit'
                  className='btn btn-primary d-flex align-items-center gap-2'
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <span
                        className='spinner-border spinner-border-sm'
                        role='status'
                        aria-hidden='true'
                      />
                      {isEdit ? 'Updating…' : 'Creating…'}
                    </>
                  ) : (
                    <>{isEdit ? 'Update Team' : 'Create Team'}</>
                  )}
                </button>
                <Link to={all_routes.teams} className='btn btn-secondary'>
                  Cancel
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamForm;
