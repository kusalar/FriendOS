"use client";

import React, { useState } from "react";
import { X, Play, RotateCcw, Loader2, CheckCircle2, Sparkles, BookOpen } from "lucide-react";
import { createMemory, resetDemoData } from "@/lib/api";

interface StoryScenario {
  id: string;
  title: string;
  tagline: string;
  initialMemory: string;
  task: string;
  dependency: string;
  evidence: string;
}

const DEMO_STORIES: StoryScenario[] = [
  {
    id: "internship",
    title: "Internship",
    tagline: "I was waiting for my certificate before applying.",
    initialMemory:
      "I'll submit my internship application after I receive my certificate.",
    task: "Submit internship application",
    dependency: "receive my certificate",
    evidence: "I received my certificate today.",
  },
  {
    id: "vlsi",
    title: "VLSI Project",
    tagline: "I needed my professor to review my draft before submitting the final report.",
    initialMemory:
      "I'll submit my VLSI project report after my professor reviews my draft.",
    task: "Submit VLSI project report",
    dependency: "my professor reviews my draft",
    evidence: "My professor reviewed my VLSI draft today.",
  },
  {
    id: "research",
    title: "Research Internship",
    tagline: "I was waiting on the recommendation letter before sending my application.",
    initialMemory:
      "I'll apply for the research internship after I receive the recommendation letter.",
    task: "Apply for research internship",
    dependency: "receive recommendation letter",
    evidence: "My professor sent the recommendation letter today.",
  },
];

interface DemoStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshData: () => Promise<void>;
  onShowToast: (type: "success" | "error", message: string) => void;
}

export function DemoStoryModal({
  isOpen,
  onClose,
  onRefreshData,
  onShowToast,
}: DemoStoryModalProps) {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [playedStories, setPlayedStories] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

  const handlePlayStory = async (story: StoryScenario) => {
    setPlayingId(story.id);

    try {
      // 1. Create initial memory through real API
      await createMemory(
        story.initialMemory,
        "demo",
        "active",
        story.task,
        story.dependency
      );
      await onRefreshData();

      // Natural pause so the user perceives the two moments
      await new Promise((resolve) => setTimeout(resolve, 700));

      // 2. Create evidence memory through real API
      await createMemory(story.evidence, "demo", "active");
      await onRefreshData();

      setPlayedStories((prev) => ({ ...prev, [story.id]: true }));
      onShowToast("success", `Story "${story.title}" played. Notice the connection!`);

      // Close modal smoothly to let user experience the live timeline & connection
      setTimeout(() => {
        onClose();
        const el = document.getElementById("proactive-insights-section");
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 400);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to run story";
      onShowToast("error", msg);
    } finally {
      setPlayingId(null);
    }
  };

  const handleReset = async () => {
    setIsResetting(true);
    try {
      const stats = await resetDemoData();
      await onRefreshData();
      setPlayedStories({});
      onShowToast(
        "success",
        `Reset demo stories: removed ${stats.memories_deleted} memories.`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to reset";
      onShowToast("error", msg);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-subtle-in">
      <div className="relative w-full max-w-lg bg-[#12131a] border border-[#232532] rounded-2xl shadow-2xl p-6 text-slate-100 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-[#212330]">
          <div className="space-y-1">
            <span className="text-[10px] font-mono uppercase text-[#e59b38] tracking-widest font-semibold block">
              Guided tour
            </span>
            <h2 className="text-base font-semibold text-white tracking-tight">
              See how FRIEND.OS connects memories.
            </h2>
            <p className="text-xs text-slate-400 font-sans">
              Choose a scenario to watch a conditional memory unblock when real evidence arrives.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#1f212c] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stories list */}
        <div className="space-y-3">
          {DEMO_STORIES.map((story) => {
            const isRunning = playingId === story.id;
            const hasPlayed = Boolean(playedStories[story.id]);

            return (
              <div
                key={story.id}
                className="p-4 rounded-xl border border-[#212330] bg-[#161720] hover:border-[#32364a] transition-all flex items-center justify-between gap-4"
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-white tracking-tight">
                      {story.title}
                    </h3>
                    {hasPlayed && (
                      <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Ready</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 italic font-sans leading-relaxed">
                    &quot;{story.tagline}&quot;
                  </p>
                </div>

                <button
                  type="button"
                  disabled={isRunning || isResetting}
                  onClick={() => handlePlayStory(story)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-950 bg-white hover:bg-slate-100 disabled:opacity-40 transition-all shrink-0 shadow-sm"
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Playing...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3 fill-current ml-0.5" />
                      <span>Play story</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer controls: Reset */}
        <div className="flex items-center justify-between pt-2 border-t border-[#212330] text-xs">
          <button
            type="button"
            onClick={handleReset}
            disabled={isResetting || playingId !== null}
            className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
          >
            <RotateCcw className={`w-3 h-3 ${isResetting ? "animate-spin" : ""}`} />
            <span>Reset demo stories</span>
          </button>

          <span className="text-[11px] text-slate-500 font-mono">
            Powered by real SQLite &amp; matcher.py
          </span>
        </div>
      </div>
    </div>
  );
}
