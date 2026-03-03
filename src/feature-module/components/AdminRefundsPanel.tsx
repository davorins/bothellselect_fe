import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import { Select, Button, Tooltip, Input, Table, Alert } from 'antd';
import Swal from 'sweetalert2';
import type { SweetAlertIcon, SweetAlertInput } from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

interface RefundData {
  _id: string;
  amount: number;
  reason: string;
  status: 'pending' | 'completed' | 'failed';
  requestedAt?: string;
  processedAt?: string;
  notes?: string;
  refundId?: string;
  squareRefundId?: string;
  source?: string;
  requestedBy?: string;
}

interface ParentData {
  fullName: string;
  email: string;
  phone?: string;
}

interface PaymentWithRefunds {
  _id: string;
  amount: number;
  totalRefunded?: number;
  refundedAmount?: number;
  refundStatus?: string;
  createdAt: string;
  parent: ParentData[];
  refunds: RefundData[];
  requestedByUser?: Array<{
    fullName: string;
  }>;
  paymentId: string;
  receiptUrl?: string;
  status: string;
  cardLastFour?: string;
  cardBrand?: string;
  buyerEmail?: string;
}

interface SyncResult {
  success: boolean;
  message?: string;
  totalPaymentsProcessed?: number;
  totalRefundsSynced?: number;
  totalAmountRefunded?: number;
  error?: string;
}

const AdminRefundsPanel: React.FC = () => {
  const [payments, setPayments] = useState<PaymentWithRefunds[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [syncLoading, setSyncLoading] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'all' | 'sync'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [cardSearch, setCardSearch] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [tableLoading, setTableLoading] = useState<boolean>(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
  });
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

  useEffect(() => {
    if (activeTab === 'all') {
      fetchAllRefunds();
    }
  }, [activeTab]);

  const fetchAllRefunds = async (): Promise<void> => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      console.log('Fetching all refunds from:', `${API_BASE_URL}/refunds/all`);

      const response = await axios.get(`${API_BASE_URL}/refunds/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log('API Response:', response.data);

      if (response.data && Array.isArray(response.data)) {
        setPayments(response.data);
        console.log(
          'Payments with refunds set:',
          response.data.length,
          'items'
        );

        // Log the refunds for debugging
        response.data.forEach((payment: PaymentWithRefunds) => {
          console.log(
            `Payment ${payment._id} has ${
              payment.refunds?.length || 0
            } refunds:`,
            payment.refunds
          );
        });
      } else {
        console.warn('Unexpected response format:', response.data);
        setPayments([]);
      }
    } catch (error: any) {
      console.error('Error fetching all refunds:', error);
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        'Failed to fetch refunds';
      setError(errorMessage);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  const processRefund = async (
    paymentId: string,
    refundId: string,
    action: 'approve' | 'reject',
    notes: string = ''
  ): Promise<void> => {
    try {
      const token = localStorage.getItem('token');

      console.log('🔄 Processing refund:', {
        paymentId,
        refundId,
        action,
        notes,
        endpoint: `${API_BASE_URL}/refunds/process`,
      });

      const response = await axios.post(
        `${API_BASE_URL}/refunds/process`,
        {
          paymentId,
          refundId,
          action,
          adminNotes: notes,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      console.log('✅ Refund response:', response.data);

      if (response.data.success) {
        Swal.fire({
          icon: 'success',
          title: `Refund ${action}d`,
          text: response.data.message || `Refund ${action}d successfully`,
          confirmButtonText: 'OK',
          confirmButtonColor: '#28a745',
          customClass: {
            confirmButton: 'btn btn-success',
          },
        });

        // Refresh the refunds list
        fetchAllRefunds();
      } else {
        throw new Error(response.data.error || 'Failed to process refund');
      }
    } catch (error: any) {
      console.error('❌ Error processing refund:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });

      let errorMessage = 'Failed to process refund';

      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error. Please check backend configuration.';
      } else if (error.response?.status === 401) {
        errorMessage = 'Authentication failed. Please log in again.';
      }

      Swal.fire({
        icon: 'error',
        title: 'Refund Failed',
        text: errorMessage,
        confirmButtonText: 'OK',
        confirmButtonColor: '#dc3545',
        customClass: {
          confirmButton: 'btn btn-danger',
        },
      });
    }
  };

  const syncSquareRefunds = async (): Promise<void> => {
    setSyncLoading(true);
    setSyncMessage('');
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_BASE_URL}/payment/sync/refunds`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const result: SyncResult = response.data;
      if (result.success) {
        setSyncMessage(result.message || 'Refunds synced successfully!');
        fetchAllRefunds();
      } else {
        setSyncMessage(result.error || 'Sync failed');
      }
    } catch (error: any) {
      console.error('Error syncing refunds:', error);
      setSyncMessage(error.response?.data?.error || 'Sync failed');
    } finally {
      setSyncLoading(false);
    }
  };

  const syncRefundsByDateRange = async (): Promise<void> => {
    const startDate = prompt('Enter start date (YYYY-MM-DD):');
    const endDate = prompt('Enter end date (YYYY-MM-DD):');

    if (!startDate || !endDate) return;

    setSyncLoading(true);
    setSyncMessage('');
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_BASE_URL}/payment/sync/refunds/by-date`,
        { startDate, endDate },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const result: SyncResult = response.data;
      if (result.success) {
        setSyncMessage(result.message || 'Refunds synced successfully!');
        fetchAllRefunds();
      } else {
        setSyncMessage(result.error || 'Sync failed');
      }
    } catch (error: any) {
      console.error('Error syncing refunds by date:', error);
      setSyncMessage(error.response?.data?.error || 'Sync failed');
    } finally {
      setSyncLoading(false);
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getCardBrandIcon = (brand?: string): string => {
    const brandMap: { [key: string]: string } = {
      VISA: 'ti ti-credit-card',
      MASTERCARD: 'ti ti-credit-card',
      AMERICAN_EXPRESS: 'ti ti-credit-card',
      DISCOVER: 'ti ti-credit-card',
      JCB: 'ti ti-credit-card',
      UNIONPAY: 'ti ti-credit-card',
      SQUARE_GIFT_CARD: 'ti ti-gift',
      UNKNOWN: 'ti ti-credit-card',
    };
    return brandMap[brand?.toUpperCase() || ''] || 'ti ti-credit-card';
  };

  const getCardBrandName = (brand?: string): string => {
    const brandMap: { [key: string]: string } = {
      VISA: 'Visa',
      MASTERCARD: 'Mastercard',
      AMERICAN_EXPRESS: 'American Express',
      DISCOVER: 'Discover',
      JCB: 'JCB',
      UNIONPAY: 'UnionPay',
      SQUARE_GIFT_CARD: 'Gift Card',
      UNKNOWN: 'Card',
    };
    return brandMap[brand?.toUpperCase() || ''] || 'Card';
  };

  // Memoized data transformations for table
  const allRefunds = useMemo(() => {
    return payments.flatMap((payment) =>
      (payment.refunds || []).map((refund) => ({
        key: `${payment._id}-${refund._id || refund.refundId}`,
        payment,
        refund,
      }))
    );
  }, [payments]);

  const filteredRefunds = useMemo(() => {
    return allRefunds.filter(({ payment, refund }) => {
      const matchesStatus =
        statusFilter === 'all' || refund.status === statusFilter;

      const matchesCardSearch =
        !cardSearch ||
        (payment.cardLastFour &&
          payment.cardLastFour
            .toLowerCase()
            .includes(cardSearch.toLowerCase()));

      return matchesStatus && matchesCardSearch;
    });
  }, [allRefunds, statusFilter, cardSearch]);

  // Table columns definition
  const refundTableColumns = useMemo(
    () => [
      {
        title: 'Credit Card Last 4 Digits',
        dataIndex: 'payment',
        key: 'card',
        render: (payment: PaymentWithRefunds) => (
          <div>
            {(payment.cardBrand || payment.cardLastFour) && (
              <div className='mt-2'>
                <strong className='text-muted d-block'>
                  <i
                    className={`${getCardBrandIcon(payment.cardBrand)} me-1`}
                  ></i>
                  {getCardBrandName(payment.cardBrand)} ••••{' '}
                  {payment.cardLastFour}
                </strong>
              </div>
            )}
          </div>
        ),
      },
      {
        title: 'Payment Details',
        dataIndex: 'payment',
        key: 'payment',
        render: (payment: PaymentWithRefunds) => (
          <div>
            <small className='text-muted'>Original Payment</small>
            <strong className='text-success d-block'>
              {formatCurrency(payment.amount)}
            </strong>
            <div className='mt-1'>
              <small className='text-muted d-block'>
                <i className='ti ti-calendar me-1'></i>
                {formatDate(payment.createdAt)}
              </small>
            </div>
            {payment.receiptUrl && (
              <div className='mt-2'>
                <a
                  href={payment.receiptUrl}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='btn btn-sm btn-outline-primary'
                >
                  <i className='ti ti-receipt me-1'></i>
                  View Receipt
                </a>
              </div>
            )}
          </div>
        ),
      },
      {
        title: 'Refund Details',
        dataIndex: 'refund',
        key: 'refund',
        render: (refund: RefundData) => (
          <div>
            <small className='text-muted'>Refund Amount</small>
            <strong className='text-warning d-block'>
              {formatCurrency(refund.amount)}
            </strong>
            <div className='mt-1'>
              <span
                className={`badge bg-${
                  refund.status === 'pending'
                    ? 'warning'
                    : refund.status === 'completed'
                    ? 'success'
                    : 'danger'
                }`}
              >
                {refund.status.charAt(0).toUpperCase() + refund.status.slice(1)}
              </span>
            </div>
          </div>
        ),
      },
      {
        title: 'Refund Information',
        dataIndex: 'refund',
        key: 'info',
        render: (refund: RefundData, record: any) => (
          <div>
            <div className='d-block'>
              <strong>Reason:</strong> {refund.reason}
            </div>
            <div className='d-block'>
              <strong>Date:</strong>{' '}
              {formatDate(
                refund.processedAt ||
                  refund.requestedAt ||
                  record.payment.createdAt
              )}
            </div>
            {refund.notes && (
              <div className='d-block mt-1'>
                <small className='text-muted'>
                  <strong>Notes:</strong> {refund.notes}
                </small>
              </div>
            )}
          </div>
        ),
      },
    ],
    []
  );

  const handleTableChange = useCallback((newPagination: any) => {
    setTableLoading(true);
    setPagination({
      current: newPagination.current,
      pageSize: newPagination.pageSize,
    });
    // Small delay to ensure spinner is visible
    setTimeout(() => setTableLoading(false), 100);
  }, []);

  const pendingCount = allRefunds.filter(
    (ref) => ref.refund.status === 'pending'
  ).length;
  const completedCount = allRefunds.filter(
    (ref) => ref.refund.status === 'completed'
  ).length;
  const failedCount = allRefunds.filter(
    (ref) => ref.refund.status === 'failed'
  ).length;

  // Count unique card numbers for search results
  const uniqueCards = Array.from(
    new Set(
      payments
        .filter((p) => p.cardLastFour)
        .map((p) => p.cardLastFour)
        .filter((card): card is string => card !== undefined)
    )
  );

  const renderAllRefunds = () => {
    if (loading) {
      return (
        <div className='text-center py-4'>
          <div className='spinner-border text-primary' role='status'>
            <span className='visually-hidden'>Loading refunds...</span>
          </div>
          <p className='mt-2 text-muted'>Loading refunds...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className='alert alert-danger'>
          <h5>Error Loading Refunds</h5>
          <p>{error}</p>
          <Button
            onClick={fetchAllRefunds}
            icon={<i className='ti ti-refresh me-1'></i>}
          >
            Retry
          </Button>
        </div>
      );
    }

    return (
      <div>
        <div className='row mb-4'>
          <div className='col-md-3'>
            <label className='form-label'>Filter by Status</label>
            <Select
              style={{ width: '100%' }}
              value={statusFilter}
              onChange={setStatusFilter}
            >
              <Select.Option value='all'>
                All Refunds ({allRefunds.length})
              </Select.Option>
              <Select.Option value='pending'>
                Pending ({pendingCount})
              </Select.Option>
              <Select.Option value='completed'>
                Completed ({completedCount})
              </Select.Option>
              <Select.Option value='failed'>
                Failed ({failedCount})
              </Select.Option>
            </Select>
          </div>
          <div className='col-md-3'>
            <label className='form-label'>
              Search by Card Last 4
              {uniqueCards.length > 0 && (
                <small className='text-muted ms-1'>
                  ({uniqueCards.length} unique cards)
                </small>
              )}
            </label>
            <Input
              placeholder='Enter last 4 digits...'
              value={cardSearch}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                setCardSearch(value);
              }}
              maxLength={4}
              style={{ width: '100%' }}
              prefix={<i className='ti ti-credit-card text-muted' />}
              allowClear
            />
            {cardSearch && (
              <small className='text-muted'>
                Showing {filteredRefunds.length} refund
                {filteredRefunds.length !== 1 ? 's' : ''} for card ••••{' '}
                {cardSearch}
              </small>
            )}
          </div>
          <div className='col-md-6 d-flex align-items-end justify-content-end'>
            <div className='d-flex gap-2'>
              <span className='badge bg-light text-dark align-self-center'>
                Showing {filteredRefunds.length} refund
                {filteredRefunds.length !== 1 ? 's' : ''}
                {cardSearch && ` for •••• ${cardSearch}`}
              </span>
              <Button
                className='btn-outline-primary'
                onClick={fetchAllRefunds}
                disabled={loading}
                icon={<i className='ti ti-refresh me-1'></i>}
              >
                Refresh
              </Button>
              {(statusFilter !== 'all' || cardSearch) && (
                <Button
                  className='btn-outline-secondary'
                  onClick={() => {
                    setStatusFilter('all');
                    setCardSearch('');
                  }}
                  icon={<i className='ti ti-filter-off me-1'></i>}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        </div>

        {filteredRefunds.length === 0 ? (
          <div className='text-center py-5'>
            <i className='ti ti-inbox fs-1 text-muted mb-3 d-block'></i>
            <p className='text-muted fs-5'>
              {allRefunds.length === 0
                ? 'No refunds found in the system'
                : cardSearch
                ? `No refunds found for card •••• ${cardSearch}`
                : 'No refunds match the selected filter'}
            </p>
            {allRefunds.length === 0 && (
              <div className='mt-3'>
                <p className='text-muted small'>This could mean:</p>
                <ul className='text-muted small text-start d-inline-block'>
                  <li>There are no refunds in the system</li>
                </ul>
              </div>
            )}
            {(cardSearch || statusFilter !== 'all') &&
              allRefunds.length > 0 && (
                <div className='mt-3'>
                  <Button
                    className='btn-outline-primary'
                    onClick={() => {
                      setStatusFilter('all');
                      setCardSearch('');
                    }}
                    icon={<i className='ti ti-filter-off me-1'></i>}
                  >
                    Clear All Filters
                  </Button>
                </div>
              )}
          </div>
        ) : (
          <div className='table-responsive'>
            <Table
              columns={refundTableColumns}
              dataSource={filteredRefunds}
              rowKey='key'
              pagination={{
                current: pagination.current,
                pageSize: pagination.pageSize,
                total: filteredRefunds.length,
                showSizeChanger: true,
                pageSizeOptions: ['10', '20', '50', '100'],
                showTotal: (total, range) =>
                  `Showing ${range[0]}-${range[1]} of ${total} refunds`,
              }}
              onChange={handleTableChange}
              loading={tableLoading}
              scroll={{ x: true }}
            />
          </div>
        )}
      </div>
    );
  };

  const renderSyncPanel = () => {
    return (
      <div>
        <div className='alert alert-info'>
          <i className='ti ti-info-circle me-2'></i>
          Sync refunds that were processed directly in Square Dashboard.
        </div>

        <div className='row'>
          <div className='col-md-6'>
            <div className='card border-0 shadow-sm'>
              <div className='card-header bg-transparent'>
                <h6 className='card-title mb-0'>
                  <i className='ti ti-refresh me-2'></i>
                  Sync All Refunds
                </h6>
              </div>
              <div className='card-body'>
                <p className='text-muted small mb-3'>
                  Sync all refunds from Square for all payments.
                </p>
                <Button
                  className='btn-outline-primary w-100'
                  onClick={syncSquareRefunds}
                  disabled={syncLoading}
                  icon={
                    syncLoading ? (
                      <i className='ti ti-loader me-1'></i>
                    ) : (
                      <i className='ti ti-refresh me-1'></i>
                    )
                  }
                >
                  {syncLoading ? 'Syncing...' : 'Sync All Refunds'}
                </Button>
              </div>
            </div>
          </div>

          <div className='col-md-6'>
            <div className='card border-0 shadow-sm'>
              <div className='card-header bg-transparent'>
                <h6 className='card-title mb-0'>
                  <i className='ti ti-calendar me-2'></i>
                  Sync by Date Range
                </h6>
              </div>
              <div className='card-body'>
                <p className='text-muted small mb-3'>
                  Sync refunds processed within a specific date range.
                </p>
                <Button
                  className='btn-outline-primary w-100'
                  onClick={syncRefundsByDateRange}
                  disabled={syncLoading}
                  icon={
                    syncLoading ? (
                      <i className='ti ti-loader me-1'></i>
                    ) : (
                      <i className='ti ti-calendar me-1'></i>
                    )
                  }
                >
                  {syncLoading ? 'Syncing...' : 'Sync by Date Range'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {syncMessage && (
          <div
            className={`alert ${
              syncMessage.includes('failed') || syncMessage.includes('error')
                ? 'alert-danger'
                : 'alert-success'
            } mt-4`}
          >
            <i
              className={`ti ti-${
                syncMessage.includes('failed') ? 'alert-circle' : 'circle-check'
              } me-2`}
            ></i>
            {syncMessage}
          </div>
        )}

        <div className='card mt-4 border-0 shadow-sm'>
          <div className='card-header bg-transparent'>
            <h6 className='card-title mb-0'>
              <i className='ti ti-help me-2'></i>
              How It Works
            </h6>
          </div>
          <div className='card-body'>
            <ul className='list-unstyled mb-0'>
              <li className='mb-2'>
                <i className='ti ti-arrow-right text-primary me-2'></i>
                Fetches all refunds from Square for payments
              </li>
              <li className='mb-2'>
                <i className='ti ti-arrow-right text-primary me-2'></i>
                Updates database with refund details
              </li>
              <li className='mb-2'>
                <i className='ti ti-arrow-right text-primary me-2'></i>
                Updates payment refund status and amounts
              </li>
              <li className='mb-2'>
                <i className='ti ti-arrow-right text-primary me-2'></i>
                Makes refunds processed in Square Dashboard visible on Partizan
                website
              </li>
              <li>
                <i className='ti ti-arrow-right text-primary me-2'></i>
                Does not affect pending refund requests - only syncs completed
                Square refunds
              </li>
            </ul>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className='page-wrapper'>
      <div className='content'>
        <div className='card'>
          <div className='card-header d-flex align-items-center justify-content-between flex-wrap pb-0'>
            <h4 className='mb-5'>Refund Management</h4>
            <div className='d-flex align-items-center gap-2'>
              <span className='text-muted'>
                <i className='ti ti-currency-dollar me-1'></i>
                Manage payment refunds and Square sync
              </span>
            </div>
          </div>

          <div className='card-body p-0'>
            <div className='nav-tabs-header'>
              <ul className='nav nav-tabs nav-justified' role='tablist'>
                <li className='nav-item' role='presentation'>
                  <button
                    className={`nav-link ${
                      activeTab === 'all' ? 'active' : ''
                    }`}
                    onClick={() => setActiveTab('all')}
                  >
                    <i className='ti ti-list me-2'></i>
                    All Refunds
                    {pendingCount > 0 && (
                      <span className='badge bg-danger ms-2'>
                        {pendingCount}
                      </span>
                    )}
                  </button>
                </li>
                <li className='nav-item' role='presentation'>
                  <button
                    className={`nav-link ${
                      activeTab === 'sync' ? 'active' : ''
                    }`}
                    onClick={() => setActiveTab('sync')}
                  >
                    <i className='ti ti-refresh me-2'></i>
                    Square Sync
                  </button>
                </li>
              </ul>
            </div>

            <div className='p-4'>
              {activeTab === 'all' && renderAllRefunds()}
              {activeTab === 'sync' && renderSyncPanel()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminRefundsPanel;
