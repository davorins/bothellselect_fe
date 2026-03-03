// components/UserTickets.tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

interface Ticket {
  _id: string;
  ticketId: string;
  formId: string;
  formTitle: string;
  paymentId: string;
  squarePaymentId: string;
  amount: number;
  currency: string;
  status: string;
  purchasedAt: string;
  packageName?: string;
  quantity: number;
  receiptUrl?: string;
  customerEmail: string;
  customerName?: string;
  unitPrice?: number;
  totalAmount?: number;
}

interface UserTicketsProps {
  email?: string;
  userId?: string;
  isPublicMode?: boolean;
}

const UserTickets: React.FC<UserTicketsProps> = ({
  email,
  userId,
  isPublicMode = false,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [searchEmail, setSearchEmail] = useState(email || '');
  const [userEmail, setUserEmail] = useState(email || '');
  const [showSearch, setShowSearch] = useState(!email);
  const [emailSending, setEmailSending] = useState<{ [key: string]: boolean }>(
    {}
  );
  const [emailSent, setEmailSent] = useState<{ [key: string]: boolean }>({});

  const API_BASE_URL =
    process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001/api';

  // Determine if user is in public mode (no userId provided)
  const isPublic = isPublicMode || !userId;

  useEffect(() => {
    if (userEmail) {
      fetchTickets();
    }
  }, [userEmail, userId]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!userEmail) {
        throw new Error('Email is required to view tickets');
      }

      const encodedEmail = encodeURIComponent(userEmail);
      const url = `${API_BASE_URL}/tickets/email/${encodedEmail}`;

      const response = await axios.get(url);

      if (response.data.success) {
        const ticketsData = response.data.data || [];

        if (ticketsData.length === 0) {
          setError('No tickets found for this email address.');
          setTickets([]);
          return;
        }

        const formattedTickets = ticketsData.map((ticket: any) => {
          const formId = ticket.formId?._id || ticket.formId;
          const formTitle = ticket.formId?.title || 'Unknown Form';

          return {
            _id: ticket._id,
            ticketId: ticket._id,
            formId: formId,
            formTitle: formTitle,
            paymentId: ticket.paymentId,
            squarePaymentId: ticket.squarePaymentId,
            amount: ticket.amount || 0,
            currency: ticket.currency || 'USD',
            status: ticket.status || 'completed',
            purchasedAt:
              ticket.purchasedAt || ticket.processedAt || ticket.createdAt,
            packageName: ticket.packageName,
            quantity: ticket.quantity || 1,
            receiptUrl: ticket.receiptUrl,
            customerEmail: ticket.customerEmail || userEmail,
            customerName: ticket.customerName,
            unitPrice: ticket.unitPrice,
            totalAmount: ticket.totalAmount || ticket.amount,
          };
        });

        setTickets(formattedTickets);
      } else {
        setError(response.data.error || 'No tickets found');
      }
    } catch (err: any) {
      console.error('Error fetching tickets:', err);

      if (err.response?.status === 404) {
        setError('No tickets found for this email address.');
      } else if (err.response?.status === 500) {
        setError('Server error. Please try again later or contact support.');
      } else {
        setError('Failed to load tickets. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchEmail.trim()) {
      setUserEmail(searchEmail.trim());
    }
  };

  const downloadReceipt = (ticket: Ticket) => {
    if (ticket.receiptUrl) {
      window.open(ticket.receiptUrl, '_blank');
    } else {
      Swal.fire({
        icon: 'warning',
        title: 'No Receipt Available',
        text: 'This ticket does not have a receipt available for download.',
        confirmButtonText: 'OK',
        confirmButtonColor: '#594230',
        customClass: {
          confirmButton: 'btn btn-primary',
        },
      });
    }
  };

  const emailReceipt = async (ticket: Ticket) => {
    // Check if receipt or email is missing
    if (!ticket.receiptUrl || !ticket.customerEmail) {
      Swal.fire({
        icon: 'error',
        title: 'Cannot Send Receipt',
        text: 'No receipt or email available for this ticket.',
        confirmButtonText: 'OK',
        confirmButtonColor: '#594230',
        customClass: {
          confirmButton: 'btn btn-primary',
        },
      });
      return;
    }

    setEmailSending((prev) => ({ ...prev, [ticket._id]: true }));

    try {
      // Try to call the backend API
      const response = await axios.post(
        `${API_BASE_URL}/tickets/email-receipt`,
        {
          ticketId: ticket._id,
          email: ticket.customerEmail,
          ticketDetails: {
            formTitle: ticket.formTitle,
            paymentId: ticket.paymentId,
            amount: ticket.amount,
            purchasedAt: ticket.purchasedAt,
          },
        }
      );

      if (response.data.success) {
        setEmailSent((prev) => ({ ...prev, [ticket._id]: true }));

        Swal.fire({
          icon: 'success',
          title: 'Receipt Sent!',
          html: `
          <p>Your receipt has been sent to:</p>
          <p class="fw-bold">${ticket.customerEmail}</p>
          <p class="text-muted small mt-3">Please check your inbox (and spam folder).</p>
        `,
          showConfirmButton: true,
          confirmButtonText: 'OK',
          confirmButtonColor: '#594230',
          customClass: {
            confirmButton: 'btn btn-primary',
          },
        });
      } else {
        // If backend returns an error
        Swal.fire({
          icon: 'warning',
          title: 'Feature Coming Soon',
          html: `
          <p>The email receipt feature is currently being set up.</p>
          <p class="text-muted small mt-2">
            For now, you can view your receipt by clicking the link below:
          </p>
          <div class="mt-3">
            <a href="${ticket.receiptUrl}" target="_blank" 
               class="btn btn-primary w-100">
              <i class="ti ti-receipt me-1"></i>
              View Receipt Now
            </a>
          </div>
        `,
          showConfirmButton: false,
          showCloseButton: true,
        });
      }
    } catch (error) {
      console.error('Error sending receipt email:', error);

      // Show fallback option since backend might not be ready
      Swal.fire({
        icon: 'info',
        title: 'View Your Receipt',
        html: `
        <p>The email receipt feature is coming soon!</p>
        <p class="text-muted small mb-3">
          For now, you can view and download your receipt directly:
        </p>
        <div class="d-grid gap-2">
          <a href="${ticket.receiptUrl}" target="_blank" 
             class="btn btn-primary">
            <i class="ti ti-external-link me-1"></i>
            Open Receipt
          </a>
          <button class="btn btn-outline-secondary" onclick="Swal.close()">
            Close
          </button>
        </div>
      `,
        showConfirmButton: false,
        showCloseButton: true,
      });
    } finally {
      setEmailSending((prev) => ({ ...prev, [ticket._id]: false }));
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateTotal = (ticket: Ticket) => {
    if (ticket.totalAmount) return ticket.totalAmount;
    if (ticket.unitPrice && ticket.quantity)
      return ticket.unitPrice * ticket.quantity;
    return ticket.amount;
  };

  const formatDateOnly = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Custom CSS for SweetAlert
  const swalCustomStyle = `
    .swal2-popup {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    }
    .swal2-title {
      color: #374151;
      font-weight: 600;
    }
    .swal2-html-container {
      color: #6b7280;
    }
  `;

  if (loading) {
    return (
      <div className='text-center py-4'>
        <div className='spinner-border text-primary' role='status'>
          <span className='visually-hidden'>Loading tickets...</span>
        </div>
        <p className='mt-2'>Loading your tickets...</p>
      </div>
    );
  }

  return (
    <div className='user-tickets-container'>
      {/* SweetAlert custom styles */}
      <style>{swalCustomStyle}</style>

      {showSearch && (
        <div className='card mb-4'>
          <div className='card-body'>
            <h5 className='card-title'>Find Your Tickets</h5>
            <p className='card-text'>
              Enter the email address you used when making the purchase to view
              your tickets.
            </p>
            <form onSubmit={handleSearch}>
              <div className='row'>
                <div className='col-md-8 mb-3'>
                  <input
                    type='email'
                    className='form-control'
                    placeholder='your@email.com'
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                    required
                  />
                </div>
                <div className='col-md-4'>
                  <button type='submit' className='btn btn-primary w-100'>
                    Find Tickets
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {error && !loading && (
        <div
          className='alert alert-danger alert-dismissible fade show'
          role='alert'
        >
          <div className='d-flex align-items-center'>
            <i className='ti ti-alert-triangle me-2'></i>
            <span>{error}</span>
          </div>
          <button
            type='button'
            className='btn-close'
            onClick={() => setError(null)}
            aria-label='Close'
          ></button>
        </div>
      )}

      {tickets.length > 0 && (
        <div>
          <div className='row'>
            {tickets.map((ticket) => (
              <div key={ticket._id} className='col-md-6 mb-4'>
                <div className='card h-100'>
                  <div className='card-body'>
                    <div className='ticket-details'>
                      <div className='row mb-2'>
                        <div className='col-6'>
                          <strong>Purchase Date:</strong>
                        </div>
                        <div className='col-6 text-end'>
                          {formatDateOnly(ticket.purchasedAt)}
                        </div>
                      </div>

                      {ticket.packageName && (
                        <div className='row mb-2'>
                          <div className='col-6'>
                            <strong>Package:</strong>
                          </div>
                          <div className='col-6 text-end'>
                            {ticket.packageName}
                          </div>
                        </div>
                      )}

                      {ticket.quantity > 1 && (
                        <>
                          <div className='row mb-2'>
                            <div className='col-6'>
                              <strong>Quantity:</strong>
                            </div>
                            <div className='col-6 text-end'>
                              {ticket.quantity}
                            </div>
                          </div>

                          {ticket.unitPrice && (
                            <div className='row mb-2'>
                              <div className='col-6'>
                                <strong>Unit Price:</strong>
                              </div>
                              <div className='col-6 text-end'>
                                ${ticket.unitPrice.toFixed(2)} {ticket.currency}
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      <div className='row mb-3'>
                        <div className='col-6'>
                          <strong>Total Amount:</strong>
                        </div>
                        <div className='col-6 text-end'>
                          <span className='fw-bold'>
                            ${calculateTotal(ticket).toFixed(2)}{' '}
                            {ticket.currency}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className='mt-3 pt-3 border-top'>
                      <div className='d-grid gap-2 d-md-flex'>
                        {/* Show different buttons based on mode */}
                        {isPublic ? (
                          // Public mode: Show Email Receipt button
                          <button
                            className='btn btn-outline-primary'
                            onClick={() => emailReceipt(ticket)}
                            disabled={
                              !ticket.receiptUrl || emailSending[ticket._id]
                            }
                          >
                            <i className='ti ti-mail me-1'></i>
                            {emailSending[ticket._id] ? (
                              <>
                                <span className='spinner-border spinner-border-sm me-1'></span>
                                Preparing...
                              </>
                            ) : emailSent[ticket._id] ? (
                              <>
                                <i className='ti ti-check me-1'></i>
                                Email Prepared
                              </>
                            ) : ticket.receiptUrl ? (
                              'Email Receipt'
                            ) : (
                              'No Receipt'
                            )}
                          </button>
                        ) : (
                          // Logged-in mode: Show View Receipt button
                          <button
                            className='btn btn-outline-primary'
                            onClick={() => downloadReceipt(ticket)}
                            disabled={!ticket.receiptUrl}
                          >
                            <i className='ti ti-receipt me-1'></i>
                            {ticket.receiptUrl ? 'View Receipt' : 'No Receipt'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tickets.length === 0 && !error && !loading && (
        <div className='alert alert-info'>
          <div className='d-flex align-items-center'>
            <i className='ti ti-ticket me-2 fs-4'></i>
            <div>
              <strong>No tickets found</strong>
              <p className='mb-0 mt-1'>
                No tickets were found for {userEmail}. If you've recently made a
                purchase, please check your email for confirmation.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Add custom CSS for SweetAlert modal */}
      <style>{`
        .ticket-details-modal .swal2-html-container {
          max-height: 60vh;
          overflow-y: auto;
        }
        .ticket-details-modal .swal2-close {
          color: #6b7280;
        }
        .ticket-details-modal .swal2-close:hover {
          color: #374151;
        }
      `}</style>
    </div>
  );
};

export default UserTickets;
