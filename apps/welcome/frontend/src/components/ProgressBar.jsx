import React from "react";

export default function ProgressBar({ progress = 0, label }) {
  const pct = Math.max(0, Math.min(100, progress));
  return (
    <div className="mb-6">
      {label && (
        <p className="mb-2 text-sm text-gray-700 text-center">{label}</p>
      )}
      <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
        <div
          className="h-2.5 rounded-full bg-blue-600 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
