import { useCallback, useState, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  ControlButton,
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './App.css';
import { validateWorkflow } from './validation';
import { PlayIcon } from './icons';
import HttpNode from './nodes/HttpNode';
import HelpPanel from './components/HelpPanel';
import InputNode from './nodes/InputNode';
import CodeNode from './nodes/CodeNode';
import PromptTemplateNode from './nodes/PromptTemplateNode';
import MergeNode from './nodes/MergeNode';
import LLMNode from './nodes/LLMNode';
import FormatterNode from './nodes/FormatterNode';
import OutputNode from './nodes/OutputNode';
import Sidebar from './components/Sidebar';
import IfNode from './nodes/IfNode';
// deploy trigger
const nodeTypes = {
  inputNode: InputNode,
  promptTemplateNode: PromptTemplateNode,
  llmNode: LLMNode,
  formatterNode: FormatterNode,
  outputNode: OutputNode,
  mergeNode: MergeNode,
  ifNode: IfNode,
  httpNode: HttpNode,
  codeNode: CodeNode,
};

let idCount = 0;
const getId = () => `node_${Date.now()}_${idCount++}`;

const STORAGE_KEY = 'visual-ai-workflow-builder:saved-workflows';
const EXECUTION_HISTORY_KEY = 'visual-ai-workflow-builder:execution-history';

const initialNodes = [
  {
    id: 'input-1',
    type: 'inputNode',
    position: { x: 50, y: 200 },
    data: { varName: 'customer_text', value: 'Explain this invoice' },
  },
  {
    id: 'prompt-1',
    type: 'promptTemplateNode',
    position: { x: 340, y: 200 },
    data: { template: 'Summarize this: {{customer_text}}' },
  },
  {
    id: 'llm-1',
    type: 'llmNode',
    position: { x: 630, y: 200 },
    data: { provider: 'gemini', model: 'gemini-3.6-flash', temperature: '0.7', maxTokens: '2000', systemPrompt: '' },
  },
  {
    id: 'formatter-1',
    type: 'formatterNode',
    position: { x: 950, y: 200 },
    data: { formatType: 'text' },
  },
  {
    id: 'output-1',
    type: 'outputNode',
    position: { x: 1230, y: 200 },
    data: { value: '' },
  },
];

const initialEdges = [
  { id: 'e1', source: 'input-1', target: 'prompt-1', animated: true },
  { id: 'e2', source: 'prompt-1', target: 'llm-1', animated: true },
  { id: 'e3', source: 'llm-1', target: 'formatter-1', animated: true },
  { id: 'e4', source: 'formatter-1', target: 'output-1', animated: true },
];

function statusIcon(status) {
  if (status === 'success') return '✓';
  if (status === 'running') return '●';
  if (status === 'error') return '✕';
  if (status === 'skipped') return '—';
  return '○';
}

function readSavedWorkflows() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeSavedWorkflows(workflows) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(workflows));
}

function readExecutionHistory() {
  try {
    const raw = localStorage.getItem(EXECUTION_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeExecutionHistory(historyList) {
  const trimmed = historyList.slice(-20);
  localStorage.setItem(EXECUTION_HISTORY_KEY, JSON.stringify(trimmed));
}

// Renumbers each Merge node's connected input dots to 1, 2, 3...
// keeping their current order, so deleting a wire never leaves an
// empty dot in between. Values keep their order; only the holes close.
function compactMergeHandles(nodes, edges) {
  const dotNumber = (handle) => parseInt(handle.split('-')[1], 10);
  const newHandle = {};

  nodes
    .filter((n) => n.type === 'mergeNode')
    .forEach((mergeNode) => {
      edges
        .filter((e) => e.target === mergeNode.id && e.targetHandle && e.targetHandle.startsWith('in-'))
        .sort((a, b) => dotNumber(a.targetHandle) - dotNumber(b.targetHandle))
        .forEach((edge, index) => {
          newHandle[edge.id] = `in-${index + 1}`;
        });
    });

  return edges.map((e) =>
    newHandle[e.id] && newHandle[e.id] !== e.targetHandle
      ? { ...e, targetHandle: newHandle[e.id] }
      : e
  );
}

// Run results are stored on Output nodes (data.value). They belong to a
// run, not to the canvas layout, so they must not come back on undo/redo.
function withoutRunResults(nodes) {
  return nodes.map((n) =>
    n.type === 'outputNode' ? { ...n, data: { ...n.data, value: '' } } : n
  );
}

function WorkflowCanvas() {
  // ---------- 1. ALL STATE FIRST ----------
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const { screenToFlowPosition } = useReactFlow();
  const [showHelp, setShowHelp] = useState(false);
  const [executionHistory, setExecutionHistory] = useState([]);
  const [viewingHistoryRun, setViewingHistoryRun] = useState(null);
  const [runStatus, setRunStatus] = useState({});
  const [isRunning, setIsRunning] = useState(false);
  const [inspectedNodeId, setInspectedNodeId] = useState(null);
  const [validationProblems, setValidationProblems] = useState([]);
  const [connectionError, setConnectionError] = useState(null);
  const [canvasLocked, setCanvasLocked] = useState(false);
  const [workflowName, setWorkflowName] = useState('My Workflow');
  const [savedWorkflowNames, setSavedWorkflowNames] = useState([]);

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('visual-ai-workflow-builder:theme') || 'light';
  });

  const [history, setHistory] = useState([{ nodes: initialNodes, edges: initialEdges }]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // ---------- 2. SIMPLE EFFECTS THAT ONLY DEPEND ON STATE ----------
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('visual-ai-workflow-builder:theme', theme);
  }, [theme]);

  useEffect(() => {
    setSavedWorkflowNames(Object.keys(readSavedWorkflows()));
  }, []);

  useEffect(() => {
    setExecutionHistory(readExecutionHistory());
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === 'light' ? 'dark' : 'light'));
  }, []);

  // ---------- 3. HISTORY FUNCTIONS (pushHistory, undo, redo) ----------
  // These must come before anything that USES them.
  const pushHistory = useCallback((newNodes, newEdges) => {
    setHistory((prev) => {
      const trimmed = prev.slice(0, historyIndex + 1);
      const snapshot = { nodes: newNodes, edges: newEdges };
      const updated = [...trimmed, snapshot];
      return updated.length > 50 ? updated.slice(updated.length - 50) : updated;
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 49));
  }, [historyIndex]);

  const handleDelete = useCallback(
    ({ nodes: deletedNodes, edges: deletedEdges }) => {
      const deletedNodeIds = new Set(deletedNodes.map((n) => n.id));
      const deletedEdgeIds = new Set(deletedEdges.map((e) => e.id));

      const remainingNodes = nodes.filter((n) => !deletedNodeIds.has(n.id));
      const remainingEdges = edges.filter(
        (e) =>
          !deletedEdgeIds.has(e.id) &&
          !deletedNodeIds.has(e.source) &&
          !deletedNodeIds.has(e.target)
      );
      const compacted = compactMergeHandles(remainingNodes, remainingEdges);

      setEdges(compacted);
      pushHistory(remainingNodes, compacted);
    },
    [nodes, edges, setEdges, pushHistory]
  );

  // Undo/redo restore a past snapshot. Run results (Output values) and
  // the status panel describe a RUN, not the canvas, so they are wiped
  // here rather than restored — otherwise an old result could reappear
  // next to nodes it no longer matches.
  const undo = useCallback(() => {
    if (historyIndex === 0) return;
    const newIndex = historyIndex - 1;
    const snapshot = history[newIndex];
    setNodes(withoutRunResults(snapshot.nodes));
    setEdges(snapshot.edges);
    setRunStatus({});
    setInspectedNodeId(null);
    setValidationProblems([]);
    setHistoryIndex(newIndex);
  }, [history, historyIndex, setNodes, setEdges]);

  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    const newIndex = historyIndex + 1;
    const snapshot = history[newIndex];
    setNodes(withoutRunResults(snapshot.nodes));
    setEdges(snapshot.edges);
    setRunStatus({});
    setInspectedNodeId(null);
    setValidationProblems([]);
    setHistoryIndex(newIndex);
  }, [history, historyIndex, setNodes, setEdges]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      if (!isCtrlOrCmd) return;

      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  // ---------- 4. EVERYTHING ELSE THAT USES pushHistory ----------
  const onConnect = useCallback(
    (connection) => {
      setEdges((eds) => {
        const updated = addEdge({ ...connection, animated: true }, eds);
        pushHistory(nodes, updated);
        return updated;
      });
    },
    [nodes, pushHistory, setEdges]
  );

    // Lets the user grab the loose end of an existing wire and drag it
  // off a node entirely to disconnect it, or onto a different node
  // to re-route it. Without this, dragging from a wire's end does
  // nothing.
  const onReconnect = useCallback(
    (oldEdge, newConnection) => {
      setEdges((eds) => {
        const updated = eds
          .filter((e) => e.id !== oldEdge.id)
          .concat({ ...oldEdge, ...newConnection });
        pushHistory(nodes, updated);
        return updated;
      });
    },
    [nodes, pushHistory, setEdges]
  );

  const onReconnectEnd = useCallback(
    (event, edge, handleType, connections) => {
      // If the wire was dragged off into empty space rather than onto
      // a new handle, `connections` comes back empty — treat that as
      // "delete this wire."
      if (connections && connections.length > 0) return;
      setEdges((eds) => {
        const remainingEdges = eds.filter((e) => e.id !== edge.id);
        const compacted = compactMergeHandles(nodes, remainingEdges);
        pushHistory(nodes, compacted);
        return compacted;
      });
    },
    [nodes, pushHistory, setEdges]
  );

  // Clears the result shown on Output nodes. Input nodes keep their
  // typed value, because that value is user input, not a run result.
  const clearOutputResults = useCallback(() => {
    setNodes((currentNodes) =>
      currentNodes.map((node) =>
        node.type === 'outputNode'
          ? { ...node, data: { ...node.data, value: '' } }
          : node
      )
    );
  }, [setNodes]);

  const updateNodeData = useCallback(
    (nodeId, newFields) => {
      setNodes((currentNodes) =>
        currentNodes.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, ...newFields } }
            : node
        )
      );
    },
    [setNodes]
  );

  const commitFieldEdit = useCallback(() => {
    pushHistory(nodes, edges);
  }, [nodes, edges, pushHistory]);

  const deleteNode = useCallback(
    (nodeId) => {
      const updatedNodes = nodes.filter((n) => n.id !== nodeId);
      const remainingEdges = edges.filter((e) => e.source !== nodeId && e.target !== nodeId);
      const updatedEdges = compactMergeHandles(updatedNodes, remainingEdges);
      setNodes(updatedNodes);
      setEdges(updatedEdges);
      pushHistory(updatedNodes, updatedEdges);
    },
    [nodes, edges, setNodes, setEdges, pushHistory]
  );

  const duplicateNode = useCallback(
    (nodeId) => {
      const original = nodes.find((n) => n.id === nodeId);
      if (!original) return;

      const clone = {
        ...original,
        id: getId(),
        position: { x: original.position.x + 40, y: original.position.y + 40 },
        data: { ...original.data },
      };

      const updated = nodes.concat(clone);
      setNodes(updated);
      pushHistory(updated, edges);
    },
    [nodes, edges, setNodes, pushHistory]
  );

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow');
      if (!type) return;

      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const newNode = { id: getId(), type, position, data: {} };
      setNodes((nds) => {
        const updated = nds.concat(newNode);
        pushHistory(updated, edges);
        return updated;
      });
    },
    [screenToFlowPosition, setNodes, edges, pushHistory]
  );

  const clearCanvas = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setRunStatus({});
    setInspectedNodeId(null);
    setValidationProblems([]);
  }, [setNodes, setEdges]);

  const newWorkflow = useCallback(() => {
    clearCanvas();
    setWorkflowName('Untitled Workflow');
  }, [clearCanvas]);

    // Used for the live /workflow/run and /workflow/retry-node requests,
  // where the API key legitimately needs to travel with the node.
  const getCleanNodes = useCallback(() => {
    return nodes.map((n) => ({
      id: n.id,
      type: n.type,
      position: n.position,
      data: {
        ...n.data,
        onChange: undefined,
        onDelete: undefined,
        onDuplicate: undefined,
        onCommit: undefined,
        runStatus: undefined,
        dotCount: undefined,
      },
    }));
  }, [nodes]);

  // Used for Save, Export, and anything else written to localStorage
  // or a file. API keys are stripped so they never end up sitting in
  // a saved workflow, an exported JSON file, or execution history.
  const getPersistableNodes = useCallback(() => {
    return getCleanNodes().map((n) =>
      n.type === 'llmNode' ? { ...n, data: { ...n.data, apiKey: undefined } } : n
    );
  }, [getCleanNodes]);

  const getCleanEdges = useCallback(() => {
    return edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
      animated: e.animated,
    }));
  }, [edges]);

    const saveWorkflow = useCallback(() => {
    const name = workflowName.trim() || 'Untitled Workflow';
    const allSaved = readSavedWorkflows();
    allSaved[name] = { nodes: getPersistableNodes(), edges: getCleanEdges() };
    writeSavedWorkflows(allSaved);
    setSavedWorkflowNames(Object.keys(allSaved));
    setWorkflowName(name);
  }, [workflowName, getPersistableNodes, getCleanEdges]);

  const loadWorkflow = useCallback(
    (name) => {
      const allSaved = readSavedWorkflows();
      const workflow = allSaved[name];
      if (!workflow) return;

      setNodes(workflow.nodes);
      setEdges(workflow.edges);
      setWorkflowName(name);
      setRunStatus({});
      setInspectedNodeId(null);
      setValidationProblems([]);
    },
    [setNodes, setEdges]
  );

  const viewHistoryRun = useCallback((runId) => {
    const record = executionHistory.find((r) => r.id === runId);
    if (!record) return;

    const rebuiltStatus = {};
    record.results.forEach((r) => {
      rebuiltStatus[r.nodeId] = r;
    });
    setRunStatus(rebuiltStatus);
    setViewingHistoryRun(record);
    setInspectedNodeId(null);
  }, [executionHistory]);

  const closeHistoryView = useCallback(() => {
    setViewingHistoryRun(null);
    setRunStatus({});
  }, []);

  const clearExecutionHistory = useCallback(() => {
    setExecutionHistory([]);
    localStorage.removeItem(EXECUTION_HISTORY_KEY);
  }, []);

  const deleteWorkflow = useCallback((name) => {
    const allSaved = readSavedWorkflows();
    delete allSaved[name];
    writeSavedWorkflows(allSaved);
    setSavedWorkflowNames(Object.keys(allSaved));
  }, []);

    const exportWorkflow = useCallback(() => {
    const name = workflowName.trim() || 'Untitled Workflow';
    const exportData = { name, nodes: getPersistableNodes(), edges: getCleanEdges() };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${name.toLowerCase().replace(/\s+/g, '-')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [workflowName, getPersistableNodes, getCleanEdges]);

  const importWorkflow = useCallback(
    (file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          if (!parsed.nodes || !parsed.edges) {
            alert('This file does not look like a valid workflow export.');
            return;
          }
          setNodes(parsed.nodes);
          setEdges(parsed.edges);
          setWorkflowName(parsed.name || 'Imported Workflow');
          setRunStatus({});
          setInspectedNodeId(null);
          setValidationProblems([]);
        } catch (err) {
          alert('Could not read that file — is it valid JSON?');
        }
      };
      reader.readAsText(file);
    },
    [setNodes, setEdges]
  );

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // Retries a single failed node, sending back the same input AND the
  // same variables it had during the original run, so a Prompt
  // Template that used {{customer_name}} still resolves correctly.
  const retryNode = useCallback(
    async (nodeId) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;

      const failedResult = runStatus[nodeId];
      const incomingValue = failedResult ? failedResult.input : null;
      const variables = failedResult && failedResult.variables ? failedResult.variables : {};

      setRunStatus((prev) => ({ ...prev, [nodeId]: { status: 'running' } }));

      try {
        const cleanNode = {
          id: node.id,
          type: node.type,
          position: node.position,
          data: {
            ...node.data,
            onChange: undefined,
            onDelete: undefined,
            onDuplicate: undefined,
            onCommit: undefined,
            runStatus: undefined,
            dotCount: undefined,
          },
        };

        const res = await fetch(`${import.meta.env.VITE_API_URL}/workflow/retry-node`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ node: cleanNode, incomingValue, variables }),
        });

        if (!res.ok) {
          const errBody = await res.json();
          setRunStatus((prev) => ({
            ...prev,
            [nodeId]: { status: 'error', input: incomingValue, variables, error: errBody.detail, durationSeconds: 0 },
          }));
          return;
        }

        const result = await res.json();
        setRunStatus((prev) => ({
          ...prev,
          [nodeId]: {
            status: 'success',
            input: incomingValue,
            variables,
            output: result.output,
            durationSeconds: result.durationSeconds,
          },
        }));
        updateNodeData(nodeId, { value: result.output });
      } catch (err) {
        setRunStatus((prev) => ({
          ...prev,
          [nodeId]: { status: 'error', input: incomingValue, variables, error: 'Could not reach the backend.', durationSeconds: 0 },
        }));
      }
    },
    [nodes, runStatus, updateNodeData]
  );

  const runWorkflow = useCallback(async () => {
    setViewingHistoryRun(null);
    const problems = validateWorkflow(nodes, edges);
    if (problems.length > 0) {
      setRunStatus({});
      setInspectedNodeId(null);
      clearOutputResults();
      setValidationProblems(problems);
      setConnectionError(null);
      return;
    }
    setValidationProblems([]);
    setConnectionError(null);
    clearOutputResults();

    setIsRunning(true);
    setInspectedNodeId(null);

    const pendingStatus = {};
    nodes.forEach((n) => {
      pendingStatus[n.id] = { status: 'pending' };
    });
    setRunStatus(pendingStatus);

    const payload = { nodes: getCleanNodes(), edges: getCleanEdges() };

    let response;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/workflow/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      response = await res.json();
      setConnectionError(null);
    } catch (err) {
      setConnectionError("Can't reach the backend. Make sure FastAPI is running on port 8000.");
      setIsRunning(false);
      return;
    }

    for (const result of response.results) {
      setRunStatus((prev) => ({ ...prev, [result.nodeId]: { status: 'running' } }));
      await wait(300);

      setRunStatus((prev) => ({ ...prev, [result.nodeId]: result }));

      if (result.status === 'success' && result.output !== undefined) {
        updateNodeData(result.nodeId, { value: result.output });
      }

      await wait(150);
    }

    const runRecord = {
      id: `run_${Date.now()}`,
      timestamp: new Date().toISOString(),
      workflowName: workflowName || 'Untitled Workflow',
      status: response.status,
      results: response.results,
    };
    setExecutionHistory((prev) => {
      const updated = [...prev, runRecord];
      writeExecutionHistory(updated);
      return updated.slice(-20);
    });

    setIsRunning(false);
  }, [nodes, edges, getCleanNodes, getCleanEdges, updateNodeData, workflowName, clearOutputResults]);

  const nodesWithHandlers = nodes.map((node) => {
    let dotCount;
    if (node.type === 'mergeNode') {
      // Highest connected dot number + 1, so there is always one spare dot.
      const connected = edges
        .filter((e) => e.target === node.id && e.targetHandle && e.targetHandle.startsWith('in-'))
        .map((e) => parseInt(e.targetHandle.split('-')[1], 10))
        .filter((n) => !Number.isNaN(n));
      dotCount = (connected.length ? Math.max(...connected) : 0) + 1;
    }

    return {
      ...node,
      data: {
        ...node.data,
        onChange: (newFields) => updateNodeData(node.id, newFields),
        onDelete: () => deleteNode(node.id),
        onDuplicate: () => duplicateNode(node.id),
        onCommit: commitFieldEdit,
        runStatus: runStatus[node.id]?.status,
        tokenUsage: runStatus[node.id]?.tokenUsage,
        dotCount,
      },
    };
  });

  const handleNodeClick = useCallback((event, node) => {
    setInspectedNodeId(node.id);
  }, []);

  const inspected = inspectedNodeId ? runStatus[inspectedNodeId] : null;
  const inspectedNode = inspectedNodeId
    ? (viewingHistoryRun
        ? viewingHistoryRun.results.find((r) => r.nodeId === inspectedNodeId)
        : nodes.find((n) => n.id === inspectedNodeId))
    : null;

    const edgesWithReconnect = edges.map((e) => ({ ...e, reconnectable: true }));

  return (
    <div className="app-container">
      <Sidebar
        theme={theme}
        onToggleTheme={toggleTheme}
        workflowName={workflowName}
        onWorkflowNameChange={setWorkflowName}
        onNewWorkflow={newWorkflow}
        onSaveWorkflow={saveWorkflow}
        onExportWorkflow={exportWorkflow}
        onImportWorkflow={importWorkflow}
        savedWorkflowNames={savedWorkflowNames}
        onLoadWorkflow={loadWorkflow}
        onDeleteWorkflow={deleteWorkflow}
        onClearCanvas={clearCanvas}
        executionHistory={executionHistory}
        onViewHistoryRun={viewHistoryRun}
        onClearHistory={clearExecutionHistory}
      />
      <div className="canvas-wrapper">
        <ReactFlow
          nodes={nodesWithHandlers}
          edges={edgesWithReconnect}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onReconnect={onReconnect}
          onReconnectEnd={onReconnectEnd}
          onDragOver={onDragOver}
          onNodeClick={handleNodeClick}
          nodeTypes={nodeTypes}
          onDelete={handleDelete}
          nodesDraggable={!canvasLocked}
          nodesConnectable={!canvasLocked}
          elementsSelectable={!canvasLocked}
          fitView
        >
          <Background color="var(--grid-dot)" gap={20} size={1.5} />
          <Controls showInteractive={false}>
  <ControlButton
    className="icon-tooltip"
    data-tooltip={canvasLocked ? 'Unlock canvas' : 'Lock canvas'}
    onClick={() => setCanvasLocked((v) => !v)}
  >
    {canvasLocked ? '🔒' : '🔓'}
  </ControlButton>
</Controls>
            
        </ReactFlow>

                <button
          className="help-fab icon-tooltip"
          data-tooltip="Node guide"
          onClick={() => setShowHelp((v) => !v)}
          title="Node guide"
        >
          ?
        </button>

        {nodes.length === 0 && (
          <div className="empty-canvas-hint">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="4" y="4" width="16" height="16" rx="3" strokeDasharray="3 3" />
              <path d="M12 9v6" />
              <path d="M9 12h6" />
            </svg>
            <p>Your canvas is empty</p>
            <p style={{ fontSize: '12px', marginTop: '2px' }}>Drag a node from the sidebar to get started</p>
          </div>
        )}

                <div className="top-toolbar">
          <span className="top-toolbar-name">{workflowName || 'Untitled Workflow'}</span>
          <div className="top-toolbar-divider" />
          <button
            className="toolbar-icon-btn"
            onClick={undo}
            disabled={historyIndex === 0}
            title="Undo (Ctrl+Z)"
          >
            ↶
          </button>
          <button
            className="toolbar-icon-btn"
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            title="Redo (Ctrl+Y)"
          >
            ↷
          </button>
          <div className="top-toolbar-divider" />
          <button className="run-button" onClick={runWorkflow} disabled={isRunning}>
            {isRunning ? (
              'Running...'
            ) : (
              <>
                <PlayIcon /> Run Workflow
              </>
            )}
          </button>
        </div>

        {connectionError && (
          <div className="connection-error-banner">
            <strong>Connection error</strong>
            {connectionError}
          </div>
        )}

        {validationProblems.length > 0 && (
          <div className="validation-panel">
            <p className="validation-panel-title">⚠ Workflow cannot run</p>
            <ul className="validation-panel-list">
              {validationProblems.map((problem, i) => (
                <li key={i}>{problem}</li>
              ))}
            </ul>
          </div>
        )}

        {showHelp && <HelpPanel onClose={() => setShowHelp(false)} />}

        {Object.keys(runStatus).length > 0 && (
          <div className="status-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
  <p className="status-panel-title" style={{ margin: 0 }}>
    {viewingHistoryRun ? `Past Run — ${new Date(viewingHistoryRun.timestamp).toLocaleString()}` : 'Execution Status'}
  </p>
  <button
    className="inspect-close-btn"
    onClick={() => {
      setRunStatus({});
      setViewingHistoryRun(null);
    }}
    title="Close"
  >
    ×
  </button>
</div>
            {(viewingHistoryRun ? viewingHistoryRun.results : nodes.map((n) => ({ nodeId: n.id, type: n.type }))).map((entry) => {
              const nodeId = entry.nodeId;
              const nodeType = entry.type;
              const s = runStatus[nodeId];
              if (!s) return null;
              return (
                <div key={nodeId} className="status-row" onClick={() => setInspectedNodeId(nodeId)}>
                  <span className="status-row-label">
                    <span>{statusIcon(s.status)}</span>
                    <span>{nodeType.replace('Node', '')}</span>
                  </span>
                  {s.durationSeconds !== undefined && (
                    <span className="status-row-time">{s.durationSeconds}s</span>
                  )}
                </div>
              );
            })}
            {viewingHistoryRun && (
              <button className="sidebar-btn" onClick={closeHistoryView} style={{ marginTop: '8px' }}>
                Close (return to live view)
              </button>
            )}
          </div>
        )}

        {inspected && inspectedNode && (
          <div className="inspect-panel">
            <div className="inspect-panel-header">
              <span className="inspect-panel-title">
                {statusIcon(inspected.status)} {inspectedNode.type.replace('Node', '')}
              </span>
              <button className="inspect-close-btn" onClick={() => setInspectedNodeId(null)}>×</button>
            </div>

            {inspected.status === 'error' ? (
              <>
                <p className="inspect-section-label">Error</p>
                <div className="inspect-section-content inspect-error">{inspected.error}</div>
                <button className="sidebar-btn" onClick={() => retryNode(inspectedNodeId)}>
                  Retry this node
                </button>
              </>
            ) : (
              <>
                <p className="inspect-section-label">Input</p>
                <div className="inspect-section-content">
                  {inspected.input !== null && inspected.input !== undefined ? String(inspected.input) : '(none)'}
                </div>
                <p className="inspect-section-label">Output</p>
                <div className="inspect-section-content">
                  {inspected.output !== undefined ? String(inspected.output) : '(pending)'}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <WorkflowCanvas />
    </ReactFlowProvider>
  );
}