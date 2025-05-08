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

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const AddPlayer = ({ isEdit }: { isEdit: boolean }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const playerState = location.state as PlayerState | undefined;
  const [parents, setParents] = useState<ParentData[]>([]);
  const [loadingParents, setLoadingParents] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [saveStatus, setSaveStatus] = useState({
    show: false,
    variant: 'success',
    message: '',
  });

  const playerId =
    playerState?.playerId ||
    playerState?.player?.playerId ||
    playerState?.player?._id ||
    '';
  const [avatarSrc, setAvatarSrc] = useState('');

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
    avatar: '',
  });

  useEffect(() => {
    if (!isEdit) {
      fetchParents();
    }
  }, [isEdit, fetchParents]);

  useEffect(() => {
    const fetchData = async () => {
      if (isEdit) {
        let player = playerState?.player;

        if (!player && playerId) {
          player = await fetchPlayerData(playerId);
        }

        if (player) {
          const isCloudinaryUrl =
            typeof player.avatar === 'string' &&
            player.avatar.includes('res.cloudinary.com');

          const avatarUrl = isCloudinaryUrl
            ? `${player.avatar}?${Date.now()}`
            : player.avatar?.trim()
            ? `https://bothell-select.onrender.com${player.avatar}`
            : `https://bothell-select.onrender.com/uploads/avatars/${
                player.gender === 'Female' ? 'girl' : 'boy'
              }.png`;

          // Handle date of birth formatting
          let dob = player.dob || '';
          if (dob) {
            // If the date is in ISO format (from database), extract just YYYY-MM-DD
            if (dob.includes('T')) {
              dob = dob.split('T')[0];
            }
            // Ensure the date is in YYYY-MM-DD format
            else {
              const dateObj = new Date(dob);
              if (!isNaN(dateObj.getTime())) {
                const year = dateObj.getFullYear();
                const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                const day = String(dateObj.getDate()).padStart(2, '0');
                dob = `${year}-${month}-${day}`;
              }
            }
          }

          setFormData((prev) => ({
            ...prev,
            playerId: player?._id || player?.playerId || '',
            fullName: player?.fullName || player?.name || '',
            gender: player?.gender || '',
            dob: dob,
            schoolName: player?.schoolName || player?.section || '',
            grade: player?.grade || player?.class || '',
            healthConcerns: player?.healthConcerns || '',
            aauNumber: player?.aauNumber || '',
            parentId: player?.parentId || '',
            avatar: avatarUrl,
          }));

          setAvatarSrc(avatarUrl);
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
      // Split the date string to avoid timezone issues
      const [year, month, day] = dateString.split('-');
      if (!year || !month || !day) return '';

      // Create a date in local time without timezone conversion
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setIsUploading(true);

    const token = localStorage.getItem('token');

    if (!token || !formData.playerId) {
      alert('Authentication required or player ID missing.');
      setIsUploading(false);
      return;
    }

    try {
      const uploadPreset = process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET;
      const cloudName = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;

      if (!uploadPreset || !cloudName) {
        throw new Error('Cloudinary environment variables are missing');
      }

      const uploadFormData = new FormData(); // Renamed to avoid conflict
      uploadFormData.append('file', file);
      uploadFormData.append('upload_preset', uploadPreset);

      const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

      const cloudinaryResponse = await axios.post(
        cloudinaryUrl,
        uploadFormData
      );
      let avatarUrl = cloudinaryResponse.data.secure_url;

      if (!avatarUrl) {
        throw new Error('Cloudinary upload failed: no URL returned');
      }

      if (avatarUrl.startsWith('https//')) {
        avatarUrl = avatarUrl.replace(/^https(?=\/\/)/, 'https:');
      }

      const response = await axios.put(
        `${API_BASE_URL}/player/${formData.playerId}/avatar`,
        { avatarUrl },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      setAvatarSrc(avatarUrl);
      setFormData((prev) => ({ ...prev, avatar: avatarUrl }));
      setSaveStatus({
        show: true,
        variant: 'success',
        message: 'Player picture updated successfully!',
      });
    } catch (error: any) {
      console.error('Avatar upload failed:', error);
      setSaveStatus({
        show: true,
        variant: 'danger',
        message: 'Failed to update player picture. Please try again.',
      });
    } finally {
      setIsUploading(false);
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    }
  };

  const handleDeleteAvatar = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token || !formData.playerId) {
        throw new Error('Authentication required or player ID missing');
      }

      const response = await axios.delete(
        `${API_BASE_URL}/player/${formData.playerId}/avatar`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const defaultAvatar =
        formData.gender === 'Female'
          ? 'https://bothell-select.onrender.com/uploads/avatars/girl.png'
          : 'https://bothell-select.onrender.com/uploads/avatars/boy.png';

      setAvatarSrc(defaultAvatar);
      setFormData((prev) => ({ ...prev, avatar: defaultAvatar }));
      setSaveStatus({
        show: true,
        variant: 'success',
        message: 'Player picture removed successfully!',
      });
    } catch (error) {
      console.error('Deletion failed:', error);
      setSaveStatus({
        show: true,
        variant: 'danger',
        message: 'Failed to remove player picture. Please try again.',
      });
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
                          {avatarSrc ? (
                            <img
                              src={avatarSrc}
                              alt='Player Avatar'
                              className='avatar-img rounded-circle'
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                              }}
                            />
                          ) : (
                            <i className='ti ti-photo-plus fs-16' />
                          )}
                        </div>
                        <div className='profile-upload'>
                          <div className='profile-uploader d-flex align-items-center'>
                            <div className='drag-upload-btn mb-3'>
                              <label htmlFor='avatar-upload'>
                                Upload
                                <input
                                  id='avatar-upload'
                                  type='file'
                                  className='form-control image-sign'
                                  onChange={handleAvatarChange}
                                  accept='image/*'
                                  style={{ display: 'none' }}
                                />
                              </label>
                            </div>
                            <button
                              type='button'
                              className='btn btn-primary mb-3 ms-2'
                              onClick={handleDeleteAvatar}
                              disabled={
                                !avatarSrc ||
                                avatarSrc.includes('uploads/avatars/')
                              }
                            >
                              Remove
                            </button>
                          </div>
                          <p className='fs-12'>
                            Upload image size 4MB, Format JPG, PNG, SVG
                          </p>
                          {isUploading && (
                            <p className='fs-12 text-warning'>
                              Uploading image...
                            </p>
                          )}
                          {saveStatus.show && (
                            <div
                              className={`alert alert-${saveStatus.variant} mt-2`}
                            >
                              {saveStatus.message}
                            </div>
                          )}
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
                              // Store the raw YYYY-MM-DD value without timezone conversion
                              setFormData((prev) => ({
                                ...prev,
                                dob: e.target.value,
                              }));
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
                            max={new Date().toISOString().split('T')[0]}
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
