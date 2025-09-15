import React from 'react';
import { Button } from '../ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '../ui/tooltip';
import { Sparkles, Wrench, FileText } from 'lucide-react';
import { LoadingModal } from './AssetModals';

const PMPlanManager = React.memo(({ 
  selectedChildAsset,
  currentPlans,
  loadingPlans,
  generatingPlan,
  onCreateUpdatePlan,
  formatDate
}) => {
  if (!selectedChildAsset) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <div className="text-gray-500">
          <Wrench className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">PM Plan Management</h3>
          <p className="text-sm">Select a child asset to manage its preventive maintenance plans</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-800">
              PM Plans for {selectedChildAsset.name}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Manage preventive maintenance plans for this asset
            </p>
          </div>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => onCreateUpdatePlan(selectedChildAsset)}
                disabled={generatingPlan}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {generatingPlan ? 'Generating...' : 'Generate AI PM Plan'}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Create or update maintenance plan using AI</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Asset Information */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Serial No:</span>
              <p className="text-gray-900">{selectedChildAsset.serial_no || 'N/A'}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Category:</span>
              <p className="text-gray-900">{selectedChildAsset.category || 'N/A'}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Plan Start:</span>
              <p className="text-gray-900">{formatDate(selectedChildAsset.plan_start_date) || 'N/A'}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Operating Hours:</span>
              <p className="text-gray-900">{selectedChildAsset.operating_hours || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Current Plans */}
        <div>
          <h4 className="text-lg font-medium text-gray-800 mb-4">Current Plans</h4>
          
          {loadingPlans ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Loading plans...</p>
            </div>
          ) : currentPlans && currentPlans.length > 0 ? (
            <div className="space-y-4">
              {currentPlans.map((plan, index) => (
                <div key={plan.id || index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h5 className="font-medium text-gray-900">Plan #{plan.id || 'New'}</h5>
                      <p className="text-sm text-gray-600">
                        Status: <span className={`font-medium ${
                          plan.status === 'Current' ? 'text-green-600' : 
                          plan.status === 'Draft' ? 'text-yellow-600' : 'text-gray-600'
                        }`}>
                          {plan.status}
                        </span>
                      </p>
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      <p>Created: {formatDate(plan.created_at)}</p>
                      {plan.updated_at && <p>Updated: {formatDate(plan.updated_at)}</p>}
                    </div>
                  </div>

                  {plan.tasks && plan.tasks.length > 0 && (
                    <div>
                      <h6 className="text-sm font-medium text-gray-700 mb-2">
                        Tasks ({plan.tasks.length})
                      </h6>
                      <div className="space-y-2">
                        {plan.tasks.slice(0, 3).map((task, taskIndex) => (
                          <div key={task.id || taskIndex} className="text-sm bg-gray-50 p-2 rounded">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <span className="font-medium text-gray-900">{task.task_name}</span>
                                {task.maintenance_interval && (
                                  <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                    Every {task.maintenance_interval} months
                                  </span>
                                )}
                              </div>
                              {task.criticality && (
                                <span className={`text-xs px-2 py-1 rounded ${
                                  task.criticality === 'High' ? 'bg-red-100 text-red-800' :
                                  task.criticality === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-green-100 text-green-800'
                                }`}>
                                  {task.criticality}
                                </span>
                              )}
                            </div>
                            {task.instructions && (
                              <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                                {Array.isArray(task.instructions) 
                                  ? task.instructions.join('. ').substring(0, 100) + '...'
                                  : task.instructions.substring(0, 100) + '...'
                                }
                              </p>
                            )}
                          </div>
                        ))}
                        {plan.tasks.length > 3 && (
                          <p className="text-xs text-gray-500 text-center">
                            +{plan.tasks.length - 3} more tasks
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
              <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <h4 className="text-sm font-medium text-gray-900 mb-1">No PM Plans Yet</h4>
              <p className="text-sm text-gray-600 mb-4">
                This asset doesn't have any maintenance plans yet
              </p>
              <Button
                onClick={() => onCreateUpdatePlan(selectedChildAsset)}
                disabled={generatingPlan}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Create First PM Plan
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Loading Modal */}
      <LoadingModal isOpen={generatingPlan} />
    </>
  );
});

export default PMPlanManager;