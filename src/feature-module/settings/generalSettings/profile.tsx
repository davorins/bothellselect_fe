import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { all_routes } from '../../router/all_routes';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { FormData as FormDataType } from '../../../types/types';
import { Address, ensureAddress, formatAddress } from '../../../utils/address';
import { formatPhoneNumber, validatePhoneNumber } from '../../../utils/phone';
import {
  validateEmail,
  validateRequired,
  validateName,
  validateState,
  validateZipCode,
} from '../../../utils/validation';

export interface Guardian {
  _id?: string;
  fullName: string;
  email: string;
  phone: string;
  relationship: string;
  address: Address | string;
  isCoach?: boolean;
  aauNumber?: string;
}

export interface FormData {
  fullName: string;
  email: string;
  phone: string;
  address: Address;
  relationship: string;
  isCoach: boolean;
  aauNumber: string;
}

const API_BASE_URL = 'https://bothell-select.onrender.com';

const Profilesettings = () => {
  const routes = all_routes;
  const { parent, fetchParentData, isLoading, role } = useAuth();
  const [isEditingGuardian, setIsEditingGuardian] = useState<number | null>(
    null
  );
  const [guardianErrors, setGuardianErrors] = useState<
    Record<number, Record<string, string>>
  >({});
  const [editedGuardians, setEditedGuardians] = useState<Guardian[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<FormDataType>({
    fullName: '',
    email: '',
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
  });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!validateName(formData.fullName)) {
      newErrors.fullName = 'Please enter a valid name (min 2 characters)';
    }

    if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!validatePhoneNumber(formData.phone)) {
      newErrors.phone = 'Please enter a valid 10-digit phone number';
    }

    if (!validateRequired(formData.relationship)) {
      newErrors.relationship = 'Relationship to player is required';
    }

    const address = formData.address;
    if (!validateRequired(address.street)) {
      newErrors['address.street'] = 'Street address is required';
    }

    if (!validateRequired(address.city)) {
      newErrors['address.city'] = 'City is required';
    }

    if (!validateState(address.state)) {
      newErrors['address.state'] = 'Please enter a valid 2-letter state code';
    }

    if (!validateZipCode(address.zip)) {
      newErrors['address.zip'] = 'Please enter a valid ZIP code';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateGuardianForm = (index: number): boolean => {
    const guardian = editedGuardians[index];
    if (!guardian) return false;

    const newErrors: Record<string, string> = {};

    if (!validateName(guardian.fullName)) {
      newErrors.fullName = 'Please enter a valid name (min 2 characters)';
    }

    if (!validateEmail(guardian.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!validatePhoneNumber(guardian.phone)) {
      newErrors.phone = 'Please enter a valid 10-digit phone number';
    }

    if (!validateRequired(guardian.relationship)) {
      newErrors.relationship = 'Relationship is required';
    }

    const address = ensureAddress(guardian.address);
    if (!validateRequired(address.street)) {
      newErrors['address.street'] = 'Street address is required';
    }

    if (!validateRequired(address.city)) {
      newErrors['address.city'] = 'City is required';
    }

    if (!validateState(address.state)) {
      newErrors['address.state'] = 'Please enter a valid 2-letter state code';
    }

    if (!validateZipCode(address.zip)) {
      newErrors['address.zip'] = 'Please enter a valid ZIP code';
    }

    setGuardianErrors((prev) => ({
      ...prev,
      [index]: newErrors,
    }));

    return Object.keys(newErrors).length === 0;
  };

  useEffect(() => {
    if (parent) {
      setFormData({
        fullName: parent.fullName || '',
        email: parent.email || '',
        phone: parent.phone
          ? formatPhoneNumber(parent.phone.replace(/\D/g, ''))
          : '',
        address: ensureAddress(
          typeof parent.address === 'object'
            ? parent.address
            : parent.address || ''
        ),
        relationship: parent.relationship || '',
        isCoach: parent.isCoach || false,
        aauNumber: parent.aauNumber || '',
      });

      setEditedGuardians(
        parent.additionalGuardians?.map((g) => ({
          ...g,
          phone: g.phone ? formatPhoneNumber(g.phone.replace(/\D/g, '')) : '',
          address: ensureAddress(
            g.address || {
              street: '',
              street2: '',
              city: '',
              state: '',
              zip: '',
            }
          ),
        })) || []
      );
    }
  }, [parent]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    // Remove all non-digit characters
    const cleaned = value.replace(/\D/g, '');

    // Format the phone number
    const formatted = formatPhoneNumber(cleaned);

    setFormData((prev) => ({
      ...prev,
      phone: formatted,
    }));

    if (errors.phone) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.phone;
        return newErrors;
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    let updatedValue = value;

    if (name === 'phone') {
      // Format phone number as (123) 456-7890
      const cleaned = value.replace(/\D/g, '');
      updatedValue = formatPhoneNumber(cleaned);
    }

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : updatedValue,
    }));

    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleAddressChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: keyof Address
  ) => {
    const { value } = e.target;
    setFormData((prev) => ({
      ...prev,
      address: {
        ...prev.address,
        [field]: value,
      },
    }));

    if (errors[`address.${field}`]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[`address.${field}`];
        return newErrors;
      });
    }
  };

  const handlePersonalInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    try {
      const parentId = localStorage.getItem('parentId');
      const token = localStorage.getItem('token');

      if (!parentId || !token || !parent) {
        console.error('Parent ID, token, or parent data not found');
        return;
      }

      const response = await axios.put(
        `${API_BASE_URL}/parent/${parentId}`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log('Update Response:', response.data);
      fetchParentData(parentId);
    } catch (error) {
      console.error('Error updating personal information:', error);
    }
  };

  const handleGuardianInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number
  ) => {
    const { name, value, type, checked } = e.target;
    let updatedValue = value;

    if (name === 'phone') {
      const cleaned = value.replace(/\D/g, '');
      updatedValue = formatPhoneNumber(cleaned);
    }

    setEditedGuardians((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [name]: type === 'checkbox' ? checked : updatedValue,
      };
      return updated;
    });

    if (guardianErrors[index]?.[name]) {
      setGuardianErrors((prev) => {
        const newErrors = { ...prev };
        if (newErrors[index]) {
          delete newErrors[index][name];
        }
        return newErrors;
      });
    }
  };

  const handleGuardianAddressChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number,
    field: keyof Address
  ) => {
    const { value } = e.target;

    setEditedGuardians((prev) => {
      const updated = [...prev];
      const currentAddress = ensureAddress(updated[index].address);
      updated[index] = {
        ...updated[index],
        address: {
          ...currentAddress,
          [field]: value,
        },
      };
      return updated;
    });

    if (guardianErrors[index]?.[`address.${field}`]) {
      setGuardianErrors((prev) => {
        const newErrors = { ...prev };
        if (newErrors[index]) {
          delete newErrors[index][`address.${field}`];
        }
        return newErrors;
      });
    }
  };

  const addNewGuardian = () => {
    setEditedGuardians((prev) => [
      ...prev,
      {
        fullName: '',
        relationship: '',
        phone: '',
        email: '',
        address: { street: '', street2: '', city: '', state: '', zip: '' },
        isCoach: false,
        aauNumber: '',
      },
    ]);
    setIsEditingGuardian(editedGuardians.length);
  };

  const handleGuardianInfoSubmit = async (guardianIndex: number) => {
    if (!validateGuardianForm(guardianIndex)) return;

    try {
      const parentId = localStorage.getItem('parentId');
      const token = localStorage.getItem('token');

      if (!parentId || !token || !parent) {
        console.error('Parent ID, token, or parent data not found');
        return;
      }

      const updatedGuardian = {
        ...editedGuardians[guardianIndex],
        address: ensureAddress(editedGuardians[guardianIndex].address),
      };

      const response = await axios.put(
        `${API_BASE_URL}/parent/${parentId}/guardian/${guardianIndex}`,
        updatedGuardian,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log('Guardian Update Response:', response.data);
      setIsEditingGuardian(null);
      fetchParentData(parentId);
    } catch (error) {
      console.error('Error updating guardian information:', error);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match('image/jpeg|image/png')) {
      alert('Only JPEG or PNG images are allowed');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('Image size should be less than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setAvatarPreview(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);

    setIsUploading(true);
    try {
      const token = localStorage.getItem('token');
      const parentId = localStorage.getItem('parentId');

      if (!token || !parentId) {
        throw new Error('Authentication required');
      }

      const formData = new FormData();
      formData.append('avatar', file);

      const response = await axios.put(
        `${API_BASE_URL}/parent/${parentId}/avatar`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (response.data.avatarUrl) {
        await fetchParentData(parentId);
        setAvatarPreview(null);
      }
    } catch (error) {
      console.error('Avatar upload failed:', error);
      alert('Failed to upload avatar. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteAvatar = async () => {
    try {
      const token = localStorage.getItem('token');
      const parentId = localStorage.getItem('parentId');

      if (!token || !parentId) {
        throw new Error('Authentication required');
      }

      await axios.delete(`${API_BASE_URL}/parent/${parentId}/avatar`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setAvatarPreview(null);
      fetchParentData(parentId);
    } catch (error) {
      console.error('Avatar deletion failed:', error);
    }
  };

  if (isLoading) return <div>Loading...</div>;
  if (!parent) return <div>No parent data found.</div>;

  return (
    <div className='page-wrapper'>
      <div className='content'>
        <div className='d-md-flex d-block align-items-center justify-content-between border-bottom pb-3'>
          <div className='my-auto mb-2'>
            <h3 className='page-title mb-1'>General Settings</h3>
            <nav>
              <ol className='breadcrumb mb-0'>
                <li className='breadcrumb-item'>
                  <Link to={routes.adminDashboard}>Dashboard</Link>
                </li>
                <li className='breadcrumb-item'>
                  <Link to='#'>Settings</Link>
                </li>
                <li className='breadcrumb-item active' aria-current='page'>
                  General Settings
                </li>
              </ol>
            </nav>
          </div>
          <div className='d-flex my-xl-auto right-content align-items-center flex-wrap'>
            <div className='pe-1 mb-2'>
              <OverlayTrigger
                placement='top'
                overlay={<Tooltip id='tooltip-top'>Refresh</Tooltip>}
              >
                <Link
                  to='#'
                  className='btn btn-outline-light bg-white btn-icon me-1'
                >
                  <i className='ti ti-refresh' />
                </Link>
              </OverlayTrigger>
            </div>
          </div>
        </div>
        <div className='row'>
          <div className='col-xxl-2 col-xl-3'>
            <div className='pt-3 d-flex flex-column list-group mb-4'>
              <Link
                to={routes.profilesettings}
                className='d-block rounded p-2 active'
              >
                Profile Settings
              </Link>
              <Link
                to={routes.securitysettings}
                className='d-block rounded p-2'
              >
                Security Settings
              </Link>
              <Link
                to={routes.notificationssettings}
                className='d-block rounded p-2'
              >
                Notifications
              </Link>
              {/* <Link to={routes.connectedApps} className='d-block rounded p-2'>
                Connected Apps
              </Link> */}
            </div>
          </div>
          <div className='col-xxl-10 col-xl-9'>
            <div className='flex-fill border-start ps-3'>
              <form onSubmit={handlePersonalInfoSubmit}>
                <div className='d-flex align-items-center justify-content-between flex-wrap border-bottom pt-3 mb-3'>
                  <div className='mb-3'>
                    <h5 className='mb-1'>Profile Settings</h5>
                    <p>Upload your photo &amp; personal details here</p>
                  </div>
                  <div className='mb-3'>
                    <button className='btn btn-primary' type='submit'>
                      Save Changes
                    </button>
                  </div>
                </div>
                <div className='d-md-flex d-block'>
                  <div className='flex-fill'>
                    <div className='card'>
                      <div className='card-header p-3'>
                        <h5>Personal Information</h5>
                      </div>
                      <div className='card-body p-3 pb-0'>
                        <div className='d-block d-xl-flex'>
                          <div className='mb-3 flex-fill me-xl-3 me-0'>
                            <label className='form-label'>Full Name</label>
                            <input
                              type='text'
                              className={`form-control ${
                                errors.fullName ? 'is-invalid' : ''
                              }`}
                              name='fullName'
                              value={formData.fullName}
                              onChange={handleInputChange}
                            />
                            {errors.fullName && (
                              <div className='invalid-feedback d-block'>
                                {errors.fullName}
                              </div>
                            )}
                          </div>
                          <div className='mb-3 flex-fill'>
                            <label className='form-label'>Email Address</label>
                            <input
                              type='email'
                              className={`form-control ${
                                errors.email ? 'is-invalid' : ''
                              }`}
                              name='email'
                              value={formData.email}
                              onChange={handleInputChange}
                            />
                            {errors.email && (
                              <div className='invalid-feedback d-block'>
                                {errors.email}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className='d-block d-xl-flex'>
                          <div className='mb-3 flex-fill me-xl-3 me-0'>
                            <label className='form-label'>Phone Number</label>
                            <input
                              type='tel' // Changed to 'tel' for better mobile keyboard
                              className={`form-control ${
                                errors.phone ? 'is-invalid' : ''
                              }`}
                              name='phone'
                              value={formData.phone}
                              onChange={handlePhoneChange}
                              placeholder='(123) 456-7890'
                              maxLength={14} // (123) 456-7890 is 14 characters
                              pattern='\(\d{3}\) \d{3}-\d{4}' // HTML5 pattern validation
                            />
                            {errors.phone && (
                              <div className='invalid-feedback d-block'>
                                {errors.phone}
                              </div>
                            )}
                          </div>
                          <div className='mb-3 flex-fill'>
                            <label className='form-label'>
                              Relationship to Player
                            </label>
                            <input
                              type='text'
                              className={`form-control ${
                                errors.relationship ? 'is-invalid' : ''
                              }`}
                              name='relationship'
                              value={formData.relationship}
                              onChange={handleInputChange}
                            />
                            {errors.relationship && (
                              <div className='invalid-feedback d-block'>
                                {errors.relationship}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className='card'>
                      <div className='card-header p-3'>
                        <h5>Address Information</h5>
                      </div>
                      <div className='card-body p-3 pb-0'>
                        <div className='row mb-3'>
                          <div className='col-md-8'>
                            <label className='form-label'>Street Address</label>
                            <input
                              type='text'
                              className={`form-control ${
                                errors['address.street'] ? 'is-invalid' : ''
                              }`}
                              value={formData.address.street}
                              onChange={(e) => handleAddressChange(e, 'street')}
                              placeholder='123 Main St'
                            />
                            {errors['address.street'] && (
                              <div className='invalid-feedback d-block'>
                                {errors['address.street']}
                              </div>
                            )}
                          </div>
                          <div className='col-md-4'>
                            <label className='form-label'>
                              Apt/Suite (optional)
                            </label>
                            <input
                              type='text'
                              className='form-control'
                              value={formData.address.street2}
                              onChange={(e) =>
                                handleAddressChange(e, 'street2')
                              }
                              placeholder='Apt 4B'
                            />
                          </div>
                        </div>
                        <div className='row mb-3'>
                          <div className='col-md-5'>
                            <label className='form-label'>City</label>
                            <input
                              type='text'
                              className={`form-control ${
                                errors['address.city'] ? 'is-invalid' : ''
                              }`}
                              value={formData.address.city}
                              onChange={(e) => handleAddressChange(e, 'city')}
                              placeholder='Seattle'
                            />
                            {errors['address.city'] && (
                              <div className='invalid-feedback d-block'>
                                {errors['address.city']}
                              </div>
                            )}
                          </div>
                          <div className='col-md-3'>
                            <label className='form-label'>State</label>
                            <input
                              type='text'
                              className={`form-control ${
                                errors['address.state'] ? 'is-invalid' : ''
                              }`}
                              value={formData.address.state}
                              onChange={(e) => handleAddressChange(e, 'state')}
                              maxLength={2}
                              placeholder='WA'
                            />
                            {errors['address.state'] && (
                              <div className='invalid-feedback d-block'>
                                {errors['address.state']}
                              </div>
                            )}
                          </div>
                          <div className='col-md-4'>
                            <label className='form-label'>ZIP Code</label>
                            <input
                              type='text'
                              className={`form-control ${
                                errors['address.zip'] ? 'is-invalid' : ''
                              }`}
                              value={formData.address.zip}
                              onChange={(e) => handleAddressChange(e, 'zip')}
                              maxLength={10}
                              placeholder='98101'
                            />
                            {errors['address.zip'] && (
                              <div className='invalid-feedback d-block'>
                                {errors['address.zip']}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className='card mt-3'>
                      <div className='card-header d-flex justify-content-between align-items-center'>
                        <h5>Additional Parent/Guardian Information</h5>
                        <button
                          type='button'
                          className='btn btn-primary btn-sm'
                          onClick={addNewGuardian}
                        >
                          <i className='ti ti-plus me-2' /> Add Parent/Guardian
                        </button>
                      </div>
                      <div className='card-body pb-0'>
                        {editedGuardians.length > 0 ? (
                          editedGuardians.map((guardian, index) => (
                            <div key={index} className='mb-4'>
                              <div className='card'>
                                <div className='card-header'>
                                  <h5>{guardian.fullName || 'New Guardian'}</h5>
                                </div>
                                <div className='card-body pb-0'>
                                  <div className='d-block d-xl-flex'>
                                    <div className='mb-3 flex-fill me-xl-3 me-0'>
                                      <label className='form-label'>
                                        Full Name
                                      </label>
                                      <input
                                        type='text'
                                        className={`form-control ${
                                          guardianErrors[index]?.fullName
                                            ? 'is-invalid'
                                            : ''
                                        }`}
                                        value={guardian.fullName}
                                        onChange={(e) =>
                                          handleGuardianInputChange(e, index)
                                        }
                                        disabled={isEditingGuardian !== index}
                                        name='fullName'
                                      />
                                      {guardianErrors[index]?.fullName && (
                                        <div className='invalid-feedback d-block'>
                                          {guardianErrors[index]?.fullName}
                                        </div>
                                      )}
                                    </div>
                                    <div className='mb-3 flex-fill'>
                                      <label className='form-label'>
                                        Email
                                      </label>
                                      <input
                                        type='email'
                                        className={`form-control ${
                                          guardianErrors[index]?.email
                                            ? 'is-invalid'
                                            : ''
                                        }`}
                                        value={guardian.email}
                                        onChange={(e) =>
                                          handleGuardianInputChange(e, index)
                                        }
                                        disabled={isEditingGuardian !== index}
                                        name='email'
                                      />
                                      {guardianErrors[index]?.email && (
                                        <div className='invalid-feedback d-block'>
                                          {guardianErrors[index]?.email}
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <div className='d-block d-xl-flex'>
                                    <div className='mb-3 flex-fill me-xl-3 me-0'>
                                      <label className='form-label'>
                                        Phone Number
                                      </label>
                                      <input
                                        type='tel'
                                        className={`form-control ${
                                          guardianErrors[index]?.phone
                                            ? 'is-invalid'
                                            : ''
                                        }`}
                                        name='phone'
                                        value={guardian.phone}
                                        onChange={(e) =>
                                          handleGuardianInputChange(e, index)
                                        }
                                        disabled={isEditingGuardian !== index}
                                        placeholder='(123) 456-7890'
                                        maxLength={14}
                                      />
                                      {guardianErrors[index]?.phone && (
                                        <div className='invalid-feedback d-block'>
                                          {guardianErrors[index]?.phone}
                                        </div>
                                      )}
                                    </div>
                                    <div className='mb-3 flex-fill'>
                                      {isEditingGuardian === index ? (
                                        <div className='flex-fill'>
                                          <div className='row mb-3'>
                                            <div className='col-md-8'>
                                              <label className='form-label'>
                                                Street Address
                                              </label>
                                              <input
                                                type='text'
                                                className={`form-control ${
                                                  guardianErrors[index]?.[
                                                    'address.street'
                                                  ]
                                                    ? 'is-invalid'
                                                    : ''
                                                }`}
                                                value={
                                                  ensureAddress(
                                                    guardian.address
                                                  ).street
                                                }
                                                onChange={(e) =>
                                                  handleGuardianAddressChange(
                                                    e,
                                                    index,
                                                    'street'
                                                  )
                                                }
                                              />
                                              {guardianErrors[index]?.[
                                                'address.street'
                                              ] && (
                                                <div className='invalid-feedback d-block'>
                                                  {
                                                    guardianErrors[index]?.[
                                                      'address.street'
                                                    ]
                                                  }
                                                </div>
                                              )}
                                            </div>
                                            <div className='col-md-4'>
                                              <label className='form-label'>
                                                Apt/Suite (optional)
                                              </label>
                                              <input
                                                type='text'
                                                className='form-control'
                                                value={
                                                  ensureAddress(
                                                    guardian.address
                                                  ).street2
                                                }
                                                onChange={(e) =>
                                                  handleGuardianAddressChange(
                                                    e,
                                                    index,
                                                    'street2'
                                                  )
                                                }
                                              />
                                            </div>
                                          </div>
                                          <div className='row'>
                                            <div className='col-md-5'>
                                              <label className='form-label'>
                                                City
                                              </label>
                                              <input
                                                type='text'
                                                className={`form-control ${
                                                  guardianErrors[index]?.[
                                                    'address.city'
                                                  ]
                                                    ? 'is-invalid'
                                                    : ''
                                                }`}
                                                value={
                                                  ensureAddress(
                                                    guardian.address
                                                  ).city
                                                }
                                                onChange={(e) =>
                                                  handleGuardianAddressChange(
                                                    e,
                                                    index,
                                                    'city'
                                                  )
                                                }
                                              />
                                              {guardianErrors[index]?.[
                                                'address.city'
                                              ] && (
                                                <div className='invalid-feedback d-block'>
                                                  {
                                                    guardianErrors[index]?.[
                                                      'address.city'
                                                    ]
                                                  }
                                                </div>
                                              )}
                                            </div>
                                            <div className='col-md-3'>
                                              <label className='form-label'>
                                                State
                                              </label>
                                              <input
                                                type='text'
                                                className={`form-control ${
                                                  guardianErrors[index]?.[
                                                    'address.state'
                                                  ]
                                                    ? 'is-invalid'
                                                    : ''
                                                }`}
                                                value={
                                                  ensureAddress(
                                                    guardian.address
                                                  ).state
                                                }
                                                onChange={(e) =>
                                                  handleGuardianAddressChange(
                                                    e,
                                                    index,
                                                    'state'
                                                  )
                                                }
                                                maxLength={2}
                                              />
                                              {guardianErrors[index]?.[
                                                'address.state'
                                              ] && (
                                                <div className='invalid-feedback d-block'>
                                                  {
                                                    guardianErrors[index]?.[
                                                      'address.state'
                                                    ]
                                                  }
                                                </div>
                                              )}
                                            </div>
                                            <div className='col-md-4'>
                                              <label className='form-label'>
                                                ZIP Code
                                              </label>
                                              <input
                                                type='text'
                                                className={`form-control ${
                                                  guardianErrors[index]?.[
                                                    'address.zip'
                                                  ]
                                                    ? 'is-invalid'
                                                    : ''
                                                }`}
                                                value={
                                                  ensureAddress(
                                                    guardian.address
                                                  ).zip
                                                }
                                                onChange={(e) =>
                                                  handleGuardianAddressChange(
                                                    e,
                                                    index,
                                                    'zip'
                                                  )
                                                }
                                                maxLength={10}
                                              />
                                              {guardianErrors[index]?.[
                                                'address.zip'
                                              ] && (
                                                <div className='invalid-feedback d-block'>
                                                  {
                                                    guardianErrors[index]?.[
                                                      'address.zip'
                                                    ]
                                                  }
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      ) : (
                                        <>
                                          <label className='form-label'>
                                            Address
                                          </label>
                                          <input
                                            type='text'
                                            className='form-control'
                                            value={formatAddress(
                                              guardian.address
                                            )}
                                            disabled
                                          />
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  <div className='d-block d-xl-flex'>
                                    <div className='mb-3 flex-fill me-xl-3 me-0'>
                                      <label className='form-label'>
                                        Relationship
                                      </label>
                                      <input
                                        type='text'
                                        className={`form-control ${
                                          guardianErrors[index]?.relationship
                                            ? 'is-invalid'
                                            : ''
                                        }`}
                                        value={guardian.relationship}
                                        onChange={(e) =>
                                          handleGuardianInputChange(e, index)
                                        }
                                        disabled={isEditingGuardian !== index}
                                        name='relationship'
                                      />
                                      {guardianErrors[index]?.relationship && (
                                        <div className='invalid-feedback d-block'>
                                          {guardianErrors[index]?.relationship}
                                        </div>
                                      )}
                                    </div>
                                    <div className='mb-3 flex-fill'>
                                      <label className='form-label'>
                                        AAU Number
                                      </label>
                                      <input
                                        type='text'
                                        className={`form-control ${
                                          guardianErrors[index]?.aauNumber
                                            ? 'is-invalid'
                                            : ''
                                        }`}
                                        value={guardian.aauNumber || ''}
                                        onChange={(e) =>
                                          handleGuardianInputChange(e, index)
                                        }
                                        disabled={isEditingGuardian !== index}
                                        name='aauNumber'
                                      />
                                      {guardianErrors[index]?.aauNumber && (
                                        <div className='invalid-feedback d-block'>
                                          {guardianErrors[index]?.aauNumber}
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {isEditingGuardian !== index ? (
                                    <button
                                      type='button'
                                      className='btn btn-primary btn-sm mb-4'
                                      onClick={() =>
                                        setIsEditingGuardian(index)
                                      }
                                    >
                                      <i className='ti ti-edit me-2' /> Edit
                                    </button>
                                  ) : (
                                    <button
                                      type='button'
                                      className='btn btn-primary btn-sm mb-4'
                                      onClick={() =>
                                        handleGuardianInfoSubmit(index)
                                      }
                                    >
                                      <i className='ti ti-edit me-2' /> Save
                                      Changes
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className='mb-4'>
                            No additional guardians registered.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className='settings-right-sidebar ms-md-3'>
                    <div className='card'>
                      <div className='card-header p-3'>
                        <h5>Profile Photo</h5>
                      </div>
                      <div className='card-body p-3 pb-0 mb-3'>
                        <div className='settings-profile-upload'>
                          <span className='profile-pic'>
                            <img
                              src={
                                avatarPreview ||
                                (parent?.avatar
                                  ? `${API_BASE_URL}${parent.avatar}`
                                  : `${API_BASE_URL}/uploads/avatars/parents.png`)
                              }
                              alt='Profile'
                            />
                          </span>
                          <div className='title-upload'>
                            <h5>Edit Your Photo</h5>
                            {parent?.avatar && (
                              <Link
                                to='#'
                                className='me-2'
                                onClick={handleDeleteAvatar}
                              >
                                Delete
                              </Link>
                            )}
                            <Link
                              to='#'
                              className='text-primary'
                              onClick={() =>
                                document
                                  .getElementById('avatar-upload')
                                  ?.click()
                              }
                            >
                              Update
                            </Link>
                          </div>
                        </div>
                        <div className='profile-uploader profile-uploader-two mb-0'>
                          <span className='upload-icon'>
                            <i className='ti ti-upload' />
                          </span>
                          <div className='drag-upload-btn bg-transparent me-0 border-0'>
                            <p className='upload-btn'>
                              <span>Click to Upload</span> or drag and drop
                            </p>
                            <h6>JPG or PNG</h6>
                            <h6>(Max 2MB)</h6>
                          </div>
                          <input
                            type='file'
                            className='form-control'
                            id='avatar-upload'
                            accept='image/jpeg, image/png'
                            onChange={handleAvatarChange}
                            disabled={isUploading}
                          />
                          {isUploading && (
                            <div className='mt-2'>Uploading...</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profilesettings;
