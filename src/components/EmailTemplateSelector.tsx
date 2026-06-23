import React, { useState, useEffect, useCallback } from 'react';
import {
  OverlayTrigger,
  Tooltip,
  Button,
  Card,
  Form,
  Alert,
  ProgressBar,
  Modal,
  Badge,
  Collapse,
} from 'react-bootstrap';
import { emailTemplateService } from '../services/emailTemplateService';
import { useAuth } from '../context/AuthContext';
import {
  SeasonOption,
  EmailTemplate,
  EmailCampaignData,
  Parent,
} from '../types/types';
import LoadingSpinner from '../components/common/LoadingSpinner';

interface User {
  _id: string;
  fullName: string;
  email: string;
  playersSeason?: string[];
  playersYear?: number[];
}

interface RawSeason {
  season: string;
  registrationYear: number;
}

interface EmailSendResult {
  success: boolean;
  email?: string;
  error?: string;
}

export const EmailTemplateSelector: React.FC = () => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] =
    useState<EmailTemplate | null>(null);
  const [seasons, setSeasons] = useState<SeasonOption[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState({
    templates: true,
    seasons: true,
    users: false,
    filteredUsers: false,
    allUsers: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [manualEmails, setManualEmails] = useState('');
  const { isAuthenticated, getAuthToken, fetchAllPlayers, fetchAllParents } =
    useAuth();
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

  const [sendingStatus, setSendingStatus] = useState<{
    manual: 'idle' | 'sending' | 'success' | 'error';
    campaign: 'idle' | 'sending' | 'success' | 'error';
    broadcast: 'idle' | 'sending' | 'success' | 'error';
  }>({
    manual: 'idle',
    campaign: 'idle',
    broadcast: 'idle',
  });

  const [sendProgress, setSendProgress] = useState({
    total: 0,
    sent: 0,
    failed: 0,
  });

  const [showBroadcastConfirm, setShowBroadcastConfirm] = useState(false);
  const [broadcastRecipients, setBroadcastRecipients] = useState<User[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  // Add email styling function from EmailTemplates component
  const addEmailStyles = (html: string): string => {
    if (!html) return '';

    let styledHtml = html;

    // Add basic styles to paragraphs
    styledHtml = styledHtml.replace(
      /<p(\s[^>]*)?>/g,
      '<p style="margin: 0 0 16px; padding: 0; line-height: 1.6; color: #333;"$1>',
    );

    // Style headings
    styledHtml = styledHtml.replace(
      /<h1(\s[^>]*)?>/g,
      '<h1 style="font-size: 28px; font-weight: bold; margin: 0 0 20px; padding: 0; color: #222; line-height: 1.3;"$1>',
    );

    styledHtml = styledHtml.replace(
      /<h2(\s[^>]*)?>/g,
      '<h2 style="font-size: 24px; font-weight: bold; margin: 0 0 18px; padding: 0; color: #222; line-height: 1.3;"$1>',
    );

    styledHtml = styledHtml.replace(
      /<h3(\s[^>]*)?>/g,
      '<h3 style="font-size: 20px; font-weight: 600; margin: 0 0 16px; padding: 0; color: #222; line-height: 1.3;"$1>',
    );

    // Style lists
    styledHtml = styledHtml.replace(
      /<ul(\s[^>]*)?>/g,
      '<ul style="margin: 0 0 16px 20px; padding: 0; color: #333; line-height: 1.6;"$1>',
    );

    styledHtml = styledHtml.replace(
      /<ol(\s[^>]*)?>/g,
      '<ol style="margin: 0 0 16px 20px; padding: 0; color: #333; line-height: 1.6;"$1>',
    );

    styledHtml = styledHtml.replace(
      /<li(\s[^>]*)?>/g,
      '<li style="margin: 0 0 8px; padding: 0;"$1>',
    );

    // Style links
    styledHtml = styledHtml.replace(
      /<a(\s[^>]*)?>/g,
      '<a style="color: rgba(0, 0, 0, .7); text-decoration: none; border-bottom: 1px solid #506ee4; padding-bottom: 1px;"$1>',
    );

    // Style bold and italic
    styledHtml = styledHtml.replace(
      /<strong(\s[^>]*)?>/g,
      '<strong style="font-weight: bold;"$1>',
    );

    styledHtml = styledHtml.replace(
      /<em(\s[^>]*)?>/g,
      '<em style="font-style: italic;"$1>',
    );

    // Style blockquotes
    styledHtml = styledHtml.replace(
      /<blockquote(\s[^>]*)?>/g,
      '<blockquote style="margin: 20px 0; padding: 15px 20px; background-color: #f8f9fa; border-left: 4px solid #506ee4; color: #555; font-style: italic;"$1>',
    );

    return styledHtml;
  };

  // Add function to get complete email HTML with wrapper for sending
  const getCompleteEmailHTML = (
    content: string,
    includeSignature: boolean = false,
    signatureConfig: any = null,
  ) => {
    let styledContent = addEmailStyles(content);

    // Add signature if enabled and configured
    if (includeSignature && signatureConfig) {
      const signatureHTML = generateSignatureHTML(signatureConfig);
      styledContent += signatureHTML;
    }

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email Template</title>
  <style>
    @media only screen and (max-width: 600px) {
      .container {
        width: 100% !important;
        padding: 10px !important;
      }
      
      .email-body {
        padding: 30px 40px 0 40px !important;
      }
      
      .header-img {
        height: 30px !important;
      }
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333333;
      margin: 0;
      padding: 0;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
  </style>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.6; color: #333333; margin: 0; padding: 0; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" align="center" style="background-color: #f6f6f6; padding: 40px 0;">
    <tr>
      <td align="center" style="padding: 0;">
        <!--[if (gte mso 9)|(IE)]>
        <table width="600" align="center" cellpadding="0" cellspacing="0" border="0">
        <tr>
        <td>
        <![endif]-->
        <div class="container" style="max-width: 600px; margin: 0 auto;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); overflow: hidden;">
            <!-- Header -->
            <tr>
              <td style="padding: 30px 30px 0;">
                <div style="text-align: left; border-bottom: 1px solid #eaeaea; padding-bottom: 20px;">
                  <img src="https://pub-eab2790b2e94418f896b048a8e6658d0.r2.dev/logo/logo.png" alt="Bothell Select Logo" height="30" style="display: block; margin: 0; height: 30px;" />
                </div>
              </td>
            </tr>
            
            <!-- Email Content -->
            <tr>
              <td class="email-body" style="padding: 30px;">
                <div style="max-width: 100%;">
                  ${styledContent}
                </div>
              </td>
            </tr>
            
            <!-- Footer -->
            <tr>
              <td style="padding: 0 30px;">
                <div style="text-align: center; font-size: 13px; color: #666; padding: 30px 0 20px; margin-top: 40px; border-top: 1px solid #eaeaea;">
                  <p style="margin: 0 0 8px;">You're receiving this email because you're part of <strong style="color: #333;">Bothell Select</strong>.</p>
                  <p style="margin: 0;">
                    <a href="https://bothellselect.com/general-settings/notifications-settings" style="color: rgba(0, 0, 0, .7); text-decoration: none; border-bottom: 1px solid #506ee4; padding-bottom: 1px;">
                      Unsubscribe
                    </a> • 
                    <a href="https://bothellselect.com/contact-us" style="color: rgba(0, 0, 0, .7); text-decoration: none; border-bottom: 1px solid #506ee4; padding-bottom: 1px;">
                      Contact Us
                    </a> • 
                    <a href="https://bothellselect.com" style="color: rgba(0, 0, 0, .7); text-decoration: none; border-bottom: 1px solid #506ee4; padding-bottom: 1px;">
                      Website
                    </a>
                  </p>
                </div>
              </td>
            </tr>
          </table>
          
          <!-- Additional footer info (outside the main card) -->
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 20px;">
            <tr>
              <td align="center" style="padding: 20px 0;">
                <p style="margin: 0; font-size: 12px; color: #999;">
                  &copy; ${new Date().getFullYear()} Bothell Select. All rights reserved.
                </p>
              </td>
            </tr>
          </table>
        </div>
        <!--[if (gte mso 9)|(IE)]>
        </td>
        </tr>
        </table>
        <![endif]-->
      </td>
    </tr>
  </table>
</body>
</html>
`;
  };

  // Generate email signature HTML
  const generateSignatureHTML = (signatureConfig: any) => {
    if (!signatureConfig) return '';

    const {
      organizationName = '',
      title = '',
      fullName = '',
      phone = '',
      email = '',
      website = '',
      additionalInfo = '',
    } = signatureConfig;

    return `
<div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eaeaea;">
  <table cellpadding="0" cellspacing="0" border="0" style="width: 100%;">
    <tr>
      <td style="padding: 0; vertical-align: top;">
        <div style="color: #333; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <strong style="color: #222; font-size: 16px; display: block;">${organizationName}</strong>
          
          ${
            fullName
              ? `<div style="font-size: 14px; margin-top: 8px;"><strong>${fullName}</strong></div>`
              : ''
          }
          
          ${
            title
              ? `<div style="color: #666; font-size: 14px; margin-top: 4px;">${title}</div>`
              : ''
          }
          
          <div style="margin-top: 12px; font-size: 14px;">
            ${
              phone
                ? `<div style="margin-bottom: 4px;">
              <span style="color: #666;">Phone:</span> 
              <span style="color: #333;">${phone}</span>
            </div>`
                : ''
            }
            
            ${
              email
                ? `<div style="margin-bottom: 4px;">
              <span style="color: #666;">Email:</span> 
              <a href="mailto:${email}" style="color: rgba(0, 0, 0, .7); text-decoration: none;">${email}</a>
            </div>`
                : ''
            }
            
            ${
              website
                ? `<div style="margin-bottom: 4px;">
              <span style="color: #666;">Website:</span> 
              <a href="${website}" style="color: rgba(0, 0, 0, .7); text-decoration: none;">${website}</a>
            </div>`
                : ''
            }
            
            ${
              additionalInfo
                ? `<div style="margin-top: 8px; color: #666; font-size: 13px;">
              ${additionalInfo}
            </div>`
                : ''
            }
          </div>
        </div>
      </td>
    </tr>
  </table>
</div>
`;
  };

  const isValidEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const parseManualEmails = (input: string): string[] => {
    return input
      .split(/[\n,;]+/)
      .map((email) => email.trim())
      .filter((email) => {
        const isValid = isValidEmail(email);
        if (!isValid && email) {
          console.warn(`Invalid email skipped: ${email}`);
        }
        return isValid;
      });
  };

  const hasAnyRecipients = (): boolean => {
    // User has explicitly selected some users
    const hasSelectedUsers = selectedUsers.length > 0;

    // User has explicitly selected a season filter
    const hasSeasonFilter = selectedSeason !== '' && selectedYear !== null;

    // User has entered manual emails
    const hasManualEmails = parseManualEmails(manualEmails).length > 0;

    return hasSelectedUsers || hasSeasonFilter || hasManualEmails;
  };

  // Load templates
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const response: any = await emailTemplateService.getAll();
        const responseData = response?.data;
        const data = Array.isArray(response)
          ? response
          : Array.isArray(responseData?.data)
            ? responseData.data
            : Array.isArray(responseData)
              ? responseData
              : [];
        if (!Array.isArray(data)) throw new Error('Invalid data format');

        // Filter out disabled templates (status === false)
        const activeTemplates = data.filter(
          (template) =>
            template.status === true || template.status === undefined,
        );

        setTemplates(activeTemplates);
      } catch (err) {
        setError('Failed to load email templates');
      } finally {
        setLoading((prev) => ({ ...prev, templates: false }));
      }
    };

    loadTemplates();
  }, []);

  // Load seasons from players data
  useEffect(() => {
    const loadSeasons = async () => {
      if (!isAuthenticated) return;
      try {
        // Fetch all players to get seasons data
        const players = await fetchAllPlayers();

        const allSeasons: SeasonOption[] = [];

        players.forEach((player) => {
          if (player.seasons && Array.isArray(player.seasons)) {
            player.seasons.forEach((season) => {
              if (season.season && season.year) {
                allSeasons.push({
                  season: season.season,
                  year: season.year,
                });
              }
            });
          }
        });

        // Remove duplicates and sort
        const uniqueSeasons = Array.from(
          new Set(allSeasons.map((s) => `${s.season}-${s.year}`)),
        )
          .map((seasonStr) => {
            const [season, year] = seasonStr.split('-');
            return { season, year: parseInt(year) };
          })
          .sort((a, b) => b.year - a.year || a.season.localeCompare(b.season));

        setSeasons(uniqueSeasons);
      } catch (err) {
        console.error('Failed to load seasons:', err);
        setError('Failed to load seasons');
      } finally {
        setLoading((prev) => ({ ...prev, seasons: false }));
      }
    };

    loadSeasons();
  }, [isAuthenticated, fetchAllPlayers]);

  // Load all users (entire customer base)
  const loadAllUsers = useCallback(async () => {
    setLoading((prev) => ({ ...prev, allUsers: true }));
    try {
      const parents = await fetchAllParents();

      // Check if parents is an array directly or has a data property
      let parentsArray: Parent[] = [];

      if (Array.isArray(parents)) {
        // If it's already an array, use it directly
        parentsArray = parents;
      } else if (parents && typeof parents === 'object' && 'data' in parents) {
        // If it has a data property that's an array (like paginated response)
        parentsArray = (parents as any).data || [];
      } else if (parents && typeof parents === 'object') {
        // If it's an object but not an array, try to find an array property
        parentsArray =
          (parents as any).parents || (parents as any).results || [];
      }

      // Transform parents to User format
      const allUsersData = parentsArray.map((parent) => ({
        _id: parent._id,
        fullName: parent.fullName,
        email: parent.email,
        playersSeason: parent.playersSeason || [],
        playersYear: parent.playersYear || [],
      })) as User[];

      setAllUsers(allUsersData);
      return allUsersData;
    } catch (err) {
      console.error('Failed to load all users:', err);
      setError('Failed to load all users');
      return [];
    } finally {
      setLoading((prev) => ({ ...prev, allUsers: false }));
    }
  }, [fetchAllParents]);

  // Fetch users with season filter
  const fetchUsersBySeason = useCallback(async () => {
    if (!selectedSeason || !selectedYear) {
      setUsers([]);
      return;
    }

    setLoading((prev) => ({ ...prev, users: true, filteredUsers: true }));
    try {
      const token = await getAuthToken();

      // Fetch players for the selected season
      const players = await fetchAllPlayers(
        `season=${selectedSeason}&year=${selectedYear}`,
      );

      // Extract unique parent IDs from players - handle both string and object cases
      const parentIds = Array.from(
        new Set(
          players
            .map((p) => {
              const parentId = p.parentId as any; // Use any to bypass TypeScript errors

              // Debug logging
              console.log('Player parentId:', {
                playerId: p._id,
                playerName: p.fullName,
                parentId: parentId,
                parentIdType: typeof parentId,
                isObject: typeof parentId === 'object' && parentId !== null,
                isString: typeof parentId === 'string',
              });

              // If parentId is an object (populated), get the _id from it
              if (
                parentId &&
                typeof parentId === 'object' &&
                parentId !== null
              ) {
                // Check if it has _id property
                if (parentId._id) {
                  return parentId._id.toString();
                }
                // Check for id property (lowercase)
                else if (parentId.id) {
                  return parentId.id.toString();
                }
              }
              // If parentId is a string, use it directly
              else if (typeof parentId === 'string') {
                // Check if it's a valid MongoDB ObjectId
                if (/^[0-9a-fA-F]{24}$/.test(parentId)) {
                  return parentId;
                }
                // Check if it's the problematic string
                else if (parentId === '[object Object]') {
                  console.warn(
                    'Found "[object Object]" string for player:',
                    p._id,
                  );
                  return null;
                }
              }

              console.warn(
                'Could not extract valid parentId from:',
                parentId,
                'for player:',
                p._id,
              );
              return null;
            })
            .filter((id): id is string => id !== null && id !== undefined),
        ),
      );

      console.log(
        `Found ${parentIds.length} parent IDs for ${selectedSeason} ${selectedYear}:`,
        parentIds,
      );

      if (parentIds.length === 0) {
        console.log('No valid parent IDs found');
        setUsers([]);
        return;
      }

      // Fetch parent data for these IDs
      const userPromises = parentIds.map(async (parentId) => {
        try {
          console.log('Fetching parent data for ID:', parentId);
          const response = await fetch(`${API_BASE_URL}/parent/${parentId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (response.ok) {
            const parentData = await response.json();
            return {
              _id: parentData._id,
              fullName: parentData.fullName,
              email: parentData.email,
              playersSeason: parentData.playersSeason || [],
              playersYear: parentData.playersYear || [],
            } as User;
          } else {
            console.log('Failed to fetch parent:', parentId, response.status);
            return null;
          }
        } catch (err) {
          console.error(`Error fetching parent ${parentId}:`, err);
          return null;
        }
      });

      const userResults = await Promise.all(userPromises);
      const userData = userResults.filter(
        (user): user is User => user !== null,
      );

      console.log(
        `Loaded ${userData.length} users for ${selectedSeason} ${selectedYear}`,
      );
      setUsers(userData);
    } catch (err) {
      console.error('Error fetching users by season:', err);
      setError('Failed to load users for selected season');
    } finally {
      setLoading((prev) => ({ ...prev, users: false, filteredUsers: false }));
    }
  }, [
    selectedSeason,
    selectedYear,
    API_BASE_URL,
    getAuthToken,
    fetchAllPlayers,
  ]);

  // Search users by name/email
  const searchUsersByName = useCallback(async () => {
    if (!searchTerm.trim()) {
      // If no search term but season selected, show users from season
      if (selectedSeason && selectedYear) {
        await fetchUsersBySeason();
      } else {
        setUsers([]);
      }
      return;
    }

    setLoading((prev) => ({ ...prev, users: true }));
    try {
      const token = await getAuthToken();
      const response = await fetch(
        `${API_BASE_URL}/users/search?q=${encodeURIComponent(searchTerm)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!response.ok) throw new Error('Search failed');
      let userData: User[] = await response.json();

      // Apply season filter if selected
      if (selectedSeason && selectedYear) {
        userData = userData.filter(
          (user) =>
            user.playersSeason?.includes(selectedSeason) &&
            user.playersYear?.includes(selectedYear),
        );
      }

      setUsers(userData);
    } catch (err) {
      console.error('Error searching users:', err);
      setError('Failed to search users');
    } finally {
      setLoading((prev) => ({ ...prev, users: false }));
    }
  }, [
    searchTerm,
    selectedSeason,
    selectedYear,
    API_BASE_URL,
    getAuthToken,
    fetchUsersBySeason,
  ]);

  // Handle user listing based on search and season
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.trim()) {
        searchUsersByName();
      } else if (selectedSeason && selectedYear) {
        fetchUsersBySeason();
      } else {
        setUsers([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [
    searchTerm,
    selectedSeason,
    selectedYear,
    searchUsersByName,
    fetchUsersBySeason,
  ]);

  // Load all users on component mount
  useEffect(() => {
    if (isAuthenticated) {
      loadAllUsers();
    }
  }, [isAuthenticated, loadAllUsers]);

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find((t) => t._id === templateId) || null;
    setSelectedTemplate(template);
    setShowPreview(false); // Reset preview when template changes
  };

  const handleSeasonSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === '') {
      setSelectedSeason('');
      setSelectedYear(null);
      setSelectedUsers([]);
      setSearchTerm('');
      return;
    }

    const [season, year] = value.split('-');
    setSelectedSeason(season);
    setSelectedYear(parseInt(year));
    setSelectedUsers([]); // Clear selected users when season changes
    setSearchTerm(''); // Clear search term

    // Don't fetch here - it will be triggered by the useEffect
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const selectAllUsers = () => {
    setSelectedUsers(users.map((u) => u._id));
  };

  const selectAllInDatabase = async () => {
    if (allUsers.length === 0) {
      const loadedUsers = await loadAllUsers();
      setSelectedUsers(loadedUsers.map((u) => u._id));
    } else {
      setSelectedUsers(allUsers.map((u) => u._id));
    }
  };

  const clearAllSelections = () => {
    setSelectedUsers([]);
  };

  const getCombinedEmails = (): string[] => {
    const selectedEmails = users
      .filter((user) => selectedUsers.includes(user._id))
      .map((user) => user.email);

    const manualEmailList = parseManualEmails(manualEmails);

    return Array.from(new Set([...selectedEmails, ...manualEmailList]));
  };

  const getManualEmailsOnly = (): string[] => {
    const selectedUserEmails = users
      .filter((user) => selectedUsers.includes(user._id))
      .map((user) => user.email);

    return getCombinedEmails().filter(
      (email) => !selectedUserEmails.includes(email),
    );
  };

  const sendManualEmails = async (emails: string[]): Promise<boolean> => {
    if (!selectedTemplate) return false;

    setSendingStatus((prev) => ({ ...prev, manual: 'sending' }));
    setSendProgress({
      total: emails.length,
      sent: 0,
      failed: 0,
    });

    try {
      const token = await getAuthToken();
      const batchSize = 1; // Send 1 email per request
      const delayBetweenRequests = 1500; // 1.5 second delay between requests
      const maxRetries = 3;
      const allResults: EmailSendResult[] = [];

      for (let i = 0; i < emails.length; i += batchSize) {
        const batch = emails.slice(i, i + batchSize);
        let retryCount = 0;
        let success = false;

        while (retryCount < maxRetries && !success) {
          try {
            // Generate the complete HTML for the email
            const completeHtml = getCompleteEmailHTML(
              selectedTemplate.content,
              selectedTemplate.includeSignature,
              selectedTemplate.signatureConfig,
            );

            const response = await fetch(`${API_BASE_URL}/email/send-manual`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                templateId: selectedTemplate._id,
                emails: batch,
                htmlContent: completeHtml, // Send the complete HTML
                variables: {
                  parent: {
                    fullName: 'Recipient',
                    email: batch.join(', '),
                  },
                  isManual: true,
                },
              }),
            });

            if (!response.ok) {
              const errorText = await response.text();
              if (response.status === 429 && retryCount < maxRetries - 1) {
                const waitTime = 2000 * (retryCount + 1);
                await new Promise((resolve) => setTimeout(resolve, waitTime));
                retryCount++;
                continue;
              }
              throw new Error(errorText);
            }

            const batchResults = await response.json();
            allResults.push(...batchResults.results);
            success = true;
          } catch (error) {
            if (retryCount >= maxRetries - 1) {
              allResults.push({
                success: false,
                email: batch[0],
                error: error instanceof Error ? error.message : 'Unknown error',
              });
            }
            retryCount++;
          }
        }

        // Update progress
        const successfulSends = allResults.filter((r) => r.success).length;
        const failedSends = allResults.filter((r) => !r.success).length;
        setSendProgress({
          total: emails.length,
          sent: successfulSends,
          failed: failedSends,
        });

        // Wait before next request unless it's the last one
        if (i + batchSize < emails.length) {
          await new Promise((resolve) =>
            setTimeout(resolve, delayBetweenRequests),
          );
        }
      }

      const failedSends = allResults.filter((r) => !r.success);
      if (failedSends.length > 0) {
        const errorDetails = failedSends
          .map((f) => `${f.email}: ${f.error}`)
          .join('\n');
        throw new Error(
          `${failedSends.length} emails failed to send after retries:\n${errorDetails}`,
        );
      }

      setSendingStatus((prev) => ({ ...prev, manual: 'success' }));
      return true;
    } catch (error) {
      console.error('Manual email send error:', error);
      setSendingStatus((prev) => ({ ...prev, manual: 'error' }));
      setError(
        `Failed to send all manual emails: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
      return false;
    }
  };

  const sendRegularCampaign = async (): Promise<boolean> => {
    if (!selectedTemplate) return false;

    setSendingStatus((prev) => ({ ...prev, campaign: 'sending' }));

    try {
      const campaignData: EmailCampaignData = {
        templateId: selectedTemplate._id!,
        ...(selectedUsers.length > 0 && { parentIds: selectedUsers }),
        ...(selectedSeason &&
          selectedYear && {
            season: selectedSeason,
            year: selectedYear,
          }),
      };

      const token = await getAuthToken();
      const response = await fetch(`${API_BASE_URL}/email/send-campaign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(campaignData),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      setSendingStatus((prev) => ({ ...prev, campaign: 'success' }));
      return true;
    } catch (error) {
      console.error('Campaign send error:', error);
      setSendingStatus((prev) => ({ ...prev, campaign: 'error' }));
      setError(
        `Failed to send campaign: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
      return false;
    }
  };

  // New function to send broadcast to all users
  const sendBroadcastToAllUsers = async (): Promise<boolean> => {
    if (!selectedTemplate) return false;

    setSendingStatus((prev) => ({ ...prev, broadcast: 'sending' }));
    setSendProgress({
      total: allUsers.length,
      sent: 0,
      failed: 0,
    });

    try {
      const token = await getAuthToken();
      const batchSize = 1; // Send 1 email per request for broadcast
      const delayBetweenRequests = 2000; // 2 second delay between broadcast emails
      const maxRetries = 3;
      const allResults: EmailSendResult[] = [];

      // Get all user emails
      const allEmails = allUsers
        .map((user) => user.email)
        .filter((email) => email);

      for (let i = 0; i < allEmails.length; i += batchSize) {
        const batch = allEmails.slice(i, i + batchSize);
        let retryCount = 0;
        let success = false;

        while (retryCount < maxRetries && !success) {
          try {
            // Generate the complete HTML for the email
            const completeHtml = getCompleteEmailHTML(
              selectedTemplate.content,
              selectedTemplate.includeSignature,
              selectedTemplate.signatureConfig,
            );

            const response = await fetch(`${API_BASE_URL}/email/send-manual`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                templateId: selectedTemplate._id,
                emails: batch,
                htmlContent: completeHtml, // Send the complete HTML
                variables: {
                  parent: {
                    fullName: 'Customer',
                    email: batch.join(', '),
                  },
                  isManual: true,
                  isBroadcast: true,
                },
              }),
            });

            if (!response.ok) {
              const errorText = await response.text();
              if (response.status === 429 && retryCount < maxRetries - 1) {
                const waitTime = 3000 * (retryCount + 1); // Longer wait for broadcast
                await new Promise((resolve) => setTimeout(resolve, waitTime));
                retryCount++;
                continue;
              }
              throw new Error(errorText);
            }

            const batchResults = await response.json();
            allResults.push(...batchResults.results);
            success = true;
          } catch (error) {
            if (retryCount >= maxRetries - 1) {
              allResults.push({
                success: false,
                email: batch[0],
                error: error instanceof Error ? error.message : 'Unknown error',
              });
            }
            retryCount++;
          }
        }

        // Update progress
        const successfulSends = allResults.filter((r) => r.success).length;
        const failedSends = allResults.filter((r) => !r.success).length;
        setSendProgress({
          total: allEmails.length,
          sent: successfulSends,
          failed: failedSends,
        });

        // Wait before next request unless it's the last one
        if (i + batchSize < allEmails.length) {
          await new Promise((resolve) =>
            setTimeout(resolve, delayBetweenRequests),
          );
        }
      }

      const failedSends = allResults.filter((r) => !r.success);
      if (failedSends.length > 0) {
        const errorDetails = failedSends
          .map((f) => `${f.email}: ${f.error}`)
          .join('\n');
        throw new Error(
          `${failedSends.length} broadcast emails failed to send after retries:\n${errorDetails}`,
        );
      }

      setSendingStatus((prev) => ({ ...prev, broadcast: 'success' }));
      return true;
    } catch (error) {
      console.error('Broadcast email send error:', error);
      setSendingStatus((prev) => ({ ...prev, broadcast: 'error' }));
      setError(
        `Failed to send broadcast emails: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
      return false;
    }
  };

  const handleSendBroadcast = async () => {
    if (!selectedTemplate) {
      alert('Please select an email template');
      return;
    }

    // Load users if not already loaded
    if (allUsers.length === 0) {
      setLoading((prev) => ({ ...prev, allUsers: true }));
      const loadedUsers = await loadAllUsers();
      if (loadedUsers.length === 0) {
        setLoading((prev) => ({ ...prev, allUsers: false }));
        alert('No users found in the database');
        return;
      }
      setBroadcastRecipients(loadedUsers);
    } else {
      setBroadcastRecipients(allUsers);
    }

    setShowBroadcastConfirm(true);
  };

  const confirmBroadcast = async () => {
    setShowBroadcastConfirm(false);
    setError(null);
    setSuccessMessage(null);

    try {
      const success = await sendBroadcastToAllUsers();
      if (success) {
        setSuccessMessage(
          `Broadcast email sent successfully to all ${broadcastRecipients.length} users!`,
        );
        // Reset form
        setSelectedTemplate(null);
        setSelectedUsers([]);
        setManualEmails('');
        setSearchTerm('');
        setSelectedSeason('');
        setSelectedYear(null);
        setSendProgress({ total: 0, sent: 0, failed: 0 });
      }
    } catch (error) {
      console.error('Broadcast sending error:', error);
    } finally {
      setTimeout(() => {
        setSendingStatus((prev) => ({ ...prev, broadcast: 'idle' }));
      }, 3000);
    }
  };

  const handleSendCampaign = async () => {
    if (!selectedTemplate) {
      alert('Please select an email template');
      return;
    }

    setError(null);
    setSuccessMessage(null);

    // Check if we have any recipients for campaign
    if (!hasAnyRecipients()) {
      alert(
        'Please select recipients for the campaign:\n' +
          '• Select a season/year filter, OR\n' +
          '• Select users from the list, OR\n' +
          '• Enter manual email addresses\n\n' +
          'Or use "Send to All Users" to email everyone in the database',
      );
      return;
    }

    const hasSelectedUsers = selectedUsers.length > 0;
    const hasSeasonFilter = selectedSeason && selectedYear;
    const manualEmailsToSend = parseManualEmails(manualEmails);
    const hasManualEmails = manualEmailsToSend.length > 0;

    try {
      let manualSuccess = true;
      let campaignSuccess = true;

      if (hasManualEmails) {
        manualSuccess = await sendManualEmails(manualEmailsToSend);
      }

      if (hasSelectedUsers || hasSeasonFilter) {
        campaignSuccess = await sendRegularCampaign();
      }

      if (manualSuccess && campaignSuccess) {
        setSuccessMessage(
          `${
            hasManualEmails && (hasSelectedUsers || hasSeasonFilter)
              ? 'All emails'
              : hasManualEmails
                ? 'Manual emails'
                : 'Campaign emails'
          } sent successfully!`,
        );

        // Reset form
        setSelectedTemplate(null);
        setSelectedUsers([]);
        setManualEmails('');
        setSearchTerm('');
        setSelectedSeason('');
        setSelectedYear(null);
        setSendProgress({ total: 0, sent: 0, failed: 0 });
      }
    } catch (error) {
      console.error('Sending error:', error);
    } finally {
      setTimeout(() => {
        setSendingStatus({
          manual: 'idle',
          campaign: 'idle',
          broadcast: 'idle',
        });
      }, 3000);
    }
  };

  const isLoading = loading.templates || loading.seasons;

  return (
    <>
      {isLoading ? (
        <LoadingSpinner />
      ) : error ? (
        <div className='page-wrapper'>
          <Alert variant='danger' className='mt-4'>
            {error}
            <Button
              variant='primary'
              size='sm'
              onClick={() => setError(null)}
              className='ms-2'
            >
              Retry
            </Button>
          </Alert>
        </div>
      ) : (
        <>
          {successMessage && (
            <div className='page-wrapper'>
              <Alert variant='success' className='mt-2 p-2'>
                {successMessage}
              </Alert>
            </div>
          )}

          <div className='page-wrapper'>
            <div className='content content-two'>
              <div className='d-md-flex d-block align-items-center justify-content-between border-bottom pb-3'>
                <div className='my-auto mb-2'>
                  <h3 className='page-title mb-1'>Send Email Campaign</h3>
                </div>
                <div className='d-flex my-xl-auto right-content align-items-center flex-wrap'>
                  <div className='pe-1 mb-2'>
                    <OverlayTrigger
                      overlay={<Tooltip id='tooltip-top'>Refresh</Tooltip>}
                    >
                      <Button
                        variant='outline-light'
                        className='bg-white btn-icon me-1'
                        onClick={() => window.location.reload()}
                      >
                        <i className='ti ti-refresh' />
                      </Button>
                    </OverlayTrigger>
                  </div>
                </div>
              </div>

              <div className='row'>
                <div className='col-xxl-12 col-xl-12'>
                  <div className='flex-fill border-start ps-3'>
                    <div className='d-block align-items-center justify-content-between flex-wrap pt-3'>
                      <Card>
                        <Card.Body>
                          <h5 className='mb-2'>Select Template</h5>
                          <Form.Select
                            value={selectedTemplate?._id || ''}
                            onChange={(e) =>
                              handleTemplateSelect(e.target.value)
                            }
                            className='mb-2'
                          >
                            <option value=''>Choose a template...</option>
                            {templates.map((template) => (
                              <option key={template._id} value={template._id}>
                                {template.title} ({template.category})
                              </option>
                            ))}
                          </Form.Select>
                          {selectedTemplate && (
                            <>
                              <Card className='mt-3'>
                                <Card.Body>
                                  <div className='d-flex justify-content-between align-items-center mb-3'>
                                    <h5 className='mt-0 mb-0'>
                                      <span>Subject: </span>
                                      {selectedTemplate.subject}
                                    </h5>
                                    <Button
                                      variant='outline-secondary'
                                      size='sm'
                                      onClick={() =>
                                        setShowPreview(!showPreview)
                                      }
                                    >
                                      {showPreview ? 'Hide' : 'Show'} Preview
                                    </Button>
                                  </div>

                                  <Collapse in={showPreview}>
                                    <div>
                                      <div
                                        style={{
                                          maxWidth: '600px',
                                          margin: '20px auto',
                                          backgroundColor: '#ffffff',
                                          borderRadius: '8px',
                                          boxShadow:
                                            '0 2px 10px rgba(0,0,0,0.05)',
                                          overflow: 'hidden',
                                        }}
                                      >
                                        <div
                                          style={{
                                            border: '1px solid #dee2e6',
                                            borderRadius: '8px',
                                            overflow: 'hidden',
                                          }}
                                        >
                                          <iframe
                                            title='Email Preview'
                                            srcDoc={getCompleteEmailHTML(
                                              selectedTemplate.content,
                                              selectedTemplate.includeSignature,
                                              selectedTemplate.signatureConfig,
                                            )}
                                            style={{
                                              width: '100%',
                                              height: '500px',
                                              border: 'none',
                                              display: 'block',
                                            }}
                                          />
                                        </div>
                                        <div className='mt-2 text-center text-muted small'>
                                          <i className='ti ti-info-circle me-1'></i>
                                          This is how the email will look when
                                          sent
                                        </div>
                                      </div>
                                    </div>
                                  </Collapse>

                                  {!showPreview && (
                                    <div className='p-3 border rounded'>
                                      <div
                                        className='text-muted'
                                        dangerouslySetInnerHTML={{
                                          __html: selectedTemplate.content,
                                        }}
                                      />
                                      {selectedTemplate.includeSignature && (
                                        <div className='mt-3 pt-3 border-top'>
                                          <small className='text-muted'>
                                            <i className='ti ti-signature me-1'></i>
                                            Includes email signature
                                          </small>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </Card.Body>
                              </Card>
                            </>
                          )}
                        </Card.Body>
                      </Card>
                    </div>

                    <div className='d-block align-items-center justify-content-between flex-wrap'>
                      <Card>
                        <Card.Body>
                          <h5 className='mb-2'>Filter by Season</h5>
                          <Form.Select
                            value={
                              selectedSeason && selectedYear
                                ? `${selectedSeason}-${selectedYear}`
                                : ''
                            }
                            onChange={handleSeasonSelect}
                            className='mb-2'
                            disabled={selectedUsers.length > 0}
                          >
                            <option value=''>All Seasons</option>
                            {seasons.map((s) => (
                              <option
                                key={`${s.season}-${s.year}`}
                                value={`${s.season}-${s.year}`}
                              >
                                {s.season} {s.year}
                              </option>
                            ))}
                          </Form.Select>

                          <div className='mt-2 text-muted small'>
                            {selectedSeason && selectedYear ? (
                              <>
                                <Badge bg='info' className='me-1'>
                                  Season filter: {selectedSeason} {selectedYear}
                                </Badge>
                                {loading.filteredUsers && '(loading...)'}
                              </>
                            ) : (
                              'Select a season to filter users'
                            )}
                          </div>

                          {selectedSeason && selectedYear && (
                            <div className='mt-2 text-muted small'>
                              Showing users from {selectedSeason} {selectedYear}
                              {loading.filteredUsers && ' (loading...)'}
                            </div>
                          )}
                        </Card.Body>
                      </Card>
                    </div>

                    <div className='d-block align-items-center justify-content-between flex-wrap'>
                      <Card>
                        <Card.Body>
                          <h5 className='mb-2'>Search and Select Users</h5>

                          {/* Search input */}
                          <Form.Control
                            type='text'
                            placeholder='Search users by name or email'
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                          />

                          {loading.users && (
                            <div className='mt-2'>
                              <div className='spinner-border spinner-border-sm me-2'></div>
                              Loading users...
                            </div>
                          )}

                          {/* User count and broadcast info */}
                          <div className='d-flex justify-content-between align-items-center mt-2 mb-2'>
                            <div className='text-muted small'>
                              {loading.allUsers ? (
                                <div className='spinner-border spinner-border-sm me-2'></div>
                              ) : (
                                <>
                                  <Badge bg='info' className='me-2'>
                                    {allUsers.length} total users in database
                                  </Badge>
                                  {selectedSeason && selectedYear && (
                                    <Badge bg='secondary' className='me-2'>
                                      {users.length} users in {selectedSeason}{' '}
                                      {selectedYear}
                                    </Badge>
                                  )}
                                  {selectedUsers.length > 0 && (
                                    <Badge bg='success'>
                                      {selectedUsers.length} selected
                                    </Badge>
                                  )}
                                </>
                              )}
                            </div>

                            <Button
                              variant='outline-info'
                              size='sm'
                              onClick={() => loadAllUsers()}
                              disabled={loading.allUsers}
                            >
                              <i className='ti ti-refresh me-1'></i>
                              Refresh All Users
                            </Button>
                          </div>

                          {/* Search results with checkboxes */}
                          <div
                            className='mt-2 user-list'
                            style={{ maxHeight: '250px', overflowY: 'auto' }}
                          >
                            {users.length === 0 &&
                              !loading.users &&
                              !loading.filteredUsers && (
                                <div className='text-muted small text-center p-3'>
                                  {selectedSeason && selectedYear
                                    ? `No users found for ${selectedSeason} ${selectedYear}`
                                    : searchTerm
                                      ? 'No users found matching your search'
                                      : 'Select a season or enter a search term to see users'}
                                </div>
                              )}
                            {users.map((user) => (
                              <Form.Check
                                key={user._id}
                                type='checkbox'
                                id={`user-${user._id}`}
                                label={`${user.fullName} (${user.email})`}
                                checked={selectedUsers.includes(user._id)}
                                onChange={() => toggleUserSelection(user._id)}
                              />
                            ))}
                          </div>

                          {/* Select/Clear buttons */}
                          <div className='mt-2'>
                            <Button
                              variant='outline-primary'
                              size='sm'
                              onClick={selectAllUsers}
                              disabled={users.length === 0}
                              className='me-2'
                            >
                              Select All in List
                            </Button>
                            <Button
                              variant='outline-warning'
                              size='sm'
                              onClick={selectAllInDatabase}
                              disabled={loading.allUsers}
                              className='me-2'
                            >
                              Select All in Database
                            </Button>
                            <Button
                              variant='outline-secondary'
                              size='sm'
                              onClick={clearAllSelections}
                              disabled={selectedUsers.length === 0}
                            >
                              Clear All
                            </Button>
                          </div>

                          {/* Manual email entry */}
                          <div className='mt-3'>
                            <Form.Label>
                              Or manually enter email addresses (comma- or
                              newline-separated)
                            </Form.Label>
                            <Form.Control
                              as='textarea'
                              rows={3}
                              placeholder='e.g. parent1@example.com, parent2@example.com'
                              value={manualEmails}
                              onChange={(e) => setManualEmails(e.target.value)}
                            />
                          </div>
                        </Card.Body>
                      </Card>
                    </div>
                    <div className='text-end mt-4'>
                      <div className='text-end mt-4'>
                        <Button
                          onClick={handleSendCampaign}
                          disabled={
                            !selectedTemplate ||
                            !hasAnyRecipients() ||
                            sendingStatus.manual === 'sending' ||
                            sendingStatus.campaign === 'sending' ||
                            sendingStatus.broadcast === 'sending'
                          }
                          variant='primary'
                          className='me-3'
                        >
                          {sendingStatus.manual === 'sending' ||
                          sendingStatus.campaign === 'sending'
                            ? 'Sending...'
                            : 'Send Email Campaign'}
                        </Button>

                        {/* Broadcast button */}
                        <Button
                          onClick={handleSendBroadcast}
                          disabled={
                            !selectedTemplate ||
                            sendingStatus.manual === 'sending' ||
                            sendingStatus.campaign === 'sending' ||
                            sendingStatus.broadcast === 'sending' ||
                            loading.allUsers
                          }
                          variant='warning'
                        >
                          {sendingStatus.broadcast === 'sending'
                            ? 'Sending Broadcast...'
                            : 'Send to All Users'}
                        </Button>

                        {!selectedTemplate ? (
                          <div className='mt-2 text-muted small'>
                            <i className='ti ti-info-circle me-1'></i>
                            Please select an email template first
                          </div>
                        ) : !hasAnyRecipients() ? (
                          <div className='mt-2 text-muted small'>
                            <i className='ti ti-info-circle me-1'></i>
                            For campaign: select recipients (choose season,
                            select users, or enter emails)
                            <br />
                            <i className='ti ti-info-circle me-1'></i>
                            Or use "Send to All Users" to email everyone in the
                            database
                          </div>
                        ) : null}

                        {(selectedUsers.length > 0 ||
                          parseManualEmails(manualEmails).length > 0) && (
                          <div className='mt-2'>
                            {selectedUsers.length > 0 && (
                              <div className='text-muted small'>
                                {selectedUsers.length} user
                                {selectedUsers.length !== 1 ? 's' : ''} selected
                              </div>
                            )}
                            {parseManualEmails(manualEmails).length > 0 && (
                              <div className='text-muted small'>
                                {parseManualEmails(manualEmails).length} manual
                                email
                                {parseManualEmails(manualEmails).length !== 1
                                  ? 's'
                                  : ''}{' '}
                                entered
                              </div>
                            )}
                            {selectedSeason && selectedYear && (
                              <div className='text-muted small'>
                                Season filter: {selectedSeason} {selectedYear}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Progress bar for email sending */}
                        {(sendingStatus.manual === 'sending' ||
                          sendingStatus.campaign === 'sending' ||
                          sendingStatus.broadcast === 'sending') && (
                          <div className='mt-3'>
                            <div className='d-flex justify-content-between'>
                              <small>
                                {sendingStatus.broadcast === 'sending'
                                  ? `Broadcast: ${sendProgress.sent} sent, ${sendProgress.failed} failed`
                                  : `Emails: ${sendProgress.sent} sent, ${sendProgress.failed} failed`}
                              </small>
                              <small>{sendProgress.total} total</small>
                            </div>
                            <ProgressBar
                              variant={
                                sendingStatus.manual === 'success' ||
                                sendingStatus.campaign === 'success' ||
                                sendingStatus.broadcast === 'success'
                                  ? 'success'
                                  : sendingStatus.manual === 'error' ||
                                      sendingStatus.campaign === 'error' ||
                                      sendingStatus.broadcast === 'error'
                                    ? 'danger'
                                    : 'warning'
                              }
                              now={
                                sendProgress.total > 0
                                  ? (sendProgress.sent / sendProgress.total) *
                                    100
                                  : 0
                              }
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Broadcast Confirmation Modal */}
          <Modal
            show={showBroadcastConfirm}
            onHide={() => setShowBroadcastConfirm(false)}
          >
            <Modal.Header closeButton>
              <Modal.Title>
                <i className='ti ti-alert-triangle text-warning me-2'></i>
                Confirm Broadcast Email
              </Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <Alert variant='warning' className='mb-3'>
                <h5 className='alert-heading'>⚠️ Important Warning</h5>
                <p>
                  You are about to send an email to{' '}
                  <strong>ALL {broadcastRecipients.length} USERS</strong> in the
                  database. This cannot be undone.
                </p>
              </Alert>

              <div className='mb-3'>
                <h6>Template Details:</h6>
                <p>
                  <strong>Subject:</strong> {selectedTemplate?.subject}
                </p>
                <p>
                  <strong>Template:</strong> {selectedTemplate?.title}
                </p>
              </div>

              <div className='mb-3'>
                <h6>Recipients:</h6>
                <div
                  className='border p-2'
                  style={{ maxHeight: '150px', overflowY: 'auto' }}
                >
                  {broadcastRecipients.slice(0, 10).map((user, index) => (
                    <div key={user._id} className='small'>
                      {index + 1}. {user.fullName} ({user.email})
                    </div>
                  ))}
                  {broadcastRecipients.length > 10 && (
                    <div className='text-muted small'>
                      ... and {broadcastRecipients.length - 10} more users
                    </div>
                  )}
                </div>
              </div>

              <p className='text-muted small'>
                <i className='ti ti-info-circle me-1'></i>
                This may take several minutes to complete depending on the
                number of users.
              </p>
            </Modal.Body>
            <Modal.Footer>
              <Button
                className='me-2'
                variant='secondary'
                onClick={() => setShowBroadcastConfirm(false)}
              >
                Cancel
              </Button>
              <Button variant='warning' onClick={confirmBroadcast}>
                Yes, Send to All {broadcastRecipients.length} Users
              </Button>
            </Modal.Footer>
          </Modal>
        </>
      )}
    </>
  );
};
