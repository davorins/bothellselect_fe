import React, { useState, useEffect } from 'react';
import { PageSection } from '../../types/page-builder-types';
import { X, Check, Grid, FileText, Home } from 'lucide-react';

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  sections: PageSection[];
  thumbnail?: string;
}

interface TemplateSelectorProps {
  onSelect: (sections: PageSection[]) => void;
  onClose: () => void;
}

const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  onSelect,
  onClose,
}) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load templates from API or use default templates
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      // Try to load templates from API
      const response = await fetch('/api/page-builder/templates');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setTemplates(
            data.data.map((template: any) => ({
              id: template._id,
              name: template.templateName || template.name,
              description: template.description || '',
              category: template.category || 'Custom',
              sections: template.sections || template.layout?.sections || [],
              thumbnail: template.thumbnail,
            }))
          );
          return;
        }
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }

    // Fallback to default templates
    setTemplates(getDefaultTemplates());
    setLoading(false);
  };

  const getDefaultTemplates = (): Template[] => {
    return [
      {
        id: 'home',
        name: 'Home Page',
        description:
          'Complete home page layout with video, welcome section, and registration',
        category: 'Basic',
        sections: [
          {
            id: 'welcome-home',
            type: 'welcome',
            position: 0,
            title: 'Welcome to Bothell Select',
            content:
              '<p>Being a part of the Bothell Select basketball program requires a serious commitment to the basketball season. One of the goals of a successful high school feeder program is to develop players into the types of athletes that can be successful at the high school level.</p>',
            isActive: true,
          },
          {
            id: 'spotlight-home',
            type: 'spotlight',
            position: 1,
            title: 'In The Spotlight',
            config: {
              limit: 1,
              showTitle: true,
              showViewAll: true,
              showFeatured: true,
            },
            isActive: true,
          },
          {
            id: 'registration-home',
            type: 'registration',
            position: 2,
            title: 'Registration',
            config: {
              showTitle: true,
            },
            isActive: true,
          },
        ],
      },
      {
        id: 'about',
        name: 'About Us',
        description: 'About page with team information and mission statement',
        category: 'Basic',
        sections: [
          {
            id: 'welcome-about',
            type: 'welcome',
            position: 0,
            title: 'About Bothell Select',
            content:
              '<p>Learn about our mission, values, and coaching staff.</p>',
            isActive: true,
          },
          {
            id: 'team-about',
            type: 'team',
            position: 1,
            title: 'Our Coaching Staff',
            isActive: true,
          },
          {
            id: 'stats-about',
            type: 'stats',
            position: 2,
            title: 'By The Numbers',
            isActive: true,
          },
        ],
      },
      {
        id: 'programs',
        name: 'Programs',
        description: 'Program listing with descriptions and pricing',
        category: 'Basic',
        sections: [
          {
            id: 'welcome-programs',
            type: 'welcome',
            position: 0,
            title: 'Our Programs',
            content:
              '<p>Explore our various basketball programs for all skill levels.</p>',
            isActive: true,
          },
          {
            id: 'pricing-programs',
            type: 'pricing',
            position: 1,
            title: 'Program Pricing',
            isActive: true,
          },
          {
            id: 'faq-programs',
            type: 'faq',
            position: 2,
            title: 'Frequently Asked Questions',
            isActive: true,
          },
        ],
      },
      {
        id: 'contact',
        name: 'Contact',
        description: 'Contact page with form and information',
        category: 'Basic',
        sections: [
          {
            id: 'welcome-contact',
            type: 'welcome',
            position: 0,
            title: 'Contact Us',
            content: '<p>Get in touch with our team for more information.</p>',
            isActive: true,
          },
          {
            id: 'contact-form-contact',
            type: 'contact-form',
            position: 1,
            title: 'Send Us a Message',
            isActive: true,
          },
          {
            id: 'map-contact',
            type: 'map',
            position: 2,
            title: 'Our Location',
            isActive: true,
          },
        ],
      },
    ];
  };

  const handleSelect = () => {
    const template = templates.find((t) => t.id === selectedTemplate);
    if (template) {
      onSelect(template.sections);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'home':
        return <Home size={20} />;
      case 'basic':
        return <FileText size={20} />;
      default:
        return <Grid size={20} />;
    }
  };

  if (loading) {
    return (
      <div className='template-selector-modal'>
        <div className='modal-backdrop show d-flex align-items-center justify-content-center'>
          <div className='modal-dialog modal-lg'>
            <div className='modal-content'>
              <div className='modal-body text-center py-5'>
                <div className='spinner-border text-primary' role='status'>
                  <span className='visually-hidden'>Loading...</span>
                </div>
                <p className='mt-3'>Loading templates...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='template-selector-modal'>
      <div className='modal-backdrop show d-flex align-items-center justify-content-center'>
        <div className='modal-dialog modal-lg'>
          <div className='modal-content'>
            <div className='modal-header'>
              <h5 className='modal-title'>Select a Template</h5>
              <button
                type='button'
                className='btn-close'
                onClick={onClose}
              ></button>
            </div>
            <div className='modal-body'>
              <p className='text-muted mb-4'>
                Choose a template to start building your page. Templates provide
                pre-designed layouts that you can customize.
              </p>

              <div className='templates-grid'>
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className={`template-card card ${
                      selectedTemplate === template.id ? 'border-primary' : ''
                    }`}
                    onClick={() => setSelectedTemplate(template.id)}
                  >
                    <div className='card-body'>
                      <div className='d-flex align-items-start'>
                        <div className='template-icon me-3'>
                          <div className='bg-light rounded p-2'>
                            {getCategoryIcon(template.category)}
                          </div>
                        </div>
                        <div className='flex-grow-1'>
                          <div className='d-flex justify-content-between align-items-start'>
                            <h6 className='mb-1'>{template.name}</h6>
                            {selectedTemplate === template.id && (
                              <Check size={16} className='text-primary' />
                            )}
                          </div>
                          <p className='text-muted small mb-2'>
                            {template.description}
                          </p>
                          <div className='d-flex justify-content-between align-items-center'>
                            <span className='badge bg-light text-dark'>
                              {template.category}
                            </span>
                            <small className='text-muted'>
                              {template.sections.length} section
                              {template.sections.length !== 1 ? 's' : ''}
                            </small>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className='modal-footer'>
              <button
                type='button'
                className='btn btn-outline-secondary'
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type='button'
                className='btn btn-primary'
                onClick={handleSelect}
                disabled={!selectedTemplate}
              >
                Apply Template
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateSelector;
