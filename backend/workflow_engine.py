from models import Workflow, WorkflowNode


class WorkflowError(Exception):
    """Raised when a workflow can't be executed (cycles, bad edges, etc.)."""
    pass


def build_graph(workflow: Workflow):
    """
    Turns the flat nodes/edges lists into two lookup structures:
    - node_map: id -> node object, for quick lookups
    - adjacency: id -> list of ids it points to (its "children")
    - in_degree: id -> how many edges point INTO this node
      (in_degree of 0 means "nothing feeds into this node" = a starting point)
    """
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
    """
    Determines a valid execution order using Kahn's algorithm:
    1. Start with all nodes that have in_degree 0 (no incoming edges).
    2. Repeatedly "remove" a node from the graph, decreasing the
       in_degree of its children. Any child that drops to 0 is now ready.
    3. If we finish and haven't visited every node, there's a cycle
       (some nodes were waiting on each other forever).
    """
    node_map, adjacency, in_degree = build_graph(workflow)

    # Nodes with no incoming edges are valid starting points.
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
    """
    A node is "disconnected" if it has no edges touching it at all
    (not a source AND not a target of any edge), AND there is more
    than one node total (a single standalone node is fine).
    """
    if len(workflow.nodes) <= 1:
        return []

    touched = set()
    for edge in workflow.edges:
        touched.add(edge.source)
        touched.add(edge.target)

    return [node.id for node in workflow.nodes if node.id not in touched]


def run_node(node: WorkflowNode, incoming_value):
    """
    Executes a single node. For now, all logic is MOCKED — no real
    LLM calls yet (that's Phase 7). Each node type just transforms
    the incoming value in a simple, visible way so we can prove the
    pipeline works end-to-end.
    """
    node_type = node.type
    data = node.data

    if node_type == "inputNode":
        # Input nodes ignore incoming_value — they're the start of the chain.
        return data.get("value", "")

    if node_type == "promptTemplateNode":
        template = data.get("template", "")
        # Very simple mock: just show what the template would look like
        # with the incoming value substituted for the first {{...}} found.
        return f"[MOCK PROMPT] {template} | incoming: {incoming_value}"

    if node_type == "llmNode":
        model = data.get("model", "unknown-model")
        return f"[MOCK LLM RESPONSE from {model}] based on: {incoming_value}"

    if node_type == "formatterNode":
        format_type = data.get("formatType", "text")
        return f"[FORMATTED as {format_type}] {incoming_value}"

    if node_type == "outputNode":
        return incoming_value

    raise WorkflowError(f"Unknown node type: {node_type}")


def execute_workflow(workflow: Workflow):
    """
    Runs the full workflow: validates it, determines order, then
    executes each node in sequence, passing each node's output as
    the next node's input.

    Returns a dict of results per node id, plus the overall status.
    """
    disconnected = find_disconnected_nodes(workflow)
    if disconnected:
        raise WorkflowError(f"Workflow has disconnected nodes: {disconnected}")

    execution_order, node_map = topological_sort(workflow)

    # Tracks the output value produced by each node, so downstream
    # nodes can look up what their upstream node(s) produced.
    node_outputs = {}

    # Maps each node to its incoming edges, so we know whose output
    # to feed in as this node's input.
    incoming_edges = {node_id: [] for node_id in node_map}
    for edge in workflow.edges:
        incoming_edges[edge.target].append(edge.source)

    results = []

    for node_id in execution_order:
        node = node_map[node_id]
        sources = incoming_edges[node_id]

        # If this node has no upstream nodes, there's no incoming value.
        # If it has exactly one, use that node's output directly.
        # (Multiple-input nodes aren't supported yet — future phase.)
        incoming_value = node_outputs[sources[0]] if sources else None

        try:
            output = run_node(node, incoming_value)
        except Exception as e:
            raise WorkflowError(f"Error executing node '{node_id}' ({node.type}): {e}")

        node_outputs[node_id] = output
        results.append({"nodeId": node_id, "type": node.type, "output": output})

    return {
        "status": "success",
        "executionOrder": execution_order,
        "results": results,
    }