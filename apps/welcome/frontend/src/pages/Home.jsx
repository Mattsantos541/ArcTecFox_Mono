import React, { useState } from 'react';
import PMPlanner from "./PMPlanner";          // ✔️ this is correct for Home.jsx
//import LeadCaptureModal from "../components/LeadCaptureModal"; // ❌ this file doesn’t exist yet


export default function Home() {
  const [showLeadModal, setShowLeadModal] = useState(false);

  const handleGenerateClick = () => {
    // Instead of generating immediately, open the lead capture modal
    setShowLeadModal(true);
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Hero Section */}
      <div className="text-center py-20 bg-white">
        <h1 className="text-4xl font-bold text-blue-900">
          AI-Powered Preventive Maintenance Plans
        </h1>
        <p className="mt-4 text-lg text-gray-600">
          Generate optimized preventive maintenance schedules for your assets in seconds.
        </p>
      </div>

      {/* PM Planner */}
      <div className="max-w-5xl mx-auto px-6 py-12">
        <PMPlanner onGenerate={handleGenerateClick} />
      </div>

      {/* Lead Capture Modal */}
      {showLeadModal && (
        <LeadCaptureModal
          onClose={() => setShowLeadModal(false)}
          onLeadSubmit={(data) => {
            console.log('Lead submitted:', data);
            // TODO: Trigger PM generation + download
            setShowLeadModal(false);
          }}
        />
      )}
    </div>
  );
}
