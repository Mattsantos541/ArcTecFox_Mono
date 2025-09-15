import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function UserStatusBar() {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return <span className="text-gray-600 text-sm">Loading...</span>;
  }

  if (user) {
    return (
      <div className="flex items-center space-x-3 bg-white px-3 py-2 rounded shadow border">
        {user.user_metadata?.avatar_url && (
          <img
            src={user.user_metadata.avatar_url}
            alt="avatar"
            className="w-6 h-6 rounded-full"
          />
        )}
        <span className="text-sm text-gray-700">
          {user.user_metadata?.full_name || user.email}
        </span>
        <button
          onClick={logout}
          className="text-xs text-red-600 hover:underline"
        >
          Sign Out
        </button>
      </div>
    );
  }

  // Returning-users link style
  return (
    <button
      onClick={() => navigate('/login')}
      className="bg-white border px-3 py-1 text-sm rounded shadow hover:bg-gray-100"
      title="Returning users"
    >
      Returning users → Sign in
    </button>
  );
}
