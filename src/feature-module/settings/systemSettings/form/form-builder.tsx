import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  OverlayTrigger,
  Tooltip,
  Button,
  Badge,
  Spinner,
  Alert,
  Modal,
  Form,
  Row,
  Col,
} from 'react-bootstrap';
import axios from 'axios';
import {
  Form as FormType,
  FormField,
  ApiResponses,
  FieldType,
} from '../../../../types/form';
import LoadingSpinner from '../../../../components/common/LoadingSpinner';
import FormFieldEditor from './FormFieldEditor';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const FormBuilder = () => {
  const [forms, setForms] = useState<FormType[]>([]);
  const [newForm, setNewForm] = useState<Omit<FormType, '_id'>>({
    title: '',
    description: '',
    fields: [],
    status: true,
    tags: [],
  });
  const [editingForm, setEditingForm] = useState<FormType | null>(null);
  const [formToDelete, setFormToDelete] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedField, setSelectedField] = useState<FormField | null>(null);
  const navigate = useNavigate();

  // Load forms from API
  useEffect(() => {
    const fetchForms = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        const response = await axios.get<ApiResponses<FormType[]>>(
          `${API_BASE_URL}/forms`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        setForms(response.data.data || []);
      } catch (err) {
        setError('Failed to load forms');
      } finally {
        setLoading(false);
      }
    };

    fetchForms();
  }, [navigate]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    if (editingForm) {
      setEditingForm({
        ...editingForm,
        [name]: type === 'checkbox' ? checked : value,
      });
    } else {
      setNewForm({
        ...newForm,
        [name]: type === 'checkbox' ? checked : value,
      });
    }
  };

  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const tags = e.target.value
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag);
    if (editingForm) {
      setEditingForm({ ...editingForm, tags });
    } else {
      setNewForm({ ...newForm, tags });
    }
  };

  const addField = (type: FieldType) => {
    const baseField: Omit<FormField, 'type'> & { type: FieldType } = {
      id: `field-${Date.now()}`,
      type,
      label: `${type.charAt(0).toUpperCase() + type.slice(1)} Field`,
      required: false,
    };

    if (type === 'payment') {
      return {
        ...baseField,
        paymentConfig: {
          amount: 0,
          description: '',
          currency: 'USD',
        },
      } as FormField;
    }

    return baseField as FormField;
  };

  const updateField = (updatedField: FormField) => {
    if (editingForm) {
      setEditingForm({
        ...editingForm,
        fields: editingForm.fields.map((f) =>
          f.id === updatedField.id ? updatedField : f
        ),
      });
    } else {
      setNewForm({
        ...newForm,
        fields: newForm.fields.map((f) =>
          f.id === updatedField.id ? updatedField : f
        ),
      });
    }
    setSelectedField(updatedField);
  };

  const removeField = (fieldId: string) => {
    if (editingForm) {
      const updatedFields = editingForm.fields.filter((f) => f.id !== fieldId);
      setEditingForm({
        ...editingForm,
        fields: updatedFields,
      });

      if (selectedField?.id === fieldId) {
        setSelectedField(updatedFields.length > 0 ? updatedFields[0] : null);
      }
    } else {
      const updatedFields = newForm.fields.filter((f) => f.id !== fieldId);
      setNewForm({
        ...newForm,
        fields: updatedFields,
      });

      if (selectedField?.id === fieldId) {
        setSelectedField(updatedFields.length > 0 ? updatedFields[0] : null);
      }
    }
  };

  const moveField = (fromIndex: number, toIndex: number) => {
    const fields = editingForm ? [...editingForm.fields] : [...newForm.fields];
    const [removed] = fields.splice(fromIndex, 1);
    fields.splice(toIndex, 0, removed);

    if (editingForm) {
      setEditingForm({ ...editingForm, fields });
    } else {
      setNewForm({ ...newForm, fields });
    }
  };

  const addForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post<ApiResponses<FormType>>(
        `${API_BASE_URL}/forms`,
        newForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setForms([...forms, response.data.data!]);
      setNewForm({
        title: '',
        description: '',
        fields: [],
        status: true,
        tags: [],
      });
      setShowAddModal(false);
      setSuccessMessage('Form created successfully!');
    } catch (err) {
      setError('Failed to create form');
    } finally {
      setIsSaving(false);
    }
  };

  const saveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingForm) return;
    setIsSaving(true);

    try {
      const token = localStorage.getItem('token');

      // Ensure payment fields have valid configs
      const formToSave = {
        ...editingForm,
        fields: editingForm.fields.map((field) => {
          if (field.type === 'payment') {
            return {
              ...field,
              paymentConfig: {
                amount: Number(field.paymentConfig?.amount) || 0,
                description: field.paymentConfig?.description || '',
                currency: field.paymentConfig?.currency || 'USD',
              },
            };
          }
          return field;
        }),
      };

      const response = await axios.put<ApiResponses<FormType>>(
        `${API_BASE_URL}/forms/${editingForm._id}`,
        formToSave,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setForms(
        forms.map((f) => (f._id === editingForm._id ? response.data.data! : f))
      );
      setShowEditModal(false);
      setSuccessMessage('Form updated successfully!');
    } catch (err) {
      setError('Failed to update form');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formToDelete) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE_URL}/forms/${formToDelete}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setForms(forms.filter((f) => f._id !== formToDelete));
      setShowDeleteModal(false);
      setSuccessMessage('Form deleted successfully!');
    } catch (err) {
      setError('Failed to delete form');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className='page-wrapper'>
      <div className='content content-two'>
        {error && (
          <Alert variant='danger' onClose={() => setError(null)} dismissible>
            {error}
          </Alert>
        )}

        {successMessage && (
          <Alert
            variant='success'
            onClose={() => setSuccessMessage(null)}
            dismissible
          >
            {successMessage}
          </Alert>
        )}

        <div className='d-md-flex d-block align-items-center justify-content-between border-bottom pb-3'>
          <div className='my-auto mb-2'>
            <h3 className='page-title mb-1'>Form Builder</h3>
          </div>
          <div className='d-flex my-xl-auto right-content align-items-center flex-wrap'>
            <OverlayTrigger
              overlay={<Tooltip id='tooltip-top'>Refresh</Tooltip>}
            >
              <Button
                variant='outline-light'
                className='bg-white btn-icon me-1'
                onClick={() => window.location.reload()}
              >
                <i className='ti ti-refresh' />
              </Button>
            </OverlayTrigger>
          </div>
        </div>

        <div className='row'>
          <div className='col-xxl-12 col-xl-12'>
            <div className='flex-fill border-start ps-3'>
              <div className='d-flex align-items-center justify-content-between flex-wrap border-bottom pt-3 mb-3'>
                <div className='mb-3'>
                  <h5 className='mb-1'>Form Templates</h5>
                  <p>Create Form Templates</p>
                </div>
                <div className='mb-3'>
                  <Button
                    variant='outline-light'
                    className='bg-white btn-icon me-2'
                    onClick={() => setShowAddModal(true)}
                  >
                    <i className='ti ti-plus' />
                  </Button>
                </div>
              </div>
              <div className='d-md-flex'>
                <div className='flex-fill'>
                  <div className='card'>
                    <div className='card-body'>
                      {forms.length > 0 ? (
                        <div className='row'>
                          {forms.map((form) => (
                            <div className='col-md-4 mb-3' key={form._id}>
                              <div className='card'>
                                <div className='card-body'>
                                  <div className='d-flex justify-content-between align-items-center'>
                                    <div>
                                      <h5>{form.title}</h5>
                                      <p className='text-muted'>
                                        {form.description}
                                      </p>
                                      <div>
                                        {form.tags.map((tag, i) => (
                                          <Badge
                                            key={i}
                                            bg='light'
                                            text='dark'
                                            className='me-1'
                                          >
                                            {tag}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                    <div>
                                      <Button
                                        variant='outline-light'
                                        className='bg-white btn-icon me-2'
                                        onClick={() => {
                                          setEditingForm(form);
                                          setShowEditModal(true);
                                        }}
                                      >
                                        <i className='ti ti-edit' />
                                      </Button>
                                      <Button
                                        variant='outline-light'
                                        className='bg-white btn-icon'
                                        onClick={() => {
                                          setFormToDelete(form._id!);
                                          setShowDeleteModal(true);
                                        }}
                                      >
                                        <i className='ti ti-trash' />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className='text-center py-4'>
                          <p>No forms found. Create your first form!</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Add Form Modal */}
        <Modal
          show={showAddModal}
          onHide={() => setShowAddModal(false)}
          size='xl'
        >
          <Modal.Header closeButton>
            <Modal.Title>Create New Form</Modal.Title>
          </Modal.Header>
          <Form onSubmit={addForm}>
            <Modal.Body>
              <Row>
                <Col md={4}>
                  <div className='border p-3 rounded mb-3'>
                    <h5 className='mb-2'>Form Fields</h5>
                    <div className='d-grid gap-2'>
                      {[
                        'text',
                        'email',
                        'number',
                        'select',
                        'checkbox',
                        'radio',
                        'payment',
                      ].map((type) => (
                        <Button
                          key={type}
                          variant='secondary'
                          onClick={() => {
                            const newField = addField(type as FieldType);
                            if (editingForm) {
                              setEditingForm({
                                ...editingForm,
                                fields: [...editingForm.fields, newField],
                              });
                            } else {
                              setNewForm({
                                ...newForm,
                                fields: [...newForm.fields, newField],
                              });
                            }
                            setSelectedField(newField);
                          }}
                        >
                          Add {type} field
                        </Button>
                      ))}
                    </div>
                  </div>
                </Col>
                <Col md={8}>
                  <Form.Group className='mb-3'>
                    <Form.Label>Form Title*</Form.Label>
                    <Form.Control
                      type='text'
                      name='title'
                      value={newForm.title}
                      onChange={handleInputChange}
                      required
                    />
                  </Form.Group>
                  <Form.Group className='mb-3'>
                    <Form.Label>Description</Form.Label>
                    <Form.Control
                      as='textarea'
                      name='description'
                      value={newForm.description}
                      onChange={handleInputChange}
                    />
                  </Form.Group>
                  <Form.Group className='mb-3'>
                    <Form.Label>Tags (comma separated)</Form.Label>
                    <Form.Control
                      type='text'
                      name='tags'
                      value={newForm.tags.join(', ')}
                      onChange={handleTagsChange}
                    />
                  </Form.Group>

                  <ul className='list-group mb-3'>
                    {newForm.fields.map((field, index) => (
                      <li
                        key={field.id}
                        className={`list-group-item ${
                          selectedField?.id === field.id ? 'active' : ''
                        }`}
                        onClick={() => setSelectedField(field)}
                      >
                        <div className='d-flex justify-content-between align-items-center'>
                          <span>
                            {field.label} ({field.type})
                          </span>
                          <Button
                            variant='danger'
                            size='sm'
                            onClick={(e) => {
                              e.stopPropagation();
                              removeField(field.id);
                            }}
                          >
                            <i className='ti ti-trash' />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>

                  {selectedField && (
                    <FormFieldEditor
                      field={selectedField}
                      onUpdate={updateField}
                      otherFields={newForm.fields.filter(
                        (f) => f.id !== selectedField.id
                      )}
                    />
                  )}
                </Col>
              </Row>
            </Modal.Body>
            <Modal.Footer>
              <Button
                variant='secondary'
                onClick={() => setShowAddModal(false)}
                className='me-2'
              >
                Cancel
              </Button>
              <Button
                variant='primary'
                type='submit'
                disabled={isSaving || !newForm.title}
              >
                {isSaving ? <Spinner size='sm' /> : 'Create Form'}
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>

        {/* Edit Form Modal */}
        <Modal
          show={showEditModal}
          onHide={() => setShowEditModal(false)}
          size='xl'
        >
          {editingForm && (
            <>
              <Modal.Header closeButton>
                <Modal.Title>Edit Form: {editingForm.title}</Modal.Title>
              </Modal.Header>
              <Form onSubmit={saveForm}>
                <Modal.Body>
                  <Row>
                    <Col md={4}>
                      <div className='border p-3 rounded mb-3'>
                        <h5 className='mb-2'>Form Fields</h5>
                        <div className='d-grid gap-2'>
                          {[
                            'text',
                            'email',
                            'number',
                            'select',
                            'checkbox',
                            'radio',
                            'payment',
                          ].map((type) => (
                            <Button
                              key={type}
                              variant='secondary'
                              onClick={() => {
                                const newField = addField(type as FieldType);
                                if (editingForm) {
                                  setEditingForm({
                                    ...editingForm,
                                    fields: [...editingForm.fields, newField],
                                  });
                                } else {
                                  setNewForm({
                                    ...newForm,
                                    fields: [...newForm.fields, newField],
                                  });
                                }
                                setSelectedField(newField);
                              }}
                            >
                              Add {type} field
                            </Button>
                          ))}
                        </div>
                      </div>
                    </Col>
                    <Col md={8}>
                      <Form.Group className='mb-3'>
                        <Form.Label>Form Title*</Form.Label>
                        <Form.Control
                          type='text'
                          name='title'
                          value={editingForm.title}
                          onChange={handleInputChange}
                          required
                        />
                      </Form.Group>
                      <Form.Group className='mb-3'>
                        <Form.Label>Description</Form.Label>
                        <Form.Control
                          as='textarea'
                          name='description'
                          value={editingForm.description}
                          onChange={handleInputChange}
                        />
                      </Form.Group>
                      <Form.Group className='mb-3'>
                        <Form.Label>Tags (comma separated)</Form.Label>
                        <Form.Control
                          type='text'
                          name='tags'
                          value={editingForm.tags.join(', ')}
                          onChange={handleTagsChange}
                        />
                      </Form.Group>

                      <ul className='list-group mb-3'>
                        {editingForm.fields.map((field, index) => (
                          <li
                            key={field.id}
                            className={`list-group-item ${
                              selectedField?.id === field.id ? 'active' : ''
                            }`}
                            onClick={() => setSelectedField(field)}
                          >
                            <div className='d-flex justify-content-between align-items-center'>
                              <span>
                                {field.label} ({field.type})
                              </span>
                              <div>
                                <Button
                                  variant='danger'
                                  size='sm'
                                  className='me-2'
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeField(field.id);
                                  }}
                                >
                                  <i className='ti ti-trash' />
                                </Button>
                                <Button
                                  variant='light'
                                  size='sm'
                                  className='me-2'
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (index > 0) moveField(index, index - 1);
                                  }}
                                  disabled={index === 0}
                                >
                                  <i className='ti ti-arrow-up' />
                                </Button>
                                <Button
                                  variant='light'
                                  size='sm'
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (index < editingForm.fields.length - 1)
                                      moveField(index, index + 1);
                                  }}
                                  disabled={
                                    index === editingForm.fields.length - 1
                                  }
                                >
                                  <i className='ti ti-arrow-down' />
                                </Button>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>

                      {selectedField && (
                        <FormFieldEditor
                          field={selectedField}
                          onUpdate={updateField}
                          otherFields={editingForm.fields.filter(
                            (f) => f.id !== selectedField.id
                          )}
                        />
                      )}
                    </Col>
                  </Row>
                </Modal.Body>
                <Modal.Footer>
                  <Button
                    variant='secondary'
                    onClick={() => setShowEditModal(false)}
                    className='me-2'
                  >
                    Cancel
                  </Button>
                  <Button variant='primary' type='submit' disabled={isSaving}>
                    {isSaving ? <Spinner size='sm' /> : 'Save Changes'}
                  </Button>
                </Modal.Footer>
              </Form>
            </>
          )}
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Confirm Deletion</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            Are you sure you want to delete this form? This action cannot be
            undone.
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant='secondary'
              onClick={() => setShowDeleteModal(false)}
              className='me-2'
            >
              Cancel
            </Button>
            <Button variant='danger' onClick={deleteForm}>
              Delete
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    </div>
  );
};

export default FormBuilder;
