import { useCallback, useState, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
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

import InputNode from './nodes/InputNode';
import PromptTemplateNode from './nodes/PromptTemplateNode';
import LLMNode from './nodes/LLMNode';
import FormatterNode from './nodes/FormatterNode';
import OutputNode from './nodes/OutputNode';
import Sidebar from './components/Sidebar';
import IfNode from './nodes/IfNode';

const nodeTypes = {
  inputNode: InputNode,
  promptTemplateNode: PromptTemplateNode,
  llmNode: LLMNode,
  formatterNode: FormatterNode,
  outputNode: OutputNode,
  ifNode: IfNode,
};

let idCount = 0;
const getId = () => `node_${Date.now()}_${idCount++}`;

const STORAGE_KEY = 'visual-ai-workflow-builder:saved-workflows';

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
    data: { provider: 'openai', model: 'gemini-3.6-flash', temperature: '0.7', maxTokens: '2000', systemPrompt: '' },
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

function WorkflowCanvas() {
  // ---------- 1. ALL STATE FIRST ----------
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const { screenToFlowPosition } = useReactFlow();

  const [runStatus, setRunStatus] = useState({});
  const [isRunning, setIsRunning] = useState(false);
  const [inspectedNodeId, setInspectedNodeId] = useState(null);
  const [validationProblems, setValidationProblems] = useState([]);
  const [connectionError, setConnectionError] = useState(null);

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

  const undo = useCallback(() => {
    if (historyIndex === 0) return;
    const newIndex = historyIndex - 1;
    const snapshot = history[newIndex];
    setNodes(snapshot.nodes);
    setEdges(snapshot.edges);
    setHistoryIndex(newIndex);
  }, [history, historyIndex, setNodes, setEdges]);

  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    const newIndex = historyIndex + 1;
    const snapshot = history[newIndex];
    setNodes(snapshot.nodes);
    setEdges(snapshot.edges);
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
      const updatedEdges = edges.filter((e) => e.source !== nodeId && e.target !== nodeId);
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

  const getCleanNodes = useCallback(() => {
    return nodes.map((n) => ({
      id: n.id,
      type: n.type,
      position: n.position,
      data: {
        ...n.data,
        onChange: undefined,
        onDelete: undefined,
        runStatus: undefined,
      },
    }));
  }, [nodes]);

  const getCleanEdges = useCallback(() => {
    return edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      animated: e.animated,
    }));
  }, [edges]);

  const saveWorkflow = useCallback(() => {
    const name = workflowName.trim() || 'Untitled Workflow';
    const allSaved = readSavedWorkflows();
    allSaved[name] = { nodes: getCleanNodes(), edges: getCleanEdges() };
    writeSavedWorkflows(allSaved);
    setSavedWorkflowNames(Object.keys(allSaved));
    setWorkflowName(name);
  }, [workflowName, getCleanNodes, getCleanEdges]);

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

  const deleteWorkflow = useCallback((name) => {
    const allSaved = readSavedWorkflows();
    delete allSaved[name];
    writeSavedWorkflows(allSaved);
    setSavedWorkflowNames(Object.keys(allSaved));
  }, []);

  const exportWorkflow = useCallback(() => {
    const name = workflowName.trim() || 'Untitled Workflow';
    const exportData = { name, nodes: getCleanNodes(), edges: getCleanEdges() };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${name.toLowerCase().replace(/\s+/g, '-')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [workflowName, getCleanNodes, getCleanEdges]);

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

  const runWorkflow = useCallback(async () => {
    const problems = validateWorkflow(nodes, edges);
    if (problems.length > 0) {
      setValidationProblems(problems);
      setConnectionError(null);
      return;
    }
    setValidationProblems([]);
    setConnectionError(null);

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
      const res = await fetch('http://127.0.0.1:8000/workflow/run', {
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

    setIsRunning(false);
  }, [nodes, edges, getCleanNodes, getCleanEdges, updateNodeData]);

  const nodesWithHandlers = nodes.map((node) => ({
    ...node,
    data: {
      ...node.data,
      onChange: (newFields) => updateNodeData(node.id, newFields),
      onDelete: () => deleteNode(node.id),
      onDuplicate: () => duplicateNode(node.id),
      onCommit: commitFieldEdit,
      runStatus: runStatus[node.id]?.status,
    },
  }));

  const handleNodeClick = useCallback((event, node) => {
    setInspectedNodeId(node.id);
  }, []);

  const inspected = inspectedNodeId ? runStatus[inspectedNodeId] : null;
  const inspectedNode = inspectedNodeId ? nodes.find((n) => n.id === inspectedNodeId) : null;

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
      />
      <div className="canvas-wrapper">
        <ReactFlow
          nodes={nodesWithHandlers}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodeClick={handleNodeClick}
          nodeTypes={nodeTypes}
          fitView
        >
          <Background color="var(--grid-dot)" gap={20} size={1.5} />
          <Controls />
        </ReactFlow>

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

        {Object.keys(runStatus).length > 0 && (
          <div className="status-panel">
            <p className="status-panel-title">Execution Status</p>
            {nodes.map((node) => {
              const s = runStatus[node.id];
              if (!s) return null;
              return (
                <div key={node.id} className="status-row" onClick={() => setInspectedNodeId(node.id)}>
                  <span className="status-row-label">
                    <span>{statusIcon(s.status)}</span>
                    <span>{node.type.replace('Node', '')}</span>
                  </span>
                  {s.durationSeconds !== undefined && (
                    <span className="status-row-time">{s.durationSeconds}s</span>
                  )}
                </div>
              );
            })}
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