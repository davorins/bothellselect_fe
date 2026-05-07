import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import ParentSidebar from './parentSidebar';
import ParentBreadcrumb from './parentBreadcrumb';
import { useAuth } from '../../../../context/AuthContext';
import { all_routes } from '../../../router/all_routes';
import axios from 'axios';
import { formatDate } from '../../../../utils/dateFormatter';
import { formatPhoneNumber } from '../../../../utils/phone';
import { getCurrentYear } from '../../../../utils/season';
import { getAvatarUrl, getDefaultAvatar } from '../../../../utils/r2Utils';
import { useDynamicFormFields } from '../../../hooks/useDynamicFormFields';
import CloverReceiptModal from '../receipts/CloverReceiptModal';

// ✅ R2 defaults
const DEFAULT_PARENT_AVATAR = getDefaultAvatar('parent');
const DEFAULT_BOY_AVATAR = getDefaultAvatar('player', 'Male');
const DEFAULT_GIRL_AVATAR = getDefaultAvatar('player', 'Female');

// ---------------------------------------------------------------------------
// Refund Modal
// ---------------------------------------------------------------------------
interface RefundModalProps {
  payment: {
    _id: string;
    amount: number;
    createdAt: string;
    cardBrand?: string;
    cardLastFour?: string;
    totalRefunded?: number;
  };
  maxRefundAmount: number;
  onRefundSubmit: (
    paymentId: string,
    amount: number,
    reason: string,
  ) => Promise<{ success: boolean } | void>;
  onClose: () => void;
}

const RefundModal: React.FC<RefundModalProps> = ({
  payment,
  maxRefundAmount,
  onRefundSubmit,
  onClose,
}) => {
  const [refundAmount, setRefundAmount] = useState<string>(
    maxRefundAmount.toFixed(2),
  );
  const [refundReason, setRefundReason] = useState<string>('Customer request');
  const [customReason, setCustomReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const reasonOptions = [
    'Customer request',
    'Duplicate payment',
    'Service not provided',
    'Cancelled order',
    'Other',
  ];

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setRefundAmount(value);
      setError('');
    }
  };

  const handleAmountBlur = () => {
    if (refundAmount === '') {
      setRefundAmount('0.00');
      return;
    }
    let amount = parseFloat(refundAmount);
    if (isNaN(amount)) amount = 0;
    if (amount < 0) amount = 0;
    if (amount > maxRefundAmount) amount = maxRefundAmount;
    setRefundAmount(amount.toFixed(2));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const amount = parseFloat(refundAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid refund amount');
      return;
    }
    if (amount > maxRefundAmount) {
      setError(`Refund amount cannot exceed $${maxRefundAmount.toFixed(2)}`);
      return;
    }
    const finalReason = refundReason === 'Other' ? customReason : refundReason;
    if (!finalReason.trim()) {
      setError('Please provide a refund reason');
      return;
    }
    setIsSubmitting(true);
    try {
      await onRefundSubmit(payment._id, amount, finalReason);
    } catch (error: any) {
      if (!error.message.includes('Refund has been initiated')) {
        let userMessage = error.message || 'Failed to process refund';
        if (userMessage.includes('already been refunded'))
          userMessage = 'This payment has already been refunded.';
        else if (userMessage.includes('not found'))
          userMessage =
            'Payment not found. Please refresh the page and try again.';
        else if (userMessage.includes('authentication'))
          userMessage = 'Session expired. Please log in again.';
        setError(userMessage);
      } else {
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);

  return (
    <div
      className='modal fade show'
      style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}
    >
      <div className='modal-dialog modal-dialog-centered'>
        <div className='modal-content'>
          <div className='modal-header'>
            <h4 className='modal-title'>Process Refund</h4>
            <button
              type='button'
              className='btn-close custom-btn-close'
              onClick={onClose}
              disabled={isSubmitting}
              aria-label='Close'
            >
              <i className='ti ti-x' />
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className='modal-body'>
              <div className='card mb-3'>
                <div className='card-body'>
                  <h6 className='card-title'>Payment Details</h6>
                  <div className='row'>
                    <div className='col-6'>
                      <small className='text-muted'>Original Amount</small>
                      <p className='mb-1'>{formatCurrency(payment.amount)}</p>
                    </div>
                    <div className='col-6'>
                      <small className='text-muted'>
                        Maximum Refund Available
                      </small>
                      <p className='mb-0 text-success fw-bold'>
                        {formatCurrency(maxRefundAmount)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className='mb-3'>
                <label htmlFor='refundAmount' className='form-label'>
                  Refund Amount *
                </label>
                <div className='input-group'>
                  <span className='input-group-text'>$</span>
                  <input
                    type='text'
                    className='form-control'
                    id='refundAmount'
                    value={refundAmount}
                    onChange={handleAmountChange}
                    onBlur={handleAmountBlur}
                    disabled={isSubmitting}
                    placeholder='0.00'
                  />
                </div>
                <div className='form-text'>
                  Maximum refundable amount: {formatCurrency(maxRefundAmount)}
                </div>
              </div>
              <div className='mb-3'>
                <label htmlFor='refundReason' className='form-label'>
                  Refund Reason *
                </label>
                <select
                  className='form-select'
                  id='refundReason'
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  disabled={isSubmitting}
                >
                  {reasonOptions.map((reason) => (
                    <option key={reason} value={reason}>
                      {reason}
                    </option>
                  ))}
                </select>
              </div>
              {refundReason === 'Other' && (
                <div className='mb-3'>
                  <label htmlFor='customReason' className='form-label'>
                    Please specify reason *
                  </label>
                  <textarea
                    className='form-control'
                    id='customReason'
                    rows={3}
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    disabled={isSubmitting}
                    placeholder='Enter specific refund reason...'
                  />
                </div>
              )}
              {error && (
                <div className='alert alert-danger mt-3'>
                  <i className='ti ti-alert-circle me-2'></i>
                  {error}
                </div>
              )}
              <div className='alert alert-warning mt-3'>
                <i className='ti ti-alert-triangle me-2'></i>
                <strong>Warning:</strong> This action cannot be undone. The
                refund will be processed immediately.
              </div>
            </div>
            <div className='modal-footer'>
              <button
                type='button'
                className='btn btn-light me-2'
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type='submit'
                className='btn btn-warning'
                disabled={isSubmitting || parseFloat(refundAmount) <= 0}
              >
                {isSubmitting ? (
                  <>
                    <span
                      className='spinner-border spinner-border-sm me-2'
                      role='status'
                    ></span>
                    Processing...
                  </>
                ) : (
                  <>
                    <i className='ti ti-refund me-2'></i>Process Refund
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------
interface GuardianData {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  address:
    | string
    | {
        street: string;
        street2: string;
        city: string;
        state: string;
        zip: string;
      };
  relationship: string;
  avatar?: string;
  aauNumber: string;
  isPrimary?: boolean;
  isCoach?: boolean;
}

interface Player {
  _id: string;
  fullName: string;
  grade: string;
  aauNumber: string;
  status: string;
  imgSrc?: string;
  avatar?: string;
  dob: string;
  gender?: string;
  seasons?: any[];
  season?: string;
  registrationYear?: number;
  registrationComplete?: boolean;
  paymentComplete?: boolean;
}

interface RefundData {
  _id: string;
  amount: number;
  reason: string;
  status: 'pending' | 'completed' | 'failed';
  requestedAt: string;
  processedAt?: string;
  notes?: string;
  refundId?: string;
}

interface PaymentData {
  _id: string;
  amount: number;
  createdAt: string;
  cardBrand?: string;
  cardLastFour?: string;
  receiptUrl?: string;
  playerIds?: string[];
  parentId?: string;
  refunds?: RefundData[];
  totalRefunded?: number;
  refundStatus?: 'none' | 'partial' | 'full' | 'requested' | 'processing';
  paymentId?: string;
  paymentSystem?: 'square' | 'clover' | 'stripe' | 'paypal';
  orderId?: string;
}

interface ParentWithStatus {
  _id: string;
  id?: string;
  fullName?: string;
  phone?: string;
  email?: string;
  address?: any;
  aauNumber?: string;
  avatar?: string;
  players?: Player[];
  isCoach?: boolean;
  status?: string;
  additionalGuardians?: any[];
  role?: string;
}

interface RefundModalState {
  isOpen: boolean;
  payment: PaymentData | null;
  maxRefundAmount: number;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
const ParentDetails = () => {
  const location = useLocation();
  const { parentId } = useParams<{ parentId?: string }>();
  const navigate = useNavigate();
  const { fetchParentData, user: authUser } = useAuth();
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

  const [parent, setParent] = useState<ParentWithStatus | null>(() => {
    const p = location.state?.parent;
    if (!p) return null;
    const defaultAvatar = getDefaultAvatar(p.isCoach ? 'coach' : 'parent');
    return { ...p, avatar: getAvatarUrl(p.avatar, defaultAvatar) };
  });

  const [players, setPlayers] = useState<Player[]>(() => {
    const pl = location.state?.players || [];
    return pl.map((player: Player) => ({
      ...player,
      imgSrc: getAvatarUrl(
        player.avatar || player.imgSrc,
        player.gender === 'Female' ? DEFAULT_GIRL_AVATAR : DEFAULT_BOY_AVATAR,
      ),
    }));
  });

  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [activeTab, setActiveTab] = useState('family');
  const [isLoading, setIsLoading] = useState(!location.state?.parent);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [refundModal, setRefundModal] = useState<RefundModalState>({
    isOpen: false,
    payment: null,
    maxRefundAmount: 0,
  });
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const prevParentIdRef = useRef<string | undefined>(undefined);
  const [guardianAvatarStates, setGuardianAvatarStates] = useState<
    Record<string, string>
  >({});

  const currentUser = authUser as ParentWithStatus | null;
  const isAdmin = currentUser?.role === 'admin';
  const isCoach = currentUser?.isCoach || currentUser?.role === 'coach';
  const currentUserId = currentUser?._id || currentUser?.id;

  // ── Dynamic fields ──────────────────────────────────────────────────────
  const { getVisibleFields: getGuardianVisibleFields } = useDynamicFormFields(
    'guardian',
    { registrationYear: new Date().getFullYear() },
  );
  const { getVisibleFields: getPlayerVisibleFields } = useDynamicFormFields(
    'player',
    { registrationYear: new Date().getFullYear() },
  );

  const guardianVisibleFields = useMemo(
    () => getGuardianVisibleFields({} as any),
    [getGuardianVisibleFields],
  );
  // Use first player's data for field config if available
  const playerVisibleFields = useMemo(
    () =>
      players.length > 0
        ? getPlayerVisibleFields(players[0] as any)
        : getPlayerVisibleFields({} as any),
    [players, getPlayerVisibleFields],
  );

  const hasGuardianField = (name: string) =>
    guardianVisibleFields.some((f) => f.fieldName === name);
  const hasPlayerField = (name: string) =>
    playerVisibleFields.some((f) => f.fieldName === name);

  // ── Avatar resolve on mount ─────────────────────────────────────────────
  useEffect(() => {
    const resolveAvatarFromApi = async () => {
      const resolveId = parent?._id || parent?.id || parentId;
      if (!resolveId) return;
      const currentAvatar = parent?.avatar ?? '';
      const isLegacyOrMissing =
        !currentAvatar ||
        currentAvatar.includes('partizan-be.onrender.com') ||
        !currentAvatar.startsWith('http');
      if (!isLegacyOrMissing) return;
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(
          `${API_BASE_URL}/parent/${resolveId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        const freshAvatar = response.data?.avatar;
        const defaultAvatar = getDefaultAvatar(
          parent?.isCoach ? 'coach' : 'parent',
        );
        if (freshAvatar) {
          const resolvedAvatar = getAvatarUrl(freshAvatar, defaultAvatar);
          const freshGuardians = response.data?.additionalGuardians;
          setParent((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              avatar: resolvedAvatar,
              ...(freshGuardians && Array.isArray(freshGuardians)
                ? { additionalGuardians: freshGuardians }
                : {}),
            };
          });
        }
      } catch (err) {
        console.warn('Could not resolve fresh avatar from API:', err);
      }
    };
    resolveAvatarFromApi();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parent?._id]);

  // ── Guardian avatar init ────────────────────────────────────────────────
  useEffect(() => {
    if (parent?.additionalGuardians) {
      const newAvatarStates: Record<string, string> = {};
      parent.additionalGuardians.forEach((guardian: any, index: number) => {
        const isGuardianCoach =
          guardian.isCoach === true ||
          guardian.role === 'coach' ||
          guardian.type === 'coach' ||
          (guardian.aauNumber && guardian.aauNumber.trim() !== '');
        const defaultAvatar = getDefaultAvatar(
          isGuardianCoach ? 'coach' : 'parent',
        );
        const avatarKey = guardian._id || guardian.id || `guardian-${index}`;
        newAvatarStates[avatarKey] = getAvatarUrl(
          guardian.avatar,
          defaultAvatar,
        );
      });
      setGuardianAvatarStates(newAvatarStates);
    }
  }, [parent?.additionalGuardians]);

  const calculateParentStatus = (
    parentData: ParentWithStatus,
    playersData: Player[],
  ): string => {
    if (parentData.isCoach) return 'Active';
    const currentYear = getCurrentYear();
    const hasCurrentSeasonRegistration = playersData.some((player) => {
      if (player.seasons && Array.isArray(player.seasons)) {
        if (player.seasons.some((season: any) => season.year === currentYear))
          return true;
      }
      return player.season && player.registrationYear === currentYear;
    });
    if (hasCurrentSeasonRegistration) return 'Active';
    const hasPendingPayments = playersData.some(
      (player) => player.registrationComplete && !player.paymentComplete,
    );
    return hasPendingPayments ? 'Pending Payment' : 'Inactive';
  };

  // ── Full data load ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!parentId || prevParentIdRef.current === parentId) return;

    const loadParentAndPayments = async () => {
      setIsLoading(true);
      try {
        const parentData = await fetchParentData(parentId);
        if (!parentData) throw new Error('Parent not found');
        const defaultAvatar = getDefaultAvatar(
          parentData.isCoach ? 'coach' : 'parent',
        );
        const formattedParent = {
          ...parentData,
          avatar: getAvatarUrl(parentData.avatar, defaultAvatar),
        };
        const formattedPlayers = (parentData.players || []).map((player) => ({
          ...player,
          imgSrc: getAvatarUrl(
            player.avatar || player.imgSrc,
            player.gender === 'Female'
              ? DEFAULT_GIRL_AVATAR
              : DEFAULT_BOY_AVATAR,
          ),
        }));
        setPlayers(formattedPlayers);
        const parentStatus = calculateParentStatus(
          formattedParent,
          formattedPlayers,
        );
        setParent({ ...formattedParent, status: parentStatus });
        await loadPayments(parentData._id);
      } catch (err) {
        console.error('Error loading data:', err);
        setPaymentError('Failed to load data. Please try again.');
        navigate(all_routes.parentList);
      } finally {
        setIsLoading(false);
      }
    };

    const loadPayments = async (id: string) => {
      setPaymentLoading(true);
      setPaymentError(null);
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(
          `${API_BASE_URL}/payment/parent/${id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (response.data && Array.isArray(response.data)) {
          setPayments(response.data);
        } else {
          setPaymentError('Payment data format error');
        }
      } catch (err) {
        console.error('Payment load error:', err);
        setPaymentError('Failed to load payments. Please try again.');
      } finally {
        setPaymentLoading(false);
      }
    };

    loadParentAndPayments();
    prevParentIdRef.current = parentId;
  }, [parentId, fetchParentData, navigate, API_BASE_URL]);

  // ── Helpers ─────────────────────────────────────────────────────────────
  const calculateAge = (dob: string): string => {
    if (!dob) return 'N/A';
    try {
      const birthDate = new Date(dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birthDate.getDate())
      )
        age--;
      return age.toString();
    } catch {
      return 'N/A';
    }
  };

  const handleViewPlayer = (player: Player) => {
    navigate(`${all_routes.playerDetail}/${player._id}`, {
      state: {
        player,
        guardians: parent
          ? [parent, ...(parent.additionalGuardians || [])]
          : [],
        siblings: players.filter((p) => p._id !== player._id),
      },
    });
  };

  const refreshPayments = async () => {
    if (!parent?._id) return;
    setPaymentLoading(true);
    setPaymentError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_BASE_URL}/payment/parent/${parent._id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (response.data && Array.isArray(response.data)) {
        setPayments(response.data);
      } else {
        setPaymentError('Received invalid payment data');
      }
    } catch (err) {
      console.error('Refresh error:', err);
      setPaymentError('Failed to refresh payments');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleRefundSubmit = async (
    paymentMongoId: string,
    amount: number,
    reason: string,
  ): Promise<{ success: boolean }> => {
    try {
      const token = localStorage.getItem('token');
      const payment = payments.find((p) => p._id === paymentMongoId);
      if (!payment) throw new Error('Payment not found in local data');
      if (!payment.paymentId)
        throw new Error('No Square payment ID found for this payment');
      const response = await axios.post(
        `${API_BASE_URL}/payment/refund`,
        { paymentId: payment.paymentId, amount, reason, parentId: parent?._id },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        },
      );
      handleCloseRefundModal();
      if (response.data.success) {
        alert('✅ Refund processed successfully!');
        setTimeout(() => refreshPayments(), 1000);
        return { success: true };
      } else {
        alert(`❌ Refund failed: ${response.data.error || 'Unknown error'}`);
        return { success: false };
      }
    } catch (error: any) {
      handleCloseRefundModal();
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        'Failed to process refund request';
      setTimeout(() => alert(`❌ Refund Error: ${errorMessage}`), 100);
      return { success: false };
    }
  };

  const calculateEligibilityManually = (payment: PaymentData) => {
    const totalRefunded = payment.totalRefunded || 0;
    const availableForRefund = payment.amount - totalRefunded;
    return {
      canRefund: availableForRefund > 0 && isAdmin,
      availableAmount: availableForRefund,
      originalAmount: payment.amount,
      alreadyRefunded: totalRefunded,
      refundStatus: payment.refundStatus || 'none',
      paymentId: payment._id,
      currency: 'USD',
      isManualCalculation: true,
    };
  };

  const checkRefundEligibility = async (payment: PaymentData) => {
    try {
      const token = localStorage.getItem('token');
      try {
        const response = await axios.get(
          `${API_BASE_URL}/payment/${payment._id}/refund-eligibility`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (response.data.success) return response.data.eligibility;
      } catch (endpointError: any) {
        if (endpointError.response?.status === 404)
          return calculateEligibilityManually(payment);
        throw endpointError;
      }
      throw new Error('Failed to check refund eligibility');
    } catch (error: any) {
      return calculateEligibilityManually(payment);
    }
  };

  const handleRefundWithEligibilityCheck = async (payment: PaymentData) => {
    try {
      if (!isAdmin) {
        alert(
          'Only administrators can process refunds. Please contact support.',
        );
        return;
      }
      const eligibility = await checkRefundEligibility(payment);
      if (!eligibility.canRefund) {
        let message = 'This payment cannot be refunded.';
        if (eligibility.alreadyRefunded > 0)
          message += ` Already refunded: $${eligibility.alreadyRefunded.toFixed(2)}`;
        if (eligibility.refundStatus && eligibility.refundStatus !== 'none')
          message += ` Status: ${eligibility.refundStatus}`;
        alert(message);
        return;
      }
      setRefundModal({
        isOpen: true,
        payment,
        maxRefundAmount: eligibility.availableAmount,
      });
    } catch (error: any) {
      alert(`Refund Error: ${error.message}`);
    }
  };

  const handleCloseRefundModal = () =>
    setRefundModal({ isOpen: false, payment: null, maxRefundAmount: 0 });

  const getRefundableAmount = (payment: PaymentData): number => {
    try {
      return Math.max(0, payment.amount - (payment.totalRefunded || 0));
    } catch {
      return 0;
    }
  };

  const canRefundPayment = (payment: PaymentData): boolean => {
    const refundableAmount = getRefundableAmount(payment);
    const hasRefundStatus =
      payment.refundStatus && payment.refundStatus !== 'none';
    return refundableAmount > 0 && !hasRefundStatus && isAdmin;
  };

  const getRefundStatusBadge = (payment: PaymentData) => {
    if (!payment.refundStatus || payment.refundStatus === 'none') {
      const refundableAmount = getRefundableAmount(payment);
      if (refundableAmount > 0 && isAdmin) {
        return (
          <span className='badge badge-soft-success'>
            Refundable: ${refundableAmount.toFixed(2)}
          </span>
        );
      }
      return null;
    }
    const statusConfig = {
      requested: { class: 'badge-soft-warning', text: 'Refund Requested' },
      partial: { class: 'badge-soft-info', text: 'Partially Refunded' },
      full: { class: 'badge-soft-secondary', text: 'Fully Refunded' },
      processing: { class: 'badge-soft-primary', text: 'Processing Refund' },
    };
    const config =
      statusConfig[payment.refundStatus as keyof typeof statusConfig];
    if (!config) return null;
    return <span className={`badge ${config.class} ms-2`}>{config.text}</span>;
  };

  const renderRefundHistory = () => {
    const allRefunds = payments
      .flatMap((payment) =>
        (payment.refunds || []).map((refund) => ({ ...refund, payment })),
      )
      .sort(
        (a, b) =>
          new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime(),
      );
    if (allRefunds.length === 0) return null;
    return (
      <div className='card mt-4'>
        <div className='card-header'>
          <h5 className='card-title mb-0'>Refund History</h5>
        </div>
        <div className='card-body'>
          <div className='table-responsive'>
            <table className='table table-sm'>
              <thead>
                <tr>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Reason</th>
                  <th>Payment Date</th>
                </tr>
              </thead>
              <tbody>
                {allRefunds.map((refund, index) => (
                  <tr key={index}>
                    <td>${refund.amount.toFixed(2)}</td>
                    <td>
                      <span
                        className={`badge badge-soft-${refund.status === 'completed' ? 'success' : refund.status === 'pending' ? 'warning' : 'danger'}`}
                      >
                        {refund.status}
                      </span>
                    </td>
                    <td>{refund.reason}</td>
                    <td>{formatDate(refund.payment.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderPaymentsTable = () => (
    <div className='table-responsive'>
      <table className='table table-hover'>
        <thead className='table-light'>
          <tr>
            <th>Amount</th>
            <th>Date</th>
            <th>Payment Method</th>
            <th>Refund Status</th>
            <th>Actions</th>
            <th>Receipt</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((payment) => {
            const refundableAmount = getRefundableAmount(payment);
            const canRefund = canRefundPayment(payment);

            // ✅ Determine receipt handling based on payment system
            const renderReceiptButton = () => {
              // Square payments - use external receipt URL
              if (payment.paymentSystem === 'square' && payment.receiptUrl) {
                return (
                  <a
                    href={payment.receiptUrl}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='btn btn-sm btn-outline-primary'
                  >
                    View Receipt
                  </a>
                );
              }

              // Clover payments - use internal receipt page with orderId
              // if (payment.paymentSystem === 'clover' && payment.orderId) {
              //   return (
              //     <a
              //       href={`/receipts/clover/${payment.orderId}`}
              //       className='btn btn-sm btn-outline-primary'
              //     >
              //       View Receipt
              //     </a>
              //   );
              // }

              // ✅ Clover payments - open in modal
              if (payment.paymentSystem === 'clover' && payment.orderId) {
                return (
                  <button
                    onClick={() => {
                      // Handle undefined by providing a fallback
                      setSelectedOrderId(payment.orderId || null);
                      setShowReceiptModal(true);
                    }}
                    className='btn btn-sm btn-outline-primary'
                  >
                    View Receipt
                  </button>
                );
              }

              // Fallback for any payment with receiptUrl (other processors)
              if (payment.receiptUrl) {
                return (
                  <a
                    href={payment.receiptUrl}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='btn btn-sm btn-outline-primary'
                  >
                    View Receipt
                  </a>
                );
              }

              // No receipt available
              return <span className='text-muted'>No receipt</span>;
            };

            return (
              <tr key={payment._id}>
                <td>
                  <div>
                    <span
                      className={
                        payment.totalRefunded && payment.totalRefunded > 0
                          ? 'text-decoration-line-through text-muted'
                          : ''
                      }
                    >
                      ${payment.amount.toFixed(2)}
                    </span>
                    {payment.totalRefunded && payment.totalRefunded > 0 && (
                      <div className='text-success'>
                        ${(payment.amount - payment.totalRefunded).toFixed(2)}{' '}
                        remaining
                      </div>
                    )}
                  </div>
                </td>
                <td>{formatDate(payment.createdAt)}</td>
                <td>
                  {payment.cardBrand && payment.cardBrand !== 'UNKNOWN'
                    ? `${payment.cardBrand} card`
                    : 'Card'}{' '}
                  {payment.cardLastFour && payment.cardLastFour !== '****'
                    ? `ending in ${payment.cardLastFour}`
                    : ''}
                </td>
                <td>{getRefundStatusBadge(payment)}</td>
                <td>
                  {canRefund && (
                    <button
                      className='btn btn-sm btn-outline-warning'
                      onClick={() => handleRefundWithEligibilityCheck(payment)}
                    >
                      Process Refund
                    </button>
                  )}
                  {!canRefund && refundableAmount === 0 && (
                    <span className='text-muted small'>
                      No refund available
                    </span>
                  )}
                </td>
                <td>{renderReceiptButton()}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  if (isLoading) return <div className='loading-spinner'>Loading...</div>;
  if (!parent) return <div>No parent data found.</div>;

  return (
    <div className='page-wrapper'>
      <div className='content'>
        <div className='row'>
          <ParentBreadcrumb parent={parent} />
        </div>
        <div className='row'>
          <ParentSidebar parent={parent} />
          <div className='col-xxl-9 col-xl-8'>
            {/* Tab Navigation */}
            <div className='card mb-4'>
              <div className='card-header p-0 border-0'>
                <ul className='nav nav-tabs nav-justified' role='tablist'>
                  <li className='nav-item' role='presentation'>
                    <button
                      className={`nav-link ${activeTab === 'family' ? 'active' : ''}`}
                      onClick={() => setActiveTab('family')}
                    >
                      <i className='ti ti-users me-2'></i>Family Information
                    </button>
                  </li>
                  <li className='nav-item' role='presentation'>
                    <button
                      className={`nav-link ${activeTab === 'payments' ? 'active' : ''} ${payments.length === 0 ? 'text-danger' : ''}`}
                      onClick={() => setActiveTab('payments')}
                    >
                      <i
                        className={`ti ti-credit-card me-2 ${payments.length === 0 ? 'text-danger' : ''}`}
                      ></i>
                      {payments.length === 0
                        ? 'No Payment History'
                        : 'Payment History'}
                    </button>
                  </li>
                </ul>
              </div>
            </div>

            {/* Tab Content */}
            <div className='tab-content pt-0'>
              {activeTab === 'family' && (
                <div className='tab-pane fade show active'>
                  {/* ── Guardians Card ── */}
                  <div className='card mb-4'>
                    <div className='card-header'>
                      <h5 className='card-title mb-0'>Guardians Information</h5>
                    </div>
                    <div className='card-body'>
                      {/* Primary Parent */}
                      <div className='border rounded p-3 pb-0 mb-3'>
                        <div className='row'>
                          {/* Name — always shown */}
                          <div className='col-sm-6 col-lg-3'>
                            <div className='d-flex align-items-center mb-3'>
                              <span className='avatar avatar-lg flex-shrink-0'>
                                <img
                                  src={
                                    parent.avatar ||
                                    getDefaultAvatar(
                                      parent.isCoach ? 'coach' : 'parent',
                                    )
                                  }
                                  className='img-fluid rounded'
                                  alt={`${parent.fullName} avatar`}
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src =
                                      getDefaultAvatar(
                                        parent.isCoach ? 'coach' : 'parent',
                                      );
                                  }}
                                />
                              </span>
                              <div className='ms-2 overflow-hidden'>
                                <h6 className='text-truncate'>
                                  {parent.fullName}
                                  {parent.isCoach && (
                                    <span className='badge badge-soft-primary ms-2'>
                                      Coach
                                    </span>
                                  )}
                                </h6>
                                <p>Primary Guardian</p>
                              </div>
                            </div>
                          </div>

                          {/* AAU — show if isCoach field enabled or parent is coach */}
                          {(hasGuardianField('isCoach') || parent.isCoach) && (
                            <div className='col-sm-6 col-lg-3'>
                              <div className='mb-3'>
                                <p className='text-dark fw-medium mb-1'>
                                  AAU Number
                                </p>
                                <p>{parent.aauNumber || 'Not Available'}</p>
                              </div>
                            </div>
                          )}

                          {/* Phone — gated */}
                          {hasGuardianField('phone') && (
                            <div className='col-sm-6 col-lg-3'>
                              <div className='mb-3'>
                                <p className='text-dark fw-medium mb-1'>
                                  Phone
                                </p>
                                <p>
                                  {parent.phone
                                    ? formatPhoneNumber(parent.phone)
                                    : 'N/A'}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Email — gated */}
                          {hasGuardianField('email') && (
                            <div className='col-sm-6 col-lg-3'>
                              <div className='mb-3 overflow-hidden me-3'>
                                <p className='text-dark fw-medium mb-1'>
                                  Email
                                </p>
                                <p className='text-truncate'>
                                  {parent.email || 'N/A'}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Additional Guardians */}
                      {parent.additionalGuardians &&
                      parent.additionalGuardians.length > 0 ? (
                        parent.additionalGuardians.map(
                          (guardian: any, index: number) => {
                            const isGuardianCoach =
                              guardian.isCoach === true ||
                              guardian.role === 'coach' ||
                              guardian.type === 'coach' ||
                              (guardian.aauNumber &&
                                guardian.aauNumber.trim() !== '');
                            const defaultAvatar = getDefaultAvatar(
                              isGuardianCoach ? 'coach' : 'parent',
                            );
                            const avatarKey =
                              guardian._id ||
                              guardian.id ||
                              `guardian-${index}`;
                            const guardianAvatarSrc =
                              guardianAvatarStates[avatarKey] ||
                              getAvatarUrl(guardian.avatar, defaultAvatar);

                            return (
                              <div
                                key={avatarKey}
                                className='border rounded p-3 pb-0 mb-3'
                              >
                                <div className='row'>
                                  {/* Name — always shown */}
                                  <div className='col-sm-6 col-lg-3'>
                                    <div className='d-flex align-items-center mb-3'>
                                      <span className='avatar avatar-lg flex-shrink-0'>
                                        <img
                                          src={guardianAvatarSrc}
                                          className='img-fluid rounded'
                                          alt={`${guardian.fullName} avatar`}
                                          onError={(e) => {
                                            (e.target as HTMLImageElement).src =
                                              defaultAvatar;
                                          }}
                                        />
                                      </span>
                                      <div className='ms-2 overflow-hidden'>
                                        <h6 className='text-truncate'>
                                          {guardian.fullName}
                                          {isGuardianCoach && (
                                            <span className='badge badge-soft-primary ms-2'>
                                              Coach
                                            </span>
                                          )}
                                        </h6>
                                        <p>
                                          {guardian.relationship || 'Guardian'}
                                        </p>
                                      </div>
                                    </div>
                                  </div>

                                  {/* AAU — gated */}
                                  {(hasGuardianField('isCoach') ||
                                    isGuardianCoach) && (
                                    <div className='col-sm-6 col-lg-3'>
                                      <div className='mb-3'>
                                        <p className='text-dark fw-medium mb-1'>
                                          AAU Number
                                        </p>
                                        <p>
                                          {guardian.aauNumber ||
                                            'Not Available'}
                                        </p>
                                      </div>
                                    </div>
                                  )}

                                  {/* Phone — gated */}
                                  {hasGuardianField('phone') && (
                                    <div className='col-sm-6 col-lg-3'>
                                      <div className='mb-3'>
                                        <p className='text-dark fw-medium mb-1'>
                                          Phone
                                        </p>
                                        <p>
                                          {guardian.phone
                                            ? formatPhoneNumber(guardian.phone)
                                            : 'N/A'}
                                        </p>
                                      </div>
                                    </div>
                                  )}

                                  {/* Email — gated */}
                                  {hasGuardianField('email') && (
                                    <div className='col-sm-6 col-lg-3'>
                                      <div className='mb-3 overflow-hidden me-3'>
                                        <p className='text-dark fw-medium mb-1'>
                                          Email
                                        </p>
                                        <p className='text-truncate'>
                                          {guardian.email || 'N/A'}
                                        </p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          },
                        )
                      ) : (
                        <p className='text-muted'>
                          No additional guardians data available.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* ── Players Card ── */}
                  <div className='card'>
                    <div className='card-header'>
                      <h5 className='card-title mb-0'>Players Information</h5>
                    </div>
                    <div className='card-body'>
                      {players.length > 0 ? (
                        players.map((player) => (
                          <div
                            key={player._id}
                            className='border rounded p-3 pb-0 mb-3'
                          >
                            <div className='row'>
                              {/* Name — always shown */}
                              <div className='col-sm-6 col-lg-3'>
                                <div className='d-flex align-items-center mb-3'>
                                  <span className='avatar avatar-lg flex-shrink-0'>
                                    <img
                                      src={
                                        player.imgSrc ||
                                        (player.gender === 'Female'
                                          ? DEFAULT_GIRL_AVATAR
                                          : DEFAULT_BOY_AVATAR)
                                      }
                                      className='img-fluid'
                                      alt={`${player.fullName} avatar`}
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src =
                                          player.gender === 'Female'
                                            ? DEFAULT_GIRL_AVATAR
                                            : DEFAULT_BOY_AVATAR;
                                      }}
                                    />
                                  </span>
                                  <div className='ms-2 overflow-hidden'>
                                    <h6 className='text-truncate'>
                                      {player.fullName}
                                    </h6>
                                  </div>
                                </div>
                              </div>

                              {/* Age — gated on dob field */}
                              {hasPlayerField('dob') && (
                                <div className='col-sm-6 col-lg-3'>
                                  <div className='mb-3'>
                                    <p className='text-dark fw-medium mb-1'>
                                      Age
                                    </p>
                                    <p>{calculateAge(player.dob)}</p>
                                  </div>
                                </div>
                              )}

                              {/* AAU Number — gated */}
                              {hasPlayerField('aauNumber') && (
                                <div className='col-sm-6 col-lg-3'>
                                  <div className='mb-3'>
                                    <p className='text-dark fw-medium mb-1'>
                                      AAU Number
                                    </p>
                                    <p>{player.aauNumber || 'N/A'}</p>
                                  </div>
                                </div>
                              )}

                              {/* Grade — gated */}
                              {hasPlayerField('grade') && (
                                <div className='col-sm-6 col-lg-2'>
                                  <div className='mb-3'>
                                    <p className='text-dark fw-medium mb-1'>
                                      Grade
                                    </p>
                                    <p>{player.grade || 'N/A'}</p>
                                  </div>
                                </div>
                              )}

                              {/* View button — always shown */}
                              <div className='col-sm-6 col-lg-1'>
                                <div className='d-flex align-items-center justify-content-end'>
                                  <button
                                    onClick={() => handleViewPlayer(player)}
                                    className='btn btn-primary btn-sm mb-3'
                                  >
                                    View
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className='text-muted'>No players data available.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Payments Tab */}
              {activeTab === 'payments' && (
                <div className='tab-pane fade show active'>
                  <div className='card'>
                    <div className='card-header d-flex justify-content-between align-items-center'>
                      <h5 className='card-title mb-0'>Payment History</h5>
                      <button
                        className='btn btn-sm btn-outline-primary'
                        onClick={refreshPayments}
                        disabled={paymentLoading}
                      >
                        {paymentLoading ? 'Refreshing...' : 'Refresh Payments'}
                      </button>
                    </div>
                    <div className='card-body'>
                      {paymentLoading ? (
                        <div className='text-center'>
                          <div
                            className='spinner-border text-primary'
                            role='status'
                          >
                            <span className='visually-hidden'>Loading...</span>
                          </div>
                          <p>Loading payment history...</p>
                        </div>
                      ) : paymentError ? (
                        <div className='alert alert-danger'>
                          <i className='ti ti-alert-circle me-2'></i>
                          {paymentError}
                          <button
                            className='btn btn-sm btn-outline-primary ms-3'
                            onClick={refreshPayments}
                          >
                            Retry
                          </button>
                        </div>
                      ) : payments.length > 0 ? (
                        <>
                          {renderPaymentsTable()}
                          {renderRefundHistory()}
                        </>
                      ) : (
                        <div className='alert alert-info'>
                          <i className='ti ti-info-circle me-2'></i>
                          No payment records found. If you've made a payment
                          recently, it may take a few minutes to appear.
                          <button
                            className='btn btn-sm btn-outline-primary ms-3'
                            onClick={refreshPayments}
                          >
                            Refresh
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Clover Receipt Modal */}
      <CloverReceiptModal
        show={showReceiptModal}
        onClose={() => {
          setShowReceiptModal(false);
          setSelectedOrderId(null);
        }}
        orderId={selectedOrderId || ''}
      />

      {refundModal.isOpen && refundModal.payment && (
        <RefundModal
          payment={refundModal.payment}
          maxRefundAmount={refundModal.maxRefundAmount}
          onRefundSubmit={handleRefundSubmit}
          onClose={handleCloseRefundModal}
        />
      )}
    </div>
  );
};

export default ParentDetails;
