import { Handle, Position } from '@xyflow/react';

// Phase 2: now stores TWO fields — varName (so other nodes can
// reference this input by name) and value (the actual text).
export default function InputNode({ data }) {
  return (
    <div className="node-card" style={{ borderLeft: '4px solid #10b981' }}>
      <div className="node-header">
        <div className="node-title-group">
          <span>📥</span>
          <span className="node-title">Input</span>
        </div>
        <button className="node-delete-btn nodrag" onClick={data.onDelete}>×</button>
      </div>
      <div className="node-body">
        <div className="node-field">
          <span className="node-label">Variable Name</span>
          <input
            type="text"
            className="node-input nodrag"
            placeholder="customer_text"
            value={data.varName || ''}
            onChange={(e) => data.onChange({ varName: e.target.value })}
          />
        </div>
        <div className="node-field">
          <span className="node-label">Value</span>
          <textarea
            className="node-textarea nodrag"
            rows={2}
            placeholder="Enter value..."
            value={data.value || ''}
            onChange={(e) => data.onChange({ value: e.target.value })}
            style={{ resize: 'none' }}
          />
        </div>
      </div>
      <Handle type="source" position={Position.Right} style={{ background: '#10b981', width: 10, height: 10 }} />
    </div>
  );
}