// index.tsx
import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { OverlayTrigger, Tooltip, Alert } from 'react-bootstrap';
import axios from 'axios';
import Swal from 'sweetalert2';
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
import PlayerForm from '../../../components/forms/PlayerForm';
import NameInput from '../../../components/NameInput';
import { useDynamicFormFields } from '../../../feature-module/hooks/useDynamicFormFields';
import { VisibleField } from '../../../types/form-config.types';

// Import the registration Player type
import { Player as RegistrationPlayer } from '../../../types/registration-types';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

// ── Type conversion utilities ────────────────────────────────────────────────
const convertToRegistrationPlayer = (player: Player): RegistrationPlayer => {
  return {
    _id: player._id,
    fullName: player.fullName || '',
    gender: player.gender || '',
    dob: player.dob ? player.dob.split('T')[0] : '',
    schoolName: player.schoolName || '',
    healthConcerns: player.healthConcerns || '',
    aauNumber: player.aauNumber || '',
    registrationYear: new Date().getFullYear(),
    season: 'N/A',
    grade: player.grade || '',
    isGradeOverridden: false,
    avatar: player.avatar || '',
  };
};

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

const formatDOB = (dob: string): string => {
  if (!dob) return '';
  const date = new Date(dob.split('T')[0] + 'T12:00:00');
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

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

  // ── Dynamic form fields hook ──────────────────────────────────────────────
  const { getVisibleFields } = useDynamicFormFields('player', {
    registrationYear: new Date().getFullYear(),
  });

  // ── Save status banner ────────────────────────────────────────────────────
  const [saveStatus, setSaveStatus] = useState<{
    show: boolean;
    variant: 'success' | 'danger';
    message: string;
  }>({ show: false, variant: 'success', message: '' });

  useEffect(() => {
    if (saveStatus.show) {
      const timer = setTimeout(
        () => setSaveStatus((prev) => ({ ...prev, show: false })),
        5000,
      );
      return () => clearTimeout(timer);
    }
  }, [saveStatus.show]);

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
  const newPlayerFormRef = useRef<HTMLDivElement>(null);

  // ── Add-player state ──────────────────────────────────────────────────────
  const [showAddPlayerForm, setShowAddPlayerForm] = useState<boolean>(false);
  const [newPlayerForm, setNewPlayerForm] =
    useState<NewPlayerForm>(createEmptyPlayer());
  const [newPlayerErrors, setNewPlayerErrors] = useState<
    Record<string, string>
  >({});
  const [isSavingPlayer, setIsSavingPlayer] = useState<boolean>(false);

  // ── Edit-player state ─────────────────────────────────────────────────────
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editedPlayers, setEditedPlayers] = useState<
    Record<string, RegistrationPlayer>
  >({});
  const [editPlayerErrors, setEditPlayerErrors] = useState<
    Record<string, Record<string, string>>
  >({});
  const [editGradeConfirmed, setEditGradeConfirmed] = useState<
    Record<string, boolean>
  >({});
  const [isSavingPlayerEdit, setIsSavingPlayerEdit] = useState<string | null>(
    null,
  );

  // ── Personal info edit state ──────────────────────────────────────────────
  const [isEditing, setIsEditing] = useState<boolean>(false);
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

  // ── Guardian edit state ───────────────────────────────────────────────────
  const [isEditingGuardian, setIsEditingGuardian] = useState<number | null>(
    null,
  );
  const [guardianErrors, setGuardianErrors] = useState<
    Record<number, Record<string, string>>
  >({});
  const [editedGuardians, setEditedGuardians] = useState<Guardian[]>([]);

  const DEFAULT_AVATAR = getDefaultAvatar(parent?.isCoach ? 'coach' : 'parent');

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
  const handleEditPlayer = (player: Player) => {
    setEditingPlayerId(player._id);
    setEditedPlayers((prev) => ({
      ...prev,
      [player._id]: convertToRegistrationPlayer(player),
    }));
    setEditGradeConfirmed((prev) => ({ ...prev, [player._id]: true }));
  };

  const handleCancelEditPlayer = (playerId: string) => {
    setEditingPlayerId(null);
    setEditedPlayers((prev) => {
      const n = { ...prev };
      delete n[playerId];
      return n;
    });
    setEditPlayerErrors((prev) => {
      const n = { ...prev };
      delete n[playerId];
      return n;
    });
    setEditGradeConfirmed((prev) => {
      const n = { ...prev };
      delete n[playerId];
      return n;
    });
  };

  const handleEditPlayerChange = (
    playerId: string,
    field: keyof RegistrationPlayer,
    value: string,
  ) => {
    setEditedPlayers((prev) => ({
      ...prev,
      [playerId]: { ...prev[playerId], [field]: value },
    }));
    if (editPlayerErrors[playerId]?.[field as string]) {
      setEditPlayerErrors((prev) => {
        const n = { ...prev };
        if (n[playerId]) {
          delete n[playerId][field as string];
          if (Object.keys(n[playerId]).length === 0) delete n[playerId];
        }
        return n;
      });
    }
  };

  const handleEditPlayerChangeBatch = (
    playerId: string,
    fields: Partial<RegistrationPlayer>,
  ) => {
    setEditedPlayers((prev) => ({
      ...prev,
      [playerId]: { ...prev[playerId], ...fields },
    }));
    if (fields.dob) {
      setEditGradeConfirmed((prev) => ({ ...prev, [playerId]: false }));
    }
  };

  const handleEditGradeConfirm = (playerId: string) => {
    setEditGradeConfirmed((prev) => ({ ...prev, [playerId]: true }));
    if (editPlayerErrors[playerId]?.grade) {
      setEditPlayerErrors((prev) => {
        const n = { ...prev };
        if (n[playerId]) {
          delete n[playerId].grade;
          if (Object.keys(n[playerId]).length === 0) delete n[playerId];
        }
        return n;
      });
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

  // ── Save edited player — uses getVisibleFields validation (matches profilesettings) ──
  const handleSaveEditedPlayer = async (playerId: string) => {
    const player = editedPlayers[playerId];
    if (!player) return;

    const errs: Record<string, string> = {};
    const visibleFields = getVisibleFields(player);

    visibleFields.forEach((field) => {
      const value = player[field.fieldName as keyof RegistrationPlayer];
      if (field.isRequired) {
        if (!value || (typeof value === 'string' && !value.trim())) {
          errs[field.fieldName] = `${field.label} is required`;
        }
      }
      if (
        field.fieldName === 'grade' &&
        player.dob &&
        player.grade &&
        !editGradeConfirmed[playerId]
      ) {
        errs.grade = 'Please confirm the grade is correct';
      }
    });

    if (Object.keys(errs).length > 0) {
      setEditPlayerErrors((prev) => ({ ...prev, [playerId]: errs }));
      return;
    }

    setIsSavingPlayerEdit(playerId);
    try {
      await axios.put(
        `${API_BASE_URL}/players/${playerId}`,
        {
          fullName: player.fullName.trim(),
          gender: player.gender,
          dob: player.dob,
          schoolName: player.schoolName?.trim() || '',
          healthConcerns: player.healthConcerns || '',
          aauNumber: player.aauNumber || '',
          grade: player.grade || '',
          isGradeOverridden:
            player.isGradeOverridden === true ||
            (player.isGradeOverridden as unknown as string) === 'true',
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (parentId) {
        await fetchParentData(parentId);
        const playerIds =
          parent?.players?.map((p: any) =>
            typeof p === 'string' ? p : p._id,
          ) || [];
        if (playerIds.length > 0) await fetchPlayersData(playerIds);
      }

      handleCancelEditPlayer(playerId);

      await Swal.fire({
        icon: 'success',
        title: 'Player Updated',
        timer: 2000,
        showConfirmButton: false,
        toast: true,
        position: 'top-end',
        background: '#10b981',
        color: '#fff',
        iconColor: '#fff',
      });
    } catch (error: any) {
      console.error('Error updating player:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Update Failed',
        text: error.response?.data?.error || 'Failed to update player.',
        timer: 3000,
        showConfirmButton: false,
        toast: true,
        position: 'top-end',
        background: '#ef4444',
        color: '#fff',
        iconColor: '#fff',
      });
    } finally {
      setIsSavingPlayerEdit(null);
    }
  };

  // ── New-player handlers (matches profilesettings exactly) ─────────────────
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

  const validateNewPlayerForm = (): boolean => {
    const errs: Record<string, string> = {};
    const visibleFields = getVisibleFields(newPlayerForm);

    visibleFields.forEach((field) => {
      const value = newPlayerForm[field.fieldName as keyof NewPlayerForm];
      if (field.isRequired) {
        if (value === undefined || value === null) {
          errs[field.fieldName] = `${field.label} is required`;
        } else if (typeof value === 'string' && !value.trim()) {
          errs[field.fieldName] = `${field.label} is required`;
        } else if (field.fieldType === 'checkbox' && value === false) {
          errs[field.fieldName] = `${field.label} must be accepted`;
        }
      }
      if (field.fieldName === 'email' && value && typeof value === 'string') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value))
          errs[field.fieldName] = 'Please enter a valid email address';
      }
      if (field.fieldName === 'phone' && value && typeof value === 'string') {
        const phoneDigits = value.replace(/\D/g, '');
        if (phoneDigits.length !== 10)
          errs[field.fieldName] = 'Please enter a valid 10-digit phone number';
      }
    });

    setNewPlayerErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleAddPlayerSubmit = async () => {
    if (!validateNewPlayerForm()) return;
    if (!parentId || !token) return;

    setIsSavingPlayer(true);
    try {
      const visibleFields = getVisibleFields(newPlayerForm);
      const payload: any = {
        parentId,
        registrationYear: new Date().getFullYear(),
        season: 'N/A',
        skipSeasonRegistration: true,
        fullName: newPlayerForm.fullName?.trim() || '',
        gender: newPlayerForm.gender || '',
        dob: newPlayerForm.dob || '',
        schoolName: newPlayerForm.schoolName?.trim() || '',
        grade: newPlayerForm.grade || '',
        healthConcerns: newPlayerForm.healthConcerns || '',
        aauNumber: newPlayerForm.aauNumber || '',
        isGradeOverridden: newPlayerForm.isGradeOverridden || false,
      };

      visibleFields.forEach((field) => {
        const value = newPlayerForm[field.fieldName as keyof NewPlayerForm];
        if (value !== undefined) {
          payload[field.fieldName] =
            typeof value === 'string' ? value.trim() : value;
        }
      });

      if (newPlayerForm.isGradeOverridden) {
        payload.isGradeOverridden = true;
      }

      await axios.post(`${API_BASE_URL}/players/register`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      await fetchParentData(parentId);
      const playerIds =
        parent?.players?.map((p: any) => (typeof p === 'string' ? p : p._id)) ||
        [];
      if (playerIds.length > 0) await fetchPlayersData(playerIds);

      setNewPlayerForm(createEmptyPlayer());
      setNewPlayerErrors({});
      setShowAddPlayerForm(false);

      setSaveStatus({
        show: true,
        variant: 'success',
        message: 'Player added successfully!',
      });
    } catch (error: any) {
      console.error('Error adding player:', error);
      if (error.response?.data?.errors) {
        const validationErrors = error.response.data.errors
          .map((err: any) => `${err.param || err.path}: ${err.msg}`)
          .join(', ');
        setNewPlayerErrors({
          general: `Validation error: ${validationErrors}`,
        });
      } else {
        setNewPlayerErrors({
          general:
            error.response?.data?.error ||
            'Failed to add player. Please try again.',
        });
      }
    } finally {
      setIsSavingPlayer(false);
    }
  };

  const handleCancelAddPlayer = () => {
    setShowAddPlayerForm(false);
    setNewPlayerForm(createEmptyPlayer());
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
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
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

  const handlePersonalInfoSubmit = async (
    e: React.MouseEvent<HTMLButtonElement>,
  ): Promise<void> => {
    e.preventDefault();
    if (!validateForm()) {
      setSaveStatus({
        show: true,
        variant: 'danger',
        message: 'Please fix the errors in the form before saving.',
      });
      return;
    }
    try {
      if (!parentId || !token || !parent) return;
      await axios.put(
        `${API_BASE_URL}/parent/${parentId}`,
        {
          ...formData,
          phone: formData.phone.replace(/\D/g, ''),
          address: ensureAddress(formData.address),
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setIsEditing(false);
      await fetchParentData(parentId);
      setSaveStatus({
        show: true,
        variant: 'success',
        message: 'Profile updated successfully!',
      });
    } catch (error) {
      console.error('Error updating personal information:', error);
      setSaveStatus({
        show: true,
        variant: 'danger',
        message: 'Failed to update profile. Please try again.',
      });
    }
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

  const handleCancelGuardianEdit = (index: number) => {
    const updated = editedGuardians.filter((_, i) => i !== index);
    setEditedGuardians(updated);
    setIsEditingGuardian(null);
    setGuardianErrors((prev) => {
      const n = { ...prev };
      delete n[index];
      return n;
    });
  };

  const handleGuardianInfoSubmit = async (
    guardianIndex: number,
  ): Promise<void> => {
    if (!validateGuardianForm(guardianIndex)) return;
    try {
      if (!parentId || !token || !parent) return;
      const updatedGuardian = {
        ...editedGuardians[guardianIndex],
        phone: editedGuardians[guardianIndex].phone.replace(/\D/g, ''),
        address: ensureAddress(editedGuardians[guardianIndex].address),
      };

      if (updatedGuardian._id) {
        await axios.put(
          `${API_BASE_URL}/parent/${parentId}/guardian/${guardianIndex}`,
          updatedGuardian,
          { headers: { Authorization: `Bearer ${token}` } },
        );
      } else {
        const response = await axios.post(
          `${API_BASE_URL}/parent/${parentId}/guardians`,
          updatedGuardian,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const updated = [...editedGuardians];
        updated[guardianIndex] = {
          ...updated[guardianIndex],
          _id: response.data._id,
        };
        setEditedGuardians(updated);
      }

      setIsEditingGuardian(null);
      await fetchParentData(parentId);
      setSaveStatus({
        show: true,
        variant: 'success',
        message: 'Guardian saved successfully!',
      });
    } catch (error) {
      console.error('Error saving guardian:', error);
      setSaveStatus({
        show: true,
        variant: 'danger',
        message: 'Failed to save guardian. Please try again.',
      });
    }
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
        updateParent(parentWithoutAvatar as Partial<Parent>);
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

  if (isLoading) return <div className='text-center p-5'>Loading...</div>;
  if (!parent)
    return <div className='text-center p-5'>No parent data found.</div>;

  return (
    <div className='page-wrapper'>
      <div className='content'>
        {/* ── Save status banner ── */}
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
            <h3 className='page-title mb-1'>Profile</h3>
            <nav>
              <ol className='breadcrumb mb-0'>
                <li className='breadcrumb-item'>
                  <Link to={route.adminDashboard}>Dashboard</Link>
                </li>
                <li className='breadcrumb-item'>
                  <Link to={route.profilesettings}>Settings</Link>
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
                  onClick={async () => {
                    if (!parentId) return;
                    await fetchParentData(parentId);
                    const playerIds =
                      parent?.players?.map((p: any) =>
                        typeof p === 'string' ? p : p._id,
                      ) || [];
                    if (playerIds.length > 0) await fetchPlayersData(playerIds);
                  }}
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
                  <div className='mb-3 flex-fill'>
                    {isEditing ? (
                      <NameInput
                        value={formData.fullName}
                        onChange={(val: string) =>
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
                </div>
                <div className='d-block d-xl-flex'>
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
                  <div className='mb-3 flex-fill me-xl-3 me-0'>
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
              </div>
            </div>

            {/* ── Address Information ── */}
            <div className='card'>
              <div className='card-header d-flex justify-content-between align-items-center'>
                <h5>Address Information</h5>
              </div>
              <div className='card-body pb-0'>
                <div className='d-block d-xl-flex'>
                  <div className='mb-3 flex-fill me-xl-3 me-0'>
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
                    )}
                  </div>
                </div>
                {/* Edit / Save / Cancel buttons */}
                {!isEditing ? (
                  <button
                    type='button'
                    className='btn btn-primary btn-sm mb-4'
                    onClick={() => {
                      setFormData({
                        fullName: parent?.fullName || '',
                        email: parent?.email || '',
                        phone: parent?.phone
                          ? formatPhoneNumber(parent.phone.replace(/\D/g, ''))
                          : '',
                        address: ensureAddress(
                          typeof parent?.address === 'object'
                            ? parent.address
                            : parent?.address || '',
                        ),
                        relationship: parent?.relationship || '',
                        isCoach: parent?.isCoach || false,
                        aauNumber: parent?.aauNumber || '',
                      });
                      setIsEditing(true);
                    }}
                  >
                    <i className='ti ti-edit me-2' /> Edit
                  </button>
                ) : (
                  <div className='d-flex gap-2 mb-4'>
                    <button
                      type='button'
                      className='btn btn-outline-secondary btn-sm'
                      onClick={() => {
                        setFormData({
                          fullName: parent?.fullName || '',
                          email: parent?.email || '',
                          phone: parent?.phone
                            ? formatPhoneNumber(parent.phone.replace(/\D/g, ''))
                            : '',
                          address: ensureAddress(
                            typeof parent?.address === 'object'
                              ? parent.address
                              : parent?.address || '',
                          ),
                          relationship: parent?.relationship || '',
                          isCoach: parent?.isCoach || false,
                          aauNumber: parent?.aauNumber || '',
                        });
                        setIsEditing(false);
                        setErrors({});
                      }}
                    >
                      <i className='ti ti-x me-2' />
                      Cancel
                    </button>
                    <button
                      type='button'
                      className='btn btn-primary btn-sm'
                      onClick={handlePersonalInfoSubmit}
                    >
                      <i className='ti ti-device-floppy me-2' /> Save Changes
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* ── Additional Guardians ── */}
            <div className='card mt-3'>
              <div className='card-header d-flex justify-content-between align-items-center'>
                <h5>Additional Parent/Guardian Information</h5>
                {!isEditingGuardian && editedGuardians.length === 0 && (
                  <button
                    type='button'
                    className='btn btn-primary btn-sm'
                    onClick={addNewGuardian}
                  >
                    <i className='ti ti-plus me-2' /> Add Parent/Guardian
                  </button>
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
                    const isNewGuardian =
                      !guardian._id && isEditingGuardian === index;

                    return (
                      <div key={index} className='mb-4'>
                        <div className='card'>
                          <div className='card-header d-flex align-items-center justify-content-between'>
                            <h5 className='mb-0'>
                              <i className='ti ti-users me-2' />{' '}
                              {guardian.fullName || 'New Guardian'}
                            </h5>
                            {isNewGuardian && (
                              <button
                                type='button'
                                className='btn btn-sm btn-outline-secondary'
                                onClick={() => handleCancelGuardianEdit(index)}
                              >
                                <i className='ti ti-x me-1' /> Cancel
                              </button>
                            )}
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
                              <div className='mb-3 flex-fill'>
                                {isEditingGuardian === index ? (
                                  <NameInput
                                    value={guardian.fullName}
                                    onChange={(val: string) =>
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
                            </div>
                            <div className='d-block d-xl-flex'>
                              <div className='mb-3 flex-fill me-xl-3 me-0'>
                                <label className='form-label'>
                                  Relationship
                                </label>
                                <input
                                  type='text'
                                  className={`form-control ${
                                    guardianErrors[index]?.relationship
                                      ? 'is-invalid'
                                      : ''
                                  }`}
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
                              <div className='mb-3 flex-fill me-xl-3 me-0'>
                                <label className='form-label'>Email</label>
                                <input
                                  type='email'
                                  className={`form-control ${
                                    guardianErrors[index]?.email
                                      ? 'is-invalid'
                                      : ''
                                  }`}
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
                              <div className='mb-3 flex-fill me-xl-3 me-0'>
                                <label className='form-label'>
                                  Phone Number
                                </label>
                                <input
                                  type='tel'
                                  className={`form-control ${
                                    guardianErrors[index]?.phone
                                      ? 'is-invalid'
                                      : ''
                                  }`}
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
                                  placeholder='Entering an AAU will mark as coach'
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
                                        className={`form-control ${
                                          guardianErrors[index]?.[
                                            'address.street'
                                          ]
                                            ? 'is-invalid'
                                            : ''
                                        }`}
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
                                        className={`form-control ${
                                          guardianErrors[index]?.[
                                            'address.city'
                                          ]
                                            ? 'is-invalid'
                                            : ''
                                        }`}
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
                                        className={`form-control ${
                                          guardianErrors[index]?.[
                                            'address.state'
                                          ]
                                            ? 'is-invalid'
                                            : ''
                                        }`}
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
                                        className={`form-control ${
                                          guardianErrors[index]?.['address.zip']
                                            ? 'is-invalid'
                                            : ''
                                        }`}
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
                              <div className='d-flex gap-2 mb-4'>
                                <button
                                  type='button'
                                  className='btn btn-outline-secondary btn-sm'
                                  onClick={() => {
                                    if (!guardian._id) {
                                      handleCancelGuardianEdit(index);
                                    } else {
                                      const originalGuardian =
                                        parent?.additionalGuardians?.find(
                                          (g: any) => g._id === guardian._id,
                                        );
                                      if (originalGuardian) {
                                        const updated = [...editedGuardians];
                                        updated[index] = {
                                          ...originalGuardian,
                                          phone: originalGuardian.phone
                                            ? formatPhoneNumber(
                                                originalGuardian.phone.replace(
                                                  /\D/g,
                                                  '',
                                                ),
                                              )
                                            : '',
                                          address: ensureAddress(
                                            originalGuardian.address,
                                          ),
                                        };
                                        setEditedGuardians(updated);
                                      }
                                      setIsEditingGuardian(null);
                                      setGuardianErrors((prev) => {
                                        const n = { ...prev };
                                        delete n[index];
                                        return n;
                                      });
                                    }
                                  }}
                                >
                                  <i className='ti ti-x me-2' />
                                  Cancel
                                </button>
                                <button
                                  type='button'
                                  className='btn btn-primary btn-sm'
                                  onClick={() =>
                                    handleGuardianInfoSubmit(index)
                                  }
                                >
                                  <i className='ti ti-edit me-2' /> Save Changes
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className='mb-4 text-muted fst-italic'>
                    <i className='ti ti-info-circle me-2' />
                    No additional guardians registered.
                  </p>
                )}
                {editedGuardians.length > 0 && !isEditingGuardian && (
                  <div className='mb-3'>
                    <button
                      type='button'
                      className='btn btn-outline-primary btn-sm'
                      onClick={addNewGuardian}
                    >
                      <i className='ti ti-plus me-1' /> Add Another Guardian
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* ── Players ── */}
            <div className='card mt-3'>
              <div className='card-header d-flex justify-content-between align-items-center'>
                <h5>Player Information</h5>
                {!showAddPlayerForm && !editingPlayerId && (
                  <button
                    type='button'
                    className='btn btn-primary btn-sm'
                    onClick={() => {
                      setShowAddPlayerForm(true);
                      setTimeout(() => {
                        newPlayerFormRef.current?.scrollIntoView({
                          behavior: 'smooth',
                          block: 'start',
                        });
                      }, 50);
                    }}
                  >
                    <i className='ti ti-plus me-2' /> Add Player
                  </button>
                )}
              </div>
              <div className='card-body pb-0'>
                {/* Existing players */}
                {players && players.length > 0
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
                      const isEditingThis = editingPlayerId === player._id;
                      const isSavingThis = isSavingPlayerEdit === player._id;
                      const editPlayer = editedPlayers[player._id];
                      const visibleFields = getVisibleFields(
                        editPlayer || player,
                      );

                      return (
                        <div key={player._id} className='mb-4'>
                          <div className='card'>
                            <div className='card-header d-flex align-items-center justify-content-between'>
                              <h5 className='mb-0'>
                                <i className='ti ti-users me-2' />
                                {player.fullName}
                              </h5>
                              <div className='d-flex gap-2'>
                                {!isEditingThis ? (
                                  <>
                                    <button
                                      type='button'
                                      className='btn btn-primary btn-sm'
                                      onClick={() => handleEditPlayer(player)}
                                      disabled={!!editingPlayerId}
                                    >
                                      <i className='ti ti-edit me-1' /> Edit
                                    </button>
                                    <button
                                      type='button'
                                      className='btn btn-outline-danger btn-sm'
                                      onClick={() =>
                                        handleDeletePlayer(player._id)
                                      }
                                      disabled={
                                        isPlayerAvatarLoading ||
                                        !!editingPlayerId
                                      }
                                    >
                                      <i className='ti ti-trash me-1' /> Remove
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      type='button'
                                      className='btn btn-outline-secondary btn-sm'
                                      onClick={() =>
                                        handleCancelEditPlayer(player._id)
                                      }
                                      disabled={isSavingThis}
                                    >
                                      <i className='ti ti-x me-1' /> Cancel
                                    </button>
                                    <button
                                      type='button'
                                      className='btn btn-primary btn-sm'
                                      onClick={() =>
                                        handleSaveEditedPlayer(player._id)
                                      }
                                      disabled={isSavingThis}
                                    >
                                      {isSavingThis ? (
                                        <>
                                          <span className='spinner-border spinner-border-sm me-1' />
                                          Saving...
                                        </>
                                      ) : (
                                        <>
                                          <i className='ti ti-device-floppy me-1' />{' '}
                                          Save Changes
                                        </>
                                      )}
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className='card-body pb-0'>
                              {/* Avatar — read-only mode only */}
                              {!isEditingThis &&
                                renderAvatarBlock({
                                  displayAvatar: displayPlayerAvatar,
                                  isUploading: isPlayerAvatarLoading,
                                  hasSavedId: true,
                                  defaultAvatar: defaultPlayerAvatar,
                                  inputRef: (el) => {
                                    playerFileInputRefs.current[player._id] =
                                      el;
                                  },
                                  onFileChange: (e) =>
                                    handlePlayerAvatarChange(e, player._id),
                                  onDelete: () =>
                                    handlePlayerAvatarDelete(player._id),
                                })}

                              {isEditingThis && editPlayer ? (
                                /* ── Edit mode: PlayerForm ── */
                                <PlayerForm
                                  player={editPlayer}
                                  index={0}
                                  totalPlayers={1}
                                  onPlayerChange={(_, field, value) =>
                                    handleEditPlayerChange(
                                      player._id,
                                      field,
                                      value,
                                    )
                                  }
                                  onPlayerChangeBatch={(_, fields) =>
                                    handleEditPlayerChangeBatch(
                                      player._id,
                                      fields,
                                    )
                                  }
                                  onRemovePlayer={() => {}}
                                  validationErrors={
                                    editPlayerErrors[player._id]
                                  }
                                  registrationYear={new Date().getFullYear()}
                                  parentId={parentId}
                                  token={token}
                                  onGradeConfirm={() =>
                                    handleEditGradeConfirm(player._id)
                                  }
                                  onAvatarChange={async (pid, url) => {
                                    if (url) {
                                      setPlayerAvatarPreviews((prev) => ({
                                        ...prev,
                                        [pid]: url,
                                      }));
                                    } else {
                                      setPlayerAvatarPreviews((prev) => {
                                        const n = { ...prev };
                                        delete n[pid];
                                        return n;
                                      });
                                    }
                                    if (parentId) {
                                      const playerIds =
                                        parent?.players?.map((p: any) =>
                                          typeof p === 'string' ? p : p._id,
                                        ) || [];
                                      if (playerIds.length > 0)
                                        await fetchPlayersData(playerIds);
                                    }
                                  }}
                                />
                              ) : (
                                /* ── Read-only view with dynamic fields ── */
                                <div className='row'>
                                  {visibleFields.map((field) => {
                                    if (field.fieldName === 'fullName') {
                                      return (
                                        <div
                                          key={field.fieldName}
                                          className='col-md-6 mb-3'
                                        >
                                          <label className='form-label'>
                                            {field.label}
                                          </label>
                                          <input
                                            type='text'
                                            className='form-control'
                                            value={player.fullName}
                                            disabled
                                          />
                                        </div>
                                      );
                                    }
                                    if (field.fieldName === 'gender') {
                                      return (
                                        <div
                                          key={field.fieldName}
                                          className='col-md-6 mb-3'
                                        >
                                          <label className='form-label'>
                                            {field.label}
                                          </label>
                                          <input
                                            type='text'
                                            className='form-control'
                                            value={player.gender}
                                            disabled
                                          />
                                        </div>
                                      );
                                    }
                                    if (field.fieldName === 'dob') {
                                      return (
                                        <div
                                          key={field.fieldName}
                                          className='col-md-6 mb-3'
                                        >
                                          <label className='form-label'>
                                            {field.label}
                                          </label>
                                          <input
                                            type='text'
                                            className='form-control'
                                            value={formatDOB(player.dob || '')}
                                            disabled
                                          />
                                        </div>
                                      );
                                    }
                                    if (field.fieldName === 'schoolName') {
                                      return (
                                        <div
                                          key={field.fieldName}
                                          className='col-md-6 mb-3'
                                        >
                                          <label className='form-label'>
                                            {field.label}
                                          </label>
                                          <input
                                            type='text'
                                            className='form-control'
                                            value={player.schoolName}
                                            disabled
                                          />
                                        </div>
                                      );
                                    }
                                    if (field.fieldName === 'grade') {
                                      return (
                                        <div
                                          key={field.fieldName}
                                          className='col-md-6 mb-3'
                                        >
                                          <label className='form-label'>
                                            {field.label}
                                          </label>
                                          <input
                                            type='text'
                                            className='form-control'
                                            value={
                                              player.grade === 'PK'
                                                ? 'Pre-Kindergarten'
                                                : player.grade === 'K'
                                                  ? 'Kindergarten'
                                                  : player.grade
                                                    ? `${player.grade}${parseInt(player.grade) === 1 ? 'st' : parseInt(player.grade) === 2 ? 'nd' : parseInt(player.grade) === 3 ? 'rd' : 'th'} Grade`
                                                    : ''
                                            }
                                            disabled
                                          />
                                        </div>
                                      );
                                    }
                                    if (field.fieldName === 'aauNumber') {
                                      return (
                                        <div
                                          key={field.fieldName}
                                          className='col-md-6 mb-3'
                                        >
                                          <label className='form-label'>
                                            {field.label}
                                          </label>
                                          <input
                                            type='text'
                                            className='form-control'
                                            value={player.aauNumber || ''}
                                            disabled
                                          />
                                        </div>
                                      );
                                    }
                                    return null;
                                  })}
                                  {player.healthConcerns && (
                                    <div className='col-12 mb-3'>
                                      <label className='form-label'>
                                        Health Concerns
                                      </label>
                                      <textarea
                                        className='form-control'
                                        value={player.healthConcerns}
                                        disabled
                                        rows={2}
                                      />
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  : !showAddPlayerForm && (
                      <p className='mb-4 text-muted fst-italic'>
                        <i className='ti ti-info-circle me-2' />
                        No players registered.
                      </p>
                    )}

                {/* ── Add New Player Form ── */}
                {showAddPlayerForm && (
                  <div className='mb-4' ref={newPlayerFormRef}>
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
                        <PlayerForm
                          player={newPlayerForm}
                          index={0}
                          totalPlayers={1}
                          onPlayerChange={(_, field, value) =>
                            handleNewPlayerChange({
                              target: { name: field, value },
                            } as any)
                          }
                          onRemovePlayer={() => {}}
                          validationErrors={newPlayerErrors}
                          registrationYear={new Date().getFullYear()}
                          parentId={parentId}
                          token={token}
                          onAvatarChange={() => {}}
                        />
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

                {players.length > 0 &&
                  !showAddPlayerForm &&
                  !editingPlayerId && (
                    <div className='mb-3'>
                      <button
                        type='button'
                        className='btn btn-outline-primary btn-sm'
                        onClick={() => {
                          setShowAddPlayerForm(true);
                          setTimeout(() => {
                            newPlayerFormRef.current?.scrollIntoView({
                              behavior: 'smooth',
                              block: 'start',
                            });
                          }, 50);
                        }}
                      >
                        <i className='ti ti-plus me-1' /> Add Another Player
                      </button>
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
