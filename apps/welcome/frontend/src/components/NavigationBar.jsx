import React from "react";

export default function NavigationBar() {
  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <header className="w-full bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
        {/* Left spacer so your top-left brand area (in Home) isn't duplicated */}
        <div className="h-8" />

        <nav className="flex items-center gap-6 text-sm text-gray-700">
          <button
            className="hover:text-gray-900"
            onClick={() => scrollTo("features")}
            aria-label="Features"
          >
            Features
          </button>
          <button
            className="hover:text-gray-900"
            onClick={() => scrollTo("pm-planner-section")}
            aria-label="How It Works"
          >
            How It Works
          </button>
          <button
            className="hover:text-gray-900"
            onClick={() => scrollTo("about")}
            aria-label="About"
          >
            About
          </button>
          <button
            className="hover:text-gray-900"
            onClick={() => scrollTo("contact")}
            aria-label="Contact"
          >
            Contact
          </button>
        </nav>
      </div>
    </header>
  );
}

