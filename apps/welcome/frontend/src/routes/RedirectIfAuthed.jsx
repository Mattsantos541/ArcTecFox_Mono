import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

/**
 * If logged in, send to /dashboard; otherwise render children (e.g., <Home/>).
 */
export default function RedirectIfAuthed({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;                    // or a tiny loader
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}
