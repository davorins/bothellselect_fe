import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface AiEmail {
  _id: string;
  from: string;
  to?: string;
  subject?: string;
  body: string;
  category: string;
  confidence: number;
  aiDraft: string;
  status: string;
  requiresHumanReview: boolean;
  reviewReason?: string;
  receivedAt: string;
}

const AiEmailAssistant = () => {
  const [emails, setEmails] = useState<AiEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

  useEffect(() => {
    const fetchEmails = async () => {
      try {
        setLoading(true);
        setError('');

        const token = localStorage.getItem('token');

        const response = await axios.get(`${API_BASE_URL}/admin/ai-emails`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setEmails(response.data.emails || []);
      } catch (err) {
        console.error('Error loading AI emails:', err);
        setError('Failed to load AI emails.');
      } finally {
        setLoading(false);
      }
    };

    fetchEmails();
  }, [API_BASE_URL]);

  return (
    <div className='page-wrapper'>
      <div className='content'>
        <div className='page-header'>
          <div className='page-title'>
            <h4>AI Email Assistant</h4>
            <h6>Review and manage AI-generated email responses</h6>
          </div>
        </div>

        <div className='card'>
          <div className='card-body'>
            <div className='d-flex justify-content-between align-items-center mb-3'>
              <h5 className='mb-0'>AI Email Inbox</h5>

              <span className='badge bg-primary'>
                {emails.length} email{emails.length === 1 ? '' : 's'}
              </span>
            </div>

            {loading && (
              <div className='text-center py-5'>
                <p className='text-muted mb-0'>Loading AI emails...</p>
              </div>
            )}

            {!loading && error && (
              <div className='alert alert-danger'>{error}</div>
            )}

            {!loading && !error && emails.length === 0 && (
              <div className='text-center py-5'>
                <h6>No AI emails yet</h6>
                <p className='text-muted mb-0'>
                  New parent emails processed by the AI assistant will appear
                  here.
                </p>
              </div>
            )}

            {!loading && !error && emails.length > 0 && (
              <div className='table-responsive'>
                <table className='table table-hover'>
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Subject</th>
                      <th>Category</th>
                      <th>Confidence</th>
                      <th>Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {emails.map((email) => (
                      <tr key={email._id}>
                        <td>
                          <strong>{email.from}</strong>
                        </td>

                        <td>{email.subject || '(No subject)'}</td>

                        <td>
                          <span className='badge bg-light text-dark'>
                            {email.category}
                          </span>
                        </td>

                        <td>
                          <strong>{email.confidence}%</strong>
                        </td>

                        <td>
                          <span className='badge bg-warning text-dark'>
                            {email.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiEmailAssistant;
