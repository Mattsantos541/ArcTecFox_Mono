import { useState } from "react";
import { generatePMPlan, savePMPlanInput, savePMLead } from "../api";

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

// Contact Collection Modal
function ContactModal({ isOpen, onClose, onSubmit, email, setEmail, company, setCompany }) {
  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email.trim()) {
      alert("Please enter your email address");
      return;
    }
    if (!company.trim()) {
      alert("Please enter your company name");
      return;
    }
    onSubmit();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md mx-4 shadow-2xl">
        <div className="mb-6">
          <h3 className="text-2xl font-semibold text-gray-800 mb-2">Almost Ready!</h3>
          <p className="text-gray-600">
            Before we generate your custom PM plan, we need a couple of details to personalize your experience.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              placeholder="your.email@company.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Company Name *
            </label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              placeholder="Your Company Name"
              required
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Generate My Plan
            </button>
          </div>
        </form>
      </div>
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

export default function WelcomePage() {
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
  
  // Contact modal states
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactEmail, setContactEmail] = useState("");
  const [contactCompany, setContactCompany] = useState("");

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleGenerateClick = () => {
    // Validate required asset fields first
    if (!formData.name || !formData.category) {
      setMessage("Please fill in at least the Asset Name and Category");
      setMessageType("error");
      return;
    }

    // Clear any previous messages
    setMessage("");
    
    // Show contact collection modal
    setShowContactModal(true);
  };

  const handleContactSubmit = async () => {
    try {
      // Close contact modal and show loading
      setShowContactModal(false);
      setLoading(true);
      setGeneratedPlan(null);

      // Update form data with contact info
      const updatedFormData = {
        ...formData,
        email: contactEmail,
        company: contactCompany
      };

      console.log("🚀 Generating PM Plan with data:", updatedFormData);

      try {
        // Save lead data to PM_Leads table
        await savePMLead(contactEmail, contactCompany);
        console.log("✅ Lead data saved to PM_Leads table");
        
        // Save full plan input to pm_plans table
        await savePMPlanInput(updatedFormData);
        console.log("✅ Input data saved to pm_plans table");
      } catch (dbError) {
        console.warn("⚠️ Database save failed, but continuing with AI generation:", dbError);
      }

      const aiGeneratedPlan = await generatePMPlan(updatedFormData);
      
      setGeneratedPlan(aiGeneratedPlan);
      setMessage(`✅ PM Plan generated successfully! Found ${aiGeneratedPlan.length} maintenance tasks.`);
      setMessageType("success");
      
      // Update form data state to include contact info
      setFormData(updatedFormData);
      
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

  const handleContactCancel = () => {
    setShowContactModal(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Contact Collection Modal */}
      <ContactModal 
        isOpen={showContactModal}
        onClose={handleContactCancel}
        onSubmit={handleContactSubmit}
        email={contactEmail}
        setEmail={setContactEmail}
        company={contactCompany}
        setCompany={setContactCompany}
      />
      
      {/* Loading Modal */}
      <LoadingModal isOpen={loading} />
      
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <h1 className="text-4xl font-bold text-gray-900">ArcTecFox Welcome Page</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        
        {/* Welcome Content Section */}
        <div className="bg-white rounded-lg shadow-md p-8 space-y-6">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800">
              Welcome to our AI-Powered Maintenance Planning Platform
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Our advanced AI technology helps you create comprehensive preventive maintenance plans 
              tailored to your specific equipment and operating conditions. Simply enter your asset 
              information below and let our intelligent system generate detailed maintenance schedules, 
              safety procedures, and engineering recommendations.
            </p>
          </div>
          
          <div className="border-t pt-6">
            <p className="text-gray-600 text-center max-w-4xl mx-auto">
              Whether you're managing pumps, motors, valves, or other industrial equipment, our platform 
              provides customized maintenance strategies based on manufacturer specifications, industry 
              best practices, and your unique operational requirements. Get started by filling out the 
              form below to generate your first AI-powered preventive maintenance plan.
            </p>
          </div>
        </div>

        {/* PM Planner Section */}
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

          <div className="mt-8 text-center">
            <button
              onClick={handleGenerateClick}
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

        {/* Generated Plan Display */}
        <PMPlanDisplay plan={generatedPlan} />
      </main>
    </div>
  );
}