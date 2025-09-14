import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import LeadCaptureModal from "../components/LeadCaptureModal";
import PMPlannerOpen from "../pages/PMPlannerOpen";
import ProgressBar from "../components/ProgressBar";
import ParentPlanLoadingModal from "../components/assets/ParentPlanLoadingModal";
import { captureLeadWithPlan, sendPMPlanNotification } from "../api";
import { exportPlanToExcel } from "../utils/exportPlan";
import { useToast } from "../hooks/use-toast";
import SEO from "../components/SEO";

export default function Home() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [showLoadingModal, setShowLoadingModal] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('analyzing');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [assetName, setAssetName] = useState("");
  const [completion, setCompletion] = useState(0);
  const [formState, setFormState] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [resetFormTrigger, setResetFormTrigger] = useState(0);
  const { toast } = useToast();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!loading && user) {
      console.log('🏠 [HOME] Authenticated user detected - redirecting to dashboard');
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, navigate]);

  // Don't render landing page if user is authenticated (prevents flash)
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

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

  const handleLeadSubmit = async ({ email, company, fullName, requestAccess }) => {
    try {
      setSubmitting(true);
      setShowLeadModal(false);
      setShowLoadingModal(true);
      
      // Simulate loading progression
      const progressSteps = [
        { status: 'analyzing', progress: 25, delay: 800 },
        { status: 'generating', progress: 50, delay: 1200 },
        { status: 'creating', progress: 75, delay: 1000 },
        { status: 'saving', progress: 90, delay: 500 }
      ];
      
      for (const step of progressSteps) {
        setLoadingStatus(step.status);
        setLoadingProgress(step.progress);
        await new Promise(resolve => setTimeout(resolve, step.delay));
      }

      // Call the backend endpoint that handles everything
      const result = await captureLeadWithPlan({
        planData: formState,
        email,
        company,
        fullName,
        requestAccess
      });
      
      setLoadingProgress(100);
      await new Promise(resolve => setTimeout(resolve, 300));
      setShowLoadingModal(false);

      // Send notification email to support
      try {
        await sendPMPlanNotification({
          user_name: fullName,
          user_email: email,
          company_name: company,
          asset_name: formState?.asset_name,
          asset_type: formState?.asset_type
        });
        console.log('✅ Support notification sent successfully');
      } catch (emailError) {
        console.log('⚠️ Support notification failed (non-critical):', emailError);
      }

      // Auto-export to Excel for the user
      exportPlanToExcel({ plan: result.plan, tasks: result.data });

      // Download PDF if available
      if (result.pdf_url) {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
        const pdfUrl = `${backendUrl}${result.pdf_url}`;
        
        console.log('📄 Attempting PDF download from:', pdfUrl);
        
        // Use window.open as a fallback for better cross-browser compatibility
        try {
          // Try fetch first to ensure the file exists
          const response = await fetch(pdfUrl);
          if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `PM_Plan_${result.plan.id}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            console.log('✅ PDF download successful');
          } else {
            console.error('❌ PDF download failed: Response not OK', response.status);
          }
        } catch (error) {
          console.error('❌ PDF download error:', error);
          // Fallback: open in new tab
          window.open(pdfUrl, '_blank');
        }
      }

      // Show success toast notification
      if (requestAccess) {
        toast({
          title: "Plan Created & Access Requested!",
          description: "You'll receive an email when your account is approved.",
          variant: "default"
        });
      } else {
        toast({
          title: "PM Plan Generated Successfully!",
          description: result.pdf_url 
            ? "Your preventive maintenance plan has been downloaded as PDF and Excel."
            : "Your preventive maintenance plan has been downloaded as Excel.",
          variant: "default"
        });
      }

      // Clear the form after successful generation
      setResetFormTrigger(prev => prev + 1);
      setAssetName("");
      setCompletion(0);
      setFormState(null);

    } catch (err) {
      console.error("❌ Lead capture failed:", err);
      setShowLoadingModal(false);
      toast({
        title: "Plan Generation Failed",
        description: `Failed to generate plan: ${err.message}`,
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <SEO 
        title="ArcTecFox"
        description="Generate preventive maintenance plans in minutes with AI. Create detailed PM tasks, intervals, and schedules. Export to Excel or PDF. No sign-up required to try."
      />
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
          resetTrigger={resetFormTrigger}
        />
      </section>

      {showLeadModal && (
        <LeadCaptureModal
          submitting={submitting}
          onClose={() => setShowLeadModal(false)}
          onLeadSubmit={handleLeadSubmit}
        />
      )}
      
      <ParentPlanLoadingModal 
        isOpen={showLoadingModal}
        status={loadingStatus}
        progress={loadingProgress}
      />

      <footer className="mt-12 border-t py-6" />
    </div>
    </>
  );
}
