import { Handle, Position } from '@xyflow/react';

function LLMPromptNode({ data }) {
  return (
    <div
      style={{
        padding: '10px 15px',
        borderRadius: '6px',
        border: '2px solid #9333ea',
        background: '#faf5ff',
        color: '#581c87',
        fontWeight: 'bold',
        fontSize: '14px',
        textAlign: 'center',
        width: '200px',
      }}
    >
      <Handle type="target" position={Position.Left} />

      LLM Prompt

      <textarea
        placeholder="Enter prompt/instructions..."
        value={data.value || ''}
        onChange={(e) => data.onChange(e.target.value)}
        className="nodrag"
        rows={3}
        style={{
          width: '100%',
          marginTop: '8px',
          padding: '4px',
          fontSize: '12px',
          fontWeight: 'normal',
          resize: 'none',
          boxSizing: 'border-box',
        }}
      />

      <Handle type="source" position={Position.Right} />
    </div>
  );
}

export default LLMPromptNode;