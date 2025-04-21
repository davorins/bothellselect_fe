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
} from '../types/types';
import { getCurrentSeason } from '../utils/season';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
console.log('API_BASE_URL:', process.env.REACT_APP_API_BASE_URL);
const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [parent, setParent] = useState<Parent | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const [allParents, setAllParents] = useState<Parent[]>([]);
  const [parents, setParents] = useState<Parent[]>([]);
  const [allGuardians] = useState<Guardian[]>([]);
  const authCheckInProgress = useRef(false);
  const lastAuthCheckTime = useRef<number>(0);
  const lastParentId = useRef<string | null>(null);

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
        }));
      } catch (error) {
        console.error('Search error:', error);
        return [];
      }
    },
    []
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
    console.log('Redirected to login page');
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
    []
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
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error fetching player data:', error);
      return null;
    }
  }, []);

  const fetchAllPlayers = useCallback(async (queryParams = '') => {
    try {
      console.log('Fetching all players with params:', queryParams);
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No token found');
        return;
      }

      const url = `${API_BASE_URL}/players?${queryParams}`;
      console.log('Request URL:', url);

      const response = await axios.get<Player[]>(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log('API response:', response.data);
      setPlayers(response.data);
    } catch (error) {
      console.error('Error fetching all players:', error);
    }
  }, []);

  const setParentData = (parent: any) => {
    const parentData: Parent = {
      _id: parent._id || parent.parentId || '',
      email: parent.email || '',
      fullName: parent.fullName || '',
      role: parent.role || 'Parent',
      phone: parent.phone || '',
      address:
        typeof parent.address === 'object'
          ? `${parent.address.street}, ${parent.address.city}, ${parent.address.state} ${parent.address.zip}`
          : parent.address || '',
      relationship: parent.relationship || '',
      players: Array.isArray(parent.players)
        ? parent.players.filter((p: any) => typeof p === 'object' && p._id)
        : [],
      isCoach: parent.isCoach || false,
      aauNumber: parent.aauNumber || '',
      additionalGuardians: parent.additionalGuardians || [],
    };
    setParent(parentData);
  };

  const fetchParentData = useCallback(
    async (parentId: string): Promise<Parent | null> => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          console.error('No auth token');
          return null;
        }

        // Validate parentId
        if (!parentId || !/^[0-9a-fA-F]{24}$/.test(parentId)) {
          console.error('Invalid parent ID');
          return null;
        }

        const response = await axios.get<Parent>(
          `${API_BASE_URL}/parent/${parentId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const parentData = response.data;
        setParentData(parentData);

        // Fetch players if needed
        const playerIds =
          parentData.players?.map((p) => (typeof p === 'string' ? p : p._id)) ||
          [];
        if (playerIds.length > 0) {
          await fetchPlayersData(playerIds);
        }

        return parentData;
      } catch (error) {
        console.error('Error fetching parent:', error);
        return null;
      }
    },
    [fetchPlayersData]
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
        }
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

      const response = await axios.get<Parent[]>(
        `${API_BASE_URL}/parents?${queryParams}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setAllParents(response.data);
      setParents(response.data); // Also update the parents state
      return response.data;
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

  // Add this to your AuthContext.tsx
  const fetchParentPlayers = async (parentId: string): Promise<Player[]> => {
    try {
      // Validate parentId
      if (!parentId || !/^[0-9a-fA-F]{24}$/.test(parentId)) {
        console.error('Invalid parentId provided:', parentId);
        return [];
      }

      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        return [];
      }

      // First try to get parent with populated players
      try {
        const parentRes = await axios.get<{ players?: Player[] }>(
          `${API_BASE_URL}/parent/${parentId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        // If players are populated and valid, return them
        if (parentRes.data?.players && Array.isArray(parentRes.data.players)) {
          return parentRes.data.players;
        }
      } catch (parentError) {
        console.log('Parent endpoint failed, trying players endpoint...');
      }

      // Fallback to direct players endpoint
      const playersRes = await axios.get<Player[] | { players: Player[] }>(
        `${API_BASE_URL}/parent/${parentId}/players`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Handle different response formats
      return Array.isArray(playersRes.data)
        ? playersRes.data
        : playersRes.data.players || [];
    } catch (error) {
      console.error(`Error fetching players for parent ${parentId}:`, error);
      return []; // Return empty array on error
    }
  };

  const fetchAllGuardians = useCallback(async (queryParams = '') => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return [];

      const response = await axios.get<Guardian[]>(
        `${API_BASE_URL}/guardians?${queryParams}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error fetching guardians:', error);
      return [];
    }
  }, []);

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
    const parentId = localStorage.getItem('parentId');
    const role = localStorage.getItem('role');

    try {
      // Clear auth if no token
      if (!token) {
        setIsAuthenticated(false);
        setParent(null);
        setIsLoading(false);
        return;
      }

      const decoded = jwtDecode<DecodedToken>(token);
      const isTokenValid = !(decoded.exp && decoded.exp * 1000 < Date.now());

      if (!isTokenValid) {
        logout();
        return;
      }

      setIsAuthenticated(true);

      // Admin user flow
      if (role === 'Admin') {
        if (parent?._id === 'admin') return;

        const adminData = {
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
        };
        setParent(adminData);
        lastParentId.current = 'admin';
      }
      // Regular parent user flow
      else if (parentId) {
        // Always fetch fresh data for regular users (remove the parentId check)
        setIsLoading(true);
        try {
          const parentData = await fetchParentData(parentId);

          if (!parentData) {
            // Create comprehensive fallback from token data
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
            };
            setParent(fallbackParent);
          } else {
            // Merge API data with token data to ensure all fields are populated
            setParent({
              ...parentData,
              email: parentData.email || decoded.email || '',
              fullName: parentData.fullName || decoded.fullName || '',
              // Ensure other critical fields are populated
            });
          }
          lastParentId.current = parentId;
        } catch (error) {
          console.error('Failed to fetch parent data:', error);
          // Create fallback from token data only
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
          };
          setParent(fallbackParent);
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
  }, [logout, fetchParentData]); // Removed parent from dependencies to prevent loops

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

  const login = async (email: string, password: string) => {
    try {
      const payload = {
        email: email,
        password: password,
      };
      console.log('Login Payload:', payload);

      const response = await axios.post(`${API_BASE_URL}/login`, payload);
      console.log('Login Response:', response.data);

      const { token, parent } = response.data;

      // Add validation before storing
      if (!parent?._id) {
        throw new Error('Invalid parent data received from server');
      }

      localStorage.setItem('token', token);
      localStorage.setItem('parentId', parent._id);
      localStorage.setItem('parent', JSON.stringify(parent));

      setIsAuthenticated(true);
      const parentData: Parent = {
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
        createdAt: parent.createdAt || new Date().toISOString(),
        updatedAt: parent.updatedAt || new Date().toISOString(),
      };
      setParent(parentData);

      navigate(all_routes.adminDashboard);
    } catch (error) {
      console.error('Login Error:', error);
      if (axios.isAxiosError(error)) {
        console.error('Error Response Data:', error.response?.data);
        alert(error.response?.data?.error || 'Login failed. Please try again.');
      } else {
        alert('Login failed. Please try again.');
      }
    }
  };

  const register = async (
    email: string,
    password: string,
    fullName: string,
    phone: string,
    address: string, // Still accepts string to maintain backend compatibility
    relationship: string,
    isCoach: boolean,
    aauNumber: string,
    agreeToTerms: boolean
  ) => {
    try {
      // Parse the address string into components for validation
      const parsedAddress = parseAddress(address);

      // Validate the parsed address
      if (!validateAddress(parsedAddress)) {
        throw new Error(
          'Please enter a complete address (Street, City, State ZIP)'
        );
      }

      // Format the address consistently before sending to backend
      const formattedAddress = formatAddressForBackend(parsedAddress);

      // Normalize and trim credentials
      const normalizedEmail = email.toLowerCase().trim();
      const trimmedPassword = password.trim();

      const data = await registerUser({
        email: normalizedEmail, // Use normalized email
        password: trimmedPassword, // Use trimmed password
        fullName,
        phone,
        address: formattedAddress, // Send the formatted string
        relationship,
        isCoach,
        aauNumber,
        agreeToTerms,
      });

      if (!data.parent) {
        throw new Error('Parent data not found in response');
      }

      // Store the parsed address in local storage for future use
      const parentWithParsedAddress = {
        ...data.parent,
        address: parsedAddress, // Store the parsed object locally
      };

      localStorage.setItem('token', data.token);
      localStorage.setItem('parentId', data.parent._id);
      localStorage.setItem('parent', JSON.stringify(parentWithParsedAddress));

      setIsAuthenticated(true);
      const parentData: Parent = {
        _id: data.parent._id,
        email: data.parent.email,
        fullName: data.parent.fullName,
        role: data.parent.role || 'Parent',
        phone: data.parent.phone || '',
        address: parsedAddress, // Use the parsed address object
        relationship: data.parent.relationship || '',
        players: data.parent.players || [],
        isCoach: data.parent.isCoach || false,
        aauNumber: data.parent.aauNumber || '',
        additionalGuardians: data.parent.additionalGuardians || [],
        createdAt: data.parent.createdAt || new Date().toISOString(),
        updatedAt: data.parent.updatedAt || new Date().toISOString(),
      };
      setParent(parentData);

      navigate(all_routes.adminDashboard);
    } catch (error) {
      console.error('Registration Error:', error);
      throw error; // Re-throw to allow the form to handle the error
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
      /^(\d+\s[\w\s\.]+?)\s*(?:,?\s*(apt|apartment|suite|ste|unit|building|bldg|floor|fl|room|rm|department|dept|lot|#)\.?\s*([\w\s\-]+?)\s*)?,\s*([^,]+?)\s*,\s*([a-zA-Z]{2,})\s*(\d{5}(?:-\d{4})?)$/i;
    const matchWithUnit = fullAddress.match(patternWithUnit);

    if (matchWithUnit) {
      return {
        street: matchWithUnit[1].trim(),
        street2:
          matchWithUnit[2] && matchWithUnit[3]
            ? `${matchWithUnit[2].trim()} ${matchWithUnit[3].trim()}`.replace(
                /\s+/g,
                ' '
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
        registrationStatus,
        setRegistrationStatus,
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
