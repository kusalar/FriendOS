import React from "react";
import { Cpu, Database, ShieldOff, Sparkles } from "lucide-react";

export function TrustBanner() {
  return (
    <section className="rounded-2xl border border-slate-800/80 bg-gradient-to-b from-slate-900/60 to-slate-950/60 backdrop-blur-md p-4 sm:p-5 relative overflow-hidden">
      {/* Subtle ambient light */}
      <div className="absolute top-0 right-1/4 w-64 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-64 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 relative z-10">
        {/* Local AI */}
        <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-slate-900/40 border border-slate-800/60 hover:border-emerald-500/30 transition-colors">
          <div className="p-2 rounded-lg bg-emerald-950/50 border border-emerald-500/30 text-emerald-400 mt-0.5">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] font-mono tracking-wider uppercase text-emerald-400 font-semibold">
              LOCAL AI
            </div>
            <div className="text-sm font-semibold text-slate-100 mt-0.5">
              Qwen3 4B
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              Running directly on this device via Ollama. No remote servers.
            </div>
          </div>
        </div>

        {/* Private Memory */}
        <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-slate-900/40 border border-slate-800/60 hover:border-indigo-500/30 transition-colors">
          <div className="p-2 rounded-lg bg-indigo-950/50 border border-indigo-500/30 text-indigo-400 mt-0.5">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] font-mono tracking-wider uppercase text-indigo-400 font-semibold">
              PRIVATE MEMORY
            </div>
            <div className="text-sm font-semibold text-slate-100 mt-0.5">
              SQLite Storage
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              Persisted locally at <code className="text-[11px] bg-slate-800 px-1 py-0.5 rounded text-slate-300">data/friend_os.db</code>.
            </div>
          </div>
        </div>

        {/* No Cloud AI */}
        <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-slate-900/40 border border-slate-800/60 hover:border-slate-700 transition-colors">
          <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/60 text-slate-300 mt-0.5">
            <ShieldOff className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-[11px] font-mono tracking-wider uppercase text-slate-400 font-semibold flex items-center gap-1.5">
              <span>ZERO CLOUD</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
            </div>
            <div className="text-sm font-semibold text-slate-100 mt-0.5">
              No Cloud AI
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              Your conversations, decisions, and tasks never leave this computer.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
