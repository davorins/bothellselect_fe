import React, { useState, useEffect } from 'react';
import { Form, Button, Row, Col } from 'react-bootstrap';

interface PaymentConfig {
  amount: number;
  description: string;
  currency?: 'USD' | 'CAD' | 'EUR' | 'GBP';
}

type FieldType =
  | 'text'
  | 'email'
  | 'number'
  | 'select'
  | 'checkbox'
  | 'radio'
  | 'payment'
  | 'section';

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

  useEffect(() => {
    setEditedField({ ...field });
  }, [field]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setEditedField((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
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

  const handleSave = () => {
    if (isPaymentField(editedField)) {
      if (isNaN(editedField.paymentConfig.amount)) {
        alert('Payment amount must be a valid number');
        return;
      }
      if (editedField.paymentConfig.amount <= 0) {
        alert('Payment amount must be greater than 0');
        return;
      }
      if (!editedField.paymentConfig.description) {
        alert('Please enter a payment description');
        return;
      }
    }
    onUpdate(editedField);
  };

  const renderPaymentFields = () => {
    if (!isPaymentField(editedField)) return null;

    return (
      <>
        <Form.Group className='mb-3'>
          <Form.Label>Amount (in cents)*</Form.Label>
          <Form.Control
            type='number'
            value={editedField.paymentConfig.amount}
            onChange={(e) =>
              handlePaymentConfigChange('amount', parseInt(e.target.value) || 0)
            }
            required
            min='0'
            step='1'
            isInvalid={
              isNaN(editedField.paymentConfig.amount) ||
              editedField.paymentConfig.amount < 0
            }
          />
          <Form.Control.Feedback type='invalid'>
            Please enter a valid positive amount
          </Form.Control.Feedback>
        </Form.Group>

        <Form.Group className='mb-3'>
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

        <Form.Group className='mb-3'>
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
      <Form.Group className='mb-3'>
        <Form.Label>Field Type</Form.Label>
        <Form.Control
          as='select'
          name='type'
          value={editedField.type}
          onChange={handleChange}
          disabled
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
      </Form.Group>

      <Form.Group className='mb-3'>
        <Form.Label>Label</Form.Label>
        <Form.Control
          type='text'
          name='label'
          value={editedField.label}
          onChange={handleChange}
        />
      </Form.Group>

      <Form.Group className='mb-3'>
        <Form.Check
          type='checkbox'
          label='Required'
          name='required'
          checked={editedField.required}
          onChange={handleChange}
        />
      </Form.Group>

      {['text', 'email', 'number'].includes(editedField.type) && (
        <Form.Group className='mb-3'>
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
        <>
          <Row>
            <Col>
              <Form.Group className='mb-3'>
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
              <Form.Group className='mb-3'>
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
        </>
      )}

      {['select', 'radio'].includes(editedField.type) && (
        <Form.Group className='mb-3'>
          <Form.Label className=''>Options</Form.Label>
          {('options' in editedField ? editedField.options || [] : []).map(
            (option, index) => (
              <div key={index} className='d-flex mb-2'>
                <Form.Control
                  type='text'
                  placeholder='Label'
                  value={option.label}
                  onChange={(e) =>
                    handleOptionChange(index, 'label', e.target.value)
                  }
                  className='me-2'
                />
                <Form.Control
                  type='text'
                  placeholder='Value'
                  value={option.value}
                  onChange={(e) =>
                    handleOptionChange(index, 'value', e.target.value)
                  }
                  className='me-2'
                />
                <Button variant='danger' onClick={() => removeOption(index)}>
                  <i className='ti ti-trash' />
                </Button>
              </div>
            )
          )}
          <Button variant='outline-secondary' onClick={addOption}>
            Add Option
          </Button>
        </Form.Group>
      )}

      {editedField.type === 'checkbox' && (
        <Form.Group className='mb-3'>
          <Form.Check
            type='checkbox'
            label='Checked by default'
            name='defaultValue'
            checked={
              'defaultValue' in editedField ? !!editedField.defaultValue : false
            }
            onChange={(e) => {
              setEditedField({
                ...editedField,
                defaultValue: e.target.checked,
              });
            }}
          />
        </Form.Group>
      )}

      {editedField.type === 'payment' && renderPaymentFields()}

      <Form.Group className='mb-3'>
        <Form.Label>Conditional Logic</Form.Label>
        <Form.Control
          as='select'
          value={
            'conditional' in editedField
              ? editedField.conditional?.fieldId ?? ''
              : ''
          }
          onChange={(e) => {
            const fieldId = e.target.value;
            setEditedField({
              ...editedField,
              conditional: fieldId
                ? {
                    fieldId,
                    value:
                      ('conditional' in editedField
                        ? editedField.conditional?.value
                        : undefined) ?? '',
                  }
                : undefined,
            });
          }}
        >
          <option value=''>No conditional logic</option>
          {otherFields.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </Form.Control>
      </Form.Group>

      {'conditional' in editedField && editedField.conditional && (
        <Form.Group className='mb-3'>
          <Form.Label>Show this field when:</Form.Label>
          <div className='d-flex align-items-center'>
            <span className='me-2'>{editedField.conditional.fieldId} is</span>
            <Form.Control
              type='text'
              value={editedField.conditional.value.toString()}
              onChange={(e) => {
                setEditedField({
                  ...editedField,
                  conditional: {
                    ...editedField.conditional!,
                    value: e.target.value,
                  },
                });
              }}
              placeholder='Enter value'
            />
          </div>
        </Form.Group>
      )}

      <Button variant='primary' onClick={handleSave}>
        Save Changes
      </Button>
    </div>
  );
};

export default FormFieldEditor;
