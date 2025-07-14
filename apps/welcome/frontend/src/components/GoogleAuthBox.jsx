import React from "react";

export default function GoogleAuthBox() {
  return (
    <div className="absolute top-4 right-6 text-right">
      <p className="text-sm text-gray-500 mb-1">Returning user?</p>
      <button className="border border-gray-300 px-4 py-2 rounded hover:shadow-sm text-sm">
        Continue with Google
      </button>
    </div>
  );
}