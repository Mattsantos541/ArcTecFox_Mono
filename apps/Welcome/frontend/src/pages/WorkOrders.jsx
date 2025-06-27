import React from "react";

function WorkOrders() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-800">Work Orders</h1>
      <p className="text-gray-600 mt-2">
        Manage and track all preventive maintenance work orders.
      </p>

      {/* Table for Work Orders */}
      <div className="mt-6">
        <table className="min-w-full bg-white border border-gray-200 shadow-md rounded-lg">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="p-4 border-b">Work Order ID</th>
              <th className="p-4 border-b">Asset</th>
              <th className="p-4 border-b">Status</th>
              <th className="p-4 border-b">Due Date</th>
              <th className="p-4 border-b">Actions</th>
            </tr>
          </thead>
          <tbody>
            {/* Example Data - Replace with API Data */}
            <tr className="border-b hover:bg-gray-50">
              <td className="p-4">WO-001</td>
              <td className="p-4">Generator A</td>
              <td className="p-4">
                <span className="bg-green-200 text-green-800 px-2 py-1 rounded">
                  Completed
                </span>
              </td>
              <td className="p-4">2024-06-15</td>
              <td className="p-4">
                <button className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600">
                  View
                </button>
              </td>
            </tr>
            <tr className="border-b hover:bg-gray-50">
              <td className="p-4">WO-002</td>
              <td className="p-4">Pump B</td>
              <td className="p-4">
                <span className="bg-yellow-200 text-yellow-800 px-2 py-1 rounded">
                  In Progress
                </span>
              </td>
              <td className="p-4">2024-06-20</td>
              <td className="p-4">
                <button className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600">
                  View
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default WorkOrders;
