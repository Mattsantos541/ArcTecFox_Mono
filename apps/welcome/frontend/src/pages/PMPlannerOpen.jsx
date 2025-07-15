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
    // ❌ Removed: email, company (they go in the modal)
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
      console.log("📨 Submitting PM Planner (pre-lead capture):", formData);
      if (onGenerate) onGenerate(formData); // triggers LeadCaptureModal
    } catch (err) {
      console.error("❌ Failed to generate plan", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 bg-white p-6 rounded-lg shadow-md max-w-3xl mx-auto"
    >
      <h2 className="text-2xl font-bold text-gray-800 mb-4">
        Generate Your Free PM Plan
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input
          type="text"
          name="name"
          placeholder="Asset Name (e.g., Pump #2)"
          className="w-full px-4 py-2 border rounded"
          value={formData.name}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="model"
          placeholder="Model (e.g., ABC-123)"
          className="w-full px-4 py-2 border rounded"
          value={formData.model}
          onChange={handleChange}
        />
        <input
          type="text"
          name="serial"
          placeholder="Serial Number"
          className="w-full px-4 py-2 border rounded"
          value={formData.serial}
          onChange={handleChange}
        />
        <input
          type="text"
          name="category"
          placeholder="Category (e.g., Motor, Valve)"
          className="w-full px-4 py-2 border rounded"
          value={formData.category}
          onChange={handleChange}
          required
        />
        <input
          type="number"
          name="hours"
          placeholder="Operating Hours"
          className="w-full px-4 py-2 border rounded"
          value={formData.hours}
          onChange={handleChange}
        />
        <input
          type="date"
          name="date_of_plan_start"
          placeholder="Plan Start Date"
          className="w-full px-4 py-2 border rounded"
          value={formData.date_of_plan_start}
          onChange={handleChange}
        />
      </div>

      <textarea
        name="additional_context"
        placeholder="Additional Context (e.g., critical system, vibration, etc.)"
        className="w-full px-4 py-2 border rounded"
        value={formData.additional_context}
        onChange={handleChange}
        rows={3}
      />

      <textarea
        name="environment"
        placeholder="Environment (e.g., outdoor high humidity, clean room, etc.)"
        className="w-full px-4 py-2 border rounded"
        value={formData.environment}
        onChange={handleChange}
        rows={3}
      />

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
