// hooks/useAvatar.ts
import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import {
  cleanR2Url,
  getDefaultAvatar,
  getAvatarUrl,
} from '../../utils/r2Utils';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

interface UseAvatarReturn {
  avatarSrc: string;
  isUploading: boolean;
  uploadAvatar: (file: File) => Promise<string | undefined>;
  deleteAvatar: () => Promise<void>;
  refreshAvatar: () => Promise<void>;
  setAvatarSrc: (url: string) => void;
}

interface UploadResponse {
  avatarUrl: string;
  key?: string;
  success?: boolean;
}

interface ParentResponse {
  avatar?: string;
  [key: string]: any;
}

export const useAvatar = (
  parentId: string | null,
  token: string | null,
  initialAvatar?: string | null,
): UseAvatarReturn => {
  const DEFAULT_AVATAR = getDefaultAvatar('parent');

  const [avatarSrc, setAvatarSrc] = useState<string>(
    getAvatarUrl(initialAvatar, DEFAULT_AVATAR),
  );
  const [isUploading, setIsUploading] = useState<boolean>(false);

  const refreshAvatar = useCallback(async (): Promise<void> => {
    if (!parentId || !token) return;

    try {
      const response = await axios.get<ParentResponse>(
        `${API_BASE_URL}/parent/${parentId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const avatarUrl = response.data.avatar;

      if (avatarUrl) {
        const cleanedUrl = cleanR2Url(avatarUrl);
        setAvatarSrc(cleanedUrl);
        localStorage.setItem('avatarUrl', cleanedUrl);
      } else {
        setAvatarSrc(DEFAULT_AVATAR);
        localStorage.removeItem('avatarUrl');
      }
    } catch (err) {
      console.error('Failed to refresh avatar:', err);
      setAvatarSrc(DEFAULT_AVATAR);
    }
  }, [parentId, token, DEFAULT_AVATAR]);

  const uploadAvatar = useCallback(
    async (file: File): Promise<string | undefined> => {
      if (!parentId || !token) {
        throw new Error('Authentication required');
      }

      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        throw new Error('Invalid file type. Please upload JPG, PNG, or WEBP.');
      }

      // Validate file size
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('File too large. Maximum size is 5MB.');
      }

      // Show local preview immediately for snappy UX
      const previewUrl = URL.createObjectURL(file);
      setAvatarSrc(previewUrl);
      setIsUploading(true);

      try {
        const formData = new FormData();
        formData.append('avatar', file);

        // FIX: Single request only. The backend route PUT /upload/parent/:id/avatar
        // handles both the R2 upload AND saving the URL to the database.
        // Do NOT set Content-Type manually — axios sets it with the correct
        // multipart boundary automatically when given a FormData body.
        const uploadResponse = await axios.put<UploadResponse>(
          `${API_BASE_URL}/upload/parent/${parentId}/avatar`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              // ✅ No Content-Type here — axios + FormData handles it correctly
            },
          },
        );

        const r2Url = cleanR2Url(uploadResponse.data.avatarUrl);

        // Update local state and cache
        setAvatarSrc(r2Url);
        localStorage.setItem('avatarUrl', r2Url);

        // Update localStorage parent object if present
        const storedParent = localStorage.getItem('parent');
        if (storedParent) {
          try {
            const parsedParent = JSON.parse(storedParent);
            parsedParent.avatar = r2Url;
            localStorage.setItem('parent', JSON.stringify(parsedParent));
          } catch (e) {
            console.error('Failed to update localStorage parent:', e);
          }
        }

        return r2Url;
      } catch (error: any) {
        console.error('Upload failed:', error);
        if (error.response) {
          console.error(
            'Server response:',
            error.response.status,
            error.response.data,
          );
        }
        // Revert preview on failure
        await refreshAvatar();
        throw error;
      } finally {
        setIsUploading(false);
        URL.revokeObjectURL(previewUrl);
      }
    },
    [parentId, token, refreshAvatar],
  );

  const deleteAvatar = useCallback(async (): Promise<void> => {
    if (!parentId || !token) {
      throw new Error('Authentication required');
    }

    try {
      await axios.delete(`${API_BASE_URL}/upload/parent/${parentId}/avatar`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setAvatarSrc(DEFAULT_AVATAR);
      localStorage.removeItem('avatarUrl');

      // Update localStorage parent object if present
      const storedParent = localStorage.getItem('parent');
      if (storedParent) {
        try {
          const parsedParent = JSON.parse(storedParent);
          delete parsedParent.avatar;
          localStorage.setItem('parent', JSON.stringify(parsedParent));
        } catch (e) {
          console.error('Failed to update localStorage parent:', e);
        }
      }
    } catch (error: any) {
      console.error('Delete failed:', error);
      if (error.response) {
        console.error(
          'Server response:',
          error.response.status,
          error.response.data,
        );
      }
      throw error;
    }
  }, [parentId, token, DEFAULT_AVATAR]);

  useEffect(() => {
    refreshAvatar();
  }, [refreshAvatar]);

  return {
    avatarSrc,
    isUploading,
    uploadAvatar,
    deleteAvatar,
    refreshAvatar,
    setAvatarSrc,
  };
};
