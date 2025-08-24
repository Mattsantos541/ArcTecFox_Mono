import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { 
  supabase, 
  isUserSiteAdmin, 
  getUserAdminSites,
  fetchPMPlansByAsset,
  generatePMPlan,
  fetchUserSites,
  suggestChildAssets
} from '../api';
import FileUpload from '../components/forms/FileUpload';
import { createStorageService } from '../services/storageService';
import { saveState, loadState } from '../utils/statePersistence';
import AssetInsightsDashboard from '../components/assets/AssetInsightsDashboard';

// Loading Modal Component (copied from PMPlanner)
function LoadingModal({ isOpen }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md mx-4 text-center">
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Generating Your PM Plan</h3>
          <p className="text-gray-600 mb-4">
            Our AI is analyzing your asset and creating a comprehensive maintenance plan...
          </p>
          <div className="flex justify-center">
            <div className="text-sm text-blue-600">
              This may take a few moments...
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// AI Suggestions Loading Modal
function SuggestionsLoadingModal({ isOpen }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md mx-4 text-center">
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">🤖 Getting AI Suggestions</h3>
          <p className="text-gray-600 mb-4">
            Our AI is analyzing your parent asset and suggesting relevant child components...
          </p>
          <div className="flex justify-center">
            <div className="text-sm text-green-600">
              This may take a few moments...
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const ManageAssets = ({ onAssetUpdate, onPlanCreate, selectedSite, userSites: propUserSites }) => {
  const { user } = useAuth();
  const [parentAssets, setParentAssets] = useState([]);
  const [childAssets, setChildAssets] = useState([]);
  const [loadingChildAssets, setLoadingChildAssets] = useState(false);
  
  // Persist selected parent asset across tab switches
  const [selectedParentAsset, setSelectedParentAssetInternal] = useState(() => {
    const saved = loadState('selectedParentAsset', null);
    return saved;
  });
  
  const setSelectedParentAsset = (asset) => {
    setSelectedParentAssetInternal(asset);
    saveState('selectedParentAsset', asset);
  };
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
    cost_to_replace: '',
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
    notes: '',
    operating_hours: '',
    addtl_context: '',
    plan_start_date: '',
    criticality: '',
    cost_to_replace: ''
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
  
  // PM Plan display state - persist selected child asset
  const [selectedChildAssetForPlan, setSelectedChildAssetForPlanInternal] = useState(() => {
    const saved = loadState('selectedChildAssetForPlan', null);
    return saved;
  });
  
  const setSelectedChildAssetForPlan = (asset) => {
    setSelectedChildAssetForPlanInternal(asset);
    saveState('selectedChildAssetForPlan', asset);
  };
  const [existingPlans, setExistingPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [showPlans, setShowPlans] = useState(false);
  
  // PM Plan generation state
  const [generatingPlan, setGeneratingPlan] = useState(false);

  // PM Plan status tracking for child assets
  const [childAssetPlanStatuses, setChildAssetPlanStatuses] = useState({});

  // Child Asset AI Suggestions state
  const [showSuggestionsModal, setShowSuggestionsModal] = useState(false);
  const [suggestedAssets, setSuggestedAssets] = useState([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState({});
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [createdParentAsset, setCreatedParentAsset] = useState(null);

  // Custom confirmation modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({
    title: '',
    message: '',
    confirmText: 'Delete',
    cancelText: 'Cancel',
    onConfirm: () => {},
    dangerous: true
  });

  useEffect(() => {
    console.log('🚀 [Component Mount] ManageAssets component mounted/updated');
    console.log('🚀 [Component Mount] Current URL:', window.location.pathname);
    console.log('🚀 [Component Mount] User exists:', !!user);
    console.log('🚀 [Component Mount] Props:', { onAssetUpdate: !!onAssetUpdate, onPlanCreate: !!onPlanCreate });
    
    if (user) {
      initializeComponent();
    }
  }, [user]);

  // Reload assets when selectedSite changes
  useEffect(() => {
    if (userSites.length > 0) {
      loadParentAssets(userSites);
    }
  }, [selectedSite]);

  const initializeComponent = async () => {
    console.log('🚀 [Initialization] Starting component initialization...');
    await checkUserPermissions();
    await loadAssetCategories();
    console.log('🚀 [Initialization] Component initialization complete');
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
      // Use passed-in userSites if available (from parent component)
      if (propUserSites && propUserSites.length > 0) {
        setUserSites(propUserSites);
        if (propUserSites.length === 1) {
          setNewParentAsset(prev => ({ ...prev, site_id: propUserSites[0].id }));
        }
        await loadParentAssets(propUserSites);
        return;
      }

      // Fallback to loading sites if not passed from parent
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
      
      // Filter sites based on selectedSite
      let filteredSiteIds;
      if (selectedSite && selectedSite !== 'all') {
        filteredSiteIds = [selectedSite];
      } else {
        filteredSiteIds = sitesList.map(site => site.id);
      }
      
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
        .in('site_id', filteredSiteIds)
        .neq('status', 'deleted')
        .order('name');

      if (error) throw error;
      
      setParentAssets(data || []);
      
      // Restore selected parent asset if it still exists
      const savedParentId = loadState('selectedParentAsset', null)?.id;
      if (savedParentId && data) {
        const restoredParent = data.find(a => a.id === savedParentId);
        if (restoredParent) {
          // Restore the selection without triggering handleParentAssetSelect
          // to avoid re-loading child assets unnecessarily
          setSelectedParentAssetInternal(restoredParent);
          // Load child assets for the restored parent
          await loadChildAssets(savedParentId);
        }
      }
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
      
      // Load PM plan statuses for child assets
      if (data && data.length > 0) {
        await loadChildAssetPlanStatuses(data);
      }
      
      // Load manuals for child assets
      await loadManuals(null, parentAssetId);
      
      // Restore selected child asset if it still exists
      const savedChildId = loadState('selectedChildAssetForPlan', null)?.id;
      if (savedChildId && data) {
        const restoredChild = data.find(a => a.id === savedChildId);
        if (restoredChild) {
          setSelectedChildAssetForPlanInternal(restoredChild);
          // Load existing plans for the restored child asset
          const parentId = restoredChild.parent_asset_id;
          const plans = await fetchPMPlansByAsset(parentId, savedChildId);
          setExistingPlans(plans || []);
        }
      }
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
    setSelectedChildAssetForPlan(null); // Clear child selection to show parent insights
    setLoadingChildAssets(true); // Add loading state
    await loadChildAssets(asset.id);
    await loadManuals(asset.id);
    setLoadingChildAssets(false); // Clear loading state
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
      
      // Get the siteId for the asset
      let siteId = null;
      if (isParent) {
        // For parent assets, get siteId directly from the asset
        const parentAsset = parentAssets.find(a => a.id === assetId);
        siteId = parentAsset?.site_id;
      } else {
        // For child assets, get siteId from the selected parent asset
        siteId = selectedParentAsset?.site_id;
      }
      
      const storageService = await createStorageService();
      const result = await storageService.uploadUserManual(file, assetName, user.id, siteId);
      
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
    
    // Debug logging to track different contexts
    console.log('🔍 [Parent Asset Creation] Starting...');
    console.log('🔍 [Context] Current URL:', window.location.pathname);
    console.log('🔍 [Context] Props received:', { onAssetUpdate: !!onAssetUpdate, onPlanCreate: !!onPlanCreate });
    console.log('🔍 [Context] User sites available:', userSites.length);
    console.log('🔍 [Context] Parent manual file attached:', !!parentManualFile);
    console.log('🔍 [Context] Component state:', {
      loadingSuggestions,
      showSuggestionsModal,
      suggestedAssets: suggestedAssets.length,
      createdParentAsset: !!createdParentAsset
    });
    
    if (userSites.length === 0) {
      console.error('🔍 [Error] No user sites available');
      setError('You do not have access to any sites');
      return;
    }

    if (!newParentAsset.name.trim()) {
      console.error('🔍 [Error] Asset name is empty');
      setError('Asset name is required');
      return;
    }

    if (!newParentAsset.site_id) {
      console.error('🔍 [Error] Site ID is missing');
      setError('Site selection is required');
      return;
    }

    console.log('🔍 [Validation] All checks passed, proceeding with creation');
    try {
      // Fix date handling to prevent timezone issues
      // Ensure dates are sent as pure YYYY-MM-DD strings or null
      const assetData = {
        ...newParentAsset,
        purchase_date: newParentAsset.purchase_date ? newParentAsset.purchase_date : null,
        install_date: newParentAsset.install_date ? newParentAsset.install_date : null,
        cost_to_replace: newParentAsset.cost_to_replace ? parseFloat(newParentAsset.cost_to_replace) || null : null,
        status: 'active',
        created_by: user.id
      };
      
      console.log('🔍 [Database] Inserting parent asset with data:', assetData);
      const { data, error } = await supabase
        .from('parent_assets')
        .insert([assetData])
        .select();

      if (error) {
        console.error('🔍 [Database Error] Failed to insert parent asset:', error);
        throw error;
      }

      const createdAsset = data[0];
      console.log('🔍 [Success] Parent asset created with ID:', createdAsset.id);
      console.log('🔍 [Success] Created asset data:', createdAsset);
      
      // Upload manual if provided (don't let upload failure prevent child asset suggestions)
      if (parentManualFile) {
        console.log('🔍 [File Upload] Attempting to upload manual...');
        try {
          await uploadManualForAsset(parentManualFile, newParentAsset.name, createdAsset.id, true);
          console.log('🔍 [File Upload] Manual uploaded successfully');
        } catch (uploadError) {
          console.error('🔍 [File Upload Error] File upload failed, but continuing with asset creation:', uploadError);
          setParentFileUploadError(`Failed to upload manual: ${uploadError.message}`);
        }
      } else {
        console.log('🔍 [File Upload] No manual file attached, skipping upload');
      }

      console.log('🔍 [Loading] Refreshing parent assets list...');
      await loadParentAssets();
      console.log('🔍 [Loading] Parent assets list refreshed');
      
      // Store created asset and trigger AI suggestions
      const assetWithEnvironment = {...createdAsset, environment: userSites.find(s => s.id === createdAsset.site_id)?.environment};
      console.log('🔍 [AI Suggestions] Storing created asset with environment:', assetWithEnvironment);
      setCreatedParentAsset(assetWithEnvironment);
      
      console.log('🔍 [AI Suggestions] Calling requestChildAssetSuggestions with asset:', createdAsset);
      await requestChildAssetSuggestions(createdAsset);
      console.log('🔍 [AI Suggestions] Request completed');
      
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
        cost_to_replace: '',
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

  const handleSuggestChildAssets = async () => {
    if (!selectedParentAsset) {
      setError('Please select a parent asset first');
      return;
    }

    console.log('🤖 [Manual Suggestion] Triggering child asset suggestions for:', selectedParentAsset.name);
    
    // Get the site environment for the selected parent asset
    const siteEnvironment = userSites.find(s => s.id === selectedParentAsset.site_id)?.environment;
    
    // Prepare the parent asset data with environment
    const parentAssetWithEnvironment = {
      ...selectedParentAsset,
      environment: siteEnvironment
    };
    
    console.log('🤖 [Manual Suggestion] Parent asset with environment:', parentAssetWithEnvironment);
    
    // Call the existing requestChildAssetSuggestions function
    await requestChildAssetSuggestions(parentAssetWithEnvironment);
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
      // Prepare child asset data - include make, model, serial_number mapped to correct fields
      // Fix date handling to prevent timezone issues
      const childAssetData = {
        name: newChildAsset.name,
        make: newChildAsset.make || null,
        model: newChildAsset.model || null,
        serial_no: newChildAsset.serial_number || null, // Map serial_number to serial_no
        category: newChildAsset.category,
        purchase_date: newChildAsset.purchase_date ? newChildAsset.purchase_date : null,
        install_date: newChildAsset.install_date ? newChildAsset.install_date : null,
        notes: newChildAsset.notes,
        operating_hours: newChildAsset.operating_hours || null,
        addtl_context: newChildAsset.addtl_context || null,
        plan_start_date: newChildAsset.plan_start_date ? newChildAsset.plan_start_date : null,
        criticality: newChildAsset.criticality || null,
        cost_to_replace: newChildAsset.cost_to_replace ? parseFloat(newChildAsset.cost_to_replace) || null : null,
        parent_asset_id: selectedParentAsset.id,
        status: 'active',
        created_by: user.id
      };

      const { data, error } = await supabase
        .from('child_assets')
        .insert([childAssetData])
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
        notes: '',
        operating_hours: '',
        addtl_context: '',
        plan_start_date: '',
        criticality: '',
        cost_to_replace: ''
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
      
      // Trigger task view refresh if callback provided
      if (onAssetUpdate) {
        onAssetUpdate();
      }
    } catch (err) {
      console.error('Error updating parent asset:', err);
      setError('Failed to update parent asset');
    }
  };

  const handleUpdateChildAsset = async (assetId, updates = null) => {
    try {
      const dataToUpdate = updates || editingChildData;
      
      // Check if plan_start_date is being updated
      const { data: currentAsset } = await supabase
        .from('child_assets')
        .select('plan_start_date')
        .eq('id', assetId)
        .single();
      
      const isDateChanging = currentAsset && dataToUpdate.plan_start_date && 
                            currentAsset.plan_start_date !== dataToUpdate.plan_start_date;
      
      // Update the child asset
      const { error } = await supabase
        .from('child_assets')
        .update({
          ...dataToUpdate,
          updated_by: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', assetId);

      if (error) throw error;
      
      // If plan_start_date changed, recalculate task_signoff due dates
      if (isDateChanging) {
        const { recalculateTaskSignoffDates } = await import('../api');
        await recalculateTaskSignoffDates(assetId, dataToUpdate.plan_start_date);
      }

      await loadChildAssets(selectedParentAsset.id);
      if (!updates) {
        // Only reset inline editing state if not called from modal
        setEditingChildAsset(null);
        setEditingChildData({});
      }
      setError(null);
      
      // Trigger task view refresh if callback provided
      if (onAssetUpdate) {
        onAssetUpdate();
      }
    } catch (err) {
      console.error('Error updating child asset:', err);
      setError('Failed to update child asset');
    }
  };

  const handleDeleteManual = async (manualId, assetId) => {
    const performDelete = async () => {
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

    showConfirmation({
      title: 'Delete Manual',
      message: 'Are you sure you want to delete this manual? This action cannot be undone.',
      confirmText: 'Delete Manual',
      cancelText: 'Cancel',
      onConfirm: performDelete,
      dangerous: true
    });
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
    const modalData = {
      id: asset.id,
      name: asset.name || '',
      category: asset.category || '',
      purchase_date: formatDateForInput(asset.purchase_date),
      install_date: formatDateForInput(asset.install_date),
      notes: asset.notes || '',
      cost_to_replace: asset.cost_to_replace || ''
    };
    
    // Include make, model, serial_number for both parent and child assets
    modalData.make = asset.make || '';
    modalData.model = asset.model || '';
    
    if (isParent) {
      modalData.serial_number = asset.serial_number || '';
    } else {
      // For child assets, map serial_no database field to serial_number frontend field
      modalData.serial_number = asset.serial_no || '';
      // Include additional fields for child assets
      modalData.operating_hours = asset.operating_hours || '';
      modalData.addtl_context = asset.addtl_context || '';
      modalData.plan_start_date = formatDateForInput(asset.plan_start_date);
      modalData.criticality = asset.criticality || '';
    }
    
    setEditModalData(modalData);
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

      // Prepare data for update - include make, model, serial_number for child assets with correct field mapping
      const dataToUpdate = { ...editModalData };
      
      // Fix date handling to prevent timezone shifting
      // Ensure dates are properly formatted or null (never empty strings)
      dataToUpdate.purchase_date = dataToUpdate.purchase_date ? dataToUpdate.purchase_date : null;
      dataToUpdate.install_date = dataToUpdate.install_date ? dataToUpdate.install_date : null;
      
      // Handle cost_to_replace field - ensure it's a number or null
      dataToUpdate.cost_to_replace = dataToUpdate.cost_to_replace ? parseFloat(dataToUpdate.cost_to_replace) || null : null;
      
      if (!editModalIsParent) {
        // Map the frontend field names to database field names for child assets
        if (dataToUpdate.serial_number !== undefined) {
          dataToUpdate.serial_no = dataToUpdate.serial_number;
          delete dataToUpdate.serial_number; // Remove the frontend field name
        }
        // Ensure new fields are included with proper null handling
        dataToUpdate.operating_hours = dataToUpdate.operating_hours || null;
        dataToUpdate.addtl_context = dataToUpdate.addtl_context || null;
        dataToUpdate.plan_start_date = dataToUpdate.plan_start_date ? dataToUpdate.plan_start_date : null;
      }

      // Save asset updates
      if (editModalIsParent) {
        await handleUpdateParentAsset(editModalData.id, dataToUpdate);
      } else {
        await handleUpdateChildAsset(editModalData.id, dataToUpdate);
      }

      closeEditModal();
    } catch (err) {
      console.error('Error saving asset:', err);
      setError('Failed to save asset changes');
    }
  };

  const handleDeleteParentAsset = async (assetId) => {
    const performDelete = async () => {
      try {
        // First, get all child assets for this parent
        const { data: childAssets } = await supabase
          .from('child_assets')
          .select('id')
          .eq('parent_asset_id', assetId)
          .neq('status', 'deleted');

        // Soft delete related PM plans, tasks, and signoffs for all child assets
        if (childAssets && childAssets.length > 0) {
          const childAssetIds = childAssets.map(c => c.id);
          
          // Get all PM plans for these child assets
          const { data: planData } = await supabase
            .from('pm_plans')
            .select('id')
            .in('child_asset_id', childAssetIds);
          
          if (planData && planData.length > 0) {
            const planIds = planData.map(p => p.id);
            
            // Get all PM tasks for these plans
            const { data: tasks } = await supabase
              .from('pm_tasks')
              .select('id')
              .in('pm_plan_id', planIds);
            
            if (tasks && tasks.length > 0) {
              const taskIds = tasks.map(t => t.id);
              
              // Soft delete all task_signoff records
              const { error: signoffError } = await supabase
                .from('task_signoff')
                .update({
                  status: 'deleted',
                  updated_at: new Date().toISOString()
                })
                .in('task_id', taskIds);
              
              if (signoffError) {
                console.error('Error soft deleting task_signoff records:', signoffError);
              }
              
              // Soft delete all PM tasks
              const { error: taskError } = await supabase
                .from('pm_tasks')
                .update({
                  status: 'Deleted',
                  updated_by: user.id,
                  updated_at: new Date().toISOString()
                })
                .in('id', taskIds);
              
              if (taskError) {
                console.error('Error soft deleting PM tasks:', taskError);
              }
            }
            
            // Soft delete PM plans
            const { error: planError } = await supabase
              .from('pm_plans')
              .update({
                status: 'Deleted',
                updated_by: user.id,
                updated_at: new Date().toISOString()
              })
              .in('id', planIds);
            
            if (planError) {
              console.error('Error soft deleting PM plans:', planError);
            }
          }
        }

        // Soft delete all child assets
        const { error: childError } = await supabase
          .from('child_assets')
          .update({
            status: 'deleted',
            updated_by: user.id,
            updated_at: new Date().toISOString()
          })
          .eq('parent_asset_id', assetId);

        if (childError) throw childError;

        // Soft delete the parent asset
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

    showConfirmation({
      title: 'Delete Parent Asset',
      message: 'Are you sure you want to delete this parent asset? All child assets will also be deleted. This action cannot be undone.',
      confirmText: 'Delete Asset',
      cancelText: 'Cancel',
      onConfirm: performDelete,
      dangerous: true
    });
  };

  const handleDeleteChildAsset = async (assetId) => {
    const performDelete = async () => {
      try {
        // First, mark any associated PM plans as 'Replaced'
        const { error: planError } = await supabase
          .from('pm_plans')
          .update({
            status: 'Replaced',
            updated_by: user.id,
            updated_at: new Date().toISOString()
          })
          .eq('child_asset_id', assetId)
          .eq('status', 'Current');
        
        if (planError) {
          console.error('Error updating PM plans:', planError);
        }
        
        // Soft delete related PM tasks and task_signoff records
        // First get the task IDs for this child asset's PM plans
        const { data: planData } = await supabase
          .from('pm_plans')
          .select('id')
          .eq('child_asset_id', assetId);
        
        if (planData && planData.length > 0) {
          const planIds = planData.map(p => p.id);
          
          const { data: tasks } = await supabase
            .from('pm_tasks')
            .select('id')
            .in('pm_plan_id', planIds);
          
          if (tasks && tasks.length > 0) {
            const taskIds = tasks.map(t => t.id);
            
            // Soft delete all task_signoff records (pending and completed)
            const { error: signoffError } = await supabase
              .from('task_signoff')
              .update({
                status: 'deleted',
                updated_at: new Date().toISOString()
              })
              .in('task_id', taskIds);
            
            if (signoffError) {
              console.error('Error soft deleting task_signoff records:', signoffError);
            }
            
            // Soft delete all PM tasks
            const { error: taskError } = await supabase
              .from('pm_tasks')
              .update({
                status: 'Deleted',
                updated_by: user.id,
                updated_at: new Date().toISOString()
              })
              .in('id', taskIds);
            
            if (taskError) {
              console.error('Error soft deleting PM tasks:', taskError);
            }
          }
        }
        
        // Now soft delete the child asset
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
        setSelectedChildAssetForPlan(null);
        setError(null);
      } catch (err) {
        console.error('Error deleting child asset:', err);
        setError('Failed to delete child asset');
      }
    };

    showConfirmation({
      title: 'Delete Child Asset',
      message: 'Are you sure you want to delete this child asset? This action cannot be undone.',
      confirmText: 'Delete Asset',
      cancelText: 'Cancel',
      onConfirm: performDelete,
      dangerous: true
    });
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
      category: asset.category || '',
      purchase_date: asset.purchase_date || '',
      install_date: asset.install_date || '',
      notes: asset.notes || '',
      operating_hours: asset.operating_hours || '',
      addtl_context: asset.addtl_context || '',
      environment: asset.environment || '',
      plan_start_date: asset.plan_start_date || ''
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
    // Handle date as string to avoid timezone issues
    // If dateString is already in YYYY-MM-DD format, convert to readable format
    if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateString.split('-');
      return new Date(year, month - 1, day).toLocaleDateString();
    }
    // Fallback for other formats
    return new Date(dateString).toLocaleDateString();
  };

  // Format date for HTML date input (always YYYY-MM-DD format)
  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    
    // If already in YYYY-MM-DD format, return as-is
    if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dateString;
    }
    
    // Handle ISO date strings from database (e.g., "2025-09-01T00:00:00.000Z")
    if (typeof dateString === 'string' && dateString.includes('T')) {
      // Extract just the date part before 'T'
      return dateString.split('T')[0];
    }
    
    // Convert from other date formats to YYYY-MM-DD format
    // Force local timezone interpretation to prevent date shifts
    const date = new Date(dateString + 'T00:00:00');
    if (isNaN(date.getTime())) return '';
    
    // Get local date components to avoid timezone shift
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  };

  // Helper function to get category options including current value if not in dim_assets
  const getCategoryOptions = (currentCategory = '') => {
    // Start with all categories from dim_assets
    const standardCategories = [...assetCategories];
    
    // If current category exists and is not already in the list, add it
    if (currentCategory && currentCategory.trim() !== '') {
      const categoryExists = assetCategories.some(cat => 
        cat.asset_name.toLowerCase() === currentCategory.toLowerCase()
      );
      
      if (!categoryExists) {
        // Add the current category as a custom option
        standardCategories.unshift({
          id: `custom-${currentCategory}`,
          asset_name: currentCategory
        });
      }
    }
    
    return standardCategories;
  };

  // PM Plan display components (copied from PMPlanner)
  const Info = ({ label, value }) => {
    return (
      <div>
        <p className="text-sm font-medium text-gray-600">{label}:</p>
        <p className="text-sm">{value}</p>
      </div>
    );
  };

  const InfoBlock = ({ label, value, bg }) => {
    const displayValue = Array.isArray(value) ? value.join('\n') : value;
    
    return (
      <div className="mb-4">
        <p className="text-sm font-medium text-gray-600 mb-1">{label}:</p>
        <p className={`text-sm ${bg} p-2 rounded whitespace-pre-line`}>{displayValue}</p>
      </div>
    );
  };

  // Function to load PM plans for a child asset
  const loadPMPlansForAsset = async (parentAssetId, childAssetId) => {
    try {
      setLoadingPlans(true);
      console.log('Loading PM plans for child asset:', childAssetId);
      
      const plans = await fetchPMPlansByAsset(parentAssetId, childAssetId);
      console.log('Fetched plans:', plans);
      
      setExistingPlans(plans);
      setShowPlans(plans.length > 0);
      
    } catch (error) {
      console.error('Error loading PM plans:', error);
      setExistingPlans([]);
      setShowPlans(false);
    } finally {
      setLoadingPlans(false);
    }
  };

  // Load PM plan statuses for all child assets
  const loadChildAssetPlanStatuses = async (childAssetsList) => {
    const statuses = {};
    
    await Promise.all(
      childAssetsList.map(async (childAsset) => {
        try {
          const { data: plans, error } = await supabase
            .from('pm_plans')
            .select('id, status')
            .eq('child_asset_id', childAsset.id)
            .eq('status', 'Current')
            .limit(1);
          
          if (error) {
            console.error('Error checking PM plan status for child asset:', childAsset.id, error);
            statuses[childAsset.id] = false;
          } else {
            const hasPlan = plans && plans.length > 0;
            statuses[childAsset.id] = hasPlan;
            if (plans && plans.length > 0) {
              console.log(`✅ ${childAsset.name}: Has Current PM Plan`, { id: plans[0].id, status: plans[0].status });
            } else {
              console.log(`❌ ${childAsset.name}: No Current PM Plan found`);
            }
          }
        } catch (error) {
          console.error('Error checking PM plan status for child asset:', childAsset.id, error);
          statuses[childAsset.id] = false;
        }
      })
    );
    
    console.log('Final PM Plan statuses:', statuses);
    setChildAssetPlanStatuses(statuses);
  };

  // Handle child asset click to display details and load PM plans
  const handleChildAssetClick = (childAsset) => {
    setSelectedChildAssetForPlan(childAsset);
    loadPMPlansForAsset(selectedParentAsset.id, childAsset.id);
  };

  // Request AI-powered child asset suggestions
  const requestChildAssetSuggestions = async (parentAsset) => {
    console.log('🤖 [AI Suggestions] Starting requestChildAssetSuggestions...');
    console.log('🤖 [AI Suggestions] Parent asset input:', parentAsset);
    console.log('🤖 [AI Suggestions] Current state before request:', {
      loadingSuggestions,
      showSuggestionsModal,
      suggestedAssets: suggestedAssets.length,
      createdParentAsset: !!createdParentAsset,
      error
    });
    
    try {
      console.log('🤖 [AI Suggestions] Setting loading state to true');
      setLoadingSuggestions(true);
      setError(null);
      
      console.log('🤖 [AI Suggestions] Calling suggestChildAssets API with:', {
        name: parentAsset.name,
        make: parentAsset.make,
        model: parentAsset.model,
        category: parentAsset.category,
        id: parentAsset.id
      });
      
      const suggestions = await suggestChildAssets(parentAsset);
      
      console.log('🤖 [AI Suggestions] API Response received:', suggestions);
      console.log('🤖 [AI Suggestions] Response type:', typeof suggestions);
      console.log('🤖 [AI Suggestions] Has child_assets property:', suggestions && 'child_assets' in suggestions);
      console.log('🤖 [AI Suggestions] Child assets count:', suggestions?.child_assets?.length || 0);
      
      if (suggestions && suggestions.child_assets && suggestions.child_assets.length > 0) {
        console.log('🤖 [AI Suggestions] Valid suggestions received, setting state...');
        setSuggestedAssets(suggestions.child_assets);
        setSelectedSuggestions({});
        console.log('🤖 [AI Suggestions] About to show modal by setting showSuggestionsModal to true');
        setShowSuggestionsModal(true);
        console.log('🤖 [AI Suggestions] Modal state set, should be visible now');
      } else {
        console.log('🤖 [AI Suggestions] No child asset suggestions received or empty array');
        console.log('🤖 [AI Suggestions] Full response for debugging:', JSON.stringify(suggestions, null, 2));
      }
    } catch (error) {
      console.error('🤖 [AI Suggestions ERROR] Error getting child asset suggestions:', error);
      console.error('🤖 [AI Suggestions ERROR] Error details:', {
        message: error.message,
        stack: error.stack,
        response: error.response,
        status: error.status
      });
      setError('Failed to get AI suggestions for child assets: ' + error.message);
    } finally {
      console.log('🤖 [AI Suggestions] Setting loading state to false');
      setLoadingSuggestions(false);
      console.log('🤖 [AI Suggestions] Final state after request:', {
        loadingSuggestions: false,
        showSuggestionsModal,
        suggestedAssets: suggestedAssets.length,
        error
      });
    }
  };

  // Handle suggestion checkbox changes
  const handleSuggestionToggle = (index, checked) => {
    setSelectedSuggestions(prev => ({
      ...prev,
      [index]: checked
    }));
  };

  // Helper function to show confirmation modal
  const showConfirmation = (config) => {
    setConfirmConfig(config);
    setShowConfirmModal(true);
  };

  const handleConfirmAction = () => {
    confirmConfig.onConfirm();
    setShowConfirmModal(false);
  };

  // Handle creating child assets from suggestions
  const handleCreateSuggestedAssets = async () => {
    const selectedIndices = Object.keys(selectedSuggestions).filter(key => selectedSuggestions[key]);
    
    if (selectedIndices.length === 0) {
      setShowSuggestionsModal(false);
      return;
    }

    try {
      setError(null);
      
      for (const indexStr of selectedIndices) {
        const index = parseInt(indexStr);
        const suggestion = suggestedAssets[index];
        
        // Create child asset with AI-suggested data
        const childAssetData = {
          name: suggestion.name,
          make: suggestion.make || null,
          model: suggestion.model || null,
          serial_no: null, // User will fill this in later
          category: suggestion.category || null,
          purchase_date: null,
          install_date: null,
          notes: [
            suggestion.function ? `Function: ${suggestion.function}` : '',
            suggestion.pm_relevance ? `PM Relevance: ${suggestion.pm_relevance}` : '',
            suggestion.common_failures?.length > 0 ? `Common Failures: ${suggestion.common_failures.join(', ')}` : '',
            suggestion.additional_notes ? `Additional Notes: ${suggestion.additional_notes}` : ''
          ].filter(Boolean).join('\n\n') || null,
          operating_hours: null,
          addtl_context: null,
          criticality: suggestion.criticality_level || null, // Store criticality in dedicated field
          cost_to_replace: null, // User will fill this in later
          plan_start_date: null,
          parent_asset_id: createdParentAsset?.id || selectedParentAsset.id,
          status: 'active',
          created_by: user.id
        };

        console.log('Inserting child asset data:', childAssetData);
        
        const { error } = await supabase
          .from('child_assets')
          .insert([childAssetData]);

        if (error) {
          console.error('Error creating suggested child asset:', error);
          console.error('Failed data:', childAssetData);
          throw new Error(`Failed to create child asset: ${suggestion.name} - ${error.message}`);
        }
      }

      // Reload child assets and close modal
      const parentId = createdParentAsset?.id || selectedParentAsset.id;
      if (createdParentAsset) {
        setSelectedParentAsset(createdParentAsset);
      }
      await loadChildAssets(parentId);
      setShowSuggestionsModal(false);
      setSuggestedAssets([]);
      setSelectedSuggestions({});
      
    } catch (error) {
      console.error('Error creating suggested child assets:', error);
      setError('Failed to create some suggested child assets: ' + error.message);
    }
  };

  // Handle Create/Update PM Plan (matching PMPlanner process exactly)
  const handleCreateUpdatePMPlan = async (childAsset) => {
    try {
      setGeneratingPlan(true);
      setError(null);
      
      // If updating existing plan, mark it as 'Replaced' and clean up task_signoffs
      if (existingPlans.length > 0) {
        const existingPlanId = existingPlans[0].id;
        
        // Get tasks for the old plan
        const { data: oldTasks } = await supabase
          .from('pm_tasks')
          .select('id')
          .eq('pm_plan_id', existingPlanId);
        
        if (oldTasks && oldTasks.length > 0) {
          const oldTaskIds = oldTasks.map(t => t.id);
          
          // Delete task_signoff records without completion date (pending)
          const { error: signoffError } = await supabase
            .from('task_signoff')
            .delete()
            .in('task_id', oldTaskIds)
            .is('comp_date', null);
          
          if (signoffError) {
            console.error('Error cleaning up old task_signoff records:', signoffError);
          }
        }
        
        // Mark the old plan as replaced
        const { error: updateError } = await supabase
          .from('pm_plans')
          .update({ status: 'Replaced' })
          .eq('id', existingPlanId);
        
        if (updateError) {
          console.error('Error updating existing plan status:', updateError);
          throw new Error('Failed to update existing plan status');
        }
      }
      
      // Get parent asset data for context
      const parentAsset = selectedParentAsset;
      
      // Get all manuals for this child asset
      const childManuals = loadedManuals[childAsset.id] || [];
      
      // Prepare form data similar to PMPlanner
      const formData = {
        // Core asset identification
        name: childAsset.name,
        model: childAsset.model || '',
        serial: childAsset.serial_no || '',
        category: childAsset.category || '',
        
        // PM planning fields
        hours: childAsset.operating_hours?.toString() || '',
        additional_context: childAsset.addtl_context || '',
        environment: parentAsset.environment || '', // Inherited from parent
        date_of_plan_start: childAsset.plan_start_date || '',
        
        // Asset hierarchy information
        child_asset_id: childAsset.id,
        parent_asset_id: parentAsset.id,
        
        // Asset details for AI context
        purchase_date: childAsset.purchase_date || '',
        install_date: childAsset.install_date || '',
        asset_notes: childAsset.notes || '',
        
        // Site and user information
        email: user?.email || "asset-management@example.com",
        company: parentAsset.sites?.companies?.name || "Unknown Company",
        site_name: parentAsset.sites?.name || "Unknown Site",
        siteId: parentAsset.site_id,
        
        // Manual information
        userManual: childManuals[0] || null,
        manuals: childManuals,
        manual_count: childManuals.length,
        
        // Complete asset context for AI
        asset_full_details: {
          parent_asset: {
            id: parentAsset.id,
            name: parentAsset.name,
            model: parentAsset.model,
            serial_number: parentAsset.serial_number,
            category: parentAsset.category,
            purchase_date: parentAsset.purchase_date,
            install_date: parentAsset.install_date,
            notes: parentAsset.notes,
            environment: parentAsset.environment || ''
          },
          child_asset: {
            id: childAsset.id,
            name: childAsset.name,
            model: childAsset.model,
            serial_number: childAsset.serial_no,
            category: childAsset.category,
            purchase_date: childAsset.purchase_date,
            install_date: childAsset.install_date,
            notes: childAsset.notes,
            operating_hours: childAsset.operating_hours,
            addtl_context: childAsset.addtl_context,
            plan_start_date: childAsset.plan_start_date,
            parent_environment: parentAsset.environment || ''
          }
        }
      };
      
      console.log('Generating PM plan for child asset:', formData);
      
      // Call the AI API to generate the plan
      const aiGeneratedPlan = await generatePMPlan(formData);
      
      if (!aiGeneratedPlan) {
        throw new Error('No plan generated from API');
      }
      
      console.log('PM Plan generated successfully:', aiGeneratedPlan);
      
      // Reload the plans to show the new one
      await loadPMPlansForAsset(selectedParentAsset.id, childAsset.id);
      
      // Refresh PM plan statuses for all child assets
      await loadChildAssetPlanStatuses(childAssets);
      
      // Trigger task view and calendar refresh if callback provided
      if (onPlanCreate) {
        onPlanCreate();
      }
      
      // Show success message
      setError(null);
      
    } catch (error) {
      console.error('Error creating/updating PM plan:', error);
      setError('Failed to create/update PM plan: ' + error.message);
    } finally {
      setGeneratingPlan(false);
    }
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

      {/* Assets Section */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-800">Assets</h3>
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
                  Cost to Replace ($)
                </label>
                <input
                  type="number"
                  step="any"
                  value={newParentAsset.cost_to_replace}
                  onChange={(e) => setNewParentAsset(prev => ({ ...prev, cost_to_replace: e.target.value }))}
                  placeholder="0.00"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
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
                      cost_to_replace: '',
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

        {/* Assets Table with Inline Child Assets */}
        <div className="overflow-hidden">
          <table className="w-full bg-white border border-gray-200 table-fixed">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/8">
                  Name
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/8">
                  Make
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/8">
                  Model
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/8">
                  Serial Number
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/8">
                  Category
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/8">
                  Purchase Date
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/8">
                  Install Date
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/12">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {parentAssets.map((asset) => (
                <React.Fragment key={asset.id}>
                  {/* Parent Asset Row */}
                  <tr 
                    className={`${selectedParentAsset?.id === asset.id ? 'bg-blue-50' : ''} ${editingParentAsset !== asset.id ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                    onClick={(e) => {
                      if (editingParentAsset !== asset.id) {
                        handleParentAssetSelect(asset);
                      }
                    }}
                  >
                    <td className="px-2 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {asset.name}
                      </div>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 truncate">
                        {asset.make || '-'}
                      </div>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 truncate">
                        {asset.model || '-'}
                      </div>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 truncate">
                        {asset.serial_number || '-'}
                      </div>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 truncate">
                        {asset.category || '-'}
                      </div>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(asset.purchase_date)}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(asset.install_date)}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm" onClick={(e) => e.stopPropagation()}>
                      <div className="flex space-x-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(asset, true);
                          }}
                          className="text-blue-600 hover:text-blue-900 text-xs"
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteParentAsset(asset.id);
                          }}
                          className="text-red-600 hover:text-red-900 text-xs"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Child Assets Rows (shown when parent is selected) */}
                  {selectedParentAsset?.id === asset.id && (
                    <>
                      {/* Child Assets Header Row */}
                      {childAssets.length > 0 && (
                        <tr className="bg-blue-100">
                          <td className="px-1 py-1.5 text-xs font-medium text-blue-800 uppercase tracking-wide pl-2 text-left w-16">
                            <div className="flex flex-col leading-tight">
                              <span>Child</span>
                              <span>Asset</span>
                            </div>
                          </td>
                          <td className="px-3 py-1.5 text-xs font-medium text-blue-800 uppercase tracking-wide">
                            Name
                          </td>
                          <td className="px-3 py-1.5 text-xs font-medium text-blue-800 uppercase tracking-wide">
                            Purchase Date
                          </td>
                          <td className="px-3 py-1.5 text-xs font-medium text-blue-800 uppercase tracking-wide">
                            Install Date
                          </td>
                          <td className="px-3 py-1.5 text-xs font-medium text-blue-800 uppercase tracking-wide">
                            Plan Start
                          </td>
                          <td className="px-3 py-1.5 text-xs font-medium text-blue-800 uppercase tracking-wide">
                            Category
                          </td>
                          <td className="px-3 py-1.5 text-xs font-medium text-blue-800 uppercase tracking-wide">
                            PM Plan
                          </td>
                          <td className="px-3 py-1.5 text-xs font-medium text-blue-800 uppercase tracking-wide">
                            Actions
                          </td>
                        </tr>
                      )}

                      {/* Child Assets Rows */}
                      {childAssets.map((childAsset) => (
                        <tr 
                          key={childAsset.id} 
                          className={`${selectedChildAssetForPlan?.id === childAsset.id ? 'bg-green-100' : 'bg-blue-50/30'} cursor-pointer hover:bg-blue-100/50`}
                          onClick={() => handleChildAssetClick(childAsset)}
                        >
                          <td className="px-1 py-1.5 pl-2 w-16">
                          </td>
                          <td className="px-2 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 flex items-center gap-2 truncate">
                              ↳ {childAsset.name}
                              {selectedChildAssetForPlan?.id === childAsset.id && (
                                <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded">Selected for PM Plans</span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500 truncate">
                              {formatDate(childAsset.purchase_date)}
                            </div>
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500 truncate">
                              {formatDate(childAsset.install_date)}
                            </div>
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500 truncate">
                              {formatDate(childAsset.plan_start_date)}
                            </div>
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500 truncate">
                              {childAsset.category || '-'}
                            </div>
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap">
                            <div className="text-sm flex justify-center">
                              {childAssetPlanStatuses[childAsset.id] ? (
                                <span className="inline-flex items-center justify-center w-6 h-6 bg-green-100 text-green-600 rounded-full">
                                  ✓
                                </span>
                              ) : (
                                <span className="inline-flex items-center justify-center w-6 h-6 bg-red-100 text-red-600 rounded-full">
                                  ✗
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm" onClick={(e) => e.stopPropagation()}>
                            <div className="flex space-x-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditModal(childAsset, false);
                                }}
                                className="text-blue-600 hover:text-blue-900 text-xs"
                              >
                                Edit
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteChildAsset(childAsset.id);
                                }}
                                className="text-red-600 hover:text-red-900 text-xs"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}

                      {/* Add Child Asset Button Row - appears after all child assets */}
                      <tr>
                        <td colSpan="8" className="px-6 py-2 bg-gray-50">
                          <div className="flex gap-2">
                            <button
                              onClick={() => setShowAddChildAsset(!showAddChildAsset)}
                              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-xs"
                            >
                              {showAddChildAsset ? 'Cancel' : 'Add Child Asset'}
                            </button>
                            <button
                              onClick={() => handleSuggestChildAssets()}
                              className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-xs"
                            >
                              Suggest Child Assets
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Add Child Asset Form */}
                      {showAddChildAsset && (
                        <tr>
                          <td colSpan="8" className="p-2 bg-gray-50">
                            <div className="bg-white rounded-lg p-4 border max-w-full overflow-hidden">
                              <h4 className="text-sm font-medium text-gray-800 mb-4">
                                Add New Child Asset for: {selectedParentAsset.name}
                              </h4>
                              <form onSubmit={handleCreateChildAsset} className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Name *
                                    </label>
                                    <input
                                      type="text"
                                      value={newChildAsset.name}
                                      onChange={(e) => setNewChildAsset(prev => ({ ...prev, name: e.target.value }))}
                                      className="block w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                                      className="block w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                                      className="block w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                                      className="block w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Category
                                    </label>
                                    <select
                                      value={newChildAsset.category}
                                      onChange={(e) => setNewChildAsset(prev => ({ ...prev, category: e.target.value }))}
                                      className="block w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    >
                                      <option value="">Select a category</option>
                                      {getCategoryOptions(newChildAsset.category).map((cat) => (
                                        <option key={cat.id} value={cat.asset_name}>
                                          {cat.asset_name}
                                          {cat.id && cat.id.toString().startsWith('custom-') && ' (Custom)'}
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
                                      className="block w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                                      className="block w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Operating Hours
                                    </label>
                                    <input
                                      type="number"
                                      value={newChildAsset.operating_hours}
                                      onChange={(e) => setNewChildAsset(prev => ({ ...prev, operating_hours: e.target.value }))}
                                      placeholder="Hours per day"
                                      className="block w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Plan Start Date
                                    </label>
                                    <input
                                      type="date"
                                      value={newChildAsset.plan_start_date}
                                      onChange={(e) => setNewChildAsset(prev => ({ ...prev, plan_start_date: e.target.value }))}
                                      className="block w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Criticality
                                    </label>
                                    <select
                                      value={newChildAsset.criticality}
                                      onChange={(e) => setNewChildAsset(prev => ({ ...prev, criticality: e.target.value }))}
                                      className="block w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    >
                                      <option value="">Select criticality level</option>
                                      <option value="High">High</option>
                                      <option value="Medium">Medium</option>
                                      <option value="Low">Low</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Cost to Replace ($)
                                    </label>
                                    <input
                                      type="number"
                                      step="any"
                                      value={newChildAsset.cost_to_replace}
                                      onChange={(e) => setNewChildAsset(prev => ({ ...prev, cost_to_replace: e.target.value }))}
                                      placeholder="0.00"
                                      className="block w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                  </div>
                                </div>
                                
                                {/* Full width textarea field */}
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Additional Context
                                  </label>
                                  <textarea
                                    value={newChildAsset.addtl_context}
                                    onChange={(e) => setNewChildAsset(prev => ({ ...prev, addtl_context: e.target.value }))}
                                    rows={2}
                                    placeholder="Any additional context or special considerations"
                                    className="block w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 resize-none"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Notes
                                  </label>
                                  <textarea
                                    value={newChildAsset.notes}
                                    onChange={(e) => setNewChildAsset(prev => ({ ...prev, notes: e.target.value }))}
                                    rows={2}
                                    className="block w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 resize-none"
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
                                
                                <div className="flex space-x-2 pt-2">
                                  <button
                                    type="submit"
                                    className="px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm"
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
                                        notes: '',
                                        operating_hours: '',
                                        addtl_context: '',
                                        plan_start_date: '',
                                        criticality: '',
                                        cost_to_replace: ''
                                      });
                                      setChildManualFile(null);
                                      setChildFileUploadError(null);
                                      setError(null);
                                    }}
                                    className="px-3 py-1.5 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors text-sm"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </form>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Asset Insights Dashboard for Parent Asset */}
      {selectedParentAsset && !selectedChildAssetForPlan && (
        <div className="mt-8">
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-blue-200 bg-gradient-to-r from-blue-600 to-indigo-600">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <div className="w-2 h-2 bg-white rounded-full"></div>
                Asset Insights: {selectedParentAsset.name}
              </h3>
              <p className="text-blue-100 text-sm mt-1">Comprehensive maintenance analytics and cost tracking</p>
            </div>
            <div className="p-6">
              {loadingChildAssets ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-gray-600">Loading asset data...</span>
                </div>
              ) : (
                <AssetInsightsDashboard 
                  parentAsset={selectedParentAsset} 
                  childAssets={childAssets}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Child Asset Details Display Section */}
      {selectedChildAssetForPlan && (
        <div className="mt-8">
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-green-200 bg-gradient-to-r from-green-500 to-emerald-500">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <div className="w-2 h-2 bg-white rounded-full"></div>
                Child Asset Details: {selectedChildAssetForPlan.name}
              </h3>
              <p className="text-green-100 text-sm mt-1">Component-specific information and maintenance plans</p>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Basic Information */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded">{selectedChildAssetForPlan.name || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Make</label>
                  <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded">{selectedChildAssetForPlan.make || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                  <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded">{selectedChildAssetForPlan.model || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Serial Number</label>
                  <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded">{selectedChildAssetForPlan.serial_no || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded">{selectedChildAssetForPlan.category || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Operating Hours</label>
                  <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded">
                    {selectedChildAssetForPlan.operating_hours ? `${selectedChildAssetForPlan.operating_hours} hrs/day` : '-'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Criticality</label>
                  <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded">
                    {selectedChildAssetForPlan.criticality || '-'}
                  </p>
                </div>
                
                {/* Date Fields */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Date</label>
                  <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded">{formatDate(selectedChildAssetForPlan.purchase_date)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Install Date</label>
                  <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded">{formatDate(selectedChildAssetForPlan.install_date)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plan Start Date</label>
                  <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded">{formatDate(selectedChildAssetForPlan.plan_start_date)}</p>
                </div>
              </div>
              
              {/* Full Width Fields */}
              {selectedChildAssetForPlan.addtl_context && (
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Additional Context</label>
                  <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded whitespace-pre-wrap">
                    {selectedChildAssetForPlan.addtl_context}
                  </p>
                </div>
              )}
              
              {selectedChildAssetForPlan.notes && (
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded whitespace-pre-wrap">
                    {selectedChildAssetForPlan.notes}
                  </p>
                </div>
              )}
              
              {/* Manuals Section */}
              {loadedManuals[selectedChildAssetForPlan.id] && loadedManuals[selectedChildAssetForPlan.id].length > 0 && (
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Attached Manuals</label>
                  <div className="space-y-2">
                    {loadedManuals[selectedChildAssetForPlan.id].map((manual) => (
                      <div key={manual.id} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-500">📄</span>
                          <span className="text-sm text-gray-900">{manual.original_name}</span>
                          <span className="text-xs text-gray-500">({(manual.file_size / 1024 / 1024).toFixed(2)} MB)</span>
                        </div>
                        <button
                          onClick={() => handleViewManual(manual)}
                          className="text-blue-600 hover:text-blue-900 text-sm"
                        >
                          View
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end space-x-2">
              <button
                onClick={() => handleCreateUpdatePMPlan(selectedChildAssetForPlan)}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
                disabled={loadingPlans || generatingPlan}
              >
                {loadingPlans ? 'Loading...' : generatingPlan ? 'Generating Plan...' : (existingPlans.length > 0 ? 'Update PM Plan' : 'Create PM Plan')}
              </button>
              <button
                onClick={() => openEditModal(selectedChildAssetForPlan, false)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
              >
                Edit Asset
              </button>
              <button
                onClick={() => handleDeleteChildAsset(selectedChildAssetForPlan.id)}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
              >
                Delete Asset
              </button>
            </div>
          </div>
          
          {/* PM Plans Section */}
          {loadingPlans && (
            <div className="mt-6 bg-gray-50 rounded-lg p-6">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading PM plans...</p>
              </div>
            </div>
          )}

          {/* Existing Plans Display */}
          {!loadingPlans && existingPlans.length > 0 && (
            <div className="mt-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <span className="text-blue-600 text-xl">📋</span>
                  </div>
                  <div className="ml-3 flex-1">
                    <h4 className="text-sm font-semibold text-blue-800 mb-2">
                      {existingPlans.length === 1 ? 'Existing PM Plan Found' : `${existingPlans.length} Existing PM Plans Found`}
                    </h4>
                    <p className="text-xs text-blue-600">
                      Displaying the most recent plan created on {new Date(existingPlans[0].created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Display existing plan tasks */}
              {existingPlans[0].pm_tasks && (
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-xl font-bold mb-6 text-gray-800">Maintenance Tasks</h3>
                  <div className="space-y-6">
                    {existingPlans[0].pm_tasks.map((task, index) => (
                      <div key={index} className="bg-white rounded-lg p-4 border border-gray-200">
                        <h4 className="text-lg font-semibold text-blue-600 mb-2">{task.task_name}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                          <Info label="Interval" value={task.maintenance_interval} />
                          <Info label="Reason" value={task.reason} />
                          <Info label="Estimated Time" value={task.est_minutes ? `${task.est_minutes} minutes` : 'Not specified'} />
                          <Info label="Tools Needed" value={task.tools_needed || 'Standard maintenance tools'} />
                          <Info label="Technicians Required" value={task.no_techs_needed || 1} />
                          <Info label="Consumables" value={task.consumables || 'None specified'} />
                        </div>
                        <InfoBlock label="Instructions" value={task.instructions} bg="bg-gray-50" />
                        <InfoBlock label="Safety Precautions" value={task.safety_precautions} bg="bg-red-50 text-red-600" />
                        <InfoBlock label="Engineering Rationale" value={task.engineering_rationale} bg="bg-blue-50" />
                        <InfoBlock label="Common Failures Prevented" value={task.common_failures_prevented} bg="bg-yellow-50" />
                        <InfoBlock label="Usage Insights" value={task.usage_insights} bg="bg-green-50" />
                        {task.scheduled_dates?.length > 0 && (
                          <div className="mt-4">
                            <p className="text-sm font-medium text-gray-600 mb-1">Next Scheduled On:</p>
                            <div className="flex flex-wrap gap-2">
                              {Array.isArray(task.scheduled_dates) ? task.scheduled_dates.map((date, idx) => (
                                <span key={idx} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                                  {date}
                                </span>
                              )) : (
                                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                                  {task.scheduled_dates}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Additional Plans count */}
              {existingPlans.length > 1 && (
                <div className="mt-4 text-center">
                  <p className="text-sm text-blue-600">
                    {existingPlans.length - 1} additional plan{existingPlans.length > 2 ? 's' : ''} available for this asset
                  </p>
                </div>
              )}
            </div>
          )}

          {/* No Plans Found */}
          {!loadingPlans && existingPlans.length === 0 && (
            <div className="mt-6 bg-gray-50 rounded-lg p-6">
              <div className="text-center">
                <div className="text-gray-400 text-5xl mb-4">📋</div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No PM Plans Found</h3>
                <p className="text-gray-600 mb-4">
                  No preventive maintenance plans have been created for <strong>{selectedChildAssetForPlan.name}</strong> yet.
                </p>
                <p className="text-sm text-blue-600">
                  Please press the Create PM Plan button to create the maintenance tasks for this asset.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

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
                      {getCategoryOptions(editModalData.category).map((cat) => (
                        <option key={cat.id} value={cat.asset_name}>
                          {cat.asset_name}
                          {cat.id && cat.id.toString().startsWith('custom-') && ' (Custom)'}
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cost to Replace ($)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={editModalData.cost_to_replace}
                    onChange={(e) => setEditModalData(prev => ({ ...prev, cost_to_replace: e.target.value }))}
                    placeholder="0.00"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                {!editModalIsParent && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Operating Hours
                      </label>
                      <input
                        type="number"
                        value={editModalData.operating_hours}
                        onChange={(e) => setEditModalData(prev => ({ ...prev, operating_hours: e.target.value }))}
                        placeholder="Hours per day"
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Plan Start Date
                      </label>
                      <input
                        type="date"
                        value={editModalData.plan_start_date}
                        onChange={(e) => setEditModalData(prev => ({ ...prev, plan_start_date: e.target.value }))}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Criticality
                      </label>
                      <select
                        value={editModalData.criticality || ''}
                        onChange={(e) => setEditModalData(prev => ({ ...prev, criticality: e.target.value }))}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select criticality level</option>
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                      </select>
                    </div>
                  </>
                )}
              </div>

              {!editModalIsParent && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Additional Context
                  </label>
                  <textarea
                    value={editModalData.addtl_context}
                    onChange={(e) => setEditModalData(prev => ({ ...prev, addtl_context: e.target.value }))}
                    rows={2}
                    placeholder="Any additional context or special considerations"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}

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

      {/* AI Child Asset Suggestions Modal */}
      {(() => {
        console.log('🎭 [Modal Render Check] showSuggestionsModal:', showSuggestionsModal);
        console.log('🎭 [Modal Render Check] suggestedAssets count:', suggestedAssets.length);
        console.log('🎭 [Modal Render Check] createdParentAsset:', createdParentAsset);
        return null;
      })()}
      {showSuggestionsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-800">
                  🤖 AI-Suggested Child Assets
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Based on your parent asset "{createdParentAsset?.name}", our AI has suggested these child components:
                </p>
              </div>
              <button
                onClick={() => setShowSuggestionsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {loadingSuggestions ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Getting AI suggestions...</p>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <p className="text-sm text-gray-600 mb-4">
                    Select the child assets you'd like to create. Each will be added with AI-generated details in the notes field:
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {suggestedAssets.map((asset, index) => (
                      <div
                        key={index}
                        className={`border rounded-lg p-4 transition-colors ${
                          selectedSuggestions[index] ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <input
                            type="checkbox"
                            id={`suggestion-${index}`}
                            checked={selectedSuggestions[index] || false}
                            onChange={(e) => handleSuggestionToggle(index, e.target.checked)}
                            className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="flex-1">
                            <label htmlFor={`suggestion-${index}`} className="cursor-pointer">
                              <h4 className="font-semibold text-gray-900">{asset.name}</h4>
                              <div className="text-sm text-gray-600 mt-1 space-y-1">
                                {asset.make && <p><span className="font-medium">Make:</span> {asset.make}</p>}
                                {asset.model && <p><span className="font-medium">Model:</span> {asset.model}</p>}
                                {asset.category && <p><span className="font-medium">Category:</span> {asset.category}</p>}
                                {asset.criticality_level && (
                                  <p>
                                    <span className="font-medium">Criticality:</span> 
                                    <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
                                      asset.criticality_level === 'High' ? 'bg-red-100 text-red-800' :
                                      asset.criticality_level === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-green-100 text-green-800'
                                    }`}>
                                      {asset.criticality_level}
                                    </span>
                                  </p>
                                )}
                                {asset.function && <p><span className="font-medium">Function:</span> {asset.function}</p>}
                              </div>
                            </label>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t">
                  <div className="text-sm text-gray-600">
                    {Object.values(selectedSuggestions).filter(Boolean).length} of {suggestedAssets.length} selected
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setShowSuggestionsModal(false)}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      Skip for Now
                    </button>
                    <button
                      onClick={handleCreateSuggestedAssets}
                      disabled={Object.values(selectedSuggestions).filter(Boolean).length === 0}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Create Selected Assets
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <div className={`flex-shrink-0 w-10 h-10 mx-auto flex items-center justify-center rounded-full ${
                confirmConfig.dangerous ? 'bg-red-100' : 'bg-blue-100'
              }`}>
                {confirmConfig.dangerous ? (
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
              <div className="ml-4 flex-1">
                <h3 className="text-lg font-medium text-gray-900">
                  {confirmConfig.title}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {confirmConfig.message}
                </p>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                {confirmConfig.cancelText}
              </button>
              <button
                onClick={handleConfirmAction}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  confirmConfig.dangerous
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {confirmConfig.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Modal for AI Suggestions */}
      <SuggestionsLoadingModal isOpen={loadingSuggestions} />

      {/* Loading Modal for PM Plan Generation */}
      <LoadingModal isOpen={generatingPlan} />
    </div>
  );
};

export default ManageAssets;