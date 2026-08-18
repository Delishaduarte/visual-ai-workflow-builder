import { useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './App.css';
import InputNode from './nodes/InputNode';
import LLMPromptNode from './nodes/LLMPromptNode';
import OutputNode from './nodes/OutputNode';

const nodeTypes = {
  inputNode: InputNode,
  llmPromptNode: LLMPromptNode,
  outputNode: OutputNode,
};

// Note: no "onChange" function here yet — we attach it after the
// component mounts, inside App(), since it needs access to setNodes.
const initialNodes = [
  {
    id: 'input-1',
    type: 'inputNode',
    position: { x: 50, y: 150 },
    data: { value: '' },
  },
  {
    id: 'llm-1',
    type: 'llmPromptNode',
    position: { x: 350, y: 150 },
    data: { value: '' },
  },
  {
    id: 'output-1',
    type: 'outputNode',
    position: { x: 650, y: 150 },
    data: { value: '' },
  },
];

const initialEdges = [];

function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges]
  );

  // Updates the "value" field inside one specific node's data,
  // identified by its id. Used whenever a user types in a node's input.
  const updateNodeValue = useCallback(
    (nodeId, newValue) => {
      setNodes((currentNodes) =>
        currentNodes.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, value: newValue } }
            : node
        )
      );
    },
    [setNodes]
  );

  // Before rendering, we inject an "onChange" function into each node's data
  // that already knows its own id — so InputNode/LLMPromptNode just call
  // data.onChange(newValue) without needing to know about ids or setNodes.
  const nodesWithHandlers = nodes.map((node) => ({
    ...node,
    data: {
      ...node.data,
      onChange: (newValue) => updateNodeValue(node.id, newValue),
    },
  }));

  return (
    <div className="canvas-wrapper">
      <ReactFlow
        nodes={nodesWithHandlers}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}

export default App;