// src/components/HeroSection.jsx
import React from "react";
import logo from "/assets/ArcTecFox-logo.jpg";

export default function HeroSection({ onGenerateClick }) {
  const scrollToPlanner = () => {
    const section = document.getElementById("pm-planner-section");
    if (section) section.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="text-center py-20 relative bg-gradient-to-b from-blue-50 to-white">
      <img
        src={logo}
        alt="ArcTecFox Logo"
        className="mx-auto mb-6 w-16 h-16 rounded"
      />
      <h1 className="text-4xl font-bold text-blue-900 mb-4">
        Welcome to our AI-Powered Maintenance Planning Platform
      </h1>
      <p className="text-gray-700 max-w-xl mx-auto">
        Our AI helps you create detailed PM plans for your specific equipment. Enter your
        asset info and let the system generate schedules, safety procedures, and rationale —
        in seconds.
      </p>
      <p className="text-sm text-gray-500 mt-2">
        Manage pumps, motors, valves, and more using manufacturer specs, industry best practices, and your real-world operations.
      </p>
      <button
        onClick={scrollToPlanner}
        className="mt-6 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg shadow"
      >
        Generate Your Free PM Plan
      </button>
    </section>
  );
}
