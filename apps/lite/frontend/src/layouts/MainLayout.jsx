// src/layouts/MainLayout.jsx
export default function MainLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Header */}
      <header className="w-full bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-3">
            {/* Logo */}
            <img
              src="/af-logo.jpg" // ✅ Path to your logo in public/
              alt="ArcTecFox Logo"
              className="h-8 w-auto rounded-sm"
            />
            {/* App Name */}
            <span className="text-xl font-bold text-gray-900">
              ArcTecFox <span className="text-blue-500">PM Planner (Lite)</span>
            </span>
          </div>
        </div>
      </header>

      {/* Page Content */}
      <main className="max-w-6xl mx-auto p-6">{children}</main>
    </div>
  );
}
