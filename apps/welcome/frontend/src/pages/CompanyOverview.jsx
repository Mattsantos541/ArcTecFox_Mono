import React, { useEffect, useState } from "react";
import { fetchAssets, fetchMetrics, fetchAssetTypes } from "../api";

function CompanyOverview() {
  const [assets, setAssets] = useState([]);
  const [assetTypes, setAssetTypes] = useState([]);
  const [selectedAssetType, setSelectedAssetType] = useState(null);
  const [metrics, setMetrics] = useState({
    totalAssets: 0,
    activePMPlans: 0,
    nextPMTask: "N/A",
    locations: [],
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [assetData = [], assetTypeData = []] = await Promise.all([
          fetchAssets().catch(() => []),
          fetchAssetTypes().catch(() => []),
        ]);

        setAssets(assetData);
        setAssetTypes(assetTypeData);

        const metricsData = await fetchMetrics().catch(() => ({
          totalAssets: assetData.length,
          activePMPlans: 0,
          nextPMTask: "N/A",
          locations: assetData.length
            ? [...new Set(assetData.map((a) => a.location || "Unknown"))]
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
      <h1 className="text-3xl font-bold text-gray-900">Company Overview</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard title="Total Assets" value={metrics.totalAssets ?? 0} />
        <MetricCard title="Active PM Plans" value={metrics.activePMPlans ?? 0} />
        <MetricCard title="Next PM Task" value={metrics.nextPMTask ?? "N/A"} />
      </div>

      <div>
        <h2 className="text-xl font-semibold text-gray-800">Filter by Category</h2>
        <select
          className="border p-2 rounded mt-2"
          value={selectedAssetType ?? ""}
          onChange={(e) =>
            setSelectedAssetType(e.target.value ? Number(e.target.value) : null)
          }
        >
          <option value="">All Categories</option>
          {assetTypes.map((type) => (
            <option key={type.asset_type_id} value={type.asset_type_id}>
              {type.asset_name}
            </option>
          ))}
        </select>
      </div>

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
              {assets
                .filter(
                  (asset) =>
                    !selectedAssetType || asset.asset_type_id === selectedAssetType
                )
                .map((asset) => (
                  <tr key={asset.id} className="border-b hover:bg-gray-50">
                    <td className="p-4">{asset.name}</td>
                    <td className="p-4">
                      {assetTypes.find((t) => t.asset_type_id === asset.asset_type_id)
                        ?.asset_name || "Unknown"}
                    </td>
                    <td className="p-4">{asset.usage_hours ?? "N/A"} hrs</td>
                    <td className="p-4">{asset.location || "N/A"}</td>
                  </tr>
                ))}
              {assets.length === 0 && (
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

const MetricCard = ({ title, value }) => (
  <div className="rounded-lg bg-white p-6 shadow-md">
    <h3 className="text-sm font-medium text-gray-500">{title}</h3>
    <p className="mt-2 text-2xl font-semibold text-gray-900">{value}</p>
  </div>
);

export default CompanyOverview;
