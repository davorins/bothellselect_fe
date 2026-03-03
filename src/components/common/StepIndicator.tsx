import React from 'react';
import './StepIndicator.css';

export type Step = {
  id: string;
  label: string;
  number: number;
  icon?: string;
};

interface StepIndicatorProps {
  steps: Step[];
  currentStep: string;
  showConnectors?: boolean;
  className?: string;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({
  steps,
  currentStep,
  showConnectors = true,
  className = '',
}) => {
  const currentStepIndex = steps.findIndex((step) => step.id === currentStep);

  return (
    <div className={`step-indicator`}>
      <div className='d-flex justify-content-between align-items-center position-relative'>
        {steps.map((step, index) => {
          const isActive = step.id === currentStep;
          const isCompleted = index < currentStepIndex;

          return (
            <React.Fragment key={step.id}>
              <div
                className={`step ${isActive ? 'active' : ''} ${
                  isCompleted ? 'completed' : ''
                }`}
                style={{
                  cursor: 'default',
                }}
              >
                <div className='step-icon-wrapper'>
                  {step.icon ? (
                    <i className={step.icon}></i>
                  ) : (
                    <span className='step-number'>{step.number}</span>
                  )}
                </div>
                <div className='step-label'>{step.label}</div>
              </div>

              {showConnectors && index < steps.length - 1 && (
                <div
                  className={`step-connector ${isCompleted ? 'completed' : ''}`}
                ></div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default StepIndicator;
