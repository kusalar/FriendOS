from typing import Optional
from pydantic import BaseModel, Field


class MemoryCreate(BaseModel):
    """Payload for creating a new memory."""
    content: str = Field(..., description="The memory content or note from the friend")
    memory_type: str = Field(default="general", description="Category/type of memory, e.g. decision, task, note")
    status: str = Field(default="active", description="Status of the memory item, e.g. active, completed, archived")
    task: Optional[str] = Field(default=None, description="Optional associated task")
    dependency: Optional[str] = Field(default=None, description="Optional associated prerequisite dependency")
    deadline: Optional[str] = Field(default=None, description="Optional deadline")


class MemoryStatusUpdate(BaseModel):
    """Payload for updating memory status."""
    status: str = Field(..., description="New status for the memory item")


class MemoryResponse(BaseModel):
    """Schema for returned memory records."""
    id: int
    content: str
    memory_type: str
    status: str
    created_at: str


class AnalyzeRequest(BaseModel):
    """Payload for text analysis with Qwen3."""
    text: str = Field(..., description="Text from notes or conversations to analyze")


class AnalysisResult(BaseModel):
    """Structured memory components extracted by Qwen3."""
    decision: Optional[str] = Field(default=None, description="Identified decision or null")
    task: Optional[str] = Field(default=None, description="Identified task/action item or null")
    dependency: Optional[str] = Field(default=None, description="Identified condition/dependency or null")
    deadline: Optional[str] = Field(default=None, description="Identified date or deadline or null")
    next_action: Optional[str] = Field(default=None, description="Immediate next step or null")
    status: Optional[str] = Field(default=None, description="Current status of the item or null")


class AnalyzeResponse(BaseModel):
    """Response containing parsed analysis result and the original analyzed text."""
    input_text: str
    analysis: AnalysisResult


# ============================================================================
# COMMITMENT & PROACTIVE INSIGHT SCHEMAS
# ============================================================================

class CommitmentCreate(BaseModel):
    """Payload for explicitly creating a commitment."""
    task: str = Field(..., description="Action item or commitment")
    dependency: str = Field(..., description="Prerequisite condition that must be completed first")
    source_memory_id: int = Field(..., description="ID of the memory where this commitment was stated")
    deadline: Optional[str] = Field(default=None, description="Optional target deadline")
    status: str = Field(default="waiting", description="Initial status: waiting, unblocked, completed, archived")


class CommitmentResponse(BaseModel):
    """Schema for commitment records."""
    id: int
    task: str
    dependency: str
    deadline: Optional[str] = None
    status: str
    source_memory_id: int
    evidence_memory_id: Optional[int] = None
    created_at: str
    completed_at: Optional[str] = None


class InsightResponse(BaseModel):
    """Schema for proactive 'What Am I Forgetting?' unblocked insights."""
    type: str = Field(default="unblocked", description="Type of insight, e.g. unblocked")
    commitment_id: int = Field(..., description="ID of the unblocked commitment")
    task: str = Field(..., description="Task that is now unblocked and ready for action")
    dependency: str = Field(..., description="The dependency that was satisfied")
    evidence: str = Field(..., description="Source text of the evidence memory completing the dependency")
    source_text: Optional[str] = Field(default=None, description="Source text of original commitment memory")
    source_memory_id: int = Field(..., description="Memory ID where commitment was originally recorded")
    evidence_memory_id: int = Field(..., description="Memory ID that provided the completion evidence")
    suggested_next_action: str = Field(..., description="Immediate recommended action")
