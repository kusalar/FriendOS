"use client";

import React from "react";
import { Insight } from "@/types";
import { Check, X, ArrowDown, HelpCircle, Sparkles } from "lucide-react";

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
              {/* Discrete header label */}
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="inline-flex items-center gap-1.5 text-[#e59b38] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#e59b38] animate-pulse" />
                  <span>Something just clicked</span>
                </span>
                <span className="text-slate-500">
                  Prerequisite verified locally
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
