// src/components/admin/EnhancedFormConfig.tsx
import React, { useState } from 'react';
import {
  RegistrationFormConfig,
  SeasonEvent,
  PricingPackage,
} from '../../types/registration-types';

interface EnhancedFormConfigProps {
  seasonEvent: SeasonEvent;
  onConfigUpdate: (config: RegistrationFormConfig) => void;
  initialConfig: RegistrationFormConfig;
}

const EnhancedFormConfig: React.FC<EnhancedFormConfigProps> = ({
  seasonEvent,
  onConfigUpdate,
  initialConfig,
}) => {
  const [config, setConfig] = useState<RegistrationFormConfig>(initialConfig);
  const [newPackage, setNewPackage] = useState<Omit<PricingPackage, 'id'>>({
    name: '',
    price: 0,
    description: '',
  });

  const updateConfig = (updates: Partial<RegistrationFormConfig>) => {
    const updated = { ...config, ...updates };
    setConfig(updated);
    onConfigUpdate(updated);
  };

  const addPackage = () => {
    if (newPackage.name && newPackage.price > 0) {
      const packageWithId: PricingPackage = {
        ...newPackage,
        id: Date.now().toString(),
      };

      updateConfig({
        pricing: {
          ...config.pricing,
          packages: [...config.pricing.packages, packageWithId],
        },
      });

      setNewPackage({ name: '', price: 0, description: '' });
    }
  };

  const removePackage = (packageId: string) => {
    updateConfig({
      pricing: {
        ...config.pricing,
        packages: config.pricing.packages.filter((pkg) => pkg.id !== packageId),
      },
    });
  };

  const movePackage = (index: number, direction: 'up' | 'down') => {
    const packages = [...config.pricing.packages];
    const newIndex = direction === 'up' ? index - 1 : index + 1;

    if (newIndex >= 0 && newIndex < packages.length) {
      [packages[index], packages[newIndex]] = [
        packages[newIndex],
        packages[index],
      ];
      updateConfig({
        pricing: { ...config.pricing, packages },
      });
    }
  };

  return (
    <div className='enhanced-form-config'>
      <div className='d-flex justify-content-between align-items-center mb-4'>
        <h4>
          Form Configuration: {seasonEvent.season} {seasonEvent.year}
        </h4>
        <div className='form-check form-switch'>
          <input
            className='form-check-input'
            type='checkbox'
            checked={config.isActive}
            onChange={(e) => updateConfig({ isActive: e.target.checked })}
            style={{ transform: 'scale(1.5)' }}
          />
          <label className='form-check-label fw-bold'>
            {config.isActive ? 'Form Active' : 'Form Inactive'}
          </label>
        </div>
      </div>

      {/* Basic Settings */}
      <div className='row mb-4'>
        <div className='col-md-6'>
          <div className='card'>
            <div className='card-header'>
              <h5>Registration Settings</h5>
            </div>
            <div className='card-body'>
              <div className='form-check form-switch mb-3'>
                <input
                  className='form-check-input'
                  type='checkbox'
                  checked={config.requiresPayment}
                  onChange={(e) =>
                    updateConfig({ requiresPayment: e.target.checked })
                  }
                />
                <label className='form-check-label'>Requires Payment</label>
                <small className='form-text text-muted d-block'>
                  Users must complete payment to register
                </small>
              </div>

              <div className='form-check form-switch mb-3'>
                <input
                  className='form-check-input'
                  type='checkbox'
                  checked={config.requiresQualification}
                  onChange={(e) =>
                    updateConfig({ requiresQualification: e.target.checked })
                  }
                />
                <label className='form-check-label'>
                  Requires Tryout Qualification
                </label>
                <small className='form-text text-muted d-block'>
                  Only users who passed tryouts can register
                </small>
              </div>

              <div className='mb-3'>
                <label className='form-label'>Base Price</label>
                <div className='input-group'>
                  <span className='input-group-text'>$</span>
                  <input
                    type='number'
                    className='form-control'
                    value={config.pricing.basePrice}
                    onChange={(e) =>
                      updateConfig({
                        pricing: {
                          ...config.pricing,
                          basePrice: Number(e.target.value),
                        },
                      })
                    }
                    min='0'
                    step='1'
                  />
                </div>
                <small className='form-text text-muted'>
                  Default price per player when no packages are selected
                </small>
              </div>
            </div>
          </div>
        </div>

        <div className='col-md-6'>
          <div className='card h-100'>
            <div className='card-header'>
              <h5>Form Status</h5>
            </div>
            <div className='card-body'>
              <div className='status-indicators'>
                <div className='d-flex justify-content-between mb-2'>
                  <span>Form Active:</span>
                  <span
                    className={`badge ${
                      config.isActive ? 'bg-success' : 'bg-secondary'
                    }`}
                  >
                    {config.isActive ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className='d-flex justify-content-between mb-2'>
                  <span>Payment Required:</span>
                  <span
                    className={`badge ${
                      config.requiresPayment ? 'bg-warning' : 'bg-secondary'
                    }`}
                  >
                    {config.requiresPayment ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className='d-flex justify-content-between mb-2'>
                  <span>Qualification Required:</span>
                  <span
                    className={`badge ${
                      config.requiresQualification ? 'bg-info' : 'bg-secondary'
                    }`}
                  >
                    {config.requiresQualification ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className='d-flex justify-content-between'>
                  <span>Pricing Packages:</span>
                  <span className='badge bg-primary'>
                    {config.pricing.packages.length}
                  </span>
                </div>
              </div>

              <hr />

              <div className='form-preview-info'>
                <h6>How users will see this:</h6>
                <ul className='small text-muted'>
                  <li>
                    {config.isActive
                      ? '✅ Form visible on home page'
                      : '❌ Form hidden'}
                  </li>
                  <li>
                    {config.requiresQualification
                      ? '🔒 Only qualified users can register'
                      : '🔓 All users can register'}
                  </li>
                  <li>
                    {config.requiresPayment
                      ? `💳 Payment required ($${config.pricing.basePrice} base)`
                      : '🎉 Free registration'}
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Packages */}
      <div className='card'>
        <div className='card-header'>
          <h5>Pricing Packages</h5>
          <small className='text-muted'>
            Create different pricing options for users to choose from
          </small>
        </div>
        <div className='card-body'>
          {/* Add New Package */}
          <div className='row g-3 mb-4 p-3 bg-light rounded'>
            <div className='col-md-3'>
              <label className='form-label'>Package Name</label>
              <input
                type='text'
                className='form-control'
                placeholder='e.g., 2x/Week, Basic, Premium'
                value={newPackage.name}
                onChange={(e) =>
                  setNewPackage((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>
            <div className='col-md-2'>
              <label className='form-label'>Price</label>
              <div className='input-group'>
                <span className='input-group-text'>$</span>
                <input
                  type='number'
                  className='form-control'
                  placeholder='0'
                  value={newPackage.price}
                  onChange={(e) =>
                    setNewPackage((prev) => ({
                      ...prev,
                      price: Number(e.target.value),
                    }))
                  }
                  min='0'
                  step='1'
                />
              </div>
            </div>
            <div className='col-md-5'>
              <label className='form-label'>Description</label>
              <input
                type='text'
                className='form-control'
                placeholder='e.g., Two training sessions per week'
                value={newPackage.description}
                onChange={(e) =>
                  setNewPackage((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
              />
            </div>
            <div className='col-md-2 d-flex align-items-end'>
              <button
                type='button'
                className='btn btn-primary w-100'
                onClick={addPackage}
                disabled={!newPackage.name || newPackage.price <= 0}
              >
                <i className='ti ti-plus me-1'></i>
                Add Package
              </button>
            </div>
          </div>

          {/* Packages List */}
          {config.pricing.packages.length > 0 ? (
            <div className='packages-list'>
              <h6>Current Packages:</h6>
              {config.pricing.packages.map((pkg, index) => (
                <div key={pkg.id} className='card mb-2'>
                  <div className='card-body py-2'>
                    <div className='row align-items-center'>
                      <div className='col-md-1'>
                        <div className='btn-group btn-group-sm'>
                          <button
                            type='button'
                            className='btn btn-outline-secondary'
                            onClick={() => movePackage(index, 'up')}
                            disabled={index === 0}
                          >
                            <i className='ti ti-arrow-up'></i>
                          </button>
                          <button
                            type='button'
                            className='btn btn-outline-secondary'
                            onClick={() => movePackage(index, 'down')}
                            disabled={
                              index === config.pricing.packages.length - 1
                            }
                          >
                            <i className='ti ti-arrow-down'></i>
                          </button>
                        </div>
                      </div>
                      <div className='col-md-3'>
                        <strong>{pkg.name}</strong>
                      </div>
                      <div className='col-md-2'>
                        <span className='text-success fw-bold'>
                          ${pkg.price}
                        </span>
                      </div>
                      <div className='col-md-4'>
                        <small className='text-muted'>{pkg.description}</small>
                      </div>
                      <div className='col-md-2 text-end'>
                        <button
                          type='button'
                          className='btn btn-sm btn-outline-danger'
                          onClick={() => removePackage(pkg.id!)}
                        >
                          <i className='ti ti-trash'></i>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className='text-center p-4 text-muted'>
              <i className='ti ti-package-off fs-1 mb-2'></i>
              <p>No pricing packages created yet</p>
              <small>
                Add packages to give users different pricing options
              </small>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedFormConfig;
