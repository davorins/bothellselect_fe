import React, { useState, useEffect } from 'react';

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
  onRefundSubmit: (paymentId: string, amount: number, reason: string) => void;
  onClose: () => void;
}

const RefundModal: React.FC<RefundModalProps> = ({
  payment,
  maxRefundAmount,
  onRefundSubmit,
  onClose,
}) => {
  const [refundAmount, setRefundAmount] = useState<string>(
    maxRefundAmount.toFixed(2)
  );
  const [refundReason, setRefundReason] = useState<string>('Customer request');
  const [customReason, setCustomReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

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
    }
  };

  const handleAmountBlur = () => {
    if (refundAmount === '') {
      setRefundAmount('0.00');
      return;
    }

    let amount = parseFloat(refundAmount);
    if (isNaN(amount)) {
      amount = 0;
    }

    // Ensure amount is within bounds
    if (amount < 0) amount = 0;
    if (amount > maxRefundAmount) amount = maxRefundAmount;

    setRefundAmount(amount.toFixed(2));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const amount = parseFloat(refundAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid refund amount');
      return;
    }

    if (amount > maxRefundAmount) {
      alert(`Refund amount cannot exceed $${maxRefundAmount.toFixed(2)}`);
      return;
    }

    const finalReason = refundReason === 'Other' ? customReason : refundReason;
    if (!finalReason.trim()) {
      alert('Please provide a refund reason');
      return;
    }

    setIsSubmitting(true);
    try {
      await onRefundSubmit(payment._id, amount, finalReason);
      onClose();
    } catch (error) {
      console.error('Refund submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

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
              {/* Payment Information */}
              <div className='card mb-3'>
                <div className='card-body'>
                  <h6 className='card-title'>Payment Details</h6>
                  <div className='row'>
                    <div className='col-6'>
                      <small className='text-muted'>Original Amount</small>
                      <p className='mb-1'>{formatCurrency(payment.amount)}</p>
                    </div>
                    <div className='col-6'>
                      <small className='text-muted'>Already Refunded</small>
                      <p className='mb-1'>
                        {formatCurrency(payment.totalRefunded || 0)}
                      </p>
                    </div>
                    <div className='col-12 mt-2'>
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

              {/* Refund Amount */}
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

              {/* Refund Reason */}
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

              {/* Custom Reason */}
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

              {/* Warning Message */}
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
                    <i className='ti ti-refund me-2'></i>
                    Process Refund
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

export default RefundModal;
