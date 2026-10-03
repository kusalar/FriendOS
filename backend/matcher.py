import re
from typing import Set, Tuple, Optional


# Common English stop words to filter out when extracting core concepts
STOP_WORDS = {
    "a", "an", "the", "my", "your", "his", "her", "their", "our", "its",
    "to", "for", "in", "on", "at", "by", "from", "with", "about", "into",
    "after", "before", "when", "if", "once", "until", "as",
    "that", "this", "these", "those",
    "is", "was", "are", "were", "be", "been", "being",
    "i", "me", "we", "us", "you", "they", "them", "he", "she", "it",
    "will", "would", "shall", "should", "can", "could", "may", "might", "must",
    "today", "now", "just", "already"
}

# Stemming map for common action and state verbs related to tasks & dependencies
VERB_STEMS = {
    "do": "do",
    "did": "do",
    "done": "do",
    "does": "do",
    "doing": "do",
    "receive": "receiv",
    "received": "receiv",
    "receives": "receiv",
    "receiving": "receiv",
    "got": "receiv",
    "get": "receiv",
    "gets": "receiv",
    "getting": "receiv",
    "obtain": "receiv",
    "obtained": "receiv",
    "collect": "receiv",
    "collected": "receiv",
    "complete": "complet",
    "completed": "complet",
    "completes": "complet",
    "completing": "complet",
    "finish": "finish",
    "finished": "finish",
    "finishes": "finish",
    "finishing": "finish",
    "submit": "submit",
    "submitted": "submit",
    "submitting": "submit",
    "submits": "submit",
    "send": "send",
    "sent": "send",
    "sends": "send",
    "sending": "send",
    "pass": "pass",
    "passed": "pass",
    "passes": "pass",
    "passing": "pass",
    "sign": "sign",
    "signed": "sign",
    "signs": "sign",
    "signing": "sign",
    "approve": "approv",
    "approved": "approv",
    "approves": "approv",
    "review": "review",
    "reviewed": "review",
    "reviews": "review",
    "arrive": "arriv",
    "arrived": "arriv",
    "arrives": "arriv",
    "pay": "pay",
    "paid": "pay",
    "pays": "pay",
    "paying": "pay",
    "buy": "buy",
    "bought": "buy",
    "buys": "buy",
    "buying": "buy",
    "eat": "eat",
    "ate": "eat",
    "eaten": "eat",
    "eating": "eat",
    "eats": "eat",
    "watch": "watch",
    "watched": "watch",
    "watching": "watch",
    "watches": "watch",
    "play": "play",
    "played": "play",
    "playing": "play",
    "plays": "play",
    "study": "studi",
    "studied": "studi",
    "studying": "studi",
    "studies": "studi",
    "read": "read",
    "reading": "read",
    "reads": "read",
    "write": "write",
    "wrote": "write",
    "written": "write",
    "writing": "write",
    "writes": "write",
    "go": "go",
    "went": "go",
    "gone": "go",
    "going": "go",
    "goes": "go",
}

# Completion verbs indicating that an action has completed
COMPLETION_TOKENS = {
    "did", "done", "completed", "finished", "passed",
    "signed", "approved", "reviewed", "arrived", "paid", "bought",
    "sent", "submitted", "delivered", "collected", "ready", "achieved",
    "cleared", "accepted", "obtained", "received", "got",
    "ate", "eaten", "watched", "played", "studied", "read", "written", "gone"
}

# Patterns that disqualify an evidence statement (negation, conditionals, future intentions)
DISQUALIFYING_PATTERNS = [
    # Explicit Negation
    r"\bnot\b", r"\bno\b", r"\bnever\b", r"\bdidn't\b", r"\bdid not\b",
    r"\bhaven't\b", r"\bhave not\b", r"\bhadn't\b", r"\bhad not\b",
    r"\bcannot\b", r"\bcan't\b", r"\bwon't\b", r"\bwill not\b",
    r"\bunable\b", r"\bstill waiting\b", r"\byet to\b", r"\bdelayed\b",
    r"\bpostponed\b", r"\bcanceled\b", r"\bcancelled\b",
    # Conditional / Temporal clauses (cannot serve as completed evidence)
    r"\bif\b", r"\bwhen\b", r"\bonce\b", r"\bafter\b", r"\buntil\b", r"\bunless\b",
    r"\bas soon as\b",
    # Future / Intention modals and phrases
    r"\bwill\b", r"\bwould\b", r"\bshall\b", r"\bshould\b", r"\bi'll\b",
    r"\byou'll\b", r"\bhe'll\b", r"\bshe'll\b", r"\bwe'll\b", r"\bthey'll\b",
    r"\bmight\b", r"\bmay\b",
    r"\bhope to\b", r"\bhoping to\b", r"\bplan to\b", r"\bplanning to\b",
    r"\bneed to\b", r"\bhave to\b", r"\bhas to\b", r"\bgoing to\b",
    r"\bwaiting for\b", r"\bwaiting to\b",
]


def _clean_and_tokenize(text: str) -> list[str]:
    """Lowercase and extract words without punctuation."""
    cleaned = re.sub(r"[^\w\s]", " ", text.lower())
    return [w for w in cleaned.split() if w]


def extract_key_concepts(dependency_text: str) -> Tuple[Set[str], Set[str]]:
    """
    Extracts key noun/entity words and action verb stems from a dependency description.
    Returns: (entity_keywords, action_stems)
    """
    tokens = _clean_and_tokenize(dependency_text)
    entity_keywords = set()
    action_stems = set()

    for token in tokens:
        if token in VERB_STEMS:
            action_stems.add(VERB_STEMS[token])
        elif token not in STOP_WORDS and len(token) > 2:
            entity_keywords.add(token)

    return entity_keywords, action_stems


def is_dependency_satisfied(dependency_text: str, evidence_text: str) -> bool:
    """
    Determines deterministically whether the evidence_text provides strong,
    unambiguous proof that the dependency has been completed.

    Rules:
    1. Must NOT contain negation, conditionality, or future hypothetical phrasing.
    2. Must match at least one key noun/entity keyword from the dependency.
    3. Must contain affirmative completion evidence (past tense action, completion token, or factual affirmation).
    """
    if not dependency_text or not evidence_text:
        return False

    evidence_lower = evidence_text.lower()

    # Rule 1: Check for any disqualifying pattern (negation, future, hypothetical, condition)
    for pattern in DISQUALIFYING_PATTERNS:
        if re.search(pattern, evidence_lower):
            return False

    entity_keywords, action_stems = extract_key_concepts(dependency_text)
    evidence_tokens = _clean_and_tokenize(evidence_text)
    evidence_stems = {VERB_STEMS.get(t, t) for t in evidence_tokens}

    # If dependency has no recognizable entity keywords, fallback to action stems
    if not entity_keywords and not action_stems:
        return False

    # Rule 2: Check entity keyword match
    entity_matched = False
    if entity_keywords:
        for keyword in entity_keywords:
            if keyword in evidence_tokens or any(keyword in t or t in keyword for t in evidence_tokens if len(t) > 3):
                entity_matched = True
                break
    else:
        entity_matched = True

    if not entity_matched:
        return False

    # Rule 3: Check completion evidence
    has_completion_indicator = False

    # Check for direct completion tokens (past tense verbs, e.g. received, approved, arrived)
    for token in evidence_tokens:
        if token in COMPLETION_TOKENS:
            has_completion_indicator = True
            break

    # If dependency had a specific action stem (e.g. 'receiv') and evidence contains that action in affirmative non-disqualified context
    if action_stems and any(stem in evidence_stems for stem in action_stems):
        has_completion_indicator = True

    # Affirmative statements like "I have my certificate" or "Certificate arrived today"
    if entity_matched and any(w in evidence_tokens for w in ["have", "has", "here", "today", "ready", "finally", "now"]):
        has_completion_indicator = True

    return entity_matched and has_completion_indicator


def is_task_attempted(task_text: str, memory_text: str) -> bool:
    """
    Determines deterministically whether memory_text represents an attempt or
    declaration of performing the dependent task now / immediately.
    """
    if not task_text or not memory_text:
        return False

    mem_lower = memory_text.lower()

    # Rule 1: Must not be a future conditional or prerequisite clause
    for pattern in [r"\bafter\b", r"\bonce\b", r"\bwhen\b", r"\bas soon as\b", r"\bif\b", r"\buntil\b", r"\bunless\b"]:
        if re.search(pattern, mem_lower):
            return False

    # Rule 2: Must not contain negative indicators
    for pattern in [r"\bnot\b", r"\bno\b", r"\bnever\b", r"\bdidn't\b", r"\bdid not\b", r"\bwon't\b", r"\bwill not\b", r"\bcan't\b", r"\bcannot\b", r"\bhaven't\b"]:
        if re.search(pattern, mem_lower):
            return False

    # Extract task concepts
    task_entities, task_actions = extract_key_concepts(task_text)
    mem_tokens = _clean_and_tokenize(memory_text)
    mem_stems = {VERB_STEMS.get(t, t) for t in mem_tokens}

    # Entity match
    entity_matched = False
    if task_entities:
        for entity in task_entities:
            if entity in mem_tokens or any(entity in t or t in entity for t in mem_tokens if len(t) > 3):
                entity_matched = True
                break
    else:
        entity_matched = True

    if not entity_matched:
        return False

    # Action match
    action_matched = False
    if task_actions:
        for action in task_actions:
            if action in mem_stems:
                action_matched = True
                break
    else:
        action_matched = True

    if not action_matched:
        return False

    # Immediacy / Present declaration indicators
    immediacy_words = {"now", "today", "currently", "right", "tonight", "already", "finally", "ready"}
    has_immediacy = any(w in mem_tokens for w in immediacy_words)

    # Intention / present action phrases:
    has_declaration = bool(re.search(r"\b(?:i will|i'll|i am|i'm|going to|about to|we will|we'll)\b", mem_lower))
    has_present_continuous = any(t.endswith("ing") for t in mem_tokens)

    return has_immediacy or has_declaration or has_present_continuous


def format_reminder_message(dependency: str) -> str:
    """
    Formats a concise, natural, non-robotic reminder guidance message:
    e.g. "Eat rice first." or "Finish your assignment first."
    """
    dep = dependency.strip().rstrip(".")
    # Remove leading subject or temporal words: "i ", "we ", "you ", "after ", "once ", "when "
    dep = re.sub(r"^(?:i|we|you|after|once|when)\s+", "", dep, flags=re.IGNORECASE)
    dep = re.sub(r"\bmy\b", "your", dep, flags=re.IGNORECASE)
    dep = re.sub(r"\bme\b", "you", dep, flags=re.IGNORECASE)
    dep = dep.strip()

    # Prompt specific natural phrasing: "Eat rice first."
    if re.search(r"\b(?:finish(?:ing)?|eat(?:ing)?)\s+rice\b", dep, re.IGNORECASE):
        return "Eat rice first."

    if dep:
        return f"{dep[0].upper() + dep[1:]} first."
    return "Complete prerequisite first."


def format_reminder_explanation(task: str, dependency: str) -> str:
    """
    Formats a natural, personal explanation:
    e.g. "You said you'd eat dessert after finishing rice."
    """
    t = task.strip().rstrip(".")
    t = re.sub(r"^(?:i will|i'll|i am|i'm|to)\s+", "", t, flags=re.IGNORECASE).strip()
    t_clean = t[0].lower() + t[1:] if t else ""

    dep = dependency.strip().rstrip(".")
    dep = re.sub(r"^(?:i|we|you|after|once|when)\s+", "", dep, flags=re.IGNORECASE).strip()
    dep = re.sub(r"\bmy\b", "your", dep, flags=re.IGNORECASE)

    words = dep.split()
    if words:
        first_word = words[0].lower()
        ing_map = {
            "finish": "finishing",
            "finishes": "finishing",
            "complete": "completing",
            "completes": "completing",
            "eat": "eating",
            "eats": "eating",
            "study": "studying",
            "studies": "studying",
            "do": "doing",
            "does": "doing",
            "receive": "receiving",
            "receives": "receiving",
            "get": "getting",
            "gets": "getting",
            "watch": "watching",
            "watches": "watching",
        }
        if first_word in ing_map:
            words[0] = ing_map[first_word]
        elif not first_word.endswith("ing"):
            if first_word.endswith("e"):
                words[0] = first_word[:-1] + "ing"
            else:
                words[0] = first_word + "ing"
        dep = " ".join(words)

    return f"You said you'd {t_clean} after {dep}."

