// profilesettings.tsx
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { all_routes } from '../../router/all_routes';
import { OverlayTrigger, Tooltip, Alert } from 'react-bootstrap';
import axios from 'axios';
import Swal from 'sweetalert2';
import Select from 'react-select';
import { useAuth } from '../../../context/AuthContext';
import { FormData as FormDataType, Player } from '../../../types/types';
import { Address, ensureAddress } from '../../../utils/address';
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
import { getDefaultAvatar, getAvatarUrl } from '../../../utils/r2Utils';
import { useAvatar } from '../../hooks/useAvatar';
import { calculateGradeFromDOB } from '../../../utils/registration-utils';
import SchoolAutocomplete from '../../../components/SchoolAutocomplete';
import NameInput from '../../../components/NameInput';
import { commonHealthConditions } from '../../constants/healthConditions';

export interface Guardian {
  _id?: string;
  fullName: string;
  email: string;
  phone: string;
  relationship: string;
  address: Address | string;
  isCoach?: boolean;
  aauNumber?: string;
  avatar?: string;
}

export interface FormData {
  fullName: string;
  email: string;
  phone: string;
  address: Address;
  relationship: string;
  isCoach: boolean;
  aauNumber: string;
}

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

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
const DEFAULT_AVATAR = getDefaultAvatar('parent');

// Custom styles for react-select
const selectStyles = {
  control: (base: any) => ({
    ...base,
    minHeight: '38px',
    borderColor: '#d9d9d9',
    '&:hover': { borderColor: '#40a9ff' },
  }),
};

const Profilesettings = () => {
  const routes = all_routes;
  const {
    parent,
    fetchParentData,
    fetchPlayersData,
    players,
    isLoading,
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

  // ── Add-player state ──────────────────────────────────────────────────────
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

  // ── Edit-player state ─────────────────────────────────────────────────────
  const [isEditingPlayer, setIsEditingPlayer] = useState<string | null>(null);
  const [playerFormData, setPlayerFormData] = useState<Player | null>(null);
  const [playerErrors, setPlayerErrors] = useState<Record<string, string>>({});

  const [guardianErrors, setGuardianErrors] = useState<
    Record<number, Record<string, string>>
  >({});
  const [editedGuardians, setEditedGuardians] = useState<Guardian[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<FormDataType>({
    fullName: '',
    email: '',
    phone: '',
    address: { street: '', street2: '', city: '', state: '', zip: '' },
    relationship: '',
    isCoach: false,
    aauNumber: '',
  });
  const [saveStatus, setSaveStatus] = useState<{
    show: boolean;
    variant: 'success' | 'danger';
    message: string;
  }>({ show: false, variant: 'success', message: '' });

  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (saveStatus.show) {
      const timer = setTimeout(
        () => setSaveStatus((prev) => ({ ...prev, show: false })),
        5000,
      );
      return () => clearTimeout(timer);
    }
  }, [saveStatus.show]);

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
      parent.additionalGuardians?.map((g) => ({
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

  // ── Enhanced health conditions helpers ────────────────────────────────────

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
      setSaveStatus({
        show: true,
        variant: 'success',
        message: 'Guardian avatar updated successfully!',
      });
    } catch (err) {
      console.error('Guardian avatar upload failed:', err);
      setGuardianAvatarPreviews((prev) => {
        const n = { ...prev };
        delete n[index];
        return n;
      });
      setSaveStatus({
        show: true,
        variant: 'danger',
        message: 'Failed to upload guardian avatar. Please try again.',
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
      setSaveStatus({
        show: true,
        variant: 'success',
        message: 'Guardian avatar removed successfully!',
      });
    } catch (err) {
      console.error('Guardian avatar delete failed:', err);
      setSaveStatus({
        show: true,
        variant: 'danger',
        message: 'Failed to remove guardian avatar. Please try again.',
      });
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
      const playerIds =
        parent?.players?.map((p: any) => (typeof p === 'string' ? p : p._id)) ||
        [];
      if (playerIds.length > 0) await fetchPlayersData(playerIds);
      setSaveStatus({
        show: true,
        variant: 'success',
        message: 'Player avatar updated successfully!',
      });
    } catch (err) {
      console.error('Player avatar upload failed:', err);
      setPlayerAvatarPreviews((prev) => {
        const n = { ...prev };
        delete n[playerId];
        return n;
      });
      setSaveStatus({
        show: true,
        variant: 'danger',
        message: 'Failed to upload player avatar. Please try again.',
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
      setSaveStatus({
        show: true,
        variant: 'success',
        message: 'Player avatar removed successfully!',
      });
    } catch (err) {
      console.error('Player avatar delete failed:', err);
      setSaveStatus({
        show: true,
        variant: 'danger',
        message: 'Failed to remove player avatar. Please try again.',
      });
    } finally {
      setPlayerAvatarUploading((prev) => ({ ...prev, [playerId]: false }));
    }
  };

  // ── Edit-player handlers ──────────────────────────────────────────────────

  const validatePlayerForm = (): boolean => {
    if (!playerFormData) return false;
    const errs: Record<string, string> = {};
    if (!validateName(playerFormData.fullName))
      errs.fullName = 'Please enter a valid name (min 2 characters)';
    if (!validateRequired(playerFormData.gender))
      errs.gender = 'Gender is required';
    if (!validateDateOfBirth(playerFormData.dob))
      errs.dob = 'Please enter a valid date of birth';
    if (!validateRequired(playerFormData.schoolName))
      errs.schoolName = 'School name is required';
    if (!validateGrade(playerFormData.grade || ''))
      errs.grade = 'Please select a valid grade (1-12)';
    setPlayerErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handlePlayerInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setPlayerFormData((prev) => (prev ? { ...prev, [name]: value } : null));
    if (playerErrors[name])
      setPlayerErrors((prev) => {
        const n = { ...prev };
        delete n[name];
        return n;
      });
  };

  const handleDeletePlayer = async (playerId: string) => {
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
      const playerIds =
        parent?.players
          ?.map((p: any) => (typeof p === 'string' ? p : p._id))
          .filter((id: string) => id !== playerId) || [];
      if (parentId) await fetchParentData(parentId);
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

  const handlePlayerInfoSubmit = async (playerId: string) => {
    if (!validatePlayerForm()) return;
    try {
      if (!token || !playerFormData) return;

      // Use the correct endpoint - plural 'players'
      await axios.put(
        `${API_BASE_URL}/players/${playerId}`,
        { ...playerFormData, grade: playerFormData.grade || '' },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setIsEditingPlayer(null);
      const playerIds =
        parent?.players?.map((p: any) => (typeof p === 'string' ? p : p._id)) ||
        [];
      await fetchPlayersData(playerIds);
      setSaveStatus({
        show: true,
        variant: 'success',
        message: 'Player updated successfully!',
      });
    } catch (error) {
      console.error('Error updating player:', error);
      setSaveStatus({
        show: true,
        variant: 'danger',
        message: 'Failed to update player. Please try again.',
      });
    }
  };

  // ── New-player helpers ────────────────────────────────────────────────────

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

      // Reset new player form with health conditions
      setNewPlayerForm(createEmptyPlayer());
      setNewPlayerSelectedConditions([]);
      setNewPlayerCustomCondition('');
      setNewPlayerShowCustomInput(false);
      setNewPlayerErrors({});
      setShowAddPlayerForm(false);

      setSaveStatus({
        show: true,
        variant: 'success',
        message: 'Player added successfully!',
      });
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

  // ── Form handlers ─────────────────────────────────────────────────────────

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = e.target.value.replace(/\D/g, '');
    setFormData((prev) => ({ ...prev, phone: formatPhoneNumber(cleaned) }));
    if (errors.phone)
      setErrors((prev) => {
        const n = { ...prev };
        delete n.phone;
        return n;
      });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    const updatedValue =
      name === 'phone' ? formatPhoneNumber(value.replace(/\D/g, '')) : value;
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

  const handlePersonalInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      setSaveStatus({
        show: true,
        variant: 'danger',
        message: 'Please fix the errors in the form before saving',
      });
      return;
    }
    const allGuardiansValid = editedGuardians.every((_, i) =>
      validateGuardianForm(i),
    );
    if (!allGuardiansValid) {
      setSaveStatus({
        show: true,
        variant: 'danger',
        message: 'Please fix the errors in guardian information before saving',
      });
      return;
    }
    try {
      if (!parentId || !token || !parent) {
        setSaveStatus({
          show: true,
          variant: 'danger',
          message: 'Authentication error. Please try again.',
        });
        return;
      }
      const guardiansToSave = editedGuardians.map((g) => ({
        ...g,
        phone: g.phone.replace(/\D/g, ''),
        address: ensureAddress(g.address),
        isCoach: g.isCoach || false,
        aauNumber: g.isCoach ? g.aauNumber || '' : '',
      }));
      await Promise.all([
        axios.put(
          `${API_BASE_URL}/parent/${parentId}`,
          {
            ...formData,
            phone: formData.phone.replace(/\D/g, ''),
            address: ensureAddress(formData.address),
          },
          { headers: { Authorization: `Bearer ${token}` } },
        ),
        axios.put(
          `${API_BASE_URL}/parent/${parentId}/guardians`,
          { additionalGuardians: guardiansToSave },
          { headers: { Authorization: `Bearer ${token}` } },
        ),
      ]);
      fetchParentData(parentId);
      setSaveStatus({
        show: true,
        variant: 'success',
        message: 'Profile updated successfully!',
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      let message = 'Failed to update profile. Please try again.';
      if (axios.isAxiosError(error)) {
        if (error.response?.data?.error) message = error.response.data.error;
        else if (error.response?.data?.errors)
          message = error.response.data.errors
            .map((e: any) => e.msg)
            .join(', ');
      }
      setSaveStatus({ show: true, variant: 'danger', message });
    }
  };

  const removeGuardian = async (index: number) => {
    try {
      if (!parentId || !token) throw new Error('Authentication required');
      const updatedGuardians = editedGuardians.filter((_, i) => i !== index);
      await axios.put(
        `${API_BASE_URL}/parent/${parentId}`,
        {
          additionalGuardians: updatedGuardians.map((g) => ({
            ...g,
            phone: g.phone.replace(/\D/g, ''),
            address: ensureAddress(g.address),
          })),
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setEditedGuardians(updatedGuardians);
      setGuardianErrors((prev) => {
        const n = { ...prev };
        delete n[index];
        return n;
      });
      setGuardianAvatarPreviews((prev) => {
        const n = { ...prev };
        delete n[index];
        return n;
      });
      setSaveStatus({
        show: true,
        variant: 'success',
        message: 'Guardian removed successfully!',
      });
      fetchParentData(parentId);
    } catch (error) {
      console.error('Error removing guardian:', error);
      setSaveStatus({
        show: true,
        variant: 'danger',
        message: 'Failed to remove guardian. Please try again.',
      });
    }
  };

  const handleGuardianInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number,
  ) => {
    const { name, value, type, checked } = e.target;
    const updatedValue =
      name === 'phone' ? formatPhoneNumber(value.replace(/\D/g, '')) : value;
    setEditedGuardians((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [name]: type === 'checkbox' ? checked : updatedValue,
      };
      if (name === 'aauNumber') updated[index].isCoach = !!updatedValue.trim();
      else if (name === 'isCoach' && !checked) updated[index].aauNumber = '';
      return updated;
    });
    if (guardianErrors[index]?.[name])
      setGuardianErrors((prev) => {
        const n = { ...prev };
        if (n[index]) delete n[index][name];
        return n;
      });
  };

  const handleGuardianAddressChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number,
    field: keyof Address,
  ) => {
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

  const addNewGuardian = () => {
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
  };

  const handleAvatarChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const newAvatarUrl = await uploadAvatar(file);
      if (newAvatarUrl && parent)
        updateParent({ ...parent, avatar: newAvatarUrl });
      if (parentId) await fetchParentData(parentId);
      setSaveStatus({
        show: true,
        variant: 'success',
        message: 'Profile picture updated successfully!',
      });
    } catch (error: any) {
      console.error('Avatar upload failed:', error);
      setSaveStatus({
        show: true,
        variant: 'danger',
        message:
          error.response?.data?.error ||
          error.message ||
          'Failed to update profile picture.',
      });
    } finally {
      e.target.value = '';
    }
  };

  const handleDeleteAvatar = async (): Promise<void> => {
    try {
      await deleteAvatar();
      if (parent) {
        const { avatar, ...parentWithoutAvatar } = parent;
        updateParent(parentWithoutAvatar);
      }
      if (parentId) await fetchParentData(parentId);
      setSaveStatus({
        show: true,
        variant: 'success',
        message: 'Profile picture removed successfully!',
      });
    } catch (error: any) {
      console.error('Deletion failed:', error);
      setSaveStatus({
        show: true,
        variant: 'danger',
        message:
          error.response?.data?.error || 'Failed to remove profile picture.',
      });
    }
  };

  const handleDeleteProfile = async () => {
    if (deleteConfirmationText !== 'DELETE') {
      setSaveStatus({
        show: true,
        variant: 'danger',
        message: 'Please type DELETE to confirm',
      });
      return;
    }

    setIsDeleting(true);
    try {
      const token = localStorage.getItem('token');
      const parentId = localStorage.getItem('parentId');

      if (!token || !parentId) {
        throw new Error('Authentication required');
      }

      // Delete the parent account
      await axios.delete(`${API_BASE_URL}/parent/${parentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Clear local storage
      localStorage.removeItem('token');
      localStorage.removeItem('parentId');
      localStorage.removeItem('userRole');

      // Show success message
      setSaveStatus({
        show: true,
        variant: 'success',
        message:
          'Your account has been successfully deleted. Redirecting to home page...',
      });

      // Redirect to home page after 2 seconds
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } catch (error: any) {
      console.error('Error deleting profile:', error);
      setSaveStatus({
        show: true,
        variant: 'danger',
        message:
          error.response?.data?.error ||
          'Failed to delete profile. Please try again.',
      });
      setShowDeleteConfirmation(false);
      setDeleteConfirmationText('');
    } finally {
      setIsDeleting(false);
    }
  };

  //Function to open the delete confirmation modal
  const openDeleteConfirmation = () => {
    setShowDeleteConfirmation(true);
    setDeleteConfirmationText('');
  };

  //Function to close the delete confirmation modal
  const closeDeleteConfirmation = () => {
    setShowDeleteConfirmation(false);
    setDeleteConfirmationText('');
  };

  if (isLoading) return <div>Loading...</div>;
  if (!parent) return <div>No parent data found.</div>;

  return (
    <div className='page-wrapper'>
      <div className='content'>
        {saveStatus.show && (
          <Alert
            variant={saveStatus.variant}
            onClose={() => setSaveStatus((prev) => ({ ...prev, show: false }))}
            dismissible
            className='mt-3'
          >
            {saveStatus.message}
          </Alert>
        )}

        <div className='d-md-flex d-block align-items-center justify-content-between border-bottom pb-3'>
          <div className='my-auto mb-2'>
            <h3 className='page-title mb-1'>General Settings</h3>
            <nav>
              <ol className='breadcrumb mb-0'>
                <li className='breadcrumb-item'>
                  <Link to={routes.adminDashboard}>Dashboard</Link>
                </li>
                <li className='breadcrumb-item'>
                  <Link to='#'>Settings</Link>
                </li>
                <li className='breadcrumb-item active' aria-current='page'>
                  General Settings
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
                >
                  <i className='ti ti-refresh' />
                </Link>
              </OverlayTrigger>
            </div>
          </div>
        </div>

        <div className='row'>
          <div className='col-xxl-2 col-xl-3'>
            <div className='pt-3 d-flex flex-column list-group mb-4'>
              <Link
                to={routes.profilesettings}
                className='d-block rounded p-2 active'
              >
                Profile Settings
              </Link>
              <Link
                to={routes.securitysettings}
                className='d-block rounded p-2'
              >
                Security Settings
              </Link>
              <Link
                to={routes.notificationssettings}
                className='d-block rounded p-2'
              >
                Notifications
              </Link>
              <button
                onClick={openDeleteConfirmation}
                className='d-block rounded p-2 text-start border-0 bg-transparent text-danger'
                style={{ cursor: 'pointer' }}
              >
                <i className='ti ti-trash me-2'></i>
                Delete Profile
              </button>
            </div>
          </div>

          <div className='col-xxl-10 col-xl-9'>
            <div className='flex-fill border-start ps-3'>
              <form onSubmit={handlePersonalInfoSubmit}>
                <div className='d-flex align-items-center justify-content-between flex-wrap border-bottom pt-3 mb-3'>
                  <div className='mb-3'>
                    <h5 className='mb-1'>Profile Settings</h5>
                    <p>Upload your photo &amp; personal details here</p>
                  </div>
                  <div className='mb-3'>
                    <button className='btn btn-primary' type='submit'>
                      Save Changes
                    </button>
                  </div>
                </div>

                <div className='d-md-flex d-block'>
                  <div className='flex-fill'>
                    {/* ── Personal info card ── */}
                    <div className='card'>
                      <div className='card-header p-3'>
                        <h5>Personal Information</h5>
                      </div>
                      <div className='card-body p-3 pb-0'>
                        <div className='d-block d-xl-flex'>
                          <div className='mb-3 flex-fill me-xl-3 me-0'>
                            <NameInput
                              value={formData.fullName}
                              onChange={(val) =>
                                handleInputChange({
                                  target: { name: 'fullName', value: val },
                                } as React.ChangeEvent<HTMLInputElement>)
                              }
                              error={errors.fullName}
                            />
                          </div>
                          <div className='mb-3 flex-fill'>
                            <label className='form-label'>Email Address</label>
                            <input
                              type='email'
                              className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                              name='email'
                              value={formData.email}
                              onChange={handleInputChange}
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
                              onChange={handlePhoneChange}
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
                            <label className='form-label'>
                              Relationship to Player
                            </label>
                            <input
                              type='text'
                              className={`form-control ${errors.relationship ? 'is-invalid' : ''}`}
                              name='relationship'
                              value={formData.relationship}
                              onChange={handleInputChange}
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
                              value={formData.aauNumber || ''}
                              onChange={handleInputChange}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ── Address card ── */}
                    <div className='card'>
                      <div className='card-header p-3'>
                        <h5>Address Information</h5>
                      </div>
                      <div className='card-body p-3 pb-0'>
                        <div className='row mb-3'>
                          <div className='col-md-8'>
                            <label className='form-label'>Street Address</label>
                            <input
                              type='text'
                              className={`form-control ${errors['address.street'] ? 'is-invalid' : ''}`}
                              value={formData.address.street}
                              onChange={(e) => handleAddressChange(e, 'street')}
                              placeholder='123 Main St'
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
                              onChange={(e) =>
                                handleAddressChange(e, 'street2')
                              }
                              placeholder='Apt 4B'
                            />
                          </div>
                        </div>
                        <div className='row mb-3'>
                          <div className='col-md-5'>
                            <label className='form-label'>City</label>
                            <input
                              type='text'
                              className={`form-control ${errors['address.city'] ? 'is-invalid' : ''}`}
                              value={formData.address.city}
                              onChange={(e) => handleAddressChange(e, 'city')}
                              placeholder='Seattle'
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
                              placeholder='WA'
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
                              placeholder='98101'
                            />
                            {errors['address.zip'] && (
                              <div className='invalid-feedback d-block'>
                                {errors['address.zip']}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ── Guardians card ── */}
                    <div className='card mt-3'>
                      <div className='card-header d-flex justify-content-between align-items-center'>
                        <h5>Additional Parent/Guardian Information</h5>
                        {editedGuardians.length === 0 ? (
                          <button
                            type='button'
                            className='btn btn-primary btn-sm'
                            onClick={addNewGuardian}
                          >
                            <i className='ti ti-plus me-2' /> Add
                            Parent/Guardian
                          </button>
                        ) : (
                          editedGuardians.map((_, index) => (
                            <button
                              key={index}
                              type='button'
                              className='btn btn-danger btn-sm'
                              onClick={() => removeGuardian(index)}
                            >
                              <i className='ti ti-trash me-1' /> Remove
                            </button>
                          ))
                        )}
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
                                  <div className='card-header'>
                                    <h5>
                                      {guardian.fullName || 'New Guardian'}
                                    </h5>
                                  </div>
                                  <div className='card-body pb-0'>
                                    {renderAvatarBlock({
                                      displayAvatar,
                                      isUploading: isGuardianUploading,
                                      hasSavedId,
                                      defaultAvatar: DEFAULT_AVATAR,
                                      inputRef: (el) => {
                                        guardianFileInputRefs.current[index] =
                                          el;
                                      },
                                      onFileChange: (e) =>
                                        handleGuardianAvatarChange(e, index),
                                      onDelete: () =>
                                        handleGuardianAvatarDelete(index),
                                    })}
                                    <div className='d-block d-xl-flex'>
                                      <div className='mb-3 flex-fill me-xl-3 me-0'>
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
                                          error={
                                            guardianErrors[index]?.fullName
                                          }
                                        />
                                      </div>
                                      <div className='mb-3 flex-fill'>
                                        <label className='form-label'>
                                          Email
                                        </label>
                                        <input
                                          type='email'
                                          className={`form-control ${guardianErrors[index]?.email ? 'is-invalid' : ''}`}
                                          value={guardian.email}
                                          onChange={(e) =>
                                            handleGuardianInputChange(e, index)
                                          }
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
                                          name='relationship'
                                        />
                                        {guardianErrors[index]
                                          ?.relationship && (
                                          <div className='invalid-feedback d-block'>
                                            {guardianErrors[index].relationship}
                                          </div>
                                        )}
                                      </div>
                                      <div className='mb-3 flex-fill'>
                                        <label className='form-label'>
                                          AAU Number
                                        </label>
                                        <input
                                          type='text'
                                          className='form-control'
                                          value={guardian.aauNumber || ''}
                                          onChange={(e) =>
                                            handleGuardianInputChange(e, index)
                                          }
                                          name='aauNumber'
                                          placeholder='Entering an AAU number will mark as coach'
                                        />
                                      </div>
                                    </div>
                                    <div className='mb-3 flex-fill'>
                                      <div className='row mb-3'>
                                        <div className='col-md-8'>
                                          <label className='form-label'>
                                            Street Address
                                          </label>
                                          <input
                                            type='text'
                                            className={`form-control ${guardianErrors[index]?.['address.street'] ? 'is-invalid' : ''}`}
                                            value={
                                              ensureAddress(guardian.address)
                                                .street
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
                                          <label className='form-label'>
                                            City
                                          </label>
                                          <input
                                            type='text'
                                            className={`form-control ${guardianErrors[index]?.['address.city'] ? 'is-invalid' : ''}`}
                                            value={
                                              ensureAddress(guardian.address)
                                                .city
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
                                              ensureAddress(guardian.address)
                                                .state
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
                                              ensureAddress(guardian.address)
                                                .zip
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
                                              {
                                                guardianErrors[index][
                                                  'address.zip'
                                                ]
                                              }
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <p className='mb-4'>
                            No additional guardians registered.
                          </p>
                        )}
                        {editedGuardians.length > 0 && (
                          <div className='mb-3'>
                            <button
                              type='button'
                              className='btn btn-outline-primary btn-sm'
                              onClick={addNewGuardian}
                            >
                              <i className='ti ti-plus me-1' /> Add Another
                              Guardian
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ── Players card ── */}
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
                        {/* Existing players — editable, with avatar, matching guardian style */}
                        {players && players.length > 0
                          ? players.map((player: Player) => {
                              const defaultPlayerAvatar = getDefaultAvatar(
                                'player',
                                player.gender as 'Male' | 'Female',
                              );
                              const displayPlayerAvatar =
                                playerAvatarPreviews[player._id] ||
                                (player.avatar
                                  ? getAvatarUrl(
                                      player.avatar,
                                      defaultPlayerAvatar,
                                    )
                                  : null);
                              const isPlayerAvatarLoading =
                                playerAvatarUploading[player._id] ?? false;

                              return (
                                <div key={player._id} className='mb-4'>
                                  <div className='card'>
                                    <div className='card-header d-flex align-items-center justify-content-between'>
                                      <h5 className='mb-0'>
                                        {player.fullName}
                                      </h5>
                                      <button
                                        type='button'
                                        className='btn btn-outline-danger btn-sm'
                                        onClick={() =>
                                          handleDeletePlayer(player._id)
                                        }
                                        disabled={
                                          playerAvatarUploading[player._id]
                                        }
                                      >
                                        <i className='ti ti-trash me-1' />
                                        Remove Player
                                      </button>
                                    </div>
                                    <div className='card-body pb-0'>
                                      {/* Player avatar — same block as guardian */}
                                      {renderAvatarBlock({
                                        displayAvatar: displayPlayerAvatar,
                                        isUploading: isPlayerAvatarLoading,
                                        hasSavedId: true,
                                        defaultAvatar: defaultPlayerAvatar,
                                        inputRef: (el) => {
                                          playerFileInputRefs.current[
                                            player._id
                                          ] = el;
                                        },
                                        onFileChange: (e) =>
                                          handlePlayerAvatarChange(
                                            e,
                                            player._id,
                                          ),
                                        onDelete: () =>
                                          handlePlayerAvatarDelete(player._id),
                                      })}

                                      {/* Player fields — always editable via Edit/Save buttons, not the form submit */}
                                      <div className='d-block d-xl-flex'>
                                        <div className='mb-3 flex-fill me-xl-3 me-0'>
                                          {isEditingPlayer === player._id ? (
                                            <NameInput
                                              value={
                                                playerFormData?.fullName || ''
                                              }
                                              onChange={(val) =>
                                                handlePlayerInputChange({
                                                  target: {
                                                    name: 'fullName',
                                                    value: val,
                                                  },
                                                } as React.ChangeEvent<
                                                  | HTMLInputElement
                                                  | HTMLSelectElement
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
                                          <label className='form-label'>
                                            Gender
                                          </label>
                                          <select
                                            className={`form-control ${playerErrors.gender ? 'is-invalid' : ''}`}
                                            name='gender'
                                            value={
                                              isEditingPlayer === player._id
                                                ? playerFormData?.gender || ''
                                                : player.gender
                                            }
                                            onChange={handlePlayerInputChange}
                                            disabled={
                                              isEditingPlayer !== player._id
                                            }
                                          >
                                            <option value=''>
                                              Select Gender
                                            </option>
                                            <option value='Male'>Male</option>
                                            <option value='Female'>
                                              Female
                                            </option>
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
                                                ? playerFormData?.dob?.split(
                                                    'T',
                                                  )[0] || ''
                                                : player.dob?.split('T')[0] ||
                                                  ''
                                            }
                                            onChange={handlePlayerInputChange}
                                            disabled={
                                              isEditingPlayer !== player._id
                                            }
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
                                                ? playerFormData?.schoolName ||
                                                  ''
                                                : player.schoolName
                                            }
                                            onChange={handlePlayerInputChange}
                                            disabled={
                                              isEditingPlayer !== player._id
                                            }
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
                                          <label className='form-label'>
                                            Grade
                                          </label>
                                          <select
                                            name='grade'
                                            className={`form-control ${playerErrors.grade ? 'is-invalid' : ''}`}
                                            value={
                                              isEditingPlayer === player._id
                                                ? playerFormData?.grade || ''
                                                : player.grade || ''
                                            }
                                            onChange={handlePlayerInputChange}
                                            disabled={
                                              isEditingPlayer !== player._id
                                            }
                                          >
                                            <option value=''>
                                              Select Grade
                                            </option>
                                            <option value='PK'>Pre-K</option>
                                            <option value='K'>K</option>
                                            {[...Array(12)].map((_, i) => (
                                              <option
                                                key={i + 1}
                                                value={`${i + 1}`}
                                              >
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
                                                ? playerFormData?.aauNumber ||
                                                  ''
                                                : player.aauNumber || ''
                                            }
                                            onChange={handlePlayerInputChange}
                                            disabled={
                                              isEditingPlayer !== player._id
                                            }
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
                                                    options={
                                                      commonHealthConditions
                                                    }
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
                                                      isEditingPlayer !==
                                                      player._id
                                                    }
                                                  />
                                                  <small className='text-muted'>
                                                    Select all that apply
                                                  </small>
                                                </div>

                                                {playerShowCustomInput[
                                                  player._id
                                                ] && (
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
                                                        isEditingPlayer !==
                                                        player._id
                                                      }
                                                    />
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Edit/Save button — type='button' so it never fires the parent form submit */}
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
                                          <i className='ti ti-edit me-2' /> Save
                                          Changes
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

                        {/* ── Add New Player inline form with enhanced health conditions ── */}
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
                                          target: {
                                            name: 'fullName',
                                            value: val,
                                          },
                                        } as React.ChangeEvent<
                                          HTMLInputElement | HTMLSelectElement
                                        >)
                                      }
                                      error={newPlayerErrors.fullName}
                                      required
                                    />
                                  </div>
                                  <div className='mb-3 flex-fill'>
                                    <label className='form-label'>
                                      Gender{' '}
                                      <span className='text-danger'>*</span>
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
                                      School Name{' '}
                                      <span className='text-danger'>*</span>
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
                                      Grade{' '}
                                      <span className='text-danger'>*</span>
                                    </label>
                                    <select
                                      className={`form-control ${newPlayerErrors.grade ? 'is-invalid' : ''}`}
                                      name='grade'
                                      value={newPlayerForm.grade}
                                      onChange={handleNewPlayerChange}
                                    >
                                      <option value=''>Select Grade</option>
                                      <option value='PK'>
                                        Pre-Kindergarten
                                      </option>
                                      <option value='K'>Kindergarten</option>
                                      {Array.from(
                                        { length: 12 },
                                        (_, i) => i + 1,
                                      ).map((g) => (
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
                                      ))}
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
                                  <div
                                    className='mb-3'
                                    style={{ minWidth: '140px' }}
                                  >
                                    <label className='form-label'>
                                      AAU Number
                                    </label>
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

                                {/* ── New Player Health Conditions Section ── */}
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
                                                newPlayerSelectedConditions
                                              }
                                              onChange={
                                                handleNewPlayerConditionChange
                                              }
                                              styles={selectStyles}
                                              placeholder='Select health conditions...'
                                            />
                                            <small className='text-muted'>
                                              Select all that apply
                                            </small>
                                          </div>

                                          {newPlayerShowCustomInput && (
                                            <div className='mb-3'>
                                              <label className='form-label'>
                                                Specify Other Condition(s)
                                              </label>
                                              <input
                                                type='text'
                                                className='form-control'
                                                value={newPlayerCustomCondition}
                                                onChange={
                                                  handleNewPlayerCustomConditionChange
                                                }
                                                placeholder='Please describe any other health conditions...'
                                              />
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <div className='d-flex gap-2 mb-3 mt-3'>
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

                  {/* ── Avatar sidebar ── */}
                  <div className='settings-right-sidebar ms-md-3'>
                    <div className='card'>
                      <div className='card-header p-3'>
                        <h5>Profile Avatar</h5>
                      </div>
                      <div className='card-body p-3 pb-0 mb-3'>
                        <div className='settings-profile-upload'>
                          <span className='profile-pic'>
                            <img
                              src={avatarSrc}
                              alt='Profile'
                              className='profile-image'
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  DEFAULT_AVATAR;
                              }}
                            />
                          </span>
                          <div className='title-upload'>
                            <h5>Edit Your Avatar</h5>
                            <Link
                              to='#'
                              className='me-2'
                              onClick={handleDeleteAvatar}
                            >
                              Delete
                            </Link>
                            <Link
                              to='#'
                              className='text-primary'
                              onClick={() =>
                                document
                                  .getElementById('avatar-upload-settings')
                                  ?.click()
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
                            <h6>JPG, PNG or WEBP</h6>
                            <h6>(Max 5MB)</h6>
                          </div>
                          <input
                            type='file'
                            className='form-control'
                            id='avatar-upload-settings'
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
                            <div className='mt-2 text-primary'>
                              Uploading...
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
      {/* Delete Profile Confirmation Modal */}
      {showDeleteConfirmation && (
        <div
          className='modal show d-block'
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <div className='modal-dialog modal-dialog-centered'>
            <div className='modal-content'>
              <div className='modal-header'>
                <h5 className='modal-title text-danger'>
                  <i className='ti ti-alert-triangle me-2'></i>
                  Delete Profile
                </h5>
                <button
                  type='button'
                  className='btn-close'
                  onClick={closeDeleteConfirmation}
                ></button>
              </div>
              <div className='modal-body'>
                <div className='alert alert-danger'>
                  <strong>Warning:</strong> This action cannot be undone.
                </div>

                <p className='mb-3'>
                  Deleting your profile will permanently remove:
                </p>

                <ul className='mb-3'>
                  <li>Your personal information</li>
                  <li>All guardian information</li>
                  <li>All player profiles associated with your account</li>
                  <li>Registration history and payment records</li>
                </ul>

                <div className='bg-light p-3 rounded mb-3'>
                  <p className='mb-2'>
                    To confirm, please type <strong>DELETE</strong> in the box
                    below:
                  </p>
                  <input
                    type='text'
                    className='form-control'
                    value={deleteConfirmationText}
                    onChange={(e) => setDeleteConfirmationText(e.target.value)}
                    placeholder='Type DELETE to confirm'
                    disabled={isDeleting}
                  />
                </div>

                {saveStatus.show && saveStatus.variant === 'danger' && (
                  <div className='alert alert-danger p-2 mt-2'>
                    {saveStatus.message}
                  </div>
                )}
              </div>
              <div className='modal-footer'>
                <button
                  type='button'
                  className='btn btn-secondary me-2'
                  onClick={closeDeleteConfirmation}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  type='button'
                  className='btn btn-danger'
                  onClick={handleDeleteProfile}
                  disabled={deleteConfirmationText !== 'DELETE' || isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <span className='spinner-border spinner-border-sm me-2' />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <i className='ti ti-trash me-2' />
                      Permanently Delete Profile
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profilesettings;
