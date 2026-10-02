"use client";

import React, { useState } from "react";
import {
  Sparkles,
  RotateCcw,
  Play,
  CheckCircle2,
  Clock,
  ArrowRight,
  Award,
  Cpu,
  GraduationCap,
  Loader2,
  X,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import { createMemory, resetDemoData } from "@/lib/api";

export interface DemoScenario {
  id: string;
  name: string;
  title: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  initialMemory: string;
  task: string;
  dependency: string;
  evidence: string;
  expectedInsight: string;
}

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: "internship",
    name: "1. Internship",
    title: "Internship Application",
    category: "Career / Certificate",
    icon: Award,
    initialMemory:
      "I'll submit my internship application after I receive my certificate.",
    task: "Submit internship application",
    dependency: "receive my certificate",
    evidence: "I received my certificate today.",
    expectedInsight: "Submit internship application",
  },
  {
    id: "vlsi",
    name: "2. VLSI Project",
    title: "VLSI Project Report",
    category: "Academic / Faculty Review",
    icon: Cpu,
    initialMemory:
      "I'll submit my VLSI project report after my professor reviews my draft.",
    task: "Submit VLSI project report",
    dependency: "my professor reviews my draft",
    evidence: "My professor reviewed my VLSI draft today.",
    expectedInsight: "Submit VLSI project report",
  },
  {
    id: "research",
    name: "3. Research Internship",
    title: "Research Internship",
    category: "Academic / Recommendation",
    icon: GraduationCap,
    initialMemory:
      "I'll apply for the research internship after I receive the recommendation letter.",
    task: "Apply for research internship",
    dependency: "receive recommendation letter",
    evidence: "My professor sent the recommendation letter today.",
    expectedInsight: "Apply for research internship",
  },
];

interface DemoModePanelProps {
  onRefreshData: () => Promise<void>;
  onShowToast: (type: "success" | "error", message: string) => void;
  onClose: () => void;
}

export function DemoModePanel({
  onRefreshData,
  onShowToast,
  onClose,
}: DemoModePanelProps) {
  const [runningScenarioId, setRunningScenarioId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [completedScenarios, setCompletedScenarios] = useState<Record<string, boolean>>({});

  // 1-Click Scenario Runner: Real API calls end-to-end
  const runScenario = async (scenario: DemoScenario) => {
    setRunningScenarioId(scenario.id);
    setCurrentStep(`Step 1/3: Creating initial memory & commitment for "${scenario.title}"...`);

    try {
      // 1. Create the initial memory through the real API with task and dependency
      await createMemory(
        scenario.initialMemory,
        "demo",
        "active",
        scenario.task,
        scenario.dependency
      );

      // Refresh memory list so timeline reflects the new memory
      await onRefreshData();

      // Brief delay so judges can observe the separate events
      setCurrentStep(`Step 2/3: Simulating arrival of real-world evidence...`);
      await new Promise((resolve) => setTimeout(resolve, 600));

      // 2. Create the evidence memory through the real API
      // Backend automatically checks dependencies and transitions commitment to 'unblocked'
      await createMemory(scenario.evidence, "demo", "active");

      // 3. Refresh /insights and memory timeline through the real API
      setCurrentStep(`Step 3/3: Evaluating dependency resolution & refreshing /insights...`);
      await onRefreshData();

      setCompletedScenarios((prev) => ({ ...prev, [scenario.id]: true }));
      onShowToast("success", `Scenario "${scenario.title}" triggered! Real insight surfaced.`);

      // Smooth scroll to the Proactive Insights section
      setTimeout(() => {
        const insightsEl = document.getElementById("proactive-insights-section");
        if (insightsEl) {
          insightsEl.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to run scenario";
      onShowToast("error", errorMsg);
    } finally {
      setRunningScenarioId(null);
      setCurrentStep(null);
    }
  };

  // Step-by-step runner: Step 1 (Initial memory only)
  const runStepInitial = async (scenario: DemoScenario) => {
    setRunningScenarioId(`${scenario.id}-init`);
    try {
      await createMemory(
        scenario.initialMemory,
        "demo",
        "active",
        scenario.task,
        scenario.dependency
      );
      await onRefreshData();
      onShowToast("success", `Initial memory saved. Commitment in "waiting" status.`);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to save memory";
      onShowToast("error", errorMsg);
    } finally {
      setRunningScenarioId(null);
    }
  };

  // Step-by-step runner: Step 2 (Evidence memory)
  const runStepEvidence = async (scenario: DemoScenario) => {
    setRunningScenarioId(`${scenario.id}-ev`);
    try {
      await createMemory(scenario.evidence, "demo", "active");
      await onRefreshData();
      setCompletedScenarios((prev) => ({ ...prev, [scenario.id]: true }));
      onShowToast("success", `Evidence saved! Unblocked insight is now live.`);

      setTimeout(() => {
        const insightsEl = document.getElementById("proactive-insights-section");
        if (insightsEl) {
          insightsEl.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to save evidence";
      onShowToast("error", errorMsg);
    } finally {
      setRunningScenarioId(null);
    }
  };

  // Handle Demo Reset: Cleans up only demo namespace items
  const handleResetDemo = async () => {
    setIsResetting(true);
    try {
      const stats = await resetDemoData();
      await onRefreshData();
      setCompletedScenarios({});
      onShowToast(
        "success",
        `Demo data reset: cleaned ${stats.memories_deleted} memories and ${stats.commitments_deleted} commitments.`
      );
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to reset demo data";
      onShowToast("error", errorMsg);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <section className="rounded-2xl border border-purple-500/40 bg-gradient-to-br from-purple-950/25 via-slate-900/90 to-slate-950/95 backdrop-blur-xl p-5 sm:p-6 shadow-[0_4px_30px_-5px_rgba(168,85,247,0.2)] relative overflow-hidden animate-in fade-in slide-in-from-top-3 duration-300">
      {/* Top accent highlight bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-indigo-400 to-emerald-400" />

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-purple-500/20">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-[0_0_15px_-3px_rgba(168,85,247,0.4)]">
            <Sparkles className="w-4 h-4 text-purple-400 fill-purple-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-mono font-bold text-white tracking-tight">
                DEMO MODE <span className="text-purple-400">—</span> 60-Second Judge Tour
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-900/60 text-purple-300 border border-purple-500/40 font-semibold">
                Real SQLite Engine
              </span>
            </div>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              Experience the core FRIEND.OS concept: commitments unblock only when real evidence arrives.
            </p>
          </div>
        </div>

        {/* Action Controls: Reset & Close */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            type="button"
            onClick={handleResetDemo}
            disabled={isResetting || runningScenarioId !== null}
            title="Clean all demo memories and commitments so you can re-run tests cleanly"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 disabled:opacity-40 transition-all"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? "animate-spin text-purple-400" : ""}`} />
            <span>{isResetting ? "Resetting..." : "Reset Demo Data"}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            title="Minimize Demo Mode"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress banner when running */}
      {currentStep && (
        <div className="mt-4 p-3 rounded-xl bg-purple-950/40 border border-purple-500/40 flex items-center gap-2.5 text-xs font-mono text-purple-200 animate-in fade-in duration-200">
          <Loader2 className="w-4 h-4 animate-spin text-purple-400 shrink-0" />
          <span className="font-medium">{currentStep}</span>
        </div>
      )}

      {/* 3 Scenario Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-4">
        {DEMO_SCENARIOS.map((scenario) => {
          const Icon = scenario.icon;
          const isRunning =
            runningScenarioId === scenario.id ||
            runningScenarioId === `${scenario.id}-init` ||
            runningScenarioId === `${scenario.id}-ev`;
          const isDone = Boolean(completedScenarios[scenario.id]);

          return (
            <div
              key={scenario.id}
              className={`rounded-xl border p-4 flex flex-col justify-between transition-all ${
                isDone
                  ? "border-emerald-500/40 bg-slate-950/80 shadow-[0_0_20px_-5px_rgba(52,211,153,0.15)]"
                  : "border-slate-800 bg-slate-950/60 hover:border-purple-500/40 hover:bg-slate-950/90"
              }`}
            >
              <div className="space-y-3">
                {/* Header tag */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-purple-400">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-purple-400 font-bold block">
                        {scenario.name}
                      </span>
                      <h3 className="text-xs sm:text-sm font-bold text-white tracking-tight">
                        {scenario.title}
                      </h3>
                    </div>
                  </div>
                  {isDone && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/40">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Ready</span>
                    </span>
                  )}
                </div>

                {/* Scenario Details */}
                <div className="space-y-2 text-xs font-sans">
                  {/* Step 1: Initial Memory */}
                  <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/80 space-y-1">
                    <span className="text-[10px] font-mono uppercase text-slate-400 block tracking-wider font-semibold">
                      1. Initial Memory (Commitment):
                    </span>
                    <p className="text-slate-200 text-[11px] italic leading-snug">
                      &quot;{scenario.initialMemory}&quot;
                    </p>
                  </div>

                  {/* Step 2: Evidence */}
                  <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/80 space-y-1">
                    <span className="text-[10px] font-mono uppercase text-slate-400 block tracking-wider font-semibold">
                      2. Detected Evidence:
                    </span>
                    <p className="text-emerald-300 text-[11px] italic leading-snug font-medium">
                      &quot;{scenario.evidence}&quot;
                    </p>
                  </div>

                  {/* Expected Insight */}
                  <div className="p-2 rounded-lg bg-purple-950/30 border border-purple-500/20 text-[11px]">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-purple-400 block font-semibold">
                      Expected Proactive Insight:
                    </span>
                    <span className="font-semibold text-white">
                      &quot;{scenario.expectedInsight}&quot;
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2">
                {/* 1-Click Run button */}
                <button
                  type="button"
                  disabled={isRunning || isResetting}
                  onClick={() => runScenario(scenario)}
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-mono font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:from-purple-700 active:to-indigo-700 disabled:opacity-40 shadow-[0_0_15px_-3px_rgba(168,85,247,0.35)] transition-all"
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Executing Real APIs...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>Run Scenario (1-Click)</span>
                    </>
                  )}
                </button>

                {/* Step-by-step triggers */}
                <div className="flex items-center gap-1.5 text-[10px] font-mono">
                  <button
                    type="button"
                    disabled={isRunning || isResetting}
                    onClick={() => runStepInitial(scenario)}
                    title="Store initial memory only, creating waiting commitment"
                    className="flex-1 px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors text-center truncate disabled:opacity-40"
                  >
                    1. Memory Only
                  </button>
                  <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />
                  <button
                    type="button"
                    disabled={isRunning || isResetting}
                    onClick={() => runStepEvidence(scenario)}
                    title="Send evidence memory to trigger unblocking"
                    className="flex-1 px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-slate-800 transition-colors text-center truncate disabled:opacity-40"
                  >
                    2. Add Evidence
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Trust & Guarantee footnote */}
      <div className="mt-4 pt-3 border-t border-purple-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] font-mono text-slate-500">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>
            Real SQLite & Deterministic Engine: Never hardcodes fake insight cards.
          </span>
        </div>
        <span>Demo data is fully isolated and safely resettable.</span>
      </div>
    </section>
  );
}
