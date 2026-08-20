import { Handle, Position } from '@xyflow/react';
import { OutputIcon } from '../icons';

function statusIcon(status) {
  if (status === 'success') return '✓';
  if (status === 'running') return '●';
  if (status === 'error') return '✕';
  return '○';
}

export default function OutputNode({ data }) {
  const statusClass =
    data.runStatus === 'running' ? 'is-running' : data.runStatus === 'error' ? 'is-error' : '';

  return (
    <div className={`node-card node-card--output ${statusClass}`} style={{ borderLeft: '4px solid #06b6d4' }}>
      <Handle type="target" position={Position.Left} style={{ background: '#06b6d4', width: 10, height: 10 }} />
      <div className="node-header">
        <div className="node-title-group">
          <OutputIcon />
          <span className="node-title">
            Output
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
          <span className="node-label">Result</span>
          <div className="node-preview nodrag">
            {data.value ? data.value : <span style={{ color: '#94a3b8' }}>(no output yet)</span>}
          </div>
        </div>
      </div>
    </div>
  );
}