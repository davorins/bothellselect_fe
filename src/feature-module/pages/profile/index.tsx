// profile.tsx
import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import axios from 'axios';
import Swal from 'sweetalert2';
import Select from 'react-select';
import { all_routes } from '../../router/all_routes';
import { useAuth } from '../../../context/AuthContext';
import {
  Player,
  Guardian,
  FormData as FormDataType,
  Parent,
} from '../../../types/types';
import { Address, ensureAddress, formatAddress } from '../../../utils/address';
import { formatPhoneNumber, validatePhoneNumber } from '../../../utils/phone';
import {
  validateEmail,
  validateRequired,
  validateName,
  validateDateOfBirth,
  validateState,
  validateZipCode,
  validateGrade,
} from '../../../utils/validation';
import { getAvatarUrl, getDefaultAvatar } from '../../../utils/r2Utils';
import { useAvatar } from '../../hooks/useAvatar';
import { calculateGradeFromDOB } from '../../../utils/registration-utils';
import SchoolAutocomplete from '../../../components/SchoolAutocomplete';
import NameInput from '../../../components/NameInput';
import { commonHealthConditions } from '../../constants/healthConditions';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

// ── Local type for the add-player form ───────────────────────────────────────
type NewPlayerForm = Pick<
  Player,
  | 'fullName'
  | 'gender'
  | 'dob'
  | 'schoolName'
  | 'healthConcerns'
  | 'aauNumber'
  | 'grade'
> & { isGradeOverridden?: boolean };

const createEmptyPlayer = (): NewPlayerForm => ({
  fullName: '',
  gender: '',
  dob: '',
  schoolName: '',
  healthConcerns: '',
  aauNumber: '',
  grade: '',
  isGradeOverridden: false,
});

const Profile: React.FC = () => {
  const route = all_routes;
  const {
    parent,
    fetchParentData,
    isLoading,
    fetchPlayersData,
    players,
    updateParent,
  } = useAuth();

  const parentId = localStorage.getItem('parentId');
  const token = localStorage.getItem('token');

  const { avatarSrc, isUploading, uploadAvatar, deleteAvatar } = useAvatar(
    parentId,
    token,
    parent?.avatar,
  );

  // ── Guardian avatar state ─────────────────────────────────────────────────
  const [guardianAvatarPreviews, setGuardianAvatarPreviews] = useState<
    Record<number, string>
  >({});
  const [guardianAvatarUploading, setGuardianAvatarUploading] = useState<
    Record<number, boolean>
  >({});
  const guardianFileInputRefs = useRef<Record<number, HTMLInputElement | null>>(
    {},
  );

  // ── Player avatar state ───────────────────────────────────────────────────
  const [playerAvatarPreviews, setPlayerAvatarPreviews] = useState<
    Record<string, string>
  >({});
  const [playerAvatarUploading, setPlayerAvatarUploading] = useState<
    Record<string, boolean>
  >({});
  const playerFileInputRefs = useRef<Record<string, HTMLInputElement | null>>(
    {},
  );

  // ── Enhanced health conditions state for players ──────────────────────────
  const [playerHealthConditions, setPlayerHealthConditions] = useState<
    Record<string, any[]>
  >({});
  const [playerCustomConditions, setPlayerCustomConditions] = useState<
    Record<string, string>
  >({});
  const [playerShowCustomInput, setPlayerShowCustomInput] = useState<
    Record<string, boolean>
  >({});

  // ── Add-player form state ─────────────────────────────────────────────────
  const [showAddPlayerForm, setShowAddPlayerForm] = useState<boolean>(false);
  const [newPlayerForm, setNewPlayerForm] =
    useState<NewPlayerForm>(createEmptyPlayer());
  const [newPlayerErrors, setNewPlayerErrors] = useState<
    Record<string, string>
  >({});
  const [isSavingPlayer, setIsSavingPlayer] = useState<boolean>(false);

  // ── New player health conditions state ────────────────────────────────────
  const [newPlayerSelectedConditions, setNewPlayerSelectedConditions] =
    useState<any[]>([]);
  const [newPlayerCustomCondition, setNewPlayerCustomCondition] =
    useState<string>('');
  const [newPlayerShowCustomInput, setNewPlayerShowCustomInput] =
    useState<boolean>(false);

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isEditingPlayer, setIsEditingPlayer] = useState<string | null>(null);
  const [isEditingGuardian, setIsEditingGuardian] = useState<number | null>(
    null,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [playerErrors, setPlayerErrors] = useState<Record<string, string>>({});
  const [guardianErrors, setGuardianErrors] = useState<
    Record<number, Record<string, string>>
  >({});

  const [formData, setFormData] = useState<FormDataType>({
    fullName: '',
    email: '',
    phone: '',
    address: { street: '', street2: '', city: '', state: '', zip: '' },
    relationship: '',
    isCoach: false,
    aauNumber: '',
  });

  const [playerFormData, setPlayerFormData] = useState<Player | null>(null);
  const [editedGuardians, setEditedGuardians] = useState<Guardian[]>([]);

  // If this parent is also a coach, use the coach default avatar so their
  // card never shows the generic parent placeholder.
  const DEFAULT_AVATAR = getDefaultAvatar(parent?.isCoach ? 'coach' : 'parent');

  // ── Shared avatar block renderer ──────────────────────────────────────────
  const renderAvatarBlock = (opts: {
    displayAvatar: string | null;
    isUploading: boolean;
    hasSavedId: boolean;
    defaultAvatar: string;
    inputRef: (el: HTMLInputElement | null) => void;
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onDelete: () => void;
  }) => (
    <div className='d-flex align-items-center flex-wrap row-gap-3 mb-3'>
      <div className='d-flex align-items-center justify-content-center avatar avatar-xxl border border-dashed me-2 flex-shrink-0 text-dark frames'>
        {opts.displayAvatar ? (
          <img
            src={opts.displayAvatar}
            alt='Avatar'
            className='img-fluid rounded'
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => {
              (e.target as HTMLImageElement).src = opts.defaultAvatar;
            }}
          />
        ) : (
          <i className='ti ti-photo-plus fs-16' />
        )}
      </div>
      <div className='profile-upload'>
        <div className='profile-uploader d-flex align-items-center'>
          <div className='drag-upload-btn mb-3'>
            {opts.hasSavedId ? 'Upload Photo' : 'Save record first'}
            {opts.hasSavedId && (
              <input
                type='file'
                className='form-control image-sign'
                ref={opts.inputRef}
                onChange={opts.onFileChange}
                accept='image/jpeg, image/png, image/webp'
                disabled={opts.isUploading}
              />
            )}
          </div>
          {opts.displayAvatar && opts.hasSavedId && (
            <button
              type='button'
              className='btn btn-primary mb-3 ms-2'
              onClick={opts.onDelete}
              disabled={opts.isUploading}
            >
              Remove
            </button>
          )}
        </div>
        <p className='fs-12'>
          {opts.hasSavedId
            ? 'Upload image size 4MB, Format JPG, PNG'
            : 'Save the record first to enable avatar upload'}
        </p>
        {opts.isUploading && <div className='text-primary'>Uploading...</div>}
      </div>
    </div>
  );

  // ── Guardian avatar handlers ──────────────────────────────────────────────

  const handleGuardianAvatarChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number,
  ) => {
    const file = e.target.files?.[0];
    if (!file || !parentId || !token) return;
    const guardian = editedGuardians[index];
    if (!guardian._id) {
      alert('Please save the guardian before uploading an avatar.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () =>
      setGuardianAvatarPreviews((prev) => ({
        ...prev,
        [index]: reader.result as string,
      }));
    reader.readAsDataURL(file);
    setGuardianAvatarUploading((prev) => ({ ...prev, [index]: true }));
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      const response = await axios.put(
        `${API_BASE_URL}/upload/guardian/${parentId}/${guardian._id}/avatar`,
        fd,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setEditedGuardians((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], avatar: response.data.avatarUrl };
        return updated;
      });
    } catch (err) {
      console.error('Guardian avatar upload failed:', err);
      alert('Failed to upload guardian avatar. Please try again.');
      setGuardianAvatarPreviews((prev) => {
        const n = { ...prev };
        delete n[index];
        return n;
      });
    } finally {
      setGuardianAvatarUploading((prev) => ({ ...prev, [index]: false }));
      e.target.value = '';
    }
  };

  const handleGuardianAvatarDelete = async (index: number) => {
    const guardian = editedGuardians[index];
    if (!guardian._id || !parentId || !token) return;
    setGuardianAvatarUploading((prev) => ({ ...prev, [index]: true }));
    try {
      await axios.delete(
        `${API_BASE_URL}/upload/guardian/${parentId}/${guardian._id}/avatar`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setEditedGuardians((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], avatar: undefined };
        return updated;
      });
      setGuardianAvatarPreviews((prev) => {
        const n = { ...prev };
        delete n[index];
        return n;
      });
    } catch (err) {
      console.error('Guardian avatar delete failed:', err);
      alert('Failed to delete guardian avatar. Please try again.');
    } finally {
      setGuardianAvatarUploading((prev) => ({ ...prev, [index]: false }));
    }
  };

  // ── Player avatar handlers ────────────────────────────────────────────────

  const handlePlayerAvatarChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    playerId: string,
  ) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    const reader = new FileReader();
    reader.onloadend = () =>
      setPlayerAvatarPreviews((prev) => ({
        ...prev,
        [playerId]: reader.result as string,
      }));
    reader.readAsDataURL(file);
    setPlayerAvatarUploading((prev) => ({ ...prev, [playerId]: true }));
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      await axios.put(`${API_BASE_URL}/upload/player/${playerId}/avatar`, fd, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Refresh player list to get updated avatar URL from server
      const playerIds =
        parent?.players?.map((p: any) => (typeof p === 'string' ? p : p._id)) ||
        [];
      if (playerIds.length > 0) await fetchPlayersData(playerIds);
    } catch (err) {
      console.error('Player avatar upload failed:', err);
      alert('Failed to upload player avatar. Please try again.');
      setPlayerAvatarPreviews((prev) => {
        const n = { ...prev };
        delete n[playerId];
        return n;
      });
    } finally {
      setPlayerAvatarUploading((prev) => ({ ...prev, [playerId]: false }));
      e.target.value = '';
    }
  };

  const handlePlayerAvatarDelete = async (playerId: string) => {
    if (!token) return;
    setPlayerAvatarUploading((prev) => ({ ...prev, [playerId]: true }));
    try {
      await axios.delete(`${API_BASE_URL}/upload/player/${playerId}/avatar`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPlayerAvatarPreviews((prev) => {
        const n = { ...prev };
        delete n[playerId];
        return n;
      });
      const playerIds =
        parent?.players?.map((p: any) => (typeof p === 'string' ? p : p._id)) ||
        [];
      if (playerIds.length > 0) await fetchPlayersData(playerIds);
    } catch (err) {
      console.error('Player avatar delete failed:', err);
      alert('Failed to delete player avatar. Please try again.');
    } finally {
      setPlayerAvatarUploading((prev) => ({ ...prev, [playerId]: false }));
    }
  };

  // ── Enhanced health conditions handlers for existing players ──────────────

  const parseHealthConcerns = (healthConcerns: string = '') => {
    const concerns = healthConcerns.split(',').map((c) => c.trim());
    const selected = concerns
      .filter((c) =>
        commonHealthConditions.some((condition) => condition.label === c),
      )
      .map((c) => {
        const found = commonHealthConditions.find(
          (condition) => condition.label === c,
        );
        return found || { value: 'custom', label: c };
      });

    const custom = concerns
      .filter(
        (c) =>
          !commonHealthConditions.some((condition) => condition.label === c),
      )
      .join(', ');

    return { selected, custom, hasCustom: !!custom };
  };

  const handlePlayerConditionChange = (playerId: string, selected: any) => {
    setPlayerHealthConditions((prev) => ({
      ...prev,
      [playerId]: selected || [],
    }));

    const hasCustom = selected?.some((item: any) => item.value === 'custom');
    setPlayerShowCustomInput((prev) => ({ ...prev, [playerId]: hasCustom }));

    // Update the playerFormData with combined health concerns
    updatePlayerHealthConcerns(
      playerId,
      selected || [],
      playerCustomConditions[playerId] || '',
    );
  };

  const handlePlayerCustomConditionChange = (
    playerId: string,
    value: string,
  ) => {
    setPlayerCustomConditions((prev) => ({ ...prev, [playerId]: value }));
    updatePlayerHealthConcerns(
      playerId,
      playerHealthConditions[playerId] || [],
      value,
    );
  };

  const updatePlayerHealthConcerns = (
    playerId: string,
    conditions: any[],
    custom: string,
  ) => {
    const selectedLabels = conditions
      .filter((c: any) => c.value !== 'custom')
      .map((c: any) => c.label);

    let healthConcerns = selectedLabels.join(', ');

    if (custom.trim() && playerShowCustomInput[playerId]) {
      if (healthConcerns) {
        healthConcerns += ', ' + custom.trim();
      } else {
        healthConcerns = custom.trim();
      }
    }

    setPlayerFormData((prev) => (prev ? { ...prev, healthConcerns } : null));
  };

  // ── Enhanced health conditions handlers for new player ────────────────────

  const handleNewPlayerConditionChange = (selected: any) => {
    setNewPlayerSelectedConditions(selected || []);

    const hasCustom = selected?.some((item: any) => item.value === 'custom');
    setNewPlayerShowCustomInput(hasCustom);

    updateNewPlayerHealthConcerns(selected || [], newPlayerCustomCondition);
  };

  const handleNewPlayerCustomConditionChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = e.target.value;
    setNewPlayerCustomCondition(value);
    updateNewPlayerHealthConcerns(newPlayerSelectedConditions, value);
  };

  const updateNewPlayerHealthConcerns = (conditions: any[], custom: string) => {
    const selectedLabels = conditions
      .filter((c: any) => c.value !== 'custom')
      .map((c: any) => c.label);

    let healthConcerns = selectedLabels.join(', ');

    if (custom.trim() && newPlayerShowCustomInput) {
      if (healthConcerns) {
        healthConcerns += ', ' + custom.trim();
      } else {
        healthConcerns = custom.trim();
      }
    }

    setNewPlayerForm((prev) => ({ ...prev, healthConcerns }));
  };

  // ── New-player form helpers ───────────────────────────────────────────────

  const handleNewPlayerChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setNewPlayerForm((prev) => {
      const updated = { ...prev, [name]: value };
      if (
        name === 'dob' &&
        !prev.isGradeOverridden &&
        value.match(/^\d{4}-\d{2}-\d{2}$/)
      )
        updated.grade = calculateGradeFromDOB(value, new Date().getFullYear());
      return updated;
    });
    if (newPlayerErrors[name])
      setNewPlayerErrors((prev) => {
        const n = { ...prev };
        delete n[name];
        return n;
      });
  };

  const handleNewPlayerSchoolChange = (val: string) => {
    setNewPlayerForm((prev) => ({ ...prev, schoolName: val }));
    if (newPlayerErrors.schoolName)
      setNewPlayerErrors((prev) => {
        const n = { ...prev };
        delete n.schoolName;
        return n;
      });
  };

  const handleGradeOverride = () =>
    setNewPlayerForm((prev) => ({ ...prev, isGradeOverridden: true }));

  const validateNewPlayerForm = (): boolean => {
    const errs: Record<string, string> = {};
    if (!validateName(newPlayerForm.fullName))
      errs.fullName = 'Please enter a valid name (min 2 characters)';
    if (!validateRequired(newPlayerForm.gender))
      errs.gender = 'Gender is required';
    if (!validateDateOfBirth(newPlayerForm.dob))
      errs.dob = 'Please enter a valid date of birth';
    if (!validateRequired(newPlayerForm.schoolName))
      errs.schoolName = 'School name is required';
    if (!validateGrade(newPlayerForm.grade || ''))
      errs.grade = 'Please select a valid grade';
    setNewPlayerErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleAddPlayerSubmit = async () => {
    if (!validateNewPlayerForm()) return;
    if (!parentId || !token) return;
    setIsSavingPlayer(true);
    try {
      await axios.post(
        `${API_BASE_URL}/players/register`,
        {
          fullName: newPlayerForm.fullName.trim(),
          gender: newPlayerForm.gender,
          dob: newPlayerForm.dob,
          schoolName: newPlayerForm.schoolName.trim(),
          healthConcerns: newPlayerForm.healthConcerns || '',
          aauNumber: newPlayerForm.aauNumber || '',
          grade: newPlayerForm.grade || '',
          isGradeOverridden: newPlayerForm.isGradeOverridden || false,
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
      await fetchParentData(parentId);
      const playerIds =
        parent?.players?.map((p: any) => (typeof p === 'string' ? p : p._id)) ||
        [];
      if (playerIds.length > 0) await fetchPlayersData(playerIds);

      // Reset new player form
      setNewPlayerForm(createEmptyPlayer());
      setNewPlayerSelectedConditions([]);
      setNewPlayerCustomCondition('');
      setNewPlayerShowCustomInput(false);
      setNewPlayerErrors({});
      setShowAddPlayerForm(false);
    } catch (error: any) {
      console.error('Error adding player:', error);
      setNewPlayerErrors({
        general: error.response?.data?.error?.includes('already exists')
          ? 'A player with this information already exists on your account.'
          : error.response?.data?.error ||
            'Failed to add player. Please try again.',
      });
    } finally {
      setIsSavingPlayer(false);
    }
  };

  const handleCancelAddPlayer = () => {
    setShowAddPlayerForm(false);
    setNewPlayerForm(createEmptyPlayer());
    setNewPlayerSelectedConditions([]);
    setNewPlayerCustomCondition('');
    setNewPlayerShowCustomInput(false);
    setNewPlayerErrors({});
  };

  // ── Validation ────────────────────────────────────────────────────────────

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!validateName(formData.fullName))
      newErrors.fullName = 'Please enter a valid name (min 2 characters)';
    if (!validateEmail(formData.email))
      newErrors.email = 'Please enter a valid email address';
    if (!validatePhoneNumber(formData.phone))
      newErrors.phone = 'Please enter a valid 10-digit phone number';
    if (!validateRequired(formData.relationship))
      newErrors.relationship = 'Relationship to player is required';
    if (!validateRequired(formData.address.street))
      newErrors['address.street'] = 'Street address is required';
    if (!validateRequired(formData.address.city))
      newErrors['address.city'] = 'City is required';
    if (!validateState(formData.address.state))
      newErrors['address.state'] = 'Please enter a valid 2-letter state code';
    if (!validateZipCode(formData.address.zip))
      newErrors['address.zip'] = 'Please enter a valid ZIP code';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePlayerForm = (): boolean => {
    if (!playerFormData) return false;
    const newErrors: Record<string, string> = {};
    if (!validateName(playerFormData.fullName))
      newErrors.fullName = 'Please enter a valid name (min 2 characters)';
    if (!validateRequired(playerFormData.gender))
      newErrors.gender = 'Gender is required';
    if (!validateDateOfBirth(playerFormData.dob))
      newErrors.dob = 'Please enter a valid date of birth';
    if (!validateRequired(playerFormData.schoolName))
      newErrors.schoolName = 'School name is required';
    if (!validateGrade(playerFormData.grade || ''))
      newErrors.grade = 'Please select a valid grade (1-12)';
    setPlayerErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateGuardianForm = (index: number): boolean => {
    const guardian = editedGuardians[index];
    if (!guardian) return false;
    const newErrors: Record<string, string> = {};
    if (!validateName(guardian.fullName))
      newErrors.fullName = 'Please enter a valid name (min 2 characters)';
    if (!validateEmail(guardian.email))
      newErrors.email = 'Please enter a valid email address';
    if (!validatePhoneNumber(guardian.phone))
      newErrors.phone = 'Please enter a valid 10-digit phone number';
    if (!validateRequired(guardian.relationship))
      newErrors.relationship = 'Relationship is required';
    const address = ensureAddress(guardian.address);
    if (!validateRequired(address.street))
      newErrors['address.street'] = 'Street address is required';
    if (!validateRequired(address.city))
      newErrors['address.city'] = 'City is required';
    if (!validateState(address.state))
      newErrors['address.state'] = 'Please enter a valid 2-letter state code';
    if (!validateZipCode(address.zip))
      newErrors['address.zip'] = 'Please enter a valid ZIP code';
    setGuardianErrors((prev) => ({ ...prev, [index]: newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  // ── Data loading ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!parent) return;
    setFormData({
      fullName: parent.fullName || '',
      email: parent.email || '',
      phone: parent.phone
        ? formatPhoneNumber(parent.phone.replace(/\D/g, ''))
        : '',
      address: ensureAddress(
        typeof parent.address === 'object'
          ? parent.address
          : parent.address || '',
      ),
      relationship: parent.relationship || '',
      isCoach: parent.isCoach || false,
      aauNumber: parent.aauNumber || '',
    });
    setEditedGuardians(
      parent.additionalGuardians?.map((g: any) => ({
        ...g,
        phone: g.phone ? formatPhoneNumber(g.phone.replace(/\D/g, '')) : '',
        address: ensureAddress(
          g.address || {
            street: '',
            street2: '',
            city: '',
            state: '',
            zip: '',
          },
        ),
      })) || [],
    );
    setGuardianAvatarPreviews({});
    setPlayerAvatarPreviews({});
    const playerIds =
      parent.players?.map((p: any) => (typeof p === 'string' ? p : p._id)) ||
      [];
    if (playerIds.length > 0)
      fetchPlayersData(playerIds).catch((e) =>
        console.error('Failed to fetch players:', e),
      );
  }, [parent, fetchPlayersData]);

  // Initialize health conditions for players when they are loaded
  useEffect(() => {
    players.forEach((player: Player) => {
      if (player._id && !playerHealthConditions[player._id]) {
        const { selected, custom, hasCustom } = parseHealthConcerns(
          player.healthConcerns,
        );
        setPlayerHealthConditions((prev) => ({
          ...prev,
          [player._id]: selected,
        }));
        setPlayerCustomConditions((prev) => ({
          ...prev,
          [player._id]: custom,
        }));
        setPlayerShowCustomInput((prev) => ({
          ...prev,
          [player._id]: hasCustom,
        }));
      }
    });
  }, [players]);

  // ── Event handlers ────────────────────────────────────────────────────────

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { name, value, type, checked } = e.target;
    let updatedValue: string | boolean = value;
    if (name === 'phone')
      updatedValue = formatPhoneNumber(value.replace(/\D/g, ''));
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : updatedValue,
    }));
    if (errors[name])
      setErrors((prev) => {
        const n = { ...prev };
        delete n[name];
        return n;
      });
  };

  const handlePersonalInfoSubmit = async (
    e: React.MouseEvent<HTMLButtonElement>,
  ): Promise<void> => {
    e.preventDefault();
    if (!validateForm()) return;
    try {
      if (!parentId || !token || !parent) return;
      await axios.put(`${API_BASE_URL}/parent/${parentId}`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setIsEditing(false);
      await fetchParentData(parentId);
    } catch (error) {
      console.error('Error updating personal information:', error);
      alert('Failed to update profile. Please try again.');
    }
  };

  const handleGuardianInfoSubmit = async (
    guardianIndex: number,
  ): Promise<void> => {
    if (!validateGuardianForm(guardianIndex)) return;
    try {
      if (!parentId || !token || !parent) return;
      const updatedGuardian = {
        ...editedGuardians[guardianIndex],
        address: ensureAddress(editedGuardians[guardianIndex].address),
      };
      await axios.put(
        `${API_BASE_URL}/parent/${parentId}/guardian/${guardianIndex}`,
        updatedGuardian,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setIsEditingGuardian(null);
      await fetchParentData(parentId);
    } catch (error) {
      console.error('Error updating guardian information:', error);
      alert('Failed to update guardian. Please try again.');
    }
  };

  const handleDeletePlayer = async (playerId: string): Promise<void> => {
    if (!token) return;

    const result = await Swal.fire({
      title: 'Remove Player?',
      text: 'Are you sure you want to remove this player from your account? This cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, remove player',
      cancelButtonText: 'Cancel',
    });

    if (!result.isConfirmed) return;

    try {
      await axios.delete(`${API_BASE_URL}/players/${playerId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (parentId) await fetchParentData(parentId);
      const playerIds =
        parent?.players
          ?.map((p: any) => (typeof p === 'string' ? p : p._id))
          .filter((id: string) => id !== playerId) || [];
      if (playerIds.length > 0) await fetchPlayersData(playerIds);

      Swal.fire({
        icon: 'success',
        title: 'Player Removed',
        text: 'The player has been removed from your account.',
        timer: 2000,
        showConfirmButton: false,
        toast: true,
        position: 'top-end',
        background: '#10b981',
        color: '#fff',
        iconColor: '#fff',
      });
    } catch (error) {
      console.error('Error deleting player:', error);
      Swal.fire({
        icon: 'error',
        title: 'Removal Failed',
        text: 'Failed to remove player. Please try again.',
        timer: 3000,
        showConfirmButton: false,
        toast: true,
        position: 'top-end',
        background: '#ef4444',
        color: '#fff',
        iconColor: '#fff',
      });
    }
  };

  const handlePlayerInfoSubmit = async (playerId: string): Promise<void> => {
    if (!validatePlayerForm()) return;

    console.log('🚀 Starting player update...', {
      playerId,
      token: token ? 'exists' : 'missing',
      apiBaseUrl: API_BASE_URL,
      fullUrl: `${API_BASE_URL}/players/${playerId}`,
      playerData: playerFormData,
    });

    try {
      if (!token) {
        console.error('❌ No token found');
        alert('Authentication token missing. Please log in again.');
        return;
      }

      if (!playerFormData) {
        console.error('❌ No player form data');
        return;
      }

      // Log the exact request details
      console.log('📤 Sending PUT request:', {
        url: `${API_BASE_URL}/players/${playerId}`,
        data: playerFormData,
        headers: {
          Authorization: `Bearer ${token.substring(0, 20)}...`,
          'Content-Type': 'application/json',
        },
      });

      const response = await axios.put(
        `${API_BASE_URL}/players/${playerId}`,
        { ...playerFormData, grade: playerFormData.grade || '' },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      console.log('✅ Update successful:', response.data);

      setIsEditingPlayer(null);
      const playerIds =
        parent?.players?.map((p: any) => (typeof p === 'string' ? p : p._id)) ||
        [];
      await fetchPlayersData(playerIds);
    } catch (error: any) {
      console.error('❌ Error updating player information:', error);

      // Detailed error logging
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
        console.error('Error response headers:', error.response.headers);

        alert(
          `Server error (${error.response.status}): ${error.response.data?.message || error.response.data?.error || 'Unknown error'}`,
        );
      } else if (error.request) {
        // The request was made but no response was received
        console.error('Error request:', error.request);
        alert('No response from server. Please check your connection.');
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Error message:', error.message);
        alert(`Error: ${error.message}`);
      }
    }
  };

  const handlePlayerInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ): void => {
    const { name, value } = e.target;
    setPlayerFormData((prev) => (prev ? { ...prev, [name]: value } : null));
    if (playerErrors[name])
      setPlayerErrors((prev) => {
        const n = { ...prev };
        delete n[name];
        return n;
      });
  };

  const handleGuardianInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number,
  ): void => {
    const { name, value, type, checked } = e.target;
    const updatedValue =
      name === 'phone' ? formatPhoneNumber(value.replace(/\D/g, '')) : value;
    setEditedGuardians((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [name]: type === 'checkbox' ? checked : updatedValue,
      };
      return updated;
    });
    if (guardianErrors[index]?.[name])
      setGuardianErrors((prev) => {
        const n = { ...prev };
        if (n[index]) delete n[index][name];
        return n;
      });
  };

  const addNewGuardian = (): void => {
    setEditedGuardians((prev) => [
      ...prev,
      {
        fullName: '',
        relationship: '',
        phone: '',
        email: '',
        address: { street: '', street2: '', city: '', state: '', zip: '' },
        isCoach: false,
        aauNumber: '',
      },
    ]);
    setIsEditingGuardian(editedGuardians.length);
  };

  const handleAddressChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: keyof Address,
  ): void => {
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
    index: number,
    field: keyof Address,
  ): void => {
    setEditedGuardians((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        address: {
          ...ensureAddress(updated[index].address),
          [field]: e.target.value,
        },
      };
      return updated;
    });
    if (guardianErrors[index]?.[`address.${field}`])
      setGuardianErrors((prev) => {
        const n = { ...prev };
        if (n[index]) delete n[index][`address.${field}`];
        return n;
      });
  };

  const handleAvatarChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const newAvatarUrl = await uploadAvatar(file);
      if (newAvatarUrl && parent)
        updateParent({ ...parent, avatar: newAvatarUrl } as Partial<Parent>);
      if (parentId) await fetchParentData(parentId);
    } catch (error: any) {
      console.error('Avatar upload failed:', error);
      alert(
        error.response?.data?.error ||
          error.message ||
          'Upload failed. Please try again.',
      );
    } finally {
      e.target.value = '';
    }
  };

  const handleDeleteAvatar = async (): Promise<void> => {
    try {
      await deleteAvatar();
      if (parent) {
        const { avatar, ...parentWithoutAvatar } = parent;
        updateParent(parentWithoutAvatar as Partial<Parent>);
      }
      if (parentId) await fetchParentData(parentId);
    } catch (error: any) {
      console.error('Deletion failed:', error);
      alert(
        error.response?.data?.error ||
          'Failed to delete avatar. Please try again.',
      );
    }
  };

  // Custom styles for react-select
  const selectStyles = {
    control: (base: any) => ({
      ...base,
      minHeight: '38px',
      borderColor: '#d9d9d9',
      '&:hover': { borderColor: '#40a9ff' },
    }),
  };

  if (isLoading) return <div className='text-center p-5'>Loading...</div>;
  if (!parent)
    return <div className='text-center p-5'>No parent data found.</div>;

  return (
    <div className='page-wrapper'>
      <div className='content'>
        <div className='d-md-flex d-block align-items-center justify-content-between border-bottom pb-3'>
          <div className='my-auto mb-2'>
            <h3 className='page-title mb-1'>Profile</h3>
            <nav>
              <ol className='breadcrumb mb-0'>
                <li className='breadcrumb-item'>
                  <Link to={route.adminDashboard}>Dashboard</Link>
                </li>
                <li className='breadcrumb-item'>
                  <Link to='#'>Settings</Link>
                </li>
                <li className='breadcrumb-item active' aria-current='page'>
                  Profile
                </li>
              </ol>
            </nav>
          </div>
          <div className='d-flex my-xl-auto right-content align-items-center flex-wrap'>
            <div className='pe-1 mb-2'>
              <OverlayTrigger
                placement='top'
                overlay={<Tooltip id='tooltip-top'>Refresh</Tooltip>}
              >
                <Link
                  to='#'
                  className='btn btn-outline-light bg-white btn-icon me-1'
                  onClick={() => parentId && fetchParentData(parentId)}
                >
                  <i className='ti ti-refresh' />
                </Link>
              </OverlayTrigger>
            </div>
          </div>
        </div>

        <div className='d-md-flex d-block mt-3'>
          {/* ── Parent avatar sidebar ── */}
          <div className='settings-right-sidebar me-md-3 border-0'>
            <div className='card'>
              <div className='card-header'>
                <h5>Profile Avatar</h5>
              </div>
              <div className='card-body'>
                <div className='settings-profile-upload'>
                  <span className='avatar avatar-md online avatar-rounded'>
                    <img
                      src={avatarSrc}
                      alt={parent?.fullName || 'User avatar'}
                      className='img-fluid rounded-circle'
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = getDefaultAvatar(
                          parent?.isCoach ? 'coach' : 'parent',
                        );
                      }}
                    />
                  </span>
                  <div className='title-upload'>
                    <h5>Edit Your Avatar</h5>
                    <Link to='#' className='me-2' onClick={handleDeleteAvatar}>
                      Delete
                    </Link>
                    <Link
                      to='#'
                      className='text-primary'
                      onClick={() =>
                        document.getElementById('avatar-upload')?.click()
                      }
                    >
                      Update
                    </Link>
                  </div>
                </div>
                <div className='profile-uploader profile-uploader-two mb-0'>
                  <span className='upload-icon'>
                    <i className='ti ti-upload' />
                  </span>
                  <div className='drag-upload-btn bg-transparent me-0 border-0'>
                    <p className='upload-btn'>
                      <span>Click to Upload</span> or drag and drop
                    </p>
                    <h6>JPG or PNG</h6>
                    <h6>(Max 5MB)</h6>
                  </div>
                  <input
                    type='file'
                    className='form-control'
                    id='avatar-upload'
                    accept='image/jpeg, image/jpg, image/png, image/webp'
                    onChange={handleAvatarChange}
                    disabled={isUploading}
                    style={{
                      opacity: 0,
                      position: 'absolute',
                      width: '100%',
                      height: '100%',
                      cursor: 'pointer',
                    }}
                  />
                  {isUploading && (
                    <div className='mt-2 text-primary'>Uploading...</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className='flex-fill ps-0 border-0'>
            {/* ── Personal Information ── */}
            <div className='card'>
              <div className='card-header d-flex justify-content-between align-items-center'>
                <h5>Personal Information</h5>
              </div>
              <div className='card-body pb-0'>
                <div className='d-block d-xl-flex'>
                  <div className='mb-3 flex-fill me-xl-3 me-0'>
                    {isEditing ? (
                      <NameInput
                        value={formData.fullName}
                        onChange={(val) =>
                          handleInputChange({
                            target: { name: 'fullName', value: val },
                          } as React.ChangeEvent<HTMLInputElement>)
                        }
                        error={errors.fullName}
                      />
                    ) : (
                      <>
                        <label className='form-label'>Full Name</label>
                        <input
                          type='text'
                          className='form-control'
                          value={formData.fullName}
                          disabled
                        />
                      </>
                    )}
                  </div>
                  <div className='mb-3 flex-fill'>
                    <label className='form-label'>Email</label>
                    <input
                      type='email'
                      className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                      name='email'
                      value={formData.email}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                    />
                    {errors.email && (
                      <div className='invalid-feedback d-block'>
                        {errors.email}
                      </div>
                    )}
                  </div>
                </div>
                <div className='d-block d-xl-flex'>
                  <div className='mb-3 flex-fill me-xl-3 me-0'>
                    <label className='form-label'>Phone Number</label>
                    <input
                      type='tel'
                      className={`form-control ${errors.phone ? 'is-invalid' : ''}`}
                      name='phone'
                      value={formData.phone}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      placeholder='(123) 456-7890'
                      maxLength={14}
                    />
                    {errors.phone && (
                      <div className='invalid-feedback d-block'>
                        {errors.phone}
                      </div>
                    )}
                  </div>
                  <div className='mb-3 flex-fill me-xl-3 me-0'>
                    <label className='form-label'>Relationship to Player</label>
                    <input
                      type='text'
                      className={`form-control ${errors.relationship ? 'is-invalid' : ''}`}
                      name='relationship'
                      value={formData.relationship}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                    />
                    {errors.relationship && (
                      <div className='invalid-feedback d-block'>
                        {errors.relationship}
                      </div>
                    )}
                  </div>
                  <div className='mb-3 flex-fill'>
                    <label className='form-label'>AAU Number</label>
                    <input
                      type='text'
                      className='form-control'
                      name='aauNumber'
                      value={formData.aauNumber}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
                <div className='mb-3 flex-fill'>
                  {!isEditing ? (
                    <>
                      <label className='form-label'>Address</label>
                      <input
                        type='text'
                        className='form-control'
                        value={formatAddress(formData.address)}
                        disabled
                      />
                    </>
                  ) : (
                    <div className='flex-fill'>
                      <div className='row mb-3'>
                        <div className='col-md-8'>
                          <label className='form-label'>Street Address</label>
                          <input
                            type='text'
                            className={`form-control ${errors['address.street'] ? 'is-invalid' : ''}`}
                            value={formData.address.street}
                            onChange={(e) => handleAddressChange(e, 'street')}
                          />
                          {errors['address.street'] && (
                            <div className='invalid-feedback d-block'>
                              {errors['address.street']}
                            </div>
                          )}
                        </div>
                        <div className='col-md-4'>
                          <label className='form-label'>
                            Apt/Suite (optional)
                          </label>
                          <input
                            type='text'
                            className='form-control'
                            value={formData.address.street2}
                            onChange={(e) => handleAddressChange(e, 'street2')}
                          />
                        </div>
                      </div>
                      <div className='row'>
                        <div className='col-md-5'>
                          <label className='form-label'>City</label>
                          <input
                            type='text'
                            className={`form-control ${errors['address.city'] ? 'is-invalid' : ''}`}
                            value={formData.address.city}
                            onChange={(e) => handleAddressChange(e, 'city')}
                          />
                          {errors['address.city'] && (
                            <div className='invalid-feedback d-block'>
                              {errors['address.city']}
                            </div>
                          )}
                        </div>
                        <div className='col-md-3'>
                          <label className='form-label'>State</label>
                          <input
                            type='text'
                            className={`form-control ${errors['address.state'] ? 'is-invalid' : ''}`}
                            value={formData.address.state}
                            onChange={(e) => handleAddressChange(e, 'state')}
                            maxLength={2}
                          />
                          {errors['address.state'] && (
                            <div className='invalid-feedback d-block'>
                              {errors['address.state']}
                            </div>
                          )}
                        </div>
                        <div className='col-md-4'>
                          <label className='form-label'>ZIP Code</label>
                          <input
                            type='text'
                            className={`form-control ${errors['address.zip'] ? 'is-invalid' : ''}`}
                            value={formData.address.zip}
                            onChange={(e) => handleAddressChange(e, 'zip')}
                            maxLength={10}
                          />
                          {errors['address.zip'] && (
                            <div className='invalid-feedback d-block'>
                              {errors['address.zip']}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                {!isEditing ? (
                  <button
                    type='button'
                    className='btn btn-primary btn-sm mb-4'
                    onClick={() => setIsEditing(true)}
                  >
                    <i className='ti ti-edit me-2' /> Edit
                  </button>
                ) : (
                  <button
                    type='button'
                    className='btn btn-primary btn-sm mb-4'
                    onClick={handlePersonalInfoSubmit}
                  >
                    <i className='ti ti-edit me-2' /> Save Changes
                  </button>
                )}
              </div>
            </div>

            {/* ── Additional Guardians ── */}
            <div className='card mt-3'>
              <div className='card-header d-flex justify-content-between align-items-center'>
                <h5>Additional Parent/Guardian Information</h5>
                <button
                  type='button'
                  className='btn btn-primary btn-sm'
                  onClick={addNewGuardian}
                >
                  <i className='ti ti-plus me-2' /> Add Parent/Guardian
                </button>
              </div>
              <div className='card-body pb-0'>
                {editedGuardians.length > 0 ? (
                  editedGuardians.map((guardian, index) => {
                    const displayAvatar =
                      guardianAvatarPreviews[index] ||
                      (guardian.avatar
                        ? getAvatarUrl(guardian.avatar, DEFAULT_AVATAR)
                        : null);
                    const isGuardianUploading =
                      guardianAvatarUploading[index] ?? false;
                    const hasSavedId = !!guardian._id;
                    return (
                      <div key={index} className='mb-4'>
                        <div className='card'>
                          <div className='card-header d-flex align-items-center justify-content-between'>
                            <h5>{guardian.fullName || 'New Guardian'}</h5>
                          </div>
                          <div className='card-body pb-0'>
                            {renderAvatarBlock({
                              displayAvatar,
                              isUploading: isGuardianUploading,
                              hasSavedId,
                              defaultAvatar: DEFAULT_AVATAR,
                              inputRef: (el) => {
                                guardianFileInputRefs.current[index] = el;
                              },
                              onFileChange: (e) =>
                                handleGuardianAvatarChange(e, index),
                              onDelete: () => handleGuardianAvatarDelete(index),
                            })}
                            <div className='d-block d-xl-flex'>
                              <div className='mb-3 flex-fill me-xl-3 me-0'>
                                {isEditingGuardian === index ? (
                                  <NameInput
                                    value={guardian.fullName}
                                    onChange={(val) =>
                                      handleGuardianInputChange(
                                        {
                                          target: {
                                            name: 'fullName',
                                            value: val,
                                          },
                                        } as React.ChangeEvent<HTMLInputElement>,
                                        index,
                                      )
                                    }
                                    error={guardianErrors[index]?.fullName}
                                  />
                                ) : (
                                  <>
                                    <label className='form-label'>
                                      Full Name
                                    </label>
                                    <input
                                      type='text'
                                      className='form-control'
                                      value={guardian.fullName}
                                      disabled
                                    />
                                  </>
                                )}
                              </div>
                              <div className='mb-3 flex-fill'>
                                <label className='form-label'>Email</label>
                                <input
                                  type='email'
                                  className={`form-control ${guardianErrors[index]?.email ? 'is-invalid' : ''}`}
                                  value={guardian.email}
                                  onChange={(e) =>
                                    handleGuardianInputChange(e, index)
                                  }
                                  disabled={isEditingGuardian !== index}
                                  name='email'
                                />
                                {guardianErrors[index]?.email && (
                                  <div className='invalid-feedback d-block'>
                                    {guardianErrors[index].email}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className='d-block d-xl-flex'>
                              <div className='mb-3 flex-fill me-xl-3 me-0'>
                                <label className='form-label'>
                                  Phone Number
                                </label>
                                <input
                                  type='tel'
                                  className={`form-control ${guardianErrors[index]?.phone ? 'is-invalid' : ''}`}
                                  name='phone'
                                  value={guardian.phone}
                                  onChange={(e) =>
                                    handleGuardianInputChange(e, index)
                                  }
                                  disabled={isEditingGuardian !== index}
                                  placeholder='(123) 456-7890'
                                  maxLength={14}
                                />
                                {guardianErrors[index]?.phone && (
                                  <div className='invalid-feedback d-block'>
                                    {guardianErrors[index].phone}
                                  </div>
                                )}
                              </div>
                              <div className='mb-3 flex-fill me-xl-3 me-0'>
                                <label className='form-label'>
                                  Relationship
                                </label>
                                <input
                                  type='text'
                                  className={`form-control ${guardianErrors[index]?.relationship ? 'is-invalid' : ''}`}
                                  value={guardian.relationship}
                                  onChange={(e) =>
                                    handleGuardianInputChange(e, index)
                                  }
                                  disabled={isEditingGuardian !== index}
                                  name='relationship'
                                />
                                {guardianErrors[index]?.relationship && (
                                  <div className='invalid-feedback d-block'>
                                    {guardianErrors[index].relationship}
                                  </div>
                                )}
                              </div>
                              <div className='mb-3 flex-fill'>
                                <label className='form-label'>AAU Number</label>
                                <input
                                  type='text'
                                  className='form-control'
                                  value={guardian.aauNumber || ''}
                                  onChange={(e) =>
                                    handleGuardianInputChange(e, index)
                                  }
                                  disabled={isEditingGuardian !== index}
                                  name='aauNumber'
                                />
                              </div>
                            </div>
                            <div className='mb-3 flex-fill'>
                              {isEditingGuardian === index ? (
                                <div className='flex-fill'>
                                  <div className='row mb-3'>
                                    <div className='col-md-8'>
                                      <label className='form-label'>
                                        Street Address
                                      </label>
                                      <input
                                        type='text'
                                        className={`form-control ${guardianErrors[index]?.['address.street'] ? 'is-invalid' : ''}`}
                                        value={
                                          ensureAddress(guardian.address).street
                                        }
                                        onChange={(e) =>
                                          handleGuardianAddressChange(
                                            e,
                                            index,
                                            'street',
                                          )
                                        }
                                      />
                                      {guardianErrors[index]?.[
                                        'address.street'
                                      ] && (
                                        <div className='invalid-feedback d-block'>
                                          {
                                            guardianErrors[index][
                                              'address.street'
                                            ]
                                          }
                                        </div>
                                      )}
                                    </div>
                                    <div className='col-md-4'>
                                      <label className='form-label'>
                                        Apt/Suite (optional)
                                      </label>
                                      <input
                                        type='text'
                                        className='form-control'
                                        value={
                                          ensureAddress(guardian.address)
                                            .street2
                                        }
                                        onChange={(e) =>
                                          handleGuardianAddressChange(
                                            e,
                                            index,
                                            'street2',
                                          )
                                        }
                                      />
                                    </div>
                                  </div>
                                  <div className='row'>
                                    <div className='col-md-5'>
                                      <label className='form-label'>City</label>
                                      <input
                                        type='text'
                                        className={`form-control ${guardianErrors[index]?.['address.city'] ? 'is-invalid' : ''}`}
                                        value={
                                          ensureAddress(guardian.address).city
                                        }
                                        onChange={(e) =>
                                          handleGuardianAddressChange(
                                            e,
                                            index,
                                            'city',
                                          )
                                        }
                                      />
                                      {guardianErrors[index]?.[
                                        'address.city'
                                      ] && (
                                        <div className='invalid-feedback d-block'>
                                          {
                                            guardianErrors[index][
                                              'address.city'
                                            ]
                                          }
                                        </div>
                                      )}
                                    </div>
                                    <div className='col-md-3'>
                                      <label className='form-label'>
                                        State
                                      </label>
                                      <input
                                        type='text'
                                        className={`form-control ${guardianErrors[index]?.['address.state'] ? 'is-invalid' : ''}`}
                                        value={
                                          ensureAddress(guardian.address).state
                                        }
                                        onChange={(e) =>
                                          handleGuardianAddressChange(
                                            e,
                                            index,
                                            'state',
                                          )
                                        }
                                        maxLength={2}
                                      />
                                      {guardianErrors[index]?.[
                                        'address.state'
                                      ] && (
                                        <div className='invalid-feedback d-block'>
                                          {
                                            guardianErrors[index][
                                              'address.state'
                                            ]
                                          }
                                        </div>
                                      )}
                                    </div>
                                    <div className='col-md-4'>
                                      <label className='form-label'>
                                        ZIP Code
                                      </label>
                                      <input
                                        type='text'
                                        className={`form-control ${guardianErrors[index]?.['address.zip'] ? 'is-invalid' : ''}`}
                                        value={
                                          ensureAddress(guardian.address).zip
                                        }
                                        onChange={(e) =>
                                          handleGuardianAddressChange(
                                            e,
                                            index,
                                            'zip',
                                          )
                                        }
                                        maxLength={10}
                                      />
                                      {guardianErrors[index]?.[
                                        'address.zip'
                                      ] && (
                                        <div className='invalid-feedback d-block'>
                                          {guardianErrors[index]['address.zip']}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <label className='form-label'>Address</label>
                                  <input
                                    type='text'
                                    className='form-control'
                                    value={formatAddress(guardian.address)}
                                    disabled
                                  />
                                </>
                              )}
                            </div>
                            {isEditingGuardian !== index ? (
                              <button
                                type='button'
                                className='btn btn-primary btn-sm mb-4'
                                onClick={() => setIsEditingGuardian(index)}
                              >
                                <i className='ti ti-edit me-2' /> Edit
                              </button>
                            ) : (
                              <button
                                type='button'
                                className='btn btn-primary btn-sm mb-4'
                                onClick={() => handleGuardianInfoSubmit(index)}
                              >
                                <i className='ti ti-edit me-2' /> Save Changes
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className='mb-4'>No additional guardians registered.</p>
                )}
              </div>
            </div>

            {/* ── Players ── */}
            <div className='card mt-3'>
              <div className='card-header d-flex justify-content-between align-items-center'>
                <h5>Player Information</h5>
                {!showAddPlayerForm && (
                  <button
                    type='button'
                    className='btn btn-primary btn-sm'
                    onClick={() => setShowAddPlayerForm(true)}
                  >
                    <i className='ti ti-plus me-2' /> Add Player
                  </button>
                )}
              </div>
              <div className='card-body pb-0'>
                {/* Existing players */}
                {players.length > 0
                  ? players.map((player: Player) => {
                      const defaultPlayerAvatar = getDefaultAvatar(
                        'player',
                        player.gender as 'Male' | 'Female',
                      );
                      const displayPlayerAvatar =
                        playerAvatarPreviews[player._id] ||
                        (player.avatar
                          ? getAvatarUrl(player.avatar, defaultPlayerAvatar)
                          : null);
                      const isPlayerAvatarLoading =
                        playerAvatarUploading[player._id] ?? false;

                      return (
                        <div key={player._id} className='mb-4'>
                          <div className='card'>
                            <div className='card-header d-flex align-items-center justify-content-between'>
                              <h5 className='mb-0'>{player.fullName}</h5>
                              <button
                                type='button'
                                className='btn btn-outline-danger btn-sm'
                                onClick={() => handleDeletePlayer(player._id)}
                                disabled={isPlayerAvatarLoading}
                              >
                                <i className='ti ti-trash me-1' />
                                Remove Player
                              </button>
                            </div>
                            <div className='card-body pb-0'>
                              {/* Player avatar — identical block to guardian */}
                              {renderAvatarBlock({
                                displayAvatar: displayPlayerAvatar,
                                isUploading: isPlayerAvatarLoading,
                                hasSavedId: true,
                                defaultAvatar: defaultPlayerAvatar,
                                inputRef: (el) => {
                                  playerFileInputRefs.current[player._id] = el;
                                },
                                onFileChange: (e) =>
                                  handlePlayerAvatarChange(e, player._id),
                                onDelete: () =>
                                  handlePlayerAvatarDelete(player._id),
                              })}

                              {/* Player fields */}
                              <div className='d-block d-xl-flex'>
                                <div className='mb-3 flex-fill me-xl-3 me-0'>
                                  {isEditingPlayer === player._id ? (
                                    <NameInput
                                      value={playerFormData?.fullName || ''}
                                      onChange={(val) =>
                                        handlePlayerInputChange({
                                          target: {
                                            name: 'fullName',
                                            value: val,
                                          },
                                        } as React.ChangeEvent<
                                          HTMLInputElement | HTMLSelectElement
                                        >)
                                      }
                                      error={playerErrors.fullName}
                                    />
                                  ) : (
                                    <>
                                      <label className='form-label'>
                                        Full Name
                                      </label>
                                      <input
                                        type='text'
                                        className='form-control'
                                        value={player.fullName}
                                        disabled
                                      />
                                    </>
                                  )}
                                </div>
                                <div className='mb-3 flex-fill'>
                                  <label className='form-label'>Gender</label>
                                  <select
                                    className={`form-control ${playerErrors.gender ? 'is-invalid' : ''}`}
                                    name='gender'
                                    value={
                                      isEditingPlayer === player._id
                                        ? playerFormData?.gender || ''
                                        : player.gender
                                    }
                                    onChange={handlePlayerInputChange}
                                    disabled={isEditingPlayer !== player._id}
                                  >
                                    <option value=''>Select Gender</option>
                                    <option value='Male'>Male</option>
                                    <option value='Female'>Female</option>
                                  </select>
                                  {playerErrors.gender && (
                                    <div className='invalid-feedback d-block'>
                                      {playerErrors.gender}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className='d-block d-xl-flex'>
                                <div className='mb-3 flex-fill me-xl-3 me-0'>
                                  <label className='form-label'>
                                    Date of Birth
                                  </label>
                                  <input
                                    type='date'
                                    className={`form-control ${playerErrors.dob ? 'is-invalid' : ''}`}
                                    name='dob'
                                    value={
                                      isEditingPlayer === player._id
                                        ? playerFormData?.dob?.split('T')[0] ||
                                          ''
                                        : player.dob?.split('T')[0] || ''
                                    }
                                    onChange={handlePlayerInputChange}
                                    disabled={isEditingPlayer !== player._id}
                                  />
                                  {playerErrors.dob && (
                                    <div className='invalid-feedback d-block'>
                                      {playerErrors.dob}
                                    </div>
                                  )}
                                </div>
                                <div className='mb-3 flex-fill'>
                                  <label className='form-label'>
                                    School Name
                                  </label>
                                  <input
                                    type='text'
                                    className={`form-control ${playerErrors.schoolName ? 'is-invalid' : ''}`}
                                    name='schoolName'
                                    value={
                                      isEditingPlayer === player._id
                                        ? playerFormData?.schoolName || ''
                                        : player.schoolName
                                    }
                                    onChange={handlePlayerInputChange}
                                    disabled={isEditingPlayer !== player._id}
                                  />
                                  {playerErrors.schoolName && (
                                    <div className='invalid-feedback d-block'>
                                      {playerErrors.schoolName}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className='d-block d-xl-flex'>
                                <div
                                  className='mb-3 me-xl-3 me-0'
                                  style={{ minWidth: '120px' }}
                                >
                                  <label className='form-label'>Grade</label>
                                  <select
                                    name='grade'
                                    className={`form-control ${playerErrors.grade ? 'is-invalid' : ''}`}
                                    value={
                                      isEditingPlayer === player._id
                                        ? playerFormData?.grade || ''
                                        : player.grade || ''
                                    }
                                    onChange={handlePlayerInputChange}
                                    disabled={isEditingPlayer !== player._id}
                                  >
                                    <option value=''>Select Grade</option>
                                    <option value='PK'>Pre-K</option>
                                    <option value='K'>K</option>
                                    {[...Array(12)].map((_, i) => (
                                      <option key={i + 1} value={`${i + 1}`}>
                                        {i + 1}
                                        {i === 0
                                          ? 'st'
                                          : i === 1
                                            ? 'nd'
                                            : i === 2
                                              ? 'rd'
                                              : 'th'}{' '}
                                        Grade
                                      </option>
                                    ))}
                                  </select>
                                  {playerErrors.grade && (
                                    <div className='invalid-feedback d-block'>
                                      {playerErrors.grade}
                                    </div>
                                  )}
                                </div>
                                <div className='mb-3 flex-fill me-xl-3 me-0'>
                                  <label className='form-label'>
                                    AAU Number
                                  </label>
                                  <input
                                    type='text'
                                    className='form-control'
                                    name='aauNumber'
                                    value={
                                      isEditingPlayer === player._id
                                        ? playerFormData?.aauNumber || ''
                                        : player.aauNumber || ''
                                    }
                                    onChange={handlePlayerInputChange}
                                    disabled={isEditingPlayer !== player._id}
                                  />
                                </div>
                              </div>

                              {/* ── Enhanced Health Conditions Section ── */}
                              <div className='row row-cols-xxl-12 row-cols-md-12'>
                                <div className='col-xxl col-xl-12 col-md-12'>
                                  <div className='card mt-3'>
                                    <div className='card-header bg-light py-2'>
                                      <div className='d-flex align-items-center'>
                                        <span className='bg-white avatar avatar-sm me-2 text-gray-7 flex-shrink-0'>
                                          <i className='ti ti-heartbeat fs-16' />
                                        </span>
                                        <h5 className='text-dark mb-0'>
                                          Medical History
                                        </h5>
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
                                            value={
                                              playerHealthConditions[
                                                player._id
                                              ] || []
                                            }
                                            onChange={(selected) =>
                                              handlePlayerConditionChange(
                                                player._id,
                                                selected,
                                              )
                                            }
                                            styles={selectStyles}
                                            placeholder='Select health conditions...'
                                            isDisabled={
                                              isEditingPlayer !== player._id
                                            }
                                          />
                                          <small className='text-muted'>
                                            Select all that apply
                                          </small>
                                        </div>

                                        {playerShowCustomInput[player._id] && (
                                          <div className='mb-3'>
                                            <label className='form-label'>
                                              Specify Other Condition(s)
                                            </label>
                                            <input
                                              type='text'
                                              className='form-control'
                                              value={
                                                playerCustomConditions[
                                                  player._id
                                                ] || ''
                                              }
                                              onChange={(e) =>
                                                handlePlayerCustomConditionChange(
                                                  player._id,
                                                  e.target.value,
                                                )
                                              }
                                              placeholder='Please describe any other health conditions...'
                                              disabled={
                                                isEditingPlayer !== player._id
                                              }
                                            />
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {isEditingPlayer !== player._id ? (
                                <button
                                  type='button'
                                  className='btn btn-primary btn-sm mb-4'
                                  onClick={() => {
                                    setIsEditingPlayer(player._id);
                                    setPlayerFormData(player);
                                  }}
                                >
                                  <i className='ti ti-edit me-2' /> Edit
                                </button>
                              ) : (
                                <button
                                  type='button'
                                  className='btn btn-primary btn-sm mb-4'
                                  onClick={() =>
                                    handlePlayerInfoSubmit(player._id)
                                  }
                                >
                                  <i className='ti ti-edit me-2' /> Save Changes
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  : !showAddPlayerForm && (
                      <p className='mb-4'>No players registered.</p>
                    )}

                {/* ── Add New Player inline form ── */}
                {showAddPlayerForm && (
                  <div className='mb-4'>
                    <div className='card border-primary'>
                      <div className='card-header d-flex align-items-center justify-content-between bg-light'>
                        <h5 className='mb-0'>
                          <i className='ti ti-user-plus me-2 text-primary' />
                          New Player
                        </h5>
                        <button
                          type='button'
                          className='btn btn-sm btn-outline-secondary'
                          onClick={handleCancelAddPlayer}
                          disabled={isSavingPlayer}
                        >
                          <i className='ti ti-x me-1' /> Cancel
                        </button>
                      </div>
                      <div className='card-body pb-2'>
                        {newPlayerErrors.general && (
                          <div className='alert alert-danger mb-3'>
                            <i className='ti ti-alert-circle me-2' />
                            {newPlayerErrors.general}
                          </div>
                        )}
                        <div className='d-block d-xl-flex'>
                          <div className='mb-3 flex-fill me-xl-3 me-0'>
                            <NameInput
                              value={newPlayerForm.fullName}
                              onChange={(val) =>
                                handleNewPlayerChange({
                                  target: { name: 'fullName', value: val },
                                } as React.ChangeEvent<HTMLInputElement>)
                              }
                              error={newPlayerErrors.fullName}
                              required
                            />
                          </div>
                          <div className='mb-3 flex-fill'>
                            <label className='form-label'>
                              Gender <span className='text-danger'>*</span>
                            </label>
                            <select
                              className={`form-control ${newPlayerErrors.gender ? 'is-invalid' : ''}`}
                              name='gender'
                              value={newPlayerForm.gender}
                              onChange={handleNewPlayerChange}
                            >
                              <option value=''>Select Gender</option>
                              <option value='Male'>Male</option>
                              <option value='Female'>Female</option>
                            </select>
                            {newPlayerErrors.gender && (
                              <div className='invalid-feedback d-block'>
                                {newPlayerErrors.gender}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className='d-block d-xl-flex'>
                          <div className='mb-3 flex-fill me-xl-3 me-0'>
                            <label className='form-label'>
                              Date of Birth{' '}
                              <span className='text-danger'>*</span>
                            </label>
                            <input
                              type='date'
                              className={`form-control ${newPlayerErrors.dob ? 'is-invalid' : ''}`}
                              name='dob'
                              value={newPlayerForm.dob}
                              onChange={handleNewPlayerChange}
                            />
                            {newPlayerErrors.dob && (
                              <div className='invalid-feedback d-block'>
                                {newPlayerErrors.dob}
                              </div>
                            )}
                          </div>
                          <div className='mb-3 flex-fill'>
                            <label className='form-label'>
                              School Name <span className='text-danger'>*</span>
                            </label>
                            <SchoolAutocomplete
                              value={newPlayerForm.schoolName}
                              onChange={handleNewPlayerSchoolChange}
                            />
                            {newPlayerErrors.schoolName && (
                              <div className='invalid-feedback d-block'>
                                {newPlayerErrors.schoolName}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className='d-block d-xl-flex'>
                          <div
                            className='mb-3 me-xl-3 me-0'
                            style={{ minWidth: '160px' }}
                          >
                            <label className='form-label'>
                              Grade <span className='text-danger'>*</span>
                            </label>
                            <select
                              className={`form-control ${newPlayerErrors.grade ? 'is-invalid' : ''}`}
                              name='grade'
                              value={newPlayerForm.grade}
                              onChange={handleNewPlayerChange}
                            >
                              <option value=''>Select Grade</option>
                              <option value='PK'>Pre-Kindergarten</option>
                              <option value='K'>Kindergarten</option>
                              {Array.from({ length: 12 }, (_, i) => i + 1).map(
                                (g) => (
                                  <option key={g} value={`${g}`}>
                                    {g}
                                    {g === 1
                                      ? 'st'
                                      : g === 2
                                        ? 'nd'
                                        : g === 3
                                          ? 'rd'
                                          : 'th'}{' '}
                                    Grade
                                  </option>
                                ),
                              )}
                            </select>
                            {newPlayerForm.dob &&
                              !newPlayerForm.isGradeOverridden && (
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
                            {newPlayerErrors.grade && (
                              <div className='invalid-feedback d-block'>
                                {newPlayerErrors.grade}
                              </div>
                            )}
                          </div>
                          <div className='mb-3 flex-fill me-xl-3 me-0'>
                            <label className='form-label'>
                              Health Concerns
                            </label>
                            <input
                              type='text'
                              className='form-control'
                              name='healthConcerns'
                              value={newPlayerForm.healthConcerns}
                              onChange={handleNewPlayerChange}
                              placeholder='Allergies, medications, etc.'
                            />
                          </div>
                          <div className='mb-3' style={{ minWidth: '140px' }}>
                            <label className='form-label'>AAU Number</label>
                            <input
                              type='text'
                              className='form-control'
                              name='aauNumber'
                              value={newPlayerForm.aauNumber}
                              onChange={handleNewPlayerChange}
                              placeholder='If applicable'
                            />
                          </div>
                        </div>
                        <div className='d-flex gap-2 mb-3'>
                          <button
                            type='button'
                            className='btn btn-primary btn-sm'
                            onClick={handleAddPlayerSubmit}
                            disabled={isSavingPlayer}
                          >
                            {isSavingPlayer ? (
                              <>
                                <span className='spinner-border spinner-border-sm me-2' />
                                Saving...
                              </>
                            ) : (
                              <>
                                <i className='ti ti-device-floppy me-2' />
                                Save Player
                              </>
                            )}
                          </button>
                          <button
                            type='button'
                            className='btn btn-outline-secondary btn-sm'
                            onClick={handleCancelAddPlayer}
                            disabled={isSavingPlayer}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
