import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { all_routes } from '../feature-module/router/all_routes';
import { registerUser } from '../services/authService';
import axios from 'axios';
import {
  Parent,
  Guardian,
  Player,
  SearchResult,
  DecodedToken,
  AuthContextType,
  RegistrationStatus,
  Address,
  TempAccountData,
  CompleteRegistrationData,
} from '../types/types';
import { getCurrentSeason, getCurrentYear } from '../utils/season';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
console.log('API_BASE_URL:', process.env.REACT_APP_API_BASE_URL);
const AuthContext = createContext<AuthContextType | null>(null);

// Export fetchParentData as a standalone function
export const fetchParentData = async (
  parentId: string,
  token: string | null,
): Promise<Parent | null> => {
  try {
    if (!token) {
      console.error('No token found');
      return null;
    }

    const response = await axios.get<Parent>(
      `${API_BASE_URL}/parent/${parentId}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    return response.data;
  } catch (error) {
    console.error('Error fetching parent:', error);
    return null;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [parent, setParent] = useState<Parent | null>(null);
  const [viewedParent, setViewedParent] = useState<Parent | null>(null);
  const [viewedCoach, setViewedCoach] = useState<Parent | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const [allParents, setAllParents] = useState<Parent[]>([]);
  const [parents, setParents] = useState<Parent[]>([]);
  const [allGuardians] = useState<Guardian[]>([]);
  const authCheckInProgress = useRef(false);
  const lastAuthCheckTime = useRef<number>(0);
  const lastParentId = useRef<string | null>(null);
  const [currentSeason, setCurrentSeason] = useState(getCurrentSeason());
  const [currentYear, setCurrentYear] = useState(getCurrentYear());
  const [isEmailVerified, setIsEmailVerified] = useState(false);

  const getAuthToken = async () => {
    // Return the current auth token (from localStorage, cookies, etc.)
    return localStorage.getItem('token') || null;
  };

  const searchAll = useCallback(
    async (term: string): Promise<SearchResult[]> => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return [];

        const response = await axios.get(`${API_BASE_URL}/search/all`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { q: term },
        });

        // Transform the response to match SearchResult
        return response.data.map((item: any) => ({
          id: item._id || item.id,
          type: item.type,
          name: item.fullName || item.name,
          gender: item.gender,
          grade: item.grade,
          dob: item.dob,
          aauNumber: item.aauNumber,
          phone: item.phone,
          address: item.address,
          email: item.email,
          image: item.image || item.profileImage,
          additionalInfo: item.schoolName || item.additionalInfo,
          createdAt: item.createdAt,
          isActive: item.status,
          playerStatus: item.status,
          status: item.status,
          season: item.season,
          registrationYear: item.registrationYear,
        }));
      } catch (error) {
        console.error('Search error:', error);
        return [];
      }
    },
    [],
  );

  const logout = useCallback(() => {
    console.log('Starting logout...');
    localStorage.removeItem('token');
    console.log('Token removed from localStorage');
    localStorage.removeItem('parentId');
    localStorage.removeItem('parent');
    console.log('Parent data removed from localStorage');
    setIsAuthenticated(false);
    console.log('isAuthenticated set to false');
    setParent(null);
    console.log('Parent set to null');

    navigate('/login');

    // Force page refresh to clear all user data from memory
    setTimeout(() => {
      window.location.reload();
    }, 50);

    console.log('Redirected to login page and page refreshed');
  }, [navigate]);

  const fetchPlayersData = useCallback(
    async (playerIds: string[], queryParams = '') => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const decoded = jwtDecode<DecodedToken>(token);
        const isAdmin = decoded.role === 'admin';

        let url = `${API_BASE_URL}/players`;
        if (isAdmin && playerIds.length === 0) {
          url += `?${queryParams}`;
        } else {
          url += `?ids=${playerIds.join(',')}`;
          if (queryParams) {
            url += `&${queryParams}`;
          }
        }

        const response = await axios.get<Player[]>(url, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setPlayers(response.data);
      } catch (error) {
        console.error('Error fetching players data:', error);
      }
    },
    [],
  );

  const fetchPlayerData = useCallback(async (playerId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No token found');
      }

      const response = await axios.get<Player>(
        `${API_BASE_URL}/player/${playerId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      return response.data;
    } catch (error) {
      console.error('Error fetching player data:', error);
      return null;
    }
  }, []);

  const fetchAllPlayers = useCallback(
    async (queryParams = ''): Promise<Player[]> => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return [];

        const url = `${API_BASE_URL}/players?${queryParams}`;
        const response = await axios.get<Player[]>(url, {
          headers: { Authorization: `Bearer ${token}` },
        });

        // Filter players based on seasons array, not just top-level season
        const filteredPlayers = response.data.filter((player) => {
          // If no season filter is applied, return all players
          if (!queryParams.includes('season=')) return true;

          // Extract season and year from query params
          const params = new URLSearchParams(queryParams);
          const filterSeason = params.get('season');
          const filterYear = parseInt(params.get('year') || '0');

          // Check if player has this season in their seasons array
          return player.seasons?.some(
            (s) => s.season === filterSeason && s.year === filterYear,
          );
        });

        return filteredPlayers;
      } catch (error) {
        console.error('Error fetching all players:', error);
        return [];
      }
    },
    [],
  );

  const setParentData = useCallback(
    (fetchedParent: Parent | any, isViewing = false): Parent => {
      const parentData: Parent = {
        _id: fetchedParent._id || fetchedParent.parentId || '',
        email: fetchedParent.email || '',
        fullName: fetchedParent.fullName || '',
        role: fetchedParent.role || 'Parent',
        phone: fetchedParent.phone || '',
        address:
          typeof fetchedParent.address === 'object'
            ? `${fetchedParent.address.street}, ${fetchedParent.address.city}, ${fetchedParent.address.state} ${fetchedParent.address.zip}`
            : fetchedParent.address || '',
        relationship: fetchedParent.relationship || '',
        players: Array.isArray(fetchedParent.players)
          ? fetchedParent.players.filter(
              (p: any) => typeof p === 'object' && p._id,
            )
          : [],
        isCoach: fetchedParent.isCoach || false,
        aauNumber: fetchedParent.aauNumber || '',
        additionalGuardians: fetchedParent.additionalGuardians || [],
        dismissedNotifications: fetchedParent.dismissedNotifications || [],
        playersSeason: fetchedParent.string || [],
        playersYear: fetchedParent.number || [],
      };

      if (isViewing) {
        return parentData;
      }

      // Only update main parent if it's the current user
      if (parent?._id === parentData._id) {
        setParent(parentData);
      }
      return parentData;
    },
    [parent],
  );

  const fetchParentData = useCallback(
    async (parentId: string, isViewing = false): Promise<Parent | null> => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return null;

        const response = await axios.get<Parent>(
          `${API_BASE_URL}/parent/${parentId}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );

        const processedParent = setParentData(response.data, isViewing);

        if (isViewing) {
          setViewedParent(processedParent);
        }

        return processedParent;
      } catch (error) {
        console.error('Error fetching parent:', error);
        return null;
      }
    },
    [setParentData, setViewedParent],
  );

  const fetchGuardians = useCallback(async (playerId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No token found');
      }

      const response = await axios.get<Guardian[]>(
        `${API_BASE_URL}/player/${playerId}/guardians`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      return response.data;
    } catch (error) {
      console.error('Error fetching guardians:', error);
      return [];
    }
  }, []);

  const fetchAllParents = useCallback(async (queryParams = '') => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return [];

      // First, get the first page to know total count
      const initialResponse = await axios.get<{
        data: Parent[];
        pagination: any;
      }>(`${API_BASE_URL}/parents?${queryParams}&page=1&limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const pagination = initialResponse.data.pagination;
      let allParentsData = [...(initialResponse.data.data || [])];

      // If there are more pages, fetch them
      if (pagination && pagination.pages > 1) {
        const pagePromises = [];

        // Start from page 2 since we already have page 1
        for (let page = 2; page <= pagination.pages; page++) {
          pagePromises.push(
            axios.get<{ data: Parent[] }>(
              `${API_BASE_URL}/parents?${queryParams}&page=${page}&limit=100`,
              {
                headers: { Authorization: `Bearer ${token}` },
              },
            ),
          );
        }

        // Wait for all page requests to complete
        const pageResponses = await Promise.all(pagePromises);

        // Combine all data
        pageResponses.forEach((response) => {
          allParentsData = [...allParentsData, ...(response.data.data || [])];
        });
      }

      setAllParents(allParentsData);
      setParents(allParentsData);
      return allParentsData;
    } catch (error) {
      console.error('Error fetching parents:', error);
      return [];
    }
  }, []);

  const fetchParentsData = useCallback(async (parentId?: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      setIsLoading(true);

      let url = `${API_BASE_URL}/parents`;
      if (parentId) {
        url = `${API_BASE_URL}/parent/${parentId}`;
        const response = await axios.get<Parent>(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setParents([response.data]);
      } else {
        const response = await axios.get<Parent[]>(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setParents(response.data);
        setAllParents(response.data); // Update allParents at the same time
      }
    } catch (error) {
      console.error('Error fetching parents:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchParentPlayers = useCallback(
    async (parentId: string): Promise<Player[]> => {
      try {
        console.log('🔍 fetchParentPlayers called with parentId:', parentId);

        // Validate parentId
        if (!parentId || !/^[0-9a-fA-F]{24}$/.test(parentId)) {
          console.log('⚠️ Invalid parentId provided, returning empty array');
          return [];
        }

        const token = localStorage.getItem('token');
        if (!token) {
          console.error('❌ No authentication token found');
          return [];
        }

        console.log('📡 Making API request to fetch players...');

        const response = await axios.get<Player[]>(
          `${API_BASE_URL}/players/by-parent/${parentId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        console.log('✅ Players fetched successfully:', response.data.length);
        return response.data;
      } catch (error) {
        // Handle 404 as "no players found" - this is normal for new users
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          console.log(
            'ℹ️ No players found for this parent - this is normal for new registrations',
          );
          return []; // Return empty array for 404
        }

        console.error(
          `❌ Error fetching players for parent ${parentId}:`,
          error,
        );
        return []; // Return empty array on any error
      }
    },
    [],
  );

  const refreshPlayers = useCallback(async () => {
    const parentId = localStorage.getItem('parentId');
    if (!parentId) {
      setPlayers([]);
      return;
    }

    try {
      const playersData = await fetchParentPlayers(parentId);
      setPlayers(playersData);
    } catch (error) {
      console.error('Error refreshing players:', error);
      setPlayers([]);
    }
  }, [fetchParentPlayers]); // Now fetchParentPlayers is stable

  const fetchAllGuardians = useCallback(async (queryParams = '') => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return [];

      const response = await axios.get<Guardian[]>(
        `${API_BASE_URL}/guardians?${queryParams}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      return response.data;
    } catch (error) {
      console.error('Error fetching guardians:', error);
      return [];
    }
  }, []);

  // ==================== TWO-STEP REGISTRATION FUNCTIONS ====================

  const createTempAccount = async (
    email: string,
    password: string,
  ): Promise<{ tempToken: string }> => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/auth/create-temp-account`,
        {
          email: email.toLowerCase().trim(),
          password: password.trim(),
        },
      );

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to create account');
      }

      // Store temp token for completing registration later
      localStorage.setItem('tempToken', response.data.tempToken);
      localStorage.setItem('pendingEmail', email);

      return { tempToken: response.data.tempToken };
    } catch (error: any) {
      throw new Error(
        error.response?.data?.error || 'Failed to create account',
      );
    }
  };

  const completeRegistration = async (
    userData: CompleteRegistrationData,
    tempToken: string,
  ): Promise<Parent> => {
    try {
      // Use your existing /register endpoint
      const response = await axios.post(`${API_BASE_URL}/register`, {
        email: localStorage.getItem('pendingEmail'),
        password: 'temp-password-placeholder',
        fullName: userData.fullName,
        phone: userData.phone,
        address: userData.address,
        relationship: userData.relationship,
        isCoach: userData.isCoach,
        aauNumber: userData.aauNumber,
        agreeToTerms: userData.agreeToTerms,
        registerType: 'self',
        tempToken: tempToken,
      });

      if (!response.data.token) {
        throw new Error('Registration completed but no token received');
      }

      // Clear temp data
      localStorage.removeItem('tempToken');
      localStorage.removeItem('pendingEmail');

      // Store the actual auth token
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('parentId', response.data.parent._id);
      localStorage.setItem('parent', JSON.stringify(response.data.parent));

      // Update auth state
      setIsAuthenticated(true);
      setParent(response.data.parent);
      setIsEmailVerified(false); // Will be set to true after verification

      navigate(all_routes.adminDashboard);

      // Reload the page to refresh context
      setTimeout(() => {
        window.location.reload();
      }, 100);

      return response.data.parent;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.error || 'Failed to complete registration',
      );
    }
  };

  // Update the existing register function to use the new two-step process internally
  const register = async (
    email: string,
    password: string,
    fullName: string,
    phone: string,
    address: any,
    relationship: string,
    isCoach: boolean,
    aauNumber: string,
    agreeToTerms: boolean,
  ): Promise<Parent> => {
    try {
      console.log('📤 Sending registration request...');

      const response = await axios.post(`${API_BASE_URL}/register`, {
        email: email.toLowerCase().trim(),
        password: password.trim(),
        fullName: fullName.trim(),
        phone: phone.replace(/\D/g, ''),
        address: address,
        relationship: relationship.trim(),
        isCoach: isCoach || false,
        aauNumber: isCoach ? aauNumber?.trim() : '',
        agreeToTerms: agreeToTerms,
        registerType: 'self',
      });

      console.log('📥 Registration response:', response.data);

      if (!response.data.token) {
        throw new Error('Registration completed but no token received');
      }

      if (!response.data.parent || !response.data.parent._id) {
        throw new Error('Registration completed but no parent data received');
      }

      // Store the actual auth token
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('parentId', response.data.parent._id);
      localStorage.setItem('parent', JSON.stringify(response.data.parent));

      // Update auth state
      setIsAuthenticated(true);
      setParent(response.data.parent);
      setIsEmailVerified(false);

      console.log(
        '✅ Registration successful, parent ID:',
        response.data.parent._id,
      );

      navigate(all_routes.adminDashboard);

      // Reload the page to refresh context
      setTimeout(() => {
        window.location.reload();
      }, 100);

      // ⭐⭐⭐ IMPORTANT: RETURN THE PARENT DATA ⭐⭐⭐
      return response.data.parent;
    } catch (error: any) {
      console.error('❌ Registration error:', error);
      throw new Error(
        error.response?.data?.error || 'Failed to complete registration',
      );
    }
  };

  // ==================== EMAIL VERIFICATION FUNCTIONS ====================
  const sendVerificationEmail = async (email: string): Promise<void> => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.post(
        `${API_BASE_URL}/auth/send-verification-email`,
        { email },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (response.data.success) {
        console.log('Verification email sent successfully');
      } else {
        throw new Error(
          response.data.error || 'Failed to send verification email',
        );
      }
    } catch (error: any) {
      console.error('Error sending verification email:', error);
      throw new Error(
        error.response?.data?.error ||
          'Failed to send verification email. Please try again.',
      );
    }
  };

  const verifyEmail = async (token: string): Promise<boolean> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/verify-email`, {
        token,
      });

      if (response.data.success) {
        // Token is valid - that's all we need!
        return true;
      }
      return false;
    } catch (error: any) {
      console.error('Error verifying email token:', error);
      throw new Error(error.response?.data?.error || 'Failed to verify token');
    }
  };

  const checkVerificationStatus = useCallback(async (): Promise<boolean> => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('❌ No token found for verification check');
        return false;
      }

      console.log('🔍 Checking verification status...');

      const response = await axios.get(
        `${API_BASE_URL}/auth/verification-status`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      console.log('📊 Verification status response:', response.data);

      const isVerified = response.data.verified || false;
      setIsEmailVerified(isVerified);

      // Also update parent data if we have it
      if (parent && parent.emailVerified !== isVerified) {
        const updatedParent = { ...parent, emailVerified: isVerified };
        setParent(updatedParent);
        localStorage.setItem('parent', JSON.stringify(updatedParent));
      }

      return isVerified;
    } catch (error) {
      console.error('❌ Error checking verification status:', error);
      // If there's an error, assume not verified
      return false;
    }
  }, [parent, setIsEmailVerified, setParent]);

  const resendVerificationEmail = async (email?: string): Promise<void> => {
    try {
      let targetEmail = email || parent?.email;

      if (!targetEmail) {
        const pendingEmail = localStorage.getItem('pendingEmail');
        targetEmail = pendingEmail || undefined;
      }

      if (!targetEmail) {
        throw new Error('Email address is required to resend verification.');
      }

      // Use PUBLIC endpoint (no authentication)
      const response = await axios.post(
        `${API_BASE_URL}/auth/resend-verification-email`,
        { email: targetEmail },
        // NO headers - public endpoint
      );

      if (response.data.success) {
        console.log('Verification email resent successfully');
      } else {
        throw new Error(
          response.data.error || 'Failed to resend verification email',
        );
      }
    } catch (error: any) {
      console.error('Error resending verification email:', error);
      throw new Error(
        error.response?.data?.error || 'Failed to resend verification email',
      );
    }
  };

  const checkAuth = useCallback(async () => {
    // Skip if already in progress or checked recently
    if (
      authCheckInProgress.current ||
      Date.now() - lastAuthCheckTime.current < 1000
    ) {
      return;
    }

    authCheckInProgress.current = true;
    lastAuthCheckTime.current = Date.now();

    const token = localStorage.getItem('token');
    const parentIdFromStorage = localStorage.getItem('parentId');
    const storedParent = localStorage.getItem('parent');
    const role = localStorage.getItem('role');
    const currentParentId = parent?._id;

    try {
      // Clear auth if no token
      if (!token) {
        setIsAuthenticated(false);
        setParent(null);
        setPlayers([]);
        setIsLoading(false);
        setIsEmailVerified(false);
        return;
      }

      const decoded = jwtDecode<DecodedToken>(token);
      const isTokenValid = !(decoded.exp && decoded.exp * 1000 < Date.now());

      if (!isTokenValid) {
        logout();
        return;
      }

      setIsAuthenticated(true);

      // Check email verification status for all authenticated users
      try {
        const verificationStatus = await checkVerificationStatus();
        setIsEmailVerified(verificationStatus);
      } catch (verificationError) {
        console.warn('Failed to check verification status:', verificationError);
      }

      // First try to use stored parent data if available and matches token
      if (storedParent) {
        try {
          const parsedParent = JSON.parse(storedParent);
          if (parsedParent._id === decoded.id) {
            setParent(parsedParent);
            lastParentId.current = parsedParent._id;

            // Fetch fresh data in background including players
            if (parentIdFromStorage) {
              Promise.all([
                fetchParentData(parentIdFromStorage),
                fetchParentPlayers(parentIdFromStorage),
              ])
                .then(([freshParentData, playersData]) => {
                  if (freshParentData) {
                    // Preserve email verification status
                    const updatedParent = {
                      ...freshParentData,
                      emailVerified: parsedParent.emailVerified || false,
                    };
                    localStorage.setItem(
                      'parent',
                      JSON.stringify(updatedParent),
                    );
                    setParent(updatedParent);
                  }
                  // Even if no players found, set empty array instead of error
                  setPlayers(playersData || []);
                })
                .catch((error) => {
                  console.warn('Background data fetch failed:', error);
                  // Don't throw error, just set empty players array
                  setPlayers([]);
                });
            }

            setIsLoading(false);
            return;
          }
        } catch (e) {
          console.warn('Failed to parse stored parent data', e);
        }
      }

      // Admin user flow
      if (role === 'Admin') {
        if (currentParentId === 'admin') return;

        const adminData: Parent = {
          _id: 'admin',
          email: decoded.email || '',
          fullName: decoded.fullName || 'Administrator',
          role: 'Admin',
          phone: '',
          address: '',
          relationship: '',
          players: [],
          isCoach: false,
          aauNumber: '',
          additionalGuardians: [],
          dismissedNotifications: [],
          playersSeason: [],
          playersYear: [],
          emailVerified: true,
        };

        setParent(adminData);
        localStorage.setItem('parent', JSON.stringify(adminData));
        lastParentId.current = 'admin';
        setIsEmailVerified(true);
        setPlayers([]); // Explicitly set empty players for admin
        return;
      }

      // Regular parent user flow
      if (parentIdFromStorage) {
        setIsLoading(true);

        try {
          const [parentData, playersData] = await Promise.all([
            fetchParentData(parentIdFromStorage),
            fetchParentPlayers(parentIdFromStorage),
          ]);

          if (!parentData) {
            const fallbackParent: Parent = {
              _id: decoded.id,
              email: decoded.email || '',
              fullName: decoded.fullName || '',
              role: decoded.role || 'Parent',
              phone: decoded.phone || '',
              address:
                typeof decoded.address === 'string'
                  ? decoded.address
                  : decoded.address
                    ? `${decoded.address.street}, ${decoded.address.city}, ${decoded.address.state} ${decoded.address.zip}`
                    : '',
              relationship: decoded.relationship || '',
              players: decoded.players || [],
              isCoach: decoded.isCoach || false,
              aauNumber: decoded.aauNumber || '',
              additionalGuardians: decoded.additionalGuardians || [],
              dismissedNotifications: decoded.dismissedNotifications || [],
              playersSeason: decoded.playersSeason || [],
              playersYear: decoded.playersYear || [],
              emailVerified: false,
            };

            setParent(fallbackParent);
            localStorage.setItem('parent', JSON.stringify(fallbackParent));
            setIsEmailVerified(false);
            setPlayers([]); // Set empty players array
          } else {
            const updatedParent = {
              ...parentData,
              email: parentData.email || decoded.email || '',
              fullName: parentData.fullName || decoded.fullName || '',
              emailVerified: parentData.emailVerified || false,
            };
            setParent(updatedParent);
            localStorage.setItem('parent', JSON.stringify(updatedParent));
            setIsEmailVerified(updatedParent.emailVerified);
            setPlayers(playersData || []); // Use players data or empty array
          }

          lastParentId.current = parentIdFromStorage;
        } catch (error) {
          console.error('Failed to fetch user data:', error);

          const fallbackParent: Parent = {
            _id: decoded.id,
            email: decoded.email || '',
            fullName: decoded.fullName || '',
            role: decoded.role || 'Parent',
            phone: decoded.phone || '',
            address:
              typeof decoded.address === 'string'
                ? decoded.address
                : decoded.address
                  ? `${decoded.address.street}, ${decoded.address.city}, ${decoded.address.state} ${decoded.address.zip}`
                  : '',
            relationship: decoded.relationship || '',
            players: decoded.players || [],
            isCoach: decoded.isCoach || false,
            aauNumber: decoded.aauNumber || '',
            additionalGuardians: decoded.additionalGuardians || [],
            dismissedNotifications: decoded.dismissedNotifications || [],
            playersSeason: decoded.playersSeason || [],
            playersYear: decoded.playersYear || [],
            emailVerified: false,
          };

          setParent(fallbackParent);
          localStorage.setItem('parent', JSON.stringify(fallbackParent));
          setPlayers([]); // Always set empty array on error
          setIsEmailVerified(false);
        } finally {
          setIsLoading(false);
        }
      }
    } catch (error) {
      console.error('Auth check error:', error);
      logout();
    } finally {
      authCheckInProgress.current = false;
    }
  }, [logout, parent?._id, checkVerificationStatus, setIsEmailVerified]);

  const refreshAuthData = useCallback(async () => {
    setIsLoading(true);
    try {
      lastParentId.current = null; // Force complete reload
      await checkAuth();
    } finally {
      setIsLoading(false);
    }
  }, [checkAuth]);

  useEffect(() => {
    const initializeAuth = async () => {
      await checkAuth();
    };
    initializeAuth();

    const refreshInterval = setInterval(checkAuth, 300000);
    return () => clearInterval(refreshInterval);
  }, [checkAuth]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const newSeason = getCurrentSeason();
      const newYear = now.getFullYear();

      if (newSeason !== currentSeason) {
        setCurrentSeason(newSeason);
      }
      if (newYear !== currentYear) {
        setCurrentYear(newYear);
      }
    }, 86400000); // Check once per day

    return () => clearInterval(interval);
  }, [currentSeason, currentYear]);

  const login = async (email: string, password: string) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/login`, {
        email: email.trim(),
        password: password.trim(),
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Login failed');
      }

      const { token, parent } = response.data;

      if (!token || !parent?._id) {
        throw new Error('Invalid response from server');
      }

      // Store auth data
      localStorage.setItem('token', token);
      localStorage.setItem('parentId', parent._id);
      localStorage.setItem('parent', JSON.stringify(parent));

      // Update state
      setIsAuthenticated(true);
      setParent({
        _id: parent._id,
        email: parent.email,
        fullName: parent.fullName,
        role: parent.role || 'Parent',
        phone: parent.phone || '',
        address: parent.address || '',
        relationship: parent.relationship || '',
        players: parent.players || [],
        isCoach: parent.isCoach || false,
        aauNumber: parent.aauNumber || '',
        additionalGuardians: parent.additionalGuardians || [],
        dismissedNotifications: parent.dismissedNotifications || [],
        playersSeason: parent.string || [],
        playersYear: parent.number || [],
      });

      navigate(all_routes.adminDashboard);

      // Force page refresh to ensure all data is reloaded
      setTimeout(() => {
        window.location.reload();
      }, 100);
    } catch (error) {
      console.error('Login Error:', error);
      throw error;
    }
  };

  const [registrationStatus, setRegistrationStatus] =
    useState<RegistrationStatus>({
      parentRegistered: false,
      parentPaid: false,
      currentSeason: getCurrentSeason(),
      hasPlayers: false,
      hasCurrentSeasonPlayers: false,
      allPlayersPaid: false,
    });

  // Helper functions for address handling
  const parseAddress = (fullAddress: string) => {
    // First try pattern with unit designator
    const patternWithUnit =
      /^(\d+\s[\w\s.]+?)\s*(?:,?\s*(apt|apartment|suite|ste|unit|building|bldg|floor|fl|room|rm|department|dept|lot|#)\.?\s*([\w\s-]+?)\s*)?,\s*([^,]+?)\s*,\s*([a-zA-Z]{2,})\s*(\d{5}(?:-\d{4})?)$/i;

    const matchWithUnit = fullAddress.match(patternWithUnit);

    if (matchWithUnit) {
      return {
        street: matchWithUnit[1].trim(),
        street2:
          matchWithUnit[2] && matchWithUnit[3]
            ? `${matchWithUnit[2].trim()} ${matchWithUnit[3].trim()}`.replace(
                /\s+/g,
                ' ',
              )
            : '',
        city: matchWithUnit[4].trim(),
        state: normalizeState(matchWithUnit[5].trim()),
        zip: matchWithUnit[6].trim(),
      };
    }

    // Fallback pattern for addresses without unit designators
    const fallbackPattern =
      /^([^,]+?)\s*,\s*([^,]+?)\s*,\s*([a-zA-Z]{2,})\s*(\d{5}(?:-\d{4})?)$/i;
    const fallbackMatch = fullAddress.match(fallbackPattern);

    if (fallbackMatch) {
      return {
        street: fallbackMatch[1].trim(),
        street2: '',
        city: fallbackMatch[2].trim(),
        state: normalizeState(fallbackMatch[3].trim()),
        zip: fallbackMatch[4].trim(),
      };
    }

    // If all parsing fails, return the raw address in street
    return {
      street: fullAddress,
      street2: '',
      city: '',
      state: '',
      zip: '',
    };
  };

  const normalizeState = (stateInput: string): string => {
    const stateMap: Record<string, string> = {
      alabama: 'AL',
      alaska: 'AK',
      arizona: 'AZ',
      arkansas: 'AR',
      california: 'CA',
      colorado: 'CO',
      connecticut: 'CT',
      delaware: 'DE',
      florida: 'FL',
      georgia: 'GA',
      hawaii: 'HI',
      idaho: 'ID',
      illinois: 'IL',
      indiana: 'IN',
      iowa: 'IA',
      kansas: 'KS',
      kentucky: 'KY',
      louisiana: 'LA',
      maine: 'ME',
      maryland: 'MD',
      massachusetts: 'MA',
      michigan: 'MI',
      minnesota: 'MN',
      mississippi: 'MS',
      missouri: 'MO',
      montana: 'MT',
      nebraska: 'NE',
      nevada: 'NV',
      'new hampshire': 'NH',
      'new jersey': 'NJ',
      'new mexico': 'NM',
      'new york': 'NY',
      'north carolina': 'NC',
      'north dakota': 'ND',
      ohio: 'OH',
      oklahoma: 'OK',
      oregon: 'OR',
      pennsylvania: 'PA',
      'rhode island': 'RI',
      'south carolina': 'SC',
      'south dakota': 'SD',
      tennessee: 'TN',
      texas: 'TX',
      utah: 'UT',
      vermont: 'VT',
      virginia: 'VA',
      washington: 'WA',
      'west virginia': 'WV',
      wisconsin: 'WI',
      wyoming: 'WY',
    };

    const normalizedInput = stateInput.toLowerCase().trim();
    return stateMap[normalizedInput] || stateInput.toUpperCase();
  };

  const validateAddress = (address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  }): boolean => {
    return (
      !!address.street && !!address.city && !!address.state && !!address.zip
    );
  };

  const formatAddressForBackend = (address: {
    street: string;
    street2?: string;
    city: string;
    state: string;
    zip: string;
  }): string => {
    return `${address.street}${
      address.street2 ? ', ' + address.street2 : ''
    }, ${address.city}, ${address.state} ${address.zip}`;
  };

  const updateParent = (updatedData: Partial<Parent>) => {
    setParent((prev) => {
      if (!prev) return null;

      const updatedParent = {
        ...prev,
        ...updatedData,
        avatar: updatedData.avatar ?? prev.avatar, // Properly merge avatar
      };

      // Update localStorage
      if (updatedParent._id === localStorage.getItem('parentId')) {
        localStorage.setItem('parent', JSON.stringify(updatedParent));
      }

      return updatedParent;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        parent,
        user: parent,
        players,
        parents,
        setPlayers,
        allParents,
        login,
        logout,
        register,
        fetchParentData,
        fetchPlayersData,
        fetchPlayerData,
        fetchAllPlayers,
        fetchAllParents,
        fetchGuardians,
        checkAuth,
        role: parent?.role || 'Parent',
        isLoading,
        searchAll,
        fetchParentsData,
        fetchParentPlayers,
        fetchAllGuardians,
        allGuardians,
        currentUser: parent,
        refreshAuthData,
        refreshPlayers,
        registrationStatus,
        setRegistrationStatus,
        updateParent,
        viewedParent,
        setViewedParent,
        viewedCoach,
        setViewedCoach,
        setParentData,
        currentSeason,
        currentYear,
        getAuthToken,
        // Email verification functions
        sendVerificationEmail,
        verifyEmail,
        checkVerificationStatus,
        resendVerificationEmail,
        isEmailVerified,
        setIsEmailVerified,
        // Two-step registration functions
        createTempAccount,
        completeRegistration,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
