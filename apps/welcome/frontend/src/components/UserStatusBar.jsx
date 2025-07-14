import React from "react";
import { useAuth } from "../hooks/useAuth";

export default function UserStatusBar() {
  const { user, loginWithGoogle, logout, loading } = useAuth();

  return (
    <div className="fixed top-3 right-4 z-[9999]">
      {loading ? null : user ? (
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
      ) : (
        <button
          onClick={loginWithGoogle}
          className="text-sm text-blue-700 hover:underline bg-transparent border-none p-0"
        >
          Sign In
        </button>
      )}
    </div>
  );
}
