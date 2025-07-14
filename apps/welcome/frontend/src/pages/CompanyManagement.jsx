import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../api';

const CompanyManagement = () => {
  const { user } = useAuth();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingCompany, setEditingCompany] = useState(null);
  const [editingField, setEditingField] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  const [showAddCompany, setShowAddCompany] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyDescription, setNewCompanyDescription] = useState('');
  const [newCompanyIndustry, setNewCompanyIndustry] = useState('');
  const [newCompanySize, setNewCompanySize] = useState('');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    initializeComponent();
  }, [user]);

  const initializeComponent = async () => {
    await checkUserPermissions();
  };

  const checkUserPermissions = async () => {
    try {
      const { data, error } = await supabase
        .from('company_users')
        .select(`
          roles!inner (
            name
          )
        `)
        .eq('user_id', user.id)
        .in('roles.name', ['super_admin', 'company_admin']);

      if (error) throw error;

      const userIsSuperAdmin = data.some(item => item.roles.name === 'super_admin');
      setIsSuperAdmin(userIsSuperAdmin);

      // If not admin, show error
      if (!data || data.length === 0) {
        setError('You do not have permission to manage companies');
        setLoading(false);
        return;
      }

      // Load companies after permission check
      await loadCompanies(userIsSuperAdmin);
    } catch (err) {
      console.error('Error checking permissions:', err);
      setError('Failed to verify permissions');
      setLoading(false);
    }
  };

  const loadCompanies = async (userIsSuperAdmin = isSuperAdmin) => {
    try {
      setLoading(true);
      
      // Super admins see all companies, company admins see only their companies
      let query = supabase.from('companies').select('*').order('name');
      
      // If not super admin, filter to only companies the user is admin of
      if (!userIsSuperAdmin) {
        const { data: userCompanies } = await supabase
          .from('company_users')
          .select('company_id')
          .eq('user_id', user.id);
        
        if (userCompanies && userCompanies.length > 0) {
          const companyIds = userCompanies.map(uc => uc.company_id);
          query = query.in('id', companyIds);
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      setCompanies(data || []);
    } catch (err) {
      console.error('Error loading companies:', err);
      setError('Failed to load companies');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCompany = async (e) => {
    e.preventDefault();
    if (!newCompanyName.trim()) {
      setError('Company name is required');
      return;
    }
    if (!newCompanyIndustry.trim()) {
      setError('Industry is required');
      return;
    }
    if (!newCompanySize.trim()) {
      setError('Company size is required');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('companies')
        .insert([{
          name: newCompanyName.trim(),
          industry: newCompanyIndustry.trim(),
          company_size: newCompanySize.trim(),
          description: newCompanyDescription.trim() || null
        }])
        .select();

      if (error) throw error;

      loadCompanies();
      setShowAddCompany(false);
      setNewCompanyName('');
      setNewCompanyDescription('');
      setNewCompanyIndustry('');
      setNewCompanySize('');
      setError(null);
    } catch (err) {
      console.error('Error creating company:', err);
      setError('Failed to create company');
    }
  };

  const handleUpdateCompany = async (companyId, updates) => {
    try {
      const { error } = await supabase
        .from('companies')
        .update(updates)
        .eq('id', companyId);

      if (error) throw error;

      loadCompanies();
      setEditingCompany(null);
      setEditingField(null);
      setEditingValue('');
      setError(null);
    } catch (err) {
      console.error('Error updating company:', err);
      setError('Failed to update company');
    }
  };

  const startEditing = (companyId, field, currentValue) => {
    setEditingCompany(companyId);
    setEditingField(field);
    setEditingValue(currentValue || '');
  };

  const cancelEditing = () => {
    setEditingCompany(null);
    setEditingField(null);
    setEditingValue('');
  };

  const saveEdit = (companyId, field, originalValue) => {
    if (editingValue.trim() !== (originalValue || '')) {
      const updates = {};
      updates[field] = field === 'description' ? (editingValue.trim() || null) : editingValue.trim();
      handleUpdateCompany(companyId, updates);
    } else {
      cancelEditing();
    }
  };

  const handleDeleteCompany = async (companyId, companyName) => {
    if (window.confirm(`Are you sure you want to delete "${companyName}"? This action cannot be undone and will affect all associated users.`)) {
      try {
        const { error } = await supabase
          .from('companies')
          .delete()
          .eq('id', companyId);

        if (error) throw error;

        loadCompanies();
        setError(null);
      } catch (err) {
        console.error('Error deleting company:', err);
        setError('Failed to delete company. Make sure no users are associated with this company.');
      }
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">Company Management</h1>
          <div className="flex justify-center items-center h-64">
            <div className="text-lg">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error && error.includes('permission')) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">Company Management</h1>
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Company Management</h1>
            <p className="text-sm text-gray-600 mt-1">
              {isSuperAdmin ? 'Manage all companies in the system' : 'Manage your assigned companies'}
            </p>
          </div>
          <button
            onClick={() => setShowAddCompany(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            Add Company
          </button>
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Add Company Form */}
        {showAddCompany && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Add New Company</h3>
            <form onSubmit={handleCreateCompany} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    value={newCompanyName}
                    onChange={(e) => setNewCompanyName(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Industry *
                  </label>
                  <input
                    type="text"
                    value={newCompanyIndustry}
                    onChange={(e) => setNewCompanyIndustry(e.target.value)}
                    placeholder="e.g., Technology, Healthcare, Manufacturing"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Size *
                </label>
                <select
                  value={newCompanySize}
                  onChange={(e) => setNewCompanySize(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select company size</option>
                  <option value="1-10">1-10 employees</option>
                  <option value="11-50">11-50 employees</option>
                  <option value="51-200">51-200 employees</option>
                  <option value="201-500">201-500 employees</option>
                  <option value="501-1000">501-1000 employees</option>
                  <option value="1001-5000">1001-5000 employees</option>
                  <option value="5000+">5000+ employees</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={newCompanyDescription}
                  onChange={(e) => setNewCompanyDescription(e.target.value)}
                  rows={3}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex space-x-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                >
                  Create Company
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddCompany(false);
                    setNewCompanyName('');
                    setNewCompanyDescription('');
                    setNewCompanyIndustry('');
                    setNewCompanySize('');
                    setError(null);
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Companies Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Company Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Industry
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Company Size
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {companies.map((company) => (
                <tr key={company.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingCompany === company.id && editingField === 'name' ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              saveEdit(company.id, 'name', company.name);
                            } else if (e.key === 'Escape') {
                              cancelEditing();
                            }
                          }}
                          className="text-sm font-medium text-gray-900 border border-gray-300 rounded px-2 py-1"
                          autoFocus
                        />
                        <div className="flex space-x-2">
                          <button
                            onClick={() => saveEdit(company.id, 'name', company.name)}
                            className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div 
                        className="text-sm font-medium text-gray-900 cursor-pointer hover:bg-gray-50 p-1 rounded"
                        onClick={() => startEditing(company.id, 'name', company.name)}
                      >
                        {company.name}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingCompany === company.id && editingField === 'industry' ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              saveEdit(company.id, 'industry', company.industry);
                            } else if (e.key === 'Escape') {
                              cancelEditing();
                            }
                          }}
                          className="text-sm text-gray-900 border border-gray-300 rounded px-2 py-1"
                          autoFocus
                        />
                        <div className="flex space-x-2">
                          <button
                            onClick={() => saveEdit(company.id, 'industry', company.industry)}
                            className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div 
                        className="text-sm text-gray-900 cursor-pointer hover:bg-gray-50 p-1 rounded"
                        onClick={() => startEditing(company.id, 'industry', company.industry)}
                      >
                        {company.industry || <span className="italic text-gray-400">No industry (click to add)</span>}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingCompany === company.id && editingField === 'company_size' ? (
                      <div className="space-y-2">
                        <select
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              saveEdit(company.id, 'company_size', company.company_size);
                            } else if (e.key === 'Escape') {
                              cancelEditing();
                            }
                          }}
                          className="text-sm text-gray-900 border border-gray-300 rounded px-2 py-1"
                          autoFocus
                        >
                          <option value="">Select size</option>
                          <option value="1-10">1-10 employees</option>
                          <option value="11-50">11-50 employees</option>
                          <option value="51-200">51-200 employees</option>
                          <option value="201-500">201-500 employees</option>
                          <option value="501-1000">501-1000 employees</option>
                          <option value="1001-5000">1001-5000 employees</option>
                          <option value="5000+">5000+ employees</option>
                        </select>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => saveEdit(company.id, 'company_size', company.company_size)}
                            className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div 
                        className="text-sm text-gray-900 cursor-pointer hover:bg-gray-50 p-1 rounded"
                        onClick={() => startEditing(company.id, 'company_size', company.company_size)}
                      >
                        {company.company_size || <span className="italic text-gray-400">No size (click to add)</span>}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {editingCompany === company.id && editingField === 'description' ? (
                      <div className="space-y-2">
                        <textarea
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && e.ctrlKey) {
                              saveEdit(company.id, 'description', company.description);
                            } else if (e.key === 'Escape') {
                              cancelEditing();
                            }
                          }}
                          className="text-sm text-gray-900 border border-gray-300 rounded px-2 py-1 w-full"
                          rows={3}
                          autoFocus
                        />
                        <div className="flex space-x-2">
                          <button
                            onClick={() => saveEdit(company.id, 'description', company.description)}
                            className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div 
                        className="text-sm text-gray-900 cursor-pointer hover:bg-gray-50 p-1 rounded"
                        onClick={() => startEditing(company.id, 'description', company.description)}
                      >
                        {company.description || <span className="italic text-gray-400">No description (click to add)</span>}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(company.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    {editingCompany === company.id ? (
                      <span className="text-blue-600 text-xs">
                        Editing {editingField}...
                      </span>
                    ) : (
                      <>
                        <span className="text-gray-500 text-xs">
                          Click any field to edit
                        </span>
                        <button
                          onClick={() => handleDeleteCompany(company.id, company.name)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {companies.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No companies found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompanyManagement;