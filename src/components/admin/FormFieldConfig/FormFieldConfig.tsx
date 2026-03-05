// src/components/admin/FormFieldConfig/FormFieldConfig.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Form,
  Button,
  Alert,
  Spinner,
  Table,
  Badge,
  Modal,
  Tabs,
  Tab,
  OverlayTrigger,
  Tooltip,
} from 'react-bootstrap';
import { useAuth } from '../../../context/AuthContext';
import axios from 'axios';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
  DraggableProvided,
  DroppableProvided,
} from '@hello-pangea/dnd';
import {
  Eye,
  EyeOff,
  Edit2,
  Trash2,
  Save,
  X,
  AlertCircle,
  Move,
  Check,
} from 'lucide-react';
import {
  FormFieldConfig as IFormFieldConfig,
  FieldDependency,
  FieldOption,
} from '../../../types/form-config.types';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

const FormFieldConfig: React.FC = () => {
  const { getAuthToken } = useAuth();
  const [fields, setFields] = useState<IFormFieldConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('player');
  const [editingField, setEditingField] = useState<IFormFieldConfig | null>(
    null,
  );
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDependencyModal, setShowDependencyModal] = useState(false);
  const [selectedField, setSelectedField] = useState<IFormFieldConfig | null>(
    null,
  );

  useEffect(() => {
    fetchFields();
  }, []);

  const fetchFields = async () => {
    try {
      setLoading(true);
      const token = await getAuthToken();
      const response = await axios.get<ApiResponse<IFormFieldConfig[]>>(
        `${API_BASE_URL}/form-fields/config`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (response.data.success && response.data.data) {
        setFields(response.data.data);
      }
    } catch (err: any) {
      console.error('Error fetching fields:', err);
      setError(
        err.response?.data?.error || 'Failed to load form field configurations',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleToggleField = async (field: IFormFieldConfig) => {
    try {
      const token = await getAuthToken();
      const response = await axios.patch<ApiResponse<IFormFieldConfig>>(
        `${API_BASE_URL}/form-fields/config/${field._id}`,
        { isEnabled: !field.isEnabled },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (response.data.success && response.data.data) {
        setFields(
          fields.map((f) =>
            f._id === field._id ? { ...f, isEnabled: !f.isEnabled } : f,
          ),
        );
        setSuccess(
          `Field ${field.label} ${!field.isEnabled ? 'enabled' : 'disabled'}`,
        );
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update field');
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(fields);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update displayOrder for all fields
    const updatedItems = items.map((item, index) => ({
      ...item,
      displayOrder: index,
    }));

    setFields(updatedItems);

    try {
      const token = await getAuthToken();
      await axios.post(
        `${API_BASE_URL}/form-fields/config/reorder`,
        {
          fields: updatedItems.map((f) => ({
            _id: f._id,
            displayOrder: f.displayOrder,
          })),
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
    } catch (err: any) {
      console.error('Failed to save order:', err);
      fetchFields(); // Revert on error
    }
  };

  const filteredFields = fields
    .filter((field) => field.appliesTo.includes(activeTab as any))
    .sort((a, b) => a.displayOrder - b.displayOrder);

  const renderFieldRow = (field: IFormFieldConfig, index: number) => (
    <Draggable key={field._id} draggableId={field._id} index={index}>
      {(provided) => (
        <tr
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={!field.isEnabled ? 'opacity-50' : ''}
        >
          <td {...provided.dragHandleProps} className='cursor-move'>
            <Move size={16} className='text-muted' />
          </td>
          <td>
            <strong>{field.label}</strong>
            <div className='small text-muted'>{field.fieldName}</div>
          </td>
          <td>
            <Badge bg='light' text='dark' className='text-uppercase'>
              {field.fieldType}
            </Badge>
          </td>
          <td>
            {field.isRequired ? (
              <Badge bg='danger'>Required</Badge>
            ) : (
              <Badge bg='secondary'>Optional</Badge>
            )}
          </td>
          <td>
            {field.calculation?.type === 'fromDOB' ? (
              <OverlayTrigger
                placement='top'
                overlay={<Tooltip>Auto-calculated from DOB</Tooltip>}
              >
                <Badge bg='info'>Auto</Badge>
              </OverlayTrigger>
            ) : null}
            {field.dependencies?.length > 0 && (
              <OverlayTrigger
                placement='top'
                overlay={<Tooltip>Has dependencies</Tooltip>}
              >
                <Badge bg='warning' className='ms-1'>
                  Dep
                </Badge>
              </OverlayTrigger>
            )}
          </td>
          <td>
            <div className='d-flex gap-1'>
              <Button
                size='sm'
                variant={field.isEnabled ? 'success' : 'secondary'}
                onClick={() => handleToggleField(field)}
                title={field.isEnabled ? 'Click to disable' : 'Click to enable'}
              >
                {field.isEnabled ? <Eye size={14} /> : <EyeOff size={14} />}
              </Button>
              <Button
                size='sm'
                variant='outline-primary'
                onClick={() => {
                  setEditingField(field);
                  setShowEditModal(true);
                }}
              >
                <Edit2 size={14} />
              </Button>
              <Button
                size='sm'
                variant='outline-warning'
                onClick={() => {
                  setSelectedField(field);
                  setShowDependencyModal(true);
                }}
              >
                <AlertCircle size={14} />
              </Button>
            </div>
          </td>
        </tr>
      )}
    </Draggable>
  );

  if (loading) {
    return (
      <div className='d-flex justify-content-center p-5'>
        <Spinner animation='border' variant='primary' />
      </div>
    );
  }

  return (
    <Card>
      <Card.Header>
        <div className='d-flex justify-content-between align-items-center'>
          <h5 className='mb-0'>Form Field Configuration</h5>
          <div>
            <Button
              variant='outline-primary'
              size='sm'
              onClick={fetchFields}
              className='me-2'
            >
              <i className='ti ti-refresh me-1'></i>
              Refresh
            </Button>
          </div>
        </div>
      </Card.Header>
      <Card.Body>
        {error && (
          <Alert variant='danger' onClose={() => setError(null)} dismissible>
            <AlertCircle size={18} className='me-2' />
            {error}
          </Alert>
        )}

        {success && (
          <Alert variant='success' onClose={() => setSuccess(null)} dismissible>
            {success}
          </Alert>
        )}

        <Tabs
          activeKey={activeTab}
          onSelect={(k) => setActiveTab(k || 'player')}
          className='mb-3'
        >
          <Tab eventKey='player' title='Player Fields' />
          <Tab eventKey='parent' title='Parent Fields' />
          <Tab eventKey='guardian' title='Guardian Fields' />
        </Tabs>

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId='fields'>
            {(provided) => (
              <Table hover responsive>
                <thead>
                  <tr>
                    <th style={{ width: 40 }}></th>
                    <th>Field</th>
                    <th>Type</th>
                    <th>Required</th>
                    <th>Features</th>
                    <th style={{ width: 120 }}>Actions</th>
                  </tr>
                </thead>
                <tbody ref={provided.innerRef} {...provided.droppableProps}>
                  {filteredFields.map((field, index) =>
                    renderFieldRow(field, index),
                  )}
                  {provided.placeholder}
                </tbody>
              </Table>
            )}
          </Droppable>
        </DragDropContext>

        {/* Info box about DOB → Age/Grade dependency */}
        <div className='alert alert-info mt-3'>
          <h6 className='mb-2'>⚠️ Important: DOB Dependencies</h6>
          <p className='mb-0 small'>
            When DOB is enabled, Age and Grade fields will be automatically
            calculated and hidden from manual input. If DOB is disabled, users
            must enter Grade manually. Age will be hidden.
          </p>
        </div>
      </Card.Body>

      {/* Edit Field Modal */}
      <Modal
        show={showEditModal}
        onHide={() => setShowEditModal(false)}
        size='lg'
      >
        <Modal.Header closeButton>
          <Modal.Title>Edit Field: {editingField?.label}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {editingField && (
            <EditFieldForm
              field={editingField}
              onSave={(updatedField) => {
                setFields(
                  fields.map((f) =>
                    f._id === updatedField._id ? updatedField : f,
                  ),
                );
                setShowEditModal(false);
                setSuccess('Field updated successfully');
                setTimeout(() => setSuccess(null), 3000);
              }}
              onCancel={() => setShowEditModal(false)}
            />
          )}
        </Modal.Body>
      </Modal>

      {/* Dependency Modal */}
      <Modal
        show={showDependencyModal}
        onHide={() => setShowDependencyModal(false)}
      >
        <Modal.Header closeButton>
          <Modal.Title>Field Dependencies</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedField && (
            <DependencyManager
              field={selectedField}
              allFields={fields}
              onSave={(updatedField) => {
                setFields(
                  fields.map((f) =>
                    f._id === updatedField._id ? updatedField : f,
                  ),
                );
                setShowDependencyModal(false);
              }}
            />
          )}
        </Modal.Body>
      </Modal>
    </Card>
  );
};

// Edit Field Form Component
interface EditFieldFormProps {
  field: IFormFieldConfig;
  onSave: (updatedField: IFormFieldConfig) => void;
  onCancel: () => void;
}

const EditFieldForm: React.FC<EditFieldFormProps> = ({
  field,
  onSave,
  onCancel,
}) => {
  const [formData, setFormData] = useState({
    label: field.label,
    description: field.description || '',
    placeholder: field.placeholder || '',
    isRequired: field.isRequired,
    isEnabled: field.isEnabled,
    isReadOnly: field.isReadOnly,
    allowOverride: field.allowOverride || false,
  });
  const [saving, setSaving] = useState(false);
  const { getAuthToken } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const token = await getAuthToken();
      const response = await axios.patch<ApiResponse<IFormFieldConfig>>(
        `${API_BASE_URL}/form-fields/config/${field._id}`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (response.data.success && response.data.data) {
        onSave(response.data.data);
      }
    } catch (err) {
      console.error('Error updating field:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Form onSubmit={handleSubmit}>
      <Form.Group className='mb-3'>
        <Form.Label>Display Label</Form.Label>
        <Form.Control
          type='text'
          value={formData.label}
          onChange={(e) => setFormData({ ...formData, label: e.target.value })}
          required
        />
      </Form.Group>

      <Form.Group className='mb-3'>
        <Form.Label>Description (Optional)</Form.Label>
        <Form.Control
          as='textarea'
          rows={2}
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
        />
      </Form.Group>

      <Form.Group className='mb-3'>
        <Form.Label>Placeholder</Form.Label>
        <Form.Control
          type='text'
          value={formData.placeholder}
          onChange={(e) =>
            setFormData({ ...formData, placeholder: e.target.value })
          }
        />
      </Form.Group>

      <Form.Group className='mb-3'>
        <Form.Check
          type='switch'
          label='Required Field'
          checked={formData.isRequired}
          onChange={(e) =>
            setFormData({ ...formData, isRequired: e.target.checked })
          }
        />
      </Form.Group>

      <Form.Group className='mb-3'>
        <Form.Check
          type='switch'
          label='Read Only'
          checked={formData.isReadOnly}
          onChange={(e) =>
            setFormData({ ...formData, isReadOnly: e.target.checked })
          }
        />
      </Form.Group>

      {field.fieldName === 'grade' && (
        <Form.Group className='mb-3'>
          <Form.Check
            type='switch'
            label='Allow Manual Override'
            checked={formData.allowOverride}
            onChange={(e) =>
              setFormData({ ...formData, allowOverride: e.target.checked })
            }
          />
          <Form.Text className='text-muted'>
            When enabled, users can manually adjust the auto-calculated grade
          </Form.Text>
        </Form.Group>
      )}

      <div className='d-flex justify-content-end gap-2'>
        <Button variant='secondary' onClick={onCancel}>
          Cancel
        </Button>
        <Button type='submit' variant='primary' disabled={saving}>
          {saving ? <Spinner animation='border' size='sm' /> : 'Save Changes'}
        </Button>
      </div>
    </Form>
  );
};

// Dependency Manager Component
interface DependencyManagerProps {
  field: IFormFieldConfig;
  allFields: IFormFieldConfig[];
  onSave: (updatedField: IFormFieldConfig) => void;
}

const DependencyManager: React.FC<DependencyManagerProps> = ({
  field,
  allFields,
  onSave,
}) => {
  const [dependencies, setDependencies] = useState<FieldDependency[]>(
    field.dependencies || [],
  );
  const [newDependency, setNewDependency] = useState<FieldDependency>({
    field: '',
    operator: 'exists',
    value: '',
  });
  const { getAuthToken } = useAuth();

  const availableFields = allFields.filter(
    (f) => f._id !== field._id && f.fieldName !== field.fieldName,
  );

  const addDependency = () => {
    if (newDependency.field) {
      setDependencies([...dependencies, newDependency]);
      setNewDependency({ field: '', operator: 'exists', value: '' });
    }
  };

  const removeDependency = (index: number) => {
    setDependencies(dependencies.filter((_, i) => i !== index));
  };

  const saveDependencies = async () => {
    try {
      const token = await getAuthToken();
      const response = await axios.patch<ApiResponse<IFormFieldConfig>>(
        `${API_BASE_URL}/form-fields/config/${field._id}`,
        { dependencies },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (response.data.success && response.data.data) {
        onSave(response.data.data);
      }
    } catch (err) {
      console.error('Error saving dependencies:', err);
    }
  };

  const getOperatorLabel = (operator: string): string => {
    const labels: Record<string, string> = {
      equals: '=',
      notEquals: '≠',
      exists: 'is filled',
      notExists: 'is empty',
      true: 'is true',
      false: 'is false',
    };
    return labels[operator] || operator;
  };

  return (
    <div>
      <p className='text-muted small mb-3'>
        Configure when this field should be visible based on other fields'
        values.
      </p>

      {dependencies.length > 0 ? (
        <div className='mb-3'>
          <h6>Current Dependencies</h6>
          {dependencies.map((dep, index) => {
            const depField = allFields.find((f) => f.fieldName === dep.field);
            return (
              <div key={index} className='d-flex align-items-center gap-2 mb-2'>
                <Badge bg='secondary' className='p-2'>
                  {depField?.label || dep.field}
                </Badge>
                <span>{getOperatorLabel(dep.operator)}</span>
                {dep.value && <Badge bg='info'>{dep.value}</Badge>}
                <Button
                  size='sm'
                  variant='outline-danger'
                  onClick={() => removeDependency(index)}
                >
                  <X size={14} />
                </Button>
              </div>
            );
          })}
        </div>
      ) : (
        <p className='text-muted fst-italic mb-3'>No dependencies configured</p>
      )}

      <h6>Add New Dependency</h6>
      <div className='d-flex gap-2 mb-3'>
        <Form.Select
          value={newDependency.field}
          onChange={(e) =>
            setNewDependency({ ...newDependency, field: e.target.value })
          }
        >
          <option value=''>Select Field</option>
          {availableFields.map((f) => (
            <option key={f._id} value={f.fieldName}>
              {f.label}
            </option>
          ))}
        </Form.Select>

        <Form.Select
          value={newDependency.operator}
          onChange={(e) =>
            setNewDependency({
              ...newDependency,
              operator: e.target.value as FieldDependency['operator'],
            })
          }
          style={{ width: 150 }}
        >
          <option value='exists'>Exists</option>
          <option value='notExists'>Does Not Exist</option>
          <option value='equals'>Equals</option>
          <option value='notEquals'>Not Equals</option>
          <option value='true'>Is True</option>
          <option value='false'>Is False</option>
        </Form.Select>

        {['equals', 'notEquals'].includes(newDependency.operator) && (
          <Form.Control
            type='text'
            placeholder='Value'
            value={newDependency.value || ''}
            onChange={(e) =>
              setNewDependency({ ...newDependency, value: e.target.value })
            }
          />
        )}

        <Button
          variant='outline-primary'
          onClick={addDependency}
          disabled={!newDependency.field}
        >
          Add
        </Button>
      </div>

      <div className='d-flex justify-content-end gap-2 mt-3'>
        <Button variant='secondary' onClick={() => onSave(field)}>
          Cancel
        </Button>
        <Button variant='primary' onClick={saveDependencies}>
          Save Dependencies
        </Button>
      </div>
    </div>
  );
};

export default FormFieldConfig;
