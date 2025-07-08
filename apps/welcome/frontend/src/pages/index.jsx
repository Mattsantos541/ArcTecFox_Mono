import React from 'react';
import MaintenanceSchedule from '../components/dashboard/maintenance-schedule';
import { useRouter } from 'next/router';

export default function HomeDashboard() {
  const router = useRouter();

  return (
    <div className="relative">
      <button
        onClick={() => router.push('/PMPlanner')}
        className="absolute top-4 right-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Go to PM Planner
      </button>
      <MaintenanceSchedule />
    </div>
  );
}
