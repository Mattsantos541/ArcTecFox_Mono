import { useState } from "react";
import { generatePMPlan, savePMPlanInput } from "../api";

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

function TextArea({ label, name, value, onChange, placeholder, rows = 3 }) {
  return (
    <div className="flex flex-col mb-3">
      {label && <label className="mb-1 font-medium">{label}</label>}
      <textarea
        className="border border-gray-300 rounded px-3 py-2"
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
      />
    </div>
  );
}

function Select({ label, name, value, onChange, options }) {
  return (
    <div className="flex flex-col mb-3">
      {label && <label className="mb-1 font-medium">{label}</label>}
      <select
        className="border border-gray-300 rounded px-3 py-2"
        name={name}
        value={value}
        onChange={onChange}
      >
        <option value="">Select {label}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

// Loading Modal Component
function LoadingModal({ isOpen }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md mx-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Generating Your PM Plan</h3>
          <p className="text-gray-600">
            It can take a bit to create the plan so sit tight while we work our magic! ⚡
          </p>
          <div className="mt-4 text-sm text-gray-500">
            Our AI is analyzing your asset and creating detailed maintenance tasks...
          </div>
        </div>
      </div>
    </div>
  );
}

function PMPlanDisplay({ plan }) {
  if (!plan || plan.length === 0) return null;

  return (
    <div className="mt-8 bg-gray-50 rounded-lg p-6">
      <h3 className="text-xl font-bold mb-6 text-gray-800">Generated PM Plan</h3>
      <div className="space-y-6">
        {plan.map((task, index) => (
          <div key={index} className="bg-white rounded-lg p-4 border border-gray-200">
            <h4 className="text-lg font-semibold text-blue-600 mb-2">
              {task.task_name}
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Interval:</p>
                <p className="text-sm">{task.maintenance_interval}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Reason:</p>
                <p className="text-sm">{task.reason}</p>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-sm font-medium text-gray-600 mb-1">Instructions:</p>
              <div className="text-sm whitespace-pre-line bg-gray-50 p-3 rounded">
                {task.instructions}
              </div>
            </div>

            <div className="mb-4">
              <p className="text-sm font-medium text-gray-600 mb-1">Safety Precautions:</p>
              <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{task.safety_precautions}</p>
            </div>

            <div className="mb-4">
              <p className="text-sm font-medium text-gray-600 mb-1">Engineering Rationale:</p>
              <p className="text-sm bg-blue-50 p-2 rounded">{task.engineering_rationale}</p>
            </div>

            <div className="mb-4">
              <p className="text-sm font-medium text-gray-600 mb-1">Common Failures Prevented:</p>
              <p className="text-sm bg-yellow-50 p-2 rounded">{task.common_failures_prevented}</p>
            </div>

            <div className="mb-4">
              <p className="text-sm font-medium text-gray-600 mb-1">Usage Insights:</p>
              <p className="text-sm bg-green-50 p-2 rounded">{task.usage_insights}</p>
            </div>

            {task.scheduled_dates && task.scheduled_dates.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">Scheduled Dates (Next 12 months):</p>
                <div className="flex flex-wrap gap-2">
                  {task.scheduled_dates.map((date, idx) => (
                    <span key={idx} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                      {date}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PMPlanner() {
  const [formData, setFormData] = useState({
    name: "",
    model: "",
    serial: "",
    category: "",
    hours: "",
    cycles: "",
    environment: "",
    date_of_plan_start: "",
    email: "",
    company: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [generatedPlan, setGeneratedPlan] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleGeneratePlan = async () => {
    try {
      setLoading(true);
      setMessage("");
      setGeneratedPlan(null);
      
      if (!formData.name || !formData.category) {
        setMessage("Please fill in at least the Asset Name and Category");
        setMessageType("error");
        return;
      }

      console.log("🚀 Generating PM Plan with data:", formData);

      try {
        await savePMPlanInput(formData);
        console.log("✅ Input data saved to database");
      } catch (dbError) {
        console.warn("⚠️ Database save failed, but continuing with AI generation:", dbError);
      }

      const aiGeneratedPlan = await generatePMPlan(formData);
      
      setGeneratedPlan(aiGeneratedPlan);
      setMessage(`✅ PM Plan generated successfully! Found ${aiGeneratedPlan.length} maintenance tasks.`);
      setMessageType("success");
      
    } catch (error) {
      console.error("❌ PM Plan generation error:", error);
      
      if (error.message.includes('Failed to fetch') || error.message.includes('API call failed')) {
        setMessage("❌ Error: Cannot connect to backend server. Make sure your FastAPI server is running on http://localhost:8000");
      } else {
        setMessage(`❌ Error: ${error.message}`);
      }
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Loading Modal */}
      <LoadingModal isOpen={loading} />
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">PM Planner</h2>
        
        {message && (
          <div className={`p-4 rounded-lg mb-6 ${
            messageType === "success" 
              ? "bg-green-100 text-green-800 border border-green-200" 
              : "bg-red-100 text-red-800 border border-red-200"
          }`}>
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-700">Asset Information</h3>
            
            <Input
              label="Asset Name *"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="e.g., Hydraulic Pump #1"
            />
            
            <Input
              label="Model"
              name="model"
              value={formData.model}
              onChange={handleInputChange}
              placeholder="e.g., HPX-500"
            />
            
            <Input
              label="Serial Number"
              name="serial"
              value={formData.serial}
              onChange={handleInputChange}
              placeholder="e.g., HPX500-00123"
            />
            
            <Select
              label="Category *"
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              options={["Pump", "Motor", "Valve", "Sensor", "Actuator", "Controller", "Other"]}
            />
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-700">Operating Conditions</h3>
            
            <Input
              label="Operating Hours"
              name="hours"
              type="number"
              value={formData.hours}
              onChange={handleInputChange}
              placeholder="e.g., 8760"
            />
            
            <Input
              label="Cycles"
              name="cycles"
              type="number"
              value={formData.cycles}
              onChange={handleInputChange}
              placeholder="e.g., 1000"
            />
            
            <TextArea
              label="Environment"
              name="environment"
              value={formData.environment}
              onChange={handleInputChange}
              placeholder="e.g., outdoor / high humidity, indoor clean room, etc."
              rows={3}
            />
            
            <Input
              label="Plan Start Date"
              name="date_of_plan_start"
              type="date"
              value={formData.date_of_plan_start}
              onChange={handleInputChange}
            />
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-700">Contact Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="your.email@company.com"
            />
            
            <Input
              label="Company"
              name="company"
              value={formData.company}
              onChange={handleInputChange}
              placeholder="Your Company Name"
            />
          </div>
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={handleGeneratePlan}
            disabled={loading}
            className={`px-8 py-3 rounded-lg font-semibold text-white ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 active:bg-blue-800"
            } transition-colors duration-200`} 
          >
            {loading ? "Generating PM Plan..." : "Generate Plan"}
          </button>
        </div>
      </div>

      <PMPlanDisplay plan={generatedPlan} />
    </div>
  );
}71