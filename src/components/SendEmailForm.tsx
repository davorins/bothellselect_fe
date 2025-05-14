import { useState } from 'react';
import { EmailTemplateSelector } from './EmailTemplateSelector';
import { emailTemplateService } from '../services/emailTemplateService';
import Button from 'react-bootstrap/Button';
import Alert from 'react-bootstrap/Alert';

export const SendEmailForm = ({
  parentId,
  playerId,
}: {
  parentId: string;
  playerId: string;
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const handleSend = async () => {
    if (!selectedTemplate) return;

    setIsSending(true);
    setMessage(null);

    try {
      await emailTemplateService.sendTemplate(
        selectedTemplate,
        parentId,
        playerId
      );
      setMessage({ type: 'success', text: 'Email sent successfully!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to send email' });
      console.error(error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className='send-email-form'>
      <h4>Send Email</h4>

      <div className='mb-3'>
        <label className='form-label'>Select Template</label>
        <EmailTemplateSelector
          onSelect={setSelectedTemplate}
          value={selectedTemplate}
        />
      </div>

      {message && <Alert variant={message.type}>{message.text}</Alert>}

      <Button
        variant='primary'
        onClick={handleSend}
        disabled={!selectedTemplate || isSending}
      >
        {isSending ? 'Sending...' : 'Send Email'}
      </Button>
    </div>
  );
};
