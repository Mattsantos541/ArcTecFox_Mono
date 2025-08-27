import React, { useState } from "react";

export default function LeadCaptureModal({ onClose, onLeadSubmit }) {
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!email || !company) {
      alert("Please enter both your email and company name.");
      return;
    }

    onLeadSubmit({ email, company });
    setEmail("");
    setCompany("");
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 text-xl"
        >
          &times;
        </button>
        <h2 className="text-2xl font-semibold text-blue-900 mb-4">
          Get Your Preventive Maintenance Plan
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Enter your email and company to download your plan.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Company Name</label>
            <input
              type="text"
              className="w-full mt-1 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-300"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g. Acme Corp"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Work Email</label>
            <input
              type="email"
              className="w-full mt-1 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-300"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white font-semibold py-2 px-4 rounded hover:bg-blue-700 transition"
          >
            Get My PM Plan
          </button>
        </form>
      </div>
    </div>
  );
}
