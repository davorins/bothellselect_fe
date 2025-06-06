import React, { useState, useEffect, useRef, forwardRef } from 'react';
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
} from 'react-bootstrap';
import ReactQuill, { ReactQuillProps } from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import axios, { AxiosError } from 'axios';
import {
  EmailTemplate,
  ApiResponse,
  ApiErrorResponse,
} from '../../../types/types';
import LoadingSpinner from '../../../components/common/LoadingSpinner';

const QuillEditor = forwardRef<ReactQuill, ReactQuillProps>((props, ref) => (
  <ReactQuill {...props} ref={ref} />
));

QuillEditor.displayName = 'QuillEditor';

const EmailTemplates = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [newTemplate, setNewTemplate] = useState<Omit<EmailTemplate, '_id'>>({
    title: '',
    subject: '',
    content: '',
    status: true,
    category: 'system',
    tags: [],
    variables: [],
  });
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(
    null
  );
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const quillRef = useRef<ReactQuill>(null);
  const editQuillRef = useRef<ReactQuill>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const availableVariables = [
    { label: "Parent's Full Name", value: '[parent.fullName]' },
    { label: "Parent's Email", value: '[parent.email]' },
    { label: "Parent's Phone", value: '[parent.phone]' },
    { label: "Player's Full Name", value: '[player.fullName]' },
    { label: "Player's First Name", value: '[player.firstName]' },
    { label: "Player's Grade", value: '[player.grade]' },
    { label: "Player's School", value: '[player.schoolName]' },
  ];

  useEffect(() => {
    return () => {
      // Cleanup Quill instances
      [quillRef, editQuillRef].forEach((ref) => {
        if (ref.current) {
          const quill = ref.current.getEditor();
          quill.off('text-change');
        }
      });
    };
  }, []);

  // Load templates from API with proper error handling
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        const response = await axios.get<ApiResponse>(
          `${process.env.REACT_APP_API_BASE_URL}/email-templates`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        // Ensure we always set an array, even if response.data.data is undefined
        setTemplates(
          Array.isArray(response.data?.data)
            ? response.data.data.map((t) => ({
                ...t,
                variables: t.variables || [], // Ensure variables exists
              }))
            : []
        );
      } catch (err) {
        const error = err as Error;
        setError(error.message || 'Failed to load templates');
        setTemplates([]); // Explicitly set empty array on error
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, [navigate, refreshTrigger]);

  // Handle input changes with proper typing
  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setNewTemplate((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // Handle tags input change
  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const tags = e.target.value.split(',').map((tag) => tag.trim());
    setNewTemplate((prev) => ({ ...prev, tags }));
  };

  // Content change handlers with null checks
  const handleContentChange = (content: string) => {
    setNewTemplate((prev) => ({ ...prev, content }));
  };

  const handleEditContentChange = (content: string) => {
    if (editingTemplate) {
      setEditingTemplate({
        ...editingTemplate,
        content,
      });
    }
  };

  const headerHTML = `
  <div style="text-align:left; padding:20px 0;">
    <img src="https://res.cloudinary.com/dlmdnn3dk/image/upload/v1749172582/w9cliwdttnm1gm9ozlpw.png" alt="Bothell Select Logo" height="30" style="display:block; margin:0; height:30px;" />
  </div>
`;

  const footerHTML = `
  <div style="text-align:center; font-size:13px; color:#999; padding:30px 0 10px;">
    <p style="margin:0;">You're receiving this email because you're part of <strong>Bothell Select</strong>.</p>
    <p style="margin:6px 0 0;"><a href="https://bothellselect.com/unsubscribe" style="color:#999; text-decoration:underline;">Unsubscribe</a></p>
  </div>
`;

  function addInlineParagraphStyles(html: string): string {
    return html.replace(
      /<p(\s[^>]*)?>/g,
      '<p style="margin:0 0 12px; padding:0;"$1>'
    );
  }

  // Then before rendering:
  const cleanedContent = addInlineParagraphStyles(newTemplate.content);

  const getWrappedContent = () => `
  <div style="background-color:#f6f6f6; padding:40px 20px; text-align:center;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" align="center" style="max-width:600px; margin:0 auto;">
      <tr>
        <td style="
          background-color:#ffffff;
          border-radius:10px;
          padding:32px 28px;
          box-shadow:0 2px 10px rgba(0,0,0,0.05);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          color:#333;
          font-size:15px;
          line-height:1.6;
          text-align:left;
        ">
          ${headerHTML}
          <div style="margin-top:20px; text-align:left;">
            ${cleanedContent}
          </div>
          ${footerHTML}
        </td>
      </tr>
    </table>
  </div>
  `;

  // API operations with proper error handling
  const addTemplate = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check for duplicate title
    const isDuplicate = templates.some(
      (template) =>
        template.title.toLowerCase().trim() ===
        newTemplate.title.toLowerCase().trim()
    );

    if (isDuplicate) {
      setError(
        `A template with the title "${newTemplate.title}" already exists.`
      );
      // Highlight the title field
      const titleInput = document.querySelector('input[name="title"]');
      titleInput?.classList.add('is-invalid');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post<EmailTemplate>(
        `${process.env.REACT_APP_API_BASE_URL}/email-templates`,
        {
          title: newTemplate.title.trim(),
          subject: newTemplate.subject.trim(),
          content: getWrappedContent(),
          status: newTemplate.status,
          category: newTemplate.category,
          tags: newTemplate.tags.filter((tag) => tag.trim() !== ''),
          variables:
            newTemplate.variables?.map((v) => ({
              name: v.name.trim(),
              description: v.description.trim(),
              defaultValue: v.defaultValue?.trim() || '',
            })) || [],
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data) {
        setRefreshTrigger((prev) => prev + 1);
        resetNewTemplate();
        setShowAddModal(false);
        setSuccessMessage('Template created successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err) {
      const error = err as AxiosError<ApiErrorResponse>;
      setError(
        error.response?.data?.message ||
          error.message ||
          'Failed to create template'
      );
      console.error('API Error:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
    }
  };

  const saveEditedTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate) return;

    setIsSaving(true);

    setTemplates((prev) =>
      prev.map((t) => (t._id === editingTemplate._id ? editingTemplate : t))
    );

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      // Create payload that matches backend expectations
      const payload = {
        title: editingTemplate.title.trim(),
        subject: editingTemplate.subject.trim(),
        content: editingTemplate.content,
        status: editingTemplate.status,
        category: editingTemplate.category,
        tags: editingTemplate.tags.filter((tag) => tag.trim() !== ''),
        variables: (editingTemplate.variables || []).map((v) => ({
          name: v.name?.trim() || '',
          description: v.description?.trim() || '',
          defaultValue: v.defaultValue?.trim() || '',
        })),
      };

      const response = await axios.put<EmailTemplate>(
        `${process.env.REACT_APP_API_BASE_URL}/email-templates/${editingTemplate._id}`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data) {
        setTemplates((prev) =>
          prev.map((t) => (t._id === editingTemplate._id ? response.data : t))
        );
        setRefreshTrigger((prev) => prev + 1);
        setEditingTemplate(null);
        setShowEditModal(false);
        setSuccessMessage('Template updated successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err) {
      const error = err as AxiosError<ApiErrorResponse>;
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        'Failed to update template';
      setError(errorMessage);

      console.error('Update Error Details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateToDelete) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      await axios.delete(
        `${process.env.REACT_APP_API_BASE_URL}/email-templates/${templateToDelete}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setTemplates((prev) => prev.filter((t) => t._id !== templateToDelete));
      setTemplateToDelete(null);
      setShowDeleteModal(false);
      setSuccessMessage('Template deleted successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      const error = err as AxiosError<ApiErrorResponse>;
      setError(
        error.response?.data?.message ||
          error.message ||
          'Failed to delete template'
      );
    }
  };

  const resetNewTemplate = () => {
    setNewTemplate({
      title: '',
      subject: '',
      content: '',
      status: true,
      category: 'system',
      tags: [],
      variables: [],
    });
  };

  // Rich text editor configuration
  const modules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['link', 'image'],
      ['clean'],
    ],
  };

  const formats = [
    'header',
    'bold',
    'italic',
    'underline',
    'strike',
    'blockquote',
    'list',
    'bullet',
    'link',
    'image',
  ];

  const handleEditInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    if (editingTemplate) {
      setEditingTemplate({
        ...editingTemplate,
        [name]: type === 'checkbox' ? checked : value,
      });
    }
  };

  const handleEditTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const tags = e.target.value.split(',').map((tag) => tag.trim());
    if (editingTemplate) {
      setEditingTemplate({
        ...editingTemplate,
        tags: tags || [],
      });
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className='page-wrapper'>
      <div className='content content-two'>
        {error && (
          <Alert variant='danger' onClose={() => setError(null)} dismissible>
            {error}
          </Alert>
        )}

        {/* Success message display */}
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
            <h3 className='page-title mb-1'>Email Campaigns</h3>
          </div>
          <div className='d-flex my-xl-auto right-content align-items-center flex-wrap'>
            <div className='pe-1 mb-2'>
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
        </div>

        <div className='row'>
          <div className='col-xxl-12 col-xl-12'>
            <div className='flex-fill border-start ps-3'>
              <div className='d-flex align-items-center justify-content-between flex-wrap border-bottom pt-3 mb-3'>
                <div className='mb-3'>
                  <h5 className='mb-1'>Email Templates</h5>
                  <p>Create Email Templates</p>
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
                    <div className='card-body p-3 pb-0'>
                      {templates && templates.length > 0 ? (
                        <div className='row'>
                          {templates.map((template) => (
                            <div
                              className='col-xxl-4 col-md-6'
                              key={`${template._id}-${
                                template.updatedAt || template.createdAt
                              }`}
                            >
                              <div className='d-flex align-items-center justify-content-between bg-white p-3 border rounded mb-3'>
                                <div>
                                  <h5 className='fs-15 fw-normal mb-1'>
                                    {template.title}
                                  </h5>
                                  <small className='text-muted'>
                                    {template.category}
                                  </small>
                                  <div className='mt-2'>
                                    {(template.tags || []).map((tag, i) => (
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
                                <div className='d-flex align-items-center'>
                                  <Button
                                    variant='outline-light'
                                    className='bg-white btn-icon me-2'
                                    onClick={() => {
                                      setEditingTemplate({
                                        ...template,
                                        variables: template.variables || [],
                                        tags: template.tags || [],
                                      });
                                      setShowEditModal(true);
                                    }}
                                  >
                                    <i className='ti ti-edit' />
                                  </Button>
                                  <Button
                                    variant='outline-light'
                                    className='bg-white btn-icon'
                                    onClick={() => {
                                      setTemplateToDelete(template._id);
                                      setShowDeleteModal(true);
                                    }}
                                  >
                                    <i className='ti ti-trash' />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className='text-center py-4'>
                          <p>No templates found. Create your first template!</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Email Template Modal */}
      <Modal
        show={showAddModal}
        onHide={() => setShowAddModal(false)}
        size='lg'
      >
        <Modal.Header closeButton>
          <Modal.Title>Add Email Template</Modal.Title>
        </Modal.Header>
        <Form onSubmit={addTemplate}>
          <Modal.Body>
            <Form.Group className='mb-3'>
              <Form.Label>Title*</Form.Label>
              <Form.Control
                type='text'
                name='title'
                placeholder='Enter Title'
                value={newTemplate.title}
                onChange={handleInputChange}
                required
                className={
                  error?.includes('already exists') ? 'is-invalid' : ''
                }
              />
            </Form.Group>

            <Form.Group className='mb-3'>
              <Form.Label>Subject*</Form.Label>
              <Form.Control
                type='text'
                name='subject'
                placeholder='Enter Subject'
                value={newTemplate.subject}
                onChange={handleInputChange}
                required
              />
            </Form.Group>

            <Form.Group className='mb-3'>
              <Form.Label>Category</Form.Label>
              <Form.Select
                name='category'
                value={newTemplate.category}
                onChange={handleInputChange}
              >
                <option value='system'>System</option>
                <option value='marketing'>Marketing</option>
                <option value='transactional'>Transactional</option>
                <option value='notification'>Notification</option>
                <option value='other'>Other</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className='mb-3'>
              <Form.Label>Tags (comma separated)</Form.Label>
              <Form.Control
                type='text'
                name='tags'
                placeholder='tag1, tag2, tag3'
                value={newTemplate.tags.join(', ')}
                onChange={handleTagsChange}
              />
            </Form.Group>

            <Form.Group className='mb-3'>
              <Form.Label>Available Variables</Form.Label>
              <div className='border p-3 rounded mb-3'>
                {availableVariables.map((variable, index) => (
                  <Badge
                    key={index}
                    bg='light'
                    text='dark'
                    className='me-2 mb-2 cursor-pointer'
                    onClick={() => {
                      // Insert variable at cursor position
                      const editor = quillRef.current?.getEditor();
                      if (editor) {
                        const range = editor.getSelection();
                        editor.insertText(range?.index || 0, variable.value);
                      }
                    }}
                  >
                    {variable.label}
                  </Badge>
                ))}
              </div>
            </Form.Group>

            <Form.Group className='mb-3'>
              <Form.Label>Template Content*</Form.Label>
              <QuillEditor
                ref={quillRef}
                theme='snow'
                value={newTemplate.content}
                onChange={handleContentChange}
                modules={modules}
                formats={formats}
                style={{ height: '300px', marginBottom: '50px' }}
              />
            </Form.Group>

            <Form.Group className='mb-3 d-flex align-items-center justify-content-between'>
              <div>
                <h5>Status</h5>
                <p>Change the Status by toggle</p>
              </div>
              <Form.Check
                type='switch'
                id='status-switch'
                label='Active'
                name='status'
                checked={newTemplate.status}
                onChange={handleInputChange}
              />
            </Form.Group>
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
              disabled={
                !newTemplate.title ||
                !newTemplate.subject ||
                !newTemplate.content
              }
            >
              Submit
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Edit Email Template Modal */}
      <Modal
        show={showEditModal}
        onHide={() => setShowEditModal(false)}
        size='lg'
      >
        <Modal.Header closeButton>
          <Modal.Title>Edit Email Template</Modal.Title>
        </Modal.Header>
        {editingTemplate && (
          <Form onSubmit={saveEditedTemplate}>
            <Modal.Body>
              <Form.Group className='mb-3'>
                <Form.Label>Title*</Form.Label>
                <Form.Control
                  type='text'
                  name='title'
                  placeholder='Enter Title'
                  value={editingTemplate.title}
                  onChange={handleEditInputChange}
                  required
                />
              </Form.Group>

              <Form.Group className='mb-3'>
                <Form.Label>Subject*</Form.Label>
                <Form.Control
                  type='text'
                  name='subject'
                  placeholder='Enter Subject'
                  value={editingTemplate.subject}
                  onChange={handleEditInputChange}
                  required
                />
              </Form.Group>

              <Form.Group className='mb-3'>
                <Form.Label>Category</Form.Label>
                <Form.Select
                  name='category'
                  value={editingTemplate.category}
                  onChange={handleEditInputChange}
                >
                  <option value='system'>System</option>
                  <option value='marketing'>Marketing</option>
                  <option value='transactional'>Transactional</option>
                  <option value='notification'>Notification</option>
                  <option value='other'>Other</option>
                </Form.Select>
              </Form.Group>

              <Form.Group className='mb-3'>
                <Form.Label>Tags (comma separated)</Form.Label>
                <Form.Control
                  type='text'
                  name='tags'
                  placeholder='tag1, tag2, tag3'
                  value={(editingTemplate.tags || []).join(', ')}
                  onChange={handleEditTagsChange}
                />
              </Form.Group>

              <Form.Group className='mb-3'>
                <Form.Label>Available Variables</Form.Label>
                <div className='border p-3 rounded mb-3'>
                  {availableVariables.map((variable, index) => (
                    <Badge
                      key={index}
                      bg='light'
                      text='dark'
                      className='me-2 mb-2 cursor-pointer'
                      onClick={() => {
                        // Insert variable at cursor position
                        const editor = quillRef.current?.getEditor();
                        if (editor) {
                          const range = editor.getSelection();
                          editor.insertText(range?.index || 0, variable.value);
                        }
                      }}
                    >
                      {variable.label}
                    </Badge>
                  ))}
                </div>
              </Form.Group>

              <Form.Group className='mb-3'>
                <Form.Label>Template Content*</Form.Label>
                <QuillEditor
                  ref={editQuillRef}
                  theme='snow'
                  value={editingTemplate.content}
                  onChange={handleEditContentChange}
                  modules={modules}
                  formats={formats}
                  style={{ height: '300px', marginBottom: '50px' }}
                />
              </Form.Group>

              <Form.Group className='mb-3 d-flex align-items-center justify-content-between'>
                <div>
                  <h5>Status</h5>
                  <p>Change the Status by toggle</p>
                </div>
                <Form.Check
                  type='switch'
                  id='edit-status-switch'
                  label='Active'
                  name='status'
                  checked={editingTemplate.status}
                  onChange={handleEditInputChange}
                />
              </Form.Group>
            </Modal.Body>
            <Modal.Footer>
              <Button
                variant='secondary'
                onClick={() => setShowEditModal(false)}
                className='me-2'
              >
                Cancel
              </Button>
              <Button
                variant='primary'
                type='submit'
                disabled={
                  !editingTemplate.title ||
                  !editingTemplate.subject ||
                  !editingTemplate.content ||
                  isSaving
                }
              >
                {isSaving ? (
                  <>
                    <Spinner
                      as='span'
                      size='sm'
                      animation='border'
                      role='status'
                      aria-hidden='true'
                    />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </Modal.Footer>
          </Form>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Deletion</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete this template? This action cannot be
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
          <Button variant='danger' onClick={confirmDelete}>
            Delete
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default EmailTemplates;
