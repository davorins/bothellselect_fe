import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ExtendedTableRecord, ParentTableData } from '../../types/types';

export const useParentModal = () => {
  const { fetchParentPlayers } = useAuth();
  const [selectedParent, setSelectedParent] = useState<ParentTableData | null>(
    null
  );
  const [showParentModal, setShowParentModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleParentClick = async (record: ExtendedTableRecord) => {
    setError(null);
    setModalLoading(true);

    try {
      if (!record?._id) throw new Error('Invalid record: Missing ID');

      // Use the record data directly where possible
      const parentDetails: ParentTableData = {
        ...record, // Spread all record properties first
        // Then ensure required fields have fallbacks
        email: record.email || '',
        phone: record.phone || '',
        address: record.address || '',
        role: record.role || 'user',
        status: record.status || 'Active',
        DateofJoin:
          record.DateofJoin || record.createdAt || new Date().toISOString(),
        imgSrc: record.imgSrc || 'assets/img/profiles/avatar-27.jpg',
        aauNumber: record.aauNumber || 'N/A',
        players: record.players || [], // Use players from record if available
      };

      // Only fetch additional data if we don't have players
      if (
        (!parentDetails.players || parentDetails.players.length === 0) &&
        record.type === 'parent'
      ) {
        parentDetails.players = await fetchParentPlayers(record._id);
      }

      console.log('Parent details to show in modal:', parentDetails); // Debug log
      setSelectedParent(parentDetails);
      setShowParentModal(true);
    } catch (error) {
      console.error('Error handling parent click:', error);
      setError(
        error instanceof Error ? error.message : 'An unexpected error occurred'
      );
    } finally {
      setModalLoading(false);
    }
  };

  const handleCloseModal = () => {
    setShowParentModal(false);
    setSelectedParent(null);
    setError(null);
    setModalLoading(false);
  };

  return {
    selectedParent,
    showParentModal,
    modalLoading,
    error,
    handleParentClick,
    handleCloseModal,
  };
};
