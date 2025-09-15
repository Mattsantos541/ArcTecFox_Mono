import React from 'react';

// Loading Modal Component (copied from PMPlanner)
function LoadingModal({ isOpen }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md mx-4 text-center">
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Generating Your PM Plan</h3>
          <p className="text-gray-600 mb-4">
            Our AI is analyzing your asset and creating a comprehensive maintenance plan...
          </p>
          <div className="flex justify-center">
            <div className="text-sm text-blue-600">
              This may take a few moments...
            </div>
          </div>
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
            Our AI is analyzing your parent asset and suggesting relevant child components...
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