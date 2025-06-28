import { useState } from "react";
import { generatePMPlan, savePMPlanInput, savePMLead } from "../api";

// Reusable UI Components
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

function ContactModal({ isOpen, onClose, onSubmit, email, setEmail, company, setCompany }) {
  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email.trim()) return alert("Please enter your email address");
    if (!company.trim()) return alert("Please enter your company name");
    onSubmit();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md mx-4 shadow-2xl">
        <h3 className="text-2xl font-semibold text-gray-800 mb-2">Almost Ready!</h3>
        <p className="text-gray-600 mb-4">
          Before we generate your custom PM plan, we need a couple of details to personalize your experience.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
              placeholder="your.email@company.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
              placeholder="Your Company Name"
              required
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Generate My Plan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function LoadingModal({ isOpen }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md mx-4 text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-800 mb-2">Generating Your PM Plan</h3>
        <p className="text-gray-600">
          Sit tight while we work our magic! ⚡ Our AI is analyzing your asset...
        </p>
      </div>
    </div>
  );
}

function PMPlanDisplay({ plan }) {
  if (!plan?.length) return null;

  return (
    <div className="mt-8 bg-gray-50 rounded-lg p-6">
      <h3 className="text-xl font-bold mb-6 text-gray-800">Generated PM Plan</h3>
      <div className="space-y-6">
        {plan.map((task, index) => (
          <div key={index} className="bg-white rounded-lg p-4 border border-gray-200">
            <h4 className="text-lg font-semibold text-blue-600 mb-2">{task.task_name}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <Info label="Interval" value={task.maintenance_interval} />
              <Info label="Reason" value={task.reason} />
            </div>
            <InfoBlock label="Instructions" value={task.instructions} bg="bg-gray-50" />
            <InfoBlock label="Safety Precautions" value={task.safety_precautions} bg="bg-red-50 text-red-600" />
            <InfoBlock label="Engineering Rationale" value={task.engineering_rationale} bg="bg-blue-50" />
            <InfoBlock label="Common Failures Prevented" value={task.common_failures_prevented} bg="bg-yellow-50" />
            <InfoBlock label="Usage Insights" value={task.usage_insights} bg="bg-green-50" />
            {task.scheduled_dates?.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-600 mb-1">Scheduled Dates (Next 12 months):</p>
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

function Info({ label, value }) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-600">{label}:</p>
      <p className="text-sm">{value}</p>
    </div>
  );
}

function InfoBlock({ label, value, bg }) {
  return (
    <div className="mb-4">
      <p className="text-sm font-medium text-gray-600 mb-1">{label}:</p>
      <p className={`text-sm ${bg} p-2 rounded`}>{value}</p>
    </div>
  );
}

export default function WelcomePage() {
  const [formData, setFormData] = useState({
    name: "", model: "", serial: "", category: "", hours: "",
    cycles: "", environment: "", date_of_plan_start: "", email: "", company: ""
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactEmail, setContactEmail] = useState("");
  const [contactCompany, setContactCompany] = useState("");

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleGenerateClick = () => {
    if (!formData.name || !formData.category) {
      setMessage("Please fill in at least the Asset Name and Category");
      setMessageType("error");
      return;
    }
    setMessage("");
    setShowContactModal(true);
  };

  const handleContactSubmit = async () => {
    try {
      setShowContactModal(false);
      setLoading(true);
      setGeneratedPlan(null);
      const updatedFormData = { ...formData, email: contactEmail, company: contactCompany };
      await savePMLead(contactEmail, contactCompany);
      await savePMPlanInput(updatedFormData);
      const aiGeneratedPlan = await generatePMPlan(updatedFormData);
      setGeneratedPlan(aiGeneratedPlan);
      setMessage(`✅ PM Plan generated successfully! Found ${aiGeneratedPlan.length} maintenance tasks.`);
      setMessageType("success");
      setFormData(updatedFormData);
    } catch (error) {
      console.error("❌ PM Plan generation error:", error);
      setMessage(
        error.message.includes("Failed to fetch")
          ? "❌ Error: Cannot connect to backend server. Is FastAPI running?"
          : `❌ Error: ${error.message}`
      );
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <ContactModal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
        onSubmit={handleContactSubmit}
        email={contactEmail}
        setEmail={setContactEmail}
        company={contactCompany}
        setCompany={setContactCompany}
      />
      <LoadingModal isOpen={loading} />
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <h1 className="text-4xl font-bold text-gray-900">ArcTecFox Welcome Page</h1>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <section className="bg-white rounded-lg shadow-md p-8 space-y-6 text-center">
          <h2 className="text-2xl font-semibold text-gray-800">
            Welcome to our AI-Powered Maintenance Planning Platform
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Our AI helps you create detailed PM plans for your specific equipment. Enter your asset
            info below and let the system generate schedules, safety procedures, and rationale.
          </p>
          <p className="text-gray-600 max-w-4xl mx-auto border-t pt-6">
            Manage pumps, motors, valves, and more with maintenance strategies from manufacturer specs,
            industry best practices, and your real-world ops. Fill the form below to get started.
          </p>
        </section>
        <section className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold mb-6 text-gray-800">PM Planner</h2>
          {message && (
            <div className={`p-4 rounded-lg mb-6 ${messageType === "success" ? "bg-green-100 text-green-800 border border-green-200" : "bg-red-100 text-red-800 border border-red-200"}`}>
              {message}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-700">Asset Information</h3>
              <Input label="Asset Name *" name="name" value={formData.name} onChange={handleInputChange} placeholder="e.g., Hydraulic Pump #1" />
              <Input label="Model" name="model" value={formData.model} onChange={handleInputChange} placeholder="e.g., HPX-500" />
              <Input label="Serial Number" name="serial" value={formData.serial} onChange={handleInputChange} placeholder="e.g., HPX500-00123" />
              <Select label="Category *" name="category" value={formData.category} onChange={handleInputChange}
                options={["Pump", "Motor", "Valve", "Sensor", "Actuator", "Controller", "Other"]} />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-700">Operating Conditions</h3>
              <Input label="Operating Hours" name="hours" type="number" value={formData.hours} onChange={handleInputChange} placeholder="e.g., 8760" />
              <Input label="Cycles" name="cycles" type="number" value={formData.cycles} onChange={handleInputChange} placeholder="e.g., 1000" />
              <TextArea label="Environment" name="environment" value={formData.environment} onChange={handleInputChange}
                placeholder="e.g., outdoor / high humidity, indoor clean room, etc." rows={3} />
              <Input label="Plan Start Date" name="date_of_plan_start" type="date" value={formData.date_of_plan_start} onChange={handleInputChange} />
            </div>
          </div>
          <div className="mt-8 text-center">
            <button
              onClick={handleGenerateClick}
              disabled={loading}
              className={`px-8 py-3 rounded-lg font-semibold text-white ${loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}
            >
              {loading ? "Generating PM Plan..." : "Generate Plan"}
            </button>
          </div>
        </section>
        <PMPlanDisplay plan={generatedPlan} />
      </main>
    </div>
  );
}
