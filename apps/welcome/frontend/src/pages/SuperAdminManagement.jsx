import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { 
  fetchAllRoles,
  updateUserRoleInCompany,
  removeUserRoleFromCompany,
  createUserByEmail,
  supabase
} from '../api';

const SuperAdminManagement = () => {
  const { user } = useAuth();
  const [superAdmins, setSuperAdmins] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [allRoles, setAllRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddSuperAdmin, setShowAddSuperAdmin] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  useEffect(() => {
    loadSuperAdmins();
    loadAllUsers();
    loadAllRoles();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.user-dropdown-container')) {
        setShowUserDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const loadSuperAdmins = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('company_users')
        .select(`
          user_id,
          company_id,
          role_id,
          roles!inner (
            id,
            name
          ),
          users (
            id,
            email,
            full_name,
            created_at
          ),
          companies (
            id,
            name
          )
        `)
        .eq('roles.name', 'super_admin');

      if (error) throw error;

      const superAdminData = data.map(item => ({
        ...item.users,
        company: item.companies,
        role: item.roles
      }));

      setSuperAdmins(superAdminData);
    } catch (err) {
      console.error('Error loading super admins:', err);
      setError('Failed to load super admins');
    } finally {
      setLoading(false);
    }
  };

  const loadAllUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, full_name')
        .order('email');

      if (error) throw error;
      setAllUsers(data || []);
    } catch (err) {
      console.error('Error loading users:', err);
    }
  };

  const loadAllRoles = async () => {
    try {
      const roles = await fetchAllRoles();
      setAllRoles(roles);
    } catch (err) {
      console.error('Error loading roles:', err);
    }
  };

  const getSuperAdminRoleId = () => {
    return allRoles.find(role => role.name === 'super_admin')?.id;
  };

  const handlePromoteToSuperAdmin = async (userId, companyId) => {
    try {
      const superAdminRoleId = getSuperAdminRoleId();
      if (!superAdminRoleId) {
        setError('Super admin role not found');
        return;
      }

      await updateUserRoleInCompany(userId, companyId, superAdminRoleId);
      loadSuperAdmins();
      setError(null);
    } catch (err) {
      setError('Failed to promote user to super admin');
      console.error(err);
    }
  };

  const handleRemoveSuperAdmin = async (userId, companyId) => {
    if (window.confirm('Are you sure you want to remove super admin privileges from this user?')) {
      try {
        await removeUserRoleFromCompany(userId, companyId);
        loadSuperAdmins();
        setError(null);
      } catch (err) {
        setError('Failed to remove super admin privileges');
        console.error(err);
      }
    }
  };

  const handleCreateSuperAdmin = async (e) => {
    e.preventDefault();
    if (!newAdminEmail) {
      setError('Email is required');
      return;
    }

    try {
      const superAdminRoleId = getSuperAdminRoleId();
      if (!superAdminRoleId) {
        setError('Super admin role not found');
        return;
      }

      // For now, we'll use the first company. In a real app, you might want to select a company
      const { data: companies } = await supabase.from('companies').select('id').limit(1);
      if (!companies || companies.length === 0) {
        setError('No companies found');
        return;
      }

      await createUserByEmail(newAdminEmail, companies[0].id, newAdminName, superAdminRoleId);
      loadSuperAdmins();
      setShowAddSuperAdmin(false);
      setNewAdminEmail('');
      setNewAdminName('');
      setError(null);
    } catch (err) {
      if (err.message === 'User is already linked to this company') {
        setError('This user is already linked to a company');
      } else {
        setError(`Failed to create super admin: ${err.message}`);
      }
      console.error(err);
    }
  };

  const getNonSuperAdminUsers = () => {
    const superAdminUserIds = superAdmins.map(sa => sa.id);
    return allUsers.filter(user => !superAdminUserIds.includes(user.id));
  };

  const getFilteredUsers = () => {
    const nonSuperAdmins = getNonSuperAdminUsers();
    if (!userSearchTerm) return nonSuperAdmins;
    
    const searchLower = userSearchTerm.toLowerCase();
    return nonSuperAdmins.filter(user => 
      user.email.toLowerCase().includes(searchLower) ||
      (user.full_name && user.full_name.toLowerCase().includes(searchLower))
    );
  };

  const handleUserSelect = (user) => {
    setSelectedUserId(user.id);
    setUserSearchTerm(user.full_name || user.email);
    setShowUserDropdown(false);
  };

  const handlePromoteExistingUser = async () => {
    if (!selectedUserId) {
      setError('Please select a user');
      return;
    }

    try {
      const superAdminRoleId = getSuperAdminRoleId();
      if (!superAdminRoleId) {
        setError('Super admin role not found');
        return;
      }

      // Get the first company for now
      const { data: companies } = await supabase.from('companies').select('id').limit(1);
      if (!companies || companies.length === 0) {
        setError('No companies found');
        return;
      }

      await updateUserRoleInCompany(selectedUserId, companies[0].id, superAdminRoleId);
      loadSuperAdmins();
      setShowAddSuperAdmin(false);
      setSelectedUserId('');
      setUserSearchTerm('');
      setError(null);
    } catch (err) {
      setError(`Failed to promote user to super admin: ${err.message}`);
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">Super Admin Management</h1>
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
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Super Admin Management</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Add Super Admin Section */}
        <div className="mb-6">
          <button
            onClick={() => setShowAddSuperAdmin(!showAddSuperAdmin)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            {showAddSuperAdmin ? 'Cancel' : 'Add Super Admin'}
          </button>

          {showAddSuperAdmin && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Add Super Admin</h3>
                <p className="text-sm text-gray-600 mb-4">Choose an existing user or create a new one:</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Promote Existing User */}
                  <div className="border border-gray-300 rounded-lg p-4">
                    <h4 className="text-md font-medium text-gray-800 mb-3">Promote Existing User</h4>
                    <div className="relative user-dropdown-container">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Search User *
                      </label>
                      <input
                        type="text"
                        value={userSearchTerm}
                        onChange={(e) => {
                          setUserSearchTerm(e.target.value);
                          setShowUserDropdown(true);
                          setSelectedUserId('');
                        }}
                        onFocus={() => setShowUserDropdown(true)}
                        placeholder="Type name or email..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      
                      {showUserDropdown && getFilteredUsers().length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                          {getFilteredUsers().slice(0, 10).map(user => (
                            <div
                              key={user.id}
                              onClick={() => handleUserSelect(user)}
                              className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                            >
                              <div className="font-medium text-gray-900">
                                {user.full_name || 'No name'}
                              </div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <button
                      type="button"
                      onClick={handlePromoteExistingUser}
                      disabled={!selectedUserId}
                      className="mt-3 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm"
                    >
                      Promote to Super Admin
                    </button>
                  </div>

                  {/* Create New User */}
                  <div className="border border-gray-300 rounded-lg p-4">
                    <h4 className="text-md font-medium text-gray-800 mb-3">Create New User</h4>
                    <form onSubmit={handleCreateSuperAdmin}>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email *
                          </label>
                          <input
                            type="email"
                            value={newAdminEmail}
                            onChange={(e) => setNewAdminEmail(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Full Name
                          </label>
                          <input
                            type="text"
                            value={newAdminName}
                            onChange={(e) => setNewAdminName(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                      
                      <button
                        type="submit"
                        className="mt-3 w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                      >
                        Create Super Admin
                      </button>
                    </form>
                  </div>
                </div>
                
                <div className="mt-4 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddSuperAdmin(false);
                      setNewAdminEmail('');
                      setNewAdminName('');
                      setSelectedUserId('');
                      setUserSearchTerm('');
                      setShowUserDropdown(false);
                      setError(null);
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Super Admins List */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
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
              {superAdmins.map((admin) => (
                <tr key={`${admin.id}-${admin.company?.id}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {admin.full_name || 'No name'}
                      </div>
                      <div className="text-sm text-gray-500">{admin.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {admin.company?.name || 'No company'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                      {admin.role?.name || 'No role'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(admin.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleRemoveSuperAdmin(admin.id, admin.company?.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Remove Super Admin
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {superAdmins.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No super admins found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SuperAdminManagement;