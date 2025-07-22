import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { 
  supabase, 
  isUserSiteAdmin, 
  getUserAdminSites,
  fetchCompanySites,
  createSite,
  updateSite,
  deleteSite
} from '../api';

const CompanyManagement = () => {
  const { user } = useAuth();
  const [companies, setCompanies] = useState([]);
  const [sites, setSites] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sitesLoading, setSitesLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingCompany, setEditingCompany] = useState(null);
  const [editingSite, setEditingSite] = useState(null);
  const [editingField, setEditingField] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  const [showAddCompany, setShowAddCompany] = useState(false);
  const [showAddSite, setShowAddSite] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyDescription, setNewCompanyDescription] = useState('');
  const [newCompanyIndustry, setNewCompanyIndustry] = useState('');
  const [newCompanySize, setNewCompanySize] = useState('');
  const [newSiteName, setNewSiteName] = useState('');
  const [newSiteLocation, setNewSiteLocation] = useState('');
  const [newSiteDescription, setNewSiteDescription] = useState('');
  const [newSitePlanLimit, setNewSitePlanLimit] = useState('');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    initializeComponent();
  }, [user]);

  const initializeComponent = async () => {
    await checkUserPermissions();
  };

  const checkUserPermissions = async () => {
    try {
      // Use new site-based admin checking
      const isAdmin = await isUserSiteAdmin(user.id);
      const adminSites = await getUserAdminSites(user.id);
      
      const userIsSuperAdmin = adminSites.some(item => item.roles.name === 'super_admin');
      setIsSuperAdmin(userIsSuperAdmin);

      // If not admin, show error
      if (!isAdmin) {
        setError('You do not have permission to manage companies/sites');
        setLoading(false);
        return;
      }

      // Load companies after permission check
      await loadCompanies(userIsSuperAdmin, adminSites);
    } catch (err) {
      console.error('Error checking permissions:', err);
      setError('Failed to verify permissions');
      setLoading(false);
    }
  };

  const loadCompanies = async (userIsSuperAdmin = isSuperAdmin, adminSites = null) => {
    try {
      setLoading(true);
      
      console.log('🔍 loadCompanies - userIsSuperAdmin:', userIsSuperAdmin);
      console.log('🔍 loadCompanies - adminSites:', adminSites);
      
      // Super admins see all companies, company admins see only their companies
      let query = supabase.from('companies').select('*').order('name');
      
      // If not super admin, filter to only companies the user is admin of through sites
      if (!userIsSuperAdmin && adminSites && adminSites.length > 0) {
        const companyIds = [...new Set(adminSites.map(site => site.sites?.companies?.id).filter(Boolean))];
        console.log('🔍 loadCompanies - extracted companyIds:', companyIds);
        
        if (companyIds.length > 0) {
          query = query.in('id', companyIds);
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      console.log('🔍 loadCompanies - loaded companies:', data);
      setCompanies(data || []);
      
      // Auto-select first company if available
      if (data && data.length > 0 && !selectedCompany) {
        setSelectedCompany(data[0]);
        await loadSites(data[0].id);
      }
    } catch (err) {
      console.error('Error loading companies:', err);
      setError('Failed to load companies');
    } finally {
      setLoading(false);
    }
  };

  const loadSites = async (companyId) => {
    try {
      setSitesLoading(true);
      const sitesData = await fetchCompanySites(companyId);
      setSites(sitesData || []);
    } catch (err) {
      console.error('Error loading sites:', err);
      setError('Failed to load sites');
    } finally {
      setSitesLoading(false);
    }
  };

  const handleCompanySelect = async (company) => {
    setSelectedCompany(company);
    await loadSites(company.id);
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

      await loadCompanies();
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

      await loadCompanies();
      setEditingCompany(null);
      setEditingField(null);
      setEditingValue('');
      setError(null);
    } catch (err) {
      console.error('Error updating company:', err);
      setError('Failed to update company');
    }
  };

  const startEditing = (companyId, field, currentValue, isCompany = true) => {
    if (isCompany) {
      setEditingCompany(companyId);
      setEditingSite(null);
    } else {
      setEditingSite(companyId); // This is actually siteId when isCompany=false
      setEditingCompany(null);
    }
    setEditingField(field);
    setEditingValue(currentValue || '');
  };

  const cancelEditing = () => {
    setEditingCompany(null);
    setEditingSite(null);
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

        await loadCompanies();
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
            <h1 className="text-2xl font-bold text-gray-800">Company & Site Management</h1>
            <p className="text-sm text-gray-600 mt-1">
              {isSuperAdmin ? 'Manage all companies and sites in the system' : 'Manage your assigned companies and sites'}
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowAddCompany(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              Add Company
            </button>
            {selectedCompany && (
              <button
                onClick={() => setShowAddSite(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
              >
                Add Site to {selectedCompany.name}
              </button>
            )}
          </div>
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Company Selection */}
        {companies.length > 0 && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Company to View Sites
            </label>
            <select
              value={selectedCompany?.id || ''}
              onChange={(e) => {
                const company = companies.find(c => c.id === e.target.value);
                if (company) handleCompanySelect(company);
              }}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a company...</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Add Site Form */}
        {showAddSite && selectedCompany && (
          <div className="mb-6 p-4 bg-green-50 rounded-lg border">
            <h3 className="text-lg font-medium text-gray-800 mb-4">
              Add New Site to {selectedCompany.name}
            </h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!newSiteName.trim()) {
                setError('Site name is required');
                return;
              }
              try {
                await createSite({
                  name: newSiteName.trim(),
                  companyId: selectedCompany.id,
                  location: newSiteLocation.trim() || null,
                  description: newSiteDescription.trim() || null,
                  plan_limit: newSitePlanLimit ? parseInt(newSitePlanLimit) : null
                });
                await loadSites(selectedCompany.id);
                setShowAddSite(false);
                setNewSiteName('');
                setNewSiteLocation('');
                setNewSiteDescription('');
                setNewSitePlanLimit('');
                setError(null);
              } catch (err) {
                console.error('Error creating site:', err);
                setError('Failed to create site');
              }
            }} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Site Name *
                  </label>
                  <input
                    type="text"
                    value={newSiteName}
                    onChange={(e) => setNewSiteName(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location (optional)
                  </label>
                  <input
                    type="text"
                    value={newSiteLocation}
                    onChange={(e) => setNewSiteLocation(e.target.value)}
                    placeholder="e.g., Building A, Floor 3"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              </div>
              {isSuperAdmin && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Plan Limit (Super Admin only)
                  </label>
                  <input
                    type="number"
                    value={newSitePlanLimit}
                    onChange={(e) => setNewSitePlanLimit(e.target.value)}
                    placeholder="e.g., 100"
                    min="0"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Maximum number of plans allowed for this site (leave empty for no limit)</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={newSiteDescription}
                  onChange={(e) => setNewSiteDescription(e.target.value)}
                  rows={3}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                />
              </div>
              <div className="flex space-x-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                >
                  Create Site
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddSite(false);
                    setNewSiteName('');
                    setNewSiteLocation('');
                    setNewSiteDescription('');
                    setNewSitePlanLimit('');
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
              {selectedCompany ? [selectedCompany].map((company) => (
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
              )) : (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-gray-500">
                    Please select a company from the dropdown above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Sites Management Section */}
        {selectedCompany && (
          <div className="mt-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">
                Sites for {selectedCompany.name}
              </h2>
              <button
                onClick={() => setShowAddSite(true)}
                className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-xs"
              >
                Add Site
              </button>
            </div>
            
            {sitesLoading ? (
              <div className="text-center py-4 text-gray-500">
                Loading sites...
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200">
                  <thead className="bg-green-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Site Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Plan Limit
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
                    {sites.map((site) => (
                      <tr key={site.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {editingSite === site.id && editingField === 'name' ? (
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                onKeyDown={async (e) => {
                                  if (e.key === 'Enter') {
                                    try {
                                      await updateSite(site.id, { name: editingValue.trim() });
                                      await loadSites(selectedCompany.id);
                                      cancelEditing();
                                    } catch (err) {
                                      setError('Failed to update site');
                                    }
                                  } else if (e.key === 'Escape') {
                                    cancelEditing();
                                  }
                                }}
                                className="text-sm font-medium text-gray-900 border border-gray-300 rounded px-2 py-1"
                                autoFocus
                              />
                              <div className="flex space-x-2">
                                <button
                                  onClick={async () => {
                                    try {
                                      await updateSite(site.id, { name: editingValue.trim() });
                                      await loadSites(selectedCompany.id);
                                      cancelEditing();
                                    } catch (err) {
                                      setError('Failed to update site');
                                    }
                                  }}
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
                              onClick={() => startEditing(site.id, 'name', site.name, false)}
                            >
                              {site.name}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {editingSite === site.id && editingField === 'location' ? (
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                onKeyDown={async (e) => {
                                  if (e.key === 'Enter') {
                                    try {
                                      await updateSite(site.id, { location: editingValue.trim() || null });
                                      await loadSites(selectedCompany.id);
                                      cancelEditing();
                                    } catch (err) {
                                      setError('Failed to update site');
                                    }
                                  } else if (e.key === 'Escape') {
                                    cancelEditing();
                                  }
                                }}
                                className="text-sm text-gray-900 border border-gray-300 rounded px-2 py-1"
                                autoFocus
                              />
                              <div className="flex space-x-2">
                                <button
                                  onClick={async () => {
                                    try {
                                      await updateSite(site.id, { location: editingValue.trim() || null });
                                      await loadSites(selectedCompany.id);
                                      cancelEditing();
                                    } catch (err) {
                                      setError('Failed to update site');
                                    }
                                  }}
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
                              onClick={() => startEditing(site.id, 'location', site.location, false)}
                            >
                              {site.location || <span className="italic text-gray-400">No location (click to add)</span>}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {editingSite === site.id && editingField === 'description' ? (
                            <div className="space-y-2">
                              <textarea
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                onKeyDown={async (e) => {
                                  if (e.key === 'Enter' && e.ctrlKey) {
                                    try {
                                      await updateSite(site.id, { description: editingValue.trim() || null });
                                      await loadSites(selectedCompany.id);
                                      cancelEditing();
                                    } catch (err) {
                                      setError('Failed to update site');
                                    }
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
                                  onClick={async () => {
                                    try {
                                      await updateSite(site.id, { description: editingValue.trim() || null });
                                      await loadSites(selectedCompany.id);
                                      cancelEditing();
                                    } catch (err) {
                                      setError('Failed to update site');
                                    }
                                  }}
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
                              onClick={() => startEditing(site.id, 'description', site.description, false)}
                            >
                              {site.description || <span className="italic text-gray-400">No description (click to add)</span>}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {editingSite === site.id && editingField === 'plan_limit' && isSuperAdmin ? (
                            <div className="space-y-2">
                              <input
                                type="number"
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                onKeyDown={async (e) => {
                                  if (e.key === 'Enter') {
                                    try {
                                      const planLimit = editingValue ? parseInt(editingValue) : null;
                                      await updateSite(site.id, { plan_limit: planLimit });
                                      await loadSites(selectedCompany.id);
                                      cancelEditing();
                                    } catch (err) {
                                      setError('Failed to update site plan limit');
                                    }
                                  } else if (e.key === 'Escape') {
                                    cancelEditing();
                                  }
                                }}
                                className="text-sm text-gray-900 border border-gray-300 rounded px-2 py-1 w-20"
                                autoFocus
                                min="0"
                              />
                              <div className="flex space-x-2">
                                <button
                                  onClick={async () => {
                                    try {
                                      const planLimit = editingValue ? parseInt(editingValue) : null;
                                      await updateSite(site.id, { plan_limit: planLimit });
                                      await loadSites(selectedCompany.id);
                                      cancelEditing();
                                    } catch (err) {
                                      setError('Failed to update site plan limit');
                                    }
                                  }}
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
                              className={`text-sm text-gray-900 p-1 rounded ${isSuperAdmin ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                              onClick={() => isSuperAdmin && startEditing(site.id, 'plan_limit', site.plan_limit, false)}
                              title={isSuperAdmin ? 'Click to edit (Super Admin only)' : 'Read only - Super Admin required to edit'}
                            >
                              {site.plan_limit !== null ? site.plan_limit : <span className="italic text-gray-400">No limit set{isSuperAdmin ? ' (click to set)' : ''}</span>}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(site.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          {editingSite === site.id ? (
                            <span className="text-green-600 text-xs">
                              Editing {editingField}...
                            </span>
                          ) : (
                            <>
                              <span className="text-gray-500 text-xs">
                                Click any field to edit
                              </span>
                              <button
                                onClick={async () => {
                                  if (window.confirm(`Are you sure you want to delete site "${site.name}"? This action cannot be undone and will affect all associated users.`)) {
                                    try {
                                      await deleteSite(site.id);
                                      await loadSites(selectedCompany.id);
                                      setError(null);
                                    } catch (err) {
                                      console.error('Error deleting site:', err);
                                      setError('Failed to delete site. Make sure no users are associated with this site.');
                                    }
                                  }
                                }}
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
                
                {sites.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No sites found for {selectedCompany.name}.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanyManagement;