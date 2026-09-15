import os
from google import genai
from models import Workflow, WorkflowNode
import time
from google.genai import types
import requests

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
        max_tokens = int(max_tokens_raw) if max_tokens_raw else 2000
    except ValueError:
        max_tokens = 2000

    config = types.GenerateContentConfig(
        temperature=temperature,
        max_output_tokens=max_tokens,
        system_instruction=system_prompt if system_prompt else None,
    )

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

    if node_type == "ifNode":
        operator = data.get("operator", "not_empty")
        compare_to = data.get("compareValue", "")
        result = evaluate_condition(incoming_value, operator, compare_to)
        # The IF node's "output" IS the incoming value, unchanged —
        # it just decides which branch that value continues down.
        # We return both the pass-through value AND the boolean result;
        # execute_workflow uses the boolean to decide which edges to follow.
        return {"value": incoming_value, "conditionResult": result}
    if node_type == "httpNode":
        url = data.get("url", "")
        method = data.get("method", "GET").upper()
        if not url:
            raise WorkflowError("HTTP Node has no URL set.")
        try:
            if method == "GET":
                resp = requests.get(url, timeout=10)
            elif method == "POST":
                resp = requests.post(url, data=str(incoming_value), timeout=10)
            else:
                raise WorkflowError(f"Unsupported HTTP method: {method}")
            return f"[{resp.status_code}] {resp.text[:500]}"
        except requests.RequestException as e:
            raise WorkflowError(f"HTTP request failed: {e}")

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
        incoming_edges[edge.target].append(edge)

    # Tracks which nodes should be SKIPPED because they sit on the
    # untaken branch of an IF node. Populated as we go.
    skipped_node_ids = set()

    results = []

    for node_id in execution_order:
        if node_id in skipped_node_ids:
            results.append({
                "nodeId": node_id,
                "type": node_map[node_id].type,
                "status": "skipped",
                "input": None,
                "output": None,
                "durationSeconds": 0,
            })
            continue

        node = node_map[node_id]
        incoming = incoming_edges[node_id]
        incoming_value = node_outputs[incoming[0].source] if incoming else None

        start_time = time.time()

        try:
            output = run_node(node, incoming_value)
        except WorkflowError as e:
            duration = round(time.time() - start_time, 3)
            results.append({
                "nodeId": node_id, "type": node.type, "status": "error",
                "input": incoming_value, "error": str(e), "durationSeconds": duration,
            })
            return {
                "status": "error", "executionOrder": execution_order,
                "results": results, "failedNodeId": node_id,
            }
        except Exception as e:
            duration = round(time.time() - start_time, 3)
            results.append({
                "nodeId": node_id, "type": node.type, "status": "error",
                "input": incoming_value, "error": f"Unexpected error: {e}", "durationSeconds": duration,
            })
            return {
                "status": "error", "executionOrder": execution_order,
                "results": results, "failedNodeId": node_id,
            }

        duration = round(time.time() - start_time, 3)

        # IF nodes return a dict; every other node returns a plain value.
        if isinstance(output, dict) and "conditionResult" in output:
            condition_result = output["conditionResult"]
            real_output = output["value"]
            node_outputs[node_id] = real_output

            # Find this node's outgoing edges, split by which handle
            # (branch) they came from, and mark the UNTAKEN branch's
            # nodes (and everything downstream of them) as skipped.
            taken_handle = "true" if condition_result else "false"
            skipped_handle = "false" if condition_result else "true"

            outgoing = [e for e in workflow.edges if e.source == node_id]
            skipped_targets = [e.target for e in outgoing if e.sourceHandle == skipped_handle]

            # Walk forward from each skipped target, marking everything
            # reachable from it as skipped too (a whole skipped sub-branch).
            to_visit = list(skipped_targets)
            while to_visit:
                current = to_visit.pop()
                if current in skipped_node_ids:
                    continue
                skipped_node_ids.add(current)
                downstream = [e.target for e in workflow.edges if e.source == current]
                to_visit.extend(downstream)

            results.append({
                "nodeId": node_id, "type": node.type, "status": "success",
                "input": incoming_value, "output": real_output,
                "conditionResult": condition_result, "durationSeconds": duration,
            })
        else:
            node_outputs[node_id] = output
            results.append({
                "nodeId": node_id, "type": node.type, "status": "success",
                "input": incoming_value, "output": output, "durationSeconds": duration,
            })

    return {"status": "success", "executionOrder": execution_order, "results": results}

def evaluate_condition(value, operator, compare_to):
    """
    Evaluates an IF node's condition. Always works on string comparison
    for simplicity, since node values flowing through the pipeline are
    text at this stage.
    """
    text = str(value) if value is not None else ""
    compare_to = compare_to or ""

    if operator == "contains":
        return compare_to in text
    if operator == "equals":
        return text == compare_to
    if operator == "not_empty":
        return text.strip() != ""

    raise WorkflowError(f"Unknown IF condition operator: {operator}")