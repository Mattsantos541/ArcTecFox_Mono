import React from "react";
import logo from "/assets/ArcTecFox-logo.jpg";

export default function HeroSection({ onGenerateClick }) {
  const scrollToPlanner = () => {
    const plannerSection = document.getElementById("pm-planner-section");
    if (plannerSection) {
      plannerSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="relative bg-gradient-to-b from-blue-50 via-white to-white py-20 px-4 text-center overflow-hidden">
      {/* Background graphic: subtle radial */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-100/30 to-white opacity-60 -z-10" />

      <img
        src={logo}
        alt="ArcTecFox Logo"
        className="mx-auto h-14 mb-6 rounded-lg shadow-md"
      />

      <h1 className="text-4xl md:text-5xl font-bold text-blue-900">
        Welcome to our AI-Powered Maintenance Planning Platform
      </h1>
      <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
        Our AI helps you create detailed PM plans for your specific equipment.
        Enter your asset info and let the system generate schedules,
        safety procedures, and rationale — in seconds.
      </p>
      <p className="mt-4 text-md text-gray-500 max-w-xl mx-auto">
        Manage pumps, motors, valves, and more using manufacturer specs,
        industry best practices, and your real-world operations.
      </p>

      <div className="mt-8">
        <button
          onClick={scrollToPlanner}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition"
        >
          Generate Your Free PM Plan
        </button>
      </div>

      {/* Decorative Wave Divider */}
      <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none z-0">
        <svg
          viewBox="0 0 1200 100"
          preserveAspectRatio="none"
          className="w-full h-20"
        >
          <path
            d="M0,0 C300,100 900,0 1200,100 L1200,100 L0,100 Z"
            fill="#f9fafb"
          ></path>
        </svg>
      </div>
    </div>
  );
}
