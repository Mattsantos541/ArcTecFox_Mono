import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { 
  fetchUserSites, 
  fetchSiteUsers, 
  fetchAllRoles,
  fetchAllSitesWithCompanies,
  updateUser,
  removeUserFromSite,
  updateUserRoleInSite,
  createUserForSite,
  isUserSiteAdmin,
  getUserAdminSites,
  supabase
} from '../api';

const UserManagement = () => {
  const { user } = useAuth();
  const [sites, setSites] = useState([]);
  const [selectedSite, setSelectedSite] = useState('');
  const [users, setUsers] = useState([]);
  const [allRoles, setAllRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [showAddRole, setShowAddRole] = useState(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [emailSuggestions, setEmailSuggestions] = useState([]);
  const [showEmailSuggestions, setShowEmailSuggestions] = useState(false);
  const [allSystemUsers, setAllSystemUsers] = useState([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // Helper function to convert role names to display labels
  const getRoleDisplayName = (roleName) => {
    switch (roleName) {
      case 'company_admin':
        return 'Admin';
      case 'user':
        return 'User';
      default:
        return 'User'; // Default to User for any other roles
    }
  };

  useEffect(() => {
    loadSites();
    loadAllRoles();
    loadAllSystemUsers();
  }, [user]);

  useEffect(() => {
    if (selectedSite) {
      loadSiteUsers();
    }
  }, [selectedSite]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.email-autocomplete-container')) {
        setShowEmailSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const checkIfUserIsSuperAdmin = async () => {
    try {
      const adminSites = await getUserAdminSites(user.id);
      return adminSites.some(site => site.roles.name === 'super_admin');
    } catch (err) {
      console.error('Error checking super admin status:', err);
      return false;
    }
  };

  const loadSites = async () => {
    try {
      setLoading(true);
      
      // Check if user is super admin
      const userIsSuperAdmin = await checkIfUserIsSuperAdmin();
      const isAdmin = await isUserSiteAdmin(user.id);
      setIsSuperAdmin(userIsSuperAdmin);
      
      if (!isAdmin) {
        setError('You do not have permission to manage users');
        setLoading(false);
        return;
      }

      let sitesData;
      if (userIsSuperAdmin) {
        // Super admin sees all sites
        sitesData = await fetchAllSitesWithCompanies();
      } else {
        // Regular admins see only their assigned sites
        const adminSites = await getUserAdminSites(user.id);
        sitesData = adminSites.map(adminSite => ({
          id: adminSite.sites.id,
          name: adminSite.sites.name,
          companies: adminSite.sites.companies
        }));
      }
      
      setSites(sitesData);
      if (sitesData.length > 0) {
        setSelectedSite(sitesData[0].id);
      } else {
        setSelectedSite('');
        setUsers([]);
      }
    } catch (err) {
      setError('Failed to load sites');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadAllRoles = async () => {
    try {
      const rolesData = await fetchAllRoles();
      setAllRoles(rolesData);
    } catch (err) {
      setError('Failed to load roles');
      console.error(err);
    }
  };

  const loadAllSystemUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, full_name')
        .order('email');

      if (error) throw error;
      setAllSystemUsers(data || []);
    } catch (err) {
      console.error('Error loading system users:', err);
    }
  };

  const handleEmailChange = (value) => {
    setNewUserEmail(value);
    
    if (value.length >= 3) {
      const currentSiteUserEmails = users.map(u => u.email);
      const filtered = allSystemUsers
        .filter(user => 
          user.email.toLowerCase().includes(value.toLowerCase()) &&
          !currentSiteUserEmails.includes(user.email)
        )
        .slice(0, 5);
      
      setEmailSuggestions(filtered);
      setShowEmailSuggestions(filtered.length > 0);
    } else {
      setEmailSuggestions([]);
      setShowEmailSuggestions(false);
    }
  };

  const handleEmailSuggestionSelect = (suggestion) => {
    setNewUserEmail(suggestion.email);
    setNewUserName(suggestion.full_name || '');
    setEmailSuggestions([]);
    setShowEmailSuggestions(false);
  };

  const loadSiteUsers = async () => {
    if (!selectedSite) return;
    
    setLoading(true);
    try {
      const usersData = await fetchSiteUsers(selectedSite);
      setUsers(usersData);
      setError(null);
    } catch (err) {
      setError(`Failed to load users: ${err.message}`);
      console.error('Error loading site users:', err);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRole = async (userId, roleId) => {
    try {
      await updateUserRoleInSite(userId, selectedSite, roleId);
      loadSiteUsers();
      setShowAddRole(null);
      setError(null);
    } catch (err) {
      setError('Failed to add role');
      console.error(err);
    }
  };

  const handleRemoveRole = async (userId) => {
    try {
      await updateUserRoleInSite(userId, selectedSite, null);
      loadSiteUsers();
      setError(null);
    } catch (err) {
      setError('Failed to remove role');
      console.error(err);
    }
  };

  const handleUpdateUser = async (userId, updates) => {
    try {
      await updateUser(userId, updates);
      loadSiteUsers();
      setEditingUser(null);
    } catch (err) {
      setError('Failed to update user');
      console.error(err);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to remove this user from the site?')) {
      try {
        await removeUserFromSite(userId, selectedSite);
        loadSiteUsers();
        setError(null);
      } catch (err) {
        setError('Failed to remove user from site');
        console.error(err);
      }
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUserEmail || !selectedSite) {
      setError('Email and site are required');
      return;
    }

    try {
      await createUserForSite(newUserEmail, selectedSite, newUserName);
      loadSiteUsers();
      setShowAddUser(false);
      setNewUserEmail('');
      setNewUserName('');
      setEmailSuggestions([]);
      setShowEmailSuggestions(false);
      setError(null);
    } catch (err) {
      if (err.message === 'User is already linked to this site') {
        setError('This user is already a member of the selected site');
      } else {
        setError(`Failed to create user: ${err.message}`);
      }
      console.error(err);
    }
  };

  const getSelectedSiteInfo = () => {
    const site = sites.find(s => s.id === selectedSite);
    return site ? `${site.companies.name} - ${site.name}` : '';
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">User Management</h1>
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
          <h1 className="text-2xl font-bold text-gray-800 mb-6">User Management</h1>
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
            <h1 className="text-2xl font-bold text-gray-800">User Management</h1>
            <p className="text-sm text-gray-600 mt-1">
              {isSuperAdmin ? 'Manage users across all sites' : 'Manage users for your assigned sites'}
            </p>
          </div>
        </div>

        {error && !error.includes('permission') && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Site Selection */}
        <div className="mb-6 flex items-center space-x-4">
          <div className="flex-1">
            <label htmlFor="site-select" className="block text-sm font-medium text-gray-700 mb-2">
              Select Site to Manage Users
            </label>
            <select
              id="site-select"
              value={selectedSite}
              onChange={(e) => setSelectedSite(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a site...</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.companies.name} - {site.name}
                </option>
              ))}
            </select>
          </div>
          {selectedSite && (
            <button
              onClick={() => setShowAddUser(true)}
              className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              Add User
            </button>
          )}
        </div>

        {/* Add User Form */}
        {showAddUser && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border">
            <h3 className="text-lg font-medium text-gray-800 mb-4">
              Add User to {getSelectedSiteInfo()}
            </h3>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="email-autocomplete-container">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={newUserEmail}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    onFocus={() => newUserEmail.length >= 3 && setShowEmailSuggestions(emailSuggestions.length > 0)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                  {showEmailSuggestions && emailSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1 max-h-60 overflow-y-auto">
                      {emailSuggestions.map((suggestion, index) => (
                        <div
                          key={index}
                          className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                          onClick={() => handleEmailSuggestionSelect(suggestion)}
                        >
                          <div className="font-medium text-sm text-gray-900">{suggestion.email}</div>
                          {suggestion.full_name && (
                            <div className="text-xs text-gray-600">{suggestion.full_name}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name (optional)
                  </label>
                  <input
                    type="text"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                >
                  Add User
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddUser(false);
                    setNewUserEmail('');
                    setNewUserName('');
                    setEmailSuggestions([]);
                    setShowEmailSuggestions(false);
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

        {/* Users Table */}
        {selectedSite && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">
                Users in {getSelectedSiteInfo()}
              </h2>
              <div className="text-sm text-gray-600">
                {users.length} user{users.length !== 1 ? 's' : ''}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Joined
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((userData) => (
                    <tr key={userData.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {userData.full_name || userData.email}
                          </div>
                          <div className="text-sm text-gray-500">{userData.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {showAddRole === userData.id ? (
                          <div className="flex space-x-2">
                            <select
                              onChange={(e) => {
                                if (e.target.value) {
                                  handleAddRole(userData.id, e.target.value);
                                }
                              }}
                              className="text-sm border border-gray-300 rounded px-2 py-1"
                            >
                              <option value="">Select role...</option>
                              {allRoles.filter(role => role.name !== 'super_admin').map((role) => (
                                <option key={role.id} value={role.id}>
                                  {getRoleDisplayName(role.name)}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => setShowAddRole(null)}
                              className="text-gray-600 hover:text-gray-800"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            {userData.roles && userData.roles.length > 0 ? (
                              <div className="flex items-center space-x-2">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {getRoleDisplayName(userData.roles[0])}
                                </span>
                                <button
                                  onClick={() => handleRemoveRole(userData.id)}
                                  className="text-red-600 hover:text-red-800 text-xs"
                                >
                                  Remove
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setShowAddRole(userData.id)}
                                className="text-blue-600 hover:text-blue-800 text-sm"
                              >
                                Add Role
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(userData.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleDeleteUser(userData.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Remove from Site
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {users.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No users found for this site.
                </div>
              )}
            </div>
          </div>
        )}

        {!selectedSite && sites.length > 0 && (
          <div className="text-center py-8 text-gray-500">
            Please select a site to view and manage users.
          </div>
        )}

        {sites.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No sites available for user management.
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagement;