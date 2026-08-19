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

import InputNode from './nodes/InputNode';
import PromptTemplateNode from './nodes/PromptTemplateNode';
import LLMNode from './nodes/LLMNode';
import FormatterNode from './nodes/FormatterNode';
import OutputNode from './nodes/OutputNode';
import Sidebar from './components/Sidebar';

const nodeTypes = {
  inputNode: InputNode,
  promptTemplateNode: PromptTemplateNode,
  llmNode: LLMNode,
  formatterNode: FormatterNode,
  outputNode: OutputNode,
};

let idCount = 0;
const getId = () => `node_${Date.now()}_${idCount++}`;

// The key our saved workflows live under inside localStorage.
// We store ONE object: { "My Workflow": {nodes, edges}, "Another": {...} }
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
  if (status === 'running') return '⏳';
  if (status === 'error') return '❌';
  return '○';
}

// Reads the whole saved-workflows object out of localStorage.
// Returns {} if nothing is saved yet or if the data is corrupted.
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
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const { screenToFlowPosition } = useReactFlow();

  const [runStatus, setRunStatus] = useState({});
  const [isRunning, setIsRunning] = useState(false);
  const [inspectedNodeId, setInspectedNodeId] = useState(null);

  const [workflowName, setWorkflowName] = useState('My Workflow');
  const [savedWorkflowNames, setSavedWorkflowNames] = useState([]);

  // On first load, populate the sidebar's saved-workflows list from
  // whatever's already sitting in localStorage from a previous session.
  useEffect(() => {
    setSavedWorkflowNames(Object.keys(readSavedWorkflows()));
  }, []);

  const onConnect = useCallback(
    (connection) => setEdges((eds) => addEdge({ ...connection, animated: true }, eds)),
    [setEdges]
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

  const deleteNode = useCallback(
    (nodeId) => {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    },
    [setNodes, setEdges]
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
      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, setNodes]
  );

  const clearCanvas = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setRunStatus({});
    setInspectedNodeId(null);
  }, [setNodes, setEdges]);

  // "New Workflow" = clear canvas AND reset the name, since it's
  // meant to start a brand new, unrelated workflow.
  const newWorkflow = useCallback(() => {
    clearCanvas();
    setWorkflowName('Untitled Workflow');
  }, [clearCanvas]);

  // Strips out our injected onChange/onDelete/runStatus fields before
  // saving/exporting — we only want to persist the REAL data the user
  // entered, not internal function references or transient run state.
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
      animated: e.animated,
    }));
  }, [edges]);

  // --- SAVE (to localStorage) ---
  const saveWorkflow = useCallback(() => {
    const name = workflowName.trim() || 'Untitled Workflow';
    const allSaved = readSavedWorkflows();
    allSaved[name] = { nodes: getCleanNodes(), edges: getCleanEdges() };
    writeSavedWorkflows(allSaved);
    setSavedWorkflowNames(Object.keys(allSaved));
    setWorkflowName(name);
  }, [workflowName, getCleanNodes, getCleanEdges]);

  // --- LOAD (from localStorage) ---
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
    },
    [setNodes, setEdges]
  );

  // --- DELETE (from localStorage) ---
  const deleteWorkflow = useCallback((name) => {
    const allSaved = readSavedWorkflows();
    delete allSaved[name];
    writeSavedWorkflows(allSaved);
    setSavedWorkflowNames(Object.keys(allSaved));
  }, []);

  // --- EXPORT (download as a .json file) ---
  const exportWorkflow = useCallback(() => {
    const name = workflowName.trim() || 'Untitled Workflow';
    const exportData = {
      name,
      nodes: getCleanNodes(),
      edges: getCleanEdges(),
    };

    // Build an in-memory file (Blob), then trigger a download using a
    // temporary invisible link — this is the standard browser pattern
    // for "download this JS object as a file" with no backend involved.
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    // Turn "My Customer Support Workflow" into "my-customer-support-workflow.json"
    link.download = `${name.toLowerCase().replace(/\s+/g, '-')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [workflowName, getCleanNodes, getCleanEdges]);

  // --- IMPORT (read an uploaded .json file) ---
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
    } catch (err) {
      alert('Could not reach the backend. Is FastAPI running on port 8000?');
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
  }, [nodes, getCleanNodes, getCleanEdges, updateNodeData]);

  const nodesWithHandlers = nodes.map((node) => ({
    ...node,
    data: {
      ...node.data,
      onChange: (newFields) => updateNodeData(node.id, newFields),
      onDelete: () => deleteNode(node.id),
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
          <Background color="#cbd5e1" gap={20} size={1} />
          <Controls />
        </ReactFlow>

        <button className="run-button" onClick={runWorkflow} disabled={isRunning}>
          {isRunning ? '⏳ Running...' : '▶ Run Workflow'}
        </button>

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