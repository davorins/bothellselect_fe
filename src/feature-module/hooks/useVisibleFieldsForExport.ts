// src/hooks/useVisibleFieldsForExport.ts
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

interface FormFieldConfig {
  fieldName: string;
  isEnabled: boolean;
  appliesTo: string[];
}

export const useVisibleFieldsForExport = (
  entityType: 'player' | 'parent' | 'coach' | 'guardian' | 'team',
) => {
  const { getAuthToken } = useAuth();
  const [visibleFields, setVisibleFields] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVisibleFields = async () => {
      try {
        setLoading(true);
        const token = await getAuthToken();
        const response = await axios.get<{
          success: boolean;
          data: FormFieldConfig[];
        }>(`${API_BASE_URL}/form-fields/config/${entityType}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.data.success && response.data.data) {
          // Get enabled fields for this entity type
          const enabledFields = response.data.data
            .filter((field) => field.isEnabled === true)
            .map((field) => field.fieldName);

          setVisibleFields(enabledFields);
          setError(null);
        } else {
          setVisibleFields([]);
        }
      } catch (err: any) {
        console.error(`Error fetching visible fields for ${entityType}:`, err);
        // If API fails, fallback to showing all fields
        setVisibleFields([]);
        setError(
          err.response?.data?.error || 'Failed to load field visibility',
        );
      } finally {
        setLoading(false);
      }
    };

    fetchVisibleFields();
  }, [entityType, getAuthToken]);

  return { visibleFields, loading, error };
};
