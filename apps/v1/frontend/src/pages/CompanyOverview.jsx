import React, { useEffect, useState } from "react";
import { fetchAssets, fetchMetrics } from "../api";

function CompanyOverview() {
  const [assets, setAssets] = useState([]);
  const [metrics, setMetrics] = useState({
    totalAssets: 0,
    activePMPlans: 0,
    nextPMTask: "N/A",
    locations: [],
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        // Fetch assets, ensure it's always an array
        const assetData = await fetchAssets().catch(() => []);
        setAssets(assetData);

        // Fetch metrics, fallback to asset count if needed
        const metricsData = await fetchMetrics().catch(() => ({
          totalAssets: assetData?.length ?? 0,
          activePMPlans: 0, // Placeholder value
          nextPMTask: "N/A",
          locations: assetData?.length
            ? [...new Set(assetData.map(a => a.location || "Unknown"))]
            : [],
        }));

        setMetrics(metricsData);
      } catch (error) {
        console.error("❌ Error loading company overview data:", error);
      }
    };

    loadData();
  }, []);

  return (
    <div className="p-6 space-y-6">
      {/* Page Title */}
      <h1 className="text-3xl font-bold text-gray-900">Company Overview</h1>

      {/* Metrics Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard title="Total Assets" value={metrics.totalAssets ?? 0} />
        <MetricCard title="Active PM Plans" value={metrics.activePMPlans ?? 0} />
        <MetricCard title="Next PM Task" value={metrics.nextPMTask ?? "N/A"} />
      </div>

      {/* Locations Overview */}
      <div>
        <h2 className="text-xl font-semibold text-gray-800">Locations</h2>
        <ul className="list-disc pl-6 text-gray-700">
          {metrics?.locations?.length > 0 ? (
            metrics.locations.map((location, index) => (
              <li key={index}>{location}</li>
            ))
          ) : (
            <li>No locations available</li>
          )}
        </ul>
      </div>

      {/* Assets Table */}
      <div>
        <h2 className="text-xl font-semibold text-gray-800">Assets Overview</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 shadow rounded-lg">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-4 border-b">Asset Name</th>
                <th className="p-4 border-b">Category</th>
                <th className="p-4 border-b">Usage Hours</th>
                <th className="p-4 border-b">Location</th>
              </tr>
            </thead>
            <tbody>
              {assets?.length > 0 ? (
                assets.map((asset) => (
                  <tr key={asset.id} className="border-b hover:bg-gray-50">
                    <td className="p-4">{asset.name}</td>
                    <td className="p-4">{asset.category}</td>
                    <td className="p-4">{asset.usage_hours ?? "N/A"} hrs</td>
                    <td className="p-4">{asset.location || "N/A"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="p-4 text-center text-gray-500">
                    No assets available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ✅ Small reusable metric card component
const MetricCard = ({ title, value }) => (
  <div className="rounded-lg bg-white p-6 shadow-md">
    <h3 className="text-sm font-medium text-gray-500">{title}</h3>
    <p className="mt-2 text-2xl font-semibold text-gray-900">{value}</p>
  </div>
);

export default CompanyOverview;
