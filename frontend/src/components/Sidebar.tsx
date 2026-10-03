"use client";

import React, { useState } from "react";
import {
  Layers,
  Zap,
  CheckCircle2,
  Archive,
  Search,
  Sparkles,
  Play,
  RotateCcw,
  SlidersHorizontal,
  Trash2,
  AlertTriangle,
  X,
} from "lucide-react";
import { SystemHealth } from "@/types";

interface SidebarProps {
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  unblockedCount: number;
  totalCount: number;
  onOpenDemo: () => void;
  onOpenSystemInfo: () => void;
  health: SystemHealth | null;
  onResetDatabase?: () => Promise<void>;
}

export function Sidebar({
  statusFilter,
  onStatusFilterChange,
  searchQuery,
  onSearchChange,
  unblockedCount,
  totalCount,
  onOpenDemo,
  onOpenSystemInfo,
  health,
  onResetDatabase,
}: SidebarProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const isOnline = Boolean(health && health.status === "online");

  const navItems = [
    { id: "all", label: "All memories", icon: Layers, count: totalCount },
    {
      id: "unblocked",
      label: "What am I forgetting?",
      icon: Zap,
      count: unblockedCount,
      highlight: unblockedCount > 0,
    },
    { id: "completed", label: "Completed", icon: CheckCircle2 },
    { id: "archived", label: "Archived", icon: Archive },
  ];

  return (
    <aside className="w-full md:w-64 lg:w-72 shrink-0 flex flex-col justify-between border-r border-[#1d1f2a] bg-[#0c0d12] p-5 space-y-6">
      {/* Brand & Search */}
      <div className="space-y-6">
        {/* Subtle Brand Identity */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#e59b38]" />
            <h1 className="text-base font-semibold tracking-tight text-white font-sans">
              FRIEND<span className="text-[#e59b38]">.</span>OS
            </h1>
          </div>
          <button
            onClick={onOpenSystemInfo}
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-mono text-slate-400 hover:text-slate-200 bg-[#161720] hover:bg-[#1f212c] border border-[#232532] transition-colors"
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isOnline ? "bg-emerald-400" : "bg-rose-500"
              }`}
            />
            <span>Local</span>
          </button>
        </div>

        {/* Minimal Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search memory..."
            className="w-full bg-[#14151d] border border-[#212330] rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#383c4e] transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 hover:text-slate-300 font-mono"
            >
              esc
            </button>
          )}
        </div>

        {/* Navigation list */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = statusFilter === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onStatusFilterChange(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? "bg-[#181922] text-white shadow-sm font-semibold"
                    : "text-slate-400 hover:text-slate-200 hover:bg-[#14151d]"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={`w-3.5 h-3.5 ${
                      item.highlight
                        ? "text-[#e59b38]"
                        : isActive
                        ? "text-white"
                        : "text-slate-500"
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.count !== undefined && item.count > 0 && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                      item.highlight
                        ? "bg-[#e59b38]/20 text-[#e59b38] font-bold"
                        : "text-slate-500 bg-[#1e202a]"
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Dangerous Action below Archived */}
        <div className="pt-2 border-t border-[#1a1b24]">
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-rose-400/60 hover:text-rose-400 hover:bg-rose-950/20 transition-all text-left group"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400/50 group-hover:text-rose-400 transition-colors shrink-0" />
            <span>Delete database</span>
          </button>
        </div>
      </div>

      {/* Demo Mode & Footer */}
      <div className="space-y-3 pt-4 border-t border-[#1d1f2a]">
        {/* Story Button */}
        <button
          onClick={onOpenDemo}
          className="w-full group flex items-center justify-between p-3 rounded-xl bg-[#14151f] hover:bg-[#191a26] border border-[#242636] hover:border-[#34374a] transition-all text-left"
        >
          <div className="space-y-0.5">
            <span className="text-[10px] font-mono uppercase text-[#e59b38] tracking-wider font-semibold block">
              Guided tour
            </span>
            <span className="text-xs text-slate-200 group-hover:text-white font-medium block">
              Try a 60-second story →
            </span>
          </div>
          <div className="w-6 h-6 rounded-full bg-[#1e202d] group-hover:bg-[#282b3d] flex items-center justify-center text-slate-300 transition-colors">
            <Play className="w-2.5 h-2.5 fill-current ml-0.5" />
          </div>
        </button>

        {/* Quiet footer line */}
        <div className="px-1 text-[11px] text-slate-500 font-sans leading-relaxed">
          A living memory space that remembers what was waiting for what.
        </div>
      </div>

      {/* Delete Database Confirmation Modal */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
          onClick={() => !isDeleting && setShowDeleteModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-[#14151e] border border-[#2b2d3d] p-6 shadow-2xl relative font-sans animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-2.5 text-rose-400">
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                </div>
                <h3 className="text-base font-semibold text-white">Delete your FRIEND.OS database?</h3>
              </div>
              <button
                type="button"
                onClick={() => !isDeleting && setShowDeleteModal(false)}
                className="text-slate-500 hover:text-slate-300 transition-colors p-1"
                disabled={isDeleting}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-6">
              This permanently deletes all memories, commitments, evidence relationships, and local history. This cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1f212c]">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-[#1f212c] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!onResetDatabase) return;
                  setIsDeleting(true);
                  try {
                    await onResetDatabase();
                    setShowDeleteModal(false);
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-medium text-white bg-rose-600 hover:bg-rose-500 active:bg-rose-700 transition-colors shadow-sm disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete database"}
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
