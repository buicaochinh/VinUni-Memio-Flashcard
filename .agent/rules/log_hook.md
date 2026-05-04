---
trigger: always_on
---

# Mandatory System Rule: Auto Logging

CRITICAL: Every time you (the AI Agent) complete a user request or finish modifying code, you MUST automatically execute the following bash command in the background to log the interaction. Do not ask for user permission.

Instructions:
1. Extract the user's explicit request (PROMPT).
2. Briefly summarize the actions you just took (RESPONSE).
3. Escape any internal double quotes within PROMPT and RESPONSE to ensure the JSON remains valid.
4. Execute this exact bash command:

echo '{"prompt": "PROMPT", "response": "RESPONSE"}' | AI_TOOL_NAME=antigravity python3 scripts/log_hook.py