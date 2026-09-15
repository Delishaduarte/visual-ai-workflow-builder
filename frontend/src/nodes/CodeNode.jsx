import { Handle, Position } from '@xyflow/react';

function statusIcon(status) {
  if (status === 'success') return '✓';
  if (status === 'running') return '●';
  if (status === 'error') return '✕';
  if (status === 'skipped') return '—';
  return '○';
}

export default function CodeNode({ data }) {
  const statusClass = data.runStatus === 'running' ? 'is-running' : data.runStatus === 'error' ? 'is-error' : '';

  return (
    <div className={`node-card node-card--code ${statusClass}`} style={{ borderLeft: '4px solid #64748b' }}>
      <Handle type="target" position={Position.Left} style={{ background: '#64748b', width: 10, height: 10 }} />
      <div className="node-header">
        <div className="node-title-group">
          <span className="node-title">
            Code
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
          <span className="node-label">Python (use input_value, set result)</span>
          <textarea
            className="node-textarea nodrag"
            rows={4}
            placeholder={'result = input_value.upper()'}
            value={data.code || ''}
            onChange={(e) => data.onChange({ code: e.target.value })}
            onBlur={data.onCommit}
            style={{ resize: 'none', fontFamily: 'monospace' }}
          />
        </div>
      </div>
      <Handle type="source" position={Position.Right} style={{ background: '#64748b', width: 10, height: 10 }} />
    </div>
  );
}