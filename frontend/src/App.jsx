import { useCallback } from 'react';
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

// Used to generate a unique id for every new node dropped onto the canvas.
let idCount = 0;
const getId = () => `node_${Date.now()}_${idCount++}`;

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
    data: { provider: 'openai', model: 'gpt-4o-mini', temperature: '0.7', maxTokens: '1000', systemPrompt: '' },
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

// This inner component needs to live INSIDE <ReactFlowProvider>,
// because useReactFlow() (used for drag-and-drop positioning) only
// works for components that are children of the provider.
function WorkflowCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const { screenToFlowPosition } = useReactFlow();

  const onConnect = useCallback(
    (connection) => setEdges((eds) => addEdge({ ...connection, animated: true }, eds)),
    [setEdges]
  );

  // Merges new field values into a specific node's data object.
  // e.g. updateNodeData('llm-1', { temperature: '0.9' })
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

  // Removes a node AND any edges connected to it (otherwise you'd get
  // "dangling" edges pointing to a node that no longer exists).
  const deleteNode = useCallback(
    (nodeId) => {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    },
    [setNodes, setEdges]
  );

  // Required by the browser's drag-and-drop API — without calling
  // preventDefault() here, onDrop below will never fire.
  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Fires when a sidebar item is dropped onto the canvas.
  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow');
      if (!type) return;

      // Converts the mouse's screen (pixel) coordinates into React Flow's
      // internal canvas coordinates, accounting for current zoom/pan.
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });

      const newNode = { id: getId(), type, position, data: {} };
      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, setNodes]
  );

  const clearCanvas = useCallback(() => {
    setNodes([]);
    setEdges([]);
  }, [setNodes, setEdges]);

  // Same pattern as before: inject onChange/onDelete into each node's
  // data right before rendering, pre-bound to that node's own id.
  const nodesWithHandlers = nodes.map((node) => ({
    ...node,
    data: {
      ...node.data,
      onChange: (newFields) => updateNodeData(node.id, newFields),
      onDelete: () => deleteNode(node.id),
    },
  }));

  return (
    <div className="app-container">
      <Sidebar onClearCanvas={clearCanvas} />
      <div className="canvas-wrapper">
        <ReactFlow
          nodes={nodesWithHandlers}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          fitView
        >
          <Background color="#cbd5e1" gap={20} size={1} />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}

// The outer App just sets up the provider and renders the canvas inside it.
export default function App() {
  return (
    <ReactFlowProvider>
      <WorkflowCanvas />
    </ReactFlowProvider>
  );
}