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
  addExistingUserToSite,
  searchCompanyUsers,
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
  
  // Dual-track user management states
  const [addUserMode, setAddUserMode] = useState('existing'); // 'invitation' or 'existing' - default to existing since invitation is under construction
  const [searchTerm, setSearchTerm] = useState('');
  const [companyUsers, setCompanyUsers] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedExistingUser, setSelectedExistingUser] = useState(null);

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

  // Search for existing users within the company
  const handleSearchExistingUsers = async (term) => {
    setSearchTerm(term);
    
    if (term.length >= 2 && selectedSite) {
      setIsSearching(true);
      try {
        const results = await searchCompanyUsers(selectedSite, term);
        setSearchResults(results.users);
        setError(null);
      } catch (err) {
        console.error('Error searching users:', err);
        setError(`Failed to search users: ${err.message}`);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  };

  // Handle adding an existing user
  const handleAddExistingUser = async (selectedUser) => {
    if (!selectedUser || !selectedSite) {
      setError('User and site are required');
      return;
    }

    try {
      setError(null);
      await addExistingUserToSite(selectedUser.email, selectedSite);
      
      // Reload site users and reset form
      loadSiteUsers();
      setAddUserMode('invitation');
      setSearchTerm('');
      setSearchResults([]);
      setSelectedExistingUser(null);
      setShowAddUser(false);
    } catch (err) {
      if (err.message.includes('already a member')) {
        setError('This user is already a member of the selected site');
      } else if (err.message.includes('different company')) {
        setError('This user belongs to a different company and cannot be added');
      } else {
        setError(`Failed to add user: ${err.message}`);
      }
      console.error(err);
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

  const handleUpdateCanEdit = async (siteUserId, canEdit) => {
    try {
      // Find the user data to get the user_id
      const userData = users.find(u => u.id === siteUserId);
      if (!userData) {
        setError('User not found');
        return;
      }

      // Update the can_edit field in the site_users table
      const { error } = await supabase
        .from('site_users')
        .update({ can_edit: canEdit })
        .eq('id', siteUserId);

      if (error) throw error;

      // Reload the users to reflect the change
      loadSiteUsers();
      setError(null);
    } catch (err) {
      setError('Failed to update edit permission');
      console.error(err);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUserEmail || !selectedSite) {
      setError('Email and site are required');
      return;
    }

    // TEMPORARY: Email system under construction
    setError('🚧 Email invitations are currently under construction. Please use the "Add Existing User" option or contact your administrator to add new users manually.');
    return;

    /* DISABLED TEMPORARILY - Will be re-enabled when email is configured
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
      if (err.message === 'User is already a member of this site') {
        setError('This user is already a member of the selected site');
      } else if (err.message === 'An invitation has already been sent to this email for this site') {
        setError('An invitation has already been sent to this email address');
      } else {
        setError(`Failed to send invitation: ${err.message}`);
      }
      console.error(err);
    }
    */
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
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-800">
                Add User to {getSelectedSiteInfo()}
              </h3>
              
              {/* Track Selection Toggle */}
              <div className="flex bg-white rounded-lg border border-gray-200 overflow-hidden">
                <button
                  type="button"
                  onClick={() => {
                    setAddUserMode('existing');
                    setNewUserEmail('');
                    setNewUserName('');
                    setEmailSuggestions([]);
                    setShowEmailSuggestions(false);
                    setError(null);
                  }}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    addUserMode === 'existing'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Add Existing User
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAddUserMode('invitation');
                    setSearchTerm('');
                    setSearchResults([]);
                    setSelectedExistingUser(null);
                    setError(null);
                  }}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    addUserMode === 'invitation'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Send Invitation
                </button>
              </div>
            </div>
            {/* Mode-specific instructions */}
            {addUserMode === 'invitation' ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
                <p className="text-sm text-yellow-800">
                  <strong>🚧 Email Invitations - Under Construction</strong><br/>
                  The invitation email system is currently being configured. For now, please add new users manually or contact your administrator.
                  This feature will be available soon.
                </p>
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-md p-3 mb-4">
                <p className="text-sm text-green-800">
                  <strong>Existing User Track:</strong> Search and add users who already have accounts within your company. 
                  No email required - they get immediate access to this site.
                </p>
              </div>
            )}
            
            {/* Conditional form content based on mode */}
            {addUserMode === 'existing' ? (
              /* TRACK 2: EXISTING USER SEARCH */
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Search Existing Users in Company
                  </label>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => handleSearchExistingUsers(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                    placeholder="Type name or email to search..."
                  />
                  {isSearching && (
                    <p className="text-sm text-gray-500 mt-1">Searching...</p>
                  )}
                </div>
                
                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="border border-gray-200 rounded-md max-h-60 overflow-y-auto">
                    {searchResults.map((user) => (
                      <div
                        key={user.id}
                        className="p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 cursor-pointer"
                        onClick={() => handleAddExistingUser(user)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-gray-900">{user.full_name || user.email}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddExistingUser(user);
                            }}
                            className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                          >
                            Add User
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {searchTerm.length >= 2 && searchResults.length === 0 && !isSearching && (
                  <p className="text-sm text-gray-500">No matching users found in your company.</p>
                )}
                
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddUser(false);
                      setAddUserMode('invitation');
                      setSearchTerm('');
                      setSearchResults([]);
                      setSelectedExistingUser(null);
                      setError(null);
                    }}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              /* TRACK 1: INVITATION FORM (EXISTING) */
              <div className="space-y-4">
                {/* Test button for development - DISABLED while email system is under construction */}
                <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                  <button
                    type="button"
                    disabled
                    onClick={async () => {
                      try {
                        setError(null);
                        console.log('🧪 Frontend: Starting test email request...');
                        
                        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
                        console.log('🧪 Frontend: Using backend URL:', backendUrl);
                        
                        // Get auth token for backend call
                        const { data: { session } } = await supabase.auth.getSession();
                        if (!session) {
                          throw new Error('Authentication required');
                        }

                        const response = await fetch(`${backendUrl}/api/send-test-invitation`, {
                          method: 'POST',
                          headers: { 
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${session.access_token}`,
                          },
                          body: JSON.stringify({
                            email: 'willisreed17@gmail.com',
                            full_name: 'Willis Reed (Test)',
                            site_name: 'Test Site',
                            company_name: 'Test Company',
                            invitation_token: 'test-token-12345'
                          })
                        });
                        
                        console.log('🧪 Frontend: Response status:', response.status);
                        console.log('🧪 Frontend: Response ok:', response.ok);
                        
                        if (response.ok) {
                          const result = await response.json();
                          console.log('🧪 Frontend: Success response:', result);
                          setError(`✅ Test email processed! Details: ${JSON.stringify(result.details, null, 2)}`);
                        } else {
                          const errorText = await response.text();
                          console.error('🧪 Frontend: Error response:', errorText);
                          throw new Error(`HTTP ${response.status}: ${errorText}`);
                        }
                      } catch (err) {
                        console.error('🧪 Frontend: Exception:', err);
                        setError(`Test email failed: ${err.message}. Check console and backend logs for details.`);
                      }
                    }}
                    className="px-3 py-1 bg-gray-400 text-white text-xs rounded cursor-not-allowed"
                  >
                    🚧 Test Email (Under Construction)
                  </button>
                </div>
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
                    placeholder="Enter email to invite..."
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
                    placeholder="Enter recipient's name for the email"
                  />
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  type="submit"
                  disabled
                  className="px-4 py-2 bg-gray-400 text-white rounded-lg cursor-not-allowed text-sm"
                >
                  🚧 Send Invitation (Under Construction)
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
                      Can Edit
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
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={userData.can_edit || false}
                          onChange={(e) => handleUpdateCanEdit(userData.id, e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
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