import React from 'react';
import { Button } from '../ui/button';
import { Upload, Download, Sparkles } from 'lucide-react';

const AssetBulkOperations = React.memo(({ 
  onBulkImport,
  onSuggestChildAssets,
  selectedParentAsset,
  hasCreatePermission,
  loadingSuggestions
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Bulk Operations</h3>
      
      <div className="flex flex-wrap gap-4">
        {hasCreatePermission && (
          <Button
            onClick={onBulkImport}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Upload className="h-4 w-4 mr-2" />
            Bulk Import Assets
          </Button>
        )}

        {selectedParentAsset && hasCreatePermission && (
          <Button
            onClick={onSuggestChildAssets}
            disabled={loadingSuggestions}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {loadingSuggestions ? 'Getting Suggestions...' : 'AI Suggest Child Assets'}
          </Button>
        )}
      </div>

      {selectedParentAsset && (
        <p className="text-sm text-gray-600 mt-2">
          AI suggestions will be based on: <span className="font-medium">{selectedParentAsset.name}</span>
        </p>
      )}
    </div>
  );
});

export default AssetBulkOperations;