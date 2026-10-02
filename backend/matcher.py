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
    "done": "finish",
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
}

# Completion verbs indicating that an action has taken place
COMPLETION_TOKENS = {
    "received", "got", "completed", "finished", "done", "passed",
    "signed", "approved", "reviewed", "arrived", "paid", "bought",
    "sent", "submitted", "delivered", "collected", "ready", "achieved",
    "receiv", "complet", "finish", "approv", "arriv"
}

# Negation patterns that disqualify an evidence statement
NEGATION_PATTERNS = [
    r"\bnot\b",
    r"\bno\b",
    r"\bnever\b",
    r"\bdidn't\b",
    r"\bdid not\b",
    r"\bhaven't\b",
    r"\bhave not\b",
    r"\bhadn't\b",
    r"\bhad not\b",
    r"\bcannot\b",
    r"\bcan't\b",
    r"\bwon't\b",
    r"\bwill not\b",
    r"\bunable\b",
    r"\bstill waiting\b",
    r"\byet to\b",
    r"\bdelayed\b",
    r"\bpostponed\b",
    r"\bcanceled\b",
    r"\bcancelled\b",
]

# Hypothetical/future patterns that disqualify an evidence statement
HYPOTHETICAL_PATTERNS = [
    r"\bif i\b",
    r"\bwhen i\b",
    r"\bonce i\b",
    r"\bhope to\b",
    r"\bhoping to\b",
    r"\bplan to\b",
    r"\bplanning to\b",
    r"\bwill receive\b",
    r"\bwill get\b",
    r"\bwill complete\b",
    r"\bwill finish\b",
    r"\bgoing to\b",
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
    1. Must match at least one key noun/entity keyword from the dependency.
    2. Must NOT contain negation (e.g., 'haven't received', 'not finished').
    3. Must NOT be purely future/hypothetical (e.g., 'will receive', 'if I receive').
    4. Must contain affirmative completion evidence (past tense action or completion token).
    """
    if not dependency_text or not evidence_text:
        return False

    evidence_lower = evidence_text.lower()

    # Rule 2: Check for explicit negation
    for neg_pattern in NEGATION_PATTERNS:
        if re.search(neg_pattern, evidence_lower):
            return False

    # Rule 3: Check for future/hypothetical phrasing
    for hyp_pattern in HYPOTHETICAL_PATTERNS:
        if re.search(hyp_pattern, evidence_lower):
            return False

    entity_keywords, action_stems = extract_key_concepts(dependency_text)
    evidence_tokens = _clean_and_tokenize(evidence_text)
    evidence_stems = {VERB_STEMS.get(t, t) for t in evidence_tokens}

    # If dependency has no recognizable entity keywords, fallback to action stems
    if not entity_keywords and not action_stems:
        return False

    # Rule 1: Check entity keyword match
    entity_matched = False
    if entity_keywords:
        for keyword in entity_keywords:
            # Check exact token match or substring match for compound words
            if keyword in evidence_tokens or any(keyword in t or t in keyword for t in evidence_tokens if len(t) > 3):
                entity_matched = True
                break
    else:
        # If no specific noun (e.g. "after finishing"), entity check defaults to true
        entity_matched = True

    if not entity_matched:
        return False

    # Rule 4: Check completion evidence
    # A completion indicator is present if:
    # a) Any generic completion token is in evidence tokens, OR
    # b) The specific action stem from the dependency is in evidence in a completed form
    has_completion_indicator = False

    # Check for direct completion tokens
    for token in evidence_tokens:
        if token in COMPLETION_TOKENS or VERB_STEMS.get(token) in COMPLETION_TOKENS:
            has_completion_indicator = True
            break

    # If dependency had a specific action stem (e.g. 'receiv'), check if that stem is in evidence
    if action_stems and any(stem in evidence_stems for stem in action_stems):
        has_completion_indicator = True

    # In affirmative statements like "I have my certificate" or "Certificate in hand"
    if entity_matched and any(w in evidence_tokens for w in ["have", "has", "here", "today", "ready", "finally", "now"]):
        has_completion_indicator = True

    return entity_matched and has_completion_indicator
