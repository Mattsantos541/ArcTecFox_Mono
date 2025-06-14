import React from "react";

function Reports() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-800">Reports</h1>
      <p className="text-gray-600 mt-2">
        View analytics and reports for your preventive maintenance activities.
      </p>

      {/* Sample Reports Section */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 shadow rounded-lg border">
          <h2 className="text-xl font-semibold text-gray-800">PM Schedule Summary</h2>
          <p className="text-gray-600 mt-1">Overview of completed and upcoming maintenance tasks.</p>
        </div>

        <div className="bg-white p-6 shadow rounded-lg border">
          <h2 className="text-xl font-semibold text-gray-800">Cost Savings Report</h2>
          <p className="text-gray-600 mt-1">AI-driven insights into maintenance cost reductions.</p>
        </div>

        <div className="bg-white p-6 shadow rounded-lg border">
          <h2 className="text-xl font-semibold text-gray-800">Asset Reliability Trends</h2>
          <p className="text-gray-600 mt-1">Historical performance of key assets.</p>
        </div>
      </div>
    </div>
  );
}

export default Reports;
