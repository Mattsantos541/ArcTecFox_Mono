import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Professional color scheme for reports
const COLORS = {
  primary: [41, 128, 185],      // Professional blue
  secondary: [52, 73, 94],      // Dark gray-blue
  accent: [231, 76, 60],        // Red for warnings/critical
  success: [39, 174, 96],       // Green for success
  background: [236, 240, 241],  // Light gray background
  border: [149, 165, 166],      // Border gray
  text: [44, 62, 80],           // Dark text
  lightBackground: [248, 249, 250] // Very light background
};

// Shared PDF formatting configuration
const PDF_CONFIG = {
  styles: {
    fontSize: 10,
    cellPadding: 3,
    overflow: 'linebreak',
    cellWidth: 'wrap'
  },
  headStyles: {
    fillColor: COLORS.primary,
    textColor: 255,
    fontStyle: 'bold'
  },
  alternateRowStyles: {
    fillColor: COLORS.lightBackground
  },
  margin: { top: 40, left: 20, right: 20 },
  tableWidth: 'wrap',
  startY: 40
};

// Shared header formatting with professional styling
const addPDFHeader = (doc, title) => {
  // Header background
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, doc.internal.pageSize.width, 35, 'F');
  
  // Main title
  doc.setTextColor(255, 255, 255); // White text
  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.text(title, 20, 22);
  
  // Generation date
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, doc.internal.pageSize.width - 80, 22);
  
  // Reset text color for body content
  doc.setTextColor(...COLORS.text);
};

// Shared footer formatting with professional styling
const addPDFFooter = (doc) => {
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    // Footer line
    const footerY = doc.internal.pageSize.height - 20;
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.5);
    doc.line(20, footerY, doc.internal.pageSize.width - 20, footerY);
    
    // Page number
    doc.setTextColor(...COLORS.secondary);
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 40, doc.internal.pageSize.height - 10);
  }
};

/**
 * Helper function to process instructions and remove double numbering
 */
const processInstructions = (instructions) => {
  if (!instructions) return [];
  
  try {
    let instructionArray;
    if (typeof instructions === 'string') {
      // Handle both JSON string and regular string with newlines
      if (instructions.trim().startsWith('[') || instructions.trim().startsWith('{')) {
        instructionArray = JSON.parse(instructions);
      } else {
        // Check if it's already formatted with numbers like "1. text\n2. text"
        if (instructions.includes('\n') && /^\d+\.\s/.test(instructions.trim())) {
          // Split by lines and clean each line
          instructionArray = instructions.split('\n').filter(line => line.trim());
        } else {
          // Split by newlines for regular string
          instructionArray = instructions.split('\n').filter(line => line.trim());
        }
      }
    } else if (Array.isArray(instructions)) {
      instructionArray = instructions;
    } else {
      instructionArray = [instructions?.toString() || 'No instructions provided'];
    }
    
    // Clean up each instruction - remove ALL existing numbering patterns
    return instructionArray.map(instruction => {
      if (typeof instruction !== 'string') {
        instruction = instruction.toString();
      }
      
      return instruction
        .replace(/^"?(\d+\.\s*)+/, '')   // Remove multiple numbers like "1. 1. " or "1. " 
        .replace(/^\d+\.\s*/, '')       // Remove any remaining numbering like "1. "
        .replace(/^"/, '')              // Remove leading quotes
        .replace(/"$/, '')              // Remove trailing quotes
        .trim();                        // Remove extra whitespace
    });
  } catch (error) {
    console.error('Error processing instructions:', error);
    return [instructions?.toString() || 'No instructions provided'];
  }
};

/**
 * Generate PDF export for PM Plans data from PMPlanner
 * @param {Array} data - Array of PM plan data
 * @param {string} filename - Optional filename for the PDF
 * @returns {void}
 */
export const exportPMPlansDataToPDF = (data, filename = 'PM_Plans_Export.pdf') => {
  const doc = new jsPDF('portrait');
  
  addPDFHeader(doc, 'Preventive Maintenance Report');
  
  let yPosition = 50;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 20;
  const lineHeight = 6;
  
  // Group data by asset
  const assetGroups = data.reduce((acc, task) => {
    const assetKey = task.asset_name || 'Unknown Asset';
    if (!acc[assetKey]) {
      acc[assetKey] = {
        asset_name: task.asset_name || 'Unknown Asset',
        asset_model: task.asset_model || 'N/A',
        serial_number: task.serial_number || 'N/A',
        tasks: []
      };
    }
    acc[assetKey].tasks.push(task);
    return acc;
  }, {});
  
  Object.values(assetGroups).forEach((assetGroup, assetIndex) => {
    // Check if we need a new page for the asset header
    if (yPosition > pageHeight - 100) {
      doc.addPage();
      yPosition = 50; // Start below header
    }
    
    // Asset Header Section
    doc.setTextColor(...COLORS.primary);
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('ASSET INFORMATION', margin, yPosition);
    yPosition += 15;
    
    // Asset details box with colored background
    doc.setFillColor(...COLORS.lightBackground);
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.5);
    doc.rect(margin, yPosition, doc.internal.pageSize.width - 2 * margin, 30, 'FD');
    yPosition += 8;
    
    // Asset details in a cleaner format
    const assetDetails = [
      `Asset Name: ${assetGroup.asset_name}`,
      `Model: ${assetGroup.asset_model}`,
      `Serial Number: ${assetGroup.serial_number}`
    ];
    
    doc.setTextColor(...COLORS.text);
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    
    assetDetails.forEach(detail => {
      doc.text(detail, margin + 5, yPosition);
      yPosition += 7;
    });
    
    yPosition += 15;
    
    // Tasks Section
    doc.setTextColor(...COLORS.primary);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('MAINTENANCE TASKS', margin, yPosition);
    yPosition += 15;
    
    assetGroup.tasks.forEach((task, taskIndex) => {
      // Check if we need a new page for this task (need more space for task content)
      if (yPosition > pageHeight - 120) {
        doc.addPage();
        yPosition = 50;
      }
      
      // Reduced space before task header
      yPosition += 5; // Much smaller gap
      
      // Task Header with background
      doc.setFillColor(...COLORS.background);
      doc.setDrawColor(...COLORS.border);
      doc.rect(margin, yPosition, doc.internal.pageSize.width - 2 * margin, 12, 'FD');
      
      doc.setTextColor(...COLORS.secondary);
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text(`Task ${taskIndex + 1}: ${task.task_name || 'Unnamed Task'}`, margin + 5, yPosition + 8);
      yPosition += 18; // Smaller gap after header
      
      // Task Details in a more compact format
      doc.setTextColor(...COLORS.text);
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      
      const taskDetails = [
        `Maintenance Interval: ${task.maintenance_interval || 'N/A'}`,
        `Number of Technicians: ${task.no_techs_needed || 'N/A'}`,
        `Estimated Time: ${task.time_to_complete || (task.est_minutes ? `${task.est_minutes} minutes` : 'N/A')}`,
        `Tools Required: ${task.tools_needed || 'N/A'}`
      ];
      
      taskDetails.forEach(detail => {
        if (yPosition > pageHeight - 25) {
          doc.addPage();
          yPosition = 50;
        }
        doc.text(detail, margin + 5, yPosition);
        yPosition += lineHeight + 1;
      });
      
      yPosition += 6; // Smaller gap before instructions
      
      // Instructions Section - FIXED to remove double numbering
      if (task.instructions) {
        if (yPosition > pageHeight - 40) { // More space needed for instructions
          doc.addPage();
          yPosition = 50;
        }
        
        doc.setTextColor(...COLORS.secondary);
        doc.setFont(undefined, 'bold');
        doc.text('Instructions:', margin + 5, yPosition);
        yPosition += 8;
        
        doc.setTextColor(...COLORS.text);
        doc.setFont(undefined, 'normal');
        
        // Process instructions to remove double numbering
        const cleanInstructions = processInstructions(task.instructions);
        
        cleanInstructions.forEach((instruction, index) => {
          // Check if we need a new page with more buffer space
          if (yPosition > pageHeight - 30) {
            doc.addPage();
            yPosition = 50;
          }
          
          // Render with proper numbering (no double numbers)
          doc.setTextColor(...COLORS.primary);
          doc.setFont(undefined, 'bold');
          doc.text(`${index + 1}.`, margin + 10, yPosition);
          
          doc.setTextColor(...COLORS.text);
          doc.setFont(undefined, 'normal');
          
          // Split the instruction text for proper wrapping
          const maxWidth = doc.internal.pageSize.width - margin * 2 - 25;
          const splitText = doc.splitTextToSize(instruction, maxWidth);
          
          splitText.forEach((line, lineIndex) => {
            if (yPosition > pageHeight - 15) { // Better page break detection
              doc.addPage();
              yPosition = 50;
            }
            
            // All lines start at the same indent (after the number)
            doc.text(line, margin + 20, yPosition);
            yPosition += lineHeight;
          });
          yPosition += 2; // Small gap between instructions
        });
      }
      
      yPosition += 10; // Smaller space between tasks
    });
    
    // Space between assets (if not last asset)
    if (assetIndex < Object.values(assetGroups).length - 1) {
      yPosition += 20;
    }
  });
  
  addPDFFooter(doc);
  
  // Save the PDF
  doc.save(filename);
};

/**
 * Generate PDF export for Assets data from Asset Management
 * @param {Array} data - Array of asset data
 * @param {string} filename - Optional filename for the PDF
 * @returns {void}
 */
export const exportAssetsDataToPDF = (data, filename = 'Assets_Export.pdf') => {
  const doc = new jsPDF('portrait');
  
  addPDFHeader(doc, 'Asset Inventory Report');
  
  let yPosition = 50;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 20;
  
  data.forEach((asset, index) => {
    // Check if we need a new page
    if (yPosition > pageHeight - 120) {
      doc.addPage();
      yPosition = 50;
    }
    
    // Asset Header
    doc.setTextColor(...COLORS.primary);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text(`ASSET ${index + 1}: ${asset.name || 'Unnamed Asset'}`, margin, yPosition);
    yPosition += 15;
    
    // Asset details in a structured format
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    
    const assetDetails = [
      { label: 'Asset ID:', value: asset.id || 'N/A' },
      { label: 'Type:', value: asset.type || 'N/A' },
      { label: 'Location:', value: asset.location || 'N/A' },
      { label: 'Manufacturer:', value: asset.manufacturer || 'N/A' },
      { label: 'Model:', value: asset.model || 'N/A' },
      { label: 'Serial Number:', value: asset.serialNumber || 'N/A' },
      { label: 'Status:', value: asset.status || 'N/A' },
      { label: 'Criticality:', value: asset.criticality || 'N/A' },
      { label: 'Install Date:', value: asset.installDate || 'N/A' },
      { label: 'Next Maintenance:', value: asset.nextMaintenance || 'N/A' }
    ];
    
    // Create a bordered box for asset details
    const boxHeight = assetDetails.length * 8 + 10;
    doc.setFillColor(...COLORS.lightBackground);
    doc.setDrawColor(...COLORS.border);
    doc.rect(margin, yPosition, doc.internal.pageSize.width - 2 * margin, boxHeight, 'FD');
    yPosition += 8;
    
    assetDetails.forEach(detail => {
      if (yPosition > pageHeight - 20) {
        doc.addPage();
        yPosition = 50;
      }
      
      doc.setTextColor(...COLORS.secondary);
      doc.setFont(undefined, 'bold');
      doc.text(detail.label, margin + 5, yPosition);
      doc.setTextColor(...COLORS.text);
      doc.setFont(undefined, 'normal');
      doc.text(detail.value, margin + 50, yPosition);
      yPosition += 8;
    });
    
    yPosition += 15; // Space between assets
  });
  
  addPDFFooter(doc);
  
  // Save the PDF
  doc.save(filename);
};

/**
 * Generate PDF export for single maintenance task
 * @param {Object} task - Task data object
 * @returns {void}
 */
export const exportMaintenanceTaskToPDF = (task) => {
  const doc = new jsPDF('portrait');
  
  addPDFHeader(doc, 'Maintenance Task Report');
  
  let yPosition = 50;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 20;
  const lineHeight = 6;
  
  // Asset Information Section
  doc.setTextColor(...COLORS.primary);
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.text('ASSET INFORMATION', margin, yPosition);
  yPosition += 12;
  
  doc.setFillColor(...COLORS.lightBackground);
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.5);
  doc.rect(margin, yPosition, doc.internal.pageSize.width - 2 * margin, 35, 'FD');
  yPosition += 10;
  
  const assetInfo = [
    `Asset: ${task.asset || 'N/A'}`,
    `Date: ${task.date || 'N/A'}`,
    `Technician: ${task.technician || 'N/A'}`
  ];
  
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  
  assetInfo.forEach(info => {
    doc.text(info, margin + 5, yPosition);
    yPosition += 8;
  });
  
  yPosition += 20;
  
  // Task Details Section
  doc.setTextColor(...COLORS.primary);
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.text('TASK DETAILS', margin, yPosition);
  yPosition += 15;
  
  doc.setTextColor(...COLORS.secondary);
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text(`Task: ${task.task || 'Unnamed Task'}`, margin, yPosition);
  yPosition += 15;
  
  // Task specifications
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  
  const taskDetails = [
    `Duration: ${task.duration || 'N/A'}`,
    `Estimated Time: ${task.time_to_complete || (task.est_minutes ? `${task.est_minutes} minutes` : 'N/A')}`,
    `Tools Required: ${task.tools_needed || 'N/A'}`,
    `Number of Technicians: ${task.no_techs_needed || 'N/A'}`,
    `Status: ${task.status || 'N/A'}`
  ];
  
  taskDetails.forEach(detail => {
    if (yPosition > pageHeight - 20) {
      doc.addPage();
      yPosition = 50;
    }
    doc.text(detail, margin + 5, yPosition);
    yPosition += lineHeight + 3;
  });
  
  yPosition += 15;
  
  // Instructions Section (if available) - FIXED
  if (task.instructions) {
    if (yPosition > pageHeight - 30) {
      doc.addPage();
      yPosition = 50;
    }
    
    doc.setTextColor(...COLORS.primary);
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('INSTRUCTIONS', margin, yPosition);
    yPosition += 15;
    
    doc.setTextColor(...COLORS.text);
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    
    // Process instructions to remove double numbering
    const cleanInstructions = processInstructions(task.instructions);
    
    cleanInstructions.forEach((instruction, index) => {
      if (yPosition > pageHeight - 15) {
        doc.addPage();
        yPosition = 50;
      }
      
      // Render with proper numbering
      doc.setTextColor(...COLORS.primary);
      doc.setFont(undefined, 'bold');
      doc.text(`${index + 1}.`, margin + 5, yPosition);
      
      doc.setTextColor(...COLORS.text);
      doc.setFont(undefined, 'normal');
      
      const maxWidth = doc.internal.pageSize.width - margin * 2 - 20;
      const splitText = doc.splitTextToSize(instruction, maxWidth);
      
      splitText.forEach((line, lineIndex) => {
        if (yPosition > pageHeight - 10) {
          doc.addPage();
          yPosition = 50;
        }
        
        doc.text(line, margin + 20, yPosition);
        yPosition += lineHeight;
      });
      yPosition += 2; // Small gap between instructions
    });
  }
  
  addPDFFooter(doc);
  
  // Save the PDF
  const filename = `maintenance-task-${task.id || 'task'}.pdf`;
  doc.save(filename);
};

/**
 * Generate PDF export for PM Plans detailed report with task breakdown
 * @param {Array} plans - Array of PM plan data with tasks
 * @param {string} filename - Optional filename for the PDF
 * @returns {void}
 */
export const exportDetailedPMPlansToPDF = (plans, filename = 'Detailed_PM_Plans_Report.pdf') => {
  const doc = new jsPDF('landscape');
  
  addPDFHeader(doc, 'Detailed PM Plans Report');
  
  let yPosition = 50;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 20;
  
  plans.forEach((plan) => {
    // Check if we need a new page
    if (yPosition > pageHeight - 100) {
      doc.addPage();
      yPosition = 50;
    }
    
    // Plan header
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text(`Asset: ${plan.asset_name || 'Unknown Asset'}`, margin, yPosition);
    yPosition += 15;
    
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    
    if (plan.tasks && plan.tasks.length > 0) {
      plan.tasks.forEach((task, taskIndex) => {
        // Check if we need a new page for task
        if (yPosition > pageHeight - 60) {
          doc.addPage();
          yPosition = 50;
        }
        
        // Task header
        doc.setFont(undefined, 'bold');
        doc.text(`Task ${taskIndex + 1}: ${task.task_name}`, margin + 5, yPosition);
        yPosition += 10;
        
        doc.setFont(undefined, 'normal');
        
        // Task details
        const taskDetails = [
          `Interval: ${task.maintenance_interval || 'N/A'}`,
          `Time to Complete: ${task.time_to_complete || 'N/A'}`,
          `Tools Needed: ${task.tools_needed || 'N/A'}`,
          `Number of Technicians: ${task.no_techs_needed || 'N/A'}`,
          `Reason: ${task.reason || 'N/A'}`,
          `Safety Precautions: ${task.safety_precautions || 'N/A'}`
        ];
        
        taskDetails.forEach(detail => {
          if (yPosition > pageHeight - 20) {
            doc.addPage();
            yPosition = 50;
          }
          
          // Wrap text if too long
          const splitText = doc.splitTextToSize(detail, 170);
          doc.text(splitText, margin + 10, yPosition);
          yPosition += splitText.length * 5 + 3;
        });
        
        // Instructions - FIXED
        if (task.instructions) {
          doc.setFont(undefined, 'bold');
          doc.text('Instructions:', margin + 10, yPosition);
          yPosition += 5;
          doc.setFont(undefined, 'normal');
          
          const cleanInstructions = processInstructions(task.instructions);
          cleanInstructions.forEach((instruction, index) => {
            if (yPosition > pageHeight - 15) {
              doc.addPage();
              yPosition = 50;
            }
            
            const splitText = doc.splitTextToSize(`${index + 1}. ${instruction}`, 160);
            doc.text(splitText, margin + 15, yPosition);
            yPosition += splitText.length * 5 + 2;
          });
        }
        
        yPosition += 10; // Space between tasks
      });
    } else {
      doc.text('No tasks found for this asset.', margin + 5, yPosition);
      yPosition += 15;
    }
    
    yPosition += 15; // Space between plans
  });
  
  addPDFFooter(doc);
  
  // Save the PDF
  doc.save(filename);
};