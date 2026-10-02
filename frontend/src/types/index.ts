export type MemoryStatus = "active" | "completed" | "archived";

export interface Memory {
  id: number;
  content: string;
  memory_type: string;
  status: MemoryStatus;
  created_at: string;
}

export interface AnalysisResult {
  decision: string | null;
  task: string | null;
  dependency: string | null;
  deadline: string | null;
  next_action: string | null;
  status: string | null;
}

export interface AnalyzeResponse {
  input_text: string;
  analysis: AnalysisResult;
}

export interface SystemHealth {
  status: string;
  app: string;
  model: string;
  storage: string;
}

export interface Insight {
  type: string;
  commitment_id: number;
  task: string;
  dependency: string;
  evidence: string;
  source_text?: string;
  source_memory_id: number;
  evidence_memory_id: number;
  suggested_next_action: string;
}
