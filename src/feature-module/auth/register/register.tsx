import React, { useState, ChangeEvent, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { all_routes } from '../../router/all_routes';
import ImageWithBasePath from '../../../core/common/imageWithBasePath';
import { useAuth } from '../../../context/AuthContext';

interface Address {
  street: string;
  street2: string;
  city: string;
  state: string;
  zip: string;
}

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  phone: string;
  address: Address;
  relationship: string;
  isCoach: boolean;
  aauNumber: string;
  agreeToTerms: boolean;
}

const Register = () => {
  const routes = all_routes;
  const navigation = useNavigate();
  const { register } = useAuth();
  const currentYear = new Date().getFullYear();

  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    phone: '',
    address: {
      street: '',
      street2: '',
      city: '',
      state: '',
      zip: '',
    },
    relationship: '',
    isCoach: false,
    aauNumber: '',
    agreeToTerms: false,
  });

  const [emailExists, setEmailExists] = useState<boolean | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  type PasswordField = 'password' | 'confirmPassword';

  const [passwordVisibility, setPasswordVisibility] = useState({
    password: false,
    confirmPassword: false,
  });

  const togglePasswordVisibility = (field: PasswordField) => {
    setPasswordVisibility((prevState) => ({
      ...prevState,
      [field]: !prevState[field],
    }));
  };

  const parseAddress = (fullAddress: string): Address => {
    // First try pattern with unit designator
    const patternWithUnit =
      /^(\d+\s[\w\s\.]+?)\s*(?:,?\s*(apt|apartment|suite|ste|unit|building|bldg|floor|fl|room|rm|department|dept|lot|#)\.?\s*([\w\s\-]+?)\s*)?,\s*([^,]+?)\s*,\s*([a-zA-Z]{2,})\s*(\d{5}(?:-\d{4})?)$/i;
    const matchWithUnit = fullAddress.match(patternWithUnit);

    if (matchWithUnit) {
      return {
        street: matchWithUnit[1].trim(),
        street2:
          matchWithUnit[2] && matchWithUnit[3]
            ? `${matchWithUnit[2].trim()} ${matchWithUnit[3].trim()}`.replace(
                /\s+/g,
                ' '
              )
            : '',
        city: matchWithUnit[4].trim(),
        state: normalizeState(matchWithUnit[5].trim()),
        zip: matchWithUnit[6].trim(),
      };
    }

    // Fallback pattern for addresses without unit designators
    const fallbackPattern =
      /^([^,]+?)\s*,\s*([^,]+?)\s*,\s*([a-zA-Z]{2,})\s*(\d{5}(?:-\d{4})?)$/i;
    const fallbackMatch = fullAddress.match(fallbackPattern);

    if (fallbackMatch) {
      return {
        street: fallbackMatch[1].trim(),
        street2: '',
        city: fallbackMatch[2].trim(),
        state: normalizeState(fallbackMatch[3].trim()),
        zip: fallbackMatch[4].trim(),
      };
    }

    // If all parsing fails, return the raw address in street
    return {
      street: fullAddress,
      street2: '',
      city: '',
      state: '',
      zip: '',
    };
  };

  const normalizeState = (stateInput: string): string => {
    const stateMap: Record<string, string> = {
      alabama: 'AL',
      alaska: 'AK',
      arizona: 'AZ',
      arkansas: 'AR',
      california: 'CA',
      colorado: 'CO',
      connecticut: 'CT',
      delaware: 'DE',
      florida: 'FL',
      georgia: 'GA',
      hawaii: 'HI',
      idaho: 'ID',
      illinois: 'IL',
      indiana: 'IN',
      iowa: 'IA',
      kansas: 'KS',
      kentucky: 'KY',
      louisiana: 'LA',
      maine: 'ME',
      maryland: 'MD',
      massachusetts: 'MA',
      michigan: 'MI',
      minnesota: 'MN',
      mississippi: 'MS',
      missouri: 'MO',
      montana: 'MT',
      nebraska: 'NE',
      nevada: 'NV',
      'new hampshire': 'NH',
      'new jersey': 'NJ',
      'new mexico': 'NM',
      'new york': 'NY',
      'north carolina': 'NC',
      'north dakota': 'ND',
      ohio: 'OH',
      oklahoma: 'OK',
      oregon: 'OR',
      pennsylvania: 'PA',
      'rhode island': 'RI',
      'south carolina': 'SC',
      'south dakota': 'SD',
      tennessee: 'TN',
      texas: 'TX',
      utah: 'UT',
      vermont: 'VT',
      virginia: 'VA',
      washington: 'WA',
      'west virginia': 'WV',
      wisconsin: 'WI',
      wyoming: 'WY',
    };

    const normalizedInput = stateInput.toLowerCase().trim();

    // If it's already a 2-letter code in correct case, return it
    if (/^[A-Z]{2}$/.test(stateInput)) {
      return stateInput;
    }

    // If it's a 2-letter code in wrong case, uppercase it
    if (/^[a-zA-Z]{2}$/.test(stateInput)) {
      return stateInput.toUpperCase();
    }

    // Look up full state name
    return stateMap[normalizedInput] || stateInput;
  };

  const validateAddress = (address: Address): boolean => {
    return (
      !!address.street && !!address.city && !!address.state && !!address.zip
    );
  };

  const formatPhoneNumber = (value: string): string => {
    // Remove all non-numeric characters
    const cleaned = ('' + value).replace(/\D/g, '');

    // Check if the input is of the correct length
    const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);

    if (match) {
      // Format the phone number
      return !match[2]
        ? match[1] // If only the first group exists, return it
        : `(${match[1]}) ${match[2]}${match[3] ? '-' + match[3] : ''}`; // Add parentheses, space, and hyphen
    }

    return value; // Return the original value if no match
  };

  const checkEmailExists = async (email: string) => {
    try {
      const response = await fetch(
        `/api/check-email?email=${encodeURIComponent(email)}`
      );
      const data = await response.json();
      setEmailExists(data.exists);
    } catch (error) {
      console.error('Error checking email:', error);
      setEmailExists(null);
    }
  };

  const handleChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;

    if (name === 'email') {
      setFormData({
        ...formData,
        email: value,
      });

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        setEmailError('Please enter a valid email address.');
        return; // Exit if invalid
      } else {
        setEmailError(null); // Clear error if valid
      }

      // Check if email exists
      await checkEmailExists(value);
    } else {
      setFormData({
        ...formData,
        [name]: e.target.value,
      });
    }
    if (name === 'phone') {
      const formattedPhone = formatPhoneNumber(value);
      setFormData({
        ...formData,
        [name]: formattedPhone,
      });
    } else if (name === 'address') {
      const parsedAddress = parseAddress(value);
      setFormData({
        ...formData,
        address: parsedAddress,
      });
    } else {
      setFormData({
        ...formData,
        [name]: type === 'checkbox' ? checked : value,
      });
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const trimmedData = {
      ...formData,
      email: formData.email.trim(),
      password: formData.password.trim(),
      fullName: formData.fullName.trim(),
      phone: formData.phone.replace(/\D/g, ''),
    };

    // Check if password and confirm password match
    if (formData.password !== formData.confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    } else {
      setPasswordError(null);
    }

    if (emailExists) {
      setFormError('Email already registered');
      return;
    } else {
      setFormError(null);
    }

    // Validate phone number
    if (!/^\(?(\d{3})\)?[- ]?(\d{3})[- ]?(\d{4})$/.test(formData.phone)) {
      setPhoneError('Please enter a valid phone number');
      return;
    } else {
      setPhoneError(null);
    }

    // Validate address
    if (!validateAddress(formData.address)) {
      setFormError('Please enter a complete address (Street, City, State ZIP)');
      return;
    } else {
      setFormError(null);
    }

    // Convert address object to string for the register function
    const addressString = `${formData.address.street}${
      formData.address.street2 ? ', ' + formData.address.street2 : ''
    }, ${formData.address.city}, ${formData.address.state} ${
      formData.address.zip
    }`;

    // Prepare the payload
    const payload = {
      email: formData.email.trim(),
      password: trimmedData.password,
      fullName: formData.fullName,
      phone: formData.phone,
      address: addressString,
      relationship: formData.relationship,
      isCoach: formData.isCoach,
      aauNumber: formData.aauNumber,
      agreeToTerms: formData.agreeToTerms,
    };

    console.log('Registration Payload:', payload);

    try {
      await register(
        trimmedData.email,
        trimmedData.password,
        trimmedData.fullName,
        trimmedData.phone,
        addressString,
        trimmedData.relationship,
        trimmedData.isCoach,
        trimmedData.aauNumber,
        trimmedData.agreeToTerms
      );

      navigation(routes.adminDashboard);
    } catch (error) {
      console.error('Registration Error:', error);
      if (error instanceof Error) {
        setFormError(error.message);
      } else {
        setFormError('Registration failed. Please try again.');
      }
    }
  };

  return (
    <>
      <div className='container-fuild'>
        <div className='login-wrapper w-100 overflow-hidden position-relative flex-wrap d-block vh-100'>
          <div className='row'>
            <div className='col-lg-6'>
              <div className='d-lg-flex align-items-center justify-content-center bg-light-300 d-lg-block d-none flex-wrap vh-100 overflowy-auto bg-01'>
                <div>
                  <ImageWithBasePath
                    src='assets/img/authentication/authentication.png'
                    alt='Img'
                  />
                </div>
              </div>
            </div>
            <div className='col-lg-6 col-md-12 col-sm-12'>
              <div className='row justify-content-center align-items-center vh-100 overflow-auto flex-wrap '>
                <div className='col-md-8 mx-auto p-4'>
                  <form onSubmit={handleSubmit}>
                    <div>
                      <div className=' mx-auto mb-5 text-center'>
                        <ImageWithBasePath
                          src='assets/img/logo.png'
                          className='img-fluid'
                          alt='Logo'
                        />
                      </div>
                      <div className='card'>
                        <div className='card-body p-4'>
                          <div className=' mb-4'>
                            <h2 className='mb-2'>Register</h2>
                            <p className='mb-0'>
                              Please enter your details to sign up
                            </p>
                          </div>
                          <div className='mt-4'>
                            {/* Parent/Guardian Information */}
                            <div className='mb-3'>
                              <label className='form-label'>Full Name</label>
                              <input
                                type='text'
                                name='fullName'
                                className='form-control'
                                value={formData.fullName}
                                onChange={handleChange}
                                required
                                aria-label='Full Name'
                              />
                            </div>
                            <div className='mb-3'>
                              <label className='form-label'>Email</label>
                              <input
                                type='email'
                                name='email'
                                className='form-control'
                                value={formData.email}
                                onChange={handleChange}
                                required
                                aria-label='Email'
                              />
                              {emailExists === true && (
                                <div className='text-danger'>
                                  This email is already in use.
                                </div>
                              )}
                              {emailExists === false && (
                                <div className='text-success'>
                                  This email is available.
                                </div>
                              )}
                            </div>
                            <div className='mb-3'>
                              <label className='form-label'>Password</label>
                              <div className='pass-group'>
                                <input
                                  type={
                                    passwordVisibility.password
                                      ? 'text'
                                      : 'password'
                                  }
                                  name='password'
                                  className='pass-input form-control'
                                  value={formData.password}
                                  onChange={handleChange}
                                  required
                                  aria-label='Password'
                                />
                                <span
                                  className={`ti toggle-passwords ${
                                    passwordVisibility.password
                                      ? 'ti-eye'
                                      : 'ti-eye-off'
                                  }`}
                                  onClick={() =>
                                    togglePasswordVisibility('password')
                                  }
                                ></span>
                              </div>
                            </div>
                            <div className='mb-3'>
                              <label className='form-label'>
                                Confirm Password
                              </label>
                              <div className='pass-group'>
                                <input
                                  type={
                                    passwordVisibility.confirmPassword
                                      ? 'text'
                                      : 'password'
                                  }
                                  name='confirmPassword'
                                  className='pass-input form-control'
                                  value={formData.confirmPassword}
                                  onChange={handleChange}
                                  required
                                  aria-label='Confirm Password'
                                />
                                <span
                                  className={`ti toggle-passwords ${
                                    passwordVisibility.confirmPassword
                                      ? 'ti-eye'
                                      : 'ti-eye-off'
                                  }`}
                                  onClick={() =>
                                    togglePasswordVisibility('confirmPassword')
                                  }
                                ></span>
                              </div>
                              {passwordError && (
                                <div className='text-danger'>
                                  {passwordError}
                                </div>
                              )}
                            </div>
                            <div className='mb-3'>
                              <label className='form-label'>Phone Number</label>
                              <input
                                type='text'
                                name='phone'
                                className='form-control'
                                value={formData.phone}
                                onChange={handleChange}
                                required
                                aria-label='Phone Number'
                              />
                              {phoneError && (
                                <div className='text-danger'>{phoneError}</div>
                              )}
                            </div>
                            <div className='mb-3'>
                              <label className='form-label'>Address</label>
                              <input
                                type='text'
                                name='address'
                                className='form-control'
                                value={
                                  formData.address.street +
                                  (formData.address.street2
                                    ? ', ' + formData.address.street2
                                    : '') +
                                  (formData.address.city
                                    ? ', ' + formData.address.city
                                    : '') +
                                  (formData.address.state
                                    ? ', ' + formData.address.state
                                    : '') +
                                  (formData.address.zip
                                    ? ' ' + formData.address.zip
                                    : '')
                                }
                                onChange={handleChange}
                                onBlur={(e) => {
                                  const parsed = parseAddress(e.target.value);
                                  setFormData({
                                    ...formData,
                                    address: parsed,
                                  });
                                }}
                                required
                                aria-label='Address'
                              />
                              {/* Show parsed address for confirmation */}
                              {formData.address.street && (
                                <div className='mt-2 small text-muted'>
                                  {formData.address.city ? (
                                    <>
                                      <div className='text-success'>
                                        ✓ Valid address format
                                      </div>
                                      <div>
                                        Street: {formData.address.street}
                                      </div>
                                      {formData.address.street2 && (
                                        <div>
                                          Unit: {formData.address.street2}
                                        </div>
                                      )}
                                      <div>City: {formData.address.city}</div>
                                      <div>State: {formData.address.state}</div>
                                      <div>ZIP: {formData.address.zip}</div>
                                    </>
                                  ) : (
                                    <div className='text-warning'>
                                      Couldn't parse full address. Please use
                                      format: Street, City, State ZIP
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className='mb-3'>
                              <label className='form-label'>
                                Relationship to Player
                              </label>
                              <input
                                type='text'
                                name='relationship'
                                className='form-control'
                                value={formData.relationship}
                                onChange={handleChange}
                                required
                                aria-label='Relationship'
                              />
                            </div>
                            <div className='mb-3'>
                              <label className='form-label'>
                                <input
                                  type='checkbox'
                                  name='isCoach'
                                  checked={formData.isCoach}
                                  onChange={handleChange}
                                />{' '}
                                Are you a coach?
                              </label>
                            </div>
                            {formData.isCoach && (
                              <div className='mb-3'>
                                <label className='form-label'>AAU Number</label>
                                <input
                                  type='text'
                                  name='aauNumber'
                                  className='form-control'
                                  value={formData.aauNumber}
                                  onChange={handleChange}
                                  aria-label='AAU Number'
                                />
                              </div>
                            )}
                            <div className='mb-3'>
                              <label className='form-label'>
                                <input
                                  type='checkbox'
                                  name='agreeToTerms'
                                  checked={formData.agreeToTerms}
                                  onChange={handleChange}
                                  required
                                />{' '}
                                I Agree to{' '}
                                <Link to='#' className='hover-a'>
                                  Terms &amp; Privacy
                                </Link>
                              </label>
                            </div>
                          </div>
                          <div className='mb-3'>
                            <button
                              type='submit'
                              className='btn btn-primary w-100'
                            >
                              Sign Up
                            </button>
                          </div>
                          <div className='text-center'>
                            <h6 className='fw-normal text-dark mb-0'>
                              Already have an account?
                              <Link to={routes.login} className='hover-a '>
                                {' '}
                                Sign In
                              </Link>
                            </h6>
                          </div>
                        </div>
                      </div>
                      <div className='mt-5 text-center'>
                        <p className='mb-0 '>
                          © {currentYear} Bothell Select by{' '}
                          <a href='https://rainbootsmarketing.com/'>
                            Rainboots
                          </a>
                        </p>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Register;
