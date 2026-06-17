import React, { useState } from "react";
import { Sparkles, LayoutList } from "lucide-react";
import UploadForm from "./components/UploadForm";
import AgendaViewer from "./components/AgendaViewer";
import { MeetingAgenda } from "./types";
import { motion, AnimatePresence } from "motion/react";

const DEMO_DOC_RETR0 = `SUMMARY REPORT: ANNUAL STRATEGIC PLANNING BRIEF (FY26)
Prepared by: Sarah Jenkins, VP of Operations
Stakeholders Involved: Design Leads, Lead Architects, Engineering Team, Product Managers, Executive Leadership

1. STRATEGIC BACKGROUND
The critical objective of this annual planning cycle is our transition from standalone desktop templates to full-cloud containerized deployments. In public surveys, users have flagged performance lag and lack of document cooperation. Transitioning of this architecture is estimated to boost daily engagement rates by 22% and secure our compliance with new standards.

2. COMPONENT DEEP-DIVE: CONTAINERIZATION & COLD-STARTS
Lead Architects to present the proposed Kubernetes node configuration.
Key challenges:
- High server cold-start delays (currently peaking at 6.1s).
- Unsynchronized regional user state.
- Stakeholders involved: Dave Ross (Lead Architect), Sarah Jenkins (Operations).
- Actions for this section: Dave is to bring a performance chart outlining resource limits. Sarah must sign off on budget guidelines for regional compute units.

3. COOPERATIVE ANNOTATION & MULTIPLAYER CANVAS
Our designer teams have completed mockup outlines of a shared whiteboard canvas where teammates can live-mark blueprints.
We must aligning these concepts with engineering feasibility constraints:
- Stakeholders involved: Maya Patel (Design Lead), Kenji Soto (Lead Engineer).
- Actions for this section: Maya is to show an interactive slide of the canvas structure. Kenji will present a live socket benchmark test from the sandboxed server environment.

4. NEXT STEPS & MILESTONES
Concluding timelines: Alpha build scheduled for late August, Beta launch in October. Production transition slated for early November.
- Stakeholders involved: Executive Leadership, Product Managers, Sarah Jenkins.
- Actions for this section: Product Managers will map resource loads and assign detailed task logs inside Jira.Executive Leadership needs to approve the tentative timeline layout.`;

const DEMO_DOC_SYSTEM = `SYSTEM ARCHITECTURE DRAFT: CLIENT MESSAGING BACKEND OVERHAUL
Created by: Marcus Chen, Principal Software Engineer
Stakeholders: Security Compliance Team, Database Administrators, Marcus Chen, Client Success Directors

OBJECTIVES
We need to completely replace our heritage message queueing service with modern event-driven messaging pipelines. Our legacy storage is running at 88% capacities and query lookups are delaying client response times.

DEBATED SECTIONS
A. Database Schema Redesign:
- Switch to structured tables to allow rich telemetry querying.
- Stakeholders: Marcus Chen (Principal Engineer), Database Administrators (DBAs).
- Action requested: DBAs must outline a migration script preview that prevents locking active records during rollout.

B. Client Privacy & Data Authorization Controls:
- Implementation of standardized OAuth connections.
- Strict token handling on secure servers only.
- Stakeholders: Security Compliance Team, Client Success Directors.
- Action requested: Security compliance must review OAuth authorization specs and provide a completed risk summary report.`;

export default function App() {
  const [agenda, setAgenda] = useState<MeetingAgenda | null>(null);
  const [initialTime, setInitialTime] = useState(60);
  const [isLoading, setIsLoading] = useState(false);
  const [errorStatus, setErrorStatus] = useState("");

  const handleGenerateAgenda = async (payload: {
    fileBase64?: string;
    fileName?: string;
    fileType?: string;
    textPaste?: string;
    initialTime: number;
  }) => {
    setIsLoading(true);
    setErrorStatus("");
    setInitialTime(payload.initialTime);

    try {
      const response = await fetch("/api/generate-agenda", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileBase64: payload.fileBase64,
          fileName: payload.fileName,
          fileType: payload.fileType,
          textPaste: payload.textPaste,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to formulate agenda. Ensure your files or text is valid.");
      }

      const result = await response.json();
      if (result.success && result.data) {
        setAgenda(result.data);
      } else {
        throw new Error("Invalid format received from the facilitator service.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorStatus(err.message || "An unexpected network or extraction error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50/70 text-neutral-800 flex flex-col font-sans">
      
      {/* Visual background accents */}
      <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-neutral-100 to-transparent pointer-events-none -z-10" />

      {/* Header Bar */}
      <header className="border-b border-neutral-200/80 bg-white/70 backdrop-blur-md sticky top-0 z-40 print:hidden">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-neutral-900 rounded-xl flex items-center justify-center text-white font-black shadow-sm">
              🚀
            </div>
            <div>
              <h1 className="text-sm font-extrabold tracking-tight text-neutral-900 uppercase">
                Agendacraft
              </h1>
              <p className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider -mt-0.5">
                Meeting Facilitator AI
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[10px] sm:text-xs font-semibold px-2.5 py-1 bg-amber-50 rounded-xl border border-amber-200 text-amber-700 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-amber-500 animate-pulse" />
              Gemini 3.5 Assistant
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 md:px-6 py-8 md:py-12 transition-all">
        
        <AnimatePresence mode="wait">
          {!agenda ? (
            <motion.div
              key="generation-dashboard"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="space-y-10"
            >
              {/* Product Hero Banner */}
              <div className="max-w-3xl text-center md:text-left space-y-3.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-neutral-100 text-neutral-600 rounded-full border border-neutral-200/60 text-xs font-bold leading-none">
                  ⚡ Full-Stack Interactive Facilitation
                </span>
                <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-neutral-900 leading-[1.1]">
                  Turn complex team briefs into <span className="text-transparent bg-clip-text bg-gradient-to-r from-neutral-900 to-indigo-600">actionable agendas</span>
                </h2>
                <p className="text-base text-neutral-500 max-w-2xl leading-relaxed">
                  Upload a Word (.docx), Markdown (.md), or raw meeting minutes document. Our assistant instantly constructs structured topics, extracts action plans, correlates stakeholder responsibilities, and divides time budgets precisely.
                </p>
              </div>

              {/* Grid: Upload form + Demo cards */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Custom Uploader component */}
                <div className="lg:col-span-7">
                  <UploadForm onGenerate={handleGenerateAgenda} isLoading={isLoading} />
                </div>

                {/* Quick trial demo decks */}
                <div className="lg:col-span-5 space-y-6">
                  <div className="bg-white border border-neutral-200/80 rounded-2xl p-6 shadow-sm">
                    <h3 className="font-bold text-neutral-800 text-sm mb-1.5 flex items-center gap-2">
                      <LayoutList className="w-4 h-4 text-indigo-500" />
                      Try a Pre-filled Demo Document
                    </h3>
                    <p className="text-xs text-neutral-400 mb-4 leading-relaxed">
                      Don't have a report handy? Load of our business layouts straight into pasting canvas to see the synthesizer in action.
                    </p>

                    <div className="space-y-3">
                      <div className="border border-neutral-150 p-4 rounded-xl hover:border-indigo-400/70 hover:bg-neutral-50/50 transition-all cursor-pointer relative group"
                           onClick={() => handleGenerateAgenda({ textPaste: DEMO_DOC_RETR0, initialTime: 60 })}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-neutral-800">
                            FY26 Strategic Planning Brief
                          </span>
                          <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-lg font-bold">
                            60 Min
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-500 mt-1 line-clamp-2">
                          Annual planning detailing transitions to cloud nodes, cold-start engineering debates, and designer whiteboard mocks.
                        </p>
                      </div>

                      <div className="border border-neutral-150 p-4 rounded-xl hover:border-indigo-400/70 hover:bg-neutral-50/50 transition-all cursor-pointer relative group"
                           onClick={() => handleGenerateAgenda({ textPaste: DEMO_DOC_SYSTEM, initialTime: 45 })}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-neutral-800">
                            Messaging Overhaul Specs
                          </span>
                          <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-lg font-bold">
                            45 Min
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-500 mt-1 line-clamp-2">
                          Technical engineering brief detailing database transitions, queue locking systems, and API verification audits.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Operational values */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white border border-neutral-150 p-4 rounded-2xl">
                      <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">
                        Precision Ratios
                      </h4>
                      <p className="text-xs text-neutral-600 leading-relaxed font-semibold">
                        Automatic time-budget balancing sums exact integers.
                      </p>
                    </div>
                    <div className="bg-white border border-neutral-150 p-4 rounded-2xl">
                      <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">
                        Active Support
                      </h4>
                      <p className="text-xs text-neutral-600 leading-relaxed font-semibold">
                        Integrated stopwatch player facilitates pacing.
                      </p>
                    </div>
                  </div>
                </div>

              </div>

              {/* Main operational errors */}
              {errorStatus && (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3">
                  <div className="w-1.5 h-1.5 bg-rose-500 rounded-full mt-2" />
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-rose-800">FACILITATOR SYNTHESIS ERROR</h4>
                    <p className="text-xs text-rose-700 font-medium">{errorStatus}</p>
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="agenda-dashboard"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              <AgendaViewer 
                agenda={agenda} 
                initialTime={initialTime} 
                onBack={() => setAgenda(null)} 
              />
            </motion.div>
          )}
        </AnimatePresence>

      </main>

      {/* Simple, literal footer */}
      <footer className="mt-auto border-t border-neutral-200 bg-white py-6 text-center text-xs text-neutral-400 print:hidden">
        <p className="font-semibold tracking-tight uppercase">Meeting Agenda Crafter — Grounded with Gemini & Express</p>
      </footer>
    </div>
  );
}
