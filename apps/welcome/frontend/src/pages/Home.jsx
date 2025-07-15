import React, { useState } from "react";
import NavigationBar from "../components/NavigationBar";
import HeroSection from "../components/HeroSection";
import UserStatusBar from "../components/UserStatusBar";
import LeadCaptureModal from "../components/LeadCaptureModal";
import PMPlannerOpen from "../pages/PMPlannerOpen";
import ScrollToPlannerButton from "../components/ScrollToPlannerButton";

export default function Home() {
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [pmFormData, setPmFormData] = useState(null);

  const handleGenerateClick = (formData) => {
    setPmFormData(formData);
    setShowLeadModal(true);
  };

  const handleLeadSubmit = (leadData) => {
    const fullSubmission = {
      ...pmFormData,
      ...leadData,
    };
    console.log("📦 Final Submission Data:", fullSubmission);

    // 🔁 Replace with actual DB/API submission
    // await supabase.from("pm_leads").insert(fullSubmission);

    setShowLeadModal(false);
    setPmFormData(null);
  };

  return (
    <div className="bg-gray-50 min-h-screen relative">
      {/* 🧑‍💼 Auth Status */}
      <div className="w-full flex justify-end px-4 pt-2">
        <UserStatusBar />
      </div>

      {/* 🧭 Navigation */}
      <NavigationBar />

      {/* 🚀 Hero Section (includes the floating SVG internally) */}
      <HeroSection
        onGenerateClick={() =>
          document
            .getElementById("pm-planner-section")
            ?.scrollIntoView({ behavior: "smooth" })
        }
      />

      {/* 🔽 Scroll Helper */}
      <ScrollToPlannerButton />

      {/* 📋 PM Planner */}
      <div
        id="pm-planner-section"
        className="max-w-5xl mx-auto px-4 py-16"
      >
        <PMPlannerOpen onGenerate={handleGenerateClick} />
      </div>

      {/* ✉️ Lead Capture Modal */}
      {showLeadModal && (
        <LeadCaptureModal
          onClose={() => setShowLeadModal(false)}
          onLeadSubmit={handleLeadSubmit}
        />
      )}
    </div>
  );
}
