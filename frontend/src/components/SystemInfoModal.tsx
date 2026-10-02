"use client";

import React from "react";
import { X, HardDrive, Cpu, ShieldCheck, RefreshCw, CheckCircle2 } from "lucide-react";
import { SystemHealth } from "@/types";

interface SystemInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  health: SystemHealth | null;
  isChecking: boolean;
  onRefreshHealth: () => void;
}

export function SystemInfoModal({
  isOpen,
  onClose,
  health,
  isChecking,
  onRefreshHealth,
}: SystemInfoModalProps) {
  if (!isOpen) return null;

  const isOnline = Boolean(health && health.status === "online");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-subtle-in">
      <div className="relative w-full max-w-md bg-[#13141b] border border-[#232532] rounded-2xl shadow-2xl p-6 text-slate-100 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#232532]">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                isOnline ? "bg-emerald-400" : "bg-rose-500"
              }`}
            />
            <h3 className="text-sm font-medium tracking-tight text-white">System &amp; Privacy</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#1f212c] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status items */}
        <div className="space-y-3 text-xs">
          {/* Local AI */}
          <div className="flex items-start gap-3 p-3 rounded-xl bg-[#191a24] border border-[#262836]">
            <Cpu className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
            <div className="flex-1">
              <span className="text-slate-400 block font-mono text-[10px] uppercase tracking-wider">Local AI Engine</span>
              <span className="text-slate-200 font-medium text-xs">
                {isOnline ? "Qwen3 4B via Ollama" : "Ollama Offline"}
              </span>
              <p className="text-slate-400 text-[11px] mt-0.5 leading-snug">
                Extracts structured relationships entirely on this machine.
              </p>
            </div>
          </div>

          {/* SQLite DB */}
          <div className="flex items-start gap-3 p-3 rounded-xl bg-[#191a24] border border-[#262836]">
            <HardDrive className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
            <div className="flex-1">
              <span className="text-slate-400 block font-mono text-[10px] uppercase tracking-wider">Database</span>
              <span className="text-slate-200 font-medium text-xs">SQLite Local (friend_os.db)</span>
              <p className="text-slate-400 text-[11px] mt-0.5 leading-snug">
                Stores your thoughts and commitments on your local filesystem.
              </p>
            </div>
          </div>

          {/* Privacy */}
          <div className="flex items-start gap-3 p-3 rounded-xl bg-[#191a24] border border-[#262836]">
            <ShieldCheck className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            <div className="flex-1">
              <span className="text-slate-400 block font-mono text-[10px] uppercase tracking-wider">Privacy</span>
              <span className="text-slate-200 font-medium text-xs">Zero Cloud Relays</span>
              <p className="text-slate-400 text-[11px] mt-0.5 leading-snug">
                No third-party telemetry, OpenAI keys, or external APIs are used.
              </p>
            </div>
          </div>
        </div>

        {/* Footer info & refresh */}
        <div className="flex items-center justify-between pt-2 border-t border-[#232532] text-xs">
          <span className="text-[11px] text-slate-500 font-mono">FRIEND.OS v0.2</span>
          <button
            onClick={onRefreshHealth}
            disabled={isChecking}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-slate-300 hover:text-white bg-[#1a1b26] border border-[#282a38] text-[11px] transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isChecking ? "animate-spin text-emerald-400" : ""}`} />
            <span>Check connection</span>
          </button>
        </div>
      </div>
    </div>
  );
}
