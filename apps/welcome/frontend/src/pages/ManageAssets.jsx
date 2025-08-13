import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { 
  supabase, 
  isUserSiteAdmin, 
  getUserAdminSites
} from '../api';
import FileUpload from '../components/forms/FileUpload';
import { createStorageService } from '../services/storageService';

const ManageAssets = () => {
  const { user } = useAuth();
  const [parentAssets, setParentAssets] = useState([]);
  const [childAssets, setChildAssets] = useState([]);
  const [selectedParentAsset, setSelectedParentAsset] = useState(null);
  const [sites, setSites] = useState([]);
  const [userSites, setUserSites] = useState([]);
  const [assetCategories, setAssetCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [childAssetsLoading, setChildAssetsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingParentAsset, setEditingParentAsset] = useState(null);
  const [editingChildAsset, setEditingChildAsset] = useState(null);
  const [editingParentData, setEditingParentData] = useState({});
  const [editingChildData, setEditingChildData] = useState({});
  const [showAddParentAsset, setShowAddParentAsset] = useState(false);
  const [showAddChildAsset, setShowAddChildAsset] = useState(false);
  const [newParentAsset, setNewParentAsset] = useState({
    name: '',
    make: '',
    model: '',
    serial_number: '',
    category: '',
    purchase_date: '',
    install_date: '',
    notes: '',
    site_id: ''
  });
  const [newChildAsset, setNewChildAsset] = useState({
    name: '',
    make: '',
    model: '',
    serial_number: '',
    category: '',
    purchase_date: '',
    install_date: '',
    notes: ''
  });
  const [parentManualFile, setParentManualFile] = useState(null);
  const [childManualFile, setChildManualFile] = useState(null);
  const [parentFileUploadError, setParentFileUploadError] = useState(null);
  const [childFileUploadError, setChildFileUploadError] = useState(null);
  const [uploadingParentFile, setUploadingParentFile] = useState(false);
  const [uploadingChildFile, setUploadingChildFile] = useState(false);
  const [loadedManuals, setLoadedManuals] = useState({});
  const [showManualModal, setShowManualModal] = useState(false);
  const [modalAssetId, setModalAssetId] = useState(null);
  const [modalAssetName, setModalAssetName] = useState('');
  const [modalIsParent, setModalIsParent] = useState(true);
  const [modalManualFile, setModalManualFile] = useState(null);
  const [modalFileUploadError, setModalFileUploadError] = useState(null);
  const [uploadingModalFile, setUploadingModalFile] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editModalData, setEditModalData] = useState({});
  const [editModalIsParent, setEditModalIsParent] = useState(true);
  const [editModalFile, setEditModalFile] = useState(null);
  const [editModalFileError, setEditModalFileError] = useState(null);
  const [uploadingEditModalFile, setUploadingEditModalFile] = useState(false);

  useEffect(() => {
    initializeComponent();
  }, [user]);

  const initializeComponent = async () => {
    await checkUserPermissions();
    await loadAssetCategories();
  };

  const loadAssetCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('dim_assets')
        .select('*')
        .order('asset_name');

      if (error) throw error;
      setAssetCategories(data || []);
    } catch (err) {
      console.error('Error loading asset categories:', err);
    }
  };

  const checkUserPermissions = async () => {
    try {
      const isAdmin = await isUserSiteAdmin(user.id);
      const adminSites = await getUserAdminSites(user.id);
      
      if (!isAdmin) {
        setError('You do not have permission to manage assets');
        setLoading(false);
        return;
      }

      const sitesList = adminSites.map(item => ({
        id: item.sites.id,
        name: `${item.sites?.companies?.name || 'Unknown Company'} - ${item.sites?.name || 'Unknown Site'}`,
        company_id: item.sites?.companies?.id
      }));
      setUserSites(sitesList);

      if (sitesList.length === 1) {
        setNewParentAsset(prev => ({ ...prev, site_id: sitesList[0].id }));
      }

      await loadParentAssets(sitesList);
    } catch (err) {
      console.error('Error checking permissions:', err);
      setError('Failed to verify permissions');
      setLoading(false);
    }
  };

  const loadParentAssets = async (sitesList = userSites) => {
    try {
      setLoading(true);
      
      const siteIds = sitesList.map(site => site.id);
      
      const { data, error } = await supabase
        .from('parent_assets')
        .select(`
          *,
          sites:site_id (
            id,
            name,
            companies (
              id,
              name
            )
          )
        `)
        .in('site_id', siteIds)
        .neq('status', 'deleted')
        .order('name');

      if (error) throw error;
      setParentAssets(data || []);
    } catch (err) {
      console.error('Error loading parent assets:', err);
      setError('Failed to load parent assets');
    } finally {
      setLoading(false);
    }
  };

  const loadChildAssets = async (parentAssetId) => {
    try {
      setChildAssetsLoading(true);
      
      const { data, error } = await supabase
        .from('child_assets')
        .select('*')
        .eq('parent_asset_id', parentAssetId)
        .neq('status', 'deleted')
        .order('name');

      if (error) throw error;
      setChildAssets(data || []);
      
      // Load manuals for child assets
      await loadManuals(null, parentAssetId);
    } catch (err) {
      console.error('Error loading child assets:', err);
      setError('Failed to load child assets');
    } finally {
      setChildAssetsLoading(false);
    }
  };

  const loadManuals = async (parentAssetId = null, childAssetId = null) => {
    try {
      let query = supabase.from('loaded_manuals').select('*');
      
      if (parentAssetId) {
        query = query.eq('parent_asset_id', parentAssetId);
      } else if (childAssetId) {
        // Load all manuals for child assets of this parent
        const childAssetIds = childAssets.map(asset => asset.id);
        if (childAssetIds.length > 0) {
          query = query.in('child_asset_id', childAssetIds);
        } else {
          return;
        }
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      // Group manuals by asset ID
      const manualsByAsset = {};
      data?.forEach(manual => {
        const assetId = manual.parent_asset_id || manual.child_asset_id;
        if (!manualsByAsset[assetId]) {
          manualsByAsset[assetId] = [];
        }
        manualsByAsset[assetId].push(manual);
      });
      
      setLoadedManuals(prev => ({ ...prev, ...manualsByAsset }));
    } catch (err) {
      console.error('Error loading manuals:', err);
    }
  };

  const handleParentAssetSelect = async (asset) => {
    setSelectedParentAsset(asset);
    await loadChildAssets(asset.id);
    await loadManuals(asset.id);
  };

  const handleParentFileSelect = (file, error) => {
    setParentManualFile(file);
    setParentFileUploadError(error);
  };

  const handleChildFileSelect = (file, error) => {
    setChildManualFile(file);
    setChildFileUploadError(error);
  };

  const uploadManualForAsset = async (file, assetName, assetId, isParent = true, isModal = false, isEditModal = false) => {
    if (!file || !user) return null;
    
    try {
      if (isModal) {
        setUploadingModalFile(true);
      } else if (isEditModal) {
        setUploadingEditModalFile(true);
      } else if (isParent) {
        setUploadingParentFile(true);
      } else {
        setUploadingChildFile(true);
      }
      
      const storageService = await createStorageService();
      const result = await storageService.uploadUserManual(file, assetName, user.id);
      
      if (result.success) {
        // Save file metadata to loaded_manuals table
        const manualData = {
          [isParent ? 'parent_asset_id' : 'child_asset_id']: assetId,
          file_path: result.filePath,
          file_name: result.fileName,
          original_name: result.originalName,
          file_size: result.fileSize.toString(),
          file_type: result.fileType
        };
        
        const { data, error } = await supabase
          .from('loaded_manuals')
          .insert([manualData])
          .select();
        
        if (error) throw error;
        
        // Update local state
        setLoadedManuals(prev => ({
          ...prev,
          [assetId]: [...(prev[assetId] || []), data[0]]
        }));
        
        return result;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error uploading manual:', error);
      if (isModal) {
        setModalFileUploadError(`Failed to upload manual: ${error.message}`);
      } else if (isEditModal) {
        setEditModalFileError(`Failed to upload manual: ${error.message}`);
      } else if (isParent) {
        setParentFileUploadError(`Failed to upload manual: ${error.message}`);
      } else {
        setChildFileUploadError(`Failed to upload manual: ${error.message}`);
      }
      return null;
    } finally {
      if (isModal) {
        setUploadingModalFile(false);
      } else if (isEditModal) {
        setUploadingEditModalFile(false);
      } else if (isParent) {
        setUploadingParentFile(false);
      } else {
        setUploadingChildFile(false);
      }
    }
  };

  const handleCreateParentAsset = async (e) => {
    e.preventDefault();
    
    if (userSites.length === 0) {
      setError('You do not have access to any sites');
      return;
    }

    if (!newParentAsset.name.trim()) {
      setError('Asset name is required');
      return;
    }

    if (!newParentAsset.site_id) {
      setError('Site selection is required');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('parent_assets')
        .insert([{
          ...newParentAsset,
          status: 'active',
          created_by: user.id
        }])
        .select();

      if (error) throw error;

      const createdAsset = data[0];
      
      // Upload manual if provided
      if (parentManualFile) {
        await uploadManualForAsset(parentManualFile, newParentAsset.name, createdAsset.id, true);
      }

      await loadParentAssets();
      setShowAddParentAsset(false);
      setNewParentAsset({
        name: '',
        make: '',
        model: '',
        serial_number: '',
        category: '',
        purchase_date: '',
        install_date: '',
        notes: '',
        site_id: userSites.length === 1 ? userSites[0].id : ''
      });
      setParentManualFile(null);
      setParentFileUploadError(null);
      setError(null);
    } catch (err) {
      console.error('Error creating parent asset:', err);
      setError('Failed to create parent asset');
    }
  };

  const handleCreateChildAsset = async (e) => {
    e.preventDefault();
    
    if (!selectedParentAsset) {
      setError('Please select a parent asset first');
      return;
    }

    if (!newChildAsset.name.trim()) {
      setError('Asset name is required');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('child_assets')
        .insert([{
          ...newChildAsset,
          parent_asset_id: selectedParentAsset.id,
          status: 'active',
          created_by: user.id
        }])
        .select();

      if (error) throw error;

      const createdAsset = data[0];
      
      // Upload manual if provided
      if (childManualFile) {
        await uploadManualForAsset(childManualFile, newChildAsset.name, createdAsset.id, false);
      }

      await loadChildAssets(selectedParentAsset.id);
      setShowAddChildAsset(false);
      setNewChildAsset({
        name: '',
        make: '',
        model: '',
        serial_number: '',
        category: '',
        purchase_date: '',
        install_date: '',
        notes: ''
      });
      setChildManualFile(null);
      setChildFileUploadError(null);
      setError(null);
    } catch (err) {
      console.error('Error creating child asset:', err);
      setError('Failed to create child asset');
    }
  };

  const handleUpdateParentAsset = async (assetId, updates = null) => {
    try {
      const dataToUpdate = updates || editingParentData;
      const { error } = await supabase
        .from('parent_assets')
        .update({
          ...dataToUpdate,
          updated_by: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', assetId);

      if (error) throw error;

      await loadParentAssets();
      if (!updates) {
        // Only reset inline editing state if not called from modal
        setEditingParentAsset(null);
        setEditingParentData({});
      }
      setError(null);
    } catch (err) {
      console.error('Error updating parent asset:', err);
      setError('Failed to update parent asset');
    }
  };

  const handleUpdateChildAsset = async (assetId, updates = null) => {
    try {
      const dataToUpdate = updates || editingChildData;
      const { error } = await supabase
        .from('child_assets')
        .update({
          ...dataToUpdate,
          updated_by: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', assetId);

      if (error) throw error;

      await loadChildAssets(selectedParentAsset.id);
      if (!updates) {
        // Only reset inline editing state if not called from modal
        setEditingChildAsset(null);
        setEditingChildData({});
      }
      setError(null);
    } catch (err) {
      console.error('Error updating child asset:', err);
      setError('Failed to update child asset');
    }
  };

  const handleDeleteManual = async (manualId, assetId) => {
    if (!confirm('Are you sure you want to delete this manual?')) {
      return;
    }

    try {
      // Get manual details before deleting
      const { data: manual, error: fetchError } = await supabase
        .from('loaded_manuals')
        .select('file_path')
        .eq('id', manualId)
        .single();

      if (fetchError) throw fetchError;

      // Delete from storage
      const storageService = await createStorageService();
      await storageService.deleteUserManual(manual.file_path);

      // Delete from database
      const { error } = await supabase
        .from('loaded_manuals')
        .delete()
        .eq('id', manualId);

      if (error) throw error;

      // Update local state
      setLoadedManuals(prev => ({
        ...prev,
        [assetId]: prev[assetId]?.filter(m => m.id !== manualId) || []
      }));

      setError(null);
    } catch (err) {
      console.error('Error deleting manual:', err);
      setError('Failed to delete manual');
    }
  };

  const getSignedUrl = async (filePath) => {
    try {
      const storageService = await createStorageService();
      const result = await storageService.getSignedUrl(filePath);
      if (result.success) {
        return result.signedUrl;
      }
      throw new Error(result.error);
    } catch (err) {
      console.error('Error getting signed URL:', err);
      return null;
    }
  };

  const openManualModal = (assetId, assetName, isParent = true) => {
    setModalAssetId(assetId);
    setModalAssetName(assetName);
    setModalIsParent(isParent);
    setShowManualModal(true);
    setModalManualFile(null);
    setModalFileUploadError(null);
  };

  const closeManualModal = () => {
    setShowManualModal(false);
    setModalAssetId(null);
    setModalAssetName('');
    setModalIsParent(true);
    setModalManualFile(null);
    setModalFileUploadError(null);
  };

  const handleModalFileSelect = (file, error) => {
    setModalManualFile(file);
    setModalFileUploadError(error);
  };

  const handleModalFileUpload = async () => {
    if (!modalManualFile || !modalAssetId) return;

    const result = await uploadManualForAsset(
      modalManualFile, 
      modalAssetName, 
      modalAssetId, 
      modalIsParent,
      true // isModal
    );
    
    if (result) {
      setModalManualFile(null);
      setModalFileUploadError(null);
      // Refresh manuals for the asset
      if (modalIsParent) {
        await loadManuals(modalAssetId);
      } else {
        await loadManuals(null, selectedParentAsset?.id);
      }
    }
  };

  const openEditModal = (asset, isParent = true) => {
    setEditModalData({
      id: asset.id,
      name: asset.name || '',
      make: asset.make || '',
      model: asset.model || '',
      serial_number: asset.serial_number || '',
      category: asset.category || '',
      purchase_date: asset.purchase_date || '',
      install_date: asset.install_date || '',
      notes: asset.notes || ''
    });
    setEditModalIsParent(isParent);
    setShowEditModal(true);
    setEditModalFile(null);
    setEditModalFileError(null);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditModalData({});
    setEditModalIsParent(true);
    setEditModalFile(null);
    setEditModalFileError(null);
  };

  const handleEditModalFileSelect = (file, error) => {
    setEditModalFile(file);
    setEditModalFileError(error);
  };

  const handleEditModalSave = async () => {
    try {
      // Upload file if provided
      if (editModalFile) {
        await uploadManualForAsset(
          editModalFile,
          editModalData.name,
          editModalData.id,
          editModalIsParent,
          false, // not the separate modal
          true // isEditModal
        );
      }

      // Save asset updates
      if (editModalIsParent) {
        await handleUpdateParentAsset(editModalData.id, editModalData);
      } else {
        await handleUpdateChildAsset(editModalData.id, editModalData);
      }

      closeEditModal();
    } catch (err) {
      console.error('Error saving asset:', err);
      setError('Failed to save asset changes');
    }
  };

  const handleDeleteParentAsset = async (assetId) => {
    if (!confirm('Are you sure you want to delete this parent asset? All child assets will also be deleted.')) {
      return;
    }

    try {
      const { error: childError } = await supabase
        .from('child_assets')
        .update({
          status: 'deleted',
          updated_by: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('parent_asset_id', assetId);

      if (childError) throw childError;

      const { error: parentError } = await supabase
        .from('parent_assets')
        .update({
          status: 'deleted',
          updated_by: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', assetId);

      if (parentError) throw parentError;

      await loadParentAssets();
      if (selectedParentAsset?.id === assetId) {
        setSelectedParentAsset(null);
        setChildAssets([]);
      }
      setError(null);
    } catch (err) {
      console.error('Error deleting parent asset:', err);
      setError('Failed to delete parent asset');
    }
  };

  const handleDeleteChildAsset = async (assetId) => {
    if (!confirm('Are you sure you want to delete this child asset?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('child_assets')
        .update({
          status: 'deleted',
          updated_by: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', assetId);

      if (error) throw error;

      await loadChildAssets(selectedParentAsset.id);
      setError(null);
    } catch (err) {
      console.error('Error deleting child asset:', err);
      setError('Failed to delete child asset');
    }
  };

  const startEditingParent = (asset) => {
    setEditingParentAsset(asset.id);
    setEditingParentData({
      name: asset.name || '',
      make: asset.make || '',
      model: asset.model || '',
      serial_number: asset.serial_number || '',
      category: asset.category || '',
      purchase_date: asset.purchase_date || '',
      install_date: asset.install_date || '',
      notes: asset.notes || ''
    });
  };

  const startEditingChild = (asset) => {
    setEditingChildAsset(asset.id);
    setEditingChildData({
      name: asset.name || '',
      make: asset.make || '',
      model: asset.model || '',
      serial_number: asset.serial_number || '',
      category: asset.category || '',
      purchase_date: asset.purchase_date || '',
      install_date: asset.install_date || '',
      notes: asset.notes || ''
    });
  };

  const cancelEditingParent = () => {
    setEditingParentAsset(null);
    setEditingParentData({});
  };

  const cancelEditingChild = () => {
    setEditingChildAsset(null);
    setEditingChildData({});
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center">Loading assets...</div>
      </div>
    );
  }

  if (error && !parentAssets.length) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Manage Assets</h2>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Parent Assets Section */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-800">Parent Assets</h3>
          {userSites.length > 0 && (
            <button
              onClick={() => setShowAddParentAsset(!showAddParentAsset)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              {showAddParentAsset ? 'Cancel' : 'Add Parent Asset'}
            </button>
          )}
        </div>

        {/* Add Parent Asset Form */}
        {showAddParentAsset && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
            <h4 className="text-lg font-medium text-gray-800 mb-4">Add New Parent Asset</h4>
            <form onSubmit={handleCreateParentAsset} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Site *
                  </label>
                  {userSites.length === 1 ? (
                    <input
                      type="text"
                      value={userSites[0].name}
                      disabled
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 text-gray-600"
                    />
                  ) : (
                    <select
                      value={newParentAsset.site_id}
                      onChange={(e) => setNewParentAsset(prev => ({ ...prev, site_id: e.target.value }))}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Select a site</option>
                      {userSites.map((site) => (
                        <option key={site.id} value={site.id}>
                          {site.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={newParentAsset.name}
                    onChange={(e) => setNewParentAsset(prev => ({ ...prev, name: e.target.value }))}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Make
                  </label>
                  <input
                    type="text"
                    value={newParentAsset.make}
                    onChange={(e) => setNewParentAsset(prev => ({ ...prev, make: e.target.value }))}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Model
                  </label>
                  <input
                    type="text"
                    value={newParentAsset.model}
                    onChange={(e) => setNewParentAsset(prev => ({ ...prev, model: e.target.value }))}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Serial Number
                  </label>
                  <input
                    type="text"
                    value={newParentAsset.serial_number}
                    onChange={(e) => setNewParentAsset(prev => ({ ...prev, serial_number: e.target.value }))}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    value={newParentAsset.category}
                    onChange={(e) => setNewParentAsset(prev => ({ ...prev, category: e.target.value }))}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Purchase Date
                  </label>
                  <input
                    type="date"
                    value={newParentAsset.purchase_date}
                    onChange={(e) => setNewParentAsset(prev => ({ ...prev, purchase_date: e.target.value }))}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Install Date
                  </label>
                  <input
                    type="date"
                    value={newParentAsset.install_date}
                    onChange={(e) => setNewParentAsset(prev => ({ ...prev, install_date: e.target.value }))}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={newParentAsset.notes}
                  onChange={(e) => setNewParentAsset(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <FileUpload
                label="Include User Manual (Optional)"
                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
                maxSize={30 * 1024 * 1024} // 30MB
                onFileSelect={handleParentFileSelect}
                error={parentFileUploadError}
                disabled={uploadingParentFile}
              />
              
              {uploadingParentFile && (
                <div className="text-sm text-blue-600 flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  Uploading user manual...
                </div>
              )}
              <div className="flex space-x-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                >
                  Create Parent Asset
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddParentAsset(false);
                    setNewParentAsset({
                      name: '',
                      make: '',
                      model: '',
                      serial_number: '',
                      category: '',
                      purchase_date: '',
                      install_date: '',
                      notes: '',
                      site_id: userSites.length === 1 ? userSites[0].id : ''
                    });
                    setParentManualFile(null);
                    setParentFileUploadError(null);
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

        {/* Parent Assets Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Make
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Model
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Serial Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Purchase Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Install Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Manuals
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {parentAssets.map((asset) => (
                <tr 
                  key={asset.id} 
                  className={`${selectedParentAsset?.id === asset.id ? 'bg-blue-50' : ''} ${editingParentAsset !== asset.id ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                  onClick={(e) => {
                    if (editingParentAsset !== asset.id) {
                      handleParentAssetSelect(asset);
                    }
                  }}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {asset.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {asset.make || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {asset.model || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {asset.serial_number || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {asset.category || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(asset.purchase_date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(asset.install_date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm" onClick={(e) => e.stopPropagation()}>
                    {loadedManuals[asset.id] && loadedManuals[asset.id].length > 0 ? (
                      <div className="space-y-1">
                        {loadedManuals[asset.id].map((manual) => (
                          <div key={manual.id} className="flex items-center">
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                const url = await getSignedUrl(manual.file_path);
                                if (url) window.open(url, '_blank');
                              }}
                              className="text-blue-600 hover:text-blue-900 text-xs"
                              title={manual.original_name}
                            >
                              📄 {manual.original_name.length > 15 ? manual.original_name.substring(0, 15) + '...' : manual.original_name}
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">No manuals</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm" onClick={(e) => e.stopPropagation()}>
                    <div className="flex space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(asset, true);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteParentAsset(asset.id);
                        }}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Child Assets Section */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-800">Child Assets</h3>
          {selectedParentAsset && (
            <button
              onClick={() => setShowAddChildAsset(!showAddChildAsset)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              {showAddChildAsset ? 'Cancel' : 'Add Child Asset'}
            </button>
          )}
        </div>

        {!selectedParentAsset && (
          <div className="p-4 bg-gray-50 rounded-lg text-center text-gray-600">
            Select a parent asset to view child assets
          </div>
        )}

        {/* Add Child Asset Form */}
        {showAddChildAsset && selectedParentAsset && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
            <h4 className="text-lg font-medium text-gray-800 mb-4">
              Add New Child Asset for: {selectedParentAsset.name}
            </h4>
            <form onSubmit={handleCreateChildAsset} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={newChildAsset.name}
                    onChange={(e) => setNewChildAsset(prev => ({ ...prev, name: e.target.value }))}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Make
                  </label>
                  <input
                    type="text"
                    value={newChildAsset.make}
                    onChange={(e) => setNewChildAsset(prev => ({ ...prev, make: e.target.value }))}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Model
                  </label>
                  <input
                    type="text"
                    value={newChildAsset.model}
                    onChange={(e) => setNewChildAsset(prev => ({ ...prev, model: e.target.value }))}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Serial Number
                  </label>
                  <input
                    type="text"
                    value={newChildAsset.serial_number}
                    onChange={(e) => setNewChildAsset(prev => ({ ...prev, serial_number: e.target.value }))}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={newChildAsset.category}
                    onChange={(e) => setNewChildAsset(prev => ({ ...prev, category: e.target.value }))}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a category</option>
                    {assetCategories.map((cat) => (
                      <option key={cat.id} value={cat.asset_name}>
                        {cat.asset_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Purchase Date
                  </label>
                  <input
                    type="date"
                    value={newChildAsset.purchase_date}
                    onChange={(e) => setNewChildAsset(prev => ({ ...prev, purchase_date: e.target.value }))}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Install Date
                  </label>
                  <input
                    type="date"
                    value={newChildAsset.install_date}
                    onChange={(e) => setNewChildAsset(prev => ({ ...prev, install_date: e.target.value }))}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={newChildAsset.notes}
                  onChange={(e) => setNewChildAsset(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <FileUpload
                label="Include User Manual (Optional)"
                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
                maxSize={30 * 1024 * 1024} // 30MB
                onFileSelect={handleChildFileSelect}
                error={childFileUploadError}
                disabled={uploadingChildFile}
              />
              
              {uploadingChildFile && (
                <div className="text-sm text-blue-600 flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  Uploading user manual...
                </div>
              )}
              
              <div className="flex space-x-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                >
                  Create Child Asset
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddChildAsset(false);
                    setNewChildAsset({
                      name: '',
                      make: '',
                      model: '',
                      serial_number: '',
                      category: '',
                      purchase_date: '',
                      install_date: '',
                      notes: ''
                    });
                    setChildManualFile(null);
                    setChildFileUploadError(null);
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

        {/* Child Assets Table */}
        {selectedParentAsset && (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Make
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Model
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Serial Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Purchase Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Install Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Manuals
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {childAssets.map((asset) => (
                  <tr key={asset.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {asset.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {asset.make || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {asset.model || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {asset.serial_number || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {asset.category || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(asset.purchase_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(asset.install_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {loadedManuals[asset.id] && loadedManuals[asset.id].length > 0 ? (
                        <div className="space-y-1">
                          {loadedManuals[asset.id].map((manual) => (
                            <div key={manual.id} className="flex items-center">
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  const url = await getSignedUrl(manual.file_path);
                                  if (url) window.open(url, '_blank');
                                }}
                                className="text-blue-600 hover:text-blue-900 text-xs"
                                title={manual.original_name}
                              >
                                📄 {manual.original_name.length > 15 ? manual.original_name.substring(0, 15) + '...' : manual.original_name}
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">No manuals</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openEditModal(asset, false)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteChildAsset(asset.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Asset Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-800">
                Edit {editModalIsParent ? 'Parent' : 'Child'} Asset
              </h3>
              <button
                onClick={closeEditModal}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleEditModalSave(); }} className="space-y-6">
              {/* Asset Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={editModalData.name}
                    onChange={(e) => setEditModalData(prev => ({ ...prev, name: e.target.value }))}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Make
                  </label>
                  <input
                    type="text"
                    value={editModalData.make}
                    onChange={(e) => setEditModalData(prev => ({ ...prev, make: e.target.value }))}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Model
                  </label>
                  <input
                    type="text"
                    value={editModalData.model}
                    onChange={(e) => setEditModalData(prev => ({ ...prev, model: e.target.value }))}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Serial Number
                  </label>
                  <input
                    type="text"
                    value={editModalData.serial_number}
                    onChange={(e) => setEditModalData(prev => ({ ...prev, serial_number: e.target.value }))}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  {editModalIsParent ? (
                    <input
                      type="text"
                      value={editModalData.category}
                      onChange={(e) => setEditModalData(prev => ({ ...prev, category: e.target.value }))}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <select
                      value={editModalData.category}
                      onChange={(e) => setEditModalData(prev => ({ ...prev, category: e.target.value }))}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select a category</option>
                      {assetCategories.map((cat) => (
                        <option key={cat.id} value={cat.asset_name}>
                          {cat.asset_name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Purchase Date
                  </label>
                  <input
                    type="date"
                    value={editModalData.purchase_date}
                    onChange={(e) => setEditModalData(prev => ({ ...prev, purchase_date: e.target.value }))}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Install Date
                  </label>
                  <input
                    type="date"
                    value={editModalData.install_date}
                    onChange={(e) => setEditModalData(prev => ({ ...prev, install_date: e.target.value }))}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={editModalData.notes}
                  onChange={(e) => setEditModalData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Existing Manuals Section */}
              <div className="border-t pt-6">
                <h4 className="text-lg font-medium text-gray-800 mb-4">Manuals</h4>
                
                {loadedManuals[editModalData.id] && loadedManuals[editModalData.id].length > 0 ? (
                  <div className="mb-4">
                    <h5 className="text-sm font-medium text-gray-700 mb-3">Current Manuals:</h5>
                    <div className="space-y-3">
                      {loadedManuals[editModalData.id].map((manual) => (
                        <div key={manual.id} className="border rounded-lg p-3 bg-gray-50">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-sm text-gray-800">{manual.original_name}</p>
                              <p className="text-xs text-gray-500">
                                {formatFileSize(parseInt(manual.file_size))} • {manual.file_type}
                              </p>
                              <p className="text-xs text-gray-400">
                                Uploaded: {new Date(manual.loaded_at).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex space-x-2 ml-3">
                              <button
                                type="button"
                                onClick={async () => {
                                  const url = await getSignedUrl(manual.file_path);
                                  if (url) window.open(url, '_blank');
                                }}
                                className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                              >
                                View
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteManual(manual.id, editModalData.id)}
                                className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mb-4 text-center py-4 text-gray-500 bg-gray-50 rounded-lg">
                    No manuals uploaded for this asset
                  </div>
                )}

                {/* Upload New Manual */}
                <div className="border-t pt-4">
                  <h5 className="text-sm font-medium text-gray-700 mb-3">Upload New Manual:</h5>
                  
                  <FileUpload
                    label=""
                    accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
                    maxSize={30 * 1024 * 1024} // 30MB
                    onFileSelect={handleEditModalFileSelect}
                    error={editModalFileError}
                    disabled={uploadingEditModalFile}
                    className="mb-3"
                  />
                  
                  {uploadingEditModalFile && (
                    <div className="mb-3 text-sm text-blue-600 flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      Uploading manual...
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-6 border-t">
                <button
                  type="submit"
                  disabled={uploadingEditModalFile}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Management Modal */}
      {showManualModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                Manage Manuals - {modalAssetName}
              </h3>
              <button
                onClick={closeManualModal}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {/* Existing Manuals */}
            {loadedManuals[modalAssetId] && loadedManuals[modalAssetId].length > 0 ? (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Current Manuals:</h4>
                <div className="space-y-3">
                  {loadedManuals[modalAssetId].map((manual) => (
                    <div key={manual.id} className="border rounded-lg p-3 bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-sm text-gray-800">{manual.original_name}</p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(parseInt(manual.file_size))} • {manual.file_type}
                          </p>
                          <p className="text-xs text-gray-400">
                            Uploaded: {new Date(manual.loaded_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex space-x-2 ml-3">
                          <button
                            onClick={async () => {
                              const url = await getSignedUrl(manual.file_path);
                              if (url) window.open(url, '_blank');
                            }}
                            className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleDeleteManual(manual.id, modalAssetId)}
                            className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mb-6 text-center py-4 text-gray-500">
                No manuals uploaded for this asset
              </div>
            )}

            {/* Upload New Manual */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Upload New Manual:</h4>
              
              <FileUpload
                label=""
                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
                maxSize={30 * 1024 * 1024} // 30MB
                onFileSelect={handleModalFileSelect}
                error={modalFileUploadError}
                disabled={uploadingModalFile}
                className="mb-3"
              />
              
              {uploadingModalFile && (
                <div className="mb-3 text-sm text-blue-600 flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  Uploading manual...
                </div>
              )}

              <div className="flex space-x-2">
                {modalManualFile && (
                  <button
                    onClick={handleModalFileUpload}
                    disabled={uploadingModalFile}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm disabled:opacity-50"
                  >
                    Upload Manual
                  </button>
                )}
                <button
                  onClick={closeManualModal}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageAssets;