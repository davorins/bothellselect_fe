// hooks/useAllParents.ts
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { message } from 'antd';
import {
  getParentStatusFromEvents,
  getPaymentStatusFromEvents,
} from '../../utils/statusUtils';
import { SeasonEvent } from '../../context/SeasonEventsContext';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

export const useAllParents = (
  filters: any = {},
  activeEvents: SeasonEvent[] = [],
) => {
  const [allParents, setAllParents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalParents, setTotalParents] = useState(0);

  const fetchAllParents = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token');

      const params: any = { ...filters };

      const countResponse = await axios.get(`${API_BASE_URL}/parents`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { ...params, limit: 1 },
      });

      const total = countResponse.data.pagination?.total || 0;
      setTotalParents(total);

      const limit = Math.min(total, 500);
      const requests = [];

      for (let i = 0; i < limit; i += 50) {
        requests.push(
          axios.get(`${API_BASE_URL}/parents`, {
            headers: { Authorization: `Bearer ${token}` },
            params: { ...params, page: Math.floor(i / 50) + 1, limit: 50 },
          }),
        );
      }

      const responses = await Promise.all(requests);

      let allParentsData: any[] = [];
      responses.forEach((response) => {
        if (response.data.data) {
          allParentsData = [...allParentsData, ...response.data.data];
        }
      });

      const flattenedData: any[] = [];

      allParentsData.forEach((parent: any) => {
        const status = getParentStatusFromEvents(parent, activeEvents);
        const paymentStatus = getPaymentStatusFromEvents(parent, activeEvents);

        flattenedData.push({
          ...parent,
          _id: parent._id,
          id: parent._id,
          fullName: parent.fullName || '',
          email: parent.email || '',
          phone: parent.phone || '',
          status,
          paymentStatus,
          type: parent.isCoach ? 'coach' : 'parent',
          isCoach: parent.isCoach || false,
          players: parent.players || [],
          address: parent.address || {},
          aauNumber: parent.aauNumber || '',
          avatar: parent.avatar || '',
          imgSrc: parent.avatar || '',
          relationship:
            parent.relationship || (parent.isCoach ? 'Coach' : 'Parent'),
          DateofJoin: parent.createdAt || new Date().toISOString(),
          createdAt: parent.createdAt,
          updatedAt: parent.updatedAt,
          canView: true,
          parentId: null,
        });

        if (parent.additionalGuardians?.length > 0) {
          parent.additionalGuardians.forEach((guardian: any, index: number) => {
            const guardianWithPlayers = {
              ...guardian,
              players: parent.players || [],
              isCoach: guardian.isCoach || false,
            };
            flattenedData.push({
              _id: guardian._id || `${parent._id}_guardian_${index}`,
              id: guardian._id || `${parent._id}_guardian_${index}`,
              parentId: parent._id,
              parentName: parent.fullName,
              parentEmail: parent.email,
              fullName: guardian.fullName || '',
              email: guardian.email || '',
              phone: guardian.phone || '',
              status: getParentStatusFromEvents(
                guardianWithPlayers,
                activeEvents,
              ),
              paymentStatus: getPaymentStatusFromEvents(
                guardianWithPlayers,
                activeEvents,
              ),
              type: 'guardian',
              isCoach: guardian.isCoach || false,
              players: parent.players || [],
              address: guardian.address || parent.address || {},
              aauNumber: guardian.aauNumber || '',
              avatar: guardian.avatar || '',
              imgSrc: guardian.avatar || '',
              relationship: guardian.relationship || 'Guardian',
              DateofJoin:
                guardian.createdAt ||
                parent.createdAt ||
                new Date().toISOString(),
              createdAt: guardian.createdAt || parent.createdAt,
              updatedAt: guardian.updatedAt || parent.updatedAt,
              canView: true,
            });
          });
        }
      });

      setAllParents(flattenedData);
    } catch (err: any) {
      console.error('❌ Error fetching all parents:', err);
      setError(err.message || 'Failed to fetch data');
      message.error('Failed to load all parents');
    } finally {
      setLoading(false);
    }
  }, [filters, activeEvents]); // activeEvents in deps so it refetches when events load

  useEffect(() => {
    fetchAllParents();
  }, [fetchAllParents]);

  const refresh = useCallback(() => {
    fetchAllParents();
  }, [fetchAllParents]);

  return {
    data: allParents,
    loading,
    error,
    total: allParents.length,
    parentTotal: totalParents,
    refresh,
  };
};
