"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { MemoryInput } from "@/components/MemoryInput";
import { MemoryTimeline } from "@/components/MemoryTimeline";
import { ProactiveMoment } from "@/components/ProactiveMoment";
import { ConnectionPanel } from "@/components/ConnectionPanel";
import { DemoStoryModal } from "@/components/DemoStoryModal";
import { SystemInfoModal } from "@/components/SystemInfoModal";
import { AnalysisPanel } from "@/components/AnalysisPanel";
import { OfflineBanner } from "@/components/OfflineBanner";
import {
  Memory,
  MemoryStatus,
  AnalyzeResponse,
  SystemHealth,
  Insight,
} from "@/types";
import {
  checkBackendHealth,
  getMemories,
  createMemory,
  updateMemoryStatus,
  deleteMemory,
  analyzeText,
  getInsights,
  completeCommitment,
  dismissCommitment,
  resetDatabase,
} from "@/lib/api";
import { Check, AlertCircle } from "lucide-react";

export default function Home() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [isBackendOffline, setIsBackendOffline] = useState(false);

  // Memories list
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isLoadingMemories, setIsLoadingMemories] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Proactive Insights ("Something just clicked")
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isProcessingInsightId, setIsProcessingInsightId] = useState<number | null>(null);

  // Contextual Connection selection
  const [selectedInsight, setSelectedInsight] = useState<Insight | null>(null);
  const [inspectedMemory, setInspectedMemory] = useState<Memory | null>(null);

  // Modals & Drawers
  const [isDemoOpen, setIsDemoOpen] = useState(false);
  const [isSystemInfoOpen, setIsSystemInfoOpen] = useState(false);

  // Input & Analysis state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSavingAnalysis, setIsSavingAnalysis] = useState(false);
  const [analysisData, setAnalysisData] = useState<AnalyzeResponse | null>(null);

  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast((current) => (current?.message === message ? null : current));
    }, 3500);
  };

  // Poll/Check Backend Health
  const verifyHealth = useCallback(async () => {
    setIsCheckingHealth(true);
    try {
      const data = await checkBackendHealth();
      setHealth(data);
      setIsBackendOffline(false);
    } catch {
      setHealth(null);
      setIsBackendOffline(true);
    } finally {
      setIsCheckingHealth(false);
    }
  }, []);

  // Fetch proactive unblocked insights
  const loadInsights = useCallback(async () => {
    try {
      const data = await getInsights();
      setInsights(data);
      if (data.length > 0) {
        setSelectedInsight((prev) => prev || data[0]);
      } else {
        setSelectedInsight(null);
      }
    } catch (err: unknown) {
      console.warn("Could not load insights:", err);
    }
  }, []);

  // Fetch memories list
  const loadMemories = useCallback(async () => {
    setIsLoadingMemories(true);
    try {
      const data = await getMemories(searchQuery, statusFilter);
      setMemories(data);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to load memories";
      console.warn("Could not load memories:", errorMsg);
    } finally {
      setIsLoadingMemories(false);
    }
  }, [searchQuery, statusFilter]);

  // Initial load
  useEffect(() => {
    verifyHealth();
    loadMemories();
    loadInsights();
  }, [verifyHealth, loadMemories, loadInsights]);

  // Combined refresh for demo actions
  const handleRefreshAll = useCallback(async () => {
    await Promise.all([loadMemories(), loadInsights()]);
  }, [loadMemories, loadInsights]);

  // Handle "Remember this" action (Direct POST /memories)
  const handleRemember = async (text: string) => {
    setIsSubmitting(true);
    try {
      const created = await createMemory(text, "general", "active");
      setMemories((prev) => [created, ...prev]);
      showToast("success", "Saved.");
      // Refresh insights in case this memory resolves a waiting dependency
      await loadInsights();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to save memory";
      showToast("error", errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle "Analyze with Qwen3" action (POST /analyze)
  const handleAnalyze = async (text: string) => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeText(text);
      setAnalysisData(result);
      showToast("success", "Extracted structured relationship.");
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Analysis failed";
      showToast("error", errorMsg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle saving memory from the analysis panel
  const handleSaveAnalyzed = async (text: string, primaryType?: string) => {
    setIsSavingAnalysis(true);
    try {
      const task = analysisData?.analysis.task || null;
      const dependency = analysisData?.analysis.dependency || null;
      const deadline = analysisData?.analysis.deadline || null;

      const created = await createMemory(
        text,
        primaryType || "general",
        "active",
        task,
        dependency,
        deadline
      );
      setMemories((prev) => [created, ...prev]);
      setAnalysisData(null);
      showToast("success", "Saved.");
      await loadInsights();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to save";
      showToast("error", errorMsg);
    } finally {
      setIsSavingAnalysis(false);
    }
  };

  // Handle status update (PATCH /memories/{id}/status)
  const handleUpdateStatus = async (id: number, newStatus: MemoryStatus) => {
    try {
      const updated = await updateMemoryStatus(id, newStatus);
      setMemories((prev) =>
        prev.map((m) => (m.id === id ? { ...m, status: updated.status } : m))
      );
      showToast("success", `Updated.`);
      await loadInsights();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Status update failed";
      showToast("error", errorMsg);
    }
  };

  // Handle memory deletion (DELETE /memories/{id})
  const handleDeleteMemory = async (id: number) => {
    try {
      await deleteMemory(id);
      setMemories((prev) => prev.filter((m) => m.id !== id));
      if (inspectedMemory?.id === id) {
        setInspectedMemory(null);
      }
      showToast("success", "Memory deleted.");
      await loadInsights();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to delete memory";
      showToast("error", errorMsg);
    }
  };

  // Handle completing a commitment
  const handleCompleteCommitment = async (commitmentId: number) => {
    setIsProcessingInsightId(commitmentId);
    try {
      await completeCommitment(commitmentId);
      setInsights((prev) => prev.filter((i) => i.commitment_id !== commitmentId));
      if (selectedInsight?.commitment_id === commitmentId) {
        setSelectedInsight(null);
      }
      showToast("success", "Completed.");
      await loadMemories();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to complete";
      showToast("error", errorMsg);
    } finally {
      setIsProcessingInsightId(null);
    }
  };

  // Handle dismissing an insight
  const handleDismissInsight = async (commitmentId: number) => {
    setIsProcessingInsightId(commitmentId);
    try {
      await dismissCommitment(commitmentId);
      setInsights((prev) => prev.filter((i) => i.commitment_id !== commitmentId));
      if (selectedInsight?.commitment_id === commitmentId) {
        setSelectedInsight(null);
      }
      showToast("success", "Dismissed.");
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to dismiss";
      showToast("error", errorMsg);
    } finally {
      setIsProcessingInsightId(null);
    }
  };

  // Handle deleting entire database
  const handleResetDatabase = async () => {
    try {
      await resetDatabase();
      setMemories([]);
      setInsights([]);
      setSelectedInsight(null);
      setInspectedMemory(null);
      showToast("success", "All memories deleted.");
      await Promise.all([loadMemories(), loadInsights()]);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to reset database";
      showToast("error", errorMsg);
    }
  };

  // Set of memory IDs currently connected to an active unblocked insight or reminder
  const connectedMemoryIds = useMemo(() => {
    const ids = new Set<number>();
    insights.forEach((ins) => {
      ids.add(ins.source_memory_id);
      if (ins.evidence_memory_id) {
        ids.add(ins.evidence_memory_id);
      }
    });
    return ids;
  }, [insights]);

  return (
    <div className="min-h-screen bg-[#0c0d11] text-slate-100 flex flex-col md:flex-row antialiased font-sans">
      {/* Mobile Top Bar */}
      <Header
        health={health}
        onOpenSystemInfo={() => setIsSystemInfoOpen(true)}
        onOpenDemo={() => setIsDemoOpen(true)}
        unblockedCount={insights.length}
      />

      {/* Left Sidebar Navigation */}
      <Sidebar
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        unblockedCount={insights.length}
        totalCount={memories.length}
        onOpenDemo={() => setIsDemoOpen(true)}
        onOpenSystemInfo={() => setIsSystemInfoOpen(true)}
        health={health}
        onResetDatabase={handleResetDatabase}
      />

      {/* Center Memory Stream: Spacious, breathable */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 md:py-10 space-y-8 min-h-screen">
        {/* Offline Banner if backend unreachable */}
        {isBackendOffline && (
          <OfflineBanner onRetry={verifyHealth} isRetrying={isCheckingHealth} />
        )}

        {/* The Core Product Moment (Unblocked realization) */}
        <ProactiveMoment
          insights={insights}
          onComplete={handleCompleteCommitment}
          onDismiss={handleDismissInsight}
          onSelectInsight={(ins) => {
            setSelectedInsight(ins);
            setInspectedMemory(null);
          }}
          selectedInsightId={selectedInsight?.commitment_id}
          isProcessingId={isProcessingInsightId}
        />

        {/* Natural Memory Composer */}
        <MemoryInput
          onRemember={handleRemember}
          onAnalyze={handleAnalyze}
          isSubmitting={isSubmitting}
          isAnalyzing={isAnalyzing}
          disabled={isBackendOffline}
        />

        {/* Optional Analysis Panel if user ran structured extraction */}
        {analysisData && (
          <AnalysisPanel
            analysisData={analysisData}
            onSaveAnalyzed={handleSaveAnalyzed}
            onClose={() => setAnalysisData(null)}
            isSaving={isSavingAnalysis}
          />
        )}

        {/* Living Memory Timeline */}
        <MemoryTimeline
          memories={memories}
          isLoading={isLoadingMemories}
          searchQuery={searchQuery}
          onUpdateStatus={handleUpdateStatus}
          onDeleteMemory={handleDeleteMemory}
          onInspectMemory={(m) => {
            setInspectedMemory(m);
            setSelectedInsight(null);
          }}
          activeMemoryId={inspectedMemory?.id}
          connectedMemoryIds={connectedMemoryIds}
        />
      </main>

      {/* Right Contextual Connection Panel */}
      <ConnectionPanel
        selectedInsight={selectedInsight}
        onClose={() => {
          setSelectedInsight(null);
          setInspectedMemory(null);
        }}
        onComplete={handleCompleteCommitment}
        inspectedMemory={inspectedMemory}
        isProcessing={isProcessingInsightId !== null}
      />

      {/* Guided 60-Second Story Modal */}
      <DemoStoryModal
        isOpen={isDemoOpen}
        onClose={() => setIsDemoOpen(false)}
        onRefreshData={handleRefreshAll}
        onShowToast={showToast}
      />

      {/* System Status & Privacy Modal */}
      <SystemInfoModal
        isOpen={isSystemInfoOpen}
        onClose={() => setIsSystemInfoOpen(false)}
        health={health}
        isChecking={isCheckingHealth}
        onRefreshHealth={verifyHealth}
      />

      {/* Quiet Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-subtle-in">
          <div className="px-4 py-2.5 rounded-xl border border-[#2b2d3d] bg-[#14151e]/95 backdrop-blur-md shadow-lg flex items-center gap-2 text-xs font-sans text-slate-200">
            {toast.type === "success" ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
