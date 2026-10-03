"use client";

import React from "react";
import { Insight } from "@/types";
import { Check, X, ArrowDown, HelpCircle, Sparkles, Zap } from "lucide-react";

interface ProactiveMomentProps {
  insights: Insight[];
  onComplete: (commitmentId: number) => Promise<void>;
  onDismiss: (commitmentId: number) => Promise<void>;
  onSelectInsight: (insight: Insight) => void;
  selectedInsightId?: number | null;
  isProcessingId: number | null;
}

export function ProactiveMoment({
  insights,
  onComplete,
  onDismiss,
  onSelectInsight,
  selectedInsightId,
  isProcessingId,
}: ProactiveMomentProps) {
  if (!insights || insights.length === 0) {
    return null;
  }

  return (
    <div id="proactive-insights-section" className="space-y-4 animate-subtle-in">
      {insights.map((insight) => {
        const isBusy = isProcessingId === insight.commitment_id;
        const isSelected = selectedInsightId === insight.commitment_id;

        // Visual branch for proactive prerequisite reminder
        if (insight.type === "reminder") {
          return (
            <div
              key={`reminder-${insight.commitment_id}`}
              className={`rounded-2xl border p-5 sm:p-6 transition-all duration-300 relative overflow-hidden ${
                isSelected
                  ? "bg-[#18161d] border-amber-500/60 shadow-[0_0_25px_-5px_rgba(245,158,11,0.15)]"
                  : "bg-[#14131a] border-[#2f2b38] hover:border-amber-500/40"
              }`}
            >
              {/* Warm Amber Accent Glow Line on top */}
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent opacity-80" />

              <div className="space-y-4">
                {/* Prominent 'You're forgetting something…' Header */}
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-[11px] font-mono font-semibold text-amber-300">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 fill-amber-400/40" />
                    <span className="tracking-wide uppercase">{insight.title || "You're forgetting something…"}</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
                    Prerequisite not completed yet
                  </span>
                </div>

                {/* Primary Message & Natural Explanation */}
                <div className="space-y-1.5">
                  <h3 className="text-lg sm:text-xl font-medium tracking-tight text-white">
                    {insight.message || "Complete prerequisite first."}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 font-sans leading-relaxed">
                    {insight.explanation || `You said you'd ${insight.task.toLowerCase()} after ${insight.dependency}.`}
                  </p>
                </div>

                {/* Attempted Context Quote */}
                {insight.evidence && (
                  <div className="p-3 rounded-xl bg-[#0d0d14] border border-[#232130] text-xs text-slate-300 flex items-start gap-2.5">
                    <span className="text-[10px] font-mono text-amber-400/80 uppercase tracking-wider shrink-0 mt-0.5">
                      You noted:
                    </span>
                    <p className="italic text-slate-200 font-sans leading-relaxed">
                      &quot;{insight.evidence}&quot;
                    </p>
                  </div>
                )}

                {/* Actions & Connection Link */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => onSelectInsight(insight)}
                    className="text-xs text-slate-400 hover:text-amber-300 inline-flex items-center gap-1.5 font-medium transition-colors"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>View memory →</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => onDismiss(insight.commitment_id)}
                      className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-slate-200 bg-[#1c1b26] hover:bg-[#252433] border border-[#2b293d] transition-colors"
                    >
                      Dismiss
                    </button>

                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => onComplete(insight.commitment_id)}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-medium text-slate-950 bg-emerald-400 hover:bg-emerald-300 active:bg-emerald-500 disabled:opacity-40 transition-all shadow-sm"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Mark Done</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        }

        return (
          <div
            key={insight.commitment_id}
            className={`rounded-2xl border p-5 sm:p-6 transition-all duration-300 relative overflow-hidden ${
              isSelected
                ? "bg-[#161720] border-[#e59b38]/60 shadow-[0_0_25px_-5px_rgba(229,155,56,0.15)]"
                : "bg-[#13141a] border-[#292c3a] hover:border-[#e59b38]/40"
            }`}
          >
            {/* Subtle Accent Glow Line on top */}
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#e59b38] to-transparent opacity-75" />

            <div className="space-y-4">
              {/* Prominent 'What Am I Forgetting?' Header */}
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#e59b38]/15 border border-[#e59b38]/30 text-[11px] font-mono font-semibold text-[#e59b38]">
                  <Zap className="w-3.5 h-3.5 fill-[#e59b38] animate-pulse" />
                  <span className="uppercase tracking-wider">YOU MAY BE FORGETTING</span>
                </div>
                <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
                  Prerequisite completed locally
                </span>
              </div>

              {/* Conversational realization */}
              <div className="space-y-1">
                <h3 className="text-lg sm:text-xl font-medium tracking-tight text-white">
                  You can now <span className="text-[#f4f4f5] underline decoration-[#e59b38]/60 underline-offset-4 font-semibold">{insight.task}</span>.
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 font-sans leading-relaxed">
                  You were waiting for <span className="text-slate-200 font-medium">{insight.dependency}</span>.
                </p>
              </div>

              {/* Verified Evidence quote */}
              <div className="p-3 rounded-xl bg-[#0c0d12] border border-[#20222f] text-xs text-slate-300 flex items-start gap-2.5">
                <span className="text-[10px] font-mono text-[#e59b38] uppercase tracking-wider shrink-0 mt-0.5">
                  Evidence:
                </span>
                <p className="italic text-slate-200 font-sans leading-relaxed">
                  &quot;{insight.evidence}&quot;
                </p>
              </div>

              {/* Actions & Connection Link */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => onSelectInsight(insight)}
                  className="text-xs text-slate-400 hover:text-[#e59b38] inline-flex items-center gap-1.5 font-medium transition-colors"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Why am I seeing this? →</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => onDismiss(insight.commitment_id)}
                    className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-slate-200 bg-[#191a24] hover:bg-[#202230] border border-[#272938] transition-colors"
                  >
                    Dismiss
                  </button>

                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => onComplete(insight.commitment_id)}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-medium text-slate-950 bg-emerald-400 hover:bg-emerald-300 active:bg-emerald-500 disabled:opacity-40 transition-all shadow-sm"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Mark Done</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
