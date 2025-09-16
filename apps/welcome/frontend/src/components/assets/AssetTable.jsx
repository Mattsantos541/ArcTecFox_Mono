import React from 'react';
import { Button } from '../ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '../ui/tooltip';
import { Edit, Trash2, FileText, Eye, Download, BookOpen } from 'lucide-react';

const AssetTable = React.memo(({
  type, // 'parent' or 'child'
  assets,
  selectedAsset,
  onAssetSelect,
  editingAssetId,
  editingData,
  onEditStart,
  onEditSave,
  onEditCancel,
  onEditInputChange,
  onDelete,
  onExportPDF,
  onManualModal,
  onEditModal,
  loadedManuals,
  hasEditPermission,
  formatDate,
  getCategoryOptions,
  userSites,
  formatDateForInput,
  planStatuses,
  onAssetClick
}) => {
  const isParent = type === 'parent';

  const Info = ({ label, value }) => (
    <div>
      <p className="text-sm font-medium text-gray-600">{label}:</p>
      <p className="text-sm">{value || 'N/A'}</p>
    </div>
  );

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!assets || assets.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <div className="text-gray-500">
          <h3 className="text-lg font-medium mb-2">
            No {isParent ? 'Parent' : 'Child'} Assets Found
          </h3>
          <p className="text-sm">
            {isParent 
              ? "Start by creating your first parent asset"
              : "Select a parent asset to view or create child assets"
            }
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800">
          {isParent ? 'Parent Assets' : 'Child Assets'}
          <span className="text-sm font-normal text-gray-500 ml-2">
            ({assets.length} {assets.length === 1 ? 'asset' : 'assets'})
          </span>
        </h3>
      </div>

      <div className="divide-y divide-gray-200">
        {assets.map(asset => {
          const isEditing = editingAssetId === asset.id;
          const manuals = loadedManuals[asset.id] || [];
          const planStatus = planStatuses?.[asset.id];

          return (
            <div 
              key={asset.id} 
              className={`p-6 hover:bg-gray-50 transition-colors ${
                selectedAsset?.id === asset.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    // Edit Mode
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Asset Name
                          </label>
                          <input
                            type="text"
                            name="name"
                            value={editingData.name || ''}
                            onChange={onEditInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {isParent ? 'Serial Number' : 'Serial No'}
                          </label>
                          <input
                            type="text"
                            name={isParent ? 'serial_number' : 'serial_no'}
                            value={editingData[isParent ? 'serial_number' : 'serial_no'] || ''}
                            onChange={onEditInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Category
                          </label>
                          <select
                            name="category"
                            value={editingData.category || ''}
                            onChange={onEditInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select Category</option>
                            {getCategoryOptions(editingData.category).map(category => (
                              <option key={category.id || category.asset_name} value={category.asset_name}>
                                {category.asset_name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Manufacturer
                          </label>
                          <input
                            type="text"
                            name="manufacturer"
                            value={editingData.manufacturer || ''}
                            onChange={onEditInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      {!isParent && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Plan Start Date
                            </label>
                            <input
                              type="date"
                              name="plan_start_date"
                              value={formatDateForInput(editingData.plan_start_date)}
                              onChange={onEditInputChange}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Operating Hours
                            </label>
                            <input
                              type="number"
                              name="operating_hours"
                              value={editingData.operating_hours || ''}
                              onChange={onEditInputChange}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={onEditCancel}
                          className="px-3 py-1 text-sm border border-gray-300 rounded text-gray-600 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => onEditSave(asset.id)}
                          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 
                            className={`text-lg font-semibold text-gray-900 ${
                              (!isParent && onAssetClick) ? 'cursor-pointer hover:text-blue-600' : ''
                            }`}
                            onClick={() => !isParent && onAssetClick && onAssetClick(asset)}
                          >
                            {asset.name}
                            {!isParent && planStatus && (
                              <span className={`ml-2 text-xs px-2 py-1 rounded-full ${
                                planStatus.hasPlans 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {planStatus.hasPlans ? `${planStatus.planCount} PM Plans` : 'No PM Plans'}
                              </span>
                            )}
                          </h4>
                          <p className="text-sm text-gray-500">
                            {isParent ? asset.serial_number : asset.serial_no} • {asset.category}
                          </p>
                        </div>
                        
                        {!isParent && onAssetSelect && (
                          <Button
                            onClick={() => onAssetSelect(asset)}
                            size="sm"
                            className={selectedAsset?.id === asset.id ? 'bg-blue-600' : 'bg-gray-600'}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            {selectedAsset?.id === asset.id ? 'Selected' : 'View Details'}
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 text-sm">
                        <Info label="Manufacturer" value={asset.manufacturer} />
                        <Info label="Model" value={asset.model} />
                        {isParent ? (
                          <Info label="Cost to Replace" value={asset.cost_to_replace ? `$${asset.cost_to_replace}` : 'N/A'} />
                        ) : (
                          <>
                            <Info label="Plan Start Date" value={formatDate(asset.plan_start_date)} />
                            <Info label="Operating Hours" value={asset.operating_hours} />
                          </>
                        )}
                      </div>

                      {/* Manuals Section */}
                      {manuals.length > 0 && (
                        <div className="mt-4">
                          <h5 className="text-sm font-medium text-gray-700 mb-2">Uploaded Manuals:</h5>
                          <div className="space-y-1">
                            {manuals.map(manual => (
                              <div key={manual.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                                <div className="flex items-center space-x-2">
                                  <FileText className="h-4 w-4 text-gray-500" />
                                  <span className="text-sm text-gray-700">{manual.original_name}</span>
                                  <span className="text-xs text-gray-500">
                                    ({formatFileSize(parseInt(manual.file_size))})
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                {!isEditing && (
                  <div className="flex items-center space-x-1 ml-4">
                    {onAssetSelect && isParent && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onAssetSelect(asset)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>View asset details</p>
                        </TooltipContent>
                      </Tooltip>
                    )}

                    {hasEditPermission && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEditModal(asset, isParent)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Edit asset</p>
                        </TooltipContent>
                      </Tooltip>
                    )}

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onManualModal(asset.id, asset.name, isParent)}
                        >
                          <BookOpen className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Manage manuals</p>
                      </TooltipContent>
                    </Tooltip>

                    {!isParent && onExportPDF && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onExportPDF(asset)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Export PDF</p>
                        </TooltipContent>
                      </Tooltip>
                    )}

                    {hasEditPermission && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDelete(asset.id, isParent)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Delete asset</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default AssetTable;