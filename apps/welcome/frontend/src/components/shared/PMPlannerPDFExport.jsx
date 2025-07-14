import { useState } from "react";
import { exportPMPlansDataToPDF } from "../../utils/pdfExport";

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
    
    const { data, error } = await supabase.rpc('sp_export_recent_task');
    
    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }
    
    if (!data || data.length === 0) {
      throw new Error('No data found to export');
    }
    
    return data;
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
      
      exportPMPlansDataToPDF(data, filename);
      
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