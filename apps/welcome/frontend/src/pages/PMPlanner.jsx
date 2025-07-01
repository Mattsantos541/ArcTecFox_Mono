import { useState } from "react";
import { generatePMPlan } from "../api";

// Reusable UI Components
function Input({ label, name, value, onChange, placeholder, type = "text" }) {
  return (
    <div className="flex flex-col mb-3">
      {label && <label className="mb-1 font-medium">{label}</label>}
      <input
        className="border border-gray-300 rounded px-3 py-2"
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
    </div>
  );
}

function TextArea({ label, name, value, onChange, placeholder, rows = 3 }) {
  return (
    <div className="flex flex-col mb-3">
      {label && <label className="mb-1 font-medium">{label}</label>}
      <textarea
        className="border border-gray-300 rounded px-3 py-2"
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
      />
    </div>
  );
}

function Select({ label, name, value, onChange, options }) {
  return (
    <div className="flex flex-col mb-3">
      {label && <label className="mb-1 font-medium">{label}</label>}
      <select
        className="border border-gray-300 rounded px-3 py-2"
        name={name}
        value={value}
        onChange={onChange}
      >
        <option value="">Select {label}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

function LoadingModal({ isOpen }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md mx-4 text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-800 mb-2">Generating Your PM Plan</h3>
        <p className="text-gray-600">
          Sit tight while we work our magic! ⚡ Our AI is analyzing your asset...
        </p>
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
    // Create CSV template with headers
    const headers = [
      'Asset Name',
      'Model', 
      'Serial Number',
      'Category',
      'Operating Hours',
      'Cycles',
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
      // Clear any previous error messages
      setErrorMessage("");
      
      // Check if it's a CSV file
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
    // Split into lines and filter out completely empty lines
    const lines = csvText.split('\n').filter(line => line.trim() !== '');
    
    if (lines.length === 0) {
      throw new Error('CSV file is empty');
    }

    // Get headers (first row)
    const headers = lines[0].split(',').map(header => header.trim().replace(/"/g, ''));
    
    // Get data rows (excluding header) and filter out rows that are essentially empty
    const dataRows = lines.slice(1).filter(line => {
      // Split the line and check if it has meaningful content
      const values = line.split(',').map(value => value.trim().replace(/"/g, ''));
      // Consider a row empty if all values are empty or just commas
      const hasContent = values.some(value => value.length > 0);
      return hasContent;
    });
    
    console.log(`Found ${dataRows.length} data rows with content`);
    
    // Check row limit (max 10 data rows)
    if (dataRows.length > 10) {
      throw new Error(`Maximum 10 assets allowed, but found ${dataRows.length} rows with data.`);
    }

    if (dataRows.length === 0) {
      throw new Error('No data rows found in CSV file');
    }

    // Parse each row into an object
    const parsedData = dataRows.map((row, index) => {
      const values = row.split(',').map(value => value.trim().replace(/"/g, ''));
      const rowData = {};
      
      headers.forEach((header, headerIndex) => {
        const value = values[headerIndex] || '';
        
        // Map CSV headers to form field names
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
          case 'cycles':
            rowData.cycles = value;
            break;
          case 'environment':
            rowData.environment = value;
            break;
          case 'plan start date':
            rowData.date_of_plan_start = value;
            break;
          default:
            // Ignore unknown headers
            break;
        }
      });

      // Validate required fields
      if (!rowData.name || !rowData.category) {
        throw new Error(`Row ${index + 2}: Asset Name and Category are required fields`);
      }

      return rowData;
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
      
      // Read the file
      const fileReader = new FileReader();
      fileReader.onload = async (e) => {
        try {
          const csvText = e.target.result;
          console.log('CSV content:', csvText);
          
          // Parse CSV data
          const parsedAssets = parseCSV(csvText);
          console.log('Parsed assets:', parsedAssets);
          
          // Call the bulk import handler passed from parent
          await onBulkImport(parsedAssets);
          
          // Close modal on success
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
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-gray-800">Bulk Import Assets</h3>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
            disabled={processing}
          >
            ×
          </button>
        </div>
        
        {/* Error Message Display */}
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
          {/* Download Template Option */}
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

          {/* Select Import File Option */}
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

function PMPlanDisplay({ plan }) {
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
  const [formData, setFormData] = useState({
    name: "", model: "", serial: "", category: "", hours: "",
    cycles: "", environment: "", date_of_plan_start: "", email: "", company: ""
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleGenerateClick = () => {
    if (!formData.name || !formData.category) {
      setMessage("Please fill in at least the Asset Name and Category");
      setMessageType("error");
      return;
    }
    setMessage("");
    handleContactSubmit();
  };

  const handleContactSubmit = async () => {
    try {
      setLoading(true);
      setGeneratedPlan(null);
      const updatedFormData = { 
        ...formData, 
        email: "test@example.com", 
        company: "Test Company" 
      };
      
      // Single call that handles database + AI generation
      const aiGeneratedPlan = await generatePMPlan(updatedFormData);
      
      setGeneratedPlan(aiGeneratedPlan);
      setMessage(`✅ PM Plan generated successfully! Found ${aiGeneratedPlan.length} maintenance tasks.`);
      setMessageType("success");
      setFormData(updatedFormData);
    } catch (error) {
      console.error("❌ PM Plan generation error:", error);
      setMessage(`❌ Error: ${error.message}`);
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  // Handle bulk import processing
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

      // Process each asset one by one
      for (let i = 0; i < parsedAssets.length; i++) {
        const asset = parsedAssets[i];
        
        try {
          setCurrentAssetName(asset.name || `Asset ${i + 1}`);
          setBulkProgress(i + 1);
          
          console.log(`📝 Processing asset ${i + 1}/${parsedAssets.length}:`, asset.name);

          // Prepare asset data with defaults
          const assetData = {
            name: asset.name || '',
            model: asset.model || '',
            serial: asset.serial || '',
            category: asset.category || '',
            hours: asset.hours || '',
            cycles: asset.cycles || '',
            environment: asset.environment || '',
            date_of_plan_start: asset.date_of_plan_start || '',
            email: "bulk-import@example.com",
            company: "Bulk Import Company"
          };

          // Generate PM plan for this asset using existing function
          const aiGeneratedPlan = await generatePMPlan(assetData);
          
          results.push({
            asset: assetData,
            plan: aiGeneratedPlan,
            success: true
          });

          console.log(`✅ Successfully processed: ${asset.name}`);

          // Small delay to prevent overwhelming the API
          await new Promise(resolve => setTimeout(resolve, 500));

        } catch (error) {
          console.error(`❌ Error processing asset ${asset.name}:`, error);
          errors.push({
            asset: asset.name || `Row ${i + 2}`,
            error: error.message
          });
        }
      }

      // Show results
      const successCount = results.length;
      const errorCount = errors.length;

      if (successCount > 0) {
        // For display purposes, show the last successfully generated plan
        const lastSuccessfulPlan = results[results.length - 1]?.plan;
        if (lastSuccessfulPlan) {
          setGeneratedPlan(lastSuccessfulPlan);
        }
      }

      // Create summary message
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

  return (
    <div className="min-h-screen bg-gray-50">
      <LoadingModal isOpen={loading} />
      
      {/* Bulk processing progress modal */}
      <BulkImportProgressModal 
        isOpen={bulkProcessing}
        progress={bulkProgress}
        total={bulkTotal}
        currentAsset={currentAssetName}
      />
      
      {/* Bulk Import Modal */}
      <BulkImportModal 
        isOpen={showBulkImport} 
        onClose={() => setShowBulkImport(false)}
        onBulkImport={handleBulkImport}
      />
      
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center gap-4">
            <img 
              src="/assets/arctecfox-logo.jpg" 
              alt="ArcTecFox Logo" 
              width="64" 
              height="64" 
              className="flex-shrink-0 rounded-lg"
            />
            <h1 className="text-4xl font-bold text-gray-900">ArcTecFox Welcome Page</h1>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <section className="bg-white rounded-lg shadow-md p-8 space-y-6 text-center">
          <h2 className="text-2xl font-semibold text-gray-800">
            Welcome to our AI-Powered Maintenance Planning Platform
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Our AI helps you create detailed PM plans for your specific equipment. Enter your asset
            info below and let the system generate schedules, safety procedures, and rationale.
          </p>
          <p className="text-gray-600 max-w-4xl mx-auto border-t pt-6">
            Manage pumps, motors, valves, and more with maintenance strategies from manufacturer specs,
            industry best practices, and your real-world ops. Fill the form below to get started.
          </p>
        </section>
        <section className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">PM Planner</h2>
            <button
              onClick={() => setShowBulkImport(true)}
              disabled={loading || bulkProcessing}
              className={`px-6 py-2 rounded-lg font-medium flex items-center gap-2 ${
                loading || bulkProcessing
                  ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-700 text-white'
              }`}
            >
              📊 Bulk Import
            </button>
          </div>
          {message && (
            <div className={`p-4 rounded-lg mb-6 whitespace-pre-line ${messageType === "success" ? "bg-green-100 text-green-800 border border-green-200" : "bg-red-100 text-red-800 border border-red-200"}`}>
              {message}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-700">Asset Information</h3>
              <Input label="Asset Name *" name="name" value={formData.name} onChange={handleInputChange} placeholder="e.g., Hydraulic Pump #1" />
              <Input label="Model" name="model" value={formData.model} onChange={handleInputChange} placeholder="e.g., HPX-500" />
              <Input label="Serial Number" name="serial" value={formData.serial} onChange={handleInputChange} placeholder="e.g., HPX500-00123" />
              <Select label="Category *" name="category" value={formData.category} onChange={handleInputChange}
                options={["Pump", "Motor", "Valve", "Sensor", "Actuator", "Controller", "Other"]} />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-700">Operating Conditions</h3>
              <Input label="Operating Hours" name="hours" type="number" value={formData.hours} onChange={handleInputChange} placeholder="e.g., 8760" />
              <Input label="Cycles" name="cycles" type="number" value={formData.cycles} onChange={handleInputChange} placeholder="e.g., 1000" />
              <TextArea label="Environment" name="environment" value={formData.environment} onChange={handleInputChange}
                placeholder="e.g., outdoor / high humidity, indoor clean room, etc." rows={3} />
              <Input label="Plan Start Date" name="date_of_plan_start" type="date" value={formData.date_of_plan_start} onChange={handleInputChange} />
            </div>
          </div>
          <div className="mt-8 text-center">
            <button
              onClick={handleGenerateClick}
              disabled={loading || bulkProcessing}
              className={`px-8 py-3 rounded-lg font-semibold text-white ${loading || bulkProcessing ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}
            >
              {loading ? "Generating PM Plan..." : "Generate Plan"}
            </button>
          </div>
        </section>
        <PMPlanDisplay plan={generatedPlan} />
      </main>
    </div>
  );
}
