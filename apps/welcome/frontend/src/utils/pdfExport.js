import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Generate PDF export for PM Plans data from PMPlanner
 * @param {Array} data - Array of PM plan data
 * @param {string} filename - Optional filename for the PDF
 * @returns {void}
 */
export const exportPMPlansDataToPDF = (data, filename = 'PM_Plans_Export.pdf') => {
  const doc = new jsPDF('landscape');
  
  // Add title
  doc.setFontSize(20);
  doc.text('PM Plans Export Report', 20, 20);
  
  // Add generation date
  doc.setFontSize(12);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 30);
  
  // Prepare table data
  const tableColumns = [
    'Asset Name',
    'Task Name', 
    'Maintenance Interval',
    'Time to Complete',
    'Tools Needed',
    'No. of Techs',
    'Reason',
    'Scheduled Dates'
  ];
  
  const tableRows = data.map(item => [
    item.asset_name || 'N/A',
    item.task_name || 'N/A',
    item.maintenance_interval || 'N/A',
    item.time_to_complete || 'N/A',
    item.tools_needed || 'N/A',
    item.no_techs_needed || 'N/A',
    item.reason || 'N/A',
    Array.isArray(item.scheduled_dates) ? item.scheduled_dates.join(', ') : (item.scheduled_dates || 'N/A')
  ]);
  
  // Generate table
  autoTable(doc, {
    head: [tableColumns],
    body: tableRows,
    startY: 40,
    styles: {
      fontSize: 10,
      cellPadding: 3,
      overflow: 'linebreak',
      cellWidth: 'wrap'
    },
    headStyles: {
      fillColor: [66, 139, 202],
      textColor: 255,
      fontStyle: 'bold'
    },
    alternateRowStyles: {
      fillColor: [240, 240, 240]
    },
    margin: { top: 40, left: 20, right: 20 },
    tableWidth: 'wrap'
  });
  
  // Add footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 40, doc.internal.pageSize.height - 10);
  }
  
  // Save the PDF
  doc.save(filename);
};

/**
 * Generate PDF export for single maintenance task
 * @param {Object} task - Task data object
 * @param {string} format - Export format identifier
 * @returns {void}
 */
export const exportMaintenanceTaskToPDF = (task, format = 'pdf') => {
  const doc = new jsPDF('landscape');
  
  // Add title
  doc.setFontSize(20);
  doc.text('Maintenance Task Report', 20, 20);
  
  // Add task title
  doc.setFontSize(16);
  doc.text(task.asset, 20, 35);
  
  // Add generation date
  doc.setFontSize(12);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 45);
  
  // Single table with all task information (optimized for landscape)
  const taskHeaders = [
    'Asset',
    'Task Description',
    'Date',
    'Technician',
    'Duration',
    'Time to Complete',
    'Tools Needed',
    'Status'
  ];
  
  const taskData = [
    task.asset,
    task.task,
    task.date,
    task.technician,
    task.duration,
    task.time_to_complete || 'N/A',
    task.tools_needed || 'N/A',
    task.status
  ];
  
  // Calculate available width for perfect margin alignment
  const pageWidth = doc.internal.pageSize.getWidth();
  const availableWidth = pageWidth - 40; // 20px margin on each side
  
  autoTable(doc, {
    head: [taskHeaders],
    body: [taskData],
    startY: 55,
    styles: {
      fontSize: 10,
      cellPadding: 3,
      overflow: 'linebreak',
      cellWidth: 'wrap'
    },
    headStyles: {
      fillColor: [66, 139, 202],
      textColor: 255,
      fontStyle: 'bold'
    },
    alternateRowStyles: {
      fillColor: [240, 240, 240]
    },
    margin: { top: 55, left: 20, right: 20 },
    tableWidth: availableWidth
  });
  
  // Add footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 40, doc.internal.pageSize.height - 10);
  }
  
  // Save the PDF
  const filename = `maintenance-task-${task.id}.pdf`;
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
  let yPosition = 20;
  
  // Add title
  doc.setFontSize(20);
  doc.text('Detailed PM Plans Report', 20, yPosition);
  yPosition += 15;
  
  // Add generation date
  doc.setFontSize(12);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, yPosition);
  yPosition += 20;
  
  plans.forEach((plan, planIndex) => {
    // Check if we need a new page
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }
    
    // Plan header
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text(`Asset: ${plan.asset_name || 'Unknown Asset'}`, 20, yPosition);
    yPosition += 10;
    
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    
    if (plan.tasks && plan.tasks.length > 0) {
      plan.tasks.forEach((task, taskIndex) => {
        // Check if we need a new page for task
        if (yPosition > 240) {
          doc.addPage();
          yPosition = 20;
        }
        
        // Task header
        doc.setFont(undefined, 'bold');
        doc.text(`Task ${taskIndex + 1}: ${task.task_name}`, 25, yPosition);
        yPosition += 8;
        
        doc.setFont(undefined, 'normal');
        
        // Task details
        const taskDetails = [
          `Interval: ${task.maintenance_interval || 'N/A'}`,
          `Time to Complete: ${task.time_to_complete || 'N/A'}`,
          `Tools Needed: ${task.tools_needed || 'N/A'}`,
          `Number of Technicians: ${task.no_techs_needed || 'N/A'}`,
          `Reason: ${task.reason || 'N/A'}`,
          `Instructions: ${task.instructions || 'N/A'}`,
          `Safety Precautions: ${task.safety_precautions || 'N/A'}`
        ];
        
        taskDetails.forEach(detail => {
          if (yPosition > 270) {
            doc.addPage();
            yPosition = 20;
          }
          
          // Wrap text if too long
          const splitText = doc.splitTextToSize(detail, 170);
          doc.text(splitText, 30, yPosition);
          yPosition += splitText.length * 5 + 3;
        });
        
        yPosition += 5; // Space between tasks
      });
    } else {
      doc.text('No tasks found for this asset.', 25, yPosition);
      yPosition += 10;
    }
    
    yPosition += 10; // Space between plans
  });
  
  // Add footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 40, doc.internal.pageSize.height - 10);
  }
  
  // Save the PDF
  doc.save(filename);
};