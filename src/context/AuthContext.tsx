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
import { getCurrentSeason, getCurrentYear } from '../utils/season';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
console.log('API_BASE_URL:', process.env.REACT_APP_API_BASE_URL);
const AuthContext = createContext<AuthContextType | null>(null);

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
              (p: any) => typeof p === 'object' && p._id
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
    [parent]
  );

  const fetchParentData = useCallback(
    async (parentId: string, isViewing = false): Promise<Parent | null> => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return null;

        const response = await axios.get<Parent>(
          `${API_BASE_URL}/parent/${parentId}`,
          { headers: { Authorization: `Bearer ${token}` } }
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
    [setParentData, setViewedParent]
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
        return;
      }

      const decoded = jwtDecode<DecodedToken>(token);
      const isTokenValid = !(decoded.exp && decoded.exp * 1000 < Date.now());

      if (!isTokenValid) {
        logout();
        return;
      }

      setIsAuthenticated(true);

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
              ]).then(([freshParentData, playersData]) => {
                if (freshParentData) {
                  localStorage.setItem(
                    'parent',
                    JSON.stringify(freshParentData)
                  );
                  setParent(freshParentData);
                }
                setPlayers(playersData);
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
        };

        setParent(adminData);
        localStorage.setItem('parent', JSON.stringify(adminData));
        lastParentId.current = 'admin';
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
            };

            setParent(fallbackParent);
            localStorage.setItem('parent', JSON.stringify(fallbackParent));
          } else {
            const updatedParent = {
              ...parentData,
              email: parentData.email || decoded.email || '',
              fullName: parentData.fullName || decoded.fullName || '',
            };
            setParent(updatedParent);
            localStorage.setItem('parent', JSON.stringify(updatedParent));
          }

          setPlayers(playersData);
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
          };

          setParent(fallbackParent);
          localStorage.setItem('parent', JSON.stringify(fallbackParent));
          setPlayers([]);
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
  }, [logout, fetchParentData, parent?._id]);

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
    } catch (error) {
      console.error('Login Error:', error);
      throw error; // Let the login component handle the error display
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
        dismissedNotifications: data.dismissedNotifications || [],
        playersSeason: data.playersSeason || [],
        playersYear: data.playersYear || [],
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
      /^(\d+\s[\w\s.]+?)\s*(?:,?\s*(apt|apartment|suite|ste|unit|building|bldg|floor|fl|room|rm|department|dept|lot|#)\.?\s*([\w\s-]+?)\s*)?,\s*([^,]+?)\s*,\s*([a-zA-Z]{2,})\s*(\d{5}(?:-\d{4})?)$/i;

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
