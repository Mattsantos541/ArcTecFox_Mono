import React from "react";

/**
 * Subtle blueprint grid background.
 * Place inside a relative container. It sits behind content.
 */
export default function BlueprintGrid({ className = "" }) {
  return (
    <svg
      className={`absolute inset-0 -z-10 w-full h-full text-blue-900/10 ${className}`}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {/* large squares */}
      <defs>
        <pattern id="gridLarge" width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.2"/>
        </pattern>
        <pattern id="gridSmall" width="2" height="2" patternUnits="userSpaceOnUse">
          <path d="M 2 0 L 0 0 0 2" fill="none" stroke="currentColor" strokeWidth="0.05"/>
        </pattern>
      </defs>

      <rect width="100%" height="100%" fill="url(#gridLarge)"/>
      <rect width="100%" height="100%" fill="url(#gridSmall)" className="opacity-30"/>
    </svg>
  );
}
