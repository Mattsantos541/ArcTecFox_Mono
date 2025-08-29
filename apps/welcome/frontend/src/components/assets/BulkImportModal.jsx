import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  FileSpreadsheet, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  AlertCircle 
} from 'lucide-react';
import { parseExcelFile } from '../../utils/excelParser';

// Status Badge Component
const StatusBadge = ({ status }) => {
  const styles = {
    valid: 'bg-green-100 text-green-800',
    warning: 'bg-amber-100 text-amber-800', 
    error: 'bg-red-100 text-red-800'
  };
  
  const icons = {
    valid: <CheckCircle className="w-3 h-3" />,
    warning: <AlertTriangle className="w-3 h-3" />,
    error: <XCircle className="w-3 h-3" />
  };
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
      {icons[status]}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

// Row Color Coding
const getRowClassName = (status) => {
  switch (status) {
    case 'valid': return 'bg-green-50 hover:bg-green-100';
    case 'warning': return 'bg-amber-50 hover:bg-amber-100';
    case 'error': return 'bg-red-50 hover:bg-red-100';
    default: return 'hover:bg-gray-50';
  }
};

const BulkImportModal = ({ isOpen, onClose, onImport, assetCategories, siteId }) => {
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [validationResults, setValidationResults] = useState([]);
  const [error, setError] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  // Create confetti effect
  const createConfetti = () => {
    const colors = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444'];
    const confettiElements = [];
    
    for (let i = 0; i < 50; i++) {
      const confetti = {
        id: i,
        left: Math.random() * 100,
        animationDelay: Math.random() * 3,
        backgroundColor: colors[Math.floor(Math.random() * colors.length)]
      };
      confettiElements.push(confetti);
    }
    
    return confettiElements;
  };

  const confettiElements = createConfetti();

  if (!isOpen) return null;

  // Calculate counts for action button
  const validAssetCount = validationResults.filter(r => r.status === 'valid').length;
  const canImport = validAssetCount > 0 && !processing && !importing;

  const handleDownloadTemplate = () => {
    // Create template with parent_assets fields
    const templateData = [
      {
        name: 'Example Compressor Unit',
        make: 'Ingersoll Rand',
        model: 'IR-XFE50',
        serial_number: 'SN123456789',
        category: 'Compressor',
        purchase_date: '2023-01-15',
        install_date: '2023-02-01',
        notes: 'Primary production compressor',
        cost_to_replace: '50000',
        environment: 'Industrial'
      }
    ];

    // Create workbook with template data
    import('xlsx').then(XLSX => {
      const ws = XLSX.utils.json_to_sheet(templateData);
      
      // Add comments with validation rules
      const comments = {
        'A1': 'Asset name (required, max 255 chars)',
        'B1': 'Manufacturer/Make (optional)',
        'C1': 'Model number (optional)',
        'D1': 'Serial number (optional)',
        'E1': 'Asset category (from predefined list)',
        'F1': 'Purchase date (YYYY-MM-DD format)',
        'G1': 'Installation date (YYYY-MM-DD format)',
        'H1': 'Additional notes (optional)',
        'I1': 'Replacement cost in dollars (optional)',
        'J1': 'Operating environment (optional)'
      };

      // Add comments to cells
      Object.entries(comments).forEach(([cell, comment]) => {
        if (!ws[cell]) ws[cell] = { v: '', t: 's' };
        ws[cell].c = [{ a: 'System', t: comment }];
      });

      // Set column widths
      ws['!cols'] = [
        { wch: 25 }, // name
        { wch: 15 }, // make
        { wch: 15 }, // model
        { wch: 15 }, // serial_number
        { wch: 15 }, // category
        { wch: 12 }, // purchase_date
        { wch: 12 }, // install_date
        { wch: 30 }, // notes
        { wch: 12 }, // cost_to_replace
        { wch: 15 }  // environment
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Parent Assets Template');
      
      // Download file
      XLSX.writeFile(wb, 'parent_assets_template.xlsx');
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleFile = async (file) => {
    setError(null);
    
    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv' // .csv
    ];
    
    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
      setError('Please select a valid Excel (.xlsx, .xls) or CSV file');
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    setSelectedFile(file);
    setProcessing(true);

    try {
      const results = await parseExcelFile(file, assetCategories);
      setValidationResults(results);
    } catch (err) {
      console.error('Error parsing file:', err);
      setError(err.message || 'Unable to read file. Please ensure it\'s a valid Excel/CSV file');
      setValidationResults([]);
    } finally {
      setProcessing(false);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setValidationResults([]);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    if (importing) return; // Prevent closing during import
    setModalVisible(false);
    setTimeout(() => onClose(), 300);
  };

  const handleImport = async () => {
    if (!canImport) return;

    setImporting(true);
    setImportProgress(0);
    
    try {
      const validAssets = validationResults
        .filter(r => r.status === 'valid')
        .map(r => r.assetData);

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setImportProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + Math.random() * 15;
        });
      }, 200);

      await onImport(validAssets);
      
      // Complete progress and show success
      clearInterval(progressInterval);
      setImportProgress(100);
      setShowSuccessAnimation(true);
      
      // Wait for success animation before closing
      setTimeout(() => {
        // Reset modal state
        setSelectedFile(null);
        setValidationResults([]);
        setError(null);
        setImportProgress(0);
        setShowSuccessAnimation(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        onClose();
      }, 2000);
      
    } catch (err) {
      console.error('Import failed:', err);
      setError(err.message || 'Import failed. Please try again.');
      setImportProgress(0);
    } finally {
      setImporting(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(-100vh) rotateZ(0deg);
          }
          100% {
            transform: translateY(100vh) rotateZ(720deg);
          }
        }
        
        @keyframes fade-in {
          0% {
            opacity: 0;
            transform: translateY(20px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
        
        .bg-blue-25 {
          background-color: rgba(59, 130, 246, 0.05);
        }
      `}</style>
      <div className={`fixed inset-0 bg-black transition-all duration-300 ease-out flex items-center justify-center z-50 ${
        modalVisible ? 'bg-opacity-50' : 'bg-opacity-0'
      }`}>
        <div className={`bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden transform transition-all duration-300 ease-out relative ${
          modalVisible ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-4'
        }`}>
        
        {/* Modal Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-800">Bulk Import Parent Assets</h2>
            <button 
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-all duration-200 p-1 hover:bg-gray-100 rounded-full transform hover:scale-110 active:scale-95"
              disabled={importing}
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
          
          {/* Template Download Section */}
          <div className="p-6 border-b border-gray-200 bg-blue-50">
            <h3 className="text-lg font-medium text-gray-800 mb-3">1. Download Template</h3>
            <p className="text-sm text-gray-600 mb-4">
              Start by downloading the Excel template with the required format and sample data.
            </p>
            <button
              onClick={handleDownloadTemplate}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all duration-200 flex items-center gap-2 text-sm font-medium transform hover:scale-105 active:scale-95 shadow-md hover:shadow-lg"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Download Excel Template
            </button>
          </div>

          {/* Upload Section */}
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-800 mb-3">2. Upload Your File</h3>
            
            {/* Error Display */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg mb-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  <span className="font-medium">Error:</span>
                  {error}
                </div>
              </div>
            )}

            <div 
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragOver 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-300 bg-gray-50'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleFileDrop}
            >
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-600 mb-2">
                Drop your Excel file here, or click to browse
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Supports .xlsx, .xls, and .csv files (max 10MB)
              </p>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                className="hidden"
                ref={fileInputRef}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
                disabled={processing}
              >
                {processing ? 'Processing...' : 'Select File'}
              </button>
            </div>

            {/* Selected File Info */}
            {selectedFile && (
              <div className="mt-4 p-3 bg-gray-100 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-gray-700">{selectedFile.name}</span>
                  <span className="text-xs text-gray-500">({formatFileSize(selectedFile.size)})</span>
                </div>
                <button
                  onClick={handleRemoveFile}
                  className="text-red-600 hover:text-red-700 transition-colors"
                  disabled={processing}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Validation Results Section */}
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-800 mb-3">3. Validation Results</h3>
            {processing ? (
              <div className="space-y-6">
                <div className="text-center py-8 space-y-4">
                  <div className="relative">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-blue-600 animate-pulse" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-gray-700 font-medium">🔍 Analyzing your file...</p>
                    <div className="flex justify-center space-x-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                    <p className="text-sm text-gray-500">Validating data format and checking for errors...</p>
                  </div>
                </div>
                
                {/* Loading Skeleton */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Row</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asset Name</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Issues</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {[...Array(5)].map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          <td className="px-3 py-4">
                            <div className="h-4 bg-gray-200 rounded w-8"></div>
                          </td>
                          <td className="px-3 py-4">
                            <div className="h-4 bg-gray-200 rounded w-32"></div>
                          </td>
                          <td className="px-3 py-4">
                            <div className="h-6 bg-gray-200 rounded-full w-16"></div>
                          </td>
                          <td className="px-3 py-4">
                            <div className="h-4 bg-gray-200 rounded w-24"></div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : validationResults.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Row
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Asset Name
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Issues
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {validationResults.map((result, index) => (
                      <tr key={index} className={getRowClassName(result.status)}>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                          {result.rowNumber}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {result.assetName}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap">
                          <StatusBadge status={result.status} />
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-600">
                          {result.errors.length > 0 ? result.errors.join(', ') : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <div className="relative">
                  <FileSpreadsheet className="w-16 h-16 mx-auto mb-4 text-gray-300 animate-pulse" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-6 h-6 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full opacity-20 animate-ping" style={{ animationDelay: '1s' }}></div>
                  </div>
                </div>
                <h4 className="text-lg font-medium text-gray-700 mb-2">Ready for Import</h4>
                <p className="text-gray-500 mb-4">Upload your Excel file to see validation results and import assets</p>
                <div className="flex justify-center">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-blue-300 rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-purple-300 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Import Progress Bar */}
        {importing && importProgress > 0 && (
          <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-purple-50 border-t border-gray-200">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-700">
                  🚀 Importing {validAssetCount} assets...
                </span>
                <span className="text-blue-600 font-bold">{Math.round(importProgress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500 ease-out transform origin-left"
                  style={{ 
                    width: `${importProgress}%`,
                    transform: `scaleX(${importProgress / 100})`,
                    transformOrigin: 'left'
                  }}
                />
              </div>
              <div className="text-xs text-gray-500 text-center">
                {importProgress < 50 ? 'Validating data...' : 
                 importProgress < 90 ? 'Creating assets...' : 
                 'Almost done!'}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="p-6 bg-gray-50">
          <div className="flex justify-end gap-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-all duration-200 text-sm font-medium transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              disabled={importing}
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={!canImport || importing}
              className={`px-6 py-3 rounded-lg transition-all duration-300 text-sm font-medium flex items-center gap-2 transform ${
                !canImport || importing
                  ? 'bg-gray-400 text-gray-600 cursor-not-allowed scale-95'
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl scale-100 hover:scale-105 active:scale-95'
              }`}
            >
              {importing ? (
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    <div className="absolute inset-0 animate-ping rounded-full h-4 w-4 border border-white opacity-20" />
                  </div>
                  <span>Importing Magic...</span>
                  {importProgress > 0 && (
                    <span className="text-xs">({importProgress}%)</span>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  <span>Import {validAssetCount} Assets</span>
                  {validAssetCount > 0 && (
                    <span className="bg-white bg-opacity-20 px-2 py-0.5 rounded-full text-xs font-bold">
                      {validAssetCount}
                    </span>
                  )}
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Success Animation Overlay */}
        {showSuccessAnimation && (
          <div className="absolute inset-0 bg-white bg-opacity-95 flex items-center justify-center z-10 rounded-lg">
            {/* Confetti Animation */}
            <div className="absolute inset-0 overflow-hidden rounded-lg">
              {confettiElements.map(confetti => (
                <div
                  key={confetti.id}
                  className="absolute w-2 h-2 rounded-full animate-bounce"
                  style={{
                    left: `${confetti.left}%`,
                    top: '-10px',
                    backgroundColor: confetti.backgroundColor,
                    animationDelay: `${confetti.animationDelay}s`,
                    animationDuration: '3s'
                  }}
                />
              ))}
            </div>
            
            {/* Success Message */}
            <div className="text-center space-y-4 z-10">
              <div className="relative">
                <div className="mx-auto w-20 h-20 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center transform animate-bounce">
                  <Check className="w-10 h-10 text-white" />
                </div>
                <div className="absolute inset-0 w-20 h-20 bg-gradient-to-r from-green-400 to-blue-500 rounded-full mx-auto animate-ping opacity-30"></div>
                <div className="absolute inset-0 w-24 h-24 bg-gradient-to-r from-green-400 to-blue-500 rounded-full mx-auto animate-ping opacity-10" style={{ animationDelay: '0.5s' }}></div>
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-gray-800 animate-pulse">🎉 Import Complete!</h3>
                <p className="text-gray-600">Your assets have been successfully added to the system.</p>
                <div className="text-sm text-green-600 font-medium">Ready to create maintenance plans!</div>
              </div>
              <div className="flex justify-center">
                <div className="w-32 h-2 bg-gradient-to-r from-green-400 via-blue-500 to-purple-500 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>
        )}

        </div>
      </div>
    </>
  );
};

export default BulkImportModal;