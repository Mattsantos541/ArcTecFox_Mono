import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Download } from "lucide-react";
import { exportPMPlansDataToPDF, exportMaintenanceTaskToPDF, exportAssetsDataToPDF } from "../../utils/pdfExport";

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

      switch (exportType) {
        case "pmPlans":
          exportPMPlansDataToPDF(data, finalFilename);
          break;
        case "maintenanceTask":
          if (data.length === 1) {
            exportMaintenanceTaskToPDF(data[0], "pdf");
          } else {
            throw new Error("Maintenance task export requires exactly one task");
          }
          break;
        case "assets":
          exportAssetsDataToPDF(data, finalFilename);
          break;
        case "custom":
          // For custom exports, we'll use the PM Plans format as default
          exportPMPlansDataToPDF(data, finalFilename);
          break;
        default:
          throw new Error(`Unsupported export type: ${exportType}`);
      }

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