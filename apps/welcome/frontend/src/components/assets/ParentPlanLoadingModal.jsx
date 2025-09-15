import React from 'react';

// Parent Plan Generation Loading Modal
const ParentPlanLoadingModal = React.memo(({ isOpen, status, progress }) => {
  if (!isOpen) return null;
  
  const statusMessages = {
    'analyzing': 'Analyzing equipment specifications...',
    'generating': 'Consulting maintenance best practices...',
    'creating': 'Generating optimal maintenance schedule...',
    'saving': 'Saving maintenance plan...'
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md mx-4 text-center">
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">
            🤖 Generating Parent Maintenance Plan
          </h3>
          <p className="text-gray-600 mb-4">
            {statusMessages[status] || 'Processing...'}
          </p>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div 
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress || 0}%` }}
            ></div>
          </div>
          
          <div className="flex justify-center">
            <div className="text-sm text-indigo-600">
              {progress}% complete
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default ParentPlanLoadingModal;