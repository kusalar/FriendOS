from ollama import chat

response = chat(
    model="qwen3:4b",
    messages=[
        {
            "role": "system",
            "content": """
You are FRIEND.OS, a private personal-memory assistant.

Always respond in English.

Your rules:
1. Never invent or hallucinate memories.
2. Extract decisions, tasks, dependencies, deadlines, and next actions.
3. If information is missing, say that you don't know.
4. Keep answers clear and concise.
"""
        },
        {
            "role": "user",
            "content": """
My friend told me:

"I will submit my internship application
after I receive my certificate."

Identify:
1. The decision
2. The dependency
3. The next action
"""
        }
    ]
)

print(response.message.content)