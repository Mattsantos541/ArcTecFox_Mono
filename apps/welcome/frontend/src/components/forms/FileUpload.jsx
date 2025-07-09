import { useState, useRef } from 'react';
import { Upload, File, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export const FileUpload = ({ 
  label, 
  accept, 
  maxSize = 30 * 1024 * 1024, // 30MB default
  onFileSelect,
  error,
  required = false,
  disabled = false,
  className 
}) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = (file) => {
    // Validate file size
    if (file.size > maxSize) {
      onFileSelect(null, `File size must be less than ${Math.round(maxSize / (1024 * 1024))}MB`);
      return;
    }

    // Validate file type if accept is specified
    if (accept && !accept.split(',').some(type => 
      file.type.match(type.trim().replace('*', '.*')) || 
      file.name.toLowerCase().endsWith(type.trim().replace('*', ''))
    )) {
      onFileSelect(null, `Please select a valid file type: ${accept}`);
      return;
    }

    setSelectedFile(file);
    onFileSelect(file, null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (disabled) return;
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleInputChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    onFileSelect(null, null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={cn("flex flex-col space-y-2", className)}>
      {label && (
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
          isDragOver && !disabled ? "border-blue-400 bg-blue-50" : "border-gray-300",
          disabled ? "opacity-50 cursor-not-allowed bg-gray-50" : "hover:border-gray-400",
          error && "border-red-500",
          selectedFile && "border-green-500 bg-green-50"
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleInputChange}
          disabled={disabled}
          className="hidden"
        />
        
        {selectedFile ? (
          <div className="flex flex-col items-center space-y-2">
            <div className="flex items-center space-x-2">
              <File className="h-8 w-8 text-green-600" />
              <Check className="h-5 w-5 text-green-600" />
            </div>
            <div className="text-sm font-medium text-green-800">
              {selectedFile.name}
            </div>
            <div className="text-xs text-green-600">
              {formatFileSize(selectedFile.size)}
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveFile();
              }}
              className="mt-2 inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <X className="h-3 w-3 mr-1" />
              Remove
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-2">
            <Upload className={cn(
              "h-8 w-8",
              isDragOver && !disabled ? "text-blue-500" : "text-gray-400"
            )} />
            <div className="text-sm font-medium text-gray-700">
              {isDragOver && !disabled ? "Drop file here" : "Upload User Manual"}
            </div>
            <div className="text-xs text-gray-500">
              Drag and drop or click to select
            </div>
            {accept && (
              <div className="text-xs text-gray-400">
                Supported formats: {accept.replace(/\*/g, '')}
              </div>
            )}
            <div className="text-xs text-gray-400">
              Max size: {Math.round(maxSize / (1024 * 1024))}MB
            </div>
          </div>
        )}
      </div>
      
      {error && (
        <p className="text-sm text-red-500 flex items-center gap-1">
          <span className="text-red-500">⚠</span>
          {error}
        </p>
      )}
    </div>
  );
};

export default FileUpload;