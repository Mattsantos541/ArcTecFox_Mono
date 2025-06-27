import { useState } from "react";

export default function PMPlanner() {
  console.log("PMPlanner component rendering");
  
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-blue-600 mb-6">PM Planner Debug</h1>
        <p className="text-gray-700">If you can see this, the component is loading correctly.</p>
        <div className="mt-4 p-4 bg-white rounded shadow">
          <p>✅ React component working</p>
          <p>✅ Tailwind classes working</p>
          <p>✅ No infinite loop</p>
        </div>
      </div>
    </div>
  );
}