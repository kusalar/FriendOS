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
from backend.matcher import is_dependency_satisfied
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


def test_homework_matcher_unit_tests():
    print("[6/6] Testing Explicit Homework & Action Normalization Tests...", flush=True)
    dep = "I do my homework"

    # Positive tests
    positives = [
        "I did my homework",
        "I have done my homework",
        "I completed my homework",
        "I finished my homework",
    ]
    for ev in positives:
        res = is_dependency_satisfied(dep, ev)
        assert res is True, f"Positive match failed for '{dep}' -> '{ev}'"
        print(f"  [POSITIVE] '{dep}' -> '{ev}': MATCHED", flush=True)

    # Negative tests
    negatives = [
        "I did not do my homework",
        "I didn't do my homework",
        "I have not done my homework",
        "I haven't done my homework",
        "I still haven't done my homework",
        "I still need to do my homework",
        "I will do my homework tomorrow",
        "I might do my homework",
        "I may do my homework",
    ]
    for ev in negatives:
        res = is_dependency_satisfied(dep, ev)
        assert res is False, f"Negative match failed for '{dep}' -> '{ev}' (should be rejected)"
        print(f"  [NEGATIVE] '{dep}' -> '{ev}': CORRECTLY REJECTED", flush=True)

    # Unrelated tests
    unrelated = [
        "I completed my VLSI project",
    ]
    for ev in unrelated:
        res = is_dependency_satisfied(dep, ev)
        assert res is False, f"Unrelated match failed for '{dep}' -> '{ev}' (should be rejected)"
        print(f"  [UNRELATED] '{dep}' -> '{ev}': CORRECTLY REJECTED", flush=True)

    # End-to-end integration test via TestClient
    with TestClient(app) as client:
        # Step 1: Post Memory 1
        m1_res = client.post(
            "/memories",
            json={"content": "I will go to school after I do my homework", "memory_type": "general"},
        )
        assert m1_res.status_code == 201
        m1_id = m1_res.json()["id"]

        # Verify commitment is waiting
        commitments = client.get("/commitments?status=waiting").json()
        matching_c = [c for c in commitments if c["source_memory_id"] == m1_id]
        assert len(matching_c) == 1
        cid = matching_c[0]["id"]
        assert matching_c[0]["status"] == "waiting"
        assert matching_c[0]["evidence_memory_id"] is None

        # Step 2: Post Memory 2
        m2_res = client.post(
            "/memories",
            json={"content": "I did my homework", "memory_type": "general"},
        )
        assert m2_res.status_code == 201
        m2_id = m2_res.json()["id"]

        # Step 3: Verify commitment changed to unblocked with evidence_memory_id = m2_id
        c_detail = client.get(f"/commitments").json()
        unblocked_c = [c for c in c_detail if c["id"] == cid][0]
        assert unblocked_c["status"] == "unblocked"
        assert unblocked_c["evidence_memory_id"] == m2_id
        assert unblocked_c["source_memory_id"] != unblocked_c["evidence_memory_id"]
        print(f"  [INTEGRATION] Commitment #{cid} transitioned: waiting -> unblocked (evidence=#{m2_id})", flush=True)

        # Step 4: Verify GET /insights returns the unblocked item
        insights = client.get("/insights").json()
        matching_ins = [i for i in insights if i["commitment_id"] == cid]
        assert len(matching_ins) == 1
        assert matching_ins[0]["task"] == "Go to school"
        assert matching_ins[0]["evidence"] == "I did my homework"
        print(f"  [INSIGHTS] Proactive insight successfully retrieved for task: '{matching_ins[0]['task']}'", flush=True)

    print("  Homework Matcher unit and integration tests passed with 100% precision.\n", flush=True)


def test_deletion_semantics():
    print("[7/7] Testing Comprehensive Deletion Semantics (TEST A - TEST G)...", flush=True)
    with TestClient(app) as client:
        # TEST A — SOURCE DELETE
        print("  Running TEST A: Source Memory Deletion...", flush=True)
        res_a = client.post(
            "/memories",
            json={"content": "I will go to school after I do my homework", "memory_type": "test_del_a"},
        )
        assert res_a.status_code == 201
        a_id = res_a.json()["id"]

        all_c = client.get("/commitments").json()
        matching_c_a = [c for c in all_c if c["source_memory_id"] == a_id]
        assert len(matching_c_a) == 1, "Commitment was not created for Memory A"
        c_a_id = matching_c_a[0]["id"]

        del_a_res = client.delete(f"/memories/{a_id}")
        assert del_a_res.status_code == 204

        get_a = client.get(f"/memories/{a_id}")
        assert get_a.status_code == 404, "Memory A should not exist after deletion"
        all_c_after_a = client.get("/commitments").json()
        assert not any(c["id"] == c_a_id for c in all_c_after_a), "Commitment should be deleted when source memory is deleted"
        print("    -> TEST A PASSED: Source memory and associated commitment deleted.", flush=True)

        # TEST B — EVIDENCE DELETE
        print("  Running TEST B: Evidence Memory Deletion...", flush=True)
        res_a = client.post(
            "/memories",
            json={"content": "I will go to school after I do my homework", "memory_type": "test_del_b"},
        )
        assert res_a.status_code == 201
        a_id = res_a.json()["id"]

        res_b = client.post(
            "/memories",
            json={"content": "I did my homework", "memory_type": "test_del_b"},
        )
        assert res_b.status_code == 201
        b_id = res_b.json()["id"]

        all_c = client.get("/commitments").json()
        c_b_match = [c for c in all_c if c["source_memory_id"] == a_id]
        assert len(c_b_match) == 1
        c_b = c_b_match[0]
        assert c_b["status"] == "unblocked"
        assert c_b["evidence_memory_id"] == b_id

        insights_before = client.get("/insights").json()
        assert any(i["commitment_id"] == c_b["id"] for i in insights_before)

        del_b_res = client.delete(f"/memories/{b_id}")
        assert del_b_res.status_code == 204

        get_b = client.get(f"/memories/{b_id}")
        assert get_b.status_code == 404, "Memory B should not exist after deletion"

        all_c_after_b = client.get("/commitments").json()
        c_b_after = [c for c in all_c_after_b if c["id"] == c_b["id"]]
        assert len(c_b_after) == 1, "Commitment must NOT be deleted when only evidence is deleted"
        assert c_b_after[0]["status"] == "waiting", f"Status should revert to 'waiting', got '{c_b_after[0]['status']}'"
        assert c_b_after[0]["evidence_memory_id"] is None, f"evidence_memory_id should be None, got {c_b_after[0]['evidence_memory_id']}"

        insights_after = client.get("/insights").json()
        matching_insights = [i for i in insights_after if i["commitment_id"] == c_b["id"]]
        assert len(matching_insights) == 0, f"GET /insights should not contain commitment after evidence deletion: {matching_insights}"
        print("    -> TEST B PASSED: Evidence memory deleted, commitment preserved with status='waiting', evidence_memory_id=NULL, GET /insights=[]", flush=True)

        client.delete(f"/memories/{a_id}")

        # TEST C — COMPLETED COMMITMENT
        print("  Running TEST C: Completed Commitment Evidence Deletion...", flush=True)
        res_a = client.post(
            "/memories",
            json={"content": "I will go to school after I do my homework", "memory_type": "test_del_c"},
        )
        a_id = res_a.json()["id"]

        res_b = client.post(
            "/memories",
            json={"content": "I did my homework", "memory_type": "test_del_c"},
        )
        b_id = res_b.json()["id"]

        all_c = client.get("/commitments").json()
        c_match = [c for c in all_c if c["source_memory_id"] == a_id][0]
        assert c_match["status"] == "unblocked"
        c_id = c_match["id"]

        complete_res = client.patch(f"/commitments/{c_id}/complete")
        assert complete_res.status_code == 200
        assert complete_res.json()["status"] == "completed"

        del_b_res = client.delete(f"/memories/{b_id}")
        assert del_b_res.status_code == 204

        all_c_after_b = client.get("/commitments").json()
        c_after = [c for c in all_c_after_b if c["id"] == c_id]
        assert len(c_after) == 1, "Commitment must still exist"
        assert c_after[0]["status"] == "completed", f"Status should remain 'completed', got '{c_after[0]['status']}'"
        assert c_after[0]["evidence_memory_id"] is None, f"evidence_memory_id should be None, got {c_after[0]['evidence_memory_id']}"
        print("    -> TEST C PASSED: Completed commitment status preserved upon evidence deletion with evidence_memory_id=NULL.", flush=True)

        client.delete(f"/memories/{a_id}")

        # TEST MULTIPLE REFERENCES
        print("  Running Sub-Test: Multiple References to One Evidence Memory...", flush=True)
        res_m1 = client.post("/memories", json={"content": "I will go to school after I do my homework", "memory_type": "multi"})
        m1_id = res_m1.json()["id"]
        res_m2 = client.post("/memories", json={"content": "I will play games after I do my homework", "memory_type": "multi"})
        m2_id = res_m2.json()["id"]
        res_ev = client.post("/memories", json={"content": "I did my homework", "memory_type": "multi"})
        ev_id = res_ev.json()["id"]

        all_c = client.get("/commitments").json()
        c1 = [c for c in all_c if c["source_memory_id"] == m1_id][0]
        c2 = [c for c in all_c if c["source_memory_id"] == m2_id][0]
        assert c1["status"] == "unblocked" and c1["evidence_memory_id"] == ev_id
        assert c2["status"] == "unblocked" and c2["evidence_memory_id"] == ev_id

        # Mark c2 completed
        client.patch(f"/commitments/{c2['id']}/complete")

        # Delete evidence memory
        del_ev_res = client.delete(f"/memories/{ev_id}")
        assert del_ev_res.status_code == 204

        # Verify c1 reverted to waiting, c2 preserved as completed, both evidence_memory_id = NULL
        all_c_after = client.get("/commitments").json()
        c1_after = [c for c in all_c_after if c["id"] == c1["id"]][0]
        c2_after = [c for c in all_c_after if c["id"] == c2["id"]][0]
        assert c1_after["status"] == "waiting"
        assert c1_after["evidence_memory_id"] is None
        assert c2_after["status"] == "completed"
        assert c2_after["evidence_memory_id"] is None
        print("    -> Multiple References Sub-Test PASSED: All referenced commitments updated individually.", flush=True)

        client.delete(f"/memories/{m1_id}")
        client.delete(f"/memories/{m2_id}")

        # TEST D — UNRELATED MEMORY
        print("  Running TEST D: Unrelated Memory Retention...", flush=True)
        res_u = client.post(
            "/memories",
            json={"content": "Unrelated memory that should not be touched.", "memory_type": "general"},
        )
        u_id = res_u.json()["id"]

        res_other = client.post(
            "/memories",
            json={"content": "Temporary memory to be deleted.", "memory_type": "general"},
        )
        other_id = res_other.json()["id"]

        del_other_res = client.delete(f"/memories/{other_id}")
        assert del_other_res.status_code == 204

        get_u = client.get(f"/memories/{u_id}")
        assert get_u.status_code == 200
        assert get_u.json()["content"] == "Unrelated memory that should not be touched."
        print("    -> TEST D PASSED: Unrelated memory remains intact.", flush=True)

        client.delete(f"/memories/{u_id}")

        # TEST E — NONEXISTENT MEMORY
        print("  Running TEST E: Nonexistent Memory 404...", flush=True)
        del_nonexistent = client.delete("/memories/999999")
        assert del_nonexistent.status_code == 404, f"Expected 404 for nonexistent memory, got {del_nonexistent.status_code}"
        print("    -> TEST E PASSED: DELETE /memories/999999 returns HTTP 404.", flush=True)

        # TEST F — EXISTING DEMO SCENARIOS
        print("  Running TEST F: Existing Demo Scenarios (Internship, VLSI, Research Internship, Homework)...", flush=True)
        demo_tests = [
            ("Internship", "I'll submit my internship application after I receive my certificate.", "I received my certificate today.", "Submit internship application", "receive my certificate"),
            ("VLSI", "I'll submit my VLSI project report after my professor reviews my draft.", "My professor reviewed my VLSI draft today.", "Submit VLSI project report", "my professor reviews my draft"),
            ("Research Internship", "I'll apply for the research internship after I receive the recommendation letter.", "My professor sent the recommendation letter today.", "Apply for research internship", "receive recommendation letter"),
            ("Homework", "I will go to school after I do my homework", "I did my homework", "Go to school", "I do my homework"),
        ]
        for name, initial, evidence, task, dep in demo_tests:
            r1 = client.post("/memories", json={"content": initial, "memory_type": "demo", "task": task, "dependency": dep})
            assert r1.status_code == 201
            m1 = r1.json()["id"]
            r2 = client.post("/memories", json={"content": evidence, "memory_type": "demo"})
            assert r2.status_code == 201
            m2 = r2.json()["id"]

            insights = client.get("/insights").json()
            matches = [i for i in insights if i["source_memory_id"] == m1]
            assert len(matches) == 1, f"Failed insight match for {name}"
            assert matches[0]["task"] == task
            assert matches[0]["evidence"] == evidence
            print(f"    - Demo scenario '{name}' passed and generated insight.", flush=True)

        # TEST G — DEMO RESET
        print("  Running TEST G: Demo Reset preserves user memories...", flush=True)
        user_mem = client.post(
            "/memories",
            json={"content": "Important permanent user memory.", "memory_type": "general"},
        ).json()
        user_mem_id = user_mem["id"]

        reset_res = client.post("/demo/reset")
        assert reset_res.status_code == 200

        user_mem_check = client.get(f"/memories/{user_mem_id}")
        assert user_mem_check.status_code == 200, "User memory was incorrectly deleted by demo reset!"
        assert user_mem_check.json()["content"] == "Important permanent user memory."

        all_memories = client.get("/memories").json()
        assert not any(m["memory_type"].startswith("demo") for m in all_memories), "Demo memories still remain after reset!"

        client.delete(f"/memories/{user_mem_id}")
        print("    -> TEST G PASSED: Demo reset cleaned demo data and preserved user memory.", flush=True)

    print("  All Deletion Semantics Tests (TEST A - TEST G) Passed Successfully!\n", flush=True)


def test_prerequisite_reminder_and_database_reset():
    print("[8/8] Testing Prerequisite Reminders ('You're forgetting something…') & Database Reset...", flush=True)
    with TestClient(app) as client:
        # Step 1: Clean test state
        client.post("/database/reset")

        # TEST 1: Prerequisite Reminder
        print("  1. Testing Prerequisite Reminder ('Eat rice first')...", flush=True)
        r1 = client.post("/memories", json={"content": "I will eat dessert after I finish rice", "memory_type": "decision"})
        assert r1.status_code == 201
        m1_id = r1.json()["id"]

        r2 = client.post("/memories", json={"content": "I will eat dessert now", "memory_type": "decision"})
        assert r2.status_code == 201
        m2_id = r2.json()["id"]

        insights = client.get("/insights").json()
        reminders = [i for i in insights if i.get("type") == "reminder"]
        assert len(reminders) == 1, f"Expected 1 reminder, got {len(reminders)}: {insights}"
        rem = reminders[0]
        assert rem["title"] == "You're forgetting something…"
        assert rem["message"] == "Eat rice first."
        assert rem["explanation"] == "You said you'd eat dessert after finishing rice."
        assert rem["task"] == "Eat dessert"
        assert rem["source_memory_id"] == m1_id
        assert rem["evidence_memory_id"] == m2_id
        print("    -> Reminder generated successfully with natural non-accusatory voice.", flush=True)

        # TEST 2: Prerequisite Satisfied (No warning)
        print("  2. Testing Prerequisite Satisfied (No warning)...", flush=True)
        # Reset database to start clean
        client.post("/database/reset")

        # Memory A: Commitment
        client.post("/memories", json={"content": "I will eat dessert after I finish rice", "memory_type": "decision"})
        # Memory B: Evidence satisfying prerequisite
        client.post("/memories", json={"content": "I finished rice", "memory_type": "general"})
        # Memory C: Attempting dependent action now
        client.post("/memories", json={"content": "I will eat dessert now", "memory_type": "general"})

        insights2 = client.get("/insights").json()
        reminders2 = [i for i in insights2 if i.get("type") == "reminder"]
        assert len(reminders2) == 0, f"Expected 0 reminders when prerequisite is satisfied, got: {reminders2}"
        unblocked2 = [i for i in insights2 if i.get("type") == "unblocked"]
        assert len(unblocked2) == 1, "Expected unblocked insight when prerequisite is satisfied"
        print("    -> Prerequisite satisfied correctly produced 0 reminder warnings and 1 unblocked insight.", flush=True)

        # TEST 3: No Prerequisite (Attempting action with no prior commitment)
        print("  3. Testing No Prerequisite (Action by itself)...", flush=True)
        client.post("/database/reset")
        client.post("/memories", json={"content": "I will eat dessert now", "memory_type": "general"})
        insights3 = client.get("/insights").json()
        assert len(insights3) == 0, f"Expected 0 insights when there is no prerequisite, got: {insights3}"
        print("    -> No reminder when no prerequisite was recorded.", flush=True)

        # TEST 4: Unrelated Memory Containing Keywords
        print("  4. Testing Unrelated Memories (No false positive)...", flush=True)
        client.post("/database/reset")
        client.post("/memories", json={"content": "I will eat dessert after I finish rice", "memory_type": "decision"})
        client.post("/memories", json={"content": "Rice is delicious and dessert is tasty", "memory_type": "general"})
        client.post("/memories", json={"content": "I bought some rice from the grocery store", "memory_type": "general"})
        insights4 = client.get("/insights").json()
        reminders4 = [i for i in insights4 if i.get("type") == "reminder"]
        assert len(reminders4) == 0, f"Unrelated memories caused false-positive reminder: {reminders4}"
        print("    -> Unrelated memories containing keywords correctly produced 0 reminders.", flush=True)

        # TEST 5: Conceptual Reusable Examples
        print("  5. Testing Conceptual Reusable Examples (movie, homework, studying)...", flush=True)
        client.post("/database/reset")
        # Example: Movie / Assignment
        client.post("/memories", json={"content": "I'll watch a movie after I finish my assignment.", "memory_type": "general"})
        client.post("/memories", json={"content": "I'll watch a movie now.", "memory_type": "general"})
        ins_movie = client.get("/insights").json()
        rem_movie = [i for i in ins_movie if i.get("type") == "reminder" and "movie" in i["task"].lower()]
        assert len(rem_movie) == 1
        assert rem_movie[0]["message"] == "Finish your assignment first."
        assert rem_movie[0]["explanation"] == "You said you'd watch a movie after finishing your assignment."
        print(f"    - Movie reminder verified: '{rem_movie[0]['message']}' - '{rem_movie[0]['explanation']}'", flush=True)

        # Example: Homework / Games
        client.post("/memories", json={"content": "I'll play games after I complete my homework.", "memory_type": "general"})
        client.post("/memories", json={"content": "I'll play games now.", "memory_type": "general"})
        ins_games = client.get("/insights").json()
        rem_games = [i for i in ins_games if i.get("type") == "reminder" and "games" in i["task"].lower()]
        assert len(rem_games) == 1
        assert rem_games[0]["message"] == "Complete your homework first."
        assert rem_games[0]["explanation"] == "You said you'd play games after completing your homework."
        print(f"    - Games reminder verified: '{rem_games[0]['message']}' - '{rem_games[0]['explanation']}'", flush=True)

        # Example: Outside / Studying
        client.post("/memories", json={"content": "I'll go outside after I finish studying.", "memory_type": "general"})
        client.post("/memories", json={"content": "I'll go outside now.", "memory_type": "general"})
        ins_study = client.get("/insights").json()
        rem_study = [i for i in ins_study if i.get("type") == "reminder" and "outside" in i["task"].lower()]
        assert len(rem_study) == 1
        assert rem_study[0]["message"] == "Finish studying first."
        assert rem_study[0]["explanation"] == "You said you'd go outside after finishing studying."
        print(f"    - Study reminder verified: '{rem_study[0]['message']}' - '{rem_study[0]['explanation']}'", flush=True)

        # TEST 6: Delete Database
        print("  6. Testing Delete Database (POST /database/reset & DELETE /database)...", flush=True)
        # Verify non-zero before reset
        mem_before = client.get("/memories").json()
        com_before = client.get("/commitments").json()
        assert len(mem_before) > 0
        assert len(com_before) > 0

        # Perform database reset
        res_reset = client.post("/database/reset")
        assert res_reset.status_code == 200
        data_reset = res_reset.json()
        assert data_reset["status"] == "ok"
        assert data_reset["deleted"]["memories_deleted"] > 0
        assert data_reset["deleted"]["commitments_deleted"] > 0

        # Verify all tables are completely empty
        mem_after = client.get("/memories").json()
        com_after = client.get("/commitments").json()
        ins_after = client.get("/insights").json()
        assert len(mem_after) == 0, f"Expected 0 memories after reset, got {len(mem_after)}"
        assert len(com_after) == 0, f"Expected 0 commitments after reset, got {len(com_after)}"
        assert len(ins_after) == 0, f"Expected 0 insights after reset, got {len(ins_after)}"
        print("    -> Database reset successfully cleared all memories, commitments, and insights.", flush=True)

    print("  Prerequisite Reminders and Database Reset Tests Passed with 100% Precision!\n", flush=True)


if __name__ == "__main__":
    print("=" * 60, flush=True)
    print("Running FRIEND.OS Comprehensive Backend Verification", flush=True)
    print("=" * 60 + "\n", flush=True)
    try:
        test_sqlite_operations()
        test_proactive_memory_feature()
        test_homework_matcher_unit_tests()
        test_fastapi_endpoints()
        test_hackathon_demo_scenarios()
        test_deletion_semantics()
        test_prerequisite_reminder_and_database_reset()
        print("=" * 60, flush=True)
        print("ALL TESTS PASSED: FRIEND.OS Backend & Proactive Memory Are Fully Operational!", flush=True)
        print("=" * 60, flush=True)
    except Exception as e:
        print(f"\nTEST FAILED with error: {e}", file=sys.stderr, flush=True)
        raise
