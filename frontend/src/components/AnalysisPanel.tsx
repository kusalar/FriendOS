"use client";

import React from "react";
import {
  Sparkles,
  Scale,
  CheckSquare2,
  GitBranch,
  Calendar,
  Zap,
  Activity,
  BookmarkCheck,
  X,
} from "lucide-react";
import { AnalyzeResponse } from "@/types";

interface AnalysisPanelProps {
  analysisData: AnalyzeResponse | null;
  onSaveAnalyzed: (text: string, primaryType?: string) => Promise<void>;
  onClose: () => void;
  isSaving: boolean;
}

export function AnalysisPanel({
  analysisData,
  onSaveAnalyzed,
  onClose,
  isSaving,
}: AnalysisPanelProps) {
  if (!analysisData) return null;

  const { input_text, analysis } = analysisData;

  const items = [
    {
      title: "Decision",
      value: analysis.decision,
      icon: Scale,
      color: "amber",
      borderColor: "border-amber-500/30",
      bgColor: "bg-amber-950/20",
      textColor: "text-amber-400",
      description: "Choices or commitments made",
    },
    {
      title: "Task",
      value: analysis.task,
      icon: CheckSquare2,
      color: "sky",
      borderColor: "border-sky-500/30",
      bgColor: "bg-sky-950/20",
      textColor: "text-sky-400",
      description: "Concrete work to be executed",
    },
    {
      title: "Dependency",
      value: analysis.dependency,
      icon: GitBranch,
      color: "purple",
      borderColor: "border-purple-500/30",
      bgColor: "bg-purple-950/20",
      textColor: "text-purple-400",
      description: "Prerequisite condition or blocker",
    },
    {
      title: "Deadline",
      value: analysis.deadline,
      icon: Calendar,
      color: "rose",
      borderColor: "border-rose-500/30",
      bgColor: "bg-rose-950/20",
      textColor: "text-rose-400",
      description: "Target timestamp or timeframe",
    },
    {
      title: "Next Action",
      value: analysis.next_action,
      icon: Zap,
      color: "emerald",
      borderColor: "border-emerald-500/30",
      bgColor: "bg-emerald-950/20",
      textColor: "text-emerald-400",
      description: "Immediate step to unblock progress",
    },
    {
      title: "Status",
      value: analysis.status,
      icon: Activity,
      color: "indigo",
      borderColor: "border-indigo-500/30",
      bgColor: "bg-indigo-950/20",
      textColor: "text-indigo-400",
      description: "Current observed state",
    },
  ];

  // Determine dominant memory type
  const primaryType = analysis.decision
    ? "decision"
    : analysis.task
    ? "task"
    : analysis.dependency
    ? "dependency"
    : "general";

  return (
    <div className="rounded-2xl border border-indigo-500/40 bg-gradient-to-b from-slate-900/90 via-slate-900/70 to-slate-950/90 backdrop-blur-xl p-5 sm:p-6 shadow-2xl relative overflow-hidden transition-all animate-in fade-in slide-in-from-top-4 duration-300">
      {/* Decorative top accent glow */}
      <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-96 h-20 bg-indigo-500/15 rounded-full blur-2xl pointer-events-none" />

      {/* Header bar */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-950/60 border border-indigo-500/40 text-indigo-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>Qwen3 4B Structured Memory Analysis</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-950 border border-indigo-500/30 text-indigo-300">
                Local Inference
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Zero hallucinations • Fields without explicit evidence return null.
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Dismiss analysis"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Source Text Callout */}
      <div className="mt-4 p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs">
        <span className="text-slate-500 font-mono uppercase tracking-wider text-[10px] block mb-1">
          Analyzed Source Text:
        </span>
        <p className="text-slate-200 italic font-sans leading-relaxed">
          &quot;{input_text}&quot;
        </p>
      </div>

      {/* The 6 Information Cards Grid */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((item, idx) => {
          const Icon = item.icon;
          const hasValue = item.value !== null && item.value !== undefined;

          return (
            <div
              key={idx}
              className={`p-3.5 rounded-xl border ${
                hasValue
                  ? `${item.bgColor} ${item.borderColor}`
                  : "bg-slate-950/40 border-slate-800/60 opacity-60"
              } transition-all flex flex-col justify-between`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={`text-[11px] font-mono font-semibold uppercase tracking-wider ${
                      hasValue ? item.textColor : "text-slate-400"
                    } flex items-center gap-1.5`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.title}</span>
                  </span>
                  {hasValue ? (
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-900/90 text-slate-300 border border-slate-700/60">
                      Identified
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-slate-600">
                      null
                    </span>
                  )}
                </div>

                <div className="mt-2 min-h-[38px] flex items-center">
                  {hasValue ? (
                    <p className="text-sm font-medium text-slate-100 leading-snug">
                      {item.value}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500 italic">
                      Not mentioned in source text
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-2 pt-2 border-t border-slate-800/50 text-[10px] text-slate-400">
                {item.description}
              </div>
            </div>
          );
        })}
      </div>

      {/* Save Analyzed Memory Action Bar */}
      <div className="mt-5 pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-xs text-slate-400 flex items-center gap-2">
          <span>Primary inferred memory type:</span>
          <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700">
            {primaryType}
          </span>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={() => onSaveAnalyzed(input_text, primaryType)}
            disabled={isSaving}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold font-mono text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-40 transition-all shadow-[0_0_15px_-3px_rgba(52,211,153,0.3)]"
          >
            <BookmarkCheck className="w-4 h-4" />
            <span>{isSaving ? "Saving to Memory..." : "Save Analyzed Memory"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
