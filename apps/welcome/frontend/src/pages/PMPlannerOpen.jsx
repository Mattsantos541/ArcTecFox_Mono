import React, { useState } from "react";

export default function PMPlannerOpen({ onGenerate }) {
  const [formData, setFormData] = useState({
    name: "",
    model: "",
    serial: "",
    category: "",
    hours: "",
    additional_context: "",
    environment: "",
    date_of_plan_start: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      console.log("📨 Submitting PM Planner:", formData);
      if (onGenerate) onGenerate(formData);
    } catch (err) {
      console.error("❌ Failed to generate plan", err);
    } finally {
      setLoading(false);
    }
  };

  const fieldKeys = [
    "name",
    "model",
    "serial",
    "category",
    "hours",
    "additional_context",
    "environment",
    "date_of_plan_start",
  ];
  const filledFields = fieldKeys.filter(
    (key) => formData[key] && formData[key].trim() !== ""
  );
  const progress = Math.round((filledFields.length / fieldKeys.length) * 100);

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 bg-white p-6 rounded-lg shadow-md max-w-3xl mx-auto"
    >
      <h2 className="text-2xl font-bold text-gray-800 mb-2">
        How do I generate a preventive maintenance plan?
      </h2>
      <p className="text-gray-700 mb-4">
        Fill out the form below with your asset’s details. ArcTecFox will instantly generate a preventive maintenance plan tailored to your equipment and conditions—ready for download as Excel or PDF.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Asset Name</label>
          <input
            type="text"
            name="name"
            placeholder="e.g., Pump #2"
            className="w-full px-4 py-2 border rounded"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Model</label>
          <input
            type="text"
            name="model"
            placeholder="e.g., ABC-123"
            className="w-full px-4 py-2 border rounded"
            value={formData.model}
            onChange={handleChange}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Serial Number</label>
          <input
            type="text"
            name="serial"
            placeholder="e.g., 9283746"
            className="w-full px-4 py-2 border rounded"
            value={formData.serial}
            onChange={handleChange}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Asset Category</label>
          <input
            type="text"
            name="category"
            placeholder="e.g., Motor, Valve"
            className="w-full px-4 py-2 border rounded"
            value={formData.category}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Operating Hours</label>
          <input
            type="number"
            name="hours"
            placeholder="e.g., 3400"
            className="w-full px-4 py-2 border rounded"
            value={formData.hours}
            onChange={handleChange}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Plan Start Date</label>
          <input
            type="date"
            name="date_of_plan_start"
            className="w-full px-4 py-2 border rounded"
            value={formData.date_of_plan_start}
            onChange={handleChange}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Additional Context</label>
        <textarea
          name="additional_context"
          placeholder="e.g., vibration, critical asset, frequent repairs"
          className="w-full px-4 py-2 border rounded"
          value={formData.additional_context}
          onChange={handleChange}
          rows={3}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Operating Environment</label>
        <textarea
          name="environment"
          placeholder="e.g., outdoor, dusty, clean room, humidity, vibration"
          className="w-full px-4 py-2 border rounded"
          value={formData.environment}
          onChange={handleChange}
          rows={3}
        />
      </div>

      {/* Progress Bar */}
      {filledFields.length >= 2 && (
        <div className="w-full mb-4">
          <p className="text-sm text-gray-700 mb-1">
            You almost have your preventive maintenance plan
            {formData.name ? ` for "${formData.name}"` : ""}.
          </p>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-2 bg-blue-600 rounded-full transition-all duration-500 ease-in-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}

      <button
        type="submit"
        className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        disabled={loading}
      >
        {loading ? "Generating..." : "Generate PM Plan"}
      </button>
    </form>
  );
}
