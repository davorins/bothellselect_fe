import axios from 'axios';
import { EmailTemplate } from '../types/types';

const API_URL = '/api/email-templates';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

// ✅ Sanitize payload to only send valid fields to backend
const sanitizeTemplatePayload = (template: EmailTemplate) => {
  const { title, subject, content, status, variables, category, tags } =
    template;

  return {
    title,
    subject,
    content,
    status,
    variables,
    category,
    tags,
  };
};

// ✅ Fetch all templates
export const getTemplates = async () => {
  try {
    const response = await axios.get(API_URL, getAuthHeaders());
    return response.data;
  } catch (error) {
    console.error('Error fetching templates:', error);
    throw error;
  }
};

// ✅ Create new template
export const createTemplate = async (templateData: EmailTemplate) => {
  try {
    const payload = sanitizeTemplatePayload(templateData);
    const response = await axios.post(API_URL, payload, getAuthHeaders());
    return response.data;
  } catch (error) {
    console.error('Error creating template:', error);
    throw error;
  }
};

// ✅ Update existing template
export const updateTemplate = async (
  id: string,
  templateData: EmailTemplate
) => {
  try {
    const payload = sanitizeTemplatePayload(templateData);
    const response = await axios.put(
      `${API_URL}/${id}`,
      payload,
      getAuthHeaders()
    );
    return response.data;
  } catch (error) {
    console.error('Error updating template:', error);
    throw error;
  }
};

// ✅ Delete a template
export const deleteTemplate = async (id: string) => {
  try {
    const response = await axios.delete(`${API_URL}/${id}`, getAuthHeaders());
    return response.data;
  } catch (error) {
    console.error('Error deleting template:', error);
    throw error;
  }
};

// ✅ Send email using a template (standalone function)
export const sendTemplateEmail = async ({
  templateId,
  parentId,
  playerId,
  to,
}: {
  templateId: string;
  parentId: string;
  playerId: string;
  to?: string;
}) => {
  try {
    const response = await axios.post(
      `${API_URL}/send-template`,
      { templateId, parentId, playerId, to },
      getAuthHeaders()
    );
    return response.data;
  } catch (error) {
    console.error('Error sending template email:', error);
    throw error;
  }
};

// ✅ Encapsulated email template service
export const emailTemplateService = {
  async getAll() {
    const response = await axios.get(API_URL, getAuthHeaders());
    return response.data.data;
  },

  async getById(id: string) {
    const response = await axios.get(`${API_URL}/${id}`, getAuthHeaders());
    return response.data.data;
  },

  async sendTemplate(templateId: string, parentId: string, playerId: string) {
    const response = await axios.post(
      `${API_URL}/send-template`,
      { templateId, parentId, playerId },
      getAuthHeaders()
    );
    return response.data;
  },

  async sendTemplateTo(
    templateId: string,
    parentId: string,
    playerId: string,
    to?: string
  ) {
    const response = await axios.post(
      `${API_URL}/send-template`,
      { templateId, parentId, playerId, to },
      getAuthHeaders()
    );
    return response.data;
  },

  async getAllActiveTemplates() {
    const response = await axios.get(
      `${API_URL}?status=active`,
      getAuthHeaders()
    );
    return response.data.data;
  },
};
