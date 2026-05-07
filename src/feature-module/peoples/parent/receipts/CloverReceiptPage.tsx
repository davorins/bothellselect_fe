// CloverReceiptPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

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
  cloverData?: any; // Optional Clover API data
}

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001/api';

const CloverReceiptPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReceipt = async () => {
      if (!orderId) {
        setError('No order ID provided');
        setLoading(false);
        return;
      }

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

    fetchReceipt();
  }, [orderId]);

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className='text-center py-5'>
        <div className='spinner-border text-primary' role='status'>
          <span className='visually-hidden'>Loading...</span>
        </div>
        <p className='mt-3'>Loading receipt...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className='container py-5'>
        <div className='alert alert-danger' role='alert'>
          <i className='ti ti-alert-circle me-2'></i>
          {error}
        </div>
        <button
          className='btn btn-primary mt-3'
          onClick={() => window.history.back()}
        >
          Go Back
        </button>
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className='container py-5'>
        <div className='alert alert-warning' role='alert'>
          Receipt not found
        </div>
        <button
          className='btn btn-primary mt-3'
          onClick={() => window.history.back()}
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className='container py-4'>
      <div className='receipt-container card shadow-sm' id='receipt-print-area'>
        <div className='card-header bg-primary text-white'>
          <h2 className='mb-0'>Payment Receipt</h2>
          <p className='mb-0 small'>Clover Payment</p>
        </div>

        <div className='card-body'>
          <div className='row mb-4'>
            <div className='col-12'>
              <h4 className='border-bottom pb-2'>Receipt Details</h4>
            </div>
          </div>

          <div className='row mb-3'>
            <div className='col-md-6'>
              <p>
                <strong>Order ID:</strong> {receipt.orderId}
              </p>
              <p>
                <strong>Payment ID:</strong> {receipt.paymentId}
              </p>
              <p>
                <strong>Date:</strong> {formatDate(receipt.date)}
              </p>
              <p>
                <strong>Status:</strong>
                <span
                  className={`badge ms-2 ${receipt.status === 'completed' ? 'bg-success' : 'bg-warning'}`}
                >
                  {receipt.status}
                </span>
              </p>
            </div>
            <div className='col-md-6'>
              <p>
                <strong>Amount:</strong>{' '}
                {formatCurrency(receipt.amount, receipt.currency)}
              </p>
              <p>
                <strong>Payment Method:</strong> {receipt.cardBrand} ending in{' '}
                {receipt.cardLastFour}
              </p>
              {receipt.buyerEmail && (
                <p>
                  <strong>Email:</strong> {receipt.buyerEmail}
                </p>
              )}
            </div>
          </div>

          {receipt.parent && (
            <div className='row mb-3'>
              <div className='col-12'>
                <h4 className='border-bottom pb-2'>Customer Information</h4>
                <p className='mt-2 mb-1'>
                  <strong>Name:</strong> {receipt.parent.fullName}
                </p>
                <p>
                  <strong>Email:</strong> {receipt.parent.email}
                </p>
              </div>
            </div>
          )}

          {receipt.players && receipt.players.length > 0 && (
            <div className='row mb-3'>
              <div className='col-12'>
                <h4 className='border-bottom pb-2'>Players Registered</h4>
                <ul className='list-group mt-2'>
                  {receipt.players.map((player) => (
                    <li key={player._id} className='list-group-item'>
                      {player.fullName}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {receipt.cloverData && (
            <div className='row mb-3'>
              <div className='col-12'>
                <h4 className='border-bottom pb-2'>Additional Details</h4>
                {receipt.cloverData.lineItems &&
                  receipt.cloverData.lineItems.length > 0 && (
                    <div className='mt-2'>
                      <p>
                        <strong>Items:</strong>
                      </p>
                      <ul>
                        {receipt.cloverData.lineItems.map(
                          (item: any, idx: number) => (
                            <li key={idx}>
                              {item.name} x{item.quantity} -{' '}
                              {formatCurrency(item.price, receipt.currency)}
                            </li>
                          ),
                        )}
                      </ul>
                    </div>
                  )}
              </div>
            </div>
          )}
        </div>

        <div className='card-footer bg-light'>
          <div className='d-flex justify-content-between gap-2'>
            <button
              className='btn btn-secondary'
              onClick={() => window.history.back()}
            >
              <i className='ti ti-arrow-left me-2'></i>
              Back
            </button>
            <button className='btn btn-primary' onClick={handlePrint}>
              <i className='ti ti-printer me-2'></i>
              Print Receipt
            </button>
          </div>
          <p className='text-muted small text-center mt-3 mb-0'>
            Thank you for your payment!
          </p>
        </div>
      </div>
    </div>
  );
};

export default CloverReceiptPage;
