import { Handle, Position } from '@xyflow/react';
import { InputIcon } from '../icons';

function statusIcon(status) {
  if (status === 'success') return '✓';
  if (status === 'running') return '●';
  if (status === 'error') return '✕';
  return '○';
}

export default function InputNode({ data }) {
  const statusClass =
    data.runStatus === 'running' ? 'is-running' : data.runStatus === 'error' ? 'is-error' : '';

  return (
    <div className={`node-card node-card--input ${statusClass}`} style={{ borderLeft: '4px solid #10b981' }}>
      <div className="node-header">
        <div className="node-title-group">
          <InputIcon />
          <span className="node-title">
            Input
            {data.runStatus && (
              <span className={`node-status-badge ${data.runStatus}`}>{statusIcon(data.runStatus)}</span>
            )}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button className="node-delete-btn nodrag" onClick={data.onDuplicate} title="Duplicate">⧉</button>
          <button className="node-delete-btn nodrag" onClick={data.onDelete} title="Delete">×</button>
        </div>
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
            onBlur={data.onCommit}
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
            onBlur={data.onCommit}
            style={{ resize: 'none' }}
          />
        </div>
      </div>
      <Handle type="source" position={Position.Right} style={{ background: '#10b981', width: 10, height: 10 }} />
    </div>
  );
}