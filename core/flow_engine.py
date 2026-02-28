"""
Flow engine — interprets canvas JSON during live calls.
"""
import logging
from typing import Optional, Dict, Any, List

logger = logging.getLogger("tron.flow_engine")


def build_prompt_from_flow(
    flow_canvas: Optional[Dict[str, Any]],
    agent_persona: str,
    contact_name: Optional[str] = None,
    contact_metadata: Optional[Dict[str, Any]] = None,
) -> str:
    """
    Build a system prompt from the agent persona and optional flow canvas.
    For simple (no-canvas) agents, just returns the persona with context.
    For flow-based agents, summarizes the flow as instructions.
    """
    parts = [agent_persona or "You are a helpful voice assistant."]

    if contact_name:
        parts.append(f"\nThe person you are calling is named: {contact_name}")

    if contact_metadata:
        meta_str = ", ".join(f"{k}: {v}" for k, v in contact_metadata.items())
        parts.append(f"Additional context: {meta_str}")

    if flow_canvas and flow_canvas.get("nodes"):
        flow_summary = _summarize_flow(flow_canvas)
        if flow_summary:
            parts.append(f"\nConversation Flow:\n{flow_summary}")

    parts.append("\nKeep responses short (1-3 sentences) — this is a voice call.")
    parts.append("If called in Hindi, respond in Hindi. If English, respond in English.")

    return "\n".join(parts)


def _summarize_flow(canvas: Dict[str, Any]) -> str:
    """Convert canvas JSON to a text summary for the LLM prompt."""
    nodes = {n["id"]: n for n in canvas.get("nodes", [])}
    edges = canvas.get("edges", [])

    # Build adjacency list
    adjacency = {}
    for edge in edges:
        src = edge.get("source")
        tgt = edge.get("target")
        handle = edge.get("sourceHandle", "default")
        if src not in adjacency:
            adjacency[src] = []
        adjacency[src].append({"target": tgt, "handle": handle, "label": edge.get("label", "")})

    # Find start node
    start_node = next(
        (n for n in nodes.values() if n.get("type") in ("start_outbound", "start_inbound")),
        None
    )
    if not start_node:
        return ""

    # Walk the flow
    lines = ["Follow this conversation flow:"]
    visited = set()
    queue = [start_node["id"]]

    while queue:
        node_id = queue.pop(0)
        if node_id in visited:
            continue
        visited.add(node_id)

        node = nodes.get(node_id)
        if not node:
            continue

        node_type = node.get("type", "")
        data = node.get("data", {})

        # Describe this node
        desc = _describe_node(node_type, data)
        if desc:
            lines.append(f"- {desc}")

        # Queue children
        for edge in adjacency.get(node_id, []):
            queue.append(edge["target"])

    return "\n".join(lines)


def _describe_node(node_type: str, data: Dict[str, Any]) -> str:
    """Convert a node type + data into a human-readable instruction."""
    if node_type in ("start_outbound", "start_inbound"):
        return "Start the call."
    elif node_type == "greeting":
        text = data.get("text", "")
        return f'Greet the caller: "{text}"'
    elif node_type == "speak":
        text = data.get("text", "")
        return f'Say: "{text}"'
    elif node_type == "listen":
        timeout = data.get("timeout_seconds", 5)
        return f"Listen for the caller's response (up to {timeout} seconds)."
    elif node_type == "llm_response":
        instructions = data.get("instructions", "")
        return f"Respond using LLM: {instructions}"
    elif node_type == "branch_intent":
        intents = data.get("intents", [])
        intent_labels = ", ".join(i.get("label", "") for i in intents)
        return f"Classify caller intent ({intent_labels}) and route accordingly."
    elif node_type == "branch_keyword":
        return "Route based on keyword in caller's response."
    elif node_type == "branch_sentiment":
        return "Route based on sentiment (positive/neutral/negative)."
    elif node_type == "set_variable":
        var = data.get("variable_name", "")
        return f"Extract and store {var} from the caller's response."
    elif node_type == "webhook":
        url = data.get("url", "")
        return f"Call webhook: {url}"
    elif node_type == "transfer":
        number = data.get("transfer_to", "")
        return f"Transfer the call to {number}."
    elif node_type == "end_call":
        text = data.get("closing_message", "")
        outcome = data.get("outcome", "")
        parts = []
        if text:
            parts.append(f'Say: "{text}"')
        if outcome:
            parts.append(f"Tag outcome as: {outcome}")
        parts.append("End the call.")
        return " ".join(parts)
    elif node_type == "wait":
        seconds = data.get("seconds", 2)
        return f"Pause for {seconds} seconds."
    return ""


def validate_flow(canvas: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Validate a flow canvas. Returns {"valid": bool, "errors": [...], "warnings": [...]}.
    """
    if not canvas:
        return {"valid": True, "errors": [], "warnings": ["No canvas data — agent will use freeform mode."]}

    nodes = canvas.get("nodes", [])
    edges = canvas.get("edges", [])
    errors = []
    warnings = []

    if not nodes:
        return {"valid": False, "errors": ["Flow has no nodes."], "warnings": []}

    # Check for start node
    start_nodes = [n for n in nodes if n.get("type") in ("start_outbound", "start_inbound")]
    if not start_nodes:
        errors.append("Flow must have at least one Start node.")
    elif len(start_nodes) > 1:
        warnings.append("Flow has multiple Start nodes — only the first will be used.")

    # Check for at least one end node
    end_nodes = [n for n in nodes if n.get("type") == "end_call"]
    if not end_nodes:
        warnings.append("Flow has no End Call node — call may never terminate gracefully.")

    # Check disconnected nodes
    connected = set()
    for edge in edges:
        connected.add(edge.get("source"))
        connected.add(edge.get("target"))

    node_ids = {n["id"] for n in nodes}
    disconnected = node_ids - connected - {n["id"] for n in start_nodes}
    if disconnected:
        warnings.append(f"{len(disconnected)} node(s) are not connected to any edge.")

    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "warnings": warnings
    }
