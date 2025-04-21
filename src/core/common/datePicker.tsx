import React, { useState } from 'react';
import { DateRangePicker } from 'react-bootstrap-daterangepicker';
import moment, { Moment } from 'moment';
import 'bootstrap-daterangepicker/daterangepicker.css';

interface PredefinedDateRangesProps {
  onDateChange?: (dates: [Moment, Moment] | null) => void;
}

const PredefinedDateRanges: React.FC<PredefinedDateRangesProps> = ({
  onDateChange,
}) => {
  const [state, setState] = useState<{ start: Moment; end: Moment }>({
    start: moment().subtract(29, 'days'),
    end: moment(),
  });

  const handleCallback: (start: string | Date, end: string | Date) => void = (
    start,
    end
  ) => {
    const startMoment = moment(start);
    const endMoment = moment(end);

    if (!startMoment.isValid() || !endMoment.isValid()) {
      onDateChange?.(null);
      return;
    }

    setState({ start: startMoment, end: endMoment });
    onDateChange?.([startMoment, endMoment]);
  };

  const handleCancel = () => {
    onDateChange?.(null);
  };

  const label = `${state.start.format('D MMM, YYYY')} - ${state.end.format(
    'D MMM, YYYY'
  )}`;

  return (
    <DateRangePicker
      initialSettings={{
        startDate: state.start.toDate(),
        endDate: state.end.toDate(),
        ranges: {
          Today: [moment().toDate(), moment().toDate()],
          Yesterday: [
            moment().subtract(1, 'days').toDate(),
            moment().subtract(1, 'days').toDate(),
          ],
          'Last 7 Days': [
            moment().subtract(6, 'days').toDate(),
            moment().toDate(),
          ],
          'Last 30 Days': [
            moment().subtract(29, 'days').toDate(),
            moment().toDate(),
          ],
          'This Month': [
            moment().startOf('month').toDate(),
            moment().endOf('month').toDate(),
          ],
          'Last Month': [
            moment().subtract(1, 'month').startOf('month').toDate(),
            moment().subtract(1, 'month').endOf('month').toDate(),
          ],
        },
        autoUpdateInput: true,
        alwaysShowCalendars: true,
      }}
      onCallback={(start, end) =>
        handleCallback(start as string | Date, end as string | Date)
      }
      onCancel={handleCancel}
    >
      <div
        style={{
          background: '#fff',
          cursor: 'pointer',
          padding: '8px 12px',
          border: '1px solid #d9d9d9',
          width: '100%',
          borderRadius: '6px',
          fontSize: '14px',
          color: '#202C4B',
          height: '32px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <i className='ti ti-calendar' style={{ marginRight: '8px' }}></i>
        <span>{label}</span>
      </div>
    </DateRangePicker>
  );
};

export default PredefinedDateRanges;
