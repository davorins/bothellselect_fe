import React from 'react';

const AiEmailAssistant = () => {
  return (
    <div className='page-wrapper'>
      <div className='content'>
        <div className='page-header'>
          <div className='page-title'>
            <h4>AI Email Assistant</h4>
            <h6>Review and manage AI-generated email responses</h6>
          </div>
        </div>

        <div className='card'>
          <div className='card-body'>
            <h5>AI Email Inbox</h5>
            <p className='text-muted mb-0'>
              AI-generated parent emails will appear here for review.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiEmailAssistant;
