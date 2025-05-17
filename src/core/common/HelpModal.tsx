// Create a new file: HelpModal.tsx
import React from 'react';
import { Modal } from 'react-bootstrap';

interface HelpModalProps {
  show: boolean;
  onHide: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ show, onHide }) => {
  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <i className='ti ti-info-circle me-2' />
          Calendar Tips
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className='d-flex align-items-start mb-3'>
          <i className='ti ti-drag-drop text-primary me-3 fs-5' />
          <div>
            <h6>Drag-and-Drop</h6>
            <ul className='mb-0 ps-3'>
              <li>Drag events to reschedule them</li>
              <li>
                <strong>Hold Ctrl/Cmd while dragging</strong> to create a copy
              </li>
            </ul>
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer className='justify-content-start'>
        <button className='btn btn-primary' onClick={onHide}>
          Got it!
        </button>
      </Modal.Footer>
    </Modal>
  );
};

export default HelpModal;
