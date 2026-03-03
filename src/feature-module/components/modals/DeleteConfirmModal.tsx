// src/components/Modals/DeleteConfirmModal.tsx
import React from 'react';
import { Modal, message } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const { confirm } = Modal;

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

export interface DeleteUserData {
  _id: string;
  fullName: string;
  email?: string;
  parentId?: string;
  type?: 'parent' | 'guardian' | 'coach';
  isCoach?: boolean;
  role?: string;
}

export const deleteUser = async (
  userId: string,
  onSuccess?: () => void,
  onError?: (error: string) => void,
) => {
  console.log('🗑️ ===== DELETE USER STARTED =====');
  console.log('🗑️ User ID to delete:', userId);

  try {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('❌ No authentication token found');
      throw new Error('Authentication token not found');
    }

    console.log(
      '📡 Sending delete request to:',
      `${API_BASE_URL}/parent/${userId}`,
    );

    const response = await axios.delete(`${API_BASE_URL}/parent/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    console.log('✅ Delete response:', response.data);
    console.log('🗑️ User deleted successfully');

    message.success('User account deleted successfully');

    // 🔥 INCREASE DELAY to 1 second to ensure backend processing is complete
    console.log('⏱️ Waiting 1000ms before calling onSuccess...');
    setTimeout(() => {
      console.log('📞 Calling onSuccess callback');
      onSuccess?.();
      console.log('🗑️ ===== DELETE COMPLETED =====');
    }, 1000);
  } catch (error: any) {
    console.error('❌ Error deleting user:', error);
    const errorMessage =
      error.response?.data?.error || 'Failed to delete user account';
    message.error(errorMessage);
    onError?.(errorMessage);
    console.log('🗑️ ===== DELETE FAILED =====');
  }
};

export const showDeleteConfirm = (
  record: DeleteUserData,
  options?: {
    onDeleteSuccess?: () => void;
    redirectTo?: string;
    customTitle?: string;
    customContent?: React.ReactNode;
  },
) => {
  const targetRecord = record.parentId
    ? { ...record, _id: record.parentId }
    : record;

  const getTitle = () => {
    if (options?.customTitle) return options.customTitle;

    if (record.isCoach || record.role === 'coach') {
      return 'Delete Coach Account';
    }
    if (record.type === 'guardian') {
      return 'Delete Guardian Account';
    }
    return 'Delete User Account';
  };

  const getContent = () => {
    if (options?.customContent) return options.customContent;

    const roleText =
      record.isCoach || record.role === 'coach'
        ? 'coach'
        : record.type === 'guardian'
          ? 'guardian'
          : 'user';

    return (
      <div>
        <p>Are you sure you want to delete this {roleText} account?</p>
        <p>
          <strong>Name:</strong> {targetRecord.fullName}
        </p>
        <p>
          <strong>Email:</strong> {targetRecord.email || 'N/A'}
        </p>
        <div
          className='alert alert-danger mt-2 p-2'
          style={{ fontSize: '14px' }}
        >
          <i className='ti ti-alert-triangle me-2'></i>
          This action cannot be undone. This will permanently delete:
          <ul className='mt-2 mb-0'>
            <li>The user's personal information</li>
            <li>All associated player profiles</li>
            <li>Registration history and payment records</li>
          </ul>
        </div>
      </div>
    );
  };

  confirm({
    title: getTitle(),
    icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
    content: getContent(),
    okText: 'Delete',
    okType: 'danger',
    cancelText: 'Cancel',
    okButtonProps: {
      className: 'btn btn-danger',
    },
    onOk: async () => {
      await deleteUser(targetRecord._id, options?.onDeleteSuccess, (error) =>
        message.error(error),
      );
    },
  });
};

// Hook for easy use with navigation
export const useDeleteConfirm = () => {
  const navigate = useNavigate();

  const showDeleteConfirmWithRedirect = (
    record: DeleteUserData,
    redirectTo?: string,
    customTitle?: string,
    customContent?: React.ReactNode,
  ) => {
    showDeleteConfirm(record, {
      onDeleteSuccess: () => {
        if (redirectTo) {
          setTimeout(() => {
            navigate(redirectTo);
          }, 300);
        }
      },
      customTitle,
      customContent,
    });
  };

  return { showDeleteConfirm: showDeleteConfirmWithRedirect, deleteUser };
};
