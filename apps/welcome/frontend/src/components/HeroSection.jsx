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

      <h1 className="text-3xl font-semibold text-blue-900 mb-4">
        What is ArcTecFox?
      </h1>
      <p className="text-gray-700 max-w-2xl mx-auto mb-6">
        ArcTecFox is an AI-powered preventive maintenance planner that generates detailed PM schedules tailored to your specific equipment—pumps, motors, valves, and more. Get instant Excel or PDF output with no CMMS setup required.
      </p>

      <h2 className="text-xl font-medium text-gray-800 mb-2">
        Why Use ArcTecFox?
      </h2>
      <ul className="list-disc list-inside text-left text-gray-700 max-w-xl mx-auto mb-6">
        <li>✅ Auto-generates maintenance plans based on real-world standards</li>
        <li>✅ Supports pumps, motors, valves, compressors, and more</li>
        <li>✅ Uses manufacturer specs, AI logic, and industry best practices</li>
        <li>✅ Instantly downloadable as Excel or PDF</li>
      </ul>

      <button
        onClick={scrollToPlanner}
        className="mt-6 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg shadow"
      >
        Generate Your Free PM Plan
      </button>
    </section>
  );
}
