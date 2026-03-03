import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios, { AxiosRequestConfig } from 'axios';
import Swal from 'sweetalert2';
import { all_routes } from '../../../router/all_routes';
import ParentForm from './ParentForm';
import GuardianForm from './GuardianForm';
import NewGuardianForm from './NewGuardianForm';
import PlayerForm from './PlayerForm';
import NewPlayerForm from './NewPlayerForm';
import {
  formatPhoneNumber,
  validatePhoneNumber,
} from '../../../../utils/phone';
import {
  validateEmail,
  validateRequired,
  validateName,
  validateState,
  validateZipCode,
  validateDateOfBirth,
  validateGrade,
} from '../../../../utils/validation';
import { Address, ensureAddress } from '../../../../utils/address';
import {
  ParentFormData,
  GuardianFormData,
  ValidationErrors,
  ParentState,
  Guardian,
  PlayerFormData as PlayerFormDataType,
} from '../../../../types/types';
import { calculateGradeFromDOB } from '../../../../utils/registration-utils';
import { getAvatarUrl, getDefaultAvatar } from '../../../../utils/r2Utils';

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001/api';

// ─── Shared Swal helpers ──────────────────────────────────────────────────────
const swalToast = (
  icon: 'success' | 'error' | 'info' | 'warning',
  title: string,
  text?: string,
) =>
  Swal.fire({
    icon,
    title,
    text,
    toast: true,
    position: 'top-end',
    timer: 3000,
    showConfirmButton: false,
    background:
      icon === 'success' ? '#10b981' : icon === 'error' ? '#ef4444' : '#3b82f6',
    color: '#fff',
    iconColor: '#fff',
  });

const swalError = (title: string, text: string) =>
  Swal.fire({ icon: 'error', title, text, confirmButtonColor: '#594230' });

const AddParent = ({ isEdit }: { isEdit: boolean }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const parentState = location.state as ParentState | undefined;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(isEdit);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // ── Guardian avatar state ─────────────────────────────────────────────────
  const [guardianAvatarFiles, setGuardianAvatarFiles] = useState<
    Record<number, File>
  >({});
  const [guardianAvatarPreviews, setGuardianAvatarPreviews] = useState<
    Record<number, string>
  >({});
  const [guardianAvatarUploading, setGuardianAvatarUploading] = useState<
    Record<number, boolean>
  >({});
  const [newGuardianAvatarFile, setNewGuardianAvatarFile] =
    useState<File | null>(null);
  const [newGuardianAvatarPreview, setNewGuardianAvatarPreview] = useState<
    string | null
  >(null);

  // ── Player avatar state ───────────────────────────────────────────────────
  const [playerAvatarFiles, setPlayerAvatarFiles] = useState<
    Record<number, File>
  >({});
  const [playerAvatarPreviews, setPlayerAvatarPreviews] = useState<
    Record<number, string>
  >({});
  const [playerAvatarUploading, setPlayerAvatarUploading] = useState<
    Record<number, boolean>
  >({});
  const [newPlayerAvatarFile, setNewPlayerAvatarFile] = useState<File | null>(
    null,
  );
  const [newPlayerAvatarPreview, setNewPlayerAvatarPreview] = useState<
    string | null
  >(null);

  // ── Players list state ────────────────────────────────────────────────────
  const [players, setPlayers] = useState<PlayerFormDataType[]>([]);
  const [newPlayer, setNewPlayer] = useState<PlayerFormDataType>({
    fullName: '',
    gender: '',
    dob: '',
    schoolName: '',
    grade: '',
    healthConcerns: '',
    aauNumber: '',
    isGradeOverridden: false,
  });
  const [playerErrors, setPlayerErrors] = useState<ValidationErrors>({});
  const [showPlayerForm, setShowPlayerForm] = useState(false);

  const [formData, setFormData] = useState<ParentFormData>({
    _id: '',
    password: '',
    fullName: '',
    email: '',
    phone: '',
    address: { street: '', street2: '', city: '', state: '', zip: '' },
    relationship: '',
    isCoach: false,
    aauNumber: '',
    avatar: '',
    additionalGuardians: [],
  });

  const [newGuardian, setNewGuardian] = useState<GuardianFormData>({
    fullName: '',
    email: '',
    phone: '',
    address: { street: '', street2: '', city: '', state: '', zip: '' },
    relationship: '',
    aauNumber: '',
    isCoach: false,
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [guardianErrors, setGuardianErrors] = useState<ValidationErrors>({});
  const [showGuardianForm, setShowGuardianForm] = useState(false);

  // ── Data fetching ─────────────────────────────────────────────────────────

  const fetchParentData = async (parentId: string) => {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_BASE_URL}/parent/${parentId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  };

  useEffect(() => {
    const loadParentData = async () => {
      if (!isEdit) {
        setIsLoading(false);
        return;
      }
      try {
        let parentData;
        let fetchedPlayers = [];

        if (parentState?.parent) {
          parentData = parentState.parent;
          if (parentState.guardians)
            parentData.additionalGuardians = parentState.guardians;
          if (!parentData._id) throw new Error('Parent data missing ID');
        } else if (parentState?.parent?._id) {
          parentData = await fetchParentData(parentState.parent._id);
          if (!parentData?._id) throw new Error('Failed to load parent data');
        }

        if (parentData) {
          setFormData({
            _id: parentData._id,
            password: '',
            fullName: parentData.fullName || '',
            email: parentData.email || '',
            phone: parentData.phone || '',
            address: ensureAddress(parentData.address),
            relationship: parentData.relationship || '',
            isCoach: parentData.isCoach || false,
            aauNumber: parentData.aauNumber || '',
            avatar: parentData.avatar || '',
            additionalGuardians:
              parentData.additionalGuardians?.map((g: Guardian) => ({
                ...g,
                id: g.id || g._id?.toString() || Date.now().toString(),
                address: ensureAddress(g.address),
                isCoach: g.isCoach || false,
              })) || [],
          });

          if (parentData.avatar) {
            const defaultAvatar = getDefaultAvatar(
              parentData.isCoach ? 'coach' : 'parent',
            );
            setAvatarPreview(getAvatarUrl(parentData.avatar, defaultAvatar));
          }

          if (parentState?.players?.length) {
            fetchedPlayers = parentState.players;
          } else {
            try {
              const token = localStorage.getItem('token');
              const playersResponse = await axios.get(
                `${API_BASE_URL}/players/by-parent/${parentData._id}`,
                { headers: { Authorization: `Bearer ${token}` } },
              );
              fetchedPlayers = playersResponse.data || [];
            } catch (playerError) {
              console.error('Error fetching players:', playerError);
            }
          }

          if (fetchedPlayers.length > 0) {
            const formattedPlayers = fetchedPlayers.map((p: any) => ({
              _id: p._id,
              id: p._id,
              fullName: p.fullName || '',
              gender: p.gender || '',
              dob: p.dob
                ? p.dob.includes('T')
                  ? p.dob.split('T')[0]
                  : p.dob
                : '',
              schoolName: p.schoolName || '',
              grade: p.grade || '',
              healthConcerns: p.healthConcerns || '',
              aauNumber: p.aauNumber || '',
              avatar: p.avatar || '',
              isGradeOverridden: p.isGradeOverridden || false,
            }));
            setPlayers(formattedPlayers);

            const avatarPreviews: Record<number, string> = {};
            formattedPlayers.forEach((player: any, index: number) => {
              if (player.avatar) {
                const defaultPlayerAvatar = getDefaultAvatar(
                  'player',
                  player.gender as 'Male' | 'Female',
                );
                avatarPreviews[index] = getAvatarUrl(
                  player.avatar,
                  defaultPlayerAvatar,
                );
              }
            });
            setPlayerAvatarPreviews(avatarPreviews);
          }
        } else {
          throw new Error('No parent data available');
        }
      } catch (error) {
        console.error('Error loading parent data:', error);
        await swalError(
          'Failed to Load',
          'Failed to load parent data. Redirecting to list...',
        );
        navigate(all_routes.parentList);
      } finally {
        setIsLoading(false);
      }
    };
    loadParentData();
  }, [isEdit, parentState, navigate]);

  // ── AAU number handler ────────────────────────────────────────────────────

  const handleAauNumberChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    isGuardian: boolean = false,
    index?: number,
  ) => {
    const value = e.target.value;
    const hasAauNumber = value.trim().length > 0;
    if (isGuardian && index !== undefined) {
      setFormData((prev) => {
        const updatedGuardians = [...(prev.additionalGuardians || [])];
        updatedGuardians[index] = {
          ...updatedGuardians[index],
          aauNumber: value,
          isCoach: hasAauNumber,
        };
        return { ...prev, additionalGuardians: updatedGuardians };
      });
    } else {
      setFormData((prev) => ({
        ...prev,
        aauNumber: value,
        isCoach: hasAauNumber,
      }));
    }
  };

  // ── Parent avatar handlers ────────────────────────────────────────────────

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);

    if (isEdit && formData._id) {
      try {
        const token = localStorage.getItem('token');
        Swal.fire({
          title: 'Uploading...',
          text: 'Please wait while we upload your avatar',
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading(),
        });
        const latestParentData = await fetchParentData(formData._id);
        const fd = new FormData();
        fd.append('avatar', file);
        const response = await axios.put(
          `${API_BASE_URL}/upload/parent/${formData._id}/avatar`,
          fd,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const newAvatarUrl =
          response.data.avatarUrl || response.data.parent?.avatar;
        setFormData((prev) => ({
          ...prev,
          fullName: latestParentData.fullName || prev.fullName,
          email: latestParentData.email || prev.email,
          phone: latestParentData.phone || prev.phone,
          address: ensureAddress(latestParentData.address) || prev.address,
          relationship: latestParentData.relationship || prev.relationship,
          isCoach: latestParentData.isCoach || prev.isCoach,
          aauNumber: latestParentData.aauNumber || prev.aauNumber,
          additionalGuardians:
            latestParentData.additionalGuardians?.map((g: Guardian) => ({
              ...g,
              id: g._id?.toString() || g.id,
              address: ensureAddress(g.address),
              isCoach: g.isCoach || false,
            })) || prev.additionalGuardians,
          avatar: newAvatarUrl,
        }));
        const defaultAvatar = getDefaultAvatar(
          formData.isCoach ? 'coach' : 'parent',
        );
        if (newAvatarUrl)
          setAvatarPreview(getAvatarUrl(newAvatarUrl, defaultAvatar));
        swalToast('success', 'Avatar uploaded successfully!');
      } catch (err) {
        console.error('Avatar upload failed:', err);
        swalToast(
          'error',
          'Upload Failed',
          'Failed to upload avatar. Please try again.',
        );
        const defaultAvatar = getDefaultAvatar(
          formData.isCoach ? 'coach' : 'parent',
        );
        setAvatarPreview(
          formData.avatar ? getAvatarUrl(formData.avatar, defaultAvatar) : null,
        );
        setAvatarFile(null);
      } finally {
        setIsUploading(false);
      }
    } else {
      setIsUploading(false);
    }
    e.target.value = '';
  };

  const removeAvatar = async () => {
    if (isEdit && formData._id && formData.avatar) {
      try {
        setIsUploading(true);
        const result = await Swal.fire({
          title: 'Remove Avatar?',
          text: 'Are you sure you want to remove your profile picture?',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#ef4444',
          cancelButtonColor: '#6b7280',
          confirmButtonText: 'Yes, remove it!',
        });
        if (!result.isConfirmed) {
          setIsUploading(false);
          return;
        }
        const token = localStorage.getItem('token');
        Swal.fire({
          title: 'Removing...',
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading(),
        });
        await axios.delete(
          `${API_BASE_URL}/upload/parent/${formData._id}/avatar`,
          {
            headers: { Authorization: `Bearer ${token}` },
            data: { avatarUrl: formData.avatar },
          },
        );
        setFormData((prev) => ({ ...prev, avatar: '' }));
        setAvatarPreview(null);
        setAvatarFile(null);
        swalToast('success', 'Avatar removed successfully!');
      } catch (err) {
        console.error('Avatar delete failed:', err);
        swalToast(
          'error',
          'Removal Failed',
          'Failed to remove avatar. Please try again.',
        );
      } finally {
        setIsUploading(false);
      }
    } else {
      setAvatarPreview(null);
      setAvatarFile(null);
      swalToast('info', 'Preview Cleared', 'Avatar preview has been cleared');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Guardian avatar handlers ──────────────────────────────────────────────

  const handleGuardianAvatarChange = async (file: File, index: number) => {
    setGuardianAvatarFiles((prev) => ({ ...prev, [index]: file }));
    setGuardianAvatarUploading((prev) => ({ ...prev, [index]: true }));
    const reader = new FileReader();
    reader.onloadend = () =>
      setGuardianAvatarPreviews((prev) => ({
        ...prev,
        [index]: reader.result as string,
      }));
    reader.readAsDataURL(file);
    const guardian = formData.additionalGuardians?.[index];
    const isTempId =
      !guardian?._id ||
      guardian._id.toString().startsWith('temp_') ||
      guardian._id.toString().length < 10;
    if (isTempId) {
      setGuardianAvatarUploading((prev) => ({ ...prev, [index]: false }));
      swalToast(
        'info',
        'Avatar Saved',
        'The avatar will be uploaded after you save the guardian.',
      );
      return;
    }
    if (isEdit && formData._id && guardian?._id) {
      try {
        const token = localStorage.getItem('token');
        const fd = new FormData();
        fd.append('avatar', file);
        Swal.fire({
          title: 'Uploading...',
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading(),
        });
        const response = await axios.put(
          `${API_BASE_URL}/upload/guardian/${formData._id}/${guardian._id}/avatar`,
          fd,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        setFormData((prev) => {
          const updatedGuardians = [...(prev.additionalGuardians || [])];
          updatedGuardians[index] = {
            ...updatedGuardians[index],
            avatar: response.data.avatarUrl,
          };
          return { ...prev, additionalGuardians: updatedGuardians };
        });
        swalToast('success', 'Guardian avatar uploaded successfully!');
      } catch (err) {
        console.error('Guardian avatar upload failed:', err);
        swalToast(
          'error',
          'Upload Failed',
          'Failed to upload guardian avatar. Please try again.',
        );
        setGuardianAvatarPreviews((prev) => {
          const n = { ...prev };
          delete n[index];
          return n;
        });
        setGuardianAvatarFiles((prev) => {
          const n = { ...prev };
          delete n[index];
          return n;
        });
      } finally {
        setGuardianAvatarUploading((prev) => ({ ...prev, [index]: false }));
      }
    } else {
      setGuardianAvatarUploading((prev) => ({ ...prev, [index]: false }));
    }
  };

  const handleGuardianAvatarRemove = async (index: number) => {
    const guardian = formData.additionalGuardians?.[index];
    if (isEdit && formData._id && guardian?._id && guardian?.avatar) {
      try {
        setGuardianAvatarUploading((prev) => ({ ...prev, [index]: true }));
        const token = localStorage.getItem('token');
        await axios.delete(
          `${API_BASE_URL}/upload/guardian/${formData._id}/${guardian._id}/avatar`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        setFormData((prev) => {
          const updatedGuardians = [...(prev.additionalGuardians || [])];
          updatedGuardians[index] = { ...updatedGuardians[index], avatar: '' };
          return { ...prev, additionalGuardians: updatedGuardians };
        });
      } catch (err) {
        console.error('Guardian avatar delete failed:', err);
        swalToast(
          'error',
          'Failed',
          'Failed to delete guardian avatar. Please try again.',
        );
      } finally {
        setGuardianAvatarUploading((prev) => ({ ...prev, [index]: false }));
      }
    }
    setGuardianAvatarFiles((prev) => {
      const n = { ...prev };
      delete n[index];
      return n;
    });
    setGuardianAvatarPreviews((prev) => {
      const n = { ...prev };
      delete n[index];
      return n;
    });
  };

  const handleNewGuardianAvatarChange = (file: File) => {
    setNewGuardianAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () =>
      setNewGuardianAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleNewGuardianAvatarRemove = () => {
    setNewGuardianAvatarFile(null);
    setNewGuardianAvatarPreview(null);
  };

  // ── Player avatar handlers ────────────────────────────────────────────────

  const handlePlayerAvatarChange = async (file: File, index: number) => {
    setPlayerAvatarFiles((prev) => ({ ...prev, [index]: file }));
    setPlayerAvatarUploading((prev) => ({ ...prev, [index]: true }));
    const reader = new FileReader();
    reader.onloadend = () =>
      setPlayerAvatarPreviews((prev) => ({
        ...prev,
        [index]: reader.result as string,
      }));
    reader.readAsDataURL(file);
    const player = players[index];
    if (isEdit && player?._id) {
      try {
        const token = localStorage.getItem('token');
        const fd = new FormData();
        fd.append('avatar', file);
        const response = await axios.put(
          `${API_BASE_URL}/upload/player/${player._id}/avatar`,
          fd,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        setPlayers((prev) => {
          const updated = [...prev];
          updated[index] = {
            ...updated[index],
            avatar: response.data.avatarUrl || response.data.player?.avatar,
          };
          return updated;
        });
      } catch (err) {
        console.error('Player avatar upload failed:', err);
        swalToast(
          'error',
          'Upload Failed',
          'Failed to upload player avatar. Please try again.',
        );
        setPlayerAvatarPreviews((prev) => {
          const n = { ...prev };
          delete n[index];
          return n;
        });
        setPlayerAvatarFiles((prev) => {
          const n = { ...prev };
          delete n[index];
          return n;
        });
      } finally {
        setPlayerAvatarUploading((prev) => ({ ...prev, [index]: false }));
      }
    } else {
      setPlayerAvatarUploading((prev) => ({ ...prev, [index]: false }));
    }
  };

  const handlePlayerAvatarRemove = async (index: number) => {
    const player = players[index];
    if (isEdit && player?._id && player?.avatar) {
      try {
        setPlayerAvatarUploading((prev) => ({ ...prev, [index]: true }));
        const token = localStorage.getItem('token');
        await axios.delete(
          `${API_BASE_URL}/upload/player/${player._id}/avatar`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        setPlayers((prev) => {
          const updated = [...prev];
          updated[index] = { ...updated[index], avatar: '' };
          return updated;
        });
      } catch (err) {
        console.error('Player avatar delete failed:', err);
        swalToast(
          'error',
          'Failed',
          'Failed to delete player avatar. Please try again.',
        );
      } finally {
        setPlayerAvatarUploading((prev) => ({ ...prev, [index]: false }));
      }
    }
    setPlayerAvatarFiles((prev) => {
      const n = { ...prev };
      delete n[index];
      return n;
    });
    setPlayerAvatarPreviews((prev) => {
      const n = { ...prev };
      delete n[index];
      return n;
    });
  };

  const handleNewPlayerAvatarChange = (file: File) => {
    setNewPlayerAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setNewPlayerAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleNewPlayerAvatarRemove = () => {
    setNewPlayerAvatarFile(null);
    setNewPlayerAvatarPreview(null);
  };

  // ── Player field handlers ─────────────────────────────────────────────────

  const handlePlayerInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    index: number,
  ) => {
    const { name, value } = e.target;
    setPlayers((prev) => {
      const updated = [...prev];
      const player = { ...updated[index], [name]: value };
      if (
        name === 'dob' &&
        !updated[index].isGradeOverridden &&
        value.match(/^\d{4}-\d{2}-\d{2}$/)
      ) {
        player.grade = calculateGradeFromDOB(value, new Date().getFullYear());
      }
      updated[index] = player;
      return updated;
    });
  };

  const handlePlayerSchoolChange = (val: string, index: number) => {
    setPlayers((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], schoolName: val };
      return updated;
    });
  };

  // ── Player add / remove ───────────────────────────────────────────────────

  const validatePlayerForm = (player: PlayerFormDataType): ValidationErrors => {
    const errs: ValidationErrors = {};
    if (!validateName(player.fullName))
      errs.fullName = 'Please enter a valid name (min 2 characters)';
    if (!validateRequired(player.gender)) errs.gender = 'Gender is required';
    if (!validateDateOfBirth(player.dob))
      errs.dob = 'Please enter a valid date of birth';
    if (!validateRequired(player.schoolName))
      errs.schoolName = 'School name is required';
    if (!validateGrade(player.grade))
      errs.grade = 'Please select a valid grade';
    return errs;
  };

  const addPlayer = () => {
    const errs = validatePlayerForm(newPlayer);
    if (Object.keys(errs).length > 0) {
      setPlayerErrors(errs);
      return;
    }
    const newIndex = players.length;
    setPlayers((prev) => [
      ...prev,
      { ...newPlayer, id: Date.now().toString() },
    ]);
    if (newPlayerAvatarFile) {
      setPlayerAvatarFiles((prev) => ({
        ...prev,
        [newIndex]: newPlayerAvatarFile,
      }));
      if (newPlayerAvatarPreview)
        setPlayerAvatarPreviews((prev) => ({
          ...prev,
          [newIndex]: newPlayerAvatarPreview,
        }));
    }
    setNewPlayer({
      fullName: '',
      gender: '',
      dob: '',
      schoolName: '',
      grade: '',
      healthConcerns: '',
      aauNumber: '',
      isGradeOverridden: false,
    });
    setNewPlayerAvatarFile(null);
    setNewPlayerAvatarPreview(null);
    setShowPlayerForm(false);
    setPlayerErrors({});
  };

  const removePlayer = (index: number) => {
    setPlayers((prev) => prev.filter((_, i) => i !== index));
    const reindex = (prev: Record<number, any>) => {
      const updated: Record<number, any> = {};
      Object.entries(prev).forEach(([key, val]) => {
        const k = parseInt(key);
        if (k < index) updated[k] = val;
        else if (k > index) updated[k - 1] = val;
      });
      return updated;
    };
    setPlayerAvatarFiles(reindex);
    setPlayerAvatarPreviews(reindex);
    setPlayerAvatarUploading(reindex);
  };

  // ── Validation ────────────────────────────────────────────────────────────

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};
    if (!validateName(formData.fullName))
      newErrors.fullName = 'Please enter a valid name (min 2 characters)';
    if (!validateEmail(formData.email))
      newErrors.email = 'Please enter a valid email address';
    if (!isEdit && (!formData.password || formData.password.length < 6))
      newErrors.password = 'Password must be at least 6 characters';
    if (!validatePhoneNumber(formData.phone))
      newErrors.phone = 'Please enter a valid 10-digit phone number';
    if (!validateRequired(formData.relationship))
      newErrors.relationship = 'Relationship to player is required';
    const address = formData.address;
    if (!validateRequired(address.street))
      newErrors['address.street'] = 'Street address is required';
    if (!validateRequired(address.city))
      newErrors['address.city'] = 'City is required';
    if (!validateState(address.state))
      newErrors['address.state'] = 'Please enter a valid 2-letter state code';
    if (!validateZipCode(address.zip))
      newErrors['address.zip'] = 'Please enter a valid ZIP code';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateGuardianForm = (guardian: GuardianFormData): boolean => {
    const newErrors: ValidationErrors = {};
    if (!validateName(guardian.fullName))
      newErrors.fullName = 'Please enter a valid name (min 2 characters)';
    if (!validateEmail(guardian.email))
      newErrors.email = 'Please enter a valid email address';
    if (!validatePhoneNumber(guardian.phone))
      newErrors.phone = 'Please enter a valid 10-digit phone number';
    if (!validateRequired(guardian.relationship))
      newErrors.relationship = 'Relationship to player is required';
    if (!validateRequired(guardian.address.street))
      newErrors['address.street'] = 'Street address is required';
    if (!validateRequired(guardian.address.city))
      newErrors['address.city'] = 'City is required';
    if (!validateState(guardian.address.state))
      newErrors['address.state'] = 'Please enter a valid 2-letter state code';
    if (!validateZipCode(guardian.address.zip))
      newErrors['address.zip'] = 'Please enter a valid ZIP code';
    setGuardianErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateGuardian = (guardian: GuardianFormData): ValidationErrors => {
    const errs: ValidationErrors = {};
    if (!validateName(guardian.fullName))
      errs.fullName = 'Please enter a valid name (min 2 characters)';
    if (!validateEmail(guardian.email))
      errs.email = 'Please enter a valid email address';
    if (!validatePhoneNumber(guardian.phone))
      errs.phone = 'Please enter a valid 10-digit phone number';
    if (!validateRequired(guardian.relationship))
      errs.relationship = 'Relationship to player is required';
    if (!validateRequired(guardian.address.street))
      errs['address.street'] = 'Street address is required';
    if (!validateRequired(guardian.address.city))
      errs['address.city'] = 'City is required';
    if (!validateState(guardian.address.state))
      errs['address.state'] = 'Please enter a valid 2-letter state code';
    if (!validateZipCode(guardian.address.zip))
      errs['address.zip'] = 'Please enter a valid ZIP code';
    return errs;
  };

  const validateExistingGuardians = (): boolean => {
    if (!formData.additionalGuardians) return true;
    let allValid = true;
    formData.additionalGuardians.forEach((guardian, index) => {
      const guardianErrs = validateGuardian(guardian);
      if (Object.keys(guardianErrs).length > 0) {
        allValid = false;
        const el = document.getElementById(`guardian-${index}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('border-danger');
          setTimeout(() => el.classList.remove('border-danger'), 3000);
        }
      }
    });
    return allValid;
  };

  const validateExistingPlayers = (): boolean => {
    let allValid = true;
    players.forEach((player, index) => {
      const errs = validatePlayerForm(player);
      if (Object.keys(errs).length > 0) {
        allValid = false;
        const el = document.getElementById(`player-${index}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('border-danger');
          setTimeout(() => el.classList.remove('border-danger'), 3000);
        }
      }
    });
    return allValid;
  };

  // ── Form handlers ─────────────────────────────────────────────────────────

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const target = e.target as HTMLInputElement;
    const { name, value } = target;
    if (name === 'phone') {
      setFormData((prev) => ({
        ...prev,
        [name]: formatPhoneNumber(value.replace(/\D/g, '')),
      }));
      return;
    }
    if (name === 'isCoach') {
      setFormData((prev) => ({ ...prev, [name]: target.checked }));
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name])
      setErrors((prev) => {
        const n = { ...prev };
        delete n[name];
        return n;
      });
  };

  const handleGuardianInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    index: number,
  ) => {
    const target = e.target as HTMLInputElement;
    const { name, value } = target;
    if (name === 'phone') {
      setFormData((prev) => {
        const updated = [...(prev.additionalGuardians || [])];
        updated[index] = {
          ...updated[index],
          [name]: formatPhoneNumber(value.replace(/\D/g, '')),
        };
        return { ...prev, additionalGuardians: updated };
      });
      return;
    }
    setFormData((prev) => {
      const updated = [...(prev.additionalGuardians || [])];
      updated[index] = { ...updated[index], [name]: value };
      return { ...prev, additionalGuardians: updated };
    });
  };

  const handleAddressChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: keyof Address,
  ) => {
    setFormData((prev) => ({
      ...prev,
      address: { ...prev.address, [field]: e.target.value },
    }));
    if (errors[`address.${field}`])
      setErrors((prev) => {
        const n = { ...prev };
        delete n[`address.${field}`];
        return n;
      });
  };

  const handleGuardianAddressChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: keyof Address,
    index: number,
  ) => {
    setFormData((prev) => {
      const updated = [...(prev.additionalGuardians || [])];
      updated[index] = {
        ...updated[index],
        address: { ...updated[index].address, [field]: e.target.value },
      };
      return { ...prev, additionalGuardians: updated };
    });
  };

  const addGuardian = () => {
    if (!validateGuardianForm(newGuardian)) return;
    const newIndex = (formData.additionalGuardians || []).length;
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    setFormData((prev) => ({
      ...prev,
      additionalGuardians: [
        ...(prev.additionalGuardians || []),
        { ...newGuardian, id: tempId, _id: tempId },
      ],
    }));
    if (newGuardianAvatarFile) {
      setGuardianAvatarFiles((prev) => ({
        ...prev,
        [newIndex]: newGuardianAvatarFile,
      }));
      if (newGuardianAvatarPreview)
        setGuardianAvatarPreviews((prev) => ({
          ...prev,
          [newIndex]: newGuardianAvatarPreview,
        }));
    }
    setNewGuardian({
      fullName: '',
      email: '',
      phone: '',
      address: { street: '', street2: '', city: '', state: '', zip: '' },
      relationship: '',
      aauNumber: '',
      isCoach: false,
    });
    setNewGuardianAvatarFile(null);
    setNewGuardianAvatarPreview(null);
    setShowGuardianForm(false);
    setGuardianErrors({});
  };

  const removeGuardian = (index: number) => {
    setFormData((prev) => {
      const updated = [...(prev.additionalGuardians || [])];
      updated.splice(index, 1);
      return { ...prev, additionalGuardians: updated };
    });
    const reindex = (prev: Record<number, any>) => {
      const updated: Record<number, any> = {};
      Object.entries(prev).forEach(([key, val]) => {
        const k = parseInt(key);
        if (k < index) updated[k] = val;
        else if (k > index) updated[k - 1] = val;
      });
      return updated;
    };
    setGuardianAvatarFiles(reindex);
    setGuardianAvatarPreviews(reindex);
    setGuardianAvatarUploading(reindex);
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrors({});

    if (isEdit && (!formData._id || typeof formData._id !== 'string')) {
      await swalError(
        'Invalid ID',
        'Invalid parent ID. Please refresh and try again.',
      );
      setIsSubmitting(false);
      return;
    }

    if (!validateForm()) {
      const firstErrorKey = Object.keys(errors)[0];
      if (firstErrorKey) {
        const el = document.querySelector(
          `[name="${firstErrorKey.replace('address.', '')}"]`,
        );
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const card = document.getElementById('primary-parent-card');
        card?.classList.add('border-danger');
        setTimeout(() => card?.classList.remove('border-danger'), 3000);
      }
      setIsSubmitting(false);
      return;
    }

    if (formData.additionalGuardians?.length && !validateExistingGuardians()) {
      await swalError(
        'Guardian Errors',
        'Please fix all guardian errors before submitting',
      );
      setIsSubmitting(false);
      return;
    }

    if (players.length && !validateExistingPlayers()) {
      await swalError(
        'Player Errors',
        'Please fix all player errors before submitting',
      );
      setIsSubmitting(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Authentication token missing');

      let parentId = formData._id;
      let parentData;

      // ✅ FIX: Strip temp_ prefixed _id values before sending to backend
      //    Real MongoDB ObjectIds are 24-char hex strings — temp IDs are not
      const formatGuardiansForApi = (
        guardians: any[],
        includeRealIds: boolean,
      ) =>
        guardians.map((g) => {
          const hasRealId =
            g._id &&
            !g._id.toString().startsWith('temp_') &&
            g._id.toString().length === 24;
          return {
            ...(includeRealIds && hasRealId && { _id: g._id }),
            fullName: g.fullName.trim(),
            email: g.email.trim().toLowerCase(),
            phone: g.phone.replace(/\D/g, ''),
            relationship: g.relationship.trim(),
            aauNumber: g.aauNumber?.trim() || '',
            isCoach: g.isCoach || false,
            address: {
              street: g.address.street.trim(),
              ...(g.address.street2 && { street2: g.address.street2.trim() }),
              city: g.address.city.trim(),
              state: g.address.state.trim().toUpperCase(),
              zip: g.address.zip.trim(),
            },
          };
        });

      if (isEdit) {
        const url = `${API_BASE_URL}/parent-full/${formData._id}`;
        const formattedGuardians = formatGuardiansForApi(
          formData.additionalGuardians || [],
          true,
        );

        const payload = {
          fullName: formData.fullName.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.replace(/\D/g, ''),
          relationship: formData.relationship.trim(),
          isCoach: formData.isCoach,
          aauNumber: formData.aauNumber?.trim() || '',
          address: {
            street: formData.address.street.trim(),
            ...(formData.address.street2 && {
              street2: formData.address.street2.trim(),
            }),
            city: formData.address.city.trim(),
            state: formData.address.state.trim().toUpperCase(),
            zip: formData.address.zip.trim(),
          },
          additionalGuardians: formattedGuardians,
          ...(formData.avatar && { avatarUrl: formData.avatar }),
        };

        const config: AxiosRequestConfig = {
          headers: {
            Authorization: `Bearer ${token}`,
            ...(avatarFile ? {} : { 'Content-Type': 'application/json' }),
          },
          timeout: 10000,
        };

        const response = avatarFile
          ? await axios.put(url, createFormData(payload, avatarFile), config)
          : await axios.put(url, payload, config);

        parentData = response.data.parent || response.data;
      } else {
        const url = `${API_BASE_URL}/register`;
        // ✅ For new registration: never send _id (backend creates them)
        const formattedGuardians = formatGuardiansForApi(
          formData.additionalGuardians || [],
          false,
        );

        const payload = {
          fullName: formData.fullName.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.replace(/\D/g, ''),
          relationship: formData.relationship.trim(),
          isCoach: formData.isCoach,
          aauNumber: formData.aauNumber?.trim() || '',
          address: {
            street: formData.address.street.trim(),
            ...(formData.address.street2 && {
              street2: formData.address.street2.trim(),
            }),
            city: formData.address.city.trim(),
            state: formData.address.state.trim().toUpperCase(),
            zip: formData.address.zip.trim(),
          },
          password: formData.password?.trim() || '',
          registerType: 'adminCreate',
          agreeToTerms: true,
          additionalGuardians: formattedGuardians,
        };

        const config: AxiosRequestConfig = {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        };

        const response = await axios.post(url, payload, config);
        parentData = response.data.parent || response.data;
        parentId = parentData._id || response.data._id;

        if (!parentId) throw new Error('Invalid parent ID in response');

        if (avatarFile) {
          const fd = new FormData();
          fd.append('avatar', avatarFile);
          await axios.put(
            `${API_BASE_URL}/upload/parent/${parentId}/avatar`,
            fd,
            { headers: { Authorization: `Bearer ${token}` } },
          );
        }
      }

      const createdPlayers = [];
      if (players.length) {
        for (let i = 0; i < players.length; i++) {
          const player = players[i];
          let playerId = player._id;

          if (playerId) {
            await axios.put(
              `${API_BASE_URL}/players/${playerId}`,
              {
                fullName: player.fullName.trim(),
                gender: player.gender,
                dob: player.dob,
                schoolName: player.schoolName.trim(),
                grade: player.grade,
                healthConcerns: player.healthConcerns?.trim() || '',
                aauNumber: player.aauNumber?.trim() || '',
              },
              { headers: { Authorization: `Bearer ${token}` } },
            );
            createdPlayers.push({ ...player, _id: playerId });
          } else {
            const playerResponse = await axios.post(
              `${API_BASE_URL}/players/register`,
              {
                fullName: player.fullName.trim(),
                gender: player.gender,
                dob: player.dob,
                schoolName: player.schoolName.trim(),
                grade: player.grade,
                healthConcerns: player.healthConcerns?.trim() || '',
                aauNumber: player.aauNumber?.trim() || '',
                parentId,
                registrationYear: new Date().getFullYear(),
                season: 'N/A',
                skipSeasonRegistration: true,
              },
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              },
            );
            playerId =
              playerResponse.data.player?._id || playerResponse.data._id;
            createdPlayers.push({ ...player, _id: playerId });
          }

          const playerAvatarFile = playerAvatarFiles[i];
          if (playerAvatarFile && playerId) {
            const fd = new FormData();
            fd.append('avatar', playerAvatarFile);
            await axios.put(
              `${API_BASE_URL}/upload/player/${playerId}/avatar`,
              fd,
              { headers: { Authorization: `Bearer ${token}` } },
            );
          }
        }
      }

      // Upload guardian avatars after parent is saved (so real _ids exist)
      const formattedGuardiansForAvatars = formatGuardiansForApi(
        formData.additionalGuardians || [],
        true,
      );
      if (Object.keys(guardianAvatarFiles).length > 0) {
        for (let i = 0; i < formattedGuardiansForAvatars.length; i++) {
          const guardianAvatarFile = guardianAvatarFiles[i];
          let savedGuardian = parentData.additionalGuardians?.[i];

          if (!savedGuardian && parentId) {
            const updatedParent = await fetchParentData(parentId);
            savedGuardian = updatedParent?.additionalGuardians?.[i];
          }

          if (guardianAvatarFile && savedGuardian?._id) {
            try {
              Swal.fire({
                title: 'Uploading...',
                text: `Uploading avatar for ${savedGuardian.fullName || 'guardian'}`,
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading(),
              });
              const fd = new FormData();
              fd.append('avatar', guardianAvatarFile);
              await axios.put(
                `${API_BASE_URL}/upload/guardian/${parentId}/${savedGuardian._id}/avatar`,
                fd,
                { headers: { Authorization: `Bearer ${token}` } },
              );
              Swal.close();
              swalToast(
                'success',
                `Avatar uploaded for ${savedGuardian.fullName || 'guardian'}`,
              );
            } catch (err) {
              console.error(`Failed to upload avatar for guardian ${i}:`, err);
              swalToast(
                'error',
                'Upload Failed',
                `Failed to upload avatar for ${savedGuardian?.fullName || 'guardian'}`,
              );
            }
          }
        }
      }

      const updatedParent = await fetchParentData(parentId);

      navigate(`${all_routes.parentDetail}/${parentId}`, {
        state: {
          parent: updatedParent,
          guardians: updatedParent?.additionalGuardians || [],
          players: createdPlayers.length ? createdPlayers : players,
          ...(!isEdit && {
            newAccount: true,
            ...(parentData.temporaryPassword && {
              temporaryPassword: parentData.temporaryPassword,
            }),
          }),
        },
        replace: true,
      });
    } catch (error) {
      console.error('Submission error:', error);
      let errorMessage = 'Submission failed. Please try again.';
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401)
          errorMessage = 'Session expired. Please log in again.';
        else if (error.response?.status === 400)
          errorMessage =
            error.response.data?.error ||
            error.response.data?.message ||
            'Invalid data submitted';
        else if (error.response?.status === 500)
          errorMessage = 'Server error. Please try again later.';
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      await swalError('Submission Failed', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const createFormData = (data: object, file: File): FormData => {
    const fd = new FormData();
    fd.append('avatar', file);
    fd.append('data', JSON.stringify(data));
    return fd;
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className='page-wrapper'>
        <div className='content content-two'>
          <div
            className='d-flex justify-content-center align-items-center'
            style={{ height: '80vh' }}
          >
            <div className='spinner-border text-primary' role='status'>
              <span className='visually-hidden'>Loading...</span>
            </div>
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
            <h3 className='mb-1'>{isEdit ? 'Edit' : 'Add'} Parent/Guardian</h3>
            <nav>
              <ol className='breadcrumb mb-0'>
                <li className='breadcrumb-item'>
                  <a href={all_routes.adminDashboard}>Dashboard</a>
                </li>
                <li className='breadcrumb-item'>
                  <a href={all_routes.parentList}>Parents</a>
                </li>
                <li className='breadcrumb-item active' aria-current='page'>
                  {isEdit ? 'Edit' : 'Add'} Parent/Guardian
                </li>
              </ol>
            </nav>
          </div>
        </div>
        <div className='row'>
          <div className='col-md-12'>
            <form onSubmit={handleSubmit}>
              <ParentForm
                formData={formData}
                errors={errors}
                avatarPreview={avatarPreview}
                fileInputRef={fileInputRef}
                handleInputChange={handleInputChange}
                handleAddressChange={handleAddressChange}
                handleAvatarChange={handleAvatarChange}
                removeAvatar={removeAvatar}
                handleAauNumberChange={(e) => handleAauNumberChange(e)}
                isEdit={isEdit}
                isUploading={isUploading}
              />

              {/* Additional Guardians Section */}
              <div className='card mt-4'>
                <div className='card-header bg-light'>
                  <div className='d-flex align-items-center justify-content-between'>
                    <div className='d-flex align-items-center'>
                      <span className='bg-white avatar avatar-sm me-2 text-gray-7 flex-shrink-0'>
                        <i className='ti ti-users fs-16' />
                      </span>
                      <h4 className='text-dark'>
                        Additional Parents / Guardians
                      </h4>
                    </div>
                  </div>
                </div>
                <div className='card-body'>
                  {(!formData.additionalGuardians ||
                    formData.additionalGuardians.length === 0) &&
                    !showGuardianForm && (
                      <>
                        <div className='mb-3'>
                          No guardians currently listed. Please add at least one
                          parent/guardian.
                        </div>
                        <button
                          type='button'
                          className='btn btn-primary btn-sm'
                          onClick={() => setShowGuardianForm(true)}
                        >
                          <i className='ti ti-plus me-1' /> Add Parent /
                          Guardian
                        </button>
                      </>
                    )}

                  {formData.additionalGuardians?.map((guardian, index) => (
                    <GuardianForm
                      key={guardian.id || index}
                      guardian={guardian}
                      index={index}
                      handleGuardianInputChange={handleGuardianInputChange}
                      handleGuardianAddressChange={handleGuardianAddressChange}
                      removeGuardian={removeGuardian}
                      handleAauNumberChange={handleAauNumberChange}
                      avatarPreview={guardianAvatarPreviews[index] || null}
                      avatarUploading={guardianAvatarUploading[index] || false}
                      onAvatarChange={(file: File) =>
                        handleGuardianAvatarChange(file, index)
                      }
                      onAvatarRemove={() => handleGuardianAvatarRemove(index)}
                    />
                  ))}

                  {formData.additionalGuardians &&
                    formData.additionalGuardians.length > 0 &&
                    !showGuardianForm && (
                      <div className='mt-3'>
                        <button
                          type='button'
                          className='btn btn-outline-primary btn-sm'
                          onClick={() => setShowGuardianForm(true)}
                        >
                          <i className='ti ti-plus me-1' /> Add Another
                          Parent/Guardian
                        </button>
                      </div>
                    )}

                  {showGuardianForm && (
                    <NewGuardianForm
                      newGuardian={newGuardian}
                      guardianErrors={guardianErrors}
                      setNewGuardian={setNewGuardian}
                      setGuardianErrors={setGuardianErrors}
                      setShowGuardianForm={setShowGuardianForm}
                      addGuardian={addGuardian}
                      avatarPreview={newGuardianAvatarPreview}
                      onAvatarChange={handleNewGuardianAvatarChange}
                      onAvatarRemove={handleNewGuardianAvatarRemove}
                    />
                  )}
                </div>
              </div>

              {/* Players Section */}
              <div className='card mt-4'>
                <div className='card-header bg-light'>
                  <div className='d-flex align-items-center justify-content-between'>
                    <div className='d-flex align-items-center'>
                      <span className='bg-white avatar avatar-sm me-2 text-gray-7 flex-shrink-0'>
                        <i className='ti ti-shirt-sport fs-16' />
                      </span>
                      <h4 className='text-dark'>Players</h4>
                    </div>
                  </div>
                </div>
                <div className='card-body'>
                  {players.length > 0 &&
                    players.map((player, index) => (
                      <PlayerForm
                        key={player.id || player._id || index}
                        player={player}
                        index={index}
                        handlePlayerInputChange={handlePlayerInputChange}
                        handlePlayerSchoolChange={handlePlayerSchoolChange}
                        removePlayer={removePlayer}
                        avatarPreview={playerAvatarPreviews[index] || null}
                        avatarUploading={playerAvatarUploading[index] || false}
                        onAvatarChange={handlePlayerAvatarChange}
                        onAvatarRemove={handlePlayerAvatarRemove}
                        errors={playerErrors}
                      />
                    ))}

                  {!showPlayerForm && (
                    <button
                      type='button'
                      className='btn btn-primary btn-sm'
                      onClick={() => setShowPlayerForm(true)}
                    >
                      <i className='ti ti-plus me-2' /> Add Player
                    </button>
                  )}

                  {showPlayerForm && (
                    <NewPlayerForm
                      newPlayer={newPlayer}
                      playerErrors={playerErrors}
                      setNewPlayer={setNewPlayer}
                      setPlayerErrors={setPlayerErrors}
                      setShowPlayerForm={setShowPlayerForm}
                      addPlayer={addPlayer}
                      avatarPreview={newPlayerAvatarPreview}
                      onAvatarChange={handleNewPlayerAvatarChange}
                      onAvatarRemove={handleNewPlayerAvatarRemove}
                    />
                  )}
                </div>
              </div>

              <div className='text-end mt-4'>
                <button
                  type='button'
                  className='btn btn-light me-2'
                  onClick={() => window.history.back()}
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
                    'Update'
                  ) : (
                    'Add'
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

export default AddParent;
