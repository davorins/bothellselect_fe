// FormTemplateSelector.tsx
import React from 'react';
import { Form } from '../../../../types/form';

interface FormTemplateSelectorProps {
  forms: Form[];
  selectedFormId?: string;
  onSelectForm: (formId: string) => void;
}

const FormTemplateSelector: React.FC<FormTemplateSelectorProps> = ({
  forms,
  selectedFormId,
  onSelectForm,
}) => {
  return (
    <div className='mb-3'>
      <label className='form-label'>Attach Form Template</label>
      <select
        className='form-select'
        value={selectedFormId || ''}
        onChange={(e) => onSelectForm(e.target.value)}
      >
        <option value=''>Select a form template</option>
        {forms.map((form) => (
          <option key={form._id} value={form._id}>
            {form.title}
          </option>
        ))}
      </select>
    </div>
  );
};

export default FormTemplateSelector;
