"use client";

import React from "react";
import { SystemHealth } from "@/types";
import { Play } from "lucide-react";

interface HeaderProps {
  health: SystemHealth | null;
  onOpenSystemInfo: () => void;
  onOpenDemo: () => void;
  unblockedCount?: number;
}

export function Header({
  health,
  onOpenSystemInfo,
  onOpenDemo,
  unblockedCount = 0,
}: HeaderProps) {
  const isOnline = Boolean(health && health.status === "online");

  return (
    <header className="md:hidden border-b border-[#1d1f2a] bg-[#0c0d12]/90 backdrop-blur-md sticky top-0 z-30 px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Subtle Brand Identity */}
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#e59b38]" />
          <h1 className="text-sm font-semibold tracking-tight text-white font-sans">
            FRIEND<span className="text-[#e59b38]">.</span>OS
          </h1>
          <button
            onClick={onOpenSystemInfo}
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono text-slate-400 bg-[#161720] border border-[#232532] ml-1"
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isOnline ? "bg-emerald-400" : "bg-rose-500"
              }`}
            />
            <span>Local</span>
          </button>
        </div>

        {/* Story Button */}
        <button
          type="button"
          onClick={onOpenDemo}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-slate-200 bg-[#171822] hover:bg-[#202230] border border-[#262836] transition-colors"
        >
          <Play className="w-2.5 h-2.5 fill-current text-[#e59b38]" />
          <span>60s Story</span>
        </button>
      </div>
    </header>
  );
}
