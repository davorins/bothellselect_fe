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
import {
  Address,
  ensureAddress,
  parseAddress,
} from '../../../../utils/address';
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
import { useDynamicFormFields } from '../../../hooks/useDynamicFormFields';
import { VisibleField } from '../../../../types/form-config.types';
import NameInput, { validateFullName } from '../../../../components/NameInput';

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
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [pendingGuardianAvatarFiles, setPendingGuardianAvatarFiles] = useState<
    Record<number, File>
  >({});
  const [pendingPlayerAvatarFiles, setPendingPlayerAvatarFiles] = useState<
    Record<number, File>
  >({});

  // ── Dynamic form fields hooks ──────────────────────────────────────────────
  const { getVisibleFields: getParentVisibleFields } = useDynamicFormFields(
    'parent',
    {
      registrationYear: new Date().getFullYear(),
    },
  );

  const { getVisibleFields: getGuardianVisibleFields } = useDynamicFormFields(
    'guardian',
    {
      registrationYear: new Date().getFullYear(),
    },
  );

  const { getVisibleFields: getPlayerVisibleFields } = useDynamicFormFields(
    'player',
    {
      registrationYear: new Date().getFullYear(),
    },
  );

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

    // Preview the image immediately
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);

    if (isEdit && formData._id) {
      // For existing parents, upload immediately
      setAvatarFile(file);
      setIsUploading(true);
      try {
        const token = localStorage.getItem('token');
        Swal.fire({
          title: 'Uploading...',
          text: 'Please wait while we upload your avatar',
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading(),
        });

        const fd = new FormData();
        fd.append('avatar', file);
        const response = await axios.put(
          `${API_BASE_URL}/upload/parent/${formData._id}/avatar`,
          fd,
          { headers: { Authorization: `Bearer ${token}` } },
        );

        const newAvatarUrl =
          response.data.avatarUrl || response.data.parent?.avatar;
        setFormData((prev) => ({ ...prev, avatar: newAvatarUrl }));

        Swal.close();
        swalToast('success', 'Avatar uploaded successfully!');
      } catch (err) {
        console.error('Avatar upload failed:', err);
        swalToast(
          'error',
          'Upload Failed',
          'Failed to upload avatar. Please try again.',
        );
        setAvatarPreview(
          formData.avatar
            ? getAvatarUrl(formData.avatar, getDefaultAvatar('parent'))
            : null,
        );
      } finally {
        setIsUploading(false);
        setAvatarFile(null);
      }
    } else {
      // For new parents, store the file for later upload
      setPendingAvatarFile(file);
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
        setPendingAvatarFile(null);

        Swal.close();
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
      // For new parents, just clear the preview and pending file
      setAvatarPreview(null);
      setPendingAvatarFile(null);
      swalToast('info', 'Preview Cleared', 'Avatar preview has been cleared');
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Guardian avatar handlers ──────────────────────────────────────────────

  const handleGuardianAvatarChange = async (file: File, index: number) => {
    // Show preview immediately
    const reader = new FileReader();
    reader.onloadend = () =>
      setGuardianAvatarPreviews((prev) => ({
        ...prev,
        [index]: reader.result as string,
      }));
    reader.readAsDataURL(file);

    const guardian = formData.additionalGuardians?.[index];
    const hasRealId =
      guardian?._id &&
      !guardian._id.toString().startsWith('temp_') &&
      guardian._id.toString().length === 24;

    if (isEdit && formData._id && hasRealId) {
      // For existing guardians with real IDs, upload immediately
      setGuardianAvatarUploading((prev) => ({ ...prev, [index]: true }));
      setGuardianAvatarFiles((prev) => ({ ...prev, [index]: file }));

      try {
        const token = localStorage.getItem('token');
        const fd = new FormData();
        fd.append('avatar', file);

        Swal.fire({
          title: 'Uploading...',
          text: 'Please wait while we upload the guardian avatar',
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

        Swal.close();
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
      } finally {
        setGuardianAvatarUploading((prev) => ({ ...prev, [index]: false }));
      }
    } else {
      // For new guardians, store for later upload
      setPendingGuardianAvatarFiles((prev) => ({ ...prev, [index]: file }));
      swalToast(
        'info',
        'Avatar Saved',
        'The avatar will be uploaded after you save the guardian.',
      );
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

  // ── Player avatar handlers ────────────────────────────────────────────────

  const handlePlayerAvatarChange = async (file: File, index: number) => {
    // Show preview immediately
    const reader = new FileReader();
    reader.onloadend = () =>
      setPlayerAvatarPreviews((prev) => ({
        ...prev,
        [index]: reader.result as string,
      }));
    reader.readAsDataURL(file);

    const player = players[index];
    const hasRealId =
      player?._id &&
      !player._id.toString().startsWith('temp_') &&
      player._id.toString().length === 24;

    if (isEdit && hasRealId) {
      // For existing players with real IDs, upload immediately
      setPlayerAvatarUploading((prev) => ({ ...prev, [index]: true }));
      setPlayerAvatarFiles((prev) => ({ ...prev, [index]: file }));

      try {
        const token = localStorage.getItem('token');
        const fd = new FormData();
        fd.append('avatar', file);

        Swal.fire({
          title: 'Uploading...',
          text: 'Please wait while we upload the player avatar',
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading(),
        });

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

        Swal.close();
        swalToast('success', 'Player avatar uploaded successfully!');
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
      } finally {
        setPlayerAvatarUploading((prev) => ({ ...prev, [index]: false }));
      }
    } else {
      // For new players, store for later upload
      setPendingPlayerAvatarFiles((prev) => ({ ...prev, [index]: file }));
      swalToast(
        'info',
        'Avatar Saved',
        'The avatar will be uploaded after you save the player.',
      );
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

  const validatePlayer = (player: PlayerFormDataType): ValidationErrors => {
    const errs: ValidationErrors = {};

    const registrationPlayer = {
      _id: player._id || '',
      fullName: player.fullName,
      gender: player.gender,
      dob: player.dob,
      schoolName: player.schoolName,
      healthConcerns: player.healthConcerns,
      aauNumber: player.aauNumber,
      registrationYear: new Date().getFullYear(),
      season: 'N/A',
      grade: player.grade,
      isGradeOverridden: player.isGradeOverridden || false,
    };

    const visibleFields = getPlayerVisibleFields(registrationPlayer);

    // fullName is always required regardless of config
    const nameError = validateFullName(player.fullName, true);
    if (nameError) errs.fullName = nameError;

    // Only validate fields that are visible/enabled in the config
    visibleFields
      .filter((f) => f.fieldName !== 'fullName' && f.fieldName !== 'age')
      .forEach((field) => {
        if (!field.isRequired) return;

        if (field.fieldName === 'gender') {
          if (!validateRequired(player.gender))
            errs.gender = 'Gender is required';
        } else if (field.fieldName === 'dob') {
          if (!validateDateOfBirth(player.dob))
            errs.dob = 'Please enter a valid date of birth';
        } else if (field.fieldName === 'schoolName') {
          if (!player.schoolName?.trim())
            errs.schoolName = 'School name is required';
        } else if (field.fieldName === 'grade') {
          if (!validateGrade(player.grade))
            errs.grade = 'Please select a valid grade';
        }
      });

    return errs;
  };

  const addPlayer = () => {
    const newIndex = players.length;
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

    // Create properly formatted player object
    const playerToAdd = {
      ...newPlayer,
      id: tempId,
      _id: tempId,
      fullName: newPlayer.fullName.trim(),
      gender: newPlayer.gender,
      dob: newPlayer.dob,
      schoolName: newPlayer.schoolName.trim(),
      grade: newPlayer.grade,
      healthConcerns: newPlayer.healthConcerns?.trim() || '',
      aauNumber: newPlayer.aauNumber?.trim() || '',
      isGradeOverridden: newPlayer.isGradeOverridden || false,
    };

    setPlayers((prev) => [...prev, playerToAdd]);

    // Transfer pending avatar if exists
    if (newPlayerAvatarFile) {
      setPendingPlayerAvatarFiles((prev) => ({
        ...prev,
        [newIndex]: newPlayerAvatarFile,
      }));
      if (newPlayerAvatarPreview) {
        setPlayerAvatarPreviews((prev) => ({
          ...prev,
          [newIndex]: newPlayerAvatarPreview,
        }));
      }
    }

    // Reset new player form
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

    swalToast('success', 'Player added successfully!');
  };

  const removePlayer = async (index: number) => {
    const player = players[index];
    const hasRealId =
      player?._id &&
      !player._id.toString().startsWith('temp_') &&
      player._id.toString().length === 24;

    if (isEdit && hasRealId) {
      const result = await Swal.fire({
        title: 'Remove Player?',
        text: `Are you sure you want to remove ${player.fullName || 'this player'}?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Yes, remove',
      });
      if (!result.isConfirmed) return;

      try {
        const token = localStorage.getItem('token');
        await axios.delete(`${API_BASE_URL}/players/${player._id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        swalToast('success', 'Player removed successfully!');
      } catch (err) {
        console.error('Player delete failed:', err);
        swalToast(
          'error',
          'Failed',
          'Failed to remove player. Please try again.',
        );
        return;
      }
    }

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

  // ── Parent validation with dynamic fields ─────────────────────────────────
  const validateParentForm = (): ValidationErrors => {
    const newErrors: ValidationErrors = {};

    // Map form data to the format expected by dynamic fields
    const mappedData = {
      parentFullName: formData.fullName,
      email: formData.email,
      phone: formData.phone,
      address: formData.address,
      city: formData.address.city,
      state: formData.address.state,
      zip: formData.address.zip,
      relationship: formData.relationship,
      isCoach: formData.isCoach,
      aauNumber: formData.aauNumber,
    };

    const visibleFields = getParentVisibleFields(mappedData as any);

    visibleFields.forEach((field) => {
      if (
        field.fieldName === 'address' ||
        field.fieldName === 'city' ||
        field.fieldName === 'state' ||
        field.fieldName === 'zip'
      ) {
        // Handle address fields
        if (field.fieldName === 'address' && field.isRequired) {
          if (!formData.address.street?.trim()) {
            newErrors['address.street'] = 'Street address is required';
          }
        }
        if (
          field.fieldName === 'city' &&
          field.isRequired &&
          !formData.address.city?.trim()
        ) {
          newErrors['address.city'] = 'City is required';
        }
        if (field.fieldName === 'state' && field.isRequired) {
          if (!formData.address.state?.trim()) {
            newErrors['address.state'] = 'State is required';
          } else if (!validateState(formData.address.state)) {
            newErrors['address.state'] =
              'Please enter a valid 2-letter state code';
          }
        }
        if (field.fieldName === 'zip' && field.isRequired) {
          if (!formData.address.zip?.trim()) {
            newErrors['address.zip'] = 'ZIP code is required';
          } else if (!validateZipCode(formData.address.zip)) {
            newErrors['address.zip'] = 'Please enter a valid ZIP code';
          }
        }
      } else if (field.fieldName === 'parentFullName') {
        // Handle full name
        if (field.isRequired) {
          const nameError = validateFullName(formData.fullName, true);
          if (nameError) newErrors.fullName = nameError;
        }
      } else if (field.fieldName === 'email') {
        // Handle email
        if (field.isRequired && !validateEmail(formData.email)) {
          newErrors.email = 'Please enter a valid email address';
        }
      } else if (field.fieldName === 'phone') {
        // Handle phone
        if (field.isRequired && !validatePhoneNumber(formData.phone)) {
          newErrors.phone = 'Please enter a valid 10-digit phone number';
        }
      } else if (field.fieldName === 'relationship') {
        // Handle relationship
        if (field.isRequired && !validateRequired(formData.relationship)) {
          newErrors.relationship = 'Relationship to player is required';
        }
      } else if (field.fieldName === 'aauNumber' && formData.isCoach) {
        // Handle AAU number for coaches
        if (!formData.aauNumber?.trim()) {
          newErrors.aauNumber = 'AAU number is required for coaches';
        }
      }
    });

    // Password validation for new parents
    if (!isEdit && (!formData.password || formData.password.length < 6)) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return newErrors;
  };

  // ── Guardian validation with dynamic fields ──────────────────────────────
  const validateGuardian = (
    guardian: GuardianFormData,
    index: number,
  ): ValidationErrors => {
    const errs: ValidationErrors = {};

    const mappedData = {
      guardianFullName: guardian.fullName,
      email: guardian.email,
      phone: guardian.phone,
      address: guardian.address,
      city: guardian.address.city,
      state: guardian.address.state,
      zip: guardian.address.zip,
      relationship: guardian.relationship,
      isCoach: guardian.isCoach,
      aauNumber: guardian.aauNumber,
    };

    const visibleFields = getGuardianVisibleFields(mappedData as any);

    visibleFields.forEach((field) => {
      if (
        field.fieldName === 'address' ||
        field.fieldName === 'city' ||
        field.fieldName === 'state' ||
        field.fieldName === 'zip'
      ) {
        // Handle address fields
        if (field.fieldName === 'address' && field.isRequired) {
          if (!guardian.address.street?.trim()) {
            errs['address.street'] = 'Street address is required';
          }
        }
        if (
          field.fieldName === 'city' &&
          field.isRequired &&
          !guardian.address.city?.trim()
        ) {
          errs['address.city'] = 'City is required';
        }
        if (field.fieldName === 'state' && field.isRequired) {
          if (!guardian.address.state?.trim()) {
            errs['address.state'] = 'State is required';
          } else if (!validateState(guardian.address.state)) {
            errs['address.state'] = 'Please enter a valid 2-letter state code';
          }
        }
        if (field.fieldName === 'zip' && field.isRequired) {
          if (!guardian.address.zip?.trim()) {
            errs['address.zip'] = 'ZIP code is required';
          } else if (!validateZipCode(guardian.address.zip)) {
            errs['address.zip'] = 'Please enter a valid ZIP code';
          }
        }
      } else if (field.fieldName === 'guardianFullName') {
        // Handle full name
        if (field.isRequired) {
          const nameError = validateFullName(guardian.fullName, true);
          if (nameError) errs.fullName = nameError;
        }
      } else if (field.fieldName === 'email') {
        // Handle email
        if (field.isRequired && !validateEmail(guardian.email)) {
          errs.email = 'Please enter a valid email address';
        }
      } else if (field.fieldName === 'phone') {
        // Handle phone
        if (field.isRequired && !validatePhoneNumber(guardian.phone)) {
          errs.phone = 'Please enter a valid 10-digit phone number';
        }
      } else if (field.fieldName === 'relationship') {
        // Handle relationship
        if (field.isRequired && !validateRequired(guardian.relationship)) {
          errs.relationship = 'Relationship is required';
        }
      } else if (field.fieldName === 'aauNumber' && guardian.isCoach) {
        // Handle AAU number for coaches
        if (!guardian.aauNumber?.trim()) {
          errs.aauNumber = 'AAU number is required for coaches';
        }
      }
    });

    if (!errs.fullName) {
      const nameError = validateFullName(guardian.fullName, true);
      if (nameError) errs.fullName = nameError;
    }

    return errs;
  };

  const addGuardian = (avatarFile?: File) => {
    // Validate the new guardian form
    const errs = validateGuardian(
      newGuardian,
      (formData.additionalGuardians || []).length,
    );

    if (Object.keys(errs).length > 0) {
      setGuardianErrors(errs);

      // Scroll to the first error
      const firstErrorKey = Object.keys(errs)[0];
      const fieldName = firstErrorKey.replace('address.', '');
      const fieldEl = document.querySelector(
        `[name="${fieldName}"], [name="address.${fieldName}"]`,
      );
      if (fieldEl) {
        fieldEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        (fieldEl as HTMLElement).classList.add('error-highlight');
        setTimeout(
          () => (fieldEl as HTMLElement).classList.remove('error-highlight'),
          3000,
        );
      }
      return;
    }

    const newIndex = (formData.additionalGuardians || []).length;
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

    // Create properly formatted guardian object
    const guardianToAdd = {
      ...newGuardian,
      id: tempId,
      _id: tempId,
      fullName: newGuardian.fullName.trim(),
      email: newGuardian.email.trim().toLowerCase(),
      phone: newGuardian.phone.replace(/\D/g, ''),
      relationship: newGuardian.relationship.trim(),
      aauNumber: newGuardian.aauNumber?.trim() || '',
      isCoach: newGuardian.isCoach || false,
      address: {
        street: newGuardian.address.street?.trim() || '',
        street2: newGuardian.address.street2?.trim() || '',
        city: newGuardian.address.city?.trim() || '',
        state: newGuardian.address.state?.trim()?.toUpperCase() || '',
        zip: newGuardian.address.zip?.trim() || '',
      },
    };

    setFormData((prev) => ({
      ...prev,
      additionalGuardians: [...(prev.additionalGuardians || []), guardianToAdd],
    }));

    // Store avatar file for upload after save
    if (avatarFile) {
      setPendingGuardianAvatarFiles((prev) => ({
        ...prev,
        [newIndex]: avatarFile,
      }));
    }

    // Reset new guardian form
    setNewGuardian({
      fullName: '',
      email: '',
      phone: '',
      address: { street: '', street2: '', city: '', state: '', zip: '' },
      relationship: '',
      aauNumber: '',
      isCoach: false,
    });
    setShowGuardianForm(false);
    setGuardianErrors({});

    swalToast('success', 'Guardian added successfully!');
  };

  const removeGuardian = async (index: number) => {
    const guardian = formData.additionalGuardians?.[index];
    const hasRealId =
      guardian?._id &&
      !guardian._id.toString().startsWith('temp_') &&
      guardian._id.toString().length === 24;

    if (isEdit && formData._id && hasRealId) {
      const result = await Swal.fire({
        title: 'Remove Guardian?',
        text: `Are you sure you want to remove ${guardian.fullName || 'this guardian'}?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Yes, remove',
      });
      if (!result.isConfirmed) return;

      try {
        const token = localStorage.getItem('token');
        await axios.delete(
          `${API_BASE_URL}/parent/${formData._id}/guardian/${guardian._id}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        swalToast('success', 'Guardian removed successfully!');
      } catch (err) {
        console.error('Guardian delete failed:', err);
        swalToast(
          'error',
          'Failed',
          'Failed to remove guardian. Please try again.',
        );
        return;
      }
    }

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

  // ── Submit ────────────────────────────────────────────────────────────────

  const buildAddress = (addr: typeof formData.address) => {
    const a: Record<string, string> = {};
    if (addr.street?.trim()) a.street = addr.street.trim();
    if (addr.street2?.trim()) a.street2 = addr.street2.trim();
    if (addr.city?.trim()) a.city = addr.city.trim();
    if (addr.state?.trim()) a.state = addr.state.trim().toUpperCase();
    if (addr.zip?.trim()) a.zip = addr.zip.trim();
    return a;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    // Clear all previous errors
    setErrors({});
    setGuardianErrors({});
    setPlayerErrors({});

    // Track all errors
    let hasErrors = false;
    const allErrors: {
      parent: ValidationErrors;
      guardians: Record<number, ValidationErrors>;
      players: Record<number, ValidationErrors>;
      newGuardian?: ValidationErrors;
      newPlayer?: ValidationErrors;
    } = {
      parent: {},
      guardians: {},
      players: {},
    };

    // 1. Validate Parent Form
    const parentErrors = validateParentForm();
    if (Object.keys(parentErrors).length > 0) {
      hasErrors = true;
      allErrors.parent = parentErrors;
      setErrors(parentErrors);
    }

    // 2. Validate NEW Guardian form if expanded
    if (showGuardianForm) {
      const newGuardianErrs = validateGuardian(
        newGuardian,
        formData.additionalGuardians?.length || 0,
      );
      if (Object.keys(newGuardianErrs).length > 0) {
        hasErrors = true;
        allErrors.newGuardian = newGuardianErrs;
        setGuardianErrors(newGuardianErrs);
      } else {
        // Auto-add the guardian into the list before submitting
        const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
        const guardianToAdd = {
          ...newGuardian,
          id: tempId,
          _id: tempId,
        };
        const newGuardianIndex = (formData.additionalGuardians || []).length;
        formData.additionalGuardians = [
          ...(formData.additionalGuardians || []),
          guardianToAdd,
        ];
        setFormData((prev) => ({
          ...prev,
          additionalGuardians: [
            ...(prev.additionalGuardians || []),
            guardianToAdd,
          ],
        }));
        if (newGuardianAvatarFile) {
          setPendingGuardianAvatarFiles((prev) => ({
            ...prev,
            [newGuardianIndex]: newGuardianAvatarFile,
          }));
          pendingGuardianAvatarFiles[newGuardianIndex] = newGuardianAvatarFile;
        }
      }
    }

    // 3. Validate ALL Existing Guardians
    if (formData.additionalGuardians?.length) {
      formData.additionalGuardians.forEach((guardian, index) => {
        const guardianErrs = validateGuardian(guardian, index);
        if (Object.keys(guardianErrs).length > 0) {
          hasErrors = true;
          allErrors.guardians[index] = guardianErrs;
        }
      });

      if (Object.keys(allErrors.guardians).length > 0) {
        const flatGuardianErrors: ValidationErrors = {};
        Object.values(allErrors.guardians).forEach((errs) => {
          Object.assign(flatGuardianErrors, errs);
        });
        setGuardianErrors((prev) => ({ ...prev, ...flatGuardianErrors }));
      }
    }

    // 4. Validate NEW Player form if expanded
    if (showPlayerForm) {
      const newPlayerErrs = validatePlayer(newPlayer);
      if (Object.keys(newPlayerErrs).length > 0) {
        hasErrors = true;
        allErrors.newPlayer = newPlayerErrs;
        setPlayerErrors(newPlayerErrs);
      } else {
        // Auto-add the player into the list before submitting
        const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
        const playerToAdd = { ...newPlayer, id: tempId, _id: tempId };
        const newPlayerIndex = players.length;
        players.push(playerToAdd);
        setPlayers((prev) => [...prev, playerToAdd]);
        if (newPlayerAvatarFile) {
          setPendingPlayerAvatarFiles((prev) => ({
            ...prev,
            [newPlayerIndex]: newPlayerAvatarFile,
          }));
          pendingPlayerAvatarFiles[newPlayerIndex] = newPlayerAvatarFile;
        }
      }
    }

    // 5. Validate ALL Existing Players
    if (players.length) {
      players.forEach((player, index) => {
        const playerErrs = validatePlayer(player);
        if (Object.keys(playerErrs).length > 0) {
          hasErrors = true;
          allErrors.players[index] = playerErrs;
        }
      });

      if (Object.keys(allErrors.players).length > 0) {
        const flatPlayerErrors: ValidationErrors = {};
        Object.values(allErrors.players).forEach((errs) => {
          Object.assign(flatPlayerErrors, errs);
        });
        setPlayerErrors((prev) => ({ ...prev, ...flatPlayerErrors }));
      }
    }

    // 6. If errors exist, show them and return
    if (hasErrors) {
      setIsSubmitting(false);

      // Scroll to first error
      if (Object.keys(allErrors.parent).length > 0) {
        document
          .getElementById('primary-parent-card')
          ?.scrollIntoView({ behavior: 'smooth' });
      } else if (allErrors.newGuardian) {
        document
          .querySelector('.new-guardian-form')
          ?.scrollIntoView({ behavior: 'smooth' });
      } else if (Object.keys(allErrors.guardians).length > 0) {
        const firstIndex = Math.min(
          ...Object.keys(allErrors.guardians).map(Number),
        );
        document
          .getElementById(`guardian-${firstIndex}`)
          ?.scrollIntoView({ behavior: 'smooth' });
      } else if (allErrors.newPlayer) {
        document
          .querySelector('.new-player-form')
          ?.scrollIntoView({ behavior: 'smooth' });
      } else if (Object.keys(allErrors.players).length > 0) {
        const firstIndex = Math.min(
          ...Object.keys(allErrors.players).map(Number),
        );
        document
          .getElementById(`player-${firstIndex}`)
          ?.scrollIntoView({ behavior: 'smooth' });
      }

      const totalErrors =
        Object.keys(allErrors.parent).length +
        (allErrors.newGuardian
          ? Object.keys(allErrors.newGuardian).length
          : 0) +
        Object.values(allErrors.guardians).reduce(
          (sum, errs) => sum + Object.keys(errs).length,
          0,
        ) +
        (allErrors.newPlayer ? Object.keys(allErrors.newPlayer).length : 0) +
        Object.values(allErrors.players).reduce(
          (sum, errs) => sum + Object.keys(errs).length,
          0,
        );

      await swalError(
        'Validation Errors',
        `Please fix ${totalErrors} error(s) across all forms.`,
      );
      return;
    }

    // 7. Proceed with submission
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Authentication token missing');

      let parentId = formData._id;
      let parentData;

      // Format guardians for API - strip temp IDs
      const formatGuardiansForApi = (guardians: any[]) => {
        return guardians.map((g) => {
          const hasRealId =
            g._id &&
            !g._id.toString().startsWith('temp_') &&
            g._id.toString().length === 24;

          return {
            ...(hasRealId && { _id: g._id }),
            fullName: g.fullName?.trim() || '',
            email: g.email?.trim().toLowerCase() || '',
            phone: g.phone?.replace(/\D/g, '') || '',
            relationship: g.relationship?.trim() || '',
            aauNumber: g.aauNumber?.trim() || '',
            isCoach: g.isCoach || false,
            address: {
              ...(g.address?.street?.trim() && {
                street: g.address.street.trim(),
              }),
              ...(g.address?.street2?.trim() && {
                street2: g.address.street2.trim(),
              }),
              ...(g.address?.city?.trim() && { city: g.address.city.trim() }),
              ...(g.address?.state?.trim() && {
                state: g.address.state.trim().toUpperCase(),
              }),
              ...(g.address?.zip?.trim() && { zip: g.address.zip.trim() }),
            },
            ...(g.avatar && { avatar: g.avatar }),
          };
        });
      };

      if (isEdit) {
        // UPDATE EXISTING PARENT
        const url = `${API_BASE_URL}/parent-full/${formData._id}`;
        const formattedGuardians = formatGuardiansForApi(
          formData.additionalGuardians || [],
        );

        const payload = {
          fullName: formData.fullName.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.replace(/\D/g, ''),
          relationship: formData.relationship.trim(),
          isCoach: formData.isCoach,
          aauNumber: formData.aauNumber?.trim() || '',
          address: {
            street: formData.address.street?.trim() || '',
            street2: formData.address.street2?.trim() || '',
            city: formData.address.city?.trim() || '',
            state: formData.address.state?.trim()?.toUpperCase() || '',
            zip: formData.address.zip?.trim() || '',
          },
          additionalGuardians: formattedGuardians,
          ...(formData.avatar && { avatarUrl: formData.avatar }),
        };

        console.log(
          '📤 Submitting UPDATE payload:',
          JSON.stringify(payload, null, 2),
        );

        const response = await axios.put(url, payload, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        parentData = response.data.parent || response.data;
        console.log('✅ Update response:', parentData);
      } else {
        // CREATE NEW PARENT
        const url = `${API_BASE_URL}/register`;

        // IMPORTANT: Format guardians before sending
        const formattedGuardians = formatGuardiansForApi(
          formData.additionalGuardians || [],
        );

        const payload = {
          fullName: formData.fullName.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.replace(/\D/g, ''),
          relationship: formData.relationship.trim(),
          isCoach: formData.isCoach,
          aauNumber: formData.aauNumber?.trim() || '',
          address: {
            street: formData.address.street?.trim() || '',
            street2: formData.address.street2?.trim() || '',
            city: formData.address.city?.trim() || '',
            state: formData.address.state?.trim()?.toUpperCase() || '',
            zip: formData.address.zip?.trim() || '',
          },
          password: formData.password?.trim() || '',
          registerType: 'adminCreate',
          agreeToTerms: true,
          additionalGuardians: formattedGuardians,
        };

        console.log(
          '📤 Submitting CREATE payload:',
          JSON.stringify(payload, null, 2),
        );

        const response = await axios.post(url, payload, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        parentData = response.data.parent || response.data;
        parentId = parentData._id || response.data._id;
        console.log('✅ Create response:', parentData);

        // Upload parent avatar if pending
        if (pendingAvatarFile) {
          try {
            const fd = new FormData();
            fd.append('avatar', pendingAvatarFile);
            await axios.put(
              `${API_BASE_URL}/upload/parent/${parentId}/avatar`,
              fd,
              { headers: { Authorization: `Bearer ${token}` } },
            );
          } catch (error) {
            console.error('Avatar upload failed:', error);
          }
        }
      }

      // 8. Handle Players
      const createdPlayers = [];
      if (players.length > 0) {
        for (let i = 0; i < players.length; i++) {
          const player = players[i];
          let playerId = player._id;

          if (playerId && !playerId.toString().startsWith('temp_')) {
            // Update existing player
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
            // Create new player
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

          // Upload player avatar if pending
          const pendingPlayerFile = pendingPlayerAvatarFiles[i];
          if (pendingPlayerFile && playerId) {
            try {
              const fd = new FormData();
              fd.append('avatar', pendingPlayerFile);
              await axios.put(
                `${API_BASE_URL}/upload/player/${playerId}/avatar`,
                fd,
                { headers: { Authorization: `Bearer ${token}` } },
              );
            } catch (avatarError) {
              console.error(
                `Failed to upload avatar for player ${i}:`,
                avatarError,
              );
            }
          }
        }
      }

      // 9. Upload guardian avatars
      if (Object.keys(pendingGuardianAvatarFiles).length > 0) {
        const updatedParent = await fetchParentData(parentId);
        const savedGuardians = updatedParent?.additionalGuardians || [];

        console.log('🖼️ Guardian avatar upload — parentId:', parentId);
        console.log(
          '🖼️ Pending keys:',
          Object.keys(pendingGuardianAvatarFiles),
        );
        console.log(
          '🖼️ Saved guardians:',
          savedGuardians.map((g: any, i: number) => ({
            i,
            id: g._id,
            name: g.fullName,
          })),
        );

        const pendingEntries = Object.entries(pendingGuardianAvatarFiles);
        for (const [idxStr, file] of pendingEntries) {
          const idx = parseInt(idxStr);
          const savedGuardian = savedGuardians[idx];
          if (savedGuardian?._id) {
            try {
              const fd = new FormData();
              fd.append('avatar', file);
              await axios.put(
                `${API_BASE_URL}/upload/guardian/${parentId}/${savedGuardian._id}/avatar`,
                fd,
                { headers: { Authorization: `Bearer ${token}` } },
              );
            } catch (avatarError) {
              console.error(
                `Failed to upload avatar for guardian ${idx}:`,
                avatarError,
              );
            }
          } else {
            console.warn(
              `No saved guardian found at index ${idx} for avatar upload`,
            );
          }
        }
      }

      // 10. Fetch final parent data and navigate
      const finalParent = await fetchParentData(parentId);

      navigate(`${all_routes.parentDetail}/${parentId}`, {
        state: {
          parent: finalParent,
          guardians: finalParent?.additionalGuardians || [],
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
      console.error('❌ Submission error:', error);

      let errorMessage = 'Submission failed. Please try again.';
      if (axios.isAxiosError(error) && error.response?.data?.details) {
        errorMessage = error.response.data.details;
      } else if (axios.isAxiosError(error) && error.response?.data?.error) {
        errorMessage = error.response.data.error;
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

  const allParentFields = getParentVisibleFields({
    parentFullName: formData.fullName,
    email: formData.email,
    phone: formData.phone,
    address: formData.address,
    city: formData.address.city,
    state: formData.address.state,
    zip: formData.address.zip,
    relationship: formData.relationship,
    isCoach: formData.isCoach,
    aauNumber: formData.aauNumber,
  });

  const allGuardianFields = getGuardianVisibleFields({
    guardianFullName: newGuardian.fullName,
    email: newGuardian.email,
    phone: newGuardian.phone,
    address: newGuardian.address,
    city: newGuardian.address.city,
    state: newGuardian.address.state,
    zip: newGuardian.address.zip,
    relationship: newGuardian.relationship,
    isCoach: newGuardian.isCoach,
    aauNumber: newGuardian.aauNumber,
  });

  console.log(
    '📋 allGuardianFields:',
    allGuardianFields.map((f) => ({
      fieldName: f.fieldName,
      label: f.label,
    })),
  );

  const hasAddressField = allParentFields.some(
    (f) =>
      f.fieldName === 'address' ||
      f.fieldName === 'city' ||
      f.fieldName === 'state' ||
      f.fieldName === 'zip',
  );

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
            <form onSubmit={handleSubmit} noValidate>
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
                visibleFields={allParentFields}
                hasAddressField={hasAddressField}
              />

              {/* Additional Guardians Section */}
              <div className='card mt-4' id='guardians-section'>
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
                    <div
                      id={`guardian-${index}`}
                      key={guardian._id || guardian.id || index}
                    >
                      <GuardianForm
                        guardian={guardian}
                        index={index}
                        handleGuardianInputChange={handleGuardianInputChange}
                        handleGuardianAddressChange={
                          handleGuardianAddressChange
                        }
                        removeGuardian={removeGuardian}
                        handleAauNumberChange={handleAauNumberChange}
                        avatarPreview={guardianAvatarPreviews[index] || null}
                        avatarUploading={
                          guardianAvatarUploading[index] || false
                        }
                        onAvatarChange={(file: File) =>
                          handleGuardianAvatarChange(file, index)
                        }
                        onAvatarRemove={() => handleGuardianAvatarRemove(index)}
                        visibleFields={allGuardianFields}
                        errors={guardianErrors}
                      />
                    </div>
                  ))}

                  {formData.additionalGuardians &&
                    formData.additionalGuardians.length > 0 &&
                    !showGuardianForm && (
                      <div className='mt-3'>
                        <button
                          type='button'
                          className='btn btn-outline-primary btn-sm'
                          onClick={() => setShowGuardianForm(true)}
                          disabled={showGuardianForm}
                        >
                          <i className='ti ti-plus me-1' /> Add Another
                          Parent/Guardian
                        </button>
                      </div>
                    )}

                  {showGuardianForm && (
                    <div className='new-guardian-form'>
                      <NewGuardianForm
                        newGuardian={newGuardian}
                        guardianErrors={guardianErrors}
                        setNewGuardian={setNewGuardian}
                        setGuardianErrors={setGuardianErrors}
                        setShowGuardianForm={setShowGuardianForm}
                        addGuardian={addGuardian}
                        onAvatarFileChange={(file) =>
                          setNewGuardianAvatarFile(file)
                        }
                        visibleFields={allGuardianFields}
                        mainAddress={formData.address}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Players Section */}
              <div className='card mt-4' id='players-section'>
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
                      <div
                        id={`player-${index}`}
                        key={player.id || player._id || index}
                      >
                        <PlayerForm
                          player={player}
                          index={index}
                          handlePlayerInputChange={handlePlayerInputChange}
                          handlePlayerSchoolChange={handlePlayerSchoolChange}
                          removePlayer={removePlayer}
                          avatarPreview={playerAvatarPreviews[index] || null}
                          avatarUploading={
                            playerAvatarUploading[index] || false
                          }
                          onAvatarChange={handlePlayerAvatarChange}
                          onAvatarRemove={handlePlayerAvatarRemove}
                          errors={playerErrors}
                        />
                      </div>
                    ))}

                  {players.length === 0 && !showPlayerForm && (
                    <>
                      <div className='mb-3'>
                        No players currently listed. Please add at least one
                        player.
                      </div>
                      <button
                        type='button'
                        className='btn btn-primary btn-sm'
                        onClick={() => setShowPlayerForm(true)}
                        disabled={showPlayerForm}
                      >
                        <i className='ti ti-plus me-1' /> Add Player
                      </button>
                    </>
                  )}

                  {players.length > 0 && !showPlayerForm && (
                    <div className='mt-3'>
                      <button
                        type='button'
                        className='btn btn-outline-primary btn-sm'
                        onClick={() => setShowPlayerForm(true)}
                      >
                        <i className='ti ti-plus me-1' /> Add Another Player
                      </button>
                    </div>
                  )}

                  {showPlayerForm && (
                    <div className='new-player-form'>
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
                    </div>
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
                      {isEdit ? 'Updating...' : 'Saving...'}
                    </>
                  ) : isEdit ? (
                    'Update'
                  ) : (
                    'Save'
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
