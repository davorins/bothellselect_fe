import React from 'react';
import { Card, Badge, Alert } from 'react-bootstrap';
import {
  SeasonEvent,
  RegistrationFormConfig,
  PricingPackage,
  TournamentSpecificConfig,
  TryoutSpecificConfig,
} from '../../types/registration-types';

interface FormPreviewProps {
  seasonEvent?: SeasonEvent;
  formConfig?: RegistrationFormConfig;
  tournamentConfig?: TournamentSpecificConfig;
  tryoutConfig?: TryoutSpecificConfig;
  isTournamentView?: boolean;
  isTryoutView?: boolean;
  previewType?: 'training' | 'tournament' | 'tryout';
}

const FormPreview: React.FC<FormPreviewProps> = ({
  seasonEvent,
  formConfig,
  tournamentConfig,
  tryoutConfig,
  isTournamentView = false,
  isTryoutView = false,
  previewType = 'training',
}) => {
  // Determine which type of preview we're showing
  const isTournament = isTournamentView || previewType === 'tournament';
  const isTryout = isTryoutView || previewType === 'tryout';
  const isTraining = !isTournament && !isTryout;

  // Helper function to get description based on type
  const getDescription = () => {
    if (isTournament && tournamentConfig) {
      return tournamentConfig.description || '';
    }
    if (isTryout && tryoutConfig) {
      return tryoutConfig.description || '';
    }
    if (isTraining && formConfig) {
      return formConfig.description || '';
    }
    return '';
  };

  // Helper function to get title based on type
  const getTitle = () => {
    if (isTournament && tournamentConfig) {
      return `${tournamentConfig.tournamentName || 'Tournament'} ${
        tournamentConfig.tournamentYear || ''
      }`;
    }
    if (isTryout && tryoutConfig) {
      return `${tryoutConfig.tryoutName || 'Tryout'} ${
        tryoutConfig.tryoutYear || ''
      }`;
    }
    if (isTraining && seasonEvent) {
      return `${seasonEvent.season || ''} ${seasonEvent.year || ''}`;
    }
    return '';
  };

  // Helper function to get icon based on type
  const getIcon = () => {
    if (isTournament) return 'ti ti-trophy';
    if (isTryout) return 'ti ti-target-arrow';
    return 'ti ti-info-circle';
  };

  // Render description section
  const renderDescription = () => {
    const description = getDescription();
    const title = getTitle();
    const icon = getIcon();

    if (!description) {
      return (
        <div className='card mb-4'>
          <div className='card-body text-center p-5'>
            <i className='ti ti-text-wrap-off fs-1 text-muted mb-3'></i>
            <h5>No Description Set</h5>
            <p className='text-muted'>
              {isTournament
                ? 'Add a tournament description in the configuration to see it here.'
                : isTryout
                ? 'Add a tryout description in the configuration to see it here.'
                : 'Add a training description in the configuration to see it here.'}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className='card mb-4'>
        <div className='card-header bg-light'>
          <div className='d-flex align-items-center'>
            <span className='bg-white avatar avatar-sm me-2 text-gray-7 flex-shrink-0'>
              <i className={`${icon} fs-16`} />
            </span>
            <h4 className='text-dark mb-0'>{title}</h4>
          </div>
        </div>
        <div className='card-body'>
          <div
            className='rich-text-content'
            dangerouslySetInnerHTML={{ __html: description }}
          />
        </div>
      </div>
    );
  };

  if (!formConfig && !tournamentConfig && !tryoutConfig) {
    return (
      <Card>
        <Card.Body className='text-center p-5'>
          <i className='ti ti-file-off fs-1 text-muted mb-3'></i>
          <h5>No Configuration Found</h5>
          <p className='text-muted'>
            {isTournament
              ? 'No tournament configuration exists yet.'
              : isTryout
              ? 'No tryout configuration exists yet.'
              : `No configuration exists for ${
                  seasonEvent?.season || 'this season'
                } ${seasonEvent?.year || ''}.`}
            Please configure the form first.
          </p>
        </Card.Body>
      </Card>
    );
  }

  const packagesCount = formConfig?.pricing?.packages?.length || 0;
  const hasPackages = packagesCount > 0;
  const basePrice = formConfig?.pricing?.basePrice || 0;
  const tournamentFee = tournamentConfig?.tournamentFee || 0;
  const tryoutFee = tryoutConfig?.tryoutFee || 0;

  const isActive = isTournament
    ? tournamentConfig?.isActive || false
    : isTryout
    ? tryoutConfig?.isActive || false
    : formConfig?.isActive || false;

  return (
    <div className='form-preview'>
      <Card>
        <Card.Header>
          <h4 className='mb-0'>
            {isTournament
              ? 'Tournament Registration Preview'
              : isTryout
              ? 'Tryout Registration Preview'
              : 'Training Registration Preview'}
            {seasonEvent &&
              isTraining &&
              ` - ${seasonEvent.season} ${seasonEvent.year}`}
            {isTournament &&
              tournamentConfig &&
              ` - ${tournamentConfig.tournamentName}`}
            {isTryout && tryoutConfig && ` - ${tryoutConfig.tryoutName}`}
          </h4>
        </Card.Header>
        <Card.Body>
          {/* Show Description First */}
          {renderDescription()}

          {/* Form Status */}
          <div className='mb-4'>
            <div className='d-flex justify-content-between align-items-center mb-3'>
              <h5>Status</h5>
              <Badge bg={isActive ? 'success' : 'secondary'}>
                {isActive ? 'ACTIVE' : 'INACTIVE'}
              </Badge>
            </div>

            {!isActive && (
              <Alert variant='warning'>
                <i className='ti ti-eye-off me-2'></i>
                This{' '}
                {isTournament ? 'tournament' : isTryout ? 'tryout' : 'form'} is
                currently inactive and won't be visible to users.
              </Alert>
            )}
          </div>

          {/* Tryout Specific Preview */}
          {isTryout && tryoutConfig && (
            <div className='mb-4'>
              <h5>Tryout Details</h5>

              {/* Basic Tryout Info */}
              <div className='card bg-light mb-3'>
                <div className='card-body'>
                  <h6>Basic Information</h6>
                  <p className='mb-1'>
                    <strong>Tryout Name:</strong> {tryoutConfig.tryoutName}
                  </p>
                  <p className='mb-1'>
                    <strong>Tryout Year:</strong> {tryoutConfig.tryoutYear}
                  </p>
                  {tryoutConfig.displayName && (
                    <p className='mb-1'>
                      <strong>Display Name:</strong> {tryoutConfig.displayName}
                    </p>
                  )}
                  {tryoutConfig.registrationDeadline && (
                    <p className='mb-1'>
                      <strong>Registration Deadline:</strong>{' '}
                      {new Date(
                        tryoutConfig.registrationDeadline
                      ).toLocaleDateString()}
                    </p>
                  )}
                  {tryoutConfig.paymentDeadline && (
                    <p className='mb-1'>
                      <strong>Payment Deadline:</strong>{' '}
                      {new Date(
                        tryoutConfig.paymentDeadline
                      ).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>

              {/* Requirements */}
              <div className='card bg-light mb-3'>
                <div className='card-body'>
                  <h6>Requirements</h6>
                  <div className='d-flex align-items-center mb-2'>
                    <i
                      className={`ti ti-${
                        tryoutConfig.requiresPayment
                          ? 'check text-success'
                          : 'x text-danger'
                      } me-2`}
                    ></i>
                    <span>
                      {tryoutConfig.requiresPayment
                        ? 'Payment Required'
                        : 'No Payment Required'}
                    </span>
                  </div>
                  <div className='d-flex align-items-center mb-2'>
                    <i
                      className={`ti ti-${
                        tryoutConfig.requiresRoster
                          ? 'check text-success'
                          : 'x text-danger'
                      } me-2`}
                    ></i>
                    <span>
                      {tryoutConfig.requiresRoster
                        ? 'Roster Required'
                        : 'No Roster Required'}
                    </span>
                  </div>
                  <div className='d-flex align-items-center'>
                    <i
                      className={`ti ti-${
                        tryoutConfig.requiresInsurance
                          ? 'check text-success'
                          : 'x text-danger'
                      } me-2`}
                    ></i>
                    <span>
                      {tryoutConfig.requiresInsurance
                        ? 'Insurance Required'
                        : 'No Insurance Required'}
                    </span>
                  </div>
                  {tryoutConfig.refundPolicy && (
                    <div className='mt-2'>
                      <strong>Refund Policy:</strong>
                      <p className='mb-0 small'>{tryoutConfig.refundPolicy}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Tryout Dates */}
              {tryoutConfig.tryoutDates?.length > 0 && (
                <div className='mb-3'>
                  <h6>Tryout Dates:</h6>
                  <div className='d-flex flex-wrap gap-2'>
                    {tryoutConfig.tryoutDates?.map((date, index) => (
                      <Badge key={index} bg='primary'>
                        {new Date(date).toLocaleDateString()}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Locations */}
              {tryoutConfig.locations?.length > 0 && (
                <div className='mb-3'>
                  <h6>Locations:</h6>
                  <div className='d-flex flex-wrap gap-2'>
                    {tryoutConfig.locations?.map((location, index) => (
                      <Badge key={index} bg='info'>
                        {location}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tournament Specific Preview */}
          {isTournament && tournamentConfig && (
            <div className='mb-4'>
              <h5>Tournament Details</h5>

              {/* Basic Tournament Info */}
              <div className='card bg-light mb-3'>
                <div className='card-body'>
                  <h6>Basic Information</h6>
                  <p className='mb-1'>
                    <strong>Tournament Name:</strong>{' '}
                    {tournamentConfig.tournamentName}
                  </p>
                  <p className='mb-1'>
                    <strong>Tournament Year:</strong>{' '}
                    {tournamentConfig.tournamentYear}
                  </p>
                  {tournamentConfig.displayName && (
                    <p className='mb-1'>
                      <strong>Display Name:</strong>{' '}
                      {tournamentConfig.displayName}
                    </p>
                  )}
                  {tournamentConfig.registrationDeadline && (
                    <p className='mb-1'>
                      <strong>Registration Deadline:</strong>{' '}
                      {new Date(
                        tournamentConfig.registrationDeadline
                      ).toLocaleDateString()}
                    </p>
                  )}
                  {tournamentConfig.paymentDeadline && (
                    <p className='mb-1'>
                      <strong>Payment Deadline:</strong>{' '}
                      {new Date(
                        tournamentConfig.paymentDeadline
                      ).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>

              {/* Requirements */}
              <div className='card bg-light mb-3'>
                <div className='card-body'>
                  <h6>Requirements</h6>
                  <div className='d-flex align-items-center mb-2'>
                    <i
                      className={`ti ti-${
                        tournamentConfig.requiresRoster
                          ? 'check text-success'
                          : 'x text-danger'
                      } me-2`}
                    ></i>
                    <span>
                      {tournamentConfig.requiresRoster
                        ? 'Roster Required'
                        : 'No Roster Required'}
                    </span>
                  </div>
                  <div className='d-flex align-items-center'>
                    <i
                      className={`ti ti-${
                        tournamentConfig.requiresInsurance
                          ? 'check text-success'
                          : 'x text-danger'
                      } me-2`}
                    ></i>
                    <span>
                      {tournamentConfig.requiresInsurance
                        ? 'Insurance Required'
                        : 'No Insurance Required'}
                    </span>
                  </div>
                  {tournamentConfig.refundPolicy && (
                    <div className='mt-2'>
                      <strong>Refund Policy:</strong>
                      <p className='mb-0 small'>
                        {tournamentConfig.refundPolicy}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Tournament Dates */}
              {tournamentConfig.tournamentDates?.length > 0 && (
                <div className='mb-3'>
                  <h6>Tournament Dates:</h6>
                  <div className='d-flex flex-wrap gap-2'>
                    {tournamentConfig.tournamentDates?.map((date, index) => (
                      <Badge key={index} bg='primary'>
                        {new Date(date).toLocaleDateString()}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Locations */}
              {tournamentConfig.locations?.length > 0 && (
                <div className='mb-3'>
                  <h6>Locations:</h6>
                  <div className='d-flex flex-wrap gap-2'>
                    {tournamentConfig.locations?.map((location, index) => (
                      <Badge key={index} bg='info'>
                        {location}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Divisions */}
              {tournamentConfig.divisions?.length > 0 && (
                <div className='mb-4'>
                  <h6>Divisions:</h6>
                  <div className='d-flex flex-wrap gap-2'>
                    {tournamentConfig.divisions?.map((division, index) => (
                      <Badge key={index} bg='secondary'>
                        {division}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Tournament Documents */}
              {(tournamentConfig.rulesDocumentUrl ||
                tournamentConfig.scheduleDocumentUrl) && (
                <div className='mb-4'>
                  <h6>Tournament Documents:</h6>
                  <div className='d-flex flex-wrap gap-2'>
                    {tournamentConfig.rulesDocumentUrl && (
                      <Badge bg='warning' className='cursor-pointer'>
                        <a
                          href={tournamentConfig.rulesDocumentUrl}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='text-white text-decoration-none'
                        >
                          Rules Document
                        </a>
                      </Badge>
                    )}
                    {tournamentConfig.scheduleDocumentUrl && (
                      <Badge bg='warning' className='cursor-pointer'>
                        <a
                          href={tournamentConfig.scheduleDocumentUrl}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='text-white text-decoration-none'
                        >
                          Schedule Document
                        </a>
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Pricing */}
          <div className='mb-4'>
            <h5>Pricing Configuration</h5>
            <div className='row'>
              <div className='col-md-6'>
                <div className='card bg-light'>
                  <div className='card-body'>
                    <h6>
                      {isTournament
                        ? 'Tournament Fee (per team)'
                        : isTryout
                        ? 'Tryout Fee (per player)'
                        : 'Base Price'}
                    </h6>
                    <p className='h4 text-primary'>
                      $
                      {isTournament
                        ? tournamentFee
                        : isTryout
                        ? tryoutFee
                        : basePrice}
                    </p>
                    <small className='text-muted'>
                      {isTournament
                        ? 'Per team registration fee'
                        : isTryout
                        ? 'Per player tryout fee'
                        : 'Applied when no packages are selected'}
                    </small>
                  </div>
                </div>
              </div>
              {!isTournament && !isTryout && (
                <div className='col-md-6'>
                  <div className='card bg-light'>
                    <div className='card-body'>
                      <h6>Pricing Packages</h6>
                      <p className='h4 text-primary'>{packagesCount}</p>
                      <small className='text-muted'>
                        Available package options
                      </small>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Training Packages Preview */}
          {isTraining && formConfig && hasPackages && (
            <div className='mb-4'>
              <h5>Available Packages ({packagesCount})</h5>
              <div className='row'>
                {formConfig.pricing?.packages?.map(
                  (pkg: PricingPackage, index: number) => (
                    <div key={pkg.id || index} className='col-md-6 mb-3'>
                      <div className='card border'>
                        <div className='card-body'>
                          <div className='d-flex justify-content-between align-items-start mb-2'>
                            <h6 className='mb-0'>{pkg.name}</h6>
                            <span className='badge bg-primary'>
                              ${pkg.price}
                            </span>
                          </div>
                          {pkg.description && (
                            <p className='text-muted small mb-0'>
                              {pkg.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {/* User Experience Preview */}
          <div className='mt-4'>
            <h5>User Experience</h5>
            <div className='card bg-light'>
              <div className='card-body'>
                <p>
                  When users access this{' '}
                  {isTournament
                    ? 'tournament registration'
                    : isTryout
                    ? 'tryout registration'
                    : 'form'}
                  , they will see:
                </p>
                <ul className='mb-0'>
                  <li>
                    {isActive ? (
                      <>
                        <i className='ti ti-check text-success me-2'></i>
                        {isTournament
                          ? 'Tournament'
                          : isTryout
                          ? 'Tryout'
                          : 'Form'}{' '}
                        is visible and accessible
                      </>
                    ) : (
                      <>
                        <i className='ti ti-x text-danger me-2'></i>
                        {isTournament
                          ? 'Tournament'
                          : isTryout
                          ? 'Tryout'
                          : 'Form'}{' '}
                        is hidden from users
                      </>
                    )}
                  </li>
                  {isTraining && formConfig?.requiresQualification && (
                    <li>
                      <i className='ti ti-lock text-info me-2'></i>
                      Only qualified users can register
                    </li>
                  )}
                  <li>
                    {(isTraining && formConfig?.requiresPayment) ||
                    (isTournament &&
                      (tournamentConfig?.tournamentFee || 0) > 0) ||
                    (isTryout && tryoutConfig?.requiresPayment) ? (
                      <>
                        <i className='ti ti-currency-dollar text-warning me-2'></i>
                        Payment required to complete registration
                      </>
                    ) : (
                      <>
                        <i className='ti ti-gift text-success me-2'></i>
                        Free registration - no payment required
                      </>
                    )}
                  </li>
                  {isTournament && tournamentConfig ? (
                    <>
                      {tournamentConfig.tournamentDates?.length > 0 && (
                        <li>
                          <i className='ti ti-calendar text-primary me-2'></i>
                          {tournamentConfig.tournamentDates.length} tournament
                          date(s)
                        </li>
                      )}
                      {tournamentConfig.locations?.length > 0 && (
                        <li>
                          <i className='ti ti-map-pin text-primary me-2'></i>
                          {tournamentConfig.locations.length} location(s)
                        </li>
                      )}
                      {tournamentConfig.divisions?.length > 0 && (
                        <li>
                          <i className='ti ti-trophy text-primary me-2'></i>
                          {tournamentConfig.divisions.length} division(s):{' '}
                          {tournamentConfig.divisions.join(', ')}
                        </li>
                      )}
                    </>
                  ) : isTryout && tryoutConfig ? (
                    <>
                      {tryoutConfig.tryoutDates?.length > 0 && (
                        <li>
                          <i className='ti ti-calendar text-primary me-2'></i>
                          {tryoutConfig.tryoutDates.length} tryout date(s)
                        </li>
                      )}
                      {tryoutConfig.locations?.length > 0 && (
                        <li>
                          <i className='ti ti-map-pin text-primary me-2'></i>
                          {tryoutConfig.locations.length} location(s)
                        </li>
                      )}
                    </>
                  ) : (
                    isTraining && (
                      <li>
                        {hasPackages ? (
                          <>
                            <i className='ti ti-package text-primary me-2'></i>
                            {packagesCount} pricing package(s) available
                          </>
                        ) : (
                          <>
                            <i className='ti ti-currency-dollar text-muted me-2'></i>
                            Base price only: ${basePrice}
                          </>
                        )}
                      </li>
                    )
                  )}
                </ul>
              </div>
            </div>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
};

export default FormPreview;
