import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from '../hooks/useAuth';
import { useToSCheck } from '../hooks/useToSCheck';
import { AuthLoading } from '../components/loading/LoadingStates';
import ToSAcceptanceModal from '../components/ToSAcceptanceModal';
import AuthHeader from '../components/layout/AuthHeader';

export default function MainLayout() {
  const { user, logout } = useAuth();
  const { needsToSAcceptance, loading: tosLoading, markToSAsAccepted } = useToSCheck(user);

  const handleToSAccept = () => {
    markToSAsAccepted();
  };

  const handleToSReject = async () => {
    await logout();
  };

  if (user && tosLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <AuthLoading />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 font-sans flex flex-col">
      {/* ✅ Auth Header always visible */}
      <AuthHeader />

      {/* ✅ Main routed content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Outlet />
      </div>

      {/* ✅ Footer always visible */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex justify-center items-center space-x-6 text-sm text-gray-600">
            <a href="/terms-of-service" className="hover:text-gray-900 transition-colors">
              Terms of Service
            </a>
            <span className="text-gray-400">|</span>
            <a href="/privacy-policy" className="hover:text-gray-900 transition-colors">
              Privacy Policy
            </a>
          </div>
        </div>
      </footer>

      {/* ✅ Only show ToS if user is authenticated and has not accepted */}
      {user && needsToSAcceptance && (
        <ToSAcceptanceModal
          user={user}
          onAccept={handleToSAccept}
          onReject={handleToSReject}
        />
      )}
    </div>
  );
}
