import React from "react";
import axios from "axios";

function LogoutButton() {
  const handleLogout = async () => {
    try {
      // Call backend logout API
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/logout`); // Use 0.0.0.0

      // Clear local storage and session data
      localStorage.removeItem("token");
      window.location.href = "/login"; // Redirect to login
    } catch (err) {
      console.error("❌ Logout error:", err);
    }
  };

  return (
    <button 
      onClick={handleLogout} 
      className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
    >
      Logout
    </button>
  );
}

export default LogoutButton;