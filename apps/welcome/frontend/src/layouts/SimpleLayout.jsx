import { Outlet } from "react-router-dom";

export default function SimpleLayout() {
  // Minimal wrapper for the public landing page (no auth header)
  return (
    <div className="min-h-screen bg-gray-50">
      <Outlet />
    </div>
  );
}
