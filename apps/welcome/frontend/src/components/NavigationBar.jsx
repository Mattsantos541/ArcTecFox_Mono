import React from "react";
import { Link } from "react-scroll";

export default function NavigationBar() {
  return (
    <header className="w-full bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
        {/* Left side: Branding */}
        <div className="text-xl font-semibold text-blue-800">ArcTecFox</div>

        {/* Right side: Nav links */}
        <nav className="space-x-6 hidden md:flex">
          <Link
            to="features"
            smooth={true}
            duration={500}
            className="cursor-pointer text-gray-700 hover:text-blue-600 transition"
          >
            Features
          </Link>
          <Link
            to="how-it-works"
            smooth={true}
            duration={500}
            className="cursor-pointer text-gray-700 hover:text-blue-600 transition"
          >
            How It Works
          </Link>
          <Link
            to="about"
            smooth={true}
            duration={500}
            className="cursor-pointer text-gray-700 hover:text-blue-600 transition"
          >
            About
          </Link>
          <Link
            to="contact"
            smooth={true}
            duration={500}
            className="cursor-pointer text-gray-700 hover:text-blue-600 transition"
          >
            Contact
          </Link>
        </nav>
      </div>
    </header>
  );
}