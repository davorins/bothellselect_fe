// hooks/usePaginatedData.ts
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import axios from 'axios';
import { message } from 'antd';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface UsePaginatedDataOptions {
  endpoint: string;
  pageSize?: number;
  filters?: Record<string, any>;
  onError?: (error: string) => void;
  initialPage?: number;
}

interface CacheEntry<T = any> {
  data: T[];
  pagination: PaginationMeta;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();

export const usePaginatedData = <T = any>({
  endpoint,
  pageSize = 10,
  filters = {},
  onError,
  initialPage = 1,
}: UsePaginatedDataOptions) => {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationMeta>({
    total: 0,
    page: initialPage,
    limit: pageSize,
    pages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [currentPage, setCurrentPage] = useState(initialPage);

  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const isInitialMountRef = useRef(true);

  // ✅ Include pageSize in the key so changing page size triggers reset + refetch
  const filtersKey = useMemo(() => {
    const sortedFilters: Record<string, any> = {};
    Object.keys(filters)
      .sort()
      .forEach((key) => {
        if (
          filters[key] !== undefined &&
          filters[key] !== null &&
          filters[key] !== ''
        ) {
          sortedFilters[key] = filters[key];
        }
      });
    return `${pageSize}_${JSON.stringify(sortedFilters)}`;
  }, [filters, pageSize]);

  // Reset to page 1 when filters or pageSize change
  const prevFiltersKeyRef = useRef(filtersKey);
  useEffect(() => {
    if (prevFiltersKeyRef.current !== filtersKey) {
      prevFiltersKeyRef.current = filtersKey;
      setCurrentPage(1);
    }
  }, [filtersKey]);

  const getCacheKey = useCallback(
    (page: number) => `${endpoint}_${page}_${filtersKey}`,
    [endpoint, filtersKey],
  );

  const fetchData = useCallback(
    async (page: number) => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
      const requestId = ++requestIdRef.current;

      setLoading(true);
      setError(null);

      const params = new URLSearchParams();

      // Only add pagination params if pageSize > 0
      if (pageSize > 0) {
        params.append('page', page.toString());
        params.append('limit', pageSize.toString());
      }

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });

      // Log the full URL for debugging
      console.log('📡 Fetching URL:', `${API_BASE_URL}${endpoint}?${params}`);

      const cacheKey = getCacheKey(page);

      if (cache.has(cacheKey)) {
        console.log('📦 Using cached data for:', cacheKey);
        const cached = cache.get(cacheKey)!;
        if (isMountedRef.current) {
          setData(cached.data);
          setPagination(cached.pagination);
          setLoading(false);
        }
        return;
      }

      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('No authentication token');

        const response = await axios.get(
          `${API_BASE_URL}${endpoint}?${params}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            signal: abortControllerRef.current.signal,
            timeout: 10000,
          },
        );

        if (requestId !== requestIdRef.current || !isMountedRef.current) return;

        let newData: T[] = [];
        let newPagination = { ...pagination };

        if (response.data.data && response.data.pagination) {
          newData = response.data.data;
          newPagination = response.data.pagination;
        } else if (Array.isArray(response.data)) {
          newData = response.data;
          newPagination = {
            total: response.data.length,
            page: 1,
            limit: response.data.length,
            pages: 1,
            hasNextPage: false,
            hasPrevPage: false,
          };
        }

        cache.set(cacheKey, {
          data: newData,
          pagination: newPagination,
          timestamp: Date.now(),
        });

        // Prune entries older than 5 minutes
        const cutoff = Date.now() - 5 * 60 * 1000;
        cache.forEach((v, k) => {
          if (v.timestamp < cutoff) cache.delete(k);
        });

        setData(newData);
        setPagination(newPagination);
      } catch (err: any) {
        if (err.name === 'CanceledError' || err.name === 'AbortError') return;

        if (requestId === requestIdRef.current && isMountedRef.current) {
          const errorMessage =
            err.response?.data?.error || err.message || 'Failed to fetch data';
          setError(errorMessage);
          onError?.(errorMessage);
          message.error(errorMessage);
        }
      } finally {
        if (requestId === requestIdRef.current && isMountedRef.current) {
          setLoading(false);
        }
      }
    },
    [endpoint, pageSize, filters, onError, getCacheKey],
  );

  useEffect(() => {
    isMountedRef.current = true;

    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      fetchData(currentPage);
    } else {
      const timeoutId = setTimeout(() => {
        fetchData(currentPage);
      }, 100);
      return () => clearTimeout(timeoutId);
    }

    return () => {
      isMountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, [currentPage, fetchData]);

  const goToPage = useCallback(
    (page: number) => {
      // Don't allow page changes if we're in loadAll mode (pageSize === 0)
      if (pageSize === 0) return;

      if (page >= 1 && (pagination.pages === 0 || page <= pagination.pages)) {
        setCurrentPage(page);
      }
    },
    [pagination.pages, pageSize],
  );

  const nextPage = useCallback(() => {
    // Don't allow page changes if we're in loadAll mode
    if (pageSize === 0) return;
    if (pagination.hasNextPage) setCurrentPage((p) => p + 1);
  }, [pagination.hasNextPage, pageSize]);

  const prevPage = useCallback(() => {
    // Don't allow page changes if we're in loadAll mode
    if (pageSize === 0) return;
    if (pagination.hasPrevPage) setCurrentPage((p) => p - 1);
  }, [pagination.hasPrevPage, pageSize]);

  const refresh = useCallback(() => {
    // Clear all cache entries for this endpoint
    cache.forEach((_, k) => {
      if (k.startsWith(endpoint)) cache.delete(k);
    });
    fetchData(currentPage);
  }, [fetchData, endpoint, currentPage]);

  return {
    data,
    loading,
    error,
    pagination,
    currentPage,
    goToPage,
    nextPage,
    prevPage,
    refresh,
    setCurrentPage,
  };
};

export {};
