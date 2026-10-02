"""
FRIEND.OS End-to-End Backend Verification Script
Verifies:
1. SQLite Database Operations
2. Proactive Memory ("What Am I Forgetting?") Feature:
   - Creating a commitment
   - Waiting dependency state
   - Non-matching evidence returns no insight
   - Adding evidence that completes the dependency
   - GET /insights returning the unblocked commitment
   - Marking a commitment completed
   - Dismissing an insight
3. Python -> Ollama -> Qwen3 Analysis
4. FastAPI Endpoints (TestClient)
"""

import sys
from pathlib import Path

# Ensure UTF-8 output encoding on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# Ensure project root is in sys.path when running script directly
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from fastapi.testclient import TestClient

from backend.config import DATABASE_PATH, OLLAMA_MODEL
from backend.database import (
    init_db,
    add_memory,
    get_memories,
    search_memories,
    update_memory_status,
    create_commitment,
    get_commitments,
    get_commitment_by_id,
    update_commitment_status,
    check_and_resolve_dependencies,
    get_unblocked_insights,
    complete_commitment,
    dismiss_insight,
)
from backend.memory_service import analyze_memory_text
from backend.main import app


def test_sqlite_operations():
    print("[1/4] Testing SQLite Database Operations...", flush=True)
    init_db()
    print(f"  Database initialized at: {DATABASE_PATH}", flush=True)

    # Add a test memory
    memory = add_memory(
        content="Discussed project architecture: agreed on local SQLite and FastAPI backend.",
        memory_type="decision",
        status="active",
    )
    memory_id = memory["id"]
    print(f"  Added memory ID #{memory_id}: {memory['content'][:50]}...", flush=True)

    # Retrieve memories
    all_memories = get_memories(limit=10)
    assert len(all_memories) > 0, "No memories found after insert!"
    print(f"  Retrieved {len(all_memories)} memory record(s).", flush=True)

    # Search memories
    matches = search_memories(query="architecture")
    assert len(matches) > 0, "Search by keyword 'architecture' returned 0 results!"
    print(f"  Search for 'architecture' succeeded: found {len(matches)} match(es).", flush=True)

    # Update status
    updated = update_memory_status(memory_id=memory_id, status="archived")
    assert updated is not None and updated["status"] == "archived", "Status update failed!"
    print(f"  Updated memory #{memory_id} status to: {updated['status']}.", flush=True)
    print("  SQLite operations passed successfully.\n", flush=True)


def test_proactive_memory_feature():
    print("[2/4] Testing Proactive Memory / 'What Am I Forgetting?' System...", flush=True)
    with TestClient(app) as client:
        # Step 1: Record initial memory with a commitment
        mem_a_res = client.post(
            "/memories",
            json={
                "content": "I will submit my internship application after I receive my certificate.",
                "memory_type": "decision",
                "task": "Submit internship application",
                "dependency": "Receive certificate",
            },
        )
        assert mem_a_res.status_code == 201, f"Failed creating Memory A: {mem_a_res.text}"
        mem_a = mem_a_res.json()
        mem_a_id = mem_a["id"]
        print(f"  1. Created source memory #{mem_a_id} with task and dependency.", flush=True)

        # Step 2: Verify commitment is in 'waiting' status
        commitments_res = client.get("/commitments?status=waiting")
        assert commitments_res.status_code == 200
        waiting_commitments = [c for c in commitments_res.json() if c["source_memory_id"] == mem_a_id]
        assert len(waiting_commitments) == 1, "Expected 1 waiting commitment for Memory A!"
        commitment = waiting_commitments[0]
        commitment_id = commitment["id"]
        assert commitment["status"] == "waiting"
        assert commitment["task"] == "Submit internship application"
        assert commitment["dependency"] == "Receive certificate"
        print(f"  2. Verified commitment #{commitment_id} is in 'waiting' state.", flush=True)

        # Step 3: Record an irrelevant memory and verify NO insight is generated
        client.post(
            "/memories",
            json={"content": "I went grocery shopping and bought some milk.", "memory_type": "note"},
        )
        insights_res1 = client.get("/insights")
        assert insights_res1.status_code == 200
        matching_insights_1 = [i for i in insights_res1.json() if i["commitment_id"] == commitment_id]
        assert len(matching_insights_1) == 0, "Non-matching memory should NOT trigger an unblocked insight!"
        print("  3. Non-matching memory correctly produced 0 false-positive insights.", flush=True)

        # Step 4: Record negative/uncompleted memory and verify NO insight is generated
        client.post(
            "/memories",
            json={"content": "I still have not received my certificate yet.", "memory_type": "note"},
        )
        insights_res2 = client.get("/insights")
        matching_insights_2 = [i for i in insights_res2.json() if i["commitment_id"] == commitment_id]
        assert len(matching_insights_2) == 0, "Negated statement should NOT trigger an insight!"
        print("  4. Negated evidence ('still have not received') correctly rejected.", flush=True)

        # Step 5: Record affirmative evidence memory that completes the dependency
        mem_b_res = client.post(
            "/memories",
            json={"content": "I received my certificate today.", "memory_type": "general"},
        )
        assert mem_b_res.status_code == 201
        mem_b_id = mem_b_res.json()["id"]
        print(f"  5. Created evidence memory #{mem_b_id}: 'I received my certificate today.'", flush=True)

        # Step 6: Verify GET /insights returns the unblocked insight
        insights_res3 = client.get("/insights")
        assert insights_res3.status_code == 200
        matching_insights_3 = [i for i in insights_res3.json() if i["commitment_id"] == commitment_id]
        assert len(matching_insights_3) == 1, "Expected 1 unblocked insight after evidence was provided!"
        insight = matching_insights_3[0]
        assert insight["type"] == "unblocked"
        assert insight["task"] == "Submit internship application"
        assert insight["dependency"] == "Receive certificate"
        assert insight["evidence"] == "I received my certificate today."
        assert insight["source_memory_id"] == mem_a_id
        assert insight["evidence_memory_id"] == mem_b_id
        assert insight["suggested_next_action"] == "Submit internship application"
        print(f"  6. GET /insights successfully surfaced unblocked commitment #{commitment_id}:", flush=True)
        print(f"     Task: {insight['task']}", flush=True)
        print(f"     Dependency: {insight['dependency']} [COMPLETED]", flush=True)
        print(f"     Evidence: \"{insight['evidence']}\"", flush=True)

        # Step 7: Test marking the commitment as completed
        complete_res = client.patch(f"/commitments/{commitment_id}/complete")
        assert complete_res.status_code == 200
        assert complete_res.json()["status"] == "completed"
        # Confirm insight disappears from unblocked list
        insights_after_complete = client.get("/insights").json()
        assert not any(i["commitment_id"] == commitment_id for i in insights_after_complete)
        print("  7. Marked commitment as completed; insight cleanly resolved.\n", flush=True)

        # Step 8: Test dismissing an insight
        # Create a second test commitment to dismiss
        mem_c = client.post(
            "/memories",
            json={
                "content": "I will send the signed lease once the landlord approves the application.",
                "memory_type": "decision",
                "task": "Send signed lease",
                "dependency": "Landlord approves application",
            },
        ).json()
        # Provide evidence
        client.post(
            "/memories",
            json={"content": "The landlord approved my application!", "memory_type": "general"},
        )
        # Find insight
        unblocked_list = client.get("/insights").json()
        dismiss_cand = [i for i in unblocked_list if i["source_memory_id"] == mem_c["id"]][0]
        dismiss_cid = dismiss_cand["commitment_id"]

        # Dismiss it
        dismiss_res = client.patch(f"/commitments/{dismiss_cid}/dismiss")
        assert dismiss_res.status_code == 200
        assert dismiss_res.json()["status"] == "archived"

        # Verify no longer returned in insights
        insights_after_dismiss = client.get("/insights").json()
        assert not any(i["commitment_id"] == dismiss_cid for i in insights_after_dismiss)
        print(f"  8. Successfully dismissed insight for commitment #{dismiss_cid}.\n", flush=True)

    print("  Proactive Memory tests passed with 100% precision.\n", flush=True)


def test_ollama_qwen3_analysis():
    print(f"[3/4] Testing Python -> Ollama -> Qwen3 ({OLLAMA_MODEL}) Analysis...", flush=True)
    sample_text = (
        "My friend said: 'I decided to submit my internship application "
        "by next Monday after I receive my recommendation letter.'"
    )
    print(f"  Input text: \"{sample_text}\"", flush=True)

    result = analyze_memory_text(sample_text)
    print("  Structured extraction output from Qwen3:", flush=True)
    for k, v in result.items():
        print(f"    - {k}: {v}", flush=True)

    # Verify expected schema structure
    for key in ["decision", "task", "dependency", "deadline", "next_action", "status"]:
        assert key in result, f"Missing key '{key}' in analysis result!"

    print("  Ollama Qwen3 analysis passed successfully.\n", flush=True)


def test_fastapi_endpoints():
    print("[4/4] Testing General FastAPI Endpoints (TestClient)...", flush=True)
    with TestClient(app) as client:
        # Health check
        res = client.get("/")
        assert res.status_code == 200, f"Health check failed: {res.text}"
        print(f"  GET / response: {res.json()}", flush=True)

        # POST /memories
        res = client.post(
            "/memories",
            json={
                "content": "Prepare demo slides for Friday meeting.",
                "memory_type": "task",
                "status": "pending",
            },
        )
        assert res.status_code == 201, f"POST /memories failed: {res.text}"
        created_id = res.json()["id"]
        print(f"  POST /memories created ID: {created_id}", flush=True)

        # GET /memories
        res = client.get("/memories")
        assert res.status_code == 200, f"GET /memories failed: {res.text}"
        items = res.json()
        assert len(items) > 0, "GET /memories returned empty list"
        print(f"  GET /memories returned {len(items)} item(s).")

        # GET /insights endpoint works
        res_insights = client.get("/insights")
        assert res_insights.status_code == 200
        print(f"  GET /insights returned {len(res_insights.json())} item(s).")

    print("  FastAPI general endpoints passed successfully.\n", flush=True)


def test_hackathon_demo_scenarios():
    print("[5/5] Testing Hackathon Demo Scenarios & Isolation...", flush=True)
    with TestClient(app) as client:
        # Reset demo data to ensure pristine state
        client.post("/demo/reset")

        scenarios = [
            {
                "name": "Internship Application",
                "initial": "I'll submit my internship application after I receive my certificate.",
                "task": "Submit internship application",
                "dep": "receive my certificate",
                "evidence": "I received my certificate today.",
                "expected_task": "Submit internship application",
            },
            {
                "name": "VLSI Project Report",
                "initial": "I'll submit my VLSI project report after my professor reviews my draft.",
                "task": "Submit VLSI project report",
                "dep": "my professor reviews my draft",
                "evidence": "My professor reviewed my VLSI draft today.",
                "expected_task": "Submit VLSI project report",
            },
            {
                "name": "Research Internship",
                "initial": "I'll apply for the research internship after I receive the recommendation letter.",
                "task": "Apply for research internship",
                "dep": "receive recommendation letter",
                "evidence": "My professor sent the recommendation letter today.",
                "expected_task": "Apply for research internship",
            },
        ]

        for sc in scenarios:
            # 1. Initial memory
            res1 = client.post("/memories", json={
                "content": sc["initial"],
                "memory_type": "demo",
                "task": sc["task"],
                "dependency": sc["dep"],
            })
            assert res1.status_code == 201
            m1_id = res1.json()["id"]

            # 2. Evidence memory
            res2 = client.post("/memories", json={
                "content": sc["evidence"],
                "memory_type": "demo",
            })
            assert res2.status_code == 201
            m2_id = res2.json()["id"]

            # 3. Verify unblocked insight
            insights = client.get("/insights").json()
            matching = [i for i in insights if i["source_memory_id"] == m1_id]
            assert len(matching) == 1, f"Expected 1 unblocked insight for {sc['name']}"
            assert matching[0]["task"] == sc["expected_task"]
            assert matching[0]["evidence"] == sc["evidence"]
            print(f"  Verified {sc['name']} generated real insight: '{matching[0]['task']}'", flush=True)

        # 4. Test Demo Reset isolation
        reset_res = client.post("/demo/reset")
        assert reset_res.status_code == 200
        del_stats = reset_res.json()["deleted"]
        assert del_stats["memories_deleted"] >= 6
        assert del_stats["commitments_deleted"] >= 3
        print(f"  Demo reset cleaned {del_stats['memories_deleted']} memories and {del_stats['commitments_deleted']} commitments.", flush=True)

    print("  Hackathon Demo Mode scenarios passed with 100% precision.\n", flush=True)


if __name__ == "__main__":
    print("=" * 60, flush=True)
    print("Running FRIEND.OS Comprehensive Backend Verification", flush=True)
    print("=" * 60 + "\n", flush=True)
    try:
        test_sqlite_operations()
        test_proactive_memory_feature()
        test_ollama_qwen3_analysis()
        test_fastapi_endpoints()
        test_hackathon_demo_scenarios()
        print("=" * 60, flush=True)
        print("ALL TESTS PASSED: FRIEND.OS Backend & Proactive Memory Are Fully Operational!", flush=True)
        print("=" * 60, flush=True)
    except Exception as e:
        print(f"\nTEST FAILED with error: {e}", file=sys.stderr, flush=True)
        raise
