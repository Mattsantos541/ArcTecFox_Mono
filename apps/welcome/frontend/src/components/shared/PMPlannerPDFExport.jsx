import { useState } from "react";
// Using ReportLab Python backend for PDF generation

export default function PMPlannerPDFExport({ user, disabled, onExportStart, onExportComplete, onExportError }) {
  const [exporting, setExporting] = useState(false);

  const fetchExportData = async () => {
    // Check if user is authenticated
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    // Create authenticated Supabase client
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY
    );
    
    // Set the auth session manually
    const { data: { session } } = await supabase.auth.getSession();
    console.log('Export session check:', session?.user?.id);
    
    // Use the same query as Scheduled Maintenance instead of stored procedure
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
      `);
    
    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }
    
    if (!data || data.length === 0) {
      throw new Error('No data found to export');
    }
    
    // Transform data to match PDF export expectations (same as Scheduled Maintenance)
    const transformedTasks = data.map(task => ({
      id: task.id,
      task: task.task_name,
      task_name: task.task_name,
      asset: task.pm_plans?.asset_name,
      asset_name: task.pm_plans?.asset_name,
      status: task.status,
      priority: task.priority,
      scheduledDate: task.scheduled_date,
      scheduled_date: task.scheduled_date,
      maintenance_interval: task.maintenance_interval,
      duration: task.maintenance_interval,
      createdBy: task.pm_plans?.users?.full_name,
      createdByEmail: task.pm_plans?.users?.email,
      notes: task.notes,
      completedAt: task.completed_at,
      actualDuration: task.actual_duration,
      instructions: task.instructions,
      // AI fields from pm_tasks table
      time_to_complete: task.est_minutes ? `${task.est_minutes} minutes` : 'N/A',
      tools_needed: task.tools_needed || 'N/A',
      no_techs_needed: task.no_techs_needed || 'N/A',
      est_minutes: task.est_minutes,
      // Additional fields for PDF export - these are the key missing fields!
      reason: task.reason,
      safety_precautions: task.safety_precautions,
      engineering_rationale: task.engineering_rationale,
      common_failures_prevented: task.common_failures_prevented,
      usage_insights: task.usage_insights,
      scheduled_dates: task.scheduled_dates,
      consumables: task.consumables
    }));
    
    return transformedTasks;
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      onExportStart?.();
      console.log('🔄 Starting PDF export process...');
      
      const data = await fetchExportData();
      console.log(`📊 Retrieved ${data.length} records for PDF export`);
      
      // Generate PDF using our utility function
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
      const filename = `PM_Tasks_Export_${timestamp}.pdf`;
      
      // Call the Python backend API for PDF generation
      const response = await fetch('https://arctecfox-mono.onrender.com/api/export-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: data,
          filename: filename,
          export_type: 'pm_plans'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      // Download the PDF file
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
      
      console.log(`✅ PDF export completed: ${filename}`);
      onExportComplete?.();
      
    } catch (error) {
      console.error("❌ PDF export error:", error);
      onExportError?.(error);
    } finally {
      setExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={disabled || exporting}
      className={`px-8 py-3 rounded-lg font-semibold flex items-center gap-2 justify-center transition-colors ${
        disabled || exporting
          ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
          : 'bg-red-600 hover:bg-red-700 text-white'
      }`}
    >
      {exporting ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          <span>Exporting...</span>
        </>
      ) : (
        <>
          <span>📄</span>
          <span>Export to PDF</span>
        </>
      )}
    </button>
  );
}