import { Handle, Position } from '@xyflow/react';

function statusIcon(status) {
  if (status === 'success') return '✓';
  if (status === 'running') return '⏳';
  if (status === 'error') return '❌';
  return '○';
}

export default function OutputNode({ data }) {
  return (
    <div className="node-card" style={{ borderLeft: '4px solid #06b6d4' }}>
      <Handle type="target" position={Position.Left} style={{ background: '#06b6d4', width: 10, height: 10 }} />
      <div className="node-header">
        <div className="node-title-group">
          <span>📤</span>
          <span className="node-title">
            Output
            {data.runStatus && <span className="node-status-badge">{statusIcon(data.runStatus)}</span>}
          </span>
        </div>
        <button className="node-delete-btn nodrag" onClick={data.onDelete}>×</button>
      </div>
      <div className="node-body">
        <div className="node-field">
          <span className="node-label">Result</span>
          <div className="node-preview nodrag">
            {data.value ? data.value : <span style={{ color: '#94a3b8' }}>(no output yet)</span>}
          </div>
        </div>
      </div>
    </div>
  );
}