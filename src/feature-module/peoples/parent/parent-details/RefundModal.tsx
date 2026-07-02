import React, { useState } from 'react';

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
      // The parent's onRefundSubmit is responsible for closing the modal.
      // Do NOT call onClose() here — the parent handles it on both success
      // and error paths to avoid race conditions with the modal unmounting.
      await onRefundSubmit(payment._id, amount, finalReason);
    } catch (err: any) {
      // If the parent threw instead of closing the modal, show the error inline.
      setError(err.message || 'Refund failed. Please try again.');
      setIsSubmitting(false);
    }
    // Do NOT setIsSubmitting(false) on the success path — the modal will
    // unmount, and calling setState on an unmounted component causes a warning.
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
              {/* Payment summary */}
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

              {/* Refund amount */}
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

              {/* Reason */}
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

              {/* Inline error — shown when the parent throws instead of
                  closing the modal (i.e. on recoverable validation errors) */}
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
