// settings/systemSettings/email-templates/index.tsx

import React, { useState } from 'react';
import { Button } from 'react-bootstrap';
import EmailTemplatesList from './EmailTemplatesList';
import EmailTemplateBuilder from '../../../../components/EmailTemplateBuilder';
import type { EmailTemplate } from '../../../../types/types';

const EmailTemplatesPage: React.FC = () => {
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(
    null,
  );
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCreateNew = () => {
    setEditingTemplateId(null);
    setShowBuilder(true);
  };

  const handleEditTemplate = (template: EmailTemplate) => {
    setEditingTemplateId(template._id || null);
    setShowBuilder(true);
  };

  const handleSave = (template: EmailTemplate) => {
    setShowBuilder(false);
    setEditingTemplateId(null);
    setRefreshKey((prev) => prev + 1);
  };

  const handleCancel = () => {
    setShowBuilder(false);
    setEditingTemplateId(null);
  };

  if (showBuilder) {
    return (
      <EmailTemplateBuilder
        templateId={editingTemplateId}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    );
  }

  return (
    <div className='email-templates-page'>
      <div className='d-flex justify-content-between align-items-center mb-4'>
        <h2>Email Templates</h2>
        <Button variant='primary' onClick={handleCreateNew}>
          <i className='ti ti-plus me-1'></i> Create New Template
        </Button>
      </div>
      <EmailTemplatesList
        key={refreshKey}
        onEditTemplate={handleEditTemplate}
      />
    </div>
  );
};

export default EmailTemplatesPage;
