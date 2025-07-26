import { useState, useEffect, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { generatePMPlan, fetchUserSitesForPlanning, checkSitePlanLimit, isUserSuperAdmin, supabase } from "../api";
import * as XLSX from 'xlsx';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from "react-router-dom";
import { FormInput, FormSelect, FormTextarea, FormError, FormSuccess } from "../components/forms/FormField";
import FileUpload from "../components/forms/FileUpload";
import { pmPlannerSchema, bulkImportRowSchema } from "../lib/validationSchemas";
import { createStorageService } from "../services/storageService";
import ComponentErrorBoundary from "../components/ComponentErrorBoundary";
import { PMPlannerLoading, GeneratedPlanLoading, ProgressiveLoader } from "../components/loading/LoadingStates";
import PMPlannerPDFExport from "../components/shared/PMPlannerPDFExport";

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
          Completed {progress} of {total} assets
        </p>
        {currentAsset && (
          <p className="text-sm text-gray-500 mb-4">
            Currently processing: {currentAsset}
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
function BulkImportModal({ isOpen, onClose, onBulkImport, assetCategories = [] }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  if (!isOpen) return null;

  const handleDownloadTemplate = () => {
    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    
    // Create main data worksheet
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
    
    // Create sample data with proper formatting
    const sampleData = [
      headers,
      ['Example Pump 1', 'XYZ-2000', 'SN12345', 'Pump', '5000', 'Located in Building A', 'Indoor - Clean', '2024-01-15'],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '']
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(sampleData);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 20 }, // Asset Name
      { wch: 15 }, // Model
      { wch: 15 }, // Serial Number
      { wch: 15 }, // Category
      { wch: 15 }, // Operating Hours
      { wch: 30 }, // Additional Context
      { wch: 20 }, // Environment
      { wch: 15 }  // Plan Start Date
    ];
    
    // Create categories sheet for dropdown data
    const categoriesWs = XLSX.utils.aoa_to_sheet([
      ['Categories'],
      ...assetCategories.map(cat => [cat])
    ]);
    
    // Add worksheets to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'PM Plans');
    XLSX.utils.book_append_sheet(wb, categoriesWs, 'Categories');
    
    // Add data validation for category column (D2:D100)
    if (!ws['!dataValidation']) ws['!dataValidation'] = [];
    ws['!dataValidation'].push({
      ref: 'D2:D100',
      type: 'list',
      formula1: 'Categories!$A$2:$A$' + (assetCategories.length + 1)
    });
    
    // Add data validation for environment column
    const environments = ['Indoor - Clean', 'Indoor - Dirty', 'Outdoor - Covered', 'Outdoor - Exposed', 'Harsh - Chemical', 'Harsh - Temperature'];
    if (!ws['!dataValidation']) ws['!dataValidation'] = [];
    ws['!dataValidation'].push({
      ref: 'G2:G100',
      type: 'list',
      formula1: '"' + environments.join(',') + '"'
    });
    
    // Generate Excel file
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });
    
    // Convert to blob
    function s2ab(s) {
      const buf = new ArrayBuffer(s.length);
      const view = new Uint8Array(buf);
      for (let i = 0; i < s.length; i++) view[i] = s.charCodeAt(i) & 0xFF;
      return buf;
    }
    
    const blob = new Blob([s2ab(wbout)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'pm_planner_template.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setErrorMessage("");
      
      const isCSV = file.type === 'text/csv' || file.name.endsWith('.csv');
      const isExcel = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
                      file.type === 'application/vnd.ms-excel' || 
                      file.name.endsWith('.xlsx') || 
                      file.name.endsWith('.xls');
      
      if (isCSV || isExcel) {
        setSelectedFile(file);
        console.log('File selected:', file.name);
      } else {
        setErrorMessage('Please select a CSV or Excel file');
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
      // Better CSV parsing that handles quoted values with commas
      const values = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < row.length; i++) {
        const char = row[i];
        
        if (char === '"' && (i === 0 || row[i-1] === ',')) {
          inQuotes = true;
        } else if (char === '"' && inQuotes) {
          inQuotes = false;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim()); // Don't forget the last value
      
      const rowData = {};
      
      headers.forEach((header, headerIndex) => {
        const value = (values[headerIndex] || '').replace(/^"|"$/g, '').trim();
        
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
      
      const isExcelFile = selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls');
      
      if (isExcelFile) {
        // Handle Excel file
        const fileReader = new FileReader();
        fileReader.onload = async (e) => {
          try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            
            // Get the first sheet
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            // Convert to CSV
            const csvText = XLSX.utils.sheet_to_csv(worksheet);
            console.log('Excel converted to CSV:', csvText);
            
            const parsedAssets = parseCSV(csvText);
            console.log('Parsed assets:', parsedAssets);
            
            await onBulkImport(parsedAssets);
            
            onClose();
            
          } catch (error) {
            console.error('Excel parsing error:', error);
            setErrorMessage(error.message);
          } finally {
            setProcessing(false);
          }
        };
        
        fileReader.onerror = () => {
          setErrorMessage('Error reading file');
          setProcessing(false);
        };
        
        fileReader.readAsArrayBuffer(selectedFile);
      } else {
        // Handle CSV file
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
      }
      
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
              Download an Excel template with dropdown lists for categories and environments.
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
              Choose a CSV or Excel file containing your asset data to import. <strong>Maximum 10 assets per file.</strong>
            </p>
            
            <div className="space-y-3">
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
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

// Plan Limit Override Modal Component
function PlanLimitOverrideModal({ isOpen, onClose, onProceed, limitData, isSuperAdmin }) {
  if (!isOpen || !limitData) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md mx-4 w-full">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-4">
            <span className="text-red-600 text-2xl">⚠️</span>
          </div>
          
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Plan Limit Exceeded</h3>
          
          <div className="text-left bg-gray-50 rounded-lg p-4 mb-6">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Site:</span>
                <span className="font-medium">{limitData.siteName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Current Plans:</span>
                <span className="font-medium">{limitData.currentPlans}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Plan Limit:</span>
                <span className="font-medium">{limitData.planLimit}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">New Plans:</span>
                <span className="font-medium">{limitData.newPlans}</span>
              </div>
              <hr className="my-2" />
              <div className="flex justify-between text-red-600 font-semibold">
                <span>Total After Creation:</span>
                <span>{limitData.totalAfterNew}</span>
              </div>
            </div>
          </div>
          
          <p className="text-gray-600 mb-6">
            Creating this plan will exceed the site's plan limit of {limitData.planLimit}. 
            {!isSuperAdmin && ' Please contact support@arctecfox.co for assistance.'}
          </p>
          
          <div className="flex space-x-3">
            {isSuperAdmin ? (
              <>
                <button
                  onClick={onProceed}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  Override as Admin
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={onClose}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            )}
          </div>
          
          {isSuperAdmin && (
            <p className="text-xs text-gray-500 mt-3">
              As a Super Admin, you can override plan limits. Use this carefully.
            </p>
          )}
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              <Info label="Interval" value={task.maintenance_interval} />
              <Info label="Reason" value={task.reason} />
              <Info label="Estimated Time" value={task.estimated_time_minutes || 'Not specified'} />
              <Info label="Tools Needed" value={task.tools_needed || 'Standard maintenance tools'} />
              <Info label="Technicians Required" value={task.number_of_technicians || 1} />
              <Info label="Consumables" value={task.consumables || 'None specified'} />
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
  const [customCategory, setCustomCategory] = useState("");
  
  // Watch the category field to detect "Other" selection
  const watchedCategory = watch("category");
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [showBulkImport, setShowBulkImport] = useState(false);
  
  // Site selection state
  const [userSites, setUserSites] = useState([]);
  const [selectedSite, setSelectedSite] = useState('');
  const [showSiteSelection, setShowSiteSelection] = useState(false);
  const [sitesLoading, setSitesLoading] = useState(true);
  const lastFetchedUserId = useRef(null);
  
  // Plan limit override state
  const [showPlanLimitModal, setShowPlanLimitModal] = useState(false);
  const [planLimitData, setPlanLimitData] = useState(null);
  const [pendingFormData, setPendingFormData] = useState(null);
  const [pendingBulkAssets, setPendingBulkAssets] = useState(null);
  const [isUserSuperAdminState, setIsUserSuperAdminState] = useState(false);
  
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
      
      const { data, error } = await supabase
        .from('dim_assets')
        .select('asset_name')
        .order('asset_name');

      if (error) throw error;

      // Extract unique asset names, add "Other" option, and sort them
      const uniqueCategories = [...new Set(data.map(item => item.asset_name)), "Other"].sort();
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
  const loadUserSites = useCallback(async () => {
    try {
      if (user?.id && user.id !== lastFetchedUserId.current) {
        setSitesLoading(true);
        lastFetchedUserId.current = user.id;
        
        const sites = await fetchUserSitesForPlanning(user.id);
        setUserSites(sites);
        
        // Auto-select if only one site
        if (sites.length === 1) {
          setSelectedSite(sites[0].id);
        }
        setShowSiteSelection(sites.length > 1);
      } else if (!user?.id) {
        // Reset state when user is not available
        setUserSites([]);
        setSelectedSite('');
        lastFetchedUserId.current = null;
      }
    } catch (error) {
      console.error('Error loading user sites:', error);
      setMessage("❌ Failed to load your sites. Please refresh the page.");
      setMessageType("error");
      // Reset ref so we can retry later
      lastFetchedUserId.current = null;
    } finally {
      setSitesLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchAssetCategories();
  }, []); // Only fetch categories once

  useEffect(() => {
    loadUserSites();
  }, [loadUserSites]);

  const handleBackToDashboard = () => {
    navigate('/');
  };

  // Update user email when user changes
  useEffect(() => {
    if (user?.email) {
      setValue('email', user.email);
    }
  }, [user, setValue]);

  // Extracted plan creation logic that can be called from onSubmit or modal override
  const createPMPlan = async (data) => {
    setLoading(true);
    setGeneratedPlan(null);
    setMessage("");
    setMessageType("");
    
    try {
      let userManualData = null;
      
      // Upload user manual if provided
      if (userManualFile) {
        userManualData = await uploadUserManual(userManualFile, data.name);
        if (!userManualData) {
          // If upload failed, the error is already set, so just return
          return;
        }
      }
      
      // Determine which site to use
      const siteToUse = userSites.length === 1 ? userSites[0].id : selectedSite;
      const siteData = userSites.find(s => s.id === siteToUse);
      const siteName = siteData?.displayName || "Unknown Site";

      const formDataWithDefaults = {
        ...data,
        // Use custom category if "Other" is selected, otherwise use the selected category
        category: data.category === "Other" ? customCategory.trim() : data.category,
        email: user?.email || "test@example.com",
        company: siteData?.company?.name || "Unknown Company",
        siteId: siteToUse, // Add site ID for database storage
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

  // Plan limit modal handlers
  const handlePlanLimitOverride = async () => {
    setShowPlanLimitModal(false);
    
    if (pendingFormData) {
      // Single plan creation
      await createPMPlan(pendingFormData);
    } else if (pendingBulkAssets) {
      // Bulk import
      await executeBulkImport(pendingBulkAssets);
    }
    
    // Clear pending data
    setPlanLimitData(null);
    setPendingFormData(null);
    setPendingBulkAssets(null);
  };

  const handlePlanLimitCancel = () => {
    setShowPlanLimitModal(false);
    
    // Clear pending data
    setPlanLimitData(null);
    setPendingFormData(null);
    setPendingBulkAssets(null);
    
    const operationType = pendingBulkAssets ? "Bulk import" : "Plan creation";
    setMessage(`${operationType} cancelled.`);
    setMessageType("error");
  };

  // Form submission handler
  const onSubmit = async (data) => {
    try {
      // Validate custom category if "Other" is selected
      if (data.category === "Other" && !customCategory.trim()) {
        setMessage("❌ Please enter a custom category when 'Other' is selected.");
        setMessageType("error");
        return;
      }

      // Site validation logic
      if (sitesLoading) {
        setMessage("❌ Please wait while we load your site information.");
        setMessageType("error");
        return;
      }

      if (userSites.length === 0) {
        setMessage("❌ You must be a member of at least one site to create PM plans. Please contact your administrator to be added to a site.");
        setMessageType("error");
        return;
      }

      if (userSites.length > 1 && !selectedSite) {
        setShowSiteSelection(true);
        setMessage("❌ Please select which site this plan belongs to.");
        setMessageType("error");
        return;
      }

      // Plan limit validation
      const currentSiteId = selectedSite || (userSites.length === 1 ? userSites[0].id : null);
      if (currentSiteId) {
        try {
          const planLimitCheck = await checkSitePlanLimit(currentSiteId, 1);
          if (!planLimitCheck.canCreate) {
            const isSuperAdmin = await isUserSuperAdmin(user.id);
            
            // Show modal for everyone (including super admin)
            setPlanLimitData(planLimitCheck);
            setIsUserSuperAdminState(isSuperAdmin);
            setPendingFormData(data);
            setShowPlanLimitModal(true);
            return; // Stop execution here, let the modal handle the decision
          }
        } catch (error) {
          console.error('Error checking plan limit:', error);
          setMessage("❌ Unable to verify plan limits. Please try again.");
          setMessageType("error");
          return;
        }
      }

      // If we get here, plan limit check passed, proceed with plan creation
      await createPMPlan(data);
    } catch (error) {
      console.error("❌ Form validation error:", error);
      setMessage(`❌ Error: ${error.message}`);
      setMessageType("error");
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


  // Extracted bulk import execution logic
  const executeBulkImport = async (parsedAssets) => {
    setBulkProcessing(true);
    setBulkProgress(0);
    setBulkTotal(parsedAssets.length);
    setMessage("");
    setGeneratedPlan(null);

    console.log(`🚀 Starting bulk import of ${parsedAssets.length} assets`);

    const results = [];
    const errors = [];
    const currentSiteId = selectedSite || (userSites.length === 1 ? userSites[0].id : null);

    try {
      for (let i = 0; i < parsedAssets.length; i++) {
        const asset = parsedAssets[i];
        
        try {
          setCurrentAssetName(asset.name || `Asset ${i + 1}`);
          // Don't update progress here - wait until completion
          
          console.log(`📝 Processing asset ${i + 1}/${parsedAssets.length}:`, asset.name);

          const siteData = userSites.find(s => s.id === currentSiteId);
          
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
            company: siteData?.company?.name || "Bulk Import Company",
            siteId: currentSiteId
          };

          console.log(`📤 Sending asset data to API:`, assetData);
          
          const aiGeneratedPlan = await generatePMPlan(assetData);
          
          if (!aiGeneratedPlan) {
            throw new Error('No plan generated from API');
          }
          
          results.push({
            asset: assetData,
            plan: aiGeneratedPlan,
            success: true
          });

          console.log(`✅ Successfully processed: ${asset.name}`);
          console.log(`📋 Generated plan:`, aiGeneratedPlan);
          
          // Update progress AFTER successful completion
          setBulkProgress(results.length);

          // Add a small delay between API calls to avoid rate limiting
          if (i < parsedAssets.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }

        } catch (error) {
          console.error(`❌ Error processing asset ${asset.name}:`, error);
          errors.push({
            asset: asset.name || `Row ${i + 2}`,
            error: error.message
          });
          
          // Update progress even for failed items to show accurate completion
          setBulkProgress(results.length + errors.length);
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

  const handleBulkImport = async (parsedAssets) => {
    try {
      // Site validation logic (same as single plan)
      if (sitesLoading) {
        setMessage("❌ Please wait while we load your site information.");
        setMessageType("error");
        return;
      }

      if (userSites.length === 0) {
        setMessage("❌ You must be a member of at least one site to create PM plans. Please contact your administrator to be added to a site.");
        setMessageType("error");
        return;
      }

      if (userSites.length > 1 && !selectedSite) {
        setShowSiteSelection(true);
        setMessage("❌ Please select which site these plans belong to.");
        setMessageType("error");
        return;
      }

      // Plan limit validation for bulk import
      const currentSiteId = selectedSite || (userSites.length === 1 ? userSites[0].id : null);
      if (currentSiteId) {
        try {
          const planLimitCheck = await checkSitePlanLimit(currentSiteId, parsedAssets.length);
          if (!planLimitCheck.canCreate) {
            const isSuperAdmin = await isUserSuperAdmin(user.id);
            
            // Show modal for everyone (including super admin)
            setPlanLimitData(planLimitCheck);
            setIsUserSuperAdminState(isSuperAdmin);
            setPendingBulkAssets(parsedAssets);
            setShowPlanLimitModal(true);
            return; // Stop execution here, let the modal handle the decision
          }
        } catch (error) {
          console.error('Error checking plan limit for bulk import:', error);
          setMessage("❌ Unable to verify plan limits for bulk import. Please try again.");
          setMessageType("error");
          return;
        }
      }

      // If we get here, bulk import plan limit check passed, proceed with execution
      await executeBulkImport(parsedAssets);
    } catch (error) {
      console.error("❌ Bulk import validation error:", error);
      setMessage(`❌ Error: ${error.message}`);
      setMessageType("error");
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
      
      {/* Site Selection Modal */}
      {showSiteSelection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Select Site</h3>
            <p className="text-gray-600 mb-4">
              You belong to multiple sites. Please select which site this PM plan belongs to:
            </p>
            
            <div className="space-y-3 mb-6">
              {userSites.map((site) => (
                <label key={site.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="site"
                    value={site.id}
                    checked={selectedSite === site.id}
                    onChange={(e) => setSelectedSite(e.target.value)}
                    className="text-blue-600"
                  />
                  <div>
                    <div className="font-medium text-gray-900">{site.displayName}</div>
                    <div className="text-sm text-gray-500">
                      Plan Limit: {site.plan_limit || 0}
                    </div>
                  </div>
                </label>
              ))}
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  if (selectedSite) {
                    setShowSiteSelection(false);
                    setMessage('');
                    setMessageType('');
                  } else {
                    setMessage("❌ Please select a site.");
                    setMessageType("error");
                  }
                }}
                disabled={!selectedSite}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Continue
              </button>
              <button
                onClick={() => setShowSiteSelection(false)}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
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
        assetCategories={assetCategories}
      />
      
      <PlanLimitOverrideModal
        isOpen={showPlanLimitModal}
        onClose={handlePlanLimitCancel}
        onProceed={handlePlanLimitOverride}
        limitData={planLimitData}
        isSuperAdmin={isUserSuperAdminState}
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

                {/* Show custom category input when "Other" is selected */}
                {watchedCategory === "Other" && (
                  <FormInput 
                    label="Custom Category" 
                    placeholder="Enter your custom category" 
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    required
                    error={watchedCategory === "Other" && !customCategory ? "Custom category is required" : ""}
                    className="mb-3"
                  />
                )}
                
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
             Export all PM tasks and plans to Excel or PDF format for external analysis or reporting.
           </p>
           <div className="flex flex-col sm:flex-row gap-4 justify-center">
             <button
               onClick={handleExportToExcel}
               disabled={exporting || loading || bulkProcessing}
               className={`px-8 py-3 rounded-lg font-semibold flex items-center gap-2 justify-center transition-colors ${
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
             <PMPlannerPDFExport
               user={user}
               disabled={exporting || loading || bulkProcessing}
               onExportStart={() => {
                 setExporting(true);
                 setMessage("");
               }}
               onExportComplete={() => {
                 setMessage(`✅ PDF export completed successfully!`);
                 setMessageType("success");
                 setExporting(false);
               }}
               onExportError={(error) => {
                 setMessage(`❌ PDF export failed: ${error.message}`);
                 setMessageType("error");
                 setExporting(false);
               }}
             />
           </div>
         </div>
       </section>
     </main>
      </div>
    </ComponentErrorBoundary>
 );
}
