import React, { useState } from "react";
import NavigationBar from "../components/NavigationBar";
import HeroSection from "../components/HeroSection";
import UserStatusBar from "../components/UserStatusBar";       // Top-right login/logout
import LeadCaptureModal from "../components/LeadCaptureModal";
import PMPlannerOpen from "../pages/PMPlannerOpen";
import ScrollToPlannerButton from "../components/ScrollToPlannerButton";

export default function Home() {
  const [showLeadModal, setShowLeadModal] = useState(false);

  const handleGenerateClick = () => {
    setShowLeadModal(true);
  };

  return (
    <div className="relative bg-gray-50 min-h-screen overflow-x-hidden">
      <UserStatusBar />          {/* 🔒 Always visible login/logout */}
      <NavigationBar />          {/* 🔗 Features, How It Works, etc. */}
      <HeroSection onGenerateClick={handleGenerateClick} />
      
      <ScrollToPlannerButton />

      <div id="pm-planner-section" className="max-w-5xl mx-auto px-4 py-16">
        <PMPlannerOpen onGenerate={handleGenerateClick} />
      </div>

      {showLeadModal && (
        <LeadCaptureModal
          onClose={() => setShowLeadModal(false)}
          onLeadSubmit={(data) => {
            console.log("Lead submitted:", data);
            setShowLeadModal(false);
          }}
        />
      )}
    </div>
  );
}
