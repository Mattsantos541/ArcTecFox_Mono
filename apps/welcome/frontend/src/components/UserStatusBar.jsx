import React from "react";
import { useAuth } from "../hooks/useAuth";

export default function UserStatusBar() {
  const { user, loginWithGoogle, logout, loading } = useAuth();

  return (
    <div className="flex justify-end items-center space-x-4 bg-white px-4 py-2 rounded shadow-sm">
      {loading ? (
        <span className="text-sm text-gray-600">Loading...</span>
      ) : user ? (
        <div className="flex items-center space-x-3">
          <img
            src={user.user_metadata?.avatar_url}
            alt="avatar"
            className="w-6 h-6 rounded-full"
          />
          <span className="text-sm text-gray-800">
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
          className="text-sm text-blue-600 hover:underline"
        >
          Returning User?
        </button>
      )}
    </div>
  );
}
