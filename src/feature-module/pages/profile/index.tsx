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
import {
  Address,
  ensureAddress,
  formatAddress,
  parseAddress,
} from '../../../utils/address';
import { formatPhoneNumber, validatePhoneNumber } from '../../../utils/phone';
import {
  validateEmail,
  validateRequired,
  validateName,
  validateState,
  validateZipCode,
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

// ── Mapping utilities for dynamic fields ────────────────────────────────────
const mapParentFormDataToDynamicFields = (formData: FormDataType) => {
  return {
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
};

const mapGuardianToDynamicFields = (guardian: Guardian) => {
  const address = ensureAddress(guardian.address);
  return {
    guardianFullName: guardian.fullName,
    email: guardian.email,
    phone: guardian.phone,
    address: guardian.address,
    city: address.city,
    state: address.state,
    zip: address.zip,
    relationship: guardian.relationship,
    isCoach: guardian.isCoach,
    aauNumber: guardian.aauNumber,
    parentFullName: guardian.fullName,
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

// ── NON-ADDRESS personal fields ─────────────────────────────────────────────
const PERSONAL_FIELDS = [
  'fullName',
  'relationship',
  'email',
  'phone',
  'aauNumber',
  'isCoach',
];

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

  // ── Dynamic form fields hooks ─────────────────────────────────────────────
  const { getVisibleFields: getPlayerVisibleFields } = useDynamicFormFields(
    'player',
    { registrationYear: new Date().getFullYear() },
  );

  const { getVisibleFields: getParentVisibleFields } = useDynamicFormFields(
    'parent',
    { registrationYear: new Date().getFullYear() },
  );

  const { getVisibleFields: getGuardianVisibleFields } = useDynamicFormFields(
    'guardian',
    { registrationYear: new Date().getFullYear() },
  );

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
  const [guardianSameAsMain, setGuardianSameAsMain] = useState<
    Record<number, boolean>
  >({});

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

  const handleGuardianSameAsMainChange = (index: number, checked: boolean) => {
    setGuardianSameAsMain((prev) => ({ ...prev, [index]: checked }));

    if (checked) {
      // Copy main address to guardian
      setEditedGuardians((prev) => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          address: {
            street: formData.address.street || '',
            street2: formData.address.street2 || '',
            city: formData.address.city || '',
            state: formData.address.state || '',
            zip: formData.address.zip || '',
          },
        };
        return updated;
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

  // ── Save edited player ────────────────────────────────────────────────────
  const handleSaveEditedPlayer = async (playerId: string) => {
    const player = editedPlayers[playerId];
    if (!player) return;

    const errs: Record<string, string> = {};
    const visibleFields = getPlayerVisibleFields(player);

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

  // ── New-player handlers ───────────────────────────────────────────────────
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
    const visibleFields = getPlayerVisibleFields(newPlayerForm);

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
      const visibleFields = getPlayerVisibleFields(newPlayerForm);
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

  // ── Parent validation (dynamic fields) ───────────────────────────────────
  const validateParentForm = (): boolean => {
    const mappedData = mapParentFormDataToDynamicFields(formData);
    const visibleFields = getParentVisibleFields(mappedData);
    const newErrors: Record<string, string> = {};
    const address = ensureAddress(formData.address);

    console.log(
      '🔍 Validating parent with visible fields:',
      visibleFields.map((f) => f.fieldName),
    );
    console.log('📦 Mapped form data:', mappedData);

    visibleFields.forEach((field) => {
      if (field.fieldName === 'address') {
        if (field.isRequired) {
          if (!address.street?.trim()) {
            newErrors['address.street'] = 'Street address is required';
          }
        }
      } else if (field.fieldName === 'city') {
        if (field.isRequired && !address.city?.trim()) {
          newErrors['address.city'] = `${field.label} is required`;
        }
      } else if (field.fieldName === 'state') {
        if (field.isRequired && !address.state?.trim()) {
          newErrors['address.state'] = `${field.label} is required`;
        } else if (address.state && !validateState(address.state)) {
          newErrors['address.state'] =
            'Please enter a valid 2-letter state code';
        }
      } else if (field.fieldName === 'zip') {
        if (field.isRequired && !address.zip?.trim()) {
          newErrors['address.zip'] = `${field.label} is required`;
        } else if (address.zip && !validateZipCode(address.zip)) {
          newErrors['address.zip'] = 'Please enter a valid ZIP code';
        }
      } else if (field.fieldName === 'parentFullName') {
        const value = formData.fullName;
        if (field.isRequired && (!value || !value.trim())) {
          newErrors.fullName = `${field.label} is required`;
        } else if (value && value.trim().length < 2) {
          newErrors.fullName = 'Please enter a valid name (min 2 characters)';
        }
      } else {
        let value;
        if (field.fieldName === 'email') value = formData.email;
        else if (field.fieldName === 'phone') value = formData.phone;
        else if (field.fieldName === 'relationship')
          value = formData.relationship;
        else if (field.fieldName === 'isCoach') value = formData.isCoach;
        else if (field.fieldName === 'aauNumber') value = formData.aauNumber;
        else value = mappedData[field.fieldName as keyof typeof mappedData];

        console.log(`📝 Validating field ${field.fieldName}:`, {
          value,
          required: field.isRequired,
          type: field.fieldType,
        });

        if (field.isRequired) {
          if (value === undefined || value === null) {
            newErrors[field.fieldName] = `${field.label} is required`;
          } else if (typeof value === 'string' && !value.trim()) {
            newErrors[field.fieldName] = `${field.label} is required`;
          } else if (field.fieldType === 'checkbox' && value === false) {
            newErrors[field.fieldName] = `${field.label} must be accepted`;
          }
        }

        if (value !== undefined && value !== null && value !== '') {
          if (field.fieldName === 'email' && typeof value === 'string') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
              newErrors.email = 'Please enter a valid email address';
            }
          }

          if (field.fieldName === 'phone' && typeof value === 'string') {
            const phoneDigits = value.replace(/\D/g, '');
            if (phoneDigits.length !== 10) {
              newErrors.phone = 'Please enter a valid 10-digit phone number';
            }
          }
        }
      }
    });

    if (formData.isCoach) {
      if (!formData.aauNumber || !formData.aauNumber.trim()) {
        newErrors.aauNumber = 'AAU number is required for coaches';
      }
    }

    console.log('✅ Validation errors:', newErrors);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── Guardian validation (dynamic fields) ─────────────────────────────────
  const validateGuardianForm = (index: number): boolean => {
    const guardian = editedGuardians[index];
    if (!guardian) return false;

    const mappedData = mapGuardianToDynamicFields(guardian);
    const visibleFields = getGuardianVisibleFields(mappedData);
    const newErrors: Record<string, string> = {};
    const address = ensureAddress(guardian.address);

    console.log(
      `🔍 Validating guardian ${index} with visible fields:`,
      visibleFields.map((f) => f.fieldName),
    );
    console.log(`📦 Mapped guardian data:`, mappedData);

    visibleFields.forEach((field) => {
      // Handle address fields
      if (field.fieldName === 'address') {
        if (field.isRequired) {
          if (!address.street?.trim()) {
            newErrors['address.street'] = 'Street address is required';
          }
        }
      } else if (field.fieldName === 'city') {
        if (field.isRequired && !address.city?.trim()) {
          newErrors['address.city'] = `${field.label} is required`;
        }
      } else if (field.fieldName === 'state') {
        if (field.isRequired && !address.state?.trim()) {
          newErrors['address.state'] = `${field.label} is required`;
        } else if (address.state && !validateState(address.state)) {
          newErrors['address.state'] =
            'Please enter a valid 2-letter state code';
        }
      } else if (field.fieldName === 'zip') {
        if (field.isRequired && !address.zip?.trim()) {
          newErrors['address.zip'] = `${field.label} is required`;
        } else if (address.zip && !validateZipCode(address.zip)) {
          newErrors['address.zip'] = 'Please enter a valid ZIP code';
        }
      }
      // Handle guardian full name
      else if (field.fieldName === 'guardianFullName') {
        const value = guardian.fullName;
        console.log('📝 Validating guardianFullName:', {
          value,
          isRequired: field.isRequired,
          isEmpty: !value || !value.trim(),
          length: value?.trim().length,
        });

        if (field.isRequired && (!value || !value.trim())) {
          newErrors.fullName = `${field.label} is required`;
          console.log('❌ Setting fullName required error');
        } else if (value && value.trim().length < 2) {
          newErrors.fullName = 'Please enter a valid name (min 2 characters)';
          console.log('❌ Setting fullName min length error');
        }
      }
      // Handle all other fields
      else {
        let value;
        if (field.fieldName === 'email') value = guardian.email;
        else if (field.fieldName === 'phone') value = guardian.phone;
        else if (field.fieldName === 'relationship')
          value = guardian.relationship;
        else if (field.fieldName === 'isCoach') value = guardian.isCoach;
        else if (field.fieldName === 'aauNumber') value = guardian.aauNumber;
        else value = mappedData[field.fieldName as keyof typeof mappedData];

        console.log(`📝 Validating guardian field ${field.fieldName}:`, {
          value,
          required: field.isRequired,
          type: field.fieldType,
        });

        // Required validation
        if (field.isRequired) {
          if (value === undefined || value === null) {
            newErrors[field.fieldName] = `${field.label} is required`;
          } else if (typeof value === 'string' && !value.trim()) {
            newErrors[field.fieldName] = `${field.label} is required`;
          } else if (field.fieldType === 'checkbox' && value === false) {
            newErrors[field.fieldName] = `${field.label} must be accepted`;
          }
        }

        // Field-specific validations
        if (value !== undefined && value !== null && value !== '') {
          if (field.fieldName === 'email' && typeof value === 'string') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
              newErrors.email = 'Please enter a valid email address';
            }
          }

          if (field.fieldName === 'phone' && typeof value === 'string') {
            const phoneDigits = value.replace(/\D/g, '');
            if (phoneDigits.length !== 10) {
              newErrors.phone = 'Please enter a valid 10-digit phone number';
            }
          }
        }
      }
    });

    console.log(`✅ Guardian ${index} validation errors:`, newErrors);
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
    console.log('🔄 Saving personal info');

    if (!validateParentForm()) {
      console.log('❌ Parent validation failed');
      setSaveStatus({
        show: true,
        variant: 'danger',
        message: 'Please fix the errors in the form before saving.',
      });
      return;
    }

    try {
      if (!parentId || !token || !parent) {
        console.log('❌ Missing parentId, token, or parent');
        return;
      }

      // Log the address data before sending
      console.log('Address data being sent:', {
        street: formData.address.street,
        street2: formData.address.street2,
        city: formData.address.city,
        state: formData.address.state,
        zip: formData.address.zip,
      });

      const updateData = {
        fullName: formData.fullName?.trim() || '',
        email: formData.email?.trim() || '',
        phone: formData.phone?.replace(/\D/g, '') || '',
        address: {
          street: formData.address.street?.trim() || '',
          street2: formData.address.street2?.trim() || '',
          city: formData.address.city?.trim() || '',
          state: formData.address.state?.trim() || '',
          zip: formData.address.zip?.trim() || '',
        },
        relationship: formData.relationship?.trim() || '',
        isCoach: formData.isCoach || false,
        aauNumber: formData.aauNumber?.trim() || '',
      };

      console.log('📤 Sending parent update:', updateData);

      const response = await axios.put(
        `${API_BASE_URL}/parent/${parentId}`,
        updateData,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      console.log('✅ Parent update response:', response.data);

      setIsEditing(false);
      await fetchParentData(parentId);
      setSaveStatus({
        show: true,
        variant: 'success',
        message: 'Profile updated successfully!',
      });
    } catch (error: any) {
      console.error('❌ Error updating personal information:', error);
      console.error('Error response:', error.response?.data);
      setSaveStatus({
        show: true,
        variant: 'danger',
        message:
          error.response?.data?.error ||
          'Failed to update profile. Please try again.',
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
    const newGuardian = {
      fullName: '',
      relationship: '',
      phone: '',
      email: '',
      address: { street: '', street2: '', city: '', state: '', zip: '' },
      isCoach: false,
      aauNumber: '',
    };

    setEditedGuardians((prev) => [...prev, newGuardian]);
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
    console.log(`🔄 Saving guardian at index ${guardianIndex}`);

    if (!validateGuardianForm(guardianIndex)) {
      console.log('❌ Guardian validation failed');
      setSaveStatus({
        show: true,
        variant: 'danger',
        message: 'Please fix the errors in the form before saving.',
      });
      return;
    }

    try {
      if (!parentId || !token || !parent) {
        console.log('❌ Missing parentId, token, or parent');
        return;
      }

      const guardian = editedGuardians[guardianIndex];
      console.log('📤 Guardian data to save:', guardian);

      const updatedGuardian = {
        fullName: guardian.fullName?.trim() || '',
        relationship: guardian.relationship?.trim() || '',
        phone: guardian.phone?.replace(/\D/g, '') || '',
        email: guardian.email?.trim() || '',
        address: ensureAddress(guardian.address),
        isCoach: guardian.isCoach || false,
        aauNumber: guardian.aauNumber?.trim() || '',
      };

      console.log('📤 Prepared guardian data:', updatedGuardian);

      let response;

      if (guardian._id) {
        console.log(`🔄 Updating existing guardian with ID: ${guardian._id}`);

        const parentResponse = await axios.get(
          `${API_BASE_URL}/parent/${parentId}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );

        const parentData = parentResponse.data;
        const guardianIndexInParent = parentData.additionalGuardians?.findIndex(
          (g: any) => g._id === guardian._id,
        );

        if (guardianIndexInParent !== undefined && guardianIndexInParent >= 0) {
          response = await axios.put(
            `${API_BASE_URL}/parent/${parentId}/guardian/${guardianIndexInParent}`,
            updatedGuardian,
            { headers: { Authorization: `Bearer ${token}` } },
          );
          console.log('✅ Guardian updated by index:', response.data);
        } else {
          console.log('⚠️ Guardian index not found, updating all guardians');
          const allGuardians = editedGuardians.map((g, i) =>
            i === guardianIndex
              ? { ...g, ...updatedGuardian }
              : {
                  ...g,
                  phone: g.phone?.replace(/\D/g, '') || '',
                  address: ensureAddress(g.address),
                },
          );

          response = await axios.put(
            `${API_BASE_URL}/parent/${parentId}/guardians`,
            { additionalGuardians: allGuardians },
            { headers: { Authorization: `Bearer ${token}` } },
          );
          console.log('✅ All guardians updated:', response.data);
        }
      } else {
        console.log('➕ Adding new guardian');
        try {
          response = await axios.put(
            `${API_BASE_URL}/parent/${parentId}/guardian`,
            updatedGuardian,
            { headers: { Authorization: `Bearer ${token}` } },
          );
          console.log('✅ New guardian added - full response:', response.data);

          // The response might contain the updated parent or just the guardian
          // Let's extract the new guardian ID from the response
          let newGuardianId: string | undefined;

          if (response.data.parent) {
            // Response contains the full parent object
            const updatedParent = response.data.parent;
            const newGuardian = updatedParent.additionalGuardians?.find(
              (g: any) =>
                g.fullName === updatedGuardian.fullName &&
                g.email === updatedGuardian.email,
            );
            newGuardianId = newGuardian?._id;
          } else if (response.data.guardian) {
            // Response contains just the guardian
            newGuardianId = response.data.guardian._id;
          } else if (response.data._id) {
            // Response is the guardian itself
            newGuardianId = response.data._id;
          }

          if (newGuardianId) {
            // Update the local state with the new ID
            setEditedGuardians((prev) => {
              const updated = [...prev];
              updated[guardianIndex] = {
                ...updated[guardianIndex],
                _id: newGuardianId,
              };
              return updated;
            });
          }

          // Show success message immediately without waiting for parent refresh
          setSaveStatus({
            show: true,
            variant: 'success',
            message: 'Guardian saved successfully!',
          });

          setIsEditingGuardian(null);

          // Refresh parent data in the background
          fetchParentData(parentId).catch((err) =>
            console.error('Background parent refresh failed:', err),
          );
        } catch (postError: any) {
          console.error('❌ Error in POST request:', postError);
          console.error('Error response:', postError.response?.data);

          // Check if the error is because the guardian already exists
          if (
            postError.response?.status === 400 &&
            postError.response?.data?.error?.includes('already exists')
          ) {
            setSaveStatus({
              show: true,
              variant: 'danger',
              message: 'This guardian email is already registered.',
            });
          } else {
            throw postError; // Re-throw to be caught by outer catch
          }
        }
      }

      console.log('✅ Guardian save successful');

      setIsEditingGuardian(null);

      // Refresh parent data to get the latest guardians
      await fetchParentData(parentId);

      setSaveStatus({
        show: true,
        variant: 'success',
        message: 'Guardian saved successfully!',
      });
    } catch (error: any) {
      console.error('❌ Error saving guardian:', error);
      console.error('Error response:', error.response?.data);

      // Show more specific error message
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        'Failed to save guardian. Please try again.';

      setSaveStatus({
        show: true,
        variant: 'danger',
        message: errorMessage,
      });
    }
  };

  const handleDeleteGuardian = async (index: number): Promise<void> => {
    if (!token || !parentId) return;
    const guardian = editedGuardians[index];
    const result = await Swal.fire({
      title: 'Remove Guardian?',
      text: 'Are you sure you want to remove this guardian from your account? This cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, remove guardian',
      cancelButtonText: 'Cancel',
    });
    if (!result.isConfirmed) return;
    try {
      if (guardian._id) {
        const remaining = editedGuardians
          .filter((_, i) => i !== index)
          .map((g) => ({
            ...g,
            phone: g.phone.replace(/\D/g, ''),
            address: ensureAddress(g.address),
          }));
        await axios.put(
          `${API_BASE_URL}/parent/${parentId}/guardians`,
          { additionalGuardians: remaining },
          { headers: { Authorization: `Bearer ${token}` } },
        );
      }
      setEditedGuardians((prev) => prev.filter((_, i) => i !== index));
      setIsEditingGuardian(null);
      setGuardianErrors((prev) => {
        const n = { ...prev };
        delete n[index];
        return n;
      });
      if (guardian._id) await fetchParentData(parentId);
      Swal.fire({
        icon: 'success',
        title: 'Guardian Removed',
        text: 'The guardian has been removed from your account.',
        timer: 2000,
        showConfirmButton: false,
        toast: true,
        position: 'top-end',
        background: '#10b981',
        color: '#fff',
        iconColor: '#fff',
      });
    } catch (error) {
      console.error('Error deleting guardian:', error);
      Swal.fire({
        icon: 'error',
        title: 'Removal Failed',
        text: 'Failed to remove guardian. Please try again.',
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

  // ── Render helpers ────────────────────────────────────────────────────────
  const renderParentPersonalField = (
    field: VisibleField,
    data: FormDataType,
    editing: boolean,
    fieldErrors: Record<string, string>,
    isLast = false,
  ) => {
    if (
      field.fieldName === 'fullName' ||
      field.fieldName === 'parentFullName'
    ) {
      return editing ? (
        <NameInput
          key='fullName'
          value={data.fullName}
          onChange={(val: string) =>
            handleInputChange({
              target: { name: 'fullName', value: val },
            } as React.ChangeEvent<HTMLInputElement>)
          }
          error={fieldErrors.fullName}
        />
      ) : (
        <div key='fullName' className='mb-3 flex-fill'>
          <label className='form-label'>Full Name</label>
          <input
            type='text'
            className='form-control'
            value={data.fullName}
            disabled
          />
        </div>
      );
    }

    // Handle checkbox fields (like isCoach)
    if (field.fieldType === 'checkbox') {
      return (
        <div key={field.fieldName} className='mb-3 flex-fill'>
          <div className='form-check'>
            <input
              type='checkbox'
              className={`form-check-input ${fieldErrors[field.fieldName] ? 'is-invalid' : ''}`}
              name={field.fieldName}
              id={`parent-${field.fieldName}`}
              checked={!!data[field.fieldName as keyof FormDataType]}
              onChange={handleInputChange}
              disabled={!editing}
            />
            <label
              className='form-check-label'
              htmlFor={`parent-${field.fieldName}`}
            >
              {field.label}
            </label>
            {fieldErrors[field.fieldName] && (
              <div className='invalid-feedback d-block'>
                {fieldErrors[field.fieldName]}
              </div>
            )}
          </div>
        </div>
      );
    }

    const inputType =
      field.fieldName === 'email'
        ? 'email'
        : field.fieldName === 'phone'
          ? 'tel'
          : 'text';

    const rawValue = data[field.fieldName as keyof FormDataType];
    const displayValue =
      typeof rawValue === 'boolean'
        ? String(rawValue)
        : (rawValue as string) || '';

    return (
      <div
        key={field.fieldName}
        className={`mb-3 flex-fill${isLast ? '' : ' me-xl-3'} me-0`}
      >
        <label className='form-label'>{field.label}</label>
        <input
          type={inputType}
          className={`form-control ${fieldErrors[field.fieldName] ? 'is-invalid' : ''}`}
          name={field.fieldName}
          value={displayValue}
          onChange={handleInputChange}
          disabled={!editing}
          placeholder={
            field.placeholder ||
            (field.fieldName === 'phone' ? '(123) 456-7890' : undefined)
          }
          maxLength={field.fieldName === 'phone' ? 14 : undefined}
        />
        {fieldErrors[field.fieldName] && (
          <div className='invalid-feedback d-block'>
            {fieldErrors[field.fieldName]}
          </div>
        )}
      </div>
    );
  };

  const renderGuardianPersonalField = (
    field: VisibleField,
    guardian: Guardian,
    index: number,
    editing: boolean,
    fieldErrors: Record<string, string>,
    isLast = false,
  ) => {
    // Handle full name fields
    if (field.fieldName === 'guardianFullName') {
      return editing ? (
        <NameInput
          key='fullName'
          value={guardian.fullName}
          onChange={(val: string) =>
            handleGuardianInputChange(
              {
                target: { name: 'fullName', value: val },
              } as React.ChangeEvent<HTMLInputElement>,
              index,
            )
          }
          error={fieldErrors.fullName}
        />
      ) : (
        <div key='fullName' className='mb-3 flex-fill'>
          <label className='form-label'>Full Name</label>
          <input
            type='text'
            className='form-control'
            value={guardian.fullName}
            disabled
          />
        </div>
      );
    }

    // Handle regular fields
    const inputType =
      field.fieldName === 'email'
        ? 'email'
        : field.fieldName === 'phone'
          ? 'tel'
          : 'text';

    // Get the value based on field name
    let value: any;
    if (field.fieldName === 'email') value = guardian.email;
    else if (field.fieldName === 'phone') value = guardian.phone;
    else if (field.fieldName === 'relationship') value = guardian.relationship;
    else if (field.fieldName === 'isCoach') value = guardian.isCoach;
    else if (field.fieldName === 'aauNumber') value = guardian.aauNumber;
    else value = '';

    const displayValue =
      typeof value === 'boolean' ? String(value) : (value as string) || '';

    return (
      <div
        key={field.fieldName}
        className={`mb-3 flex-fill${isLast ? '' : ' me-xl-3'} me-0`}
      >
        <label className='form-label'>{field.label}</label>
        <input
          type={inputType}
          className={`form-control ${fieldErrors[field.fieldName] ? 'is-invalid' : ''}`}
          name={field.fieldName}
          value={displayValue}
          onChange={(e) => handleGuardianInputChange(e, index)}
          disabled={!editing}
          placeholder={
            field.placeholder ||
            (field.fieldName === 'phone' ? '(123) 456-7890' : undefined) ||
            (field.fieldName === 'aauNumber'
              ? 'Entering an AAU will mark as coach'
              : undefined)
          }
          maxLength={field.fieldName === 'phone' ? 14 : undefined}
        />
        {fieldErrors[field.fieldName] && (
          <div className='invalid-feedback d-block'>
            {fieldErrors[field.fieldName]}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) return <div className='text-center p-5'>Loading...</div>;
  if (!parent)
    return <div className='text-center p-5'>No parent data found.</div>;

  // Get visible fields for parent
  const allParentFields = getParentVisibleFields(
    mapParentFormDataToDynamicFields(formData),
  );
  const parentPersonalFields = allParentFields.filter(
    (f) =>
      PERSONAL_FIELDS.includes(f.fieldName) || f.fieldName === 'parentFullName',
  );
  const hasAddressField = allParentFields.some(
    (f) =>
      f.fieldName === 'address' ||
      f.fieldName === 'city' ||
      f.fieldName === 'state' ||
      f.fieldName === 'zip',
  );

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
            {/* Update the Refresh button to actually refresh the data */}
            <div className='pe-1 mb-2'>
              <OverlayTrigger
                placement='top'
                overlay={<Tooltip id='tooltip-top'>Refresh</Tooltip>}
              >
                <Link
                  to='#'
                  className='btn btn-outline-light bg-white btn-icon me-1'
                  onClick={async (e) => {
                    e.preventDefault();
                    if (!parentId) return;

                    setSaveStatus({
                      show: true,
                      variant: 'success',
                      message: 'Refreshing data...',
                    });

                    try {
                      await fetchParentData(parentId);
                      const playerIds =
                        parent?.players?.map((p: any) =>
                          typeof p === 'string' ? p : p._id,
                        ) || [];
                      if (playerIds.length > 0) {
                        await fetchPlayersData(playerIds);
                      }

                      setSaveStatus({
                        show: true,
                        variant: 'success',
                        message: 'Data refreshed successfully!',
                      });
                    } catch (error) {
                      console.error('Error refreshing data:', error);
                      setSaveStatus({
                        show: true,
                        variant: 'danger',
                        message: 'Failed to refresh data. Please try again.',
                      });
                    }
                  }}
                >
                  <i className='ti ti-refresh' />
                </Link>
              </OverlayTrigger>
            </div>
          </div>
        </div>

        <div className='d-md-flex d-block mt-3'>
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
            <div className='card'>
              <div className='card-header d-flex justify-content-between align-items-center'>
                <h5>
                  <i className='ti ti-user me-2' />
                  Personal Information
                </h5>
                {!isEditing ? (
                  <button
                    type='button'
                    className='btn btn-primary btn-sm'
                    onClick={() => {
                      console.log(
                        '📝 Setting form data for edit with parent:',
                        parent,
                      );
                      console.log('📝 Parent address:', parent?.address);

                      const addressObj =
                        typeof parent?.address === 'string'
                          ? parseAddress(parent.address)
                          : parent?.address || {
                              street: '',
                              street2: '',
                              city: '',
                              state: '',
                              zip: '',
                            };

                      setFormData({
                        fullName: parent?.fullName || '',
                        email: parent?.email || '',
                        phone: parent?.phone
                          ? formatPhoneNumber(parent.phone.replace(/\D/g, ''))
                          : '',
                        address: {
                          street: addressObj.street || '',
                          street2: addressObj.street2 || '',
                          city: addressObj.city || '',
                          state: addressObj.state || '',
                          zip: addressObj.zip || '',
                        },
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
                  <div className='d-flex gap-2'>
                    <button
                      type='button'
                      className='btn btn-outline-secondary btn-sm'
                      onClick={() => {
                        console.log(
                          '📝 Canceling edit, resetting to parent data:',
                          parent,
                        );
                        console.log(
                          '📝 Parent address on cancel:',
                          parent?.address,
                        );

                        const addressObj =
                          typeof parent?.address === 'string'
                            ? parseAddress(parent.address)
                            : parent?.address || {
                                street: '',
                                street2: '',
                                city: '',
                                state: '',
                                zip: '',
                              };

                        setFormData({
                          fullName: parent?.fullName || '',
                          email: parent?.email || '',
                          phone: parent?.phone
                            ? formatPhoneNumber(parent.phone.replace(/\D/g, ''))
                            : '',
                          address: {
                            street: addressObj.street || '',
                            street2: addressObj.street2 || '',
                            city: addressObj.city || '',
                            state: addressObj.state || '',
                            zip: addressObj.zip || '',
                          },
                          relationship: parent?.relationship || '',
                          isCoach: parent?.isCoach || false,
                          aauNumber: parent?.aauNumber || '',
                        });
                        setIsEditing(false);
                        setErrors({});
                      }}
                    >
                      <i className='ti ti-x me-2' /> Cancel
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
              <div className='card-body pb-0'>
                {/* Rest of the personal info content remains the same */}
                <div className='d-block'>
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
                    <div className='mb-3 flex-fill'>
                      <label className='form-label'>Full Name</label>
                      <input
                        type='text'
                        className='form-control'
                        value={formData.fullName}
                        disabled
                      />
                    </div>
                  )}
                </div>

                {/* First row: All fields except fullName, isCoach, and aauNumber */}
                {parentPersonalFields.filter(
                  (f) =>
                    f.fieldName !== 'fullName' &&
                    f.fieldName !== 'parentFullName' &&
                    f.fieldName !== 'aauNumber' &&
                    f.fieldName !== 'isCoach',
                ).length > 0 && (
                  <div className='d-block d-xl-flex flex-wrap'>
                    {parentPersonalFields
                      .filter(
                        (f) =>
                          f.fieldName !== 'fullName' &&
                          f.fieldName !== 'parentFullName' &&
                          f.fieldName !== 'aauNumber' &&
                          f.fieldName !== 'isCoach',
                      )
                      .map((field, i, arr) =>
                        renderParentPersonalField(
                          field,
                          formData,
                          isEditing,
                          errors,
                          i === arr.length - 1,
                        ),
                      )}
                  </div>
                )}

                {/* Second row: Are you a coach? checkbox and AAU number (side by side) */}
                <div className='row mb-4'>
                  <div className='d-block d-xl-flex flex-wrap'>
                    {/* Coach checkbox column */}
                    {parentPersonalFields.some(
                      (f) => f.fieldName === 'isCoach',
                    ) && (
                      <div className='col-md-2'>
                        {parentPersonalFields
                          .filter((f) => f.fieldName === 'isCoach')
                          .map((field) =>
                            renderParentPersonalField(
                              field,
                              formData,
                              isEditing,
                              errors,
                              true,
                            ),
                          )}
                      </div>
                    )}

                    {/* AAU Number column - shown conditionally next to checkbox */}
                    {isEditing && formData.isCoach ? (
                      <div className='col-md-10 '>
                        <label className='form-label'>
                          AAU Number {isEditing && '(Required for coaches)'}
                        </label>
                        <input
                          type='text'
                          className={`form-control ${errors.aauNumber ? 'is-invalid' : ''}`}
                          name='aauNumber'
                          value={formData.aauNumber || ''}
                          onChange={handleInputChange}
                          placeholder='Enter your AAU number'
                          disabled={!isEditing}
                        />
                        {errors.aauNumber && (
                          <div className='invalid-feedback d-block'>
                            {errors.aauNumber}
                          </div>
                        )}
                      </div>
                    ) : !isEditing && formData.isCoach && formData.aauNumber ? (
                      <div className='col-md-10'>
                        <label className='form-label'>AAU Number</label>
                        <input
                          type='text'
                          className='form-control'
                          value={formData.aauNumber}
                          disabled
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            {/* Address Information - shown in both modes but differently */}
            {hasAddressField && (
              <div className='card'>
                <div className='card-header d-flex justify-content-between align-items-center'>
                  <h5>
                    <i className='ti ti-map me-2' />
                    Address Information
                  </h5>
                </div>
                <div className='card-body pb-0'>
                  {!isEditing ? (
                    // Preview mode - show formatted address if any address field has data
                    formData.address.street ||
                    formData.address.city ||
                    formData.address.state ||
                    formData.address.zip ? (
                      <div className='mb-3'>
                        <label className='form-label'>Address</label>
                        <input
                          type='text'
                          className='form-control'
                          value={formatAddress(formData.address)}
                          disabled
                        />
                      </div>
                    ) : (
                      <p className='text-muted fst-italic mb-3'>
                        No address provided.
                      </p>
                    )
                  ) : (
                    // Edit mode - show full address form with individual field visibility
                    <div className='flex-fill mb-4'>
                      {/* Street Address - only show if enabled */}
                      {allParentFields.some(
                        (f) => f.fieldName === 'address',
                      ) && (
                        <div className='row mb-3'>
                          <div className='col-md-8'>
                            <label className='form-label'>
                              Street Address
                              {allParentFields.find(
                                (f) => f.fieldName === 'address',
                              )?.isRequired && (
                                <span className='text-danger ms-1'>*</span>
                              )}
                            </label>
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
                      )}

                      <div className='row'>
                        {/* City - only show if enabled */}
                        {allParentFields.some(
                          (f) => f.fieldName === 'city',
                        ) && (
                          <div className='col-md-5'>
                            <div className='mb-3'>
                              <label className='form-label'>
                                City
                                {allParentFields.find(
                                  (f) => f.fieldName === 'city',
                                )?.isRequired && (
                                  <span className='text-danger ms-1'>*</span>
                                )}
                              </label>
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
                          </div>
                        )}

                        {/* State - only show if enabled */}
                        {allParentFields.some(
                          (f) => f.fieldName === 'state',
                        ) && (
                          <div className='col-md-3'>
                            <div className='mb-3'>
                              <label className='form-label'>
                                State
                                {allParentFields.find(
                                  (f) => f.fieldName === 'state',
                                )?.isRequired && (
                                  <span className='text-danger ms-1'>*</span>
                                )}
                              </label>
                              <input
                                type='text'
                                className={`form-control ${errors['address.state'] ? 'is-invalid' : ''}`}
                                value={formData.address.state}
                                onChange={(e) =>
                                  handleAddressChange(e, 'state')
                                }
                                maxLength={2}
                                placeholder='WA'
                              />
                              {errors['address.state'] && (
                                <div className='invalid-feedback d-block'>
                                  {errors['address.state']}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* ZIP - only show if enabled */}
                        {allParentFields.some((f) => f.fieldName === 'zip') && (
                          <div className='col-md-4'>
                            <div className='mb-3'>
                              <label className='form-label'>
                                ZIP Code
                                {allParentFields.find(
                                  (f) => f.fieldName === 'zip',
                                )?.isRequired && (
                                  <span className='text-danger ms-1'>*</span>
                                )}
                              </label>
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
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className='card mt-3'>
              <div className='card-header d-flex justify-content-between align-items-center'>
                <h5>
                  <i className='ti ti-users me-2' /> Additional Parent /
                  Guardian Information
                </h5>
                {!isEditingGuardian && (
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
                    const editing = isEditingGuardian === index;
                    const gErrors = guardianErrors[index] || {};

                    const allGuardianFields = getGuardianVisibleFields(
                      mapGuardianToDynamicFields(guardian),
                    );
                    const guardianPersonalFields = allGuardianFields.filter(
                      (f) =>
                        f.fieldName === 'guardianFullName' ||
                        f.fieldName === 'email' ||
                        f.fieldName === 'phone' ||
                        f.fieldName === 'relationship' ||
                        f.fieldName === 'isCoach' ||
                        f.fieldName === 'aauNumber',
                    );
                    const guardianHasAddressField = allGuardianFields.some(
                      (f) =>
                        f.fieldName === 'address' ||
                        f.fieldName === 'city' ||
                        f.fieldName === 'state' ||
                        f.fieldName === 'zip',
                    );

                    // For new guardians
                    if (isNewGuardian) {
                      return (
                        <div
                          key={index}
                          className='mb-4'
                          ref={editing ? undefined : undefined}
                        >
                          <div className='card border-primary'>
                            <div className='card-header d-flex align-items-center justify-content-between bg-light'>
                              <h5 className='mb-0'>
                                <i className='ti ti-user-plus me-2 text-primary' />
                                New Guardian
                              </h5>
                              <button
                                type='button'
                                className='btn btn-sm btn-outline-secondary'
                                onClick={() => handleCancelGuardianEdit(index)}
                              >
                                <i className='ti ti-x me-1' /> Cancel
                              </button>
                            </div>
                            <div className='card-body pb-2'>
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
                                onDelete: () =>
                                  handleGuardianAvatarDelete(index),
                              })}

                              <div className='d-block'>
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
                                  error={gErrors.fullName}
                                />
                              </div>

                              {/* First row: All fields except fullName, isCoach, and aauNumber */}
                              {guardianPersonalFields.filter(
                                (f) =>
                                  f.fieldName !== 'fullName' &&
                                  f.fieldName !== 'guardianFullName' &&
                                  f.fieldName !== 'aauNumber' &&
                                  f.fieldName !== 'isCoach',
                              ).length > 0 && (
                                <div className='d-block d-xl-flex flex-wrap'>
                                  {guardianPersonalFields
                                    .filter(
                                      (f) =>
                                        f.fieldName !== 'fullName' &&
                                        f.fieldName !== 'guardianFullName' &&
                                        f.fieldName !== 'aauNumber' &&
                                        f.fieldName !== 'isCoach',
                                    )
                                    .map((field, i, arr) =>
                                      renderGuardianPersonalField(
                                        field,
                                        guardian,
                                        index,
                                        true,
                                        gErrors,
                                        i === arr.length - 1,
                                      ),
                                    )}
                                </div>
                              )}

                              {/* Second row: Are you a coach? checkbox and AAU number (side by side) */}
                              <div className='row mb-3'>
                                <div className='d-block d-xl-flex flex-wrap'>
                                  {/* Coach checkbox column */}
                                  {guardianPersonalFields.some(
                                    (f) => f.fieldName === 'isCoach',
                                  ) && (
                                    <div className='col-md-3'>
                                      <div className='mb-3 flex-fill'>
                                        <div className='form-check mt-2'>
                                          <input
                                            type='checkbox'
                                            className={`form-check-input ${gErrors.isCoach ? 'is-invalid' : ''}`}
                                            name='isCoach'
                                            id={`guardian-${index}-isCoach-new`}
                                            checked={guardian.isCoach || false}
                                            onChange={(e) => {
                                              handleGuardianInputChange(
                                                e,
                                                index,
                                              );
                                              // If unchecked, clear AAU number
                                              if (!e.target.checked) {
                                                handleGuardianInputChange(
                                                  {
                                                    target: {
                                                      name: 'aauNumber',
                                                      value: '',
                                                    },
                                                  } as React.ChangeEvent<HTMLInputElement>,
                                                  index,
                                                );
                                              }
                                            }}
                                            disabled={!editing}
                                          />
                                          <label
                                            className='form-check-label'
                                            htmlFor={`guardian-${index}-isCoach-new`}
                                          >
                                            This guardian is a coach
                                          </label>
                                          {gErrors.isCoach && (
                                            <div className='invalid-feedback d-block'>
                                              {gErrors.isCoach}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* AAU Number column - shown conditionally next to checkbox */}
                                  {guardian.isCoach && (
                                    <div className='col-md-9'>
                                      <label className='form-label'>
                                        AAU Number (Required for coaches)
                                      </label>
                                      <input
                                        type='text'
                                        className={`form-control ${gErrors.aauNumber ? 'is-invalid' : ''}`}
                                        name='aauNumber'
                                        value={guardian.aauNumber || ''}
                                        onChange={(e) =>
                                          handleGuardianInputChange(e, index)
                                        }
                                        placeholder='Enter AAU number'
                                      />
                                      {gErrors.aauNumber && (
                                        <div className='invalid-feedback d-block'>
                                          {gErrors.aauNumber}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className='card mt-3'>
                                <div className='card-header bg-transparent py-2 d-flex justify-content-between align-items-center'>
                                  <h6 className='mb-0'>Address Information</h6>
                                  <div className='form-check'>
                                    <input
                                      type='checkbox'
                                      className='form-check-input'
                                      id={`guardian-same-address-new-${index}`}
                                      checked={
                                        guardianSameAsMain[index] || false
                                      }
                                      onChange={(e) =>
                                        handleGuardianSameAsMainChange(
                                          index,
                                          e.target.checked,
                                        )
                                      }
                                    />
                                    <label
                                      className='form-check-label'
                                      htmlFor={`guardian-same-address-new-${index}`}
                                      style={{ fontSize: '0.9rem' }}
                                    >
                                      Same as main address
                                    </label>
                                  </div>
                                </div>
                                <div className='card-body pb-2'>
                                  {guardianHasAddressField ? (
                                    <div className='flex-fill'>
                                      <div className='row mb-3'>
                                        <div className='col-md-8'>
                                          <label className='form-label'>
                                            Street Address
                                            {allGuardianFields.find(
                                              (f) => f.fieldName === 'address',
                                            )?.isRequired && (
                                              <span className='text-danger ms-1'>
                                                *
                                              </span>
                                            )}
                                          </label>
                                          <input
                                            type='text'
                                            className={`form-control ${gErrors['address.street'] ? 'is-invalid' : ''}`}
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
                                            placeholder='123 Main St'
                                            disabled={guardianSameAsMain[index]}
                                          />
                                          {gErrors['address.street'] && (
                                            <div className='invalid-feedback d-block'>
                                              {gErrors['address.street']}
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
                                                .street2 || ''
                                            }
                                            onChange={(e) =>
                                              handleGuardianAddressChange(
                                                e,
                                                index,
                                                'street2',
                                              )
                                            }
                                            disabled={guardianSameAsMain[index]}
                                          />
                                        </div>
                                      </div>
                                      <div className='row mb-4'>
                                        <div className='col-md-5'>
                                          <label className='form-label'>
                                            City
                                            {allGuardianFields.find(
                                              (f) => f.fieldName === 'city',
                                            )?.isRequired && (
                                              <span className='text-danger ms-1'>
                                                *
                                              </span>
                                            )}
                                          </label>
                                          <input
                                            type='text'
                                            className={`form-control ${gErrors['address.city'] ? 'is-invalid' : ''}`}
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
                                            placeholder='Seattle'
                                            disabled={guardianSameAsMain[index]}
                                          />
                                          {gErrors['address.city'] && (
                                            <div className='invalid-feedback d-block'>
                                              {gErrors['address.city']}
                                            </div>
                                          )}
                                        </div>
                                        <div className='col-md-3'>
                                          <label className='form-label'>
                                            State
                                            {allGuardianFields.find(
                                              (f) => f.fieldName === 'state',
                                            )?.isRequired && (
                                              <span className='text-danger ms-1'>
                                                *
                                              </span>
                                            )}
                                          </label>
                                          <input
                                            type='text'
                                            className={`form-control ${gErrors['address.state'] ? 'is-invalid' : ''}`}
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
                                            placeholder='WA'
                                            disabled={guardianSameAsMain[index]}
                                          />
                                          {gErrors['address.state'] && (
                                            <div className='invalid-feedback d-block'>
                                              {gErrors['address.state']}
                                            </div>
                                          )}
                                        </div>
                                        <div className='col-md-4'>
                                          <label className='form-label'>
                                            ZIP Code
                                            {allGuardianFields.find(
                                              (f) => f.fieldName === 'zip',
                                            )?.isRequired && (
                                              <span className='text-danger ms-1'>
                                                *
                                              </span>
                                            )}
                                          </label>
                                          <input
                                            type='text'
                                            className={`form-control ${gErrors['address.zip'] ? 'is-invalid' : ''}`}
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
                                            placeholder='98101'
                                            disabled={guardianSameAsMain[index]}
                                          />
                                          {gErrors['address.zip'] && (
                                            <div className='invalid-feedback d-block'>
                                              {gErrors['address.zip']}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ) : null}
                                </div>
                              </div>

                              <div className='d-flex gap-2 mb-3 mt-3'>
                                <button
                                  type='button'
                                  className='btn btn-primary btn-sm'
                                  onClick={() =>
                                    handleGuardianInfoSubmit(index)
                                  }
                                >
                                  <i className='ti ti-device-floppy me-2' />{' '}
                                  Save Guardian
                                </button>
                                <button
                                  type='button'
                                  className='btn btn-outline-secondary btn-sm'
                                  onClick={() =>
                                    handleCancelGuardianEdit(index)
                                  }
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // For existing guardians, use the regular card style
                    return (
                      <div key={index} className='mb-4'>
                        <div className='card'>
                          <div className='card-header d-flex align-items-center justify-content-between'>
                            <h5 className='mb-0'>
                              {guardian.fullName || 'Guardian'}
                            </h5>
                            {!editing ? (
                              <div className='d-flex gap-2'>
                                <button
                                  type='button'
                                  className='btn btn-primary btn-sm'
                                  onClick={() => setIsEditingGuardian(index)}
                                  disabled={
                                    isEditingGuardian !== null &&
                                    isEditingGuardian !== index
                                  }
                                >
                                  <i className='ti ti-edit me-2' /> Edit
                                </button>
                                <button
                                  type='button'
                                  className='btn btn-outline-danger btn-sm'
                                  onClick={() => handleDeleteGuardian(index)}
                                  disabled={
                                    isEditingGuardian !== null &&
                                    isEditingGuardian !== index
                                  }
                                >
                                  <i className='ti ti-trash me-2' /> Remove
                                </button>
                              </div>
                            ) : (
                              <div className='d-flex gap-2'>
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
                                  <i className='ti ti-x me-2' /> Cancel
                                </button>
                                <button
                                  type='button'
                                  className='btn btn-primary btn-sm'
                                  onClick={() =>
                                    handleGuardianInfoSubmit(index)
                                  }
                                >
                                  <i className='ti ti-device-floppy me-2' />{' '}
                                  Save Changes
                                </button>
                              </div>
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

                            <div className='d-block'>
                              {editing ? (
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
                                  error={gErrors.fullName}
                                />
                              ) : (
                                <div className='mb-3 flex-fill'>
                                  <label className='form-label'>
                                    Full Name
                                  </label>
                                  <input
                                    type='text'
                                    className='form-control'
                                    value={guardian.fullName}
                                    disabled
                                  />
                                </div>
                              )}
                            </div>

                            {/* First row: All fields except fullName, isCoach, and aauNumber */}
                            {guardianPersonalFields.filter(
                              (f) =>
                                f.fieldName !== 'fullName' &&
                                f.fieldName !== 'guardianFullName' &&
                                f.fieldName !== 'aauNumber' &&
                                f.fieldName !== 'isCoach',
                            ).length > 0 && (
                              <div className='d-block d-xl-flex flex-wrap'>
                                {guardianPersonalFields
                                  .filter(
                                    (f) =>
                                      f.fieldName !== 'fullName' &&
                                      f.fieldName !== 'guardianFullName' &&
                                      f.fieldName !== 'aauNumber' &&
                                      f.fieldName !== 'isCoach',
                                  )
                                  .map((field, i, arr) =>
                                    renderGuardianPersonalField(
                                      field,
                                      guardian,
                                      index,
                                      editing,
                                      gErrors,
                                      i === arr.length - 1,
                                    ),
                                  )}
                              </div>
                            )}

                            {/* Second row: Are you a coach? checkbox and AAU number (side by side) */}
                            <div className='row mb-3'>
                              <div className='d-block d-xl-flex flex-wrap'>
                                {/* Coach checkbox column */}
                                {guardianPersonalFields.some(
                                  (f) => f.fieldName === 'isCoach',
                                ) && (
                                  <div className='col-md-3'>
                                    {guardianPersonalFields
                                      .filter((f) => f.fieldName === 'isCoach')
                                      .map((field) => {
                                        // Create a custom handler for the checkbox
                                        const handleCoachChange = (
                                          e: React.ChangeEvent<HTMLInputElement>,
                                        ) => {
                                          handleGuardianInputChange(e, index);
                                          // If unchecked, clear AAU number
                                          if (!e.target.checked) {
                                            handleGuardianInputChange(
                                              {
                                                target: {
                                                  name: 'aauNumber',
                                                  value: '',
                                                },
                                              } as React.ChangeEvent<HTMLInputElement>,
                                              index,
                                            );
                                          }
                                        };

                                        return (
                                          <div
                                            key={field.fieldName}
                                            className='mb-3 flex-fill'
                                          >
                                            <div className='form-check mt-2'>
                                              <input
                                                type='checkbox'
                                                className={`form-check-input ${gErrors.isCoach ? 'is-invalid' : ''}`}
                                                name='isCoach'
                                                id={`guardian-${index}-isCoach`}
                                                checked={
                                                  guardian.isCoach || false
                                                }
                                                onChange={handleCoachChange}
                                                disabled={!editing}
                                              />
                                              <label
                                                className='form-check-label'
                                                htmlFor={`guardian-${index}-isCoach`}
                                              >
                                                {field.label}
                                              </label>
                                              {gErrors.isCoach && (
                                                <div className='invalid-feedback d-block'>
                                                  {gErrors.isCoach}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                  </div>
                                )}

                                {/* AAU Number column - shown conditionally next to checkbox */}
                                {editing && guardian.isCoach ? (
                                  <div className='col-md-9'>
                                    <label className='form-label'>
                                      AAU Number{' '}
                                      {editing && '(Required for coaches)'}
                                    </label>
                                    <input
                                      type='text'
                                      className={`form-control ${gErrors.aauNumber ? 'is-invalid' : ''}`}
                                      name='aauNumber'
                                      value={guardian.aauNumber || ''}
                                      onChange={(e) =>
                                        handleGuardianInputChange(e, index)
                                      }
                                      placeholder='Enter AAU number'
                                      disabled={!editing}
                                    />
                                    {gErrors.aauNumber && (
                                      <div className='invalid-feedback d-block'>
                                        {gErrors.aauNumber}
                                      </div>
                                    )}
                                  </div>
                                ) : !editing &&
                                  guardian.isCoach &&
                                  guardian.aauNumber ? (
                                  <div className='col-md-9'>
                                    <label className='form-label'>
                                      AAU Number
                                    </label>
                                    <input
                                      type='text'
                                      className='form-control'
                                      value={guardian.aauNumber}
                                      disabled
                                    />
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </div>

                          {/* Address Information */}
                          <div className='card mx-3 mb-3'>
                            <div className='card-header d-flex justify-content-between align-items-center'>
                              <h6 className='mb-0'>Address Information</h6>
                              {editing && (
                                <div className='form-check'>
                                  <input
                                    type='checkbox'
                                    className='form-check-input'
                                    id={`guardian-same-address-${index}`}
                                    checked={guardianSameAsMain[index] || false}
                                    onChange={(e) =>
                                      handleGuardianSameAsMainChange(
                                        index,
                                        e.target.checked,
                                      )
                                    }
                                  />
                                  <label
                                    className='form-check-label'
                                    htmlFor={`guardian-same-address-${index}`}
                                    style={{ fontSize: '0.9rem' }}
                                  >
                                    Same as main address
                                  </label>
                                </div>
                              )}
                            </div>
                            <div className='card-body pb-0'>
                              {!editing ? (
                                <div className='mb-3'>
                                  <label className='form-label'>Address</label>
                                  <input
                                    type='text'
                                    className='form-control'
                                    value={formatAddress(guardian.address)}
                                    disabled
                                  />
                                </div>
                              ) : guardianHasAddressField ? (
                                <div className='flex-fill'>
                                  <div className='row mb-3'>
                                    <div className='col-md-8'>
                                      <label className='form-label'>
                                        Street Address
                                        {allGuardianFields.find(
                                          (f) => f.fieldName === 'address',
                                        )?.isRequired && (
                                          <span className='text-danger ms-1'>
                                            *
                                          </span>
                                        )}
                                      </label>
                                      <input
                                        type='text'
                                        className={`form-control ${gErrors['address.street'] ? 'is-invalid' : ''}`}
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
                                        placeholder='123 Main St'
                                        disabled={guardianSameAsMain[index]}
                                      />
                                      {gErrors['address.street'] && (
                                        <div className='invalid-feedback d-block'>
                                          {gErrors['address.street']}
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
                                            .street2 || ''
                                        }
                                        onChange={(e) =>
                                          handleGuardianAddressChange(
                                            e,
                                            index,
                                            'street2',
                                          )
                                        }
                                        disabled={guardianSameAsMain[index]}
                                      />
                                    </div>
                                  </div>
                                  <div className='row mb-4'>
                                    <div className='col-md-5'>
                                      <label className='form-label'>
                                        City
                                        {allGuardianFields.find(
                                          (f) => f.fieldName === 'city',
                                        )?.isRequired && (
                                          <span className='text-danger ms-1'>
                                            *
                                          </span>
                                        )}
                                      </label>
                                      <input
                                        type='text'
                                        className={`form-control ${gErrors['address.city'] ? 'is-invalid' : ''}`}
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
                                        placeholder='Seattle'
                                        disabled={guardianSameAsMain[index]}
                                      />
                                      {gErrors['address.city'] && (
                                        <div className='invalid-feedback d-block'>
                                          {gErrors['address.city']}
                                        </div>
                                      )}
                                    </div>
                                    <div className='col-md-3'>
                                      <label className='form-label'>
                                        State
                                        {allGuardianFields.find(
                                          (f) => f.fieldName === 'state',
                                        )?.isRequired && (
                                          <span className='text-danger ms-1'>
                                            *
                                          </span>
                                        )}
                                      </label>
                                      <input
                                        type='text'
                                        className={`form-control ${gErrors['address.state'] ? 'is-invalid' : ''}`}
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
                                        placeholder='WA'
                                        disabled={guardianSameAsMain[index]}
                                      />
                                      {gErrors['address.state'] && (
                                        <div className='invalid-feedback d-block'>
                                          {gErrors['address.state']}
                                        </div>
                                      )}
                                    </div>
                                    <div className='col-md-4'>
                                      <label className='form-label'>
                                        ZIP Code
                                        {allGuardianFields.find(
                                          (f) => f.fieldName === 'zip',
                                        )?.isRequired && (
                                          <span className='text-danger ms-1'>
                                            *
                                          </span>
                                        )}
                                      </label>
                                      <input
                                        type='text'
                                        className={`form-control ${gErrors['address.zip'] ? 'is-invalid' : ''}`}
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
                                        placeholder='98101'
                                        disabled={guardianSameAsMain[index]}
                                      />
                                      {gErrors['address.zip'] && (
                                        <div className='invalid-feedback d-block'>
                                          {gErrors['address.zip']}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ) : null}
                            </div>
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
              </div>
            </div>
            {/* ── Players ── */}
            <div className='card mt-3'>
              <div className='card-header d-flex justify-content-between align-items-center'>
                <h5>
                  <i className='ti ti-shirt-sport me-2' />
                  Player Information
                </h5>
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
                      const visibleFields = getPlayerVisibleFields(
                        editPlayer || player,
                      );

                      return (
                        <div key={player._id} className='mb-4'>
                          <div className='card'>
                            <div className='card-header d-flex align-items-center justify-content-between'>
                              <h5 className='mb-0'>{player.fullName}</h5>
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
