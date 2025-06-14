import React, { useEffect, useState } from "react";
import { NavLink, Outlet, Link } from "react-router-dom";
import { getCurrentUser, signOut } from "../api";
import { 
  BarChart3, 
  Settings, 
  FileText, 
  LayoutDashboard,
  List,
  User,
  LogOut
} from "lucide-react";

const MainLayout = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    };
    fetchUser();
  }, []);

  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="w-64 bg-[#0A192F] text-white flex flex-col shadow-lg">
        <div className="h-20 flex items-center justify-center px-6 border-b border-gray-700">
          <img src="/af-logo.jpg" alt="ArcTecFox PM" className="h-12 w-auto object-contain" />
        </div>
        <nav className="py-4 space-y-2">
          <NavItem to="/company-overview" icon={<LayoutDashboard />} label="Company Overview" />
          <NavItem to="/pm-planner" icon={<BarChart3 size={20} />} label="PM Planner" />
          <NavItem to="/work-orders" icon={<List size={20} />} label="Work Orders" />
          <NavItem to="/settings" icon={<Settings size={20} />} label="Settings" />
        </nav>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b flex items-center justify-between px-6 shadow">
          <h1 className="text-xl font-semibold text-gray-800">ArcTecFox PM</h1>

          <div className="flex items-center space-x-6">
            <User className="w-6 h-6 text-gray-700" />
            {user ? (
              <>
                <span className="text-gray-700 font-medium">Welcome, {user.email}</span>
                <button 
                  className="flex items-center gap-2 bg-red-500 px-3 py-2 rounded-md text-white hover:bg-red-700 transition duration-300"
                  onClick={signOut}
                >
                  <LogOut className="w-5 h-5" />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <Link to="/login" className="text-blue-600 hover:underline">
                Sign In
              </Link>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

const NavItem = ({ to, icon, label }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `flex items-center px-6 py-3 text-sm rounded-lg ${
        isActive 
          ? "bg-blue-600 text-white" 
          : "text-gray-300 hover:bg-gray-800"
      }`
    }
  >
    <span className="mr-3">{icon}</span>
    <span>{label}</span>
  </NavLink>
);

export default MainLayout;