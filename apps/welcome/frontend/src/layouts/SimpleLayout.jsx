import React from "react";
import { Outlet } from "react-router-dom";

export default function SimpleLayout() {
  // Minimal wrapper for public/marketing pages
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      <Outlet />
    </div>
  );
}
