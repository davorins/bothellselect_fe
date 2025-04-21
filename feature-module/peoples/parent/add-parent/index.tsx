import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios, { AxiosRequestConfig } from 'axios';
import { all_routes } from '../../../router/all_routes';
import ParentForm from './ParentForm';
import GuardianForm from './GuardianForm';
import NewGuardianForm from './NewGuardianForm';
import {
  formatPhoneNumber,
  validatePhoneNumber,
} from '../../../../utils/phone';
import {
  validateEmail,
  validateRequired,
  validateName,
  validateState,
  validateZipCode,
} from '../../../../utils/validation';
import { Address, ensureAddress } from '../../../../utils/address';
import {
  ParentFormData,
  GuardianFormData,
  ValidationErrors,
  ParentState,
  Guardian,
} from '../../../../types/types';

const AddParent = ({ isEdit }: { isEdit: boolean }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const parentState = location.state as ParentState | undefined;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(isEdit);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<ParentFormData>({
    _id: '',
    password: '',
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
    avatar: '',
    additionalGuardians: [],
  });

  const [newGuardian, setNewGuardian] = useState<GuardianFormData>({
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
    aauNumber: '',
    isCoach: false,
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [guardianErrors, setGuardianErrors] = useState<ValidationErrors>({});
  const [showGuardianForm, setShowGuardianForm] = useState(false);

  const fetchParentData = async (parentId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${
          process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001'
        }/api/parent/${parentId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching parent data:', error);
      throw error;
    }
  };

  const handleAauNumberChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    isGuardian: boolean = false,
    index?: number
  ) => {
    const value = e.target.value;
    const hasAauNumber = value.trim().length > 0;

    if (isGuardian && index !== undefined) {
      setFormData((prev) => {
        const updatedGuardians = [...(prev.additionalGuardians || [])];
        updatedGuardians[index] = {
          ...updatedGuardians[index],
          aauNumber: value,
          isCoach: hasAauNumber,
        };
        return {
          ...prev,
          additionalGuardians: updatedGuardians,
        };
      });
    } else {
      setFormData((prev) => ({
        ...prev,
        aauNumber: value,
        isCoach: hasAauNumber,
      }));
    }
  };

  useEffect(() => {
    const loadParentData = async () => {
      if (!isEdit) {
        setIsLoading(false);
        return;
      }

      try {
        let parentData;

        if (parentState?.parent) {
          parentData = parentState.parent;
          if (!parentData._id) {
            throw new Error('Parent data missing ID');
          }
        } else if (parentState?.parent?._id) {
          parentData = await fetchParentData(parentState.parent._id);
          if (!parentData?._id) {
            throw new Error('Failed to load parent data');
          }
        }

        if (parentData) {
          setFormData({
            _id: parentData._id,
            password: '',
            fullName: parentData.fullName || '',
            email: parentData.email || '',
            phone: parentData.phone || '',
            address: ensureAddress(parentData.address),
            relationship: parentData.relationship || '',
            isCoach: parentData.isCoach || false,
            aauNumber: parentData.aauNumber || '',
            avatar: parentData.avatar || '',
            additionalGuardians:
              parentData.additionalGuardians?.map((g: Guardian) => ({
                ...g,
                id: g.id || Date.now().toString(),
                address: ensureAddress(g.address),
                isCoach: g.isCoach || false,
              })) || [],
          });

          if (parentData.avatar) {
            setAvatarPreview(parentData.avatar);
          }
        } else {
          throw new Error('No parent data available');
        }
      } catch (error) {
        console.error('Error loading parent data:', error);
        alert('Failed to load parent data. Redirecting to list...');
        navigate(all_routes.parentList);
      } finally {
        setIsLoading(false);
      }
    };

    loadParentData();
  }, [isEdit, parentState, navigate]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);

      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeAvatar = () => {
    setAvatarPreview(null);
    setAvatarFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    if (!validateName(formData.fullName)) {
      newErrors.fullName = 'Please enter a valid name (min 2 characters)';
    }

    if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!isEdit && (!formData.password || formData.password.length < 6)) {
      newErrors.password = 'Password must be at least 6 characters';
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

  const validateGuardianForm = (guardian: GuardianFormData): boolean => {
    const newErrors: ValidationErrors = {};

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
      newErrors.relationship = 'Relationship to player is required';
    }

    if (!validateRequired(guardian.address.street)) {
      newErrors['address.street'] = 'Street address is required';
    }

    if (!validateRequired(guardian.address.city)) {
      newErrors['address.city'] = 'City is required';
    }

    if (!validateState(guardian.address.state)) {
      newErrors['address.state'] = 'Please enter a valid 2-letter state code';
    }

    if (!validateZipCode(guardian.address.zip)) {
      newErrors['address.zip'] = 'Please enter a valid ZIP code';
    }

    setGuardianErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateExistingGuardians = (): boolean => {
    if (!formData.additionalGuardians) return true;

    let allValid = true;
    formData.additionalGuardians.forEach((guardian, index) => {
      const guardianErrors = validateGuardian(guardian);
      if (Object.keys(guardianErrors).length > 0) {
        allValid = false;
        const guardianCard = document.getElementById(`guardian-${index}`);
        if (guardianCard) {
          guardianCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
          guardianCard.classList.add('border-danger');
          setTimeout(() => {
            guardianCard.classList.remove('border-danger');
          }, 3000);
        }
      }
    });

    return allValid;
  };

  const validateGuardian = (guardian: GuardianFormData): ValidationErrors => {
    const errors: ValidationErrors = {};

    if (!validateName(guardian.fullName)) {
      errors.fullName = 'Please enter a valid name (min 2 characters)';
    }

    if (!validateEmail(guardian.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!validatePhoneNumber(guardian.phone)) {
      errors.phone = 'Please enter a valid 10-digit phone number';
    }

    if (!validateRequired(guardian.relationship)) {
      errors.relationship = 'Relationship to player is required';
    }

    if (!validateRequired(guardian.address.street)) {
      errors['address.street'] = 'Street address is required';
    }

    if (!validateRequired(guardian.address.city)) {
      errors['address.city'] = 'City is required';
    }

    if (!validateState(guardian.address.state)) {
      errors['address.state'] = 'Please enter a valid 2-letter state code';
    }

    if (!validateZipCode(guardian.address.zip)) {
      errors['address.zip'] = 'Please enter a valid ZIP code';
    }

    return errors;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const target = e.target as HTMLInputElement;
    const { name, value } = target;

    if (name === 'phone') {
      const formattedPhone = formatPhoneNumber(value.replace(/\D/g, ''));
      setFormData((prevData) => ({
        ...prevData,
        [name]: formattedPhone,
      }));
      return;
    }

    if (name === 'isCoach') {
      setFormData((prevData) => ({
        ...prevData,
        [name]: (target as HTMLInputElement).checked,
      }));
      return;
    }

    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleGuardianInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    index: number
  ) => {
    const target = e.target as HTMLInputElement;
    const { name, value } = target;

    if (name === 'phone') {
      const formattedPhone = formatPhoneNumber(value.replace(/\D/g, ''));
      setFormData((prevData) => {
        const updatedGuardians = [...(prevData.additionalGuardians || [])];
        updatedGuardians[index] = {
          ...updatedGuardians[index],
          [name]: formattedPhone,
        };
        return {
          ...prevData,
          additionalGuardians: updatedGuardians,
        };
      });
      return;
    }

    setFormData((prevData) => {
      const updatedGuardians = [...(prevData.additionalGuardians || [])];
      updatedGuardians[index] = {
        ...updatedGuardians[index],
        [name]: value,
      };
      return {
        ...prevData,
        additionalGuardians: updatedGuardians,
      };
    });
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

  const handleGuardianAddressChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: keyof Address,
    index: number
  ) => {
    const { value } = e.target;
    setFormData((prev) => {
      const updatedGuardians = [...(prev.additionalGuardians || [])];
      updatedGuardians[index] = {
        ...updatedGuardians[index],
        address: {
          ...updatedGuardians[index].address,
          [field]: value,
        },
      };
      return {
        ...prev,
        additionalGuardians: updatedGuardians,
      };
    });
  };

  const addGuardian = () => {
    if (!validateGuardianForm(newGuardian)) {
      const firstErrorKey = Object.keys(guardianErrors).find(
        (key) => guardianErrors[key]
      );
      if (firstErrorKey) {
        const element = document.querySelector(`[name="${firstErrorKey}"]`);
        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setFormData((prev) => ({
      ...prev,
      additionalGuardians: [
        ...(prev.additionalGuardians || []),
        {
          ...newGuardian,
          id: Date.now().toString(),
        },
      ],
    }));

    setNewGuardian({
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
      aauNumber: '',
      isCoach: false,
    });

    setShowGuardianForm(false);
    setGuardianErrors({});
  };

  const removeGuardian = (index: number) => {
    setFormData((prev) => {
      const updatedGuardians = [...(prev.additionalGuardians || [])];
      updatedGuardians.splice(index, 1);
      return {
        ...prev,
        additionalGuardians: updatedGuardians,
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;

    setIsSubmitting(true);
    setErrors({});

    // Validate edit mode requirements
    if (isEdit && (!formData._id || typeof formData._id !== 'string')) {
      alert('Invalid parent ID. Please refresh and try again.');
      setIsSubmitting(false);
      return;
    }

    // Validate form data
    if (!validateForm()) {
      setIsSubmitting(false);
      return;
    }

    // Validate guardians if present
    if (formData.additionalGuardians?.length && !validateExistingGuardians()) {
      alert('Please fix all guardian errors before submitting');
      setIsSubmitting(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Authentication token missing');

      const baseUrl =
        process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001';
      const endpoint = isEdit
        ? `/api/parent-full/${formData._id}`
        : '/api/register';
      const url = `${baseUrl}${endpoint}`;

      // Build payload with proper typing
      const payload = {
        fullName: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.replace(/\D/g, ''),
        relationship: formData.relationship.trim(),
        isCoach: formData.isCoach,
        aauNumber: formData.aauNumber?.trim() || '',
        address: {
          street: formData.address.street.trim(),
          ...(formData.address.street2 && {
            street2: formData.address.street2.trim(),
          }),
          city: formData.address.city.trim(),
          state: formData.address.state.trim().toUpperCase(),
          zip: formData.address.zip.trim(),
        },
        ...(!isEdit && {
          password: formData.password?.trim() || '',
          registerType: 'adminCreate',
          agreeToTerms: true,
        }),
        ...(formData.additionalGuardians?.length && {
          additionalGuardians: formData.additionalGuardians.map((g) => ({
            fullName: g.fullName.trim(),
            email: g.email.trim().toLowerCase(),
            phone: g.phone.replace(/\D/g, ''),
            relationship: g.relationship.trim(),
            aauNumber: g.aauNumber?.trim() || '',
            isCoach: g.isCoach || false,
            address: {
              street: g.address.street.trim(),
              ...(g.address.street2 && { street2: g.address.street2.trim() }),
              city: g.address.city.trim(),
              state: g.address.state.trim().toUpperCase(),
              zip: g.address.zip.trim(),
            },
          })),
        }),
        ...(isEdit && formData.avatar && { avatarUrl: formData.avatar }),
      };

      console.log('Submitting payload:', payload);

      const config: AxiosRequestConfig = {
        headers: {
          Authorization: `Bearer ${token}`,
          ...(avatarFile && isEdit
            ? {}
            : { 'Content-Type': 'application/json' }),
        },
        timeout: 10000,
      };

      // Make the request
      const response =
        avatarFile && isEdit
          ? await axios.put(url, createFormData(payload, avatarFile), config)
          : await axios[isEdit ? 'put' : 'post'](url, payload, config);

      // Handle response
      if (!response.data) {
        throw new Error('Empty response from server');
      }

      const parentData = response.data.parent || response.data;
      const parentId = parentData._id || response.data._id;

      if (!parentId) {
        throw new Error('Invalid parent ID in response');
      }

      // Navigate to parent detail
      navigate(`${all_routes.parentDetail}/${parentId}`, {
        state: {
          parent: parentData,
          guardians: parentData.additionalGuardians || [],
          players: parentState?.players || [],
          ...(!isEdit && {
            newAccount: true,
            ...(response.data.temporaryPassword && {
              temporaryPassword: response.data.temporaryPassword,
            }),
          }),
        },
        replace: true,
      });
    } catch (error) {
      console.error('Submission error:', error);

      let errorMessage = 'Submission failed. Please try again.';

      if (axios.isAxiosError(error)) {
        console.error('Error details:', {
          status: error.response?.status,
          data: error.response?.data,
          config: error.config,
        });

        // Handle different error cases
        if (error.response?.status === 401) {
          errorMessage = 'Session expired. Please log in again.';
        } else if (error.response?.status === 400) {
          errorMessage =
            error.response.data?.error ||
            error.response.data?.message ||
            'Invalid data submitted';
        } else if (error.response?.status === 500) {
          errorMessage = 'Server error. Please try again later.';
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // FormData helper
  const createFormData = (data: object, file: File): FormData => {
    const formData = new FormData();
    formData.append('avatar', file);
    formData.append('data', JSON.stringify(data));
    return formData;
  };

  if (isLoading) {
    return (
      <div className='page-wrapper'>
        <div className='content content-two'>
          <div
            className='d-flex justify-content-center align-items-center'
            style={{ height: '80vh' }}
          >
            <div className='spinner-border text-primary' role='status'>
              <span className='visually-hidden'>Loading...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='page-wrapper'>
      <div className='content content-two'>
        <div className='d-md-flex d-block align-items-center justify-content-between mb-3'>
          {/* Breadcrumb navigation would go here */}
        </div>
        <div className='row'>
          <div className='col-md-12'>
            <form onSubmit={handleSubmit}>
              <ParentForm
                formData={formData}
                errors={errors}
                avatarPreview={avatarPreview}
                fileInputRef={fileInputRef}
                handleInputChange={handleInputChange}
                handleAddressChange={handleAddressChange}
                handleAvatarChange={handleAvatarChange}
                removeAvatar={removeAvatar}
                handleAauNumberChange={(e) => handleAauNumberChange(e)}
                isEdit={isEdit}
              />

              <div className='card mt-4'>
                <div className='card-header bg-light'>
                  <div className='d-flex align-items-center justify-content-between'>
                    <div className='d-flex align-items-center'>
                      <span className='bg-white avatar avatar-sm me-2 text-gray-7 flex-shrink-0'>
                        <i className='ti ti-users fs-16' />
                      </span>
                      <h4 className='text-dark'>
                        Additional Parents/Guardians
                      </h4>
                    </div>
                    {(!formData.additionalGuardians ||
                      formData.additionalGuardians.length === 0) &&
                      !showGuardianForm && (
                        <button
                          type='button'
                          className='btn btn-primary btn-sm'
                          onClick={() => setShowGuardianForm(true)}
                        >
                          <i className='ti ti-plus me-1' /> Add Parent
                        </button>
                      )}
                  </div>
                </div>
                <div className='card-body'>
                  {(!formData.additionalGuardians ||
                    formData.additionalGuardians.length === 0) &&
                    !showGuardianForm && (
                      <div className='mb-3'>
                        No guardians currently listed. Please add at least one
                        parent/guardian.
                      </div>
                    )}

                  {formData.additionalGuardians?.map((guardian, index) => (
                    <GuardianForm
                      key={guardian.id || index}
                      guardian={guardian}
                      index={index}
                      handleGuardianInputChange={handleGuardianInputChange}
                      handleGuardianAddressChange={handleGuardianAddressChange}
                      removeGuardian={removeGuardian}
                      handleAauNumberChange={handleAauNumberChange}
                    />
                  ))}

                  {showGuardianForm && (
                    <NewGuardianForm
                      newGuardian={newGuardian}
                      guardianErrors={guardianErrors}
                      setNewGuardian={setNewGuardian}
                      setGuardianErrors={setGuardianErrors}
                      setShowGuardianForm={setShowGuardianForm}
                      addGuardian={() => {
                        addGuardian();
                        setShowGuardianForm(false);
                      }}
                    />
                  )}
                </div>
              </div>

              <div className='text-end mt-4'>
                <button
                  type='button'
                  className='btn btn-light me-3'
                  onClick={() => window.history.back()}
                >
                  Cancel
                </button>
                <button
                  type='submit'
                  className='btn btn-primary'
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span
                        className='spinner-border spinner-border-sm me-1'
                        role='status'
                        aria-hidden='true'
                      ></span>
                      {isEdit ? 'Updating...' : 'Adding...'}
                    </>
                  ) : isEdit ? (
                    'Update'
                  ) : (
                    'Add'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddParent;
