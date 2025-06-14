import { useState } from "react";
import axios from "axios";
import { saveAs } from "file-saver";

// UI Components
function Input({ label, name, value, onChange, placeholder, type = "text" }) {
  return (
    <div className="flex flex-col mb-3">
      {label && <label className="mb-1 font-medium">{label}</label>}
      <input
        className="border border-gray-300 rounded px-3 py-2"
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
    </div>
  );
}

function Button({ onClick, children, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function Card({ title, children }) {
  return (
    <div className="bg-white shadow rounded p-4 mb-4">
      {title && <h2 className="text-xl font-semibold mb-2">{title}</h2>}
      {children}
    </div>
  );
}

const API_BASE_URL = "/api";

export default function PMPlanner() {
  const [assetData, setAssetData] = useState({
    name: "",
    model: "",
    serial: "",
    category: "",
    hours: "",
    cycles: "",
    environment: "",
    date_of_plan_start: "",
  });

  const [pmPlan, setPmPlan] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setAssetData((prev) => ({ ...prev, [name]: value }));
  };

  const generatePMPlan = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post(
        `${API_BASE_URL}/generate_pm_plan`,
        assetData
      );
      const plan = res.data.pm_plan || res.data.data?.maintenance_plan || [];
      setPmPlan(Array.isArray(plan) ? plan : []);
      if (!Array.isArray(plan)) {
        throw new Error("AI returned invalid format");
      }
    } catch (err) {
      console.error("❌ API error:", err);
      setError("Something went wrong. Please check your inputs or try again.");
    } finally {
      setLoading(false);
    }
  };

  const downloadExcel = async () => {
    try {
      const res = await axios.post(
        `${API_BASE_URL}/generate_pm_plan?format=excel`,
        assetData,
        {
          responseType: "blob",
        }
      );
      const blob = new Blob([res.data], { type: res.headers["content-type"] });
      saveAs(blob, `PM_Plan_${assetData.name || "Asset"}.xlsx`);
    } catch (err) {
      console.error("❌ Excel download failed:", err);
      setError("Failed to export Excel. Please try again.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card title="Generate Preventive Maintenance Plan">
        <Input
          label="Asset Name"
          name="name"
          value={assetData.name}
          onChange={handleInputChange}
        />
        <Input
          label="Model"
          name="model"
          value={assetData.model}
          onChange={handleInputChange}
        />
        <Input
          label="Serial"
          name="serial"
          value={assetData.serial}
          onChange={handleInputChange}
        />
        <Input
          label="Category"
          name="category"
          value={assetData.category}
          onChange={handleInputChange}
        />
        <Input
          label="Operating Hours"
          name="hours"
          value={assetData.hours}
          onChange={handleInputChange}
          type="number"
        />
        <Input
          label="Usage Cycles"
          name="cycles"
          value={assetData.cycles}
          onChange={handleInputChange}
          type="number"
        />
        <Input
          label="Environment"
          name="environment"
          value={assetData.environment}
          onChange={handleInputChange}
        />
        <Input
          label="Date of Plan Start"
          name="date_of_plan_start"
          type="date"
          value={assetData.date_of_plan_start}
          onChange={handleInputChange}
        />

        <Button onClick={generatePMPlan} disabled={loading}>
          {loading ? "Generating..." : "Generate Plan"}
        </Button>

        {error && <p className="text-red-600 mt-3">{error}</p>}
      </Card>

      <Card title="Maintenance Plan Results">
        {pmPlan.length === 0 && (
          <p className="text-gray-500">No plan generated yet.</p>
        )}

        {pmPlan.map((task, idx) => (
          <div key={idx} className="mb-4 border-b pb-4">
            <h3 className="text-lg font-semibold mb-1">{task.task_name}</h3>
            <p>
              <strong>Interval:</strong> {task.maintenance_interval}
            </p>
            <p>
              <strong>Reason:</strong> {task.reason}
            </p>
            <p>
              <strong>Instructions:</strong>
            </p>
            <ul className="list-disc list-inside">
              {(Array.isArray(task.instructions)
                ? task.instructions
                : String(task.instructions).split("|")
              ).map((step, i) => (
                <li key={i}>{step.trim()}</li>
              ))}
            </ul>
            <p>
              <strong>Engineering Rationale:</strong>{" "}
              {task.engineering_rationale}
            </p>
            <p>
              <strong>Safety:</strong> {task.safety_precautions}
            </p>
            <p>
              <strong>Failures Prevented:</strong>{" "}
              {task.common_failures_prevented}
            </p>
            <p>
              <strong>Usage Insights:</strong> {task.usage_insights}
            </p>
            <p>
              <strong>Scheduled Dates:</strong>{" "}
              {task.scheduled_dates?.join(", ")}
            </p>
          </div>
        ))}

        <div className="mt-6 text-right">
          <Button onClick={downloadExcel} disabled={pmPlan.length === 0}>
            Export to Excel
          </Button>
        </div>
      </Card>
    </div>
  );
}
