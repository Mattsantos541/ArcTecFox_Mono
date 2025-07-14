// src/components/ScrollToPlannerButton.jsx
import React from "react";

export default function ScrollToPlannerButton() {
  const scrollToPlanner = () => {
    const plannerSection = document.getElementById("pm-planner-section");
    if (plannerSection) {
      plannerSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="text-center py-6 bg-gray-50">
      <button
        onClick={scrollToPlanner}
        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md"
      >
        Generate Plan
      </button>
    </div>
  );
}
