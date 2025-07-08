import { Outlet } from "react-router-dom";
import { useAuth } from '../hooks/useAuth';
import { AuthLoading } from '../components/loading/LoadingStates';

// GoogleLoginButton Component
function GoogleLoginButton({ className = "" }) {
  const { loginWithGoogle, loading } = useAuth();

  const handleGoogleLogin = async () => {
    const result = await loginWithGoogle();
    if (!result.success) {
      console.error('Google login failed:', result.error);
    }
  };

  return (
    <button 
      onClick={handleGoogleLogin}
      disabled={loading}
      className={`flex items-center justify-center px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      {loading ? 'Signing in...' : 'Continue with Google'}
    </button>
  );
}

// Shared AuthHeader component
function AuthHeader() {
  const { user, logout, loading } = useAuth();

  if (loading) {
    return <AuthLoading />;
  }

  if (user) {
    return (
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            {user.user_metadata?.avatar_url && (
              <img 
                src={user.user_metadata.avatar_url} 
                alt="Profile" 
                className="w-8 h-8 rounded-full"
              />
            )}
            <div>
              <p className="font-medium text-gray-800">
                {user.user_metadata?.full_name || user.email}
              </p>
              <p className="text-sm text-gray-600">{user.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="max-w-6xl mx-auto text-center">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          Sign in to Access PM Tools
        </h3>
        <p className="text-gray-600 mb-4 text-sm">
          Sign in with your Google account to access the maintenance planning tools.
        </p>
        <GoogleLoginButton className="mx-auto" />
      </div>
    </div>
  );
}

export default function MainLayout() {
  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 font-sans">
      {/* Auth header stays at top of every page */}
      <AuthHeader />
      
      {/* Logo and welcome section */}
      <section className="bg-white rounded-lg shadow-md mx-auto max-w-6xl mt-8 p-8 space-y-6 text-center">
        <img 
          src="/assets/ArcTecFox-logo.jpg" 
          alt="ArcTecFox Logo" 
          width="120" 
          height="120" 
          className="mx-auto mb-6 rounded-xl shadow-lg hover:scale-105 transition-transform duration-300"
        />
        <h2 className="text-2xl font-semibold text-gray-800">
          Welcome to our AI-Powered Maintenance Planning Platform
        </h2>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
          Our AI helps you create detailed PM plans for your specific equipment. Enter your asset
          info below and let the system generate schedules, safety procedures, and rationale.
        </p>
        <p className="text-gray-600 max-w-4xl mx-auto border-t pt-6">
          Manage pumps, motors, valves, and more with maintenance strategies from manufacturer specs,
          industry best practices, and your real-world ops. Fill the form below to get started.
        </p>
      </section>
      
      {/* Page content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Outlet />
      </div>
    </div>
  );
}