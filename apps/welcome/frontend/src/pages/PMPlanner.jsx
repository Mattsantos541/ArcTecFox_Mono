import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { generatePMPlan } from "../api";
import * as XLSX from 'xlsx';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from "react-router-dom";
import { FormInput, FormSelect, FormTextarea, FormError, FormSuccess } from "../components/forms/FormField";
import FileUpload from "../components/forms/FileUpload";
import { pmPlannerSchema, bulkImportRowSchema } from "../lib/validationSchemas";
import { createStorageService } from "../services/storageService";
import ComponentErrorBoundary from "../components/ComponentErrorBoundary";
import { PMPlannerLoading, GeneratedPlanLoading, ProgressiveLoader } from "../components/loading/LoadingStates";

// Custom components removed - now using standardized UI components from /components/ui/

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
          <ProgressiveLoader 
            stage={0} 
            stages={[
              'Analyzing asset specifications...',
              'Researching maintenance requirements...',
              'Generating maintenance tasks...',
              'Finalizing your plan...'
            ]}
            className="justify-center"
          />
        </div>
      </div>
    </div>
  );
}

// Bulk Import Progress Modal
function BulkImportProgressModal({ isOpen, progress, total, currentAsset }) {
  if (!isOpen) return null;
  
  const percentage = total > 0 ? Math.round((progress / total) * 100) : 0;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md mx-4 text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-800 mb-2">Processing Bulk Import</h3>
        <p className="text-gray-600 mb-4">
          Processing asset {progress} of {total}
        </p>
        {currentAsset && (
          <p className="text-sm text-gray-500 mb-4">
            Current: {currentAsset}
          </p>
        )}
        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
          <div 
            className="bg-purple-600 h-2.5 rounded-full transition-all duration-300" 
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
        <p className="text-sm text-gray-600">{percentage}% Complete</p>
      </div>
    </div>
  );
}

// Bulk Import Modal Component
function BulkImportModal({ isOpen, onClose, onBulkImport }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  if (!isOpen) return null;

  const handleDownloadTemplate = () => {
    const headers = [
      'Asset Name',
      'Model', 
      'Serial Number',
      'Category',
      'Operating Hours',
      'Additional Context',
      'Environment',
      'Plan Start Date'
    ];
    
    const csvContent = headers.join(',') + '\n';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'pm_planner_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setErrorMessage("");
      
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        setSelectedFile(file);
        console.log('File selected:', file.name);
      } else {
        setErrorMessage('Please select a CSV file');
        event.target.value = '';
      }
    }
  };

  const parseCSV = (csvText) => {
    const lines = csvText.split('\n').filter(line => line.trim() !== '');
    
    if (lines.length === 0) {
      throw new Error('CSV file is empty');
    }

    const headers = lines[0].split(',').map(header => header.trim().replace(/"/g, ''));
    
    const dataRows = lines.slice(1).filter(line => {
      const values = line.split(',').map(value => value.trim().replace(/"/g, ''));
      const hasContent = values.some(value => value.length > 0);
      return hasContent;
    });
    
    console.log(`Found ${dataRows.length} data rows with content`);
    
    if (dataRows.length > 10) {
      throw new Error(`Maximum 10 assets allowed, but found ${dataRows.length} rows with data.`);
    }

    if (dataRows.length === 0) {
      throw new Error('No data rows found in CSV file');
    }

    const parsedData = dataRows.map((row, index) => {
      const values = row.split(',').map(value => value.trim().replace(/"/g, ''));
      const rowData = {};
      
      headers.forEach((header, headerIndex) => {
        const value = values[headerIndex] || '';
        
        switch (header.toLowerCase()) {
          case 'asset name':
            rowData.name = value;
            break;
          case 'model':
            rowData.model = value;
            break;
          case 'serial number':
            rowData.serial = value;
            break;
          case 'category':
            rowData.category = value;
            break;
          case 'operating hours':
            rowData.hours = value;
            break;
          case 'additional context':
             rowData.additional_context = value;
            break;
          case 'environment':
            rowData.environment = value;
            break;
          case 'plan start date':
            rowData.date_of_plan_start = value;
            break;
          default:
            break;
        }
      });

      if (!rowData.name || !rowData.category) {
        throw new Error(`Row ${index + 2}: Asset Name and Category are required fields`);
      }

      // Validate each row using Zod schema
      try {
        const validatedRow = bulkImportRowSchema.parse(rowData);
        return validatedRow;
      } catch (validationError) {
        console.error(`Validation error for row ${index + 2}:`, validationError);
        throw new Error(`Row ${index + 2}: ${validationError.errors.map(e => e.message).join(', ')}`);
      }
    });

    return parsedData;
  };

  const handleImport = async () => {
    if (!selectedFile) {
      setErrorMessage('Please select a file first');
      return;
    }
    
    try {
      setProcessing(true);
      setErrorMessage("");
      
      const fileReader = new FileReader();
      fileReader.onload = async (e) => {
        try {
          const csvText = e.target.result;
          console.log('CSV content:', csvText);
          
          const parsedAssets = parseCSV(csvText);
          console.log('Parsed assets:', parsedAssets);
          
          await onBulkImport(parsedAssets);
          
          onClose();
          
        } catch (error) {
          console.error('CSV parsing error:', error);
          setErrorMessage(error.message);
        } finally {
          setProcessing(false);
        }
      };
      
      fileReader.onerror = () => {
        setErrorMessage('Error reading file');
        setProcessing(false);
      };
      
      fileReader.readAsText(selectedFile);
      
    } catch (error) {
      console.error('Import error:', error);
      setErrorMessage(error.message);
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md mx-4 w-full">
        <div className="flex justify-center items-center mb-6 relative">
          <h3 className="text-xl font-semibold text-gray-800">Bulk Import Assets</h3>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
            disabled={processing}
          >
            ×
          </button>
        </div>
        
        {errorMessage && (
          <div className="mb-6 p-4 rounded-lg bg-red-100 text-red-800 border border-red-200">
            <div className="flex items-start">
              <span className="mr-2">❌</span>
              <div>
                <p className="font-medium">Import Error</p>
                <p className="text-sm mt-1">{errorMessage}</p>
              </div>
            </div>
          </div>
        )}
        
        <div className="space-y-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-700 mb-2">1. Download Template</h4>
            <p className="text-sm text-gray-600 mb-3">
              Download a CSV template with the correct headers to fill out your asset information.
            </p>
            <button
              onClick={handleDownloadTemplate}
              disabled={processing}
              className={`w-full py-2 px-4 rounded-lg font-medium ${
                processing 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              📥 Download Template
            </button>
          </div>

          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-700 mb-2">2. Select Import File</h4>
            <p className="text-sm text-gray-600 mb-3">
              Choose a CSV file containing your asset data to import. <strong>Maximum 10 assets per file.</strong>
            </p>
            
            <div className="space-y-3">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                disabled={processing}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
              />
              
              {selectedFile && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Selected:</strong> {selectedFile.name}
                  </p>
                  <p className="text-xs text-blue-600">
                    Size: {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              )}
              
              <button
                onClick={handleImport}
                disabled={!selectedFile || processing}
                className={`w-full py-2 px-4 rounded-lg font-medium ${
                  selectedFile && !processing
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {processing ? '⏳ Processing...' : '📤 Import File'}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={onClose}
            disabled={processing}
            className={`${
              processing 
                ? 'text-gray-400 cursor-not-allowed' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function PMPlanDisplay({ plan, loading = false }) {
  if (loading) {
    return <GeneratedPlanLoading />;
  }
  
  if (!plan?.length) return null;
  return (
    <div className="mt-8 bg-gray-50 rounded-lg p-6">
      <h3 className="text-xl font-bold mb-6 text-gray-800">Generated PM Plan</h3>
      <div className="space-y-6">
        {plan.map((task, index) => (
          <div key={index} className="bg-white rounded-lg p-4 border border-gray-200">
            <h4 className="text-lg font-semibold text-blue-600 mb-2">{task.task_name}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <Info label="Interval" value={task.maintenance_interval} />
              <Info label="Reason" value={task.reason} />
            </div>
            <InfoBlock label="Instructions" value={task.instructions} bg="bg-gray-50" />
            <InfoBlock label="Safety Precautions" value={task.safety_precautions} bg="bg-red-50 text-red-600" />
            <InfoBlock label="Engineering Rationale" value={task.engineering_rationale} bg="bg-blue-50" />
            <InfoBlock label="Common Failures Prevented" value={task.common_failures_prevented} bg="bg-yellow-50" />
            <InfoBlock label="Usage Insights" value={task.usage_insights} bg="bg-green-50" />
            {task.scheduled_dates?.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-600 mb-1">Scheduled Dates (Next 12 months):</p>
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
  );
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-600">{label}:</p>
      <p className="text-sm">{value}</p>
    </div>
  );
}

function InfoBlock({ label, value, bg }) {
  const displayValue = Array.isArray(value) ? value.join('\n') : value;
  
  return (
    <div className="mb-4">
      <p className="text-sm font-medium text-gray-600 mb-1">{label}:</p>
      <p className={`text-sm ${bg} p-2 rounded whitespace-pre-line`}>{displayValue}</p>
    </div>
  );
}

export default function PMPlanner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // React Hook Form setup
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
    setValue,
    watch,
    reset
  } = useForm({
    resolver: zodResolver(pmPlannerSchema),
    mode: "onChange", // Enable real-time validation
    defaultValues: {
      name: "",
      model: "",
      serial: "",
      category: "",
      hours: "",
      additional_context: "",
      environment: "",
      date_of_plan_start: "",
      email: user?.email || "",
      company: ""
    }
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [showBulkImport, setShowBulkImport] = useState(false);
  
  // Bulk import state variables
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [bulkTotal, setBulkTotal] = useState(0);
  const [currentAssetName, setCurrentAssetName] = useState('');
  const [exporting, setExporting] = useState(false);
  const [assetCategories, setAssetCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  
  // File upload state
  const [userManualFile, setUserManualFile] = useState(null);
  const [fileUploadError, setFileUploadError] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  const fetchAssetCategories = async () => {
    try {
      setCategoriesLoading(true);
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY
      );

      const { data, error } = await supabase
        .from('dim_assets')
        .select('asset_name')
        .order('asset_name');

      if (error) throw error;

      // Extract unique asset names and sort them
      const uniqueCategories = [...new Set(data.map(item => item.asset_name))].sort();
      setAssetCategories(uniqueCategories);
    } catch (err) {
      console.error('Error fetching asset categories:', err);
      // Fallback to hardcoded list if fetch fails
      setAssetCategories(["Pump", "Motor", "Valve", "Sensor", "Actuator", "Controller", "Other"]);
    } finally {
      setCategoriesLoading(false);
    }
  };

  // Load categories when component mounts
  // Load categories when component mounts
  useEffect(() => {
    fetchAssetCategories();
  }, []);

  const handleBackToDashboard = () => {
    navigate('/');
  };

  // Update user email when user changes
  useEffect(() => {
    if (user?.email) {
      setValue('email', user.email);
    }
  }, [user, setValue]);

  // Form submission handler
  const onSubmit = async (data) => {
    try {
      setLoading(true);
      setGeneratedPlan(null);
      setMessage("");
      setMessageType("");
      
      let userManualData = null;
      
      // Upload user manual if provided
      if (userManualFile) {
        userManualData = await uploadUserManual(userManualFile, data.name);
        if (!userManualData) {
          // If upload failed, the error is already set, so just return
          return;
        }
      }
      
      const formDataWithDefaults = {
        ...data,
        email: user?.email || "test@example.com",
        company: "Test Company",
        userManual: userManualData // Include user manual data
      };
      
      const aiGeneratedPlan = await generatePMPlan(formDataWithDefaults);
      
      setGeneratedPlan(aiGeneratedPlan);
      
      let successMessage = `✅ PM Plan generated successfully! Found ${aiGeneratedPlan.length} maintenance tasks.`;
      if (userManualData) {
        successMessage += ` User manual uploaded and will be referenced in the plan.`;
      }
      
      setMessage(successMessage);
      setMessageType("success");
      
      // Reset file upload after successful submission
      setUserManualFile(null);
      setFileUploadError(null);
      
      // Optionally reset form after successful submission
      // reset(); // Uncomment if you want to clear form after submission
    } catch (error) {
      console.error("❌ PM Plan generation error:", error);
      setMessage(`❌ Error: ${error.message}`);
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  // Handle form errors
  const onError = (errors) => {
    console.log("Form validation errors:", errors);
    setMessage("Please fix the errors below before submitting.");
    setMessageType("error");
  };

  // File upload handlers
  const handleFileSelect = (file, error) => {
    if (error) {
      setFileUploadError(error);
      setUserManualFile(null);
    } else {
      setFileUploadError(null);
      setUserManualFile(file);
    }
  };

  // Upload file to Supabase Storage
  const uploadUserManual = async (file, assetName) => {
    if (!file || !user) return null;

    try {
      setUploadingFile(true);
      const storageService = await createStorageService();
      
      const result = await storageService.uploadUserManual(file, assetName, user.id);
      
      if (result.success) {
        console.log('User manual uploaded successfully:', result);
        return result;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error uploading user manual:', error);
      setFileUploadError(`Failed to upload user manual: ${error.message}`);
      return null;
    } finally {
      setUploadingFile(false);
    }
  };

  const handleExportToExcel = async () => {
  try {
    setExporting(true);
    setMessage("");
    
    console.log('🔄 Starting export process...');
    
    // Check if user is authenticated
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    // Create authenticated Supabase client (same way as your maintenance schedule)
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY
    );
    
    // Set the auth session manually
    const { data: { session } } = await supabase.auth.getSession();
    console.log('Export session check:', session?.user?.id);
    
    // Test direct query instead of stored procedure
    const { data: testData, error: testError } = await supabase
      .from('pm_tasks')
      .select(`
        *,
        pm_plans (
          asset_name
        )
      `)
      .limit(5);
    
    console.log('Direct query test - data:', testData);
    console.log('Direct query test - error:', testError);

    const { data, error } = await supabase.rpc('sp_export_recent_task');
    
    console.log('RPC result - data:', data);
    console.log('RPC result - error:', error);
    
    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }
    
    if (!data || data.length === 0) {
      throw new Error('No data found to export');
    }
    
    console.log(`📊 Retrieved ${data.length} records for export`);
    
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);
    
    const colWidths = [];
    const headers = Object.keys(data[0]);
    headers.forEach((header, index) => {
      const maxLength = Math.max(
        header.length,
        ...data.map(row => String(row[header] || '').length)
      );
      colWidths[index] = { width: Math.min(maxLength + 2, 50) };
    });
    worksheet['!cols'] = colWidths;
    
    XLSX.utils.book_append_sheet(workbook, worksheet, 'PM Tasks Export');
    
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
    const filename = `PM_Tasks_Export_${timestamp}.xlsx`;
    
    XLSX.writeFile(workbook, filename);
    
    setMessage(`✅ Export completed successfully! Downloaded ${data.length} records to ${filename}`);
    setMessageType("success");
    
    console.log(`✅ Export completed: ${filename}`);
    
  } catch (error) {
    console.error("❌ Export error:", error);
    setMessage(`❌ Export failed: ${error.message}`);
    setMessageType("error");
  } finally {
    setExporting(false);
  }
};

  const handleBulkImport = async (parsedAssets) => {
    try {
      setBulkProcessing(true);
      setBulkProgress(0);
      setBulkTotal(parsedAssets.length);
      setMessage("");
      setGeneratedPlan(null);

      console.log(`🚀 Starting bulk import of ${parsedAssets.length} assets`);

      const results = [];
      const errors = [];

      for (let i = 0; i < parsedAssets.length; i++) {
        const asset = parsedAssets[i];
        
        try {
          setCurrentAssetName(asset.name || `Asset ${i + 1}`);
          setBulkProgress(i + 1);
          
          console.log(`📝 Processing asset ${i + 1}/${parsedAssets.length}:`, asset.name);

          const assetData = {
            name: asset.name || '',
            model: asset.model || '',
            serial: asset.serial || '',
            category: asset.category || '',
            hours: asset.hours || '',
            additional_context: asset.additional_context || '',
            environment: asset.environment || '',
            date_of_plan_start: asset.date_of_plan_start || '',
            email: user?.email || "bulk-import@example.com",
            company: "Bulk Import Company"
          };

          const aiGeneratedPlan = await generatePMPlan(assetData);
          
          results.push({
            asset: assetData,
            plan: aiGeneratedPlan,
            success: true
          });

          console.log(`✅ Successfully processed: ${asset.name}`);

          await new Promise(resolve => setTimeout(resolve, 500));

        } catch (error) {
          console.error(`❌ Error processing asset ${asset.name}:`, error);
          errors.push({
            asset: asset.name || `Row ${i + 2}`,
            error: error.message
          });
        }
      }

      const successCount = results.length;
      const errorCount = errors.length;

      if (successCount > 0) {
        const lastSuccessfulPlan = results[results.length - 1]?.plan;
        if (lastSuccessfulPlan) {
          setGeneratedPlan(lastSuccessfulPlan);
        }
      }

      let summaryMessage = `🎉 Bulk import completed!\n`;
      summaryMessage += `✅ Successfully processed: ${successCount} assets\n`;
      
      if (errorCount > 0) {
        summaryMessage += `❌ Failed to process: ${errorCount} assets\n`;
        summaryMessage += `Errors:\n`;
        errors.forEach(error => {
          summaryMessage += `• ${error.asset}: ${error.error}\n`;
        });
      }

      setMessage(summaryMessage);
      setMessageType(successCount > 0 ? "success" : "error");

      console.log(`🏁 Bulk import completed: ${successCount} successes, ${errorCount} errors`);

    } catch (error) {
      console.error("❌ Bulk import error:", error);
      setMessage(`❌ Bulk import failed: ${error.message}`);
      setMessageType("error");
    } finally {
      setBulkProcessing(false);
      setBulkProgress(0);
      setBulkTotal(0);
      setCurrentAssetName('');
    }
  };

  // Add this check at the beginning of your component
  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <p className="text-gray-600">Please sign in to access this page.</p>
      </div>
    );
  }

  return (
    <ComponentErrorBoundary name="PM Planner" fallbackMessage="Unable to load the PM Planner. Please try refreshing the page.">
      <div className="min-h-screen bg-gray-50">
      <LoadingModal isOpen={loading} />
      
      <BulkImportProgressModal 
        isOpen={bulkProcessing}
        progress={bulkProgress}
        total={bulkTotal}
        currentAsset={currentAssetName}
      />
      
      <BulkImportModal 
        isOpen={showBulkImport} 
        onClose={() => setShowBulkImport(false)}
        onBulkImport={handleBulkImport}
      />
    
      
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">

       <section className="bg-white rounded-lg shadow-md p-6">
  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
  <div className="flex justify-between items-center sm:flex-1">
    <button
      onClick={handleBackToDashboard}
      disabled={loading || bulkProcessing}
      className={`px-6 py-2 sm:px-8 sm:py-3 rounded-lg font-semibold text-white text-sm sm:text-base ${
        loading || bulkProcessing 
          ? "bg-gray-400 cursor-not-allowed" 
          : "bg-blue-600 hover:bg-blue-700"
      }`}
    >
      ← Dashboard
    </button>
    <button
      onClick={() => setShowBulkImport(true)}
      disabled={loading || bulkProcessing}
      className={`px-4 py-2 sm:px-6 rounded-lg font-medium flex items-center gap-2 text-sm sm:text-base ${
        loading || bulkProcessing
          ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
          : 'bg-purple-600 hover:bg-purple-700 text-white'
      }`}
    >
      📊 Bulk Import
    </button>
  </div>
  <h2 className="text-xl sm:text-2xl font-bold text-gray-800 text-center sm:absolute sm:left-1/2 sm:transform sm:-translate-x-1/2">PM Planner</h2>
</div>
          {message && messageType === "success" && (
            <FormSuccess message={message} />
          )}
          {message && messageType === "error" && (
            <FormError message={message} />
          )}
          {Object.keys(errors).length > 0 && (
            <FormError message="Please fix the validation errors below." />
          )}
          <form onSubmit={handleSubmit(onSubmit, onError)}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-700">Asset Information</h3>
                <FormInput 
                  label="Asset Name" 
                  placeholder="e.g., Hydraulic Pump #1" 
                  required
                  error={errors.name?.message}
                  className="mb-3"
                  {...register("name")}
                />
                <FormInput 
                  label="Model" 
                  placeholder="e.g., HPX-500" 
                  error={errors.model?.message}
                  className="mb-3"
                  {...register("model")}
                />
                <FormInput 
                  label="Serial Number" 
                  placeholder="e.g., HPX500-00123" 
                  error={errors.serial?.message}
                  className="mb-3"
                  {...register("serial")}
                />
                <FormSelect 
                  label="Category" 
                  options={categoriesLoading ? [] : assetCategories}
                  placeholder={categoriesLoading ? "Loading categories..." : "Select Category"}
                  disabled={categoriesLoading}
                  required
                  error={errors.category?.message}
                  className="mb-3"
                  {...register("category")}
                />
                
                <FileUpload
                  label="Include User Manual (Optional)"
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
                  maxSize={30 * 1024 * 1024} // 30MB
                  onFileSelect={handleFileSelect}
                  error={fileUploadError}
                  disabled={uploadingFile}
                  className="mb-3"
                />
                
                {uploadingFile && (
                  <div className="mb-3 text-sm text-blue-600 flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    Uploading user manual...
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-700">Operating Conditions</h3>
                <FormInput 
                  label="Operating Hours" 
                  type="number" 
                  placeholder="e.g., 8760" 
                  error={errors.hours?.message}
                  className="mb-3"
                  {...register("hours")}
                />
                <FormTextarea 
                  label="Additional Context" 
                  placeholder="e.g., high vibration equipment, critical production asset, recent repairs, etc." 
                  rows={3} 
                  error={errors.additional_context?.message}
                  className="mb-3"
                  {...register("additional_context")}
                />
                <FormTextarea 
                  label="Environment" 
                  placeholder="e.g., outdoor / high humidity, indoor clean room, etc." 
                  rows={3} 
                  error={errors.environment?.message}
                  className="mb-3"
                  {...register("environment")}
                />
                <FormInput 
                  label="Plan Start Date" 
                  type="date" 
                  error={errors.date_of_plan_start?.message}
                  className="mb-3"
                  {...register("date_of_plan_start")}
                />
              </div>
            </div>
            <div className="mt-8 text-center">
              <button
                type="submit"
                disabled={loading || bulkProcessing || isSubmitting || !isValid}
                className={`px-8 py-3 rounded-lg font-semibold text-white transition-colors ${
                  loading || bulkProcessing || isSubmitting || !isValid
                    ? "bg-gray-400 cursor-not-allowed" 
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {loading || isSubmitting ? "Generating PM Plan..." : "Generate Plan"}
              </button>
              {!isValid && Object.keys(errors).length > 0 && (
                <p className="text-sm text-gray-500 mt-2">
                  Please fix the errors above to enable submission
                </p>
              )}
            </div>
          </form>
       </section>

       <PMPlanDisplay plan={generatedPlan} loading={loading && !generatedPlan} />
       
       {/* Export Section */}
       <section className="bg-white rounded-lg shadow-md p-6">
         <div className="text-center">
           <h3 className="text-lg font-semibold text-gray-800 mb-4">Export Data</h3>
           <p className="text-gray-600 mb-6">
             Export all PM tasks and plans to an Excel file for external analysis or reporting.
           </p>
           <button
             onClick={handleExportToExcel}
             disabled={exporting || loading || bulkProcessing}
             className={`px-8 py-3 rounded-lg font-semibold flex items-center gap-2 mx-auto transition-colors ${
               exporting || loading || bulkProcessing
                 ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                 : 'bg-green-600 hover:bg-green-700 text-white'
             }`}
           >
             {exporting ? (
               <>
                 <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                 <span>Exporting...</span>
               </>
             ) : (
               <>
                 <span>📊</span>
                 <span>Export to Excel</span>
               </>
             )}
           </button>
         </div>
       </section>
     </main>
      </div>
    </ComponentErrorBoundary>
 );
}
