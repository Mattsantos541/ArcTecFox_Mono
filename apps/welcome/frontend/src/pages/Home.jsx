import React, { useState } from "react";
import UserStatusBar from "../components/UserStatusBar";
import LeadCaptureModal from "../components/LeadCaptureModal";
import PMPlannerOpen from "../pages/PMPlannerOpen";
import ProgressBar from "../components/ProgressBar";
import { generatePMPlan } from "../api";                // ⬅️ reuse your existing generator
import { saveLeadAndPlan } from "../services/leadFunnelService";
import { exportPlanToExcel } from "../utils/exportPlan";

export default function Home() {
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [assetName, setAssetName] = useState("");
  const [completion, setCompletion] = useState(0);
  const [formState, setFormState] = useState(null);     // <- hold planner form data
  const [pendingTasks, setPendingTasks] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const scrollToPlanner = () => {
    const el = document.getElementById("pm-planner-section");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  // progress coming from planner
  const handlePlannerProgress = (formData) => {
    setFormState(formData);
    setAssetName(formData?.name || "");
    const keys = [
      "name","model","serial","category","hours",
      "additional_context","environment","date_of_plan_start",
    ];
    const filled = keys.filter(k => {
      const v = formData?.[k];
      return v !== undefined && String(v).trim() !== "";
    }).length;
    setCompletion(Math.round((filled / keys.length) * 100));
  };

  // Planner "Generate Plan" clicked: show lead modal (we won’t write yet)
  const handlePlannerSubmit = async (formData) => {
    // keep latest form snapshot for saving after email capture
    setFormState(formData);
    setShowLeadModal(true);
  };

  const handleLeadSubmit = async ({ email, company }) => {
    try {
      setSubmitting(true);

      // 1) Generate tasks from AI using your existing endpoint
      const tasks = await generatePMPlan(formState);
      setPendingTasks(tasks);

      // 2) Persist lead + plan + tasks
      const { plan } = await saveLeadAndPlan({
        form: formState,
        lead: { email, company },
        tasks,
      });

      // 3) Optional: automatically export to Excel for the user
      exportPlanToExcel({ plan, tasks });

      setShowLeadModal(false);
      // You can also navigate or toast here
      console.log("✅ Lead + plan saved and exported.");
    } catch (err) {
      console.error("❌ Lead funnel save failed:", err);
      alert(`Failed to save lead/plan: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen relative font-sans">
      {/* HERO */}
      <section className="bg-white py-16 text-center border-b">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-6">
            Downtime Is Expensive. Prevent It With a Plan.
          </h1>
          <p className="text-lg text-gray-700 mb-8 leading-relaxed">
            <span className="italic">“Failing to plan is planning to fail.”</span> — Benjamin Franklin
            <br />
            ArcTecFox gives you a preventive maintenance plan in minutes—so your
            assets stay running, and your team stops fighting costly breakdowns.
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

          <p className="text-gray-700 mb-8 max-w-3xl mx-auto leading-relaxed">
            ArcTecFox uses AI to instantly generate custom preventive maintenance
            plans tailored to your assets and conditions. No guesswork. No wasted
            time. Just a clear roadmap to keep your equipment running and avoid
            failures before they happen.
          </p>

          <button
            onClick={scrollToPlanner}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 shadow"
          >
            <span>👉</span> Generate My PM Plan
          </button>
        </div>
      </section>

      {/* FREE OFFER */}
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

          <p className="text-gray-600 mb-6">
            Just answer a few quick questions and you’ll have your plan in minutes.
          </p>

          <button
            onClick={scrollToPlanner}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 shadow"
          >
            <span>👉</span> Start My Preventive Maintenance Plan
          </button>
        </div>
      </section>

      {/* PLANNER + PROGRESS */}
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

      {/* Lead capture modal */}
      {showLeadModal && (
        <LeadCaptureModal
          submitting={submitting}
          onClose={() => setShowLeadModal(false)}
          onLeadSubmit={handleLeadSubmit}
        />
      )}

      {/* Footer nav */}
      <footer className="mt-12 border-t py-6">
      </footer>
    </div>
  );
}
