// frontend/src/pages/PMPlanner.jsx
import { useState } from "react";
import axios from "axios";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import MainLayout from "../layouts/MainLayout";

// ----- Reusable UI Components -----
function Input({
  label,
  name,
  value,
  onChange,
  placeholder,
  type = "text",
  className = "",
}) {
  return (
    <div className={`flex flex-col mb-4 ${className}`}>
      {label && <label className="block text-sm font-medium mb-1">{label}</label>}
      <input
        className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
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
      className="inline-flex items-center px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
    >
      {children}
    </button>
  );
}

function Card({ title, children, className = "" }) {
  return (
    <div className={`bg-white shadow-lg rounded-2xl p-6 mb-8 ${className}`}>
      {title && <h2 className="text-xl font-semibold mb-4">{title}</h2>}
      {children}
    </div>
  );
}
// -----------------------------------

// Production URL via Vercel env, fallback to Render URL
const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "https://arctecfox-lite-backend.onrender.com";

export default function PMPlanner() {
  const [userInfo, setUserInfo] = useState({ email: "", company: "" });
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
  const handleUserInfoChange = (e) => {
    const { name, value } = e.target;
    setUserInfo((prev) => ({ ...prev, [name]: value }));
  };

  const generatePMPlan = async () => {
    setLoading(true);
    setError(null);
    setPmPlan([]);

    try {
      const payload = {
        ...assetData,
        hours: parseInt(assetData.hours || 0, 10),
        cycles: parseInt(assetData.cycles || 0, 10),
        email: userInfo.email || null,
        company: userInfo.company || null,
      };

      const url = `${API_BASE_URL}/api/generate_pm_plan`;
      console.log("Posting to:", url, payload);

      const response = await axios.post(url, payload, {
        headers: { "Content-Type": "application/json" },
      });
      console.log("API response:", response.data);

      // extract the array whether it's nested or top-level
      const data = response.data;
      const plan =
        data.data?.maintenance_plan ||
        data.maintenance_plan ||
        data.plan ||
        [];

      if (!Array.isArray(plan)) {
        throw new Error("Invalid response format");
      }
      setPmPlan(plan);
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.message ||
          "Something went wrong while generating the PM plan."
      );
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const worksheet = XLSX.utils.json_to_sheet(pmPlan);
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    saveAs(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
      "PMPlan.csv"
    );
  };

  const exportToExcel = () => {
    const rows = [];
    pmPlan.forEach((t) => {
      (t.scheduled_dates || []).forEach((d) => {
        rows.push({
          "Scheduled Date": d,
          "Task Name": t.task_name,
          Interval: t.maintenance_interval,
          Instructions: Array.isArray(t.instructions)
            ? t.instructions.join(" | ")
            : t.instructions,
          Reason: t.reason,
          "Failures Prevented": t.common_failures_prevented,
          "Engineering Rationale": t.engineering_rationale,
          "Safety Precautions": t.safety_precautions,
        });
      });
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "PM Schedule");
    const buf = XLSX.write(wb, {
      bookType: "xlsx",
      type: "array",
    });
    saveAs(
      new Blob(
        [buf],
        { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }
      ),
      "Chronological_PM_Schedule.xlsx"
    );
  };

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Logo & Title */}
        <div className="flex items-center mb-8 space-x-4">
          <img src="/logo.png" alt="ArcTecFox" className="h-12 w-12" />
          <h1 className="text-2xl font-bold">
            ArcTecFox PM Planner (Lite)
          </h1>
        </div>

        {/* Contact Info */}
        <Card title="Optional Contact Info">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Email (optional)"
              name="email"
              value={userInfo.email}
              onChange={handleUserInfoChange}
              placeholder="e.g. jane@factory.com"
            />
            <Input
              label="Company (optional)"
              name="company"
              value={userInfo.company}
              onChange={handleUserInfoChange}
              placeholder="e.g. XYZ Manufacturing"
            />
          </div>
        </Card>

        {/* Asset Data Input */}
        <Card title="Asset Data Input">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Asset Name"
              name="name"
              value={assetData.name}
              onChange={handleInputChange}
              placeholder="e.g. Hydraulic Pump"
            />
            <Input
              label="Model"
              name="model"
              value={assetData.model}
              onChange={handleInputChange}
              placeholder="e.g. XJ-2000"
            />
            <Input
              label="Serial Number"
              name="serial"
              value={assetData.serial}
              onChange={handleInputChange}
              placeholder="e.g. SN12345"
            />
            <Input
              label="Asset Category"
              name="category"
              value={assetData.category}
              onChange={handleInputChange}
              placeholder="e.g. Pump"
            />
            <Input
              label="Usage Hours"
              name="hours"
              type="number"
              value={assetData.hours}
              onChange={handleInputChange}
              placeholder="e.g. 1200"
            />
            <Input
              label="Usage Cycles"
              name="cycles"
              type="number"
              value={assetData.cycles}
              onChange={handleInputChange}
              placeholder="e.g. 300"
            />
            <Input
              label="Environmental Condition"
              name="environment"
              value={assetData.environment}
              onChange={handleInputChange}
              placeholder="e.g. Outdoor, dusty"
              className="md:col-span-2"
            />
            <Input
              label="Plan Start Date"
              name="date_of_plan_start"
              type="date"
              value={assetData.date_of_plan_start}
              onChange={handleInputChange}
              className="md:col-span-2"
            />
          </div>
          <div className="mt-6">
            <Button onClick={generatePMPlan} disabled={loading}>
              {loading ? "Generating..." : "Generate AI-Powered PM Plan"}
            </Button>
          </div>
        </Card>

        {/* PM Plan Preview */}
        <Card title="AI-Powered PM Plan">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <svg
                className="animate-spin h-5 w-5 mr-3 text-blue-600"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              <span className="text-gray-700">Generating PM Plan…</span>
            </div>
          ) : pmPlan.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left border border-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 border-b">Task</th>
                    <th className="px-4 py-2 border-b">Interval</th>
                    <th className="px-4 py-2 border-b">Instructions</th>
                    <th className="px-4 py-2 border-b">Scheduled Dates</th>
                    <th className="px-4 py-2 border-b">Reason</th>
                    <th className="px-4 py-2 border-b">Failures Prevented</th>
                    <th className="px-4 py-2 border-b">Rationale</th>
                    <th className="px-4 py-2 border-b">Safety</th>
                  </tr>
                </thead>
                <tbody>
                  {pmPlan.map((t, i) => (
                    <tr key={i} className="border-b">
                      <td className="px-4 py-2">{t.task_name}</td>
                      <td className="px-4 py-2">{t.maintenance_interval}</td>
                      <td className="px-4 py-2">
                        {Array.isArray(t.instructions) ? (
                          <ul className="list-disc list-inside">
                            {t.instructions.map((ins, idx) => (
                              <li key={idx}>{ins}</li>
                            ))}
                          </ul>
                        ) : (
                          t.instructions
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {Array.isArray(t.scheduled_dates) ? (
                          <ul className="list-disc list-inside">
                            {t.scheduled_dates.map((d, idx) => (
                              <li key={idx}>{d}</li>
                            ))}
                          </ul>
                        ) : (
                          t.scheduled_dates
                        )}
                      </td>
                      <td className="px-4 py-2">{t.reason}</td>
                      <td className="px-4 py-2">{t.common_failures_prevented}</td>
                      <td className="px-4 py-2">{t.engineering_rationale}</td>
                      <td className="px-4 py-2">{t.safety_precautions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">No PM Plan generated yet.</p>
          )}
        </Card>

        {/* Export Options */}
        <Card title="Export & Integration">
          <div className="flex space-x-4">
            <Button onClick={exportToCSV} disabled={pmPlan.length === 0}>
              Download as CSV
            </Button>
            <Button onClick={exportToExcel} disabled={pmPlan.length === 0}>
              Download Excel (Chronological)
            </Button>
          </div>
        </Card>

        {error && (
          <div className="bg-red-100 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
