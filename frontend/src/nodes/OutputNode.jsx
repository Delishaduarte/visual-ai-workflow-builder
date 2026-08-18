import { Handle, Position } from '@xyflow/react';

function OutputNode({ data }) {
  return (
    <div
      style={{
        padding: '10px 15px',
        borderRadius: '6px',
        border: '2px solid #16a34a',
        background: '#f0fdf4',
        color: '#14532d',
        fontWeight: 'bold',
        fontSize: '14px',
        textAlign: 'center',
        width: '180px',
      }}
    >
      <Handle type="target" position={Position.Left} />

      Output

      <div
        className="nodrag"
        style={{
          width: '100%',
          marginTop: '8px',
          padding: '6px',
          fontSize: '12px',
          fontWeight: 'normal',
          minHeight: '40px',
          background: '#ffffff',
          border: '1px solid #d1fae5',
          borderRadius: '4px',
          textAlign: 'left',
          boxSizing: 'border-box',
          wordBreak: 'break-word',
        }}
      >
        {data.value || '(no output yet)'}
      </div>
    </div>
  );
}

export default OutputNode;