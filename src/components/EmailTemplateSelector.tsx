import { useEffect, useState } from 'react';
import { emailTemplateService } from '../services/emailTemplateService';
import Spinner from 'react-bootstrap/Spinner';

export const EmailTemplateSelector = ({
  onSelect,
  value,
}: {
  onSelect: (templateId: string) => void;
  value?: string;
}) => {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const data = await emailTemplateService.getAll();
        setTemplates(data);
      } catch (error) {
        console.error('Failed to load templates:', error);
      } finally {
        setLoading(false);
      }
    };
    loadTemplates();
  }, []);

  if (loading) return <Spinner animation='border' size='sm' />;

  return (
    <select
      className='form-select'
      value={value}
      onChange={(e) => onSelect(e.target.value)}
      disabled={loading}
    >
      <option value=''>Select a template</option>
      {templates.map((template) => (
        <option key={template._id} value={template._id}>
          {template.title} ({template.category})
        </option>
      ))}
    </select>
  );
};
