import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Download } from "lucide-react";
// Using ReportLab Python backend for PDF generation

interface PDFExportButtonProps {
  data: any[];
  filename?: string;
  buttonText?: string;
  variant?: "default" | "outline" | "secondary" | "destructive" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  disabled?: boolean;
  exportType?: "pmPlans" | "maintenanceTask" | "assets" | "custom";
  onExportStart?: () => void;
  onExportComplete?: () => void;
  onExportError?: (error: Error) => void;
}

export default function PDFExportButton({
  data,
  filename,
  buttonText = "Export to PDF",
  variant = "default",
  size = "default",
  className = "",
  disabled = false,
  exportType = "pmPlans",
  onExportStart,
  onExportComplete,
  onExportError,
}: PDFExportButtonProps) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!data || data.length === 0) {
      onExportError?.(new Error("No data available to export"));
      return;
    }

    try {
      setExporting(true);
      onExportStart?.();

      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
      const defaultFilename = `${exportType}_Export_${timestamp}.pdf`;
      const finalFilename = filename || defaultFilename;

      // Map frontend export types to backend types
      let backendExportType: string;
      switch (exportType) {
        case "pmPlans":
          backendExportType = "pm_plans";
          break;
        case "maintenanceTask":
          backendExportType = "maintenance_task";
          if (data.length !== 1) {
            throw new Error("Maintenance task export requires exactly one task");
          }
          break;
        case "assets":
          backendExportType = "assets";
          break;
        case "custom":
          backendExportType = "pm_plans"; // Default to PM plans format
          break;
        default:
          throw new Error(`Unsupported export type: ${exportType}`);
      }

      // Call the Python backend API
      const response = await fetch('https://arctecfox-mono.onrender.com/api/export-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: data,
          filename: finalFilename,
          export_type: backendExportType
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      // Download the PDF file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = finalFilename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      onExportComplete?.();
    } catch (error) {
      console.error("PDF export error:", error);
      onExportError?.(error as Error);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={disabled || exporting || !data || data.length === 0}
      variant={variant}
      size={size}
      className={`flex items-center gap-2 ${className}`}
    >
      {exporting ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
          <span>Exporting...</span>
        </>
      ) : (
        <>
          <FileText className="h-4 w-4" />
          <span>{buttonText}</span>
        </>
      )}
    </Button>
  );
}

// Additional export utilities for specific use cases
export const AssetPDFExportButton = ({ assets, ...props }: Omit<PDFExportButtonProps, "data" | "exportType">) => (
  <PDFExportButton
    data={assets}
    exportType="assets"
    buttonText="Export Assets to PDF"
    filename={`Assets_Export_${new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')}.pdf`}
    {...props}
  />
);

export const PMPlansPDFExportButton = ({ plans, ...props }: Omit<PDFExportButtonProps, "data" | "exportType">) => (
  <PDFExportButton
    data={plans}
    exportType="pmPlans"
    buttonText="Export to PDF"
    {...props}
  />
);

export const MaintenanceTaskPDFExportButton = ({ task, ...props }: Omit<PDFExportButtonProps, "data" | "exportType">) => (
  <PDFExportButton
    data={[task]}
    exportType="maintenanceTask"
    buttonText="Export Task to PDF"
    {...props}
  />
);