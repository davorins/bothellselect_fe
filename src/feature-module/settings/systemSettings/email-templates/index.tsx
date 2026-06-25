// settings/systemSettings/email-templates/index.tsx

import React, { useState, useEffect } from 'react';
import { Button } from 'react-bootstrap';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import EmailTemplatesList from './EmailTemplatesList';
import EmailTemplateBuilder from '../../../../components/EmailTemplateBuilder';
import type { EmailTemplate } from '../../../../types/types';

const EmailTemplatesPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ id: string }>();
  const [refreshKey, setRefreshKey] = useState(0);

  // Check if we're on a builder route
  const isBuilderRoute = location.pathname.includes('/builder');
  const templateIdFromUrl = isBuilderRoute ? params.id || null : null;

  const handleCreateNew = () => {
    navigate('/system-settings/email-templates/builder');
  };

  const handleEditTemplate = (template: EmailTemplate) => {
    navigate(`/system-settings/email-templates/builder/${template._id}`);
  };

  const handleSave = (template: EmailTemplate) => {
    // Navigate back to the list after saving
    navigate('/system-settings/email-templates');
    setRefreshKey((prev) => prev + 1);
  };

  const handleCancel = () => {
    navigate('/system-settings/email-templates');
  };

  // If we're on a builder route, render the builder
  if (isBuilderRoute) {
    return (
      <EmailTemplateBuilder
        templateId={templateIdFromUrl}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    );
  }

  // Otherwise render the list
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
