"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CalendarDays, Clock, User, CheckCircle, AlertCircle, Eye, Edit, Trash2, Download, Info, Loader2, ChevronLeft, ChevronRight } from "lucide-react"
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip"
import ComponentErrorBoundary from "../ComponentErrorBoundary"
import { MaintenanceScheduleLoading } from "../loading/LoadingStates"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "../../hooks/useAuth"
import { supabase, isUserSiteAdmin, getUserAdminSites } from "../../api" // Import the shared client

export default function MaintenanceSchedule() {
  // Remove the local Supabase client initialization - use the shared one
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [calendarView, setCalendarView] = useState('month') // 'month' or 'single'
  
  // Debug selectedDate changes
  useEffect(() => {
    console.log('selectedDate changed:', selectedDate, 'type:', typeof selectedDate);
  }, [selectedDate])
  
  const [viewMode, setViewMode] = useState("list")
  const [scheduledTasks, setScheduledTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
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

  // Add state for edited task values
  const [editedStatus, setEditedStatus] = useState("")
  const [editedTechnician, setEditedTechnician] = useState("")
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
  const [canEditTask, setCanEditTask] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [originalTaskValues, setOriginalTaskValues] = useState(null)
  
  // Drag and drop state
  const [draggedTask, setDraggedTask] = useState(null)
  const [draggedOverDate, setDraggedOverDate] = useState(null)
  const [isDragging, setIsDragging] = useState(false)

  // Fetch tasks from database
  const fetchTasks = async () => {
    console.log('=== FETCH TASKS CALLED ===');
    if (!user) return

    try {
      console.log('=== INSIDE TRY BLOCK ===');
      setLoading(true)
      setError(null)
      
      console.log('=== USING SHARED SUPABASE CLIENT ===');
      
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Current session:', session?.user?.id);
      
      // Debug: Check current user info
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        console.log('=== AUTH DEBUG ===');
        console.log('Current authenticated user email:', user?.email);
        console.log('Current authenticated user ID:', user?.id);
        
        // Check what's in users table for this email
        const { data: dbUser } = await supabase
          .from('users')
          .select('id, email')
          .eq('email', user?.email)
          .single();
        console.log('Database user record:', dbUser);
        console.log('IDs match?', user?.id === dbUser?.id);
        console.log('==================');
      } catch (e) {
        console.log('Error in auth debug:', e);
      }
      
      // FIXED: Use a simpler query that works with your current permissions
      const { data, error } = await supabase
        .from('pm_tasks')
        .select(`
          *,
          pm_plans (
            id,
            asset_name,
            created_by,
            site_id,
            users (
              id,
              email,
              full_name
            )
          )
        `);

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      // Transform data to match component expectations
      const transformedTasks = data.map(task => ({
        id: task.id,
        asset: task.pm_plans?.asset_name || 'Unknown Asset',
        task: task.task_name || 'No description',
        date: (task.scheduled_dates && task.scheduled_dates.length > 0) ? task.scheduled_dates[0] : 'No date',
        time: '09:00',
        technician: task.pm_plans?.users?.full_name || 'Unassigned',
        duration: task.est_minutes ? task.est_minutes : (task.maintenance_interval || 'Unknown'),
        status: 'Pending',
        priority: 'High', // Default to High priority for maintenance tasks
        planId: task.pm_plan_id,
        siteId: task.pm_plans?.site_id,
        createdByEmail: task.pm_plans?.users?.email,
        notes: task.notes,
        completedAt: task.completed_at,
        actualDuration: task.actual_duration,
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
        consumables: task.consumables
      }))

      setScheduledTasks(transformedTasks)
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

  // Update task in database with audit trail
  const updateTask = async (taskId, updates, originalTask = null) => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
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
          consumables: 'Consumables'
        };
        
        // Compare each field and create audit records for changes
        for (const [field, value] of Object.entries(updates)) {
          // Get the original value from the database
          const { data: currentTask } = await supabase
            .from('pm_tasks')
            .select(field)
            .eq('id', taskId)
            .single();
            
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
      
      // Refresh tasks after successful update
      await fetchTasks();
      return { success: true, data };
    } catch (e) {
      console.log('Error updating task:', e);
      return { success: false, error: e.message };
    }
  }

  // Delete task from database
  const deleteTaskFromDB = async (taskId) => {
    try {
      console.log('=== USING SHARED SUPABASE CLIENT ===');
      
      // Debug: Check current user info
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        console.log('=== AUTH DEBUG ===');
        console.log('Current authenticated user email:', user?.email);
        console.log('Current authenticated user ID:', user?.id);
        
        // Check what's in users table for this email
        const { data: dbUser } = await supabase
          .from('users')
          .select('id, email')
          .eq('email', user?.email)
          .single();
        console.log('Database user record:', dbUser);
        console.log('IDs match?', user?.id === dbUser?.id);
        console.log('==================');
      } catch (e) {
        console.log('Error in auth debug:', e);
      }

      const { error } = await supabase
        .from('pm_tasks')
        .delete()
        .eq('id', taskId)

      if (error) throw error

      // Refresh tasks
      await fetchTasks()
      return { success: true }
    } catch (err) {
      console.error('Error deleting task:', err)
      return { success: false, error: err.message }
    }
  }

  // Load data when component mounts
  useEffect(() => {
    console.log('=== USE EFFECT TRIGGERED ===');
    console.log('user:', !!user);
    if (user) {
      console.log('=== CALLING FETCH TASKS FROM USE EFFECT ===');
      fetchTasks()
    } else {
      console.log('=== NOT CALLING FETCH TASKS - MISSING USER ===');
    }
  }, [user]) // Removed supabaseClient dependency since we're using the shared client

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
      const tasksCount = scheduledTasks.filter(task => task.date === dateStr).length
      
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
    const total = scheduledTasks.length
    const completed = scheduledTasks.filter(task => task.status === 'Completed').length
    const overdue = scheduledTasks.filter(task => task.status === 'Overdue').length
    
    return { total, completed, overdue }
  }

  // Add navigation handler
  const handleCreateNewPlans = () => {
    navigate('/pmplanner')
  }

  // Check if user can edit task based on site permissions
  const checkCanEditPermission = async (siteId) => {
    if (!user || !siteId) {
      setCanEditTask(false)
      return
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
        return
      }

      setCanEditTask(siteUser?.can_edit || false)
    } catch (err) {
      console.error('Error checking permission:', err)
      setCanEditTask(false)
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
    if (task.siteId) {
      await checkCanEditPermission(task.siteId)
    }
    
    // Only show edit dialog if user has permission
    if (!canEditTask) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to edit tasks for this site.",
        variant: "destructive",
      })
      return
    }
    
    setEditingTask(task)
    setEditedStatus(task.status)
    setEditedTechnician(task.technician)
    setEditedDate(task.date)
    setEditedTime(task.time)
    setEditedTaskName(task.task || '')
    setEditedInstructions(Array.isArray(task.instructions) ? task.instructions.join('\n') : (task.instructions || ''))
    setEditedEstMinutes(task.est_minutes || '')
    setEditedToolsNeeded(task.tools_needed || '')
    setEditedNoTechsNeeded(task.no_techs_needed || '')
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
      scheduled_date: task.date,
      scheduled_time: task.time
    })
    setShowEditDialog(true)
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

  const saveTaskChanges = async () => {
    if (editingTask) {
      const updates = {
        task_name: editedTaskName,
        instructions: editedInstructions.split('\n').filter(line => line.trim()),
        est_minutes: editedEstMinutes ? parseInt(editedEstMinutes) : null,
        tools_needed: editedToolsNeeded,
        no_techs_needed: editedNoTechsNeeded ? parseInt(editedNoTechsNeeded) : null,
        reason: editedReason,
        safety_precautions: editedSafetyPrecautions,
        consumables: editedConsumables,
        status: editedStatus,
        assigned_technician: editedTechnician,
        scheduled_date: editedDate,
        scheduled_time: editedTime
      }

      // Now with full audit trail support
      const result = await updateTask(editingTask.id, updates, originalTaskValues)
      if (result.success) {
        toast({
          title: "Task Updated",
          description: `Changes to ${editingTask.asset} task have been saved.`,
          variant: "default",
        })
      } else {
        toast({
          title: "Error Updating Task",
          description: result.error || "Failed to update task. Please try again.",
          variant: "destructive",
        })
      }
      setShowEditDialog(false)
      setEditingTask(null)
      setOriginalTaskValues(null)
    }
  }

  // Update task date with drag and drop
  const updateTaskDate = async (taskId, newDate, originalDate) => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
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

      // Update the task date
      const { error: updateError } = await supabase
        .from('pm_tasks')
        .update({ 
          scheduled_dates: [newDate] // Update scheduled_dates array
        })
        .eq('id', taskId);

      if (updateError) throw updateError;

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
      await checkCanEditPermission(task.siteId);
      if (!canEditTask) {
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
    await updateTaskDate(draggedTask.id, newDateStr, originalDateStr);

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
      date: task.date,
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
          task.date, // SCHEDULED_DATE
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
      default:
        return "outline"
    }
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
    return scheduledTasks.filter(task => task.date === dateString)
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
            <button
              onClick={handleCreateNewPlans}
              className="px-6 py-2 sm:px-8 sm:py-3 rounded-lg font-semibold text-white text-sm sm:text-base bg-blue-600 hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <CalendarDays className="h-4 w-4" />
              Generate New Plans
            </button>
          </div>

          <Tabs value={viewMode} onValueChange={setViewMode} className="space-y-6">
            <TabsList>
              <TabsTrigger value="list">List View</TabsTrigger>
              <TabsTrigger value="calendar">Calendar View</TabsTrigger>
              <TabsTrigger value="weekly">Weekly View</TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Scheduled Maintenance Tasks ({scheduledTasks.length})</CardTitle>
                  <CardDescription>All upcoming and recent maintenance activities</CardDescription>
                </CardHeader>
                <CardContent>
                  {scheduledTasks.length === 0 ? (
                    <div className="text-center py-8">
                      <CalendarDays className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-lg font-medium text-gray-600">No maintenance tasks found</p>
                      <p className="text-gray-500 mb-4">Create your first maintenance plan to get started</p>
                      <button
                        onClick={handleCreateNewPlans}
                        className="px-6 py-2 sm:px-8 sm:py-3 rounded-lg font-semibold text-white text-sm sm:text-base bg-blue-600 hover:bg-blue-700 transition-colors"
                      >
                        Generate New Plans
                      </button>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Asset</TableHead>
                          <TableHead>Task</TableHead>
                          <TableHead>Date & Time</TableHead>
                          <TableHead>Duration</TableHead>
                          <TableHead>Priority</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {scheduledTasks.map((task) => (
                          <TableRow key={task.id}>
                            <TableCell className="font-medium whitespace-nowrap">{task.asset}</TableCell>
                            <TableCell>{task.task}</TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div>{task.date}</div>
                                <div className="text-sm text-muted-foreground">{task.time}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Clock className="h-4 w-4" />
                                <span>{task.duration}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={getPriorityColor(task.priority)}>{task.priority}</Badge>
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
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="calendar" className="space-y-6">
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
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Calendar View</span>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigateMonth(-1)}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-lg font-semibold min-w-[180px] text-center">
                        {formatMonthYear(currentMonth)}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigateMonth(1)}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardTitle>
                  <CardDescription>View all scheduled maintenance tasks for the month</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="w-full">
                    {/* Calendar Header */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                        <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                          {day}
                        </div>
                      ))}
                    </div>
                    
                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-1">
                      {getDaysInMonth(currentMonth).map((day, index) => {
                        if (day === null) {
                          return <div key={`empty-${index}`} className="p-2 min-h-[100px]" />
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
                            className={`border p-2 min-h-[100px] cursor-pointer transition-colors ${
                              isToday ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                            } ${isSelected ? 'ring-2 ring-blue-500' : ''} ${
                              isDraggedOver ? 'bg-green-100 border-green-300 border-2' : ''
                            }`}
                            onClick={() => setSelectedDate(cellDate.toISOString().split('T')[0])}
                            onDragOver={(e) => handleDragOver(e, dateStr)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, cellDate)}
                          >
                            <div className="font-medium text-sm mb-1">{day}</div>
                            <div className="space-y-1">
                              {tasksForDay.slice(0, 3).map((task) => (
                                <div
                                  key={task.id}
                                  draggable={true}
                                  onDragStart={(e) => handleDragStart(e, task)}
                                  onDragEnd={handleDragEnd}
                                  className={`text-xs p-1 rounded text-white truncate cursor-move select-none ${
                                    task.priority === 'High' ? 'bg-red-500' :
                                    task.priority === 'Medium' ? 'bg-yellow-500' :
                                    'bg-green-500'
                                  } ${draggedTask?.id === task.id ? 'opacity-50' : 'hover:opacity-80'}`}
                                  title={`${task.asset} - ${task.task} (Drag to move)`}
                                >
                                  {task.asset}
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
                      {scheduledTasks
                        .filter((task) => task.date === selectedDate)
                        .map((task) => (
                          <div 
                            key={task.id} 
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
                      {scheduledTasks.filter((task) => task.date === selectedDate).length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          No tasks scheduled for this date
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="weekly" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Weekly Overview</CardTitle>
                  <CardDescription>Maintenance tasks distribution for the week</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-7 gap-4">
                    {weeklyView.map((day, index) => (
                      <div key={`week-${index}`} className="text-center">
                        <div className="font-medium mb-2">{day.date}</div>
                        <div className="bg-blue-100 rounded-lg p-4 min-h-[100px] flex flex-col items-center justify-center">
                          <div className="text-2xl font-bold text-blue-600">{day.tasks}</div>
                          <div className="text-sm text-muted-foreground">{day.tasks === 1 ? "task" : "tasks"}</div>
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
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center justify-between">
                    <span>Task Details: {viewingTask.task}</span>
                    <Badge variant={getStatusColor(viewingTask.status)}>{viewingTask.status}</Badge>
                  </DialogTitle>
                  <DialogDescription>
                    Asset: {viewingTask.asset} | Plan ID: {viewingTask.planId}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
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

                <div className="flex justify-end space-x-2 mt-6">
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
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Edit Task: {editingTask.task}</DialogTitle>
                  <DialogDescription>Modify task details and schedule</DialogDescription>
                </DialogHeader>

                <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                  {/* Task Name */}
                  <div className="space-y-2">
                    <Label>Task Name</Label>
                    <Input 
                      value={editedTaskName} 
                      onChange={(e) => setEditedTaskName(e.target.value)}
                      placeholder="Task name"
                    />
                  </div>

                  {/* Schedule and Status */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select value={editedStatus} onValueChange={setEditedStatus}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Scheduled">Scheduled</SelectItem>
                          <SelectItem value="In Progress">In Progress</SelectItem>
                          <SelectItem value="Completed">Completed</SelectItem>
                          <SelectItem value="Overdue">Overdue</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Technician</Label>
                      <Select value={editedTechnician} onValueChange={setEditedTechnician}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="John Smith">John Smith</SelectItem>
                          <SelectItem value="Sarah Johnson">Sarah Johnson</SelectItem>
                          <SelectItem value="Mike Wilson">Mike Wilson</SelectItem>
                          <SelectItem value="Emily Davis">Emily Davis</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Input type="date" value={editedDate} onChange={(e) => setEditedDate(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Time</Label>
                      <Input type="time" value={editedTime} onChange={(e) => setEditedTime(e.target.value)} />
                    </div>
                  </div>

                  {/* Task Details */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Est. Minutes</Label>
                      <Input 
                        type="number" 
                        value={editedEstMinutes} 
                        onChange={(e) => setEditedEstMinutes(e.target.value)}
                        placeholder="60"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Techs Needed</Label>
                      <Input 
                        type="number" 
                        value={editedNoTechsNeeded} 
                        onChange={(e) => setEditedNoTechsNeeded(e.target.value)}
                        placeholder="1"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tools Needed</Label>
                      <Input 
                        value={editedToolsNeeded} 
                        onChange={(e) => setEditedToolsNeeded(e.target.value)}
                        placeholder="List tools"
                      />
                    </div>
                  </div>

                  {/* Instructions */}
                  <div className="space-y-2">
                    <Label>Instructions (one per line)</Label>
                    <textarea
                      className="w-full min-h-[100px] p-2 border rounded-md text-sm"
                      value={editedInstructions}
                      onChange={(e) => setEditedInstructions(e.target.value)}
                      placeholder="Enter task instructions..."
                    />
                  </div>

                  {/* Additional Details */}
                  <div className="space-y-2">
                    <Label>Reason for Task</Label>
                    <textarea
                      className="w-full min-h-[60px] p-2 border rounded-md text-sm"
                      value={editedReason}
                      onChange={(e) => setEditedReason(e.target.value)}
                      placeholder="Why is this task necessary?"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Safety Precautions</Label>
                    <textarea
                      className="w-full min-h-[60px] p-2 border rounded-md text-sm"
                      value={editedSafetyPrecautions}
                      onChange={(e) => setEditedSafetyPrecautions(e.target.value)}
                      placeholder="Safety measures to follow"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Consumables Required</Label>
                    <textarea
                      className="w-full min-h-[60px] p-2 border rounded-md text-sm"
                      value={editedConsumables}
                      onChange={(e) => setEditedConsumables(e.target.value)}
                      placeholder="List of consumable materials needed"
                    />
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Task Summary</h4>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div>Asset: {editingTask.asset}</div>
                      <div>Task: {editingTask.task}</div>
                      <div>Duration: {editingTask.duration}</div>
                      <div>Priority: {editingTask.priority}</div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-2 mt-6">
                  <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={saveTaskChanges}>Save Changes</Button>
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
                          
                          const response = await fetch('https://arctecfox-mono.onrender.com/api/export-pdf', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
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
        </div>
      </TooltipProvider>
    </ComponentErrorBoundary>
  )
}