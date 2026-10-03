"use client";

import React from "react";
import { Insight, Memory } from "@/types";
import { X, Check, ArrowDown, ShieldCheck, Zap, Sparkles } from "lucide-react";

interface ConnectionPanelProps {
  selectedInsight: Insight | null;
  onClose: () => void;
  onComplete?: (commitmentId: number) => Promise<void>;
  inspectedMemory?: Memory | null;
  isProcessing?: boolean;
}

export function ConnectionPanel({
  selectedInsight,
  onClose,
  onComplete,
  inspectedMemory,
  isProcessing = false,
}: ConnectionPanelProps) {
  // If an insight is selected, render the relational memory connection diagram
  if (selectedInsight) {
    return (
      <aside className="w-full lg:w-80 xl:w-96 shrink-0 border-l border-[#1d1f2a] bg-[#0c0d12] p-6 flex flex-col justify-between space-y-6 overflow-y-auto animate-subtle-in">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#1d1f2a]">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#e59b38]" />
              <span className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
                Memory Connection
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a1b24] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Connected Path Diagram */}
          <div className="space-y-4 font-sans text-xs">
            {/* Step 1: Original Thought */}
            <div className="p-3.5 rounded-xl bg-[#14151d] border border-[#232532] space-y-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block font-semibold">
                1. Your Memory (Commitment)
              </span>
              <p className="text-slate-200 text-xs italic leading-relaxed">
                &quot;{selectedInsight.source_text || `Memory #${selectedInsight.source_memory_id}`}&quot;
              </p>
            </div>

            {/* Connecting Vector 1 */}
            <div className="flex flex-col items-center gap-1 text-[10px] font-mono text-[#e59b38]">
              <div className="w-px h-5 bg-[#e59b38]/40" />
              <span className="px-2 py-0.5 rounded-full bg-[#e59b38]/10 border border-[#e59b38]/20 font-semibold">
                waiting for: {selectedInsight.dependency}
              </span>
              <ArrowDown className="w-3.5 h-3.5" />
            </div>

            {/* Step 2: Evidence Thought / Attempted Action */}
            <div className="p-3.5 rounded-xl bg-[#14151d] border border-[#232532] space-y-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block font-semibold">
                {selectedInsight.type === "reminder" ? "2. Attempted Action Memory" : "2. New Evidence Memory"}
              </span>
              <p className="text-slate-200 text-xs italic leading-relaxed">
                &quot;{selectedInsight.evidence}&quot;
              </p>
            </div>

            {/* Connecting Vector 2 */}
            {selectedInsight.type === "reminder" ? (
              <div className="flex flex-col items-center gap-1 text-[10px] font-mono text-amber-400">
                <div className="w-px h-5 bg-amber-500/40" />
                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 font-semibold">
                  Prerequisite not satisfied yet ⚠
                </span>
                <ArrowDown className="w-3.5 h-3.5" />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1 text-[10px] font-mono text-emerald-400">
                <div className="w-px h-5 bg-emerald-500/40" />
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 font-semibold">
                  Dependency satisfied ✓
                </span>
                <ArrowDown className="w-3.5 h-3.5" />
              </div>
            )}

            {/* Step 3: Realized Action / Guidance */}
            <div
              className={`p-3.5 rounded-xl space-y-1.5 ${
                selectedInsight.type === "reminder"
                  ? "bg-[#1d1914] border border-amber-500/30"
                  : "bg-[#141d1a] border border-emerald-500/30"
              }`}
            >
              <span
                className={`text-[10px] font-mono uppercase tracking-wider block font-semibold ${
                  selectedInsight.type === "reminder" ? "text-amber-400" : "text-emerald-400"
                }`}
              >
                {selectedInsight.type === "reminder" ? "3. Suggested Next Step" : "3. Suggested Next Action"}
              </span>
              <p className="text-slate-100 text-sm font-semibold">
                {selectedInsight.message || selectedInsight.suggested_next_action}
              </p>
            </div>
          </div>
        </div>

        {/* Audit footer & Complete button */}
        <div className="space-y-3 pt-4 border-t border-[#1d1f2a]">
          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Verified locally against SQLite. Zero LLM guesswork.</span>
          </div>

          {onComplete && (
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => onComplete(selectedInsight.commitment_id)}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium text-slate-950 bg-emerald-400 hover:bg-emerald-300 active:bg-emerald-500 disabled:opacity-40 transition-all shadow-sm"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Mark Done</span>
            </button>
          )}
        </div>
      </aside>
    );
  }

  // If a memory is inspected, show memory detail
  if (inspectedMemory) {
    return (
      <aside className="w-full lg:w-80 xl:w-96 shrink-0 border-l border-[#1d1f2a] bg-[#0c0d12] p-6 flex flex-col justify-between space-y-6 overflow-y-auto animate-subtle-in">
        <div className="space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#1d1f2a]">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">
              Memory #{inspectedMemory.id}
            </span>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a1b24] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-xl bg-[#14151d] border border-[#232532] space-y-1">
              <span className="text-[10px] font-mono uppercase text-slate-400 block">Content</span>
              <p className="text-slate-100 text-sm leading-relaxed">&quot;{inspectedMemory.content}&quot;</p>
            </div>

            <div className="p-3 rounded-xl bg-[#14151d] border border-[#232532] flex items-center justify-between">
              <span className="text-slate-400 text-xs">Status:</span>
              <span className="font-mono capitalize text-slate-200">{inspectedMemory.status}</span>
            </div>

            <div className="p-3 rounded-xl bg-[#14151d] border border-[#232532] flex items-center justify-between">
              <span className="text-slate-400 text-xs">Type:</span>
              <span className="font-mono text-slate-200">{inspectedMemory.memory_type}</span>
            </div>
          </div>
        </div>

        <div className="text-[11px] text-slate-500 font-mono">
          Stored locally in SQLite.
        </div>
      </aside>
    );
  }

  // Default calm contextual space
  return (
    <aside className="hidden lg:flex w-72 xl:w-80 shrink-0 border-l border-[#1d1f2a] bg-[#0c0d12] p-6 flex-col justify-between text-xs text-slate-500">
      <div className="space-y-4">
        <div className="text-slate-400 font-medium text-xs tracking-tight">
          Relationship Awareness
        </div>
        <p className="text-slate-400 leading-relaxed font-sans text-xs">
          When you record a plan with a prerequisite, FRIEND.OS monitors your future thoughts for evidence that resolves it.
        </p>

        <div className="p-3.5 rounded-xl bg-[#12131b] border border-[#1e202b] space-y-2 font-mono text-[11px] text-slate-400">
          <div className="flex items-center gap-2 text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-[#e59b38]" />
            <span>Conditional memory</span>
          </div>
          <div className="pl-3.5 border-l border-slate-700 space-y-1">
            <div className="text-slate-400">↓ waiting for event</div>
            <div className="text-emerald-400">✓ unblocked when detected</div>
          </div>
        </div>
      </div>

      <div className="text-[11px] text-slate-500 font-mono pt-4 border-t border-[#1d1f2a]">
        Zero Cloud Relays • Local Qwen3 4B
      </div>
    </aside>
  );
}
