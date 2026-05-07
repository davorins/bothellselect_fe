// CloverReceiptModal.tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { formatDate } from '../../../../utils/dateFormatter';

interface CloverReceiptModalProps {
  show: boolean;
  onClose: () => void;
  orderId: string;
}

interface ReceiptData {
  orderId: string;
  paymentId: string;
  amount: number;
  currency: string;
  date: string;
  status: string;
  cardBrand: string;
  cardLastFour: string;
  buyerEmail: string;
  players?: Array<{
    _id: string;
    fullName: string;
  }>;
  parent?: {
    _id: string;
    fullName: string;
    email: string;
  };
}

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001/api';

const CloverReceiptModal: React.FC<CloverReceiptModalProps> = ({
  show,
  onClose,
  orderId,
}) => {
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (show && orderId) {
      fetchReceipt();
    }
  }, [show, orderId]);

  const fetchReceipt = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please log in to view receipts');
        setLoading(false);
        return;
      }

      const response = await axios.get(
        `${API_BASE_URL}/payments/clover/receipt/${orderId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (response.data.success) {
        setReceipt(response.data.receipt);
      } else {
        setError(response.data.error || 'Failed to load receipt');
      }
    } catch (error: any) {
      console.error('Failed to load receipt:', error);
      setError(error.response?.data?.error || 'Failed to load receipt');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const printContents = document.getElementById(
      'receipt-print-content',
    )?.innerHTML;
    if (printContents) {
      const originalContents = document.body.innerHTML;
      document.body.innerHTML = printContents;
      window.print();
      document.body.innerHTML = originalContents;
      window.location.reload();
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  if (!show) return null;

  return (
    <div
      className='modal fade show'
      style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}
    >
      <div className='modal-dialog modal-dialog-centered modal-lg'>
        <div className='modal-content'>
          <div className='modal-header'>
            <h4 className='modal-title'>
              <i className='ti ti-receipt me-2'></i>
              Payment Receipt
            </h4>
            <button
              type='button'
              className='btn-close custom-btn-close'
              onClick={onClose}
              disabled={loading}
              aria-label='Close'
            >
              <i className='ti ti-x' />
            </button>
          </div>

          <div className='modal-body'>
            {loading ? (
              <div className='text-center py-5'>
                <div className='spinner-border text-primary' role='status'>
                  <span className='visually-hidden'>Loading...</span>
                </div>
                <p className='mt-3'>Loading receipt...</p>
              </div>
            ) : error ? (
              <div className='alert alert-danger' role='alert'>
                <i className='ti ti-alert-circle me-2'></i>
                {error}
              </div>
            ) : receipt ? (
              <div id='receipt-print-content'>
                {/* Receipt Header */}
                <div className='text-center mb-4'>
                  <h3 className='mb-1'>Partizan Basketball</h3>
                  <p className='text-muted mb-0'>Official Payment Receipt</p>
                  <hr className='my-3' />
                </div>

                {/* Payment Information Card */}
                <div className='card mb-3'>
                  <div className='card-header bg-light'>
                    <h6 className='mb-0'>Payment Details</h6>
                  </div>
                  <div className='card-body'>
                    <div className='row'>
                      <div className='col-md-6'>
                        <small className='text-muted'>Order ID</small>
                        <p className='mb-2 fw-medium'>{receipt.orderId}</p>
                      </div>
                      <div className='col-md-6'>
                        <small className='text-muted'>Payment ID</small>
                        <p className='mb-2 fw-medium'>{receipt.paymentId}</p>
                      </div>
                      <div className='col-md-6'>
                        <small className='text-muted'>Date</small>
                        <p className='mb-2'>{formatDate(receipt.date)}</p>
                      </div>
                      <div className='col-md-6'>
                        <small className='text-muted'>Status</small>
                        <p className='mb-2'>
                          <span
                            className={`badge ${receipt.status === 'completed' ? 'bg-success' : 'bg-warning'}`}
                          >
                            {receipt.status}
                          </span>
                        </p>
                      </div>
                      <div className='col-md-6'>
                        <small className='text-muted'>Amount</small>
                        <p className='mb-2 h5 text-success'>
                          {formatCurrency(receipt.amount, receipt.currency)}
                        </p>
                      </div>
                      <div className='col-md-6'>
                        <small className='text-muted'>Payment Method</small>
                        <p className='mb-2'>
                          {receipt.cardBrand} •••• {receipt.cardLastFour}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Customer Information */}
                {receipt.parent && (
                  <div className='card mb-3'>
                    <div className='card-header bg-light'>
                      <h6 className='mb-0'>Customer Information</h6>
                    </div>
                    <div className='card-body'>
                      <div className='row'>
                        <div className='col-md-6'>
                          <small className='text-muted'>Name</small>
                          <p className='mb-2'>{receipt.parent.fullName}</p>
                        </div>
                        {receipt.buyerEmail && (
                          <div className='col-md-6'>
                            <small className='text-muted'>
                              Receipt Sent To
                            </small>
                            <p className='mb-0'>{receipt.buyerEmail}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Players Information */}
                {receipt.players && receipt.players.length > 0 && (
                  <div className='card mb-3'>
                    <div className='card-header bg-light'>
                      <h6 className='mb-0'>Players Registered</h6>
                    </div>
                    <div className='card-body'>
                      <ul className='list-unstyled mb-0'>
                        {receipt.players.map((player) => (
                          <li key={player._id} className='mb-1'>
                            <i className='ti ti-user me-2'></i>
                            {player.fullName}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Footer Note */}
                <div className='text-center mt-4'>
                  <hr />
                  <small className='text-muted'>
                    Thank you for your payment!
                    <br />A receipt has been sent to your email.
                  </small>
                </div>
              </div>
            ) : (
              <div className='alert alert-warning' role='alert'>
                <i className='ti ti-alert-circle me-2'></i>
                Receipt not found
              </div>
            )}
          </div>

          <div className='modal-footer'>
            <button
              type='button'
              className='btn btn-light me-2'
              onClick={onClose}
              disabled={loading}
            >
              Close
            </button>
            {receipt && (
              <button
                type='button'
                className='btn btn-primary'
                onClick={handlePrint}
                disabled={loading}
              >
                <i className='ti ti-printer me-2'></i>
                Print Receipt
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CloverReceiptModal;
