// Pure validation logic — no React, no UI. Takes the current nodes/edges
// and returns a list of human-readable problem strings. An empty array
// means the workflow is safe to run.

function hasNodeType(nodes, type) {
  return nodes.some((n) => n.type === type);
}

function findDisconnectedNodes(nodes, edges) {
  if (nodes.length <= 1) return [];
  const touched = new Set();
  edges.forEach((e) => {
    touched.add(e.source);
    touched.add(e.target);
  });
  return nodes.filter((n) => !touched.has(n.id));
}

// Detects cycles using the same idea as our backend's topological sort:
// repeatedly remove nodes with no remaining incoming edges. If nodes are
// left over at the end, they're part of a cycle.
function hasCycle(nodes, edges) {
  const inDegree = {};
  const adjacency = {};
  nodes.forEach((n) => {
    inDegree[n.id] = 0;
    adjacency[n.id] = [];
  });
  edges.forEach((e) => {
    if (adjacency[e.source]) adjacency[e.source].push(e.target);
    if (inDegree[e.target] !== undefined) inDegree[e.target] += 1;
  });

  const queue = Object.keys(inDegree).filter((id) => inDegree[id] === 0);
  let visitedCount = 0;

  while (queue.length > 0) {
    const current = queue.shift();
    visitedCount += 1;
    adjacency[current].forEach((childId) => {
      inDegree[childId] -= 1;
      if (inDegree[childId] === 0) queue.push(childId);
    });
  }

  return visitedCount !== nodes.length;
}

// Human-readable labels for node types, used in warning messages.
const TYPE_LABELS = {
  inputNode: 'Input Node',
  promptTemplateNode: 'Prompt Template Node',
  llmNode: 'LLM Node',
  formatterNode: 'Formatter Node',
  outputNode: 'Output Node',
};

function checkRequiredFields(node) {
  const label = TYPE_LABELS[node.type] || node.type;
  const data = node.data || {};

  if (node.type === 'inputNode' && !data.value?.trim()) {
    return `${label} has no value set`;
  }
  if (node.type === 'promptTemplateNode' && !data.template?.trim()) {
    return `${label} has no template text`;
  }
  if (node.type === 'llmNode' && !data.model?.trim()) {
    return `${label} has no model selected`;
  }
  if (node.type === 'formatterNode' && !data.formatType) {
    return `${label} has no format type selected`;
  }
  return null;
}

// Main entry point. Returns an array of warning strings.
// Empty array = workflow is valid and can run.
export function validateWorkflow(nodes, edges) {
  const problems = [];

  if (nodes.length === 0) {
    return ['Canvas is empty — add at least an Input and Output node.'];
  }

  if (!hasNodeType(nodes, 'inputNode')) {
    problems.push('Workflow has no Input Node.');
  }

  if (!hasNodeType(nodes, 'outputNode')) {
    problems.push('Workflow has no Output Node.');
  } else {
    // Specifically check the Output node(s) are actually connected —
    // not just present on the canvas somewhere.
    const outputNodes = nodes.filter((n) => n.type === 'outputNode');
    outputNodes.forEach((outputNode) => {
      const hasIncoming = edges.some((e) => e.target === outputNode.id);
      if (!hasIncoming) {
        problems.push("Output Node isn't connected.");
      }
    });
  }

  nodes.forEach((node) => {
    const fieldProblem = checkRequiredFields(node);
    if (fieldProblem) problems.push(fieldProblem);
  });

  const disconnected = findDisconnectedNodes(nodes, edges);
  disconnected.forEach((node) => {
    const label = TYPE_LABELS[node.type] || node.type;
    problems.push(`${label} is disconnected from the workflow.`);
  });

  if (hasCycle(nodes, edges)) {
    problems.push('Workflow contains a cycle — nodes cannot depend on each other in a loop.');
  }

  return problems;
}