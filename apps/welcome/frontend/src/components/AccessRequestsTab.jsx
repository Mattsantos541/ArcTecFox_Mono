import React, { useState } from 'react';

const AccessRequestsTab = ({ 
  accessRequests, 
  companies, 
  allRoles, 
  onApprove, 
  onReject, 
  processingRequestId 
}) => {
  const [selectedCompanyId, setSelectedCompanyId] = useState({});
  const [selectedRoleId, setSelectedRoleId] = useState({});
  const [rejectionReason, setRejectionReason] = useState({});
  const [showRejectModal, setShowRejectModal] = useState(null);

  const getAvailableRoles = () => {
    return allRoles.filter(role => 
      role.name !== 'super_admin'
    );
  };

  const handleApprove = (requestId) => {
    const companyId = selectedCompanyId[requestId];
    const roleId = selectedRoleId[requestId];
    
    if (!companyId || !roleId) {
      alert('Please select both company and role before approving');
      return;
    }
    
    onApprove(requestId, companyId, roleId);
  };

  const handleReject = (requestId) => {
    const reason = rejectionReason[requestId];
    if (!reason || reason.trim() === '') {
      alert('Please provide a rejection reason');
      return;
    }
    
    onReject(requestId, reason);
    setShowRejectModal(null);
    setRejectionReason({ ...rejectionReason, [requestId]: '' });
  };

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-800">
          Pending Access Requests ({accessRequests.length})
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Review and approve user access requests to the platform
        </p>
      </div>

      {accessRequests.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">📝</div>
          <p>No pending access requests</p>
        </div>
      ) : (
        <div className="space-y-4">
          {accessRequests.map((request) => (
            <div key={request.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Request Info */}
                <div>
                  <h3 className="font-medium text-gray-900">{request.full_name}</h3>
                  <p className="text-sm text-gray-600">{request.email}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Requested: {new Date(request.requested_at).toLocaleDateString()}
                  </p>
                  {request.lead_data && (
                    <div className="mt-2 text-xs text-gray-600">
                      <p><strong>Company:</strong> {request.lead_data.org_name || 'Not specified'}</p>
                      <p><strong>Asset:</strong> {request.lead_data.asset_name || 'Not specified'}</p>
                    </div>
                  )}
                </div>

                {/* Assignment Controls */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Assign to Company
                    </label>
                    <select
                      value={selectedCompanyId[request.id] || ''}
                      onChange={(e) => setSelectedCompanyId({
                        ...selectedCompanyId,
                        [request.id]: e.target.value
                      })}
                      className="w-full p-2 border border-gray-300 rounded text-sm"
                    >
                      <option value="">Select company...</option>
                      {companies.map(company => (
                        <option key={company.id} value={company.id}>
                          {company.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Assign Role
                    </label>
                    <select
                      value={selectedRoleId[request.id] || ''}
                      onChange={(e) => setSelectedRoleId({
                        ...selectedRoleId,
                        [request.id]: e.target.value
                      })}
                      className="w-full p-2 border border-gray-300 rounded text-sm"
                    >
                      <option value="">Select role...</option>
                      {getAvailableRoles().map(role => (
                        <option key={role.id} value={role.id}>
                          {role.name.split('_').map(word => 
                            word.charAt(0).toUpperCase() + word.slice(1)
                          ).join(' ')}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col space-y-2">
                  <button
                    onClick={() => handleApprove(request.id)}
                    disabled={processingRequestId === request.id}
                    className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    {processingRequestId === request.id ? 'Processing...' : '✅ Approve'}
                  </button>
                  
                  <button
                    onClick={() => setShowRejectModal(request.id)}
                    disabled={processingRequestId === request.id}
                    className="px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
                  >
                    ❌ Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium mb-4">Reject Access Request</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for rejection:
              </label>
              <textarea
                value={rejectionReason[showRejectModal] || ''}
                onChange={(e) => setRejectionReason({
                  ...rejectionReason,
                  [showRejectModal]: e.target.value
                })}
                placeholder="Please provide a reason for rejecting this request..."
                className="w-full p-3 border border-gray-300 rounded resize-none h-24"
              />
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => handleReject(showRejectModal)}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Reject Request
              </button>
              <button
                onClick={() => setShowRejectModal(null)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccessRequestsTab;