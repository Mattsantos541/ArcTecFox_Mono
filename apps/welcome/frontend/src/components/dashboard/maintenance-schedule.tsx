"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CalendarDays, Clock, User, CheckCircle, AlertCircle, Eye, Edit, Trash2, Download, Info, Loader2 } from "lucide-react"
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip"
import ComponentErrorBoundary from "../ComponentErrorBoundary"
import { MaintenanceScheduleLoading } from "../loading/LoadingStates"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "../../hooks/useAuth"

export default function MaintenanceSchedule() {
  // Initialize Supabase client once
  const [supabaseClient, setSupabaseClient] = useState(null);
  
  useEffect(() => {
    const initSupabase = async () => {
      const { createClient } = await import("@supabase/supabase-js");
      const client = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY
      );
      setSupabaseClient(client);
    };
    initSupabase();
  }, []);

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  
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

// Fetch tasks from database
  const fetchTasks = async () => {
    console.log('=== FETCH TASKS CALLED ===');
    if (!user) return

    try {
      console.log('=== INSIDE TRY BLOCK ===');
      setLoading(true)
      setError(null)
      
      console.log('=== ABOUT TO GET SUPABASE CLIENT ===');
      
      if (!supabaseClient) return;
      const supabase = supabaseClient;
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Current session:', session?.user?.id);
      console.log('=== USING EXISTING SUPABASE CLIENT ===');
      
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
      
      const { data, error } = await supabase
        .from('pm_tasks')
        .select(`
          *,
          pm_plans (
            id,
            asset_name,
            created_by,
            users (
              id,
              email,
              full_name
            )
          )
        `)
        // No sorting for now

      if (error) throw error

      // Transform data to match component expectations
      const transformedTasks = data.map(task => ({
        id: task.id,
        asset: task.pm_plans?.asset_name || 'Unknown Asset',
        task: task.task_name || 'No description',
        date: (task.scheduled_dates && task.scheduled_dates.length > 0) ? task.scheduled_dates[0] : 'No date',
        time: '09:00',
        technician: task.pm_plans?.users?.full_name || 'Unassigned',
        duration: task.maintenance_interval || 'Unknown',
        status: 'Pending',
        priority: 'Medium',
        planId: task.pm_plan_id,
        createdByEmail: task.pm_plans?.users?.email,
        notes: task.notes,
        completedAt: task.completed_at,
        actualDuration: task.actual_duration
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

  // Update task in database
  const updateTask = async (taskId, updates) => {
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
        console.log('Error getting user:', e);
      }
  }

  // Delete task from database
  const deleteTaskFromDB = async (taskId) => {
    try {
    const supabase = supabaseClient;
      console.log('=== USING EXISTING SUPABASE CLIENT ===');
      
      console.log('=== GOT SUPABASE CLIENT ===');
      
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
    console.log('supabaseClient:', !!supabaseClient);
    if (user && supabaseClient) {
      console.log('=== CALLING FETCH TASKS FROM USE EFFECT ===');
      fetchTasks()
    } else {
      console.log('=== NOT CALLING FETCH TASKS - MISSING USER OR CLIENT ===');
    }
  }, [user, supabaseClient])

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

  // Task action handlers
  const handleViewTask = (task) => {
    setViewingTask(task)
    setShowViewDialog(true)
  }

  const handleEditTask = (task) => {
    setEditingTask(task)
    setEditedStatus(task.status)
    setEditedTechnician(task.technician)
    setEditedDate(task.date)
    setEditedTime(task.time)
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
        status: editedStatus,
        assigned_technician: editedTechnician,
        scheduled_date: editedDate,
        scheduled_time: editedTime
      }

      const result = await updateTask(editingTask.id, updates)
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
    }
  }

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
        <Button onClick={handleCreateNewPlans}>
          <CalendarDays className="h-4 w-4 mr-2" />
          Create New Plans
        </Button>
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
                  <Button onClick={handleCreateNewPlans}>
                    Create New Plans
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset</TableHead>
                      <TableHead>Task</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Technician</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scheduledTasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell className="font-medium">{task.asset}</TableCell>
                        <TableCell>{task.task}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div>{task.date}</div>
                            <div className="text-sm text-muted-foreground">{task.time}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4" />
                            <span>{task.technician}</span>
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
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(task.status)}
                            <Badge variant={getStatusColor(task.status)}>{task.status}</Badge>
                          </div>
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Calendar</CardTitle>
                <CardDescription>Select a date to view scheduled tasks</CardDescription>
              </CardHeader>
              <CardContent>
               <Calendar
                  value={selectedDate || ''}
                  onChange={(e) => {
                    console.log('Calendar onChange called with:', e.target.value);
                    setSelectedDate(e.target.value);
                  }}
                  className="rounded-md border"
                />
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Tasks for {selectedDate ? new Date(selectedDate + 'T12:00:00').toLocaleDateString() : 'Select a date'}</CardTitle>
                <CardDescription>Scheduled maintenance activities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {scheduledTasks
                    .filter((task) => selectedDate instanceof Date && new Date(task.date).toDateString() === selectedDate.toDateString())
                    .map((task) => (
                      <div key={task.id} className="border rounded-lg p-4">
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
                              <span>
                                {task.time} ({task.duration})
                              </span>
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
                    {scheduledTasks
                    .filter((task) => task.date === selectedDate)
                    .map((task) => (
<div key={task.id} className="border rounded-lg p-4">
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
                              <span>
                                {task.time} ({task.duration})
                              </span>
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
                    <div className="text-center py-8 text-muted-foreground">No tasks scheduled for this date</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Date & Time</div>
                  <div className="font-medium">
                    {viewingTask.date} at {viewingTask.time}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Duration</div>
                  <div className="font-medium">{viewingTask.duration}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Technician</div>
                  <div className="font-medium">{viewingTask.technician}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Priority</div>
                  <div>
                    <Badge variant={getPriorityColor(viewingTask.priority)}>{viewingTask.priority}</Badge>
                  </div>
                </div>
              </div>

              {/* Task Details */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Task Description</h4>
                <p className="text-sm">{viewingTask.task}</p>
              </div>

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
              <Button
                onClick={() => {
                  setShowViewDialog(false)
                  handleEditTask(viewingTask)
                }}
              >
                Edit Task
              </Button>
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

            <div className="space-y-4">
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
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Export Task</DialogTitle>
              <DialogDescription>
                Choose the format to export the maintenance task for {exportingTask.asset}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
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