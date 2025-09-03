// utils/exportPlan.js
import * as XLSX from "xlsx";

export function exportPlanToExcel({ plan, tasks }) {
  if (!plan || !Array.isArray(tasks)) return;

  // Sheet 1: Plan overview
  const planSheetData = [
    ["Plan ID", plan.id],
    ["Asset Name", plan.asset_name || ""],
    ["Model", plan.asset_model || ""],
    ["Serial", plan.serial_no || ""],
    ["Category", plan.eq_category || ""],
    ["Plan Start Date", plan.plan_start_date || ""],
    ["Operating Hours", plan.op_hours || ""],
    ["Environment", plan.env_desc || ""],
    ["Additional Context", plan.additional_context || ""],
    ["Status", plan.status || ""],
  ];
  const planSheet = XLSX.utils.aoa_to_sheet(planSheetData);

  // Sheet 2: Tasks
  const taskRows = tasks.map(t => ({
    Task: t.task_name || "",
    Interval: t.maintenance_interval || "",
    Instructions: Array.isArray(t.instructions) ? t.instructions.join(" / ") : (t.instructions || ""),
    Reason: t.reason || "",
    "Engineering Rationale": t.engineering_rationale || "",
    "Safety Precautions": t.safety_precautions || "",
    "Common Failures Prevented": t.common_failures_prevented || "",
    "Usage Insights": t.usage_insights || "",
    "Scheduled Dates": Array.isArray(t.scheduled_dates) ? t.scheduled_dates.join(", ") : (t.scheduled_dates || "")
  }));
  const tasksSheet = XLSX.utils.json_to_sheet(taskRows);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, planSheet, "Plan Overview");
  XLSX.utils.book_append_sheet(wb, tasksSheet, "Tasks");
  const filename = `PM_Plan_${plan.asset_name || "Asset"}_${new Date().toISOString().slice(0,10)}.xlsx`;
  XLSX.writeFile(wb, filename);
}
