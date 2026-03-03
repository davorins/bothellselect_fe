import React, { useState, useEffect } from 'react';
import { Badge } from 'react-bootstrap';
import {
  RegistrationFormConfig as RegistrationFormConfigType,
  SeasonEvent,
  PricingPackage,
} from '../../types/registration-types';
import RichTextEditor from '../common/RichTextEditor';

interface RegistrationFormConfigProps {
  seasonEvent: SeasonEvent;
  onConfigUpdate: (config: RegistrationFormConfigType) => void;
  initialConfig?: RegistrationFormConfigType;
}

const RegistrationFormConfig: React.FC<RegistrationFormConfigProps> = ({
  seasonEvent,
  onConfigUpdate,
  initialConfig,
}) => {
  const defaultConfig: RegistrationFormConfigType = {
    isActive: false,
    requiresPayment: true,
    requiresQualification: false,
    pricing: {
      basePrice: 0,
      packages: [],
    },
    description: '',
  };

  const [config, setConfig] =
    useState<RegistrationFormConfigType>(defaultConfig);
  const [newPackage, setNewPackage] = useState<Omit<PricingPackage, 'id'>>({
    name: '',
    price: 0,
    description: '',
  });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleDescriptionChange = (html: string) => {
    updateConfig({ description: html });
  };

  useEffect(() => {
    console.log('📥 Received initialConfig:', {
      initialConfig,
      seasonEvent,
      hasPricing: !!initialConfig?.pricing,
      basePrice: initialConfig?.pricing?.basePrice,
      isActive: initialConfig?.isActive,
    });

    if (initialConfig) {
      const loadedConfig: RegistrationFormConfigType = {
        isActive: initialConfig.isActive ?? defaultConfig.isActive,
        requiresPayment:
          initialConfig.requiresPayment ?? defaultConfig.requiresPayment,
        requiresQualification:
          initialConfig.requiresQualification ??
          defaultConfig.requiresQualification,
        description: initialConfig.description || '',
        pricing: {
          basePrice:
            initialConfig.pricing?.basePrice ?? defaultConfig.pricing.basePrice,
          packages:
            initialConfig.pricing?.packages?.map((pkg) => ({
              id: pkg.id || Date.now().toString(),
              name: pkg.name || '',
              price: pkg.price || 0,
              description: pkg.description || '',
            })) || [],
        },
      };

      console.log('✅ Loaded config:', loadedConfig);
      setConfig(loadedConfig);
      setHasUnsavedChanges(false);
    } else {
      console.log('🆕 No initial config, using default');
      setConfig(defaultConfig);
    }
  }, [initialConfig, seasonEvent]);

  const updateConfig = (updates: Partial<RegistrationFormConfigType>) => {
    setConfig((prev) => {
      const newConfig = { ...prev, ...updates };
      setHasUnsavedChanges(true);
      return newConfig;
    });
  };

  const handleAddPackage = () => {
    if (newPackage.name && newPackage.price > 0) {
      const packageWithId: PricingPackage = {
        ...newPackage,
        id: Date.now().toString(),
      };

      setConfig((prev) => {
        const newConfig = {
          ...prev,
          pricing: {
            ...prev.pricing,
            packages: [...prev.pricing.packages, packageWithId],
          },
        };
        setHasUnsavedChanges(true);
        return newConfig;
      });
      setNewPackage({ name: '', price: 0, description: '' });
    }
  };

  const handleRemovePackage = (packageId: string) => {
    setConfig((prev) => {
      const newConfig = {
        ...prev,
        pricing: {
          ...prev.pricing,
          packages: prev.pricing.packages.filter((pkg) => pkg.id !== packageId),
        },
      };
      setHasUnsavedChanges(true);
      return newConfig;
    });
  };

  const handleMovePackage = (index: number, direction: 'up' | 'down') => {
    const packages = [...config.pricing.packages];
    const newIndex = direction === 'up' ? index - 1 : index + 1;

    if (newIndex >= 0 && newIndex < packages.length) {
      [packages[index], packages[newIndex]] = [
        packages[newIndex],
        packages[index],
      ];
      setConfig((prev) => {
        const newConfig = {
          ...prev,
          pricing: {
            ...prev.pricing,
            packages,
          },
        };
        setHasUnsavedChanges(true);
        return newConfig;
      });
    }
  };

  const handleSave = async () => {
    if (!hasUnsavedChanges) return;

    try {
      setIsSaving(true);
      console.log('💾 Saving configuration with description:', {
        config,
        description: config.description,
        descriptionLength: config.description?.length,
      });

      const configToSave: RegistrationFormConfigType = {
        ...config,
        description: config.description || '',
        pricing: {
          basePrice: config.pricing.basePrice || 0,
          packages: config.pricing.packages.map((pkg) => ({
            id: pkg.id || Date.now().toString(),
            name: pkg.name,
            price: pkg.price,
            description: pkg.description || '',
          })),
        },
      };

      await onConfigUpdate(configToSave);
      setHasUnsavedChanges(false);
      console.log('✅ Save successful');
    } catch (error) {
      console.error('❌ Failed to save config:', error);
      alert('Failed to save configuration. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className='card'>
      <div className='card-body'>
        <div className='d-flex justify-content-between align-items-center mb-4'>
          <div>
            <h4 className='mb-1'>
              Training Configuration - {seasonEvent.season} {seasonEvent.year}
            </h4>
            <p className='text-muted mb-0'>
              {initialConfig
                ? 'Edit existing configuration'
                : 'Create new configuration'}
            </p>
          </div>
          <div className='d-flex align-items-center'>
            {hasUnsavedChanges && (
              <Badge bg='warning' className='me-3'>
                <i className='ti ti-alert-circle me-1'></i>
                Unsaved Changes
              </Badge>
            )}
            <button
              className='btn btn-primary'
              onClick={handleSave}
              disabled={!hasUnsavedChanges || isSaving}
            >
              {isSaving ? (
                <>
                  <span
                    className='spinner-border spinner-border-sm me-2'
                    role='status'
                    aria-hidden='true'
                  ></span>
                  Saving...
                </>
              ) : (
                <>
                  <i className='ti ti-device-floppy me-2'></i>
                  Save Configuration
                </>
              )}
            </button>
          </div>
        </div>

        <div className='card mb-4'>
          <div className='card-header'>
            <h5 className='mb-0'>Form Description</h5>
            <small className='text-muted'>
              This description will appear above the registration form for
              parents
            </small>
          </div>
          <div className='card-body'>
            <div className='mb-3'>
              <label className='form-label'>Form Description *</label>
              <RichTextEditor
                value={config.description || ''}
                onChange={handleDescriptionChange}
                placeholder='Enter a detailed description of this training program...'
                showPreview={true}
              />
              <small className='form-text text-muted'>
                Use markdown formatting or toolbar buttons to style your content
              </small>
            </div>

            {/* Enhanced Preview Section */}
            <div className='alert alert-info mt-4'>
              <i className='ti ti-info-circle me-2'></i>
              <strong>How it will appear to parents:</strong>
              <div className='mt-3 description-preview p-4 bg-white rounded border'>
                <div className='d-flex align-items-center mb-3'>
                  <i className='ti ti-info-circle text-primary me-2'></i>
                  <h5 className='mb-0 text-primary'>
                    {seasonEvent.season} {seasonEvent.year}
                  </h5>
                </div>
                <div
                  className='description-content'
                  style={{
                    fontSize: '16px',
                    lineHeight: '1.6',
                    color: '#333',
                  }}
                  dangerouslySetInnerHTML={{
                    __html:
                      config.description ||
                      '<p class="text-muted">No description set yet</p>',
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className='row mb-4'>
          <div className='col-md-6'>
            <div className='form-check form-switch mb-3'>
              <input
                className='form-check-input'
                type='checkbox'
                checked={config.isActive}
                onChange={(e) => updateConfig({ isActive: e.target.checked })}
                style={{ transform: 'scale(1.2)' }}
              />
              <label className='form-check-label fw-bold'>Form Active</label>
              <small className='form-text text-muted d-block'>
                When active, this form will be visible to users
              </small>
            </div>
          </div>
          <div className='col-md-6'>
            <div className='form-check form-switch mb-3'>
              <input
                className='form-check-input'
                type='checkbox'
                checked={config.requiresPayment}
                onChange={(e) =>
                  updateConfig({ requiresPayment: e.target.checked })
                }
                style={{ transform: 'scale(1.2)' }}
              />
              <label className='form-check-label fw-bold'>
                Requires Payment
              </label>
              <small className='form-text text-muted d-block'>
                Users must complete payment to register
              </small>
            </div>
          </div>
        </div>

        <div className='row mb-4'>
          <div className='col-md-6'>
            <div className='form-check form-switch mb-3'>
              <input
                className='form-check-input'
                type='checkbox'
                checked={config.requiresQualification}
                onChange={(e) =>
                  updateConfig({ requiresQualification: e.target.checked })
                }
                style={{ transform: 'scale(1.2)' }}
              />
              <label className='form-check-label fw-bold'>
                Requires Tryout Qualification
              </label>
              <small className='form-text text-muted d-block'>
                Only users who passed tryouts can register
              </small>
            </div>
          </div>
          <div className='col-md-6'>
            <div className='mb-3'>
              <label className='form-label fw-bold'>Base Price</label>
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
                Default price when no packages are selected
              </small>
            </div>
          </div>
        </div>

        <div className='card'>
          <div className='card-header'>
            <h5 className='mb-0'>Pricing Packages</h5>
            <small className='text-muted'>
              Add optional pricing packages for users to choose from
            </small>
          </div>
          <div className='card-body'>
            <div className='row g-3 mb-4 p-3 bg-light rounded'>
              <div className='col-md-4'>
                <label className='form-label'>Package Name *</label>
                <input
                  type='text'
                  className='form-control'
                  placeholder='e.g., Premium Package, Basic Plan'
                  value={newPackage.name}
                  onChange={(e) =>
                    setNewPackage((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>
              <div className='col-md-3'>
                <label className='form-label'>Price *</label>
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
              <div className='col-md-3'>
                <label className='form-label'>Description</label>
                <input
                  type='text'
                  className='form-control'
                  placeholder='e.g., Includes extra training sessions'
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
                  onClick={handleAddPackage}
                  disabled={!newPackage.name || newPackage.price <= 0}
                >
                  <i className='ti ti-plus me-1'></i>
                  Add
                </button>
              </div>
            </div>

            {config.pricing.packages.length > 0 ? (
              <div className='packages-list'>
                <h6>Current Packages ({config.pricing.packages.length}):</h6>
                {config.pricing.packages.map((pkg, index) => (
                  <div key={pkg.id} className='card mb-2'>
                    <div className='card-body py-2'>
                      <div className='row align-items-center'>
                        <div className='col-md-1'>
                          <div className='btn-group btn-group-sm'>
                            <button
                              type='button'
                              className='btn btn-outline-secondary'
                              onClick={() => handleMovePackage(index, 'up')}
                              disabled={index === 0}
                            >
                              <i className='ti ti-arrow-up'></i>
                            </button>
                            <button
                              type='button'
                              className='btn btn-outline-secondary'
                              onClick={() => handleMovePackage(index, 'down')}
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
                          <small className='text-muted'>
                            {pkg.description || 'No description'}
                          </small>
                        </div>
                        <div className='col-md-2 text-end'>
                          <button
                            type='button'
                            className='btn btn-sm btn-outline-danger'
                            onClick={() => handleRemovePackage(pkg.id!)}
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
                <p>No pricing packages added yet</p>
                <small>Add packages to provide different pricing options</small>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegistrationFormConfig;
