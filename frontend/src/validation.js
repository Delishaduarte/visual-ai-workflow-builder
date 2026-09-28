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
  ifNode: 'IF Node',
  httpNode: 'HTTP Node',
  codeNode: 'Code Node',
  mergeNode: 'Merge Node',
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

// Names of all variables defined by Input nodes upstream of a node.
function upstreamVariableNames(nodeId, nodes, edges) {
  const names = new Set();
  const visited = new Set();
  const stack = [nodeId];
  while (stack.length > 0) {
    const current = stack.pop();
    edges
      .filter((e) => e.target === current)
      .forEach((e) => {
        if (visited.has(e.source)) return;
        visited.add(e.source);
        const source = nodes.find((n) => n.id === e.source);
        if (source && source.type === 'inputNode' && source.data?.varName?.trim()) {
          names.add(source.data.varName.trim());
        }
        stack.push(e.source);
      });
  }
  return names;
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

    // Merge needs at least two connected inputs to be meaningful.
  nodes
    .filter((n) => n.type === 'mergeNode')
    .forEach((mergeNode) => {
      const incomingCount = edges.filter((e) => e.target === mergeNode.id).length;
      if (incomingCount < 2) {
        problems.push('Merge Node needs at least two connected inputs.');
      }
    });

  // Any node other than Merge with several incoming edges would silently
  // drop all but one, so warn instead.
  nodes
    .filter((n) => n.type !== 'mergeNode')
    .forEach((node) => {
      const incomingCount = edges.filter((e) => e.target === node.id).length;
      if (incomingCount > 1) {
        const label = TYPE_LABELS[node.type] || node.type;
        problems.push(`${label} has ${incomingCount} incoming connections. Use a Merge Node to combine them.`);
      }
    });

      // Prompt Template placeholders must match an upstream Input's variable name.
  nodes
    .filter((n) => n.type === 'promptTemplateNode')
    .forEach((node) => {
      const template = node.data?.template || '';
      const available = upstreamVariableNames(node.id, nodes, edges);
      const used = [...template.matchAll(/\{\{\s*([^{}]+?)\s*\}\}/g)].map((m) => m[1].trim());
      [...new Set(used)]
        .filter((name) => name !== 'input' && !available.has(name))
        .forEach((name) => {
          const list = available.size ? [...available].join(', ') : 'none';
          problems.push(`Prompt Template uses {{${name}}} but no upstream Input is named "${name}". Available: ${list}`);
        });
    });

  // Two Inputs with the same variable name make the value ambiguous.
  const seenNames = new Set();
  nodes
    .filter((n) => n.type === 'inputNode')
    .forEach((n) => {
      const name = n.data?.varName?.trim();
      if (!name) return;
      if (seenNames.has(name)) {
        problems.push(`More than one Input Node is named "${name}". Give each Input a different Variable Name.`);
      }
      seenNames.add(name);
    });

  return problems;
}