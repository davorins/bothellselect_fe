import React, { useEffect, useState, useCallback } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { all_routes } from '../../../router/all_routes';
import 'react-datepicker/dist/react-datepicker.css';
import {
  PlayerFormData,
  PlayerState,
  ParentData,
} from '../../../../types/types';
import {
  validateRequired,
  validateName,
  validateDateOfBirth,
  validateGrade,
} from '../../../../utils/validation';

const AddPlayer = ({ isEdit }: { isEdit: boolean }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const playerState = location.state as PlayerState | undefined;
  const [parents, setParents] = useState<ParentData[]>([]);
  const [loadingParents, setLoadingParents] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
  const playerId =
    playerState?.playerId ||
    playerState?.player?.playerId ||
    playerState?.player?._id ||
    '';

  const fetchParents = useCallback(async () => {
    try {
      setLoadingParents(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/parents`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setParents(response.data);
    } catch (error) {
      console.error('Error fetching parents:', error);
    } finally {
      setLoadingParents(false);
    }
  }, []);

  const fetchPlayerData = async (playerId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/player/${playerId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching player data:', error);
      return null;
    }
  };

  const getCurrentSeason = () => {
    const currentDate = new Date();
    const month = currentDate.getMonth() + 1;
    const day = currentDate.getDate();

    if (
      (month === 12 && day >= 21) ||
      month === 1 ||
      month === 2 ||
      (month === 3 && day <= 20)
    ) {
      return 'Winter';
    } else if (
      (month === 3 && day >= 21) ||
      month === 4 ||
      month === 5 ||
      (month === 6 && day <= 20)
    ) {
      return 'Spring';
    } else if (
      (month === 6 && day >= 21) ||
      month === 7 ||
      month === 8 ||
      (month === 9 && day <= 22)
    ) {
      return 'Summer';
    } else {
      return 'Fall';
    }
  };

  const [formData, setFormData] = useState<PlayerFormData>({
    playerId: playerId || '',
    fullName: '',
    gender: '',
    dob: '',
    schoolName: '',
    grade: '',
    healthConcerns: '',
    aauNumber: '',
    registrationYear: new Date().getFullYear().toString(),
    season: getCurrentSeason(),
    parentId: '',
  });

  useEffect(() => {
    if (!isEdit) {
      fetchParents();
    }
  }, [isEdit, fetchParents]);

  useEffect(() => {
    const fetchData = async () => {
      if (isEdit) {
        if (playerState?.player) {
          const player = playerState.player;
          setFormData((prev) => ({
            ...prev,
            playerId: player.playerId || player._id || '',
            fullName: player.name || player.fullName || '',
            gender: player.gender || '',
            dob: player.dob || '',
            schoolName: player.section || player.schoolName || '',
            grade: player.class || player.grade || '',
            healthConcerns: player.healthConcerns || '',
            aauNumber: player.aauNumber || '',
            parentId: player.parentId || '',
          }));
        } else if (playerId) {
          const player = await fetchPlayerData(playerId);
          if (player) {
            setFormData((prev) => ({
              ...prev,
              playerId: player._id || player.playerId || '',
              fullName: player.fullName || player.name || '',
              gender: player.gender || '',
              dob: player.dob || '',
              schoolName: player.schoolName || player.section || '',
              grade: player.grade || player.class || '',
              healthConcerns: player.healthConcerns || '',
              aauNumber: player.aauNumber || '',
              parentId: player.parentId || '',
            }));
          }
        }
      }
    };

    fetchData();
  }, [isEdit, playerId, playerState]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!validateName(formData.fullName)) {
      newErrors.fullName = 'Please enter a valid name (min 2 characters)';
    }

    if (!validateDateOfBirth(formData.dob)) {
      newErrors.dob = 'Please enter a valid date of birth';
    }

    if (!validateRequired(formData.gender)) {
      newErrors.gender = 'Gender is required';
    }

    if (!isEdit && !formData.parentId) {
      newErrors.parentId = 'Parent is required';
    }

    if (!validateGrade(formData.grade)) {
      newErrors.grade = 'Please select a valid grade (1-12)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      // Scroll to the first error
      const firstErrorKey = Object.keys(errors)[0];
      if (firstErrorKey) {
        const element = document.querySelector(`[name="${firstErrorKey}"]`);
        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    if (isEdit && !formData.playerId) {
      alert('Player ID is missing. Cannot update player.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Authentication token missing. Please login again.');
        return;
      }

      const baseUrl = `${API_BASE_URL}/players`;
      const url = isEdit ? `${baseUrl}/${formData.playerId}` : baseUrl;

      const payload = {
        fullName: formData.fullName,
        gender: formData.gender,
        dob: formData.dob,
        schoolName: formData.schoolName,
        grade: formData.grade.replace(/\D/g, ''),
        healthConcerns: formData.healthConcerns,
        aauNumber: formData.aauNumber,
        registrationYear: formData.registrationYear,
        season: formData.season,
        ...(!isEdit && { parentId: formData.parentId }),
      };

      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      };

      const response = await (isEdit
        ? axios.put(url, payload, config)
        : axios.post(url, payload, config));

      // For edits, navigate back to player details
      if (isEdit && playerState?.from) {
        navigate(playerState.from, {
          state: {
            player: response.data,
            guardians: playerState.guardians,
            siblings: playerState.siblings || [],
            from: 'edit',
          },
          replace: true,
        });
      } else {
        navigate(all_routes.playerList);
      }
    } catch (error) {
      console.error(`Error ${isEdit ? 'updating' : 'adding'} player:`, error);

      let errorMessage = `Failed to ${isEdit ? 'update' : 'add'} player.`;
      if (axios.isAxiosError(error)) {
        errorMessage += ` Server responded with: ${error.response?.status}`;
        if (error.response?.data?.error) {
          errorMessage += ` - ${error.response.data.error}`;
        }
      }

      alert(errorMessage);
    }
  };

  const renderGradeSelect = () => (
    <select
      className={`form-control ${errors.grade ? 'is-invalid' : ''}`}
      name='grade'
      value={formData.grade.replace(/\D/g, '')}
      onChange={handleInputChange}
    >
      <option value=''>Select Grade</option>
      {[...Array(12)].map((_, i) => {
        const gradeNum = String(i + 1);
        return (
          <option key={gradeNum} value={gradeNum}>
            {gradeNum}
            {i === 0 ? 'st' : i === 1 ? 'nd' : i === 2 ? 'rd' : 'th'} Grade
          </option>
        );
      })}
    </select>
  );

  const formatForDateInput = (dateString: string | undefined): string => {
    if (!dateString) return '';

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';

      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');

      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  };

  return (
    <div className='page-wrapper'>
      <div className='content content-two'>
        <div className='d-md-flex d-block align-items-center justify-content-between mb-3'>
          <div className='my-auto mb-2'>
            <h3 className='mb-1'>{isEdit ? 'Edit' : 'Add'} Player</h3>
            <nav>
              <ol className='breadcrumb mb-0'>
                <li className='breadcrumb-item'>
                  <Link to={all_routes.adminDashboard}>Dashboard</Link>
                </li>
                <li className='breadcrumb-item'>
                  <Link to={all_routes.playerList}>Players</Link>
                </li>
                <li className='breadcrumb-item active' aria-current='page'>
                  {isEdit ? 'Edit' : 'Add'} Player
                </li>
              </ol>
            </nav>
          </div>
        </div>
        <div className='row'>
          <div className='col-md-12'>
            <form onSubmit={handleSubmit}>
              <div className='card'>
                <div className='card-header bg-light'>
                  <div className='d-flex align-items-center'>
                    <span className='bg-white avatar avatar-sm me-2 text-gray-7 flex-shrink-0'>
                      <i className='ti ti-info-square-rounded fs-16' />
                    </span>
                    <h4 className='text-dark'>Personal Information</h4>
                  </div>
                </div>
                <div className='card-body pb-1'>
                  <div className='row'>
                    <div className='col-md-12'>
                      <div className='d-flex align-items-center flex-wrap row-gap-3 mb-3'>
                        <div className='d-flex align-items-center justify-content-center avatar avatar-xxl border border-dashed me-2 flex-shrink-0 text-dark frames'>
                          <i className='ti ti-photo-plus fs-16' />
                        </div>
                        <div className='profile-upload'>
                          <div className='profile-uploader d-flex align-items-center'>
                            <div className='drag-upload-btn mb-3'>
                              Upload
                              <input
                                type='file'
                                className='form-control image-sign'
                                multiple
                              />
                            </div>
                            <Link to='#' className='btn btn-primary mb-3'>
                              Remove
                            </Link>
                          </div>
                          <p className='fs-12'>
                            Upload image size 4MB, Format JPG, PNG, SVG
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className='row row-cols-xxl-2 row-cols-md-6'>
                    <div className='col-xxl col-xl-3 col-md-6'>
                      <div className='mb-3'>
                        <label className='form-label'>Full Name</label>
                        <input
                          type='text'
                          className={`form-control ${
                            errors.fullName ? 'is-invalid' : ''
                          }`}
                          name='fullName'
                          value={formData.fullName}
                          onChange={handleInputChange}
                        />
                        {errors.fullName && (
                          <div className='invalid-feedback d-block'>
                            {errors.fullName}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className='row row-cols-xxl-5 row-cols-md-6'>
                    <div className='col-xxl col-xl-3 col-md-6'>
                      <div className='mb-3'>
                        <label className='form-label'>Date of Birth</label>
                        <div className='input-icon position-relative'>
                          <input
                            type='date'
                            className={`form-control ${
                              errors.dob ? 'is-invalid' : ''
                            }`}
                            name='dob'
                            value={
                              formData.dob
                                ? formatForDateInput(formData.dob)
                                : ''
                            }
                            onChange={(e) => {
                              setFormData((prev) => ({
                                ...prev,
                                dob: e.target.value, // Stores in YYYY-MM-DD format
                              }));
                              // Clear error if it exists
                              if (errors.dob) {
                                setErrors((prev) => {
                                  const newErrors = { ...prev };
                                  delete newErrors.dob;
                                  return newErrors;
                                });
                              }
                            }}
                            onBlur={(e) => {
                              if (!validateDateOfBirth(e.target.value)) {
                                setErrors((prev) => ({
                                  ...prev,
                                  dob: 'Please enter a valid date of birth',
                                }));
                              }
                            }}
                            max={new Date().toISOString().split('T')[0]} // Prevent future dates
                          />
                          {errors.dob && (
                            <div className='invalid-feedback d-block'>
                              {errors.dob}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className='col-xxl col-xl-3 col-md-6'>
                      <div className='mb-3'>
                        <label className='form-label'>Gender</label>
                        <select
                          className={`form-control ${
                            errors.gender ? 'is-invalid' : ''
                          }`}
                          name='gender'
                          value={formData.gender}
                          onChange={handleInputChange}
                        >
                          <option value=''>Select Gender</option>
                          <option value='Male'>Male</option>
                          <option value='Female'>Female</option>
                          <option value='Other'>Other</option>
                        </select>
                        {errors.gender && (
                          <div className='invalid-feedback d-block'>
                            {errors.gender}
                          </div>
                        )}
                      </div>
                    </div>
                    {!isEdit && (
                      <div className='col-xxl col-xl-3 col-md-6'>
                        <div className='mb-3'>
                          <label className='form-label'>Parent</label>
                          <select
                            className={`form-control ${
                              errors.parentId ? 'is-invalid' : ''
                            }`}
                            name='parentId'
                            value={formData.parentId}
                            onChange={handleInputChange}
                            disabled={loadingParents}
                          >
                            <option value=''>Select Parent</option>
                            {parents.map((parent) => (
                              <option key={parent._id} value={parent._id}>
                                {parent.fullName} ({parent.email})
                              </option>
                            ))}
                          </select>
                          {loadingParents && (
                            <small className='text-muted'>
                              Loading parents...
                            </small>
                          )}
                          {errors.parentId && (
                            <div className='invalid-feedback d-block'>
                              {errors.parentId}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className='row row-cols-xxl-5 row-cols-md-6'>
                    <div className='col-xxl col-xl-3 col-md-6'>
                      <div className='mb-3'>
                        <label className='form-label'>School Name</label>
                        <input
                          type='text'
                          className='form-control'
                          name='schoolName'
                          value={formData.schoolName}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>
                    <div className='col-xxl col-xl-3 col-md-6'>
                      <div className='mb-3'>
                        <label className='form-label'>Grade</label>
                        {renderGradeSelect()}
                        {errors.grade && (
                          <div className='invalid-feedback d-block'>
                            {errors.grade}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className='col-xxl col-xl-3 col-md-6'>
                      <div className='mb-3'>
                        <label className='form-label'>AAU Number</label>
                        <input
                          type='text'
                          className='form-control'
                          name='aauNumber'
                          value={formData.aauNumber}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className='card'>
                <div className='card-header bg-light'>
                  <div className='d-flex align-items-center'>
                    <span className='bg-white avatar avatar-sm me-2 text-gray-7 flex-shrink-0'>
                      <i className='ti ti-medical-cross fs-16' />
                    </span>
                    <h4 className='text-dark'>Medical History</h4>
                  </div>
                </div>
                <div className='card-body pb-1'>
                  <div className='row'>
                    <div className='mb-3'>
                      <label className='form-label'>Medical Condition</label>
                      <input
                        type='text'
                        className='form-control'
                        name='healthConcerns'
                        value={formData.healthConcerns}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className='text-end mt-4'>
                <button
                  type='button'
                  className='btn btn-light me-3'
                  onClick={() => window.history.back()}
                >
                  Cancel
                </button>
                <button type='submit' className='btn btn-primary'>
                  {isEdit ? 'Update' : 'Add'} Player
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddPlayer;
