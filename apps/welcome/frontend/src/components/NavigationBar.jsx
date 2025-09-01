import React from "react";

export default function NavigationBar() {
  const scrollToPlanner = () => {
    const el = document.getElementById("pm-planner-section");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <header className="w-full bg-white border border-gray-200 shadow-sm rounded max-w-6xl mx-auto">
      <div className="px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <img src="/assets/ArcTecFox-logo.jpg" alt="ArcTecFox" className="h-6 w-6" />
          <span className="font-bold bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400 bg-clip-text text-transparent">
            ArcTecFox
          </span>
        </div>
        <nav className="flex items-center gap-5 text-sm text-gray-600">
          <a href="/terms-of-service" className="hover:text-gray-900">Terms</a>
          <a href="/privacy-policy" className="hover:text-gray-900">Privacy</a>
          <button
            onClick={scrollToPlanner}
            className="px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            Generate PM Plan
          </button>
        </nav>
      </div>
    </header>
  );
}
