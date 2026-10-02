"use client";

import React from "react";
import { Memory, MemoryStatus } from "@/types";
import { Check, Archive, RotateCcw, Sparkles } from "lucide-react";

interface MemoryTimelineProps {
  memories: Memory[];
  isLoading: boolean;
  searchQuery: string;
  onUpdateStatus: (id: number, status: MemoryStatus) => Promise<void>;
  onInspectMemory?: (memory: Memory) => void;
  activeMemoryId?: number | null;
  connectedMemoryIds?: Set<number>;
}

export function MemoryTimeline({
  memories,
  isLoading,
  searchQuery,
  onUpdateStatus,
  onInspectMemory,
  activeMemoryId,
  connectedMemoryIds = new Set(),
}: MemoryTimelineProps) {
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
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
