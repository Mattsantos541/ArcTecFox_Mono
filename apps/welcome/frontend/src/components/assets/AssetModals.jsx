import React, { useEffect, useState } from 'react';
import { toast } from '../../hooks/use-toast';

// Enhanced Loading Modal Component with Progress Feedback
function LoadingModal({
  isOpen,
  error,
  onRetry,
  onClose,
  success,
  tasksCreated,
  progress,
  status
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [progressValue, setProgressValue] = useState(0);
  const [isClosing, setIsClosing] = useState(false);

  // Progress steps for PM plan generation
  const steps = [
    {
      id: 'analyzing',
      label: 'Analyzing Asset',
      description: 'Reading equipment specifications and history',
      icon: '🔍'
    },
    {
      id: 'generating',
      label: 'AI Processing',
      description: 'Creating maintenance strategy',
      icon: '🤖'
    },
    {
      id: 'creating',
      label: 'Building Tasks',
      description: 'Defining maintenance activities',
      icon: '📋'
    },
    {
      id: 'saving',
      label: 'Finalizing',
      description: 'Saving your PM plan',
      icon: '💾'
    }
  ];

  // Update step based on status
  useEffect(() => {
    const stepIndex = steps.findIndex(s => s.id === status);
    if (stepIndex !== -1) {
      setCurrentStep(stepIndex);
    }
  }, [status]);

  // Simulate progress if not provided
  useEffect(() => {
    if (isOpen && !progress && !error && !success) {
      const timer = setInterval(() => {
        setProgressValue(prev => {
          if (prev >= 90) {
            clearInterval(timer);
            return 90;
          }
          return prev + 10;
        });
      }, 1000);
      return () => clearInterval(timer);
    } else if (progress) {
      setProgressValue(progress);
    }
  }, [isOpen, progress, error, success]);

  // Handle success state
  useEffect(() => {
    if (success && isOpen) {
      setProgressValue(100);
      toast({
        title: "✅ PM Plan Created Successfully!",
        description: `Generated ${tasksCreated || 0} maintenance tasks for your asset.`,
        duration: 5000,
      });

      setTimeout(() => {
        setIsClosing(true);
        if (onClose) onClose();
      }, 1500);
    }
  }, [success, isOpen, tasksCreated, onClose]);

  if (!isOpen || isClosing) return null;

  // Error state
  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md mx-4">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
              <span className="text-2xl">❌</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              PM Plan Generation Failed
            </h3>
            <p className="text-gray-600 mb-6">
              {error.message || 'Unable to generate the maintenance plan. Please check your input and try again.'}
            </p>

            <div className="flex gap-3 justify-center">
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  🔄 Try Again
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
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md mx-4 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4 animate-bounce">
            <span className="text-2xl">🎉</span>
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">
            PM Plan Created!
          </h3>
          <p className="text-sm text-gray-600">
            Successfully generated {tasksCreated || 0} maintenance tasks
          </p>
        </div>
      </div>
    );
  }

  // Loading state with progress
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md mx-4">
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-6 text-center">
            🔧 Generating Your PM Plan
          </h3>

          {/* Step indicators */}
          <div className="space-y-3 mb-6">
            {steps.map((step, index) => {
              const isActive = index === currentStep;
              const isComplete = index < currentStep || (success && index === steps.length - 1);

              return (
                <div key={step.id} className="flex items-center gap-3">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm
                    transition-all duration-300
                    ${isComplete ? 'bg-green-100' : isActive ? 'bg-blue-100' : 'bg-gray-100'}
                  `}>
                    {isComplete ? '✓' : isActive ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
                    ) : step.icon}
                  </div>
                  <div className="flex-grow">
                    <div className={`text-sm font-medium ${
                      isActive ? 'text-blue-600' : isComplete ? 'text-green-600' : 'text-gray-400'
                    }`}>
                      {step.label}
                    </div>
                    <div className={`text-xs ${isActive ? 'text-gray-600' : 'text-gray-400'}`}>
                      {step.description}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Progress bar */}
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Progress</span>
              <span>{progressValue}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${progressValue}%` }}
              />
            </div>
          </div>

          <p className="text-center text-sm text-gray-500">
            Our AI is analyzing your asset and creating a comprehensive maintenance plan...
          </p>
        </div>
      </div>
    </div>
  );
}

// AI Suggestions Loading Modal
function SuggestionsLoadingModal({ isOpen }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md mx-4 text-center">
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">🤖 Getting AI Suggestions</h3>
          <p className="text-gray-600 mb-4">
            Our AI is analyzing your parent asset details to suggest relevant child components that match your specifications...
          </p>
          <div className="flex justify-center">
            <div className="text-sm text-green-600">
              This may take a few moments...
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Confirmation Modal
const ConfirmModal = React.memo(({ 
  isOpen, 
  onClose, 
  title, 
  message, 
  onConfirm, 
  confirmText = "Delete",
  cancelText = "Cancel",
  type = "danger"
}) => {
  if (!isOpen) return null;

  const typeStyles = {
    danger: "bg-red-600 hover:bg-red-700 text-white",
    warning: "bg-yellow-600 hover:bg-yellow-700 text-white", 
    primary: "bg-blue-600 hover:bg-blue-700 text-white"
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex justify-end space-x-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            {cancelText}
          </button>
          <button 
            onClick={onConfirm}
            className={`px-4 py-2 rounded-md ${typeStyles[type]}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
});

export { 
  LoadingModal, 
  SuggestionsLoadingModal,
  ConfirmModal
};