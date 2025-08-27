import React, { useState } from "react";
import NavigationBar from "../components/NavigationBar";
import HeroSection from "../components/HeroSection";
import UserStatusBar from "../components/UserStatusBar";
import LeadCaptureModal from "../components/LeadCaptureModal";
import PMPlannerOpen from "../pages/PMPlannerOpen";
import ScrollToPlannerButton from "../components/ScrollToPlannerButton";
import ProgressBar from "../components/ProgressBar";

export default function Home() {
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [assetName, setAssetName] = useState("");
  const [completion, setCompletion] = useState(0);

  const handleGenerateClick = () => {
    const plannerSection = document.getElementById("pm-planner-section");
    if (plannerSection) {
      plannerSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handlePlannerProgress = (formData) => {
    setAssetName(formData.name);
    const totalFields = 8;
    const filledFields = Object.entries(formData).filter(
      ([key, val]) =>
        key !== "email" && key !== "company" && val?.toString().trim() !== ""
    ).length;
    setCompletion(Math.round((filledFields / totalFields) * 100));
  };

  const handlePlannerSubmit = () => {
    setShowLeadModal(true);
  };

  return (
    <div className="bg-gray-50 min-h-screen relative">
      {/* Top branding and sign-in */}
      <div className="w-full flex justify-between items-center px-4 pt-3">
        <div className="flex items-center space-x-2">
          <img src="/assets/ArcTecFox-logo.jpg" alt="ArcTecFox Logo" className="h-8 w-8" />
          <span className="font-bold text-lg text-blue-600">ArcTecFox</span>
        </div>
        <UserStatusBar />
      </div>

      {/* Hero with AEO content */}
      <section className="max-w-5xl mx-auto px-4 py-12 text-center">
        <h1 className="text-3xl font-semibold text-gray-800 mb-6">
          What is ArcTecFox?
        </h1>
        <p className="text-gray-700 mb-10 max-w-2xl mx-auto">
          ArcTecFox is an AI-powered tool that generates preventive maintenance plans based on your assets and conditions. In under 60 seconds, get a downloadable Excel or PDF plan—no CMMS setup or sign-in required.
        </p>

        <h2 className="text-3xl font-bold text-gray-800 mb-6">
          Preventive Maintenance Shouldn’t Be This Hard
        </h2>
        <h3 className="text-lg text-gray-600 mb-10">
          Too many teams rely on outdated templates, tribal knowledge, or overcomplicated CMMS tools.<br />
          ArcTecFox gives you a smarter starting point—in seconds.
        </h3>

        <h3 className="text-2xl font-semibold text-gray-800 mt-10 mb-6">
        Common PM Planning Problems We Fix
        </h3>
        <div className="flex justify-center">
  <ul className="list-disc pl-6 text-left text-gray-700 mb-10 space-y-2">
    <li>Outdated or missing PM templates</li>
    <li>Reactive maintenance overload</li>
    <li>Complex or underused CMMS software</li>
    <li>Manual PMs copied from old spreadsheets</li>
    <li>Lack of standardization across teams</li>
  </ul>
</div>


        <p className="text-gray-700 mb-10">
          ArcTecFox uses AI to generate custom preventive maintenance plans based on your assets and operating conditions.<br />
          No sign-up required. No complicated setup. Just useful, structured PMs—ready to import or share.
        </p>

        <button
          onClick={handleGenerateClick}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
        >
          Generate PM Plan
        </button>
      </section>

      {/* Explainer */}
      <section className="max-w-5xl mx-auto px-4 py-12 text-center bg-white shadow-sm rounded">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          Try It Free—No Sign-Up Needed
        </h2>
        <p className="text-gray-700 mb-4">
          Enter an asset below and get a full Excel download of your preventive maintenance plan.<br />
          We’ll ask for your email and company so you can access and update your plans later.
        </p>
        <ul className="text-left max-w-xl mx-auto text-gray-700 mb-6 space-y-2">
          <li>🛠️ Includes task details, intervals, and scheduling</li>
          <li>📥 Delivered instantly as a clean Excel file</li>
          <li>📄 Optionally delivered as a professional PDF</li>
          <li>🧠 Based on real-world maintenance standards and AI logic</li>
        </ul>

        <ScrollToPlannerButton />
      </section>

      {/* PM Planner + Progress */}
      <div id="pm-planner-section" className="max-w-5xl mx-auto px-4 py-16">
        <ProgressBar progress={completion} label={`You almost have your preventive maintenance plan for "${assetName}"`} />
        <PMPlannerOpen onGenerate={handlePlannerSubmit} onChange={handlePlannerProgress} />
      </div>

      {/* Modal for email + company */}
      {showLeadModal && (
        <LeadCaptureModal
          onClose={() => setShowLeadModal(false)}
          onLeadSubmit={(data) => {
            console.log("Lead submitted:", data);
            setShowLeadModal(false);
          }}
        />
      )}

      {/* Moved Navigation to Footer for focus */}
      <footer className="mt-12">
        <NavigationBar />
      </footer>
    </div>
  );
}
