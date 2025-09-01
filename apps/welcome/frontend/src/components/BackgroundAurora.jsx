import React from "react";

/**
 * Soft animated aurora blobs (very low opacity).
 * No Tailwind keyframes needed; we inject scoped CSS inside the component.
 */
export default function BackgroundAurora({ className = "" }) {
  return (
    <div className={`absolute inset-0 -z-10 overflow-hidden pointer-events-none ${className}`}>
      <style>{`
        @keyframes atf-float-1 { 0%{transform:translate(-10%, -5%) scale(1);} 50%{transform:translate(5%, 2%) scale(1.05);} 100%{transform:translate(-10%, -5%) scale(1);} }
        @keyframes atf-float-2 { 0%{transform:translate(5%, -10%) scale(1);} 50%{transform:translate(-3%, 0%) scale(1.06);} 100%{transform:translate(5%, -10%) scale(1);} }
        @keyframes atf-float-3 { 0%{transform:translate(0%, 8%) scale(1);} 50%{transform:translate(2%, -2%) scale(1.04);} 100%{transform:translate(0%, 8%) scale(1);} }
      `}</style>

      {/* blob 1 */}
      <div
        style={{
          position: "absolute",
          top: "-20%",
          left: "-10%",
          width: "55rem",
          height: "55rem",
          filter: "blur(70px)",
          background:
            "radial-gradient(closest-side, rgba(33,212,253,0.28), rgba(33,212,253,0))",
          animation: "atf-float-1 16s ease-in-out infinite",
        }}
      />

      {/* blob 2 */}
      <div
        style={{
          position: "absolute",
          right: "-15%",
          top: "-10%",
          width: "60rem",
          height: "60rem",
          filter: "blur(80px)",
          background:
            "radial-gradient(closest-side, rgba(99,102,241,0.26), rgba(99,102,241,0))",
          animation: "atf-float-2 18s ease-in-out infinite",
        }}
      />

      {/* blob 3 */}
      <div
        style={{
          position: "absolute",
          bottom: "-15%",
          left: "5%",
          width: "50rem",
          height: "50rem",
          filter: "blur(70px)",
          background:
            "radial-gradient(closest-side, rgba(30,106,255,0.22), rgba(30,106,255,0))",
          animation: "atf-float-3 20s ease-in-out infinite",
        }}
      />
    </div>
  );
}
