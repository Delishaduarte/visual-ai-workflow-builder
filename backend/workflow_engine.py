import os
from google import genai
from models import Workflow, WorkflowNode
import time
from google.genai import types
import requests
import json
import re

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

def run_python_code(code_string, incoming_value):
        """
        Executes a small, constrained Python snippet. The user's code has
        access to `input_value` and must assign to `result`. Uses a
        restricted globals dict to limit (not eliminate) what's reachable.
        NOTE: this is NOT safe for untrusted/public multi-user use — it's
        acceptable only because this is a single-user local app.
        """
        local_scope = {"input_value": incoming_value, "result": None}
        safe_builtins = {
            "len": len, "str": str, "int": int, "float": float,
            "list": list, "dict": dict, "range": range, "sum": sum,
            "min": min, "max": max, "abs": abs, "round": round,
            "sorted": sorted, "enumerate": enumerate,
        }
        try:
            exec(code_string, {"__builtins__": safe_builtins}, local_scope)
        except Exception as e:
            raise WorkflowError(f"Code Node execution failed: {e}")

        return local_scope.get("result")


def call_gemini(prompt_text: str, data: dict, api_key: str) -> str:
    from google import genai
    from google.genai import types

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
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model=model,
            contents=prompt_text,
            config=config,
        )
    except Exception as e:
        raise WorkflowError(f"Gemini API call failed: {e}")

    usage = response.usage_metadata
    token_usage = {
        "promptTokens": usage.prompt_token_count,
        "outputTokens": usage.candidates_token_count,
        "thinkingTokens": getattr(usage, "thoughts_token_count", None),
        "totalTokens": usage.total_token_count,
        "maxTokensAllowed": max_tokens,
    }
    return {"text": response.text, "tokenUsage": token_usage}

def call_openai(prompt_text: str, data: dict, api_key: str) -> str:
    import requests

    model = data.get("model") or "gpt-4o-mini"
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

    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt_text})

    try:
        resp = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "model": model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
            },
            timeout=30,
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]
    except requests.RequestException as e:
        raise WorkflowError(f"OpenAI API call failed: {e}")


def call_anthropic(prompt_text: str, data: dict, api_key: str) -> str:
    import requests

    model = data.get("model") or "claude-sonnet-5"
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

    try:
        resp = requests.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": model,
                "max_tokens": max_tokens,
                "temperature": temperature,
                "system": system_prompt or None,
                "messages": [{"role": "user", "content": prompt_text}],
            },
            timeout=30,
        )
        resp.raise_for_status()
        return resp.json()["content"][0]["text"]
    except requests.RequestException as e:
        raise WorkflowError(f"Anthropic API call failed: {e}")


def call_openrouter(prompt_text: str, data: dict, api_key: str) -> str:
    import requests

    model = data.get("model") or "openai/gpt-4o-mini"
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

    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt_text})

    try:
        resp = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "model": model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
            },
            timeout=30,
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]
    except requests.RequestException as e:
        raise WorkflowError(f"OpenRouter API call failed: {e}")


def call_llm(prompt_text: str, data: dict) -> str:
    """
    Dispatches to the right provider using the API key the REQUEST
    carries (typed in by whoever is running the workflow). Falls back
    to the server's own GEMINI_API_KEY only for the gemini provider,
    and only if the user left their own key blank — handy for the
    developer's own local testing, never used for other providers.
    """
    provider = data.get("provider", "gemini")
    api_key = (data.get("apiKey") or "").strip()

    if not api_key:
        raise WorkflowError(
            f"No API key provided for {provider}. Enter your own key in the LLM node."
        )
    if provider == "gemini":
        result = call_gemini(prompt_text, data, api_key)
        return result["text"], result["tokenUsage"]
    if provider == "openai":
        return call_openai(prompt_text, data, api_key), None
    if provider == "anthropic":
        return call_anthropic(prompt_text, data, api_key), None
    if provider == "openrouter":
        return call_openrouter(prompt_text, data, api_key), None

    raise WorkflowError(f"Unknown provider: {provider}")

def fill_template(template, variables, incoming_value):
    """
    Replaces every {{name}} in the template.
    {{input}} is the output of the previous node.
    Any other name must be a variable defined by an upstream Input node.
    """
    def replace(match):
        name = match.group(1).strip()
        if name == "input":
            return "" if incoming_value is None else str(incoming_value)
        if name in variables:
            return str(variables[name])
        available = ", ".join(sorted(variables)) or "none"
        raise WorkflowError(
            "Prompt Template uses {{" + name + "}} but no upstream Input is named '"
            + name + "'. Available variables: " + available
        )

    return re.sub(r"\{\{\s*([^{}]+?)\s*\}\}", replace, template)

def extract_or_wrap_json(text):
    """
    Tries hard to return valid JSON from whatever the previous node
    produced, in this order:
      1. The whole text is already valid JSON — use it as-is.
      2. A JSON object/array is hiding inside a ```json ... ``` block,
         or just sitting somewhere inside a longer reply — pull that
         part out and use it.
      3. Nothing JSON-shaped was found — fall back to wrapping the
         original text, so the output is still guaranteed valid JSON,
         never a crash and never silently-wrong data.
    """
    import json
    import re

    stripped = text.strip()

    # 1. Already valid JSON on its own.
    try:
        json.loads(stripped)
        return stripped
    except (json.JSONDecodeError, ValueError):
        pass

    # 2a. A ```json ... ``` or ``` ... ``` code block.
    code_block = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if code_block:
        candidate = code_block.group(1).strip()
        try:
            json.loads(candidate)
            return candidate
        except (json.JSONDecodeError, ValueError):
            pass

    # 2b. The first { ... } or [ ... ] found anywhere in the text,
    # matched from the first opening brace to the last closing one.
    for open_ch, close_ch in (("{", "}"), ("[", "]")):
        start = text.find(open_ch)
        end = text.rfind(close_ch)
        if start != -1 and end != -1 and end > start:
            candidate = text[start:end + 1]
            try:
                json.loads(candidate)
                return candidate
            except (json.JSONDecodeError, ValueError):
                pass

    # 3. Nothing JSON-shaped found anywhere — wrap the raw text so the
    # result is still valid JSON, just honest that no structure was found.
    return json.dumps({"result": text}, ensure_ascii=False)

def run_node(node: WorkflowNode, incoming_value, variables=None):
    node_type = node.type
    data = node.data

    if node_type == "inputNode":
        return data.get("value", "")

    if node_type == "mergeNode":
            mode = data.get("mode", "newline")
            values = incoming_value if isinstance(incoming_value, list) else [incoming_value]
            values = [str(v) for v in values if v is not None]
            if not values:
                raise WorkflowError("Merge Node has no connected inputs.")
            if mode == "newline":
                return "\n".join(values)
            if mode == "space":
                return " ".join(values)
            if mode == "json":
                return json.dumps(values, ensure_ascii=False)
            raise WorkflowError(f"Unknown Merge mode: {mode}")

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
        return fill_template(template, variables or {}, incoming_value)
        # Simple substitution: replace {{ any_variable_name }} with the
        # incoming value. Only supports ONE variable for now.
        # if "{{" in template and "}}" in template:
        #     start = template.find("{{")
        #     end = template.find("}}") + 2
        #     return template[:start] + str(incoming_value) + template[end:]
        # return template

    if node_type == "codeNode":
        code_string = data.get("code", "")
        if not code_string.strip():
            raise WorkflowError("Code Node has no code to run.")
        return run_python_code(code_string, incoming_value)
    if node_type == "llmNode":
        text, token_usage = call_llm(str(incoming_value), data)
        return {"text": text, "tokenUsage": token_usage} if token_usage else text

    if node_type == "formatterNode":
        format_type = data.get("formatType", "text")
        text = str(incoming_value) if incoming_value is not None else ""

        if format_type == "text":
            return text
        if format_type == "json":
            return extract_or_wrap_json(text)

        raise WorkflowError(f"Unknown format type: {format_type}")

    if node_type == "outputNode":
        return incoming_value

    raise WorkflowError(f"Unknown node type: {node_type}")

def handle_number(handle):
    """'in-3' -> 3. Edges with no numbered handle sort last."""
    if handle and handle.startswith("in-"):
        try:
            return int(handle.split("-")[1])
        except ValueError:
            pass
    return 10_000


def execute_workflow(workflow: Workflow):
    disconnected = find_disconnected_nodes(workflow)
    if disconnected:
        raise WorkflowError(f"Workflow has disconnected nodes: {disconnected}")

    execution_order, node_map = topological_sort(workflow)

    node_outputs = {}
    node_vars = {}  # node id -> variables visible after that node runs
    skipped_node_ids = set()
    taken_handles = {}  # IF node id -> "true" or "false"

    incoming_edges = {node_id: [] for node_id in node_map}
    for edge in workflow.edges:
        incoming_edges[edge.target].append(edge)

    def edge_is_live(edge):
        """An edge is dead if its source was skipped, or it leaves an
        IF node through the branch that was not taken."""
        if edge.source in skipped_node_ids:
            return False
        if edge.source in taken_handles:
            return edge.sourceHandle == taken_handles[edge.source]
        return True

    results = []

    for node_id in execution_order:
        node = node_map[node_id]
        incoming = incoming_edges[node_id]
        live_edges = [e for e in incoming if edge_is_live(e)]

        if incoming and not live_edges:
            skipped_node_ids.add(node_id)
            results.append({
                "nodeId": node_id, "type": node.type, "status": "skipped",
                "input": None, "output": None, "durationSeconds": 0,
            })
            continue

        if node.type == "mergeNode":
            source_edges = sorted(live_edges, key=lambda e: handle_number(e.targetHandle))
            incoming_value = [node_outputs[e.source] for e in source_edges]
        else:
            source_edges = live_edges[:1]
            incoming_value = node_outputs[source_edges[0].source] if source_edges else None

        # Variables visible to this node: everything defined upstream,
        # plus this node's own name if it is an Input.
        variables = {}
        for e in source_edges:
            variables.update(node_vars.get(e.source, {}))
        if node.type == "inputNode":
            var_name = str(node.data.get("varName") or "").strip()
            if var_name:
                variables[var_name] = node.data.get("value", "")

        start_time = time.time()

        try:
            output = run_node(node, incoming_value, variables)
        except WorkflowError as e:
            duration = round(time.time() - start_time, 3)
            results.append({
                "nodeId": node_id, "type": node.type, "status": "error",
                "input": incoming_value, "variables": variables,
                "error": str(e), "durationSeconds": duration,
            })
            return {
                "status": "error", "executionOrder": execution_order,
                "results": results, "failedNodeId": node_id,
            }
        except Exception as e:
            duration = round(time.time() - start_time, 3)
            results.append({
                "nodeId": node_id, "type": node.type, "status": "error",
                "input": incoming_value, "variables": variables,
                "error": f"Unexpected error: {e}", "durationSeconds": duration,
            })
            return {
                "status": "error", "executionOrder": execution_order,
                "results": results, "failedNodeId": node_id,
            }

        duration = round(time.time() - start_time, 3)
        node_vars[node_id] = variables

        token_usage = None
        if isinstance(output, dict) and "tokenUsage" in output:
            token_usage = output["tokenUsage"]
            output = output["text"]

        if isinstance(output, dict) and "conditionResult" in output:
            taken_handles[node_id] = "true" if output["conditionResult"] else "false"
            node_outputs[node_id] = output["value"]
            results.append({
                "nodeId": node_id, "type": node.type, "status": "success",
                "input": incoming_value, "output": output["value"],
                "conditionResult": output["conditionResult"],
                "variables": variables, "durationSeconds": duration,
            })
        else:
            node_outputs[node_id] = output
            results.append({
                "nodeId": node_id, "type": node.type, "status": "success",
                "input": incoming_value, "output": output,
                "variables": variables, "durationSeconds": duration,
                "tokenUsage": token_usage,
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