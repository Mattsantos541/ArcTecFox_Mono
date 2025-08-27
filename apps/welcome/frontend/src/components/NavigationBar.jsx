import React from "react";
import { Link as ScrollLink } from "react-scroll";

export default function NavigationBar() {
  return (
    <header className="w-full bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
        <div className="font-bold text-lg text-blue-700">ArcTecFox</div>
        <nav className="flex space-x-6 text-sm text-gray-700">
          <ScrollLink to="features" smooth={true} duration={500} className="cursor-pointer hover:text-blue-600">
            Features
          </ScrollLink>
          <ScrollLink to="how-it-works" smooth={true} duration={500} className="cursor-pointer hover:text-blue-600">
            How It Works
          </ScrollLink>
          <ScrollLink to="about" smooth={true} duration={500} className="cursor-pointer hover:text-blue-600">
            About
          </ScrollLink>
          <ScrollLink to="contact" smooth={true} duration={500} className="cursor-pointer hover:text-blue-600">
            Contact
          </ScrollLink>
        </nav>
      </div>
    </header>
  );
}
