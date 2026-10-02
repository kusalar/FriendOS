"use client";

import React, { useState } from "react";
import { CornerDownLeft, Sparkles, Loader2, Plus } from "lucide-react";

interface MemoryInputProps {
  onRemember: (text: string) => Promise<void>;
  onAnalyze: (text: string) => Promise<void>;
  isSubmitting: boolean;
  isAnalyzing: boolean;
  disabled?: boolean;
}

export function MemoryInput({
  onRemember,
  onAnalyze,
  isSubmitting,
  isAnalyzing,
  disabled = false,
}: MemoryInputProps) {
  const [text, setText] = useState("");

  const handleRememberClick = async () => {
    if (!text.trim() || isSubmitting || disabled) return;
    const value = text.trim();
    setText("");
    await onRemember(value);
  };

  const handleAnalyzeClick = async () => {
    if (!text.trim() || isAnalyzing || disabled) return;
    await onAnalyze(text.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // If Enter without Shift, submit naturally as requested
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleRememberClick();
    }
  };

  return (
    <div className="rounded-2xl border border-[#212330] bg-[#111218] p-5 sm:p-6 shadow-sm transition-all focus-within:border-[#383d52] focus-within:bg-[#13141b]">
      {/* Natural Heading Prompt */}
      <div className="flex items-center justify-between mb-3">
        <label
          htmlFor="natural-memory-composer"
          className="text-xs text-slate-400 font-sans tracking-wide"
        >
          What&apos;s on your mind?
        </label>
        <span className="text-[11px] font-mono text-slate-500 hidden sm:inline">
          Enter ↵ to remember
        </span>
      </div>

      {/* Large Elegant Input Area */}
      <textarea
        id="natural-memory-composer"
        rows={2}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled || isSubmitting}
        placeholder="I'll submit my internship application after I receive my certificate..."
        className="w-full bg-transparent text-slate-100 placeholder-slate-500 text-sm sm:text-base leading-relaxed focus:outline-none resize-none min-h-[58px]"
      />

      {/* Discreet Composer Controls */}
      <div className="flex items-center justify-between pt-3 border-t border-[#1d1f2b] mt-2">
        <div className="flex items-center gap-2">
          {/* Optional subtle Analyze trigger to preserve all Qwen3 functionality */}
          <button
            type="button"
            onClick={handleAnalyzeClick}
            disabled={!text.trim() || isAnalyzing || disabled}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] text-slate-400 hover:text-slate-200 hover:bg-[#1a1b26] disabled:opacity-30 transition-colors"
            title="Inspect structured extraction with Qwen3 4B"
          >
            {isAnalyzing ? (
              <Loader2 className="w-3 h-3 animate-spin text-slate-400" />
            ) : (
              <Sparkles className="w-3 h-3 text-slate-400" />
            )}
            <span>Analyze</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRememberClick}
            disabled={!text.trim() || isSubmitting || disabled}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-950 bg-[#f4f4f5] hover:bg-white active:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>Add memory</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
