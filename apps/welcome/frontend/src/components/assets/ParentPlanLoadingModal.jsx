import React, { useEffect, useState } from 'react';
import { toast } from '../../hooks/use-toast';

// Parent Plan Generation Loading Modal with Enhanced Feedback
const ParentPlanLoadingModal = React.memo(({
  isOpen,
  status,
  progress,
  error,
  onRetry,
  onClose,
  success,
  tasksCreated,
  sparesIdentified
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isClosing, setIsClosing] = useState(false);

  // Progress steps with better UX
  const steps = [
    {
      id: 'analyzing',
      label: 'Analyzing Asset',
      description: 'Reading equipment specifications',
      icon: '📊'
    },
    {
      id: 'generating',
      label: 'AI Processing',
      description: 'Consulting maintenance best practices',
      icon: '🤖'
    },
    {
      id: 'creating',
      label: 'Creating Tasks',
      description: 'Generating optimal maintenance schedule',
      icon: '📋'
    },
    {
      id: 'saving',
      label: 'Finalizing',
      description: 'Saving maintenance plan',
      icon: '💾'
    }
  ];

  // Update current step based on status
  useEffect(() => {
    const stepIndex = steps.findIndex(s => s.id === status);
    if (stepIndex !== -1) {
      setCurrentStep(stepIndex);
    }
  }, [status]);

  // Handle success state - auto close and show toast
  useEffect(() => {
    if (success && isOpen) {
      // Show success toast
      toast({
        title: "✅ Plan Generated Successfully!",
        description: `Created ${tasksCreated || 0} maintenance tasks and identified ${sparesIdentified || 0} critical spare parts.`,
        duration: 5000,
      });

      // Auto close modal after brief celebration
      setTimeout(() => {
        setIsClosing(true);
      }, 1500);
    }
  }, [success, isOpen, tasksCreated, sparesIdentified]);

  if (!isOpen || isClosing) return null;

  // Error State
  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md mx-4">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
              <span className="text-2xl">❌</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              Plan Generation Failed
            </h3>
            <p className="text-gray-600 mb-6">
              {error.message || 'An unexpected error occurred while generating the maintenance plan.'}
            </p>

            {/* Error details if available */}
            {error.details && (
              <details className="mb-4 text-left">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                  Technical Details
                </summary>
                <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                  {error.details}
                </pre>
              </details>
            )}

            <div className="flex gap-3 justify-center">
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  🔄 Retry
                </button>
              )}
              <button
                onClick={() => {
                  setIsClosing(true);
                  if (onClose) onClose();
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
            </div>

            <p className="mt-4 text-xs text-gray-500">
              If this issue persists, please contact support
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Success State
  if (success) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md mx-4 text-center">
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4 animate-bounce">
              <span className="text-2xl">🎉</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              Plan Generated Successfully!
            </h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p>✅ {tasksCreated || 0} maintenance tasks created</p>
              <p>✅ {sparesIdentified || 0} critical spare parts identified</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading State with Steps
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md mx-4">
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-6 text-center">
            🤖 Generating Parent Maintenance Plan
          </h3>

          {/* Step Progress Indicators */}
          <div className="space-y-4 mb-6">
            {steps.map((step, index) => {
              const isActive = index === currentStep;
              const isComplete = index < currentStep;

              return (
                <div key={step.id} className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className={`
                      w-10 h-10 rounded-full flex items-center justify-center text-lg
                      transition-all duration-300
                      ${isComplete ? 'bg-green-100' : isActive ? 'bg-indigo-100' : 'bg-gray-100'}
                    `}>
                      {isComplete ? '✓' : isActive ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600" />
                      ) : step.icon}
                    </div>
                  </div>
                  <div className="flex-grow">
                    <div className={`font-medium ${isActive ? 'text-indigo-600' : isComplete ? 'text-green-600' : 'text-gray-400'}`}>
                      {step.label}
                    </div>
                    <div className={`text-sm ${isActive ? 'text-gray-600' : 'text-gray-400'}`}>
                      {step.description}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Overall Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Progress</span>
              <span>{progress || 0}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${progress || 0}%` }}
              />
            </div>
          </div>

          {/* Estimated time */}
          <p className="text-center text-sm text-gray-500">
            Estimated time remaining: {Math.max(1, Math.ceil((100 - (progress || 0)) / 2))} seconds
          </p>
        </div>
      </div>
    </div>
  );
});

export default ParentPlanLoadingModal;