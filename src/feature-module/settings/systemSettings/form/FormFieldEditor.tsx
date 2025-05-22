import React, { useState, useEffect } from 'react';
import { Form, Button, Row, Col } from 'react-bootstrap';

interface PaymentConfig {
  amount: number;
  description: string;
  currency?: 'USD' | 'CAD' | 'EUR' | 'GBP';
}

interface BaseFormField {
  id: string;
  label: string;
  required: boolean;
  placeholder?: string;
  options?: { label: string; value: string }[];
  defaultValue?: string | boolean;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
  };
  conditional?: {
    fieldId: string;
    value: string | boolean;
  };
}

interface TextFormField extends BaseFormField {
  type: 'text' | 'email' | 'number';
}

interface SelectFormField extends BaseFormField {
  type: 'select' | 'radio';
}

interface CheckboxFormField extends BaseFormField {
  type: 'checkbox';
}

interface PaymentFormField extends BaseFormField {
  type: 'payment';
  paymentConfig: PaymentConfig;
}

interface SectionFormField extends BaseFormField {
  type: 'section';
}

type FormField =
  | TextFormField
  | SelectFormField
  | CheckboxFormField
  | PaymentFormField
  | SectionFormField;

interface FormFieldEditorProps {
  field: FormField;
  onUpdate: (field: FormField) => void;
  otherFields: FormField[];
}

const isPaymentField = (field: FormField): field is PaymentFormField => {
  return field.type === 'payment';
};

const FormFieldEditor: React.FC<FormFieldEditorProps> = ({
  field,
  onUpdate,
  otherFields,
}) => {
  const [editedField, setEditedField] = useState<FormField>(() => {
    if (field.type === 'payment') {
      const paymentField = field as PaymentFormField;
      return {
        ...paymentField,
        paymentConfig: paymentField.paymentConfig || {
          amount: 0,
          description: '',
          currency: 'USD',
        },
      };
    }
    return { ...field };
  });

  // Deep clone field on prop changes to avoid mutation bugs
  useEffect(() => {
    setEditedField(JSON.parse(JSON.stringify(field)));
  }, [field]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const target = e.target;

    let value: string | boolean;

    if (target instanceof HTMLInputElement && target.type === 'checkbox') {
      value = target.checked;
    } else {
      value = target.value;
    }

    setEditedField((prev) => ({
      ...prev,
      [target.name]: value,
    }));
  };

  const handleOptionChange = (
    index: number,
    key: 'label' | 'value',
    value: string
  ) => {
    if (!('options' in editedField)) return;

    const newOptions = [...(editedField.options || [])];
    newOptions[index] = { ...newOptions[index], [key]: value };
    setEditedField({
      ...editedField,
      options: newOptions,
    });
  };

  const addOption = () => {
    if (!('options' in editedField)) return;

    setEditedField({
      ...editedField,
      options: [...(editedField.options || []), { label: '', value: '' }],
    });
  };

  const removeOption = (index: number) => {
    if (!('options' in editedField)) return;

    const newOptions = [...(editedField.options || [])];
    newOptions.splice(index, 1);
    setEditedField({
      ...editedField,
      options: newOptions,
    });
  };

  const handlePaymentConfigChange = <K extends keyof PaymentConfig>(
    key: K,
    value: PaymentConfig[K]
  ) => {
    if (!isPaymentField(editedField)) return;

    setEditedField({
      ...editedField,
      paymentConfig: {
        ...(editedField.paymentConfig || {
          amount: 0,
          description: '',
          currency: 'USD',
        }),
        [key]: key === 'amount' ? Number(value) || 0 : value,
      },
    });
  };

  const validateField = (field: FormField): string | null => {
    if (isPaymentField(field)) {
      const { amount, description } = field.paymentConfig;
      if (!description || description.trim() === '') {
        return 'Please enter a payment description';
      }
      if (isNaN(amount) || amount <= 0) {
        return 'Payment amount must be greater than 0';
      }
    }
    return null;
  };

  const handleSave = () => {
    const error = validateField(editedField);
    if (error) {
      alert(error);
      return;
    }
    onUpdate(editedField);
  };

  // Conditional logic: find the field referenced by conditional.fieldId
  const conditionalField = otherFields.find(
    (f) => f.id === editedField.conditional?.fieldId
  );

  const renderPaymentFields = () => {
    if (!isPaymentField(editedField)) return null;

    return (
      <>
        <Form.Group className='mb-3' controlId='paymentAmount'>
          <Form.Label>
            Amount (in cents){' '}
            <small className='text-muted'>(e.g., 1500 = $15.00)</small>*
          </Form.Label>
          <Form.Control
            type='number'
            value={editedField.paymentConfig.amount}
            onChange={(e) =>
              handlePaymentConfigChange('amount', parseInt(e.target.value) || 0)
            }
            required
            min={0}
            step={1}
            isInvalid={
              isNaN(editedField.paymentConfig.amount) ||
              editedField.paymentConfig.amount <= 0
            }
          />
          <Form.Control.Feedback type='invalid'>
            Please enter a valid positive amount
          </Form.Control.Feedback>
        </Form.Group>

        <Form.Group className='mb-3' controlId='paymentDescription'>
          <Form.Label>Description*</Form.Label>
          <Form.Control
            type='text'
            value={editedField.paymentConfig.description}
            onChange={(e) =>
              handlePaymentConfigChange('description', e.target.value)
            }
            required
            isInvalid={!editedField.paymentConfig.description}
          />
          <Form.Control.Feedback type='invalid'>
            Please enter a description
          </Form.Control.Feedback>
        </Form.Group>

        <Form.Group className='mb-3' controlId='paymentCurrency'>
          <Form.Label>Currency</Form.Label>
          <Form.Control
            as='select'
            value={editedField.paymentConfig.currency || 'USD'}
            onChange={(e) =>
              handlePaymentConfigChange(
                'currency',
                e.target.value as 'USD' | 'CAD' | 'EUR' | 'GBP'
              )
            }
          >
            <option value='USD'>USD</option>
            <option value='CAD'>CAD</option>
            <option value='EUR'>EUR</option>
            <option value='GBP'>GBP</option>
          </Form.Control>
        </Form.Group>
      </>
    );
  };

  return (
    <div className='border p-3 rounded mb-3'>
      <h5>Field Settings</h5>
      <Form.Group className='mb-3' controlId='fieldType'>
        <Form.Label>Field Type</Form.Label>
        <Form.Control
          as='select'
          name='type'
          value={editedField.type}
          onChange={handleChange}
          disabled
          aria-describedby='fieldTypeHelp'
        >
          <option value='text'>Text</option>
          <option value='email'>Email</option>
          <option value='number'>Number</option>
          <option value='select'>Dropdown</option>
          <option value='checkbox'>Checkbox</option>
          <option value='radio'>Radio Button</option>
          <option value='payment'>Payment</option>
          <option value='section'>Section</option>
        </Form.Control>
        <Form.Text id='fieldTypeHelp' muted>
          Field type cannot be changed after creation.
        </Form.Text>
      </Form.Group>

      <Form.Group className='mb-3' controlId='fieldLabel'>
        <Form.Label>Label</Form.Label>
        <Form.Control
          type='text'
          name='label'
          value={editedField.label}
          onChange={handleChange}
        />
      </Form.Group>

      <Form.Group className='mb-3' controlId='fieldRequired'>
        <Form.Check
          type='checkbox'
          label='Required'
          name='required'
          checked={editedField.required}
          onChange={handleChange}
        />
      </Form.Group>

      {['text', 'email', 'number'].includes(editedField.type) && (
        <Form.Group className='mb-3' controlId='fieldPlaceholder'>
          <Form.Label>Placeholder</Form.Label>
          <Form.Control
            type='text'
            name='placeholder'
            value={
              'placeholder' in editedField ? editedField.placeholder || '' : ''
            }
            onChange={handleChange}
          />
        </Form.Group>
      )}

      {editedField.type === 'number' && (
        <Row>
          <Col>
            <Form.Group className='mb-3' controlId='validationMin'>
              <Form.Label>Minimum Value</Form.Label>
              <Form.Control
                type='number'
                name='min'
                value={
                  'validation' in editedField
                    ? editedField.validation?.min ?? ''
                    : ''
                }
                onChange={(e) => {
                  setEditedField({
                    ...editedField,
                    validation: {
                      ...('validation' in editedField
                        ? editedField.validation || {}
                        : {}),
                      min: e.target.value
                        ? parseInt(e.target.value)
                        : undefined,
                    },
                  });
                }}
              />
            </Form.Group>
          </Col>
          <Col>
            <Form.Group className='mb-3' controlId='validationMax'>
              <Form.Label>Maximum Value</Form.Label>
              <Form.Control
                type='number'
                name='max'
                value={
                  'validation' in editedField
                    ? editedField.validation?.max ?? ''
                    : ''
                }
                onChange={(e) => {
                  setEditedField({
                    ...editedField,
                    validation: {
                      ...('validation' in editedField
                        ? editedField.validation || {}
                        : {}),
                      max: e.target.value
                        ? parseInt(e.target.value)
                        : undefined,
                    },
                  });
                }}
              />
            </Form.Group>
          </Col>
        </Row>
      )}

      {['select', 'radio'].includes(editedField.type) && (
        <Form.Group>
          <Form.Label>Options</Form.Label>
          {(editedField.options || []).map((option, idx) => (
            <Row key={idx} className='mb-2'>
              <Col>
                <Form.Control
                  type='text'
                  placeholder='Label'
                  value={option.label}
                  onChange={(e) =>
                    handleOptionChange(idx, 'label', e.target.value)
                  }
                />
              </Col>
              <Col>
                <Form.Control
                  type='text'
                  placeholder='Value'
                  value={option.value}
                  onChange={(e) =>
                    handleOptionChange(idx, 'value', e.target.value)
                  }
                />
              </Col>
              <Col xs='auto'>
                <Button
                  variant='danger'
                  size='sm'
                  onClick={() => removeOption(idx)}
                  aria-label={`Remove option ${idx + 1}`}
                >
                  &times;
                </Button>
              </Col>
            </Row>
          ))}
          <Button variant='secondary' size='sm' onClick={addOption}>
            Add Option
          </Button>
        </Form.Group>
      )}

      {isPaymentField(editedField) && renderPaymentFields()}

      {/* Conditional Logic */}
      <h6 className='mt-4'>Conditional Visibility</h6>
      <Form.Group className='mb-3' controlId='conditionalFieldId'>
        <Form.Label>Show this field only if</Form.Label>
        <Form.Control
          as='select'
          name='conditional.fieldId'
          value={editedField.conditional?.fieldId || ''}
          onChange={(e) => {
            const val = e.target.value;
            setEditedField((prev) => ({
              ...prev,
              conditional: val
                ? {
                    fieldId: val,
                    value: prev.conditional?.value || '',
                  }
                : undefined,
            }));
          }}
        >
          <option value=''>No condition</option>
          {otherFields
            .filter((f) => f.id !== editedField.id)
            .map((f) => (
              <option key={f.id} value={f.id}>
                {f.label} ({f.type})
              </option>
            ))}
        </Form.Control>
      </Form.Group>

      {editedField.conditional?.fieldId && conditionalField && (
        <Form.Group className='mb-3' controlId='conditionalValue'>
          <Form.Label>Value equals</Form.Label>
          {conditionalField.options && conditionalField.options.length > 0 ? (
            <Form.Control
              as='select'
              value={editedField.conditional.value?.toString() || ''}
              onChange={(e) => {
                const val = e.target.value;
                setEditedField((prev) => ({
                  ...prev,
                  conditional: prev.conditional
                    ? { ...prev.conditional, value: val }
                    : undefined,
                }));
              }}
            >
              <option value=''>Select a value</option>
              {conditionalField.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Form.Control>
          ) : (
            <Form.Control
              type={
                ['checkbox'].includes(conditionalField.type)
                  ? 'checkbox'
                  : 'text'
              }
              checked={
                conditionalField.type === 'checkbox'
                  ? Boolean(editedField.conditional?.value)
                  : undefined
              }
              value={
                conditionalField.type === 'checkbox'
                  ? undefined
                  : editedField.conditional?.value?.toString() || ''
              }
              onChange={(e) => {
                const target = e.target as HTMLInputElement;
                const val =
                  conditionalField.type === 'checkbox'
                    ? target.checked
                    : target.value;
                setEditedField((prev) => ({
                  ...prev,
                  conditional: prev.conditional
                    ? { ...prev.conditional, value: val }
                    : undefined,
                }));
              }}
            />
          )}
        </Form.Group>
      )}

      <div className='d-flex justify-content-end'>
        <Button variant='primary' onClick={handleSave}>
          Save Field
        </Button>
      </div>
    </div>
  );
};

export default FormFieldEditor;
