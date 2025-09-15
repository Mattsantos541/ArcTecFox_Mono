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
    Task: t["Task name"] || t.task_name || "",
    Interval: t["Maintenance interval"] || t.maintenance_interval || "",
    Instructions: t["Step-by-step instructions"] || (Array.isArray(t.instructions) ? t.instructions.join(" / ") : (t.instructions || "")),
    Reason: t["Reason for the task"] || t.reason || "",
    "Engineering Rationale": t["Engineering rationale"] || t.engineering_rationale || "",
    "Safety Precautions": t["Safety precautions"] || t.safety_precautions || "",
    "Common Failures Prevented": t["Common failures prevented"] || t.common_failures_prevented || "",
    "Usage Insights": t["Usage insights"] || t.usage_insights || "",
    "Est. Time (min)": t["Estimated time in minutes"] || t.est_minutes || "",
    "Tools Needed": t["Tools needed"] || t.tools_needed || "",
    "Technicians": t["Number of technicians needed"] || t.no_techs_needed || "",
    "Consumables": t["Consumables required"] || t.consumables || "",
    "Criticality": t["Criticality"] || t.criticality || ""
  }));
  const tasksSheet = XLSX.utils.json_to_sheet(taskRows);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, planSheet, "Plan Overview");
  XLSX.utils.book_append_sheet(wb, tasksSheet, "Tasks");
  const filename = `PM_Plan_${plan.asset_name || "Asset"}_${new Date().toISOString().slice(0,10)}.xlsx`;
  XLSX.writeFile(wb, filename);
}
