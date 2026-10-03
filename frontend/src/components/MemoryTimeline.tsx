"use client";

import React, { useState, useEffect } from "react";
import { Memory, MemoryStatus } from "@/types";
import { Check, Archive, RotateCcw, MoreHorizontal, Eye, Trash2, AlertTriangle, X } from "lucide-react";

interface MemoryTimelineProps {
  memories: Memory[];
  isLoading: boolean;
  searchQuery: string;
  onUpdateStatus: (id: number, status: MemoryStatus) => Promise<void>;
  onDeleteMemory?: (id: number) => Promise<void>;
  onInspectMemory?: (memory: Memory) => void;
  activeMemoryId?: number | null;
  connectedMemoryIds?: Set<number>;
}

export function MemoryTimeline({
  memories,
  isLoading,
  searchQuery,
  onUpdateStatus,
  onDeleteMemory,
  onInspectMemory,
  activeMemoryId,
  connectedMemoryIds = new Set(),
}: MemoryTimelineProps) {
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [memoryToDelete, setMemoryToDelete] = useState<Memory | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Close open dropdown or dialog on outside click or Escape
  useEffect(() => {
    const handleGlobalClick = () => setOpenMenuId(null);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenMenuId(null);
        if (!isDeleting) setMemoryToDelete(null);
      }
    };
    window.addEventListener("click", handleGlobalClick);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("click", handleGlobalClick);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDeleting]);

  // Format timestamp e.g. "10:42 AM"
  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString.replace(" ", "T"));
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return "";
    }
  };

  // Group memories into Today, Yesterday, Earlier
  const groupMemories = (list: Memory[]) => {
    const now = new Date();
    const todayStr = now.toDateString();

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    const groups: { label: string; items: Memory[] }[] = [];
    const groupMap: Record<string, Memory[]> = {};

    list.forEach((m) => {
      let label = "Earlier";
      try {
        const d = new Date(m.created_at.replace(" ", "T"));
        const dStr = d.toDateString();
        if (dStr === todayStr) {
          label = "Today";
        } else if (dStr === yesterdayStr) {
          label = "Yesterday";
        } else {
          label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        }
      } catch {
        label = "Earlier";
      }

      if (!groupMap[label]) {
        groupMap[label] = [];
        groups.push({ label, items: groupMap[label] });
      }
      groupMap[label].push(m);
    });

    return groups;
  };

  const groups = groupMemories(memories);

  if (isLoading) {
    return (
      <div className="py-16 text-center text-slate-500 font-sans text-xs animate-pulse">
        Gathering thoughts...
      </div>
    );
  }

  // Natural Empty State as requested
  if (memories.length === 0) {
    return (
      <div className="py-20 text-center space-y-2.5 animate-subtle-in">
        <h3 className="text-base font-medium text-slate-300">
          {searchQuery ? "No memories matched your search." : "Nothing here yet."}
        </h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
          {searchQuery
            ? "Try another keyword to locate past thoughts."
            : "Tell FRIEND.OS something you'll want to remember later."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10 py-2">
      {groups.map((group) => (
        <div key={group.label} className="space-y-4">
          {/* Day Label (e.g. TODAY, YESTERDAY) */}
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono uppercase tracking-widest text-slate-500 font-semibold">
              {group.label}
            </span>
            <div className="flex-1 h-px bg-[#1d1f2a]" />
          </div>

          {/* Living Timeline Stream: Typography & Spacing, NOT boxy cards */}
          <div className="relative pl-6 space-y-7 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-[#20222e]">
            {group.items.map((memory) => {
              const isConnected = connectedMemoryIds.has(memory.id);
              const isSelected = activeMemoryId === memory.id;
              const isCompleted = memory.status === "completed";
              const isArchived = memory.status === "archived";
              const isDemo = memory.memory_type.startsWith("demo");

              return (
                <div
                  key={memory.id}
                  className={`group relative transition-all duration-200 cursor-pointer ${
                    isSelected ? "opacity-100" : "opacity-90 hover:opacity-100"
                  }`}
                  onClick={() => onInspectMemory && onInspectMemory(memory)}
                >
                  {/* Subtle Node Marker on the vertical timeline */}
                  <div
                    className={`absolute -left-[20px] top-1.5 w-2 h-2 rounded-full border transition-all ${
                      isConnected
                        ? "bg-[#e59b38] border-[#e59b38] shadow-[0_0_8px_rgba(229,155,56,0.6)]"
                        : isCompleted
                        ? "bg-slate-700 border-slate-600"
                        : "bg-[#111218] border-slate-600 group-hover:border-slate-400"
                    }`}
                  />

                  {/* Header line: Time & subtle indicators */}
                  <div className="flex items-center gap-2 mb-1 text-[11px] font-mono text-slate-500">
                    <span>{formatTime(memory.created_at)}</span>

                    {isDemo && (
                      <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-[#e59b38]/15 text-[#e59b38] font-bold">
                        story
                      </span>
                    )}

                    {isConnected && (
                      <span className="text-[9px] uppercase tracking-wider text-[#e59b38] font-semibold flex items-center gap-1">
                        ● connected
                      </span>
                    )}

                    {isCompleted && (
                      <span className="text-[10px] text-slate-400">
                        • done
                      </span>
                    )}

                    {isArchived && (
                      <span className="text-[10px] text-slate-500">
                        • archived
                      </span>
                    )}
                  </div>

                  {/* Thought / Event Content */}
                  <div className="flex items-start justify-between gap-4">
                    <p
                      className={`text-sm sm:text-base leading-relaxed tracking-normal font-sans ${
                        isCompleted
                          ? "line-through text-slate-500"
                          : isArchived
                          ? "text-slate-500"
                          : "text-slate-200"
                      }`}
                    >
                      &quot;{memory.content}&quot;
                    </p>

                    {/* Subtle Hover Actions */}
                    <div
                      className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity shrink-0 pt-0.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {memory.status !== "completed" ? (
                        <button
                          type="button"
                          onClick={() => onUpdateStatus(memory.id, "completed")}
                          title="Mark done"
                          className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#1f212c] transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onUpdateStatus(memory.id, "active")}
                          title="Mark active"
                          className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#1f212c] transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {memory.status !== "archived" && (
                        <button
                          type="button"
                          onClick={() => onUpdateStatus(memory.id, "archived")}
                          title="Archive"
                          className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#1f212c] transition-colors"
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* ⋯ More Menu (View / Delete) */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === memory.id ? null : memory.id);
                          }}
                          title="More options"
                          className={`p-1 rounded transition-colors ${
                            openMenuId === memory.id
                              ? "text-white bg-[#1f212c]"
                              : "text-slate-400 hover:text-white hover:bg-[#1f212c]"
                          }`}
                        >
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </button>

                        {openMenuId === memory.id && (
                          <div
                            className="absolute right-0 top-7 z-30 w-32 rounded-xl bg-[#14151e] border border-[#2b2d3d] shadow-2xl py-1 text-xs font-sans animate-subtle-in"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuId(null);
                                onInspectMemory && onInspectMemory(memory);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-slate-300 hover:text-white hover:bg-[#1e202d] text-left transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5 text-slate-400" />
                              <span>View</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuId(null);
                                setMemoryToDelete(memory);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 text-left transition-colors border-t border-[#232533]"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Delete Confirmation Modal */}
      {memoryToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => !isDeleting && setMemoryToDelete(null)}
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
                <h3 className="text-base font-semibold text-white">Delete Memory</h3>
              </div>
              <button
                type="button"
                onClick={() => !isDeleting && setMemoryToDelete(null)}
                className="text-slate-500 hover:text-slate-300 transition-colors p-1"
                disabled={isDeleting}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-3">
              Are you sure you want to permanently delete this memory? This action cannot be undone.
            </p>

            {/* Display Memory Content */}
            <div className="p-3 rounded-xl bg-[#0d0e15] border border-[#222432] text-sm text-slate-200 mb-4 font-mono break-words leading-relaxed">
              &quot;{memoryToDelete.content}&quot;
            </div>

            {/* Contextual Warning for Connected Memories */}
            {connectedMemoryIds.has(memoryToDelete.id) && (
              <div className="flex items-start gap-2 p-3 mb-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 leading-normal">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>This memory may be connected to another memory in FRIEND.OS.</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#1f212c]">
              <button
                type="button"
                onClick={() => setMemoryToDelete(null)}
                disabled={isDeleting}
                className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-[#1f212c] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!memoryToDelete || !onDeleteMemory) return;
                  setIsDeleting(true);
                  try {
                    await onDeleteMemory(memoryToDelete.id);
                    setMemoryToDelete(null);
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                disabled={isDeleting}
                className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-white bg-rose-600 hover:bg-rose-500 active:bg-rose-700 transition-colors shadow-sm disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete memory"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
