import React, { useEffect, useMemo, useState } from "react";

export default function PMPlannerOpen({ onGenerate, onChange }) {
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
  const [submitting, setSubmitting] = useState(false);

  // notify parent for progress bar
  useEffect(() => {
    onChange?.(formData);
  }, [formData, onChange]);

  const fieldKeys = useMemo(
    () => [
      "name",
      "model",
      "serial",
      "category",
      "hours",
      "additional_context",
      "environment",
      "date_of_plan_start",
    ],
    []
  );

  const filledCount = fieldKeys.filter(
    (k) => formData[k] && String(formData[k]).trim() !== ""
  ).length;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // here you would call your API or supabase function if desired
      onGenerate?.(formData);
    } catch (err) {
      console.error("Generate plan failed", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 bg-white p-6 rounded-lg shadow-md max-w-3xl mx-auto"
    >
      <h2 className="text-2xl font-bold text-gray-800 mb-1">
        Generate Your Free PM Plan
      </h2>
      <p className="text-sm text-gray-500 mb-4 transition-opacity duration-300">
        {filledCount >= 2
          ? "Nice! Keep going—you're close."
          : "Start by adding your asset name and category."}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input
          type="text"
          name="name"
          placeholder="Asset Name (e.g., Pump #2)"
          className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          value={formData.name}
          onChange={handleChange}
          required
        />

        <input
          type="text"
          name="model"
          placeholder="Model (e.g., ABC-123)"
          className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          value={formData.model}
          onChange={handleChange}
        />

        <input
          type="text"
          name="serial"
          placeholder="Serial Number"
          className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          value={formData.serial}
          onChange={handleChange}
        />

        <input
          type="text"
          name="category"
          placeholder="Category (e.g., Motor, Valve)"
          className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          value={formData.category}
          onChange={handleChange}
          required
        />

        <input
          type="number"
          name="hours"
          placeholder="Operating Hours"
          className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          value={formData.hours}
          onChange={handleChange}
        />

        <input
          type="date"
          name="date_of_plan_start"
          placeholder="Plan Start Date"
          className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          value={formData.date_of_plan_start}
          onChange={handleChange}
        />
      </div>

      <textarea
        name="additional_context"
        placeholder="Additional Context (e.g., critical system, vibration, etc.)"
        className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
        value={formData.additional_context}
        onChange={handleChange}
        rows={3}
      />

      <textarea
        name="environment"
        placeholder="Environment (e.g., outdoor high humidity, clean room, etc.)"
        className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
        value={formData.environment}
        onChange={handleChange}
        rows={3}
      />

      <div className="flex items-center justify-between">
        <div
          className={`text-sm ${
            filledCount >= 2 ? "text-blue-600" : "text-gray-500"
          } transition-colors`}
        >
          {filledCount} / {fieldKeys.length} fields completed
        </div>
        <button
          type="submit"
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          disabled={submitting}
        >
          {submitting ? "Generating..." : "Generate PM Plan"}
        </button>
      </div>
    </form>
  );
}
