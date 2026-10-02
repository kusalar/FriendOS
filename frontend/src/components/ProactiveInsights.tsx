"use client";

import React, { useState } from "react";
import {
  Zap,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Clock,
  Check,
} from "lucide-react";
import { Insight } from "@/types";

interface ProactiveInsightsProps {
  insights: Insight[];
  onComplete: (commitmentId: number) => Promise<void>;
  onDismiss: (commitmentId: number) => Promise<void>;
  isProcessingId: number | null;
}

export function ProactiveInsights({
  insights,
  onComplete,
  onDismiss,
  isProcessingId,
}: ProactiveInsightsProps) {
  const [expandedWhyIds, setExpandedWhyIds] = useState<Record<number, boolean>>({});

  if (!insights || insights.length === 0) {
    return null;
  }

  const toggleWhy = (commitmentId: number) => {
    setExpandedWhyIds((prev) => ({
      ...prev,
      [commitmentId]: !prev[commitmentId],
    }));
  };

  return (
    <section id="proactive-insights-section" className="space-y-3.5 animate-in fade-in slide-in-from-top-3 duration-300">
      {/* Section Header with pulsating intervention badge */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40">
            <Zap className="w-3.5 h-3.5 fill-amber-400 text-amber-400 animate-pulse" />
          </div>
          <h2 className="text-xs sm:text-sm font-mono uppercase tracking-wider font-bold text-amber-300 flex items-center gap-2">
            <span>YOU MAY BE FORGETTING</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-500/30">
              {insights.length} Unblocked Item{insights.length === 1 ? "" : "s"}
            </span>
          </h2>
        </div>
        <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
          Prerequisite detected as completed
        </span>
      </div>

      {/* Cards List */}
      <div className="space-y-3">
        {insights.map((insight) => {
          const isExpanded = Boolean(expandedWhyIds[insight.commitment_id]);
          const isBusy = isProcessingId === insight.commitment_id;

          return (
            <div
              key={insight.commitment_id}
              className="rounded-2xl border border-amber-500/40 bg-gradient-to-br from-amber-950/20 via-slate-900/90 to-slate-950/95 backdrop-blur-xl p-5 sm:p-6 shadow-[0_4px_30px_-5px_rgba(245,158,11,0.15)] relative overflow-hidden transition-all hover:border-amber-400/60"
            >
              {/* Subtle accent highlight */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-emerald-400 to-amber-500 opacity-80" />

              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="space-y-3 flex-1">
                  {/* Banner tag */}
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 font-semibold">
                      <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
                      <span>Unblocked Task</span>
                    </span>
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-400 text-[11px]">
                      Memory #{insight.source_memory_id} unblocked by #{insight.evidence_memory_id}
                    </span>
                  </div>

                  {/* Task Headline */}
                  <div>
                    <span className="text-[11px] font-mono uppercase text-slate-400 block tracking-wider mb-0.5">
                      Task:
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                      {insight.task}
                    </h3>
                  </div>

                  {/* Dependency & Evidence Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs pt-1">
                    {/* Dependency State */}
                    <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                      <span className="text-slate-400 text-[10px] font-mono uppercase tracking-wider block mb-1">
                        Prerequisite Dependency:
                      </span>
                      <div className="flex items-center gap-2 text-emerald-300 font-semibold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="truncate">{insight.dependency}</span>
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-500/30">
                          ✓ completed
                        </span>
                      </div>
                    </div>

                    {/* Detected Evidence */}
                    <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                      <span className="text-slate-400 text-[10px] font-mono uppercase tracking-wider block mb-1">
                        Detected Evidence:
                      </span>
                      <p className="text-slate-200 italic truncate font-sans">
                        &quot;{insight.evidence}&quot;
                      </p>
                    </div>
                  </div>

                  {/* Suggested Next Action */}
                  <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-start gap-2.5">
                    <ArrowRight className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-semibold block">
                        Suggested Next Action:
                      </span>
                      <p className="text-xs sm:text-sm text-slate-100 font-medium">
                        {insight.suggested_next_action}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right / Bottom Action Buttons */}
                <div className="flex flex-row md:flex-col items-center gap-2 shrink-0 pt-2 md:pt-0">
                  {/* Mark Done Button */}
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => onComplete(insight.commitment_id)}
                    className="flex-1 md:w-36 inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-mono font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 active:bg-emerald-500 disabled:opacity-40 shadow-[0_0_15px_-3px_rgba(52,211,153,0.3)] transition-all"
                  >
                    <Check className="w-4 h-4 stroke-[2.5]" />
                    <span>Mark Done</span>
                  </button>

                  {/* Dismiss Button */}
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => onDismiss(insight.commitment_id)}
                    className="flex-1 md:w-36 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono text-slate-400 hover:text-slate-200 bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Dismiss</span>
                  </button>

                  {/* Why Button */}
                  <button
                    type="button"
                    onClick={() => toggleWhy(insight.commitment_id)}
                    className={`flex-1 md:w-36 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono transition-all ${
                      isExpanded
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                        : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
                    }`}
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                    <span>Why?</span>
                    {isExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5 opacity-70" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                    )}
                  </button>
                </div>
              </div>

              {/* "WHY FRIEND.OS FLAGGED THIS" Expandable Transparent Evidence */}
              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-3 text-xs animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>WHY FRIEND.OS FLAGGED THIS</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      Transparent Memory Audit
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/90 space-y-3 font-sans">
                    {/* Step 1 */}
                    <div className="flex items-start gap-2.5">
                      <span className="font-mono font-bold text-amber-400 mt-0.5">1.</span>
                      <div>
                        <span className="text-slate-400 text-[11px] block">You previously recorded:</span>
                        <p className="text-slate-200 font-medium italic mt-0.5">
                          &quot;{insight.source_text || "Source memory #" + insight.source_memory_id}&quot;
                        </p>
                      </div>
                    </div>

                    {/* Step 2 */}
                    <div className="flex items-start gap-2.5">
                      <span className="font-mono font-bold text-amber-400 mt-0.5">2.</span>
                      <div>
                        <span className="text-slate-400 text-[11px] block">FRIEND.OS extracted:</span>
                        <div className="mt-1 space-y-0.5 font-mono text-[11px]">
                          <div className="text-sky-300">
                            Task → <span className="font-sans font-medium text-slate-200">{insight.task}</span>
                          </div>
                          <div className="text-purple-300">
                            Dependency → <span className="font-sans font-medium text-slate-200">{insight.dependency}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Step 3 */}
                    <div className="flex items-start gap-2.5">
                      <span className="font-mono font-bold text-amber-400 mt-0.5">3.</span>
                      <div>
                        <span className="text-slate-400 text-[11px] block">You later recorded:</span>
                        <p className="text-slate-200 font-medium italic mt-0.5">
                          &quot;{insight.evidence}&quot;
                        </p>
                      </div>
                    </div>

                    {/* Step 4 */}
                    <div className="flex items-start gap-2.5">
                      <span className="font-mono font-bold text-emerald-400 mt-0.5">4.</span>
                      <div>
                        <span className="text-slate-400 text-[11px] block">Therefore:</span>
                        <p className="text-emerald-300 font-medium mt-0.5">
                          The dependency appears completed.
                        </p>
                      </div>
                    </div>

                    {/* Step 5 */}
                    <div className="flex items-start gap-2.5">
                      <span className="font-mono font-bold text-emerald-400 mt-0.5">5.</span>
                      <div>
                        <span className="text-slate-400 text-[11px] block">Suggested next action:</span>
                        <p className="text-slate-100 font-bold mt-0.5">
                          {insight.suggested_next_action}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Evidence verified locally. Zero assumptions or invented data.</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
