import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { 
  fetchUserCompanies, 
  fetchCompanyUsers, 
  fetchAllRoles, 
  addUserRole, 
  removeUserRole, 
  updateUser, 
  deleteUser,
  removeUserFromCompany,
  updateUserRoleInCompany,
  removeUserRoleFromCompany,
  createUserByEmail,
  checkUserDataStructure,
  migrateUserToNewStructure,
  supabase
} from '../api';

const UserManagement = () => {
  const { user } = useAuth();
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
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

  useEffect(() => {
    loadCompanies();
    loadAllRoles();
    loadAllSystemUsers();
  }, [user]);

  useEffect(() => {
    if (selectedCompany) {
      loadCompanyUsers();
    }
  }, [selectedCompany]);

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
      const { data, error } = await supabase
        .from('company_users')
        .select(`
          roles!inner (
            name
          )
        `)
        .eq('user_id', user.id)
        .eq('roles.name', 'super_admin');

      if (error) throw error;
      return data && data.length > 0;
    } catch (err) {
      console.error('Error checking super admin status:', err);
      return false;
    }
  };

  const loadAllCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name')
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error loading all companies:', err);
      return [];
    }
  };

  const loadCompanies = async () => {
    try {
      setLoading(true);
      
      // Check if user is super admin
      const userIsSuperAdmin = await checkIfUserIsSuperAdmin();
      setIsSuperAdmin(userIsSuperAdmin);
      
      let companiesData;
      if (userIsSuperAdmin) {
        // Super admin sees all companies
        companiesData = await loadAllCompanies();
      } else {
        // Regular users see only their assigned companies
        companiesData = await fetchUserCompanies(user.id);
      }
      
      setCompanies(companiesData);
      if (companiesData.length > 0) {
        setSelectedCompany(companiesData[0].id);
      } else {
        setSelectedCompany('');
        setUsers([]);
      }
    } catch (err) {
      setError('Failed to load companies');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckUserData = async () => {
    try {
      const result = await checkUserDataStructure(user.id);
      console.log('User data structure check result:', result);
    } catch (err) {
      console.error('Error checking user data:', err);
    }
  };

  const handleMigrateUser = async () => {
    try {
      setLoading(true);
      const result = await migrateUserToNewStructure(user.id);
      console.log('Migration result:', result);
      if (result) {
        setError('Migration successful! Reloading companies...');
        // Reload companies after migration
        await loadCompanies();
      } else {
        setError('No migration needed or migration failed');
      }
    } catch (err) {
      console.error('Error migrating user:', err);
      setError(`Failed to migrate user data: ${err.message}`);
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
      const currentCompanyUserEmails = users.map(u => u.email);
      const filtered = allSystemUsers
        .filter(user => 
          user.email.toLowerCase().includes(value.toLowerCase()) &&
          !currentCompanyUserEmails.includes(user.email)
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

  const loadCompanyUsers = async () => {
    if (!selectedCompany) return;
    
    setLoading(true);
    try {
      const usersData = await fetchCompanyUsers(selectedCompany);
      setUsers(usersData);
      setError(null); // Clear any previous errors
    } catch (err) {
      setError(`Failed to load users: ${err.message}`);
      console.error('Error loading company users:', err);
      setUsers([]); // Reset users on error
    } finally {
      setLoading(false);
    }
  };

  const handleAddRole = async (userId, roleId) => {
    try {
      await updateUserRoleInCompany(userId, selectedCompany, roleId);
      loadCompanyUsers();
      setShowAddRole(null);
      setError(null);
    } catch (err) {
      setError('Failed to add role');
      console.error(err);
    }
  };

  const handleRemoveRole = async (userId, roleId) => {
    try {
      await removeUserRoleFromCompany(userId, selectedCompany);
      loadCompanyUsers();
      setError(null);
    } catch (err) {
      setError('Failed to remove role');
      console.error(err);
    }
  };

  const handleUpdateUser = async (userId, updates) => {
    try {
      await updateUser(userId, updates);
      loadCompanyUsers();
      setEditingUser(null);
    } catch (err) {
      setError('Failed to update user');
      console.error(err);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to remove this user from the company?')) {
      try {
        await removeUserFromCompany(userId, selectedCompany);
        loadCompanyUsers();
        setError(null);
      } catch (err) {
        setError('Failed to remove user from company');
        console.error(err);
      }
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUserEmail || !selectedCompany) {
      setError('Email and company are required');
      return;
    }

    try {
      await createUserByEmail(newUserEmail, selectedCompany, newUserName);
      loadCompanyUsers();
      setShowAddUser(false);
      setNewUserEmail('');
      setNewUserName('');
      setEmailSuggestions([]);
      setShowEmailSuggestions(false);
      setError(null);
    } catch (err) {
      if (err.message === 'User is already linked to this company') {
        setError('This user is already a member of the selected company');
      } else {
        setError(`Failed to create user: ${err.message}`);
      }
      console.error(err);
    }
  };

  const getUserAvailableRoles = (userId) => {
    const userRoles = users.find(u => u.id === userId)?.roles || [];
    // Only show 'user' and 'company_admin' roles in the dropdown
    return allRoles.filter(role => 
      (role.name === 'user' || role.name === 'company_admin') && 
      !userRoles.includes(role.name)
    );
  };

  const getRoleIdByName = (roleName) => {
    return allRoles.find(role => role.name === roleName)?.id;
  };

  const getFriendlyRoleName = (roleName) => {
    switch (roleName) {
      case 'user':
        return 'User';
      case 'company_admin':
        return 'Admin';
      case 'super_admin':
        return 'Super Admin';
      default:
        return roleName;
    }
  };

  if (loading && companies.length === 0) {
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

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">User Management</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}


        {/* Company Selection */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Select Company
            </label>
            {isSuperAdmin && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                Super Admin - All Companies
              </span>
            )}
          </div>
          {companies.length === 0 ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">No companies found for this user. Please use the migration tools above to fix this issue.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <select
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="block w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a company</option>
                {companies.map(company => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
              {isSuperAdmin && companies.length > 0 && (
                <p className="text-xs text-gray-600 max-w-xs">
                  As a Super Admin, you can view and manage users for all {companies.length} companies in the system.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Add User Button */}
        {selectedCompany && (
          <div className="mb-4 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800">
              Users for {companies.find(c => c.id === selectedCompany)?.name}
            </h2>
            <button
              onClick={() => setShowAddUser(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              Add User
            </button>
          </div>
        )}

        {/* Add User Form */}
        {showAddUser && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Add New User</h3>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="relative email-autocomplete-container">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  onFocus={() => newUserEmail.length >= 3 && setShowEmailSuggestions(emailSuggestions.length > 0)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Type email to search existing users..."
                  required
                />
                
                {showEmailSuggestions && emailSuggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                    <div className="px-3 py-2 text-xs text-gray-500 bg-gray-50 border-b">
                      Existing users:
                    </div>
                    {emailSuggestions.map(suggestion => (
                      <div
                        key={suggestion.id}
                        onClick={() => handleEmailSuggestionSelect(suggestion)}
                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                      >
                        <div className="font-medium text-gray-900">{suggestion.email}</div>
                        {suggestion.full_name && (
                          <div className="text-sm text-gray-500">{suggestion.full_name}</div>
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
        {selectedCompany && (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Roles
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map(userData => (
                  <tr key={userData.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingUser === userData.id ? (
                        <input
                          type="text"
                          defaultValue={userData.full_name || ''}
                          className="border rounded px-2 py-1 w-full"
                          onBlur={(e) => handleUpdateUser(userData.id, { full_name: e.target.value })}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleUpdateUser(userData.id, { full_name: e.target.value });
                            }
                          }}
                        />
                      ) : (
                        <div className="text-sm font-medium text-gray-900">
                          {userData.full_name || 'No name'}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{userData.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {userData.roles.map(role => (
                          <span
                            key={role}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            {getFriendlyRoleName(role)}
                            <button
                              onClick={() => handleRemoveRole(userData.id, getRoleIdByName(role))}
                              className="ml-1 text-blue-600 hover:text-blue-800"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                        {showAddRole === userData.id ? (
                          <select
                            onChange={(e) => handleAddRole(userData.id, e.target.value)}
                            className="text-xs border rounded px-1 py-1"
                          >
                            <option value="">Add role...</option>
                            {getUserAvailableRoles(userData.id).map(role => (
                              <option key={role.id} value={role.id}>
                                {getFriendlyRoleName(role.name)}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <button
                            onClick={() => setShowAddRole(userData.id)}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 hover:bg-gray-200"
                          >
                            + Add Role
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => setEditingUser(editingUser === userData.id ? null : userData.id)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        {editingUser === userData.id ? 'Cancel' : 'Edit'}
                      </button>
                      <button
                        onClick={() => handleDeleteUser(userData.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selectedCompany && users.length === 0 && !loading && (
          <div className="text-center py-8 text-gray-500">
            No users found for this company.
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagement;