import re
import sys
from pathlib import Path
from contextlib import asynccontextmanager
from typing import List, Optional

# Ensure project root is in sys.path when running main.py directly
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from fastapi import FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware

from backend.config import OLLAMA_MODEL
from backend.database import (
    init_db,
    add_memory,
    get_memories,
    get_memory_by_id,
    search_memories,
    update_memory_status,
    delete_memory,
    create_commitment,
    get_commitments,
    get_commitment_by_id,
    update_commitment_status,
    check_and_resolve_dependencies,
    get_unblocked_insights,
    get_all_insights,
    complete_commitment,
    dismiss_insight,
    reset_demo_data,
    reset_entire_database,
)
from backend.models import (
    MemoryCreate,
    MemoryResponse,
    MemoryStatusUpdate,
    AnalyzeRequest,
    AnalyzeResponse,
    AnalysisResult,
    CommitmentCreate,
    CommitmentResponse,
    InsightResponse,
)
from backend.memory_service import analyze_memory_text


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager that initializes SQLite database on startup.
    """
    init_db()
    yield


app = FastAPI(
    title="FRIEND.OS Backend",
    description="Private, local-first AI memory assistant backend with Proactive Memory ('What Am I Forgetting?').",
    version="0.2.0",
    lifespan=lifespan,
)

# Enable CORS for local client apps or browser frontends
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["Health"])
def health_check():
    """
    Basic health check returning system info and configured model.
    """
    return {
        "status": "online",
        "app": "FRIEND.OS",
        "model": OLLAMA_MODEL,
        "storage": "sqlite",
    }


@app.get("/health", tags=["Health"])
def detailed_health_check():
    """
    Local health check reporting backend, database, Ollama status, and model availability.
    Does not expose sensitive memory content.
    """
    db_status = "error"
    try:
        from backend.database import get_db_connection
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT 1;")
            if cursor.fetchone():
                db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"

    ollama_available = False
    model_present = False
    from backend.config import OLLAMA_HOST
    try:
        import urllib.request
        import json
        req = urllib.request.Request(f"{OLLAMA_HOST}/api/tags")
        with urllib.request.urlopen(req, timeout=1.5) as resp:
            if resp.status == 200:
                ollama_available = True
                data = json.loads(resp.read().decode("utf-8"))
                models = data.get("models", [])
                names = [m.get("name") for m in models if isinstance(m, dict)]
                model_present = any(
                    OLLAMA_MODEL in name or name.startswith(OLLAMA_MODEL)
                    for name in names if name
                )
    except Exception:
        ollama_available = False
        model_present = False

    return {
        "status": "online",
        "app": "FRIEND.OS",
        "database": db_status,
        "ollama": {
            "available": ollama_available,
            "host": OLLAMA_HOST,
            "model_configured": OLLAMA_MODEL,
            "model_present": model_present,
        },
    }



# ============================================================================
# MEMORIES ENDPOINTS
# ============================================================================

@app.post("/memories", response_model=MemoryResponse, status_code=status.HTTP_201_CREATED, tags=["Memories"])
def create_memory_endpoint(payload: MemoryCreate):
    """
    Store a piece of text as a memory in SQLite.
    Automatically:
    1. Records the memory into the memories table.
    2. Creates a waiting commitment if task & dependency are provided or conditionally detected.
    3. Evaluates if this memory provides evidence that resolves any existing waiting dependencies.
    """
    content_clean = payload.content.strip()
    if not content_clean:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Memory content cannot be empty",
        )

    created = add_memory(
        content=content_clean,
        memory_type=payload.memory_type,
        status=payload.status,
    )
    memory_id = created["id"]

    # 1. Check if this memory creates a commitment
    task = payload.task
    dependency = payload.dependency

    # Fast heuristic extraction for conditional commitments if not explicitly provided
    if not task or not dependency:
        # Forward order: [Task clause] (after|once|when|as soon as) [Dependency clause]
        cond_match = re.search(
            r"(?:i will|i'll|i have to|i've to|i need to|i must|i should|i plan to|i'm going to|i am going to|going to|plan to|need to|agreed to|we will|we'll)\s+(.*?)\s+(?:after|once|when|as soon as)\s+(.*)",
            content_clean,
            re.IGNORECASE,
        )
        if cond_match:
            task = cond_match.group(1).strip().rstrip(".").capitalize()
            dependency = cond_match.group(2).strip().rstrip(".")
        else:
            # Reversed order: (After|Once|When|As soon as) [Dependency clause], [Task clause]
            rev_match = re.search(
                r"^(?:after|once|when|as soon as)\s+(.*?),\s*(?:i will|i'll|i have to|i need to|i must|i should|i plan to|i'm going to|i am going to|i)?\s*(.*)",
                content_clean,
                re.IGNORECASE,
            )
            if rev_match:
                dependency = rev_match.group(1).strip().rstrip(".")
                task = rev_match.group(2).strip().rstrip(".").capitalize()
            else:
                # Direct action order: e.g. "Submit my application after I receive my certificate"
                direct_match = re.search(
                    r"^([a-zA-Z\s]+?)\s+(?:after|once|when|as soon as)\s+(.*)",
                    content_clean,
                    re.IGNORECASE,
                )
                if direct_match and not any(w in direct_match.group(1).lower().split() for w in ["i", "he", "she", "they", "we", "the", "this", "it"]):
                    task = direct_match.group(1).strip().rstrip(".").capitalize()
                    dependency = direct_match.group(2).strip().rstrip(".")

    if task and dependency:
        create_commitment(
            task=task,
            dependency=dependency,
            source_memory_id=memory_id,
            deadline=payload.deadline,
            status="waiting",
        )

    # 2. Check if this new memory resolves any existing waiting commitments
    check_and_resolve_dependencies(new_memory_id=memory_id, new_memory_content=content_clean)

    return created


@app.get("/memories", response_model=List[MemoryResponse], tags=["Memories"])
def list_memories(
    search: Optional[str] = Query(default=None, description="Search keyword in memories"),
    status: Optional[str] = Query(default=None, description="Filter by status (e.g. active, completed)"),
    limit: int = Query(default=100, ge=1, le=500, description="Maximum number of records to return"),
):
    """
    Retrieve stored memories from SQLite.
    Supports optional text search and status filtering.
    """
    if search:
        return search_memories(query=search.strip(), limit=limit)
    return get_memories(limit=limit, status=status)


@app.get("/memories/{memory_id}", response_model=MemoryResponse, tags=["Memories"])
def read_memory(memory_id: int):
    """
    Retrieve a specific memory by ID.
    """
    memory = get_memory_by_id(memory_id)
    if not memory:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Memory not found")
    return memory


@app.patch("/memories/{memory_id}/status", response_model=MemoryResponse, tags=["Memories"])
def update_status(memory_id: int, payload: MemoryStatusUpdate):
    """
    Update the status of a specific memory (e.g., mark as completed, archived).
    """
    updated = update_memory_status(memory_id=memory_id, status=payload.status.strip())
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Memory not found")
    return updated


@app.delete("/memories/{memory_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Memories"])
def delete_memory_endpoint(memory_id: int):
    """
    Permanently delete a specific memory by ID and clean up associated commitments.
    """
    deleted = delete_memory(memory_id=memory_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Memory not found")
    return None


# ============================================================================
# PROACTIVE MEMORY / "WHAT AM I FORGETTING?" ENDPOINTS
# ============================================================================

@app.get("/insights", response_model=List[InsightResponse], tags=["Proactive Memory"])
def list_insights():
    """
    Signature Proactive Memory Feature:
    Returns unblocked commitments and prerequisite reminders alerting the user to tasks they may be forgetting.
    Uses deterministic SQLite matching with zero LLM query overhead.
    """
    return get_all_insights()


@app.get("/commitments", response_model=List[CommitmentResponse], tags=["Commitments"])
def list_commitments(status: Optional[str] = Query(default=None, description="Filter by status")):
    """
    List all tracked commitments (waiting, unblocked, completed, archived).
    """
    return get_commitments(status=status)


@app.post("/commitments", response_model=CommitmentResponse, status_code=status.HTTP_201_CREATED, tags=["Commitments"])
def create_commitment_endpoint(payload: CommitmentCreate):
    """
    Explicitly register a commitment linking a task and prerequisite dependency.
    """
    return create_commitment(
        task=payload.task,
        dependency=payload.dependency,
        source_memory_id=payload.source_memory_id,
        deadline=payload.deadline,
        status=payload.status,
    )


@app.patch("/commitments/{commitment_id}/complete", response_model=CommitmentResponse, tags=["Commitments"])
def mark_commitment_complete(commitment_id: int):
    """
    Marks an unblocked commitment as completed by the user.
    """
    updated = complete_commitment(commitment_id)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Commitment not found")
    return updated


@app.patch("/commitments/{commitment_id}/dismiss", response_model=CommitmentResponse, tags=["Commitments"])
def dismiss_commitment_endpoint(commitment_id: int):
    """
    Dismisses a proactive insight by setting its commitment status to archived.
    """
    updated = dismiss_insight(commitment_id)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Commitment not found")
    return updated


# ============================================================================
# HACKATHON DEMO MODE ENDPOINTS
# ============================================================================

@app.post("/demo/reset", tags=["Demo Mode"])
def reset_demo_endpoint():
    """
    Reset all demo-created memories and commitments so hackathon judges
    can run scenarios repeatedly without cluttering the persistent database.
    """
    result = reset_demo_data()
    return {"status": "ok", "message": "Demo data reset successfully", "deleted": result}


@app.post("/database/reset", tags=["Database"])
@app.delete("/database", tags=["Database"])
def reset_database_endpoint():
    """
    Permanently clears all memories, commitments, and dependency relationships from the local database.
    Does not delete SQLite files, Ollama, models, or application binaries.
    """
    result = reset_entire_database()
    return {"status": "ok", "message": "All memories deleted.", "deleted": result}



# ============================================================================
# AI ANALYSIS ENDPOINTS
# ============================================================================

@app.post("/analyze", response_model=AnalyzeResponse, tags=["AI Analysis"])
def analyze_text(payload: AnalyzeRequest):
    """
    Send supplied text to Qwen3 via Ollama to extract structured memory components:
    - decision
    - task
    - dependency
    - deadline
    - next_action
    - status
    """
    if not payload.text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Input text cannot be empty",
        )

    try:
        extracted = analyze_memory_text(payload.text)
        return AnalyzeResponse(
            input_text=payload.text,
            analysis=AnalysisResult(**extracted),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to analyze text with Ollama model {OLLAMA_MODEL}: {str(exc)}",
        )
