import { Handle, Position } from '@xyflow/react';

function statusIcon(status) {
  if (status === 'success') return '✓';
  if (status === 'running') return '●';
  if (status === 'error') return '✕';
  if (status === 'skipped') return '—';
  return '○';
}

export default function HttpNode({ data }) {
  const statusClass = data.runStatus === 'running' ? 'is-running' : data.runStatus === 'error' ? 'is-error' : '';

  return (
    <div className={`node-card node-card--http ${statusClass}`} style={{ borderLeft: '4px solid #0ea5e9' }}>
      <Handle type="target" position={Position.Left} style={{ background: '#0ea5e9', width: 10, height: 10 }} />
      <div className="node-header">
        <div className="node-title-group">
          <span className="node-title">
            HTTP
            {data.runStatus && <span className={`node-status-badge ${data.runStatus}`}>{statusIcon(data.runStatus)}</span>}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button className="node-delete-btn nodrag" onClick={data.onDuplicate} title="Duplicate">⧉</button>
          <button className="node-delete-btn nodrag" onClick={data.onDelete} title="Delete">×</button>
        </div>
      </div>
      <div className="node-body">
        <div className="node-field">
          <span className="node-label">Method</span>
          <select className="node-select nodrag" value={data.method || 'GET'} onChange={(e) => data.onChange({ method: e.target.value })} onBlur={data.onCommit}>
            <option value="GET">GET</option>
            <option value="POST">POST</option>
          </select>
        </div>
        <div className="node-field">
          <span className="node-label">URL</span>
          <input type="text" className="node-input nodrag" placeholder="https://api.example.com/data" value={data.url || ''} onChange={(e) => data.onChange({ url: e.target.value })} onBlur={data.onCommit} />
        </div>
      </div>
      <Handle type="source" position={Position.Right} style={{ background: '#0ea5e9', width: 10, height: 10 }} />
    </div>
  );
}