import React from 'react';
import { Button } from '../ui/button';
import FileUpload from '../forms/FileUpload';

const AssetForm = React.memo(({ 
  type, // 'parent' or 'child'
  formData,
  onInputChange,
  onSubmit,
  onCancel,
  isSubmitting,
  assetCategories,
  userSites,
  selectedParentAsset,
  fileUploadProps,
  formatDateForInput,
  getCategoryOptions
}) => {
  const isParent = type === 'parent';
  
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Name Field */}
      <div>
        <label htmlFor={`${type}Name`} className="block text-sm font-medium text-gray-700 mb-1">
          {isParent ? 'Parent Asset Name' : 'Child Asset Name'}
        </label>
        <input
          type="text"
          id={`${type}Name`}
          name="name"
          value={formData.name || ''}
          onChange={onInputChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      {/* Serial Number */}
      <div>
        <label htmlFor={`${type}Serial`} className="block text-sm font-medium text-gray-700 mb-1">
          {isParent ? 'Serial Number' : 'Serial No'}
        </label>
        <input
          type="text"
          id={`${type}Serial`}
          name={isParent ? 'serial_number' : 'serial_no'}
          value={formData[isParent ? 'serial_number' : 'serial_no'] || ''}
          onChange={onInputChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Site Selection (Parent only) */}
      {isParent && (
        <div>
          <label htmlFor="parentSite" className="block text-sm font-medium text-gray-700 mb-1">
            Site
          </label>
          <select
            id="parentSite"
            name="site_id"
            value={formData.site_id || ''}
            onChange={onInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Select Site</option>
            {userSites.map(site => (
              <option key={site.id} value={site.id}>{site.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Child Asset Specific Fields */}
      {!isParent && (
        <>
          <div>
            <label htmlFor="planStartDate" className="block text-sm font-medium text-gray-700 mb-1">
              Plan Start Date
            </label>
            <input
              type="date"
              id="planStartDate"
              name="plan_start_date"
              value={formatDateForInput(formData.plan_start_date)}
              onChange={onInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label htmlFor="operatingHours" className="block text-sm font-medium text-gray-700 mb-1">
              Operating Hours
            </label>
            <input
              type="number"
              id="operatingHours"
              name="operating_hours"
              value={formData.operating_hours || ''}
              onChange={onInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="parentAssetDisplay" className="block text-sm font-medium text-gray-700 mb-1">
              Parent Asset
            </label>
            <input
              type="text"
              id="parentAssetDisplay"
              value={selectedParentAsset?.name || 'No parent selected'}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
            />
          </div>
        </>
      )}

      {/* Common Fields */}
      <div>
        <label htmlFor={`${type}Category`} className="block text-sm font-medium text-gray-700 mb-1">
          Category
        </label>
        <select
          id={`${type}Category`}
          name="category"
          value={formData.category || ''}
          onChange={onInputChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select Category</option>
          {getCategoryOptions(formData.category).map(category => (
            <option key={category.id || category.asset_name} value={category.asset_name}>
              {category.asset_name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor={`${type}Manufacturer`} className="block text-sm font-medium text-gray-700 mb-1">
          Manufacturer
        </label>
        <input
          type="text"
          id={`${type}Manufacturer`}
          name="manufacturer"
          value={formData.manufacturer || ''}
          onChange={onInputChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label htmlFor={`${type}Model`} className="block text-sm font-medium text-gray-700 mb-1">
          Model
        </label>
        <input
          type="text"
          id={`${type}Model`}
          name="model"
          value={formData.model || ''}
          onChange={onInputChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Parent-specific fields */}
      {isParent && (
        <div>
          <label htmlFor="costToReplace" className="block text-sm font-medium text-gray-700 mb-1">
            Cost to Replace ($)
          </label>
          <input
            type="number"
            id="costToReplace"
            name="cost_to_replace"
            value={formData.cost_to_replace || ''}
            onChange={onInputChange}
            step="0.01"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {/* File Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Upload Manual (Optional)
        </label>
        <FileUpload {...fileUploadProps} />
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <Button 
          type="submit" 
          className="bg-blue-600 hover:bg-blue-700"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Creating...' : `Create ${isParent ? 'Parent' : 'Child'} Asset`}
        </Button>
      </div>
    </form>
  );
});

export default AssetForm;