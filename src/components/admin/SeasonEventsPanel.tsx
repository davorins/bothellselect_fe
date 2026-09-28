// components/admin/SeasonEventsPanel.tsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { message, Modal, Switch, Table, Tag, Button, Tooltip } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

interface SeasonEvent {
  _id: string;
  eventId: string;
  season: string;
  year: number;
  startDate?: string;
  endDate?: string;
  registrationOpen: boolean;
  isActive: boolean;
  isActiveOverride?: 'auto' | 'always-on' | 'always-off';
  lastModifiedAt?: string;
}

interface SeasonStats {
  eventId: string;
  paidCount: number;
  totalCount: number;
}

export const SeasonEventsPanel: React.FC = () => {
  const [events, setEvents] = useState<SeasonEvent[]>([]);
  const [stats, setStats] = useState<Record<string, SeasonStats>>({});
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [eventsRes, statsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/admin/season-events`, { headers }),
        axios.get(`${API_BASE_URL}/admin/season-events/stats`, { headers }),
      ]);

      setEvents(eventsRes.data.events || []);

      const statsMap: Record<string, SeasonStats> = {};
      (statsRes.data.stats || []).forEach((s: SeasonStats) => {
        statsMap[s.eventId] = s;
      });
      setStats(statsMap);
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Failed to load seasons');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const updateFlag = async (
    eventId: string,
    field: 'registrationOpen' | 'isActive',
    value: boolean,
  ) => {
    // Extra confirmation for the dangerous action: deactivating a season
    if (field === 'isActive' && value === false) {
      const paid = stats[eventId]?.paidCount ?? 0;
      const activeSeasons = events.filter((e) => e.isActive).length;
      const willBeLast = activeSeasons === 1;

      const confirmed = await new Promise<boolean>((resolve) => {
        Modal.confirm({
          title: `Deactivate "${events.find((e) => e.eventId === eventId)?.season}"?`,
          icon: <ExclamationCircleOutlined />,
          content: (
            <div>
              <p>
                This season will stop counting toward player "Active" status.
              </p>
              {paid > 0 && (
                <p>
                  <strong>{paid} paid players</strong> currently rely on this
                  season for their Active status. They will become Inactive.
                </p>
              )}
              {willBeLast && (
                <p style={{ color: '#d4380d', fontWeight: 'bold' }}>
                  ⚠️ This is your LAST active season. Deactivating it will mark
                  every player as Inactive.
                </p>
              )}
            </div>
          ),
          okText: 'Yes, deactivate',
          okButtonProps: { danger: true },
          cancelText: 'Cancel',
          onOk: () => resolve(true),
          onCancel: () => resolve(false),
        });
      });

      if (!confirmed) return;
    }

    setUpdating(eventId);
    try {
      await axios.patch(
        `${API_BASE_URL}/admin/season-events/${eventId}`,
        { [field]: value },
        { headers },
      );
      message.success('Updated');
      await fetchAll();
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Update failed');
    } finally {
      setUpdating(null);
    }
  };

  const getRowStatus = (event: SeasonEvent) => {
    const now = new Date();
    const end = event.endDate ? new Date(event.endDate) : null;
    const start = event.startDate ? new Date(event.startDate) : null;

    if (end && end < now) {
      return { label: 'Expired', color: 'default' };
    }
    if (event.isActive && event.registrationOpen) {
      return { label: 'Open + Active', color: 'success' };
    }
    if (event.isActive && !event.registrationOpen) {
      return { label: 'Active (Closed)', color: 'warning' };
    }
    if (!event.isActive && event.registrationOpen) {
      return { label: 'Open (Inactive)', color: 'processing' };
    }
    if (start && start > now) {
      return { label: 'Upcoming', color: 'default' };
    }
    return { label: 'Inactive', color: 'default' };
  };

  const columns = [
    {
      title: 'Season',
      key: 'season',
      render: (_: any, row: SeasonEvent) => (
        <div>
          <div style={{ fontWeight: 600 }}>{row.season}</div>
          <div style={{ fontSize: 12, color: '#888' }}>
            {row.eventId} • {row.year}
          </div>
        </div>
      ),
    },
    {
      title: 'Dates',
      key: 'dates',
      render: (_: any, row: SeasonEvent) => (
        <div style={{ fontSize: 12 }}>
          {row.startDate ? (
            <div>Start: {new Date(row.startDate).toLocaleDateString()}</div>
          ) : (
            <div style={{ color: '#aaa' }}>—</div>
          )}
          {row.endDate ? (
            <div>End: {new Date(row.endDate).toLocaleDateString()}</div>
          ) : (
            <div style={{ color: '#aaa' }}>—</div>
          )}
        </div>
      ),
    },
    {
      title: 'Players',
      key: 'players',
      render: (_: any, row: SeasonEvent) => {
        const s = stats[row.eventId];
        if (!s) return '—';
        return (
          <div style={{ fontSize: 12 }}>
            <div>
              <strong>{s.paidCount}</strong> paid
            </div>
            <div style={{ color: '#888' }}>{s.totalCount} total</div>
          </div>
        );
      },
    },
    {
      title: 'Status',
      key: 'status',
      render: (_: any, row: SeasonEvent) => {
        const { label, color } = getRowStatus(row);
        return <Tag color={color}>{label}</Tag>;
      },
    },
    {
      title: (
        <Tooltip title='Can new people still register for this season?'>
          <span>Registration Open</span>
        </Tooltip>
      ),
      key: 'registrationOpen',
      render: (_: any, row: SeasonEvent) => (
        <Switch
          checked={row.registrationOpen}
          loading={updating === row.eventId}
          onChange={(val) => updateFlag(row.eventId, 'registrationOpen', val)}
        />
      ),
    },
    {
      title: (
        <Tooltip title='Does this season count toward player/parent Active status?'>
          <span>Active for Status</span>
        </Tooltip>
      ),
      key: 'isActive',
      render: (_: any, row: SeasonEvent) => (
        <Switch
          checked={row.isActive}
          loading={updating === row.eventId}
          onChange={(val) => updateFlag(row.eventId, 'isActive', val)}
        />
      ),
    },
  ];

  return (
    <div className='row'>
      <div className='col-12'>
        <div className='card'>
          <div className='card-header d-flex justify-content-between align-items-center'>
            <h4 className='card-title mb-0'>Season Events</h4>
            <Button size='small' onClick={fetchAll} loading={loading}>
              Refresh
            </Button>
          </div>
          <div className='card-body'>
            <Table
              rowKey='eventId'
              dataSource={events}
              columns={columns as any}
              loading={loading}
              pagination={false}
              size='small'
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeasonEventsPanel;
