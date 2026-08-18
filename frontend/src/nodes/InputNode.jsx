import { Handle, Position } from '@xyflow/react';

// "data" is passed in by React Flow — it's the same object we defined
// for this node back in App.jsx's initialNodes array.
// "data.value" holds whatever the user has typed so far.
// "data.onChange" is a function (given to us by App.jsx) that updates it.
function InputNode({ data }) {
  return (
    <div
      style={{
        padding: '10px 15px',
        borderRadius: '6px',
        border: '2px solid #2563eb',
        background: '#eff6ff',
        color: '#1e3a8a',
        fontWeight: 'bold',
        fontSize: '14px',
        textAlign: 'center',
        width: '180px',
      }}
    >
      Input Node

      <input
        type="text"
        placeholder="Enter input value..."
        value={data.value || ''}
        onChange={(e) => data.onChange(e.target.value)}
        // Stops React Flow from treating clicks/drags inside the input
        // as an attempt to drag the whole node.
        className="nodrag"
        style={{
          width: '100%',
          marginTop: '8px',
          padding: '4px',
          fontSize: '12px',
          fontWeight: 'normal',
          boxSizing: 'border-box',
        }}
      />

      <Handle type="source" position={Position.Right} />
    </div>
  );
}

export default InputNode;