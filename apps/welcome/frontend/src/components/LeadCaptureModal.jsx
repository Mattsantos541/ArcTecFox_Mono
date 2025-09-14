import React, { useState } from "react";

export default function LeadCaptureModal({ onClose, onLeadSubmit }) {
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [fullName, setFullName] = useState("");
  const [requestAccess, setRequestAccess] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!email || !company) {
      alert("Please enter both your email and company name.");
      return;
    }

    if (requestAccess && !fullName) {
      alert("Please enter your full name to request access.");
      return;
    }

    onLeadSubmit({ 
      email, 
      company, 
      fullName: requestAccess ? fullName : null,
      requestAccess 
    });
    setEmail("");
    setCompany("");
    setFullName("");
    setRequestAccess(false);
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
          {requestAccess 
            ? "Request access to create and manage PM plans in your account."
            : "Enter your email and company to download your plan."
          }
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="border-b pb-4">
            <label className="flex items-start space-x-3">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                checked={requestAccess}
                onChange={(e) => setRequestAccess(e.target.checked)}
              />
              <div className="text-sm">
                <span className="font-medium text-gray-700">Request Account Access</span>
                <p className="text-gray-500 mt-1">
                  Create an account to save plans, manage assets, and collaborate with your team.
                  {requestAccess && <span className="text-blue-600 font-medium"> You'll receive setup instructions via email once approved.</span>}
                </p>
              </div>
            </label>
          </div>

          {requestAccess && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Full Name</label>
              <input
                type="text"
                className="w-full mt-1 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-300"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
              />
            </div>
          )}

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
            {requestAccess ? "Request Access & Get Plan" : "Get My PM Plan"}
          </button>
        </form>
      </div>
    </div>
  );
}
