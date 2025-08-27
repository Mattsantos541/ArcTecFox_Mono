import React from "react";

export default function ProgressBar({ progress, label }) {
  if (!progress || progress < 5) return null;

  return (
    <div className="mb-6">
      <div className="text-gray-700 text-sm font-medium mb-1">{label}</div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
