import * as XLSX from 'xlsx';

// Validation functions
const validateRequired = (value, fieldName) => {
  if (!value || value.toString().trim() === '') {
    return `${fieldName} is required`;
  }
  return null;
};

const validateDate = (value, fieldName) => {
  if (!value) return null; // Optional field
  
  const dateStr = value.toString().trim();
  if (dateStr === '') return null;
  
  // Try parsing as date
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return `${fieldName} must be a valid date (YYYY-MM-DD format)`;
  }
  
  return null;
};

const validateNumber = (value, fieldName) => {
  if (!value) return null; // Optional field
  
  const numStr = value.toString().trim();
  if (numStr === '') return null;
  
  const num = parseFloat(numStr);
  if (isNaN(num) || num < 0) {
    return `${fieldName} must be a valid positive number`;
  }
  
  return null;
};

const validateCategory = (value, categories, fieldName) => {
  if (!value) return null; // Optional field
  
  const categoryStr = value.toString().trim();
  if (categoryStr === '') return null;
  
  // Check if category exists in the predefined list
  const validCategories = categories.map(cat => cat.asset_name.toLowerCase());
  if (!validCategories.includes(categoryStr.toLowerCase())) {
    return `${fieldName} must be one of: ${categories.map(cat => cat.asset_name).join(', ')}`;
  }
  
  return null;
};

const validateMaxLength = (value, maxLength, fieldName) => {
  if (!value) return null;
  
  const str = value.toString().trim();
  if (str.length > maxLength) {
    return `${fieldName} must be less than ${maxLength} characters`;
  }
  
  return null;
};

// Main validation function for a single asset row
const validateAssetRow = (rowData, rowIndex, categories) => {
  const errors = [];
  const assetName = rowData.name ? rowData.name.toString().trim() : '';
  
  // Required field validation
  const nameError = validateRequired(rowData.name, 'Asset name');
  if (nameError) errors.push(nameError);
  
  // Optional field validations
  const maxLengthErrors = [
    validateMaxLength(rowData.name, 255, 'Asset name'),
    validateMaxLength(rowData.make, 100, 'Make'),
    validateMaxLength(rowData.model, 100, 'Model'),
    validateMaxLength(rowData.serial_number, 100, 'Serial number'),
    validateMaxLength(rowData.environment, 100, 'Environment')
  ].filter(Boolean);
  
  errors.push(...maxLengthErrors);
  
  // Date validations
  const dateErrors = [
    validateDate(rowData.purchase_date, 'Purchase date'),
    validateDate(rowData.install_date, 'Install date')
  ].filter(Boolean);
  
  errors.push(...dateErrors);
  
  // Number validation
  const numberError = validateNumber(rowData.cost_to_replace, 'Cost to replace');
  if (numberError) errors.push(numberError);
  
  // Category validation
  const categoryError = validateCategory(rowData.category, categories, 'Category');
  if (categoryError) errors.push(categoryError);
  
  // Notes field has a larger limit
  const notesError = validateMaxLength(rowData.notes, 1000, 'Notes');
  if (notesError) errors.push(notesError);
  
  // Determine status
  let status = 'valid';
  if (errors.length > 0) {
    status = errors.some(error => error.includes('required')) ? 'error' : 'warning';
  }
  
  return {
    rowNumber: rowIndex + 2, // +2 because Excel is 1-indexed and we skip header
    assetName: assetName || `Row ${rowIndex + 2}`,
    status,
    errors,
    assetData: {
      name: rowData.name ? rowData.name.toString().trim() : '',
      make: rowData.make ? rowData.make.toString().trim() : '',
      model: rowData.model ? rowData.model.toString().trim() : '',
      serial_number: rowData.serial_number ? rowData.serial_number.toString().trim() : '',
      category: rowData.category ? rowData.category.toString().trim() : '',
      purchase_date: rowData.purchase_date ? formatDate(rowData.purchase_date) : null,
      install_date: rowData.install_date ? formatDate(rowData.install_date) : null,
      notes: rowData.notes ? rowData.notes.toString().trim() : '',
      cost_to_replace: rowData.cost_to_replace ? parseFloat(rowData.cost_to_replace) : null,
      environment: rowData.environment ? rowData.environment.toString().trim() : ''
    }
  };
};

// Helper function to format date consistently
const formatDate = (dateValue) => {
  if (!dateValue) return null;
  
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return null;
    
    // Return in YYYY-MM-DD format
    return date.toISOString().split('T')[0];
  } catch (error) {
    return null;
  }
};

// Map Excel column names to our database field names
const COLUMN_MAPPING = {
  'name': 'name',
  'asset name': 'name',
  'asset_name': 'name',
  'make': 'make',
  'manufacturer': 'make',
  'model': 'model',
  'model number': 'model',
  'serial number': 'serial_number',
  'serial_number': 'serial_number',
  'serial': 'serial_number',
  'category': 'category',
  'asset category': 'category',
  'type': 'category',
  'purchase date': 'purchase_date',
  'purchase_date': 'purchase_date',
  'install date': 'install_date',
  'install_date': 'install_date',
  'installation date': 'install_date',
  'notes': 'notes',
  'description': 'notes',
  'comments': 'notes',
  'cost to replace': 'cost_to_replace',
  'cost_to_replace': 'cost_to_replace',
  'replacement cost': 'cost_to_replace',
  'environment': 'environment',
  'operating environment': 'environment'
};

// Normalize column headers
const normalizeHeaders = (headers) => {
  return headers.map(header => {
    if (!header) return '';
    
    const normalized = header.toString().toLowerCase().trim();
    return COLUMN_MAPPING[normalized] || normalized;
  });
};

// Main export function
export const parseExcelFile = async (file, assetCategories = []) => {
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target.result;
          let workbook;
          
          // Parse based on file type
          if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
            workbook = XLSX.read(data, { type: 'binary' });
          } else {
            workbook = XLSX.read(data, { type: 'array' });
          }
          
          // Get first worksheet
          const firstSheetName = workbook.SheetNames[0];
          if (!firstSheetName) {
            reject(new Error('No worksheets found in file'));
            return;
          }
          
          const worksheet = workbook.Sheets[firstSheetName];
          if (!worksheet) {
            reject(new Error('Unable to read worksheet data'));
            return;
          }
          
          // Convert to JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1, // Get raw array format first
            defval: '' // Default value for empty cells
          });
          
          if (jsonData.length < 2) {
            reject(new Error('File must contain at least a header row and one data row'));
            return;
          }
          
          // Get headers and normalize them
          const headers = jsonData[0];
          const normalizedHeaders = normalizeHeaders(headers);
          
          // Check if we have required headers
          if (!normalizedHeaders.includes('name')) {
            reject(new Error('File must contain a "name" or "asset name" column'));
            return;
          }
          
          // Convert data rows to objects
          const dataRows = jsonData.slice(1).filter(row => {
            // Skip empty rows (all cells empty or whitespace)
            return row.some(cell => cell && cell.toString().trim() !== '');
          });
          
          if (dataRows.length === 0) {
            reject(new Error('No data rows found in file'));
            return;
          }
          
          // Process each data row
          const results = dataRows.map((row, index) => {
            const rowObject = {};
            
            // Map row values to normalized headers
            normalizedHeaders.forEach((header, colIndex) => {
              if (header && row[colIndex] !== undefined) {
                rowObject[header] = row[colIndex];
              }
            });
            
            return validateAssetRow(rowObject, index, assetCategories);
          });
          
          resolve(results);
          
        } catch (error) {
          console.error('Error parsing Excel file:', error);
          reject(new Error(`Failed to parse file: ${error.message}`));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      // Read file based on type
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        reader.readAsBinaryString(file);
      } else {
        reader.readAsArrayBuffer(file);
      }
      
    } catch (error) {
      console.error('Error in parseExcelFile:', error);
      reject(new Error(`File processing failed: ${error.message}`));
    }
  });
};