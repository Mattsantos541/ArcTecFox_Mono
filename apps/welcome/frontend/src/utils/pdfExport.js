import jsPDF from 'jspdf';

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
 * Generate PDF export for single maintenance task in the specified format
 * @param {Object} task - Task data object
 * @returns {void}
 */
export const exportMaintenanceTaskToPDF = (task) => {
  const doc = new jsPDF('portrait');
  
  let yPosition = 30;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 20;
  const pageWidth = doc.internal.pageSize.width;
  const contentWidth = pageWidth - 2 * margin;
  
  // Task Name Header - Bold Dark Blue with minimal sizing
  const headerFontSize = 12; // Smaller font size
  const headerPadding = 4; // Minimal padding
  const headerHeight = headerFontSize + (headerPadding * 2);
  const headerSpacing = headerHeight + 2; // Minimal spacing after header
  
  doc.setFillColor(25, 55, 109); // Dark blue background
  doc.rect(margin, yPosition, contentWidth, headerHeight, 'F');
  doc.setTextColor(255, 255, 255); // White text
  doc.setFontSize(headerFontSize);
  doc.setFont(undefined, 'bold');
  // Calculate perfect vertical center - position baseline so visual center of text is centered
  const textY = yPosition + (headerHeight / 2) - (headerFontSize * 0.2);
  doc.text(task.task || 'Maintenance Task', margin + headerPadding, textY);
   
  yPosition += headerSpacing;
  
  // Dynamic 2x3 table layout with white background
  const cellWidth = contentWidth / 3;
  const cellPadding = 3; // Reduced padding
  const titleSpacing = 4; // Reduced title spacing
  const lineHeight = 4; // Reduced line height
  
  // Prepare all cell content and calculate heights
  const cellData = [
    // Row 1
    [
      { title: 'Interval:', content: String(task.duration || task.maintenance_interval || 'Monthly') },
      { title: 'Technicians Required:', content: String(task.no_techs_needed || '1') },
      { title: 'Estimated Time to Complete:', content: String(task.time_to_complete || (task.est_minutes ? `${task.est_minutes} minutes` : 'Not specified')) }
    ],
    // Row 2
    [
      { title: 'Tools Needed:', content: String(task.tools_needed || 'Standard maintenance tools') },
      { title: 'Reason:', content: String(task.reason || 'Preventive maintenance to ensure optimal performance') }
      // Removed empty cell to prevent extra height
    ]
  ];
  
  // Calculate dynamic heights for each row
  const rowHeights = cellData.map(row => {
    let maxHeight = 0;
    row.forEach(cell => {
      if (cell.title && cell.content) {
        const splitContent = doc.splitTextToSize(cell.content, cellWidth - cellPadding * 2);
        const cellHeight = titleSpacing + (splitContent.length * lineHeight);
        maxHeight = Math.max(maxHeight, cellHeight);
      }
    });
    return Math.max(maxHeight, 12); // Much smaller minimum height
  });
  
  const totalTableHeight = rowHeights.reduce((sum, height) => sum + height, 0);
  
  // White background section for top info
  doc.setFillColor(255, 255, 255); // White background
  doc.rect(margin, yPosition, contentWidth, totalTableHeight, 'F');
  
  // Reset text color for content
  doc.setTextColor(0, 0, 0); // Black text
  doc.setFontSize(8); // Smaller font to match sections
  doc.setFont(undefined, 'normal');
  
  let currentRowY = yPosition;
  
  // Render each row
  cellData.forEach((row, rowIndex) => {
    const rowHeight = rowHeights[rowIndex];
    
    row.forEach((cell, colIndex) => {
      if (cell.title && cell.content) {
        const cellX = margin + (colIndex * cellWidth);
        const cellY = currentRowY + cellPadding;
        
        // Title
        doc.setFont(undefined, 'bold');
        doc.text(cell.title, cellX + cellPadding, cellY);
        
        // Content
        doc.setFont(undefined, 'normal');
        const splitContent = doc.splitTextToSize(cell.content, cellWidth - cellPadding * 2);
        splitContent.forEach((line, lineIndex) => {
          doc.text(line, cellX + cellPadding, cellY + titleSpacing + (lineIndex * lineHeight));
        });
      }
    });
    
    currentRowY += rowHeight;
  });
  
  // Update yPosition after dynamic table
  yPosition += totalTableHeight + 1; // Very minimal spacing to Instructions header
  
  // Helper function to add colored section with minimal spacing
  const addColoredSection = (title, content, bgColor, textColor = [0, 0, 0]) => {
    const headerFontSize = 12;
    const contentFontSize = 8; // Smaller font for better space usage
    const lineHeight = 5; // Adjusted for smaller font
    const headerSpacing = 4; // Very minimal header spacing
    const sectionPadding = 4; // Reduced padding
    const minSectionHeight = 16; // Smaller minimum height
    const textIndent = 6; // Smaller text indent
    
    if (content) {
      // Pre-process content to calculate accurate height first
      let processedContent = [];
      
      if (title === 'Instructions') {
        const cleanInstructions = processInstructions(content);
        cleanInstructions.forEach((instruction, index) => {
          const maxWidth = contentWidth - 20; // Much wider text area
          const splitText = doc.splitTextToSize(`${index + 1}. ${instruction}`, maxWidth);
          processedContent.push(...splitText);
        });
      } else {
        const maxWidth = contentWidth - 16; // Much wider text area
        processedContent = doc.splitTextToSize(String(content), maxWidth);
      }
      
      // Calculate exact content height to match text
      const contentHeight = Math.max(
        minSectionHeight, 
        processedContent.length * lineHeight + sectionPadding // Only top padding, no bottom padding
      );
      
      // Check if we need a new page for the entire section (header + content)
      if (yPosition + headerSpacing + contentHeight > pageHeight - 20) {
        doc.addPage();
        yPosition = 30;
      }
      
      // Section header
      doc.setTextColor(0, 0, 0); // Black text for headers
      doc.setFontSize(headerFontSize);
      doc.setFont(undefined, 'bold');
      doc.text(title, margin, yPosition);
      yPosition += headerSpacing;
      
      // Background rectangle without border
      doc.setFillColor(...bgColor);
      doc.rect(margin, yPosition, contentWidth, contentHeight, 'F');
      
      // Content text
      doc.setTextColor(...textColor);
      doc.setFontSize(contentFontSize);
      doc.setFont(undefined, 'normal');
      
      let textY = yPosition + sectionPadding;
      processedContent.forEach(line => {
        // Boundary check to prevent overflow
        if (textY > yPosition + contentHeight) return;
        doc.text(String(line), margin + textIndent, textY);
        textY += lineHeight;
      });
      
      yPosition += contentHeight + 8; // More spacing after section before next header
    } else {
      // Empty section with minimal height
      const emptyHeight = minSectionHeight;
      
      // Check if empty section will fit
      if (yPosition + headerSpacing + emptyHeight > pageHeight - 20) {
        doc.addPage();
        yPosition = 30;
      }
      
      // Section header
      doc.setTextColor(0, 0, 0); // Black text for headers
      doc.setFontSize(headerFontSize);
      doc.setFont(undefined, 'bold');
      doc.text(title, margin, yPosition);
      yPosition += headerSpacing;
      
      doc.setFillColor(...bgColor);
      doc.rect(margin, yPosition, contentWidth, emptyHeight, 'F');
      
      doc.setTextColor(...textColor);
      doc.setFontSize(contentFontSize);
      doc.setFont(undefined, 'normal');
      doc.text('No content provided', margin + textIndent, yPosition + (emptyHeight / 2));
      
      yPosition += emptyHeight + 8; // More spacing after empty section before next header
    }
  };
  
  // Instructions Section - Light Grey Background
  addColoredSection(
    'Instructions',
    task.instructions,
    [240, 240, 240], // Light grey
    [0, 0, 0] // Black text
  );
  
  // Safety Precautions Section - Light Red Background
  addColoredSection(
    'Safety Precautions',
    task.safety_precautions,
    [255, 235, 235], // Light red
    [200, 0, 0] // Red text
  );
  
  // Engineering Rationale Section - Light Blue Background
  addColoredSection(
    'Engineering Rationale',
    task.engineering_rationale,
    [235, 245, 255], // Light blue
    [0, 0, 0] // Black text
  );
  
  // Common Failures Prevented Section - Light Yellow Background
  addColoredSection(
    'Common Failures Prevented',
    task.common_failures_prevented,
    [255, 255, 235], // Light yellow
    [0, 0, 0] // Black text
  );
  
  // Usage Insights Section - Light Green Background
  addColoredSection(
    'Usage Insights',
    task.usage_insights,
    [235, 255, 235], // Light green
    [0, 0, 0] // Black text
  );
  
  // Scheduled Dates Section - Simple string format
  if (task.scheduled_dates && task.scheduled_dates.length > 0) {
    // Format dates as comma-separated string
    const datesToShow = task.scheduled_dates.slice(0, 12);
    const datesString = datesToShow.join(', ');
    
    // Use the same colored section format as other sections
    addColoredSection(
      'Scheduled Dates (Next 12 months)',
      datesString,
      [245, 245, 245], // Light grey background
      [0, 0, 0] // Black text
    );
  } else {
    // Use the same colored section format for empty dates
    addColoredSection(
      'Scheduled Dates (Next 12 months)',
      'No scheduled dates available',
      [245, 245, 245], // Light grey background
      [120, 120, 120] // Grey text
    );
  }
  
  // Add page footer with generation info - dynamic sizing
  const footerFontSize = 8;
  const footerMargin = footerFontSize * 2;
  const footerY = pageHeight - footerMargin;
  
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(footerFontSize);
  doc.setFont(undefined, 'normal');
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, margin, footerY);
  
  // Calculate dynamic position for right-aligned text
  const taskIdText = `Task ID: ${task.id || 'N/A'}`;
  const taskIdWidth = doc.getTextWidth(taskIdText);
  doc.text(taskIdText, pageWidth - margin - taskIdWidth, footerY);
  
  // Save the PDF
  const filename = `maintenance-task-${task.task ? task.task.replace(/[^a-zA-Z0-9]/g, '_') : 'task'}.pdf`;
  doc.save(filename);
};

// Export all other existing functions unchanged
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
        `Number of Technicians: ${String(task.no_techs_needed || 'N/A')}`,
        `Estimated Time: ${String(task.time_to_complete || (task.est_minutes ? `${task.est_minutes} minutes` : 'N/A'))}`,
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
          
          splitText.forEach((line) => {
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
      doc.text(String(detail.value), margin + 50, yPosition);
      yPosition += 8;
    });
    
    yPosition += 15; // Space between assets
  });
  
  addPDFFooter(doc);
  
  // Save the PDF
  doc.save(filename);
};

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
          `Time to Complete: ${String(task.time_to_complete || 'N/A')}`,
          `Tools Needed: ${String(task.tools_needed || 'N/A')}`,
          `Number of Technicians: ${String(task.no_techs_needed || 'N/A')}`,
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