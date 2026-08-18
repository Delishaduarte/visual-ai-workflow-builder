import os
from google import genai
from models import Workflow, WorkflowNode


class WorkflowError(Exception):
    """Raised when a workflow can't be executed (cycles, bad edges, etc.)."""
    pass


# Created once, reused for every request — the client reads
# GEMINI_API_KEY from the environment automatically.
_gemini_client = None


def get_gemini_client():
    global _gemini_client
    if _gemini_client is None:
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise WorkflowError(
                "GEMINI_API_KEY is not set. Check your backend/.env file."
            )
        _gemini_client = genai.Client(api_key=api_key)
    return _gemini_client


def build_graph(workflow: Workflow):
    node_map = {node.id: node for node in workflow.nodes}
    adjacency = {node.id: [] for node in workflow.nodes}
    in_degree = {node.id: 0 for node in workflow.nodes}

    for edge in workflow.edges:
        if edge.source not in node_map:
            raise WorkflowError(f"Edge references unknown source node: {edge.source}")
        if edge.target not in node_map:
            raise WorkflowError(f"Edge references unknown target node: {edge.target}")

        adjacency[edge.source].append(edge.target)
        in_degree[edge.target] += 1

    return node_map, adjacency, in_degree


def topological_sort(workflow: Workflow):
    node_map, adjacency, in_degree = build_graph(workflow)

    queue = [node_id for node_id, degree in in_degree.items() if degree == 0]
    execution_order = []

    while queue:
        current_id = queue.pop(0)
        execution_order.append(current_id)

        for child_id in adjacency[current_id]:
            in_degree[child_id] -= 1
            if in_degree[child_id] == 0:
                queue.append(child_id)

    if len(execution_order) != len(node_map):
        raise WorkflowError("Workflow contains a cycle — cannot determine execution order.")

    return execution_order, node_map


def find_disconnected_nodes(workflow: Workflow):
    if len(workflow.nodes) <= 1:
        return []

    touched = set()
    for edge in workflow.edges:
        touched.add(edge.source)
        touched.add(edge.target)

    return [node.id for node in workflow.nodes if node.id not in touched]


def call_gemini(prompt_text: str, data: dict) -> str:
    """
    Sends a real request to the Gemini API using settings from the
    LLM node's config fields. Falls back to sensible defaults if a
    field was left empty.
    """
    client = get_gemini_client()

    model = data.get("model") or "gemini-3.6-flash"
    system_prompt = data.get("systemPrompt") or ""

    temperature_raw = data.get("temperature")
    try:
        temperature = float(temperature_raw) if temperature_raw else 0.7
    except ValueError:
        temperature = 0.7

    max_tokens_raw = data.get("maxTokens")
    try:
        max_tokens = int(max_tokens_raw) if max_tokens_raw else 1000
    except ValueError:
        max_tokens = 1000

    config = {
        "temperature": temperature,
        "max_output_tokens": max_tokens,
    }
    if system_prompt:
        config["system_instruction"] = system_prompt

    try:
        response = client.models.generate_content(
            model=model,
            contents=prompt_text,
            config=config,
        )
    except Exception as e:
        raise WorkflowError(f"Gemini API call failed: {e}")

    return response.text


def run_node(node: WorkflowNode, incoming_value):
    node_type = node.type
    data = node.data

    if node_type == "inputNode":
        return data.get("value", "")

    if node_type == "promptTemplateNode":
        template = data.get("template", "")
        # Simple substitution: replace {{ any_variable_name }} with the
        # incoming value. Only supports ONE variable for now.
        if "{{" in template and "}}" in template:
            start = template.find("{{")
            end = template.find("}}") + 2
            return template[:start] + str(incoming_value) + template[end:]
        return template

    if node_type == "llmNode":
        return call_gemini(str(incoming_value), data)

    if node_type == "formatterNode":
        format_type = data.get("formatType", "text")
        return f"[FORMATTED as {format_type}] {incoming_value}"

    if node_type == "outputNode":
        return incoming_value

    raise WorkflowError(f"Unknown node type: {node_type}")


def execute_workflow(workflow: Workflow):
    disconnected = find_disconnected_nodes(workflow)
    if disconnected:
        raise WorkflowError(f"Workflow has disconnected nodes: {disconnected}")

    execution_order, node_map = topological_sort(workflow)

    node_outputs = {}
    incoming_edges = {node_id: [] for node_id in node_map}
    for edge in workflow.edges:
        incoming_edges[edge.target].append(edge.source)

    results = []

    for node_id in execution_order:
        node = node_map[node_id]
        sources = incoming_edges[node_id]
        incoming_value = node_outputs[sources[0]] if sources else None

        try:
            output = run_node(node, incoming_value)
        except WorkflowError:
            raise
        except Exception as e:
            raise WorkflowError(f"Error executing node '{node_id}' ({node.type}): {e}")

        node_outputs[node_id] = output
        results.append({"nodeId": node_id, "type": node.type, "output": output})

    return {
        "status": "success",
        "executionOrder": execution_order,
        "results": results,
    }