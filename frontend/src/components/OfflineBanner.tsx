import React from "react";
import { AlertTriangle, Terminal, RefreshCw } from "lucide-react";

interface OfflineBannerProps {
  onRetry: () => void;
  isRetrying: boolean;
}

export function OfflineBanner({ onRetry, isRetrying }: OfflineBannerProps) {
  return (
    <div className="rounded-2xl border border-rose-500/40 bg-gradient-to-r from-rose-950/40 via-slate-900 to-rose-950/30 p-4 sm:p-5 backdrop-blur-md shadow-xl animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-400 mt-0.5">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>FRIEND.OS backend is offline.</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950 border border-rose-800 text-rose-300">
                Disconnected
              </span>
            </h3>
            <p className="text-xs text-slate-300 mt-1">
              Could not connect to FastAPI at{" "}
              <code className="bg-slate-950 px-1 py-0.5 rounded text-rose-300 font-mono">
                http://127.0.0.1:8000
              </code>
              . Ensure both the FastAPI backend and Ollama are running.
            </p>
          </div>
        </div>

        <button
          onClick={onRetry}
          disabled={isRetrying}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-medium text-rose-200 bg-rose-950/60 hover:bg-rose-900/60 border border-rose-500/30 hover:border-rose-400 transition-all shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? "animate-spin text-rose-400" : ""}`} />
          <span>{isRetrying ? "Connecting..." : "Reconnect"}</span>
        </button>
      </div>

      {/* Quick Terminal Command Helpers */}
      <div className="mt-3 pt-3 border-t border-rose-900/30 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
        <div className="flex items-center gap-2 bg-slate-950/60 px-3 py-2 rounded-lg text-slate-300 border border-slate-800">
          <Terminal className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-slate-500">FastAPI:</span>
          <code className="text-emerald-400">
            .\.venv\Scripts\uvicorn.exe backend.main:app --port 8000
          </code>
        </div>
        <div className="flex items-center gap-2 bg-slate-950/60 px-3 py-2 rounded-lg text-slate-300 border border-slate-800">
          <Terminal className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-slate-500">Ollama:</span>
          <code className="text-indigo-400">ollama run qwen3:4b</code>
        </div>
      </div>
    </div>
  );
}
