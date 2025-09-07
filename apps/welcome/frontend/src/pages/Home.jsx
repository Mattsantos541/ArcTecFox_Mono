import React, { useState } from "react";
import LeadCaptureModal from "../components/LeadCaptureModal";
import PMPlannerOpen from "../pages/PMPlannerOpen";
import ProgressBar from "../components/ProgressBar";
import { generatePMPlan } from "../api";
import { saveLeadAndPlan } from "../services/leadFunnelService";
import { exportPlanToExcel } from "../utils/exportPlan";

export default function Home() {
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [assetName, setAssetName] = useState("");
  const [completion, setCompletion] = useState(0);
  const [formState, setFormState] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const scrollToPlanner = () => {
    const el = document.getElementById("pm-planner-section");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const handlePlannerProgress = (formData) => {
    setFormState(formData);
    setAssetName(formData?.name || "");

    const keys = [
      "name",
      "model",
      "serial",
      "category",
      "hours",
      "additional_context",
      "environment",
      "date_of_plan_start",
    ];
    const filled = keys.filter((k) => {
      const v = formData?.[k];
      return v !== undefined && String(v).trim() !== "";
    }).length;

    setCompletion(Math.round((filled / keys.length) * 100));
  };

  const handlePlannerSubmit = async (formData) => {
    setFormState(formData);
    setShowLeadModal(true);
  };

  const handleLeadSubmit = async ({ email, company }) => {
    try {
      setSubmitting(true);

      // 1) Generate PM tasks
      const tasks = await generatePMPlan(formState);

      // 2) Persist lead + plan + tasks
      const { plan } = await saveLeadAndPlan({
        form: formState,
        lead: { email, company },
        tasks,
      });

      // 3) Auto-export to Excel for the user
      exportPlanToExcel({ plan, tasks });

      setShowLeadModal(false);
    } catch (err) {
      console.error("❌ Lead funnel save failed:", err);
      alert(`Failed to save lead/plan: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-gray-50 relative font-sans">
      {/* --- HERO --- */}
      <section className="bg-white py-16 text-center border-b">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-6">
            Failing to plan is planning to fail.
          </h1>
          <p className="text-lg text-gray-700 mb-8 max-w-3xl mx-auto leading-relaxed">
            Before you can predict failure, you need a plan to prevent it.
            ArcTecFox helps maintenance teams build fast, structured PMs — ready for action.
          </p>

          <div className="text-left max-w-2xl mx-auto">
            <h3 className="text-xl font-semibold text-gray-800 mb-3">
              Too many maintenance teams are stuck in firefighting mode:
            </h3>
            <ul className="space-y-2 text-gray-700 mb-8">
              <li>❌ Assets fail unexpectedly, costing hours—or days—of downtime</li>
              <li>❌ CMMS setups are incomplete, leaving gaps in coverage</li>
              <li>❌ Old spreadsheets get copied, but don’t reflect real operating conditions</li>
              <li>❌ Teams rely on “tribal knowledge” instead of structured PMs</li>
            </ul>
          </div>

          <button
            onClick={scrollToPlanner}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 shadow"
          >
            <span>⚡</span> Build My Free PM Plan
          </button>

          <p className="text-sm text-gray-600 mt-3">
            Predictive maintenance is powerful — but useless without a preventive foundation.
          </p>
        </div>
      </section>

      {/* Positioning Section */}
      <section className="my-16 text-center px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Before You Predict Failure… Have a Plan to Prevent It
          </h2>
          <p className="max-w-2xl mx-auto text-lg mb-6 text-gray-700">
            Everyone’s chasing the next AI sensor or failure prediction model.
            But what’s the point of predicting failure if you don’t have a preventive plan to act on it?
          </p>
          <p className="max-w-2xl mx-auto text-lg mb-6 text-gray-700">
            You can’t optimize what you haven’t planned for. ArcTecFox builds your baseline preventive
            maintenance plan in less than 60 seconds — so you’re not putting the cart before the horse.
          </p>
          <ul className="max-w-md mx-auto text-left space-y-2 text-gray-800 mb-6">
            <li>✅ Fast, structured PMs</li>
            <li>✅ AI-generated using reliability engineering best practices</li>
            <li>✅ Instantly usable in Excel, PDF, or your CMMS</li>
          </ul>
          <p className="font-semibold text-gray-900">
            First plan. Then predict. Then optimize. <br className="hidden sm:block" />
            Most skip step 1 — don’t be most.
          </p>
        </div>
      </section>

      {/* Free Offer */}
      <section className="bg-gray-100 py-14 text-center">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-semibold text-gray-800 mb-4">
            Try It Free—No Sign-Up Needed
          </h2>
        <p className="text-gray-700 mb-6 max-w-2xl mx-auto">
            Enter your asset below and get a complete preventive maintenance plan instantly.
          </p>

          <ul className="text-left max-w-xl mx-auto text-gray-700 mb-8 space-y-2">
            <li>✔ Task details, intervals, and schedules</li>
            <li>✔ Delivered as a clean Excel file (plus optional PDF)</li>
            <li>✔ Based on proven standards + AI logic</li>
            <li>✔ Ready to share or import into your CMMS</li>
          </ul>

          <p className="text-gray-600 mb-6">Takes less than 1 minute to complete.</p>

          <button
            onClick={scrollToPlanner}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 shadow"
          >
            <span>👉</span> Start Planning in 60 Seconds
          </button>

          <p className="text-sm text-gray-600 mt-3">
            Your preventive maintenance plan will be generated instantly and emailed to you.
          </p>
        </div>
      </section>

      {/* Planner + Progress */}
      <section id="pm-planner-section" className="max-w-5xl mx-auto px-4 py-16">
        <ProgressBar
          progress={completion}
          label={
            assetName
              ? `You almost have your preventive maintenance plan for "${assetName}"`
              : `You’re close—answer a few fields to generate your plan`
          }
        />
        <PMPlannerOpen
          onChange={handlePlannerProgress}
          onGenerate={handlePlannerSubmit}
          disabled={submitting}
        />
      </section>

      {showLeadModal && (
        <LeadCaptureModal
          submitting={submitting}
          onClose={() => setShowLeadModal(false)}
          onLeadSubmit={handleLeadSubmit}
        />
      )}

      <footer className="mt-12 border-t py-6" />
    </div>
  );
}
