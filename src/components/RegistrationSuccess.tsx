import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { emailTemplateService } from '../services/emailTemplateService';
import Alert from 'react-bootstrap/Alert';
import Spinner from 'react-bootstrap/Spinner';

export const RegistrationSuccess = () => {
  const { parentId, playerId } = useParams();
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>(
    'idle'
  );

  useEffect(() => {
    const sendWelcomeEmail = async () => {
      if (!parentId || !playerId) return;

      setStatus('sending');
      try {
        await emailTemplateService.sendTemplate(
          '6824c9cfeb722058aa3739a4', // Your welcome template ID
          parentId,
          playerId
        );
        setStatus('sent');
      } catch (error) {
        console.error('Failed to send welcome email:', error);
        setStatus('error');
      }
    };

    sendWelcomeEmail();
  }, [parentId, playerId]);

  return (
    <div className='registration-success'>
      <h2>Registration Complete!</h2>

      {status === 'idle' && <p>Preparing your welcome...</p>}
      {status === 'sending' && (
        <div className='text-center'>
          <Spinner animation='border' />
          <p>Sending welcome email...</p>
        </div>
      )}
      {status === 'sent' && (
        <Alert variant='success'>
          We've sent a welcome email to your inbox!
        </Alert>
      )}
      {status === 'error' && (
        <Alert variant='warning'>
          Your registration was successful, but we couldn't send the welcome
          email. Please check your account dashboard later.
        </Alert>
      )}
    </div>
  );
};
