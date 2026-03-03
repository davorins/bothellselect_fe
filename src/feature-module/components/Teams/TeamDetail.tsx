// components/Teams/TeamDetail.tsx
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Button,
  Space,
  Tabs,
  Table,
  Alert,
  Descriptions,
  notification,
} from 'antd';
import {
  TeamOutlined,
  UserOutlined,
  EditOutlined,
  ArrowLeftOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  EyeOutlined,
  MailOutlined,
} from '@ant-design/icons';
import Swal from 'sweetalert2';
import { useAuth } from '../../../context/AuthContext';
import { all_routes } from '../../router/all_routes';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import axios from 'axios';
import './TeamDetail.scss';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const TeamDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getAuthToken } = useAuth();

  const [team, setTeam] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTeamDetail();
  }, [id]);

  const fetchTeamDetail = async () => {
    try {
      setLoading(true);
      const token = await getAuthToken();

      const response = await fetch(`${API_BASE_URL}/internal-teams/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch team details');
      }

      const teamData = await response.json();
      setTeam(teamData);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load team details',
      );

      // Show SweetAlert2 error
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

  const handlePlayerClick = async (playerRecord: any) => {
    try {
      const token = await getAuthToken();
      const playerId = playerRecord._id || playerRecord.id;

      console.log('TeamDetail - Starting player navigation for:', playerId);

      // Show loading alert
      Swal.fire({
        title: 'Loading Player...',
        html: 'Please wait while we fetch player details',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      // Use the CORRECT API endpoints - these are likely different from what you have
      const [playerResponse, guardiansResponse] = await Promise.all([
        // Try different player endpoints
        axios
          .get(`${API_BASE_URL}/player/${playerId}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          .catch(async (error) => {
            // If first endpoint fails, try alternative
            console.log('First player endpoint failed, trying alternative...');
            return await axios.get(`${API_BASE_URL}/players/get/${playerId}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
          }),
        // Try different guardian endpoints
        axios
          .get(`${API_BASE_URL}/player/${playerId}/guardians`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          .catch(async (error) => {
            console.log(
              'First guardian endpoint failed, trying alternative...',
            );
            return await axios.get(
              `${API_BASE_URL}/guardians/player/${playerId}`,
              {
                headers: { Authorization: `Bearer ${token}` },
              },
            );
          }),
      ]);

      // Close loading alert
      Swal.close();

      const fullPlayerData = playerResponse.data;
      const guardiansData = guardiansResponse.data;

      console.log('TeamDetail - Full player data from API:', fullPlayerData);
      console.log('TeamDetail - Raw guardians data from API:', guardiansData);

      // TRANSFORM GUARDIAN DATA
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

      console.log('TeamDetail - Transformed guardians:', transformedGuardians);

      // Create the data structure
      const completePlayerData = {
        ...fullPlayerData,
        _id: playerId,
        playerId: playerId,
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

      console.log(
        'TeamDetail - Complete player data being passed:',
        completePlayerData,
      );

      // Navigate to player details
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
          timestamp: Date.now(),
        },
      });
    } catch (error) {
      console.error('TeamDetail - Failed to fetch player details:', error);

      // Close any open alerts
      Swal.close();

      // Show error alert
      Swal.fire({
        icon: 'error',
        title: 'Navigation Error',
        text: 'Failed to load player details. Navigating with basic information.',
        confirmButtonColor: '#3085d6',
      });

      // SIMPLIFIED FALLBACK - Just navigate and let PlayerDetails handle data fetching
      console.log('TeamDetail - Using simplified fallback navigation');

      navigate(
        `${all_routes.playerDetail}/${playerRecord._id || playerRecord.id}`,
        {
          state: {
            player: {
              ...playerRecord,
              _id: playerRecord._id || playerRecord.id,
              playerId: playerRecord._id || playerRecord.id,
              id: playerRecord._id || playerRecord.id,
            },
            key: Date.now(),
          },
        },
      );
    }
  };

  // Add this function for coach click handling
  const handleCoachClick = async (coachRecord: any) => {
    const coachId = coachRecord._id || coachRecord.id;

    console.log('TeamDetail - Navigating to coach profile:', coachId);

    // Show loading alert
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

  // NEW FUNCTION: Export Parents' Emails
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

      // Show loading alert
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

      // Fetch parents for each player
      for (const player of team.playerIds) {
        const playerId = player._id || player.id;

        try {
          // Try to get guardians for this player
          const guardiansResponse = await axios
            .get(`${API_BASE_URL}/player/${playerId}/guardians`, {
              headers: { Authorization: `Bearer ${token}` },
            })
            .catch(async () => {
              // Try alternative endpoint
              return await axios.get(
                `${API_BASE_URL}/guardians/player/${playerId}`,
                { headers: { Authorization: `Bearer ${token}` } },
              );
            });

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
          } else {
            // If no guardians found, add placeholder
            parentEmails.push({
              playerName: player.fullName || player.name || 'Unknown',
              parentName: 'No guardian data',
              email: 'No email available',
              relationship: 'N/A',
            });
          }
        } catch (error) {
          console.error(
            `Error fetching guardians for player ${playerId}:`,
            error,
          );
          parentEmails.push({
            playerName: player.fullName || player.name || 'Unknown',
            parentName: 'Error fetching data',
            email: 'Error',
            relationship: 'N/A',
          });
        }
      }

      // Close loading alert
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

      // Create CSV content with emails
      const headers = ['Player Name', 'Parent Name', 'Email', 'Relationship'];
      const csvContent = [
        headers.join(','),
        ...parentEmails.map((row) =>
          Object.values(row)
            .map((value) => {
              // Escape commas and quotes in CSV
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

      // Create a plain text version with just emails (for easy copy-paste)
      const plainEmails = parentEmails
        .filter(
          (item) =>
            item.email &&
            item.email !== 'No email available' &&
            item.email !== 'Error',
        )
        .map((item) => item.email)
        .join('\n');

      // Show dialog with options
      const result = await Swal.fire({
        title: 'Export Parent Emails',
        html: `
          <div style="text-align: left;">
            <p>Found <strong>${parentEmails.filter((e) => e.email && e.email !== 'No email available' && e.email !== 'Error').length}</strong> valid email addresses.</p>
            <p>Choose export format:</p>
          </div>
        `,
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
        // Copy plain emails to clipboard
        await navigator.clipboard.writeText(plainEmails);

        Swal.fire({
          icon: 'success',
          title: 'Copied!',
          text: `${parentEmails.filter((e) => e.email && e.email !== 'No email available' && e.email !== 'Error').length} email addresses copied to clipboard.`,
          timer: 2000,
          showConfirmButton: false,
        });

        notification.success({
          message: 'Emails Copied',
          description: 'Parent email addresses copied to clipboard.',
        });
      } else if (result.isDenied) {
        // Download CSV
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

      notification.error({
        message: 'Export Failed',
        description: 'Failed to export parent email addresses.',
      });
    }
  };

  const exportPlayersToExcel = async (players: any[]) => {
    try {
      // Show loading alert
      Swal.fire({
        title: 'Preparing Export...',
        html: 'Please wait while we gather parent email addresses',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      const token = await getAuthToken();

      // Prepare data for Excel export
      const excelData = [];

      for (let index = 0; index < players.length; index++) {
        const player = players[index];
        const playerId = player._id || player.id;

        // Fetch parent emails for this player
        let parentEmails = 'N/A';

        try {
          // Try to get guardians for this player
          const guardiansResponse = await axios
            .get(`${API_BASE_URL}/player/${playerId}/guardians`, {
              headers: { Authorization: `Bearer ${token}` },
            })
            .catch(async () => {
              // Try alternative endpoint
              return await axios.get(
                `${API_BASE_URL}/guardians/player/${playerId}`,
                { headers: { Authorization: `Bearer ${token}` } },
              );
            });

          const guardians = guardiansResponse.data;

          if (Array.isArray(guardians) && guardians.length > 0) {
            // Collect all emails
            const emails = guardians
              .filter((g: any) => g.email)
              .map((g: any) => g.email);

            parentEmails = emails.length > 0 ? emails.join('; ') : 'N/A';
          }
        } catch (error) {
          console.error(
            `Error fetching guardians for player ${playerId}:`,
            error,
          );
          parentEmails = 'Error fetching';
        }

        // Add player data with parent emails
        excelData.push({
          'No.': index + 1,
          'Player Name': player.fullName || 'N/A',
          'Parent Email(s)': parentEmails, // Now this will have actual emails
          Gender: player.gender || 'N/A',
          Grade: player.grade || 'N/A',
          School: player.schoolName || 'N/A',
          'Date of Birth': player.dob
            ? new Date(player.dob).toLocaleDateString()
            : 'N/A',
        });
      }

      // Close loading alert
      Swal.close();

      // Create CSV content
      const headers = Object.keys(excelData[0]).join(',');
      const csvContent = [
        headers,
        ...excelData.map((row) =>
          Object.values(row)
            .map((value) => {
              if (typeof value === 'string') {
                // Escape quotes and handle commas
                const escapedValue = value.replace(/"/g, '""');
                if (
                  escapedValue.includes(',') ||
                  escapedValue.includes('"') ||
                  escapedValue.includes('\n')
                ) {
                  return `"${escapedValue}"`;
                }
                return escapedValue;
              }
              return value;
            })
            .join(','),
        ),
      ].join('\n');

      // Create and download file
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

      // Show success with SweetAlert2
      Swal.fire({
        icon: 'success',
        title: 'Export Successful',
        text: `Player data with parent emails exported to CSV successfully.`,
        timer: 2000,
        showConfirmButton: false,
      });

      notification.success({
        message: 'Export Successful',
        description: `Player data with parent emails exported to CSV successfully.`,
      });
    } catch (error) {
      console.error('Error exporting to Excel:', error);

      // Close any open alerts
      Swal.close();

      // Show error with SweetAlert2
      Swal.fire({
        icon: 'error',
        title: 'Export Failed',
        text: 'Failed to export player data to Excel.',
        confirmButtonColor: '#3085d6',
      });

      notification.error({
        message: 'Export Failed',
        description: 'Failed to export player data to Excel.',
      });
    }
  };

  const exportPlayersToPDF = (players: any[]) => {
    try {
      // Create a printable HTML content
      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${team?.name} - Player Roster</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px; 
              color: #333;
            }
            .header { 
              text-align: center; 
              margin-bottom: 30px; 
              border-bottom: 2px solid #333; 
              padding-bottom: 20px;
            }
            h1 { 
              color: #333; 
              margin: 0;
              font-size: 24px;
            }
            .team-info { 
              margin: 15px 0; 
              text-align: center;
            }
            .team-info p { 
              margin: 5px 0; 
              font-size: 14px;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-top: 20px;
              font-size: 12px;
            }
            th, td { 
              border: 1px solid #ddd; 
              padding: 10px; 
              text-align: left; 
            }
            th { 
              background-color: #f5f5f5; 
              font-weight: bold;
              color: #333;
            }
            tr:nth-child(even) { 
              background-color: #f9f9f9; 
            }
            .footer {
              margin-top: 30px;
              text-align: center;
              font-size: 12px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${team?.name} - Player Roster</h1>
            <div class="team-info">
              <p><strong>Team:</strong> ${
                team?.name
              } | <strong>Year:</strong> ${
                team?.year
              } | <strong>Grade:</strong> ${team?.grade} | <strong>Gender:</strong> ${
                team?.gender
              }</p>
              <p><strong>Total Players:</strong> ${
                players.length
              } | <strong>Export Date:</strong> ${new Date().toLocaleDateString()}</p>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>No.</th>
                <th>Player Name</th>
                <th>Gender</th>
                <th>Grade</th>
                <th>School</th>
                <th>Date of Birth</th>
              </tr>
            </thead>
            <tbody>
              ${players
                .map(
                  (player, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${player.fullName || 'N/A'}</td>
                  <td>${player.gender || 'N/A'}</td>
                  <td>${player.grade || 'N/A'}</td>
                  <td>${player.schoolName || 'N/A'}</td>
                  <td>${
                    player.dob
                      ? new Date(player.dob).toLocaleDateString()
                      : 'N/A'
                  }</td>
                </tr>
              `,
                )
                .join('')}
            </tbody>
          </table>
          
          <div class="footer">
            <p>Generated on ${new Date().toLocaleString()}</p>
          </div>
        </body>
        </html>
      `;

      // Show loading alert
      Swal.fire({
        title: 'Generating PDF...',
        html: 'Please wait while we prepare the PDF',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      // Open print dialog for PDF
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(printContent);
        printWindow.document.close();

        // Wait for content to load then trigger print
        printWindow.onload = () => {
          printWindow.focus();
          printWindow.print();

          // Close loading alert
          Swal.close();

          // Show success message
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
        description:
          "Player roster opened for printing. Use your browser's print dialog to save as PDF.",
      });
    } catch (error) {
      console.error('Error exporting to PDF:', error);

      // Close any open alerts
      Swal.close();

      // Show error with SweetAlert2
      Swal.fire({
        icon: 'error',
        title: 'Export Failed',
        text: 'Failed to generate PDF. Please try again.',
        confirmButtonColor: '#3085d6',
      });

      notification.error({
        message: 'Export Failed',
        description: 'Failed to generate PDF. Please try again.',
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

      notification.warning({
        message: 'No Players',
        description: 'There are no players in this team to export.',
      });
    }
  };

  const handleExportPDF = () => {
    if (team?.playerIds && team.playerIds.length > 0) {
      exportPlayersToPDF(team.playerIds);
    } else {
      // Show warning with SweetAlert2
      Swal.fire({
        icon: 'warning',
        title: 'No Players',
        text: 'There are no players in this team to export.',
        confirmButtonColor: '#3085d6',
      });

      notification.warning({
        message: 'No Players',
        description: 'There are no players in this team to export.',
      });
    }
  };

  // Player table columns
  const playerColumns = [
    {
      title: 'Player Name',
      dataIndex: 'fullName',
      key: 'fullName',
      width: 200,
      render: (text: string, record: any) => {
        const avatarUrl =
          record.avatar ||
          (record.gender === 'Female'
            ? 'https://partizan-be.onrender.com/uploads/avatars/girl.png'
            : 'https://partizan-be.onrender.com/uploads/avatars/boy.png');

        return (
          <div className='d-flex align-items-center'>
            <div className='avatar avatar-md cursor-pointer flex-shrink-0'>
              <img
                src={avatarUrl}
                className='img-fluid rounded-circle'
                alt={`${text} avatar`}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src =
                    record.gender === 'Female'
                      ? 'https://partizan-be.onrender.com/uploads/avatars/girl.png'
                      : 'https://partizan-be.onrender.com/uploads/avatars/boy.png';
                }}
              />
            </div>
            <div className='ms-2 flex-grow-1 min-width-0'>
              <p
                className='cursor-pointer text-primary mb-0 text-truncate'
                style={{ maxWidth: '150px' }}
                title={text}
              >
                <span
                  onClick={() => handlePlayerClick(record)}
                  className='cursor-pointer'
                >
                  {text}
                </span>
              </p>
            </div>
          </div>
        );
      },
    },
    {
      title: 'Gender',
      dataIndex: 'gender',
      key: 'gender',
      width: 100,
      render: (text: string) => <span>{text}</span>,
    },
    {
      title: 'Grade',
      dataIndex: 'grade',
      key: 'grade',
      width: 100,
    },
    {
      title: 'School',
      dataIndex: 'schoolName',
      key: 'schoolName',
      width: 150,
      render: (text: string) => (
        <span
          className='text-truncate d-inline-block'
          style={{ maxWidth: '140px' }}
          title={text}
        >
          {text || 'N/A'}
        </span>
      ),
    },
    {
      title: 'Date of Birth',
      dataIndex: 'dob',
      key: 'dob',
      width: 120,
      render: (dob: string) =>
        dob ? new Date(dob).toLocaleDateString() : 'N/A',
    },
    {
      title: 'Action',
      key: 'action',
      width: 80,
      render: (_: unknown, record: any) => {
        const playerId = record._id || record.id;

        const handleEditClick = (e: React.MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();

          console.log('Edit clicked for player:', playerId, record);

          // Navigate programmatically to ensure state is passed
          navigate(`${all_routes.editPlayer}/${playerId}`, {
            state: {
              player: {
                ...record,
                _id: playerId,
                playerId: playerId,
                id: playerId,
                fullName: record.fullName || record.name,
                name: record.fullName || record.name,
                gender: record.gender,
                dob: record.dob,
                schoolName: record.schoolName,
                grade: record.grade,
                aauNumber: record.aauNumber,
                avatar: record.avatar,
              },
              from: window.location.pathname,
              key: Date.now(),
            },
          });
        };

        return (
          <div className='d-flex align-items-center'>
            <div className='dropdown'>
              <Link
                to='#'
                className='btn btn-white btn-icon btn-sm d-flex align-items-center justify-content-center rounded-circle p-0'
                data-bs-toggle='dropdown'
                aria-expanded='false'
                onClick={(e) => e.preventDefault()}
              >
                <i className='ti ti-dots-vertical fs-14' />
              </Link>
              <ul className='dropdown-menu dropdown-menu-right p-3'>
                <li>
                  <div
                    className='dropdown-item rounded-1 cursor-pointer'
                    onClick={() => handlePlayerClick(record)}
                  >
                    <i className='ti ti-menu me-2' />
                    View
                  </div>
                </li>
                <li>
                  <div
                    className='dropdown-item rounded-1 cursor-pointer'
                    onClick={handleEditClick}
                  >
                    <i className='ti ti-edit me-2' />
                    Edit
                  </div>
                </li>
              </ul>
            </div>
          </div>
        );
      },
    },
  ];

  // Coach table columns - UPDATED WITH CLICK FUNCTIONALITY
  const coachColumns = [
    {
      title: 'Coach Name',
      dataIndex: 'fullName',
      key: 'fullName',
      width: 200,
      render: (text: string, record: any) => (
        <div className='d-flex align-items-center'>
          <div
            className='avatar avatar-md cursor-pointer flex-shrink-0'
            onClick={() => handleCoachClick(record)}
          >
            <img
              src={'https://partizan-be.onrender.com/uploads/avatars/coach.png'}
              className='img-fluid rounded-circle'
              alt={`${text} avatar`}
            />
          </div>
          <div className='ms-2 flex-grow-1 min-width-0'>
            <p
              className='cursor-pointer text-primary mb-0 text-truncate'
              style={{ maxWidth: '150px' }}
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
      width: 80,
      render: (_: unknown, record: any) => (
        <div className='d-flex align-items-center'>
          <div className='dropdown'>
            <Link
              to='#'
              className='btn btn-white btn-icon btn-sm d-flex align-items-center justify-content-center rounded-circle p-0'
              data-bs-toggle='dropdown'
              aria-expanded='false'
            >
              <i className='ti ti-dots-vertical fs-14' />
            </Link>
            <ul className='dropdown-menu dropdown-menu-right p-3'>
              <li>
                <div
                  className='dropdown-item rounded-1 cursor-pointer'
                  onClick={() => handleCoachClick(record)}
                >
                  <EyeOutlined className='me-2' />
                  View Coach
                </div>
              </li>
            </ul>
          </div>
        </div>
      ),
    },
  ];

  // Define tab items
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
        team?.playerIds && team.playerIds.length > 0 ? (
          <div className='p-3'>
            <div className='table-responsive'>
              <Table
                columns={playerColumns}
                dataSource={team.playerIds}
                rowKey='_id'
                pagination={{
                  pageSize: 10,
                  showSizeChanger: true,
                  showTotal: (total, range) =>
                    `Showing ${range[0]}-${range[1]} of ${total} players`,
                }}
                scroll={{ x: true }}
              />
            </div>
          </div>
        ) : (
          <div className='p-5 text-center'>
            <UserOutlined style={{ fontSize: '48px', color: '#6c757d' }} />
            <h4 className='mt-3 text-muted'>No Players</h4>
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
          <div className='p-3'>
            <div className='table-responsive'>
              <Table
                columns={coachColumns}
                dataSource={team.coachIds}
                rowKey='_id'
                pagination={{
                  pageSize: 10,
                  showSizeChanger: true,
                  showTotal: (total, range) =>
                    `Showing ${range[0]}-${range[1]} of ${total} coaches`,
                }}
                scroll={{ x: true }}
              />
            </div>
          </div>
        ) : (
          <div className='p-5 text-center'>
            <TeamOutlined style={{ fontSize: '48px', color: '#6c757d' }} />
            <h4 className='mt-3 text-muted'>No Coaches</h4>
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
          <i className='ti ti-info-circle me-2'></i>
          Team Info
        </span>
      ),
      children: (
        <div className='p-3 team-info-cards'>
          <div className='row mx-2'>
            {/* First Column - Basic Information */}
            <div className='col-md-4 ps-1 pe-2'>
              <div className='card border-1 shadow-sm h-100'>
                <div className='card-header bg-transparent border-0'>
                  <h6 className='card-title mb-0'>
                    <i className='ti ti-info-circle me-2'></i>
                    Basic Information
                  </h6>
                </div>
                <div className='card-body'>
                  <Descriptions
                    column={1}
                    size='small'
                    className='team-info-descriptions'
                  >
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
                      <span
                        className={`badge badge-soft-${
                          team?.status === 'active'
                            ? 'success'
                            : team?.status === 'pending'
                              ? 'warning'
                              : 'danger'
                        } d-inline-flex align-items-center`}
                      >
                        <i
                          className={`ti ti-circle-filled fs-5 me-1 ${
                            team?.status === 'active'
                              ? 'text-success'
                              : team?.status === 'pending'
                                ? 'text-warning'
                                : 'text-danger'
                          }`}
                        ></i>
                        {team?.status?.charAt(0).toUpperCase() +
                          team?.status?.slice(1)}
                      </span>
                    </Descriptions.Item>
                  </Descriptions>
                </div>
              </div>
            </div>

            {/* Second Column - Statistics */}
            <div className='col-md-4 px-2'>
              <div className='card border-1 shadow-sm h-100'>
                <div className='card-header bg-transparent border-0'>
                  <h6 className='card-title mb-0'>
                    <i className='ti ti-chart-bar me-2'></i>
                    Statistics
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

            {/* Third Column - Notes */}
            <div className='col-md-4 ps-2 pe-1'>
              <div className='card border-1 shadow-sm h-100'>
                <div className='card-header bg-transparent border-0'>
                  <h6 className='card-title mb-0'>
                    <i className='ti ti-notes me-2'></i>
                    Notes
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
        <div className='card'>
          <div className='card-header d-flex align-items-center justify-content-between flex-wrap pb-0'>
            {/* Left side - Back button and team info */}
            <div className='d-flex align-items-center'>
              <Link to={all_routes.teams}>
                <Button
                  className='btn btn-primary d-flex align-items-center me-3'
                  icon={<ArrowLeftOutlined />}
                >
                  Back to Teams
                </Button>
              </Link>
              <div>
                <h4 className='mb-1'>
                  <TeamOutlined className='me-2' />
                  {team.name} {team.year}
                </h4>
                <p className='text-muted mb-0'>
                  {team.grade} Grade • {team.gender} •{' '}
                  <span
                    className={`text-${
                      team.status === 'active'
                        ? 'success'
                        : team.status === 'pending'
                          ? 'warning'
                          : 'danger'
                    }`}
                  >
                    {team.status?.charAt(0).toUpperCase() +
                      team.status?.slice(1)}
                  </span>
                </p>
              </div>
            </div>

            {/* Right side - Action buttons (styled like TeamList) */}
            <div className='d-flex align-items-center flex-wrap'>
              <Button
                className='btn btn-outline-info d-flex align-items-center mb-3 me-2 btn-export-emails'
                icon={<MailOutlined />}
                onClick={exportParentEmails}
              >
                Export Emails
              </Button>
              <Button
                className='btn btn-outline-primary d-flex align-items-center mb-3 me-2'
                icon={<FileExcelOutlined />}
                onClick={handleExportExcel}
              >
                Export Excel
              </Button>
              <Button
                className='btn btn-outline-primary d-flex align-items-center mb-3 me-2'
                icon={<FilePdfOutlined />}
                onClick={handleExportPDF}
              >
                Export PDF
              </Button>
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
              className='team-detail-tabs px-3'
              tabBarStyle={{
                marginBottom: '16px',
                borderBottom: '1px solid #e8e8e8',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamDetail;
