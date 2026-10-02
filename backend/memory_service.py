import json
import re
from typing import Dict, Any, Optional
import ollama

from backend.config import OLLAMA_MODEL


# System prompt defining role, extraction schema, and strict rules
EXTRACTION_SYSTEM_PROMPT = """You are FRIEND.OS, a private personal-memory assistant.
Your job is to analyze notes and conversational transcripts from one friend and extract structured memory elements.

Analyze the given text and output ONLY a valid JSON object with the following exact keys:
{
  "decision": null,
  "task": null,
  "dependency": null,
  "deadline": null,
  "next_action": null,
  "status": null
}

Strict Rules:
1. Always respond in English.
2. Output ONLY the JSON object. Do not output <think> tags or reasoning thoughts. Start directly with '{'.
3. Never invent, guess, or hallucinate missing details.
4. If a field is not explicitly mentioned or clearly implied in the text, its value MUST be null.
5. "decision": choices or commitments made.
6. "task": specific work items to be done.
7. "dependency": conditions or events required before something else can occur.
8. "deadline": specific dates, times, or target timeframes.
9. "next_action": the concrete immediate next step.
10. "status": current state (e.g. "pending", "in_progress", "completed", or null).
"""


def _clean_json_string(raw_text: str) -> str:
    """
    Strips reasoning <think>...</think> tags and markdown code fences to isolate JSON.
    """
    text = raw_text.strip()
    
    # Strip thinking blocks emitted by reasoning models like Qwen3
    text = re.sub(r"<think>[\s\S]*?</think>", "", text, flags=re.IGNORECASE).strip()

    # Remove markdown code blocks if present
    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text, re.IGNORECASE)
    if match:
        text = match.group(1).strip()
    else:
        # Fallback to finding the first { and last }
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1 and end > start:
            text = text[start : end + 1]
            
    return text


def _normalize_value(val: Any) -> Optional[str]:
    """
    Normalizes missing or pseudo-null values from LLM output to Python None.
    """
    if val is None:
        return None
    if isinstance(val, str):
        val_clean = val.strip()
        lower = val_clean.lower()
        if lower in {"none", "null", "n/a", "not specified", "unknown", ""}:
            return None
        return val_clean
    return str(val)


def analyze_memory_text(text: str) -> Dict[str, Optional[str]]:
    """
    Sends the user text to Qwen3 via Ollama and returns structured memory components.
    Guarantees keys: decision, task, dependency, deadline, next_action, status.
    """
    # Call local Ollama chat API without restrictive GBNF grammar for high speed
    response = ollama.chat(
        model=OLLAMA_MODEL,
        messages=[
            {"role": "system", "content": EXTRACTION_SYSTEM_PROMPT},
            {"role": "user", "content": f"Text to analyze:\n\"\"\"\n{text}\n\"\"\""},
        ],
        options={"temperature": 0.1, "num_predict": 512},
    )

    raw_content = response.message.content
    cleaned_content = _clean_json_string(raw_content)

    try:
        parsed = json.loads(cleaned_content)
        if not isinstance(parsed, dict):
            parsed = {}
    except Exception:
        parsed = {}

    expected_keys = ["decision", "task", "dependency", "deadline", "next_action", "status"]
    result: Dict[str, Optional[str]] = {}

    for key in expected_keys:
        result[key] = _normalize_value(parsed.get(key))

    return result
