from src.agent import create_agent, run_agent_loop


def run_agent(user_input: str, max_turns: int = 10) -> str:
    client = create_agent()
    return run_agent_loop(client, user_input, max_turns=max_turns)
