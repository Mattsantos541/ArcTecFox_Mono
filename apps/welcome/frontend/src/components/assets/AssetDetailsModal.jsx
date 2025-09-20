import React from 'react';

const AssetDetailsModal = ({
  show,
  onClose,
  extracting,
  extractedData,
  assetDetails,
  setAssetDetails,
  onConfirm,
  manualProvided
}) => {
  if (!show) return null;

  const handleInputChange = (field, value) => {
    setAssetDetails(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const isFieldExtracted = (field) => {
    return extractedData[field] !== null && extractedData[field] !== '';
  };

  const handleConfirm = () => {
    // Basic validation - at least name should be provided from parent component
    if (!assetDetails.make && !assetDetails.model && !assetDetails.serial_number && !assetDetails.category) {
      // Allow proceeding even with empty fields as they're optional
    }
    onConfirm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        {/* Header */}
        <h2 className="text-xl font-semibold mb-4">
          {extracting ? 'Extracting Asset Details' : 'Complete Asset Details'}
        </h2>

        {/* Loading State */}
        {extracting && (
          <div className="space-y-4">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
            <p className="text-center text-gray-600">
              Analyzing user manual to extract asset details...
            </p>
            <p className="text-center text-sm text-gray-500">
              This may take a few moments
            </p>
          </div>
        )}

        {/* Form Fields */}
        {!extracting && (
          <div className="space-y-4">
            {manualProvided && Object.values(extractedData).some(v => v !== null) && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  ✓ We've extracted some details from your manual. Please review and complete any missing information.
                </p>
              </div>
            )}

            {!manualProvided && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  Please provide the asset details below (optional):
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Make {isFieldExtracted('make') && <span className="text-green-600 text-xs">(extracted)</span>}
              </label>
              <input
                type="text"
                value={assetDetails.make || ''}
                onChange={(e) => handleInputChange('make', e.target.value)}
                placeholder="e.g., Caterpillar, John Deere"
                className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  isFieldExtracted('make') ? 'border-green-300 bg-green-50' : 'border-gray-300'
                }`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Model {isFieldExtracted('model') && <span className="text-green-600 text-xs">(extracted)</span>}
              </label>
              <input
                type="text"
                value={assetDetails.model || ''}
                onChange={(e) => handleInputChange('model', e.target.value)}
                placeholder="e.g., 320D, 644K"
                className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  isFieldExtracted('model') ? 'border-green-300 bg-green-50' : 'border-gray-300'
                }`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Serial Number {isFieldExtracted('serial_number') && <span className="text-green-600 text-xs">(extracted)</span>}
              </label>
              <input
                type="text"
                value={assetDetails.serial_number || ''}
                onChange={(e) => handleInputChange('serial_number', e.target.value)}
                placeholder="e.g., ABC123456"
                className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  isFieldExtracted('serial_number') ? 'border-green-300 bg-green-50' : 'border-gray-300'
                }`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category {isFieldExtracted('category') && <span className="text-green-600 text-xs">(extracted)</span>}
              </label>
              <input
                type="text"
                value={assetDetails.category || ''}
                onChange={(e) => handleInputChange('category', e.target.value)}
                placeholder="e.g., Excavator, Generator, HVAC"
                className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  isFieldExtracted('category') ? 'border-green-300 bg-green-50' : 'border-gray-300'
                }`}
              />
            </div>

            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
              >
                Confirm & Create Asset
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssetDetailsModal;