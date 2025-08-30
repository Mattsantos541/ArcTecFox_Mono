"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CalendarDays, Clock, User, CheckCircle, AlertCircle, Eye, Edit, Trash2, Download, Info, Loader2, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip"
import ComponentErrorBoundary from "../ComponentErrorBoundary"
import { MaintenanceScheduleLoading } from "../loading/LoadingStates"
import { saveState, loadState } from "../../utils/statePersistence"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select-radix"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "../../hooks/useAuth"
import { supabase, isUserSiteAdmin, getUserAdminSites } from "../../api" // Import the shared client
import ManageAssets from "../../pages/ManageAssets"

export default function MaintenanceSchedule() {
  // Remove the local Supabase client initialization - use the shared one
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [calendarView, setCalendarView] = useState('month') // 'month' or 'single'
  
  // Debug selectedDate changes
  useEffect(() => {
    console.log('selectedDate changed:', selectedDate, 'type:', typeof selectedDate);
  }, [selectedDate])
  
  const [viewMode, setViewModeInternal] = useState(() => {
    const savedMode = loadState('maintenanceViewMode', 'assets')
    return savedMode
  })
  const [scheduledTasks, setScheduledTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Wrapper for setViewMode to persist state
  const setViewMode = (mode) => {
    setViewModeInternal(mode)
    saveState('maintenanceViewMode', mode)
  }
  
  // Ensure tab state is maintained on component mount
  useEffect(() => {
    const savedMode = loadState('maintenanceViewMode', 'assets')
    if (savedMode && savedMode !== viewMode) {
      setViewModeInternal(savedMode)
    }
  }, [])
  const { toast } = useToast()
  const navigate = useNavigate()
  const { user } = useAuth()

  // Add state for task actions
  const [viewingTask, setViewingTask] = useState(null)
  const [showViewDialog, setShowViewDialog] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [deletingTask, setDeletingTask] = useState(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [exportingTask, setExportingTask] = useState(null)
  // Add state for sign-off functionality
  const [showSignOffDialog, setShowSignOffDialog] = useState(false)
  const [signingOffTask, setSigningOffTask] = useState(null)
  const [signOffData, setSignOffData] = useState({
    technician_id: '',
    completion_date: new Date().toISOString().split('T')[0],
    total_expense: '',
    consumables: [],
    uploaded_file: null
  })
  const [siteUsers, setSiteUsers] = useState([])
  const [loadingSignOff, setLoadingSignOff] = useState(false)

  // Site filter state
  const [userSites, setUserSites] = useState([])
  const [selectedSite, setSelectedSiteInternal] = useState(() => loadState('selectedSite', 'all'))
  
  // Wrapper to persist selected site
  const setSelectedSite = (site) => {
    setSelectedSiteInternal(site)
    saveState('selectedSite', site)
  }

  // Add state for edited task values
  const [editedStatus, setEditedStatus] = useState("")
  const [editedDate, setEditedDate] = useState("")
  const [editedTime, setEditedTime] = useState("")
  const [editedTaskName, setEditedTaskName] = useState("")
  const [editedInstructions, setEditedInstructions] = useState("")
  const [editedEstMinutes, setEditedEstMinutes] = useState("")
  const [editedToolsNeeded, setEditedToolsNeeded] = useState("")
  const [editedNoTechsNeeded, setEditedNoTechsNeeded] = useState("")
  const [editedReason, setEditedReason] = useState("")
  const [editedSafetyPrecautions, setEditedSafetyPrecautions] = useState("")
  const [editedConsumables, setEditedConsumables] = useState("")
  const [editedConsumablesList, setEditedConsumablesList] = useState([])
  const [editedToolsList, setEditedToolsList] = useState([])
  const [editedCriticality, setEditedCriticality] = useState("")
  const [canEditTask, setCanEditTask] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [originalTaskValues, setOriginalTaskValues] = useState(null)
  
  // Drag and drop state
  const [draggedTask, setDraggedTask] = useState(null)
  const [draggedOverDate, setDraggedOverDate] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  
  // Filter state with persistence
  const [filterStatus, setFilterStatusInternal] = useState(() => loadState('filterStatus', 'all'))
  const [filterPriority, setFilterPriorityInternal] = useState(() => loadState('filterPriority', 'all'))
  const [filterDateRange, setFilterDateRangeInternal] = useState(() => loadState('filterDateRange', { start: "", end: "" }))
  const [filterScheduledDate, setFilterScheduledDateInternal] = useState(() => loadState('filterScheduledDate', ''))
  const [filterAsset, setFilterAssetInternal] = useState(() => loadState('filterAsset', ''))
  const [filterTask, setFilterTaskInternal] = useState(() => loadState('filterTask', ''))
  const [showCompletedTasks, setShowCompletedTasksInternal] = useState(() => loadState('showCompletedTasks', false))
  
  // Wrapper functions to persist filter state
  const setFilterStatus = (status) => {
    setFilterStatusInternal(status)
    saveState('filterStatus', status)
  }
  const setFilterPriority = (priority) => {
    setFilterPriorityInternal(priority)
    saveState('filterPriority', priority)
  }
  const setFilterDateRange = (range) => {
    setFilterDateRangeInternal(range)
    saveState('filterDateRange', range)
  }
  
  const setFilterScheduledDate = (date) => {
    setFilterScheduledDateInternal(date)
    saveState('filterScheduledDate', date)
  }
  const setFilterAsset = (asset) => {
    setFilterAssetInternal(asset)
    saveState('filterAsset', asset)
  }
  const setFilterTask = (task) => {
    setFilterTaskInternal(task)
    saveState('filterTask', task)
  }
  const setShowCompletedTasks = (show) => {
    setShowCompletedTasksInternal(show)
    saveState('showCompletedTasks', show)
  }
  
  // Sort state
  const [sortField, setSortField] = useState("")
  const [sortDirection, setSortDirection] = useState("asc")

  // Fetch tasks from database
  const fetchTasks = async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)
      
      // Query starting from task_signoff as primary table (single source of truth)
      // Filter out deleted signoffs and get all related data through joins
      let query = supabase
        .from('task_signoff')
        .select(`
          id,
          due_date,
          scheduled_date,
          scheduled_time,
          comp_date,
          status,
          pm_tasks!inner (
            id,
            task_name,
            maintenance_interval,
            est_minutes,
            tools_needed,
            no_techs_needed,
            reason,
            safety_precautions,
            engineering_rationale,
            common_failures_prevented,
            usage_insights,
            instructions,
            consumables,
            scheduled_dates,
            criticality,
            pm_plans!inner (
              id,
              status,
              child_asset_id,
              parent_asset_id,
              created_by
            )
          )
        `)
        .neq('status', 'deleted')
        .eq('pm_tasks.pm_plans.status', 'Current')

      // Add site filtering if a specific site is selected
      // Note: We can't filter by site_id directly in the query because we need to handle both parent and child asset paths
      // Site filtering will be done in the data transformation step

      const { data, error } = await query

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      // Transform data - each record is now a task_signoff with nested task/plan data
      const transformedTasks = [];
      
      // Collect asset IDs to fetch in batches
      const childAssetIds = [];
      const parentAssetIds = [];
      
      for (const signoff of data) {
        const plan = signoff.pm_tasks.pm_plans;
        if (plan.child_asset_id) {
          childAssetIds.push(plan.child_asset_id);
        } else if (plan.parent_asset_id) {
          parentAssetIds.push(plan.parent_asset_id);
          console.log('🔍 Found parent asset task:', plan.parent_asset_id, signoff.pm_tasks.task_name);
        }
      }
      
      console.log('🔍 Total parent asset tasks found:', parentAssetIds.length);
      
      // Fetch child assets with parent site info
      let childAssetsMap = {};
      if (childAssetIds.length > 0) {
        // Filter out any null/undefined values and get unique IDs
        const uniqueChildIds = Array.from(new Set(childAssetIds.filter(id => id != null)));
        
        if (uniqueChildIds.length > 0) {
          // Build a filter query for multiple IDs using or() instead of in()
          let query = supabase
            .from('child_assets')
            .select('id, name, criticality, parent_assets(site_id)');
          
          // For a single ID, use eq. For multiple, use or with multiple eq conditions
          if (uniqueChildIds.length === 1) {
            query = query.eq('id', uniqueChildIds[0]);
          } else {
            // Build an OR filter string: id.eq.uuid1,id.eq.uuid2,...
            const orConditions = uniqueChildIds.map(id => `id.eq.${id}`).join(',');
            query = query.or(orConditions);
          }
          
          const { data: childAssets, error: childError } = await query;
          
          if (childError) {
            console.error('Error fetching child assets:', childError);
          } else if (childAssets) {
            childAssetsMap = Object.fromEntries(childAssets.map(asset => [asset.id, asset]));
          }
        }
      }
      
      // Fetch parent assets using the exact working pattern from api.js
      let parentAssetsMap = {};
      if (parentAssetIds.length > 0) {
        // Filter out any null/undefined values and get unique IDs
        const uniqueParentIds = Array.from(new Set(parentAssetIds.filter(id => id != null)));
        
        if (uniqueParentIds.length > 0) {
          // Use individual fetching with .eq() pattern from api.js (works without errors)
          for (const parentId of uniqueParentIds) {
            try {
              const { data: parentAsset, error: parentError } = await supabase
                .from('parent_assets')
                .select('*')
                .eq('id', parentId)
                .single();
              
              if (parentError) {
                console.error('Error fetching parent asset:', parentId, parentError);
              } else if (parentAsset) {
                parentAssetsMap[parentId] = parentAsset;
              }
            } catch (error) {
              console.error('Exception fetching parent asset:', parentId, error);
            }
          }
        }
      }
      
      for (const signoff of data) {
        const task = signoff.pm_tasks;
        const plan = task.pm_plans;
        
        // Handle both parent and child asset plans
        let assetName, siteId;
        if (plan.child_asset_id) {
          // Child asset plan
          const asset = childAssetsMap[plan.child_asset_id];
          assetName = asset?.name || 'Unknown Child Asset';
          siteId = asset?.parent_assets?.site_id;
        } else if (plan.parent_asset_id) {
          // Parent asset plan
          const asset = parentAssetsMap[plan.parent_asset_id];
          assetName = asset?.name || 'Unknown Parent Asset';
          siteId = asset?.site_id;
          console.log('🔍 Processing parent asset task:', assetName, task.task_name);
        } else {
          // Fallback for missing asset data
          assetName = 'Unknown Asset';
          siteId = null;
        }
        
        // Apply site filtering if needed
        if (selectedSite && selectedSite !== 'all' && siteId !== selectedSite) {
          continue; // Skip this task if it doesn't match the selected site
        }
        
        // Get due date from signoff record
        const dueDate = signoff.due_date || 'No date';
        
        // Use scheduled_date and scheduled_time from task_signoff, fallback to due_date and default time
        const scheduledDate = signoff.scheduled_date || dueDate;
        const scheduledTime = signoff.scheduled_time || '09:00';
        
        // Determine task status based on signoff completion and due date
        let taskStatus;
        if (signoff.comp_date) {
          taskStatus = 'Completed';
        } else {
          taskStatus = 'Scheduled';
          if (dueDate !== 'No date' && new Date(dueDate) < new Date()) {
            taskStatus = 'Overdue';
          }
        }
        
        transformedTasks.push({
          id: task.id,
          asset: assetName,
          task: task.task_name || 'No description',
          date: scheduledDate, // Keep for backward compatibility
          time: scheduledTime, // Keep for backward compatibility
          dueDate: dueDate, // Actual due date from task_signoff
          scheduledDate: scheduledDate, // Scheduled date from task_signoff
          scheduledTime: scheduledTime, // Scheduled time from task_signoff
          technician: 'Unassigned', // Will need to fetch user data separately if needed
          duration: task.est_minutes ? `${task.est_minutes} min` : (task.maintenance_interval || 'Unknown'),
          status: taskStatus,
          priority: task.criticality || 'Medium', // Task criticality from pm_tasks table
          planId: plan.id,
          signoffId: signoff.id, // Store signoff ID for updates
          siteId: siteId,
          createdByEmail: '', // Will need to fetch separately if needed
          notes: '', // Notes field doesn't exist in pm_tasks
          completedAt: signoff.comp_date, // Use comp_date from signoff
          actualDuration: null, // Field doesn't exist
          instructions: task.instructions,
          // AI fields from pm_tasks table
          time_to_complete: task.est_minutes || 'N/A',
          tools_needed: task.tools_needed || 'N/A',
          no_techs_needed: task.no_techs_needed || 'N/A',
          est_minutes: task.est_minutes,
          // Additional fields for PDF export
          reason: task.reason,
          safety_precautions: task.safety_precautions,
          engineering_rationale: task.engineering_rationale,
          common_failures_prevented: task.common_failures_prevented,
          usage_insights: task.usage_insights,
          scheduled_dates: task.scheduled_dates,
          consumables: task.consumables,
          // Asset information
          childAssetId: plan?.child_asset_id,
          maintenance_interval: task.maintenance_interval // Needed for createNextTask
        });
      }

      setScheduledTasks(transformedTasks)
      
      // Update task statuses based on dates (optimize to avoid immediate re-render)
      setTimeout(() => updateTaskStatusesBasedOnDate(), 100)
    } catch (err) {
      console.error('Error fetching tasks:', err)
      setError(err.message)
      toast({
        title: "Error Loading Tasks",
        description: "Failed to load maintenance tasks. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Update task in database with audit trail and task_signoff updates
  const updateTask = async (taskId, updates, originalTask = null, signoffUpdates = null) => {
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      // If we have the original task, create audit records for changes
      if (originalTask) {
        const auditRecords = [];
        
        // Define field mappings for cleaner audit trail
        const fieldMappings = {
          task_name: 'Task Name',
          instructions: 'Instructions',
          est_minutes: 'Estimated Minutes',
          tools_needed: 'Tools Needed',
          no_techs_needed: 'Number of Technicians',
          reason: 'Reason',
          safety_precautions: 'Safety Precautions',
          engineering_rationale: 'Engineering Rationale',
          common_failures_prevented: 'Common Failures Prevented',
          usage_insights: 'Usage Insights',
          consumables: 'Consumables',
          criticality: 'Criticality'
        };
        
        // Get current task data - using the same query structure as the main fetch to work with RLS
        const { data: currentTaskArray, error: fetchError } = await supabase
          .from('pm_tasks')
          .select(`
            *,
            pm_plans!inner (
              id,
              created_by,
              child_assets!inner (
                parent_assets!inner (
                  site_id
                )
              )
            )
          `)
          .eq('id', taskId);
          
        const currentTask = currentTaskArray?.[0];
          
        if (fetchError) {
          console.error('Error fetching current task for audit:', fetchError);
          // Continue with update even if audit fails
        }

        // Compare each field and create audit records for changes
        for (const [field, value] of Object.entries(updates)) {
          const originalValue = currentTask?.[field];
          
          // Handle array comparison for instructions
          let hasChanged = false;
          let prevValueStr = null;
          let newValueStr = null;
          
          if (field === 'instructions' && Array.isArray(value)) {
            const origArray = Array.isArray(originalValue) ? originalValue : [];
            hasChanged = JSON.stringify(origArray) !== JSON.stringify(value);
            prevValueStr = origArray.join('\n') || null;
            newValueStr = value.join('\n') || null;
          } else {
            hasChanged = originalValue !== value;
            prevValueStr = originalValue?.toString() || null;
            newValueStr = value?.toString() || null;
          }
          
          // Only create audit record if value actually changed
          if (hasChanged) {
            const fieldName = fieldMappings[field] || field;
            
            auditRecords.push({
              task_id: taskId,
              user_id: user.id,
              changed_field: fieldName,
              previous_value: prevValueStr,
              new_value: newValueStr
            });
          }
        }
        
        // Insert all audit records if there are any changes
        if (auditRecords.length > 0) {
          const { error: auditError } = await supabase
            .from('task_edit_audit')
            .insert(auditRecords);
            
          if (auditError) {
            console.error('Error creating audit records:', auditError);
            // Don't fail the update if audit fails, but log it
          }
        }
      }
      
      // Update the task
      const { data, error } = await supabase
        .from('pm_tasks')
        .update(updates)
        .eq('id', taskId)
        .select();

      if (error) throw error;
      
      // Update task_signoff table if signoffUpdates provided
      if (signoffUpdates && (signoffUpdates.scheduled_date || signoffUpdates.scheduled_time)) {
        const { error: signoffError } = await supabase
          .from('task_signoff')
          .update(signoffUpdates)
          .eq('task_id', taskId)
          .is('comp_date', null); // Only update pending signoffs
          
        if (signoffError) {
          console.error('Error updating task_signoff:', signoffError);
          // Don't fail the main update if signoff update fails
        }
      }
      
      // Refresh tasks after successful update
      await fetchTasks();
      return { success: true, data };
    } catch (e) {
      console.error('Error updating task:', e);
      console.error('Task ID:', taskId);
      console.error('Updates attempted:', updates);
      return { success: false, error: e.message };
    }
  }

  // Delete task from database
  const deleteTaskFromDB = async (taskId) => {
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      // First delete any associated task_signoff records
      const { error: signoffError } = await supabase
        .from('task_signoff')
        .delete()
        .eq('task_id', taskId);
      
      if (signoffError) {
        console.error('Error deleting task_signoff records:', signoffError);
      }
      
      // Then delete the task itself
      const { error } = await supabase
        .from('pm_tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      // Refresh tasks
      await fetchTasks();
      return { success: true };
    } catch (err) {
      console.error('Error deleting task:', err);
      return { success: false, error: err.message };
    }
  }

  // Load data when component mounts
  useEffect(() => {
    if (user) {
      fetchTasks()
      loadUserSites()
    }
  }, [user])

  // Reload tasks when selectedSite changes
  useEffect(() => {
    if (user && userSites.length > 0) {
      fetchTasks()
    }
  }, [selectedSite])

  // Load user sites for filtering
  const loadUserSites = async () => {
    try {
      const adminSites = await getUserAdminSites(user.id)
      
      const sitesList = adminSites.map(item => ({
        id: item.sites.id,
        name: `${item.sites?.companies?.name || 'Unknown Company'} - ${item.sites?.name || 'Unknown Site'}`,
        company_id: item.sites?.companies?.id
      }))
      
      setUserSites(sitesList)
    } catch (err) {
      console.error('Error loading user sites:', err)
    }
  }


  // Add navigation handler
  const handleCreateNewPlans = () => {
    navigate('/pmplanner')
  }

  // Check if user can edit task based on site permissions
  const checkCanEditPermission = async (siteId) => {
    if (!user || !siteId) {
      setCanEditTask(false)
      return false
    }

    try {
      // Get the current user's site_users record for this site
      const { data: siteUser, error } = await supabase
        .from('site_users')
        .select('can_edit')
        .eq('user_id', user.id)
        .eq('site_id', siteId)
        .single()

      if (error) {
        console.error('Error checking edit permission:', error)
        setCanEditTask(false)
        return false
      }

      const hasPermission = siteUser?.can_edit || false
      setCanEditTask(hasPermission)
      return hasPermission
    } catch (err) {
      console.error('Error checking permission:', err)
      setCanEditTask(false)
      return false
    }
  }

  // Task action handlers
  const handleViewTask = async (task) => {
    setViewingTask(task)
    setShowViewDialog(true)
    setIsEditMode(false) // Start in view mode
    
    // Check if user can edit this task
    if (task.siteId) {
      await checkCanEditPermission(task.siteId)
    }
  }

  const handleEditTask = async (task) => {
    // Check if user can edit this task
    let hasPermission = true
    if (task.siteId) {
      hasPermission = await checkCanEditPermission(task.siteId)
    }
    
    // Only show edit dialog if user has permission
    if (!hasPermission) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to edit tasks for this site.",
        variant: "destructive",
      })
      return
    }
    
    // Clear previous state first to prevent stale data
    setEditingTask(null)
    setShowEditDialog(false)
    
    // Use setTimeout to ensure state clearing happens before setting new values
    setTimeout(() => {
      setEditingTask(task)
      setEditedStatus(task.status)
      setEditedDate(task.scheduledDate || task.dueDate)
      setEditedTime(task.time)
      setEditedTaskName(task.task || '')
      setEditedCriticality(task.priority || 'Medium') // Set criticality from priority field
      setEditedInstructions(Array.isArray(task.instructions) ? task.instructions.join('\n') : (task.instructions || ''))
      setEditedEstMinutes(parseEstimatedMinutes(task.est_minutes))
      setEditedToolsNeeded(task.tools_needed || '')
      setEditedNoTechsNeeded(task.no_techs_needed || '')
      
      // Parse tools and consumables into lists
      const toolsArray = task.tools_needed ? task.tools_needed.split(',').map(item => item.trim()).filter(item => item) : []
      const consumablesArray = task.consumables ? task.consumables.split(',').map(item => item.trim()).filter(item => item) : []
      setEditedToolsList(toolsArray)
      setEditedConsumablesList(consumablesArray)
      setEditedReason(task.reason || '')
      setEditedSafetyPrecautions(task.safety_precautions || '')
      setEditedConsumables(task.consumables || '')
      
      // Store original values for audit trail
      setOriginalTaskValues({
        task_name: task.task,
        instructions: task.instructions,
        est_minutes: task.est_minutes,
        tools_needed: task.tools_needed,
        no_techs_needed: task.no_techs_needed,
        reason: task.reason,
        safety_precautions: task.safety_precautions,
        engineering_rationale: task.engineering_rationale,
        common_failures_prevented: task.common_failures_prevented,
        usage_insights: task.usage_insights,
        consumables: task.consumables,
        status: task.status,
        assigned_technician: task.technician,
        scheduled_date: task.scheduledDate || task.dueDate,
        scheduled_time: task.time
      })
      setShowEditDialog(true)
    }, 10) // Small delay to ensure state clearing
  }

  const handleDeleteTask = (task) => {
    setDeletingTask(task)
    setShowDeleteDialog(true)
  }

  const confirmDeleteTask = async () => {
    if (deletingTask) {
      const result = await deleteTaskFromDB(deletingTask.id)
      if (result.success) {
        toast({
          title: "Task Deleted",
          description: `Maintenance task for ${deletingTask.asset} has been removed.`,
          variant: "default",
        })
      } else {
        toast({
          title: "Error Deleting Task",
          description: result.error || "Failed to delete task. Please try again.",
          variant: "destructive",
        })
      }
      setDeletingTask(null)
      setShowDeleteDialog(false)
    }
  }

  // Helper function to parse estimated minutes from various formats
  const parseEstimatedMinutes = (value) => {
    if (!value) return ''
    
    // If it's already a number, return as string
    if (typeof value === 'number') return value.toString()
    
    const str = value.toString().toLowerCase()
    
    // Handle different formats
    if (str.includes('hour')) {
      // Extract number before 'hour' - handles "1.5 hours", "2 hours", etc.
      const match = str.match(/(\d+\.?\d*)\s*hours?/)
      if (match) {
        return (parseFloat(match[1]) * 60).toString() // Convert hours to minutes
      }
    }
    
    if (str.includes('min')) {
      // Extract number before 'min' - handles "90 minutes", "45 min", etc.
      const match = str.match(/(\d+\.?\d*)\s*min/)
      if (match) {
        return match[1]
      }
    }
    
    // If it's just a number string, return as is
    if (/^\d+\.?\d*$/.test(str)) {
      return str
    }
    
    // If we can't parse it, return empty string
    return ''
  }

  // Helper function to safely parse integer values
  const safeParseInt = (value) => {
    if (!value || value === '') return null
    const parsed = parseInt(value)
    return isNaN(parsed) ? null : parsed
  }

  // Function to clean up edit dialog state
  const cleanupEditDialogState = () => {
    setEditingTask(null)
    setOriginalTaskValues(null)
    setEditedTaskName('')
    setEditedInstructions('')
    setEditedEstMinutes('')
    setEditedToolsNeeded('')
    setEditedNoTechsNeeded('')
    setEditedReason('')
    setEditedSafetyPrecautions('')
    setEditedConsumables('')
    setEditedToolsList([])
    setEditedConsumablesList([])
    setEditedStatus('Scheduled')
    setEditedDate('')
    setEditedTime('')
    setEditedCriticality('Medium')
  }

  const saveTaskChanges = async () => {
    if (editingTask) {
      const updates = {
        task_name: editedTaskName,
        instructions: editedInstructions.split('\n').filter(line => line.trim()),
        est_minutes: editedEstMinutes || null, // Keep as text to match schema
        tools_needed: editedToolsList.filter(tool => tool.trim()).join(', '),
        no_techs_needed: safeParseInt(editedNoTechsNeeded),
        reason: editedReason,
        safety_precautions: editedSafetyPrecautions,
        consumables: editedConsumablesList.filter(item => item.trim()).join(', '),
        criticality: editedCriticality,
        status: editedStatus
      }

      // Also update task_signoff table with scheduled date/time
      const signoffUpdates = {
        scheduled_date: editedDate || null,
        scheduled_time: editedTime || null
      }


      // Debug logging
      console.log('About to update task with:', updates);
      console.log('Task ID:', editingTask.id);
      
      // Now with full audit trail support including task_signoff updates
      const result = await updateTask(editingTask.id, updates, originalTaskValues, signoffUpdates)
      if (result.success) {
        toast({
          title: "Task Updated",
          description: `Changes to ${editingTask.task || 'task'} have been saved.`,
          variant: "default",
        })
      } else {
        console.error('Update failed with error:', result.error);
        toast({
          title: "Error Updating Task",
          description: result.error || "Failed to update task. Please try again.",
          variant: "destructive",
        })
      }
      closeEditDialog()
    }
  }

  // Handle dialog open change with proper cleanup - prevent accidental closing
  const handleEditDialogOpenChange = (open) => {
    // Only allow closing when explicitly requested (ignore outside clicks/escape)
    // The dialog should only close via Cancel or Save buttons
    if (open === false) {
      // Don't allow external close attempts
      return
    }
    setShowEditDialog(open)
  }

  // Function to explicitly close the dialog with cleanup
  const closeEditDialog = () => {
    setShowEditDialog(false)
    cleanupEditDialogState()
  }

  // Update task date with drag and drop
  const updateTaskDate = async (taskId, signoffId, newDate, originalDate) => {
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Create audit record for the date change
      const auditRecord = {
        task_id: taskId,
        user_id: user.id,
        changed_field: 'Scheduled Date',
        previous_value: originalDate,
        new_value: newDate
      };

      // Insert audit record
      const { error: auditError } = await supabase
        .from('task_edit_audit')
        .insert([auditRecord]);

      if (auditError) {
        console.error('Error creating audit record:', auditError);
      }

      // Update the specific task_signoff record using signoff ID
      // This is the primary update since calendar view shows scheduled_date from task_signoff
      const { error: signoffError } = await supabase
        .from('task_signoff')
        .update({ 
          scheduled_date: newDate
        })
        .eq('id', signoffId);
      
      if (signoffError) {
        console.error('Error updating task_signoff:', signoffError);
        throw signoffError;
      }

      // Refresh tasks to show the change
      await fetchTasks();
      
      toast({
        title: "Task Date Updated",
        description: `Task moved to ${new Date(newDate).toLocaleDateString()}`,
        variant: "default",
      });

      return { success: true };
    } catch (e) {
      console.error('Error updating task date:', e);
      toast({
        title: "Error Moving Task",
        description: e.message || "Failed to update task date",
        variant: "destructive",
      });
      return { success: false, error: e.message };
    }
  };

  // Drag and drop handlers
  const handleDragStart = async (e, task) => {
    // Check if user can edit this task
    if (task.siteId) {
      const hasPermission = await checkCanEditPermission(task.siteId);
      if (!hasPermission) {
        e.preventDefault();
        toast({
          title: "Permission Denied",
          description: "You don't have permission to move tasks for this site.",
          variant: "destructive",
        });
        return;
      }
    } else {
      // If no siteId, prevent dragging as a safety measure
      e.preventDefault();
      toast({
        title: "Cannot Move Task",
        description: "This task cannot be moved (missing site information).",
        variant: "destructive",
      });
      return;
    }

    setDraggedTask(task);
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.outerHTML);
  };

  const handleDragOver = (e, dateStr) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDraggedOverDate(dateStr);
  };

  const handleDragLeave = () => {
    setDraggedOverDate(null);
  };

  const handleDrop = async (e, targetDate) => {
    e.preventDefault();
    
    if (!draggedTask) return;

    const newDateStr = targetDate.toISOString().split('T')[0];
    const originalDateStr = draggedTask.date;

    // Don't do anything if dropped on the same date
    if (newDateStr === originalDateStr) {
      setDraggedTask(null);
      setDraggedOverDate(null);
      setIsDragging(false);
      return;
    }

    // Update the task date
    await updateTaskDate(draggedTask.id, draggedTask.signoffId, newDateStr, originalDateStr);

    // Reset drag state
    setDraggedTask(null);
    setDraggedOverDate(null);
    setIsDragging(false);
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDraggedOverDate(null);
    setIsDragging(false);
  };

  // Export functionality
  const exportTaskData = (task, format = "json") => {
    const taskData = {
      id: task.id,
      asset: task.asset,
      task: task.task,
      date: task.dueDate,
      time: task.time,
      technician: task.technician,
      duration: task.duration,
      time_to_complete: task.time_to_complete || 'N/A',
      tools_needed: task.tools_needed || 'N/A',
      no_techs_needed: task.no_techs_needed || 'N/A',
      status: task.status,
      priority: task.priority,
      planId: task.planId,
    }

    let content, mimeType, fileName

    switch (format) {
      case "emaint-x5":
        // eMaint X5 Task Template Format
        const emaintHeaders = [
          "PM_NUMBER",
          "TASK_NUMBER",
          "TASK_DESC",
          "FREQUENCY",
          "SCHEDULED_DATE",
          "SCHEDULED_TIME",
          "DURATION_HOURS",
          "TIME_TO_COMPLETE",
          "TOOLS_NEEDED",
          "NO_TECHS_NEEDED",
          "TASK_PRIORITY",
          "TASK_STATUS",
          "ASSIGNED_TO",
          "ASSET_ID",
          "ASSET_DESC",
        ]

        const emaintTaskRow = [
          task.planId, // PM_NUMBER
          `${task.planId}-${task.id}`, // TASK_NUMBER
          task.task, // TASK_DESC
          "As Required", // FREQUENCY
          task.scheduledDate || task.dueDate, // SCHEDULED_DATE
          task.time, // SCHEDULED_TIME
          task.duration
            .replace(" min", "/60")
            .replace(" hours", "")
            .replace(" hour", ""), // DURATION_HOURS
          task.time_to_complete || 'N/A', // TIME_TO_COMPLETE
          task.tools_needed || 'N/A', // TOOLS_NEEDED
          task.no_techs_needed || 'N/A', // NO_TECHS_NEEDED
          task.priority.toUpperCase(), // TASK_PRIORITY
          task.status.toUpperCase(), // TASK_STATUS
          task.technician, // ASSIGNED_TO
          task.planId.replace("P", "A"), // ASSET_ID (derived from plan ID)
          task.asset, // ASSET_DESC
        ]

        let emaintContent = emaintHeaders.join(",") + "\n"
        emaintContent += emaintTaskRow.map((field) => `"${field}"`).join(",") + "\n"

        content = emaintContent
        mimeType = "text/csv"
        fileName = `emaint-x5-task-${task.id}.csv`
        break

      case "csv":
        const csvHeaders = [
          "Task ID",
          "Asset",
          "Task",
          "Date",
          "Time",
          "Technician",
          "Duration",
          "Time to Complete",
          "Tools Needed",
          "No. of Techs",
          "Status",
          "Priority",
          "Plan ID",
        ]
        const csvRow = [
          taskData.id,
          taskData.asset,
          taskData.task,
          taskData.date,
          taskData.time,
          taskData.technician,
          taskData.duration,
          taskData.time_to_complete,
          taskData.tools_needed,
          taskData.no_techs_needed,
          taskData.status,
          taskData.priority,
          taskData.planId,
        ]

        content = csvHeaders.join(",") + "\n" + csvRow.map((field) => `"${field}"`).join(",")
        mimeType = "text/csv"
        fileName = `maintenance-task-${task.id}.csv`
        break

      case "excel":
        let excelContent = `Maintenance Task Report\n`
        excelContent += `Generated on: ${new Date().toLocaleDateString()}\n\n`
        excelContent += `Task Information\n`
        excelContent += `Task ID,${taskData.id}\n`
        excelContent += `Asset,${taskData.asset}\n`
        excelContent += `Task Description,${taskData.task}\n`
        excelContent += `Scheduled Date,${taskData.date}\n`
        excelContent += `Scheduled Time,${taskData.time}\n`
        excelContent += `Assigned Technician,${taskData.technician}\n`
        excelContent += `Duration,${taskData.duration}\n`
        excelContent += `Time to Complete,${taskData.time_to_complete}\n`
        excelContent += `Tools Needed,${taskData.tools_needed}\n`
        excelContent += `Number of Technicians,${taskData.no_techs_needed}\n`
        excelContent += `Status,${taskData.status}\n`
        excelContent += `Priority,${taskData.priority}\n`
        excelContent += `Related Plan ID,${taskData.planId}\n`

        content = excelContent
        mimeType = "application/vnd.ms-excel"
        fileName = `maintenance-task-${task.id}.xls`
        break

      case "word":
        const wordContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Maintenance Task Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { text-align: center; margin-bottom: 30px; }
        .info-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .info-table td { padding: 8px; border: 1px solid #ddd; }
        .info-table td:first-child { font-weight: bold; background-color: #f8f9fa; width: 200px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Maintenance Task Report</h1>
        <h2>${taskData.asset}</h2>
        <p>Generated on: ${new Date().toLocaleDateString()}</p>
    </div>

    <table class="info-table">
        <tr><td>Task ID</td><td>${taskData.id}</td></tr>
        <tr><td>Asset</td><td>${taskData.asset}</td></tr>
        <tr><td>Task Description</td><td>${taskData.task}</td></tr>
        <tr><td>Scheduled Date</td><td>${taskData.date}</td></tr>
        <tr><td>Scheduled Time</td><td>${taskData.time}</td></tr>
        <tr><td>Assigned Technician</td><td>${taskData.technician}</td></tr>
        <tr><td>Duration</td><td>${taskData.duration}</td></tr>
        <tr><td>Time to Complete</td><td>${taskData.time_to_complete}</td></tr>
        <tr><td>Tools Needed</td><td>${taskData.tools_needed}</td></tr>
        <tr><td>Number of Technicians</td><td>${taskData.no_techs_needed}</td></tr>
        <tr><td>Status</td><td>${taskData.status}</td></tr>
        <tr><td>Priority</td><td>${taskData.priority}</td></tr>
        <tr><td>Related Plan ID</td><td>${taskData.planId}</td></tr>
    </table>
</body>
</html>`

        content = wordContent
        mimeType = "application/msword"
        fileName = `maintenance-task-${task.id}.doc`
        break

      default:
        content = JSON.stringify(taskData, null, 2)
        mimeType = "application/json"
        fileName = `maintenance-task-${task.id}.json`
    }

    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.download = fileName
    a.href = url
    a.click()
    URL.revokeObjectURL(url)

    toast({
      title: "Task Exported Successfully",
      description: `Maintenance task for ${task.asset} has been exported as ${format === "emaint-x5" ? "eMaint X5 template" : format.toUpperCase()}.`,
      variant: "default",
    })
  }

  const handleExportTask = (task) => {
    setExportingTask(task)
    setShowExportDialog(true)
  }

  const handleSignOffTask = async (task) => {
    setSigningOffTask(task)
    
    // Initialize consumables from task data
    const taskConsumables = task.consumables ? task.consumables.split(',').map(item => item.trim()) : []
    const initialConsumables = taskConsumables.map((consumable, index) => ({
      id: index,
      name: consumable,
      needed: false,
      brand: '',
      version: '',
      cost: ''
    }))
    
    setSignOffData({
      technician_id: '',
      completion_date: new Date().toISOString().split('T')[0],
      total_expense: '',
      consumables: initialConsumables,
      uploaded_file: null
    })
    
    // Load site users for technician dropdown
    await loadSiteUsers(task)
    setShowSignOffDialog(true)
  }

  const loadSiteUsers = async (task) => {
    try {
      console.log('🔍 Loading site users for task:', task.id)
      
      // Step 1: Get the PM plan ID from the task (simplest query)
      const { data: taskData, error: taskError } = await supabase
        .from('pm_tasks')
        .select('pm_plan_id')
        .eq('id', task.id)
        .single()

      if (taskError) {
        console.error('❌ Task query error:', taskError)
        throw taskError
      }

      // Step 2: Get the child_asset_id from the PM plan
      const { data: planData, error: planError } = await supabase
        .from('pm_plans')
        .select('child_asset_id')
        .eq('id', taskData.pm_plan_id)
        .single()

      if (planError) {
        console.error('❌ PM plan query error:', planError)
        throw planError
      }

      // Step 3: Get the parent_asset_id from the child asset
      const { data: childAssetData, error: childAssetError } = await supabase
        .from('child_assets')
        .select('parent_asset_id')
        .eq('id', planData.child_asset_id)
        .single()

      if (childAssetError) {
        console.error('❌ Child asset query error:', childAssetError)
        throw childAssetError
      }

      // Step 4: Get the site_id from the parent asset
      const { data: parentAssetData, error: parentAssetError } = await supabase
        .from('parent_assets')
        .select('site_id')
        .eq('id', childAssetData.parent_asset_id)
        .maybeSingle() // Use maybeSingle to avoid errors if not found

      if (parentAssetError) {
        console.error('❌ Parent asset query error:', parentAssetError)
        throw parentAssetError
      }

      const siteId = parentAssetData?.site_id
      
      if (!siteId) {
        throw new Error('Could not determine site for this task')
      }

      console.log('✅ Found site ID:', siteId)

      // Step 5: Get site_users for this site
      const { data: siteUsersData, error: siteUsersError } = await supabase
        .from('site_users')
        .select('user_id')
        .eq('site_id', siteId)

      if (siteUsersError) {
        console.error('❌ Site users query error:', siteUsersError)
        throw siteUsersError
      }

      if (!siteUsersData || siteUsersData.length === 0) {
        console.log('📭 No users found for site:', siteId)
        setSiteUsers([])
        return
      }

      // Step 6: Get user details
      const userIds = siteUsersData.map(su => su.user_id)
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, email, full_name')
        .in('id', userIds)

      if (usersError) {
        console.error('❌ Users query error:', usersError)
        throw usersError
      }

      // Transform data to match expected format
      const formattedUsers = (usersData || []).map(user => ({
        users: user // Wrap in users object to match existing component expectations
      }))

      console.log('✅ Site users loaded:', formattedUsers)
      setSiteUsers(formattedUsers)
    } catch (error) {
      console.error('❌ Error loading site users:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        fullError: error
      })
      toast({
        title: "Error",
        description: "Failed to load technicians for this site",
        variant: "destructive",
      })
    }
  }

  const handleSubmitSignOff = async () => {
    if (!signOffData.technician_id || !signOffData.completion_date) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    setLoadingSignOff(true)
    
    try {
      // Check if there's an existing task_signoff record without comp_date (pending)
      const { data: existingSignoff, error: fetchError } = await supabase
        .from('task_signoff')
        .select('*')
        .eq('task_id', signingOffTask.id)
        .is('comp_date', null)
        .single()
      
      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw fetchError
      }
      
      let createdSignOff;
      
      if (existingSignoff) {
        // Update existing record
        const { data: updatedSignOff, error: updateError } = await supabase
          .from('task_signoff')
          .update({
            tech_id: signOffData.technician_id,
            total_expense: parseFloat(signOffData.total_expense) || 0,
            comp_date: signOffData.completion_date,
            status: 'completed' // Mark as completed when signed off
          })
          .eq('id', existingSignoff.id)
          .select()
          .single()
        
        if (updateError) throw updateError
        createdSignOff = updatedSignOff
      } else {
        // Create new record if none exists (backward compatibility)
        const signOffRecord = {
          tech_id: signOffData.technician_id,
          task_id: signingOffTask.id,
          total_expense: parseFloat(signOffData.total_expense) || 0,
          due_date: signingOffTask.date,
          comp_date: signOffData.completion_date,
          status: 'completed' // Mark as completed when signed off
        }

        const { data: newSignOff, error: signOffError } = await supabase
          .from('task_signoff')
          .insert([signOffRecord])
          .select()
          .single()

        if (signOffError) throw signOffError
        createdSignOff = newSignOff
      }

      // Create consumables records in signoff_consumables table
      if (signOffData.consumables.length > 0) {
        const consumableRecords = signOffData.consumables.map(consumable => ({
          so_id: createdSignOff.id,
          consumable: consumable.name,
          used: consumable.needed,
          brand: consumable.needed ? consumable.brand : null,
          version: consumable.needed ? consumable.version : null,
          cost: consumable.needed ? (parseFloat(consumable.cost) || 0) : null
        }))

        const { error: consumablesError } = await supabase
          .from('signoff_consumables')
          .insert(consumableRecords)

        if (consumablesError) throw consumablesError
      }

      // Handle file upload if provided
      if (signOffData.uploaded_file) {
        const fileName = `signoff_${createdSignOff.id}_${Date.now()}_${signOffData.uploaded_file.name}`
        const filePath = `${user.id}/${fileName}`

        // Upload file to storage
        const { error: uploadError } = await supabase.storage
          .from('user-manuals')
          .upload(filePath, signOffData.uploaded_file)

        if (uploadError) throw uploadError

        // Create record in loaded_signoff_docs table
        const docRecord = {
          so_Id: createdSignOff.id,
          file_path: filePath,
          file_name: fileName,
          original_name: signOffData.uploaded_file.name,
          file_size: signOffData.uploaded_file.size.toString(),
          file_type: signOffData.uploaded_file.type
        }

        const { error: docError } = await supabase
          .from('loaded_signoff_docs')
          .insert([docRecord])

        if (docError) throw docError
      }

      // Note: We don't update the task status to 'Completed' because tasks are recurring.
      // Only the task_signoff record is marked complete. The task remains active for future occurrences.

      // Create next occurrence of the task based on maintenance interval
      await createNextTask(signingOffTask)

      toast({
        title: "Success",
        description: "Task sign-off completed successfully. Next occurrence scheduled.",
        variant: "default",
      })

      setShowSignOffDialog(false)
      setSigningOffTask(null)
      
      // Refresh the tasks list to reflect any status changes
      await fetchTasks()
      
    } catch (error) {
      console.error('Error submitting sign-off:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      toast({
        title: "Error",
        description: `Failed to submit sign-off: ${error.message || 'Please try again.'}`,
        variant: "destructive",
      })
    } finally {
      setLoadingSignOff(false)
    }
  }

  const createNextTask = async (completedTask) => {
    try {
      // Parse the maintenance interval to calculate next due date
      const interval = completedTask.maintenance_interval
      // Use the completion date as the basis for the next due date
      const completionDate = new Date(signOffData.completion_date)
      let nextDate = new Date(completionDate)

      // Helper function to parse maintenance interval and convert to months
      const parseMaintenanceInterval = (intervalStr) => {
        if (!intervalStr) return 0;
        
        const interval = intervalStr.toLowerCase().trim();
        
        // Handle text-based intervals
        if (interval.includes('annual')) return 12;
        if (interval.includes('semi-annual') || interval.includes('biannual')) return 6;
        if (interval.includes('quarter')) return 3;
        if (interval.includes('bimonth') || interval.includes('bi-month')) return 2;
        if (interval.includes('month')) {
          // Extract number from "# months" format
          const match = interval.match(/(\d+)\s*month/);
          return match ? parseInt(match[1]) : 1;
        }
        if (interval.includes('week')) {
          // Convert weeks to months (approximate)
          const match = interval.match(/(\d+)\s*week/);
          const weeks = match ? parseInt(match[1]) : 1;
          return Math.round(weeks / 4.33); // 4.33 weeks per month average
        }
        if (interval.includes('day')) {
          // Convert days to months (approximate)
          const match = interval.match(/(\d+)\s*day/);
          const days = match ? parseInt(match[1]) : 1;
          return Math.round(days / 30.44); // 30.44 days per month average
        }
        
        // Try to extract just a number (assume months)
        const numberMatch = interval.match(/(\d+)/);
        return numberMatch ? parseInt(numberMatch[1]) : 1;
      };

      // Helper function to adjust date for weekends
      const adjustForWeekend = (date) => {
        const dayOfWeek = date.getDay();
        if (dayOfWeek === 0) { // Sunday
          date.setDate(date.getDate() - 2);
        } else if (dayOfWeek === 6) { // Saturday
          date.setDate(date.getDate() - 1);
        }
        return date;
      };

      // Parse interval and calculate next date
      const intervalMonths = parseMaintenanceInterval(interval);
      console.log(`Parsing maintenance interval: "${interval}" -> ${intervalMonths} months`);
      
      if (intervalMonths > 0) {
        nextDate.setMonth(nextDate.getMonth() + intervalMonths);
      } else {
        // Default to 1 month if no valid interval
        console.log('No valid interval found, defaulting to 1 month');
        nextDate.setMonth(nextDate.getMonth() + 1);
      }

      // Adjust for weekend
      nextDate = adjustForWeekend(nextDate);

      // Create the next task_signoff record for the next occurrence
      const nextSignoffData = {
        task_id: completedTask.id,
        due_date: nextDate.toISOString().split('T')[0],
        scheduled_date: nextDate.toISOString().split('T')[0], // Set scheduled_date = due_date initially
        scheduled_time: null, // No time scheduled yet
        tech_id: null,
        total_expense: null,
        comp_date: null,
        status: 'pending' // Set status as pending for new task occurrence
      }

      console.log('Creating next task_signoff record:', JSON.stringify(nextSignoffData, null, 2))
      
      const { error: createError } = await supabase
        .from('task_signoff')
        .insert([nextSignoffData])

      if (createError) {
        console.error('Error creating next task_signoff:', createError)
        console.error('Create task_signoff error details:', JSON.stringify(createError, null, 2))
        throw createError
      }

      console.log('Next task_signoff created successfully for date:', nextDate.toISOString().split('T')[0])
    } catch (error) {
      console.error('Error in createNextTask:', error)
      // Don't throw error to avoid disrupting the sign-off process
    }
  }

  const copyPreviousConsumables = async (currentTask) => {
    try {
      // Find the most recent completed signoff for the same task
      const { data: previousSignoffs, error: signoffError } = await supabase
        .from('task_signoff')
        .select(`
          id,
          comp_date,
          signoff_consumables (
            consumable,
            used,
            brand,
            version,
            cost
          )
        `)
        .eq('task_id', currentTask.id)
        .not('comp_date', 'is', null) // Only completed signoffs
        .order('comp_date', { ascending: false })
        .limit(1)

      if (signoffError) {
        console.error('Error fetching previous signoffs:', signoffError)
        toast({
          title: "Error",
          description: "Failed to fetch previous signoff data",
          variant: "destructive",
        })
        return
      }

      if (!previousSignoffs || previousSignoffs.length === 0) {
        toast({
          title: "No Previous Data",
          description: "No previous signoffs found for this task",
          variant: "default",
        })
        return
      }

      const previousSignoff = previousSignoffs[0]
      const previousConsumables = previousSignoff.signoff_consumables || []

      if (previousConsumables.length === 0) {
        toast({
          title: "No Consumables Data",
          description: "No consumables data found in previous signoff",
          variant: "default",
        })
        return
      }

      // Convert previous consumables to the current form format
      const consumablesForForm = previousConsumables.map((item, index) => ({
        id: Date.now() + index,
        name: item.consumable || '',
        needed: item.used || false,
        brand: item.brand || '',
        version: item.version || '',
        cost: item.cost ? item.cost.toString() : ''
      }))

      // Update the form with previous consumables data
      setSignOffData(prev => ({
        ...prev,
        consumables: consumablesForForm
      }))

      toast({
        title: "Success",
        description: `Copied ${consumablesForForm.length} consumables from previous signoff`,
        variant: "default",
      })

    } catch (error) {
      console.error('Error copying previous consumables:', error)
      toast({
        title: "Error",
        description: "Failed to copy previous consumables data",
        variant: "destructive",
      })
    }
  }

  const updateTaskStatusesBasedOnDate = async (shouldRefetch = false) => {
    try {
      const today = new Date().toISOString().split('T')[0]

      // Fetch all non-completed tasks to check their dates
      const { data: allTasks, error: fetchError } = await supabase
        .from('pm_tasks')
        .select('id, scheduled_dates, status')
        .neq('status', 'Completed')

      if (fetchError) {
        console.error('Error fetching tasks for status update:', fetchError)
        return
      }

      const tasksToUpdate = []
      
      allTasks?.forEach(task => {
        if (task.scheduled_dates && task.scheduled_dates.length > 0) {
          const taskDate = task.scheduled_dates[0] // First scheduled date
          
          if (taskDate < today && task.status !== 'Overdue') {
            tasksToUpdate.push({ id: task.id, newStatus: 'Overdue' })
          } else if (taskDate === today && task.status !== 'Due Today') {
            tasksToUpdate.push({ id: task.id, newStatus: 'Due Today' })
          }
        }
      })

      // Update tasks in batches
      const updatePromises = tasksToUpdate.map(task => 
        supabase
          .from('pm_tasks')
          .update({ status: task.newStatus })
          .eq('id', task.id)
      )

      if (updatePromises.length > 0) {
        const results = await Promise.all(updatePromises)
        const errors = results.filter(result => result.error)
        
        if (errors.length > 0) {
          console.error('Some status updates failed:', errors)
        }

        console.log(`Task statuses updated based on dates: ${tasksToUpdate.length} tasks updated`)
        
        // Update local state to reflect changes
        setScheduledTasks(prevTasks => 
          prevTasks.map(task => {
            const updatedTask = tasksToUpdate.find(t => t.id === task.id)
            if (updatedTask) {
              return { ...task, status: updatedTask.newStatus }
            }
            return task
          })
        )
      } else {
        console.log('No tasks needed status updates')
      }
    } catch (error) {
      console.error('Error in updateTaskStatusesBasedOnDate:', error)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "Completed":
        return "default"
      case "In Progress":
        return "secondary"
      case "Scheduled":
        return "outline"
      case "Overdue":
        return "destructive"
      case "Due Today":
        return "default"
      default:
        return "outline"
    }
  }

  const getRowClassName = (task) => {
    if (task.status === "Overdue") {
      return "bg-red-50 border-red-200"
    } else if (task.status === "Due Today") {
      return "bg-yellow-50 border-yellow-200"
    }
    return ""
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "High":
        return "destructive"
      case "Medium":
        return "default"
      case "Low":
        return "secondary"
      default:
        return "outline"
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case "Completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "In Progress":
        return <Clock className="h-4 w-4 text-blue-500" />
      case "Overdue":
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <CalendarDays className="h-4 w-4 text-gray-500" />
    }
  }

  // Calendar helper functions
  const getDaysInMonth = (date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()
    
    const days = []
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day)
    }
    
    return days
  }

  const getTasksForDate = (date) => {
    const dateString = date.toISOString().split('T')[0]
    return filteredTasks.filter(task => (task.scheduledDate || task.dueDate) === dateString)
  }

  const navigateMonth = (direction) => {
    const newMonth = new Date(currentMonth)
    newMonth.setMonth(currentMonth.getMonth() + direction)
    setCurrentMonth(newMonth)
  }

  const formatMonthYear = (date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  // Authentication check
  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <p className="text-muted-foreground">Please sign in to access the maintenance dashboard.</p>
      </div>
    )
  }

  // Loading state
  if (loading) {
    return <MaintenanceScheduleLoading />
  }

  // Error state
  if (error) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
          <div>
            <p className="text-lg font-medium">Error Loading Tasks</p>
            <p className="text-muted-foreground">{error}</p>
          </div>
          <Button onClick={fetchTasks}>
            Try Again
          </Button>
        </div>
      </div>
    )
  }
  
  
  // Filter and sort tasks
  let processedTasks = scheduledTasks.filter(task => {
    // Debug logging for problematic filters
    const debugLog = false; // Set to true to enable debugging
    if (debugLog && (filterAsset || filterTask)) {
      console.log('Filtering task:', {
        id: task.id,
        asset: task.asset,
        task: task.task,
        filterAsset,
        filterTask,
        assetMatch: filterAsset ? (task.asset || '').toLowerCase().includes(filterAsset.toLowerCase()) : 'N/A',
        taskMatch: filterTask ? (task.task || '').toLowerCase().includes(filterTask.toLowerCase()) : 'N/A'
      });
    }
    
    // Filter out completed tasks unless showCompletedTasks is true
    if (!showCompletedTasks && task.status === 'Completed') {
      return false;
    }
    
    // Status filter
    if (filterStatus !== "all" && task.status !== filterStatus) {
      return false;
    }
    
    // Priority filter  
    if (filterPriority !== "all" && task.priority !== filterPriority) {
      return false;
    }
    
    
    // Due date filter (exact match)
    if (filterDateRange.start && task.dueDate !== filterDateRange.start) return false
    
    // Scheduled date filter (exact match)
    if (filterScheduledDate && task.scheduledDate !== filterScheduledDate) return false
    
    // Asset text filter
    if (filterAsset) {
      const assetLower = (task.asset || '').toLowerCase();
      const filterLower = filterAsset.toLowerCase();
      const matches = assetLower.includes(filterLower);
      
      if (debugLog) {
        console.log('Asset filter check:', {
          taskId: task.id,
          originalAsset: task.asset,
          assetLower,
          filterLower,
          matches,
          willFilter: !matches
        });
      }
      
      if (!matches) return false;
    }
    
    // Task text filter  
    if (filterTask) {
      const taskLower = (task.task || '').toLowerCase();
      const filterLower = filterTask.toLowerCase();
      const matches = taskLower.includes(filterLower);
      
      if (debugLog) {
        console.log('Task filter check:', {
          taskId: task.id,
          originalTask: task.task,
          taskLower,
          filterLower,
          matches,
          willFilter: !matches
        });
      }
      
      if (!matches) return false;
    }
    
    return true
  })
  
  // Apply sorting
  if (sortField) {
    processedTasks = [...processedTasks].sort((a, b) => {
      let aValue = a[sortField]
      let bValue = b[sortField]
      
      // Handle date sorting
      if (sortField === 'date' || sortField === 'dueDate' || sortField === 'scheduledDate') {
        aValue = new Date(aValue || '9999-12-31') // Put nulls at the end
        bValue = new Date(bValue || '9999-12-31')
      }
      
      // Handle priority sorting (High > Medium > Low)
      if (sortField === 'priority') {
        const priorityOrder = { 'High': 3, 'Medium': 2, 'Low': 1 }
        aValue = priorityOrder[aValue] || 0
        bValue = priorityOrder[bValue] || 0
      }
      
      // Handle status sorting
      if (sortField === 'status') {
        const statusOrder = { 'Overdue': 4, 'In Progress': 3, 'Scheduled': 2, 'Completed': 1 }
        aValue = statusOrder[aValue] || 0
        bValue = statusOrder[bValue] || 0
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }

  const filteredTasks = processedTasks
  
  // Reset filters
  const resetFilters = () => {
    setFilterStatus("all")
    setFilterPriority("all")
    setFilterDateRange({ start: "", end: "" })
    setFilterScheduledDate("")
    setFilterAsset("")
    setFilterTask("")
    setSortField("")
    setSortDirection("asc")
    // Note: We don't reset showCompletedTasks as it's a view preference, not a filter
  }
  
  // Handle sorting
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }
  
  // Calculate weekly view data from real tasks
  const getWeeklyView = () => {
    const today = new Date()
    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() - today.getDay()) // Start of week (Sunday)
    
    const weeklyData = []
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart)
      date.setDate(weekStart.getDate() + i)
      
      const dateStr = date.toISOString().split('T')[0]
      const tasksCount = filteredTasks.filter(task => (task.scheduledDate || task.dueDate) === dateStr).length
      
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      
      weeklyData.push({
        date: `${dayNames[i]} ${date.getDate()}`,
        tasks: tasksCount
      })
    }
    
    return weeklyData
  }

  // Calculate summary stats
  const getSummaryStats = () => {
    const total = filteredTasks.length
    const completed = filteredTasks.filter(task => task.status === 'Completed').length
    const overdue = filteredTasks.filter(task => task.status === 'Overdue').length
    
    return { total, completed, overdue }
  }
  
  const weeklyView = getWeeklyView()
  const stats = getSummaryStats()

  return (
    <ComponentErrorBoundary name="Maintenance Schedule" fallbackMessage="Unable to load the maintenance schedule. Please try refreshing the page.">
      <TooltipProvider>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Maintenance Schedule</h2>
              <p className="text-muted-foreground">View and manage scheduled maintenance tasks</p>
            </div>
            {/* Hidden Generate New Plans button
            <button
              onClick={handleCreateNewPlans}
              className="px-6 py-2 sm:px-8 sm:py-3 rounded-lg font-semibold text-white text-sm sm:text-base bg-blue-600 hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <CalendarDays className="h-4 w-4" />
              Generate New Plans
            </button> */}
          </div>

          {/* Site Filter */}
          <div className="flex items-center gap-4 mb-4">
            <Label htmlFor="site-filter" className="text-sm font-medium text-gray-700">
              Site:
            </Label>
            {userSites.length === 1 ? (
              <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-600 text-sm">
                {userSites[0].name}
              </div>
            ) : (
              <Select value={selectedSite} onValueChange={setSelectedSite}>
                <SelectTrigger className="w-80">
                  <SelectValue placeholder="Select site..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sites</SelectItem>
                  {userSites.map((site) => (
                    <SelectItem key={site.id} value={site.id}>
                      {site.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <Tabs value={viewMode} onValueChange={setViewMode} className="space-y-6">
            <TabsList className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
              <TabsTrigger value="assets" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">Asset View</TabsTrigger>
              <TabsTrigger value="list" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">Task View</TabsTrigger>
              <TabsTrigger value="calendar" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">Calendar View</TabsTrigger>
              <TabsTrigger value="weekly" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white">Weekly View</TabsTrigger>
            </TabsList>

            <TabsContent value="assets" className="space-y-6" forceMount hidden={viewMode !== 'assets'}>
              <ManageAssets 
                onAssetUpdate={fetchTasks} 
                onPlanCreate={fetchTasks} 
                selectedSite={selectedSite}
                userSites={userSites}
              />
            </TabsContent>

            <TabsContent value="list" className="space-y-6" forceMount hidden={viewMode !== 'list'}>
              <Card className="border-t-4 border-t-blue-600 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-blue-900 flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        Scheduled Maintenance Tasks ({filteredTasks.length})
                      </CardTitle>
                      <CardDescription className="text-blue-600">All upcoming and recent maintenance activities</CardDescription>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Switch
                          id="show-completed"
                          checked={showCompletedTasks}
                          onCheckedChange={setShowCompletedTasks}
                        />
                        <Label htmlFor="show-completed" className="cursor-pointer">
                          Show completed tasks
                        </Label>
                      </div>
                      {(filterStatus !== "all" || filterPriority !== "all" || filterDateRange.start || filterScheduledDate || filterAsset || filterTask) && (
                        <>
                          <Badge variant="secondary">
                            {filteredTasks.length} of {scheduledTasks.length} tasks
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={resetFilters}
                          >
                            Reset Filters
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {filteredTasks.length === 0 ? (
                    <div className="text-center py-8">
                      <CalendarDays className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-lg font-medium text-gray-600">No maintenance tasks found</p>
                      <p className="text-gray-500 mb-4">{scheduledTasks.length > 0 ? "Try adjusting your filters" : "Create your first maintenance plan to get started"}</p>
                      {scheduledTasks.length === 0 ? (
                        /* Hidden Generate New Plans button
                        <button
                          onClick={handleCreateNewPlans}
                          className="px-6 py-2 sm:px-8 sm:py-3 rounded-lg font-semibold text-white text-sm sm:text-base bg-blue-600 hover:bg-blue-700 transition-colors"
                        >
                          Generate New Plans
                        </button>
                        */
                        null
                      ) : (
                        <Button variant="outline" onClick={resetFilters}>
                          Reset Filters
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span>Asset</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => handleSort('asset')}
                                >
                                  {sortField === 'asset' ? (
                                    sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                                  ) : (
                                    <ArrowUpDown className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                              <Input
                                type="text"
                                value={filterAsset}
                                onChange={(e) => setFilterAsset(e.target.value)}
                                placeholder="Filter assets..."
                                className="h-8 text-xs"
                              />
                            </div>
                          </TableHead>
                          <TableHead>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span>Task</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => handleSort('task')}
                                >
                                  {sortField === 'task' ? (
                                    sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                                  ) : (
                                    <ArrowUpDown className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                              <Input
                                type="text"
                                value={filterTask}
                                onChange={(e) => setFilterTask(e.target.value)}
                                placeholder="Filter tasks..."
                                className="h-8 text-xs"
                              />
                            </div>
                          </TableHead>
                          <TableHead>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span>Due</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => handleSort('dueDate')}
                                >
                                  {sortField === 'dueDate' ? (
                                    sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                                  ) : (
                                    <ArrowUpDown className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                              <Input
                                type="date"
                                value={filterDateRange.start}
                                onChange={(e) => setFilterDateRange(prev => ({ ...prev, start: e.target.value }))}
                                className="h-8 text-xs"
                                placeholder="Filter by date"
                              />
                            </div>
                          </TableHead>
                          <TableHead>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span>Scheduled</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => handleSort('scheduledDate')}
                                >
                                  {sortField === 'scheduledDate' ? (
                                    sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                                  ) : (
                                    <ArrowUpDown className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                              <Input
                                type="date"
                                value={filterScheduledDate}
                                onChange={(e) => setFilterScheduledDate(e.target.value)}
                                className="h-8 text-xs"
                                placeholder="Filter scheduled"
                              />
                            </div>
                          </TableHead>
                          <TableHead>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span>Priority</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => handleSort('priority')}
                                >
                                  {sortField === 'priority' ? (
                                    sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                                  ) : (
                                    <ArrowUpDown className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                              <select
                                value={filterPriority}
                                onChange={(e) => {
                                  console.log('Priority filter changed to:', e.target.value);
                                  setFilterPriority(e.target.value);
                                }}
                                className="h-8 text-xs flex w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                              >
                                <option value="all">All</option>
                                <option value="High">High</option>
                                <option value="Medium">Medium</option>
                                <option value="Low">Low</option>
                              </select>
                            </div>
                          </TableHead>
                          <TableHead>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span>Status</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => handleSort('status')}
                                >
                                  {sortField === 'status' ? (
                                    sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                                  ) : (
                                    <ArrowUpDown className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                              <select
                                value={filterStatus}
                                onChange={(e) => {
                                  console.log('Status filter changed to:', e.target.value);
                                  setFilterStatus(e.target.value);
                                }}
                                className="h-8 text-xs flex w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                              >
                                <option value="all">All</option>
                                <option value="Scheduled">Scheduled</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Completed">Completed</option>
                                <option value="Due Today">Due Today</option>
                                <option value="Overdue">Overdue</option>
                              </select>
                            </div>
                          </TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTasks.map((task) => (
                          <TableRow key={`${task.id}-${task.signoffId || 'no-signoff'}`} className={getRowClassName(task)}>
                            <TableCell className="font-medium whitespace-nowrap">{task.asset}</TableCell>
                            <TableCell>{task.task}</TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {task.dueDate || 'No date'}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">{task.scheduledDate || 'Not scheduled'}</div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={getPriorityColor(task.priority)}>{task.priority}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={getStatusColor(task.status)}>
                                <div className="flex items-center space-x-1">
                                  {getStatusIcon(task.status)}
                                  <span>{task.status}</span>
                                </div>
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-1">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="sm" onClick={() => handleViewTask(task)}>
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>View task details</p>
                                  </TooltipContent>
                                </Tooltip>
                                {/* Hide Edit and Delete buttons for completed tasks */}
                                {task.status !== 'Completed' && (
                                  <>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button variant="ghost" size="sm" onClick={() => handleEditTask(task)}>
                                          <Edit className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Edit task</p>
                                      </TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button variant="ghost" size="sm" onClick={() => handleDeleteTask(task)}>
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Delete task</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </>
                                )}
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="sm" onClick={() => handleExportTask(task)}>
                                      <Download className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Export task</p>
                                  </TooltipContent>
                                </Tooltip>
                                {/* Hide SignOff button for completed tasks */}
                                {task.status !== 'Completed' && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="ghost" size="sm" onClick={() => handleSignOffTask(task)}>
                                        <CheckCircle className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Sign off task</p>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="calendar" className="space-y-6" forceMount hidden={viewMode !== 'calendar'}>
              {isDragging && (
                <div className="bg-blue-100 border border-blue-300 rounded-lg p-3 mb-4">
                  <div className="flex items-center text-blue-700">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                    </svg>
                    <span className="text-sm font-medium">
                      Dragging "{draggedTask?.asset} - {draggedTask?.task}" - Drop on any date to reschedule
                    </span>
                  </div>
                </div>
              )}
              <Card className="border-t-4 border-t-indigo-600 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50">
                  <CardTitle className="flex items-center justify-between text-indigo-900">
                    <span className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                      Calendar View
                    </span>
                    <div className="flex items-center space-x-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigateMonth(-1)}
                        className="shrink-0"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-lg font-semibold w-[180px] text-center shrink-0">
                        {formatMonthYear(currentMonth)}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigateMonth(1)}
                        className="shrink-0"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardTitle>
                  <CardDescription>View all scheduled maintenance tasks for the month</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="w-full overflow-x-auto">
                    <div className="min-w-[980px]">
                      {/* Calendar Header */}
                      <div className="grid grid-cols-7 gap-1 mb-2">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                          <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground w-[140px]">
                            {day}
                          </div>
                        ))}
                      </div>
                      
                      {/* Calendar Grid */}
                      <div className="grid grid-cols-7 gap-1">
                      {getDaysInMonth(currentMonth).map((day, index) => {
                        if (day === null) {
                          return <div key={`empty-${index}`} className="p-2 min-h-[100px] w-[140px]" />
                        }
                        
                        const cellDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
                        const tasksForDay = getTasksForDate(cellDate)
                        const isToday = cellDate.toDateString() === new Date().toDateString()
                        const isSelected = cellDate.toDateString() === new Date(selectedDate + 'T12:00:00').toDateString()
                        const dateStr = cellDate.toISOString().split('T')[0]
                        const isDraggedOver = draggedOverDate === dateStr
                        
                        return (
                          <div
                            key={day}
                            className={`border p-2 min-h-[100px] w-[140px] cursor-pointer transition-all ${
                              isToday ? 'bg-blue-50 border-blue-300 shadow-md' : 'hover:bg-gray-50'
                            } ${isSelected ? 'ring-2 ring-blue-500' : ''} ${
                              isDraggedOver ? 'bg-green-100 border-green-300 border-2' : ''
                            } ${tasksForDay.length > 0 ? 'border-indigo-200 bg-indigo-50/30' : 'border-gray-200'}`}
                            onClick={() => setSelectedDate(cellDate.toISOString().split('T')[0])}
                            onDragOver={(e) => handleDragOver(e, dateStr)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, cellDate)}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <div className="font-medium text-sm">{day}</div>
                              {tasksForDay.length > 0 && (
                                <div className="bg-indigo-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                                  {tasksForDay.length}
                                </div>
                              )}
                            </div>
                            <div className="space-y-1">
                              {tasksForDay.slice(0, 3).map((task) => (
                                <div
                                  key={`${task.id}-${task.signoffId || 'no-signoff'}`}
                                  draggable={true}
                                  onDragStart={(e) => handleDragStart(e, task)}
                                  onDragEnd={handleDragEnd}
                                  className={`text-xs p-1.5 rounded-md text-white truncate cursor-move select-none shadow-sm border-l-2 ${
                                    task.priority === 'High' ? 'bg-red-500 border-l-red-700' :
                                    task.priority === 'Medium' ? 'bg-yellow-500 border-l-yellow-700' :
                                    'bg-green-500 border-l-green-700'
                                  } ${draggedTask?.id === task.id ? 'opacity-50' : 'hover:opacity-90 hover:scale-105 transition-all'}`}
                                  title={`${task.asset} - ${task.task}${task.scheduledDate ? ` (Scheduled: ${task.scheduledDate})` : ` (Due: ${task.dueDate})`} - Drag to reschedule`}
                                >
                                  <div className="font-medium">{task.asset}</div>
                                  <div className="text-[10px] opacity-90 truncate">{task.task}</div>
                                </div>
                              ))}
                              {tasksForDay.length > 3 && (
                                <div className="text-xs text-muted-foreground">
                                  +{tasksForDay.length - 3} more
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Selected Date Details */}
              {selectedDate && (
                <Card>
                  <CardHeader>
                    <CardTitle>Tasks for {new Date(selectedDate + 'T12:00:00').toLocaleDateString()}</CardTitle>
                    <CardDescription>Scheduled maintenance activities</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {filteredTasks
                        .filter((task) => (task.scheduledDate || task.dueDate) === selectedDate)
                        .map((task) => (
                          <div 
                            key={`${task.id}-${task.signoffId || 'no-signoff'}`} 
                            className="border rounded-lg p-4 cursor-move select-none hover:shadow-md transition-shadow"
                            draggable={true}
                            onDragStart={(e) => handleDragStart(e, task)}
                            onDragEnd={handleDragEnd}
                            title="Drag to move to another date"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-semibold">{task.asset}</h4>
                              <div className="flex items-center space-x-2">
                                <Badge variant={getPriorityColor(task.priority)}>{task.priority}</Badge>
                                <Badge variant={getStatusColor(task.status)}>{task.status}</Badge>
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{task.task}</p>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4 text-sm">
                                <span className="flex items-center space-x-1">
                                  <Clock className="h-4 w-4" />
                                  <span>{task.time} ({task.duration})</span>
                                </span>
                                <span className="flex items-center space-x-1">
                                  <User className="h-4 w-4" />
                                  <span>{task.technician}</span>
                                </span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="sm" onClick={() => handleViewTask(task)}>
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>View task details</p>
                                  </TooltipContent>
                                </Tooltip>
                                {/* Hide Edit and Delete buttons for completed tasks */}
                                {task.status !== 'Completed' && (
                                  <>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button variant="ghost" size="sm" onClick={() => handleEditTask(task)}>
                                          <Edit className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Edit task</p>
                                      </TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button variant="ghost" size="sm" onClick={() => handleDeleteTask(task)}>
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Delete task</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </>
                                )}
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="sm" onClick={() => handleExportTask(task)}>
                                      <Download className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Export task</p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                            </div>
                          </div>
                        ))}
                      {filteredTasks.filter((task) => (task.scheduledDate || task.dueDate) === selectedDate).length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          No tasks scheduled for this date
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="weekly" className="space-y-6" forceMount hidden={viewMode !== 'weekly'}>
              <Card className="border-t-4 border-t-cyan-600 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-cyan-50 to-blue-50">
                  <CardTitle className="text-cyan-900 flex items-center gap-2">
                    <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>
                    Weekly Overview
                  </CardTitle>
                  <CardDescription className="text-cyan-600">Maintenance tasks distribution for the week</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-7 gap-4">
                    {weeklyView.map((day, index) => (
                      <div key={`week-${index}`} className="text-center">
                        <div className="font-medium mb-2">{day.date}</div>
                        <div className="bg-gradient-to-br from-cyan-100 to-blue-100 border-l-4 border-l-cyan-500 rounded-lg p-4 min-h-[100px] flex flex-col items-center justify-center hover:from-cyan-200 hover:to-blue-200 transition-colors">
                          <div className="text-2xl font-bold text-cyan-700">{day.tasks}</div>
                          <div className="text-sm text-cyan-600">{day.tasks === 1 ? "task" : "tasks"}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>This Week</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-blue-600">{stats.total}</div>
                    <p className="text-sm text-muted-foreground">Total tasks scheduled</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Completed</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-green-600">{stats.completed}</div>
                    <p className="text-sm text-muted-foreground">Tasks completed</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Overdue</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-red-600">{stats.overdue}</div>
                    <p className="text-sm text-muted-foreground">Tasks overdue</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          {/* All the dialog components remain the same */}
          {/* View Task Dialog */}
          {showViewDialog && viewingTask && (
            <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
              <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
                <DialogHeader className="flex-shrink-0">
                  <DialogTitle className="flex items-center justify-between">
                    <span>Task Details: {viewingTask.task}</span>
                    <Badge variant={getStatusColor(viewingTask.status)}>{viewingTask.status}</Badge>
                  </DialogTitle>
                  <DialogDescription>
                    Asset: {viewingTask.asset} | Plan ID: {viewingTask.planId}
                  </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden">
                  <div className="h-full overflow-y-auto space-y-6 px-1" style={{ maxHeight: 'calc(90vh - 180px)' }}>
                  {/* Task Overview */}
                  <div className="grid grid-cols-3 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                    <div className="text-center">
                      <div className="text-xs font-medium text-blue-600 uppercase tracking-wide">Next Date Due</div>
                      <div className="text-sm font-semibold text-blue-900 mt-1">
                        {viewingTask.date} at {viewingTask.time}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs font-medium text-blue-600 uppercase tracking-wide">Duration</div>
                      <div className="text-sm font-semibold text-blue-900 mt-1">
                        {viewingTask.duration}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs font-medium text-blue-600 uppercase tracking-wide">Priority</div>
                      <div className="text-sm font-semibold text-blue-900 mt-1">
                        {viewingTask.priority}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs font-medium text-blue-600 uppercase tracking-wide">Estimated Time to Complete</div>
                      {isEditMode ? (
                        <Input
                          type="number"
                          className="w-24 mx-auto mt-1"
                          value={viewingTask.est_minutes || ''}
                          onChange={(e) => setViewingTask({ ...viewingTask, est_minutes: parseInt(e.target.value) || 0 })}
                          placeholder="Minutes"
                        />
                      ) : (
                        <div className="text-sm font-semibold text-blue-900 mt-1">
                          {viewingTask.est_minutes ? `${viewingTask.est_minutes} min` : 'N/A'}
                        </div>
                      )}
                    </div>
                    <div className="text-center">
                      <div className="text-xs font-medium text-blue-600 uppercase tracking-wide">Techs Needed</div>
                      {isEditMode ? (
                        <Input
                          type="number"
                          className="w-20 mx-auto mt-1"
                          value={viewingTask.no_techs_needed || ''}
                          onChange={(e) => setViewingTask({ ...viewingTask, no_techs_needed: parseInt(e.target.value) || 1 })}
                          placeholder="1"
                        />
                      ) : (
                        <div className="text-sm font-semibold text-blue-900 mt-1">
                          {viewingTask.no_techs_needed || 'N/A'}
                        </div>
                      )}
                    </div>
                    <div className="text-center">
                      <div className="text-xs font-medium text-blue-600 uppercase tracking-wide">Tools Needed</div>
                      {isEditMode ? (
                        <Input
                          type="text"
                          className="w-32 mx-auto mt-1"
                          value={viewingTask.tools_needed || ''}
                          onChange={(e) => setViewingTask({ ...viewingTask, tools_needed: e.target.value })}
                          placeholder="Tools"
                        />
                      ) : (
                        <div className="text-sm font-semibold text-blue-900 mt-1">
                          {viewingTask.tools_needed || 'N/A'}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Task Instructions */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Task Instructions</h4>
                    {isEditMode ? (
                      <div className="space-y-2">
                        <Label htmlFor="instructions" className="text-sm">Edit Instructions (one per line)</Label>
                        <textarea
                          id="instructions"
                          className="w-full min-h-[150px] p-2 border rounded-md text-sm"
                          value={Array.isArray(viewingTask.instructions) 
                            ? viewingTask.instructions.join('\n') 
                            : viewingTask.instructions || ''}
                          onChange={(e) => {
                            const updatedTask = { ...viewingTask, instructions: e.target.value.split('\n').filter(line => line.trim()) }
                            setViewingTask(updatedTask)
                          }}
                        />
                      </div>
                    ) : (
                      viewingTask.instructions ? (
                        <div className="text-sm space-y-2">
                          {Array.isArray(viewingTask.instructions) ? 
                            viewingTask.instructions.map((instruction, index) => {
                              const cleanInstruction = instruction.replace(/^\d+\.\s*/, '');
                              const isNumbered = instruction !== cleanInstruction;
                              return (
                                <div key={index} className="flex items-start gap-2">
                                  {!isNumbered && <span className="text-muted-foreground min-w-[20px]">{index + 1}.</span>}
                                  <span className={isNumbered ? 'ml-0' : ''}>{isNumbered ? instruction : cleanInstruction}</span>
                                </div>
                              );
                            }) :
                            typeof viewingTask.instructions === 'string' ? 
                              viewingTask.instructions.split('\n').filter(line => line.trim()).map((instruction, index) => {
                                const cleanInstruction = instruction.replace(/^\d+\.\s*/, '');
                                const isNumbered = instruction !== cleanInstruction;
                                return (
                                  <div key={index} className="flex items-start gap-2">
                                    {!isNumbered && <span className="text-muted-foreground min-w-[20px]">{index + 1}.</span>}
                                    <span className={isNumbered ? 'ml-0' : ''}>{isNumbered ? instruction : cleanInstruction}</span>
                                  </div>
                                );
                              }) :
                              <p className="text-muted-foreground">No instructions available</p>
                          }
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No instructions available</p>
                      )
                    )}
                  </div>

                  {/* Additional Task Details (only in edit mode) */}
                  {isEditMode && (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="reason" className="text-sm font-medium">Reason for Task</Label>
                        <textarea
                          id="reason"
                          className="w-full min-h-[60px] p-2 border rounded-md text-sm mt-1"
                          value={viewingTask.reason || ''}
                          onChange={(e) => setViewingTask({ ...viewingTask, reason: e.target.value })}
                          placeholder="Why is this task necessary?"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="safety" className="text-sm font-medium">Safety Precautions</Label>
                        <textarea
                          id="safety"
                          className="w-full min-h-[60px] p-2 border rounded-md text-sm mt-1"
                          value={viewingTask.safety_precautions || ''}
                          onChange={(e) => setViewingTask({ ...viewingTask, safety_precautions: e.target.value })}
                          placeholder="Safety measures to follow"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="consumables" className="text-sm font-medium">Consumables Required</Label>
                        <textarea
                          id="consumables"
                          className="w-full min-h-[60px] p-2 border rounded-md text-sm mt-1"
                          value={viewingTask.consumables || ''}
                          onChange={(e) => setViewingTask({ ...viewingTask, consumables: e.target.value })}
                          placeholder="List of consumable materials needed"
                        />
                      </div>
                    </div>
                  )}

                  {/* Related Plan */}
                  <div>
                    <h4 className="font-medium mb-2">Related Maintenance Plan</h4>
                    <div className="border rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">Plan ID: {viewingTask.planId}</div>
                          <div className="text-sm text-muted-foreground">Asset: {viewingTask.asset}</div>
                        </div>
                        <Button variant="outline" size="sm">
                          View Plan
                        </Button>
                      </div>
                    </div>
                  </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-2 mt-6 flex-shrink-0">
                  <Button variant="outline" onClick={() => handleExportTask(viewingTask)}>
                    <Download className="h-4 w-4 mr-2" />
                    Export Task
                  </Button>
                  <Button variant="outline" onClick={() => setShowViewDialog(false)}>
                    Close
                  </Button>
                  {canEditTask && !isEditMode && (
                    <Button
                      onClick={() => {
                        // Store the current values before entering edit mode
                        setOriginalTaskValues({
                          task_name: viewingTask.task,
                          instructions: viewingTask.instructions,
                          est_minutes: viewingTask.est_minutes,
                          tools_needed: viewingTask.tools_needed,
                          no_techs_needed: viewingTask.no_techs_needed,
                          reason: viewingTask.reason,
                          safety_precautions: viewingTask.safety_precautions,
                          engineering_rationale: viewingTask.engineering_rationale,
                          common_failures_prevented: viewingTask.common_failures_prevented,
                          usage_insights: viewingTask.usage_insights,
                          consumables: viewingTask.consumables
                        });
                        setIsEditMode(true);
                      }}
                    >
                      Edit Task
                    </Button>
                  )}
                  {canEditTask && isEditMode && (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsEditMode(false)
                          setOriginalTaskValues(null)
                          // Reset the viewing task to original values
                          handleViewTask(viewingTask)
                        }}
                      >
                        Cancel Edit
                      </Button>
                      <Button
                        onClick={async () => {
                          // Save the edited task details
                          const updates = {
                            task_name: viewingTask.task,
                            instructions: viewingTask.instructions,
                            est_minutes: viewingTask.est_minutes,
                            tools_needed: viewingTask.tools_needed,
                            no_techs_needed: viewingTask.no_techs_needed,
                            reason: viewingTask.reason,
                            safety_precautions: viewingTask.safety_precautions,
                            engineering_rationale: viewingTask.engineering_rationale,
                            common_failures_prevented: viewingTask.common_failures_prevented,
                            usage_insights: viewingTask.usage_insights,
                            consumables: viewingTask.consumables
                          }
                          
                          const result = await updateTask(viewingTask.id, updates, originalTaskValues)
                          if (result.success) {
                            toast({
                              title: "Task Updated",
                              description: "Task details have been updated successfully.",
                              variant: "default",
                            })
                            setIsEditMode(false)
                            setShowViewDialog(false)
                            setOriginalTaskValues(null)
                          } else {
                            toast({
                              title: "Error Updating Task",
                              description: result.error || "Failed to update task.",
                              variant: "destructive",
                            })
                          }
                        }}
                      >
                        Save Changes
                      </Button>
                    </>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          )}

          {/* Edit Task Dialog */}
          {showEditDialog && editingTask && (
            <Dialog open={showEditDialog} onOpenChange={handleEditDialogOpenChange}>
              <DialogContent 
                className="max-w-6xl w-[95vw] max-h-[90vh] flex flex-col"
                onPointerDownOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
              >
                <DialogHeader className="flex-shrink-0 pb-4">
                  <DialogTitle>Edit Task: {editingTask.task}</DialogTitle>
                  <DialogDescription>Modify task details and schedule</DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden">
                  <div className="h-full overflow-y-auto space-y-6 px-1" style={{ maxHeight: 'calc(90vh - 220px)' }}>
                  {/* Task Name */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Task Name</Label>
                    <Input 
                      value={editedTaskName} 
                      onChange={(e) => setEditedTaskName(e.target.value)}
                      placeholder="Task name"
                      className="w-full"
                    />
                  </div>

                  {/* Basic Information Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Column - Status & Criticality */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Status</Label>
                        <Select value={editedStatus} onValueChange={setEditedStatus}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent className="z-[70] bg-white border border-gray-200 shadow-lg" position="popper" sideOffset={4} alignOffset={-2}>
                            <SelectItem value="Scheduled">Scheduled</SelectItem>
                            <SelectItem value="In Progress">In Progress</SelectItem>
                            <SelectItem value="Completed">Completed</SelectItem>
                            <SelectItem value="Overdue">Overdue</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Criticality</Label>
                        <Select value={editedCriticality} onValueChange={setEditedCriticality}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select criticality" />
                          </SelectTrigger>
                          <SelectContent className="z-[70] bg-white border border-gray-200 shadow-lg" position="popper" sideOffset={4} alignOffset={-2}>
                            <SelectItem value="High">High</SelectItem>
                            <SelectItem value="Medium">Medium</SelectItem>
                            <SelectItem value="Low">Low</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Right Column - Date & Time */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Scheduled Date</Label>
                        <Input 
                          type="date" 
                          value={editedDate} 
                          onChange={(e) => setEditedDate(e.target.value)}
                          className="w-full"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Scheduled Time</Label>
                        <Input 
                          type="time" 
                          value={editedTime} 
                          onChange={(e) => setEditedTime(e.target.value)}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Task Details */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Est. Minutes</Label>
                      <Input 
                        type="number" 
                        value={editedEstMinutes} 
                        onChange={(e) => setEditedEstMinutes(e.target.value)}
                        placeholder="60"
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Techs Needed</Label>
                      <Input 
                        type="number" 
                        value={editedNoTechsNeeded} 
                        onChange={(e) => setEditedNoTechsNeeded(e.target.value)}
                        placeholder="1"
                        className="w-full"
                      />
                    </div>
                  </div>

                  {/* Tools Needed - Full Width */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Tools Needed</Label>
                    <div className="space-y-2">
                      {editedToolsList.map((tool, index) => (
                        <div key={index} className="flex gap-2">
                          <Input 
                            value={tool}
                            onChange={(e) => {
                              const newList = [...editedToolsList]
                              newList[index] = e.target.value
                              setEditedToolsList(newList)
                            }}
                            placeholder="Tool name"
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newList = editedToolsList.filter((_, i) => i !== index)
                              setEditedToolsList(newList)
                            }}
                            className="px-2"
                          >
                            ✕
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setEditedToolsList([...editedToolsList, ''])}
                        className="w-full"
                      >
                        + Add Tool
                      </Button>
                    </div>
                  </div>

                  {/* Detailed Information */}
                  <div className="space-y-6">
                    {/* Instructions */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Instructions (one per line)</Label>
                      <textarea
                        className="w-full min-h-[120px] p-3 border border-input rounded-md text-sm focus:ring-2 focus:ring-ring focus:border-transparent resize-y"
                        value={editedInstructions}
                        onChange={(e) => setEditedInstructions(e.target.value)}
                        placeholder="Enter detailed step-by-step instructions..."
                      />
                    </div>

                    {/* Two-column layout for additional details */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Reason for Task</Label>
                        <textarea
                          className="w-full min-h-[80px] p-3 border border-input rounded-md text-sm focus:ring-2 focus:ring-ring focus:border-transparent resize-y"
                          value={editedReason}
                          onChange={(e) => setEditedReason(e.target.value)}
                          placeholder="Why is this task necessary?"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Safety Precautions</Label>
                        <textarea
                          className="w-full min-h-[80px] p-3 border border-input rounded-md text-sm focus:ring-2 focus:ring-ring focus:border-transparent resize-y"
                          value={editedSafetyPrecautions}
                          onChange={(e) => setEditedSafetyPrecautions(e.target.value)}
                          placeholder="Safety measures and PPE requirements..."
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Consumables Required</Label>
                      <div className="space-y-2">
                        {editedConsumablesList.map((consumable, index) => (
                          <div key={index} className="flex gap-2">
                            <Input 
                              value={consumable}
                              onChange={(e) => {
                                const newList = [...editedConsumablesList]
                                newList[index] = e.target.value
                                setEditedConsumablesList(newList)
                              }}
                              placeholder="Consumable item (e.g., Oil filter, 2 quarts synthetic oil)"
                              className="flex-1"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const newList = editedConsumablesList.filter((_, i) => i !== index)
                                setEditedConsumablesList(newList)
                              }}
                              className="px-2"
                            >
                              ✕
                            </Button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setEditedConsumablesList([...editedConsumablesList, ''])}
                          className="w-full"
                        >
                          + Add Consumable
                        </Button>
                      </div>
                    </div>
                  </div>
                  </div>
                </div>

                <div className="flex-shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-4 border-t border-slate-200 mt-4">
                  <div className="text-sm text-slate-500">
                    Changes will be logged for audit purposes
                  </div>
                  <div className="flex space-x-3">
                    <Button 
                      variant="outline" 
                      onClick={closeEditDialog}
                      className="px-6"
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={saveTaskChanges}
                      className="px-6 bg-blue-600 hover:bg-blue-700"
                    >
                      Save Changes
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {/* Delete Confirmation Dialog */}
          {showDeleteDialog && deletingTask && (
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center space-x-2">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    <span>Confirm Deletion</span>
                  </DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete the maintenance task "{deletingTask.task}" for{" "}
                    <strong>{deletingTask.asset}</strong>? This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4 my-4">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <div className="font-medium text-red-800">This will permanently delete:</div>
                      <ul className="mt-1 text-red-700 space-y-1">
                        <li>• Task: {deletingTask.task}</li>
                        <li>
                          • Scheduled for: {deletingTask.date} at {deletingTask.time}
                        </li>
                        <li>• Assigned to: {deletingTask.technician}</li>
                        <li>• Related to plan: {deletingTask.planId}</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                    Cancel
                  </Button>
                  <Button variant="destructive" onClick={confirmDeleteTask}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Task
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {/* Export Task Dialog */}
          {showExportDialog && exportingTask && (
            <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Export Task</DialogTitle>
                  <DialogDescription>
                    Choose the format to export the maintenance task for {exportingTask.asset}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    <Button
                      variant="outline"
                      className="h-20 flex flex-col items-center justify-center space-y-2"
                      onClick={() => {
                        exportTaskData(exportingTask, "emaint-x5")
                        setShowExportDialog(false)
                      }}
                    >
                      <Download className="h-6 w-6" />
                      <span className="text-sm">eMaint X5</span>
                    </Button>

                    <Button
                      variant="outline"
                      className="h-20 flex flex-col items-center justify-center space-y-2"
                      onClick={() => {
                        exportTaskData(exportingTask, "csv")
                        setShowExportDialog(false)
                      }}
                    >
                      <Download className="h-6 w-6" />
                      <span className="text-sm">CSV</span>
                    </Button>

                    <Button
                      variant="outline"
                      className="h-20 flex flex-col items-center justify-center space-y-2"
                      onClick={() => {
                        exportTaskData(exportingTask, "excel")
                        setShowExportDialog(false)
                      }}
                    >
                      <Download className="h-6 w-6" />
                      <span className="text-sm">Excel</span>
                    </Button>

                    <Button
                      variant="outline"
                      className="h-20 flex flex-col items-center justify-center space-y-2"
                      onClick={() => {
                        exportTaskData(exportingTask, "word")
                        setShowExportDialog(false)
                      }}
                    >
                      <Download className="h-6 w-6" />
                      <span className="text-sm">Word</span>
                    </Button>

                    <Button
                      variant="outline"
                      className="h-20 flex flex-col items-center justify-center space-y-2"
                      onClick={async () => {
                        try {
                          const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
                          const filename = `maintenance-task-${exportingTask.asset?.replace(/[^a-zA-Z0-9]/g, '_') || 'task'}-${timestamp}.pdf`;
                          
                          // Get auth token for backend call
                          const { data: { session } } = await supabase.auth.getSession();
                          if (!session) {
                            throw new Error('Authentication required');
                          }

                          const response = await fetch('https://arctecfox-mono.onrender.com/api/export-pdf', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${session.access_token}`,
                            },
                            body: JSON.stringify({
                              data: [exportingTask],
                              filename: filename,
                              export_type: 'maintenance_task'
                            })
                          });

                          if (!response.ok) {
                            const errorData = await response.json();
                            throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
                          }

                          const blob = await response.blob();
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.style.display = 'none';
                          a.href = url;
                          a.download = filename;
                          document.body.appendChild(a);
                          a.click();
                          window.URL.revokeObjectURL(url);
                          document.body.removeChild(a);

                          toast({
                            title: "Task Exported Successfully",
                            description: `Maintenance task for ${exportingTask.asset} has been exported as PDF.`,
                            variant: "default",
                          })
                        } catch (error) {
                          console.error("PDF export error:", error);
                          toast({
                            title: "Export Failed",
                            description: `Failed to export PDF: ${error.message}`,
                            variant: "destructive",
                          })
                        }
                        setShowExportDialog(false)
                      }}
                    >
                      <Download className="h-6 w-6" />
                      <span className="text-sm">PDF</span>
                    </Button>
                  </div>

                  <div className="bg-gray-50 p-3 rounded-lg">
                    <h4 className="font-medium text-sm mb-1">Export Details</h4>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>Task: {exportingTask.task}</div>
                      <div>Asset: {exportingTask.asset}</div>
                      <div>Date: {exportingTask.date}</div>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-start space-x-2">
                      <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <div className="text-xs text-blue-700">
                        <p className="font-medium">eMaint X5 Import Template</p>
                        <p>
                          Export in eMaint X5 format for direct import into your CMMS system. Includes task details,
                          scheduling information, and assignments in the required format.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowExportDialog(false)}>
                    Cancel
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {/* Sign Off Dialog */}
          {showSignOffDialog && signingOffTask && (
            <Dialog open={showSignOffDialog} onOpenChange={setShowSignOffDialog}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>Sign Off Task</span>
                  </DialogTitle>
                  <DialogDescription>
                    Complete the sign-off for task "{signingOffTask.task}" for {signingOffTask.asset}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                  {/* Basic Sign-off Information */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="technician">Technician</Label>
                      <select
                        id="technician"
                        value={signOffData.technician_id}
                        onChange={(e) => setSignOffData(prev => ({ ...prev, technician_id: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select Technician</option>
                        {siteUsers.map(siteUser => (
                          <option key={siteUser.users.id} value={siteUser.users.id}>
                            {siteUser.users.full_name || siteUser.users.email}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <Label htmlFor="completion_date">Completion Date</Label>
                      <Input
                        id="completion_date"
                        type="date"
                        value={signOffData.completion_date}
                        onChange={(e) => setSignOffData(prev => ({ ...prev, completion_date: e.target.value }))}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="total_expense">Total Expense ($)</Label>
                      <Input
                        id="total_expense"
                        type="number"
                        step="0.01"
                        value={signOffData.total_expense}
                        onChange={(e) => setSignOffData(prev => ({ ...prev, total_expense: e.target.value }))}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  {/* Task Due Date (read-only) */}
                  <div>
                    <Label>Original Due Date</Label>
                    <Input
                      value={signingOffTask.date}
                      disabled
                      className="bg-gray-100"
                    />
                  </div>

                  {/* Consumables Section */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <Label className="text-lg font-semibold">Consumables</Label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            await copyPreviousConsumables(signingOffTask)
                          }}
                        >
                          Copy from Previous Signoff
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newConsumable = {
                              id: Date.now(),
                              name: '',
                              needed: false,
                              brand: '',
                              version: '',
                              cost: ''
                            }
                            setSignOffData(prev => ({
                              ...prev,
                              consumables: [...prev.consumables, newConsumable]
                            }))
                          }}
                        >
                          Add Consumable
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {signOffData.consumables.map((consumable, index) => (
                        <div key={consumable.id} className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 mr-4">
                              <Label>Consumable Name</Label>
                              <Input
                                value={consumable.name}
                                onChange={(e) => {
                                  const newConsumables = [...signOffData.consumables]
                                  newConsumables[index].name = e.target.value
                                  setSignOffData(prev => ({ ...prev, consumables: newConsumables }))
                                }}
                                placeholder="Enter consumable name"
                              />
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`needed-${consumable.id}`}
                                checked={consumable.needed}
                                onChange={(e) => {
                                  const newConsumables = [...signOffData.consumables]
                                  newConsumables[index].needed = e.target.checked
                                  if (!e.target.checked) {
                                    // Clear other fields when unchecked
                                    newConsumables[index].brand = ''
                                    newConsumables[index].version = ''
                                    newConsumables[index].cost = ''
                                  }
                                  setSignOffData(prev => ({ ...prev, consumables: newConsumables }))
                                }}
                              />
                              <Label htmlFor={`needed-${consumable.id}`}>Needed</Label>
                              
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const newConsumables = signOffData.consumables.filter((_, i) => i !== index)
                                  setSignOffData(prev => ({ ...prev, consumables: newConsumables }))
                                }}
                              >
                                Remove
                              </Button>
                            </div>
                          </div>

                          {consumable.needed && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div>
                                <Label>Brand</Label>
                                <Input
                                  value={consumable.brand}
                                  onChange={(e) => {
                                    const newConsumables = [...signOffData.consumables]
                                    newConsumables[index].brand = e.target.value
                                    setSignOffData(prev => ({ ...prev, consumables: newConsumables }))
                                  }}
                                  placeholder="Brand name"
                                />
                              </div>
                              
                              <div>
                                <Label>Version</Label>
                                <Input
                                  value={consumable.version}
                                  onChange={(e) => {
                                    const newConsumables = [...signOffData.consumables]
                                    newConsumables[index].version = e.target.value
                                    setSignOffData(prev => ({ ...prev, consumables: newConsumables }))
                                  }}
                                  placeholder="Version/Model"
                                />
                              </div>
                              
                              <div>
                                <Label>Cost ($)</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={consumable.cost}
                                  onChange={(e) => {
                                    const newConsumables = [...signOffData.consumables]
                                    newConsumables[index].cost = e.target.value
                                    setSignOffData(prev => ({ ...prev, consumables: newConsumables }))
                                  }}
                                  placeholder="0.00"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* File Upload Section */}
                  <div>
                    <Label className="text-lg font-semibold">Load Sign Off Confirmation</Label>
                    <div className="mt-2">
                      <Input
                        type="file"
                        onChange={(e) => setSignOffData(prev => ({ ...prev, uploaded_file: e.target.files[0] }))}
                        accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
                        className="cursor-pointer"
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        Supported formats: PDF, DOC, DOCX, TXT, JPG, PNG, GIF (Max 30MB)
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-2 mt-6">
                  <Button variant="outline" onClick={() => setShowSignOffDialog(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => handleSubmitSignOff()}
                    disabled={!signOffData.technician_id || !signOffData.completion_date || loadingSignOff}
                  >
                    {loadingSignOff && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Submit Sign Off
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </TooltipProvider>
    </ComponentErrorBoundary>
  )
}