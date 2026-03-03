import React, { useState, useEffect } from 'react';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from '@hello-pangea/dnd';
import axios from 'axios';
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Form,
  Modal,
  Alert,
  Spinner,
  Tab,
  Nav,
  Tabs,
  InputGroup,
  Badge,
  ListGroup,
} from 'react-bootstrap';
import {
  Plus,
  Trash2,
  Edit2,
  Copy,
  Eye,
  Save,
  Upload,
  Move,
  Settings,
  Type,
  Mail,
  Hash,
  Calendar,
  CheckSquare,
  FileText,
  CreditCard,
  Grid,
  Divide,
  ChevronDown,
  Link,
  DollarSign,
  MapPin,
  Clock,
  Calendar as CalendarIcon,
  Map,
  Award,
  RefreshCw,
  CheckCircle,
} from 'react-feather';
import SquarePaymentPreview from '../SquarePaymentPreview';

// Use Type icon as a substitute for Heading
const HeadingIcon = Type;

// ========== TYPE DEFINITIONS ==========
interface FormFieldOption {
  label: string;
  value: string;
  selected?: boolean;
}

interface FileConfig {
  accept?: string;
  maxSize?: number;
  multiple?: boolean;
}

interface PricingPackage {
  name: string;
  description?: string;
  price: number; // in cents
  currency: string;
  quantity: number;
  maxQuantity?: number;
  defaultSelected: boolean;
  isEnabled: boolean;
}

interface PaymentConfigWithDefaults {
  amount: number;
  description: string;
  currency: string;
  recurring: boolean;
  recurringInterval: 'monthly' | 'yearly' | 'weekly';
  pricingPackages: PricingPackage[];
  fixedPrice: boolean;
  squareAppId?: string;
  squareLocationId?: string;
  sandboxMode?: boolean;
}

// Helper function to create default payment config
const createDefaultPaymentConfig = (): PaymentConfigWithDefaults => ({
  amount: 0,
  description: 'Payment for form submission',
  currency: 'USD',
  recurring: false,
  recurringInterval: 'monthly',
  pricingPackages: [
    {
      name: 'Basic Package',
      description: 'Standard package',
      price: 1000,
      currency: 'USD',
      quantity: 1,
      defaultSelected: true,
      isEnabled: true,
    },
  ],
  fixedPrice: false,
});

interface FieldStyle {
  rows?: number;
  width?: string;
  className?: string;
}

interface ValidationRules {
  pattern?: string;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  customMessage?: string;
}

interface FormField {
  id: string;
  type:
    | 'text'
    | 'email'
    | 'number'
    | 'tel'
    | 'url'
    | 'password'
    | 'textarea'
    | 'select'
    | 'checkbox'
    | 'radio'
    | 'date'
    | 'file'
    | 'payment'
    | 'section'
    | 'heading'
    | 'divider';
  label: string;
  name: string;
  required: boolean;
  order: number;
  placeholder?: string;
  helpText?: string;
  defaultValue?: any;
  options?: FormFieldOption[];
  fileConfig?: FileConfig;
  paymentConfig?: PaymentConfigWithDefaults;
  style?: FieldStyle;
  validation?: ValidationRules;
  conditionalLogic?: {
    dependsOn: string;
    condition: 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan';
    value: any;
    show: boolean;
  };
}

interface SubmitButtonStyle {
  color: string;
  backgroundColor: string;
  textColor: string;
}

interface PaymentSettings {
  squareAppId?: string;
  squareLocationId?: string;
  squareAccessToken?: string;
  sandboxMode: boolean;
  currency: string;
}

interface Venue {
  venueName: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  fullAddress: string;
  date: string;
  startTime: string;
  endTime: string;
  isPrimary: boolean;
  additionalInfo: string;
}

interface TournamentSettings {
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  isRefundable: boolean;
  refundPolicy: string;
  ticketCheckMethod: 'qr' | 'email' | 'manual' | 'name-list' | 'other';
  customCheckMethod: string;
  venues: Venue[];
  showScheduleTable: boolean;
}

interface FormSettings {
  submitText: string;
  resetText: string;
  successMessage: string;
  redirectUrl: string;
  sendEmail: boolean;
  emailTo: string[];
  storeSubmissions: boolean;
  captcha: boolean;
  allowedRoles?: string[];
  passwordProtected?: boolean;
  formPassword?: string;
  submitButtonStyle: SubmitButtonStyle;
  paymentSettings?: PaymentSettings;
}

interface FormData {
  _id?: string;
  name: string;
  title: string;
  description: string;
  status: 'draft' | 'published' | 'archived';
  fields: FormField[];
  settings: FormSettings;
  submissions?: number;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  isTournamentForm: boolean;
  tournamentSettings?: TournamentSettings;
}

interface FieldType {
  type: FormField['type'];
  label: string;
  icon: JSX.Element;
}

interface EmbedCodeData {
  html: string;
  shortcode: string;
  directUrl: string;
}

interface UserData {
  _id: string;
  email: string;
  name: string;
}

// ========== FORM BUILDER COMPONENT ==========
const FormBuilder: React.FC = () => {
  // ========== STATE ==========
  const [forms, setForms] = useState<FormData[]>([]);
  const [selectedForm, setSelectedForm] = useState<FormData | null>(null);
  const [formName, setFormName] = useState<string>('');
  const [formTitle, setFormTitle] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formStatus, setFormStatus] = useState<
    'draft' | 'published' | 'archived'
  >('draft');
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [formSettings, setFormSettings] = useState<FormSettings>({
    submitText: 'Submit',
    resetText: 'Reset',
    successMessage: 'Form submitted successfully!',
    redirectUrl: '',
    sendEmail: false,
    emailTo: [],
    storeSubmissions: true,
    captcha: false,
    submitButtonStyle: {
      color: '#594230',
      backgroundColor: '#594230',
      textColor: '#ffffff',
    },
    paymentSettings: {
      squareAppId:
        process.env.REACT_APP_SQUARE_APP_ID || 'sq0idp-jUCxKnO_i8i7vccQjVj_0g',
      squareLocationId:
        process.env.REACT_APP_SQUARE_LOCATION_ID || 'L26Q50FWRCQW5',
      sandboxMode: true,
      currency: 'USD',
    },
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [showFieldModal, setShowFieldModal] = useState<boolean>(false);
  const [editingField, setEditingField] = useState<FormField | null>(null);
  const [fieldType, setFieldType] = useState<FormField['type']>('text');
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [showEmbedModal, setShowEmbedModal] = useState<boolean>(false);
  const [embedCode, setEmbedCode] = useState<EmbedCodeData>({
    html: '',
    shortcode: '',
    directUrl: '',
  });
  const [showPaymentTestModal, setShowPaymentTestModal] =
    useState<boolean>(false);
  const [isTournamentForm, setIsTournamentForm] = useState<boolean>(false);
  const [tournamentSettings, setTournamentSettings] =
    useState<TournamentSettings>({
      startDate: '',
      endDate: '',
      startTime: '',
      endTime: '',
      isRefundable: false,
      refundPolicy: '',
      ticketCheckMethod: 'qr',
      customCheckMethod: '',
      venues: [],
      showScheduleTable: true,
    });

  // ========== CONSTANTS ==========
  const fieldTypes: FieldType[] = [
    { type: 'text', label: 'Text Field', icon: <Type size={16} /> },
    { type: 'email', label: 'Email Field', icon: <Mail size={16} /> },
    { type: 'number', label: 'Number Field', icon: <Hash size={16} /> },
    { type: 'textarea', label: 'Text Area', icon: <FileText size={16} /> },
    { type: 'select', label: 'Dropdown', icon: <ChevronDown size={16} /> },
    { type: 'checkbox', label: 'Checkbox', icon: <CheckSquare size={16} /> },
    { type: 'radio', label: 'Radio Buttons', icon: <CheckSquare size={16} /> },
    { type: 'date', label: 'Date Picker', icon: <Calendar size={16} /> },
    { type: 'file', label: 'File Upload', icon: <Upload size={16} /> },
    { type: 'payment', label: 'Payment', icon: <CreditCard size={16} /> },
    { type: 'section', label: 'Section', icon: <Grid size={16} /> },
    { type: 'heading', label: 'Heading', icon: <HeadingIcon size={16} /> },
    { type: 'divider', label: 'Divider', icon: <Divide size={16} /> },
  ];

  const API_BASE_URL =
    process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001/api';

  // ========== EFFECTS ==========
  useEffect(() => {
    fetchForms();
  }, []);

  // ========== TOURNAMENT FUNCTIONS ==========
  const addVenue = (): void => {
    const newVenue: Venue = {
      venueName: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'US',
      fullAddress: '',
      date: '',
      startTime: tournamentSettings.startTime || '09:00',
      endTime: tournamentSettings.endTime || '17:00',
      isPrimary: tournamentSettings.venues.length === 0,
      additionalInfo: '',
    };

    setTournamentSettings((prev) => ({
      ...prev,
      venues: [...prev.venues, newVenue],
    }));
  };

  const updateVenue = (index: number, field: keyof Venue, value: any): void => {
    setTournamentSettings((prev) => {
      const updatedVenues = [...prev.venues];
      updatedVenues[index] = {
        ...updatedVenues[index],
        [field]: value,
      };

      // Update full address if individual fields change
      if (
        field === 'address' ||
        field === 'city' ||
        field === 'state' ||
        field === 'zipCode' ||
        field === 'country'
      ) {
        const venue = updatedVenues[index];
        updatedVenues[index].fullAddress =
          `${venue.address}, ${venue.city}, ${venue.state} ${venue.zipCode}, ${venue.country}`;
      }

      return { ...prev, venues: updatedVenues };
    });
  };

  const removeVenue = (index: number): void => {
    const venueToRemove = tournamentSettings.venues[index];
    const isRemovingPrimary = venueToRemove.isPrimary;

    setTournamentSettings((prev) => {
      const newVenues = prev.venues.filter((_, i) => i !== index);

      // If we removed the primary venue and there are other venues, make the first one primary
      if (isRemovingPrimary && newVenues.length > 0) {
        newVenues[0].isPrimary = true;
      }

      return { ...prev, venues: newVenues };
    });
  };

  const setPrimaryVenue = (index: number): void => {
    setTournamentSettings((prev) => ({
      ...prev,
      venues: prev.venues.map((venue, i) => ({
        ...venue,
        isPrimary: i === index,
      })),
    }));
  };

  // ========== API FUNCTIONS ==========
  const fetchForms = async (): Promise<void> => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('No authentication token found');
        setLoading(false);
        return;
      }

      const response = await axios.get(`${API_BASE_URL}/forms/builder/forms`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setForms(response.data.data || []);
      }
    } catch (err: any) {
      setError('Failed to load forms');
      console.error('Error fetching forms:', err);
    } finally {
      setLoading(false);
    }
  };

  const createNewForm = (): void => {
    const userData = localStorage.getItem('user');
    let userId = '';

    if (userData) {
      try {
        const user: UserData = JSON.parse(userData);
        userId = user._id;
      } catch (err) {
        console.error('Error parsing user data:', err);
      }
    }

    const newForm: FormData = {
      name: '',
      title: '',
      description: '',
      status: 'draft',
      fields: [],
      settings: { ...formSettings },
      createdBy: userId,
      isTournamentForm: false,
      tournamentSettings: undefined,
    };

    setSelectedForm(newForm);
    setFormName('');
    setFormTitle('');
    setFormDescription('');
    setFormStatus('draft');
    setFormFields([]);
    setFormSettings({ ...formSettings });
    setIsTournamentForm(false);
    setTournamentSettings({
      startDate: '',
      endDate: '',
      startTime: '',
      endTime: '',
      isRefundable: false,
      refundPolicy: '',
      ticketCheckMethod: 'qr',
      customCheckMethod: '',
      venues: [],
      showScheduleTable: true,
    });
  };

  const loadForm = (form: FormData): void => {
    setSelectedForm(form);
    setFormName(form.name);
    setFormTitle(form.title);
    setFormDescription(form.description || '');
    setFormStatus(form.status);

    // Sort fields by order when loading
    const sortedFields = (form.fields || []).sort((a, b) => a.order - b.order);
    setFormFields(sortedFields);
    setFormSettings(
      form.settings || {
        submitText: 'Submit',
        resetText: 'Reset',
        successMessage: 'Form submitted successfully!',
        redirectUrl: '',
        sendEmail: false,
        emailTo: [],
        storeSubmissions: true,
        captcha: false,
        submitButtonStyle: {
          color: '#594230',
          backgroundColor: '#594230',
          textColor: '#ffffff',
        },
        paymentSettings: {
          squareAppId:
            process.env.REACT_APP_SQUARE_APP_ID ||
            'sq0idp-jUCxKnO_i8i7vccQjVj_0g',
          squareLocationId:
            process.env.REACT_APP_SQUARE_LOCATION_ID || 'L26Q50FWRCQW5',
          sandboxMode: true,
          currency: 'USD',
        },
      },
    );

    // Load tournament settings
    const isTournament = form.isTournamentForm || false;
    setIsTournamentForm(isTournament);

    if (isTournament && form.tournamentSettings) {
      // Format dates properly - ensure they're strings
      const formatDateForInput = (dateString: string | Date) => {
        if (!dateString) return '';

        if (dateString instanceof Date) {
          // Convert Date object to YYYY-MM-DD
          return dateString.toISOString().split('T')[0];
        }

        // If it's already a string, ensure it's in YYYY-MM-DD format
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }

        // Return as-is if it's already in the right format
        return dateString;
      };

      // Log the loaded data
      console.log('Loaded tournament settings:', form.tournamentSettings);
      console.log(
        'showScheduleTable from DB:',
        form.tournamentSettings.showScheduleTable,
      );

      setTournamentSettings({
        startDate: formatDateForInput(form.tournamentSettings.startDate || ''),
        endDate: formatDateForInput(form.tournamentSettings.endDate || ''),
        startTime: form.tournamentSettings.startTime || '',
        endTime: form.tournamentSettings.endTime || '',
        isRefundable: form.tournamentSettings.isRefundable || false,
        refundPolicy: form.tournamentSettings.refundPolicy || '',
        ticketCheckMethod: form.tournamentSettings.ticketCheckMethod || 'qr',
        customCheckMethod: form.tournamentSettings.customCheckMethod || '',
        venues: (form.tournamentSettings.venues || []).map((venue) => ({
          ...venue,
          date: formatDateForInput(venue.date || ''),
        })),
        // IMPORTANT: Default to true if undefined
        showScheduleTable: form.tournamentSettings.showScheduleTable !== false,
      });
    } else {
      // Reset to defaults when not a tournament form
      setTournamentSettings({
        startDate: '',
        endDate: '',
        startTime: '',
        endTime: '',
        isRefundable: false,
        refundPolicy: '',
        ticketCheckMethod: 'qr',
        customCheckMethod: '',
        venues: [],
        showScheduleTable: true, // Default to true
      });
    }
  };

  const validateTournamentSettings = (): boolean => {
    if (!isTournamentForm) return true;

    const errors: string[] = [];

    if (!tournamentSettings.startDate) {
      errors.push('Tournament start date is required');
    }

    if (!tournamentSettings.endDate) {
      errors.push('Tournament end date is required');
    }

    if (tournamentSettings.startDate && tournamentSettings.endDate) {
      const start = new Date(tournamentSettings.startDate);
      const end = new Date(tournamentSettings.endDate);
      if (end < start) {
        errors.push('End date cannot be before start date');
      }
    }

    if (tournamentSettings.venues.length === 0) {
      errors.push('At least one venue is required for a tournament');
    } else {
      tournamentSettings.venues.forEach((venue, index) => {
        if (!venue.venueName) {
          errors.push(`Venue ${index + 1}: Name is required`);
        }
        if (!venue.date) {
          errors.push(`Venue ${index + 1}: Date is required`);
        }
        if (
          !venue.fullAddress &&
          (!venue.address || !venue.city || !venue.state)
        ) {
          errors.push(`Venue ${index + 1}: Address is required`);
        }
      });
    }

    if (errors.length > 0) {
      setError(errors.join('. '));
      return false;
    }

    return true;
  };

  const saveForm = async (): Promise<void> => {
    if (!formName.trim() || !formTitle.trim()) {
      setError('Form name and title are required');
      return;
    }

    if (isTournamentForm && !validateTournamentSettings()) {
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('No authentication token found');
        setSaving(false);
        return;
      }

      const formData: Partial<FormData> = {
        name: formName,
        title: formTitle,
        description: formDescription,
        status: formStatus,
        fields: formFields,
        settings: formSettings,
        isTournamentForm: isTournamentForm,
      };

      // Add debugging log
      console.log(
        'showScheduleTable value before save:',
        tournamentSettings.showScheduleTable,
      );

      // Only include tournamentSettings if it's a tournament form
      if (isTournamentForm) {
        formData.tournamentSettings = {
          ...tournamentSettings,
          // Ensure dates are stored as strings
          startDate: tournamentSettings.startDate,
          endDate: tournamentSettings.endDate,
          // Ensure venue dates are also strings
          venues: tournamentSettings.venues.map((venue) => ({
            ...venue,
            date: venue.date,
          })),
          // Make sure showScheduleTable is included
          showScheduleTable: tournamentSettings.showScheduleTable !== false, // Ensure it's always boolean
        };
        console.log(
          'Tournament settings being saved:',
          formData.tournamentSettings,
        );
      } else {
        // Explicitly set to undefined when not a tournament form
        formData.tournamentSettings = undefined;
      }

      let response;
      if (selectedForm && selectedForm._id) {
        response = await axios.put(
          `${API_BASE_URL}/forms/builder/forms/${selectedForm._id}`,
          formData,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
      } else {
        response = await axios.post(
          `${API_BASE_URL}/forms/builder/forms`,
          formData,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
      }

      if (response.data.success) {
        setSuccess('Form saved successfully!');
        if (response.data.data) {
          setSelectedForm(response.data.data);
          // Verify the saved data
          console.log(
            'Saved tournament settings:',
            response.data.data.tournamentSettings,
          );
        }
        fetchForms();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save form');
      console.error('Error saving form:', err);
    } finally {
      setSaving(false);
    }
  };

  const publishForm = async (): Promise<void> => {
    if (!selectedForm || !selectedForm._id) return;

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('No authentication token found');
        setSaving(false);
        return;
      }

      const response = await axios.put(
        `${API_BASE_URL}/forms/builder/forms/${selectedForm._id}`,
        {
          ...selectedForm,
          status: 'published',
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.data.success) {
        setSuccess('Form published successfully!');
        if (response.data.data) {
          setSelectedForm(response.data.data);
          setFormStatus('published');
        }
        fetchForms();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to publish form');
      console.error('Error publishing form:', err);
    } finally {
      setSaving(false);
    }
  };

  const duplicateForm = async (formId: string): Promise<void> => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('No authentication token found');
        return;
      }

      const response = await axios.post(
        `${API_BASE_URL}/forms/builder/forms/${formId}/duplicate`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.data.success) {
        setSuccess('Form duplicated successfully!');
        fetchForms();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to duplicate form');
      console.error('Error duplicating form:', err);
    }
  };

  const deleteForm = async (formId: string): Promise<void> => {
    if (
      !window.confirm(
        'Are you sure you want to delete this form? All submissions will also be deleted.',
      )
    ) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('No authentication token found');
        return;
      }

      const response = await axios.delete(
        `${API_BASE_URL}/forms/builder/forms/${formId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.data.success) {
        setSuccess('Form deleted successfully!');
        if (selectedForm && selectedForm._id === formId) {
          createNewForm();
        }
        fetchForms();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete form');
      console.error('Error deleting form:', err);
    }
  };

  // ========== DRAG & DROP FUNCTIONS ==========
  const onDragEnd = (result: DropResult): void => {
    console.log('Drag result:', result);

    if (!result.destination) {
      console.log('Dropped outside');
      return;
    }

    if (
      result.destination.droppableId === result.source.droppableId &&
      result.destination.index === result.source.index
    ) {
      console.log('Same position');
      return;
    }

    if (
      result.destination.droppableId !== 'form-fields' ||
      result.source.droppableId !== 'form-fields'
    ) {
      console.log('Wrong droppable ID');
      return;
    }

    const newFields = Array.from(formFields);
    const [removed] = newFields.splice(result.source.index, 1);
    newFields.splice(result.destination.index, 0, removed);

    const reorderedFields = newFields.map((field, index) => ({
      ...field,
      order: index,
    }));

    console.log(
      'New order:',
      reorderedFields.map((f) => ({
        id: f.id,
        order: f.order,
        label: f.label,
      })),
    );
    setFormFields(reorderedFields);
  };

  // ========== FIELD MANAGEMENT ==========
  const addField = (type: FormField['type']): void => {
    const fieldId = `field_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const baseField: FormField = {
      id: fieldId,
      type: type,
      label: `New ${type} Field`,
      name: `field_${type}_${Date.now()}`,
      required: false,
      order: formFields.length,
    };

    switch (type) {
      case 'text':
      case 'email':
      case 'number':
      case 'tel':
      case 'url':
      case 'password':
        baseField.placeholder = `Enter ${type}`;
        break;
      case 'textarea':
        baseField.placeholder = `Enter text here...`;
        baseField.style = { rows: 4 };
        break;
      case 'select':
      case 'radio':
        baseField.options = [
          { label: 'Option 1', value: 'option1', selected: false },
          { label: 'Option 2', value: 'option2', selected: false },
        ];
        break;
      case 'checkbox':
        baseField.defaultValue = false;
        break;
      case 'date':
        baseField.placeholder = 'Select date';
        break;
      case 'file':
        baseField.fileConfig = {
          accept: '',
          maxSize: 10485760, // 10MB
          multiple: false,
        };
        break;
      case 'payment':
        baseField.paymentConfig = createDefaultPaymentConfig();
        baseField.paymentConfig.squareAppId =
          formSettings.paymentSettings?.squareAppId;
        baseField.paymentConfig.squareLocationId =
          formSettings.paymentSettings?.squareLocationId;
        break;
      case 'section':
        baseField.label = 'New Section';
        baseField.helpText = 'Section description';
        break;
      case 'heading':
        baseField.label = 'New Heading';
        break;
      case 'divider':
        baseField.label = 'Divider';
        break;
    }

    setEditingField(baseField);
    setFieldType(type);
    setShowFieldModal(true);
  };

  const editField = (field: FormField): void => {
    const fieldToEdit = { ...field };
    if (field.type === 'payment' && !field.paymentConfig) {
      fieldToEdit.paymentConfig = createDefaultPaymentConfig();
    }
    setEditingField(fieldToEdit);
    setFieldType(field.type);
    setShowFieldModal(true);
  };

  const ensurePaymentConfig = (
    config?: Partial<PaymentConfigWithDefaults>,
  ): PaymentConfigWithDefaults => {
    const defaultConfig = createDefaultPaymentConfig();
    return {
      ...defaultConfig,
      ...config,
      pricingPackages: config?.pricingPackages || defaultConfig.pricingPackages,
    };
  };

  const saveField = (): void => {
    if (!editingField) return;

    const updatedField = { ...editingField };
    const fieldIndex = formFields.findIndex((f) => f.id === updatedField.id);

    if (fieldIndex >= 0) {
      const newFields = [...formFields];
      newFields[fieldIndex] = updatedField;
      setFormFields(newFields);
    } else {
      updatedField.order = formFields.length;
      setFormFields([...formFields, updatedField]);
    }

    setShowFieldModal(false);
    setEditingField(null);
  };

  const removeField = (fieldId: string): void => {
    if (window.confirm('Are you sure you want to remove this field?')) {
      const newFields = formFields.filter((f) => f.id !== fieldId);
      const reorderedFields = newFields.map((field, index) => ({
        ...field,
        order: index,
      }));
      setFormFields(reorderedFields);
    }
  };

  // ========== HELPER FUNCTIONS ==========
  const getFieldIcon = (type: FormField['type']): JSX.Element => {
    const fieldType = fieldTypes.find((ft) => ft.type === type);
    return fieldType ? fieldType.icon : <Type size={16} />;
  };

  // ========== EMBED CODE ==========
  const getEmbedCode = async (): Promise<void> => {
    if (!selectedForm || !selectedForm._id) return;

    try {
      const response = await axios.get(
        `${API_BASE_URL}/forms/embed-code/${selectedForm._id}`,
      );
      if (response.data.success) {
        setEmbedCode(response.data.data);
        setShowEmbedModal(true);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to get embed code');
      console.error('Error getting embed code:', err);
    }
  };

  // ========== PAYMENT TEST ==========
  const testPaymentIntegration = async (): Promise<void> => {
    if (!selectedForm || !selectedForm._id) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('No authentication token found');
        return;
      }

      const response = await axios.post(
        `${API_BASE_URL}/forms/test-payment`,
        {
          formId: selectedForm._id,
          amount: 100,
          currency: 'USD',
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.data.success) {
        setSuccess('Payment integration test successful!');
      } else {
        setError('Payment test failed: ' + response.data.error);
      }
    } catch (err: any) {
      setError(
        'Payment test error: ' + (err.response?.data?.error || err.message),
      );
      console.error('Payment test error:', err);
    }
  };

  // ========== MODAL RENDERERS ==========
  const renderFieldEditor = (): JSX.Element | null => {
    if (!editingField) return null;

    return (
      <Modal
        show={showFieldModal}
        onHide={() => {
          setShowFieldModal(false);
          setEditingField(null);
        }}
        size='lg'
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {editingField.id.startsWith('field_') ? 'Add' : 'Edit'} Field
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className='mb-3'>
              <Form.Label>Field Type</Form.Label>
              <Form.Control
                as='select'
                value={fieldType}
                onChange={(e) => {
                  const newType = e.target.value as FormField['type'];
                  setFieldType(newType);

                  // Update the field type and reset to defaults for that type
                  const updatedField = { ...editingField, type: newType };

                  // Reset field-specific properties when changing type
                  if (newType !== 'payment') {
                    delete updatedField.paymentConfig;
                  }
                  if (newType !== 'select' && newType !== 'radio') {
                    delete updatedField.options;
                  }
                  if (newType !== 'file') {
                    delete updatedField.fileConfig;
                  }
                  if (newType !== 'textarea') {
                    if (updatedField.style) {
                      delete updatedField.style.rows;
                    }
                  }

                  setEditingField(updatedField);
                }}
                disabled={!editingField.id.startsWith('field_')}
              >
                {fieldTypes.map((ft) => (
                  <option key={ft.type} value={ft.type}>
                    {ft.label}
                  </option>
                ))}
              </Form.Control>
            </Form.Group>

            <Form.Group className='mb-3'>
              <Form.Label>Field Label</Form.Label>
              <Form.Control
                type='text'
                value={editingField.label}
                onChange={(e) =>
                  setEditingField({ ...editingField, label: e.target.value })
                }
                placeholder='Enter field label'
              />
            </Form.Group>

            <Form.Group className='mb-3'>
              <Form.Label>Field Name</Form.Label>
              <Form.Control
                type='text'
                value={editingField.name}
                onChange={(e) =>
                  setEditingField({ ...editingField, name: e.target.value })
                }
                placeholder='Enter field name (used for data storage)'
              />
              <Form.Text className='text-muted'>
                Use lowercase with underscores (e.g., first_name, email_address)
              </Form.Text>
            </Form.Group>

            {fieldType !== 'section' &&
              fieldType !== 'heading' &&
              fieldType !== 'divider' && (
                <>
                  <Form.Group className='mb-3'>
                    <Form.Label>Placeholder Text</Form.Label>
                    <Form.Control
                      type='text'
                      value={editingField.placeholder || ''}
                      onChange={(e) =>
                        setEditingField({
                          ...editingField,
                          placeholder: e.target.value,
                        })
                      }
                      placeholder='Enter placeholder text'
                    />
                  </Form.Group>

                  <Form.Group className='mb-3'>
                    <Form.Label>Help Text</Form.Label>
                    <Form.Control
                      type='text'
                      value={editingField.helpText || ''}
                      onChange={(e) =>
                        setEditingField({
                          ...editingField,
                          helpText: e.target.value,
                        })
                      }
                      placeholder='Optional help text'
                    />
                  </Form.Group>

                  <Form.Group className='mb-3'>
                    <Form.Check
                      type='checkbox'
                      label='Required field'
                      checked={editingField.required}
                      onChange={(e) =>
                        setEditingField({
                          ...editingField,
                          required: e.target.checked,
                        })
                      }
                    />
                  </Form.Group>
                </>
              )}

            {fieldType === 'section' && (
              <Form.Group className='mb-3'>
                <Form.Label>Section Description</Form.Label>
                <Form.Control
                  type='text'
                  value={editingField.helpText || ''}
                  onChange={(e) =>
                    setEditingField({
                      ...editingField,
                      helpText: e.target.value,
                    })
                  }
                  placeholder='Optional section description'
                />
              </Form.Group>
            )}

            {/* TEXT, EMAIL, NUMBER, TEL, URL, PASSWORD FIELDS */}
            {(fieldType === 'text' ||
              fieldType === 'email' ||
              fieldType === 'number' ||
              fieldType === 'tel' ||
              fieldType === 'url' ||
              fieldType === 'password') && (
              <>
                <Form.Group className='mb-3'>
                  <Form.Label>Default Value</Form.Label>
                  <Form.Control
                    type={fieldType === 'number' ? 'number' : 'text'}
                    value={editingField.defaultValue || ''}
                    onChange={(e) =>
                      setEditingField({
                        ...editingField,
                        defaultValue: e.target.value,
                      })
                    }
                    placeholder='Enter default value'
                  />
                </Form.Group>

                <h6>Validation Rules</h6>
                <Row>
                  {fieldType === 'text' ||
                  fieldType === 'email' ||
                  fieldType === 'password' ? (
                    <>
                      <Col md={6}>
                        <Form.Group className='mb-3'>
                          <Form.Label>Minimum Length</Form.Label>
                          <Form.Control
                            type='number'
                            min='0'
                            value={editingField.validation?.minLength || ''}
                            onChange={(e) =>
                              setEditingField({
                                ...editingField,
                                validation: {
                                  ...editingField.validation,
                                  minLength: e.target.value
                                    ? parseInt(e.target.value)
                                    : undefined,
                                },
                              })
                            }
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className='mb-3'>
                          <Form.Label>Maximum Length</Form.Label>
                          <Form.Control
                            type='number'
                            min='0'
                            value={editingField.validation?.maxLength || ''}
                            onChange={(e) =>
                              setEditingField({
                                ...editingField,
                                validation: {
                                  ...editingField.validation,
                                  maxLength: e.target.value
                                    ? parseInt(e.target.value)
                                    : undefined,
                                },
                              })
                            }
                          />
                        </Form.Group>
                      </Col>
                    </>
                  ) : fieldType === 'number' ? (
                    <>
                      <Col md={6}>
                        <Form.Group className='mb-3'>
                          <Form.Label>Minimum Value</Form.Label>
                          <Form.Control
                            type='number'
                            value={editingField.validation?.min || ''}
                            onChange={(e) =>
                              setEditingField({
                                ...editingField,
                                validation: {
                                  ...editingField.validation,
                                  min: e.target.value
                                    ? parseFloat(e.target.value)
                                    : undefined,
                                },
                              })
                            }
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className='mb-3'>
                          <Form.Label>Maximum Value</Form.Label>
                          <Form.Control
                            type='number'
                            value={editingField.validation?.max || ''}
                            onChange={(e) =>
                              setEditingField({
                                ...editingField,
                                validation: {
                                  ...editingField.validation,
                                  max: e.target.value
                                    ? parseFloat(e.target.value)
                                    : undefined,
                                },
                              })
                            }
                          />
                        </Form.Group>
                      </Col>
                    </>
                  ) : null}
                </Row>

                {fieldType === 'email' && (
                  <Form.Group className='mb-3'>
                    <Form.Check
                      type='checkbox'
                      label='Validate email format'
                      checked={true}
                      readOnly
                    />
                  </Form.Group>
                )}
              </>
            )}

            {/* TEXTAREA FIELD */}
            {fieldType === 'textarea' && (
              <Form.Group className='mb-3'>
                <Form.Label>Number of Rows</Form.Label>
                <Form.Control
                  type='number'
                  min='1'
                  max='20'
                  value={editingField.style?.rows || 4}
                  onChange={(e) =>
                    setEditingField({
                      ...editingField,
                      style: {
                        ...editingField.style,
                        rows: parseInt(e.target.value) || 4,
                      },
                    })
                  }
                />
              </Form.Group>
            )}

            {/* SELECT & RADIO FIELDS */}
            {(fieldType === 'select' || fieldType === 'radio') && (
              <>
                <Form.Group className='mb-3'>
                  <Form.Label>Options</Form.Label>
                  {editingField.options?.map((option, index) => (
                    <div key={index} className='d-flex mb-2'>
                      <Form.Control
                        type='text'
                        placeholder='Option label'
                        value={option.label}
                        onChange={(e) => {
                          const newOptions = [...(editingField.options || [])];
                          newOptions[index].label = e.target.value;
                          setEditingField({
                            ...editingField,
                            options: newOptions,
                          });
                        }}
                        className='me-2'
                      />
                      <Form.Control
                        type='text'
                        placeholder='Option value'
                        value={option.value}
                        onChange={(e) => {
                          const newOptions = [...(editingField.options || [])];
                          newOptions[index].value = e.target.value;
                          setEditingField({
                            ...editingField,
                            options: newOptions,
                          });
                        }}
                        className='me-2'
                      />
                      <Button
                        variant='danger'
                        size='sm'
                        onClick={() => {
                          const newOptions = (
                            editingField.options || []
                          ).filter((_, i) => i !== index);
                          setEditingField({
                            ...editingField,
                            options: newOptions,
                          });
                        }}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant='outline-primary'
                    size='sm'
                    onClick={() => {
                      const optionNumber =
                        (editingField.options || []).length + 1;
                      const newOptions = [
                        ...(editingField.options || []),
                        {
                          label: `Option ${optionNumber}`,
                          value: `option${optionNumber}`,
                          selected: false,
                        },
                      ];
                      setEditingField({
                        ...editingField,
                        options: newOptions,
                      });
                    }}
                  >
                    <Plus size={14} /> Add Option
                  </Button>
                </Form.Group>

                {fieldType === 'select' && (
                  <Form.Group className='mb-3'>
                    <Form.Label>Default Selected Value</Form.Label>
                    <Form.Control
                      as='select'
                      value={
                        editingField.options?.find((opt) => opt.selected)
                          ?.value || ''
                      }
                      onChange={(e) => {
                        const newOptions = (editingField.options || []).map(
                          (opt) => ({
                            ...opt,
                            selected: opt.value === e.target.value,
                          }),
                        );
                        setEditingField({
                          ...editingField,
                          options: newOptions,
                        });
                      }}
                    >
                      <option value=''>-- None --</option>
                      {editingField.options?.map((option, index) => (
                        <option key={index} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Form.Control>
                  </Form.Group>
                )}
              </>
            )}

            {/* CHECKBOX FIELD */}
            {fieldType === 'checkbox' && (
              <Form.Group className='mb-3'>
                <Form.Label>Default Checked</Form.Label>
                <Form.Check
                  type='checkbox'
                  checked={editingField.defaultValue === true}
                  onChange={(e) =>
                    setEditingField({
                      ...editingField,
                      defaultValue: e.target.checked,
                    })
                  }
                  label='Checked by default'
                />
              </Form.Group>
            )}

            {/* DATE FIELD */}
            {fieldType === 'date' && (
              <Form.Group className='mb-3'>
                <Form.Label>Default Date</Form.Label>
                <Form.Control
                  type='date'
                  value={editingField.defaultValue || ''}
                  onChange={(e) =>
                    setEditingField({
                      ...editingField,
                      defaultValue: e.target.value,
                    })
                  }
                />
              </Form.Group>
            )}

            {/* FILE FIELD */}
            {fieldType === 'file' && (
              <>
                <Form.Group className='mb-3'>
                  <Form.Label>Accepted File Types</Form.Label>
                  <Form.Control
                    type='text'
                    value={editingField.fileConfig?.accept || ''}
                    onChange={(e) =>
                      setEditingField({
                        ...editingField,
                        fileConfig: {
                          ...editingField.fileConfig,
                          accept: e.target.value,
                        },
                      })
                    }
                    placeholder='e.g., .pdf,.doc,.docx,image/*'
                  />
                  <Form.Text className='text-muted'>
                    Comma-separated file extensions or MIME types
                  </Form.Text>
                </Form.Group>

                <Form.Group className='mb-3'>
                  <Form.Label>Maximum File Size (MB)</Form.Label>
                  <Form.Control
                    type='number'
                    min='0'
                    step='0.1'
                    value={
                      editingField.fileConfig?.maxSize
                        ? editingField.fileConfig.maxSize / 1048576
                        : 10
                    }
                    onChange={(e) =>
                      setEditingField({
                        ...editingField,
                        fileConfig: {
                          ...editingField.fileConfig,
                          maxSize: parseFloat(e.target.value) * 1048576,
                        },
                      })
                    }
                  />
                </Form.Group>

                <Form.Group className='mb-3'>
                  <Form.Check
                    type='checkbox'
                    label='Allow multiple files'
                    checked={editingField.fileConfig?.multiple || false}
                    onChange={(e) =>
                      setEditingField({
                        ...editingField,
                        fileConfig: {
                          ...editingField.fileConfig,
                          multiple: e.target.checked,
                        },
                      })
                    }
                  />
                </Form.Group>
              </>
            )}

            {/* PAYMENT FIELD */}
            {fieldType === 'payment' && (
              <>
                <Form.Group className='mb-3'>
                  <Form.Check
                    type='checkbox'
                    label='Use pricing packages (multiple options)'
                    checked={
                      editingField.paymentConfig?.pricingPackages &&
                      editingField.paymentConfig.pricingPackages.length > 0
                    }
                    onChange={(e) => {
                      const usePackages = e.target.checked;
                      const currentPaymentConfig = ensurePaymentConfig(
                        editingField.paymentConfig,
                      );

                      setEditingField({
                        ...editingField,
                        paymentConfig: {
                          ...currentPaymentConfig,
                          pricingPackages: usePackages
                            ? [
                                {
                                  name: 'Basic Package',
                                  description: 'Standard package',
                                  price: 1000,
                                  currency: currentPaymentConfig.currency,
                                  quantity: 1,
                                  maxQuantity: undefined,
                                  defaultSelected: true,
                                  isEnabled: true,
                                },
                              ]
                            : [],
                          fixedPrice: !usePackages,
                        },
                      });
                    }}
                  />
                </Form.Group>

                {editingField.paymentConfig?.pricingPackages &&
                editingField.paymentConfig.pricingPackages.length > 0 ? (
                  <>
                    <Form.Group className='mb-3'>
                      <Form.Label>Pricing Packages</Form.Label>
                      {editingField.paymentConfig.pricingPackages.map(
                        (pkg, index) => (
                          <Card key={index} className='mb-3'>
                            <Card.Body>
                              <Row className='mb-2'>
                                <Col md={6}>
                                  <Form.Label>Package Name</Form.Label>
                                  <Form.Control
                                    type='text'
                                    value={pkg.name || ''}
                                    onChange={(e) => {
                                      const currentPaymentConfig =
                                        ensurePaymentConfig(
                                          editingField.paymentConfig,
                                        );
                                      const newPackages = [
                                        ...currentPaymentConfig.pricingPackages,
                                      ];
                                      newPackages[index].name = e.target.value;
                                      setEditingField({
                                        ...editingField,
                                        paymentConfig: {
                                          ...currentPaymentConfig,
                                          pricingPackages: newPackages,
                                        },
                                      });
                                    }}
                                    placeholder='e.g., VIP Package, Standard Ticket'
                                  />
                                </Col>
                                <Col md={6}>
                                  <Form.Label>Price ($)</Form.Label>
                                  <InputGroup>
                                    <InputGroup.Text>$</InputGroup.Text>
                                    <Form.Control
                                      type='number'
                                      step='0.01'
                                      min='0'
                                      value={(pkg.price || 0) / 100}
                                      onChange={(e) => {
                                        const currentPaymentConfig =
                                          ensurePaymentConfig(
                                            editingField.paymentConfig,
                                          );
                                        const newPackages = [
                                          ...currentPaymentConfig.pricingPackages,
                                        ];
                                        const price =
                                          parseFloat(e.target.value) * 100;
                                        newPackages[index].price = isNaN(price)
                                          ? 0
                                          : Math.round(price);
                                        setEditingField({
                                          ...editingField,
                                          paymentConfig: {
                                            ...currentPaymentConfig,
                                            pricingPackages: newPackages,
                                          },
                                        });
                                      }}
                                    />
                                  </InputGroup>
                                </Col>
                              </Row>

                              <Form.Group className='mb-2'>
                                <Form.Label>Description</Form.Label>
                                <Form.Control
                                  type='text'
                                  value={pkg.description || ''}
                                  onChange={(e) => {
                                    const currentPaymentConfig =
                                      ensurePaymentConfig(
                                        editingField.paymentConfig,
                                      );
                                    const newPackages = [
                                      ...currentPaymentConfig.pricingPackages,
                                    ];
                                    newPackages[index].description =
                                      e.target.value;
                                    setEditingField({
                                      ...editingField,
                                      paymentConfig: {
                                        ...currentPaymentConfig,
                                        pricingPackages: newPackages,
                                      },
                                    });
                                  }}
                                  placeholder='Describe this package'
                                />
                              </Form.Group>

                              <Row>
                                <Col md={6}>
                                  <Form.Label>Default Quantity</Form.Label>
                                  <Form.Control
                                    type='number'
                                    min='1'
                                    value={pkg.quantity || 1}
                                    onChange={(e) => {
                                      const currentPaymentConfig =
                                        ensurePaymentConfig(
                                          editingField.paymentConfig,
                                        );
                                      const newPackages = [
                                        ...currentPaymentConfig.pricingPackages,
                                      ];
                                      newPackages[index].quantity =
                                        parseInt(e.target.value) || 1;
                                      setEditingField({
                                        ...editingField,
                                        paymentConfig: {
                                          ...currentPaymentConfig,
                                          pricingPackages: newPackages,
                                        },
                                      });
                                    }}
                                  />
                                </Col>
                                <Col md={6}>
                                  <Form.Label>
                                    Max Quantity (optional)
                                  </Form.Label>
                                  <Form.Control
                                    type='number'
                                    min='1'
                                    value={pkg.maxQuantity || ''}
                                    onChange={(e) => {
                                      const currentPaymentConfig =
                                        ensurePaymentConfig(
                                          editingField.paymentConfig,
                                        );
                                      const newPackages = [
                                        ...currentPaymentConfig.pricingPackages,
                                      ];
                                      newPackages[index].maxQuantity =
                                        e.target.value.trim()
                                          ? parseInt(e.target.value) ||
                                            undefined
                                          : undefined;
                                      setEditingField({
                                        ...editingField,
                                        paymentConfig: {
                                          ...currentPaymentConfig,
                                          pricingPackages: newPackages,
                                        },
                                      });
                                    }}
                                    placeholder='No limit if empty'
                                  />
                                </Col>
                              </Row>

                              <Row className='mt-2'>
                                <Col md={6}>
                                  <Form.Check
                                    type='checkbox'
                                    label='Enabled'
                                    checked={pkg.isEnabled !== false}
                                    onChange={(e) => {
                                      const currentPaymentConfig =
                                        ensurePaymentConfig(
                                          editingField.paymentConfig,
                                        );
                                      const newPackages = [
                                        ...currentPaymentConfig.pricingPackages,
                                      ];
                                      newPackages[index].isEnabled =
                                        e.target.checked;
                                      setEditingField({
                                        ...editingField,
                                        paymentConfig: {
                                          ...currentPaymentConfig,
                                          pricingPackages: newPackages,
                                        },
                                      });
                                    }}
                                  />
                                </Col>
                                <Col md={6}>
                                  <Form.Check
                                    type='checkbox'
                                    label='Selected by default'
                                    checked={pkg.defaultSelected || false}
                                    onChange={(e) => {
                                      const currentPaymentConfig =
                                        ensurePaymentConfig(
                                          editingField.paymentConfig,
                                        );
                                      const newPackages = [
                                        ...currentPaymentConfig.pricingPackages,
                                      ];
                                      // Only one package can be default selected
                                      newPackages.forEach((pkgItem, i) => {
                                        newPackages[i].defaultSelected =
                                          i === index
                                            ? e.target.checked
                                            : false;
                                      });
                                      setEditingField({
                                        ...editingField,
                                        paymentConfig: {
                                          ...currentPaymentConfig,
                                          pricingPackages: newPackages,
                                        },
                                      });
                                    }}
                                  />
                                </Col>
                              </Row>

                              <Button
                                variant='danger'
                                size='sm'
                                className='mt-2'
                                onClick={() => {
                                  const currentPaymentConfig =
                                    ensurePaymentConfig(
                                      editingField.paymentConfig,
                                    );
                                  const newPackages =
                                    currentPaymentConfig.pricingPackages.filter(
                                      (_, i) => i !== index,
                                    );
                                  setEditingField({
                                    ...editingField,
                                    paymentConfig: {
                                      ...currentPaymentConfig,
                                      pricingPackages: newPackages,
                                    },
                                  });
                                }}
                              >
                                Remove Package
                              </Button>
                            </Card.Body>
                          </Card>
                        ),
                      )}
                    </Form.Group>

                    <Button
                      variant='secondary'
                      size='sm'
                      onClick={() => {
                        const currentPaymentConfig = ensurePaymentConfig(
                          editingField.paymentConfig,
                        );
                        const newPackages = [
                          ...currentPaymentConfig.pricingPackages,
                        ];

                        newPackages.push({
                          name: `Package ${newPackages.length + 1}`,
                          description: '',
                          price: 1000,
                          currency: currentPaymentConfig.currency,
                          quantity: 1,
                          maxQuantity: undefined,
                          defaultSelected: false,
                          isEnabled: true,
                        });

                        setEditingField({
                          ...editingField,
                          paymentConfig: {
                            ...currentPaymentConfig,
                            pricingPackages: newPackages,
                          },
                        });
                      }}
                    >
                      Add Another Package
                    </Button>
                  </>
                ) : (
                  <>
                    <Form.Group className='mb-3'>
                      <Form.Label>Amount (in cents)</Form.Label>
                      <Form.Control
                        type='number'
                        value={editingField.paymentConfig?.amount || 0}
                        onChange={(e) =>
                          setEditingField({
                            ...editingField,
                            paymentConfig: ensurePaymentConfig({
                              ...editingField.paymentConfig,
                              amount: parseInt(e.target.value) || 0,
                            }),
                          })
                        }
                        min='0'
                        step='1'
                      />
                      <Form.Text className='text-muted'>
                        100 cents = $1.00
                      </Form.Text>
                    </Form.Group>

                    <Form.Group className='mb-3'>
                      <Form.Label>Description</Form.Label>
                      <Form.Control
                        type='text'
                        value={editingField.paymentConfig?.description || ''}
                        onChange={(e) =>
                          setEditingField({
                            ...editingField,
                            paymentConfig: ensurePaymentConfig({
                              ...editingField.paymentConfig,
                              description: e.target.value,
                            }),
                          })
                        }
                        placeholder='Payment description'
                      />
                    </Form.Group>
                  </>
                )}

                <Form.Group className='mb-3'>
                  <Form.Label>Currency</Form.Label>
                  <Form.Control
                    as='select'
                    value={editingField.paymentConfig?.currency || 'USD'}
                    onChange={(e) =>
                      setEditingField({
                        ...editingField,
                        paymentConfig: ensurePaymentConfig({
                          ...editingField.paymentConfig,
                          currency: e.target.value,
                        }),
                      })
                    }
                  >
                    <option value='USD'>USD</option>
                    <option value='EUR'>EUR</option>
                    <option value='GBP'>GBP</option>
                    <option value='CAD'>CAD</option>
                    <option value='AUD'>AUD</option>
                  </Form.Control>
                </Form.Group>

                <Form.Group className='mb-3'>
                  <Form.Check
                    type='checkbox'
                    label='Recurring payment'
                    checked={editingField.paymentConfig?.recurring || false}
                    onChange={(e) =>
                      setEditingField({
                        ...editingField,
                        paymentConfig: ensurePaymentConfig({
                          ...editingField.paymentConfig,
                          recurring: e.target.checked,
                        }),
                      })
                    }
                  />
                </Form.Group>

                {editingField.paymentConfig?.recurring && (
                  <Form.Group className='mb-3'>
                    <Form.Label>Recurring Interval</Form.Label>
                    <Form.Control
                      as='select'
                      value={
                        editingField.paymentConfig?.recurringInterval ||
                        'monthly'
                      }
                      onChange={(e) =>
                        setEditingField({
                          ...editingField,
                          paymentConfig: ensurePaymentConfig({
                            ...editingField.paymentConfig,
                            recurringInterval: e.target.value as
                              | 'monthly'
                              | 'yearly'
                              | 'weekly',
                          }),
                        })
                      }
                    >
                      <option value='monthly'>Monthly</option>
                      <option value='yearly'>Yearly</option>
                      <option value='weekly'>Weekly</option>
                    </Form.Control>
                  </Form.Group>
                )}
              </>
            )}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant='secondary'
            onClick={() => {
              setShowFieldModal(false);
              setEditingField(null);
            }}
          >
            Cancel
          </Button>
          <Button variant='primary' onClick={saveField}>
            Save Field
          </Button>
        </Modal.Footer>
      </Modal>
    );
  };

  const renderSettingsModal = (): JSX.Element => {
    return (
      <Modal
        show={showSettings}
        onHide={() => setShowSettings(false)}
        size='lg'
      >
        <Modal.Header closeButton>
          <Modal.Title>Form Settings</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Tabs defaultActiveKey='general' className='mb-3'>
            <Tab eventKey='general' title='General'>
              <Form.Group className='mb-3'>
                <Form.Label>Submit Button Text</Form.Label>
                <Form.Control
                  type='text'
                  value={formSettings.submitText}
                  onChange={(e) =>
                    setFormSettings({
                      ...formSettings,
                      submitText: e.target.value,
                    })
                  }
                />
              </Form.Group>

              <Form.Group className='mb-3'>
                <Form.Label>Success Message</Form.Label>
                <Form.Control
                  as='textarea'
                  rows={3}
                  value={formSettings.successMessage}
                  onChange={(e) =>
                    setFormSettings({
                      ...formSettings,
                      successMessage: e.target.value,
                    })
                  }
                />
              </Form.Group>

              <Form.Group className='mb-3'>
                <Form.Label>Redirect URL (optional)</Form.Label>
                <Form.Control
                  type='url'
                  value={formSettings.redirectUrl}
                  onChange={(e) =>
                    setFormSettings({
                      ...formSettings,
                      redirectUrl: e.target.value,
                    })
                  }
                  placeholder='https://example.com/thank-you'
                />
                <Form.Text className='text-muted'>
                  Leave empty to stay on the same page after submission
                </Form.Text>
              </Form.Group>
            </Tab>

            <Tab eventKey='email' title='Email'>
              <Form.Group className='mb-3'>
                <Form.Check
                  type='checkbox'
                  label='Send email notifications'
                  checked={formSettings.sendEmail}
                  onChange={(e) =>
                    setFormSettings({
                      ...formSettings,
                      sendEmail: e.target.checked,
                    })
                  }
                />
              </Form.Group>

              {formSettings.sendEmail && (
                <>
                  <Form.Group className='mb-3'>
                    <Form.Label>Send notifications to</Form.Label>
                    <Form.Control
                      type='text'
                      value={formSettings.emailTo.join(', ')}
                      onChange={(e) =>
                        setFormSettings({
                          ...formSettings,
                          emailTo: e.target.value
                            .split(',')
                            .map((email) => email.trim())
                            .filter((email) => email),
                        })
                      }
                      placeholder='email1@example.com, email2@example.com'
                    />
                    <Form.Text className='text-muted'>
                      Comma-separated email addresses
                    </Form.Text>
                  </Form.Group>
                </>
              )}
            </Tab>

            <Tab eventKey='payment' title='Payment'>
              <Form.Group className='mb-3'>
                <Form.Label>Square Application ID</Form.Label>
                <Form.Control
                  type='text'
                  value={formSettings.paymentSettings?.squareAppId || ''}
                  onChange={(e) =>
                    setFormSettings({
                      ...formSettings,
                      paymentSettings: {
                        ...formSettings.paymentSettings!,
                        squareAppId: e.target.value,
                      },
                    })
                  }
                  placeholder='sq0idp-XXXXXXXXXXXX'
                />
                <Form.Text className='text-muted'>
                  Get this from your Square Developer Dashboard
                </Form.Text>
              </Form.Group>

              <Form.Group className='mb-3'>
                <Form.Label>Square Location ID</Form.Label>
                <Form.Control
                  type='text'
                  value={formSettings.paymentSettings?.squareLocationId || ''}
                  onChange={(e) =>
                    setFormSettings({
                      ...formSettings,
                      paymentSettings: {
                        ...formSettings.paymentSettings!,
                        squareLocationId: e.target.value,
                      },
                    })
                  }
                  placeholder='XXXXXXXXXXXX'
                />
                <Form.Text className='text-muted'>
                  Get this from your Square Developer Dashboard
                </Form.Text>
              </Form.Group>

              <Form.Group className='mb-3'>
                <Form.Check
                  type='checkbox'
                  label='Sandbox Mode (for testing)'
                  checked={formSettings.paymentSettings?.sandboxMode || false}
                  onChange={(e) =>
                    setFormSettings({
                      ...formSettings,
                      paymentSettings: {
                        ...formSettings.paymentSettings!,
                        sandboxMode: e.target.checked,
                      },
                    })
                  }
                />
                <Form.Text className='text-muted'>
                  Use sandbox credentials for testing payments
                </Form.Text>
              </Form.Group>

              <Form.Group className='mb-3'>
                <Form.Label>Default Currency</Form.Label>
                <Form.Control
                  as='select'
                  value={formSettings.paymentSettings?.currency || 'USD'}
                  onChange={(e) =>
                    setFormSettings({
                      ...formSettings,
                      paymentSettings: {
                        ...formSettings.paymentSettings!,
                        currency: e.target.value,
                      },
                    })
                  }
                >
                  <option value='USD'>USD</option>
                  <option value='EUR'>EUR</option>
                  <option value='GBP'>GBP</option>
                  <option value='CAD'>CAD</option>
                  <option value='AUD'>AUD</option>
                </Form.Control>
              </Form.Group>

              <div className='d-grid gap-2'>
                <Button
                  variant='outline-primary'
                  onClick={() => setShowPaymentTestModal(true)}
                >
                  <CreditCard size={16} className='me-2' />
                  Test Payment Integration
                </Button>
              </div>
            </Tab>

            <Tab eventKey='access' title='Access'>
              <Form.Group className='mb-3'>
                <Form.Label>Allowed Roles</Form.Label>
                <div>
                  {['admin', 'user', 'guest'].map((role) => (
                    <Form.Check
                      key={role}
                      type='checkbox'
                      inline
                      label={role}
                      checked={
                        formSettings.allowedRoles?.includes(role) || false
                      }
                      onChange={(e) => {
                        const allowedRoles = formSettings.allowedRoles || [];
                        if (e.target.checked) {
                          setFormSettings({
                            ...formSettings,
                            allowedRoles: [...allowedRoles, role],
                          });
                        } else {
                          setFormSettings({
                            ...formSettings,
                            allowedRoles: allowedRoles.filter(
                              (r) => r !== role,
                            ),
                          });
                        }
                      }}
                    />
                  ))}
                </div>
                <Form.Text className='text-muted'>
                  Leave all unchecked to allow everyone
                </Form.Text>
              </Form.Group>

              <Form.Group className='mb-3'>
                <Form.Check
                  type='checkbox'
                  label='Password protect this form'
                  checked={formSettings.passwordProtected || false}
                  onChange={(e) =>
                    setFormSettings({
                      ...formSettings,
                      passwordProtected: e.target.checked,
                    })
                  }
                />
              </Form.Group>

              {formSettings.passwordProtected && (
                <Form.Group className='mb-3'>
                  <Form.Label>Form Password</Form.Label>
                  <Form.Control
                    type='password'
                    value={formSettings.formPassword || ''}
                    onChange={(e) =>
                      setFormSettings({
                        ...formSettings,
                        formPassword: e.target.value,
                      })
                    }
                  />
                </Form.Group>
              )}
            </Tab>

            <Tab eventKey='appearance' title='Appearance'>
              <Form.Group className='mb-3'>
                <Form.Label>Submit Button Background Color</Form.Label>
                <InputGroup>
                  <Form.Control
                    type='color'
                    value={
                      formSettings.submitButtonStyle?.backgroundColor ||
                      '#594230'
                    }
                    onChange={(e) =>
                      setFormSettings({
                        ...formSettings,
                        submitButtonStyle: {
                          ...formSettings.submitButtonStyle,
                          backgroundColor: e.target.value,
                        },
                      })
                    }
                  />
                  <Form.Control
                    value={
                      formSettings.submitButtonStyle?.backgroundColor ||
                      '#594230'
                    }
                    onChange={(e) =>
                      setFormSettings({
                        ...formSettings,
                        submitButtonStyle: {
                          ...formSettings.submitButtonStyle,
                          backgroundColor: e.target.value,
                        },
                      })
                    }
                  />
                </InputGroup>
              </Form.Group>

              <Form.Group className='mb-3'>
                <Form.Label>Submit Button Text Color</Form.Label>
                <InputGroup>
                  <Form.Control
                    type='color'
                    value={
                      formSettings.submitButtonStyle?.textColor || '#ffffff'
                    }
                    onChange={(e) =>
                      setFormSettings({
                        ...formSettings,
                        submitButtonStyle: {
                          ...formSettings.submitButtonStyle,
                          textColor: e.target.value,
                        },
                      })
                    }
                  />
                  <Form.Control
                    value={
                      formSettings.submitButtonStyle?.textColor || '#ffffff'
                    }
                    onChange={(e) =>
                      setFormSettings({
                        ...formSettings,
                        submitButtonStyle: {
                          ...formSettings.submitButtonStyle,
                          textColor: e.target.value,
                        },
                      })
                    }
                  />
                </InputGroup>
              </Form.Group>
            </Tab>
          </Tabs>
        </Modal.Body>
        <Modal.Footer>
          <Button variant='secondary' onClick={() => setShowSettings(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    );
  };

  const renderPaymentTestModal = (): JSX.Element => {
    return (
      <Modal
        show={showPaymentTestModal}
        onHide={() => setShowPaymentTestModal(false)}
      >
        <Modal.Header closeButton>
          <Modal.Title>Test Payment Integration</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            This will test the Square payment integration with a $1.00 test
            charge. Make sure you're using sandbox credentials.
          </p>
          <div className='alert alert-info'>
            <strong>Test Card:</strong> 4111 1111 1111 1111
            <br />
            <strong>Expiration:</strong> Any future date
            <br />
            <strong>CVV:</strong> 111
            <br />
            <strong>ZIP:</strong> 94103
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant='secondary'
            onClick={() => setShowPaymentTestModal(false)}
          >
            Cancel
          </Button>
          <Button variant='primary' onClick={testPaymentIntegration}>
            Run Test
          </Button>
        </Modal.Footer>
      </Modal>
    );
  };

  const renderEmbedModal = (): JSX.Element => {
    return (
      <Modal
        show={showEmbedModal}
        onHide={() => setShowEmbedModal(false)}
        size='lg'
      >
        <Modal.Header closeButton>
          <Modal.Title>Embed Form</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Tabs defaultActiveKey='iframe' className='mb-3'>
            <Tab eventKey='iframe' title='iFrame'>
              <Form.Group className='mb-3'>
                <Form.Label>iFrame Embed Code</Form.Label>
                <Form.Control
                  as='textarea'
                  rows={4}
                  value={embedCode.html}
                  readOnly
                />
              </Form.Group>
              <p className='text-muted'>
                Copy and paste this code into your HTML where you want the form
                to appear.
              </p>
            </Tab>

            <Tab eventKey='shortcode' title='Shortcode'>
              <Form.Group className='mb-3'>
                <Form.Label>Shortcode</Form.Label>
                <Form.Control
                  type='text'
                  value={embedCode.shortcode}
                  readOnly
                />
              </Form.Group>
              <p className='text-muted'>
                Use this shortcode in your content management system or page
                builder.
              </p>
            </Tab>

            <Tab eventKey='direct' title='Direct Link'>
              <Form.Group className='mb-3'>
                <Form.Label>Direct URL</Form.Label>
                <Form.Control
                  type='text'
                  value={embedCode.directUrl}
                  readOnly
                />
              </Form.Group>
              <p className='text-muted'>Link directly to the form page.</p>
            </Tab>
          </Tabs>
        </Modal.Body>
        <Modal.Footer>
          <Button variant='secondary' onClick={() => setShowEmbedModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    );
  };

  // ========== RENDER TOURNAMENT SETTINGS ==========
  const renderTournamentSettings = (): JSX.Element => {
    return (
      <Card className='mb-4'>
        <Card.Header>
          <div className='d-flex align-items-center'>
            <Form.Check
              type='switch'
              id='tournament-toggle'
              label={
                <span className='fw-bold'>
                  This form is for tournament ticket purchases
                </span>
              }
              checked={isTournamentForm}
              onChange={(e) => {
                const newValue = e.target.checked;
                setIsTournamentForm(newValue);
                if (!newValue) {
                  setTournamentSettings({
                    startDate: '',
                    endDate: '',
                    startTime: '',
                    endTime: '',
                    isRefundable: false,
                    refundPolicy: '',
                    ticketCheckMethod: 'qr',
                    customCheckMethod: '',
                    venues: [],
                    showScheduleTable: true,
                  });
                }
              }}
            />
          </div>
        </Card.Header>

        {isTournamentForm && (
          <Card.Body>
            <h5 className='mb-3'>
              <Award size={20} className='me-2' />
              Tournament Details
            </h5>

            {/* Tournament Dates & Times */}
            <Row className='mb-3'>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>
                    <CalendarIcon size={16} className='me-2' />
                    Tournament Start Date *
                  </Form.Label>
                  <Form.Control
                    type='date'
                    value={tournamentSettings.startDate}
                    onChange={(e) =>
                      setTournamentSettings({
                        ...tournamentSettings,
                        startDate: e.target.value,
                      })
                    }
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>
                    <CalendarIcon size={16} className='me-2' />
                    Tournament End Date *
                  </Form.Label>
                  <Form.Control
                    type='date'
                    value={tournamentSettings.endDate}
                    onChange={(e) =>
                      setTournamentSettings({
                        ...tournamentSettings,
                        endDate: e.target.value,
                      })
                    }
                    required
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row className='mb-3'>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>
                    <Clock size={16} className='me-2' />
                    Daily Start Time
                  </Form.Label>
                  <Form.Control
                    type='time'
                    value={tournamentSettings.startTime}
                    onChange={(e) =>
                      setTournamentSettings({
                        ...tournamentSettings,
                        startTime: e.target.value,
                      })
                    }
                  />
                  <Form.Text className='text-muted'>
                    Default start time for tournament days
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>
                    <Clock size={16} className='me-2' />
                    Daily End Time
                  </Form.Label>
                  <Form.Control
                    type='time'
                    value={tournamentSettings.endTime}
                    onChange={(e) =>
                      setTournamentSettings({
                        ...tournamentSettings,
                        endTime: e.target.value,
                      })
                    }
                  />
                  <Form.Text className='text-muted'>
                    Default end time for tournament days
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>

            {/* Ticket Policies */}
            <Row className='mb-3'>
              <Col md={6}>
                <Form.Group>
                  <Form.Check
                    type='checkbox'
                    label={
                      <>
                        <RefreshCw size={16} className='me-2' />
                        Tickets are refundable
                      </>
                    }
                    checked={tournamentSettings.isRefundable}
                    onChange={(e) =>
                      setTournamentSettings({
                        ...tournamentSettings,
                        isRefundable: e.target.checked,
                      })
                    }
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>
                    <CheckCircle size={16} className='me-2' />
                    Ticket Check Method
                  </Form.Label>
                  <Form.Select
                    value={tournamentSettings.ticketCheckMethod}
                    onChange={(e) =>
                      setTournamentSettings({
                        ...tournamentSettings,
                        ticketCheckMethod: e.target
                          .value as TournamentSettings['ticketCheckMethod'],
                      })
                    }
                  >
                    <option value='qr'>QR Code Scanning</option>
                    <option value='email'>Email</option>
                    <option value='manual'>Manual Check</option>
                    <option value='name-list'>Name List Verification</option>
                    <option value='other'>Other Method</option>
                  </Form.Select>
                  {tournamentSettings.ticketCheckMethod === 'other' && (
                    <Form.Control
                      type='text'
                      className='mt-2'
                      placeholder='Specify ticket check method'
                      value={tournamentSettings.customCheckMethod}
                      onChange={(e) =>
                        setTournamentSettings({
                          ...tournamentSettings,
                          customCheckMethod: e.target.value,
                        })
                      }
                    />
                  )}
                </Form.Group>
              </Col>
            </Row>

            {tournamentSettings.isRefundable && (
              <Form.Group className='mb-4'>
                <Form.Label>Refund Policy</Form.Label>
                <Form.Control
                  as='textarea'
                  rows={3}
                  placeholder="Describe your refund policy (e.g., 'Full refund up to 7 days before event, 50% refund up to 3 days before event')"
                  value={tournamentSettings.refundPolicy}
                  onChange={(e) =>
                    setTournamentSettings({
                      ...tournamentSettings,
                      refundPolicy: e.target.value,
                    })
                  }
                />
              </Form.Group>
            )}

            <Form.Group className='mb-3'>
              <Form.Check
                type='checkbox'
                label={
                  <span className='fw-bold'>
                    Show tabular venue schedule to users
                  </span>
                }
                checked={tournamentSettings.showScheduleTable}
                onChange={(e) =>
                  setTournamentSettings({
                    ...tournamentSettings,
                    showScheduleTable: e.target.checked,
                  })
                }
              />
              <Form.Text className='text-muted'>
                When checked, users will see a detailed schedule table. When
                unchecked, only the primary venue and tournament dates will be
                shown.
              </Form.Text>
            </Form.Group>

            {/* Venues Section */}
            <div className='mb-4'>
              <div className='d-flex justify-content-between align-items-center mb-3'>
                <h6>
                  <Map size={16} className='me-2' />
                  Venues & Schedule
                </h6>
                <Button variant='outline-primary' size='sm' onClick={addVenue}>
                  <Plus size={16} className='me-2' />
                  Add Venue
                </Button>
              </div>

              {tournamentSettings.venues.length === 0 ? (
                <Alert variant='info'>
                  <MapPin size={16} className='me-2' />
                  No venues added yet. Add venues to specify different locations
                  and schedules for each tournament day.
                </Alert>
              ) : (
                tournamentSettings.venues.map((venue, index) => (
                  <Card
                    key={index}
                    className={`mb-3 ${
                      venue.isPrimary ? 'border-primary' : 'border-secondary'
                    }`}
                  >
                    <Card.Body>
                      <div className='d-flex justify-content-between align-items-center mb-3'>
                        <div className='d-flex align-items-center'>
                          <Badge
                            bg={venue.isPrimary ? 'primary' : 'secondary'}
                            className='me-2'
                          >
                            {venue.isPrimary
                              ? 'Primary Venue'
                              : 'Secondary Venue'}
                          </Badge>
                          <h6 className='mb-0'>Venue {index + 1}</h6>
                        </div>
                        <div>
                          {!venue.isPrimary &&
                            tournamentSettings.venues.length > 1 && (
                              <Button
                                variant='outline-primary'
                                size='sm'
                                className='me-2'
                                onClick={() => setPrimaryVenue(index)}
                              >
                                Set as Primary
                              </Button>
                            )}
                          <Button
                            variant='outline-danger'
                            size='sm'
                            onClick={() => removeVenue(index)}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>

                      <Row>
                        <Col md={6}>
                          <Form.Group className='mb-3'>
                            <Form.Label>Venue Name *</Form.Label>
                            <Form.Control
                              type='text'
                              placeholder='e.g., Main Stadium, Court 1, Convention Center'
                              value={venue.venueName}
                              onChange={(e) =>
                                updateVenue(index, 'venueName', e.target.value)
                              }
                              required
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className='mb-3'>
                            <Form.Label>Date for this venue *</Form.Label>
                            <Form.Control
                              type='date'
                              value={venue.date}
                              onChange={(e) =>
                                updateVenue(index, 'date', e.target.value)
                              }
                              min={tournamentSettings.startDate}
                              max={tournamentSettings.endDate}
                              required
                            />
                          </Form.Group>
                        </Col>
                      </Row>

                      <Row className='mb-3'>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label>Start Time</Form.Label>
                            <Form.Control
                              type='time'
                              value={venue.startTime}
                              onChange={(e) =>
                                updateVenue(index, 'startTime', e.target.value)
                              }
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label>End Time</Form.Label>
                            <Form.Control
                              type='time'
                              value={venue.endTime}
                              onChange={(e) =>
                                updateVenue(index, 'endTime', e.target.value)
                              }
                            />
                          </Form.Group>
                        </Col>
                      </Row>

                      <Form.Group className='mb-3'>
                        <Form.Label>Full Address *</Form.Label>
                        <Form.Control
                          type='text'
                          placeholder='e.g., 123 Main St, City, State ZIP, Country'
                          value={venue.fullAddress}
                          onChange={(e) =>
                            updateVenue(index, 'fullAddress', e.target.value)
                          }
                          required
                        />
                        <Form.Text className='text-muted'>
                          This will be displayed to ticket purchasers
                        </Form.Text>
                      </Form.Group>

                      <h6 className='mb-3'>Address Details (Optional)</h6>
                      <Row>
                        <Col md={8}>
                          <Form.Group className='mb-3'>
                            <Form.Label>Street Address</Form.Label>
                            <Form.Control
                              type='text'
                              placeholder='123 Main Street'
                              value={venue.address}
                              onChange={(e) =>
                                updateVenue(index, 'address', e.target.value)
                              }
                            />
                          </Form.Group>
                        </Col>
                        <Col md={4}>
                          <Form.Group className='mb-3'>
                            <Form.Label>City</Form.Label>
                            <Form.Control
                              type='text'
                              placeholder='City'
                              value={venue.city}
                              onChange={(e) =>
                                updateVenue(index, 'city', e.target.value)
                              }
                            />
                          </Form.Group>
                        </Col>
                      </Row>

                      <Row>
                        <Col md={4}>
                          <Form.Group className='mb-3'>
                            <Form.Label>State/Province</Form.Label>
                            <Form.Control
                              type='text'
                              placeholder='State'
                              value={venue.state}
                              onChange={(e) =>
                                updateVenue(index, 'state', e.target.value)
                              }
                            />
                          </Form.Group>
                        </Col>
                        <Col md={4}>
                          <Form.Group className='mb-3'>
                            <Form.Label>ZIP/Postal Code</Form.Label>
                            <Form.Control
                              type='text'
                              placeholder='12345'
                              value={venue.zipCode}
                              onChange={(e) =>
                                updateVenue(index, 'zipCode', e.target.value)
                              }
                            />
                          </Form.Group>
                        </Col>
                        <Col md={4}>
                          <Form.Group className='mb-3'>
                            <Form.Label>Country</Form.Label>
                            <Form.Control
                              type='text'
                              placeholder='Country'
                              value={venue.country}
                              onChange={(e) =>
                                updateVenue(index, 'country', e.target.value)
                              }
                            />
                          </Form.Group>
                        </Col>
                      </Row>

                      <Form.Group>
                        <Form.Label>Additional Information</Form.Label>
                        <Form.Control
                          as='textarea'
                          rows={2}
                          placeholder='Parking instructions, special access, nearest landmarks, etc.'
                          value={venue.additionalInfo}
                          onChange={(e) =>
                            updateVenue(index, 'additionalInfo', e.target.value)
                          }
                        />
                      </Form.Group>
                    </Card.Body>
                  </Card>
                ))
              )}
            </div>
          </Card.Body>
        )}
      </Card>
    );
  };

  const renderPreview = (): JSX.Element => {
    return (
      <Modal
        show={showPreview}
        onHide={() => setShowPreview(false)}
        size='xl'
        fullscreen='lg-down'
        scrollable // Add this prop to make modal scrollable
      >
        <Modal.Header closeButton>
          <Modal.Title>Form Preview - What Users Will See</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div
            className='form-container'
            style={{ maxWidth: '800px', margin: '0 auto' }}
          >
            <h3>{formTitle}</h3>
            {formDescription && <p className='text-muted'>{formDescription}</p>}

            {/* Tournament Info - Matching FormEmbed Exactly */}
            {renderTournamentInfoPreview()}

            {/* Form Fields - Matching FormEmbed's Structure */}
            <div className='preview-fields'>
              {formFields
                .filter((field) => field.type !== 'payment')
                .sort((a, b) => a.order - b.order)
                .map((field) => renderPreviewField(field))}
            </div>

            {/* Payment Section - Matching FormEmbed */}
            {formFields.some((field) => field.type === 'payment') && (
              <div className='payment-section-preview mt-4'>
                <h5 className='mb-2'>Payment Information</h5>
                {formFields
                  .filter((field) => field.type === 'payment')
                  .map((field) => renderPaymentFieldPreview(field))}
              </div>
            )}

            {/* Submit Button - Matching FormEmbed's Style */}
            <button
              type='button'
              className='btn btn-primary mt-4'
              style={{
                backgroundColor:
                  formSettings.submitButtonStyle?.backgroundColor,
                color: formSettings.submitButtonStyle?.textColor,
                padding: '10px 30px',
                fontSize: '16px',
              }}
              onClick={() => alert('Preview Mode: Form submission is disabled')}
            >
              {formSettings.submitText}
            </button>

            {/* Preview Notice */}
            <div className='alert alert-info mt-4'>
              <strong>Preview Mode:</strong> This shows exactly what users will
              see. Form submission and payment processing are disabled in
              preview.
            </div>
          </div>
        </Modal.Body>
      </Modal>
    );
  };

  // Tournament Info Preview - Matching FormEmbed exactly
  const renderTournamentInfoPreview = (): JSX.Element | null => {
    if (
      !isTournamentForm ||
      !tournamentSettings ||
      tournamentSettings.venues.length === 0
    ) {
      return null;
    }

    const formatDate = (dateString: string) => {
      if (!dateString) return '';
      try {
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
          const [year, month, day] = dateString.split('-').map(Number);
          const date = new Date(year, month - 1, day);
          return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });
        }

        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
          const timezoneOffset = date.getTimezoneOffset() * 60000;
          const correctedDate = new Date(date.getTime() + timezoneOffset);
          return correctedDate.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });
        }
        return dateString;
      } catch (e) {
        return dateString;
      }
    };

    const formatTime = (timeString: string) => {
      if (!timeString) return '';
      try {
        const [hours, minutes] = timeString.split(':');
        const hour = parseInt(hours);
        const suffix = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${minutes.padStart(2, '0')} ${suffix}`;
      } catch (e) {
        return timeString;
      }
    };

    const sortedVenues = [...tournamentSettings.venues]
      .filter((venue) => venue.date)
      .sort((a, b) => {
        try {
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        } catch (e) {
          return 0;
        }
      });

    const primaryVenue =
      tournamentSettings.venues.find((v) => v.isPrimary) ||
      tournamentSettings.venues[0];

    return (
      <div className='tournament-info mb-4 p-3 border rounded bg-light'>
        <h4 className='mb-4'>
          <Award size={20} className='me-2' />
          Tournament Information
        </h4>

        <Row>
          <Col md={7}>
            <div className='mb-2'>
              <strong>
                <CalendarIcon size={16} className='me-2' />
                Tournament Dates:
              </strong>
              <div className='mt-1'>
                {formatDate(tournamentSettings.startDate)} -{' '}
                {formatDate(tournamentSettings.endDate)}
              </div>
            </div>

            {tournamentSettings.startTime && tournamentSettings.endTime && (
              <div className='mb-2'>
                <strong>
                  <Clock size={16} className='me-2' />
                  Daily Schedule:
                </strong>
                <div className='mt-1'>
                  {formatTime(tournamentSettings.startTime)} -{' '}
                  {formatTime(tournamentSettings.endTime)}
                </div>
              </div>
            )}

            {/* Primary Venue Information */}
            {primaryVenue && primaryVenue.venueName && (
              <div className='mb-2'>
                <div>
                  <div>
                    <MapPin size={16} className='me-2' />{' '}
                    <strong>{primaryVenue.venueName}</strong>
                  </div>
                  <div>
                    {primaryVenue.fullAddress ||
                      `${primaryVenue.address}, ${primaryVenue.city}, ${primaryVenue.state} ${primaryVenue.zipCode}`}
                  </div>
                  {primaryVenue.additionalInfo && (
                    <div className='text-muted mt-1'>
                      {primaryVenue.additionalInfo}
                    </div>
                  )}
                </div>
              </div>
            )}
          </Col>

          <Col md={5}>
            <div className='mb-2'>
              <strong>
                <CheckCircle size={16} className='me-2' />
                Ticket Check Method:
              </strong>
              <div className='mt-1'>
                {tournamentSettings.ticketCheckMethod === 'other'
                  ? tournamentSettings.customCheckMethod
                  : tournamentSettings.ticketCheckMethod
                      .charAt(0)
                      .toUpperCase() +
                    tournamentSettings.ticketCheckMethod
                      .slice(1)
                      .replace('-', ' ')}
              </div>
            </div>

            {/* Show refund policy ONLY if tickets are refundable AND a policy exists */}
            {tournamentSettings.isRefundable &&
              tournamentSettings.refundPolicy &&
              tournamentSettings.refundPolicy.trim() !== '' && (
                <div className='mb-2'>
                  <strong>
                    <RefreshCw size={16} className='me-2' />
                    Refund Policy:
                  </strong>
                  <div className='mt-1'>{tournamentSettings.refundPolicy}</div>
                </div>
              )}
          </Col>
        </Row>

        {/* Venues Schedule Table - only show if showScheduleTable is true */}
        {tournamentSettings.showScheduleTable !== false &&
          sortedVenues.length > 0 && (
            <div className='mt-3'>
              <h6>
                <Map size={16} className='me-2' />
                Venue Schedule:
              </h6>
              <div className='table-responsive mt-2'>
                <table className='table table-sm table-bordered'>
                  <thead className='table-light'>
                    <tr>
                      <th>Date</th>
                      <th>Venue</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedVenues.map((venue, index) => (
                      <tr key={index}>
                        <td>
                          {formatDate(venue.date)}
                          {venue.isPrimary && (
                            <Badge bg='primary' className='ms-2'>
                              Primary
                            </Badge>
                          )}
                        </td>
                        <td>{venue.venueName}</td>
                        <td>
                          {venue.startTime && venue.endTime
                            ? `${formatTime(venue.startTime)} - ${formatTime(
                                venue.endTime,
                              )}`
                            : 'All day'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
      </div>
    );
  };

  const renderPreviewField = (field: FormField): JSX.Element => {
    const commonProps = {
      className: 'form-control',
      placeholder: field.placeholder || '',
      disabled: true, // Disabled in preview
      style: { backgroundColor: '#f8f9fa', cursor: 'not-allowed' },
    };

    switch (field.type) {
      case 'text':
      case 'email':
      case 'number':
      case 'tel':
      case 'url':
      case 'password':
        return (
          <div className='mb-3' key={field.id}>
            <label className='form-label'>
              {field.label}
              {field.required && <span className='text-danger ms-1'>*</span>}
            </label>
            <input
              type={field.type}
              {...commonProps}
              value={field.defaultValue || ''}
              readOnly
            />
            {field.helpText && (
              <div className='form-text text-muted'>{field.helpText}</div>
            )}
          </div>
        );

      case 'textarea':
        return (
          <div className='mb-3' key={field.id}>
            <label className='form-label'>
              {field.label}
              {field.required && <span className='text-danger ms-1'>*</span>}
            </label>
            <textarea
              {...commonProps}
              rows={field.style?.rows || 4}
              value={field.defaultValue || ''}
              readOnly
            />
            {field.helpText && (
              <div className='form-text text-muted'>{field.helpText}</div>
            )}
          </div>
        );

      case 'select':
        return (
          <div className='mb-3' key={field.id}>
            <label className='form-label'>
              {field.label}
              {field.required && <span className='text-danger ms-1'>*</span>}
            </label>
            <select
              className='form-select'
              disabled
              style={{ backgroundColor: '#f8f9fa', cursor: 'not-allowed' }}
            >
              <option value=''>
                {field.placeholder || 'Select an option'}
              </option>
              {(field.options || []).map((option, index) => (
                <option
                  key={index}
                  value={option.value}
                  selected={option.selected}
                >
                  {option.label}
                </option>
              ))}
            </select>
            {field.helpText && (
              <div className='form-text text-muted'>{field.helpText}</div>
            )}
          </div>
        );

      case 'radio':
        return (
          <div className='mb-3' key={field.id}>
            <label className='form-label'>
              {field.label}
              {field.required && <span className='text-danger ms-1'>*</span>}
            </label>
            <div>
              {(field.options || []).map((option, index) => (
                <div className='form-check' key={index}>
                  <input
                    type='radio'
                    className='form-check-input'
                    name={field.name}
                    value={option.value}
                    disabled
                    checked={option.selected}
                    readOnly
                  />
                  <label className='form-check-label'>{option.label}</label>
                </div>
              ))}
            </div>
            {field.helpText && (
              <div className='form-text text-muted'>{field.helpText}</div>
            )}
          </div>
        );

      case 'checkbox':
        return (
          <div className='mb-3' key={field.id}>
            <div className='form-check'>
              <input
                type='checkbox'
                className='form-check-input'
                disabled
                checked={field.defaultValue === true}
                readOnly
              />
              <label className='form-check-label'>
                {field.label}
                {field.required && <span className='text-danger ms-1'>*</span>}
              </label>
            </div>
            {field.helpText && (
              <div className='form-text text-muted'>{field.helpText}</div>
            )}
          </div>
        );

      case 'date':
        return (
          <div className='mb-3' key={field.id}>
            <label className='form-label'>
              {field.label}
              {field.required && <span className='text-danger ms-1'>*</span>}
            </label>
            <input
              type='date'
              className='form-control'
              disabled
              style={{ backgroundColor: '#f8f9fa', cursor: 'not-allowed' }}
              value={field.defaultValue || ''}
              readOnly
            />
            {field.helpText && (
              <div className='form-text text-muted'>{field.helpText}</div>
            )}
          </div>
        );

      case 'file':
        return (
          <div className='mb-3' key={field.id}>
            <label className='form-label'>
              {field.label}
              {field.required && <span className='text-danger ms-1'>*</span>}
            </label>
            <input
              type='file'
              className='form-control'
              disabled
              style={{ backgroundColor: '#f8f9fa', cursor: 'not-allowed' }}
            />
            {field.fileConfig?.maxSize && (
              <div className='form-text text-muted'>
                Maximum file size:{' '}
                {(field.fileConfig.maxSize / 1048576).toFixed(1)} MB
              </div>
            )}
            {field.helpText && (
              <div className='form-text text-muted'>{field.helpText}</div>
            )}
          </div>
        );

      case 'section':
        return (
          <div className='border-bottom pb-2 mb-3' key={field.id}>
            <h4>{field.label}</h4>
            {field.helpText && <p className='text-muted'>{field.helpText}</p>}
          </div>
        );

      case 'heading':
        return (
          <h5 className='mb-3' key={field.id}>
            {field.label}
          </h5>
        );

      case 'divider':
        return <hr className='my-4' key={field.id} />;

      default:
        return <div key={field.id} />;
    }
  };

  // Payment field preview matching FormEmbed
  const renderPaymentFieldPreview = (field: FormField): JSX.Element => {
    const paymentConfig = ensurePaymentConfig(field.paymentConfig);
    const hasPackages = paymentConfig.pricingPackages.length > 0;
    const packages = paymentConfig.pricingPackages;

    const defaultPackage =
      packages.find((pkg) => pkg.defaultSelected) ||
      (packages.length > 0 ? packages[0] : undefined);

    const totalAmount = defaultPackage
      ? defaultPackage.price * (defaultPackage.quantity || 1)
      : paymentConfig.amount || 0;

    const currency = paymentConfig.currency;

    const isSandbox =
      paymentConfig.sandboxMode ||
      formSettings.paymentSettings?.sandboxMode ||
      paymentConfig.squareAppId?.includes('sandbox-');

    return (
      <div className='mb-4' key={field.id}>
        <h6 className='mb-3'>{field.label}</h6>

        {/* Pricing Packages Section */}
        {hasPackages && (
          <div className='mb-4'>
            <h6>Select Payment Option</h6>
            <div className='row'>
              {packages
                .filter((pkg) => pkg.isEnabled !== false)
                .map((pkg, index) => (
                  <div key={index} className='col-md-4 mb-3'>
                    <div className='card border'>
                      <div className='card-body text-center'>
                        <h5 className='card-title'>{pkg.name}</h5>
                        {pkg.description && (
                          <p className='card-text text-muted'>
                            {pkg.description}
                          </p>
                        )}
                        <h3>${(pkg.price / 100).toFixed(2)}</h3>

                        {/* Quantity selector */}
                        <div className='mt-3'>
                          <label className='form-label'>Quantity</label>
                          <div className='d-flex align-items-center justify-content-center'>
                            <button
                              className='btn btn-outline-secondary btn-sm'
                              disabled
                              style={{ width: '30px' }}
                            >
                              -
                            </button>
                            <div
                              className='mx-2'
                              style={{ width: '50px', padding: '5px' }}
                            >
                              {pkg.quantity || 1}
                            </div>
                            <button
                              className='btn btn-outline-secondary btn-sm'
                              disabled
                              style={{ width: '30px' }}
                            >
                              +
                            </button>
                          </div>
                          {pkg.maxQuantity && (
                            <small className='text-muted'>
                              Max: {pkg.maxQuantity}
                            </small>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Payment Summary */}
        <div className='card mb-4'>
          <div className='card-body'>
            <h6>Payment Summary</h6>
            {hasPackages && defaultPackage ? (
              <>
                <div className='d-flex justify-content-between mb-2'>
                  <span>Item:</span>
                  <span>{defaultPackage.name}</span>
                </div>
                <div className='d-flex justify-content-between mb-2'>
                  <span>Unit Price:</span>
                  <span>${(defaultPackage.price / 100).toFixed(2)}</span>
                </div>
                <div className='d-flex justify-content-between mb-2'>
                  <span>Quantity:</span>
                  <span>{defaultPackage.quantity || 1}</span>
                </div>
              </>
            ) : (
              <div className='d-flex justify-content-between mb-2'>
                <span>Description:</span>
                <span>{paymentConfig.description}</span>
              </div>
            )}
            <div className='d-flex justify-content-between border-top pt-2'>
              <strong>Total Amount:</strong>
              <strong>
                ${(totalAmount / 100).toFixed(2)} {currency}
              </strong>
            </div>
          </div>
        </div>

        {/* Square Payment Form Preview */}
        <div className='card mb-4'>
          <div className='card-body'>
            <h6 className='card-title'>Payment Details</h6>
            <div
              className='border p-3 rounded text-center'
              style={{ backgroundColor: '#f8f9fa' }}
            >
              <div className='mb-3'>
                <small className='text-muted d-block mb-1'>Card number</small>
                <div
                  className='border-bottom py-2'
                  style={{ color: '#6c757d' }}
                >
                  •••• •••• •••• ••••
                </div>
              </div>
              <div className='row mb-3'>
                <div className='col'>
                  <small className='text-muted d-block mb-1'>MM/YY</small>
                  <div
                    className='border-bottom py-2'
                    style={{ color: '#6c757d' }}
                  >
                    ••/••
                  </div>
                </div>
                <div className='col'>
                  <small className='text-muted d-block mb-1'>CVV</small>
                  <div
                    className='border-bottom py-2'
                    style={{ color: '#6c757d' }}
                  >
                    •••
                  </div>
                </div>
              </div>
              <button
                className='btn btn-secondary'
                disabled
                style={{ width: '100%' }}
              >
                Pay ${(totalAmount / 100).toFixed(2)}
              </button>
            </div>
            {isSandbox && (
              <div className='alert alert-warning mt-3 mb-0'>
                <small>
                  <strong>Sandbox Mode:</strong> This is a preview of the Square
                  payment form using test credentials.
                </small>
              </div>
            )}
          </div>
        </div>

        {field.helpText && (
          <div className='form-text text-muted'>{field.helpText}</div>
        )}
      </div>
    );
  };

  // ========== LOADING STATE ==========
  if (loading) {
    return (
      <Container className='mt-5'>
        <Row className='justify-content-center'>
          <Col md={6} className='text-center'>
            <Spinner animation='border' />
            <p className='mt-3'>Loading forms...</p>
          </Col>
        </Row>
      </Container>
    );
  }

  // ========== MAIN RENDER ==========
  return (
    <div className='page-wrapper'>
      <div className='content content-two'>
        <Container fluid className='py-4'>
          {error && (
            <Alert variant='danger' onClose={() => setError('')} dismissible>
              {error}
            </Alert>
          )}
          {success && (
            <Alert variant='success' onClose={() => setSuccess('')} dismissible>
              {success}
            </Alert>
          )}

          <Row>
            {/* Forms List Sidebar */}
            <Col md={3}>
              <Card className='mb-4'>
                <Card.Header className='d-flex justify-content-between align-items-center'>
                  <h5 className='mb-0'>Forms</h5>
                  <Button size='sm' variant='primary' onClick={createNewForm}>
                    <Plus size={16} /> New
                  </Button>
                </Card.Header>
                <Card.Body style={{ maxHeight: '500px', overflowY: 'auto' }}>
                  <ListGroup variant='flush'>
                    {forms.map((form) => (
                      <ListGroup.Item
                        key={form._id || form.name}
                        as='div'
                        action={false}
                        className='d-flex justify-content-between align-items-center list-group-item-action'
                        style={{
                          cursor: 'pointer',
                          border: 'none',
                          backgroundColor:
                            selectedForm && selectedForm._id === form._id
                              ? '#e9ecef'
                              : 'transparent',
                          padding: '12px 15px',
                        }}
                        onClick={() => loadForm(form)}
                        role='listitem'
                      >
                        <div>
                          <strong>{form.name}</strong>
                          <br />
                          <small className='text-muted'>
                            {form.status === 'published' ? (
                              <Badge bg='success'>Published</Badge>
                            ) : form.status === 'draft' ? (
                              <Badge bg='warning'>Draft</Badge>
                            ) : (
                              <Badge bg='secondary'>Archived</Badge>
                            )}
                            {form.isTournamentForm && (
                              <Badge bg='info' className='ms-1'>
                                <Award size={10} /> Tournament
                              </Badge>
                            )}{' '}
                            • {form.submissions || 0} submissions
                          </small>
                        </div>
                        <div>
                          <Button
                            size='sm'
                            variant='outline-secondary'
                            className='me-1'
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (form._id) duplicateForm(form._id);
                            }}
                            title='Duplicate'
                          >
                            <Copy size={14} />
                          </Button>
                          <Button
                            size='sm'
                            variant='outline-danger'
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (form._id) deleteForm(form._id);
                            }}
                            title='Delete'
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                </Card.Body>
              </Card>

              <Card>
                <Card.Header>
                  <h5 className='mb-0'>Field Types</h5>
                </Card.Header>
                <Card.Body>
                  <Row>
                    {fieldTypes.map((field) => (
                      <Col xs={6} key={field.type} className='mb-2'>
                        <Button
                          variant='outline-primary'
                          size='sm'
                          className='w-100 d-flex align-items-center justify-content-start'
                          onClick={() => addField(field.type)}
                        >
                          <span className='me-2'>{field.icon}</span>
                          {field.label}
                        </Button>
                      </Col>
                    ))}
                  </Row>
                </Card.Body>
              </Card>
            </Col>

            {/* Form Builder Main Area */}
            <Col md={9}>
              <Card>
                <Card.Header className='d-flex justify-content-between align-items-center'>
                  <div>
                    <h4 className='mb-0'>
                      {selectedForm
                        ? `Editing: ${selectedForm.name}`
                        : 'Create New Form'}
                    </h4>
                    {selectedForm?.isTournamentForm && (
                      <Badge bg='info' className='ms-2'>
                        <Award size={12} className='me-1' />
                        Tournament Form
                      </Badge>
                    )}
                  </div>
                  <div>
                    <Button
                      variant='outline-secondary'
                      className='me-2'
                      onClick={() => setShowPreview(true)}
                      disabled={!selectedForm}
                    >
                      <Eye size={16} /> Preview
                    </Button>
                    <Button
                      variant='outline-secondary'
                      className='me-2'
                      onClick={() => setShowSettings(true)}
                      disabled={!selectedForm}
                    >
                      <Settings size={16} /> Settings
                    </Button>
                    <Button
                      variant='outline-primary'
                      className='me-2'
                      onClick={getEmbedCode}
                      disabled={!selectedForm || formStatus !== 'published'}
                    >
                      <Link size={16} /> Embed
                    </Button>
                    <Button
                      variant='primary'
                      onClick={saveForm}
                      disabled={saving}
                    >
                      {saving ? (
                        <>
                          <Spinner
                            size='sm'
                            animation='border'
                            className='me-2'
                          />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save size={16} className='me-2' />
                          Save Form
                        </>
                      )}
                    </Button>
                  </div>
                </Card.Header>

                <Card.Body>
                  {selectedForm ? (
                    <>
                      <Row className='mb-4'>
                        <Col md={6}>
                          <Form.Group className='mb-3'>
                            <Form.Label>Form Name *</Form.Label>
                            <Form.Control
                              type='text'
                              value={formName}
                              onChange={(e) => setFormName(e.target.value)}
                              placeholder='e.g., contact-form, registration-form'
                              required
                            />
                            <Form.Text className='text-muted'>
                              Internal name for reference
                            </Form.Text>
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className='mb-3'>
                            <Form.Label>Status</Form.Label>
                            <Form.Select
                              value={formStatus}
                              onChange={(e) =>
                                setFormStatus(
                                  e.target.value as typeof formStatus,
                                )
                              }
                            >
                              <option value='draft'>Draft</option>
                              <option value='published'>Published</option>
                              <option value='archived'>Archived</option>
                            </Form.Select>
                          </Form.Group>
                        </Col>
                      </Row>

                      <Form.Group className='mb-4'>
                        <Form.Label>Form Title *</Form.Label>
                        <Form.Control
                          type='text'
                          value={formTitle}
                          onChange={(e) => setFormTitle(e.target.value)}
                          placeholder='Form title that users will see'
                          required
                        />
                      </Form.Group>

                      <Form.Group className='mb-4'>
                        <Form.Label>Description</Form.Label>
                        <Form.Control
                          as='textarea'
                          rows={2}
                          value={formDescription}
                          onChange={(e) => setFormDescription(e.target.value)}
                          placeholder='Optional form description'
                        />
                      </Form.Group>

                      {/* Tournament Settings */}
                      {renderTournamentSettings()}

                      <hr />

                      <h5 className='mb-3'>Form Fields</h5>

                      {formFields.length === 0 ? (
                        <div className='text-center py-5 border rounded'>
                          <p className='text-muted'>No fields added yet.</p>
                          <p>
                            Click on a field type from the sidebar to add your
                            first field.
                          </p>
                        </div>
                      ) : (
                        <DragDropContext onDragEnd={onDragEnd}>
                          <Droppable droppableId='form-fields'>
                            {(provided, snapshot) => (
                              <div
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                                className='form-fields-list'
                                style={{
                                  background: snapshot.isDraggingOver
                                    ? 'lightblue'
                                    : 'inherit',
                                  minHeight: '50px',
                                  padding: '8px',
                                  borderRadius: '4px',
                                  transition: 'background-color 0.2s ease',
                                }}
                              >
                                {formFields
                                  .sort((a, b) => a.order - b.order)
                                  .map((field, index) => (
                                    <Draggable
                                      key={field.id}
                                      draggableId={field.id}
                                      index={index}
                                    >
                                      {(provided, snapshot) => {
                                        const hasPaymentPackages =
                                          field.type === 'payment' &&
                                          field.paymentConfig
                                            ?.pricingPackages &&
                                          field.paymentConfig.pricingPackages
                                            .length > 0;

                                        const packageCount =
                                          field.type === 'payment'
                                            ? field.paymentConfig
                                                ?.pricingPackages?.length || 0
                                            : 0;

                                        return (
                                          <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            style={{
                                              ...provided.draggableProps.style,
                                              opacity: snapshot.isDragging
                                                ? 0.7
                                                : 1,
                                              transform: snapshot.isDragging
                                                ? 'rotate(2deg)'
                                                : 'none',
                                            }}
                                            className={`border rounded p-3 mb-3 bg-white draggable-field ${
                                              snapshot.isDragging
                                                ? 'dragging'
                                                : ''
                                            }`}
                                          >
                                            <div className='d-flex justify-content-between align-items-center mb-2'>
                                              <div className='d-flex align-items-center'>
                                                {/* Drag handle */}
                                                <div
                                                  {...provided.dragHandleProps}
                                                  className='drag-handle'
                                                  title='Drag to reorder'
                                                >
                                                  <Move size={14} />
                                                </div>
                                                <span className='me-2'>
                                                  {getFieldIcon(field.type)}
                                                </span>
                                                <strong>{field.label}</strong>
                                                <Badge
                                                  bg='light'
                                                  text='dark'
                                                  className='ms-2'
                                                >
                                                  {field.type}
                                                </Badge>
                                                {field.required && (
                                                  <Badge
                                                    bg='danger'
                                                    className='ms-1'
                                                  >
                                                    Required
                                                  </Badge>
                                                )}
                                                {hasPaymentPackages && (
                                                  <Badge
                                                    bg='info'
                                                    className='ms-1'
                                                  >
                                                    Packages: {packageCount}
                                                  </Badge>
                                                )}
                                              </div>
                                              <div className='d-flex'>
                                                <Button
                                                  size='sm'
                                                  variant='outline-primary'
                                                  className='me-1'
                                                  onClick={() =>
                                                    editField(field)
                                                  }
                                                >
                                                  <Edit2 size={14} />
                                                </Button>
                                                <Button
                                                  size='sm'
                                                  variant='outline-danger'
                                                  onClick={() =>
                                                    removeField(field.id)
                                                  }
                                                >
                                                  <Trash2 size={14} />
                                                </Button>
                                              </div>
                                            </div>

                                            {field.helpText && (
                                              <p className='text-muted mb-0'>
                                                {field.helpText}
                                              </p>
                                            )}

                                            {field.type === 'payment' &&
                                              field.paymentConfig && (
                                                <div className='mt-2'>
                                                  <small className='text-muted'>
                                                    {hasPaymentPackages ? (
                                                      <>
                                                        <DollarSign
                                                          size={12}
                                                          className='me-1'
                                                        />
                                                        {packageCount} pricing
                                                        packages
                                                      </>
                                                    ) : (
                                                      <>
                                                        <DollarSign
                                                          size={12}
                                                          className='me-1'
                                                        />
                                                        Fixed price: $
                                                        {(
                                                          (field.paymentConfig
                                                            .amount || 0) / 100
                                                        ).toFixed(2)}
                                                      </>
                                                    )}
                                                  </small>
                                                </div>
                                              )}
                                          </div>
                                        );
                                      }}
                                    </Draggable>
                                  ))}
                                {provided.placeholder}
                              </div>
                            )}
                          </Droppable>
                        </DragDropContext>
                      )}

                      <div className='mt-4'>
                        <Button
                          variant='outline-success'
                          onClick={() => {
                            const defaultField: FormField = {
                              id: `field_${Date.now()}_${Math.random()
                                .toString(36)
                                .substr(2, 9)}`,
                              type: 'text',
                              label: 'Custom Field',
                              name: `field_custom_${Date.now()}`,
                              required: false,
                              order: formFields.length,
                              placeholder: 'Enter value',
                            };
                            setEditingField(defaultField);
                            setFieldType('text');
                            setShowFieldModal(true);
                          }}
                        >
                          <Plus size={16} className='me-2' />
                          Add Custom Field
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className='text-center py-5'>
                      <h4>Form Builder</h4>
                      <p className='text-muted mb-4'>
                        Create custom forms. Start by clicking on the "Create
                        Form" button.
                      </p>
                      <Button
                        variant='primary'
                        size='lg'
                        onClick={createNewForm}
                      >
                        <Plus size={20} className='me-2' />
                        Create Form
                      </Button>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Modals */}
          {renderFieldEditor()}
          {renderSettingsModal()}
          {renderPaymentTestModal()}
          {renderPreview()}
          {renderEmbedModal()}
        </Container>
      </div>
    </div>
  );
};

export default FormBuilder;
