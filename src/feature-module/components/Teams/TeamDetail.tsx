// components/Teams/TeamDetail.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Button, Tabs, Table, Alert, Descriptions, notification } from 'antd';
import {
  TeamOutlined,
  UserOutlined,
  EditOutlined,
  MailOutlined,
} from '@ant-design/icons';
import TooltipOption from '../../../core/common/tooltipOption';
import Swal from 'sweetalert2';
import { useAuth } from '../../../context/AuthContext';
import { all_routes } from '../../router/all_routes';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import { TeamListHeader } from '../Headers/TeamListHeader';
import { getPlayerTableColumns } from '../Tables/PlayerTableColumns';
import { PlayerTableData } from '../../../types/playerTypes';
import axios from 'axios';
import AcceptanceEmailModal, { EmailPayload } from './AcceptanceEmailModal';
import './TeamDetail.scss';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const TeamDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getAuthToken, currentUser } = useAuth();

  const [team, setTeam] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tableLoading, setTableLoading] = useState(false);
  const [playersWithDetails, setPlayersWithDetails] = useState<any[]>([]);
  const [playerPageSize, setPlayerPageSize] = useState<number>(10);
  const [coachPageSize, setCoachPageSize] = useState<number>(10);
  const [showAcceptanceModal, setShowAcceptanceModal] = useState(false);

  useEffect(() => {
    fetchTeamDetail();
  }, [id]);

  const fetchTeamDetail = async () => {
    try {
      setLoading(true);
      const token = await getAuthToken();

      const response = await fetch(`${API_BASE_URL}/internal-teams/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch team details');

      const teamData = await response.json();
      setTeam(teamData);

      if (teamData.playerIds && teamData.playerIds.length > 0) {
        await fetchPlayersDetails(teamData.playerIds);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load team details',
      );
      Swal.fire({
        icon: 'error',
        title: 'Error Loading Team',
        text:
          err instanceof Error ? err.message : 'Failed to load team details',
        confirmButtonColor: '#3085d6',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPlayersDetails = async (players: any[]) => {
    try {
      setTableLoading(true);
      const token = await getAuthToken();
      const detailedPlayers = [];

      for (const player of players) {
        const playerId = player._id || player.id;
        try {
          const response = await axios.get(
            `${API_BASE_URL}/player/${playerId}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          );
          detailedPlayers.push(response.data);
        } catch (error) {
          console.error(
            `Failed to fetch details for player ${playerId}:`,
            error,
          );
          detailedPlayers.push(player);
        }
      }

      setPlayersWithDetails(detailedPlayers);
    } catch (error) {
      console.error('Error fetching player details:', error);
    } finally {
      setTableLoading(false);
    }
  };

  const handleRefresh = () => {
    setTableLoading(true);
    fetchTeamDetail().finally(() => setTableLoading(false));
  };

  const handlePlayerClick = async (playerRecord: any) => {
    try {
      const token = await getAuthToken();
      const playerId = playerRecord.id || playerRecord._id;

      Swal.fire({
        title: 'Loading Player...',
        html: 'Please wait while we fetch player details',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      const [playerResponse, guardiansResponse] = await Promise.all([
        axios
          .get(`${API_BASE_URL}/player/${playerId}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          .catch(async () =>
            axios.get(`${API_BASE_URL}/players/get/${playerId}`, {
              headers: { Authorization: `Bearer ${token}` },
            }),
          ),
        axios
          .get(`${API_BASE_URL}/player/${playerId}/guardians`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          .catch(async () =>
            axios.get(`${API_BASE_URL}/guardians/player/${playerId}`, {
              headers: { Authorization: `Bearer ${token}` },
            }),
          ),
      ]);

      Swal.close();

      const fullPlayerData = playerResponse.data;
      const guardiansData = guardiansResponse.data;

      const transformedGuardians = Array.isArray(guardiansData)
        ? guardiansData.map((guardian: any) => ({
            _id: guardian._id || guardian.id,
            id: guardian._id || guardian.id,
            fullName: guardian.fullName || guardian.name,
            phone: guardian.phone,
            email: guardian.email,
            address: guardian.address,
            relationship: guardian.relationship,
            avatar: guardian.avatar,
            aauNumber: guardian.aauNumber || 'Not Available',
            isPrimary: guardian.isPrimary || false,
          }))
        : [];

      const completePlayerData = {
        ...fullPlayerData,
        _id: playerId,
        playerId,
        id: playerId,
        name: fullPlayerData.fullName || fullPlayerData.name,
        fullName: fullPlayerData.fullName || fullPlayerData.name,
        healthConcerns:
          fullPlayerData.healthConcerns ||
          fullPlayerData.medicalHistory ||
          'No Medical History',
        medicalHistory:
          fullPlayerData.medicalHistory ||
          fullPlayerData.healthConcerns ||
          'No Medical History',
        gender: fullPlayerData.gender,
        dob: fullPlayerData.dob,
        schoolName: fullPlayerData.schoolName,
        grade: fullPlayerData.grade,
        aauNumber: fullPlayerData.aauNumber,
        seasons: fullPlayerData.seasons || [],
        status: fullPlayerData.status,
        avatar: fullPlayerData.avatar,
        imgSrc: fullPlayerData.avatar,
      };

      navigate(`${all_routes.playerDetail}/${playerId}`, {
        state: {
          player: completePlayerData,
          guardians: transformedGuardians,
          siblings: [],
          sharedData: {
            familyGuardians: transformedGuardians,
            familyAddress: transformedGuardians.find((g: any) => g.isPrimary)
              ?.address,
          },
          key: Date.now(),
        },
      });
    } catch (error) {
      console.error('TeamDetail - Failed to fetch player details:', error);
      Swal.close();
      Swal.fire({
        icon: 'error',
        title: 'Navigation Error',
        text: 'Failed to load player details. Navigating with basic information.',
        confirmButtonColor: '#3085d6',
      });
      navigate(
        `${all_routes.playerDetail}/${playerRecord.id || playerRecord._id}`,
        {
          state: {
            player: {
              ...playerRecord,
              _id: playerRecord.id || playerRecord._id,
              playerId: playerRecord.id || playerRecord._id,
              id: playerRecord.id || playerRecord._id,
            },
            key: Date.now(),
          },
        },
      );
    }
  };

  const handleCoachClick = async (coachRecord: any) => {
    const coachId = coachRecord._id || coachRecord.id;
    Swal.fire({
      title: 'Loading Coach...',
      html: 'Please wait while we load coach details',
      timer: 1000,
      timerProgressBar: true,
      didOpen: () => {
        Swal.showLoading();
      },
    });
    navigate(`${all_routes.parentDetail}/${coachId}`, {
      state: {
        parent: {
          ...coachRecord,
          _id: coachId,
          id: coachId,
          fullName: coachRecord.fullName || coachRecord.name,
          isCoach: true,
        },
        key: Date.now(),
      },
    });
  };

  const handleEditPlayer = async (playerRecord: any) => {
    try {
      const token = await getAuthToken();
      const playerId = playerRecord.id || playerRecord._id;

      Swal.fire({
        title: 'Loading Player...',
        html: 'Please wait while we fetch player details for editing',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      const playerResponse = await axios
        .get(`${API_BASE_URL}/player/${playerId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .catch(async () =>
          axios.get(`${API_BASE_URL}/players/get/${playerId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        );

      Swal.close();
      const fullPlayerData = playerResponse.data;

      navigate(`${all_routes.editPlayer}/${playerId}`, {
        state: {
          player: {
            ...fullPlayerData,
            _id: playerId,
            playerId,
            id: playerId,
            fullName: fullPlayerData.fullName || fullPlayerData.name,
            name: fullPlayerData.fullName || fullPlayerData.name,
            gender: fullPlayerData.gender,
            dob: fullPlayerData.dob,
            schoolName: fullPlayerData.schoolName,
            grade: fullPlayerData.grade,
            aauNumber: fullPlayerData.aauNumber,
            healthConcerns: fullPlayerData.healthConcerns || '',
            avatar: fullPlayerData.avatar,
            seasons: fullPlayerData.seasons || [],
          },
          from: window.location.pathname,
          key: Date.now(),
        },
      });
    } catch (error) {
      console.error('Failed to fetch player for edit:', error);
      Swal.close();
      Swal.fire({
        icon: 'error',
        title: 'Edit Failed',
        text: 'Failed to load player details for editing.',
        confirmButtonColor: '#3085d6',
      });
    }
  };

  // ── Send Acceptance Email ─────────────────────────────────────────────────
  const handleSendAcceptanceEmail = async (payload: EmailPayload) => {
    const token = await getAuthToken();
    const playerList = team?.playerIds || [];
    const recipientEmails: Array<{ email: string; playerName: string }> = [];

    for (const player of playerList) {
      const playerId = player._id || player.id;
      try {
        const res = await axios
          .get(`${API_BASE_URL}/player/${playerId}/guardians`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          .catch(() =>
            axios.get(`${API_BASE_URL}/guardians/player/${playerId}`, {
              headers: { Authorization: `Bearer ${token}` },
            }),
          );
        const guardians = res.data;
        if (Array.isArray(guardians)) {
          guardians.forEach((g: any) => {
            if (g.email) {
              recipientEmails.push({
                email: g.email,
                playerName: player.fullName || player.name || 'your child',
              });
            }
          });
        }
      } catch {
        // skip if guardians fetch fails
      }
    }

    if (recipientEmails.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'No Email Addresses Found',
        text: 'No parent email addresses were found for the players on this team.',
        confirmButtonColor: '#3085d6',
      });
      return;
    }

    await axios.post(
      `${API_BASE_URL}/internal-teams/${team._id}/send-acceptance-email`,
      { ...payload, recipients: recipientEmails },
      { headers: { Authorization: `Bearer ${token}` } },
    );

    setShowAcceptanceModal(false);

    Swal.fire({
      icon: 'success',
      title: 'Emails Sent!',
      text: `Acceptance emails sent to ${recipientEmails.length} parent${recipientEmails.length !== 1 ? 's' : ''}.`,
      timer: 3000,
      showConfirmButton: false,
    });
  };

  // ── Toggle Team Status (active / inactive) ───────────────────────────────
  const handleToggleTeamStatus = async () => {
    const newStatus = team?.status === 'active' ? 'inactive' : 'active';
    try {
      const token = await getAuthToken();
      await axios.patch(
        `${API_BASE_URL}/internal-teams/${team._id}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setTeam((prev: any) => ({ ...prev, status: newStatus }));
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Update Failed',
        text: 'Could not update team status. Please try again.',
        confirmButtonColor: '#3085d6',
      });
    }
  };

  // ── Toggle per-player payment (paid / unpaid) ────────────────────────────
  const handleTogglePlayerPayment = async (player: any) => {
    const isPaid =
      player.paymentStatus === 'paid' || player.paymentComplete === true;
    const newStatus = isPaid ? 'pending' : 'paid';
    // Optimistic UI update
    setPlayersWithDetails((prev: any[]) =>
      prev.map((p: any) =>
        (p._id || p.id) === (player.id || player._id)
          ? { ...p, paymentStatus: newStatus, paymentComplete: !isPaid }
          : p,
      ),
    );
    try {
      const token = await getAuthToken();
      await axios.patch(
        `${API_BASE_URL}/players/${player.id || player._id}/payment-status`,
        { paymentStatus: newStatus, paymentComplete: !isPaid },
        { headers: { Authorization: `Bearer ${token}` } },
      );
    } catch (err) {
      // Revert on failure
      setPlayersWithDetails((prev: any[]) =>
        prev.map((p: any) =>
          (p._id || p.id) === (player.id || player._id)
            ? {
                ...p,
                paymentStatus: isPaid ? 'paid' : 'pending',
                paymentComplete: isPaid,
              }
            : p,
        ),
      );
      Swal.fire({
        icon: 'error',
        title: 'Update Failed',
        text: 'Could not update player payment. Please try again.',
        confirmButtonColor: '#3085d6',
      });
    }
  };

  // ── Export helpers (unchanged) ────────────────────────────────────────────
  const exportParentEmails = async () => {
    try {
      if (!team?.playerIds || team.playerIds.length === 0) {
        Swal.fire({
          icon: 'warning',
          title: 'No Players',
          text: 'There are no players in this team to export emails from.',
          confirmButtonColor: '#3085d6',
        });
        return;
      }

      Swal.fire({
        title: 'Collecting Parent Emails...',
        html: 'Please wait while we gather all parent email addresses',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      const token = await getAuthToken();
      const parentEmails: Array<{
        playerName: string;
        parentName: string;
        email: string;
        relationship?: string;
      }> = [];

      for (const player of team.playerIds) {
        const playerId = player._id || player.id;
        try {
          const guardiansResponse = await axios
            .get(`${API_BASE_URL}/player/${playerId}/guardians`, {
              headers: { Authorization: `Bearer ${token}` },
            })
            .catch(async () =>
              axios.get(`${API_BASE_URL}/guardians/player/${playerId}`, {
                headers: { Authorization: `Bearer ${token}` },
              }),
            );

          const guardians = guardiansResponse.data;
          if (Array.isArray(guardians) && guardians.length > 0) {
            guardians.forEach((guardian: any) => {
              if (guardian.email) {
                parentEmails.push({
                  playerName: player.fullName || player.name || 'Unknown',
                  parentName: guardian.fullName || guardian.name || 'Unknown',
                  email: guardian.email,
                  relationship: guardian.relationship || 'Parent/Guardian',
                });
              }
            });
          }
        } catch (error) {
          console.error(
            `Error fetching guardians for player ${playerId}:`,
            error,
          );
        }
      }

      Swal.close();

      if (parentEmails.length === 0) {
        Swal.fire({
          icon: 'info',
          title: 'No Emails Found',
          text: 'No parent email addresses were found for this team.',
          confirmButtonColor: '#3085d6',
        });
        return;
      }

      const headers = ['Player Name', 'Parent Name', 'Email', 'Relationship'];
      const csvContent = [
        headers.join(','),
        ...parentEmails.map((row) =>
          Object.values(row)
            .map((value) => {
              if (
                typeof value === 'string' &&
                (value.includes(',') || value.includes('"'))
              ) {
                return `"${value.replace(/"/g, '""')}"`;
              }
              return value;
            })
            .join(','),
        ),
      ].join('\n');

      const plainEmails = parentEmails
        .filter((item) => item.email)
        .map((item) => item.email)
        .join('\n');

      const result = await Swal.fire({
        title: 'Export Parent Emails',
        html: `<div style="text-align: left;"><p>Found <strong>${parentEmails.length}</strong> valid email addresses.</p><p>Choose export format:</p></div>`,
        icon: 'question',
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: '📋 Copy Emails',
        denyButtonText: '📁 Download CSV',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#17a2b8',
        denyButtonColor: '#28a745',
        cancelButtonColor: '#6c757d',
      });

      if (result.isConfirmed) {
        await navigator.clipboard.writeText(plainEmails);
        Swal.fire({
          icon: 'success',
          title: 'Copied!',
          text: `${parentEmails.length} email addresses copied to clipboard.`,
          timer: 2000,
          showConfirmButton: false,
        });
        notification.success({
          message: 'Emails Copied',
          description: 'Parent email addresses copied to clipboard.',
        });
      } else if (result.isDenied) {
        const blob = new Blob([csvContent], {
          type: 'text/csv;charset=utf-8;',
        });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute(
          'download',
          `${team?.name}_parent_emails_${new Date().toISOString().split('T')[0]}.csv`,
        );
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        Swal.fire({
          icon: 'success',
          title: 'Downloaded!',
          text: 'Parent emails CSV file has been downloaded.',
          timer: 2000,
          showConfirmButton: false,
        });
        notification.success({
          message: 'Export Successful',
          description: 'Parent emails exported to CSV successfully.',
        });
      }
    } catch (error) {
      console.error('Error exporting parent emails:', error);
      Swal.fire({
        icon: 'error',
        title: 'Export Failed',
        text: 'Failed to export parent email addresses.',
        confirmButtonColor: '#3085d6',
      });
    }
  };

  const exportPlayersToExcel = async (players: any[]) => {
    try {
      Swal.fire({
        title: 'Preparing Export...',
        html: 'Please wait while we gather player data',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      const excelData = players.map((player, index) => ({
        'No.': index + 1,
        'Player Name': player.fullName || 'N/A',
        Gender: player.gender || 'N/A',
        Grade: player.grade || 'N/A',
        School: player.schoolName || 'N/A',
        'Date of Birth': player.dob
          ? new Date(player.dob).toLocaleDateString()
          : 'N/A',
      }));

      Swal.close();

      const headers = Object.keys(excelData[0]).join(',');
      const csvContent = [
        headers,
        ...excelData.map((row) =>
          Object.values(row)
            .map((value) => {
              if (typeof value === 'string') {
                const escapedValue = value.replace(/"/g, '""');
                if (
                  escapedValue.includes(',') ||
                  escapedValue.includes('"') ||
                  escapedValue.includes('\n')
                )
                  return `"${escapedValue}"`;
                return escapedValue;
              }
              return value;
            })
            .join(','),
        ),
      ].join('\n');

      const blob = new Blob(['\uFEFF' + csvContent], {
        type: 'text/csv;charset=utf-8;',
      });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute(
        'download',
        `${team?.name}_players_${new Date().toISOString().split('T')[0]}.csv`,
      );
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      Swal.fire({
        icon: 'success',
        title: 'Export Successful',
        text: 'Player data exported to CSV successfully.',
        timer: 2000,
        showConfirmButton: false,
      });
      notification.success({
        message: 'Export Successful',
        description: 'Player data exported to CSV successfully.',
      });
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      Swal.close();
      Swal.fire({
        icon: 'error',
        title: 'Export Failed',
        text: 'Failed to export player data.',
        confirmButtonColor: '#3085d6',
      });
    }
  };

  const exportPlayersToPDF = (players: any[]) => {
    try {
      const printContent = `<!DOCTYPE html><html><head><title>${team?.name} - Player Roster</title><style>body{font-family:Arial,sans-serif;margin:20px;color:#333}.header{text-align:center;margin-bottom:30px;border-bottom:2px solid #333;padding-bottom:20px}h1{color:#333;margin:0;font-size:24px}.team-info{margin:15px 0;text-align:center}.team-info p{margin:5px 0;font-size:14px}table{width:100%;border-collapse:collapse;margin-top:20px;font-size:12px}th,td{border:1px solid #ddd;padding:10px;text-align:left}th{background-color:#f5f5f5;font-weight:bold;color:#333}tr:nth-child(even){background-color:#f9f9f9}.footer{margin-top:30px;text-align:center;font-size:12px;color:#666}</style></head><body><div class="header"><h1>${team?.name} - Player Roster</h1><div class="team-info"><p><strong>Team:</strong> ${team?.name} | <strong>Year:</strong> ${team?.year} | <strong>Grade:</strong> ${team?.grade} | <strong>Gender:</strong> ${team?.gender}</p><p><strong>Total Players:</strong> ${players.length} | <strong>Export Date:</strong> ${new Date().toLocaleDateString()}</p></div></div><table><thead><tr><th>No.</th><th>Player Name</th><th>Gender</th><th>Grade</th><th>School</th><th>Date of Birth</th></tr></thead><tbody>${players.map((player, index) => `<tr><td>${index + 1}</td><td>${player.fullName || 'N/A'}</td><td>${player.gender || 'N/A'}</td><td>${player.grade || 'N/A'}</td><td>${player.schoolName || 'N/A'}</td><td>${player.dob ? new Date(player.dob).toLocaleDateString() : 'N/A'}</td></tr>`).join('')}</tbody></table><div class="footer"><p>Generated on ${new Date().toLocaleString()}</p></div></body></html>`;

      Swal.fire({
        title: 'Generating PDF...',
        html: 'Please wait while we prepare the PDF',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.onload = () => {
          printWindow.focus();
          printWindow.print();
          Swal.close();
          Swal.fire({
            icon: 'success',
            title: 'PDF Ready',
            text: "Player roster opened for printing. Use your browser's print dialog to save as PDF.",
            timer: 3000,
            showConfirmButton: true,
          });
        };
      }

      notification.success({
        message: 'PDF Ready',
        description: 'Player roster opened for printing.',
      });
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      Swal.close();
      Swal.fire({
        icon: 'error',
        title: 'Export Failed',
        text: 'Failed to generate PDF. Please try again.',
        confirmButtonColor: '#3085d6',
      });
    }
  };

  const handleExportExcel = async () => {
    if (team?.playerIds && team.playerIds.length > 0) {
      await exportPlayersToExcel(team.playerIds);
    } else {
      Swal.fire({
        icon: 'warning',
        title: 'No Players',
        text: 'There are no players in this team to export.',
        confirmButtonColor: '#3085d6',
      });
    }
  };

  const handleExportPDF = () => {
    if (team?.playerIds && team.playerIds.length > 0) {
      exportPlayersToPDF(team.playerIds);
    } else {
      Swal.fire({
        icon: 'warning',
        title: 'No Players',
        text: 'There are no players in this team to export.',
        confirmButtonColor: '#3085d6',
      });
    }
  };

  // ── Table data ────────────────────────────────────────────────────────────
  const transformedPlayers = useMemo((): PlayerTableData[] => {
    if (!playersWithDetails || playersWithDetails.length === 0) return [];
    return playersWithDetails.map((player: any) => {
      const playerId = player._id || player.id;
      return {
        id: playerId,
        key: playerId,
        name: player.fullName || player.name || 'N/A',
        fullName: player.fullName || player.name || 'N/A',
        gender: player.gender || 'N/A',
        dob: player.dob || '',
        age: player.dob
          ? Math.floor(
              (Date.now() - new Date(player.dob).getTime()) /
                (365.25 * 24 * 60 * 60 * 1000),
            )
          : 0,
        section: player.schoolName || player.section || 'No School',
        schoolName: player.schoolName || player.section || 'No School',
        class: player.grade || 'N/A',
        grade: player.grade || 'N/A',
        aauNumber: player.aauNumber || 'N/A',
        healthConcerns: player.healthConcerns || 'None',
        status: player.status || 'Inactive',
        paymentStatus: player.paymentStatus || 'pending',
        paymentComplete: player.paymentComplete || false,
        registrationYear: player.registrationYear || new Date().getFullYear(),
        season: player.season || '',
        createdAt: player.createdAt || new Date().toISOString(),
        updatedAt: player.updatedAt || new Date().toISOString(),
        DateofJoin: player.createdAt || new Date().toISOString(),
        parentId: player.parentId,
        avatar: player.avatar,
        imgSrc:
          player.avatar ||
          (player.gender === 'Female'
            ? 'https://partizan-be.onrender.com/uploads/avatars/girl.png'
            : 'https://partizan-be.onrender.com/uploads/avatars/boy.png'),
        parents: player.parents || [],
        seasons: player.seasons || [],
        registrationComplete: player.registrationComplete || false,
        paymentInfo: player.paymentInfo,
        siblings: player.siblings || [],
        isOwnPlayer: false,
      } as PlayerTableData;
    });
  }, [playersWithDetails]);

  const playerColumns = useMemo(() => {
    const columns = getPlayerTableColumns({
      handlePlayerClick,
      location: window.location,
      currentUserRole: currentUser?.role,
      isCoach: currentUser?.isCoach,
      activeTab: 'all-players',
      visibleFields: undefined,
    });

    if (!columns) return [];

    // Filter out DOB, School Name, Seasons, and Gender columns
    const filteredColumns = columns.filter((col) => {
      // Skip DOB column
      if (
        col.key === 'dob' ||
        ('dataIndex' in col && col.dataIndex === 'dob')
      ) {
        return false;
      }
      // Skip School Name column
      if (
        col.key === 'section' ||
        ('dataIndex' in col && col.dataIndex === 'section')
      ) {
        return false;
      }
      // Skip School Name column (alternative name)
      if (
        col.key === 'schoolName' ||
        ('dataIndex' in col && col.dataIndex === 'schoolName')
      ) {
        return false;
      }
      // Skip Seasons column
      if (
        col.key === 'seasons' ||
        ('dataIndex' in col && col.dataIndex === 'seasons')
      ) {
        return false;
      }
      // Skip Gender column
      if (
        col.key === 'gender' ||
        ('dataIndex' in col && col.dataIndex === 'gender')
      ) {
        return false;
      }
      return true;
    });

    return filteredColumns.map((col) => {
      // Check if this is the status column
      const isStatusColumn =
        col.key === 'status' ||
        ('dataIndex' in col &&
          (col.dataIndex === 'status' || col.key === 'status'));

      if (isStatusColumn) {
        return {
          ...col,
          width: 120,
          render: (_: unknown, record: any) => {
            const isPaid =
              record.paymentStatus === 'paid' ||
              record.paymentComplete === true;
            return (
              <div className='d-flex align-items-center gap-2'>
                <div
                  className='form-check form-switch mb-0'
                  style={{ paddingLeft: '2.5em' }}
                >
                  <input
                    className='form-check-input'
                    type='checkbox'
                    role='switch'
                    checked={isPaid}
                    onChange={() => handleTogglePlayerPayment(record)}
                    style={{
                      cursor: 'pointer',
                      width: '2.2em',
                      height: '1.2em',
                    }}
                  />
                </div>
                <span
                  className={`fw-semibold small ${isPaid ? 'text-success' : 'text-muted'}`}
                >
                  {isPaid ? 'Paid' : 'Pending'}
                </span>
              </div>
            );
          },
        };
      }

      // Check if this is the action column - keep it but remove the toggle
      const isActionColumn =
        col.key === 'action' ||
        ('dataIndex' in col && col.dataIndex === 'action');

      if (isActionColumn) {
        return {
          ...col,
          width: 120,
          render: (_: unknown, record: any) => {
            return (
              <div className='d-flex align-items-center gap-2'>
                <button
                  onClick={() => handlePlayerClick(record)}
                  className='btn btn-sm btn-icon btn-outline-secondary'
                  title='View Details'
                  style={{ width: '32px', height: '32px' }}
                >
                  <i className='ti ti-eye fs-16' />
                </button>
                <button
                  onClick={() => handleEditPlayer(record)}
                  className='btn btn-sm btn-icon btn-outline-warning'
                  title='Edit'
                  style={{ width: '32px', height: '32px' }}
                >
                  <i className='ti ti-edit fs-16' />
                </button>
              </div>
            );
          },
        };
      }

      // For all other columns, return as is
      return col;
    });
  }, [
    handlePlayerClick,
    handleEditPlayer,
    handleTogglePlayerPayment,
    currentUser?.role,
    currentUser?.isCoach,
  ]);

  const coachColumns = [
    {
      title: 'Coach Name',
      dataIndex: 'fullName',
      key: 'fullName',
      width: 220,
      render: (text: string, record: any) => (
        <div className='d-flex align-items-center'>
          <div className='avatar avatar-sm flex-shrink-0 me-2'>
            <img
              src={'https://partizan-be.onrender.com/uploads/avatars/coach.png'}
              className='img-fluid rounded-circle'
              alt={`${text} avatar`}
              style={{
                width: '32px',
                height: '32px',
                objectFit: 'cover',
                border: '1px solid #e8e8e8',
              }}
            />
          </div>
          <div className='flex-grow-1 min-width-0'>
            <p
              className='cursor-pointer text-primary mb-0 text-truncate'
              style={{ maxWidth: '170px' }}
              title={text}
              onClick={() => handleCoachClick(record)}
            >
              {text}
            </p>
          </div>
        </div>
      ),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      width: 200,
      render: (text: string) => (
        <span
          className='text-truncate d-inline-block'
          style={{ maxWidth: '180px' }}
          title={text}
        >
          {text || 'N/A'}
        </span>
      ),
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
      width: 150,
      render: (text: string) => text || 'N/A',
    },
    {
      title: 'Action',
      key: 'action',
      width: 120,
      align: 'center' as const,
      render: (_: unknown, record: any) => (
        <div className='d-flex align-items-center justify-content-center gap-2'>
          <button
            onClick={() => handleCoachClick(record)}
            className='btn btn-sm btn-icon btn-outline-secondary'
            title='View Coach'
            style={{ width: '32px', height: '32px' }}
          >
            <i className='ti ti-eye fs-16' />
          </button>
        </div>
      ),
    },
  ];

  const tabItems = [
    {
      key: 'players',
      label: (
        <span className='d-flex align-items-center'>
          <UserOutlined className='me-2' />
          Players ({team?.playerIds?.length || 0})
        </span>
      ),
      children:
        transformedPlayers.length > 0 ? (
          <div className='table-responsive'>
            <Table
              columns={playerColumns}
              dataSource={transformedPlayers}
              rowKey='id'
              pagination={{
                pageSize: playerPageSize,
                showSizeChanger: true,
                pageSizeOptions: ['10', '20', '50', '100'],
                onShowSizeChange: (_, size) => setPlayerPageSize(size),
              }}
              loading={tableLoading}
              scroll={{ x: true }}
            />
          </div>
        ) : (
          <div className='text-center py-5'>
            <UserOutlined style={{ fontSize: '48px', color: '#ccc' }} />
            <h4 className='mt-3'>No Players</h4>
            <p className='text-muted'>
              No players have been added to this team yet.
            </p>
          </div>
        ),
    },
    {
      key: 'coaches',
      label: (
        <span className='d-flex align-items-center'>
          <TeamOutlined className='me-2' />
          Coaches ({team?.coachIds?.length || 0})
        </span>
      ),
      children:
        team?.coachIds && team.coachIds.length > 0 ? (
          <div className='table-responsive'>
            <Table
              columns={coachColumns}
              dataSource={team?.coachIds || []}
              rowKey={(record) =>
                record._id || record.id || Math.random().toString()
              }
              pagination={{
                pageSize: coachPageSize,
                showSizeChanger: true,
                pageSizeOptions: ['10', '20', '50', '100'],
                onShowSizeChange: (_, size) => setCoachPageSize(size),
              }}
              loading={tableLoading}
              scroll={{ x: true }}
            />
          </div>
        ) : (
          <div className='text-center py-5'>
            <TeamOutlined style={{ fontSize: '48px', color: '#ccc' }} />
            <h4 className='mt-3'>No Coaches</h4>
            <p className='text-muted'>
              No coaches have been assigned to this team yet.
            </p>
          </div>
        ),
    },
    {
      key: 'info',
      label: (
        <span className='d-flex align-items-center'>
          <i className='ti ti-info-circle me-2'></i>Team Info
        </span>
      ),
      children: (
        <div className='p-3 team-info-cards'>
          <div className='row mx-2'>
            <div className='col-md-4 ps-1 pe-2'>
              <div className='card border-1 shadow-sm h-100'>
                <div className='card-header bg-transparent border-0'>
                  <h6 className='card-title mb-0'>
                    <i className='ti ti-info-circle me-2'></i>Basic Information
                  </h6>
                </div>
                <div className='card-body'>
                  <Descriptions column={1} size='small'>
                    <Descriptions.Item label='Team Name'>
                      {team?.name}
                    </Descriptions.Item>
                    <Descriptions.Item label='Year'>
                      {team?.year}
                    </Descriptions.Item>
                    <Descriptions.Item label='Grade'>
                      {team?.grade}
                    </Descriptions.Item>
                    <Descriptions.Item label='Gender'>
                      {team?.gender}
                    </Descriptions.Item>
                    <Descriptions.Item label='Tryout Season'>
                      {team?.tryoutSeason || 'N/A'}
                    </Descriptions.Item>
                    <Descriptions.Item label='Tryout Year'>
                      {team?.tryoutYear || 'N/A'}
                    </Descriptions.Item>
                    <Descriptions.Item label='Status'>
                      <div className='d-flex align-items-center gap-2'>
                        <div
                          className='form-check form-switch mb-0'
                          style={{ paddingLeft: '2.5em' }}
                        >
                          <input
                            className='form-check-input'
                            type='checkbox'
                            role='switch'
                            id='teamStatusToggle'
                            checked={team?.status === 'active'}
                            onChange={handleToggleTeamStatus}
                            style={{
                              cursor: 'pointer',
                              width: '2.5em',
                              height: '1.3em',
                            }}
                          />
                        </div>
                        <label
                          htmlFor='teamStatusToggle'
                          className={`mb-0 fw-semibold ${team?.status === 'active' ? 'text-success' : 'text-danger'}`}
                          style={{ cursor: 'pointer' }}
                        >
                          {team?.status === 'active' ? 'Active' : 'Inactive'}
                        </label>
                      </div>
                    </Descriptions.Item>
                  </Descriptions>
                </div>
              </div>
            </div>
            <div className='col-md-4 px-2'>
              <div className='card border-1 shadow-sm h-100'>
                <div className='card-header bg-transparent border-0'>
                  <h6 className='card-title mb-0'>
                    <i className='ti ti-chart-bar me-2'></i>Statistics
                  </h6>
                </div>
                <div className='card-body'>
                  <Descriptions column={1} size='small'>
                    <Descriptions.Item label='Total Players'>
                      {team?.playerIds?.length || 0}
                    </Descriptions.Item>
                    <Descriptions.Item label='Total Coaches'>
                      {team?.coachIds?.length || 0}
                    </Descriptions.Item>
                    <Descriptions.Item label='Created'>
                      {team?.createdAt
                        ? new Date(team.createdAt).toLocaleDateString()
                        : 'N/A'}
                    </Descriptions.Item>
                    <Descriptions.Item label='Last Updated'>
                      {team?.updatedAt
                        ? new Date(team.updatedAt).toLocaleDateString()
                        : 'N/A'}
                    </Descriptions.Item>
                  </Descriptions>
                </div>
              </div>
            </div>
            <div className='col-md-4 ps-2 pe-1'>
              <div className='card border-1 shadow-sm h-100'>
                <div className='card-header bg-transparent border-0'>
                  <h6 className='card-title mb-0'>
                    <i className='ti ti-notes me-2'></i>Notes
                  </h6>
                </div>
                <div className='card-body'>
                  {team?.notes ? (
                    <p className='text-muted mb-0'>{team.notes}</p>
                  ) : (
                    <div className='text-center py-4'>
                      <i className='ti ti-notes-off fs-1 text-muted mb-2 d-block'></i>
                      <p className='text-muted small mb-0'>
                        No notes available
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    },
  ];

  if (loading) return <LoadingSpinner />;
  if (error)
    return (
      <div className='page-wrapper'>
        <div className='content'>
          <Alert message='Error' description={error} type='error' showIcon />
        </div>
      </div>
    );
  if (!team) return <Alert message='Team not found' type='error' showIcon />;

  return (
    <div className='page-wrapper'>
      <div className='content'>
        <TeamListHeader teamData={[team]} onRefresh={handleRefresh} />

        <div className='card'>
          <div className='card-header d-flex align-items-center justify-content-between flex-wrap pb-0'>
            <div className='d-flex align-items-center'>
              <h4 className='mb-1'>
                <TeamOutlined className='me-2' />
                {team.grade} Grade • {team.gender}
              </h4>
            </div>

            <div className='d-flex align-items-center flex-wrap'>
              {/* ── Send Acceptance Email ── */}
              <Button
                className='btn btn-success d-flex align-items-center mb-3 me-2'
                icon={<MailOutlined />}
                onClick={() => setShowAcceptanceModal(true)}
              >
                Send Acceptance Email
              </Button>

              {/* ── Export / Refresh menu ── */}
              <TooltipOption
                onExportPDF={handleExportPDF}
                onExportExcel={handleExportExcel}
                onExportEmails={exportParentEmails}
                onRefresh={handleRefresh}
                showEmailExport={true}
                showRefresh={true}
              />

              {/* ── Edit Team ── */}
              <Link to={`${all_routes.editTeam}/${team._id}`}>
                <Button
                  className='btn btn-primary d-flex align-items-center mb-3'
                  icon={<EditOutlined />}
                >
                  Edit Team
                </Button>
              </Link>
            </div>
          </div>

          <div className='card-body p-0 py-3'>
            <Tabs
              defaultActiveKey='players'
              items={tabItems}
              className='team-detail-tabs'
              tabBarStyle={{ marginTop: '-16px' }}
            />
          </div>
        </div>
      </div>

      {/* Acceptance Email Modal */}
      {showAcceptanceModal && (
        <AcceptanceEmailModal
          team={team}
          players={team?.playerIds || []}
          onSend={handleSendAcceptanceEmail}
          onClose={() => setShowAcceptanceModal(false)}
        />
      )}
    </div>
  );
};

export default TeamDetail;
