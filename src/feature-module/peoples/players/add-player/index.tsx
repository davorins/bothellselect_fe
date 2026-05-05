// src/feature-module/settings/players/AddPlayer.tsx
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
  validateName,
  validateDateOfBirth,
} from '../../../../utils/validation';
import { getAvatarUrl, getDefaultAvatar } from '../../../../utils/r2Utils';
import { calculateGradeFromDOB } from '../../../../utils/gradeUtils';
import SchoolAutocomplete from '../../../../components/SchoolAutocomplete';
import NameInput from '../../../../components/NameInput';
import { debounce } from 'lodash';
import { commonHealthConditions } from '../../../constants/healthConditions';
import { useDynamicFormFields } from '../../../hooks/useDynamicFormFields';
import { Player as RegistrationPlayer } from '../../../../types/registration-types';
import { VisibleField } from '../../../../types/form-config.types';
import DynamicFormField from '../../../../components/forms/DynamicFormField';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

// ─── Type conversion utilities ────────────────────────────────────────────────
const convertToRegistrationPlayer = (
  formData: PlayerFormData,
): RegistrationPlayer => {
  return {
    _id: formData.playerId || '',
    fullName: formData.fullName || '',
    gender: formData.gender || '',
    dob: formData.dob || '',
    schoolName: formData.schoolName || '',
    healthConcerns: formData.healthConcerns || '',
    aauNumber: formData.aauNumber || '',
    registrationYear: formData.registrationYear
      ? Number(formData.registrationYear)
      : new Date().getFullYear(),
    season: formData.season || '',
    grade: formData.grade || '',
    isGradeOverridden: formData.isGradeOverridden || false,
    avatar: formData.avatar || '',
  };
};

// ─── Inline error message component ───────────────────────────────────────────
const FieldError = ({ message }: { message?: string }) =>
  message ? <div className='invalid-feedback d-block'>{message}</div> : null;

const AddPlayer = ({ isEdit }: { isEdit: boolean }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const playerState = location.state as PlayerState | undefined;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Dynamic form fields hook ──────────────────────────────────────────────
  const {
    getVisibleFields,
    validateField,
    loading: fieldsLoading,
  } = useDynamicFormFields('player', {
    registrationYear: new Date().getFullYear(),
  });

  // ── Parent search state ───────────────────────────────────────────────────
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

  // ── Form state ────────────────────────────────────────────────────────────
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isUploading, setIsUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState({
    show: false,
    variant: 'success' as 'success' | 'danger',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [visibleFields, setVisibleFields] = useState<VisibleField[]>([]);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);

  // Health conditions state
  const [selectedConditions, setSelectedConditions] = useState<any[]>([]);
  const [customCondition, setCustomCondition] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const playerId =
    playerState?.playerId ||
    playerState?.player?.playerId ||
    playerState?.player?._id ||
    '';

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

  // ── Update visible fields when form data changes ───────────────────────────
  useEffect(() => {
    const registrationPlayer = convertToRegistrationPlayer(formData);
    console.log('🔄 Converting formData to RegistrationPlayer:', {
      formData,
      registrationPlayer,
    });

    const fields = getVisibleFields(registrationPlayer);
    console.log(
      '📋 Fields from getVisibleFields:',
      fields.map((f) => ({
        name: f.fieldName,
        label: f.label,
        isRequired: f.isRequired,
        isEnabled: f.isEnabled,
      })),
    );

    setVisibleFields((prevFields) => {
      if (JSON.stringify(prevFields) === JSON.stringify(fields)) {
        return prevFields;
      }
      return fields;
    });
  }, [formData, getVisibleFields]);

  // ── Debounced parent search ───────────────────────────────────────────────
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

  const clearFieldError = (fieldName: string) => {
    setErrors((prev) => {
      if (!prev[fieldName]) return prev;
      const next = { ...prev };
      delete next[fieldName];
      return next;
    });
  };

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

      const fetchedPlayer = player; // Create a const reference
      if (fetchedPlayer && fetchedPlayer.parentId) {
        try {
          // parentId may be a populated object or a plain string ID
          const isPopulated =
            typeof fetchedPlayer.parentId === 'object' &&
            fetchedPlayer.parentId !== null;

          if (isPopulated) {
            // Already have the data — no fetch needed
            const parentObj = fetchedPlayer.parentId as any;
            setSelectedParent(parentObj);
            setParentSearchTerm(parentObj.fullName || '');
            setFormData((prev) => ({ ...prev, parentId: parentObj._id || '' }));
          } else {
            // Plain string ID — fetch as before
            const token = localStorage.getItem('token');
            const parentResponse = await axios.get(
              `${API_BASE_URL}/parent/${fetchedPlayer.parentId}`,
              { headers: { Authorization: `Bearer ${token}` } },
            );
            setSelectedParent(parentResponse.data);
            setParentSearchTerm(parentResponse.data.fullName);
            setFormData((prev) => ({
              ...prev,
              parentId: fetchedPlayer.parentId as string,
            }));
          }
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
        parentId:
          typeof player?.parentId === 'object' && player?.parentId !== null
            ? (player.parentId as any)._id
            : player?.parentId || '',
        avatar: avatarUrl,
        isGradeOverridden: playerWithGradeOverride.isGradeOverridden || false,
      }));
      setAvatarPreview(avatarUrl);
    };
    fetchData();
  }, [isEdit, playerId, playerState]);

  // ── Validation using dynamic fields ───────────────────────────────────────
  const validateForm = (): ValidationErrors => {
    const newErrors: ValidationErrors = {};
    const registrationPlayer = convertToRegistrationPlayer(formData);

    // Only validate fields that are actually visible in the form
    visibleFields.forEach((field) => {
      // Skip validation for fields that aren't displayed
      // This ensures disabled fields don't cause validation errors
      const value =
        registrationPlayer[field.fieldName as keyof RegistrationPlayer];

      // Handle different value types properly
      let stringValue = '';
      if (value !== undefined && value !== null) {
        // Convert numbers to strings, keep strings as is
        stringValue =
          typeof value === 'number' ? value.toString() : String(value);
      }

      const error = validateField(field, stringValue);
      if (error) {
        newErrors[field.fieldName] = error;
      }
    });

    // Only validate parent if we're in add mode AND the parent field is visible
    // In your layout, parent is always visible in add mode, so we keep this
    if (!isEdit && !formData.parentId) {
      newErrors.parentId = 'Parent is required';
    }

    setErrors(newErrors);
    return newErrors;
  };

  // ── Per-field blur validation ─────────────────────────────────────────────
  const handleBlur = (
    e: React.FocusEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    const field = visibleFields.find((f) => f.fieldName === name);
    if (field) {
      const error = validateField(field, value);
      if (error) {
        setFieldError(name, error);
      } else {
        clearFieldError(name);
      }
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => {
      const updated = { ...prev, [name]: value };

      // Auto-calculate grade from DOB if not overridden
      if (name === 'dob' && !prev.isGradeOverridden) {
        // The dynamic form hook will handle calculation
        // We'll let the visible fields update handle it
      }

      return updated;
    });

    clearFieldError(name);
  };

  const handleDynamicFieldChange = (fieldName: string, value: any) => {
    setFormData((prev) => {
      const updated = { ...prev, [fieldName]: value };

      // Auto-calculate grade from DOB if not overridden
      if (fieldName === 'dob' && !prev.isGradeOverridden) {
        // Calculate grade from DOB
        if (value && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
          // Use the same calculation function as Profile page
          const calculatedGrade = calculateGradeFromDOB(
            value,
            new Date().getFullYear(),
          );
          updated.grade = calculatedGrade;
        }
      }

      return updated;
    });
    clearFieldError(fieldName);
  };

  // ── Filter visible fields to exclude age from display ───────────────────
  const displayFields = useMemo(() => {
    // Filter out age field since it's informative only
    return visibleFields.filter((field) => field.fieldName !== 'age');
  }, [visibleFields]);

  const handleSchoolChange = (val: string) => {
    setFormData((prev) => ({ ...prev, schoolName: val }));
    if (val.trim()) {
      clearFieldError('schoolName');
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
        5000,
      );
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);

    if (isEdit && formData.playerId) {
      // For existing players, upload immediately
      uploadAvatar(file);
    } else {
      // For new players, store the file for later upload
      setPendingAvatarFile(file);
    }
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
        : `${API_BASE_URL}/players/register`;

      let gradeToSend = formData.grade;
      if (gradeToSend && !['PK', 'K'].includes(gradeToSend)) {
        gradeToSend = gradeToSend.replace(/\D/g, '');
      }

      // Build payload dynamically - only include fields that are visible and have values
      const payload: any = {
        registrationYear: formData.registrationYear,
        season: formData.season,
        ...(!isEdit && {
          parentId:
            typeof formData.parentId === 'object'
              ? (formData.parentId as any)._id
              : formData.parentId,
        }),
      };

      // IMPORTANT: Include avatar URL if it exists (for existing players)
      if (isEdit && formData.avatar) {
        payload.avatar = formData.avatar;
      }

      // Only add fields that are visible in the form
      visibleFields.forEach((field) => {
        const fieldName = field.fieldName;
        const value = formData[fieldName as keyof PlayerFormData];

        // For required fields, include them even if empty (backend will validate)
        // For optional fields, only include if they have a value
        if (field.isRequired) {
          payload[fieldName] = value || '';
        } else {
          // Only include optional fields if they have a truthy value
          if (value && value.toString().trim() !== '') {
            payload[fieldName] = value;
          }
        }
      });

      // Ensure required core fields are always included
      if (!payload.fullName && formData.fullName) {
        payload.fullName = formData.fullName;
      }

      if (!payload.gender && formData.gender) {
        payload.gender = formData.gender;
      }

      // Handle grade specially
      if (gradeToSend) {
        payload.grade = gradeToSend;
        payload.isGradeOverridden = formData.isGradeOverridden || false;
      }

      console.log('Submitting payload:', payload);
      console.log(
        'Visible fields:',
        visibleFields.map((f) => f.fieldName),
      );

      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      };

      const response = await (isEdit
        ? axios.put(url, payload, config)
        : axios.post(url, payload, config));

      // Get the player ID from the response
      const savedPlayerId =
        response.data._id ||
        response.data.id ||
        response.data.player?._id ||
        formData.playerId;

      // If this is a new player and there's a pending avatar file, upload it now
      if (!isEdit && pendingAvatarFile && savedPlayerId) {
        try {
          // Update formData with the new playerId
          setFormData((prev) => ({ ...prev, playerId: savedPlayerId }));

          // Upload the avatar
          const fd = new FormData();
          fd.append('avatar', pendingAvatarFile);
          const avatarResponse = await axios.put(
            `${API_BASE_URL}/upload/player/${savedPlayerId}/avatar`,
            fd,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'multipart/form-data',
              },
            },
          );

          const avatarUrl =
            avatarResponse.data.avatarUrl || avatarResponse.data.url || '';
          if (avatarUrl) {
            setFormData((prev) => ({ ...prev, avatar: avatarUrl }));
            setAvatarPreview(avatarUrl);
            setPendingAvatarFile(null);

            // Update the response data with the avatar URL
            if (response.data.player) {
              response.data.player.avatar = avatarUrl;
            } else {
              response.data.avatar = avatarUrl;
            }
          }
        } catch (avatarError) {
          console.error(
            'Error uploading avatar after player creation:',
            avatarError,
          );
          // Don't fail the whole submission, just log the error
        }
      }

      if (isEdit && playerState?.from) {
        const updatedPlayer = response.data.player || response.data;
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
          avatar: updatedPlayer.avatar || formData.avatar, // Include avatar
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
        // For new players, fetch parent data to include in navigation state
        let parentData = null;
        let allGuardians = [];
        let siblings = [];

        if (!isEdit && formData.parentId) {
          try {
            const token = localStorage.getItem('token');
            // Fetch the complete parent data
            const parentResponse = await axios.get(
              `${API_BASE_URL}/parent/${formData.parentId}`,
              {
                headers: { Authorization: `Bearer ${token}` },
              },
            );

            parentData = parentResponse.data;

            // Get the newly created player
            const newPlayer = response.data.player || response.data;

            // Fetch all players for this parent to get siblings
            try {
              const playersResponse = await axios.get(
                `${API_BASE_URL}/players/by-parent/${formData.parentId}`,
                {
                  headers: { Authorization: `Bearer ${token}` },
                },
              );

              // Filter out the current player to get siblings
              siblings = playersResponse.data.filter(
                (p: any) => p._id !== newPlayer._id,
              );
            } catch (error) {
              console.error('Error fetching siblings:', error);
            }

            // Format guardians array with proper structure
            // Primary parent
            const primaryGuardian = {
              _id: parentData._id,
              id: parentData._id,
              fullName: parentData.fullName,
              email: parentData.email,
              phone: parentData.phone,
              address: parentData.address,
              relationship: parentData.relationship || 'Parent',
              isCoach: parentData.isCoach || false,
              aauNumber: parentData.aauNumber || '',
              avatar: parentData.avatar,
              isPrimary: true,
              players: [newPlayer, ...siblings],
            };

            // Additional guardians
            const additionalGuardians = (
              parentData.additionalGuardians || []
            ).map((g: any) => ({
              _id: g._id,
              id: g._id,
              fullName: g.fullName,
              email: g.email,
              phone: g.phone,
              address: g.address,
              relationship: g.relationship,
              isCoach: g.isCoach || false,
              aauNumber: g.aauNumber || '',
              avatar: g.avatar,
              isPrimary: false,
            }));

            allGuardians = [primaryGuardian, ...additionalGuardians];

            // Create shared data object
            const sharedData = {
              familyGuardians: allGuardians,
              familyAddress: primaryGuardian.address,
              familyPlayers: [newPlayer, ...siblings],
            };

            // Navigate with COMPLETE state
            navigate(`${all_routes.playerDetail}/${savedPlayerId}`, {
              state: {
                player: {
                  ...newPlayer,
                  avatar: newPlayer.avatar || formData.avatar, // Include avatar
                },
                parentId: formData.parentId,
                parent: parentData,
                guardians: allGuardians,
                siblings: siblings,
                sharedData: sharedData,
                from: 'add',
              },
            });
            setIsSubmitting(false);
            return;
          } catch (error) {
            console.error('Error fetching parent data for navigation:', error);

            // Fallback - navigate with minimal data if fetch fails
            navigate(`${all_routes.playerDetail}/${savedPlayerId}`, {
              state: {
                player: {
                  ...(response.data.player || response.data),
                  avatar: formData.avatar, // Include avatar
                },
                parentId: formData.parentId,
                from: 'add',
              },
            });
            setIsSubmitting(false);
            return;
          }
        } else {
          // No parentId (shouldn't happen for new players, but just in case)
          navigate(`${all_routes.playerDetail}/${savedPlayerId}`, {
            state: {
              player: {
                ...(response.data.player || response.data),
                avatar: formData.avatar, // Include avatar
              },
              from: 'add',
            },
          });
          setIsSubmitting(false);
          return;
        }
      }
    } catch (error) {
      console.error(`Error ${isEdit ? 'updating' : 'adding'} player:`, error);
      let errorMessage = `Failed to ${isEdit ? 'update' : 'add'} player.`;
      if (axios.isAxiosError(error)) {
        errorMessage += ` Server responded with: ${error.response?.status}`;
        if (error.response?.data?.error)
          errorMessage += ` - ${error.response.data.error}`;
        if (error.response?.data?.errors) {
          console.error('Validation errors:', error.response.data.errors);
        }
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

  if (fieldsLoading) {
    return (
      <div className='page-wrapper'>
        <div className='content content-two'>
          <div className='text-center py-5'>
            <div className='spinner-border text-primary' role='status'>
              <span className='visually-hidden'>Loading form fields...</span>
            </div>
            <p className='mt-2'>Loading form configuration...</p>
          </div>
        </div>
      </div>
    );
  }

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

                  {/* ── Full Name (always required) ────────────────────────── */}
                  <div className='row'>
                    <div className='col-12'>
                      <div className='mb-3'>
                        <NameInput
                          value={formData.fullName}
                          onChange={(val) => {
                            handleInputChange({
                              target: { name: 'fullName', value: val },
                            } as React.ChangeEvent<HTMLInputElement>);
                          }}
                          error={errors.fullName}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* ── Parent selection (only for add mode) and School Name ───────────────── */}
                  {!isEdit && (
                    <div className='row'>
                      {/* Calculate column width based on whether schoolName is visible */}
                      {(() => {
                        const schoolNameField = displayFields.find(
                          (f) => f.fieldName === 'schoolName',
                        );
                        const showSchoolName = !!schoolNameField;

                        return (
                          <>
                            {/* Parent field - takes full width if schoolName is hidden, otherwise half */}
                            <div
                              className={showSchoolName ? 'col-md-6' : 'col-12'}
                            >
                              <div
                                className='mb-3 position-relative'
                                ref={dropdownRef}
                              >
                                Parent <span className='text-danger'>*</span>
                                <input
                                  type='text'
                                  className={`form-control ${errors.parentId ? 'is-invalid' : ''} mt-2`}
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
                                    if (parentSearchTerm && !formData.parentId)
                                      setFieldError(
                                        'parentId',
                                        'Please select a parent from the list',
                                      );
                                    else if (!parentSearchTerm)
                                      setFieldError(
                                        'parentId',
                                        'Parent is required',
                                      );
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
                                            onClick={() =>
                                              handleParentSelect(parent)
                                            }
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
                                        No parents found matching "
                                        {parentSearchTerm}"
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

                            {/* School Name - only if enabled */}
                            {showSchoolName && (
                              <div className='col-md-6'>
                                <div className='mb-3'>
                                  <label className='form-label'>
                                    {schoolNameField.label}
                                    {schoolNameField.isRequired && (
                                      <span className='text-danger ms-1'>
                                        *
                                      </span>
                                    )}
                                  </label>
                                  <SchoolAutocomplete
                                    value={formData.schoolName}
                                    onChange={handleSchoolChange}
                                    isInvalid={!!errors.schoolName}
                                  />
                                  <FieldError message={errors.schoolName} />
                                </div>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}

                  {/* ── Dynamic Fields (Gender, DOB, Grade, AAU, etc.) ─────────────────────── */}
                  <div className='row'>
                    {(() => {
                      // Get all visible fields except fullName and schoolName
                      const dynamicFields = displayFields.filter(
                        (field) =>
                          field.fieldName !== 'fullName' &&
                          field.fieldName !== 'schoolName',
                      );

                      console.log('🔍 Dynamic Fields Debug:', {
                        displayFields: displayFields.map((f) => f.fieldName),
                        dynamicFields: dynamicFields.map((f) => f.fieldName),
                        fieldCount: dynamicFields.length,
                        formData: {
                          gender: formData.gender,
                          dob: formData.dob,
                          grade: formData.grade,
                          aauNumber: formData.aauNumber,
                        },
                      });

                      // If no dynamic fields, show a message (shouldn't happen)
                      if (dynamicFields.length === 0) {
                        return (
                          <div className='col-12'>
                            <div className='alert alert-info'>
                              No additional fields configured for this form.
                            </div>
                          </div>
                        );
                      }

                      // Calculate column width based on number of fields
                      // Bootstrap grid has 12 columns
                      const fieldCount = dynamicFields.length;
                      let colClass = 'col-md-12'; // Default for 1 field

                      if (fieldCount === 2) {
                        colClass = 'col-md-6'; // 2 fields: 50% each
                      } else if (fieldCount === 3) {
                        colClass = 'col-md-4'; // 3 fields: 33.33% each
                      } else if (fieldCount === 4) {
                        colClass = 'col-md-6 col-lg-3'; // 4 fields: 50% on mobile, 25% on desktop
                      } else if (fieldCount >= 5) {
                        colClass = 'col-md-6 col-lg-4 col-xl-3'; // 5+ fields: responsive
                      }

                      return dynamicFields.map((field) => (
                        <div className={colClass} key={field.fieldName}>
                          <DynamicFormField
                            field={field}
                            value={
                              formData[
                                field.fieldName as keyof PlayerFormData
                              ] as string
                            }
                            onChange={handleDynamicFieldChange}
                            error={errors[field.fieldName]}
                          />

                          {/* Grade override helper text */}
                          {field.fieldName === 'grade' &&
                            formData.dob &&
                            !formData.isGradeOverridden &&
                            formData.grade && (
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
                        </div>
                      ));
                    })()}
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
