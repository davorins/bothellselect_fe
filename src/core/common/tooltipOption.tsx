import React, { useState } from 'react';
import { OverlayTrigger, Tooltip, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import HelpModal from './HelpModal';

interface TooltipOptionProps {
  onExportPDF: () => void;
  onExportExcel: () => void;
  onExportEmails?: () => void;
  onCopyEmails?: () => void;
  showEmailExport?: boolean;
  showCopyEmails?: boolean;
  showCalendarHelp?: boolean;
}

const TooltipOption = ({
  onExportPDF,
  onExportExcel,
  onExportEmails,
  onCopyEmails,
  showEmailExport = false,
  showCopyEmails = false,
  showCalendarHelp = false,
}: TooltipOptionProps) => {
  const [showHelpModal, setShowHelpModal] = useState(false);
  return (
    <>
      {showCalendarHelp && (
        <div className='pe-1 mb-2'>
          <OverlayTrigger
            placement='top'
            overlay={<Tooltip id='tooltip-help'>Calendar Tips</Tooltip>}
          >
            <Button
              variant='outline-light'
              className='bg-white btn-icon me-1'
              onClick={() => setShowHelpModal(true)}
            >
              <i className='ti ti-info-circle' />
            </Button>
          </OverlayTrigger>
          <HelpModal
            show={showHelpModal}
            onHide={() => setShowHelpModal(false)}
          />
        </div>
      )}
      <div className='pe-1 mb-2'>
        <OverlayTrigger
          placement='top'
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
      <div className='pe-1 mb-2'>
        <OverlayTrigger
          placement='top'
          overlay={<Tooltip id='tooltip-top'>Print</Tooltip>}
        >
          <button
            type='button'
            className='btn btn-outline-light bg-white btn-icon me-1'
          >
            <i className='ti ti-printer' />
          </button>
        </OverlayTrigger>
      </div>
      <div className='dropdown me-2 mb-2'>
        <Link
          to='#'
          className='dropdown-toggle btn btn-light fw-medium d-inline-flex align-items-center'
          data-bs-toggle='dropdown'
        >
          <i className='ti ti-file-export me-2' />
          Export
        </Link>
        <ul className='dropdown-menu  dropdown-menu-end p-3'>
          <li>
            <button
              onClick={onExportPDF}
              className='dropdown-item rounded-1 w-100 text-start'
            >
              <i className='ti ti-file-type-pdf me-1' />
              Export as PDF
            </button>
          </li>
          <li>
            <button
              onClick={onExportExcel}
              className='dropdown-item rounded-1 w-100 text-start'
            >
              <i className='ti ti-file-type-xls me-1' />
              Export as Excel
            </button>
          </li>
          {showEmailExport && onExportEmails && (
            <li>
              <button
                onClick={onExportEmails}
                className='dropdown-item rounded-1 w-100 text-start'
              >
                <i className='ti ti-mail me-1' />
                Export Email List
              </button>
            </li>
          )}
          {showCopyEmails && onCopyEmails && (
            <li>
              <button
                onClick={onCopyEmails}
                className='dropdown-item rounded-1 w-100 text-start'
              >
                <i className='ti ti-copy me-1' />
                Copy Emails to Clipboard
              </button>
            </li>
          )}
        </ul>
      </div>
    </>
  );
};

export default TooltipOption;
