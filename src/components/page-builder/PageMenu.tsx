// src/components/page-builder/PageMenu.tsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Home,
  FileText,
  Star,
  Users,
  Calendar,
  Contact,
  Settings,
  Plus,
  List,
  Grid,
} from 'lucide-react';

const PageMenu: React.FC = () => {
  const navigate = useNavigate();
  const [showQuickCreate, setShowQuickCreate] = useState(false);

  const quickTemplates = [
    {
      type: 'home',
      title: 'Home Page',
      icon: <Home size={20} />,
      description: 'Main landing page with welcome section',
    },
    {
      type: 'about',
      title: 'About Us',
      icon: <FileText size={20} />,
      description: 'About page with team and mission',
    },
    {
      type: 'programs',
      title: 'Programs',
      icon: <Users size={20} />,
      description: 'Program listing page',
    },
    {
      type: 'tournaments',
      title: 'Tournaments',
      icon: <Calendar size={20} />,
      description: 'Tournament schedule and info',
    },
    {
      type: 'contact',
      title: 'Contact',
      icon: <Contact size={20} />,
      description: 'Contact form and info',
    },
  ];

  const handleQuickCreate = (type: string) => {
    navigate('/admin/page-builder/new', {
      state: { templateType: type },
    });
    setShowQuickCreate(false);
  };

  return (
    <div className='page-menu'>
      <div className='card'>
        <div className='card-header bg-primary text-white'>
          <h5 className='mb-0'>Page Builder</h5>
        </div>
        <div className='card-body'>
          <div className='d-grid gap-2 mb-4'>
            <Link to='/admin/page-builder/new' className='btn btn-primary'>
              <Plus size={18} className='me-2' />
              Create New Page
            </Link>
            <Link to='/admin/pages' className='btn btn-outline-primary'>
              <List size={18} className='me-2' />
              View All Pages
            </Link>
          </div>

          <div className='mb-4'>
            <h6 className='text-muted mb-3'>Quick Create</h6>
            <div className='row g-2'>
              {quickTemplates.map((template) => (
                <div key={template.type} className='col-6'>
                  <button
                    className='btn btn-outline-secondary w-100 text-start'
                    onClick={() => handleQuickCreate(template.type)}
                  >
                    <div className='d-flex align-items-center'>
                      <div className='me-2'>{template.icon}</div>
                      <div>
                        <div className='fw-semibold'>{template.title}</div>
                        <small className='text-muted d-block'>
                          {template.description}
                        </small>
                      </div>
                    </div>
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className='mb-3'>
            <h6 className='text-muted mb-3'>System Pages</h6>
            <div className='list-group'>
              <Link
                to='/page/home'
                target='_blank'
                className='list-group-item list-group-item-action d-flex align-items-center'
              >
                <Home size={16} className='me-2' />
                Home Page
                <span className='badge bg-info ms-auto'>System</span>
              </Link>
              <Link
                to='/in-the-spotlight'
                target='_blank'
                className='list-group-item list-group-item-action d-flex align-items-center'
              >
                <Star size={16} className='me-2' />
                Spotlight Page
                <span className='badge bg-info ms-auto'>System</span>
              </Link>
            </div>
          </div>

          <div className='mt-4'>
            <small className='text-muted'>
              <strong>Tip:</strong> Create custom pages for specific content
              like camp registrations, special events, or program details.
            </small>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageMenu;
