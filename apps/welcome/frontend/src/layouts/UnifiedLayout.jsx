import React, { useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useToSCheck } from "../hooks/useToSCheck";
import { AuthLoading } from "../components/loading/LoadingStates";
import ToSAcceptanceModal from "../components/ToSAcceptanceModal";
import { Toaster } from "../components/ui/toaster";
import GlobalNavigation from "../components/shared/GlobalNavigation";
import GlobalFooter from "../components/shared/GlobalFooter";

export default function UnifiedLayout() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { needsToSAcceptance, loading: tosLoading, handleAcceptToS } = useToSCheck();

  // Redirect authenticated users from landing to dashboard
  useEffect(() => {
    if (!authLoading && user && location.pathname === "/") {
      navigate("/dashboard", { replace: true });
    }
  }, [user, authLoading, location.pathname, navigate]);

  // Show loading state while checking auth
  if (authLoading || tosLoading) {
    return <AuthLoading />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Global Navigation */}
      <GlobalNavigation />

      {/* Main Content */}
      <main className="flex-1 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <Outlet />
        </div>
      </main>

      {/* Global Footer */}
      <GlobalFooter />

      {/* ToS Modal */}
      {needsToSAcceptance && (
        <ToSAcceptanceModal 
          onAccept={handleAcceptToS}
        />
      )}

      {/* Toast Notifications */}
      <Toaster />
    </div>
  );
}