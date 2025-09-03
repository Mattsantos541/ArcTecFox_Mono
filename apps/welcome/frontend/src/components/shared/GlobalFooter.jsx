import React from "react";
import { Link } from "react-router-dom";

export default function GlobalFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-gray-50 border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          {/* Brand and Copyright */}
          <div className="flex items-center space-x-2">
            <img 
              src="/assets/ArcTecFox-logo.jpg" 
              alt="ArcTecFox" 
              className="h-6 w-6"
            />
            <span className="text-sm text-gray-600">
              © {currentYear} ArcTecFox. All rights reserved.
            </span>
          </div>

          {/* Footer Links */}
          <nav className="flex items-center space-x-6">
            <Link
              to="/terms-of-service"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Terms of Service
            </Link>
            <Link
              to="/privacy-policy"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Privacy Policy
            </Link>
            <a
              href="mailto:support@arctecfox.ai"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Contact
            </a>
          </nav>
        </div>
        
        {/* Additional Info */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-center text-gray-500">
            Preventive Maintenance Planning powered by AI. Keep your assets running, stop fighting breakdowns.
          </p>
        </div>
      </div>
    </footer>
  );
}