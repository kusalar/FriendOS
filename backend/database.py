import sqlite3
from typing import List, Optional, Dict, Any
from backend.config import DATABASE_PATH
from backend.matcher import is_dependency_satisfied


def get_db_connection() -> sqlite3.Connection:
    """
    Get a SQLite database connection with row factory configured to return dict-like rows.
    """
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """
    Initialize SQLite database and create memories and commitments tables if they do not exist.
    """
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # 1. Memories Table (Preserved existing schema)
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS memories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                content TEXT NOT NULL,
                memory_type TEXT NOT NULL DEFAULT 'general',
                status TEXT NOT NULL DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """
        )

        # 2. Commitments Table (For Proactive Memory & "What Am I Forgetting?")
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS commitments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                task TEXT NOT NULL,
                dependency TEXT NOT NULL,
                deadline TEXT,
                status TEXT NOT NULL DEFAULT 'waiting',
                source_memory_id INTEGER NOT NULL REFERENCES memories(id),
                evidence_memory_id INTEGER REFERENCES memories(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP
            );
            """
        )
        conn.commit()


# ============================================================================
# MEMORIES OPERATIONS
# ============================================================================

def add_memory(content: str, memory_type: str = "general", status: str = "active") -> Dict[str, Any]:
    """
    Add a new memory to SQLite persistent storage.
    """
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO memories (content, memory_type, status)
            VALUES (?, ?, ?);
            """,
            (content, memory_type, status),
        )
        conn.commit()
        memory_id = cursor.lastrowid
        cursor.execute("SELECT * FROM memories WHERE id = ?", (memory_id,))
        row = cursor.fetchone()
        return dict(row)


def get_memories(limit: int = 100, status: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Retrieve stored memories, optionally filtered by status and ordered by newest first.
    """
    with get_db_connection() as conn:
        cursor = conn.cursor()
        if status:
            cursor.execute(
                """
                SELECT * FROM memories
                WHERE status = ?
                ORDER BY created_at DESC, id DESC
                LIMIT ?;
                """,
                (status, limit),
            )
        else:
            cursor.execute(
                """
                SELECT * FROM memories
                ORDER BY created_at DESC, id DESC
                LIMIT ?;
                """,
                (limit,),
            )
        rows = cursor.fetchall()
        return [dict(row) for row in rows]


def get_memory_by_id(memory_id: int) -> Optional[Dict[str, Any]]:
    """
    Retrieve a single memory by its ID.
    """
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM memories WHERE id = ?;", (memory_id,))
        row = cursor.fetchone()
        return dict(row) if row else None


def search_memories(query: str, limit: int = 50) -> List[Dict[str, Any]]:
    """
    Search memories by matching text substring within content or memory_type.
    """
    with get_db_connection() as conn:
        cursor = conn.cursor()
        search_pattern = f"%{query}%"
        cursor.execute(
            """
            SELECT * FROM memories
            WHERE content LIKE ? OR memory_type LIKE ?
            ORDER BY created_at DESC, id DESC
            LIMIT ?;
            """,
            (search_pattern, search_pattern, limit),
        )
        rows = cursor.fetchall()
        return [dict(row) for row in rows]


def update_memory_status(memory_id: int, status: str) -> Optional[Dict[str, Any]]:
    """
    Update the status of an existing memory. Returns the updated record or None if not found.
    """
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE memories
            SET status = ?
            WHERE id = ?;
            """,
            (status, memory_id),
        )
        conn.commit()
        if cursor.rowcount == 0:
            return None
        cursor.execute("SELECT * FROM memories WHERE id = ?;", (memory_id,))
        row = cursor.fetchone()
        return dict(row) if row else None


# ============================================================================
# COMMITMENTS & PROACTIVE MEMORY OPERATIONS
# ============================================================================

def create_commitment(
    task: str,
    dependency: str,
    source_memory_id: int,
    deadline: Optional[str] = None,
    status: str = "waiting",
) -> Dict[str, Any]:
    """
    Create a new commitment linking a task to a prerequisite dependency.
    """
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO commitments (task, dependency, deadline, status, source_memory_id)
            VALUES (?, ?, ?, ?, ?);
            """,
            (task, dependency, deadline, status, source_memory_id),
        )
        conn.commit()
        commitment_id = cursor.lastrowid
        cursor.execute("SELECT * FROM commitments WHERE id = ?", (commitment_id,))
        row = cursor.fetchone()
        return dict(row)


def get_commitments(status: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Retrieve stored commitments, optionally filtered by status.
    """
    with get_db_connection() as conn:
        cursor = conn.cursor()
        if status:
            cursor.execute(
                """
                SELECT * FROM commitments
                WHERE status = ?
                ORDER BY created_at DESC;
                """,
                (status,),
            )
        else:
            cursor.execute(
                """
                SELECT * FROM commitments
                ORDER BY created_at DESC;
                """
            )
        rows = cursor.fetchall()
        return [dict(row) for row in rows]


def get_commitment_by_id(commitment_id: int) -> Optional[Dict[str, Any]]:
    """
    Retrieve a single commitment by its ID.
    """
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM commitments WHERE id = ?", (commitment_id,))
        row = cursor.fetchone()
        return dict(row) if row else None


def update_commitment_status(
    commitment_id: int, status: str, evidence_memory_id: Optional[int] = None
) -> Optional[Dict[str, Any]]:
    """
    Update commitment status and optionally attach evidence memory ID.
    """
    with get_db_connection() as conn:
        cursor = conn.cursor()
        completed_at_sql = ", completed_at = CURRENT_TIMESTAMP" if status == "completed" else ""
        if evidence_memory_id is not None:
            cursor.execute(
                f"""
                UPDATE commitments
                SET status = ?, evidence_memory_id = ?{completed_at_sql}
                WHERE id = ?;
                """,
                (status, evidence_memory_id, commitment_id),
            )
        else:
            cursor.execute(
                f"""
                UPDATE commitments
                SET status = ?{completed_at_sql}
                WHERE id = ?;
                """,
                (status, commitment_id),
            )
        conn.commit()
        if cursor.rowcount == 0:
            return None
        cursor.execute("SELECT * FROM commitments WHERE id = ?", (commitment_id,))
        row = cursor.fetchone()
        return dict(row) if row else None


def check_and_resolve_dependencies(new_memory_id: int, new_memory_content: str) -> List[Dict[str, Any]]:
    """
    Deterministic dependency resolution:
    Checks all commitments currently in 'waiting' status (excluding the memory itself).
    If the new memory provides verified evidence that a dependency has completed,
    the commitment status is transitioned to 'unblocked' and evidence_memory_id is recorded.
    Returns the list of unblocked commitments.
    """
    unblocked = []
    with get_db_connection() as conn:
        cursor = conn.cursor()
        # Invariant: Evidence memory must be a separate subsequent memory, not the source memory
        cursor.execute("SELECT * FROM commitments WHERE status = 'waiting' AND source_memory_id != ?;", (new_memory_id,))
        waiting_commitments = [dict(row) for row in cursor.fetchall()]

        for commitment in waiting_commitments:
            dep_text = commitment["dependency"]
            if is_dependency_satisfied(dep_text, new_memory_content):
                cursor.execute(
                    """
                    UPDATE commitments
                    SET status = 'unblocked', evidence_memory_id = ?
                    WHERE id = ?;
                    """,
                    (new_memory_id, commitment["id"]),
                )
                commitment["status"] = "unblocked"
                commitment["evidence_memory_id"] = new_memory_id
                unblocked.append(commitment)

        conn.commit()
    return unblocked


def get_unblocked_insights() -> List[Dict[str, Any]]:
    """
    Fetches all unblocked commitments with evidence and source text joined from memories.
    Guarantees no hallucination: every insight has a valid source_memory_id and evidence_memory_id.
    """
    insights = []
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT 
                c.id AS commitment_id,
                c.task,
                c.dependency,
                c.deadline,
                c.status,
                c.source_memory_id,
                c.evidence_memory_id,
                c.created_at,
                m_src.content AS source_text,
                m_ev.content AS evidence_text
            FROM commitments c
            JOIN memories m_src ON c.source_memory_id = m_src.id
            JOIN memories m_ev ON c.evidence_memory_id = m_ev.id
            WHERE c.status = 'unblocked'
            ORDER BY c.created_at DESC;
            """
        )
        rows = cursor.fetchall()
        for r in rows:
            insights.append({
                "type": "unblocked",
                "commitment_id": r["commitment_id"],
                "task": r["task"],
                "dependency": r["dependency"],
                "evidence": r["evidence_text"],
                "source_text": r["source_text"],
                "source_memory_id": r["source_memory_id"],
                "evidence_memory_id": r["evidence_memory_id"],
                "suggested_next_action": r["task"],
            })
    return insights


def complete_commitment(commitment_id: int) -> Optional[Dict[str, Any]]:
    """
    Marks an unblocked or waiting commitment as completed.
    """
    return update_commitment_status(commitment_id=commitment_id, status="completed")


def dismiss_insight(commitment_id: int) -> Optional[Dict[str, Any]]:
    """
    Dismisses an unblocked insight by setting its commitment status to archived.
    """
    return update_commitment_status(commitment_id=commitment_id, status="archived")


def reset_demo_data() -> Dict[str, int]:
    """
    Cleans up demo-tagged memories and their associated commitments.
    Ensures judges and reviewers can test repeated scenarios without cluttering the persistent database.
    """
    with get_db_connection() as conn:
        cursor = conn.cursor()
        # Find demo memory IDs
        cursor.execute("SELECT id FROM memories WHERE memory_type LIKE 'demo%';")
        demo_ids = [row["id"] for row in cursor.fetchall()]

        commitments_deleted = 0
        memories_deleted = 0
        if demo_ids:
            placeholders = ",".join("?" for _ in demo_ids)
            cursor.execute(
                f"DELETE FROM commitments WHERE source_memory_id IN ({placeholders}) OR evidence_memory_id IN ({placeholders});",
                demo_ids + demo_ids,
            )
            commitments_deleted = cursor.rowcount

            cursor.execute(f"DELETE FROM memories WHERE id IN ({placeholders});", demo_ids)
            memories_deleted = cursor.rowcount

        conn.commit()
        return {"memories_deleted": memories_deleted, "commitments_deleted": commitments_deleted}
