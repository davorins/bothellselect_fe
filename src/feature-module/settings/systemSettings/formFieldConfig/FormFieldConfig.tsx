// src/feature-module/settings/systemSettings/formFieldConfig/FormFieldConfig.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { all_routes } from '../../../router/all_routes';
import FormFieldConfig from '../../../../components/admin/FormFieldConfig';

const routes = all_routes;

const FormFieldConfigPage = () => {
  return (
    <div className='page-wrapper'>
      <div className='content'>
        <div className='d-md-flex d-block align-items-center justify-content-between border-bottom pb-3 mb-3'>
          <div className='my-auto mb-2'>
            <h3 className='page-title mb-1'>Form Field Configuration</h3>
            <nav>
              <ol className='breadcrumb mb-0'>
                <li className='breadcrumb-item'>
                  <Link to={routes.adminDashboard}>Dashboard</Link>
                </li>
                <li className='breadcrumb-item'>
                  <Link to='#'>System Settings</Link>
                </li>
                <li className='breadcrumb-item active' aria-current='page'>
                  Form Fields
                </li>
              </ol>
            </nav>
          </div>
        </div>

        <FormFieldConfig />
      </div>
    </div>
  );
};

export default FormFieldConfigPage;
