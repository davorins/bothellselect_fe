import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { all_routes } from '../../../router/all_routes';
import 'react-datepicker/dist/react-datepicker.css';
import Select from 'react-select';
import {
  PlayerFormData,
  PlayerState,
  ParentData,
  ValidationErrors,
} from '../../../../types/types';
import {
  validateRequired,
  validateName,
  validateDateOfBirth,
  validateGrade,
} from '../../../../utils/validation';
import { getAvatarUrl, getDefaultAvatar } from '../../../../utils/r2Utils';
import { calculateGradeFromDOB } from '../../../../utils/gradeUtils';
import SchoolAutocomplete from '../../../../components/SchoolAutocomplete';
import NameInput from '../../../../components/NameInput';
import { debounce } from 'lodash';
import { commonHealthConditions } from '../../../constants/healthConditions';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const gradeOptions = Array.from({ length: 12 }, (_, i) => ({
  value: `${i + 1}`,
  label: `${i + 1}${i === 0 ? 'st' : i === 1 ? 'nd' : i === 2 ? 'rd' : 'th'} Grade`,
}));

// ─── Inline error message component — same style used by Parent field ─────────
const FieldError = ({ message }: { message?: string }) =>
  message ? <div className='invalid-feedback d-block'>{message}</div> : null;

const AddPlayer = ({ isEdit }: { isEdit: boolean }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const playerState = location.state as PlayerState | undefined;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [parents, setParents] = useState<ParentData[]>([]);
  const [loadingParents, setLoadingParents] = useState(false);
  const [parentSearchTerm, setParentSearchTerm] = useState('');
  const [showParentDropdown, setShowParentDropdown] = useState(false);
  const [selectedParent, setSelectedParent] = useState<ParentData | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [parentPagination, setParentPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isUploading, setIsUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState({
    show: false,
    variant: 'success' as 'success' | 'danger',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Health conditions state
  const [selectedConditions, setSelectedConditions] = useState<any[]>([]);
  const [customCondition, setCustomCondition] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const playerId =
    playerState?.playerId ||
    playerState?.player?.playerId ||
    playerState?.player?._id ||
    '';

  // ✅ Debounced search
  const debouncedSearch = useMemo(
    () =>
      debounce((searchTerm: string) => {
        if (!isEdit) {
          if (searchTerm.trim().length >= 2) {
            fetchParents(1, searchTerm);
            setShowParentDropdown(true);
          } else {
            setParents([]);
            setShowParentDropdown(false);
          }
        }
      }, 500),
    [isEdit],
  );

  const fetchParents = useCallback(
    async (page: number = 1, search: string = '') => {
      try {
        setLoadingParents(true);
        const token = localStorage.getItem('token');
        const params = new URLSearchParams({
          page: page.toString(),
          limit: '10',
        });
        if (search) params.append('name', search);

        const response = await axios.get(`${API_BASE_URL}/parents?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.data.data && response.data.pagination) {
          if (page === 1) {
            setParents(response.data.data);
          } else {
            setParents((prev) => [...prev, ...response.data.data]);
          }
          setParentPagination(response.data.pagination);
        } else {
          setParents(response.data);
          setParentPagination({
            page: 1,
            limit: response.data.length,
            total: response.data.length,
            pages: 1,
          });
        }
      } catch (error) {
        console.error('Error fetching parents:', error);
      } finally {
        setLoadingParents(false);
      }
    },
    [],
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowParentDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleParentSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setParentSearchTerm(value);
    setSelectedParent(null);
    setFormData((prev) => ({ ...prev, parentId: '' }));
    debouncedSearch(value);
    clearFieldError('parentId');
  };

  const handleParentSelect = (parent: ParentData) => {
    setSelectedParent(parent);
    setParentSearchTerm(parent.fullName);
    setFormData((prev) => ({ ...prev, parentId: parent._id }));
    setShowParentDropdown(false);
    setParents([]);
    clearFieldError('parentId');
  };

  // ✅ Unified: clear one field's error
  const clearFieldError = (fieldName: string) => {
    setErrors((prev) => {
      if (!prev[fieldName]) return prev;
      const next = { ...prev };
      delete next[fieldName];
      return next;
    });
  };

  // ✅ Set one field's error (used by onBlur handlers)
  const setFieldError = (fieldName: string, message: string) => {
    setErrors((prev) => ({ ...prev, [fieldName]: message }));
  };

  const loadMoreParents = () => {
    if (parentPagination.page < parentPagination.pages) {
      fetchParents(parentPagination.page + 1, parentSearchTerm);
    }
  };

  const handleDropdownScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 50) {
      if (!loadingParents && parentPagination.page < parentPagination.pages) {
        loadMoreParents();
      }
    }
  };

  const fetchPlayerData = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/player/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching player data:', error);
      return null;
    }
  };

  const getCurrentSeason = () => {
    const month = new Date().getMonth() + 1;
    const day = new Date().getDate();
    if (
      (month === 12 && day >= 21) ||
      month === 1 ||
      month === 2 ||
      (month === 3 && day <= 20)
    )
      return 'Winter';
    if (
      (month === 3 && day >= 21) ||
      month === 4 ||
      month === 5 ||
      (month === 6 && day <= 20)
    )
      return 'Spring';
    if (
      (month === 6 && day >= 21) ||
      month === 7 ||
      month === 8 ||
      (month === 9 && day <= 22)
    )
      return 'Summer';
    return 'Fall';
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
    isGradeOverridden: false,
  });

  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [isEdit, debouncedSearch]);

  useEffect(() => {
    const fetchData = async () => {
      if (!isEdit) return;
      let player = playerState?.player;
      if (!player && playerId) player = await fetchPlayerData(playerId);
      if (!player) return;

      const avatarUrl = getAvatarUrl(
        player.avatar,
        getDefaultAvatar(
          'player',
          player.gender as 'Male' | 'Female' | undefined,
        ),
      );

      let dob = player.dob || '';
      if (dob) {
        if (dob.includes('T')) {
          dob = dob.split('T')[0];
        } else {
          const dateObj = new Date(dob);
          if (!isNaN(dateObj.getTime())) {
            const year = dateObj.getFullYear();
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const day = String(dateObj.getDate()).padStart(2, '0');
            dob = `${year}-${month}-${day}`;
          }
        }
      }

      if (player.parentId) {
        try {
          const token = localStorage.getItem('token');
          const parentResponse = await axios.get(
            `${API_BASE_URL}/parent/${player.parentId}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          );
          setSelectedParent(parentResponse.data);
          setParentSearchTerm(parentResponse.data.fullName);
        } catch (error) {
          console.error('Error fetching parent:', error);
        }
      }

      if (player.healthConcerns) {
        const concerns = player.healthConcerns
          .split(',')
          .map((c: string) => c.trim());
        const preSelected = concerns
          .filter((c: string) =>
            commonHealthConditions.some((cond) => cond.label === c),
          )
          .map(
            (c: string) =>
              commonHealthConditions.find((cond) => cond.label === c) || {
                value: 'custom',
                label: c,
              },
          );
        const customConcerns = concerns
          .filter(
            (c: string) =>
              !commonHealthConditions.some((cond) => cond.label === c),
          )
          .join(', ');
        setSelectedConditions(preSelected);
        if (customConcerns) {
          setCustomCondition(customConcerns);
          setShowCustomInput(true);
        }
      }

      const playerWithGradeOverride = player as any;
      setFormData((prev) => ({
        ...prev,
        playerId: player?._id || player?.playerId || '',
        fullName: player?.fullName || player?.name || '',
        gender: player?.gender || '',
        dob,
        schoolName: player?.schoolName || player?.section || '',
        grade: player?.grade || player?.class || '',
        healthConcerns: player?.healthConcerns || '',
        aauNumber: player?.aauNumber || '',
        parentId: player?.parentId || '',
        avatar: avatarUrl,
        isGradeOverridden: playerWithGradeOverride.isGradeOverridden || false,
      }));
      setAvatarPreview(avatarUrl);
    };
    fetchData();
  }, [isEdit, playerId, playerState]);

  // ✅ validateForm now RETURNS the error map so callers can use it immediately
  //    (avoids the stale-state race condition in the original)
  const validateForm = (): ValidationErrors => {
    const newErrors: ValidationErrors = {};

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

    if (!validateRequired(formData.schoolName)) {
      newErrors.schoolName = 'School name is required';
    }
    const gradeValue = formData.grade;
    if (!gradeValue) {
      newErrors.grade = 'Grade is required';
    } else {
      const numericGrade = gradeValue.replace(/\D/g, '');
      if (!validateGrade(numericGrade) && !['PK', 'K'].includes(gradeValue)) {
        newErrors.grade = 'Please select a valid grade';
      }
    }

    setErrors(newErrors);
    return newErrors;
  };

  // ✅ Per-field blur validators — same live-feedback feel as the Parent field
  const handleBlur = (
    e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    switch (name) {
      case 'fullName':
        if (value && !validateName(value))
          setFieldError(
            'fullName',
            'Please enter a valid name (min 2 characters)',
          );
        break;
      case 'dob':
        if (value && !validateDateOfBirth(value))
          setFieldError('dob', 'Please enter a valid date of birth');
        break;
      case 'gender':
        if (!validateRequired(value))
          setFieldError('gender', 'Gender is required');
        break;
      case 'grade':
        if (!value) {
          setFieldError('grade', 'Grade is required');
        } else {
          const numeric = value.replace(/\D/g, '');
          if (!validateGrade(numeric) && !['PK', 'K'].includes(value))
            setFieldError('grade', 'Please select a valid grade');
        }
        break;
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      if (
        name === 'dob' &&
        !prev.isGradeOverridden &&
        value.match(/^\d{4}-\d{2}-\d{2}$/)
      ) {
        updated.grade = calculateGradeFromDOB(value, new Date().getFullYear());
      }
      return updated;
    });

    clearFieldError(name);
  };

  const handleSchoolChange = (val: string) => {
    setFormData((prev) => ({ ...prev, schoolName: val }));
    if (val.trim()) {
      clearFieldError('schoolName');
    } else {
      setFieldError('schoolName', 'School name is required');
    }
  };

  const handleGradeOverride = () => {
    setFormData((prev) => ({ ...prev, isGradeOverridden: true }));
  };

  const handleConditionChange = (selected: any) => {
    setSelectedConditions(selected || []);
    const hasCustom = selected?.some((item: any) => item.value === 'custom');
    setShowCustomInput(hasCustom);
    updateHealthConcerns(selected || [], customCondition);
  };

  const handleCustomConditionChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = e.target.value;
    setCustomCondition(value);
    updateHealthConcerns(selectedConditions, value);
  };

  const updateHealthConcerns = (conditions: any[], custom: string) => {
    const selectedLabels = conditions
      .filter((c: any) => c.value !== 'custom')
      .map((c: any) => c.label);
    let healthConcerns = selectedLabels.join(', ');
    if (custom.trim() && showCustomInput) {
      healthConcerns = healthConcerns
        ? `${healthConcerns}, ${custom.trim()}`
        : custom.trim();
    }
    setFormData((prev) => ({ ...prev, healthConcerns }));
  };

  const uploadAvatar = async (file: File) => {
    setIsUploading(true);
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Authentication required.');
      setIsUploading(false);
      return;
    }

    try {
      const fd = new FormData();
      fd.append('avatar', file);
      const response = await axios.put(
        `${API_BASE_URL}/upload/player/${formData.playerId}/avatar`,
        fd,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        },
      );

      const avatarUrl = response.data.avatarUrl || response.data.url || '';
      if (avatarUrl) {
        setAvatarPreview(avatarUrl);
        setFormData((prev) => ({ ...prev, avatar: avatarUrl }));
        setSaveStatus({
          show: true,
          variant: 'success',
          message: 'Player picture updated successfully!',
        });
        setTimeout(
          () => setSaveStatus((prev) => ({ ...prev, show: false })),
          3000,
        );
      } else {
        throw new Error('No avatar URL returned from server');
      }
    } catch (error: any) {
      let errorMsg = 'Failed to update player picture. ';
      if (error.response)
        errorMsg += `Server error: ${error.response.status} - ${error.response.data?.error || error.response.statusText}`;
      else if (error.request)
        errorMsg += 'Network error - please check your connection.';
      else errorMsg += error.message;
      setSaveStatus({ show: true, variant: 'danger', message: errorMsg });
      setTimeout(
        () => setSaveStatus((prev) => ({ ...prev, show: false })),
        5000,
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setSaveStatus({
        show: true,
        variant: 'danger',
        message: 'File size must be less than 5MB',
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      setTimeout(
        () => setSaveStatus((prev) => ({ ...prev, show: false })),
        3000,
      );
      return;
    }

    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
    ];
    if (!allowedTypes.includes(file.type)) {
      setSaveStatus({
        show: true,
        variant: 'danger',
        message: 'Only JPEG, JPG, PNG, GIF, and WEBP images are allowed',
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      setTimeout(
        () => setSaveStatus((prev) => ({ ...prev, show: false })),
        3000,
      );
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);

    if (isEdit && formData.playerId) uploadAvatar(file);
  };

  const handleRemoveAvatar = () => {
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!isEdit || !formData.playerId) {
      const defaultAvatar = getDefaultAvatar(
        'player',
        formData.gender as 'Male' | 'Female' | undefined,
      );
      setAvatarPreview(defaultAvatar);
      setFormData((prev) => ({ ...prev, avatar: '' }));
      return;
    }
    deleteAvatar();
  };

  const deleteAvatar = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Authentication required');
      await axios.delete(
        `${API_BASE_URL}/upload/player/${formData.playerId}/avatar`,
        {
          headers: { Authorization: `Bearer ${token}` },
          data: { avatarUrl: formData.avatar },
        },
      );
      const defaultAvatar = getDefaultAvatar(
        'player',
        formData.gender as 'Male' | 'Female' | undefined,
      );
      setAvatarPreview(defaultAvatar);
      setFormData((prev) => ({ ...prev, avatar: '' }));
      setSaveStatus({
        show: true,
        variant: 'success',
        message: 'Player picture removed successfully!',
      });
      setTimeout(
        () => setSaveStatus((prev) => ({ ...prev, show: false })),
        3000,
      );
    } catch (error: any) {
      let errorMsg = 'Failed to remove player picture. ';
      if (error.response) errorMsg += `Server error: ${error.response.status}`;
      else if (error.request)
        errorMsg += 'Network error - please check your connection.';
      else errorMsg += error.message;
      setSaveStatus({ show: true, variant: 'danger', message: errorMsg });
      setTimeout(
        () => setSaveStatus((prev) => ({ ...prev, show: false })),
        5000,
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    // ✅ Use returned errors directly — no stale-state race condition
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      const firstErrorKey = Object.keys(validationErrors)[0];
      const element =
        document.querySelector(`[name="${firstErrorKey}"]`) ||
        document.querySelector(`#${firstErrorKey}`) ||
        document.querySelector(`.${firstErrorKey}`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });

      const card = document.getElementById('player-card');
      card?.classList.add('border-danger');
      setTimeout(() => card?.classList.remove('border-danger'), 3000);

      setIsSubmitting(false);
      return;
    }

    if (isEdit && !formData.playerId) {
      alert('Player ID is missing. Cannot update player.');
      setIsSubmitting(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Authentication token missing. Please login again.');
        setIsSubmitting(false);
        return;
      }

      const url = isEdit
        ? `${API_BASE_URL}/players/${formData.playerId}`
        : `${API_BASE_URL}/players`;

      let gradeToSend = formData.grade;
      if (gradeToSend && !['PK', 'K'].includes(gradeToSend)) {
        gradeToSend = gradeToSend.replace(/\D/g, '');
      }

      const payload = {
        fullName: formData.fullName,
        gender: formData.gender,
        dob: formData.dob,
        schoolName: formData.schoolName,
        grade: gradeToSend,
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

      if (isEdit && playerState?.from) {
        const updatedPlayer = response.data;
        const playerForNavigation = {
          ...updatedPlayer,
          _id: updatedPlayer._id || formData.playerId,
          id: updatedPlayer.id || formData.playerId,
          fullName: updatedPlayer.fullName || formData.fullName,
          gender: updatedPlayer.gender || formData.gender,
          dob: updatedPlayer.dob || formData.dob,
          schoolName: updatedPlayer.schoolName || formData.schoolName,
          grade: updatedPlayer.grade || gradeToSend,
          aauNumber: updatedPlayer.aauNumber || formData.aauNumber,
          healthConcerns:
            updatedPlayer.healthConcerns || formData.healthConcerns,
          registrationYear:
            updatedPlayer.registrationYear || formData.registrationYear,
          season: updatedPlayer.season || formData.season,
          ...(updatedPlayer.seasons && { seasons: updatedPlayer.seasons }),
          ...(updatedPlayer.paymentStatus && {
            paymentStatus: updatedPlayer.paymentStatus,
          }),
          ...(updatedPlayer.paymentComplete && {
            paymentComplete: updatedPlayer.paymentComplete,
          }),
        };

        const navigationState: any = {
          player: playerForNavigation,
          guardians: playerState.guardians,
          siblings: playerState.siblings || [],
          from: 'edit',
        };
        if ((playerState as any).sharedData)
          navigationState.sharedData = (playerState as any).sharedData;

        navigate(playerState.from, { state: navigationState, replace: true });
      } else {
        navigate(all_routes.playerList);
      }
    } catch (error) {
      console.error(`Error ${isEdit ? 'updating' : 'adding'} player:`, error);
      let errorMessage = `Failed to ${isEdit ? 'update' : 'add'} player.`;
      if (axios.isAxiosError(error)) {
        errorMessage += ` Server responded with: ${error.response?.status}`;
        if (error.response?.data?.error)
          errorMessage += ` - ${error.response.data.error}`;
      }
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const DEFAULT_AVATAR = getDefaultAvatar(
    'player',
    formData.gender as 'Male' | 'Female',
  );

  const selectStyles = {
    control: (base: any) => ({
      ...base,
      minHeight: '38px',
      borderColor: '#d9d9d9',
      '&:hover': { borderColor: '#40a9ff' },
    }),
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
            {/* ✅ noValidate disables browser-native popups so our styled errors show instead */}
            <form onSubmit={handleSubmit} noValidate>
              <div className='card' id='player-card'>
                <div className='card-header bg-light'>
                  <div className='d-flex align-items-center'>
                    <span className='bg-white avatar avatar-sm me-2 text-gray-7 flex-shrink-0'>
                      <i className='ti ti-shirt-sport fs-16' />
                    </span>
                    <h4 className='text-dark'>Personal Information</h4>
                  </div>
                </div>

                <div className='card-body pb-1'>
                  {/* Avatar Section */}
                  <div className='d-flex align-items-center flex-wrap row-gap-3 mb-3'>
                    <div className='d-flex align-items-center justify-content-center avatar avatar-xxl border border-dashed me-2 flex-shrink-0 text-dark frames'>
                      {avatarPreview ? (
                        <img
                          src={avatarPreview}
                          alt='Player avatar preview'
                          className='img-fluid rounded'
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = DEFAULT_AVATAR;
                          }}
                        />
                      ) : (
                        <i className='ti ti-photo-plus fs-16' />
                      )}
                    </div>
                    <div className='profile-upload'>
                      <div className='profile-uploader d-flex align-items-center'>
                        <div className='drag-upload-btn mb-3'>
                          Upload Photo
                          <input
                            type='file'
                            className='form-control image-sign'
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept='image/jpeg, image/png, image/webp'
                            disabled={isUploading}
                          />
                        </div>
                        {avatarPreview && avatarPreview !== DEFAULT_AVATAR && (
                          <button
                            type='button'
                            className='btn btn-primary mb-3 ms-2'
                            onClick={handleRemoveAvatar}
                            disabled={isUploading}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <p className='fs-12'>
                        Upload image size 4MB, Format JPG, PNG
                      </p>
                      {isUploading && (
                        <div className='text-primary mt-1'>
                          <span
                            className='spinner-border spinner-border-sm me-1'
                            role='status'
                          />
                          Uploading...
                        </div>
                      )}
                      {saveStatus.show && (
                        <div
                          className={`alert alert-${saveStatus.variant} mt-2 p-2`}
                        >
                          {saveStatus.message}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ── Full Name ─────────────────────────────────────────── */}
                  <div className='row row-cols-xxl-12 row-cols-md-12'>
                    <div className='col-xxl col-xl-4 col-md-12'>
                      <div className='mb-3'>
                        <NameInput
                          value={formData.fullName}
                          onChange={(val) => {
                            handleInputChange({
                              target: { name: 'fullName', value: val },
                            } as React.ChangeEvent<HTMLInputElement>);
                            // Validate once user has typed enough to be meaningful
                            if (val.length > 0 && !validateName(val)) {
                              setFieldError(
                                'fullName',
                                'Please enter a valid name (min 2 characters)',
                              );
                            }
                          }}
                          error={errors.fullName}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* ── Parent + School ───────────────────────────────────── */}
                  <div className='row row-cols-xxl-12 row-cols-md-12'>
                    {!isEdit && (
                      <div className='col-xxl col-xl-4 col-md-12'>
                        <div
                          className='mb-3 position-relative'
                          ref={dropdownRef}
                        >
                          <label className='form-label'>Parent</label>
                          <input
                            type='text'
                            className={`form-control ${errors.parentId ? 'is-invalid' : ''}`}
                            placeholder='Type parent name...'
                            value={parentSearchTerm}
                            onChange={handleParentSearch}
                            onFocus={() => {
                              if (
                                parentSearchTerm.length >= 2 &&
                                parents.length > 0
                              )
                                setShowParentDropdown(true);
                            }}
                            onBlur={() => {
                              // Only flag if the user has typed something but not selected
                              if (parentSearchTerm && !formData.parentId)
                                setFieldError(
                                  'parentId',
                                  'Please select a parent from the list',
                                );
                              else if (!parentSearchTerm)
                                setFieldError('parentId', 'Parent is required');
                            }}
                            autoComplete='off'
                          />

                          {showParentDropdown && (
                            <div
                              className='position-absolute w-100 mt-1 bg-white border rounded shadow-lg'
                              style={{
                                zIndex: 1000,
                                maxHeight: '250px',
                                overflowY: 'auto',
                              }}
                              onScroll={handleDropdownScroll}
                            >
                              {loadingParents && parents.length === 0 ? (
                                <div className='p-3 text-center text-muted'>
                                  <span className='spinner-border spinner-border-sm me-2' />
                                  Searching...
                                </div>
                              ) : parents.length > 0 ? (
                                <>
                                  {parents.map((parent) => (
                                    <div
                                      key={parent._id}
                                      className='p-2 border-bottom cursor-pointer'
                                      onClick={() => handleParentSelect(parent)}
                                      style={{ cursor: 'pointer' }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor =
                                          '#f8f9fa';
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor =
                                          'transparent';
                                      }}
                                    >
                                      <div className='fw-bold'>
                                        {parent.fullName}
                                      </div>
                                      <div className='small text-muted'>
                                        {parent.email} • {parent.phone}
                                      </div>
                                    </div>
                                  ))}
                                  {loadingParents && (
                                    <div className='p-2 text-center text-muted'>
                                      <span className='spinner-border spinner-border-sm me-2' />
                                      Loading more...
                                    </div>
                                  )}
                                  {parentPagination.page <
                                    parentPagination.pages &&
                                    !loadingParents && (
                                      <div
                                        className='p-2 text-center text-primary'
                                        style={{ cursor: 'pointer' }}
                                        onClick={loadMoreParents}
                                      >
                                        Load more...
                                      </div>
                                    )}
                                </>
                              ) : parentSearchTerm.length >= 2 ? (
                                <div className='p-3 text-center text-muted'>
                                  No parents found matching "{parentSearchTerm}"
                                </div>
                              ) : null}
                            </div>
                          )}

                          <FieldError message={errors.parentId} />

                          {selectedParent && (
                            <div className='mt-2 p-2 bg-light rounded'>
                              <small className='text-muted'>
                                Selected parent:
                              </small>
                              <div className='fw-bold'>
                                {selectedParent.fullName}
                              </div>
                              <small className='text-muted'>
                                {selectedParent.email}
                              </small>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className='col-xxl col-xl-4 col-md-12'>
                      <div className='mb-3'>
                        <label className='form-label'>School Name *</label>
                        <SchoolAutocomplete
                          value={formData.schoolName}
                          onChange={handleSchoolChange}
                          isInvalid={!!errors.schoolName}
                        />
                        <FieldError message={errors.schoolName} />
                      </div>
                    </div>
                  </div>

                  {/* ── Gender / DOB / Grade / AAU ────────────────────────── */}
                  <div className='row row-cols-xxl-12 row-cols-md-12'>
                    {/* Gender */}
                    <div className='col-xxl col-xl-3 col-md-12'>
                      <div className='mb-3'>
                        <label className='form-label'>Gender</label>
                        <select
                          className={`form-control ${errors.gender ? 'is-invalid' : ''}`}
                          name='gender'
                          value={formData.gender}
                          onChange={handleInputChange}
                          onBlur={handleBlur}
                        >
                          <option value=''>Select Gender</option>
                          <option value='Male'>Male</option>
                          <option value='Female'>Female</option>
                        </select>
                        <FieldError message={errors.gender} />
                      </div>
                    </div>

                    {/* Date of Birth */}
                    <div className='col-xxl col-xl-3 col-md-12'>
                      <div className='mb-3'>
                        <label className='form-label'>Date of Birth</label>
                        <input
                          type='date'
                          className={`form-control ${errors.dob ? 'is-invalid' : ''}`}
                          name='dob'
                          value={formData.dob}
                          onChange={handleInputChange}
                          onBlur={handleBlur}
                          max={new Date().toISOString().split('T')[0]}
                        />
                        <FieldError message={errors.dob} />
                      </div>
                    </div>

                    {/* Grade */}
                    <div className='col-xxl col-xl-3 col-md-12'>
                      <div className='mb-3'>
                        <label className='form-label'>Grade</label>
                        <select
                          className={`form-control ${errors.grade ? 'is-invalid' : ''}`}
                          name='grade'
                          value={formData.grade}
                          onChange={handleInputChange}
                          onBlur={handleBlur}
                        >
                          <option value=''>Select Grade</option>
                          {gradeOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        {formData.dob && !formData.isGradeOverridden && (
                          <div className='text-muted small mt-1'>
                            Auto-calculated from DOB
                            <button
                              type='button'
                              className='btn btn-link btn-sm p-0 ms-2'
                              onClick={handleGradeOverride}
                            >
                              Adjust
                            </button>
                          </div>
                        )}
                        <FieldError message={errors.grade} />
                      </div>
                    </div>

                    {/* AAU Number */}
                    <div className='col-xxl col-xl-3 col-md-12'>
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

                  {/* ── Medical History ───────────────────────────────────── */}
                  <div className='card mt-3'>
                    <div className='card-header bg-light'>
                      <div className='d-flex align-items-center'>
                        <span className='bg-white avatar avatar-sm me-2 text-gray-7 flex-shrink-0'>
                          <i className='ti ti-heartbeat fs-16' />
                        </span>
                        <h4 className='text-dark'>Medical History</h4>
                      </div>
                    </div>
                    <div className='card-body pb-1'>
                      <div className='row'>
                        <div className='mb-3'>
                          <label className='form-label'>
                            Health Conditions
                          </label>
                          <Select
                            isMulti
                            name='healthConditions'
                            options={commonHealthConditions}
                            className='basic-multi-select'
                            classNamePrefix='select'
                            value={selectedConditions}
                            onChange={handleConditionChange}
                            styles={selectStyles}
                            placeholder='Select health conditions...'
                          />
                          <small className='text-muted'>
                            Select all that apply
                          </small>
                        </div>

                        {showCustomInput && (
                          <div className='mb-3'>
                            <label className='form-label'>
                              Specify Other Condition(s)
                            </label>
                            <input
                              type='text'
                              className='form-control'
                              value={customCondition}
                              onChange={handleCustomConditionChange}
                              placeholder='Please describe any other health conditions...'
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className='text-end mt-4'>
                <button
                  type='button'
                  className='btn btn-light me-3'
                  onClick={() => navigate(-1)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type='submit'
                  className='btn btn-primary'
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span
                        className='spinner-border spinner-border-sm me-1'
                        role='status'
                        aria-hidden='true'
                      />
                      {isEdit ? 'Updating...' : 'Adding...'}
                    </>
                  ) : isEdit ? (
                    'Update Player'
                  ) : (
                    'Add Player'
                  )}
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
