// profilesettings.tsx - Complete file with proper dynamic field handling
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
import { getDefaultAvatar, getAvatarUrl } from '../../../utils/r2Utils';
import { useAvatar } from '../../hooks/useAvatar';
import { calculateGradeFromDOB } from '../../../utils/registration-utils';
import SchoolAutocomplete from '../../../components/SchoolAutocomplete';
import NameInput from '../../../components/NameInput';
import { commonHealthConditions } from '../../constants/healthConditions';
import PlayerForm from '../../../components/forms/PlayerForm';
import { Player as RegistrationPlayer } from '../../../types/registration-types';
import { useDynamicFormFields } from '../../../feature-module/hooks/useDynamicFormFields';
import { VisibleField } from '../../../types/form-config.types';

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

const formatDOB = (dob: string): string => {
  if (!dob) return '';
  const date = new Date(dob.split('T')[0] + 'T12:00:00');
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
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

  // ── Dynamic form fields hook ──────────────────────────────────────────────
  const { getVisibleFields } = useDynamicFormFields('player', {
    registrationYear: new Date().getFullYear(),
  });

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

  // ── New player health conditions state ────────────────────────────────────
  const [newPlayerSelectedConditions, setNewPlayerSelectedConditions] =
    useState<any[]>([]);
  const [newPlayerCustomCondition, setNewPlayerCustomCondition] =
    useState<string>('');
  const [newPlayerShowCustomInput, setNewPlayerShowCustomInput] =
    useState<boolean>(false);

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

  // ── Guardian edit state ───────────────────────────────────────────────────
  const [isEditingGuardian, setIsEditingGuardian] = useState<number | null>(
    null,
  );
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

  const handleSaveEditedPlayer = async (playerId: string) => {
    const player = editedPlayers[playerId];
    if (!player) return;

    const errs: Record<string, string> = {};

    // Get visible fields for this player
    const visibleFields = getVisibleFields(player);

    visibleFields.forEach((field) => {
      const value = player[field.fieldName as keyof RegistrationPlayer];

      if (field.isRequired) {
        if (!value || (typeof value === 'string' && !value.trim())) {
          errs[field.fieldName] = `${field.label} is required`;
        }
      }

      // Special handling for grade confirmation
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

    // Get visible fields for the new player form - this is the KEY!
    // Only fields returned by getVisibleFields should be validated
    const visibleFields = getVisibleFields(newPlayerForm);

    console.log(
      'Visible fields for validation:',
      visibleFields.map((f) => f.fieldName),
    );

    // Only validate fields that are visible in the form
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

      // Add specific validations based on field type
      if (field.fieldName === 'email' && value && typeof value === 'string') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          errs[field.fieldName] = 'Please enter a valid email address';
        }
      }

      if (field.fieldName === 'phone' && value && typeof value === 'string') {
        const phoneDigits = value.replace(/\D/g, '');
        if (phoneDigits.length !== 10) {
          errs[field.fieldName] = 'Please enter a valid 10-digit phone number';
        }
      }
    });

    setNewPlayerErrors(errs);

    // Log validation results for debugging
    if (Object.keys(errs).length > 0) {
      console.log('Validation errors:', errs);
      return false;
    }

    return true;
  };

  const handleAddPlayerSubmit = async () => {
    console.log('Submit clicked, validating...');
    const isValid = validateNewPlayerForm();
    console.log('Validation result:', isValid);

    if (!isValid) {
      console.log('Validation failed, not submitting');
      return;
    }

    if (!parentId || !token) return;

    setIsSavingPlayer(true);
    try {
      // Get visible fields for the new player form - ONLY send these
      const visibleFields = getVisibleFields(newPlayerForm);

      // Build payload with only visible fields
      const payload: any = {
        parentId,
        registrationYear: new Date().getFullYear(),
        season: 'N/A',
        skipSeasonRegistration: true,
        // Always include these so backend optional() validators don't fail
        fullName: newPlayerForm.fullName?.trim() || '',
        gender: newPlayerForm.gender || '',
        dob: newPlayerForm.dob || '',
        schoolName: newPlayerForm.schoolName?.trim() || '',
        grade: newPlayerForm.grade || '',
        healthConcerns: newPlayerForm.healthConcerns || '',
        aauNumber: newPlayerForm.aauNumber || '',
        isGradeOverridden: newPlayerForm.isGradeOverridden || false,
      };

      // Only include fields that are visible in the form
      visibleFields.forEach((field) => {
        const value = newPlayerForm[field.fieldName as keyof NewPlayerForm];
        if (value !== undefined) {
          // Handle different value types appropriately
          if (typeof value === 'string') {
            payload[field.fieldName] = value.trim();
          } else {
            payload[field.fieldName] = value;
          }
        }
      });

      // Always include isGradeOverridden if present (as boolean)
      if (newPlayerForm.isGradeOverridden) {
        payload.isGradeOverridden = true;
      }

      // Log the payload for debugging
      console.log('Submitting player with payload:', payload);

      const response = await axios.post(
        `${API_BASE_URL}/players/register`,
        payload,
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

      // Log the detailed error response for debugging
      if (error.response) {
        console.error('Server response:', error.response.data);
        console.error('Status:', error.response.status);
        console.error('Headers:', error.response.headers);

        // Show specific validation errors to the user
        if (error.response.data.errors) {
          const validationErrors = error.response.data.errors
            .map((err: any) => `${err.param || err.path}: ${err.msg}`)
            .join(', ');
          console.error('Validation errors:', validationErrors);
          setNewPlayerErrors({
            general: `Validation error: ${validationErrors}`,
          });
        } else {
          setNewPlayerErrors({
            general:
              error.response.data?.error ||
              'Failed to add player. Please try again.',
          });
        }
      } else {
        setNewPlayerErrors({
          general: 'Network error. Please check your connection and try again.',
        });
      }
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

  const handleGuardianInfoSubmit = async (index: number) => {
    if (!validateGuardianForm(index)) return;
    try {
      if (!parentId || !token || !parent) return;
      const updatedGuardian = {
        ...editedGuardians[index],
        phone: editedGuardians[index].phone.replace(/\D/g, ''),
        address: ensureAddress(editedGuardians[index].address),
      };

      if (updatedGuardian._id) {
        await axios.put(
          `${API_BASE_URL}/parent/${parentId}/guardian/${index}`,
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
        updated[index] = { ...updated[index], _id: response.data._id };
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

      await axios.delete(`${API_BASE_URL}/parent/${parentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      localStorage.removeItem('token');
      localStorage.removeItem('parentId');
      localStorage.removeItem('userRole');

      setSaveStatus({
        show: true,
        variant: 'success',
        message:
          'Your account has been successfully deleted. Redirecting to home page...',
      });

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

  const openDeleteConfirmation = () => {
    setShowDeleteConfirmation(true);
    setDeleteConfirmationText('');
  };

  const closeDeleteConfirmation = () => {
    setShowDeleteConfirmation(false);
    setDeleteConfirmationText('');
  };

  // ── Helper function to render a field in read-only mode ───────────────────
  const renderReadOnlyField = (
    fieldName: string,
    value: any,
    visibleFields: VisibleField[],
  ) => {
    const field = visibleFields.find((f) => f.fieldName === fieldName);
    if (!field) return null;

    return (
      <div className='col-md-6 mb-3'>
        <label className='form-label'>{field.label}</label>
        <input type='text' className='form-control' value={value} disabled />
      </div>
    );
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
                          <div className='mb-0 flex-fill me-xl-3 me-0'>
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
                        </div>
                        <div className='d-block d-xl-flex'>
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
                          <div className='mb-3 flex-fill me-xl-3 me-0'>
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
                        {!isEditingGuardian && editedGuardians.length === 0 && (
                          <button
                            type='button'
                            className='btn btn-primary btn-sm'
                            onClick={addNewGuardian}
                          >
                            <i className='ti ti-plus me-2' /> Add
                            Parent/Guardian
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
                                        onClick={() =>
                                          handleCancelGuardianEdit(index)
                                        }
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
                                        guardianFileInputRefs.current[index] =
                                          el;
                                      },
                                      onFileChange: (e) =>
                                        handleGuardianAvatarChange(e, index),
                                      onDelete: () =>
                                        handleGuardianAvatarDelete(index),
                                    })}
                                    <div className='d-block d-xl-flex'>
                                      <div className='mb-3 flex-fill'>
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
                                            error={
                                              guardianErrors[index]?.fullName
                                            }
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
                                        {guardianErrors[index]
                                          ?.relationship && (
                                          <div className='invalid-feedback d-block'>
                                            {guardianErrors[index].relationship}
                                          </div>
                                        )}
                                      </div>
                                      <div className='mb-3 flex-fill me-xl-3 me-0'>
                                        <label className='form-label'>
                                          Email
                                        </label>
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
                                                  ensureAddress(
                                                    guardian.address,
                                                  ).street
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
                                                  ensureAddress(
                                                    guardian.address,
                                                  ).street2
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
                                                className={`form-control ${
                                                  guardianErrors[index]?.[
                                                    'address.city'
                                                  ]
                                                    ? 'is-invalid'
                                                    : ''
                                                }`}
                                                value={
                                                  ensureAddress(
                                                    guardian.address,
                                                  ).city
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
                                                  ensureAddress(
                                                    guardian.address,
                                                  ).state
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
                                                  guardianErrors[index]?.[
                                                    'address.zip'
                                                  ]
                                                    ? 'is-invalid'
                                                    : ''
                                                }`}
                                                value={
                                                  ensureAddress(
                                                    guardian.address,
                                                  ).zip
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
                                      ) : (
                                        <>
                                          <label className='form-label'>
                                            Address
                                          </label>
                                          <input
                                            type='text'
                                            className='form-control'
                                            value={formatAddress(
                                              guardian.address,
                                            )}
                                            disabled
                                          />
                                        </>
                                      )}
                                    </div>
                                    {isEditingGuardian !== index ? (
                                      <button
                                        type='button'
                                        className='btn btn-primary btn-sm mb-4'
                                        onClick={() =>
                                          setIsEditingGuardian(index)
                                        }
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
                                                  (g: any) =>
                                                    g._id === guardian._id,
                                                );
                                              if (originalGuardian) {
                                                const updated = [
                                                  ...editedGuardians,
                                                ];
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
                                          <i className='ti ti-edit me-2' /> Save
                                          Changes
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
                                  ? getAvatarUrl(
                                      player.avatar,
                                      defaultPlayerAvatar,
                                    )
                                  : null);
                              const isPlayerAvatarLoading =
                                playerAvatarUploading[player._id] ?? false;
                              const isEditingThis =
                                editingPlayerId === player._id;
                              const isSavingThis =
                                isSavingPlayerEdit === player._id;
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
                                              onClick={() =>
                                                handleEditPlayer(player)
                                              }
                                              disabled={!!editingPlayerId}
                                            >
                                              <i className='ti ti-edit me-1' />{' '}
                                              Edit
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
                                              <i className='ti ti-trash me-1' />{' '}
                                              Remove
                                            </button>
                                          </>
                                        ) : (
                                          <>
                                            <button
                                              type='button'
                                              className='btn btn-outline-secondary btn-sm'
                                              onClick={() =>
                                                handleCancelEditPlayer(
                                                  player._id,
                                                )
                                              }
                                              disabled={isSavingThis}
                                            >
                                              <i className='ti ti-x me-1' />{' '}
                                              Cancel
                                            </button>
                                            <button
                                              type='button'
                                              className='btn btn-primary btn-sm'
                                              onClick={() =>
                                                handleSaveEditedPlayer(
                                                  player._id,
                                                )
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
                                      {/* Avatar */}
                                      {!isEditingThis &&
                                        renderAvatarBlock({
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
                                            handlePlayerAvatarDelete(
                                              player._id,
                                            ),
                                        })}

                                      {isEditingThis && editPlayer ? (
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
                                              setPlayerAvatarPreviews(
                                                (prev) => ({
                                                  ...prev,
                                                  [pid]: url,
                                                }),
                                              );
                                            } else {
                                              setPlayerAvatarPreviews(
                                                (prev) => {
                                                  const n = { ...prev };
                                                  delete n[pid];
                                                  return n;
                                                },
                                              );
                                            }
                                            if (parentId) {
                                              const playerIds =
                                                parent?.players?.map(
                                                  (p: any) =>
                                                    typeof p === 'string'
                                                      ? p
                                                      : p._id,
                                                ) || [];
                                              if (playerIds.length > 0)
                                                await fetchPlayersData(
                                                  playerIds,
                                                );
                                            }
                                          }}
                                        />
                                      ) : (
                                        /* ── Read-only view with dynamic fields ── */
                                        <div className='row'>
                                          {visibleFields.map((field) => {
                                            if (
                                              field.fieldName === 'fullName'
                                            ) {
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
                                                    value={formatDOB(
                                                      player.dob || '',
                                                    )}
                                                    disabled
                                                  />
                                                </div>
                                              );
                                            }
                                            if (
                                              field.fieldName === 'schoolName'
                                            ) {
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
                                            if (
                                              field.fieldName === 'aauNumber'
                                            ) {
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
                                                      player.aauNumber || ''
                                                    }
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

                        {/* Add New Player Form - Now uses PlayerForm which already respects dynamic fields */}
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
                                <i className='ti ti-plus me-1' /> Add Another
                                Player
                              </button>
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
