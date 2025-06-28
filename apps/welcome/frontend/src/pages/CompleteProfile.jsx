import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth"; // Import the auth hook
import { completeUserProfile } from "../api";

function CompleteProfile() {
  const [formData, setFormData] = useState({
    full_name: "",
    role: "",
    company_name: "",
    industry: "",
    company_size: "",
  });

  const [error, setError] = useState(null);
  const navigate = useNavigate();
  
  // Use the auth hook instead of managing user state locally
  const { user, loading } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!user || !user.id) {
      setError("User session is missing. Please log in again.");
      return;
    }

    try {
      await completeUserProfile({ ...formData, id: user.id, email: user.email });
      alert("✅ Profile updated successfully!");
      navigate("/company-overview");
    } catch (err) {
      console.error("❌ Profile completion error:", err);
      setError(err.message || "Failed to complete profile. Please try again.");
    }
  };

  // Show loading state while auth is being checked
  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-6 bg-gray-100 min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect if no user is logged in
  if (!user) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-6 bg-gray-100 min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Authentication Required</h2>
          <p className="text-gray-600 mb-4">Please log in to complete your profile.</p>
          <button 
            onClick={() => navigate("/login")}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6 bg-gray-100 min-h-screen">
      <h2 className="text-3xl font-bold text-gray-900">Complete Your Profile</h2>
      {error && <p className="text-red-600">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-lg shadow-lg">
        <input type="text" name="full_name" placeholder="Full Name" value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} className="w-full border p-2 rounded" required />
        <input type="text" name="role" placeholder="Role" value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="w-full border p-2 rounded" required />
        <input type="text" name="company_name" placeholder="Company Name" value={formData.company_name} onChange={(e) => setFormData({ ...formData, company_name: e.target.value })} className="w-full border p-2 rounded" required />
        <input type="text" name="industry" placeholder="Industry" value={formData.industry} onChange={(e) => setFormData({ ...formData, industry: e.target.value })} className="w-full border p-2 rounded" required />
        <input type="text" name="company_size" placeholder="Company Size" value={formData.company_size} onChange={(e) => setFormData({ ...formData, company_size: e.target.value })} className="w-full border p-2 rounded" required />

        <button type="submit" className="w-full bg-blue-500 text-white p-3 rounded-lg shadow-md hover:bg-blue-600">
          Complete Profile
        </button>
      </form>
    </div>
  );
}

export default CompleteProfile;
